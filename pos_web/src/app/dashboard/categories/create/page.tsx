'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faCodeBranch,
  faFolderTree,
  faLayerGroup,
  faRotateLeft,
  faSave,
  faShapes,
} from '@fortawesome/free-solid-svg-icons';

import { api } from '@/lib/api';
import type { Category, CategoryListResponse } from '@/types/category';

type CategoryFormState = {
  name: string;
  description: string;
  parentId: string;
  sortOrder: string;
};

function getMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || 'Gagal menyimpan category';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Terjadi kesalahan';
}

export default function CategoryCreatePage() {
  const router = useRouter();

  const [parentOptions, setParentOptions] = useState<Category[]>([]);
  const [loadingParents, setLoadingParents] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const [form, setForm] = useState<CategoryFormState>({
    name: '',
    description: '',
    parentId: '',
    sortOrder: '0',
  });

  async function fetchParents() {
    try {
      setLoadingParents(true);

      const response = await api.get('/business/categories', {
        params: {
          status: 'ACTIVE',
          limit: 100,
        },
      });

      const payload: CategoryListResponse = response.data.data;
      setParentOptions(payload?.items || []);
    } catch {
      setParentOptions([]);
    } finally {
      setLoadingParents(false);
    }
  }

  useEffect(() => {
    void fetchParents();
  }, []);

  function updateField<K extends keyof CategoryFormState>(
    key: K,
    value: CategoryFormState[K]
  ) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function handleReset() {
    setMessage('');
    setForm({
      name: '',
      description: '',
      parentId: '',
      sortOrder: '0',
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!form.name.trim()) {
      setMessage('Nama category wajib diisi.');
      return;
    }

    const parsedSortOrder = Number(form.sortOrder || 0);

    if (!Number.isFinite(parsedSortOrder) || parsedSortOrder < 0) {
      setMessage('Sort order harus berupa angka 0 atau lebih besar.');
      return;
    }

    try {
      setSubmitting(true);
      setMessage('');

      await api.post('/business/categories', {
        name: form.name.trim(),
        description: form.description.trim() || null,
        parentId: form.parentId || null,
        sortOrder: parsedSortOrder,
      });

      router.push('/dashboard/categories?success=create');
      router.refresh();
    } catch (error: unknown) {
      setMessage(getMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-700">
            <FontAwesomeIcon icon={faShapes} className="h-3 w-3" />
            Category Management
          </div>

          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
            Tambah Category
          </h1>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Buat category baru pada business aktif. Category bisa berdiri sendiri
            atau menjadi child dari parent category.
          </p>
        </div>

        <Link
          href="/dashboard/categories"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4" />
          Kembali ke List
        </Link>
      </section>

      <form onSubmit={handleSubmit} className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
            <h2 className="text-base font-semibold text-slate-900">Form Category</h2>
            <p className="text-sm text-slate-500">
              Isi data category sesuai business aktif.
            </p>
          </div>

          <div className="grid gap-5 px-5 py-5 sm:px-6">
            {message ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {message}
              </div>
            ) : null}

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold text-slate-800">
                  Nama Category <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="Contoh: Minuman"
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-800">
                  Sort Order
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.sortOrder}
                  onChange={(e) => updateField('sortOrder', e.target.value)}
                  placeholder="0"
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-800">
                  Parent Category
                </label>
                <select
                  value={form.parentId}
                  onChange={(e) => updateField('parentId', e.target.value)}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  disabled={loadingParents}
                >
                  <option value="">
                    {loadingParents ? 'Memuat category...' : 'Tanpa parent'}
                  </option>
                  {parentOptions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                      {item.code ? ` (${item.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold text-slate-800">
                  Deskripsi
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  rows={5}
                  placeholder="Deskripsi category"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-5">
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Ringkasan</h2>

            <div className="mt-4 space-y-3">
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  <FontAwesomeIcon icon={faFolderTree} className="h-3 w-3" />
                  Nama
                </div>
                <p className="mt-2 text-sm font-medium text-slate-800">
                  {form.name.trim() || '-'}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  <FontAwesomeIcon icon={faCodeBranch} className="h-3 w-3" />
                  Parent
                </div>
                <p className="mt-2 text-sm font-medium text-slate-800">
                  {parentOptions.find((item) => item.id === form.parentId)?.name || '-'}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  <FontAwesomeIcon icon={faLayerGroup} className="h-3 w-3" />
                  Sort Order
                </div>
                <p className="mt-2 text-sm font-medium text-slate-800">
                  {form.sortOrder || '0'}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <FontAwesomeIcon icon={faSave} className="h-4 w-4" />
                {submitting ? 'Menyimpan...' : 'Simpan Category'}
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
                href="/dashboard/categories"
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
                'Category dibuat di business aktif.',
                'Parent category boleh dikosongkan.',
                'Sort order default 0.',
                'Tidak menambahkan field di luar contract backend aktif.',
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