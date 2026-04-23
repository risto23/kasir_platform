'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { PromoForm } from '@/components/promo/promo-form';
import { getPromoById } from '@/lib/promo';
import type { PromoItem } from '@/types/promo';

export default function EditPromoPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [promo, setPromo] = useState<PromoItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadPromo() {
      try {
        setLoading(true);
        setError('');

        const promoId = params.id;

        if (!promoId) {
          throw new Error('ID promo tidak ditemukan');
        }

        const response = await getPromoById(promoId);

        if (!cancelled) {
          setPromo(response);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Gagal memuat data promo');
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

  function handleSuccess(updatedPromo: PromoItem) {
    router.push(`/dashboard/promos/${updatedPromo.id}`);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Memuat data promo...</p>
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

        <div className="flex flex-wrap gap-3">
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

        <div className="flex flex-wrap gap-3">
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
            <h1 className="text-2xl font-semibold text-slate-900">Edit Promo</h1>
            <p className="mt-1 text-sm text-slate-500">
              Ubah data promo termasuk scope outlet tanpa mengubah alur backend.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/dashboard/promos/${promo.id}`}
              className="inline-flex rounded-xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-100"
            >
              Lihat Detail
            </Link>

            <Link
              href="/dashboard/promos"
              className="inline-flex rounded-xl border border-slate-300 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
            >
              Kembali ke List
            </Link>
          </div>
        </div>
      </div>

      <PromoForm
        mode="edit"
        promoId={promo.id}
        initialData={promo}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
