'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faFileInvoice,
  faReceipt,
  faRotateLeft,
  faSave,
  faTruck,
} from '@fortawesome/free-solid-svg-icons';

import { api } from '@/lib/api';
import { getActiveOutletId, setActiveOutletId } from '@/lib/auth';
import type { GoodsReceiptSummary } from '@/types/goods-receipt';
import type { Outlet } from '@/types/outlet';
import type { PurchaseOrderSummary } from '@/types/purchase-order';
import type { Supplier } from '@/types/supplier';

type SupplierInvoiceFormState = {
  outletId: string;
  supplierId: string;
  goodsReceiptId: string;
  purchaseOrderId: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  grandTotal: string;
  notes: string;
};

type OutletEnvelope = {
  items?: Outlet[];
};

function getMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || 'Gagal menyimpan supplier invoice';
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

function getTodayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export default function SupplierInvoiceCreatePage() {
  const router = useRouter();

  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [goodsReceipts, setGoodsReceipts] = useState<GoodsReceiptSummary[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderSummary[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [loadingReferences, setLoadingReferences] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState<SupplierInvoiceFormState>({
    outletId: '',
    supplierId: '',
    goodsReceiptId: '',
    purchaseOrderId: '',
    invoiceNumber: '',
    invoiceDate: getTodayInputValue(),
    dueDate: '',
    grandTotal: '',
    notes: '',
  });

  async function fetchMeta() {
    try {
      setLoadingMeta(true);
      const [outletResponse, supplierResponse] = await Promise.all([
        api.get('/business/outlets', {
          params: {
            status: 'ACTIVE',
            perPage: 100,
          },
        }),
        api.get('/suppliers', {
          params: {
            status: 'ACTIVE',
            perPage: 100,
          },
        }),
      ]);

      const outletPayload = outletResponse.data?.data as OutletEnvelope | Outlet[];
      const outletItems = Array.isArray(outletPayload)
        ? outletPayload
        : Array.isArray(outletPayload?.items)
          ? outletPayload.items
          : [];
      const supplierItems = Array.isArray(supplierResponse.data?.data)
        ? supplierResponse.data.data
        : [];

      setOutlets(outletItems);
      setSuppliers(supplierItems);

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

  async function fetchReferences(outletId: string) {
    if (!outletId) {
      setGoodsReceipts([]);
      setPurchaseOrders([]);
      return;
    }

    try {
      setLoadingReferences(true);
      const [goodsReceiptResponse, purchaseOrderResponse] = await Promise.all([
        api.get('/goods-receipts', {
          params: {
            outletId,
            status: 'POSTED',
            perPage: 100,
          },
        }),
        api.get('/purchase-orders', {
          params: {
            outletId,
            perPage: 100,
          },
        }),
      ]);

      setGoodsReceipts(
        Array.isArray(goodsReceiptResponse.data?.data)
          ? goodsReceiptResponse.data.data
          : [],
      );
      setPurchaseOrders(
        Array.isArray(purchaseOrderResponse.data?.data)
          ? purchaseOrderResponse.data.data
          : [],
      );
    } catch {
      setGoodsReceipts([]);
      setPurchaseOrders([]);
    } finally {
      setLoadingReferences(false);
    }
  }

  function handleSelectGoodsReceipt(goodsReceiptId: string) {
    const selectedGoodsReceipt =
      goodsReceipts.find((item) => item.id === goodsReceiptId) ?? null;

    setForm((prev) => ({
      ...prev,
      goodsReceiptId,
      supplierId: selectedGoodsReceipt?.supplierId || prev.supplierId,
      purchaseOrderId: selectedGoodsReceipt?.purchaseOrderId || '',
      invoiceNumber:
        selectedGoodsReceipt?.supplierInvoiceNumber || prev.invoiceNumber,
      grandTotal: selectedGoodsReceipt?.totalAmount || prev.grandTotal,
    }));
  }

  function handleReset() {
    setMessage('');
    setForm((prev) => ({
      outletId: prev.outletId,
      supplierId: '',
      goodsReceiptId: '',
      purchaseOrderId: '',
      invoiceNumber: '',
      invoiceDate: getTodayInputValue(),
      dueDate: '',
      grandTotal: '',
      notes: '',
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');

    if (!form.outletId) {
      setMessage('Outlet wajib dipilih.');
      return;
    }

    if (!form.supplierId) {
      setMessage('Supplier wajib dipilih.');
      return;
    }

    if (!form.invoiceNumber.trim()) {
      setMessage('Nomor invoice wajib diisi.');
      return;
    }

    const parsedGrandTotal = Number(form.grandTotal);
    if (
      !form.goodsReceiptId &&
      (!Number.isFinite(parsedGrandTotal) || parsedGrandTotal <= 0)
    ) {
      setMessage('Grand total wajib diisi untuk invoice manual.');
      return;
    }

    try {
      setSubmitting(true);

      await api.post('/supplier-invoices', {
        outletId: form.outletId,
        supplierId: form.supplierId,
        goodsReceiptId: form.goodsReceiptId || undefined,
        purchaseOrderId: form.purchaseOrderId || undefined,
        invoiceNumber: form.invoiceNumber.trim(),
        invoiceDate: form.invoiceDate,
        dueDate: form.dueDate || undefined,
        grandTotal: form.goodsReceiptId ? undefined : parsedGrandTotal,
        notes: form.notes.trim() || undefined,
      });

      router.push('/dashboard/supplier-invoices');
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
      void fetchReferences(form.outletId);
    } else {
      setGoodsReceipts([]);
      setPurchaseOrders([]);
    }
  }, [form.outletId]);

  const selectedSupplier = useMemo(
    () => suppliers.find((item) => item.id === form.supplierId) ?? null,
    [form.supplierId, suppliers],
  );
  const selectedGoodsReceipt = useMemo(
    () => goodsReceipts.find((item) => item.id === form.goodsReceiptId) ?? null,
    [form.goodsReceiptId, goodsReceipts],
  );
  const selectedPurchaseOrder = useMemo(
    () =>
      purchaseOrders.find((item) => item.id === form.purchaseOrderId) ?? null,
    [form.purchaseOrderId, purchaseOrders],
  );

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-700">
            <FontAwesomeIcon icon={faReceipt} className="h-3 w-3" />
            Supplier Payable
          </div>

          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
            Tambah Supplier Invoice
          </h1>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Buat invoice supplier dari goods receipt atau input manual.
          </p>
        </div>

        <Link
          href="/dashboard/supplier-invoices"
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
              Form Invoice Supplier
            </h2>
            <p className="text-sm text-slate-500">
              Isi data invoice dan referensi pembelian supplier.
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
                  Outlet <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.outletId}
                  onChange={(event) => {
                    setForm((prev) => ({
                      ...prev,
                      outletId: event.target.value,
                      goodsReceiptId: '',
                      purchaseOrderId: '',
                    }));
                    if (event.target.value) {
                      setActiveOutletId(event.target.value);
                    }
                  }}
                  disabled={loadingMeta}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
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
                  Goods Receipt
                </label>
                <select
                  value={form.goodsReceiptId}
                  onChange={(event) => handleSelectGoodsReceipt(event.target.value)}
                  disabled={loadingReferences || !form.outletId}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">
                    {loadingReferences ? 'Memuat goods receipt...' : 'Tanpa goods receipt'}
                  </option>
                  {goodsReceipts.map((goodsReceipt) => (
                    <option key={goodsReceipt.id} value={goodsReceipt.id}>
                      {goodsReceipt.receiptNumber} - {goodsReceipt.supplierName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-800">
                  Supplier <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.supplierId}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      supplierId: event.target.value,
                    }))
                  }
                  disabled={loadingMeta || Boolean(form.goodsReceiptId)}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <option value="">
                    {loadingMeta ? 'Memuat supplier...' : 'Pilih supplier'}
                  </option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name} ({supplier.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-800">
                  Purchase Order
                </label>
                <select
                  value={form.purchaseOrderId}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      purchaseOrderId: event.target.value,
                    }))
                  }
                  disabled={loadingReferences}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">
                    {loadingReferences ? 'Memuat purchase order...' : 'Tanpa purchase order'}
                  </option>
                  {purchaseOrders.map((purchaseOrder) => (
                    <option key={purchaseOrder.id} value={purchaseOrder.id}>
                      {purchaseOrder.poNumber} - {purchaseOrder.supplierName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-800">
                  Nomor Invoice <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.invoiceNumber}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      invoiceNumber: event.target.value,
                    }))
                  }
                  placeholder="Nomor invoice supplier"
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-800">
                  Invoice Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={form.invoiceDate}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      invoiceDate: event.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-800">
                  Due Date
                </label>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      dueDate: event.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-800">
                  Grand Total
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.grandTotal}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      grandTotal: event.target.value,
                    }))
                  }
                  disabled={Boolean(form.goodsReceiptId)}
                  placeholder="Wajib jika invoice manual"
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
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
                  placeholder="Catatan invoice supplier"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-5">
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Ringkasan</h2>

            <div className="mt-4 space-y-3">
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Supplier
                </p>
                <p className="mt-2 text-sm font-medium text-slate-800">
                  {selectedSupplier?.name || '-'}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {selectedSupplier?.code || '-'}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  <FontAwesomeIcon icon={faReceipt} className="h-3 w-3" />
                  Goods Receipt
                </div>
                <p className="mt-2 text-sm font-medium text-slate-800">
                  {selectedGoodsReceipt?.receiptNumber || 'Manual'}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  <FontAwesomeIcon icon={faFileInvoice} className="h-3 w-3" />
                  Purchase Order
                </div>
                <p className="mt-2 text-sm font-medium text-slate-800">
                  {selectedPurchaseOrder?.poNumber || 'Tanpa purchase order'}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  <FontAwesomeIcon icon={faTruck} className="h-3 w-3" />
                  Total
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {formatCurrency(Number(form.grandTotal || '0'))}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-2">
              <button
                type="submit"
                disabled={submitting || loadingMeta}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <FontAwesomeIcon icon={faSave} className="h-4 w-4" />
                {submitting ? 'Menyimpan...' : 'Simpan Invoice'}
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

              <Link
                href="/dashboard/supplier-invoices"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4" />
                Batal
              </Link>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Catatan</h2>

            <div className="mt-4 grid gap-3">
              {[
                'Invoice bisa dibuat dari goods receipt yang sudah posted.',
                'Kalau pilih goods receipt, supplier dan total akan ikut otomatis.',
                'Invoice manual wajib isi grand total.',
                'Pembayaran invoice dilakukan dari halaman detail invoice.',
              ].map((note) => (
                <div
                  key={note}
                  className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600"
                >
                  {note}
                </div>
              ))}
            </div>
          </div>
        </section>
      </form>
    </div>
  );
}
