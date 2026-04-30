'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faBoxesStacked,
  faRotateLeft,
  faSave,
  faTrash,
  faTruck,
} from '@fortawesome/free-solid-svg-icons';

import { api } from '@/lib/api';
import { getActiveOutletId, setActiveOutletId } from '@/lib/auth';
import type { GoodsReceiptDetail, GoodsReceiptSummary } from '@/types/goods-receipt';
import type { Outlet } from '@/types/outlet';

type PurchaseReturnFormItem = {
  goodsReceiptItemId: string;
  productName: string;
  remainingReturnable: string;
  quantityReturned: string;
  unitCost: string;
  note: string;
};

type PurchaseReturnFormState = {
  outletId: string;
  goodsReceiptId: string;
  returnDate: string;
  reason: string;
  notes: string;
  items: PurchaseReturnFormItem[];
};

type OutletEnvelope = {
  items?: Outlet[];
};

function getTodayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function getMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || 'Gagal menyimpan purchase return';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Terjadi kesalahan';
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function createEmptyItem(): PurchaseReturnFormItem {
  return {
    goodsReceiptItemId: '',
    productName: '',
    remainingReturnable: '0',
    quantityReturned: '',
    unitCost: '0',
    note: '',
  };
}

export default function PurchaseReturnCreatePage() {
  const router = useRouter();

  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [goodsReceipts, setGoodsReceipts] = useState<GoodsReceiptSummary[]>([]);
  const [selectedGoodsReceipt, setSelectedGoodsReceipt] =
    useState<GoodsReceiptDetail | null>(null);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [loadingGoodsReceipts, setLoadingGoodsReceipts] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState<PurchaseReturnFormState>({
    outletId: '',
    goodsReceiptId: '',
    returnDate: getTodayInputValue(),
    reason: '',
    notes: '',
    items: [createEmptyItem()],
  });

  async function fetchMeta() {
    try {
      setLoadingMeta(true);
      const response = await api.get('/business/outlets', {
        params: {
          status: 'ACTIVE',
          perPage: 100,
        },
      });

      const payload = response.data?.data as OutletEnvelope | Outlet[];
      const outletItems = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.items)
          ? payload.items
          : [];

      setOutlets(outletItems);

      const storedOutletId = getActiveOutletId();
      const resolvedOutletId =
        outletItems.find((item) => item.id === storedOutletId)?.id ||
        outletItems[0]?.id ||
        '';

      setForm((prev) => ({
        ...prev,
        outletId: prev.outletId || resolvedOutletId,
      }));

      if (resolvedOutletId) {
        setActiveOutletId(resolvedOutletId);
      }
    } catch (error: unknown) {
      setMessage(getMessage(error));
    } finally {
      setLoadingMeta(false);
    }
  }

  async function fetchGoodsReceipts(outletId: string) {
    if (!outletId) {
      setGoodsReceipts([]);
      return;
    }

    try {
      setLoadingGoodsReceipts(true);
      const response = await api.get('/goods-receipts', {
        params: {
          outletId,
          status: 'POSTED',
          perPage: 100,
        },
      });

      setGoodsReceipts(
        Array.isArray(response.data?.data) ? response.data.data : [],
      );
    } catch {
      setGoodsReceipts([]);
    } finally {
      setLoadingGoodsReceipts(false);
    }
  }

  async function handleSelectGoodsReceipt(goodsReceiptId: string) {
    setForm((prev) => ({
      ...prev,
      goodsReceiptId,
    }));
    setSelectedGoodsReceipt(null);

    if (!goodsReceiptId) {
      setForm((prev) => ({
        ...prev,
        goodsReceiptId: '',
        items: [createEmptyItem()],
      }));
      return;
    }

    try {
      const response = await api.get(`/goods-receipts/${goodsReceiptId}`, {
        params: {
          outletId: form.outletId,
        },
      });

      const detail = response.data.data as GoodsReceiptDetail;
      const availableItems = detail.items
        .map((item) => {
          const remaining =
            Number(item.quantityAccepted || '0') - Number(item.quantityReturned || '0');

          return {
            item,
            remaining,
          };
        })
        .filter((entry) => entry.remaining > 0);

      setSelectedGoodsReceipt(detail);
      setForm((prev) => ({
        ...prev,
        goodsReceiptId: detail.id,
        items:
          availableItems.length > 0
            ? availableItems.map((entry) => ({
                goodsReceiptItemId: entry.item.id,
                productName: entry.item.productName,
                remainingReturnable: String(entry.remaining),
                quantityReturned: String(entry.remaining),
                unitCost: entry.item.unitCost,
                note: '',
              }))
            : [createEmptyItem()],
      }));
    } catch (error: unknown) {
      setMessage(getMessage(error));
    }
  }

  function updateItem(
    index: number,
    key: keyof PurchaseReturnFormItem,
    value: string,
  ) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [key]: value,
            }
          : item,
      ),
    }));
  }

  function removeItem(index: number) {
    setForm((prev) => ({
      ...prev,
      items:
        prev.items.length === 1
          ? [createEmptyItem()]
          : prev.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  function handleReset() {
    setMessage('');
    setSelectedGoodsReceipt(null);
    setForm({
      outletId: form.outletId,
      goodsReceiptId: '',
      returnDate: getTodayInputValue(),
      reason: '',
      notes: '',
      items: [createEmptyItem()],
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');

    if (!form.outletId) {
      setMessage('Outlet wajib dipilih.');
      return;
    }

    if (!form.goodsReceiptId) {
      setMessage('Goods receipt wajib dipilih.');
      return;
    }

    const validItems = form.items.filter((item) => item.goodsReceiptItemId);

    if (validItems.length === 0) {
      setMessage('Minimal harus ada 1 item retur.');
      return;
    }

    for (const item of validItems) {
      const quantityReturned = Number(item.quantityReturned);
      const remainingReturnable = Number(item.remainingReturnable);

      if (!Number.isFinite(quantityReturned) || quantityReturned <= 0) {
        setMessage('Quantity retur item harus lebih besar dari 0.');
        return;
      }

      if (quantityReturned > remainingReturnable) {
        setMessage('Quantity retur melebihi sisa yang bisa diretur.');
        return;
      }
    }

    try {
      setSubmitting(true);

      await api.post('/purchase-returns', {
        outletId: form.outletId,
        goodsReceiptId: form.goodsReceiptId,
        returnDate: form.returnDate,
        reason: form.reason.trim() || undefined,
        notes: form.notes.trim() || undefined,
        items: validItems.map((item) => ({
          goodsReceiptItemId: item.goodsReceiptItemId,
          quantityReturned: Number(item.quantityReturned),
          note: item.note.trim() || undefined,
        })),
      });

      router.push('/dashboard/purchase-returns');
      router.refresh();
    } catch (error: unknown) {
      setMessage(getMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    void fetchMeta();
  }, []);

  useEffect(() => {
    if (form.outletId) {
      void fetchGoodsReceipts(form.outletId);
    } else {
      setGoodsReceipts([]);
    }
  }, [form.outletId]);

  const subtotal = useMemo(
    () =>
      form.items.reduce((total, item) => {
        const quantityReturned = Number(item.quantityReturned);
        const unitCost = Number(item.unitCost);

        if (!Number.isFinite(quantityReturned) || !Number.isFinite(unitCost)) {
          return total;
        }

        return total + quantityReturned * unitCost;
      }, 0),
    [form.items],
  );

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-700">
            <FontAwesomeIcon icon={faTruck} className="h-3 w-3" />
            Procurement
          </div>

          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
            Tambah Purchase Return
          </h1>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Buat retur pembelian dari goods receipt yang sudah diposting.
          </p>
        </div>

        <Link
          href="/dashboard/purchase-returns"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4" />
          Kembali ke List
        </Link>
      </section>

      <form
        onSubmit={handleSubmit}
        className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]"
      >
        <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
            <h2 className="text-base font-semibold text-slate-900">
              Form Purchase Return
            </h2>
            <p className="text-sm text-slate-500">
              Pilih goods receipt, lalu tentukan item yang akan diretur.
            </p>
          </div>

          <div className="grid gap-5 px-5 py-5 sm:px-6">
            {message ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {message}
              </div>
            ) : null}

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-800">
                  Outlet
                </label>
                <select
                  value={form.outletId}
                  onChange={(event) => {
                    const outletId = event.target.value;
                    setForm((prev) => ({
                      ...prev,
                      outletId,
                      goodsReceiptId: '',
                      items: [createEmptyItem()],
                    }));
                    setSelectedGoodsReceipt(null);
                    if (outletId) {
                      setActiveOutletId(outletId);
                    }
                  }}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  disabled={loadingMeta}
                >
                  <option value="">
                    {loadingMeta ? 'Memuat outlet...' : 'Pilih outlet'}
                  </option>
                  {outlets.map((outlet) => (
                    <option key={outlet.id} value={outlet.id}>
                      {outlet.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-800">
                  Return Date
                </label>
                <input
                  type="date"
                  value={form.returnDate}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      returnDate: event.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold text-slate-800">
                  Goods Receipt
                </label>
                <select
                  value={form.goodsReceiptId}
                  onChange={(event) =>
                    void handleSelectGoodsReceipt(event.target.value)
                  }
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  disabled={!form.outletId || loadingGoodsReceipts}
                >
                  <option value="">
                    {loadingGoodsReceipts
                      ? 'Memuat goods receipt...'
                      : 'Pilih goods receipt posted'}
                  </option>
                  {goodsReceipts.map((receipt) => (
                    <option key={receipt.id} value={receipt.id}>
                      {receipt.receiptNumber} - {receipt.supplierName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-800">
                  Alasan Retur
                </label>
                <input
                  value={form.reason}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      reason: event.target.value,
                    }))
                  }
                  placeholder="Contoh: barang rusak / salah kirim"
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-800">
                  Supplier
                </label>
                <input
                  value={selectedGoodsReceipt?.supplierName || ''}
                  readOnly
                  placeholder="Terisi dari goods receipt"
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-700 outline-none"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold text-slate-800">
                  Notes
                </label>
                <textarea
                  value={form.notes}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      notes: event.target.value,
                    }))
                  }
                  rows={4}
                  placeholder="Catatan retur pembelian"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Item Retur
                  </h3>
                  <p className="text-xs text-slate-500">
                    Quantity retur tidak boleh melebihi sisa yang bisa diretur.
                  </p>
                </div>
              </div>

              <div className="grid gap-4">
                {form.items.map((item, index) => (
                  <div
                    key={`${item.goodsReceiptItemId}-${index}`}
                    className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1.3fr)_180px_180px_minmax(0,1fr)_auto]">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Product
                        </label>
                        <input
                          value={item.productName}
                          readOnly
                          className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Sisa Retur
                        </label>
                        <input
                          value={item.remainingReturnable}
                          readOnly
                          className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Qty Retur
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.001"
                          value={item.quantityReturned}
                          onChange={(event) =>
                            updateItem(
                              index,
                              'quantityReturned',
                              event.target.value,
                            )
                          }
                          className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Note
                        </label>
                        <input
                          value={item.note}
                          onChange={(event) =>
                            updateItem(index, 'note', event.target.value)
                          }
                          placeholder="Catatan item"
                          className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>

                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                        >
                          <FontAwesomeIcon icon={faTrash} className="h-4 w-4" />
                          Hapus
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-5">
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Ringkasan</h2>

            <div className="mt-4 space-y-3">
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  <FontAwesomeIcon icon={faBoxesStacked} className="h-3 w-3" />
                  Goods Receipt
                </div>
                <p className="mt-2 text-sm font-medium text-slate-800">
                  {selectedGoodsReceipt?.receiptNumber || '-'}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {selectedGoodsReceipt?.supplierInvoiceNumber || 'Tanpa invoice supplier'}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Supplier
                </p>
                <p className="mt-2 text-sm font-medium text-slate-800">
                  {selectedGoodsReceipt?.supplierName || '-'}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Total Retur
                </p>
                <p className="mt-2 text-sm font-medium text-slate-800">
                  {formatCurrency(subtotal)}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <FontAwesomeIcon icon={faSave} className="h-4 w-4" />
                {submitting ? 'Menyimpan...' : 'Simpan Retur'}
              </button>

              <button
                type="button"
                onClick={handleReset}
                disabled={submitting}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <FontAwesomeIcon icon={faRotateLeft} className="h-4 w-4" />
                Reset Form
              </button>
            </div>
          </div>
        </section>
      </form>
    </div>
  );
}
