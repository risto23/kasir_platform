'use client';

import { useEffect, useState } from 'react';
import { getPosOutlets } from '@/lib/pos';
import {
  getReceiptSettings,
  updateReceiptSettings,
  type ReceiptSettingsResponse,
} from '@/lib/receipt-settings';

type ReceiptSettingsForm = Omit<ReceiptSettingsResponse, 'defaults'>;

const DEFAULT_FORM: ReceiptSettingsForm = {
  brandName: null,
  logoUrl: null,
  headerText: null,
  footerText: null,
  showBusinessName: true,
  showOutletName: true,
  showOutletAddress: true,
  showOutletPhone: true,
};

export default function ReceiptSettingsPage() {
  const [outletId, setOutletId] = useState('');
  const [outlets, setOutlets] = useState<Array<{ id: string; name: string }>>([]);
  const [form, setForm] = useState<ReceiptSettingsForm>(DEFAULT_FORM);
  const [defaults, setDefaults] = useState<ReceiptSettingsResponse['defaults'] | null>(null);
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
        const result = await getReceiptSettings(outletId);
        setForm({
          brandName: result.brandName,
          logoUrl: result.logoUrl,
          headerText: result.headerText,
          footerText: result.footerText,
          showBusinessName: result.showBusinessName,
          showOutletName: result.showOutletName,
          showOutletAddress: result.showOutletAddress,
          showOutletPhone: result.showOutletPhone,
        });
        setDefaults(result.defaults);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Gagal memuat pengaturan struk');
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
      const result = await updateReceiptSettings(outletId, form);
      setForm({
        brandName: result.brandName,
        logoUrl: result.logoUrl,
        headerText: result.headerText,
        footerText: result.footerText,
        showBusinessName: result.showBusinessName,
        showOutletName: result.showOutletName,
        showOutletAddress: result.showOutletAddress,
        showOutletPhone: result.showOutletPhone,
      });
      setDefaults(result.defaults);
      setMessage('Pengaturan struk tersimpan');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Gagal menyimpan pengaturan struk');
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
        <h1 className="text-2xl font-semibold text-slate-900">Receipt Settings (per Outlet)</h1>
        <p className="text-sm text-slate-500">
          Atur brand struk, teks header/footer, dan informasi outlet yang tampil saat print.
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
        <div className="space-y-5">
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Branding</h2>
            <div className="mt-4 grid gap-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">Brand Name</label>
                <input
                  value={form.brandName ?? ''}
                  onChange={(event) => setForm((prev) => ({ ...prev, brandName: event.target.value || null }))}
                  className="h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm"
                  placeholder={defaults?.outletName ?? 'Nama brand outlet'}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">Logo URL</label>
                <input
                  value={form.logoUrl ?? ''}
                  onChange={(event) => setForm((prev) => ({ ...prev, logoUrl: event.target.value || null }))}
                  className="h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">Header Text</label>
                <textarea
                  value={form.headerText ?? ''}
                  onChange={(event) => setForm((prev) => ({ ...prev, headerText: event.target.value || null }))}
                  className="min-h-24 w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm"
                  placeholder="Contoh: Open daily 08.00 - 22.00"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">Footer Text</label>
                <textarea
                  value={form.footerText ?? ''}
                  onChange={(event) => setForm((prev) => ({ ...prev, footerText: event.target.value || null }))}
                  className="min-h-24 w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm"
                  placeholder="Contoh: Terima kasih sudah berkunjung"
                />
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Info yang Ditampilkan</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                ['showBusinessName', 'Tampilkan Business Name'],
                ['showOutletName', 'Tampilkan Outlet Name'],
                ['showOutletAddress', 'Tampilkan Outlet Address'],
                ['showOutletPhone', 'Tampilkan Outlet Phone'],
              ].map(([key, label]) => (
                <label
                  key={key}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(form[key as keyof ReceiptSettingsForm])}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        [key]: event.target.checked,
                      }))
                    }
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
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
          <h2 className="text-lg font-semibold text-slate-900">Preview Ringkas</h2>
          <div className="mt-4 rounded-[24px] border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-xs text-slate-600">
            {form.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={form.logoUrl}
                alt="Receipt logo"
                className="mx-auto mb-3 h-14 w-14 rounded-2xl object-cover"
              />
            ) : null}
            <p className="text-base font-bold text-slate-900">
              {form.brandName || defaults?.outletName || 'Brand Outlet'}
            </p>
            {form.showBusinessName ? <p>{defaults?.businessName ?? '-'}</p> : null}
            {form.showOutletName ? <p>{defaults?.outletName ?? '-'}</p> : null}
            {form.showOutletAddress ? <p>{defaults?.outletAddress ?? '-'}</p> : null}
            {form.showOutletPhone ? <p>{defaults?.outletPhone ?? '-'}</p> : null}
            {form.headerText ? <p className="mt-3 whitespace-pre-line">{form.headerText}</p> : null}
            <div className="my-3 border-t border-dashed border-slate-300" />
            <p>Receipt body...</p>
            <div className="my-3 border-t border-dashed border-slate-300" />
            <p className="whitespace-pre-line">
              {form.footerText || 'Terima kasih. Simpan struk ini sebagai bukti transaksi.'}
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
}
