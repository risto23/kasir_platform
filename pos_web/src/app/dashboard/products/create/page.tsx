'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faBarcode,
  faBoxOpen,
  faBoxesStacked,
  faFloppyDisk,
  faImage,
  faTag,
  faTrash,
  faUpload,
  faUtensils,
  faWandMagicSparkles,
} from '@fortawesome/free-solid-svg-icons';

import { api } from '@/lib/api';
import { getActiveBusinessId, getCachedCurrentUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Category } from '@/types/category';

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

function formatCurrency(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default function CreateProductPage() {
  const router = useRouter();
  const businessType = useMemo(() => getBusinessType(), []);
  const productLabel = businessType === 'RESTAURANT' ? 'Menu' : 'Produk';
  const productLabelLower = productLabel.toLowerCase();

  const [form, setForm] = useState({
    categoryId: '',
    name: '',
    sku: '',
    barcode: '',
    brand: '',
    unit: '',
    description: '',
    basePrice: '',
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
  const [saving, setSaving] = useState(false);

  const parsedBasePrice = useMemo(() => {
    const value = Number(form.basePrice);
    return Number.isFinite(value) ? value : 0;
  }, [form.basePrice]);

  useEffect(() => {
    async function fetchCategories() {
      try {
        setLoadingCategories(true);

        const response = await api.get('/business/categories', {
          params: {
            status: 'ACTIVE',
            perPage: 100,
          },
        });

        setCategories(response.data.data || []);
      } catch {
        setCategories([]);
      } finally {
        setLoadingCategories(false);
      }
    }

    void fetchCategories();
  }, []);

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
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage('');
    setMessageType('');

    if (!form.name.trim()) {
      setMessage(`Nama ${productLabelLower} wajib diisi`);
      setMessageType('error');
      return;
    }

    if (form.basePrice === '') {
      setMessage('Base price wajib diisi');
      setMessageType('error');
      return;
    }

    if (!Number.isFinite(parsedBasePrice) || parsedBasePrice < 0) {
      setMessage('Base price harus berupa angka 0 atau lebih besar');
      setMessageType('error');
      return;
    }

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
      formData.append('basePrice', String(parsedBasePrice));

      if (imageFile) {
        formData.append('image', imageFile);
      } else {
        formData.append('imageUrl', '');
      }

      await api.post('/business/products', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      router.push('/dashboard/products?success=create');
      router.refresh();
    } catch (error: unknown) {
      setMessage(getMessage(error, `Gagal membuat ${productLabelLower}`));
      setMessageType('error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-700">
            <FontAwesomeIcon
              icon={businessType === 'RESTAURANT' ? faUtensils : faBoxOpen}
              className="h-3 w-3"
            />
            Create Product
          </div>

          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
            Tambah {productLabel}
          </h1>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Tambahkan {productLabelLower} baru ke business aktif. Foto {productLabelLower}{' '}
            sekarang memakai upload file.
          </p>
        </div>

        <Link
          href="/dashboard/products"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4" />
          Kembali ke List
        </Link>
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
              <div className="space-y-2 md:col-span-2">
                <label className="block text-sm font-medium text-slate-700">
                  Nama {productLabel} <span className="text-red-500">*</span>
                </label>
                <Input
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder={
                    businessType === 'RESTAURANT'
                      ? 'Contoh: Nasi Goreng Special'
                      : 'Contoh: Teh Botol'
                  }
                  className="h-12 rounded-2xl border-slate-200 bg-slate-50 px-4 text-sm shadow-none focus:border-indigo-500 focus:bg-white"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Category
                </label>
                <select
                  value={form.categoryId}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, categoryId: e.target.value }))
                  }
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">
                    {loadingCategories ? 'Memuat category...' : 'Tanpa category'}
                  </option>
                  {categories.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                      {item.code ? ` (${item.code})` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-400">
                  Category opsional dan bisa dikosongkan.
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  SKU
                </label>
                <Input
                  value={form.sku}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      sku: e.target.value.toUpperCase(),
                    }))
                  }
                  placeholder="Contoh: SKU-TEH-BOTOL"
                  className="h-12 rounded-2xl border-slate-200 bg-slate-50 px-4 text-sm shadow-none focus:border-indigo-500 focus:bg-white"
                />
                <p className="text-xs text-slate-400">SKU bersifat opsional.</p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
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
                    placeholder="Contoh: 8992761130012"
                    className="h-12 rounded-2xl border-slate-200 bg-slate-50 px-4 pl-11 text-sm shadow-none focus:border-indigo-500 focus:bg-white"
                  />
                  <FontAwesomeIcon
                    icon={faBarcode}
                    className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  />
                </div>
                <p className="text-xs text-slate-400">
                  Barcode opsional, boleh dikosongkan dulu.
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
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
                  className="h-12 rounded-2xl border-slate-200 bg-slate-50 px-4 text-sm shadow-none focus:border-indigo-500 focus:bg-white"
                />
                <p className="text-xs text-slate-400">Brand bersifat opsional.</p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Unit
                </label>
                <Input
                  value={form.unit}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, unit: e.target.value }))
                  }
                  placeholder={
                    businessType === 'RESTAURANT'
                      ? 'Contoh: Porsi'
                      : 'Contoh: Botol'
                  }
                  className="h-12 rounded-2xl border-slate-200 bg-slate-50 px-4 text-sm shadow-none focus:border-indigo-500 focus:bg-white"
                />
                <p className="text-xs text-slate-400">Unit bersifat opsional.</p>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="block text-sm font-medium text-slate-700">
                  Foto {productLabel}
                </label>

                <label className="flex min-h-30 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center transition hover:border-indigo-400 hover:bg-white">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm">
                    <FontAwesomeIcon icon={faUpload} className="h-4 w-4" />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-800">
                    Klik untuk pilih foto
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    JPG, PNG, WEBP • maksimal 5 MB
                  </p>
                </label>

                {imagePreview ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-start gap-4">
                      <Image
                        src={imagePreview}
                        alt="Preview foto produk"
                        width={96}
                        height={96}
                        className="rounded-2xl object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900">
                          {imageFile?.name || 'Foto dipilih'}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {imageFile
                            ? `${Math.round(imageFile.size / 1024)} KB`
                            : '-'}
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

                <p className="text-xs text-slate-400">
                  Foto bersifat opsional. Jika tidak diisi, {productLabelLower} tetap bisa disimpan.
                </p>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="block text-sm font-medium text-slate-700">
                  Base Price <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.basePrice}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, basePrice: e.target.value }))
                  }
                  placeholder="0"
                  className="h-12 rounded-2xl border-slate-200 bg-slate-50 px-4 text-sm shadow-none focus:border-indigo-500 focus:bg-white"
                  required
                />
                <p className="text-xs text-slate-400">
                  Preview: {formatCurrency(parsedBasePrice)}
                </p>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="block text-sm font-medium text-slate-700">
                  Deskripsi
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder={`Deskripsi ${productLabelLower}`}
                  rows={4}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                />
                <p className="text-xs text-slate-400">
                  Description bersifat opsional.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
              <Link
                href="/dashboard/products"
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Batal
              </Link>

              <Button
                type="submit"
                disabled={saving}
                className="h-11 rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                <span className="inline-flex items-center gap-2">
                  <FontAwesomeIcon icon={faFloppyDisk} className="h-4 w-4" />
                  {saving ? 'Menyimpan...' : `Save ${productLabel}`}
                </span>
              </Button>
            </div>
          </form>
        </section>

        <aside className="space-y-4">
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
              <FontAwesomeIcon icon={faBoxesStacked} className="h-4 w-4" />
            </div>

            <h2 className="mt-4 text-base font-semibold text-slate-900">
              Panduan Singkat
            </h2>

            <div className="mt-4 space-y-3 text-sm text-slate-500">
              <p>{productLabel} otomatis dibuat pada business aktif user.</p>
              <p>Brand, unit, dan barcode retail sudah bisa disiapkan.</p>
              <p>Foto product sekarang memakai upload file.</p>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
                <FontAwesomeIcon icon={faWandMagicSparkles} className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Target Promo Siap
                </p>
                <p className="text-xs text-slate-500">Brand & unit sudah ada</p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Promo nanti bisa match ke category, product, brand, unit, atau
                keyword nama.
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <FontAwesomeIcon icon={faTag} className="h-4 w-4 text-slate-500" />
              Ringkasan Input
            </h2>

            <div className="mt-4 space-y-3">
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Nama
                </p>
                <p className="mt-2 text-sm font-medium text-slate-800">
                  {form.name || '-'}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  SKU / Barcode
                </p>
                <p className="mt-2 text-sm font-medium text-slate-800">
                  {[form.sku || '-', form.barcode || '-'].join(' • ')}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Brand / Unit
                </p>
                <p className="mt-2 text-sm font-medium text-slate-800">
                  {[form.brand || '-', form.unit || '-'].join(' • ')}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Base Price
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {formatCurrency(parsedBasePrice)}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Foto
                </p>
                <p className="mt-2 break-all text-sm text-slate-600">
                  {imageFile?.name || '-'}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Category
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  {categories.find((item) => item.id === form.categoryId)?.name || '-'}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  <FontAwesomeIcon icon={faImage} className="h-3 w-3" />
                  Description
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  {form.description || '-'}
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}