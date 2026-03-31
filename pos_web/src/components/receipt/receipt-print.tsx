'use client';

import { formatCurrency, formatDateTime } from '@/lib/pos';
import type { PosReceiptResponse } from '@/types/pos';

type JsonRecord = Record<string, unknown>;

type ReceiptSnapshotItem = {
  name: string;
  qty: number;
  price: number;
  subtotal: number;
  note: string | null;
};

type ReceiptSnapshotCharge = {
  label: string;
  amount: number;
};

type ReceiptSnapshot = {
  businessName: string | null;
  outletName: string | null;
  outletAddress: string | null;
  orderNo: string | null;
  paymentMethod: string | null;
  cashierName: string | null;
  createdAt: string | null;
  subtotal: number | null;
  total: number | null;
  items: ReceiptSnapshotItem[];
  charges: ReceiptSnapshotCharge[];
};

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null;
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function toStringOrNull(value: unknown): string | null {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return null;
}

function parseSnapshot(snapshot: unknown): ReceiptSnapshot {
  if (!isRecord(snapshot)) {
    return {
      businessName: null,
      outletName: null,
      outletAddress: null,
      orderNo: null,
      paymentMethod: null,
      cashierName: null,
      createdAt: null,
      subtotal: null,
      total: null,
      items: [],
      charges: [],
    };
  }

  const rawItems = Array.isArray(snapshot.items) ? snapshot.items : [];
  const rawCharges = Array.isArray(snapshot.charges) ? snapshot.charges : [];

  const items = rawItems
    .filter(isRecord)
    .map((item) => ({
      name: toStringOrNull(item.name) ?? '-',
      qty: toNumber(item.qty, 0),
      price: toNumber(item.price, 0),
      subtotal: toNumber(item.subtotal, 0),
      note: toStringOrNull(item.note),
    }));

  const charges = rawCharges
    .filter(isRecord)
    .map((item) => ({
      label: toStringOrNull(item.label) ?? '-',
      amount: toNumber(item.amount, 0),
    }));

  return {
    businessName: toStringOrNull(snapshot.businessName),
    outletName: toStringOrNull(snapshot.outletName),
    outletAddress: toStringOrNull(snapshot.outletAddress),
    orderNo: toStringOrNull(snapshot.orderNo),
    paymentMethod: toStringOrNull(snapshot.paymentMethod),
    cashierName: toStringOrNull(snapshot.cashierName),
    createdAt: toStringOrNull(snapshot.createdAt),
    subtotal:
      snapshot.subtotal === undefined || snapshot.subtotal === null
        ? null
        : toNumber(snapshot.subtotal),
    total:
      snapshot.total === undefined || snapshot.total === null
        ? null
        : toNumber(snapshot.total),
    items,
    charges,
  };
}

type ReceiptPrintProps = {
  receipt: PosReceiptResponse;
  showPrintButton?: boolean;
};

export default function ReceiptPrint({
  receipt,
  showPrintButton = true,
}: ReceiptPrintProps) {
  const snapshot = parseSnapshot(receipt.contentSnapshot);

  const businessName = snapshot.businessName || receipt.businessName || '-';
  const outletName = snapshot.outletName || receipt.outletName || '-';
  const outletAddress = snapshot.outletAddress || receipt.outletAddress || '-';
  const subtotal = snapshot.subtotal ?? receipt.subtotal ?? 0;
  const total = snapshot.total ?? receipt.total ?? 0;
  const createdAt = snapshot.createdAt || receipt.createdAt || null;
  const itemList = snapshot.items;
  const chargeList = snapshot.charges;

  function handlePrint() {
    if (typeof window === 'undefined') {
      return;
    }

    window.print();
  }

  return (
    <div className="space-y-4">
      {showPrintButton ? (
        <div className="print:hidden">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Print Receipt
          </button>
        </div>
      ) : null}

      <div className="mx-auto w-full max-w-[420px] rounded-[24px] border border-slate-200 bg-white px-5 py-5 text-slate-900 shadow-sm print:max-w-none print:rounded-none print:border-0 print:px-0 print:py-0 print:shadow-none">
        <div className="text-center">
          <p className="text-lg font-semibold">{businessName}</p>
          <p className="mt-1 text-sm text-slate-600">{outletName}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">{outletAddress}</p>
        </div>

        <div className="mt-4 border-t border-dashed border-slate-300 pt-4 text-xs text-slate-600">
          <div className="flex items-start justify-between gap-3">
            <span>Receipt No</span>
            <span className="text-right font-medium text-slate-900">
              {receipt.receiptNo || receipt.id}
            </span>
          </div>

          <div className="mt-2 flex items-start justify-between gap-3">
            <span>Order</span>
            <span className="text-right font-medium text-slate-900">
              {snapshot.orderNo || receipt.orderId}
            </span>
          </div>

          <div className="mt-2 flex items-start justify-between gap-3">
            <span>Tanggal</span>
            <span className="text-right font-medium text-slate-900">
              {formatDateTime(createdAt)}
            </span>
          </div>

          <div className="mt-2 flex items-start justify-between gap-3">
            <span>Metode</span>
            <span className="text-right font-medium text-slate-900">
              {snapshot.paymentMethod || '-'}
            </span>
          </div>

          <div className="mt-2 flex items-start justify-between gap-3">
            <span>Kasir</span>
            <span className="text-right font-medium text-slate-900">
              {snapshot.cashierName || '-'}
            </span>
          </div>
        </div>

        <div className="mt-4 border-t border-dashed border-slate-300 pt-4">
          {itemList.length === 0 ? (
            <div className="text-sm text-slate-500">Tidak ada item snapshot.</div>
          ) : (
            <div className="space-y-3">
              {itemList.map((item, index) => (
                <div key={`${item.name}-${index}`} className="text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900">{item.name}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {item.qty} x {formatCurrency(item.price)}
                      </p>
                      {item.note ? (
                        <p className="mt-1 text-xs italic text-slate-500">
                          Note: {item.note}
                        </p>
                      ) : null}
                    </div>

                    <div className="shrink-0 text-right font-medium text-slate-900">
                      {formatCurrency(item.subtotal)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 border-t border-dashed border-slate-300 pt-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-600">Subtotal</span>
            <span className="font-medium text-slate-900">
              {formatCurrency(subtotal)}
            </span>
          </div>

          {chargeList.map((charge, index) => (
            <div
              key={`${charge.label}-${index}`}
              className="mt-2 flex items-center justify-between"
            >
              <span className="text-slate-600">{charge.label}</span>
              <span className="font-medium text-slate-900">
                {formatCurrency(charge.amount)}
              </span>
            </div>
          ))}

          <div className="mt-3 flex items-center justify-between border-t border-dashed border-slate-300 pt-3 text-base">
            <span className="font-semibold text-slate-900">Total</span>
            <span className="font-semibold text-slate-900">
              {formatCurrency(total)}
            </span>
          </div>
        </div>

        <div className="mt-5 border-t border-dashed border-slate-300 pt-4 text-center text-xs leading-5 text-slate-500">
          <p>Terima kasih.</p>
          <p>Simpan struk ini sebagai bukti transaksi.</p>
        </div>
      </div>
    </div>
  );
}