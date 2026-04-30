'use client';

import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faBan,
  faBoxesStacked,
  faCircleCheck,
  faFloppyDisk,
  faRotateLeft,
  faSave,
  faTrash,
  faTruck,
} from '@fortawesome/free-solid-svg-icons';

import { api } from '@/lib/api';
import { getActiveOutletId, setActiveOutletId } from '@/lib/auth';
import type { GoodsReceiptDetail, GoodsReceiptSummary } from '@/types/goods-receipt';
import type { Outlet } from '@/types/outlet';
import type {
  PurchaseReturnDetail,
  PurchaseReturnStatus,
} from '@/types/purchase-return';

type PurchaseReturnFormItem = {
  id?: string;
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

function getMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || fallback;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
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

function formatCurrency(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function getStatusBadgeClass(status: PurchaseReturnStatus) {
  if (status === 'DRAFT') {
    return 'border border-amber-200 bg-amber-50 text-amber-700';
  }

  if (status === 'POSTED') {
    return 'border border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  return 'border border-red-200 bg-red-50 text-red-700';
}

export default function PurchaseReturnEditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [goodsReceipts, setGoodsReceipts] = useState<GoodsReceiptSummary[]>([]);
  const [selectedGoodsReceipt, setSelectedGoodsReceipt] =
    useState<GoodsReceiptDetail | null>(null);
  const [detail, setDetail] = useState<PurchaseReturnDetail | null>(null);
  const [status, setStatus] = useState<PurchaseReturnStatus>('DRAFT');
  const [form, setForm] = useState<PurchaseReturnFormState>({
    outletId: '',
    goodsReceiptId: '',
    returnDate: '',
    reason: '',
    notes: '',
    items: [createEmptyItem()],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [posting, setPosting] = useState(false);
  const [voiding, setVoiding] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');

  const isEditable = status === 'DRAFT';

  async function fetchOutlets() {
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
  }

  async function fetchGoodsReceipts(outletId: string) {
    if (!outletId) {
      setGoodsReceipts([]);
      return;
    }

    const response = await api.get('/goods-receipts', {
      params: {
        outletId,
        status: 'POSTED',
        perPage: 100,
      },
    });

    setGoodsReceipts(Array.isArray(response.data?.data) ? response.data.data : []);
  }

  async function fetchGoodsReceiptDetail(goodsReceiptId: string, outletId: string) {
    if (!goodsReceiptId || !outletId) {
      setSelectedGoodsReceipt(null);
      return null;
    }

    const response = await api.get(`/goods-receipts/${goodsReceiptId}`, {
      params: {
        outletId,
      },
    });

    const goodsReceipt = response.data.data as GoodsReceiptDetail;
    setSelectedGoodsReceipt(goodsReceipt);
    return goodsReceipt;
  }

  function mapItemsFromDetail(
    purchaseReturnDetail: PurchaseReturnDetail,
    goodsReceipt: GoodsReceiptDetail,
  ) {
    return purchaseReturnDetail.items.map((item) => {
      const goodsReceiptItem = goodsReceipt.items.find(
        (goodsReceiptRow) => goodsReceiptRow.id === item.goodsReceiptItemId,
      );
      const baseRemaining = goodsReceiptItem
        ? Number(goodsReceiptItem.quantityAccepted || '0') -
          Number(goodsReceiptItem.quantityReturned || '0')
        : 0;
      const currentQuantity = Number(item.quantityReturned || '0');

      return {
        id: item.id,
        goodsReceiptItemId: item.goodsReceiptItemId,
        productName: item.productName,
        remainingReturnable: String(baseRemaining + currentQuantity),
        quantityReturned: item.quantityReturned,
        unitCost: item.unitCost,
        note: item.note || '',
      };
    });
  }

  async function fetchDetail() {
    try {
      setLoading(true);

      const outletId = getActiveOutletId();
      await fetchOutlets();

      const detailResponse = await api.get(`/purchase-returns/${params.id}`, {
        params: {
          outletId,
        },
      });

      const purchaseReturnDetail = detailResponse.data.data as PurchaseReturnDetail;
      setDetail(purchaseReturnDetail);
      setStatus(purchaseReturnDetail.status);
      setActiveOutletId(purchaseReturnDetail.outletId);

      await fetchGoodsReceipts(purchaseReturnDetail.outletId);
      const goodsReceipt = await fetchGoodsReceiptDetail(
        purchaseReturnDetail.goodsReceiptId,
        purchaseReturnDetail.outletId,
      );

      setForm({
        outletId: purchaseReturnDetail.outletId,
        goodsReceiptId: purchaseReturnDetail.goodsReceiptId,
        returnDate: purchaseReturnDetail.returnDate.slice(0, 10),
        reason: purchaseReturnDetail.reason || '',
        notes: purchaseReturnDetail.notes || '',
        items:
          goodsReceipt !== null
            ? mapItemsFromDetail(purchaseReturnDetail, goodsReceipt)
            : [createEmptyItem()],
      });
    } catch (error: unknown) {
      setMessage(getMessage(error, 'Gagal memuat purchase return'));
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectGoodsReceipt(goodsReceiptId: string) {
    setForm((prev) => ({
      ...prev,
      goodsReceiptId,
    }));

    if (!goodsReceiptId) {
      setSelectedGoodsReceipt(null);
      setForm((prev) => ({
        ...prev,
        goodsReceiptId: '',
        items: [createEmptyItem()],
      }));
      return;
    }

    try {
      const goodsReceipt = await fetchGoodsReceiptDetail(
        goodsReceiptId,
        form.outletId,
      );

      if (!goodsReceipt) {
        return;
      }

      const availableItems = goodsReceipt.items
        .map((item) => {
          const remaining =
            Number(item.quantityAccepted || '0') - Number(item.quantityReturned || '0');

          return {
            item,
            remaining,
          };
        })
        .filter((entry) => entry.remaining > 0);

      setForm((prev) => ({
        ...prev,
        goodsReceiptId: goodsReceipt.id,
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
      setMessage(getMessage(error, 'Gagal memuat goods receipt'));
      setMessageType('error');
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setMessageType('');

    if (!isEditable) {
      return;
    }

    if (!form.outletId || !form.goodsReceiptId) {
      setMessage('Outlet dan goods receipt wajib diisi.');
      setMessageType('error');
      return;
    }

    const validItems = form.items.filter((item) => item.goodsReceiptItemId);

    if (validItems.length === 0) {
      setMessage('Minimal harus ada 1 item retur.');
      setMessageType('error');
      return;
    }

    for (const item of validItems) {
      const quantityReturned = Number(item.quantityReturned);
      const remainingReturnable = Number(item.remainingReturnable);

      if (!Number.isFinite(quantityReturned) || quantityReturned <= 0) {
        setMessage('Quantity retur item harus lebih besar dari 0.');
        setMessageType('error');
        return;
      }

      if (quantityReturned > remainingReturnable) {
        setMessage('Quantity retur melebihi sisa yang bisa diretur.');
        setMessageType('error');
        return;
      }
    }

    try {
      setSaving(true);

      const response = await api.put(`/purchase-returns/${params.id}`, {
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

      const updated = response.data.data as PurchaseReturnDetail;
      setDetail(updated);
      setStatus(updated.status);
      setMessage('Purchase return berhasil diperbarui');
      setMessageType('success');
      await fetchDetail();
    } catch (error: unknown) {
      setMessage(getMessage(error, 'Gagal memperbarui purchase return'));
      setMessageType('error');
    } finally {
      setSaving(false);
    }
  }

  async function handlePost() {
    if (!isEditable) {
      return;
    }

    try {
      setPosting(true);
      setMessage('');
      setMessageType('');

      const response = await api.patch(`/purchase-returns/${params.id}/post`, {
        outletId: form.outletId,
      });

      const updated = response.data.data as PurchaseReturnDetail;
      setDetail(updated);
      setStatus(updated.status);
      setMessage('Purchase return berhasil diposting');
      setMessageType('success');
      await fetchDetail();
    } catch (error: unknown) {
      setMessage(getMessage(error, 'Gagal memposting purchase return'));
      setMessageType('error');
    } finally {
      setPosting(false);
    }
  }

  async function handleVoid() {
    if (!isEditable) {
      return;
    }

    try {
      setVoiding(true);
      setMessage('');
      setMessageType('');

      const response = await api.patch(`/purchase-returns/${params.id}/void`, {
        outletId: form.outletId,
      });

      const updated = response.data.data as PurchaseReturnDetail;
      setDetail(updated);
      setStatus(updated.status);
      setMessage('Purchase return berhasil dibatalkan');
      setMessageType('success');
      await fetchDetail();
    } catch (error: unknown) {
      setMessage(getMessage(error, 'Gagal membatalkan purchase return'));
      setMessageType('error');
    } finally {
      setVoiding(false);
    }
  }

  useEffect(() => {
    void fetchDetail();
  }, [params.id]);

  useEffect(() => {
    if (form.outletId && isEditable) {
      void fetchGoodsReceipts(form.outletId);
    }
  }, [form.outletId, isEditable]);

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

  if (loading) {
    return (
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-3">
          <div className="h-6 w-40 animate-pulse rounded bg-slate-100" />
          <div className="h-12 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-12 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-700">
            <FontAwesomeIcon icon={faTruck} className="h-3 w-3" />
            Purchase Return
          </div>

          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
            Detail Purchase Return
          </h1>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Edit draft retur pembelian atau posting retur ke inventory.
          </p>
        </div>

        <button
          type="button"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          onClick={() => router.push('/dashboard/purchase-returns')}
        >
          <FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4" />
          Kembali ke List
        </button>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          {message ? (
            <div
              className={`mb-5 rounded-2xl px-4 py-3 text-sm ${
                messageType === 'success'
                  ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border border-red-200 bg-red-50 text-red-700'
              }`}
            >
              {message}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-5">
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
                  disabled={!isEditable}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
                >
                  <option value="">Pilih outlet</option>
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
                  disabled={!isEditable}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
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
                  disabled={!isEditable}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
                >
                  <option value="">Pilih goods receipt posted</option>
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
                  disabled={!isEditable}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-800">
                  Supplier
                </label>
                <input
                  value={selectedGoodsReceipt?.supplierName || detail?.supplierName || ''}
                  readOnly
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
                  disabled={!isEditable}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Item Retur
                </h3>
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
                          disabled={!isEditable}
                          className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
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
                          disabled={!isEditable}
                          className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
                        />
                      </div>

                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          disabled={!isEditable}
                          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
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

            <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-between">
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={handlePost}
                  disabled={!isEditable || posting}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <FontAwesomeIcon icon={faCircleCheck} className="h-4 w-4" />
                  {posting ? 'Memproses...' : 'Post Retur'}
                </button>

                <button
                  type="button"
                  onClick={handleVoid}
                  disabled={!isEditable || voiding}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <FontAwesomeIcon icon={faBan} className="h-4 w-4" />
                  {voiding ? 'Memproses...' : 'Void Draft'}
                </button>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => router.push('/dashboard/purchase-returns')}
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Kembali
                </button>

                <button
                  type="submit"
                  disabled={!isEditable || saving}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <FontAwesomeIcon icon={faFloppyDisk} className="h-4 w-4" />
                  {saving ? 'Menyimpan...' : 'Simpan Draft'}
                </button>
              </div>
            </div>
          </form>
        </section>

        <aside className="space-y-4">
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
              <FontAwesomeIcon icon={faBoxesStacked} className="h-4 w-4" />
            </div>

            <h2 className="mt-4 text-base font-semibold text-slate-900">
              Ringkasan Retur
            </h2>

            <div className="mt-4 space-y-3 text-sm">
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Return Number
                </p>
                <p className="mt-2 font-medium text-slate-800">
                  {detail?.returnNumber || '-'}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Goods Receipt
                </p>
                <p className="mt-2 font-medium text-slate-800">
                  {detail?.goodsReceiptNumber || '-'}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Invoice: {detail?.supplierInvoiceNumber || '-'}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Total Retur
                </p>
                <p className="mt-2 font-medium text-slate-800">
                  {formatCurrency(subtotal)}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Status
                </p>
                <div className="mt-2">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(
                      status,
                    )}`}
                  >
                    {status}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Mode
                </p>
                <p className="mt-2 font-medium text-slate-800">
                  {isEditable ? 'Draft bisa diubah' : 'Readonly'}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <button
              type="button"
              onClick={() => void fetchDetail()}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <FontAwesomeIcon icon={faRotateLeft} className="h-4 w-4" />
              Refresh Detail
            </button>

            <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Saat retur diposting, stok outlet akan berkurang dan movement
              inventory `OUT` akan dibuat otomatis.
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
