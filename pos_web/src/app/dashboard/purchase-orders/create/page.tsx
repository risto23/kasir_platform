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
import type { Supplier } from '@/types/supplier';

type PurchaseOrderFormItem = {
  productId: string;
  quantity: string;
  unitCost: string;
  note: string;
};

type PurchaseOrderFormState = {
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

function getMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || 'Gagal menyimpan purchase order';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Terjadi kesalahan';
}

function createEmptyItem(): PurchaseOrderFormItem {
  return {
    productId: '',
    quantity: '1',
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

export default function PurchaseOrderCreatePage() {
  const router = useRouter();

  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState<PurchaseOrderFormState>({
    outletId: '',
    supplierId: '',
    orderDate: getTodayInputValue(),
    expectedDate: '',
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

  function handleReset() {
    setMessage('');
    setForm({
      outletId: form.outletId,
      supplierId: '',
      orderDate: getTodayInputValue(),
      expectedDate: '',
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
      setMessage('Minimal harus ada 1 item purchase order.');
      return;
    }

    const seenProductIds = new Set<string>();

    for (const item of form.items) {
      if (!item.productId) {
        setMessage('Semua baris item wajib memilih product.');
        return;
      }

      if (seenProductIds.has(item.productId)) {
        setMessage('Product pada purchase order tidak boleh duplikat.');
        return;
      }

      seenProductIds.add(item.productId);

      const quantity = Number(item.quantity);
      const unitCost = Number(item.unitCost);

      if (!Number.isFinite(quantity) || quantity <= 0) {
        setMessage('Quantity item harus lebih besar dari 0.');
        return;
      }

      if (!Number.isFinite(unitCost) || unitCost < 0) {
        setMessage('Unit cost item harus 0 atau lebih besar.');
        return;
      }
    }

    try {
      setSubmitting(true);

      await api.post('/purchase-orders', {
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

      router.push('/dashboard/purchase-orders');
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

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-700">
            <FontAwesomeIcon icon={faFileInvoice} className="h-3 w-3" />
            Procurement
          </div>

          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
            Tambah Purchase Order
          </h1>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Buat draft purchase order baru untuk outlet dan supplier aktif.
          </p>
        </div>

        <Link
          href="/dashboard/purchase-orders"
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
              Form Purchase Order
            </h2>
            <p className="text-sm text-slate-500">
              Isi data header dan item purchase order.
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
                  disabled={loadingMeta}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
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
                  Order Date <span className="text-red-500">*</span>
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
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-800">
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
                  placeholder="Catatan purchase order"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
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
                    Tambahkan product, quantity, dan unit cost.
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
                          <p className="text-xs text-slate-500">
                            Pilih product dan isi harga beli.
                          </p>
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
                            disabled={loadingMeta}
                            className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
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
                {submitting ? 'Menyimpan...' : 'Simpan Draft PO'}
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
                href="/dashboard/purchase-orders"
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
                'PO dibuat di outlet aktif atau outlet yang dipilih.',
                'Status awal purchase order adalah DRAFT.',
                'Product di dalam 1 PO tidak boleh duplikat.',
                'Harga beli dicatat di unit cost PO, bukan harga jual product.',
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
