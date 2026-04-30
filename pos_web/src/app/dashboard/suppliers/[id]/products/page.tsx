'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faBoxesStacked,
  faFloppyDisk,
  faLink,
  faPenToSquare,
  faPlus,
  faRotateLeft,
  faStar,
  faTrash,
  faTruck,
} from '@fortawesome/free-solid-svg-icons';

import { api } from '@/lib/api';
import type { Product } from '@/types/product';
import type { Supplier, SupplierProductMapping } from '@/types/supplier';

type SupplierProductForm = {
  productId: string;
  supplierSku: string;
  lastPurchasePrice: string;
  minimumOrderQty: string;
  isPrimarySupplier: boolean;
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

function formatCurrency(value: string | null) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(value || '0'));
}

function createEmptyForm(): SupplierProductForm {
  return {
    productId: '',
    supplierSku: '',
    lastPurchasePrice: '',
    minimumOrderQty: '',
    isPrimarySupplier: false,
  };
}

export default function SupplierProductsPage() {
  const params = useParams<{ id: string }>();

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [items, setItems] = useState<SupplierProductMapping[]>([]);
  const [form, setForm] = useState<SupplierProductForm>(createEmptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');

  async function fetchData() {
    try {
      setLoading(true);

      const [supplierResponse, productResponse, mappingResponse] = await Promise.all([
        api.get(`/suppliers/${params.id}`),
        api.get('/business/products', {
          params: {
            perPage: 200,
          },
        }),
        api.get(`/suppliers/${params.id}/products`, {
          params: {
            perPage: 200,
          },
        }),
      ]);

      setSupplier(supplierResponse.data.data as Supplier);
      setProducts(
        Array.isArray(productResponse.data?.data) ? productResponse.data.data : [],
      );
      setItems(
        Array.isArray(mappingResponse.data?.data) ? mappingResponse.data.data : [],
      );
    } catch (error: unknown) {
      setMessage(getMessage(error, 'Gagal memuat mapping supplier-product'));
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setEditingId(null);
    setForm(createEmptyForm());
  }

  function loadFormFromItem(item: SupplierProductMapping) {
    setEditingId(item.id);
    setForm({
      productId: item.productId,
      supplierSku: item.supplierSku || '',
      lastPurchasePrice: item.lastPurchasePrice || '',
      minimumOrderQty: item.minimumOrderQty || '',
      isPrimarySupplier: item.isPrimarySupplier,
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setMessageType('');

    if (!form.productId) {
      setMessage('Product wajib dipilih.');
      setMessageType('error');
      return;
    }

    const parsedLastPurchasePrice = form.lastPurchasePrice.trim()
      ? Number(form.lastPurchasePrice)
      : undefined;
    const parsedMinimumOrderQty = form.minimumOrderQty.trim()
      ? Number(form.minimumOrderQty)
      : undefined;

    if (
      parsedLastPurchasePrice !== undefined &&
      (!Number.isFinite(parsedLastPurchasePrice) || parsedLastPurchasePrice < 0)
    ) {
      setMessage('Last purchase price harus 0 atau lebih besar.');
      setMessageType('error');
      return;
    }

    if (
      parsedMinimumOrderQty !== undefined &&
      (!Number.isFinite(parsedMinimumOrderQty) || parsedMinimumOrderQty <= 0)
    ) {
      setMessage('Minimum order qty harus lebih besar dari 0.');
      setMessageType('error');
      return;
    }

    try {
      setSaving(true);

      const payload = {
        productId: form.productId,
        supplierSku: form.supplierSku.trim() || undefined,
        lastPurchasePrice: parsedLastPurchasePrice,
        minimumOrderQty: parsedMinimumOrderQty,
        isPrimarySupplier: form.isPrimarySupplier,
      };

      if (editingId) {
        await api.put(`/suppliers/${params.id}/products/${editingId}`, payload);
        setMessage('Mapping supplier-product berhasil diperbarui');
      } else {
        await api.post(`/suppliers/${params.id}/products`, payload);
        setMessage('Mapping supplier-product berhasil dibuat');
      }

      setMessageType('success');
      resetForm();
      await fetchData();
    } catch (error: unknown) {
      setMessage(getMessage(error, 'Gagal menyimpan mapping supplier-product'));
      setMessageType('error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(mappingId: string) {
    try {
      setDeletingId(mappingId);
      setMessage('');
      setMessageType('');

      await api.delete(`/suppliers/${params.id}/products/${mappingId}`);

      if (editingId === mappingId) {
        resetForm();
      }

      setMessage('Mapping supplier-product berhasil dihapus');
      setMessageType('success');
      await fetchData();
    } catch (error: unknown) {
      setMessage(getMessage(error, 'Gagal menghapus mapping supplier-product'));
      setMessageType('error');
    } finally {
      setDeletingId(null);
    }
  }

  useEffect(() => {
    void fetchData();
  }, [params.id]);

  const selectedProduct = useMemo(
    () => products.find((item) => item.id === form.productId) ?? null,
    [form.productId, products],
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
            <FontAwesomeIcon icon={faLink} className="h-3 w-3" />
            Supplier Product Mapping
          </div>

          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
            {supplier?.name || 'Supplier'}
          </h1>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Kelola produk yang disuplai supplier ini, termasuk SKU supplier,
            harga beli terakhir, dan minimum order qty.
          </p>
        </div>

        <Link
          href={`/dashboard/suppliers/${params.id}/edit`}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4" />
          Kembali ke Supplier
        </Link>
      </section>

      <div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
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
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                Product
              </label>
              <select
                value={form.productId}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    productId: event.target.value,
                  }))
                }
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">Pilih product</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} ({product.code || product.sku || '-'})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                Supplier SKU
              </label>
              <input
                value={form.supplierSku}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    supplierSku: event.target.value,
                  }))
                }
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Last Purchase Price
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.lastPurchasePrice}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      lastPurchasePrice: event.target.value,
                    }))
                  }
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Minimum Order Qty
                </label>
                <input
                  type="number"
                  min="0.001"
                  step="0.001"
                  value={form.minimumOrderQty}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      minimumOrderQty: event.target.value,
                    }))
                  }
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <input
                type="checkbox"
                checked={form.isPrimarySupplier}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    isPrimarySupplier: event.target.checked,
                  }))
                }
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
              />
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Jadikan primary supplier
                </p>
                <p className="text-xs text-slate-500">
                  Jika aktif, mapping supplier lain untuk product yang sama
                  otomatis dinonaktifkan sebagai primary.
                </p>
              </div>
            </label>

            <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <span className="inline-flex items-center gap-2">
                  <FontAwesomeIcon icon={faRotateLeft} className="h-4 w-4" />
                  Reset
                </span>
              </button>

              <button
                type="submit"
                disabled={saving}
                className="h-11 rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <span className="inline-flex items-center gap-2">
                  <FontAwesomeIcon icon={editingId ? faFloppyDisk : faPlus} className="h-4 w-4" />
                  {saving
                    ? 'Menyimpan...'
                    : editingId
                      ? 'Update Mapping'
                      : 'Tambah Mapping'}
                </span>
              </button>
            </div>
          </form>
        </section>

        <section className="space-y-5">
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Mapping Produk
                </h2>
                <p className="text-sm text-slate-500">
                  Total {items.length} mapping untuk supplier ini.
                </p>
              </div>

              <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                {supplier?.code || '-'}
              </div>
            </div>

            <div className="mt-5 grid gap-4">
              {items.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                  Belum ada mapping product untuk supplier ini.
                </div>
              ) : (
                items.map((item) => {
                  const isDeleting = deletingId === item.id;

                  return (
                    <div
                      key={item.id}
                      className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-semibold text-slate-900">
                              {item.productName}
                            </h3>
                            {item.isPrimarySupplier ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                                <FontAwesomeIcon icon={faStar} className="h-3 w-3" />
                                Primary
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-xs text-slate-500">
                            {item.productCode || item.productSku || item.productBarcode || '-'}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => loadFormFromItem(item)}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 text-sm font-semibold text-sky-700 transition hover:bg-sky-100"
                          >
                            <FontAwesomeIcon icon={faPenToSquare} className="h-4 w-4" />
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => void handleDelete(item.id)}
                            disabled={isDeleting}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            <FontAwesomeIcon icon={faTrash} className="h-4 w-4" />
                            {isDeleting ? 'Menghapus...' : 'Hapus'}
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-2xl bg-white px-3 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                            Supplier SKU
                          </p>
                          <p className="mt-2 text-sm font-medium text-slate-800">
                            {item.supplierSku || '-'}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-white px-3 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                            Last Purchase
                          </p>
                          <p className="mt-2 text-sm font-medium text-slate-800">
                            {item.lastPurchasePrice
                              ? formatCurrency(item.lastPurchasePrice)
                              : '-'}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-white px-3 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                            Min Order Qty
                          </p>
                          <p className="mt-2 text-sm font-medium text-slate-800">
                            {item.minimumOrderQty || '-'} {item.productUnit || ''}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-white px-3 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                            Product Status
                          </p>
                          <p className="mt-2 text-sm font-medium text-slate-800">
                            {item.productStatus}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Ringkasan Form</h2>

            <div className="mt-4 space-y-3">
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Product
                </p>
                <p className="mt-2 text-sm font-medium text-slate-800">
                  {selectedProduct?.name || '-'}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  <FontAwesomeIcon icon={faBoxesStacked} className="h-3 w-3" />
                  Last Purchase
                </div>
                <p className="mt-2 text-sm font-medium text-slate-800">
                  {form.lastPurchasePrice
                    ? formatCurrency(form.lastPurchasePrice)
                    : '-'}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  <FontAwesomeIcon icon={faTruck} className="h-3 w-3" />
                  Minimum Order
                </div>
                <p className="mt-2 text-sm font-medium text-slate-800">
                  {form.minimumOrderQty || '-'} {selectedProduct?.unit || ''}
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
