import type { ReceiptDetailResponse, ReceiptItemSnapshot } from '@/types/receipt';
import { formatReceiptCurrency, formatReceiptDateTime } from './receipt';
import { getOrderRoundingAmount } from './rounding';

// BLE thermal printer profiles – tried in order until one connects
const BLE_PROFILES = [
  {
    serviceUuid: '000018f0-0000-1000-8000-00805f9b34fb',
    writeCharUuid: '00002af1-0000-1000-8000-00805f9b34fb',
  },
  {
    serviceUuid: '49535343-fe7d-4ae5-8fa9-9fafd205e455',
    writeCharUuid: '49535343-8841-43f4-a8d4-ecbe34729bb3',
  },
  {
    serviceUuid: 'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
    writeCharUuid: 'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f',
  },
];

const PRINT_WIDTH = 32;
const CHUNK_SIZE = 100; // safe BLE write size in bytes

// ESC/POS command helpers
const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

function cmd(...bytes: number[]): number[] {
  return bytes;
}

const INIT = cmd(ESC, 0x40);
const ALIGN_CENTER = cmd(ESC, 0x61, 0x01);
const ALIGN_LEFT = cmd(ESC, 0x61, 0x00);
const BOLD_ON = cmd(ESC, 0x45, 0x01);
const BOLD_OFF = cmd(ESC, 0x45, 0x00);
const SIZE_LARGE = cmd(GS, 0x21, 0x11);
const SIZE_NORMAL = cmd(GS, 0x21, 0x00);
const CUT = cmd(GS, 0x56, 0x41, 0x10);

function feedLines(n: number): number[] {
  return cmd(ESC, 0x64, n);
}

function strToBytes(text: string): number[] {
  // Replace Rupiah symbol and strip non-ASCII for thermal printer compatibility
  const safe = text
    .replace(/Rp /g, 'Rp')
    .replace(/ /g, ' ')
    .replace(/[^\x20-\x7e]/g, '?');
  return Array.from(safe).map((c) => c.charCodeAt(0));
}

function textLine(text: string): number[] {
  return [...strToBytes(text), LF];
}

function divider(char = '-'): number[] {
  return textLine(char.repeat(PRINT_WIDTH));
}

function centerText(text: string): number[] {
  const pad = Math.max(0, Math.floor((PRINT_WIDTH - text.length) / 2));
  return textLine(' '.repeat(pad) + text);
}

function leftRight(left: string, right: string): number[] {
  const spaces = PRINT_WIDTH - left.length - right.length;
  const gap = spaces > 0 ? ' '.repeat(spaces) : ' ';
  return textLine(left + gap + right);
}

function truncate(text: string, maxLen: number): string {
  return text.length > maxLen ? text.slice(0, maxLen - 1) + '.' : text;
}

function normalizeNum(value: number | string | null | undefined): number {
  const n = typeof value === 'string' ? Number(value) : (value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function getItems(receipt: ReceiptDetailResponse): ReceiptItemSnapshot[] {
  const items = receipt.contentSnapshot?.items;
  return Array.isArray(items) ? items : [];
}

function buildReceiptBuffer(receipt: ReceiptDetailResponse): Uint8Array {
  const buf: number[] = [];
  const push = (...bytes: number[]) => buf.push(...bytes);

  const businessName = receipt.contentSnapshot?.brandName || receipt.businessName || 'POS';
  const outletName = receipt.outletName || receipt.contentSnapshot?.outletName || '';
  const outletAddress = receipt.outletAddress || receipt.contentSnapshot?.outletAddress || '';
  const outletPhone = receipt.contentSnapshot?.outletPhone || '';
  const headerText = receipt.contentSnapshot?.headerText || '';
  const footerText = receipt.contentSnapshot?.footerText || 'Terima kasih!';
  const orderNumber = receipt.order?.orderNumber || receipt.contentSnapshot?.orderNumber || '-';
  const receiptNumber = receipt.receiptNo || receipt.receiptNumber || receipt.id || '-';
  const cashierName = receipt.contentSnapshot?.cashierName || '-';
  const tableName = receipt.contentSnapshot?.tableName || null;
  const customerName = receipt.contentSnapshot?.customerName || null;
  const paymentMethod = receipt.payment?.method || '-';
  const issuedAt = formatReceiptDateTime(receipt.issuedAt || receipt.createdAt);

  const subtotal = normalizeNum(receipt.contentSnapshot?.subtotal ?? receipt.order?.subtotal);
  const discount = normalizeNum(receipt.contentSnapshot?.discountAmount ?? receipt.order?.discountAmount);
  const tax = normalizeNum(receipt.contentSnapshot?.taxAmount ?? receipt.order?.taxAmount);
  const service = normalizeNum(receipt.contentSnapshot?.serviceChargeAmount ?? receipt.order?.serviceChargeAmount);
  const total = normalizeNum(receipt.contentSnapshot?.totalAmount ?? receipt.order?.totalAmount ?? receipt.total);
  const rounding = getOrderRoundingAmount({
    subtotal,
    discountAmount: discount,
    taxAmount: tax,
    serviceChargeAmount: service,
    totalAmount: total,
  });
  const amountPaid = normalizeNum(receipt.payment?.amountPaid);
  const amountTendered = normalizeNum(receipt.payment?.amountTendered);
  const change = normalizeNum(receipt.payment?.changeAmount);

  // Header
  push(...INIT);
  push(...ALIGN_CENTER);
  push(...BOLD_ON, ...SIZE_LARGE);
  push(...textLine(truncate(businessName, 16)));
  push(...SIZE_NORMAL, ...BOLD_OFF);

  if (outletName) push(...centerText(truncate(outletName, PRINT_WIDTH)));
  if (outletAddress) push(...centerText(truncate(outletAddress, PRINT_WIDTH)));
  if (outletPhone) push(...centerText(truncate(outletPhone, PRINT_WIDTH)));
  if (headerText) {
    for (const hLine of headerText.split('\n')) {
      push(...centerText(truncate(hLine, PRINT_WIDTH)));
    }
  }

  push(...divider());
  push(...ALIGN_LEFT);

  // Transaction info
  push(...leftRight('Receipt No', truncate(receiptNumber, 16)));
  push(...leftRight('Order', truncate(orderNumber, 16)));
  push(...leftRight('Tanggal', truncate(issuedAt, 16)));
  if (tableName) push(...leftRight('Meja', truncate(tableName, 16)));
  if (customerName) push(...leftRight('Pelanggan', truncate(customerName, 16)));
  push(...leftRight('Metode', truncate(paymentMethod, 16)));
  push(...leftRight('Kasir', truncate(cashierName, 16)));

  push(...divider());

  // Items
  const items = getItems(receipt);
  for (const item of items) {
    const name = String(item.productName || 'Produk');
    const qty = normalizeNum(item.qty ?? item.quantity);
    const price = normalizeNum(item.price ?? item.unitPrice);
    const lineTotal = normalizeNum(item.lineTotal ?? item.subtotal ?? item.lineSubtotal);

    push(...BOLD_ON);
    push(...textLine(truncate(name, PRINT_WIDTH)));
    push(...BOLD_OFF);

    if (item.note) {
      push(...textLine(truncate(`  Catatan: ${item.note}`, PRINT_WIDTH)));
    }

    const qtyPriceLabel = `${qty} x ${formatReceiptCurrency(price)}`;
    push(...leftRight(
      truncate(qtyPriceLabel, 20),
      formatReceiptCurrency(lineTotal),
    ));
  }

  push(...divider());

  // Totals
  push(...leftRight('Subtotal', formatReceiptCurrency(subtotal)));
  if (discount > 0) push(...leftRight('Diskon', `-${formatReceiptCurrency(discount)}`));
  if (tax > 0) push(...leftRight('Tax', formatReceiptCurrency(tax)));
  if (service > 0) push(...leftRight('Service', formatReceiptCurrency(service)));
  if (rounding !== 0) {
    push(...leftRight('Pembulatan', `${rounding > 0 ? '+' : '-'}${formatReceiptCurrency(Math.abs(rounding))}`));
  }

  push(...BOLD_ON);
  push(...leftRight('TOTAL', formatReceiptCurrency(total)));
  push(...BOLD_OFF);

  push(...divider('.'));
  push(...leftRight('Dibayar', formatReceiptCurrency(amountPaid)));
  push(...leftRight('Tunai', formatReceiptCurrency(amountTendered)));
  push(...BOLD_ON);
  push(...leftRight('Kembalian', formatReceiptCurrency(change)));
  push(...BOLD_OFF);

  push(...divider());

  // Footer
  push(...ALIGN_CENTER);
  for (const fLine of footerText.split('\n')) {
    push(...centerText(truncate(fLine, PRINT_WIDTH)));
  }

  push(...feedLines(4));
  push(...CUT);

  return new Uint8Array(buf);
}

async function findWriteCharacteristic(
  server: BluetoothRemoteGATTServer,
): Promise<BluetoothRemoteGATTCharacteristic> {
  for (const profile of BLE_PROFILES) {
    try {
      const service = await server.getPrimaryService(profile.serviceUuid);
      const characteristic = await service.getCharacteristic(profile.writeCharUuid);
      return characteristic;
    } catch {
      // try next profile
    }
  }
  throw new Error(
    'Printer BLE tidak dikenali. Coba dekatkan printer dan pastikan sudah dalam mode pairing.',
  );
}

async function writeChunked(
  char: BluetoothRemoteGATTCharacteristic,
  data: Uint8Array,
): Promise<void> {
  for (let offset = 0; offset < data.length; offset += CHUNK_SIZE) {
    const chunk = data.slice(offset, offset + CHUNK_SIZE);
    await char.writeValueWithoutResponse(chunk);
    // small delay so printer buffer doesn't overflow
    await new Promise<void>((resolve) => setTimeout(resolve, 20));
  }
}

export type BluetoothPrinterConnection = {
  device: BluetoothDevice;
  getCharacteristic: () => Promise<BluetoothRemoteGATTCharacteristic>;
  disconnect: () => void;
};

export function isBluetoothSupported(): boolean {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
}

export async function connectBluetoothPrinter(): Promise<BluetoothPrinterConnection> {
  if (!isBluetoothSupported()) {
    throw new Error(
      'Web Bluetooth tidak didukung di browser ini. Gunakan Chrome di Android atau desktop.',
    );
  }

  const optionalServices = BLE_PROFILES.map((p) => p.serviceUuid);

  const device = await navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices,
  });

  const gatt = device.gatt;
  if (!gatt) {
    throw new Error('Printer tidak mendukung GATT. Pastikan printer dalam mode pairing.');
  }

  return {
    device,
    async getCharacteristic() {
      const server = gatt.connected ? gatt : await gatt.connect();
      return findWriteCharacteristic(server);
    },
    disconnect() {
      if (gatt.connected) {
        gatt.disconnect();
      }
    },
  };
}

export async function printReceiptBluetooth(
  connection: BluetoothPrinterConnection,
  receipt: ReceiptDetailResponse,
): Promise<void> {
  const characteristic = await connection.getCharacteristic();
  const buffer = buildReceiptBuffer(receipt);
  await writeChunked(characteristic, buffer);
}
