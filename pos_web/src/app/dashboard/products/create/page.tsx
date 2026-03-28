'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faBoxOpen,
  faBoxesStacked,
  faFloppyDisk,
  faImage,
  faTag,
  faUtensils,
  faWandMagicSparkles,
} from '@fortawesome/free-solid-svg-icons';

import { api } from '@/lib/api';
import { getActiveBusinessId, getCachedCurrentUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Category, CategoryListResponse } from '@/types/category';

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
    brand: '',
    unit: '',
    description: '',
    imageUrl: '',
    basePrice: '',
  });

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
            limit: 100,
          },
        });

        const payload: CategoryListResponse = response.data.data;
        setCategories(payload?.items || []);
      } catch {
        setCategories([]);
      } finally {
        setLoadingCategories(false);
      }
    }

    void fetchCategories();
  }, []);

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

      await api.post('/business/products', {
        categoryId: form.categoryId || null,
        name: form.name.trim(),
        sku: form.sku.trim() || null,
        brand: form.brand.trim() || null,
        unit: form.unit.trim() || null,
        description: form.description.trim() || null,
        imageUrl: form.imageUrl.trim() || null,
        basePrice: parsedBasePrice,
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
            Tambahkan {productLabelLower} baru ke business aktif. Foto tetap pakai
            image URL dan belum memakai upload file.
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
                  Image URL
                </label>
                <Input
                  value={form.imageUrl}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, imageUrl: e.target.value }))
                  }
                  placeholder="https://example.com/product.jpg"
                  className="h-12 rounded-2xl border-slate-200 bg-slate-50 px-4 text-sm shadow-none focus:border-indigo-500 focus:bg-white"
                />
                <p className="text-xs text-slate-400">
                  Foto tetap pakai image URL dulu.
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
              <p>Brand dan unit sekarang sudah disiapkan untuk target promo.</p>
              <p>Foto product masih pakai image URL.</p>
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
                  SKU / Brand / Unit
                </p>
                <p className="mt-2 text-sm font-medium text-slate-800">
                  {[form.sku || '-', form.brand || '-', form.unit || '-'].join(' • ')}
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
                  Image URL
                </p>
                <p className="mt-2 break-all text-sm text-slate-600">
                  {form.imageUrl || '-'}
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