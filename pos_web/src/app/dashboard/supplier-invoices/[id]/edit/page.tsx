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
  faCircleCheck,
  faFileInvoice,
  faFloppyDisk,
  faHandHoldingDollar,
  faReceipt,
  faRotateLeft,
  faSave,
  faTruck,
} from '@fortawesome/free-solid-svg-icons';

import { api } from '@/lib/api';
import { setActiveOutletId } from '@/lib/auth';
import type { GoodsReceiptSummary } from '@/types/goods-receipt';
import type { Outlet } from '@/types/outlet';
import type { PurchaseOrderSummary } from '@/types/purchase-order';
import type { Supplier } from '@/types/supplier';
import type { SupplierCreditSummary } from '@/types/supplier-credit';
import type {
  SupplierInvoiceDetail,
  SupplierInvoiceStatus,
  SupplierPaymentMethod,
} from '@/types/supplier-invoice';

type EditSupplierInvoiceForm = {
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

type SupplierPaymentForm = {
  paymentDate: string;
  method: SupplierPaymentMethod;
  amount: string;
  referenceNumber: string;
  note: string;
};

type ApplyCreditForm = {
  supplierCreditId: string;
  amount: string;
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

function formatCurrency(value: number | string) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDate(value: string | null) {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
  }).format(new Date(value));
}

function getStatusBadgeClass(status: SupplierInvoiceStatus) {
  if (status === 'UNPAID') {
    return 'border border-amber-200 bg-amber-50 text-amber-700';
  }

  if (status === 'PARTIALLY_PAID') {
    return 'border border-sky-200 bg-sky-50 text-sky-700';
  }

  if (status === 'PAID') {
    return 'border border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  return 'border border-red-200 bg-red-50 text-red-700';
}

function toDateInputValue(value: string | null) {
  if (!value) {
    return '';
  }

  return value.slice(0, 10);
}

function getTodayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export default function SupplierInvoiceEditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [detail, setDetail] = useState<SupplierInvoiceDetail | null>(null);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [goodsReceipts, setGoodsReceipts] = useState<GoodsReceiptSummary[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderSummary[]>([]);
  const [form, setForm] = useState<EditSupplierInvoiceForm>({
    outletId: '',
    supplierId: '',
    goodsReceiptId: '',
    purchaseOrderId: '',
    invoiceNumber: '',
    invoiceDate: '',
    dueDate: '',
    grandTotal: '',
    notes: '',
  });
  const [paymentForm, setPaymentForm] = useState<SupplierPaymentForm>({
    paymentDate: getTodayInputValue(),
    method: 'TRANSFER',
    amount: '',
    referenceNumber: '',
    note: '',
  });
  const [status, setStatus] = useState<SupplierInvoiceStatus>('UNPAID');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [loadingReferences, setLoadingReferences] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
  const [openCredits, setOpenCredits] = useState<SupplierCreditSummary[]>([]);
  const [applyCreditForm, setApplyCreditForm] = useState<ApplyCreditForm>({
    supplierCreditId: '',
    amount: '',
  });
  const [applyCreditLoading, setApplyCreditLoading] = useState(false);

  const isEditable = status === 'UNPAID' && (detail?.payments.length ?? 0) === 0;
  const canPay = status === 'UNPAID' || status === 'PARTIALLY_PAID';

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

  function applyDetailToForm(nextDetail: SupplierInvoiceDetail) {
    setDetail(nextDetail);
    setStatus(nextDetail.status);
    setForm({
      outletId: nextDetail.outletId,
      supplierId: nextDetail.supplierId,
      goodsReceiptId: nextDetail.goodsReceiptId || '',
      purchaseOrderId: nextDetail.purchaseOrderId || '',
      invoiceNumber: nextDetail.invoiceNumber,
      invoiceDate: toDateInputValue(nextDetail.invoiceDate),
      dueDate: toDateInputValue(nextDetail.dueDate),
      grandTotal: nextDetail.grandTotal,
      notes: nextDetail.notes || '',
    });
    setPaymentForm((prev) => ({
      ...prev,
      amount: nextDetail.outstandingAmount,
    }));
  }

  async function fetchMetaAndDetail() {
    try {
      setLoading(true);

      const outletResponse = await api.get('/business/outlets', {
        params: {
          status: 'ACTIVE',
          perPage: 100,
        },
      });

      const outletPayload = outletResponse.data?.data as OutletEnvelope | Outlet[];
      const outletItems = Array.isArray(outletPayload)
        ? outletPayload
        : Array.isArray(outletPayload?.items)
          ? outletPayload.items
          : [];

      setOutlets(outletItems);

      const detailResponse = await api
        .get(`/supplier-invoices/${params.id}`, {
          params: {
            outletId: outletItems[0]?.id,
          },
        })
        .catch(async (firstError: unknown) => {
          for (const outlet of outletItems) {
            try {
              return await api.get(`/supplier-invoices/${params.id}`, {
                params: {
                  outletId: outlet.id,
                },
              });
            } catch {
              continue;
            }
          }

          throw firstError;
        });

      const detailItem: SupplierInvoiceDetail = detailResponse.data.data;
      setActiveOutletId(detailItem.outletId);

      const [supplierResponse] = await Promise.all([
        api.get('/suppliers', {
          params: {
            status: 'ACTIVE',
            perPage: 100,
          },
        }),
      ]);

      setSuppliers(
        Array.isArray(supplierResponse.data?.data) ? supplierResponse.data.data : [],
      );
      applyDetailToForm(detailItem);
      await Promise.all([
        fetchReferences(detailItem.outletId),
        fetchOpenCredits(detailItem),
      ]);
    } catch (error: unknown) {
      setMessage(getMessage(error, 'Gagal memuat supplier invoice'));
      setMessageType('error');
    } finally {
      setLoading(false);
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
      grandTotal: selectedGoodsReceipt?.totalAmount || prev.grandTotal,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setMessageType('');

    if (!isEditable) {
      setMessage('Invoice ini tidak bisa diedit lagi.');
      setMessageType('error');
      return;
    }

    if (!form.outletId || !form.supplierId || !form.invoiceNumber.trim()) {
      setMessage('Outlet, supplier, dan nomor invoice wajib diisi.');
      setMessageType('error');
      return;
    }

    const parsedGrandTotal = Number(form.grandTotal);
    if (
      !form.goodsReceiptId &&
      (!Number.isFinite(parsedGrandTotal) || parsedGrandTotal <= 0)
    ) {
      setMessage('Grand total wajib diisi untuk invoice manual.');
      setMessageType('error');
      return;
    }

    try {
      setSaving(true);

      const response = await api.put(`/supplier-invoices/${params.id}`, {
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

      applyDetailToForm(response.data.data as SupplierInvoiceDetail);
      setMessage('Supplier invoice berhasil diperbarui');
      setMessageType('success');
    } catch (error: unknown) {
      setMessage(getMessage(error, 'Gagal memperbarui supplier invoice'));
      setMessageType('error');
    } finally {
      setSaving(false);
    }
  }

  async function handleVoid() {
    if (!detail) {
      return;
    }

    try {
      setStatusLoading(true);
      setMessage('');
      setMessageType('');

      const response = await api.patch(`/supplier-invoices/${params.id}/void`, {
        outletId: detail.outletId,
      });

      applyDetailToForm(response.data.data as SupplierInvoiceDetail);
      setMessage('Supplier invoice berhasil dibatalkan');
      setMessageType('success');
    } catch (error: unknown) {
      setMessage(getMessage(error, 'Gagal membatalkan supplier invoice'));
      setMessageType('error');
    } finally {
      setStatusLoading(false);
    }
  }

  async function handleCreatePayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setMessageType('');

    if (!detail || !canPay) {
      setMessage('Invoice ini tidak bisa menerima pembayaran lagi.');
      setMessageType('error');
      return;
    }

    const amount = Number(paymentForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage('Jumlah pembayaran harus lebih besar dari 0.');
      setMessageType('error');
      return;
    }

    try {
      setPaymentLoading(true);

      const response = await api.post(`/supplier-invoices/${params.id}/payments`, {
        outletId: detail.outletId,
        paymentDate: paymentForm.paymentDate,
        method: paymentForm.method,
        amount,
        referenceNumber: paymentForm.referenceNumber.trim() || undefined,
        note: paymentForm.note.trim() || undefined,
      });

      const nextDetail = response.data.data.invoice as SupplierInvoiceDetail;
      applyDetailToForm(nextDetail);
      await fetchOpenCredits(nextDetail);
      setPaymentForm({
        paymentDate: getTodayInputValue(),
        method: 'TRANSFER',
        amount: '',
        referenceNumber: '',
        note: '',
      });
      setMessage('Pembayaran supplier berhasil dibuat');
      setMessageType('success');
    } catch (error: unknown) {
      setMessage(getMessage(error, 'Gagal membuat pembayaran supplier'));
      setMessageType('error');
    } finally {
      setPaymentLoading(false);
    }
  }

  async function fetchOpenCredits(nextDetail: SupplierInvoiceDetail) {
    const invoiceCanPay =
      nextDetail.status === 'UNPAID' || nextDetail.status === 'PARTIALLY_PAID';

    if (!invoiceCanPay) {
      setOpenCredits([]);
      return;
    }

    try {
      const response = await api.get('/supplier-credits', {
        params: {
          outletId: nextDetail.outletId,
          supplierId: nextDetail.supplierId,
          status: 'OPEN',
          perPage: 100,
        },
      });
      const credits: SupplierCreditSummary[] = Array.isArray(response.data?.data)
        ? response.data.data
        : [];

      setOpenCredits(credits);
      setApplyCreditForm({
        supplierCreditId: credits[0]?.id ?? '',
        amount: credits[0]
          ? String(Math.min(Number(credits[0].remainingAmount), Number(nextDetail.outstandingAmount)))
          : '',
      });
    } catch {
      setOpenCredits([]);
    }
  }

  async function reloadDetail(outletId: string) {
    const response = await api.get(`/supplier-invoices/${params.id}`, {
      params: { outletId },
    });
    const nextDetail = response.data.data as SupplierInvoiceDetail;
    applyDetailToForm(nextDetail);
    await fetchOpenCredits(nextDetail);
  }

  async function handleApplyCredit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setMessageType('');

    if (!detail || !canPay) {
      setMessage('Invoice ini tidak bisa menerima pembayaran lagi.');
      setMessageType('error');
      return;
    }

    const selectedCredit = openCredits.find(
      (credit) => credit.id === applyCreditForm.supplierCreditId,
    );
    const amount = Number(applyCreditForm.amount);

    if (!selectedCredit) {
      setMessage('Pilih kredit supplier terlebih dahulu.');
      setMessageType('error');
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage('Jumlah kredit harus lebih besar dari 0.');
      setMessageType('error');
      return;
    }

    if (amount > Number(selectedCredit.remainingAmount)) {
      setMessage('Jumlah melebihi sisa kredit supplier.');
      setMessageType('error');
      return;
    }

    if (amount > Number(detail.outstandingAmount)) {
      setMessage('Jumlah pembayaran melebihi outstanding invoice.');
      setMessageType('error');
      return;
    }

    try {
      setApplyCreditLoading(true);

      await api.post(`/supplier-credits/${selectedCredit.id}/apply`, {
        outletId: detail.outletId,
        supplierInvoiceId: detail.id,
        amount,
      });

      await reloadDetail(detail.outletId);
      setMessage('Kredit supplier berhasil dipakai untuk invoice ini');
      setMessageType('success');
    } catch (error: unknown) {
      setMessage(getMessage(error, 'Gagal memakai kredit supplier'));
      setMessageType('error');
    } finally {
      setApplyCreditLoading(false);
    }
  }

  useEffect(() => {
    void fetchMetaAndDetail();
  }, [params.id]);

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

  if (loading) {
    return (
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-3">
          <div className="h-6 w-40 animate-pulse rounded bg-slate-100" />
          <div className="h-12 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-12 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-12 animate-pulse rounded-2xl bg-slate-100" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-700">
            <FontAwesomeIcon icon={faReceipt} className="h-3 w-3" />
            Supplier Invoice Detail
          </div>

          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
            {detail?.invoiceNumber || 'Supplier Invoice'}
          </h1>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Kelola detail invoice supplier dan pembayaran hutangnya.
          </p>
        </div>

        <button
          type="button"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          onClick={() => router.push('/dashboard/supplier-invoices')}
        >
          <FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4" />
          Kembali ke List
        </button>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <section className="space-y-5">
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
                  <label className="block text-sm font-medium text-slate-700">
                    Outlet
                  </label>
                  <select
                    value={form.outletId}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        outletId: event.target.value,
                      }))
                    }
                    disabled={!isEditable}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
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
                  <label className="block text-sm font-medium text-slate-700">
                    Goods Receipt
                  </label>
                  <select
                    value={form.goodsReceiptId}
                    onChange={(event) => handleSelectGoodsReceipt(event.target.value)}
                    disabled={!isEditable || loadingReferences}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
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
                  <label className="block text-sm font-medium text-slate-700">
                    Supplier
                  </label>
                  <select
                    value={form.supplierId}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        supplierId: event.target.value,
                      }))
                    }
                    disabled={!isEditable || Boolean(form.goodsReceiptId)}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <option value="">Pilih supplier</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name} ({supplier.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">
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
                    disabled={!isEditable || loadingReferences}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
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
                  <label className="block text-sm font-medium text-slate-700">
                    Nomor Invoice
                  </label>
                  <input
                    value={form.invoiceNumber}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        invoiceNumber: event.target.value,
                      }))
                    }
                    disabled={!isEditable}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Invoice Date
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
                    disabled={!isEditable}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">
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
                    disabled={!isEditable}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">
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
                    disabled={!isEditable || Boolean(form.goodsReceiptId)}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700">
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
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-indigo-500 focus:bg-white disabled:cursor-not-allowed disabled:opacity-70"
                    placeholder="Masukkan catatan invoice supplier"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  {isEditable ? (
                    <button
                      type="button"
                      onClick={() => void handleVoid()}
                      disabled={statusLoading}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      <FontAwesomeIcon icon={faBan} className="h-4 w-4" />
                      {statusLoading ? 'Memproses...' : 'Void Invoice'}
                    </button>
                  ) : null}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/dashboard/supplier-invoices"
                    className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Batal
                  </Link>

                  <button
                    type="submit"
                    disabled={saving || !isEditable}
                    className="h-11 rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <span className="inline-flex items-center gap-2">
                      <FontAwesomeIcon icon={faFloppyDisk} className="h-4 w-4" />
                      {saving ? 'Menyimpan...' : 'Save Changes'}
                    </span>
                  </button>
                </div>
              </div>
            </form>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Pembayaran Invoice
                </h2>
                <p className="text-sm text-slate-500">
                  Catat pembayaran ke supplier untuk mengurangi outstanding.
                </p>
              </div>

              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(
                  status,
                )}`}
              >
                {status}
              </span>
            </div>

            <form onSubmit={handleCreatePayment} className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Payment Date
                </label>
                <input
                  type="date"
                  value={paymentForm.paymentDate}
                  onChange={(event) =>
                    setPaymentForm((prev) => ({
                      ...prev,
                      paymentDate: event.target.value,
                    }))
                  }
                  disabled={!canPay || paymentLoading}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Method
                </label>
                <select
                  value={paymentForm.method}
                  onChange={(event) =>
                    setPaymentForm((prev) => ({
                      ...prev,
                      method: event.target.value as SupplierPaymentMethod,
                    }))
                  }
                  disabled={!canPay || paymentLoading}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <option value="TRANSFER">TRANSFER</option>
                  <option value="CASH">CASH</option>
                  <option value="CARD">CARD</option>
                  <option value="QRIS">QRIS</option>
                  <option value="OTHER">OTHER</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Amount
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={paymentForm.amount}
                  onChange={(event) =>
                    setPaymentForm((prev) => ({
                      ...prev,
                      amount: event.target.value,
                    }))
                  }
                  disabled={!canPay || paymentLoading}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Reference Number
                </label>
                <input
                  value={paymentForm.referenceNumber}
                  onChange={(event) =>
                    setPaymentForm((prev) => ({
                      ...prev,
                      referenceNumber: event.target.value,
                    }))
                  }
                  disabled={!canPay || paymentLoading}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="block text-sm font-medium text-slate-700">
                  Note
                </label>
                <textarea
                  value={paymentForm.note}
                  onChange={(event) =>
                    setPaymentForm((prev) => ({
                      ...prev,
                      note: event.target.value,
                    }))
                  }
                  rows={3}
                  disabled={!canPay || paymentLoading}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-indigo-500 focus:bg-white disabled:cursor-not-allowed disabled:opacity-70"
                />
              </div>

              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={!canPay || paymentLoading}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <FontAwesomeIcon icon={faCircleCheck} className="h-4 w-4" />
                  {paymentLoading ? 'Memproses...' : 'Simpan Pembayaran'}
                </button>
              </div>
            </form>

            {canPay && openCredits.length > 0 ? (
              <form
                onSubmit={handleApplyCredit}
                className="mt-6 space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4"
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <FontAwesomeIcon icon={faHandHoldingDollar} className="h-4 w-4 text-emerald-600" />
                  Pakai Kredit Supplier
                </div>
                <p className="text-xs text-slate-600">
                  Supplier ini punya kredit dari kelebihan bayar sebelumnya. Kredit yang dipakai
                  dihitung sebagai pembayaran invoice.
                </p>

                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_auto] md:items-end">
                  <label className="space-y-1 text-sm">
                    <span className="block font-medium text-slate-700">Kredit</span>
                    <select
                      value={applyCreditForm.supplierCreditId}
                      onChange={(event) => {
                        const credit = openCredits.find((item) => item.id === event.target.value);
                        setApplyCreditForm({
                          supplierCreditId: event.target.value,
                          amount: credit
                            ? String(
                                Math.min(
                                  Number(credit.remainingAmount),
                                  Number(detail?.outstandingAmount ?? 0),
                                ),
                              )
                            : '',
                        });
                      }}
                      disabled={applyCreditLoading}
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-70"
                    >
                      {openCredits.map((credit) => (
                        <option key={credit.id} value={credit.id}>
                          {credit.creditNumber} — sisa {formatCurrency(credit.remainingAmount)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-1 text-sm">
                    <span className="block font-medium text-slate-700">Jumlah</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={applyCreditForm.amount}
                      onChange={(event) =>
                        setApplyCreditForm((prev) => ({ ...prev, amount: event.target.value }))
                      }
                      disabled={applyCreditLoading}
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-70"
                    />
                  </label>

                  <button
                    type="submit"
                    disabled={applyCreditLoading}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {applyCreditLoading ? 'Memproses...' : 'Pakai Kredit'}
                  </button>
                </div>
              </form>
            ) : null}

            <div className="mt-6 space-y-3">
              <h3 className="text-sm font-semibold text-slate-900">
                Riwayat Pembayaran
              </h3>

              {detail?.appliedCredits?.map((usage) => (
                <div
                  key={usage.id}
                  className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{usage.usageNumber}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Kredit supplier {usage.creditNumber} • {formatDate(usage.usageDate)}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-slate-900">
                      {formatCurrency(usage.amount)}
                    </p>
                  </div>
                  {usage.note ? (
                    <p className="mt-1 text-sm text-slate-600">{usage.note}</p>
                  ) : null}
                </div>
              ))}

              {detail?.payments.length || detail?.appliedCredits?.length ? (
                detail.payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {payment.paymentNumber}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {payment.method} • {formatDate(payment.paymentDate)}
                        </p>
                      </div>

                      <p className="text-sm font-semibold text-slate-900">
                        {formatCurrency(payment.amount)}
                      </p>
                    </div>

                    <p className="mt-2 text-xs text-slate-500">
                      {payment.referenceNumber || 'Tanpa nomor referensi'}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {payment.note || 'Tanpa catatan'}
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  Belum ada pembayaran untuk invoice ini.
                </div>
              )}
            </div>
          </section>
        </section>

        <aside className="space-y-4">
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
              <FontAwesomeIcon icon={faTruck} className="h-4 w-4" />
            </div>

            <h2 className="mt-4 text-base font-semibold text-slate-900">
              Ringkasan Invoice
            </h2>

            <div className="mt-4 space-y-3 text-sm">
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Supplier
                </p>
                <p className="mt-2 font-medium text-slate-800">
                  {selectedSupplier?.name || detail?.supplierName || '-'}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {selectedSupplier?.code || detail?.supplierCode || '-'}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  <FontAwesomeIcon icon={faReceipt} className="h-3 w-3" />
                  Goods Receipt
                </div>
                <p className="mt-2 font-medium text-slate-800">
                  {selectedGoodsReceipt?.receiptNumber || detail?.goodsReceiptNumber || 'Manual'}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  <FontAwesomeIcon icon={faFileInvoice} className="h-3 w-3" />
                  Purchase Order
                </div>
                <p className="mt-2 font-medium text-slate-800">
                  {selectedPurchaseOrder?.poNumber || detail?.purchaseOrderNumber || 'Tanpa purchase order'}
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
                  Grand Total
                </p>
                <p className="mt-2 font-semibold text-slate-900">
                  {formatCurrency(form.grandTotal)}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Outstanding
                </p>
                <p className="mt-2 font-semibold text-amber-700">
                  {formatCurrency(detail?.outstandingAmount || '0')}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Paid Amount
                </p>
                <p className="mt-2 font-semibold text-emerald-700">
                  {formatCurrency(detail?.paidAmount || '0')}
                </p>
              </div>

              {detail?.issuedCredits?.length ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                    Kredit Supplier (Kelebihan Bayar)
                  </p>
                  {detail.issuedCredits.map((credit) => (
                    <div key={credit.id} className="mt-2">
                      <p className="font-semibold text-slate-900">
                        {credit.creditNumber} — {formatCurrency(credit.amount)}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-600">
                        Sisa {formatCurrency(credit.remainingAmount)} • {credit.status}
                      </p>
                    </div>
                  ))}
                  <Link
                    href="/dashboard/supplier-credits"
                    className="mt-2 inline-block text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                  >
                    Kelola kredit supplier
                  </Link>
                </div>
              ) : null}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-base font-semibold text-slate-900">
              Catatan
            </p>

            <div className="mt-4 space-y-2">
              {[
                'Invoice yang sudah punya pembayaran tidak bisa diedit lagi.',
                'Pembayaran baru akan mengurangi outstanding otomatis.',
                'Status PAID tercapai saat outstanding menjadi 0.',
                'Retur setelah invoice dibayar mencatat kelebihan bayar sebagai kredit supplier.',
                'Invoice VOID tidak menerima pembayaran baru.',
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
        </aside>
      </div>
    </div>
  );
}
