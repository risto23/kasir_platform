'use client';

import { useRouter } from 'next/navigation';

import { PromoForm } from '@/components/promo/promo-form';
import type { PromoItem } from '@/types/promo';

export default function CreatePromoPage() {
  const router = useRouter();

  function handleSuccess() {
    router.push('/dashboard/promos');
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Tambah Promo</h1>
        <p className="mt-1 text-sm text-slate-500">
          Buat promo baru berdasarkan kategori, produk/menu, nama, brand, atau
          satuan.
        </p>
      </div>

      <PromoForm
        mode="create"
        onSuccess={(_promo: PromoItem) => {
          handleSuccess();
        }}
      />
    </div>
  );
}