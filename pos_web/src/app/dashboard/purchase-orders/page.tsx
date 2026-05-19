'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowRight,
  faChevronLeft,
  faChevronRight,
  faFileInvoice,
  faMagnifyingGlass,
  faPenToSquare,
  faPlus,
  faRotateRight,
  faStore,
  faTruck,
} from '@fortawesome/free-solid-svg-icons';

const PER_PAGE = 20;

type PaginationMeta = {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
};

import { api } from '@/lib/api';
import { getActiveOutletId, setActiveOutletId } from '@/lib/auth';
import type { Outlet } from '@/types/outlet';
import type {
  PurchaseOrderStatus,
  PurchaseOrderSummary,
} from '@/types/purchase-order';

type StatusFilter = 'ALL' | PurchaseOrderStatus;

type OutletListEnvelope = {
  items?: Outlet[];
};

function getMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || 'Gagal memuat purchase order';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Terjadi kesalahan';
}

function formatDate(value: string | null) {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
  }).format(new Date(value));
}

function formatCurrency(value: string) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(value || '0'));
}

function getStatusBadgeClass(status: PurchaseOrderStatus) {
  if (status === 'DRAFT') {
    return 'border border-amber-200 bg-amber-50 text-amber-700';
  }

  if (status === 'SUBMITTED') {
    return 'border border-sky-200 bg-sky-50 text-sky-700';
  }

  if (status === 'CANCELLED') {
    return 'border border-red-200 bg-red-50 text-red-700';
  }

  return 'border border-slate-200 bg-slate-100 text-slate-600';
}

export default function PurchaseOrderListPage() {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [selectedOutletId, setSelectedOutletId] = useState('');
  const [items, setItems] = useState<PurchaseOrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingOutlets, setLoadingOutlets] = useState(true);
  const [message, setMessage] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);

  async function fetchOutlets() {
    try {
      setLoadingOutlets(true);
      const response = await api.get('/business/outlets', {
        params: {
          status: 'ACTIVE',
          perPage: 100,
        },
      });

      const payload = response.data?.data as OutletListEnvelope | Outlet[];
      const outletItems = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.items)
          ? payload.items
          : [];

      setOutlets(outletItems);

      const storedOutletId = getActiveOutletId();
      const resolvedOutletId =
        outletItems.find((item) => item.id === storedOutletId)?.id ||
        outletItems[0]?.id ||
        '';

      setSelectedOutletId(resolvedOutletId);

      if (resolvedOutletId) {
        setActiveOutletId(resolvedOutletId);
      }
    } catch {
      setOutlets([]);
      setSelectedOutletId('');
    } finally {
      setLoadingOutlets(false);
    }
  }

  async function fetchData(targetPage = page) {
    if (!selectedOutletId) {
      setItems([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setMessage('');

      const params: Record<string, string | number> = {
        outletId: selectedOutletId,
        page: targetPage,
        perPage: PER_PAGE,
      };

      if (search.trim()) params.search = search.trim();
      if (statusFilter !== 'ALL') params.status = statusFilter;

      const response = await api.get('/purchase-orders', { params });
      setItems(Array.isArray(response.data?.data) ? response.data.data : []);
      setMeta(response.data?.meta ?? null);
    } catch (error: unknown) {
      setMessage(getMessage(error));
    } finally {
      setLoading(false);
    }
  }

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearch(searchInput.trim());
  }

  function handleResetFilter() {
    setSearchInput('');
    setSearch('');
    setStatusFilter('ALL');
    setPage(1);
  }

  function handleChangeOutlet(outletId: string) {
    setSelectedOutletId(outletId);
    setPage(1);
    if (outletId) setActiveOutletId(outletId);
  }

  function handlePageChange(newPage: number) {
    setPage(newPage);
    void fetchData(newPage);
  }

  useEffect(() => {
    void fetchOutlets();
  }, []);

  useEffect(() => {
    setPage(1);
    void fetchData(1);
  }, [selectedOutletId, search, statusFilter]);

  const totalPo = meta?.total ?? items.length;
  const draftPo = items.filter((item) => item.status === 'DRAFT').length;
  const submittedPo = items.filter((item) => item.status === 'SUBMITTED').length;
  const totalAmount = items.reduce((sum, item) => sum + Number(item.totalAmount || '0'), 0);

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-700">
            <FontAwesomeIcon icon={faFileInvoice} className="h-3 w-3" />
            Procurement
          </div>

          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
            Purchase Orders
          </h1>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Kelola draft dan pengajuan purchase order per outlet.
          </p>
        </div>

        <Link
          href="/dashboard/purchase-orders/create"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          <FontAwesomeIcon icon={faPlus} className="h-4 w-4" />
          Tambah PO
        </Link>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Total PO</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
            {loading ? '-' : totalPo}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Draft</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-amber-600">
            {loading ? '-' : draftPo}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Submitted</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-sky-600">
            {loading ? '-' : submittedPo}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Total Nilai</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
            {loading ? '-' : formatCurrency(String(totalAmount))}
          </p>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Daftar Purchase Order
              </h2>
              <p className="text-sm text-slate-500">
                Data purchase order berdasarkan outlet aktif.
              </p>
            </div>

            <form
              onSubmit={handleSearchSubmit}
              className="grid gap-3 md:grid-cols-2 xl:grid-cols-[220px_minmax(0,1fr)_180px_auto]"
            >
              <select
                value={selectedOutletId}
                onChange={(event) => handleChangeOutlet(event.target.value)}
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">
                  {loadingOutlets ? 'Memuat outlet...' : 'Pilih outlet'}
                </option>
                {outlets.map((outlet) => (
                  <option key={outlet.id} value={outlet.id}>
                    {outlet.name}
                  </option>
                ))}
              </select>

              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                  <FontAwesomeIcon
                    icon={faMagnifyingGlass}
                    className="h-4 w-4"
                  />
                </span>
                <input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Cari nomor PO, supplier, atau catatan"
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as StatusFilter)
                }
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="ALL">Semua Status</option>
                <option value="DRAFT">Draft</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="CANCELLED">Cancelled</option>
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

        {!selectedOutletId && !loadingOutlets ? (
          <div className="px-5 py-12 text-center sm:px-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <FontAwesomeIcon icon={faStore} className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-slate-900">
              Outlet belum dipilih
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Pilih outlet terlebih dahulu untuk melihat purchase order.
            </p>
          </div>
        ) : loading ? (
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
              <FontAwesomeIcon icon={faTruck} className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-slate-900">
              Belum ada purchase order
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Buat purchase order pertama untuk outlet ini.
            </p>
            <Link
              href="/dashboard/purchase-orders/create"
              className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <FontAwesomeIcon icon={faPlus} className="h-4 w-4" />
              Tambah PO
            </Link>
          </div>
        ) : (
          <>
            {meta && (
              <div className="border-b border-slate-200 px-5 py-3 sm:px-6">
                <p className="text-sm text-slate-500">
                  Menampilkan{' '}
                  <span className="font-medium text-slate-900">
                    {(meta.page - 1) * meta.perPage + 1}–{Math.min(meta.page * meta.perPage, meta.total)}
                  </span>{' '}
                  dari <span className="font-medium text-slate-900">{meta.total}</span> PO
                </p>
              </div>
            )}

            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr className="border-b border-slate-200">
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.16em]">
                      Purchase Order
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.16em]">
                      Supplier
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.16em]">
                      Tanggal
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.16em]">
                      Items
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.16em]">
                      Total
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
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-slate-200 last:border-b-0"
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold text-slate-900">
                            {item.poNumber}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {item.notes || 'Tanpa catatan'}
                          </p>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-slate-800">
                            {item.supplierName}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {item.supplierCode}
                          </p>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-slate-700">
                        <p>{formatDate(item.orderDate)}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          ETA: {formatDate(item.expectedDate)}
                        </p>
                      </td>

                      <td className="px-6 py-4 text-slate-700">
                        {item.itemCount} item
                      </td>

                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {formatCurrency(item.totalAmount)}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(
                            item.status,
                          )}`}
                        >
                          {item.status}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/dashboard/purchase-orders/${item.id}/edit`}
                            className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700 transition hover:bg-sky-100"
                          >
                            <FontAwesomeIcon
                              icon={faPenToSquare}
                              className="h-3.5 w-3.5"
                            />
                            Detail
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-4 p-4 lg:hidden">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">
                        {item.poNumber}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {item.supplierName}
                      </p>
                    </div>

                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold ${getStatusBadgeClass(
                        item.status,
                      )}`}
                    >
                      {item.status}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-white px-3 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Order Date
                      </p>
                      <p className="mt-2 text-sm font-medium text-slate-800">
                        {formatDate(item.orderDate)}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white px-3 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Total
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {formatCurrency(item.totalAmount)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 rounded-2xl bg-white px-3 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Items
                    </p>
                    <p className="mt-2 text-sm text-slate-700">
                      {item.itemCount} item, ETA {formatDate(item.expectedDate)}
                    </p>
                  </div>

                  <div className="mt-5">
                    <Link
                      href={`/dashboard/purchase-orders/${item.id}/edit`}
                      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 text-sm font-semibold text-sky-700 transition hover:bg-sky-100"
                    >
                      <FontAwesomeIcon
                        icon={faPenToSquare}
                        className="h-4 w-4"
                      />
                      Detail
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {meta && meta.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4 sm:px-6">
                <p className="text-sm text-slate-500">Halaman {meta.page} dari {meta.totalPages}</p>
                <div className="flex items-center gap-2">
                  <button type="button" disabled={meta.page <= 1} onClick={() => handlePageChange(meta.page - 1)} className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
                    <FontAwesomeIcon icon={faChevronLeft} className="h-3 w-3" />Prev
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: meta.totalPages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === meta.totalPages || Math.abs(p - meta.page) <= 1)
                      .reduce<(number | 'ellipsis')[]>((acc, p, idx, arr) => { if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('ellipsis'); acc.push(p); return acc; }, [])
                      .map((p, idx) => p === 'ellipsis' ? (
                        <span key={`e-${idx}`} className="px-1 text-sm text-slate-400">…</span>
                      ) : (
                        <button key={p} type="button" onClick={() => handlePageChange(p)} className={`inline-flex h-9 w-9 items-center justify-center rounded-xl text-sm font-medium transition ${p === meta.page ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>{p}</button>
                      ))}
                  </div>
                  <button type="button" disabled={meta.page >= meta.totalPages} onClick={() => handlePageChange(meta.page + 1)} className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
                    Next<FontAwesomeIcon icon={faChevronRight} className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Catatan Purchase Order
            </h2>
            <p className="text-sm text-slate-500">
              Purchase order dikelola per outlet aktif.
            </p>
          </div>

          <Link
            href="/dashboard/purchase-orders/create"
            className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 transition hover:text-indigo-700"
          >
            Buat purchase order baru
            <FontAwesomeIcon icon={faArrowRight} className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[
            'PO dibuat berdasarkan outlet yang dipilih.',
            'Draft masih bisa diedit sebelum diajukan.',
            'Status awal purchase order adalah DRAFT.',
            'Submitted dan cancelled dicatat lewat endpoint status terpisah.',
            'Histori penerimaan barang belum masuk fase ini.',
            'Harga jual product tetap tidak tercampur dengan purchase order.',
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
