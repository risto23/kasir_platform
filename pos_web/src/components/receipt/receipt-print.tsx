'use client';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPrint } from '@fortawesome/free-solid-svg-icons';

import type { ReceiptDetailResponse, ReceiptItemSnapshot } from '@/types/receipt';
import { formatReceiptCurrency, formatReceiptDateTime } from '@/lib/receipt';

type ReceiptPrintProps = {
  receipt: ReceiptDetailResponse | null | undefined;
  showPrintButton?: boolean;
};

function normalizeNumber(value: number | string | null | undefined): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function isReceiptItemSnapshotArray(value: unknown): value is ReceiptItemSnapshot[] {
  return Array.isArray(value);
}

function getReceiptItems(
  receipt: ReceiptDetailResponse | null | undefined,
): ReceiptItemSnapshot[] {
  if (!receipt || typeof receipt !== 'object') {
    return [];
  }

  const snapshot = receipt.contentSnapshot;
  if (!snapshot || typeof snapshot !== 'object') {
    return [];
  }

  if (!isReceiptItemSnapshotArray(snapshot.items)) {
    return [];
  }

  return snapshot.items;
}

function getPaymentMethodLabel(method: string | null | undefined): string {
  if (!method) {
    return '-';
  }

  switch (method) {
    case 'CASH':
      return 'Cash';
    case 'QRIS':
      return 'QRIS';
    case 'TRANSFER':
      return 'Transfer';
    case 'CARD':
      return 'Card';
    default:
      return method;
  }
}

function getItemName(item: ReceiptItemSnapshot): string {
  if (typeof item.productName === 'string' && item.productName.trim() !== '') {
    return item.productName.trim();
  }

  if (typeof item.productCode === 'string' && item.productCode.trim() !== '') {
    return item.productCode.trim();
  }

  if (typeof item.productSku === 'string' && item.productSku.trim() !== '') {
    return item.productSku.trim();
  }

  if (typeof item.productBarcode === 'string' && item.productBarcode.trim() !== '') {
    return item.productBarcode.trim();
  }

  return 'Produk';
}

export default function ReceiptPrint({
  receipt,
  showPrintButton = true,
}: ReceiptPrintProps) {
  const items = getReceiptItems(receipt);

  const businessName =
    receipt?.businessName ||
    receipt?.contentSnapshot?.businessName ||
    '-';

  const outletName =
    receipt?.outletName ||
    receipt?.contentSnapshot?.outletName ||
    '-';

  const outletAddress =
    receipt?.outletAddress ||
    receipt?.contentSnapshot?.outletAddress ||
    '-';

  const orderNumber =
    receipt?.order?.orderNumber ||
    receipt?.contentSnapshot?.orderNumber ||
    receipt?.orderId ||
    '-';

  const receiptNumber =
    receipt?.receiptNo ||
    receipt?.receiptNumber ||
    receipt?.id ||
    '-';

  const paymentMethod = getPaymentMethodLabel(receipt?.payment?.method);
  const cashierLabel = '-';

  const subtotal = normalizeNumber(
    receipt?.contentSnapshot?.subtotal ??
      receipt?.order?.subtotal ??
      0,
  );

  const discountAmount = normalizeNumber(
    receipt?.contentSnapshot?.discountAmount ??
      receipt?.order?.discountAmount ??
      0,
  );

  const taxAmount = normalizeNumber(
    receipt?.contentSnapshot?.taxAmount ??
      receipt?.order?.taxAmount ??
      0,
  );

  const serviceChargeAmount = normalizeNumber(
    receipt?.contentSnapshot?.serviceChargeAmount ??
      receipt?.order?.serviceChargeAmount ??
      0,
  );

  const total = normalizeNumber(
    receipt?.contentSnapshot?.totalAmount ??
      receipt?.order?.totalAmount ??
      receipt?.total ??
      0,
  );

  const amountPaid = normalizeNumber(receipt?.payment?.amountPaid);
  const amountTendered = normalizeNumber(receipt?.payment?.amountTendered);
  const changeAmount = normalizeNumber(receipt?.payment?.changeAmount);

  function handlePrint() {
    if (typeof window === 'undefined') {
      return;
    }

    window.print();
  }

  return (
    <div className="mx-auto max-w-[420px]">
      {showPrintButton ? (
        <div className="mb-4 flex justify-end print:hidden">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <FontAwesomeIcon icon={faPrint} className="h-4 w-4" />
            Print
          </button>
        </div>
      ) : null}

      <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <div className="mx-auto w-full max-w-[280px] text-[11px] leading-5 text-slate-700">
          <div className="border-b border-dashed border-slate-300 pb-4 text-center">
            <h2 className="text-lg font-bold text-slate-900">
              {businessName}
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-800">
              {outletName}
            </p>
            <p className="text-slate-500">{outletAddress}</p>
          </div>

          <div className="border-b border-dashed border-slate-300 py-4">
            <div className="flex items-start justify-between gap-3">
              <span className="text-slate-500">Receipt No</span>
              <span className="text-right font-semibold text-slate-900">
                {receiptNumber}
              </span>
            </div>

            <div className="mt-1 flex items-start justify-between gap-3">
              <span className="text-slate-500">Order</span>
              <span className="text-right text-slate-900">{orderNumber}</span>
            </div>

            <div className="mt-1 flex items-start justify-between gap-3">
              <span className="text-slate-500">Tanggal</span>
              <span className="text-right text-slate-900">
                {formatReceiptDateTime(receipt?.issuedAt || receipt?.createdAt)}
              </span>
            </div>

            <div className="mt-1 flex items-start justify-between gap-3">
              <span className="text-slate-500">Metode</span>
              <span className="text-right text-slate-900">{paymentMethod}</span>
            </div>

            <div className="mt-1 flex items-start justify-between gap-3">
              <span className="text-slate-500">Kasir</span>
              <span className="text-right text-slate-900">{cashierLabel}</span>
            </div>
          </div>

          <div className="border-b border-dashed border-slate-300 py-4">
            {items.length === 0 ? (
              <div className="text-center text-slate-500">
                Tidak ada item receipt
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item) => {
                  const itemName = getItemName(item);
                  const quantity = normalizeNumber(item.qty ?? item.quantity);
                  const unitPrice = normalizeNumber(item.price ?? item.unitPrice);
                  const lineTotal = normalizeNumber(
                    item.lineTotal ?? item.subtotal ?? item.lineSubtotal,
                  );

                  return (
                    <div key={item.id} className="space-y-1">
                      <div className="font-semibold text-slate-900">
                        {itemName}
                      </div>

                      {item.note ? (
                        <div className="text-[10px] text-slate-500">
                          Catatan: {item.note}
                        </div>
                      ) : null}

                      <div className="flex items-center justify-between gap-3 text-[10px] text-slate-500">
                        <span>
                          {quantity} x {formatReceiptCurrency(unitPrice)}
                        </span>
                        <span className="font-semibold text-slate-900">
                          {formatReceiptCurrency(lineTotal)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-b border-dashed border-slate-300 py-4">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Subtotal</span>
              <span className="text-slate-900">
                {formatReceiptCurrency(subtotal)}
              </span>
            </div>

            {discountAmount > 0 ? (
              <div className="mt-1 flex items-center justify-between">
                <span className="text-slate-500">Diskon</span>
                <span className="text-slate-900">
                  -{formatReceiptCurrency(discountAmount)}
                </span>
              </div>
            ) : null}

            {taxAmount > 0 ? (
              <div className="mt-1 flex items-center justify-between">
                <span className="text-slate-500">Tax</span>
                <span className="text-slate-900">
                  {formatReceiptCurrency(taxAmount)}
                </span>
              </div>
            ) : null}

            {serviceChargeAmount > 0 ? (
              <div className="mt-1 flex items-center justify-between">
                <span className="text-slate-500">Service Charge</span>
                <span className="text-slate-900">
                  {formatReceiptCurrency(serviceChargeAmount)}
                </span>
              </div>
            ) : null}

            <div className="mt-3 flex items-center justify-between text-base font-bold text-slate-900">
              <span>Total</span>
              <span>{formatReceiptCurrency(total)}</span>
            </div>

            <div className="mt-3 border-t border-dashed border-slate-300 pt-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Dibayar</span>
                <span className="text-slate-900">
                  {formatReceiptCurrency(amountPaid)}
                </span>
              </div>

              <div className="mt-1 flex items-center justify-between">
                <span className="text-slate-500">Tunai / Tendered</span>
                <span className="text-slate-900">
                  {formatReceiptCurrency(amountTendered)}
                </span>
              </div>

              <div className="mt-1 flex items-center justify-between font-semibold">
                <span className="text-slate-700">Kembalian</span>
                <span className="text-slate-900">
                  {formatReceiptCurrency(changeAmount)}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 text-center text-[10px] text-slate-500">
            <p>Terima kasih.</p>
            <p>Simpan struk ini sebagai bukti transaksi.</p>
          </div>
        </div>
      </div>
    </div>
  );
}