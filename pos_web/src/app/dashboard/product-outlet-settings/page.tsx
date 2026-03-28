'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMagnifyingGlass,
  faRotateRight,
  faSliders,
} from '@fortawesome/free-solid-svg-icons';

import { api } from '@/lib/api';
import { getActiveBusinessId, getCachedCurrentUser } from '@/lib/auth';
import type { Product, ProductListResponse } from '@/types/product';
import type {
  ProductOutletSettingItem,
  ProductOutletSettingListResponse,
  ProductOutletSettingStatus,
} from '@/types/product-outlet-setting';

type StatusFilter = 'ALL' | ProductOutletSettingStatus;
type AvailabilityFilter = 'ALL' | 'AVAILABLE' | 'UNAVAILABLE';

type OutletOption = {
  id: string;
  name: string;
  code: string;
  status: string;
};

type OutletListResponse = {
  items: OutletOption[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

function getMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || 'Gagal memuat product outlet settings';
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

function getStatusBadgeClass(status: ProductOutletSettingStatus) {
  if (status === 'ACTIVE') {
    return 'border border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  return 'border border-slate-200 bg-slate-100 text-slate-600';
}

function getAvailabilityBadgeClass(isAvailable: boolean) {
  return isAvailable
    ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
    : 'border border-amber-200 bg-amber-50 text-amber-700';
}

export default function ProductOutletSettingsPage() {
  const businessType = useMemo(() => getBusinessType(), []);
  const productLabel = businessType === 'RESTAURANT' ? 'Menu' : 'Produk';
  const productLabelLower = productLabel.toLowerCase();

  const [items, setItems] = useState<ProductOutletSettingItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [outlets, setOutlets] = useState<OutletOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [availabilityFilter, setAvailabilityFilter] =
    useState<AvailabilityFilter>('ALL');
  const [productFilter, setProductFilter] = useState('');
  const [outletFilter, setOutletFilter] = useState('');

  async function fetchProducts() {
    try {
      const response = await api.get('/business/products', {
        params: {
          status: 'ACTIVE',
          limit: 100,
        },
      });

      const payload: ProductListResponse = response.data.data;
      setProducts(payload?.items || []);
    } catch {
      setProducts([]);
    }
  }

  async function fetchOutlets() {
    try {
      const response = await api.get('/business/outlets', {
        params: {
          status: 'ACTIVE',
          limit: 100,
        },
      });

      const payload: OutletListResponse = response.data.data;
      setOutlets(payload?.items || []);
    } catch {
      setOutlets([]);
    }
  }

  async function fetchData() {
    try {
      setLoading(true);
      setMessage('');

      const params: Record<string, string | boolean> = {};

      if (search.trim()) {
        params.search = search.trim();
      }

      if (statusFilter !== 'ALL') {
        params.status = statusFilter;
      }

      if (availabilityFilter !== 'ALL') {
        params.isAvailable = availabilityFilter === 'AVAILABLE';
      }

      if (productFilter) {
        params.productId = productFilter;
      }

      if (outletFilter) {
        params.outletId = outletFilter;
      }

      const response = await api.get('/business/product-outlet-settings', {
        params,
      });

      const payload: ProductOutletSettingListResponse = response.data.data;
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
    setStatusFilter('ALL');
    setAvailabilityFilter('ALL');
    setProductFilter('');
    setOutletFilter('');
  }

  useEffect(() => {
    void fetchProducts();
    void fetchOutlets();
  }, []);

  useEffect(() => {
    void fetchData();
  }, [search, statusFilter, availabilityFilter, productFilter, outletFilter]);

  const totalItem = items.length;
  const activeItem = useMemo(
    () => items.filter((item) => item.status === 'ACTIVE').length,
    [items]
  );
  const availableItem = useMemo(
    () => items.filter((item) => item.isAvailable).length,
    [items]
  );
  const overrideItem = useMemo(
    () => items.filter((item) => item.priceOverride !== null).length,
    [items]
  );

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-700">
            <FontAwesomeIcon icon={faSliders} className="h-3 w-3" />
            Product Outlet Settings
          </div>

          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
            Setting {productLabel} per Outlet
          </h1>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Atur ketersediaan, status, dan override harga {productLabelLower} untuk
            setiap outlet dalam business aktif.
          </p>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Total Setting</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
            {loading ? '-' : totalItem}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Active</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-emerald-600">
            {loading ? '-' : activeItem}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Available</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-emerald-600">
            {loading ? '-' : availableItem}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Price Override</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
            {loading ? '-' : overrideItem}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            {productLabel} dengan harga khusus outlet.
          </p>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Daftar Setting {productLabel} per Outlet
              </h2>
              <p className="text-sm text-slate-500">
                Filter per {productLabelLower}, outlet, status, dan availability.
              </p>
            </div>

            <form
              onSubmit={handleSearchSubmit}
              className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_220px_220px_170px_170px_auto]"
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
                  placeholder={`Cari ${productLabelLower}, code, SKU, atau outlet`}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <select
                value={productFilter}
                onChange={(e) => setProductFilter(e.target.value)}
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">Semua {productLabel}</option>
                {products.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.code || '-'})
                  </option>
                ))}
              </select>

              <select
                value={outletFilter}
                onChange={(e) => setOutletFilter(e.target.value)}
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">Semua Outlet</option>
                {outlets.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.code})
                  </option>
                ))}
              </select>

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
                value={availabilityFilter}
                onChange={(e) =>
                  setAvailabilityFilter(e.target.value as AvailabilityFilter)
                }
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="ALL">Semua Availability</option>
                <option value="AVAILABLE">Available</option>
                <option value="UNAVAILABLE">Unavailable</option>
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
              <FontAwesomeIcon icon={faSliders} className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-slate-900">
              Belum ada setting outlet
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Pilih {productLabelLower} lalu atur setting per outlet.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr className="border-b border-slate-200">
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.16em]">
                      {productLabel}
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.16em]">
                      Outlet
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.16em]">
                      Base Price
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.16em]">
                      Override
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.16em]">
                      Availability
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
                            {item.product?.name || '-'}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                            <span>{item.product?.code || '-'}</span>
                            <span>•</span>
                            <span>{item.product?.sku || 'Tanpa SKU'}</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-slate-800">
                            {item.outlet?.name || '-'}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {item.outlet?.code || '-'}
                          </p>
                        </div>
                      </td>

                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {formatCurrency(item.product?.basePrice || 0)}
                      </td>

                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {item.priceOverride !== null
                          ? formatCurrency(item.priceOverride)
                          : '-'}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getAvailabilityBadgeClass(
                            item.isAvailable
                          )}`}
                        >
                          {item.isAvailable ? 'Available' : 'Unavailable'}
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
                        <div className="flex justify-end">
                          <Link
                            href={`/dashboard/product-outlet-settings/${item.productId}`}
                            className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700 transition hover:bg-sky-100"
                          >
                            <FontAwesomeIcon icon={faSliders} className="h-3.5 w-3.5" />
                            Atur
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
                        {item.product?.name || '-'}
                      </h3>
                      <p className="mt-1 text-xs text-slate-400">
                        {item.product?.code || '-'} • {item.product?.sku || 'Tanpa SKU'}
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
                        Outlet
                      </p>
                      <p className="mt-2 text-sm font-medium text-slate-800">
                        {item.outlet?.name || '-'}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white px-3 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Availability
                      </p>
                      <p className="mt-2 text-sm font-medium text-slate-800">
                        {item.isAvailable ? 'Available' : 'Unavailable'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-white px-3 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Base Price
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {formatCurrency(item.product?.basePrice || 0)}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white px-3 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Override
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {item.priceOverride !== null
                          ? formatCurrency(item.priceOverride)
                          : '-'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5">
                    <Link
                      href={`/dashboard/product-outlet-settings/${item.productId}`}
                      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 text-sm font-semibold text-sky-700 transition hover:bg-sky-100"
                    >
                      <FontAwesomeIcon icon={faSliders} className="h-4 w-4" />
                      Atur per Outlet
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Catatan Product Outlet Settings
            </h2>
            <p className="text-sm text-slate-500">
              Setting ini dipakai untuk kebutuhan outlet-specific.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[
            `${productLabel} tetap punya base price utama.`,
            'Outlet bisa punya override harga sendiri.',
            'Availability per outlet bisa dibedakan.',
            'Status setting outlet tetap ACTIVE / INACTIVE.',
            'Atur detail per product agar lebih rapi.',
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