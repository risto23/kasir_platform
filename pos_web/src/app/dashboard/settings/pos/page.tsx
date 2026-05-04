'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { getPosChargeSettings, getPosOutlets } from '@/lib/pos';
import type { PosChargeType, PosRoundingSetting } from '@/types/pos';

type PosChargeRuleKey = 'TAX' | 'SERVICE';

export default function PosSettingsPage() {
  const [outletId, setOutletId] = useState('');
  const [outlets, setOutlets] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const [taxEnabled, setTaxEnabled] = useState(true);
  const [taxValue, setTaxValue] = useState(10);

  const [svcEnabled, setSvcEnabled] = useState(false);
  const [svcType, setSvcType] = useState<PosChargeType>('FIXED_AMOUNT');
  const [svcValue, setSvcValue] = useState(0);

  const [roundEnabled, setRoundEnabled] = useState(true);
  const [roundMethod, setRoundMethod] =
    useState<PosRoundingSetting['method']>('CEIL');
  const [roundUnit, setRoundUnit] = useState(100);

  useEffect(() => {
    (async () => {
      try {
        const response = await getPosOutlets();
        setOutlets(response.items.map((outlet) => ({ id: outlet.id, name: outlet.name })));

        if (response.items.length > 0) {
          setOutletId(response.items[0].id);
        }
      } catch {
        setOutlets([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!outletId) {
        return;
      }

      try {
        setMessage('');

        const data = await getPosChargeSettings(outletId);
        const taxRule = data.charges.find(
          (rule) => normalizeRuleKey(rule.key) === 'TAX',
        );
        const serviceRule = data.charges.find(
          (rule) => normalizeRuleKey(rule.key) === 'SERVICE',
        );
        const rounding = data.rounding ?? {
          enabled: true,
          method: 'CEIL',
          unit: 100,
        };

        setTaxEnabled(Boolean(taxRule?.enabled ?? true));
        setTaxValue(Number(taxRule?.value ?? 10));
        setSvcEnabled(Boolean(serviceRule?.enabled ?? false));
        setSvcType(serviceRule?.type ?? 'FIXED_AMOUNT');
        setSvcValue(Number(serviceRule?.value ?? 0));
        setRoundEnabled(Boolean(rounding.enabled));
        setRoundMethod(rounding.method);
        setRoundUnit(Number(rounding.unit ?? 100));
      } catch (error: unknown) {
        setMessage(
          error instanceof Error ? error.message : 'Gagal memuat pengaturan',
        );
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
          {
            key: 'TAX',
            label: 'Tax',
            type: 'PERCENTAGE',
            value: Number(taxValue) || 0,
            enabled: taxEnabled,
            sortOrder: 1,
          },
          {
            key: 'SERVICE',
            label: 'Service',
            type: svcType,
            value: Number(svcValue) || 0,
            enabled: svcEnabled,
            sortOrder: 2,
          },
        ],
        rounding: {
          enabled: roundEnabled,
          method: roundMethod,
          unit: Number(roundUnit) || 100,
        },
      });

      setMessage('Tersimpan');
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        Memuat...
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">
          POS Settings (per Outlet)
        </h1>
        <p className="text-sm text-slate-500">
          Atur pajak, biaya layanan, dan pembulatan total.
        </p>

        <div className="mt-4 grid max-w-4xl gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">
              Outlet
            </label>
            <select
              value={outletId}
              onChange={(event) => setOutletId(event.target.value)}
              className="h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm"
            >
              {outlets.map((outlet) => (
                <option key={outlet.id} value={outlet.id}>
                  {outlet.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Charges</h2>

        <div className="mt-4 grid max-w-4xl gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-slate-50 p-4">
            <label className="text-sm font-medium text-slate-700">Pajak</label>
            <div className="mt-3 flex items-center gap-3">
              <input
                type="checkbox"
                checked={taxEnabled}
                onChange={(event) => setTaxEnabled(event.target.checked)}
              />
              <input
                type="number"
                value={taxValue}
                onChange={(event) => setTaxValue(Number(event.target.value) || 0)}
                className="h-11 w-32 rounded-2xl border border-slate-200 px-3 text-sm"
              />
              <span className="text-sm">%</span>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <label className="text-sm font-medium text-slate-700">
              Biaya Layanan
            </label>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <input
                type="checkbox"
                checked={svcEnabled}
                onChange={(event) => setSvcEnabled(event.target.checked)}
              />
              <select
                value={svcType}
                onChange={(event) =>
                  setSvcType(event.target.value as PosChargeType)
                }
                className="h-11 w-44 rounded-2xl border border-slate-200 px-3 text-sm"
              >
                <option value="PERCENTAGE">Percentage</option>
                <option value="FIXED_AMOUNT">Fixed Amount</option>
              </select>
              <input
                type="number"
                value={svcValue}
                onChange={(event) => setSvcValue(Number(event.target.value) || 0)}
                className="h-11 w-44 rounded-2xl border border-slate-200 px-3 text-sm"
              />
              <span className="text-sm">{svcType === 'PERCENTAGE' ? '%' : 'Rp'}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Pembulatan</h2>

        <div className="mt-4 grid max-w-4xl gap-4 sm:grid-cols-3">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={roundEnabled}
              onChange={(event) => setRoundEnabled(event.target.checked)}
            />
            <span className="text-sm">Enable</span>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">
              Method
            </label>
            <select
              value={roundMethod}
              onChange={(event) =>
                setRoundMethod(event.target.value as PosRoundingSetting['method'])
              }
              className="h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm"
            >
              <option value="CEIL">Ceil (naik)</option>
              <option value="NEAREST">Nearest (terdekat)</option>
              <option value="FLOOR">Floor (turun)</option>
              <option value="NONE">None</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">
              Unit
            </label>
            <input
              type="number"
              value={roundUnit}
              onChange={(event) => setRoundUnit(Number(event.target.value) || 100)}
              className="h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm"
            />
            <p className="mt-1 text-xs text-slate-500">
              Contoh 100 ? 9.669 dibulatkan ke 9.700 (CEIL)
            </p>
          </div>
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button
          onClick={() => void handleSave()}
          disabled={saving || !outletId}
          className="h-11 rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? 'Menyimpan...' : 'Simpan'}
        </button>
        {message ? <span className="text-sm text-slate-600">{message}</span> : null}
      </div>
    </div>
  );
}

function normalizeRuleKey(value: string): PosChargeRuleKey | '' {
  const key = value.trim().toUpperCase();

  if (key === 'TAX' || key === 'SERVICE') {
    return key;
  }

  return '';
}
