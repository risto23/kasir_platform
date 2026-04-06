'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function getTextParam(value: string | null): string {
  return typeof value === 'string' ? value.trim() : '';
}

export default function DashboardGuestMenuRedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const outletId = getTextParam(searchParams.get('outletId'));
    const tableId = getTextParam(searchParams.get('tableId'));
    const token = getTextParam(searchParams.get('token'));

    const nextParams = new URLSearchParams();

    if (outletId) {
      nextParams.set('outletId', outletId);
    }

    if (tableId) {
      nextParams.set('tableId', tableId);
    }

    if (token) {
      nextParams.set('token', token);
    }

    const targetUrl = `/guest/menu${nextParams.toString() ? `?${nextParams.toString()}` : ''}`;

    router.replace(targetUrl);
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6">
      <div className="mx-auto max-w-3xl rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
        <h1 className="text-xl font-semibold text-slate-900">Mengalihkan guest menu...</h1>
        <p className="mt-2 text-sm text-slate-600">
          Anda sedang diarahkan ke route guest public.
        </p>
      </div>
    </div>
  );
}