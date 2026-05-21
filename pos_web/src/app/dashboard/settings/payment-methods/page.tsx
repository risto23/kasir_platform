'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { getActiveBusinessId } from '@/lib/auth';
import { getOutletPaymentMethods } from '@/lib/pos';
import type { PosOutletPaymentMethod, PosSurchargeRule } from '@/types/pos';

type Outlet = { id: string; name: string };

const DEFAULT_METHODS = [
  { name: 'Cash', code: 'CASH' },
  { name: 'QRIS', code: 'QRIS' },
  { name: 'Transfer', code: 'TRANSFER' },
  { name: 'Card', code: 'CARD' },
];

function buildScopedHeaders(outletId: string): Record<string, string> {
  const businessId = getActiveBusinessId() ?? '';
  return { 'x-business-id': businessId, 'x-outlet-id': outletId };
}

export default function PaymentMethodsSettingsPage() {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [outletId, setOutletId] = useState('');
  const [methods, setMethods] = useState<PosOutletPaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formActive, setFormActive] = useState(true);
  const [formSortOrder, setFormSortOrder] = useState(0);
  const [formRules, setFormRules] = useState<PosSurchargeRule[]>([]);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const businessId = getActiveBusinessId();
        const resp = await api.get<{ success: boolean; data: { items: Outlet[] } }>(
          '/business/outlets',
          { params: { businessId, status: 'ACTIVE', page: 1, perPage: 100 }, headers: { 'x-business-id': businessId ?? '' } },
        );
        const items = resp.data.data?.items ?? [];
        setOutlets(items);
        if (items.length > 0) setOutletId(items[0].id);
      } catch {
        setOutlets([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!outletId) return;
    void loadMethods();
  }, [outletId]);

  async function loadMethods() {
    if (!outletId) return;
    try {
      const items = await getOutletPaymentMethods(outletId);
      setMethods(items.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)));
    } catch {
      setMethods([]);
    }
  }

  function showMsg(msg: string, type: 'success' | 'error' = 'success') {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 4000);
  }

  function resetForm() {
    setEditingId(null);
    setFormName('');
    setFormCode('');
    setFormActive(true);
    setFormSortOrder(methods.length);
    setFormRules([]);
    setShowForm(false);
  }

  function openCreate() {
    resetForm();
    setFormSortOrder(methods.length);
    setShowForm(true);
  }

  function openEdit(m: PosOutletPaymentMethod) {
    setEditingId(m.id);
    setFormName(m.name);
    setFormCode(m.code);
    setFormActive(m.isActive);
    setFormSortOrder(m.sortOrder);
    setFormRules(m.surchargeRules ?? []);
    setShowForm(true);
  }

  async function handleSeed() {
    if (!outletId) return;
    setSaving(true);
    try {
      for (const d of DEFAULT_METHODS) {
        const exists = methods.some((m) => m.code === d.code);
        if (!exists) {
          await api.post(
            `/outlets/${outletId}/payment-methods`,
            { name: d.name, code: d.code, isActive: true, surchargeRules: [], sortOrder: methods.length },
            { headers: buildScopedHeaders(outletId) },
          );
        }
      }
      await loadMethods();
      showMsg('Default metode pembayaran berhasil ditambahkan.');
    } catch {
      showMsg('Gagal menambahkan default metode.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleSave() {
    if (!formName.trim() || !formCode.trim()) {
      showMsg('Nama dan kode wajib diisi.', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: formName.trim(),
        code: formCode.trim().toUpperCase(),
        isActive: formActive,
        sortOrder: formSortOrder,
        surchargeRules: formRules,
      };
      if (editingId) {
        await api.put(`/outlets/${outletId}/payment-methods/${editingId}`, payload, { headers: buildScopedHeaders(outletId) });
        showMsg('Metode pembayaran berhasil diupdate.');
      } else {
        await api.post(`/outlets/${outletId}/payment-methods`, payload, { headers: buildScopedHeaders(outletId) });
        showMsg('Metode pembayaran berhasil ditambahkan.');
      }
      resetForm();
      await loadMethods();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan metode pembayaran.';
      showMsg(msg, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus metode pembayaran ini?')) return;
    setSaving(true);
    try {
      await api.delete(`/outlets/${outletId}/payment-methods/${id}`, { headers: buildScopedHeaders(outletId) });
      showMsg('Metode pembayaran dihapus.');
      await loadMethods();
    } catch {
      showMsg('Gagal menghapus metode.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(m: PosOutletPaymentMethod) {
    setSaving(true);
    try {
      await api.put(
        `/outlets/${outletId}/payment-methods/${m.id}`,
        { isActive: !m.isActive },
        { headers: buildScopedHeaders(outletId) },
      );
      await loadMethods();
    } catch {
      showMsg('Gagal mengubah status.', 'error');
    } finally {
      setSaving(false);
    }
  }

  function addRule() {
    setFormRules((prev) => [
      ...prev,
      { minAmount: 0, maxAmount: null, type: 'PERCENTAGE', value: 0 },
    ]);
  }

  function removeRule(index: number) {
    setFormRules((prev) => prev.filter((_, i) => i !== index));
  }

  function updateRule(index: number, patch: Partial<PosSurchargeRule>) {
    setFormRules((prev) =>
      prev.map((r, i) => (i === index ? { ...r, ...patch } : r)),
    );
  }

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-12 animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-64 animate-pulse rounded-[28px] bg-slate-100" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-6">
        <h1 className="text-xl font-semibold text-slate-900">Metode Pembayaran</h1>
        <p className="mt-1 text-sm text-slate-500">
          Kelola metode pembayaran dan konfigurasi biaya surcharge per metode untuk setiap outlet.
        </p>
      </section>

      {message ? (
        <div
          className={`rounded-[28px] border px-5 py-4 text-sm shadow-sm sm:px-6 ${
            messageType === 'error'
              ? 'border-rose-200 bg-rose-50 text-rose-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}
        >
          {message}
        </div>
      ) : null}

      <section className="rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-[200px] max-w-xs">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Outlet
            </label>
            <select
              value={outletId}
              onChange={(e) => { setOutletId(e.target.value); resetForm(); }}
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">Pilih outlet</option>
              {outlets.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3">
            {methods.length === 0 ? (
              <button
                type="button"
                onClick={() => void handleSeed()}
                disabled={!outletId || saving}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Isi Default
              </button>
            ) : null}
            <button
              type="button"
              onClick={openCreate}
              disabled={!outletId}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              + Tambah Metode
            </button>
          </div>
        </div>

        {!outletId ? (
          <div className="mt-5 rounded-[24px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
            Pilih outlet untuk melihat dan mengatur metode pembayaran.
          </div>
        ) : methods.length === 0 ? (
          <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
            Belum ada metode pembayaran. Klik &quot;Isi Default&quot; untuk menambahkan CASH, QRIS, Transfer, Card, atau tambahkan manual.
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {methods.map((m) => (
              <div
                key={m.id}
                className="flex flex-col gap-3 rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-white border border-slate-200 text-xs font-bold text-slate-900">
                    {m.code.slice(0, 3)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{m.name}</p>
                    <p className="text-xs text-slate-500">
                      Code: {m.code} · Sort: {m.sortOrder}
                      {m.surchargeRules?.length > 0
                        ? ` · ${m.surchargeRules.length} tier surcharge`
                        : ' · Tanpa surcharge'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleToggleActive(m)}
                    disabled={saving}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      m.isActive
                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    } disabled:opacity-60`}
                  >
                    {m.isActive ? 'Aktif' : 'Non-aktif'}
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(m)}
                    className="rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(m.id)}
                    disabled={saving}
                    className="rounded-2xl border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {showForm ? (
        <section className="rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-6">
          <h2 className="text-base font-semibold text-slate-900">
            {editingId ? 'Edit Metode Pembayaran' : 'Tambah Metode Pembayaran'}
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Nama Tampilan
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Contoh: QRIS, Cash, GoPay"
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Kode Internal (unik per outlet)
              </label>
              <input
                type="text"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                placeholder="Contoh: QRIS, CASH, GOPAY"
                disabled={!!editingId}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-400"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Urutan Tampil
              </label>
              <input
                type="number"
                value={formSortOrder}
                onChange={(e) => setFormSortOrder(Number(e.target.value))}
                min={0}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-end">
              <label className="flex cursor-pointer items-center gap-3">
                <div
                  onClick={() => setFormActive((prev) => !prev)}
                  className={`relative h-6 w-11 rounded-full transition ${formActive ? 'bg-emerald-500' : 'bg-slate-300'}`}
                >
                  <div
                    className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${formActive ? 'translate-x-6' : 'translate-x-1'}`}
                  />
                </div>
                <span className="text-sm font-medium text-slate-700">
                  {formActive ? 'Aktif' : 'Non-aktif'}
                </span>
              </label>
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                Konfigurasi Surcharge
              </h3>
              <button
                type="button"
                onClick={addRule}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
              >
                + Tambah Tier
              </button>
            </div>

            <p className="mt-1 text-xs text-slate-500">
              Contoh QRIS: min Rp 0 - max Rp 500.000 = 0.7% · min Rp 500.000 - tanpa batas = 1%
            </p>

            {formRules.length === 0 ? (
              <div className="mt-3 rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
                Tidak ada surcharge. Klik &quot;+ Tambah Tier&quot; untuk menambahkan.
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                {formRules.map((rule, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 items-end">
                    <div>
                      <label className="mb-1 block text-xs text-slate-500">Min (Rp)</label>
                      <input
                        type="number"
                        value={rule.minAmount}
                        onChange={(e) => updateRule(idx, { minAmount: Number(e.target.value) })}
                        min={0}
                        className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-500">Max (Rp, kosong = tak terbatas)</label>
                      <input
                        type="number"
                        value={rule.maxAmount ?? ''}
                        onChange={(e) => updateRule(idx, { maxAmount: e.target.value === '' ? null : Number(e.target.value) })}
                        min={0}
                        placeholder="Tak terbatas"
                        className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-500">Tipe</label>
                      <select
                        value={rule.type}
                        onChange={(e) => updateRule(idx, { type: e.target.value as 'PERCENTAGE' | 'FLAT' })}
                        className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500"
                      >
                        <option value="PERCENTAGE">Persen (%)</option>
                        <option value="FLAT">Flat (Rp)</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-500">
                        Nilai ({rule.type === 'PERCENTAGE' ? '%' : 'Rp'})
                      </label>
                      <input
                        type="number"
                        value={rule.value}
                        onChange={(e) => updateRule(idx, { value: Number(e.target.value) })}
                        min={0}
                        step={rule.type === 'PERCENTAGE' ? 0.01 : 1}
                        className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeRule(idx)}
                      className="h-9 px-3 rounded-xl border border-rose-200 text-xs font-semibold text-rose-700 hover:bg-rose-50 transition"
                    >
                      Hapus
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:bg-slate-300"
            >
              {saving ? 'Menyimpan...' : editingId ? 'Update' : 'Simpan'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Batal
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
