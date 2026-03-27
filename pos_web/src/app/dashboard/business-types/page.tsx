'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faLayerGroup,
  faShop,
  faStore,
} from '@fortawesome/free-solid-svg-icons';

import { api } from '@/lib/api';

type BusinessTypeItem = {
  code: 'RESTAURANT' | 'RETAIL';
  name: string;
  description: string;
  rules: string[];
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

function getTypeBadgeClass(code: BusinessTypeItem['code']) {
  if (code === 'RESTAURANT') {
    return 'border border-orange-200 bg-orange-50 text-orange-700';
  }

  return 'border border-sky-200 bg-sky-50 text-sky-700';
}

function getTypeIcon(code: BusinessTypeItem['code']) {
  if (code === 'RESTAURANT') {
    return faStore;
  }

  return faShop;
}

export default function BusinessTypesPage() {
  const [items, setItems] = useState<BusinessTypeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setMessage('');

        const response = await api.get('/platform/business-types');
        setItems(response.data.data || []);
      } catch (error: unknown) {
        setMessage(getMessage(error, 'Gagal memuat business types'));
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-700">
          <FontAwesomeIcon icon={faLayerGroup} className="h-3 w-3" />
          Business Types
        </div>

        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
          Master Business Types
        </h1>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          Reference business type untuk fase 1. Tipe business dipilih saat create
          dan tidak editable bebas setelah business dibuat.
        </p>
      </section>

      {message ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {message}
        </div>
      ) : null}

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <div
              key={index}
              className="h-56 animate-pulse rounded-[28px] bg-slate-100"
            />
          ))}
        </div>
      ) : (
        <section className="grid gap-4 lg:grid-cols-2">
          {items.map((item) => (
            <div
              key={item.code}
              className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                  <FontAwesomeIcon icon={getTypeIcon(item.code)} className="h-4 w-4" />
                </div>

                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getTypeBadgeClass(
                    item.code
                  )}`}
                >
                  {item.code}
                </span>
              </div>

              <h2 className="mt-5 text-xl font-semibold text-slate-900">
                {item.name}
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                {item.description}
              </p>

              <div className="mt-5 space-y-2">
                {item.rules.map((rule) => (
                  <div
                    key={rule}
                    className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600"
                  >
                    {rule}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      <section className="rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-6">
        <h2 className="text-base font-semibold text-slate-900">
          Catatan Implementasi
        </h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[
            'Business type tetap master reference pada fase 1.',
            'Tidak ada perubahan bebas business type setelah business dibuat.',
            'Outlet mengikuti business type business induknya.',
            'Halaman ini bersifat reference, bukan CRUD business type.',
          ].map((note) => (
            <div
              key={note}
              className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600"
            >
              {note}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}