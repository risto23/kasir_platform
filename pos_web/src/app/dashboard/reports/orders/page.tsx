'use client';

import { useEffect, useState } from 'react';
import type { OrdersReportResponse } from '@/lib/reports';
import { fetchOrdersReport } from '@/lib/reports';
import { api } from '@/lib/api';

type ReportScope = 'business' | 'outlet';

const ORDER_STATUS_OPTIONS = [
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'IN_PROGRESS', label: 'Sedang Proses' },
  { value: 'READY', label: 'Siap' },
  { value: 'COMPLETED', label: 'Selesai' },
  { value: 'CANCELLED', label: 'Dibatalkan' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ALL', label: 'Semua Status' },
];

function todayYmd() {
  return new Date().toISOString().slice(0, 10);
}

export default function OrdersReportPage() {
  const today = todayYmd();
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(today);
  const [scope, setScope] = useState<ReportScope>('outlet');
  const [orderStatus, setOrderStatus] = useState('SUBMITTED');
  const [outlets, setOutlets] = useState<Array<{ id: string; name: string }>>([]);
  const [outletId, setOutletId] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<OrdersReportResponse | null>(null);
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

      const payload = await fetchOrdersReport({
        scope,
        start,
        end,
        outletId: scope === 'outlet' ? outletId : undefined,
        orderStatus,
        page: 1,
        perPage: 50,
      });

      setData(payload);
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : 'Gagal memuat');
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Orders Report</h1>

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
            <label className="mb-1 block text-xs font-semibold text-slate-500">Scope</label>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as ReportScope)}
              className="h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm"
            >
              <option value="outlet">Per Outlet</option>
              <option value="business">Gabungan</option>
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
            className="h-11 rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white"
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
          <div className="overflow-x-auto">
            <table className="min-w-[800px] w-full text-sm">
              <thead>
                <tr>
                  <th className="p-2 text-left">Order</th>
                  <th className="p-2 text-left">Outlet</th>
                  <th className="p-2 text-right">Total</th>
                  <th className="p-2 text-left">Payment</th>
                  <th className="p-2 text-left">Status</th>
                  <th className="p-2 text-left">Tanggal</th>
                </tr>
              </thead>
              <tbody>
                {data.items?.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="p-2">{row.orderNumber}</td>
                    <td className="p-2">{row.outletName || row.outletId}</td>
                    <td className="p-2 text-right">
                      Rp {Number(row.totalAmount).toLocaleString('id-ID')}
                    </td>
                    <td className="p-2">{row.paymentStatus}</td>
                    <td className="p-2">{row.status}</td>
                    <td className="p-2">
                      {new Date(row.createdAt).toLocaleString('id-ID')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
