'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowRight,
  faChair,
  faMagnifyingGlass,
  faRotateRight,
  faStore,
  faTableCellsLarge,
  faUtensils,
  faDisplay,
  faQrcode,
} from '@fortawesome/free-solid-svg-icons';

import { api } from '@/lib/api';
import { getActiveBusinessId, getCachedCurrentUser } from '@/lib/auth';

type OutletOption = {
  id: string;
  name: string;
  code: string;
  status: string;
};

type OutletListResponse = {
  items: OutletOption[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

function getMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || 'Gagal memuat outlet';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Terjadi kesalahan';
}

function getBusinessType(): 'RESTAURANT' | 'RETAIL' {
  const currentUser = getCachedCurrentUser();
  const activeBusinessId = getActiveBusinessId();

  const membership = currentUser?.businessMemberships?.find(
    (item) => item.businessId === activeBusinessId
  );

  return membership?.businessType === 'RESTAURANT' ? 'RESTAURANT' : 'RETAIL';
}

export default function OutletTablesPage() {
  const businessType = useMemo(() => getBusinessType(), []);
  const [items, setItems] = useState<OutletOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  async function fetchData() {
    try {
      setLoading(true);
      setMessage('');

      const response = await api.get('/business/outlets', {
        params: {
          ...(search.trim() ? { search: search.trim() } : {}),
          status: 'ACTIVE',
          limit: 100,
        },
      });

      const payload: OutletListResponse = response.data.data;
      setItems(payload?.items || []);
    } catch (error: unknown) {
      setMessage(getMessage(error));
    } finally {
      setLoading(false);
    }
  }

  function handleSearchSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSearch(searchInput.trim());
  }

  function handleResetFilter() {
    setSearchInput('');
    setSearch('');
  }

  useEffect(() => {
    void fetchData();
  }, [search]);

  if (businessType !== 'RESTAURANT') {
    return (
      <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-10 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
          <FontAwesomeIcon icon={faUtensils} className="h-5 w-5" />
        </div>
        <h1 className="mt-4 text-xl font-semibold text-slate-900">
          Fitur meja outlet hanya untuk restoran
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Business aktif Anda bukan tipe restaurant, jadi halaman ini tidak digunakan.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-700">
          <FontAwesomeIcon icon={faTableCellsLarge} className="h-3 w-3" />
          Outlet Tables
        </div>

        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
          Pilih Outlet Restoran
        </h1>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          Kelola meja, monitor meja, dan akses QR berdasarkan outlet restoran aktif.
        </p>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Outlet Restoran
              </h2>
              <p className="text-sm text-slate-500">
                Pilih outlet untuk mengatur meja, buka monitor meja, atau generate QR per meja.
              </p>
            </div>

            <form
              onSubmit={handleSearchSubmit}
              className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]"
            >
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                  <FontAwesomeIcon icon={faMagnifyingGlass} className="h-4 w-4" />
                </span>
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Cari nama atau code outlet"
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  <FontAwesomeIcon icon={faMagnifyingGlass} className="h-4 w-4" />
                  Cari
                </button>

                <button
                  type="button"
                  onClick={handleResetFilter}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <FontAwesomeIcon icon={faRotateRight} className="h-4 w-4" />
                  Reset
                </button>
              </div>
            </form>
          </div>
        </div>

        {message ? (
          <div className="px-5 pt-4 sm:px-6">
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {message}
            </div>
          </div>
        ) : null}

        {loading ? (
          <div className="grid gap-3 px-5 py-5 sm:px-6">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="px-5 py-12 text-center sm:px-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <FontAwesomeIcon icon={faStore} className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-slate-900">
              Outlet tidak ditemukan
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Pastikan outlet restoran sudah tersedia dan aktif.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-500">
                    <FontAwesomeIcon icon={faStore} className="h-4 w-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold text-slate-900">
                      {item.name}
                    </h3>
                    <p className="mt-1 text-xs text-slate-400">{item.code}</p>
                  </div>
                </div>

                <div className="mt-5 grid gap-2">
                  <Link
                    href={`/dashboard/outlet-tables/${item.id}`}
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    <FontAwesomeIcon icon={faChair} className="h-4 w-4" />
                    Kelola Meja
                  </Link>

                  <Link
                    href={`/dashboard/tables/monitor?outletId=${encodeURIComponent(item.id)}`}
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <FontAwesomeIcon icon={faDisplay} className="h-4 w-4" />
                    Buka Monitor Meja
                  </Link>

                  <Link
                    href={`/dashboard/outlet-tables/${item.id}#qr-info`}
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <FontAwesomeIcon icon={faQrcode} className="h-4 w-4" />
                    Pilih Meja untuk QR
                    <FontAwesomeIcon icon={faArrowRight} className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
