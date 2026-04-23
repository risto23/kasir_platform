'use client';

import { useEffect, useState } from 'react';
import { getActiveBusinessId, updateCachedBusinessName } from '@/lib/auth';
import {
  getBusinessSettings,
  updateBusinessSettings,
  type BusinessSettingsResponse,
} from '@/lib/business-settings';

type BusinessSettingsForm = Omit<BusinessSettingsResponse, 'defaults'>;

const DEFAULT_FORM: BusinessSettingsForm = {
  businessName: '',
  supportEmail: null,
  supportPhone: null,
  websiteUrl: null,
  address: null,
  tagline: null,
};

export default function BusinessSettingsPage() {
  const [form, setForm] = useState<BusinessSettingsForm>(DEFAULT_FORM);
  const [defaults, setDefaults] = useState<BusinessSettingsResponse['defaults'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const result = await getBusinessSettings();
        setForm({
          businessName: result.businessName,
          supportEmail: result.supportEmail,
          supportPhone: result.supportPhone,
          websiteUrl: result.websiteUrl,
          address: result.address,
          tagline: result.tagline,
        });
        setDefaults(result.defaults);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Gagal memuat pengaturan business');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleSave() {
    try {
      setSaving(true);
      setMessage('');
      const result = await updateBusinessSettings(form);
      setForm({
        businessName: result.businessName,
        supportEmail: result.supportEmail,
        supportPhone: result.supportPhone,
        websiteUrl: result.websiteUrl,
        address: result.address,
        tagline: result.tagline,
      });
      setDefaults(result.defaults);
      const activeBusinessId = getActiveBusinessId();
      if (activeBusinessId) {
        updateCachedBusinessName(activeBusinessId, result.defaults.businessName);
      }
      setMessage('Pengaturan business tersimpan');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Gagal menyimpan pengaturan business');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">Memuat...</div>;
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Business Settings</h1>
        <p className="text-sm text-slate-500">
          Atur nama business, kontak bantuan, dan informasi publik yang dipakai lintas outlet.
        </p>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Business Name</label>
              <input
                value={form.businessName}
                onChange={(event) => setForm((prev) => ({ ...prev, businessName: event.target.value }))}
                className="h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm"
                placeholder={defaults?.businessName ?? 'Nama business'}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Support Email</label>
              <input
                value={form.supportEmail ?? ''}
                onChange={(event) => setForm((prev) => ({ ...prev, supportEmail: event.target.value || null }))}
                className="h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm"
                placeholder="support@business.com"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Support Phone</label>
              <input
                value={form.supportPhone ?? ''}
                onChange={(event) => setForm((prev) => ({ ...prev, supportPhone: event.target.value || null }))}
                className="h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm"
                placeholder="+62..."
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Website URL</label>
              <input
                value={form.websiteUrl ?? ''}
                onChange={(event) => setForm((prev) => ({ ...prev, websiteUrl: event.target.value || null }))}
                className="h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm"
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Address</label>
              <textarea
                value={form.address ?? ''}
                onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value || null }))}
                className="min-h-24 w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Tagline</label>
              <textarea
                value={form.tagline ?? ''}
                onChange={(event) => setForm((prev) => ({ ...prev, tagline: event.target.value || null }))}
                className="min-h-24 w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm"
                placeholder="Kalimat singkat tentang brand/business"
              />
            </div>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="h-11 rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
            {message ? <span className="text-sm text-slate-600">{message}</span> : null}
          </div>
        </div>

        <aside className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Current Context</h2>
          <div className="mt-4 space-y-3 text-sm">
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Business</p>
              <p className="mt-2 font-medium text-slate-900">{defaults?.businessName ?? '-'}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Slug</p>
              <p className="mt-2 font-medium text-slate-900">{defaults?.slug ?? '-'}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Type</p>
              <p className="mt-2 font-medium text-slate-900">{defaults?.businessType ?? '-'}</p>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
