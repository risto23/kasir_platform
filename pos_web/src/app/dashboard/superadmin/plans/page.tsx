'use client';

import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheck,
  faChevronLeft,
  faFloppyDisk,
  faLayerGroup,
  faListCheck,
  faPen,
  faPlus,
  faSliders,
  faSpinner,
  faTableCells,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import Link from 'next/link';
import {
  getPlansFeatureMatrix,
  getPlatformAuditLogs,
  setPlanFeatureFlags,
  type PlatformAuditLogEntry,
  type PlansFeatureMatrix,
} from '@/lib/platform-features';
import {
  getSubscriptionPlansAdmin,
  createSubscriptionPlanAdmin,
  updateSubscriptionPlanAdmin,
  activateSubscriptionPlanAdmin,
  deactivateSubscriptionPlanAdmin,
  type SubscriptionPlanSummary,
  type CreateSubscriptionPlanRequest,
  type UpdateSubscriptionPlanRequest,
} from '@/lib/subscription';

// ─── helpers ──────────────────────────────────────────────────────────────────

function getMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) return error.response?.data?.message || fallback;
  if (error instanceof Error) return error.message;
  return fallback;
}

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso));
}

function formatPrice(price: number, currency = 'IDR') {
  if (price === 0) return 'Custom Pricing';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

function parseNullableNumber(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

// ─── plan form types ───────────────────────────────────────────────────────────

type BusinessTypeOption = 'RESTAURANT' | 'RETAIL' | '';

type PlanFormData = {
  code: string;
  name: string;
  description: string;
  monthlyPrice: string;
  currencyCode: string;
  businessType: BusinessTypeOption;
  isCustomPricing: boolean;
  isActive: boolean;
  maxOutlets: string;
  maxUsers: string;
  maxProducts: string;
  maxMonthlyTransactions: string;
};

function getEmptyForm(): PlanFormData {
  return {
    code: '',
    name: '',
    description: '',
    monthlyPrice: '0',
    currencyCode: 'IDR',
    businessType: '',
    isCustomPricing: false,
    isActive: true,
    maxOutlets: '',
    maxUsers: '',
    maxProducts: '',
    maxMonthlyTransactions: '',
  };
}

function planToForm(plan: SubscriptionPlanSummary): PlanFormData {
  return {
    code: plan.code,
    name: plan.name,
    description: plan.description ?? '',
    monthlyPrice: String(plan.monthlyPrice),
    currencyCode: plan.currencyCode,
    businessType: plan.businessType ?? '',
    isCustomPricing: plan.isCustomPricing,
    isActive: plan.isActive,
    maxOutlets: plan.limits.maxOutlets?.toString() ?? '',
    maxUsers: plan.limits.maxUsers?.toString() ?? '',
    maxProducts: plan.limits.maxProducts?.toString() ?? '',
    maxMonthlyTransactions: plan.limits.maxMonthlyTransactions?.toString() ?? '',
  };
}

// ─── plan drawer ──────────────────────────────────────────────────────────────

type DrawerMode = 'create' | 'edit';

type PlanDrawerProps = {
  mode: DrawerMode;
  initialForm: PlanFormData;
  planId?: string;
  onClose: () => void;
  onSaved: () => void;
};

function PlanDrawer({ mode, initialForm, planId, onClose, onSaved }: PlanDrawerProps) {
  const [form, setForm] = useState<PlanFormData>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [togglingActive, setTogglingActive] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('error');

  const inputClass =
    'w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400 focus:bg-white transition';

  async function handleSubmit() {
    if (!form.name.trim()) {
      setMessage('Nama plan harus diisi.');
      setMessageType('error');
      return;
    }
    if (mode === 'create' && !form.code.trim()) {
      setMessage('Kode plan harus diisi.');
      setMessageType('error');
      return;
    }
    const monthlyPrice = Number(form.monthlyPrice);
    if (Number.isNaN(monthlyPrice) || monthlyPrice < 0) {
      setMessage('Monthly price harus angka yang valid dan tidak negatif.');
      setMessageType('error');
      return;
    }

    try {
      setSubmitting(true);
      setMessage('');

      if (mode === 'create') {
        const payload: CreateSubscriptionPlanRequest = {
          code: form.code.trim().toUpperCase(),
          name: form.name.trim(),
          description: form.description.trim() || null,
          monthlyPrice,
          currencyCode: form.currencyCode.trim().toUpperCase() || 'IDR',
          businessType: form.businessType || null,
          isCustomPricing: form.isCustomPricing,
          isActive: form.isActive,
          maxOutlets: parseNullableNumber(form.maxOutlets),
          maxUsers: parseNullableNumber(form.maxUsers),
          maxProducts: parseNullableNumber(form.maxProducts),
          maxMonthlyTransactions: parseNullableNumber(form.maxMonthlyTransactions),
        };
        await createSubscriptionPlanAdmin(payload);
        setMessage('Paket berhasil dibuat.');
        setMessageType('success');
        setTimeout(() => { onSaved(); }, 800);
      } else if (mode === 'edit' && planId) {
        const payload: UpdateSubscriptionPlanRequest = {
          name: form.name.trim(),
          description: form.description.trim() || null,
          monthlyPrice,
          currencyCode: form.currencyCode.trim().toUpperCase() || 'IDR',
          businessType: form.businessType || null,
          isCustomPricing: form.isCustomPricing,
          isActive: form.isActive,
          maxOutlets: parseNullableNumber(form.maxOutlets),
          maxUsers: parseNullableNumber(form.maxUsers),
          maxProducts: parseNullableNumber(form.maxProducts),
          maxMonthlyTransactions: parseNullableNumber(form.maxMonthlyTransactions),
        };
        await updateSubscriptionPlanAdmin(planId, payload);
        setMessage('Paket berhasil diperbarui.');
        setMessageType('success');
        setTimeout(() => { onSaved(); }, 800);
      }
    } catch (err) {
      setMessage(getMessage(err, 'Gagal menyimpan paket.'));
      setMessageType('error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleActive() {
    if (!planId) return;
    try {
      setTogglingActive(true);
      setMessage('');
      if (form.isActive) {
        await deactivateSubscriptionPlanAdmin(planId);
        setForm((prev) => ({ ...prev, isActive: false }));
        setMessage('Paket dinonaktifkan.');
      } else {
        await activateSubscriptionPlanAdmin(planId);
        setForm((prev) => ({ ...prev, isActive: true }));
        setMessage('Paket diaktifkan.');
      }
      setMessageType('success');
      onSaved();
    } catch (err) {
      setMessage(getMessage(err, 'Gagal mengubah status paket.'));
      setMessageType('error');
    } finally {
      setTogglingActive(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-widest text-violet-700">
              <FontAwesomeIcon icon={faLayerGroup} className="h-3 w-3" />
              {mode === 'create' ? 'Paket Baru' : 'Edit Paket'}
            </div>
            <h2 className="mt-2 text-lg font-semibold text-slate-900">
              {mode === 'create' ? 'Tambah Paket Langganan' : `Edit: ${initialForm.name}`}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
          </button>
        </div>

        {/* Form body (scrollable) */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {message ? (
            <div
              className={`mb-5 rounded-2xl border px-4 py-3 text-sm ${
                messageType === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-rose-200 bg-rose-50 text-rose-700'
              }`}
            >
              {message}
            </div>
          ) : null}

          <div className="space-y-4">
            {/* Code + Name */}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5 text-sm font-medium text-slate-700">
                <span>Kode Paket</span>
                <input
                  type="text"
                  value={form.code}
                  disabled={mode === 'edit'}
                  onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
                  placeholder="Contoh: STARTER"
                  className={mode === 'edit'
                    ? 'w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-500 outline-none cursor-not-allowed'
                    : inputClass}
                />
                {mode === 'edit' && (
                  <p className="text-[11px] text-slate-400">Kode tidak bisa diubah</p>
                )}
              </label>

              <label className="space-y-1.5 text-sm font-medium text-slate-700">
                <span>Nama Paket</span>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Contoh: Starter"
                  className={inputClass}
                />
              </label>
            </div>

            {/* Description */}
            <label className="space-y-1.5 text-sm font-medium text-slate-700">
              <span>Deskripsi</span>
              <textarea
                rows={2}
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Deskripsi singkat paket..."
                className={inputClass}
              />
            </label>

            {/* BusinessType + Currency */}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5 text-sm font-medium text-slate-700">
                <span>Tipe Bisnis</span>
                <select
                  value={form.businessType}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      businessType:
                        e.target.value === '' ? '' : (e.target.value as 'RETAIL' | 'RESTAURANT'),
                    }))
                  }
                  className={inputClass}
                >
                  <option value="">Semua tipe bisnis</option>
                  <option value="RETAIL">Retail</option>
                  <option value="RESTAURANT">Restaurant</option>
                </select>
              </label>

              <label className="space-y-1.5 text-sm font-medium text-slate-700">
                <span>Mata Uang</span>
                <input
                  type="text"
                  value={form.currencyCode}
                  onChange={(e) => setForm((prev) => ({ ...prev, currencyCode: e.target.value }))}
                  className={inputClass}
                />
              </label>
            </div>

            {/* Price + CustomPricing */}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5 text-sm font-medium text-slate-700">
                <span>Harga per Bulan (IDR)</span>
                <input
                  type="number"
                  min="0"
                  value={form.monthlyPrice}
                  onChange={(e) => setForm((prev) => ({ ...prev, monthlyPrice: e.target.value }))}
                  className={inputClass}
                />
              </label>

              <div className="space-y-1.5 text-sm font-medium text-slate-700">
                <span>Custom Pricing</span>
                <label className="flex cursor-pointer items-center gap-2.5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 hover:bg-slate-100">
                  <input
                    type="checkbox"
                    checked={form.isCustomPricing}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, isCustomPricing: e.target.checked }))
                    }
                    className="h-4 w-4 accent-violet-600"
                  />
                  <span className="text-sm text-slate-700">Aktifkan pricing custom</span>
                </label>
              </div>
            </div>

            {/* Limits */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
                Batas Penggunaan
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1.5 text-sm font-medium text-slate-700">
                  <span>Max Outlet</span>
                  <input
                    type="number"
                    min="0"
                    value={form.maxOutlets}
                    placeholder="Kosong = unlimited"
                    onChange={(e) => setForm((prev) => ({ ...prev, maxOutlets: e.target.value }))}
                    className={inputClass}
                  />
                </label>

                <label className="space-y-1.5 text-sm font-medium text-slate-700">
                  <span>Max User</span>
                  <input
                    type="number"
                    min="0"
                    value={form.maxUsers}
                    placeholder="Kosong = unlimited"
                    onChange={(e) => setForm((prev) => ({ ...prev, maxUsers: e.target.value }))}
                    className={inputClass}
                  />
                </label>

                <label className="space-y-1.5 text-sm font-medium text-slate-700">
                  <span>Max Produk</span>
                  <input
                    type="number"
                    min="0"
                    value={form.maxProducts}
                    placeholder="Kosong = unlimited"
                    onChange={(e) => setForm((prev) => ({ ...prev, maxProducts: e.target.value }))}
                    className={inputClass}
                  />
                </label>

                <label className="space-y-1.5 text-sm font-medium text-slate-700">
                  <span>Max Transaksi/Bulan</span>
                  <input
                    type="number"
                    min="0"
                    value={form.maxMonthlyTransactions}
                    placeholder="Kosong = unlimited"
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, maxMonthlyTransactions: e.target.value }))
                    }
                    className={inputClass}
                  />
                </label>
              </div>
            </div>

            {/* Status toggle (edit only) */}
            {mode === 'edit' && (
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-700">Status Paket</p>
                  <p className="text-xs text-slate-500">
                    {form.isActive ? 'Paket aktif dan bisa dipilih bisnis.' : 'Paket dinonaktifkan, tidak muncul di catalog.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleToggleActive()}
                  disabled={togglingActive}
                  className={`h-9 rounded-xl px-4 text-sm font-semibold transition disabled:opacity-60 ${
                    form.isActive
                      ? 'border border-rose-300 text-rose-700 hover:bg-rose-50'
                      : 'bg-slate-900 text-white hover:bg-slate-800'
                  }`}
                >
                  {togglingActive
                    ? 'Memproses...'
                    : form.isActive
                    ? 'Nonaktifkan'
                    : 'Aktifkan'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center rounded-2xl border border-slate-200 px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting}
            className="inline-flex h-10 items-center gap-2 rounded-2xl bg-violet-600 px-5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-60"
          >
            {submitting ? (
              <FontAwesomeIcon icon={faSpinner} className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FontAwesomeIcon icon={faFloppyDisk} className="h-3.5 w-3.5" />
            )}
            {submitting ? 'Menyimpan...' : mode === 'create' ? 'Buat Paket' : 'Simpan Perubahan'}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── main page ─────────────────────────────────────────────────────────────────

type ActiveTab = 'plans' | 'matrix';

export default function SuperAdminPlansPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('plans');

  // Plans list
  const [plans, setPlans] = useState<SubscriptionPlanSummary[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState('');

  // Drawer
  const [drawerMode, setDrawerMode] = useState<DrawerMode>('create');
  const [drawerPlan, setDrawerPlan] = useState<SubscriptionPlanSummary | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Feature matrix
  const [matrix, setMatrix] = useState<PlansFeatureMatrix | null>(null);
  const [matrixLoading, setMatrixLoading] = useState(true);
  const [matrixError, setMatrixError] = useState('');
  const [pendingByPlan, setPendingByPlan] = useState<Record<string, Set<string>>>({});
  const [savingPlanId, setSavingPlanId] = useState<string | null>(null);
  const [saveMessages, setSaveMessages] = useState<Record<string, { type: 'success' | 'error'; text: string }>>({});

  // Audit log
  const [auditLogs, setAuditLogs] = useState<PlatformAuditLogEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const loadPlans = useCallback(async () => {
    try {
      setPlansLoading(true);
      setPlansError('');
      const data = await getSubscriptionPlansAdmin();
      setPlans(data);
    } catch (err) {
      setPlansError(getMessage(err, 'Gagal memuat daftar paket'));
    } finally {
      setPlansLoading(false);
    }
  }, []);

  const loadMatrix = useCallback(async () => {
    try {
      setMatrixLoading(true);
      setMatrixError('');
      const data = await getPlansFeatureMatrix();
      setMatrix(data);
      const initial: Record<string, Set<string>> = {};
      for (const plan of data.plans) {
        initial[plan.id] = new Set(data.enabledByPlan[plan.id] ?? []);
      }
      setPendingByPlan(initial);
    } catch (err) {
      setMatrixError(getMessage(err, 'Gagal memuat data'));
    } finally {
      setMatrixLoading(false);
    }
  }, []);

  const loadAuditLogs = useCallback(async () => {
    try {
      setAuditLoading(true);
      const logs = await getPlatformAuditLogs({ entityType: 'PLAN', limit: 30 });
      setAuditLogs(logs);
    } catch {
      // silent
    } finally {
      setAuditLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPlans();
    void loadMatrix();
    void loadAuditLogs();
  }, [loadPlans, loadMatrix, loadAuditLogs]);

  function openCreateDrawer() {
    setDrawerMode('create');
    setDrawerPlan(null);
    setDrawerOpen(true);
  }

  function openEditDrawer(plan: SubscriptionPlanSummary) {
    setDrawerMode('edit');
    setDrawerPlan(plan);
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
  }

  async function handleDrawerSaved() {
    closeDrawer();
    await Promise.all([loadPlans(), loadMatrix(), loadAuditLogs()]);
  }

  // Matrix helpers
  function toggleCell(planId: string, flagId: string) {
    setPendingByPlan((prev) => {
      const current = new Set(prev[planId] ?? []);
      if (current.has(flagId)) current.delete(flagId);
      else current.add(flagId);
      return { ...prev, [planId]: current };
    });
  }

  function isChanged(planId: string) {
    if (!matrix) return false;
    const original = new Set(matrix.enabledByPlan[planId] ?? []);
    const pending = pendingByPlan[planId] ?? new Set();
    if (original.size !== pending.size) return true;
    for (const id of pending) {
      if (!original.has(id)) return true;
    }
    return false;
  }

  async function savePlan(planId: string) {
    if (!matrix) return;
    const pendingIds = [...(pendingByPlan[planId] ?? [])];
    const flagKeys = matrix.flags.filter((f) => pendingIds.includes(f.id)).map((f) => f.key);
    setSavingPlanId(planId);
    setSaveMessages((prev) => ({ ...prev, [planId]: { type: 'success', text: '' } }));
    try {
      await setPlanFeatureFlags(planId, flagKeys);
      const refreshed = await getPlansFeatureMatrix();
      setMatrix(refreshed);
      setPendingByPlan((prev) => ({
        ...prev,
        [planId]: new Set(refreshed.enabledByPlan[planId] ?? []),
      }));
      setSaveMessages((prev) => ({ ...prev, [planId]: { type: 'success', text: 'Disimpan' } }));
      void loadAuditLogs();
    } catch (err) {
      setSaveMessages((prev) => ({
        ...prev,
        [planId]: { type: 'error', text: getMessage(err, 'Gagal menyimpan') },
      }));
    } finally {
      setSavingPlanId(null);
      setTimeout(() => {
        setSaveMessages((prev) => {
          const next = { ...prev };
          delete next[planId];
          return next;
        });
      }, 3000);
    }
  }

  const PLAN_ORDER = ['STARTER', 'BASIC', 'RESTAURANT', 'RETAIL_PRO', 'BUSINESS', 'ENTERPRISE'];
  const sortedPlans = [...plans].sort((a, b) => {
    const ai = PLAN_ORDER.indexOf(a.code);
    const bi = PLAN_ORDER.indexOf(b.code);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="space-y-5">
      {/* Drawer */}
      {drawerOpen && (
        <PlanDrawer
          mode={drawerMode}
          initialForm={drawerPlan ? planToForm(drawerPlan) : getEmptyForm()}
          planId={drawerPlan?.id}
          onClose={closeDrawer}
          onSaved={() => { void handleDrawerSaved(); }}
        />
      )}

      {/* Page header */}
      <section className="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-700">
            <FontAwesomeIcon icon={faLayerGroup} className="h-3 w-3" />
            Super Admin
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
            Manajemen Paket
          </h1>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Buat paket baru, edit detail, dan atur fitur tiap paket.
          </p>
        </div>
        <Link
          href="/dashboard/businesses"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <FontAwesomeIcon icon={faChevronLeft} className="h-4 w-4" />
          Kembali
        </Link>
      </section>

      {/* Tabs */}
      <div className="flex gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('plans')}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
            activeTab === 'plans'
              ? 'bg-violet-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FontAwesomeIcon icon={faLayerGroup} className="h-3.5 w-3.5" />
          Kelola Paket
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('matrix')}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
            activeTab === 'matrix'
              ? 'bg-violet-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FontAwesomeIcon icon={faTableCells} className="h-3.5 w-3.5" />
          Fitur per Paket
        </button>
      </div>

      {/* ── Tab: Kelola Paket ── */}
      {activeTab === 'plans' && (
        <>
          {/* Plans list */}
          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
                <FontAwesomeIcon icon={faListCheck} className="h-4 w-4 text-slate-400" />
                Daftar Paket
              </h2>
              <button
                type="button"
                onClick={openCreateDrawer}
                className="inline-flex h-9 items-center gap-2 rounded-2xl bg-violet-600 px-4 text-sm font-semibold text-white transition hover:bg-violet-700"
              >
                <FontAwesomeIcon icon={faPlus} className="h-3.5 w-3.5" />
                Tambah Paket
              </button>
            </div>

            {plansLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-44 animate-pulse rounded-3xl bg-slate-100" />
                ))}
              </div>
            ) : plansError ? (
              <div className="rounded-2xl bg-red-50 px-4 py-4 text-sm text-red-700">{plansError}</div>
            ) : sortedPlans.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                Belum ada paket. Klik &ldquo;Tambah Paket&rdquo; untuk mulai.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {sortedPlans.map((plan) => (
                  <div
                    key={plan.id}
                    className="group relative flex flex-col rounded-3xl border border-slate-200 bg-slate-50 p-5 transition hover:border-violet-200 hover:bg-violet-50/30"
                  >
                    {/* Status badge */}
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                          plan.isActive
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-200 text-slate-500'
                        }`}
                      >
                        {plan.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                      {plan.businessType && (
                        <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-700">
                          {plan.businessType}
                        </span>
                      )}
                    </div>

                    {/* Plan name & code */}
                    <div className="mt-3">
                      <p className="text-lg font-bold text-slate-900">{plan.name}</p>
                      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                        {plan.code}
                      </p>
                    </div>

                    {/* Price */}
                    <p className="mt-2 text-sm font-semibold text-violet-700">
                      {plan.isCustomPricing
                        ? 'Custom Pricing'
                        : `${formatPrice(plan.monthlyPrice, plan.currencyCode)} / bln`}
                    </p>

                    {/* Limits */}
                    <div className="mt-3 grid grid-cols-2 gap-1.5 text-xs text-slate-500">
                      <span>Outlet: <b className="text-slate-700">{plan.limits.maxOutlets ?? '∞'}</b></span>
                      <span>User: <b className="text-slate-700">{plan.limits.maxUsers ?? '∞'}</b></span>
                      <span>Produk: <b className="text-slate-700">{plan.limits.maxProducts ?? '∞'}</b></span>
                      <span>Trx/bln: <b className="text-slate-700">{plan.limits.maxMonthlyTransactions ?? '∞'}</b></span>
                    </div>

                    {/* Description */}
                    {plan.description && (
                      <p className="mt-3 line-clamp-2 text-xs text-slate-500">{plan.description}</p>
                    )}

                    {/* Edit button */}
                    <button
                      type="button"
                      onClick={() => openEditDrawer(plan)}
                      className="mt-4 inline-flex h-8 items-center gap-1.5 self-start rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
                    >
                      <FontAwesomeIcon icon={faPen} className="h-3 w-3" />
                      Edit
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Audit log */}
          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
                <FontAwesomeIcon icon={faSliders} className="h-4 w-4 text-slate-400" />
                Riwayat Perubahan Paket
              </h2>
              <button
                type="button"
                onClick={() => void loadAuditLogs()}
                className="text-xs font-medium text-violet-600 hover:text-violet-700"
              >
                Refresh
              </button>
            </div>
            <div className="mt-4">
              {auditLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-14 animate-pulse rounded-2xl bg-slate-100" />
                  ))}
                </div>
              ) : auditLogs.length === 0 ? (
                <p className="rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-500">
                  Belum ada riwayat perubahan.
                </p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium text-slate-800">
                            {log.summary ?? log.action}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {log.actorUser
                              ? `${log.actorUser.fullName} (${log.actorUser.email})`
                              : 'System'}
                          </p>
                        </div>
                        <time className="shrink-0 text-xs text-slate-400">
                          {formatDateTime(log.createdAt)}
                        </time>
                      </div>
                      {log.changes !== null &&
                        log.changes !== undefined &&
                        typeof log.changes === 'object' &&
                        !Array.isArray(log.changes) && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {(log.changes as { added?: string[]; removed?: string[] }).added?.length ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
                                +{(log.changes as { added: string[] }).added.join(', ')}
                              </span>
                            ) : null}
                            {(log.changes as { added?: string[]; removed?: string[] }).removed?.length ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-[11px] font-medium text-red-600">
                                −{(log.changes as { removed: string[] }).removed.join(', ')}
                              </span>
                            ) : null}
                          </div>
                        )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </>
      )}

      {/* ── Tab: Fitur per Paket ── */}
      {activeTab === 'matrix' && (
        <>
          <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
            {matrixLoading ? (
              <div className="p-8">
                <div className="space-y-3">
                  <div className="h-6 w-56 animate-pulse rounded bg-slate-100" />
                  <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
                </div>
              </div>
            ) : matrixError || !matrix ? (
              <div className="px-6 py-6 text-sm text-red-700">{matrixError || 'Data tidak tersedia.'}</div>
            ) : matrix.flags.length === 0 || matrix.plans.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-slate-500">
                Belum ada plan atau feature flag.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="sticky left-0 z-10 bg-white px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 after:absolute after:right-0 after:top-0 after:h-full after:w-px after:bg-slate-100">
                        Fitur
                      </th>
                      {matrix.plans.map((plan) => {
                        const changed = isChanged(plan.id);
                        const msg = saveMessages[plan.id];
                        return (
                          <th key={plan.id} className="min-w-[160px] px-4 py-4 text-center align-top">
                            <div className="flex flex-col items-center gap-2">
                              <span className="font-semibold text-slate-900">{plan.name}</span>
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                                  plan.isActive
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                {plan.isActive ? 'Aktif' : 'Nonaktif'}
                              </span>
                              {msg?.text ? (
                                <span
                                  className={`text-[11px] font-medium ${
                                    msg.type === 'success' ? 'text-emerald-600' : 'text-red-600'
                                  }`}
                                >
                                  {msg.text}
                                </span>
                              ) : null}
                              <button
                                type="button"
                                disabled={!changed || savingPlanId === plan.id}
                                onClick={() => void savePlan(plan.id)}
                                className={`inline-flex h-8 items-center gap-1.5 rounded-xl px-3 text-[12px] font-semibold transition ${
                                  changed
                                    ? 'bg-slate-900 text-white hover:bg-slate-800'
                                    : 'cursor-default bg-slate-100 text-slate-400'
                                }`}
                              >
                                {savingPlanId === plan.id ? (
                                  <FontAwesomeIcon icon={faSpinner} className="h-3 w-3 animate-spin" />
                                ) : (
                                  <FontAwesomeIcon icon={faFloppyDisk} className="h-3 w-3" />
                                )}
                                {savingPlanId === plan.id ? 'Menyimpan...' : 'Simpan'}
                              </button>
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {matrix.flags.map((flag, flagIdx) => (
                      <tr key={flag.id} className={flagIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                        <td className="sticky left-0 z-10 bg-inherit px-5 py-3.5 after:absolute after:right-0 after:top-0 after:h-full after:w-px after:bg-slate-100">
                          <p className="font-medium text-slate-800">{flag.name}</p>
                          <p className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">
                            {flag.key}
                          </p>
                        </td>
                        {matrix.plans.map((plan) => {
                          const enabled = (pendingByPlan[plan.id] ?? new Set()).has(flag.id);
                          const original = (matrix.enabledByPlan[plan.id] ?? []).includes(flag.id);
                          const dirty = enabled !== original;
                          return (
                            <td key={plan.id} className="px-4 py-3.5 text-center">
                              <button
                                type="button"
                                onClick={() => toggleCell(plan.id, flag.id)}
                                title={enabled ? 'Klik untuk nonaktifkan' : 'Klik untuk aktifkan'}
                                className={`relative inline-flex h-8 w-8 items-center justify-center rounded-xl transition ${
                                  enabled
                                    ? 'bg-violet-100 text-violet-700 hover:bg-violet-200'
                                    : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                                } ${dirty ? 'ring-2 ring-amber-400 ring-offset-1' : ''}`}
                              >
                                <FontAwesomeIcon
                                  icon={enabled ? faCheck : faXmark}
                                  className="h-3.5 w-3.5"
                                />
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 px-1 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-violet-100 text-violet-700">
                <FontAwesomeIcon icon={faCheck} className="h-3 w-3" />
              </span>
              Aktif
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-slate-100 text-slate-400">
                <FontAwesomeIcon icon={faXmark} className="h-3 w-3" />
              </span>
              Nonaktif
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-slate-100 ring-2 ring-amber-400" />
              Belum disimpan
            </span>
          </div>

          {/* Audit log (on matrix tab too) */}
          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
                <FontAwesomeIcon icon={faSliders} className="h-4 w-4 text-slate-400" />
                Riwayat Perubahan Fitur
              </h2>
              <button
                type="button"
                onClick={() => void loadAuditLogs()}
                className="text-xs font-medium text-violet-600 hover:text-violet-700"
              >
                Refresh
              </button>
            </div>
            <div className="mt-4">
              {auditLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-14 animate-pulse rounded-2xl bg-slate-100" />
                  ))}
                </div>
              ) : auditLogs.length === 0 ? (
                <p className="rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-500">
                  Belum ada riwayat perubahan.
                </p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium text-slate-800">
                            {log.summary ?? log.action}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {log.actorUser
                              ? `${log.actorUser.fullName} (${log.actorUser.email})`
                              : 'System'}
                          </p>
                        </div>
                        <time className="shrink-0 text-xs text-slate-400">
                          {formatDateTime(log.createdAt)}
                        </time>
                      </div>
                      {log.changes !== null &&
                        log.changes !== undefined &&
                        typeof log.changes === 'object' &&
                        !Array.isArray(log.changes) && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {(log.changes as { added?: string[]; removed?: string[] }).added?.length ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
                                +{(log.changes as { added: string[] }).added.join(', ')}
                              </span>
                            ) : null}
                            {(log.changes as { removed?: string[] }).removed?.length ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-[11px] font-medium text-red-600">
                                −{(log.changes as { removed: string[] }).removed.join(', ')}
                              </span>
                            ) : null}
                          </div>
                        )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
