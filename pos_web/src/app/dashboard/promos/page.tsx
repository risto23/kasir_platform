'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import {
  formatPromoPeriod,
  formatPromoTargetValue,
  getPromoFormMeta,
  getPromoStatusLabel,
  getPromoTargetTypeLabel,
  getPromos,
  updatePromoStatus,
} from '@/lib/promo';
import { PromoStatusBadge } from '@/components/promo/promo-status-badge';
import type {
  PromoEffectiveStatus,
  PromoFormMeta,
  PromoItem,
  PromoStatus,
  PromoTargetType,
} from '@/types/promo';

type Filters = {
  search: string;
  targetType: PromoTargetType | '';
  status: PromoStatus | '';
  effectiveStatus: PromoEffectiveStatus | '';
};

const initialFilters: Filters = {
  search: '',
  targetType: '',
  status: '',
  effectiveStatus: '',
};

export default function PromosPage() {
  const [meta, setMeta] = useState<PromoFormMeta | null>(null);
  const [items, setItems] = useState<PromoItem[]>([]);
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [loadingList, setLoadingList] = useState(true);
  const [error, setError] = useState('');
  const [statusLoadingId, setStatusLoadingId] = useState<string | null>(null);

  const itemLabel = useMemo(() => {
    return meta?.businessType === 'RESTAURANT' ? 'Menu' : 'Produk';
  }, [meta?.businessType]);

  useEffect(() => {
    let cancelled = false;

    async function loadMeta() {
      try {
        setLoadingMeta(true);
        setError('');

        const response = await getPromoFormMeta();
        console.log('Meta promo:', response);

        if (!cancelled) {
          setMeta(response);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Gagal memuat meta promo');
        }
      } finally {
        if (!cancelled) {
          setLoadingMeta(false);
        }
      }
    }

    void loadMeta();

    return () => {
      cancelled = true;
    };
  }, []);

  async function loadPromos(currentFilters: Filters) {
    try {
      setLoadingList(true);
      setError('');

      const response = await getPromos(currentFilters);
      console.log('Daftar promo:', response);
      setItems(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat promo');
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    void loadPromos(filters);
  }, [filters]);

  function setFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function handleToggleStatus(item: PromoItem) {
    const nextStatus: PromoStatus =
      item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

    const confirmed = window.confirm(
      `Ubah status promo "${item.name}" menjadi ${nextStatus}?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setStatusLoadingId(item.id);
      setError('');
      await updatePromoStatus(item.id, nextStatus);
      await loadPromos(filters);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengubah status promo');
    } finally {
      setStatusLoadingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Promo</h1>
          <p className="mt-1 text-sm text-slate-500">
            Kelola promo untuk kategori, {itemLabel.toLowerCase()}, nama, brand,
            dan satuan.
          </p>
        </div>

        <Link
          href="/dashboard/promos/create"
          className="inline-flex rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Tambah Promo
        </Link>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="md:col-span-1">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Cari
            </label>
            <input
              type="text"
              value={filters.search}
              onChange={(event) => setFilter('search', event.target.value)}
              placeholder="Cari promo..."
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Tipe Target
            </label>
            <select
              value={filters.targetType}
              onChange={(event) =>
                setFilter('targetType', event.target.value as Filters['targetType'])
              }
              disabled={loadingMeta}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500 disabled:bg-slate-100"
            >
              <option value="">Semua</option>
              {(meta?.targetTypes ?? []).map((type) => (
                <option key={type} value={type}>
                  {getPromoTargetTypeLabel(type)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Status Dasar
            </label>
            <select
              value={filters.status}
              onChange={(event) =>
                setFilter('status', event.target.value as Filters['status'])
              }
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
            >
              <option value="">Semua</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Status Efektif
            </label>
            <select
              value={filters.effectiveStatus}
              onChange={(event) =>
                setFilter(
                  'effectiveStatus',
                  event.target.value as Filters['effectiveStatus'],
                )
              }
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
            >
              <option value="">Semua</option>
              <option value="ACTIVE">{getPromoStatusLabel('ACTIVE')}</option>
              <option value="INACTIVE">{getPromoStatusLabel('INACTIVE')}</option>
              <option value="SCHEDULED">{getPromoStatusLabel('SCHEDULED')}</option>
              <option value="EXPIRED">{getPromoStatusLabel('EXPIRED')}</option>
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3 font-semibold">Promo</th>
                <th className="px-4 py-3 font-semibold">Target</th>
                <th className="px-4 py-3 font-semibold">Diskon</th>
                <th className="px-4 py-3 font-semibold">Periode</th>
                <th className="px-4 py-3 font-semibold">Status Dasar</th>
                <th className="px-4 py-3 font-semibold">Status Efektif</th>
                <th className="px-4 py-3 font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loadingList ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                    Memuat promo...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                    Belum ada data promo.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="border-t border-slate-200">
                    <td className="px-4 py-4 align-top">
                      <div className="font-semibold text-slate-900">{item.name}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {item.description || '-'}
                      </div>
                    </td>

                    <td className="px-4 py-4 align-top">
                      <div className="font-medium text-slate-800">
                        {getPromoTargetTypeLabel(item.targetType)}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {formatPromoTargetValue(item.targetType, item.targetLabel)}
                      </div>
                    </td>

                    <td className="px-4 py-4 align-top text-slate-700">
                      {item.discountPreview}
                    </td>

                    <td className="px-4 py-4 align-top text-slate-700">
                      {formatPromoPeriod(item)}
                    </td>

                    <td className="px-4 py-4 align-top">
                      <PromoStatusBadge value={item.status} variant="base" />
                    </td>

                    <td className="px-4 py-4 align-top">
                      <PromoStatusBadge
                        value={item.effectiveStatus}
                        variant="effective"
                      />
                    </td>

                    <td className="px-4 py-4 align-top">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/dashboard/promos/${item.id}`}
                          className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                          Detail
                        </Link>

                        <Link
                          href={`/dashboard/promos/${item.id}/edit`}
                          className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                          Edit
                        </Link>

                        <button
                          type="button"
                          onClick={() => void handleToggleStatus(item)}
                          disabled={statusLoadingId === item.id}
                          className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {statusLoadingId === item.id
                            ? 'Memproses...'
                            : item.status === 'ACTIVE'
                              ? 'Nonaktifkan'
                              : 'Aktifkan'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}