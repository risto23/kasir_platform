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
  faPlus,
  faRotateLeft,
  faTrash,
  faTruck,
} from '@fortawesome/free-solid-svg-icons';

import { api } from '@/lib/api';
import { setActiveOutletId } from '@/lib/auth';
import type { Outlet } from '@/types/outlet';
import type {
  PurchaseOrderDetail,
  PurchaseOrderStatus,
} from '@/types/purchase-order';
import type { Product } from '@/types/product';
import type { Supplier } from '@/types/supplier';

type PurchaseOrderFormItem = {
  productId: string;
  quantity: string;
  unitCost: string;
  note: string;
};

type EditPurchaseOrderForm = {
  outletId: string;
  supplierId: string;
  orderDate: string;
  expectedDate: string;
  notes: string;
  items: PurchaseOrderFormItem[];
};

type OutletEnvelope = {
  items?: Outlet[];
};

function createEmptyItem(): PurchaseOrderFormItem {
  return {
    productId: '',
    quantity: '1',
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

function getStatusBadgeClass(status: PurchaseOrderStatus) {
  if (status === 'DRAFT') {
    return 'border border-amber-200 bg-amber-50 text-amber-700';
  }

  if (status === 'SUBMITTED') {
    return 'border border-sky-200 bg-sky-50 text-sky-700';
  }

  if (status === 'CANCELLED') {
    return 'border border-red-200 bg-red-50 text-red-700';
  }

  return 'border border-slate-200 bg-slate-100 text-slate-600';
}

function toDateInputValue(value: string | null) {
  if (!value) {
    return '';
  }

  return value.slice(0, 10);
}

export default function PurchaseOrderEditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [detail, setDetail] = useState<PurchaseOrderDetail | null>(null);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState<EditPurchaseOrderForm>({
    outletId: '',
    supplierId: '',
    orderDate: '',
    expectedDate: '',
    notes: '',
    items: [createEmptyItem()],
  });
  const [status, setStatus] = useState<PurchaseOrderStatus>('DRAFT');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>(
    '',
  );

  const isEditable = status === 'DRAFT';

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

      const detailResponse = await api.get(`/purchase-orders/${params.id}`, {
        params: {
          outletId: outletItems[0]?.id,
        },
      }).catch(async (firstError: unknown) => {
        for (const outlet of outletItems) {
          try {
            return await api.get(`/purchase-orders/${params.id}`, {
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

      const detailItem: PurchaseOrderDetail = detailResponse.data.data;
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
        orderDate: toDateInputValue(detailItem.orderDate),
        expectedDate: toDateInputValue(detailItem.expectedDate),
        notes: detailItem.notes || '',
        items:
          detailItem.items.length > 0
            ? detailItem.items.map((item) => ({
                productId: item.productId,
                quantity: item.quantityOrdered,
                unitCost: item.unitCost,
                note: item.note || '',
              }))
            : [createEmptyItem()],
      });
    } catch (error: unknown) {
      setMessage(getMessage(error, 'Gagal memuat purchase order'));
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  }

  function updateItem(
    index: number,
    key: keyof PurchaseOrderFormItem,
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
      setMessage('Purchase order ini tidak bisa diedit lagi.');
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
        setMessage('Product pada purchase order tidak boleh duplikat.');
        setMessageType('error');
        return;
      }

      seenProductIds.add(item.productId);

      const quantity = Number(item.quantity);
      const unitCost = Number(item.unitCost);

      if (!Number.isFinite(quantity) || quantity <= 0) {
        setMessage('Quantity item harus lebih besar dari 0.');
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

      const response = await api.put(`/purchase-orders/${params.id}`, {
        outletId: form.outletId,
        supplierId: form.supplierId,
        orderDate: form.orderDate,
        expectedDate: form.expectedDate || undefined,
        notes: form.notes.trim() || undefined,
        items: form.items.map((item) => ({
          productId: item.productId,
          quantity: Number(item.quantity),
          unitCost: Number(item.unitCost),
          note: item.note.trim() || undefined,
        })),
      });

      const updated: PurchaseOrderDetail = response.data.data;
      setDetail(updated);
      setStatus(updated.status);
      setMessage('Purchase order berhasil diperbarui');
      setMessageType('success');
    } catch (error: unknown) {
      setMessage(getMessage(error, 'Gagal memperbarui purchase order'));
      setMessageType('error');
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateStatus(nextStatus: PurchaseOrderStatus) {
    if (!detail) {
      return;
    }

    try {
      setStatusLoading(true);
      setMessage('');
      setMessageType('');

      const response = await api.patch(`/purchase-orders/${params.id}/status`, {
        outletId: detail.outletId,
        status: nextStatus,
      });

      const updated: PurchaseOrderDetail = response.data.data;

      setDetail(updated);
      setStatus(updated.status);
      setForm((prev) => ({
        ...prev,
        outletId: updated.outletId,
        supplierId: updated.supplierId,
        orderDate: toDateInputValue(updated.orderDate),
        expectedDate: toDateInputValue(updated.expectedDate),
        notes: updated.notes || '',
      }));
      setMessage(
        nextStatus === 'SUBMITTED'
          ? 'Purchase order berhasil diajukan'
          : 'Purchase order berhasil dibatalkan',
      );
      setMessageType('success');
    } catch (error: unknown) {
      setMessage(getMessage(error, 'Gagal memperbarui status purchase order'));
      setMessageType('error');
    } finally {
      setStatusLoading(false);
    }
  }

  useEffect(() => {
    void fetchMetaAndDetail();
  }, [params.id]);

  const selectedSupplier = useMemo(
    () => suppliers.find((item) => item.id === form.supplierId) ?? null,
    [form.supplierId, suppliers],
  );
  const subtotal = useMemo(
    () =>
      form.items.reduce((total, item) => {
        const quantity = Number(item.quantity);
        const unitCost = Number(item.unitCost);

        if (!Number.isFinite(quantity) || !Number.isFinite(unitCost)) {
          return total;
        }

        return total + quantity * unitCost;
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
            <FontAwesomeIcon icon={faFileInvoice} className="h-3 w-3" />
            Purchase Order Detail
          </div>

          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
            {detail?.poNumber || 'Purchase Order'}
          </h1>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Edit draft purchase order atau ubah status pengajuannya.
          </p>
        </div>

        <button
          type="button"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          onClick={() => router.push('/dashboard/purchase-orders')}
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
                  disabled={!isEditable}
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
                  Order Date
                </label>
                <input
                  type="date"
                  value={form.orderDate}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      orderDate: event.target.value,
                    }))
                  }
                  disabled={!isEditable}
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Expected Date
                </label>
                <input
                  type="date"
                  value={form.expectedDate}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      expectedDate: event.target.value,
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
                  placeholder="Masukkan catatan purchase order"
                />
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Item Purchase Order
                  </h3>
                  <p className="text-xs text-slate-500">
                    Product, quantity, dan unit cost pembelian.
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
                    Number(item.quantity || '0') * Number(item.unitCost || '0');

                  return (
                    <div
                      key={`${index}-${item.productId}`}
                      className="rounded-3xl border border-slate-200 bg-white p-4"
                    >
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            Item #{index + 1}
                          </p>
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
                            disabled={!isEditable}
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
                            Quantity
                          </label>
                          <input
                            type="number"
                            min="0.001"
                            step="0.001"
                            value={item.quantity}
                            onChange={(event) =>
                              updateItem(index, 'quantity', event.target.value)
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
                    onClick={() => void handleUpdateStatus('SUBMITTED')}
                    disabled={statusLoading}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 text-sm font-semibold text-sky-700 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <FontAwesomeIcon
                      icon={faCircleCheck}
                      className="h-4 w-4"
                    />
                    {statusLoading ? 'Memproses...' : 'Submit PO'}
                  </button>
                ) : null}

                {(status === 'DRAFT' || status === 'SUBMITTED') && (
                  <button
                    type="button"
                    onClick={() => void handleUpdateStatus('CANCELLED')}
                    disabled={statusLoading}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <FontAwesomeIcon icon={faBan} className="h-4 w-4" />
                    {statusLoading ? 'Memproses...' : 'Batalkan PO'}
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/dashboard/purchase-orders"
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
              Ringkasan PO
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
                  <FontAwesomeIcon icon={faBoxesStacked} className="h-3 w-3" />
                  Items
                </div>
                <p className="mt-2 font-medium text-slate-800">
                  {form.items.length} baris item
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  <FontAwesomeIcon icon={faFileInvoice} className="h-3 w-3" />
                  Status
                </div>
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
                  Submitted At
                </p>
                <p className="mt-2 font-medium text-slate-800">
                  {formatDate(detail?.submittedAt || null)}
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
                'Draft bisa diedit penuh sebelum submit.',
                'PO submitted tidak bisa diedit lagi di fase ini.',
                'Cancel tersedia untuk draft dan submitted.',
                'Penerimaan barang belum masuk di fase ini.',
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
