'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { useParams, useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faBuilding,
  faCheck,
  faFloppyDisk,
  faSliders,
} from '@fortawesome/free-solid-svg-icons';

import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';

type BusinessFeatureFlagItem = {
  id: string;
  key: string;
  name: string;
  description?: string | null;
  enabled: boolean;
};

type BusinessFeatureFlagsResponse = {
  business: {
    id: string;
    name: string;
    slug: string;
    businessType: 'RESTAURANT' | 'RETAIL';
    status: 'ACTIVE' | 'INACTIVE';
  };
  items: BusinessFeatureFlagItem[];
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

export default function BusinessFeaturesPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [data, setData] = useState<BusinessFeatureFlagsResponse | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');

  async function loadData() {
    try {
      setLoading(true);
      setMessage('');
      setMessageType('');

      const response = await api.get(`/platform/businesses/${params.id}/feature-flags`);
      const result = response.data.data as BusinessFeatureFlagsResponse;

      setData(result);
      setSelectedKeys(
        result.items.filter((item) => item.enabled).map((item) => item.key)
      );
    } catch (error: unknown) {
      setMessage(getMessage(error, 'Gagal memuat feature flags'));
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [params.id]);

  function toggleKey(key: string) {
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage('');
    setMessageType('');

    try {
      setSaving(true);

      await api.put(`/platform/businesses/${params.id}/feature-flags`, {
        featureFlagKeys: selectedKeys,
      });

      setMessage('Feature flags berhasil diperbarui');
      setMessageType('success');

      await loadData();
    } catch (error: unknown) {
      setMessage(getMessage(error, 'Gagal memperbarui feature flags'));
      setMessageType('error');
    } finally {
      setSaving(false);
    }
  }

  const enabledCount = useMemo(() => selectedKeys.length, [selectedKeys]);

  if (loading) {
    return (
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-3">
          <div className="h-6 w-48 animate-pulse rounded bg-slate-100" />
          <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-600">Data tidak tersedia.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-700">
            <FontAwesomeIcon icon={faSliders} className="h-3 w-3" />
            Feature Flags
          </div>

          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
            Manage Features
          </h1>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Atur fitur yang aktif untuk business ini pada fase 1.
          </p>
        </div>

        <button
          type="button"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          onClick={() => router.push('/dashboard/businesses')}
        >
          <FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4" />
          Kembali ke List
        </button>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Business</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">
            {data.business.name}
          </p>
          <p className="mt-1 text-sm text-slate-500">{data.business.slug}</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Business Type</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">
            {data.business.businessType}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Status</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">
            {data.business.status}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Enabled Features</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
            {enabledCount}
          </p>
        </div>
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

          <form onSubmit={handleSubmit} className="space-y-4">
            {data.items.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                Belum ada master feature flag.
              </div>
            ) : (
              data.items.map((item) => {
                const checked = selectedKeys.includes(item.key);

                return (
                  <label
                    key={item.id}
                    className={`flex cursor-pointer items-start gap-4 rounded-3xl border px-4 py-4 transition ${
                      checked
                        ? 'border-violet-200 bg-violet-50'
                        : 'border-slate-200 bg-slate-50 hover:bg-white'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleKey(item.key)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {item.name}
                          </p>
                          <p className="mt-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
                            {item.key}
                          </p>
                        </div>

                        {checked ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
                            <FontAwesomeIcon icon={faCheck} className="h-3 w-3" />
                            Enabled
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-500">
                            Disabled
                          </span>
                        )}
                      </div>

                      <p className="mt-3 text-sm leading-6 text-slate-500">
                        {item.description || 'Tidak ada deskripsi.'}
                      </p>
                    </div>
                  </label>
                );
              })
            )}

            <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
              <Link
                href="/dashboard/businesses"
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
                  {saving ? 'Menyimpan...' : 'Save Features'}
                </span>
              </Button>
            </div>
          </form>
        </section>

        <aside className="space-y-4">
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
              <FontAwesomeIcon icon={faBuilding} className="h-4 w-4" />
            </div>

            <h2 className="mt-4 text-base font-semibold text-slate-900">
              Ringkasan Business
            </h2>

            <div className="mt-4 space-y-3 text-sm">
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Name
                </p>
                <p className="mt-2 font-medium text-slate-800">
                  {data.business.name}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Type
                </p>
                <p className="mt-2 font-medium text-slate-800">
                  {data.business.businessType}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-base font-semibold text-slate-900">
              Catatan Fase 1
            </p>

            <div className="mt-4 space-y-2">
              {[
                'Feature flags diatur per business.',
                'Business type tetap tidak editable bebas.',
                'Outlet tetap mengikuti business induknya.',
                'Fitur yang aktif bisa dibatasi sesuai kebutuhan fase 1.',
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
        </aside>
      </div>
    </div>
  );
}