'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faBoxesStacked,
  faFileInvoice,
  faLink,
  faPlus,
  faRotateLeft,
  faSave,
  faTrash,
  faTruck,
} from '@fortawesome/free-solid-svg-icons';

import { api } from '@/lib/api';
import { getActiveOutletId, setActiveOutletId } from '@/lib/auth';
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

type GoodsReceiptFormState = {
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

function getMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || 'Gagal menyimpan goods receipt';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Terjadi kesalahan';
}

function createEmptyItem(): GoodsReceiptFormItem {
  return {
    purchaseOrderItemId: '',
    productId: '',
    quantityAccepted: '1',
    unitCost: '',
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

function getTodayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export default function GoodsReceiptCreatePage() {
  const router = useRouter();

  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderSummary[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [loadingPurchaseOrders, setLoadingPurchaseOrders] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState<GoodsReceiptFormState>({
    outletId: '',
    supplierId: '',
    purchaseOrderId: '',
    receiptDate: getTodayInputValue(),
    supplierInvoiceNumber: '',
    notes: '',
    items: [createEmptyItem()],
  });

  async function fetchMeta() {
    try {
      setLoadingMeta(true);
      const [outletResponse, supplierResponse, productResponse] =
        await Promise.all([
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
          api.get('/business/products', {
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
      const productItems = Array.isArray(productResponse.data?.data)
        ? productResponse.data.data
        : [];

      setOutlets(outletItems);
      setSuppliers(supplierItems);
      setProducts(productItems);

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
        item.status === 'SUBMITTED' || item.status === 'PARTIALLY_RECEIVED',
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

      const detail = response.data.data as PurchaseOrderDetail;
      const remainingItems = detail.items
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
        purchaseOrderId: detail.id,
        supplierId: detail.supplierId,
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
      setMessage(getMessage(error));
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

  function handleReset() {
    setMessage('');
    setForm({
      outletId: form.outletId,
      supplierId: '',
      purchaseOrderId: '',
      receiptDate: getTodayInputValue(),
      supplierInvoiceNumber: '',
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

    if (!form.supplierId) {
      setMessage('Supplier wajib dipilih.');
      return;
    }

    if (form.items.length === 0) {
      setMessage('Minimal harus ada 1 item goods receipt.');
      return;
    }

    const seenProductIds = new Set<string>();

    for (const item of form.items) {
      if (!item.productId) {
        setMessage('Semua baris item wajib memilih product.');
        return;
      }

      if (seenProductIds.has(item.productId)) {
        setMessage('Product pada goods receipt tidak boleh duplikat.');
        return;
      }

      seenProductIds.add(item.productId);

      const quantityAccepted = Number(item.quantityAccepted);
      const unitCost = Number(item.unitCost);

      if (!Number.isFinite(quantityAccepted) || quantityAccepted <= 0) {
        setMessage('Quantity accepted item harus lebih besar dari 0.');
        return;
      }

      if (!Number.isFinite(unitCost) || unitCost < 0) {
        setMessage('Unit cost item harus 0 atau lebih besar.');
        return;
      }
    }

    try {
      setSubmitting(true);

      await api.post('/goods-receipts', {
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

      router.push('/dashboard/goods-receipts');
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
      void fetchPurchaseOrders(form.outletId);
    } else {
      setPurchaseOrders([]);
    }
  }, [form.outletId]);

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

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-700">
            <FontAwesomeIcon icon={faBoxesStacked} className="h-3 w-3" />
            Procurement
          </div>

          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
            Tambah Goods Receipt
          </h1>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Buat draft penerimaan barang untuk outlet aktif.
          </p>
        </div>

        <Link
          href="/dashboard/goods-receipts"
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
              Form Goods Receipt
            </h2>
            <p className="text-sm text-slate-500">
              Isi data header dan item penerimaan barang.
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
                  Purchase Order
                </label>
                <select
                  value={form.purchaseOrderId}
                  onChange={(event) => void handleSelectPurchaseOrder(event.target.value)}
                  disabled={loadingPurchaseOrders || !form.outletId}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
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
                  disabled={loadingMeta || Boolean(form.purchaseOrderId)}
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
                  Receipt Date <span className="text-red-500">*</span>
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
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold text-slate-800">
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
                  placeholder="Nomor invoice supplier"
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
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
                  placeholder="Catatan goods receipt"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
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
                    Isi quantity accepted dan unit cost penerimaan barang.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={addItem}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  <FontAwesomeIcon icon={faPlus} className="h-3.5 w-3.5" />
                  Tambah Item
                </button>
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

                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="inline-flex h-9 items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                        >
                          <FontAwesomeIcon icon={faTrash} className="h-3.5 w-3.5" />
                          Hapus
                        </button>
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
                            disabled={loadingMeta || Boolean(item.purchaseOrderItemId)}
                            className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            <option value="">
                              {loadingMeta ? 'Memuat product...' : 'Pilih product'}
                            </option>
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
                            className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
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
                            className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
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
                            placeholder="Catatan item"
                            className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
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
                  <FontAwesomeIcon icon={faFileInvoice} className="h-3 w-3" />
                  Purchase Order
                </div>
                <p className="mt-2 text-sm font-medium text-slate-800">
                  {selectedPurchaseOrder?.poNumber || 'Tanpa purchase order'}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  <FontAwesomeIcon icon={faBoxesStacked} className="h-3 w-3" />
                  Items
                </div>
                <p className="mt-2 text-sm font-medium text-slate-800">
                  {form.items.length} baris item
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  <FontAwesomeIcon icon={faTruck} className="h-3 w-3" />
                  Total
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {formatCurrency(subtotal)}
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
                {submitting ? 'Menyimpan...' : 'Simpan Draft Receipt'}
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
                href="/dashboard/goods-receipts"
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
                'Receipt bisa dibuat manual atau ditautkan ke purchase order.',
                'Jika memilih purchase order, supplier akan ikut otomatis.',
                'Draft receipt bisa diposting nanti dari halaman detail.',
                'Posting receipt akan menambah stok inventory.',
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
