// pos_web/src/app/dashboard/outlets/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowRight,
  faBan,
  faCircleCheck,
  faLocationDot,
  faMagnifyingGlass,
  faPenToSquare,
  faPlus,
  faRotateRight,
  faShop,
  faStore,
  faUsers,
} from '@fortawesome/free-solid-svg-icons';

import { api } from '@/lib/api';
import type { Outlet, OutletListResponse, OutletStatus } from '@/types/outlet';

type StatusFilter = 'ALL' | OutletStatus;

function getMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || 'Gagal memuat outlet';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Terjadi kesalahan';
}

function getStatusBadgeClass(status: OutletStatus) {
  if (status === 'ACTIVE') {
    return 'border border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  return 'border border-slate-200 bg-slate-100 text-slate-600';
}

export default function OutletListPage() {
  const [items, setItems] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  async function fetchData() {
    try {
      setLoading(true);
      setMessage('');

      const params: Record<string, string> = {};

      if (search.trim()) {
        params.search = search.trim();
      }

      if (statusFilter !== 'ALL') {
        params.status = statusFilter;
      }

     

      const response = await api.get('/business/outlets', {
        params
      });
      const payload: OutletListResponse = response.data.data;

      setItems(payload?.items || []);
    } catch (error: unknown) {
      setMessage(getMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleStatus(item: Outlet) {
    const newStatus: OutletStatus =
      item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

    try {
      setActionLoadingId(item.id);
      setMessage('');

      const activeBusinessId =
        typeof window !== 'undefined'
          ? localStorage.getItem('activeBusinessId')
          : null;

      await api.patch(
        `/business/outlets/${item.id}/status`,
        {
          status: newStatus,
        },
        {
          headers: activeBusinessId
            ? {
                'x-business-id': activeBusinessId,
              }
            : undefined,
        }
      );

      await fetchData();
    } catch (error: unknown) {
      setMessage(getMessage(error));
    } finally {
      setActionLoadingId(null);
    }
  }

  function handleSearchSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSearch(searchInput.trim());
  }

  function handleResetFilter() {
    setSearchInput('');
    setSearch('');
    setStatusFilter('ALL');
  }

  useEffect(() => {
    void fetchData();
  }, [search, statusFilter]);

  const totalOutlet = items.length;
  const activeOutlet = useMemo(
    () => items.filter((item) => item.status === 'ACTIVE').length,
    [items]
  );
  const inactiveOutlet = useMemo(
    () => items.filter((item) => item.status === 'INACTIVE').length,
    [items]
  );
  const totalAssignedUsers = useMemo(
    () =>
      items.reduce(
        (total, item) => total + (item.totalAssignedUsers ?? 0),
        0
      ),
    [items]
  );

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-700">
            <FontAwesomeIcon icon={faStore} className="h-3 w-3" />
            Outlet Management
          </div>

          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
            Outlets
          </h1>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Kelola outlet dalam business aktif, termasuk status outlet dan data
            kontak dasarnya.
          </p>
        </div>

        <Link
          href="/dashboard/outlets/create"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          <FontAwesomeIcon icon={faPlus} className="h-4 w-4" />
          Tambah Outlet
        </Link>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Total Outlet</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
            {loading ? '-' : totalOutlet}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Active</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-emerald-600">
            {loading ? '-' : activeOutlet}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Inactive</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-600">
            {loading ? '-' : inactiveOutlet}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Assigned Users</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
            {loading ? '-' : totalAssignedUsers}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Total user yang sedang terhubung ke outlet.
          </p>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Daftar Outlet
              </h2>
              <p className="text-sm text-slate-500">
                Data outlet untuk business aktif pada Fase 2.
              </p>
            </div>

            <form
              onSubmit={handleSearchSubmit}
              className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_auto] lg:w-[680px]"
            >
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                  <FontAwesomeIcon
                    icon={faMagnifyingGlass}
                    className="h-4 w-4"
                  />
                </span>
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Cari nama, code, alamat, atau phone"
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as StatusFilter)
                }
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="ALL">Semua Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  <FontAwesomeIcon
                    icon={faMagnifyingGlass}
                    className="h-4 w-4"
                  />
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
              <div
                key={index}
                className="h-16 animate-pulse rounded-2xl bg-slate-100"
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="px-5 py-12 text-center sm:px-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <FontAwesomeIcon icon={faLocationDot} className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-slate-900">
              Belum ada outlet
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Tambahkan outlet pertama untuk business aktif.
            </p>
            <Link
              href="/dashboard/outlets/create"
              className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <FontAwesomeIcon icon={faPlus} className="h-4 w-4" />
              Tambah Outlet
            </Link>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr className="border-b border-slate-200">
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.16em]">
                      Outlet
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.16em]">
                      Code
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.16em]">
                      Contact
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.16em]">
                      Assigned Users
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.16em]">
                      Status
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-[0.16em]">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const isLoading = actionLoadingId === item.id;

                    return (
                      <tr
                        key={item.id}
                        className="border-b border-slate-200 last:border-b-0"
                      >
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-semibold text-slate-900">
                              {item.name}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                              {item.address || 'Alamat belum diisi'}
                            </p>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                            {item.code}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <p className="font-medium text-slate-800">
                            {item.phone || '-'}
                          </p>
                        </td>

                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                            <FontAwesomeIcon icon={faUsers} className="h-3 w-3" />
                            {item.totalAssignedUsers ?? 0} user
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(
                              item.status
                            )}`}
                          >
                            {item.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-2">
                            <Link
                              href={`/dashboard/outlets/${item.id}/edit`}
                              className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700 transition hover:bg-sky-100"
                            >
                              <FontAwesomeIcon
                                icon={faPenToSquare}
                                className="h-3.5 w-3.5"
                              />
                              Edit
                            </Link>

                            <button
                              type="button"
                              disabled={isLoading}
                              className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-70 ${
                                item.status === 'ACTIVE'
                                  ? 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                                  : 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              }`}
                              onClick={() => void handleToggleStatus(item)}
                            >
                              <FontAwesomeIcon
                                icon={
                                  item.status === 'ACTIVE'
                                    ? faBan
                                    : faCircleCheck
                                }
                                className="h-3.5 w-3.5"
                              />
                              {isLoading
                                ? 'Memproses...'
                                : item.status === 'ACTIVE'
                                  ? 'Nonaktifkan'
                                  : 'Aktifkan'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="grid gap-4 p-4 lg:hidden">
              {items.map((item) => {
                const isLoading = actionLoadingId === item.id;

                return (
                  <div
                    key={item.id}
                    className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-slate-900">
                          {item.name}
                        </h3>
                        <p className="mt-1 text-xs text-slate-400">
                          {item.code}
                        </p>
                      </div>

                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold ${getStatusBadgeClass(
                          item.status
                        )}`}
                      >
                        {item.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl bg-white px-3 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                          Contact
                        </p>
                        <p className="mt-2 text-sm font-medium text-slate-800">
                          {item.phone || '-'}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-white px-3 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                          Assigned Users
                        </p>
                        <p className="mt-2 text-sm font-medium text-slate-800">
                          {item.totalAssignedUsers ?? 0} user
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 rounded-2xl bg-white px-3 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Address
                      </p>
                      <p className="mt-2 text-sm text-slate-600">
                        {item.address || 'Alamat belum diisi'}
                      </p>
                    </div>

                    <div className="mt-5 grid gap-2 sm:grid-cols-2">
                      <Link
                        href={`/dashboard/outlets/${item.id}/edit`}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 text-sm font-semibold text-sky-700 transition hover:bg-sky-100"
                      >
                        <FontAwesomeIcon
                          icon={faPenToSquare}
                          className="h-4 w-4"
                        />
                        Edit
                      </Link>

                      <button
                        type="button"
                        disabled={isLoading}
                        className={`inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-70 ${
                          item.status === 'ACTIVE'
                            ? 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                            : 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        }`}
                        onClick={() => void handleToggleStatus(item)}
                      >
                        <FontAwesomeIcon
                          icon={
                            item.status === 'ACTIVE' ? faBan : faCircleCheck
                          }
                          className="h-4 w-4"
                        />
                        {isLoading
                          ? 'Memproses...'
                          : item.status === 'ACTIVE'
                            ? 'Nonaktifkan'
                            : 'Aktifkan'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Catatan Fase 2
            </h2>
            <p className="text-sm text-slate-500">
              Outlet sekarang dikelola dalam business scope aktif.
            </p>
          </div>

          <Link
            href="/dashboard/outlets/create"
            className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 transition hover:text-indigo-700"
          >
            Tambah outlet baru
            <FontAwesomeIcon icon={faArrowRight} className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[
            'Create outlet tidak pilih business manual lagi.',
            'Search dan filter status langsung ke endpoint business outlet.',
            'Outlet tetap memakai ACTIVE / INACTIVE.',
            'Tidak ada hard delete untuk outlet.',
            'Assigned users membantu cek outlet mana yang sedang dipakai.',
            'Validasi utama tetap dilakukan di backend.',
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