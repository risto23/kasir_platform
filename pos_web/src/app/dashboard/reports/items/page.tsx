'use client';
import { useEffect, useMemo, useState } from 'react';
import { fetchItemsReport } from '@/lib/reports';
import { toBackendDate } from '@/lib/date-format';

export default function ItemsReportPage() {
  const today = useMemo(() => { const d = new Date(); const dd=String(d.getDate()).padStart(2,'0'); const mm=String(d.getMonth()+1).padStart(2,'0'); const yyyy=String(d.getFullYear()); return ${dd}--; }, []);
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(today);
  const [scope, setScope] = useState<'business'|'outlet'>('outlet');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [message, setMessage] = useState('');

  async function load() {
    try { setLoading(true); setMessage('');
      const payload = await fetchItemsReport({ scope, start: toBackendDate(start), end: toBackendDate(end), page: 1, perPage: 100 });
      setData(payload);
    } catch (e: unknown) { setMessage(e instanceof Error ? e.message : 'Gagal memuat'); setData(null); } finally { setLoading(false); }
  }
  useEffect(()=>{ void load(); }, []);

  return (
    <div className='space-y-4'>
      <section className='rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm'>
        <h1 className='text-2xl font-semibold text-slate-900'>Items Report</h1>
        <div className='mt-4 grid gap-3 md:grid-cols-4'>
          <div><label className='mb-1 block text-xs font-semibold text-slate-500'>Start (dd-mm-yyyy)</label><input value={start} onChange={(e)=>setStart(e.target.value)} className='h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm' /></div>
          <div><label className='mb-1 block text-xs font-semibold text-slate-500'>End (dd-mm-yyyy)</label><input value={end} onChange={(e)=>setEnd(e.target.value)} className='h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm' /></div>
          <div><label className='mb-1 block text-xs font-semibold text-slate-500'>Scope</label><select value={scope} onChange={(e)=>setScope(e.target.value as any)} className='h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm'><option value='outlet'>Per Outlet</option><option value='business'>Gabungan</option></select></div>
          <div className='flex items-end'><button onClick={()=>void load()} disabled={loading} className='h-11 rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white'>{loading?'Memuat...':'Terapkan'}</button></div>
        </div>
      </section>
      <section className='rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm'>
        {!data ? <p className='text-sm text-slate-500'>Tidak ada data</p> : (
          <div className='overflow-x-auto'>
            <table className='min-w-[600px] w-full text-sm'>
              <thead><tr><th className='p-2 text-left'>Product</th><th className='p-2 text-right'>Qty</th><th className='p-2 text-right'>Revenue</th></tr></thead>
              <tbody>
                {data.items?.map((r: any)=> (
                  <tr key={r.productId} className='border-t border-slate-100'>
                    <td className='p-2'>{r.productName}</td>
                    <td className='p-2 text-right'>{Number(r.quantity).toLocaleString('id-ID')}</td>
                    <td className='p-2 text-right'>Rp {Number(r.revenue).toLocaleString('id-ID')}</td>
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

