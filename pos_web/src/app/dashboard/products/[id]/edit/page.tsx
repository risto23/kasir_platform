'use client';

import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faBan,
  faBarcode,
  faBoxOpen,
  faCircleCheck,
  faFloppyDisk,
  faLock,
  faPenToSquare,
  faTag,
  faTrash,
  faUpload,
  faUtensils,
  faBoxesStacked,
} from '@fortawesome/free-solid-svg-icons';

import { resolveImageUrl } from '@/lib/resolve-image-url';



import { api } from '@/lib/api';
import { getActiveBusinessId, getCachedCurrentUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Category } from '@/types/category';
import type { Product, ProductStatus } from '@/types/product';

type EditProductForm = {
  categoryId: string;
  name: string;
  code: string;
  sku: string;
  barcode: string;
  brand: string;
  unit: string;
  description: string;
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
    barcode: '',
    brand: '',
    unit: '',
    description: '',
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

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [existingImageUrl, setExistingImageUrl] = useState('');

  useEffect(() => {
    async function fetchDetail() {
      try {
        setLoading(true);

        const [detailResponse, categoriesResponse] = await Promise.all([
          api.get(`/business/products/${params.id}`),
          api.get('/business/categories', {
            params: {
              status: 'ACTIVE',
              perPage: 100,
            },
          }),
        ]);

        const item: Product = detailResponse.data.data;

        setDetail(item);
        setExistingImageUrl(item.imageUrl ?? '');
        setForm({
          categoryId: item.categoryId ?? '',
          name: item.name ?? '',
          code: item.code ?? '',
          sku: item.sku ?? '',
          barcode: item.barcode ?? '',
          brand: item.brand ?? '',
          unit: item.unit ?? '',
          description: item.description ?? '',
          basePrice: String(item.basePrice ?? ''),
        });
        setStatus(item.status);
        setCategories(categoriesResponse.data.data || []);
      } catch (error: unknown) {
        setMessage(getMessage(error, `Gagal memuat ${productLabelLower}`));
        setMessageType('error');
      } finally {
        setLoading(false);
      }
    }

    void fetchDetail();
  }, [params.id, productLabelLower]);

  useEffect(() => {
    if (!imageFile) {
      setImagePreview('');
      return;
    }

    const objectUrl = URL.createObjectURL(imageFile);
    setImagePreview(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [imageFile]);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;

    if (!file) {
      setImageFile(null);
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

    if (!allowedTypes.includes(file.type)) {
      setMessage('File foto produk harus berupa JPG, PNG, atau WEBP');
      setMessageType('error');
      e.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage('Ukuran foto produk maksimal 5 MB');
      setMessageType('error');
      e.target.value = '';
      return;
    }

    setMessage('');
    setMessageType('');
    setImageFile(file);
  }

  function removeSelectedImage() {
    setImageFile(null);
    setImagePreview('');
    setExistingImageUrl('');
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage('');
    setMessageType('');

    try {
      setSaving(true);

      const formData = new FormData();
      formData.append('categoryId', form.categoryId || '');
      formData.append('name', form.name.trim());
      formData.append('sku', form.sku.trim());
      formData.append('barcode', form.barcode.trim());
      formData.append('brand', form.brand.trim());
      formData.append('unit', form.unit.trim());
      formData.append('description', form.description.trim());
      formData.append('basePrice', String(Number(form.basePrice)));

      if (imageFile) {
        formData.append('image', imageFile);
      } else {
        formData.append('imageUrl', existingImageUrl || '');
      }

      const response = await api.put(`/business/products/${params.id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const updated: Product = response.data.data;

      setDetail(updated);
      setStatus(updated.status);
      setExistingImageUrl(updated.imageUrl ?? '');
      setImageFile(null);

      setForm({
        categoryId: updated.categoryId ?? '',
        name: updated.name ?? '',
        code: updated.code ?? '',
        sku: updated.sku ?? '',
        barcode: updated.barcode ?? '',
        brand: updated.brand ?? '',
        unit: updated.unit ?? '',
        description: updated.description ?? '',
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
                    setForm((prev) => ({ ...prev, sku: e.target.value.toUpperCase() }))
                  }
                  placeholder={`Masukkan SKU ${productLabelLower}`}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">
                  Barcode
                </label>
                <div className="relative">
                  <Input
                    value={form.barcode}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        barcode: e.target.value.toUpperCase(),
                      }))
                    }
                    placeholder="Masukkan barcode"
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
                  Brand
                </label>
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
                />
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
                  Foto {productLabel}
                </label>

                <label className="flex min-h-27.5 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center transition hover:border-indigo-400 hover:bg-white">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm">
                    <FontAwesomeIcon icon={faUpload} className="h-4 w-4" />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-800">
                    Ganti foto
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    JPG, PNG, WEBP • maksimal 5 MB
                  </p>
                </label>

                {imagePreview || existingImageUrl ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-start gap-4">
                      <Image
                        src={imagePreview || resolveImageUrl(existingImageUrl) }
                        alt={form.name || 'Preview foto produk'}
                        width={96}
                        height={96}
                        className="h-24 w-24 rounded-2xl object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900">
                          {imageFile?.name || 'Foto aktif'}
                        </p>
                        <p className="mt-1 break-all text-xs text-slate-500">
                          {imageFile
                            ? `${Math.round(imageFile.size / 1024)} KB`
                            : resolveImageUrl(existingImageUrl)}
                        </p>
                        <button
                          type="button"
                          onClick={removeSelectedImage}
                          className="mt-3 inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                        >
                          <FontAwesomeIcon icon={faTrash} className="h-3.5 w-3.5" />
                          Hapus foto
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}
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
                  variant="secondary"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-5"
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
                  SKU / Barcode
                </p>
                <p className="mt-2 font-medium text-slate-800">
                  {[form.sku || '-', form.barcode || '-'].join(' • ')}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Brand / Unit
                </p>
                <p className="mt-2 font-medium text-slate-800">
                  {[form.brand || '-', form.unit || '-'].join(' • ')}
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
                `${productLabel} name, category, sku, barcode, brand, unit, base price, foto, dan description boleh diperbarui.`,
                `Code ${productLabelLower} bersifat readonly dan tidak bisa diedit.`,
                `Barcode ${productLabelLower} boleh dikosongkan dulu.`,
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
                  Category, SKU & Barcode
                </p>
                <p className="text-xs text-slate-500">
                  Pastikan category, SKU, dan barcode sesuai kebutuhan operasional outlet.
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
              SKU dan barcode bisa dikosongkan jika memang belum dipakai, tetapi jika
              diisi harus tetap unik dalam business aktif.
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
                variant="danger"
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