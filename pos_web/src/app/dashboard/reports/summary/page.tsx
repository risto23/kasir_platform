'use client';

import { useEffect, useState } from 'react';
import type { SalesSummaryResponse } from '@/lib/reports';
import { fetchSalesSummary } from '@/lib/reports';
import { api } from '@/lib/api';

type GroupBy = 'day' | 'week' | 'month';
type ReportScope = 'business' | 'outlet';

const ORDER_STATUS_OPTIONS = [
  { value: 'ALL', label: 'Semua Status' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'IN_PROGRESS', label: 'Sedang Proses' },
  { value: 'READY', label: 'Siap' },
  { value: 'COMPLETED', label: 'Selesai' },
  { value: 'CANCELLED', label: 'Dibatalkan' },
  { value: 'DRAFT', label: 'Draft' },
];

function todayYmd() {
  return new Date().toISOString().slice(0, 10);
}

export default function SalesSummaryPage() {
  const today = todayYmd();
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(today);
  const [groupBy, setGroupBy] = useState<GroupBy>('day');
  const [scope, setScope] = useState<ReportScope>('outlet');
  const [orderStatus, setOrderStatus] = useState('ALL');
  const [outlets, setOutlets] = useState<Array<{ id: string; name: string }>>([]);
  const [outletId, setOutletId] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SalesSummaryResponse | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    api
      .get('/business/outlets', { params: { status: 'ACTIVE', limit: 100 } })
      .then((r) => {
        const raw = r.data?.data;
        const items: Array<{ id: string; name: string }> = Array.isArray(raw?.items)
          ? raw.items
          : Array.isArray(raw)
            ? raw
            : [];
        setOutlets(items);
        if (items.length > 0) setOutletId(items[0].id);
      })
      .catch(() => {});
  }, []);

  async function load() {
    try {
      setLoading(true);
      setMessage('');
      const payload = await fetchSalesSummary({
        scope,
        groupBy,
        start,
        end,
        outletId: scope === 'outlet' ? outletId : undefined,
        orderStatus,
      });
      setData(payload);
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : 'Gagal memuat summary');
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Sales Summary</h1>

        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">Dari</label>
            <input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">Sampai</label>
            <input
              type="date"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">Group By</label>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as GroupBy)}
              className="h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm"
            >
              <option value="day">Harian</option>
              <option value="week">Mingguan</option>
              <option value="month">Bulanan</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">Scope</label>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as ReportScope)}
              className="h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm"
            >
              <option value="outlet">Per Outlet</option>
              <option value="business">Gabungan Business</option>
            </select>
          </div>

          {scope === 'outlet' && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Outlet</label>
              <select
                value={outletId}
                onChange={(e) => setOutletId(e.target.value)}
                className="h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm"
              >
                <option value="">Pilih outlet</option>
                {outlets.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">Status Order</label>
            <select
              value={orderStatus}
              onChange={(e) => setOrderStatus(e.target.value)}
              className="h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm"
            >
              {ORDER_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4">
          <button
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800"
          >
            {loading ? 'Memuat...' : 'Terapkan'}
          </button>
        </div>

        {message ? (
          <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {message}
          </div>
        ) : null}
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        {!data ? (
          <p className="text-sm text-slate-500">Tidak ada data</p>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Total Revenue</p>
                <p className="mt-1 text-xl font-semibold">
                  Rp {data.totalRevenue?.toLocaleString('id-ID')}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Total Orders</p>
                <p className="mt-1 text-xl font-semibold">{data.totalOrders}</p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Avg Order</p>
                <p className="mt-1 text-xl font-semibold">
                  Rp {(data.avgOrder || 0).toLocaleString('id-ID')}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-[600px] w-full text-sm">
                <thead>
                  <tr>
                    <th className="p-2 text-left">Bucket</th>
                    <th className="p-2 text-right">Orders</th>
                    <th className="p-2 text-right">Revenue</th>
                    <th className="p-2 text-right">Avg</th>
                  </tr>
                </thead>
                <tbody>
                  {data.buckets?.map((bucket) => (
                    <tr key={bucket.key} className="border-t border-slate-100">
                      <td className="p-2">{bucket.label}</td>
                      <td className="p-2 text-right">{bucket.orders}</td>
                      <td className="p-2 text-right">
                        Rp {bucket.revenue.toLocaleString('id-ID')}
                      </td>
                      <td className="p-2 text-right">
                        Rp {bucket.avgOrder.toLocaleString('id-ID')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
