// pos_web/src/app/dashboard/products/[id]/edit/page.tsx
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
  faBoxOpen,
  faCircleCheck,
  faFloppyDisk,
  faImage,
  faLock,
  faPenToSquare,
  faTag,
  faUtensils,
  faBarcode,
  faBoxesStacked,
} from '@fortawesome/free-solid-svg-icons';

import { api } from '@/lib/api';
import { getActiveBusinessId, getCachedCurrentUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Category, CategoryListResponse } from '@/types/category';
import type { Product, ProductStatus } from '@/types/product';

type EditProductForm = {
  categoryId: string;
  name: string;
  code: string;
  sku: string;
  brand: string;
  unit: string;
  description: string;
  imageUrl: string;
  basePrice: string;
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

function getBusinessType(): 'RESTAURANT' | 'RETAIL' {
  const currentUser = getCachedCurrentUser();
  const activeBusinessId = getActiveBusinessId();

  const membership = currentUser?.businessMemberships?.find(
    (item) => item.businessId === activeBusinessId
  );

  return membership?.businessType === 'RESTAURANT' ? 'RESTAURANT' : 'RETAIL';
}

function getStatusBadgeClass(status: ProductStatus) {
  if (status === 'ACTIVE') {
    return 'border border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  return 'border border-slate-200 bg-slate-100 text-slate-600';
}

function getStatusButtonClass(status: ProductStatus) {
  if (status === 'ACTIVE') {
    return 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100';
  }

  return 'bg-slate-900 text-white hover:bg-slate-800';
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default function EditProductPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const businessType = useMemo(() => getBusinessType(), []);
  const productLabel = businessType === 'RESTAURANT' ? 'Menu' : 'Produk';
  const productLabelLower = productLabel.toLowerCase();

  const [form, setForm] = useState<EditProductForm>({
    categoryId: '',
    name: '',
    code: '',
    sku: '',
    brand: '',
    unit: '',
    description: '',
    imageUrl: '',
    basePrice: '',
  });
  const [detail, setDetail] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [status, setStatus] = useState<ProductStatus>('ACTIVE');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');

  useEffect(() => {
    async function fetchDetail() {
      try {
        setLoading(true);

        const [detailResponse, categoriesResponse] = await Promise.all([
          api.get(`/business/products/${params.id}`),
          api.get('/business/categories', {
            params: {
              status: 'ACTIVE',
              limit: 100,
            },
          }),
        ]);

        const item: Product = detailResponse.data.data;
        const categoryPayload: CategoryListResponse = categoriesResponse.data.data;

        setDetail(item);
        setForm({
          categoryId: item.categoryId ?? '',
          name: item.name ?? '',
          code: item.code ?? '',
          sku: item.sku ?? '',
          brand: item.brand ?? '',
          unit: item.unit ?? '',
          description: item.description ?? '',
          imageUrl: item.imageUrl ?? '',
          basePrice: String(item.basePrice ?? ''),
        });
        setStatus(item.status);
        setCategories(categoryPayload?.items || []);
      } catch (error: unknown) {
        setMessage(getMessage(error, `Gagal memuat ${productLabelLower}`));
        setMessageType('error');
      } finally {
        setLoading(false);
      }
    }

    void fetchDetail();
  }, [params.id, productLabelLower]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage('');
    setMessageType('');

    try {
      setSaving(true);

      const response = await api.put(`/business/products/${params.id}`, {
        categoryId: form.categoryId || null,
        name: form.name.trim(),
        sku: form.sku.trim() || null,
        brand: form.brand.trim() || null,
        unit: form.unit.trim() || null,
        description: form.description.trim() || null,
        imageUrl: form.imageUrl.trim() || null,
        basePrice: Number(form.basePrice),
      });

      const updated: Product = response.data.data;

      setDetail(updated);
      setStatus(updated.status);
      setForm({
        categoryId: updated.categoryId ?? '',
        name: updated.name ?? '',
        code: updated.code ?? '',
        sku: updated.sku ?? '',
        brand: updated.brand ?? '',
        unit: updated.unit ?? '',
        description: updated.description ?? '',
        imageUrl: updated.imageUrl ?? '',
        basePrice: String(updated.basePrice ?? ''),
      });

      setMessage(`${productLabel} berhasil diperbarui`);
      setMessageType('success');
    } catch (error: unknown) {
      setMessage(getMessage(error, `Gagal memperbarui ${productLabelLower}`));
      setMessageType('error');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStatus() {
    const newStatus: ProductStatus =
      status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

    try {
      setStatusLoading(true);
      setMessage('');
      setMessageType('');

      const response = await api.patch(`/business/products/${params.id}/status`, {
        status: newStatus,
      });

      const updated: Product = response.data.data;

      setDetail(updated);
      setStatus(updated.status);
      setMessage(`Status ${productLabelLower} berhasil diperbarui`);
      setMessageType('success');
    } catch (error: unknown) {
      setMessage(getMessage(error, 'Gagal memperbarui status'));
      setMessageType('error');
    } finally {
      setStatusLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-3">
          <div className="h-6 w-40 animate-pulse rounded bg-slate-100" />
          <div className="h-12 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-12 animate-pulse rounded-2xl bg-slate-100" />
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
            <FontAwesomeIcon
              icon={businessType === 'RESTAURANT' ? faUtensils : faPenToSquare}
              className="h-3 w-3"
            />
            Edit Product
          </div>

          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
            Edit {productLabel}
          </h1>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Perbarui informasi {productLabelLower} dalam business aktif. Kode{' '}
            {productLabelLower} tidak bisa diubah manual.
          </p>
        </div>

        <button
          type="button"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          onClick={() => router.push('/dashboard/products')}
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
                  : 'border border-rose-200 bg-rose-50 text-rose-700'
              }`}
            >
              {message}
            </div>
          ) : null}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">
                  Nama {productLabel}
                </label>
                <Input
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder={`Masukkan nama ${productLabelLower}`}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">
                  Code
                </label>
                <div className="relative">
                  <Input value={form.code} disabled className="pr-10" />
                  <FontAwesomeIcon
                    icon={faLock}
                    className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">
                  Category
                </label>
                <select
                  value={form.categoryId}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, categoryId: e.target.value }))
                  }
                  className="flex h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-indigo-400"
                >
                  <option value="">Tanpa category</option>
                  {categories.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">
                  SKU
                </label>
                <Input
                  value={form.sku}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, sku: e.target.value }))
                  }
                  placeholder={`Masukkan SKU ${productLabelLower}`}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">
                  Brand
                </label>
                <div className="relative">
                  <Input
                    value={form.brand}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, brand: e.target.value }))
                    }
                    placeholder={
                      businessType === 'RESTAURANT'
                        ? 'Contoh: Kitchen Internal'
                        : 'Contoh: Sosro'
                    }
                    className="pl-11"
                  />
                  <FontAwesomeIcon
                    icon={faBarcode}
                    className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">
                  Unit
                </label>
                <div className="relative">
                  <Input
                    value={form.unit}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, unit: e.target.value }))
                    }
                    placeholder={
                      businessType === 'RESTAURANT'
                        ? 'Contoh: Porsi / Gelas'
                        : 'Contoh: Pcs / Botol'
                    }
                    className="pl-11"
                  />
                  <FontAwesomeIcon
                    icon={faBoxesStacked}
                    className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">
                  Base Price
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.basePrice}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, basePrice: e.target.value }))
                  }
                  placeholder="Masukkan base price"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">
                  Image URL
                </label>
                <div className="relative">
                  <Input
                    value={form.imageUrl}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, imageUrl: e.target.value }))
                    }
                    placeholder="https://example.com/image.jpg"
                    className="pl-11"
                  />
                  <FontAwesomeIcon
                    icon={faImage}
                    className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  />
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold text-slate-700">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  rows={5}
                  placeholder={`Masukkan description ${productLabelLower}`}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-indigo-400"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5">
              <Button
                type="submit"
                disabled={saving}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-5"
              >
                <span className="inline-flex items-center gap-2">
                  <FontAwesomeIcon icon={faFloppyDisk} className="h-4 w-4" />
                  {saving ? 'Menyimpan...' : 'Save Changes'}
                </span>
              </Button>

              <Link href="/dashboard/products">
                <Button
                  type="button"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-slate-700 hover:bg-slate-50"
                >
                  <FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4" />
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </section>

        <aside className="space-y-4">
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
              <FontAwesomeIcon icon={faBoxOpen} className="h-4 w-4" />
            </div>

            <h2 className="mt-4 text-base font-semibold text-slate-900">
              Ringkasan {productLabel}
            </h2>

            <div className="mt-4 space-y-3 text-sm">
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Product ID
                </p>
                <p className="mt-2 break-all font-medium text-slate-800">
                  {detail?.id || '-'}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Business ID
                </p>
                <p className="mt-2 break-all font-medium text-slate-800">
                  {detail?.businessId || '-'}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Category
                </p>
                <p className="mt-2 font-medium text-slate-800">
                  {detail?.category?.name || '-'}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Brand
                </p>
                <p className="mt-2 font-medium text-slate-800">
                  {form.brand || '-'}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Unit
                </p>
                <p className="mt-2 font-medium text-slate-800">
                  {form.unit || '-'}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Base Price
                </p>
                <p className="mt-2 font-medium text-slate-800">
                  {formatCurrency(Number(form.basePrice || 0))}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Status
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(
                      status
                    )}`}
                  >
                    {status}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-base font-semibold text-slate-900">
              Catatan Edit
            </p>

            <div className="mt-4 space-y-2">
              {[
                `${productLabel} name, category, sku, brand, unit, base price, imageUrl, dan description boleh diperbarui.`,
                `Code ${productLabelLower} bersifat readonly dan tidak bisa diedit.`,
                `Status ${productLabelLower} boleh diubah ACTIVE / INACTIVE.`,
                'Business scope product tetap dijaga backend.',
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

          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
                <FontAwesomeIcon icon={faTag} className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Category & SKU
                </p>
                <p className="text-xs text-slate-500">
                  Pastikan category dan SKU sesuai kebutuhan operasional outlet.
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
              SKU bisa dikosongkan jika memang belum dipakai, tetapi jika diisi harus
              tetap unik dalam business aktif.
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-slate-900">
                  Status {productLabel}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Aktifkan atau nonaktifkan {productLabelLower} tanpa menghapus data.
                </p>
              </div>

              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(
                  status
                )}`}
              >
                {status}
              </span>
            </div>

            <div className="mt-4">
              <Button
                type="button"
                disabled={statusLoading}
                onClick={handleToggleStatus}
                className={`inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl ${
                  getStatusButtonClass(status)
                }`}
              >
                <FontAwesomeIcon
                  icon={status === 'ACTIVE' ? faBan : faCircleCheck}
                  className="h-4 w-4"
                />
                {statusLoading
                  ? 'Memproses...'
                  : status === 'ACTIVE'
                    ? `Nonaktifkan ${productLabel}`
                    : `Aktifkan ${productLabel}`}
              </Button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}