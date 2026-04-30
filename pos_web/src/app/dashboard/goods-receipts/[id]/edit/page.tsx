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
  faFileInvoice,
  faFloppyDisk,
  faLink,
  faPlus,
  faTrash,
  faTruck,
} from '@fortawesome/free-solid-svg-icons';

import { api } from '@/lib/api';
import { setActiveOutletId } from '@/lib/auth';
import type { GoodsReceiptDetail, GoodsReceiptStatus } from '@/types/goods-receipt';
import type { Outlet } from '@/types/outlet';
import type { Product } from '@/types/product';
import type { PurchaseOrderDetail, PurchaseOrderSummary } from '@/types/purchase-order';
import type { Supplier } from '@/types/supplier';

type GoodsReceiptFormItem = {
  purchaseOrderItemId: string;
  productId: string;
  quantityAccepted: string;
  unitCost: string;
  note: string;
};

type EditGoodsReceiptForm = {
  outletId: string;
  supplierId: string;
  purchaseOrderId: string;
  receiptDate: string;
  supplierInvoiceNumber: string;
  notes: string;
  items: GoodsReceiptFormItem[];
};

type OutletEnvelope = {
  items?: Outlet[];
};

function createEmptyItem(): GoodsReceiptFormItem {
  return {
    purchaseOrderItemId: '',
    productId: '',
    quantityAccepted: '1',
    unitCost: '',
    note: '',
  };
}

function getMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || fallback;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatDate(value: string | null) {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
  }).format(new Date(value));
}

function getStatusBadgeClass(status: GoodsReceiptStatus) {
  if (status === 'DRAFT') {
    return 'border border-amber-200 bg-amber-50 text-amber-700';
  }

  if (status === 'POSTED') {
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

export default function GoodsReceiptEditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [detail, setDetail] = useState<GoodsReceiptDetail | null>(null);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderSummary[]>([]);
  const [form, setForm] = useState<EditGoodsReceiptForm>({
    outletId: '',
    supplierId: '',
    purchaseOrderId: '',
    receiptDate: '',
    supplierInvoiceNumber: '',
    notes: '',
    items: [createEmptyItem()],
  });
  const [status, setStatus] = useState<GoodsReceiptStatus>('DRAFT');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [loadingPurchaseOrders, setLoadingPurchaseOrders] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>(
    '',
  );

  const isEditable = status === 'DRAFT';

  async function fetchPurchaseOrders(outletId: string) {
    if (!outletId) {
      setPurchaseOrders([]);
      return;
    }

    try {
      setLoadingPurchaseOrders(true);
      const response = await api.get('/purchase-orders', {
        params: {
          outletId,
          perPage: 100,
        },
      });

      const items = Array.isArray(response.data?.data) ? response.data.data : [];
      const eligibleItems = (items as PurchaseOrderSummary[]).filter((item) =>
        item.status === 'SUBMITTED' ||
        item.status === 'PARTIALLY_RECEIVED' ||
        item.id === detail?.purchaseOrderId,
      );
      setPurchaseOrders(eligibleItems);
    } catch {
      setPurchaseOrders([]);
    } finally {
      setLoadingPurchaseOrders(false);
    }
  }

  async function handleSelectPurchaseOrder(purchaseOrderId: string) {
    setForm((prev) => ({
      ...prev,
      purchaseOrderId,
    }));

    if (!purchaseOrderId) {
      setForm((prev) => ({
        ...prev,
        purchaseOrderId: '',
        items: [createEmptyItem()],
      }));
      return;
    }

    try {
      const response = await api.get(`/purchase-orders/${purchaseOrderId}`, {
        params: {
          outletId: form.outletId,
        },
      });

      const purchaseOrderDetail = response.data.data as PurchaseOrderDetail;
      const remainingItems = purchaseOrderDetail.items
        .map((item) => {
          const remaining =
            Number(item.quantityOrdered || '0') - Number(item.quantityReceived || '0');

          return {
            item,
            remaining,
          };
        })
        .filter((entry) => entry.remaining > 0);

      setForm((prev) => ({
        ...prev,
        purchaseOrderId: purchaseOrderDetail.id,
        supplierId: purchaseOrderDetail.supplierId,
        items:
          remainingItems.length > 0
            ? remainingItems.map((entry) => ({
                purchaseOrderItemId: entry.item.id,
                productId: entry.item.productId,
                quantityAccepted: String(entry.remaining),
                unitCost: entry.item.unitCost,
                note: entry.item.note || '',
              }))
            : [createEmptyItem()],
      }));
    } catch (error: unknown) {
      setMessage(getMessage(error, 'Gagal memuat purchase order'));
      setMessageType('error');
    }
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

      const detailResponse = await api.get(`/goods-receipts/${params.id}`, {
        params: {
          outletId: outletItems[0]?.id,
        },
      }).catch(async (firstError: unknown) => {
        for (const outlet of outletItems) {
          try {
            return await api.get(`/goods-receipts/${params.id}`, {
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

      const detailItem: GoodsReceiptDetail = detailResponse.data.data;
      setDetail(detailItem);
      setStatus(detailItem.status);
      setActiveOutletId(detailItem.outletId);

      const [supplierResponse, productResponse] = await Promise.all([
        api.get('/suppliers', {
          params: {
            status: 'ACTIVE',
            perPage: 100,
          },
        }),
        api.get('/business/products', {
          params: {
            status: 'ACTIVE',
            perPage: 100,
          },
        }),
      ]);

      setSuppliers(
        Array.isArray(supplierResponse.data?.data) ? supplierResponse.data.data : [],
      );
      setProducts(
        Array.isArray(productResponse.data?.data) ? productResponse.data.data : [],
      );
      setForm({
        outletId: detailItem.outletId,
        supplierId: detailItem.supplierId,
        purchaseOrderId: detailItem.purchaseOrderId || '',
        receiptDate: toDateInputValue(detailItem.receiptDate),
        supplierInvoiceNumber: detailItem.supplierInvoiceNumber || '',
        notes: detailItem.notes || '',
        items:
          detailItem.items.length > 0
            ? detailItem.items.map((item) => ({
                purchaseOrderItemId: item.purchaseOrderItemId || '',
                productId: item.productId,
                quantityAccepted: item.quantityAccepted,
                unitCost: item.unitCost,
                note: item.note || '',
              }))
            : [createEmptyItem()],
      });
      await fetchPurchaseOrders(detailItem.outletId);
    } catch (error: unknown) {
      setMessage(getMessage(error, 'Gagal memuat goods receipt'));
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  }

  function updateItem(
    index: number,
    key: keyof GoodsReceiptFormItem,
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

  function addItem() {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, createEmptyItem()],
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
      setMessage('Goods receipt ini tidak bisa diedit lagi.');
      setMessageType('error');
      return;
    }

    if (!form.outletId || !form.supplierId) {
      setMessage('Outlet dan supplier wajib diisi.');
      setMessageType('error');
      return;
    }

    const seenProductIds = new Set<string>();

    for (const item of form.items) {
      if (!item.productId) {
        setMessage('Semua baris item wajib memilih product.');
        setMessageType('error');
        return;
      }

      if (seenProductIds.has(item.productId)) {
        setMessage('Product pada goods receipt tidak boleh duplikat.');
        setMessageType('error');
        return;
      }

      seenProductIds.add(item.productId);

      const quantityAccepted = Number(item.quantityAccepted);
      const unitCost = Number(item.unitCost);

      if (!Number.isFinite(quantityAccepted) || quantityAccepted <= 0) {
        setMessage('Quantity accepted item harus lebih besar dari 0.');
        setMessageType('error');
        return;
      }

      if (!Number.isFinite(unitCost) || unitCost < 0) {
        setMessage('Unit cost item harus 0 atau lebih besar.');
        setMessageType('error');
        return;
      }
    }

    try {
      setSaving(true);

      const response = await api.put(`/goods-receipts/${params.id}`, {
        outletId: form.outletId,
        supplierId: form.supplierId,
        purchaseOrderId: form.purchaseOrderId || undefined,
        receiptDate: form.receiptDate,
        supplierInvoiceNumber: form.supplierInvoiceNumber.trim() || undefined,
        notes: form.notes.trim() || undefined,
        items: form.items.map((item) => ({
          purchaseOrderItemId: item.purchaseOrderItemId || undefined,
          productId: item.productId,
          quantityAccepted: Number(item.quantityAccepted),
          unitCost: Number(item.unitCost),
          note: item.note.trim() || undefined,
        })),
      });

      const updated: GoodsReceiptDetail = response.data.data;
      setDetail(updated);
      setStatus(updated.status);
      setMessage('Goods receipt berhasil diperbarui');
      setMessageType('success');
    } catch (error: unknown) {
      setMessage(getMessage(error, 'Gagal memperbarui goods receipt'));
      setMessageType('error');
    } finally {
      setSaving(false);
    }
  }

  async function handlePost() {
    if (!detail) {
      return;
    }

    try {
      setStatusLoading(true);
      setMessage('');
      setMessageType('');

      const response = await api.patch(`/goods-receipts/${params.id}/post`, {
        outletId: detail.outletId,
      });

      const updated: GoodsReceiptDetail = response.data.data;
      setDetail(updated);
      setStatus(updated.status);
      setMessage('Goods receipt berhasil diposting');
      setMessageType('success');
    } catch (error: unknown) {
      setMessage(getMessage(error, 'Gagal memposting goods receipt'));
      setMessageType('error');
    } finally {
      setStatusLoading(false);
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

      const response = await api.patch(`/goods-receipts/${params.id}/void`, {
        outletId: detail.outletId,
      });

      const updated: GoodsReceiptDetail = response.data.data;
      setDetail(updated);
      setStatus(updated.status);
      setMessage('Goods receipt berhasil dibatalkan');
      setMessageType('success');
    } catch (error: unknown) {
      setMessage(getMessage(error, 'Gagal membatalkan goods receipt'));
      setMessageType('error');
    } finally {
      setStatusLoading(false);
    }
  }

  useEffect(() => {
    void fetchMetaAndDetail();
  }, [params.id]);

  useEffect(() => {
    if (detail && form.outletId && form.outletId !== detail.outletId) {
      void fetchPurchaseOrders(form.outletId);
    }
  }, [form.outletId, detail]);

  const selectedSupplier = useMemo(
    () => suppliers.find((item) => item.id === form.supplierId) ?? null,
    [form.supplierId, suppliers],
  );
  const selectedPurchaseOrder = useMemo(
    () => purchaseOrders.find((item) => item.id === form.purchaseOrderId) ?? null,
    [form.purchaseOrderId, purchaseOrders],
  );
  const subtotal = useMemo(
    () =>
      form.items.reduce((total, item) => {
        const quantityAccepted = Number(item.quantityAccepted);
        const unitCost = Number(item.unitCost);

        if (!Number.isFinite(quantityAccepted) || !Number.isFinite(unitCost)) {
          return total;
        }

        return total + quantityAccepted * unitCost;
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
            <FontAwesomeIcon icon={faBoxesStacked} className="h-3 w-3" />
            Goods Receipt Detail
          </div>

          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
            {detail?.receiptNumber || 'Goods Receipt'}
          </h1>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Edit draft goods receipt atau posting penerimaan barang.
          </p>
        </div>

        <button
          type="button"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          onClick={() => router.push('/dashboard/goods-receipts')}
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
                  Purchase Order
                </label>
                <select
                  value={form.purchaseOrderId}
                  onChange={(event) => void handleSelectPurchaseOrder(event.target.value)}
                  disabled={!isEditable || loadingPurchaseOrders}
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <option value="">
                    {loadingPurchaseOrders ? 'Memuat purchase order...' : 'Tanpa purchase order'}
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
                  disabled={!isEditable || Boolean(form.purchaseOrderId)}
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
                  Receipt Date
                </label>
                <input
                  type="date"
                  value={form.receiptDate}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      receiptDate: event.target.value,
                    }))
                  }
                  disabled={!isEditable}
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="block text-sm font-medium text-slate-700">
                  Supplier Invoice Number
                </label>
                <input
                  value={form.supplierInvoiceNumber}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      supplierInvoiceNumber: event.target.value,
                    }))
                  }
                  disabled={!isEditable}
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
                  placeholder="Masukkan catatan goods receipt"
                />
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Item Goods Receipt
                  </h3>
                  <p className="text-xs text-slate-500">
                    Product, quantity accepted, dan unit cost penerimaan.
                  </p>
                </div>

                {isEditable ? (
                  <button
                    type="button"
                    onClick={addItem}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    <FontAwesomeIcon icon={faPlus} className="h-3.5 w-3.5" />
                    Tambah Item
                  </button>
                ) : null}
              </div>

              <div className="mt-4 grid gap-4">
                {form.items.map((item, index) => {
                  const lineSubtotal =
                    Number(item.quantityAccepted || '0') * Number(item.unitCost || '0');

                  return (
                    <div
                      key={`${index}-${item.productId}-${item.purchaseOrderItemId}`}
                      className="rounded-3xl border border-slate-200 bg-white p-4"
                    >
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            Item #{index + 1}
                          </p>
                          {item.purchaseOrderItemId ? (
                            <p className="mt-1 text-xs text-sky-600">
                              <FontAwesomeIcon icon={faLink} className="mr-1 h-3 w-3" />
                              Terkait purchase order item
                            </p>
                          ) : null}
                        </div>

                        {isEditable ? (
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="inline-flex h-9 items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                          >
                            <FontAwesomeIcon
                              icon={faTrash}
                              className="h-3.5 w-3.5"
                            />
                            Hapus
                          </button>
                        ) : null}
                      </div>

                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <div className="space-y-2 xl:col-span-2">
                          <label className="text-sm font-medium text-slate-700">
                            Product
                          </label>
                          <select
                            value={item.productId}
                            onChange={(event) =>
                              updateItem(index, 'productId', event.target.value)
                            }
                            disabled={!isEditable || Boolean(item.purchaseOrderItemId)}
                            className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            <option value="">Pilih product</option>
                            {products.map((product) => (
                              <option key={product.id} value={product.id}>
                                {product.name} ({product.code || '-'})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700">
                            Quantity Accepted
                          </label>
                          <input
                            type="number"
                            min="0.001"
                            step="0.001"
                            value={item.quantityAccepted}
                            onChange={(event) =>
                              updateItem(index, 'quantityAccepted', event.target.value)
                            }
                            disabled={!isEditable}
                            className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700">
                            Unit Cost
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitCost}
                            onChange={(event) =>
                              updateItem(index, 'unitCost', event.target.value)
                            }
                            disabled={!isEditable}
                            className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
                          />
                        </div>

                        <div className="space-y-2 md:col-span-2 xl:col-span-3">
                          <label className="text-sm font-medium text-slate-700">
                            Note
                          </label>
                          <input
                            value={item.note}
                            onChange={(event) =>
                              updateItem(index, 'note', event.target.value)
                            }
                            disabled={!isEditable}
                            placeholder="Catatan item"
                            className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700">
                            Subtotal
                          </label>
                          <div className="flex h-11 items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-900">
                            {formatCurrency(lineSubtotal)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                {status === 'DRAFT' ? (
                  <button
                    type="button"
                    onClick={() => void handlePost()}
                    disabled={statusLoading}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <FontAwesomeIcon
                      icon={faCircleCheck}
                      className="h-4 w-4"
                    />
                    {statusLoading ? 'Memproses...' : 'Post Receipt'}
                  </button>
                ) : null}

                {status === 'DRAFT' ? (
                  <button
                    type="button"
                    onClick={() => void handleVoid()}
                    disabled={statusLoading}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <FontAwesomeIcon icon={faBan} className="h-4 w-4" />
                    {statusLoading ? 'Memproses...' : 'Void Receipt'}
                  </button>
                ) : null}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/dashboard/goods-receipts"
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

        <aside className="space-y-4">
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
              <FontAwesomeIcon icon={faTruck} className="h-4 w-4" />
            </div>

            <h2 className="mt-4 text-base font-semibold text-slate-900">
              Ringkasan Receipt
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
                  <FontAwesomeIcon icon={faFileInvoice} className="h-3 w-3" />
                  Purchase Order
                </div>
                <p className="mt-2 font-medium text-slate-800">
                  {selectedPurchaseOrder?.poNumber || detail?.purchaseOrderNumber || 'Tanpa purchase order'}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  <FontAwesomeIcon icon={faBoxesStacked} className="h-3 w-3" />
                  Items
                </div>
                <p className="mt-2 font-medium text-slate-800">
                  {form.items.length} baris item
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
                  Total
                </p>
                <p className="mt-2 font-semibold text-slate-900">
                  {formatCurrency(subtotal)}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Posted At
                </p>
                <p className="mt-2 font-medium text-slate-800">
                  {formatDate(detail?.postedAt || null)}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-base font-semibold text-slate-900">
              Catatan Edit
            </p>

            <div className="mt-4 space-y-2">
              {[
                'Draft bisa diedit penuh sebelum diposting.',
                'Receipt posted tidak bisa diedit lagi di fase ini.',
                'Posting receipt akan menambah stok inventory.',
                'Void hanya tersedia selama receipt masih draft.',
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
