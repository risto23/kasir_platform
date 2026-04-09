'use client';

import { useEffect, useMemo, useState } from 'react';
import { getPosOutlets } from '@/lib/pos';
import { api } from '@/lib/api';

export default function PosSettingsPage() {
  const [outletId, setOutletId] = useState('');
  const [outlets, setOutlets] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const [taxEnabled, setTaxEnabled] = useState(true);
  const [taxValue, setTaxValue] = useState(10);

  const [svcEnabled, setSvcEnabled] = useState(false);
  const [svcType, setSvcType] = useState<'PERCENTAGE'|'FIXED_AMOUNT'>('FIXED_AMOUNT');
  const [svcValue, setSvcValue] = useState(0);

  const [roundEnabled, setRoundEnabled] = useState(true);
  const [roundMethod, setRoundMethod] = useState<'NEAREST'|'CEIL'|'FLOOR'|'NONE'>('CEIL');
  const [roundUnit, setRoundUnit] = useState(100);

  useEffect(() => {
    (async () => {
      try {
        const resp = await getPosOutlets();
        setOutlets(resp.items.map(o => ({ id: o.id, name: o.name })));
        if (resp.items.length > 0) {
          setOutletId(resp.items[0].id);
        }
      } catch {
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!outletId) return;
      try {
        setMessage('');
        const res = await api.get('/settings/pos-charges', { params: { outletId } });
        const data = res.data?.data as any;
        const rules = Array.isArray(data?.charges) ? data.charges : [];
        const tax = rules.find((r: any) => r.key?.toUpperCase() === 'TAX');
        const svc = rules.find((r: any) => r.key?.toUpperCase() === 'SERVICE');
        setTaxEnabled(Boolean(tax?.enabled ?? true));
        setTaxValue(Number(tax?.value ?? 10));
        setSvcEnabled(Boolean(svc?.enabled ?? false));
        setSvcType((svc?.type ?? 'FIXED_AMOUNT') as any);
        setSvcValue(Number(svc?.value ?? 0));
        const r = data?.rounding || { enabled: true, method: 'CEIL', unit: 100 };
        setRoundEnabled(Boolean(r.enabled));
        setRoundMethod(r.method);
        setRoundUnit(Number(r.unit ?? 100));
      } catch (e: any) {
        setMessage(e?.message || 'Gagal memuat pengaturan');
      }
    })();
  }, [outletId]);

  async function handleSave() {
    try {
      setSaving(true);
      setMessage('');
      await api.put('/settings/pos-charges', {
        outletId,
        charges: [
          { key: 'TAX', label: 'Tax', type: 'PERCENTAGE', value: Number(taxValue)||0, enabled: taxEnabled, sortOrder: 1 },
          { key: 'SERVICE', label: 'Service', type: svcType, value: Number(svcValue)||0, enabled: svcEnabled, sortOrder: 2 },
        ],
        rounding: { enabled: roundEnabled, method: roundMethod, unit: Number(roundUnit)||100 },
      });
      setMessage('Tersimpan');
    } catch (e: any) {
      setMessage(e?.message || 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className='rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm'>Memuat...</div>;
  }

  return (
    <div className='space-y-5'>
      <section className='rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm'>
        <h1 className='text-2xl font-semibold text-slate-900'>POS Settings (per Outlet)</h1>
        <p className='text-sm text-slate-500'>Atur pajak, biaya layanan, dan pembulatan total.</p>
        <div className='mt-4 grid max-w-4xl gap-4 sm:grid-cols-2'>
          <div>
            <label className='mb-1 block text-xs font-semibold text-slate-500'>Outlet</label>
            <select value={outletId} onChange={(e)=>setOutletId(e.target.value)} className='h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm'>
              {outlets.map(o => (<option key={o.id} value={o.id}>{o.name}</option>))}
            </select>
          </div>
        </div>
      </section>

      <section className='rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm'>
        <h2 className='text-lg font-semibold text-slate-900'>Charges</h2>
        <div className='mt-4 grid max-w-4xl gap-4 sm:grid-cols-2'>
          <div className='rounded-2xl bg-slate-50 p-4'>
            <label className='text-sm font-medium text-slate-700'>Pajak</label>
            <div className='mt-3 flex items-center gap-3'>
              <input type='checkbox' checked={taxEnabled} onChange={(e)=>setTaxEnabled(e.target.checked)} />
              <input type='number' value={taxValue} onChange={(e)=>setTaxValue(Number(e.target.value)||0)} className='h-11 w-32 rounded-2xl border border-slate-200 px-3 text-sm' />
              <span className='text-sm'>%</span>
            </div>
          </div>

          <div className='rounded-2xl bg-slate-50 p-4'>
            <label className='text-sm font-medium text-slate-700'>Biaya Layanan</label>
            <div className='mt-3 flex flex-wrap items-center gap-3'>
              <input type='checkbox' checked={svcEnabled} onChange={(e)=>setSvcEnabled(e.target.checked)} />
              <select value={svcType} onChange={(e)=>setSvcType(e.target.value as any)} className='h-11 w-44 rounded-2xl border border-slate-200 px-3 text-sm'>
                <option value='PERCENTAGE'>Percentage</option>
                <option value='FIXED_AMOUNT'>Fixed Amount</option>
              </select>
              <input type='number' value={svcValue} onChange={(e)=>setSvcValue(Number(e.target.value)||0)} className='h-11 w-44 rounded-2xl border border-slate-200 px-3 text-sm' />
              <span className='text-sm'>{svcType==='PERCENTAGE'?'%':'Rp'}</span>
            </div>
          </div>
        </div>
      </section>

      <section className='rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm'>
        <h2 className='text-lg font-semibold text-slate-900'>Pembulatan</h2>
        <div className='mt-4 grid max-w-4xl gap-4 sm:grid-cols-3'>
          <div className='flex items-center gap-3'>
            <input type='checkbox' checked={roundEnabled} onChange={(e)=>setRoundEnabled(e.target.checked)} />
            <span className='text-sm'>Enable</span>
          </div>
          <div>
            <label className='mb-1 block text-xs font-semibold text-slate-500'>Method</label>
            <select value={roundMethod} onChange={(e)=>setRoundMethod(e.target.value as any)} className='h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm'>
              <option value='CEIL'>Ceil (naik)</option>
              <option value='NEAREST'>Nearest (terdekat)</option>
              <option value='FLOOR'>Floor (turun)</option>
              <option value='NONE'>None</option>
            </select>
          </div>
          <div>
            <label className='mb-1 block text-xs font-semibold text-slate-500'>Unit</label>
            <input type='number' value={roundUnit} onChange={(e)=>setRoundUnit(Number(e.target.value)||100)} className='h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm' />
            <p className='mt-1 text-xs text-slate-500'>Contoh 100 ? 9.669 dibulatkan ke 9.700 (CEIL)</p>
          </div>
        </div>
      </section>

      <div className='flex items-center gap-3'>
        <button onClick={()=>void handleSave()} disabled={saving || !outletId} className='h-11 rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white disabled:opacity-60'>
          {saving?'Menyimpan...':'Simpan'}
        </button>
        {message? <span className='text-sm text-slate-600'>{message}</span> : null}
      </div>
    </div>
  );
}
