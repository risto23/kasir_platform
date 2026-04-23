'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { PromoStatusBadge } from '@/components/promo/promo-status-badge';
import {
  formatPromoPeriod,
  formatPromoTargetValue,
  getPromoById,
  getPromoOutletScopeLabel,
  getPromoTargetTypeLabel,
} from '@/lib/promo';
import type { PromoItem } from '@/types/promo';

export default function PromoDetailPage() {
  const params = useParams<{ id: string }>();

  const [promo, setPromo] = useState<PromoItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadPromo() {
      try {
        setLoading(true);
        setError('');

        const response = await getPromoById(params.id);

        if (!cancelled) {
          setPromo(response);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Gagal memuat detail promo');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    if (params.id) {
      void loadPromo();
    }

    return () => {
      cancelled = true;
    };
  }, [params.id]);

  const targetValueLabel = useMemo(() => {
    if (!promo) {
      return '-';
    }

    return formatPromoTargetValue(promo.targetType, promo.targetLabel);
  }, [promo]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Memuat detail promo...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>

        <div>
          <Link
            href="/dashboard/promos"
            className="inline-flex rounded-xl border border-slate-300 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
          >
            Kembali ke List Promo
          </Link>
        </div>
      </div>
    );
  }

  if (!promo) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Promo tidak ditemukan.</p>
        </div>

        <div>
          <Link
            href="/dashboard/promos"
            className="inline-flex rounded-xl border border-slate-300 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
          >
            Kembali ke List Promo
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Detail Promo</h1>
            <p className="mt-1 text-sm text-slate-500">
              Lihat detail lengkap promo dan outlet yang terkena promo.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/promos"
              className="inline-flex rounded-xl border border-slate-300 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
            >
              Kembali ke List
            </Link>

            <Link
              href={`/dashboard/promos/${promo.id}/edit`}
              className="inline-flex rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Edit Promo
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Informasi Utama</h2>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Nama Promo
                </p>
                <p className="mt-2 text-base font-semibold text-slate-900">
                  {promo.name}
                </p>
              </div>

              <div className="md:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Deskripsi
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  {promo.description || '-'}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Tipe Target
                </p>
                <p className="mt-2 text-sm font-medium text-slate-800">
                  {getPromoTargetTypeLabel(promo.targetType)}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Target Value
                </p>
                <p className="mt-2 text-sm font-medium text-slate-800">
                  {targetValueLabel}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Tipe Diskon
                </p>
                <p className="mt-2 text-sm font-medium text-slate-800">
                  {promo.discountType}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Nilai Diskon
                </p>
                <p className="mt-2 text-sm font-medium text-slate-800">
                  {promo.discountPreview}
                </p>
              </div>

              <div className="md:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Periode Aktif
                </p>
                <p className="mt-2 text-sm font-medium text-slate-800">
                  {formatPromoPeriod(promo)}
                </p>
              </div>

              <div className="md:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Scope Outlet
                </p>
                <p className="mt-2 text-sm font-medium text-slate-800">
                  {getPromoOutletScopeLabel(promo.outletScope)}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Outlet Berlaku</h2>

            {promo.outletScope === 'ALL_OUTLETS' ? (
              <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Promo ini berlaku untuk semua outlet aktif dalam business.
              </div>
            ) : promo.selectedOutlets.length === 0 ? (
              <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Belum ada outlet terpilih.
              </div>
            ) : (
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {promo.selectedOutlets.map((outlet) => (
                  <div
                    key={outlet.id}
                    className="rounded-xl border border-slate-200 px-4 py-3"
                  >
                    <div className="text-sm font-semibold text-slate-900">
                      {outlet.outletName}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {outlet.outletCode}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Waktu & Audit</h2>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Tanggal Mulai
                </p>
                <p className="mt-2 text-sm text-slate-800">{promo.startDate}</p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Tanggal Akhir
                </p>
                <p className="mt-2 text-sm text-slate-800">{promo.endDate}</p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Jam Mulai
                </p>
                <p className="mt-2 text-sm text-slate-800">{promo.startTime}</p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Jam Akhir
                </p>
                <p className="mt-2 text-sm text-slate-800">{promo.endTime}</p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Dibuat
                </p>
                <p className="mt-2 text-sm text-slate-800">
                  {new Date(promo.createdAt).toLocaleString('id-ID')}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Diupdate
                </p>
                <p className="mt-2 text-sm text-slate-800">
                  {new Date(promo.updatedAt).toLocaleString('id-ID')}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Status Promo</h2>

            <div className="mt-5 space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Status Dasar
                </p>
                <div className="mt-2">
                  <PromoStatusBadge value={promo.status} variant="base" />
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Status Efektif
                </p>
                <div className="mt-2">
                  <PromoStatusBadge
                    value={promo.effectiveStatus}
                    variant="effective"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Data Teknis</h2>

            <div className="mt-5 space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Promo ID
                </p>
                <p className="mt-2 break-all text-sm text-slate-800">{promo.id}</p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Business ID
                </p>
                <p className="mt-2 break-all text-sm text-slate-800">
                  {promo.businessId}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Category ID
                </p>
                <p className="mt-2 break-all text-sm text-slate-800">
                  {promo.categoryId || '-'}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Product ID
                </p>
                <p className="mt-2 break-all text-sm text-slate-800">
                  {promo.productId || '-'}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Target Text Value
                </p>
                <p className="mt-2 text-sm text-slate-800">
                  {promo.targetTextValue || '-'}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Target Label
                </p>
                <p className="mt-2 text-sm text-slate-800">
                  {promo.targetLabel || '-'}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Target Value Raw
                </p>
                <p className="mt-2 text-sm text-slate-800">
                  {promo.targetValue || '-'}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Discount Value Raw
                </p>
                <p className="mt-2 text-sm text-slate-800">
                  {promo.discountValue}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
