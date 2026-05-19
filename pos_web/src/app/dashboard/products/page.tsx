'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowRight,
  faBan,
  faBarcode,
  faBoxOpen,
  faBoxesStacked,
  faChevronLeft,
  faChevronRight,
  faCircleCheck,
  faImage,
  faMagnifyingGlass,
  faPenToSquare,
  faPlus,
  faRotateRight,
  faTag,
  faUtensils,
} from '@fortawesome/free-solid-svg-icons';

import { api } from '@/lib/api';
import { getActiveBusinessId, getCachedCurrentUser } from '@/lib/auth';
import type { Category } from '@/types/category';
import type { Product, ProductStatus } from '@/types/product';
import { resolveImageUrl } from '@/lib/resolve-image-url';

const PER_PAGE = 20;

type PaginationMeta = {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
};

type Stats = {
  total: number;
  active: number;
  inactive: number;
  uncategorized: number;
};



type StatusFilter = 'ALL' | ProductStatus;

function getMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || 'Gagal memuat product';
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

function formatCurrency(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value || 0);
}




function getStatusBadgeClass(status: ProductStatus) {
  if (status === 'ACTIVE') {
    return 'border border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  return 'border border-slate-200 bg-slate-100 text-slate-600';
}

export default function ProductListPage() {
  const businessType = useMemo(() => getBusinessType(), []);
  const productLabel = businessType === 'RESTAURANT' ? 'Menu' : 'Produk';
  const productLabelLower = productLabel.toLowerCase();

  const [items, setItems] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);

  async function fetchCategories() {
    try {
      const response = await api.get('/business/categories', {
        params: {
          status: 'ACTIVE',
          perPage: 100,
        },
      });

      setCategories(response.data.data || []);
    } catch {
      setCategories([]);
    }
  }

  async function fetchStats() {
    try {
      const [totalRes, activeRes, inactiveRes] = await Promise.all([
        api.get('/business/products', { params: { page: 1, perPage: 1 } }),
        api.get('/business/products', { params: { page: 1, perPage: 1, status: 'ACTIVE' } }),
        api.get('/business/products', { params: { page: 1, perPage: 1, status: 'INACTIVE' } }),
      ]);
      const total: number = totalRes.data.meta?.total ?? 0;
      const active: number = activeRes.data.meta?.total ?? 0;
      const inactive: number = inactiveRes.data.meta?.total ?? 0;
      setStats({ total, active, inactive, uncategorized: total - active - inactive });
    } catch {
      // stats are best-effort
    }
  }

  async function fetchData(targetPage = page) {
    try {
      setLoading(true);
      setMessage('');

      const params: Record<string, string | number> = {
        page: targetPage,
        perPage: PER_PAGE,
      };

      if (search.trim()) {
        params.search = search.trim();
      }

      if (statusFilter !== 'ALL') {
        params.status = statusFilter;
      }

      if (categoryFilter) {
        params.categoryId = categoryFilter;
      }

      const response = await api.get('/business/products', { params });

      setItems(response.data.data || []);
      setMeta(response.data.meta ?? null);
    } catch (error: unknown) {
      setMessage(getMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleStatus(item: Product) {
    const newStatus: ProductStatus =
      item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

    try {
      setActionLoadingId(item.id);
      setMessage('');

      await api.patch(`/business/products/${item.id}/status`, {
        status: newStatus,
      });

      await fetchData(page);
      void fetchStats();
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
    setCategoryFilter('');
    setPage(1);
  }

  function handlePageChange(newPage: number) {
    setPage(newPage);
    void fetchData(newPage);
  }

  useEffect(() => {
    void fetchCategories();
    void fetchStats();
  }, []);

  useEffect(() => {
    setPage(1);
    void fetchData(1);
  }, [search, statusFilter, categoryFilter]);

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-700">
            <FontAwesomeIcon
              icon={businessType === 'RESTAURANT' ? faUtensils : faBoxOpen}
              className="h-3 w-3"
            />
            Product Management
          </div>

          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
            {productLabel}
          </h1>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Kelola {productLabelLower} dalam business aktif, termasuk kategori,
            harga dasar, foto, barcode retail, dan status aktifnya.
          </p>
        </div>

        <Link
          href="/dashboard/products/create"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          <FontAwesomeIcon icon={faPlus} className="h-4 w-4" />
          Tambah {productLabel}
        </Link>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Total {productLabel}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
            {stats ? stats.total : '-'}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Active</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-emerald-600">
            {stats ? stats.active : '-'}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Inactive</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-600">
            {stats ? stats.inactive : '-'}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Tanpa Category</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
            {stats ? stats.uncategorized : '-'}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            {productLabel} yang belum punya category.
          </p>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Daftar {productLabel}
              </h2>
              <p className="text-sm text-slate-500">
                Data {productLabelLower} pada business aktif.
              </p>
            </div>

            <form
              onSubmit={handleSearchSubmit}
              className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_180px_220px_auto]"
            >
              <div className="relative md:col-span-2 xl:col-span-1">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                  <FontAwesomeIcon
                    icon={faMagnifyingGlass}
                    className="h-4 w-4"
                  />
                </span>
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder={`Cari nama, code, SKU, atau barcode ${productLabelLower}`}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="ALL">Semua Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">Semua Category</option>
                {categories.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.code})
                  </option>
                ))}
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
              <FontAwesomeIcon icon={faBoxesStacked} className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-slate-900">
              Belum ada {productLabelLower}
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Tambahkan {productLabelLower} pertama untuk business aktif.
            </p>
            <Link
              href="/dashboard/products/create"
              className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <FontAwesomeIcon icon={faPlus} className="h-4 w-4" />
              Tambah {productLabel}
            </Link>
          </div>
        ) : (
          <>
            {meta && (
              <div className="border-b border-slate-200 px-5 py-3 sm:px-6">
                <p className="text-sm text-slate-500">
                  Menampilkan{' '}
                  <span className="font-medium text-slate-900">
                    {(meta.page - 1) * meta.perPage + 1}–
                    {Math.min(meta.page * meta.perPage, meta.total)}
                  </span>{' '}
                  dari{' '}
                  <span className="font-medium text-slate-900">{meta.total}</span>{' '}
                  {productLabelLower}
                </p>
              </div>
            )}

            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr className="border-b border-slate-200">
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.16em]">
                      {productLabel}
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.16em]">
                      Category
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.16em]">
                      SKU
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.16em]">
                      Barcode
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.16em]">
                      Base Price
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
                          <div className="flex items-start gap-3">
                            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 text-slate-400">
                              {item.imageUrl ? (
                                <Image
                                  src={resolveImageUrl(item.imageUrl)}
                                  alt={item.name}
                                  width={48}
                                  height={48}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <FontAwesomeIcon icon={faImage} className="h-4 w-4" />
                              )}
                            </div>

                            <div>
                              <p className="font-semibold text-slate-900">
                                {item.name}
                              </p>
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                                <span>{item.code || '-'}</span>
                                <span>•</span>
                                <span>{item.description || 'Tanpa deskripsi'}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                            <FontAwesomeIcon icon={faTag} className="h-3 w-3" />
                            {item.category?.name || '-'}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-slate-700">
                          {item.sku || '-'}
                        </td>

                        <td className="px-6 py-4 text-slate-700">
                          <span className="inline-flex items-center gap-2">
                            <FontAwesomeIcon icon={faBarcode} className="h-3.5 w-3.5 text-slate-400" />
                            {item.barcode || '-'}
                          </span>
                        </td>

                        <td className="px-6 py-4 font-semibold text-slate-900">
                          {formatCurrency(item.basePrice)}
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
                              href={`/dashboard/products/${item.id}/edit`}
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
                    <div className="flex items-start gap-3">
                      <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-white text-slate-400">
                        {item.imageUrl ? (
                          <Image
                            src={resolveImageUrl(item.imageUrl)}
                            alt={item.name}
                            width={56}
                            height={56}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <FontAwesomeIcon icon={faImage} className="h-4 w-4" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-base font-semibold text-slate-900">
                              {item.name}
                            </h3>
                            <p className="mt-1 text-xs text-slate-400">
                              {item.code || '-'}
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
                              Category
                            </p>
                            <p className="mt-2 text-sm font-medium text-slate-800">
                              {item.category?.name || '-'}
                            </p>
                          </div>

                          <div className="rounded-2xl bg-white px-3 py-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                              SKU
                            </p>
                            <p className="mt-2 text-sm font-medium text-slate-800">
                              {item.sku || '-'}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 rounded-2xl bg-white px-3 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                            Barcode
                          </p>
                          <p className="mt-2 text-sm font-medium text-slate-800">
                            {item.barcode || '-'}
                          </p>
                        </div>

                        <div className="mt-3 rounded-2xl bg-white px-3 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                            Base Price
                          </p>
                          <p className="mt-2 text-sm font-semibold text-slate-900">
                            {formatCurrency(item.basePrice)}
                          </p>
                        </div>

                        <div className="mt-3 rounded-2xl bg-white px-3 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                            Description
                          </p>
                          <p className="mt-2 text-sm text-slate-600">
                            {item.description || 'Tanpa deskripsi'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-2 sm:grid-cols-2">
                      <Link
                        href={`/dashboard/products/${item.id}/edit`}
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

            {meta && meta.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4 sm:px-6">
                <p className="text-sm text-slate-500">
                  Halaman {meta.page} dari {meta.totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={meta.page <= 1}
                    onClick={() => handlePageChange(meta.page - 1)}
                    className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <FontAwesomeIcon icon={faChevronLeft} className="h-3 w-3" />
                    Prev
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: meta.totalPages }, (_, i) => i + 1)
                      .filter(
                        (p) =>
                          p === 1 ||
                          p === meta.totalPages ||
                          Math.abs(p - meta.page) <= 1,
                      )
                      .reduce<(number | 'ellipsis')[]>((acc, p, idx, arr) => {
                        if (idx > 0 && p - (arr[idx - 1] as number) > 1) {
                          acc.push('ellipsis');
                        }
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((p, idx) =>
                        p === 'ellipsis' ? (
                          <span key={`ellipsis-${idx}`} className="px-1 text-sm text-slate-400">
                            …
                          </span>
                        ) : (
                          <button
                            key={p}
                            type="button"
                            onClick={() => handlePageChange(p)}
                            className={`inline-flex h-9 w-9 items-center justify-center rounded-xl text-sm font-medium transition ${
                              p === meta.page
                                ? 'bg-slate-900 text-white'
                                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {p}
                          </button>
                        ),
                      )}
                  </div>

                  <button
                    type="button"
                    disabled={meta.page >= meta.totalPages}
                    onClick={() => handlePageChange(meta.page + 1)}
                    className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                    <FontAwesomeIcon icon={faChevronRight} className="h-3 w-3" />
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
              Catatan {productLabel}
            </h2>
            <p className="text-sm text-slate-500">
              {productLabel} dikelola pada business scope aktif.
            </p>
          </div>

          <Link
            href="/dashboard/products/create"
            className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 transition hover:text-indigo-700"
          >
            Tambah {productLabelLower} baru
            <FontAwesomeIcon icon={faArrowRight} className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[
            `${productLabel} dibuat dalam business aktif.`,
            'Category product bisa dipilih atau dikosongkan.',
            'Barcode retail boleh dikosongkan dulu.',
            'Search dan filter status langsung ke endpoint business product.',
            'Foto sementara aman memakai imageUrl.',
            'Status diubah tanpa hard delete.',
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