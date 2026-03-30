'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faBan,
  faCircleCheck,
  faFloppyDisk,
  faFolderTree,
  faLock,
  faPenToSquare,
  faShapes,
} from '@fortawesome/free-solid-svg-icons';

import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Category, CategoryStatus } from '@/types/category';

type EditCategoryForm = {
  name: string;
  code: string;
  description: string;
  sortOrder: string;
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

function getStatusBadgeClass(status: CategoryStatus) {
  if (status === 'ACTIVE') {
    return 'border border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  return 'border border-slate-200 bg-slate-100 text-slate-600';
}

export default function EditCategoryPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [form, setForm] = useState<EditCategoryForm>({
    name: '',
    code: '',
    description: '',
    sortOrder: '0',
  });
  const [detail, setDetail] = useState<Category | null>(null);
  const [status, setStatus] = useState<CategoryStatus>('ACTIVE');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');

  useEffect(() => {
    async function fetchDetail() {
      try {
        setLoading(true);

        const detailResponse = await api.get(`/business/categories/${params.id}`);
        const item: Category = detailResponse.data.data;

        setDetail(item);
        setForm({
          name: item.name ?? '',
          code: item.code ?? '',
          description: item.description ?? '',
          sortOrder: String(item.sortOrder ?? 0),
        });
        setStatus(item.status);
      } catch (error: unknown) {
        setMessage(getMessage(error, 'Gagal memuat category'));
        setMessageType('error');
      } finally {
        setLoading(false);
      }
    }

    void fetchDetail();
  }, [params.id]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage('');
    setMessageType('');

    const parsedSortOrder = Number(form.sortOrder || 0);

    if (!form.name.trim()) {
      setMessage('Nama category wajib diisi.');
      setMessageType('error');
      return;
    }

    if (!Number.isFinite(parsedSortOrder) || parsedSortOrder < 0) {
      setMessage('Sort order harus berupa angka 0 atau lebih besar.');
      setMessageType('error');
      return;
    }

    try {
      setSaving(true);

      const response = await api.put(`/business/categories/${params.id}`, {
        name: form.name.trim(),
        description: form.description.trim() || null,
        sortOrder: parsedSortOrder,
      });

      const updated: Category = response.data.data;

      setDetail(updated);
      setStatus(updated.status);
      setForm({
        name: updated.name ?? '',
        code: updated.code ?? '',
        description: updated.description ?? '',
        sortOrder: String(updated.sortOrder ?? 0),
      });

      setMessage('Category berhasil diperbarui');
      setMessageType('success');
    } catch (error: unknown) {
      setMessage(getMessage(error, 'Gagal memperbarui category'));
      setMessageType('error');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStatus() {
    const newStatus: CategoryStatus =
      status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

    try {
      setStatusLoading(true);
      setMessage('');
      setMessageType('');

      const response = await api.patch(`/business/categories/${params.id}/status`, {
        status: newStatus,
      });

      const updated: Category = response.data.data;

      setDetail(updated);
      setStatus(updated.status);
      setMessage('Status category berhasil diperbarui');
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
            <FontAwesomeIcon icon={faPenToSquare} className="h-3 w-3" />
            Edit Category
          </div>

          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
            Edit Category
          </h1>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Perbarui informasi category dalam business aktif. Code category tidak
            bisa diubah manual.
          </p>
        </div>

        <button
          type="button"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          onClick={() => router.push('/dashboard/categories')}
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
              <div className="space-y-2 md:col-span-2">
                <label className="block text-sm font-medium text-slate-700">
                  Nama Category
                </label>
                <Input
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="h-12 rounded-2xl border-slate-200 bg-slate-50 px-4 text-sm shadow-none focus:border-indigo-500 focus:bg-white"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Code
                </label>
                <div className="relative">
                  <Input
                    value={form.code}
                    readOnly
                    disabled
                    className="h-12 rounded-2xl border-slate-200 bg-slate-100 px-4 pr-12 text-sm text-slate-500 shadow-none"
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400">
                    <FontAwesomeIcon icon={faLock} className="h-4 w-4" />
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Code category dibuat otomatis dan tidak bisa diedit.
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Sort Order
                </label>
                <Input
                  type="number"
                  min="0"
                  value={form.sortOrder}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, sortOrder: e.target.value }))
                  }
                  className="h-12 rounded-2xl border-slate-200 bg-slate-50 px-4 text-sm shadow-none focus:border-indigo-500 focus:bg-white"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="block text-sm font-medium text-slate-700">
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
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-indigo-500 focus:bg-white"
                  placeholder="Masukkan deskripsi category"
                />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Status Category
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Status diubah lewat endpoint terpisah agar konsisten dengan flow
                      edit/status.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(
                        status
                      )}`}
                    >
                      {status === 'ACTIVE' ? 'Active' : 'Inactive'}
                    </span>

                    <button
                      type="button"
                      onClick={() => void handleToggleStatus()}
                      disabled={statusLoading}
                      className={`inline-flex h-10 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold transition ${
                        status === 'ACTIVE'
                          ? 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                          : 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      } disabled:cursor-not-allowed disabled:opacity-70`}
                    >
                      <FontAwesomeIcon
                        icon={status === 'ACTIVE' ? faBan : faCircleCheck}
                        className="h-4 w-4"
                      />
                      {statusLoading
                        ? 'Memproses...'
                        : status === 'ACTIVE'
                          ? 'Nonaktifkan'
                          : 'Aktifkan'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
              <Link
                href="/dashboard/categories"
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
                  {saving ? 'Menyimpan...' : 'Save Changes'}
                </span>
              </Button>
            </div>
          </form>
        </section>

        <aside className="space-y-4">
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
              <FontAwesomeIcon icon={faShapes} className="h-4 w-4" />
            </div>

            <h2 className="mt-4 text-base font-semibold text-slate-900">
              Ringkasan Category
            </h2>

            <div className="mt-4 space-y-3 text-sm">
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Category ID
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
                  Sort Order
                </p>
                <p className="mt-2 font-medium text-slate-800">
                  {form.sortOrder || '0'}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Status
                </p>
                <p className="mt-2 font-medium text-slate-800">{status}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-base font-semibold text-slate-900">
              Catatan Edit
            </p>

            <div className="mt-4 space-y-2">
              {[
                'Category name, description, dan sort order boleh diperbarui.',
                'Code category bersifat readonly dan tidak bisa diedit.',
                'Status category boleh diubah ACTIVE / INACTIVE.',
                'Business scope category tetap dijaga backend.',
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
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                <FontAwesomeIcon icon={faFolderTree} className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Ringkasan Category
                </p>
                <p className="text-xs text-slate-500">
                  Code otomatis dari backend dan status dikelola tanpa hard delete.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}