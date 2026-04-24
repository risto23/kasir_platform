'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faBuilding,
  faFloppyDisk,
  faLayerGroup,
  faShop,
} from '@fortawesome/free-solid-svg-icons';

import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type BusinessTypeItem = {
  code: 'RESTAURANT' | 'RETAIL';
  name: string;
  description: string;
  rules: string[];
};

function getMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || 'Gagal memproses data';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Gagal memproses data';
}

export default function CreateBusinessPage() {
  const [businessTypes, setBusinessTypes] = useState<BusinessTypeItem[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [form, setForm] = useState({
    name: '',
    slug: '',
    businessType: 'RETAIL' as 'RETAIL' | 'RESTAURANT',
  });
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadBusinessTypes() {
      try {
        setLoadingTypes(true);

        const response = await api.get('/platform/business-types');
        const data = (response.data.data || []) as BusinessTypeItem[];

        setBusinessTypes(data);

        if (data.length > 0) {
          setForm((prev) => ({
            ...prev,
            businessType: data[0].code,
          }));
        }
      } catch (error: unknown) {
        setMessage(getMessage(error));
        setMessageType('error');
      } finally {
        setLoadingTypes(false);
      }
    }

    void loadBusinessTypes();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage('');
    setMessageType('');

    try {
      setSaving(true);

      await api.post('/platform/businesses', {
        ...form,
        featureFlagKeys: [
          'BUSINESS_MANAGEMENT',
          'OUTLET_MANAGEMENT',
          'BASIC_DASHBOARD',
        ],
      });

      setMessage('Business berhasil dibuat');
      setMessageType('success');

      setForm((prev) => ({
        ...prev,
        name: '',
        slug: '',
      }));
    } catch (error: unknown) {
      setMessage(getMessage(error));
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
            <FontAwesomeIcon icon={faBuilding} className="h-3 w-3" />
            Create Business
          </div>

          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
            Tambah Business
          </h1>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Isi data business baru untuk mulai mengelola operasionalnya di platform.
          </p>
        </div>

        <Link
          href="/dashboard/businesses"
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
                  Business Name
                </label>
                <Input
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Contoh: Risto Retail Group"
                  className="h-12 rounded-2xl border-slate-200 bg-slate-50 px-4 text-sm shadow-none focus:border-indigo-500 focus:bg-white"
                />
                <p className="text-xs text-slate-400">
                  Nama utama business yang tampil di platform.
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Slug
                </label>
                <Input
                  value={form.slug}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, slug: e.target.value }))
                  }
                  placeholder="contoh: risto-retail-group"
                  className="h-12 rounded-2xl border-slate-200 bg-slate-50 px-4 text-sm shadow-none focus:border-indigo-500 focus:bg-white"
                />
                <p className="text-xs text-slate-400">
                  Dipakai sebagai identifier unik business.
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Business Type
                </label>
                <select
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
                  value={form.businessType}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      businessType: e.target.value as 'RETAIL' | 'RESTAURANT',
                    }))
                  }
                  disabled={loadingTypes || businessTypes.length === 0}
                >
                  {businessTypes.length === 0 ? (
                    <option value="">
                      {loadingTypes
                        ? 'Loading business types...'
                        : 'Business type tidak tersedia'}
                    </option>
                  ) : (
                    businessTypes.map((type) => (
                      <option key={type.code} value={type.code}>
                        {type.code}
                      </option>
                    ))
                  )}
                </select>
                <p className="text-xs text-slate-400">
                  Tipe business dipilih saat create dan tidak bebas diubah setelah
                  business dibuat.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
              <Link
                href="/dashboard/businesses"
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Batal
              </Link>

              <Button
                type="submit"
                disabled={saving || businessTypes.length === 0}
                className="h-11 rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                <span className="inline-flex items-center gap-2">
                  <FontAwesomeIcon icon={faFloppyDisk} className="h-4 w-4" />
                  {saving ? 'Menyimpan...' : 'Save Business'}
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
              <p>Pastikan nama business jelas dan mudah dikenali.</p>
              <p>Gunakan slug yang unik, rapi, dan konsisten.</p>
              <p>Pilih business type sesuai kebutuhan utama business.</p>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-50 text-orange-700">
                <FontAwesomeIcon icon={faShop} className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Aturan Business Type
                </p>
                <p className="text-xs text-slate-500">
                  Dipilih saat business dibuat
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                RESTAURANT dan RETAIL boleh dipilih saat create.
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Business type tidak dibuat editable bebas setelah business dibuat.
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
