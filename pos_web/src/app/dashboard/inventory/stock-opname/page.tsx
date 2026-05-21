'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faClipboardList,
  faPlus,
  faChevronRight,
  faCircleCheck,
  faCircleXmark,
  faPencil,
} from '@fortawesome/free-solid-svg-icons';
import { fetchOpnameList } from '../../../../lib/stock-opname';
import type { StockOpnameListItem, StockOpnameStatus } from '../../../../types/stock-opname';
import { Button } from '../../../../components/ui/button';

function statusBadge(status: StockOpnameStatus) {
  if (status === 'FINALIZED')
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
        <FontAwesomeIcon icon={faCircleCheck} className="h-3 w-3" /> Finalized
      </span>
    );
  if (status === 'CANCELLED')
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 ring-1 ring-red-200">
        <FontAwesomeIcon icon={faCircleXmark} className="h-3 w-3" /> Cancelled
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
      <FontAwesomeIcon icon={faPencil} className="h-3 w-3" /> Draft
    </span>
  );
}

function getErrorMessage(err: unknown): string {
  if (typeof err === 'object' && err !== null) {
    const e = err as { response?: { data?: { message?: string } }; message?: string };
    return e.response?.data?.message ?? e.message ?? 'Gagal memuat';
  }
  return 'Gagal memuat';
}

export default function StockOpnameListPage() {
  const router = useRouter();
  const [items, setItems] = useState<StockOpnameListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchOpnameList({ status: statusFilter || undefined });
      setItems(res.data.items);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [statusFilter]);

  return (
    <div className="mx-auto max-w-5xl p-4 lg:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Stock Opname</h1>
          <p className="mt-1 text-sm text-slate-500">Daftar sesi penghitungan stok fisik.</p>
        </div>
        <Button onClick={() => router.push('/dashboard/inventory/stock-opname/create')}>
          <FontAwesomeIcon icon={faPlus} className="mr-2 h-3.5 w-3.5" />
          Buat Sesi Baru
        </Button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-200 p-4">
          <label className="text-xs font-medium text-slate-600">Filter Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500"
          >
            <option value="">Semua</option>
            <option value="DRAFT">Draft</option>
            <option value="FINALIZED">Finalized</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        {error && (
          <div className="mx-4 mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Memuat…</div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-10 text-center">
            <FontAwesomeIcon icon={faClipboardList} className="mb-3 h-10 w-10 text-slate-300" />
            <p className="text-sm font-medium text-slate-600">Belum ada sesi opname</p>
            <p className="mt-1 text-xs text-slate-400">Buat sesi baru untuk mulai menghitung stok fisik.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => router.push(`/dashboard/inventory/stock-opname/${item.id}`)}
                className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">{item.outletName}</span>
                    {statusBadge(item.status)}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-slate-500">
                    <span>{new Date(item.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    <span>
                      {item.countedCount}/{item.itemCount} produk dihitung
                    </span>
                    {item.createdByName && <span>Dibuat oleh: {item.createdByName}</span>}
                    {item.finalizedByName && <span>Difinalize oleh: {item.finalizedByName}</span>}
                    {item.note && <span>"{item.note}"</span>}
                  </div>
                </div>
                <FontAwesomeIcon icon={faChevronRight} className="h-3.5 w-3.5 text-slate-400" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
