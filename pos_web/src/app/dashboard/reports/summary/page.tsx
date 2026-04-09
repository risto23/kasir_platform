'use client';
import { useEffect, useMemo, useState } from 'react';
import { fetchSalesSummary } from '@/lib/reports';
import { toBackendDate } from '@/lib/date-format';

type GroupBy = 'day'|'week'|'month';

export default function SalesSummaryPage() {
  const today = useMemo(() => { const d = new Date(); const dd=String(d.getDate()).padStart(2,'0'); const mm=String(d.getMonth()+1).padStart(2,'0'); const yyyy=String(d.getFullYear()); return ${dd}--; }, []);
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(today);
  const [groupBy, setGroupBy] = useState<GroupBy>('day');
  const [scope, setScope] = useState<'business'|'outlet'>('outlet');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [message, setMessage] = useState('');

  async function load() {
    try {
      setLoading(true); setMessage('');
      const payload = await fetchSalesSummary({
        scope,
        groupBy,
        start: toBackendDate(start),
        end: toBackendDate(end),
      });
      setData(payload);
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : 'Gagal memuat summary');
      setData(null);
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  return (
    <div className='space-y-4'>
      <section className='rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm'>
        <h1 className='text-2xl font-semibold text-slate-900'>Sales Summary</h1>
        <p className='text-sm text-slate-500'>Tanggal input dd-mm-yyyy (frontend), backend yyyy-mm-dd.</p>
        <div className='mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4'>
          <div>
            <label className='mb-1 block text-xs font-semibold text-slate-500'>Start (dd-mm-yyyy)</label>
            <input value={start} onChange={(e)=>setStart(e.target.value)} className='h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm' placeholder='dd-mm-yyyy' />
          </div>
          <div>
            <label className='mb-1 block text-xs font-semibold text-slate-500'>End (dd-mm-yyyy)</label>
            <input value={end} onChange={(e)=>setEnd(e.target.value)} className='h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm' placeholder='dd-mm-yyyy' />
          </div>
          <div>
            <label className='mb-1 block text-xs font-semibold text-slate-500'>Group By</label>
            <select value={groupBy} onChange={(e)=>setGroupBy(e.target.value as GroupBy)} className='h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm'>
              <option value='day'>Harian</option>
              <option value='week'>Mingguan</option>
              <option value='month'>Bulanan</option>
            </select>
          </div>
          <div>
            <label className='mb-1 block text-xs font-semibold text-slate-500'>Scope</label>
            <select value={scope} onChange={(e)=>setScope(e.target.value as any)} className='h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm'>
              <option value='outlet'>Per Outlet</option>
              <option value='business'>Gabungan Business</option>
            </select>
          </div>
        </div>
        <div className='mt-4'>
          <button onClick={()=>void load()} disabled={loading} className='inline-flex h-11 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800'>
            {loading ? 'Memuat...' : 'Terapkan'}
          </button>
        </div>
        {message ? <div className='mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700'>{message}</div> : null}
      </section>
      <section className='rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm'>
        {!data ? <p className='text-sm text-slate-500'>Tidak ada data</p> : (
          <div className='space-y-4'>
            <div className='grid gap-3 md:grid-cols-3'>
              <div className='rounded-2xl bg-slate-50 p-4'><p className='text-sm text-slate-500'>Total Revenue</p><p className='mt-1 text-xl font-semibold'>Rp {data.totalRevenue?.toLocaleString('id-ID')}</p></div>
              <div className='rounded-2xl bg-slate-50 p-4'><p className='text-sm text-slate-500'>Total Orders</p><p className='mt-1 text-xl font-semibold'>{data.totalOrders}</p></div>
              <div className='rounded-2xl bg-slate-50 p-4'><p className='text-sm text-slate-500'>Avg Order</p><p className='mt-1 text-xl font-semibold'>Rp {(data.avgOrder||0).toLocaleString('id-ID')}</p></div>
            </div>
            <div className='overflow-x-auto'>
              <table className='min-w-[600px] w-full text-sm'>
                <thead><tr><th className='text-left p-2'>Bucket</th><th className='text-right p-2'>Orders</th><th className='text-right p-2'>Revenue</th><th className='text-right p-2'>Avg</th></tr></thead>
                <tbody>
                  {data.buckets?.map((b: any) => (
                    <tr key={b.key} className='border-t border-slate-100'>
                      <td className='p-2'>{b.label}</td>
                      <td className='p-2 text-right'>{b.orders}</td>
                      <td className='p-2 text-right'>Rp {b.revenue.toLocaleString('id-ID')}</td>
                      <td className='p-2 text-right'>Rp {b.avgOrder.toLocaleString('id-ID')}</td>
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

