'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../../../../lib/api';
import { postCreateOpname } from '../../../../../lib/stock-opname';
import type { Outlet } from '../../../../../types/outlet';
import { Button } from '../../../../../components/ui/button';
import { Input } from '../../../../../components/ui/input';

function getErrorMessage(err: unknown): string {
  if (typeof err === 'object' && err !== null) {
    const e = err as { response?: { data?: { message?: string } }; message?: string };
    return e.response?.data?.message ?? e.message ?? 'Gagal';
  }
  return 'Gagal';
}

export default function CreateStockOpnamePage() {
  const router = useRouter();
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [outletId, setOutletId] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOutlets() {
      try {
        const resp = await api.get('/business/outlets', { params: { status: 'ACTIVE', perPage: 100 } });
        const data = resp.data?.data;
        setOutlets(Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []);
      } catch {
        setOutlets([]);
      }
    }
    void fetchOutlets();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!outletId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await postCreateOpname({ outletId, note: note.trim() || undefined });
      router.push(`/dashboard/inventory/stock-opname/${res.data.id}`);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl p-4 lg:p-6">
      <div className="mb-4">
        <button
          onClick={() => router.push('/dashboard/inventory/stock-opname')}
          className="mb-2 text-xs text-blue-600 hover:underline"
        >
          ← Kembali ke daftar
        </button>
        <h1 className="text-xl font-semibold text-slate-900">Buat Sesi Stock Opname</h1>
        <p className="mt-1 text-sm text-slate-500">
          Sistem akan memuat semua produk aktif beserta stok sistem saat ini.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Outlet *</label>
            <select
              value={outletId}
              onChange={(e) => setOutletId(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500"
            >
              <option value="">Pilih outlet…</option>
              {outlets.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Catatan (opsional)</label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="mis: Opname bulanan Mei 2026" />
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/dashboard/inventory/stock-opname')}
            >
              Batal
            </Button>
            <Button type="submit" disabled={loading || !outletId}>
              {loading ? 'Membuat…' : 'Buat Sesi'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
