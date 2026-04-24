// pos_web/src/app/dashboard/outlets/[id]/edit/page.tsx
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
  faLocationDot,
  faLock,
  faPenToSquare,
  faPhone,
  faStore,
  faUsers,
} from '@fortawesome/free-solid-svg-icons';

import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Outlet, OutletStatus } from '@/types/outlet';

type EditOutletForm = {
  name: string;
  code: string;
  address: string;
  phone: string;
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

function getStatusBadgeClass(status: OutletStatus) {
  if (status === 'ACTIVE') {
    return 'border border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  return 'border border-slate-200 bg-slate-100 text-slate-600';
}

export default function EditOutletPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [form, setForm] = useState<EditOutletForm>({
    name: '',
    code: '',
    address: '',
    phone: '',
  });
  const [detail, setDetail] = useState<Outlet | null>(null);
  const [status, setStatus] = useState<OutletStatus>('ACTIVE');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');

  useEffect(() => {
    async function fetchDetail() {
      try {
        setLoading(true);

       

        const response = await api.get(`/business/outlets/${params.id}`);
        const item: Outlet = response.data.data;

        setDetail(item);
        setForm({
          name: item.name ?? '',
          code: item.code ?? '',
          address: item.address ?? '',
          phone: item.phone ?? '',
        });
        setStatus(item.status);
      } catch (error: unknown) {
        setMessage(getMessage(error, 'Gagal memuat outlet'));
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

    try {
      setSaving(true);

     

      const response = await api.put(
        `/business/outlets/${params.id}`,
        {
          name: form.name.trim(),
          address: form.address.trim() || null,
          phone: form.phone.trim() || null,
          status,
        }
      );

      const updated: Outlet = response.data.data;

      setDetail(updated);
      setStatus(updated.status);
      setForm({
        name: updated.name ?? '',
        code: updated.code ?? '',
        address: updated.address ?? '',
        phone: updated.phone ?? '',
      });

      setMessage('Outlet berhasil diperbarui');
      setMessageType('success');
    } catch (error: unknown) {
      setMessage(getMessage(error, 'Gagal memperbarui outlet'));
      setMessageType('error');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStatus() {
    const newStatus: OutletStatus =
      status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

    try {
      setStatusLoading(true);
      setMessage('');
      setMessageType('');

     

      const response = await api.patch(
        `/business/outlets/${params.id}/status`,
        {
          status: newStatus,
        }
      );

      const updated: Outlet = response.data.data;

      setDetail(updated);
      setStatus(updated.status);
      setMessage('Status outlet berhasil diperbarui');
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
            Edit Outlet
          </div>

          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
            Edit Outlet
          </h1>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Perbarui informasi outlet dalam business aktif. Kode outlet tidak
            bisa diubah manual.
          </p>
        </div>

        <button
          type="button"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          onClick={() => router.push('/dashboard/outlets')}
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
                  Outlet Name
                </label>
                <Input
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="h-12 rounded-2xl border-slate-200 bg-slate-50 px-4 text-sm shadow-none focus:border-indigo-500 focus:bg-white"
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
                  Kode outlet dibuat otomatis dan tidak bisa diedit.
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Phone
                </label>
                <Input
                  value={form.phone}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  className="h-12 rounded-2xl border-slate-200 bg-slate-50 px-4 text-sm shadow-none focus:border-indigo-500 focus:bg-white"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="block text-sm font-medium text-slate-700">
                  Address
                </label>
                <Input
                  value={form.address}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, address: e.target.value }))
                  }
                  className="h-12 rounded-2xl border-slate-200 bg-slate-50 px-4 text-sm shadow-none focus:border-indigo-500 focus:bg-white"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="block text-sm font-medium text-slate-700">
                  Status
                </label>
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

            <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
              <Link
                href="/dashboard/outlets"
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
              <FontAwesomeIcon icon={faStore} className="h-4 w-4" />
            </div>

            <h2 className="mt-4 text-base font-semibold text-slate-900">
              Ringkasan Outlet
            </h2>

            <div className="mt-4 space-y-3 text-sm">
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Outlet ID
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
                  Assigned Users
                </p>
                <p className="mt-2 flex items-center gap-2 font-medium text-slate-800">
                  <FontAwesomeIcon icon={faUsers} className="h-4 w-4" />
                  {detail?.totalAssignedUsers ?? 0} user
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
                'Outlet name, address, dan phone boleh diperbarui.',
                'Kode outlet bersifat readonly dan tidak bisa diedit.',
                'Status outlet boleh diubah ACTIVE / INACTIVE.',
                'Business scope outlet tetap dipertahankan oleh backend.',
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
                <FontAwesomeIcon icon={faLocationDot} className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Data Kontak
                </p>
                <p className="text-xs text-slate-500">
                  Informasi tambahan outlet
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Address masih bisa dilengkapi bertahap.
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Phone dapat dikosongkan bila belum tersedia.
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Total assigned users membantu mencegah nonaktif outlet secara
                sembarangan.
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                <FontAwesomeIcon icon={faPhone} className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Fokus Outlet
                </p>
                <p className="text-xs text-slate-500">
                  Tetap sederhana dan aman
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Fokus outlet masih pada data inti, status, dan jumlah user yang
              terhubung ke outlet tersebut.
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
