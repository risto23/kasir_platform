'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faFloppyDisk,
  faSliders,
  faStore,
} from '@fortawesome/free-solid-svg-icons';

import { api } from '@/lib/api';
import { getActiveBusinessId, getCachedCurrentUser } from '@/lib/auth';
import type { Product } from '@/types/product';
import type {
  ProductOutletSettingItem,
  ProductOutletSettingListResponse,
  ProductOutletSettingStatus,
} from '@/types/product-outlet-setting';

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

type EditState = {
  outletId: string;
  status: ProductOutletSettingStatus;
  isAvailable: boolean;
  priceOverride: string;
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

export default function ProductOutletSettingsDetailPage() {
  const params = useParams<{ productId: string }>();
  const businessType = useMemo(() => getBusinessType(), []);
  const productLabel = businessType === 'RESTAURANT' ? 'Menu' : 'Produk';
  const productLabelLower = productLabel.toLowerCase();

  const [product, setProduct] = useState<Product | null>(null);
  const [outlets, setOutlets] = useState<OutletOption[]>([]);
  const [items, setItems] = useState<ProductOutletSettingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
  const [editState, setEditState] = useState<Record<string, EditState>>({});
  const [savingOutletId, setSavingOutletId] = useState<string | null>(null);

  async function fetchData() {
    try {
      setLoading(true);
      setMessage('');
      setMessageType('');

      const [productResponse, outletsResponse, settingsResponse] = await Promise.all([
        api.get(`/business/products/${params.productId}`),
        api.get('/business/outlets', {
          params: {
            status: 'ACTIVE',
            limit: 100,
          },
        }),
        api.get(`/business/product-outlet-settings/products/${params.productId}`),
      ]);

      const productData: Product = productResponse.data.data;
      const outletsPayload: OutletListResponse = outletsResponse.data.data;
      const settingsPayload: ProductOutletSettingListResponse =
        settingsResponse.data.data;

      const outletRows = outletsPayload?.items || [];
      const existingRows = settingsPayload?.items || [];

      const mapByOutletId = new Map(existingRows.map((item) => [item.outletId, item]));

      const initialState: Record<string, EditState> = {};
      for (const outlet of outletRows) {
        const existing = mapByOutletId.get(outlet.id);

        initialState[outlet.id] = {
          outletId: outlet.id,
          status: existing?.status || 'ACTIVE',
          isAvailable: existing?.isAvailable ?? true,
          priceOverride:
            existing?.priceOverride !== null && existing?.priceOverride !== undefined
              ? String(existing.priceOverride)
              : '',
        };
      }

      setProduct(productData);
      setOutlets(outletRows);
      setItems(existingRows);
      setEditState(initialState);
    } catch (error: unknown) {
      setMessage(getMessage(error, 'Gagal memuat setting product outlet'));
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(outletId: string) {
    const current = editState[outletId];
    if (!current) return;

    const trimmedOverride = current.priceOverride.trim();
    const parsedOverride =
      trimmedOverride === '' ? null : Number(trimmedOverride);

    if (parsedOverride !== null && Number.isNaN(parsedOverride)) {
      setMessage('Price override harus berupa angka.');
      setMessageType('error');
      return;
    }

    if (parsedOverride !== null && parsedOverride < 0) {
      setMessage('Price override tidak boleh kurang dari 0.');
      setMessageType('error');
      return;
    }

    try {
      setSavingOutletId(outletId);
      setMessage('');
      setMessageType('');

      await api.put(
        `/business/product-outlet-settings/products/${params.productId}/outlets/${outletId}`,
        {
          status: current.status,
          isAvailable: current.isAvailable,
          priceOverride: parsedOverride,
        }
      );

      setMessage('Setting outlet berhasil diperbarui');
      setMessageType('success');
      await fetchData();
    } catch (error: unknown) {
      setMessage(getMessage(error, 'Gagal memperbarui setting outlet'));
      setMessageType('error');
    } finally {
      setSavingOutletId(null);
    }
  }

  function getExistingSetting(outletId: string) {
    return items.find((item) => item.outletId === outletId) || null;
  }

  useEffect(() => {
    void fetchData();
  }, [params.productId]);

  if (loading) {
    return (
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-3">
          <div className="h-6 w-40 animate-pulse rounded bg-slate-100" />
          <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-32 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-32 animate-pulse rounded-2xl bg-slate-100" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-700">
            <FontAwesomeIcon icon={faSliders} className="h-3 w-3" />
            Product Outlet Detail
          </div>

          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
            Atur {productLabel} per Outlet
          </h1>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Kelola status, availability, dan harga khusus outlet untuk{' '}
            {productLabelLower} terpilih.
          </p>
        </div>

        <Link
          href="/dashboard/product-outlet-settings"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4" />
          Kembali ke List
        </Link>
      </section>

      {message ? (
        <div
          className={`rounded-2xl px-4 py-3 text-sm ${
            messageType === 'success'
              ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {message}
        </div>
      ) : null}

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl bg-slate-50 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              {productLabel}
            </p>
            <p className="mt-2 text-base font-semibold text-slate-900">
              {product?.name || '-'}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {product?.code || '-'} • {product?.sku || 'Tanpa SKU'}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Category
            </p>
            <p className="mt-2 text-base font-semibold text-slate-900">
              {product?.category?.name || '-'}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Base Price
            </p>
            <p className="mt-2 text-base font-semibold text-slate-900">
              {formatCurrency(product?.basePrice || 0)}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Product Status
            </p>
            <p className="mt-2 text-base font-semibold text-slate-900">
              {product?.status || '-'}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4">
        {outlets.map((outlet) => {
          const state = editState[outlet.id];
          const existing = getExistingSetting(outlet.id);
          const isSaving = savingOutletId === outlet.id;

          return (
            <div
              key={outlet.id}
              className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                      <FontAwesomeIcon icon={faStore} className="h-4 w-4" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-slate-900">
                        {outlet.name}
                      </h2>
                      <p className="text-sm text-slate-500">{outlet.code}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(
                      state?.status || existing?.status || 'ACTIVE'
                    )}`}
                  >
                    {(state?.status || existing?.status || 'ACTIVE') === 'ACTIVE'
                      ? 'Active'
                      : 'Inactive'}
                  </span>

                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getAvailabilityBadgeClass(
                      state?.isAvailable ?? existing?.isAvailable ?? true
                    )}`}
                  >
                    {state?.isAvailable ?? existing?.isAvailable ?? true
                      ? 'Available'
                      : 'Unavailable'}
                  </span>

                  {!existing ? (
                    <span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      Belum ada setting
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_1fr_220px_220px]">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Status
                  </label>
                  <select
                    value={state?.status || 'ACTIVE'}
                    onChange={(e) =>
                      setEditState((prev) => ({
                        ...prev,
                        [outlet.id]: {
                          ...(prev[outlet.id] || {
                            outletId: outlet.id,
                            status: 'ACTIVE',
                            isAvailable: true,
                            priceOverride: '',
                          }),
                          status: e.target.value as ProductOutletSettingStatus,
                        },
                      }))
                    }
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Availability
                  </label>
                  <select
                    value={state?.isAvailable ? 'true' : 'false'}
                    onChange={(e) =>
                      setEditState((prev) => ({
                        ...prev,
                        [outlet.id]: {
                          ...(prev[outlet.id] || {
                            outletId: outlet.id,
                            status: 'ACTIVE',
                            isAvailable: true,
                            priceOverride: '',
                          }),
                          isAvailable: e.target.value === 'true',
                        },
                      }))
                    }
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="true">Available</option>
                    <option value="false">Unavailable</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Base Price
                  </label>
                  <div className="flex h-12 items-center rounded-2xl border border-slate-200 bg-slate-100 px-4 text-sm font-semibold text-slate-700">
                    {formatCurrency(product?.basePrice || 0)}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Price Override
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={state?.priceOverride || ''}
                    onChange={(e) =>
                      setEditState((prev) => ({
                        ...prev,
                        [outlet.id]: {
                          ...(prev[outlet.id] || {
                            outletId: outlet.id,
                            status: 'ACTIVE',
                            isAvailable: true,
                            priceOverride: '',
                          }),
                          priceOverride: e.target.value,
                        },
                      }))
                    }
                    placeholder="Kosongkan jika tidak ada override"
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    Setting ini hanya berlaku untuk outlet ini.
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    Kosongkan override untuk kembali ke base price.
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    Simpan per outlet secara terpisah agar aman.
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => void handleSave(outlet.id)}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <FontAwesomeIcon icon={faFloppyDisk} className="h-4 w-4" />
                  {isSaving ? 'Menyimpan...' : 'Simpan Setting'}
                </button>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}