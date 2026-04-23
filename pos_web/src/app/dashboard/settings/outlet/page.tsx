'use client';

import { useEffect, useState } from 'react';
import { updateCachedOutletName } from '@/lib/auth';
import { getPosOutlets } from '@/lib/pos';
import {
  getOutletSettings,
  updateOutletSettings,
  type OutletSettingsResponse,
} from '@/lib/outlet-settings';

type OutletSettingsForm = Omit<OutletSettingsResponse, 'defaults'>;

const DEFAULT_FORM: OutletSettingsForm = {
  outletName: '',
  guestQrEnabled: true,
  contactEmail: null,
  whatsappNumber: null,
  mapsUrl: null,
  notes: null,
};

export default function OutletSettingsPage() {
  const [outletId, setOutletId] = useState('');
  const [outlets, setOutlets] = useState<Array<{ id: string; name: string }>>([]);
  const [form, setForm] = useState<OutletSettingsForm>(DEFAULT_FORM);
  const [defaults, setDefaults] = useState<OutletSettingsResponse['defaults'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const result = await getPosOutlets();
        const nextOutlets = result.items.map((item) => ({ id: item.id, name: item.name }));
        setOutlets(nextOutlets);
        if (nextOutlets[0]) {
          setOutletId(nextOutlets[0].id);
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
        const result = await getOutletSettings(outletId);
        setForm({
          outletName: result.outletName,
          guestQrEnabled: result.guestQrEnabled,
          contactEmail: result.contactEmail,
          whatsappNumber: result.whatsappNumber,
          mapsUrl: result.mapsUrl,
          notes: result.notes,
        });
        setDefaults(result.defaults);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Gagal memuat pengaturan outlet');
      }
    })();
  }, [outletId]);

  async function handleSave() {
    if (!outletId) {
      return;
    }

    try {
      setSaving(true);
      setMessage('');
      const result = await updateOutletSettings(outletId, form);
      setForm({
        outletName: result.outletName,
        guestQrEnabled: result.guestQrEnabled,
        contactEmail: result.contactEmail,
        whatsappNumber: result.whatsappNumber,
        mapsUrl: result.mapsUrl,
        notes: result.notes,
      });
      setDefaults(result.defaults);
      setOutlets((prev) =>
        prev.map((outlet) =>
          outlet.id === outletId
            ? {
                ...outlet,
                name: result.defaults.outletName,
              }
            : outlet,
        ),
      );
      updateCachedOutletName(outletId, result.defaults.outletName);
      setMessage('Pengaturan outlet tersimpan');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Gagal menyimpan pengaturan outlet');
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
        <h1 className="text-2xl font-semibold text-slate-900">Outlet Settings</h1>
        <p className="text-sm text-slate-500">
          Atur nama outlet, kontak yang bisa dihubungi, link maps, dan catatan operasional ringan.
        </p>

        <div className="mt-4 max-w-xl">
          <label className="mb-1 block text-xs font-semibold text-slate-500">Outlet</label>
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
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Outlet Name</label>
              <input
                value={form.outletName}
                onChange={(event) => setForm((prev) => ({ ...prev, outletName: event.target.value }))}
                className="h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm"
                placeholder={defaults?.outletName ?? 'Nama outlet'}
              />
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Guest QR
                  </label>
                  <p className="mt-2 text-sm font-medium text-slate-900">
                    Aktifkan QR meja untuk outlet ini
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Saklar ini bekerja setelah feature flag <span className="font-semibold">GUEST_QR</span> aktif di level business.
                  </p>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={form.guestQrEnabled}
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      guestQrEnabled: !prev.guestQrEnabled,
                    }))
                  }
                  className={`relative inline-flex h-8 w-14 items-center rounded-full transition ${
                    form.guestQrEnabled ? 'bg-emerald-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition ${
                      form.guestQrEnabled ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div
                className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
                  form.guestQrEnabled
                    ? 'bg-emerald-100 text-emerald-700 ring-emerald-200'
                    : 'bg-slate-100 text-slate-600 ring-slate-200'
                }`}
              >
                {form.guestQrEnabled ? 'QR outlet aktif' : 'QR outlet nonaktif'}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Contact Email</label>
              <input
                value={form.contactEmail ?? ''}
                onChange={(event) => setForm((prev) => ({ ...prev, contactEmail: event.target.value || null }))}
                className="h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm"
                placeholder="outlet@business.com"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">WhatsApp Number</label>
              <input
                value={form.whatsappNumber ?? ''}
                onChange={(event) => setForm((prev) => ({ ...prev, whatsappNumber: event.target.value || null }))}
                className="h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm"
                placeholder="+62..."
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Maps URL</label>
              <input
                value={form.mapsUrl ?? ''}
                onChange={(event) => setForm((prev) => ({ ...prev, mapsUrl: event.target.value || null }))}
                className="h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm"
                placeholder="https://maps..."
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Notes</label>
              <textarea
                value={form.notes ?? ''}
                onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value || null }))}
                className="min-h-24 w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm"
                placeholder="Catatan operasional outlet"
              />
            </div>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving || !outletId}
              className="h-11 rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
            {message ? <span className="text-sm text-slate-600">{message}</span> : null}
          </div>
        </div>

        <aside className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Outlet Context</h2>
          <div className="mt-4 space-y-3 text-sm">
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Outlet</p>
              <p className="mt-2 font-medium text-slate-900">{defaults?.outletName ?? '-'}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Code</p>
              <p className="mt-2 font-medium text-slate-900">{defaults?.outletCode ?? '-'}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Guest QR</p>
              <p className="mt-2 font-medium text-slate-900">
                {form.guestQrEnabled ? 'Aktif di outlet ini' : 'Belum aktif di outlet ini'}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Phone</p>
              <p className="mt-2 font-medium text-slate-900">{defaults?.phone ?? '-'}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Address</p>
              <p className="mt-2 font-medium text-slate-900">{defaults?.address ?? '-'}</p>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
