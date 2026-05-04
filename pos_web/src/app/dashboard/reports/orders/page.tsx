'use client';

import { useEffect, useMemo, useState } from 'react';
import type { OrdersReportResponse } from '@/lib/reports';
import { fetchOrdersReport } from '@/lib/reports';
import { toBackendDate } from '@/lib/date-format';

type ReportScope = 'business' | 'outlet';

export default function OrdersReportPage() {
  const today = useMemo(() => {
    const currentDate = new Date();
    const day = String(currentDate.getDate()).padStart(2, '0');
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const year = String(currentDate.getFullYear());

    return `${day}-${month}-${year}`;
  }, []);

  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(today);
  const [scope, setScope] = useState<ReportScope>('outlet');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<OrdersReportResponse | null>(null);
  const [message, setMessage] = useState('');

  async function load() {
    try {
      setLoading(true);
      setMessage('');

      const payload = await fetchOrdersReport({
        scope,
        start: toBackendDate(start),
        end: toBackendDate(end),
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

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-4">
      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Orders Report</h1>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">
              Start (dd-mm-yyyy)
            </label>
            <input
              value={start}
              onChange={(event) => setStart(event.target.value)}
              className="h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">
              End (dd-mm-yyyy)
            </label>
            <input
              value={end}
              onChange={(event) => setEnd(event.target.value)}
              className="h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">
              Scope
            </label>
            <select
              value={scope}
              onChange={(event) => setScope(event.target.value as ReportScope)}
              className="h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm"
            >
              <option value="outlet">Per Outlet</option>
              <option value="business">Gabungan</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => void load()}
              disabled={loading}
              className="h-11 rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white"
            >
              {loading ? 'Memuat...' : 'Terapkan'}
            </button>
          </div>
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
