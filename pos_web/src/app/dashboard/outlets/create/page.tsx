'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faFloppyDisk,
  faLayerGroup,
  faLocationDot,
  faPhone,
  faShop,
  faStore,
} from '@fortawesome/free-solid-svg-icons';

import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Business } from '@/types/business';

function getMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || fallback;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

export default function CreateOutletPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [form, setForm] = useState({
    businessId: '',
    name: '',
    code: '',
    address: '',
    phone: '',
  });
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
  const [loadingBusinesses, setLoadingBusinesses] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchBusinesses() {
      try {
        setLoadingBusinesses(true);

        const response = await api.get('/platform/businesses');
        const data = response.data.data || [];
        setBusinesses(data);

        if (data.length > 0) {
          setForm((prev) => ({ ...prev, businessId: data[0].id }));
        }
      } catch (error: unknown) {
        setMessage(getMessage(error, 'Gagal memuat business'));
        setMessageType('error');
      } finally {
        setLoadingBusinesses(false);
      }
    }

    void fetchBusinesses();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage('');
    setMessageType('');

    try {
      setSaving(true);

      await api.post('/platform/outlets', {
        ...form,
        address: form.address || null,
        phone: form.phone || null,
      });

      setMessage('Outlet berhasil dibuat');
      setMessageType('success');

      setForm((prev) => ({
        ...prev,
        name: '',
        code: '',
        address: '',
        phone: '',
      }));
    } catch (error: unknown) {
      setMessage(getMessage(error, 'Gagal membuat outlet'));
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
            <FontAwesomeIcon icon={faStore} className="h-3 w-3" />
            Create Outlet
          </div>

          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
            Tambah Outlet
          </h1>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Tambahkan outlet baru ke business yang sudah tersedia.
          </p>
        </div>

        <Link
          href="/dashboard/outlets"
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
                  Business
                </label>
                <select
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
                  value={form.businessId}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, businessId: e.target.value }))
                  }
                  disabled={loadingBusinesses || businesses.length === 0}
                >
                  {businesses.length === 0 ? (
                    <option value="">
                      {loadingBusinesses
                        ? 'Loading business...'
                        : 'Belum ada business tersedia'}
                    </option>
                  ) : (
                    businesses.map((business) => (
                      <option key={business.id} value={business.id}>
                        {business.name} - {business.businessType}
                      </option>
                    ))
                  )}
                </select>
                <p className="text-xs text-slate-400">
                  Outlet akan selalu mengikuti business induknya.
                </p>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="block text-sm font-medium text-slate-700">
                  Outlet Name
                </label>
                <Input
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Contoh: Outlet Serpong"
                  className="h-12 rounded-2xl border-slate-200 bg-slate-50 px-4 text-sm shadow-none focus:border-indigo-500 focus:bg-white"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Code
                </label>
                <Input
                  value={form.code}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, code: e.target.value }))
                  }
                  placeholder="Contoh: OTL-SERPONG-01"
                  className="h-12 rounded-2xl border-slate-200 bg-slate-50 px-4 text-sm shadow-none focus:border-indigo-500 focus:bg-white"
                />
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
                  placeholder="Contoh: 081234567890"
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
                  placeholder="Contoh: Jl. Contoh No. 123"
                  className="h-12 rounded-2xl border-slate-200 bg-slate-50 px-4 text-sm shadow-none focus:border-indigo-500 focus:bg-white"
                />
                <p className="text-xs text-slate-400">
                  Address dan phone masih bersifat opsional di fase 1.
                </p>
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
                disabled={saving || businesses.length === 0}
                className="h-11 rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                <span className="inline-flex items-center gap-2">
                  <FontAwesomeIcon icon={faFloppyDisk} className="h-4 w-4" />
                  {saving ? 'Menyimpan...' : 'Save Outlet'}
                </span>
              </Button>
            </div>
          </form>
        </section>

        <aside className="space-y-4">
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
              <FontAwesomeIcon icon={faLayerGroup} className="h-4 w-4" />
            </div>

            <h2 className="mt-4 text-base font-semibold text-slate-900">
              Panduan Singkat
            </h2>

            <div className="mt-4 space-y-3 text-sm text-slate-500">
              <p>Pilih business yang tepat sebelum membuat outlet.</p>
              <p>Gunakan code outlet yang konsisten dan mudah dikenali.</p>
              <p>Isi alamat dan phone bila memang sudah tersedia.</p>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
                <FontAwesomeIcon icon={faShop} className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Aturan Outlet
                </p>
                <p className="text-xs text-slate-500">
                  Tetap sesuai fase 1
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Satu outlet berada di bawah satu business.
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Outlet mengikuti business type dari business induknya.
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Status outlet dikelola terpisah dengan ACTIVE / INACTIVE.
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
                <FontAwesomeIcon icon={faPhone} className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Data Tambahan
                </p>
                <p className="text-xs text-slate-500">
                  Informasi kontak outlet
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Phone dapat dikosongkan bila belum tersedia.
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Address dapat diisi bertahap sesuai kebutuhan outlet.
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}