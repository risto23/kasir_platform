'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { getCachedCurrentUser } from '@/lib/auth';
import {
  activateSubscriptionPlanAdmin,
  deactivateSubscriptionPlanAdmin,
  getSubscriptionPlanAdmin,
  updateSubscriptionPlanAdmin,
  type SubscriptionPlanSummary,
} from '@/lib/subscription';

type BusinessTypeOption = 'RESTAURANT' | 'RETAIL' | '';

type FormData = {
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

function parseNullableNumber(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function planToForm(plan: SubscriptionPlanSummary): FormData {
  return {
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

function formatStatusLabel(value: string) {
  return value.replaceAll('_', ' ');
}

export default function EditSubscriptionPlanPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const isSuperAdmin = useMemo(() => {
    const currentUser = getCachedCurrentUser();
    return Boolean(currentUser?.platformRoles.includes('SUPER_ADMIN'));
  }, []);

  const [plan, setPlan] = useState<SubscriptionPlanSummary | null>(null);
  const [form, setForm] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [togglingActive, setTogglingActive] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('error');

  useEffect(() => {
    if (!isSuperAdmin || !id) {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const data = await getSubscriptionPlanAdmin(id);
        setPlan(data);
        setForm(planToForm(data));
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : 'Gagal memuat data plan subscription.',
        );
        setMessageType('error');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isSuperAdmin]);

  if (!isSuperAdmin) {
    return (
      <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-amber-950">Edit Subscription Plan</h1>
        <p className="mt-2 text-sm text-amber-800">
          Halaman ini hanya bisa diakses oleh super admin.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        Memuat data plan subscription...
      </div>
    );
  }

  if (!plan || !form) {
    return (
      <div className="rounded-[28px] border border-rose-200 bg-rose-50 p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-rose-900">Plan Tidak Ditemukan</h1>
        <p className="mt-2 text-sm text-rose-700">
          {message || 'Plan subscription dengan ID ini tidak ditemukan.'}
        </p>
        <Link
          href="/dashboard/settings/billing"
          className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-rose-700 hover:underline"
        >
          ← Kembali ke Billing
        </Link>
      </div>
    );
  }

  async function handleSubmit() {
    if (!form) return;

    if (!form.name.trim()) {
      setMessage('Nama plan harus diisi.');
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

      const updated = await updateSubscriptionPlanAdmin(id, {
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
      });

      setPlan(updated);
      setForm(planToForm(updated));
      setMessage('Plan subscription berhasil diperbarui.');
      setMessageType('success');
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Gagal memperbarui plan subscription.',
      );
      setMessageType('error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleActive() {
    if (!plan) return;

    try {
      setTogglingActive(true);
      setMessage('');

      const result = plan.isActive
        ? await deactivateSubscriptionPlanAdmin(plan.id)
        : await activateSubscriptionPlanAdmin(plan.id);

      setPlan(result);
      setForm(planToForm(result));
      setMessage(
        `Plan ${result.name} berhasil ${result.isActive ? 'diaktifkan' : 'dinonaktifkan'}.`,
      );
      setMessageType('success');
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Gagal mengubah status plan subscription.',
      );
      setMessageType('error');
    } finally {
      setTogglingActive(false);
    }
  }

  const inputClass =
    'w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-900';

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Link
              href="/dashboard/settings/billing"
              className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
            >
              ← Kembali ke Billing
            </Link>
            <h1 className="text-2xl font-semibold text-slate-900">Edit Subscription Plan</h1>
            <p className="text-sm text-slate-500">
              Kode:{' '}
              <span className="font-semibold text-slate-700">{plan.code}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                plan.isActive
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {plan.isActive ? 'Aktif' : 'Nonaktif'}
            </span>

            <button
              type="button"
              onClick={() => void handleToggleActive()}
              disabled={togglingActive}
              className={`h-10 rounded-2xl px-4 text-sm font-semibold disabled:opacity-60 ${
                plan.isActive
                  ? 'border border-rose-300 text-rose-700 hover:bg-rose-50'
                  : 'bg-slate-900 text-white'
              }`}
            >
              {togglingActive
                ? 'Memproses...'
                : plan.isActive
                ? 'Nonaktifkan Plan'
                : 'Aktifkan Plan'}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
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

        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <label className="space-y-1 text-sm text-slate-700">
              <span>Kode Plan</span>
              <input
                type="text"
                value={plan.code}
                disabled
                className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-500 outline-none"
              />
            </label>

            <label className="space-y-1 text-sm text-slate-700">
              <span>Nama Plan</span>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((prev) => prev && { ...prev, name: e.target.value })}
                className={inputClass}
              />
            </label>

            <label className="space-y-1 text-sm text-slate-700">
              <span>Deskripsi</span>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => prev && { ...prev, description: e.target.value })
                }
                className={inputClass}
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1 text-sm text-slate-700">
                <span>Business Type</span>
                <select
                  value={form.businessType}
                  onChange={(e) =>
                    setForm(
                      (prev) =>
                        prev && {
                          ...prev,
                          businessType:
                            e.target.value === ''
                              ? ''
                              : (e.target.value as 'RETAIL' | 'RESTAURANT'),
                        },
                    )
                  }
                  className={inputClass}
                >
                  <option value="">All business types</option>
                  <option value="RETAIL">Retail</option>
                  <option value="RESTAURANT">Restaurant</option>
                </select>
              </label>

              <label className="space-y-1 text-sm text-slate-700">
                <span>Currency Code</span>
                <input
                  type="text"
                  value={form.currencyCode}
                  onChange={(e) =>
                    setForm((prev) => prev && { ...prev, currencyCode: e.target.value })
                  }
                  className={inputClass}
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1 text-sm text-slate-700">
                <span>Monthly Price</span>
                <input
                  type="number"
                  min="0"
                  value={form.monthlyPrice}
                  onChange={(e) =>
                    setForm((prev) => prev && { ...prev, monthlyPrice: e.target.value })
                  }
                  className={inputClass}
                />
              </label>

              <div className="space-y-1 text-sm text-slate-700">
                <span>Custom Pricing</span>
                <div className="flex items-center gap-2 pt-3">
                  <input
                    type="checkbox"
                    checked={form.isCustomPricing}
                    onChange={(e) =>
                      setForm(
                        (prev) => prev && { ...prev, isCustomPricing: e.target.checked },
                      )
                    }
                    className="h-4 w-4"
                  />
                  <span>Aktifkan pricing custom</span>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1 text-sm text-slate-700">
                <span>Max Outlets</span>
                <input
                  type="number"
                  min="0"
                  value={form.maxOutlets}
                  placeholder="Kosong = unlimited"
                  onChange={(e) =>
                    setForm((prev) => prev && { ...prev, maxOutlets: e.target.value })
                  }
                  className={inputClass}
                />
              </label>

              <label className="space-y-1 text-sm text-slate-700">
                <span>Max Users</span>
                <input
                  type="number"
                  min="0"
                  value={form.maxUsers}
                  placeholder="Kosong = unlimited"
                  onChange={(e) =>
                    setForm((prev) => prev && { ...prev, maxUsers: e.target.value })
                  }
                  className={inputClass}
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1 text-sm text-slate-700">
                <span>Max Products</span>
                <input
                  type="number"
                  min="0"
                  value={form.maxProducts}
                  placeholder="Kosong = unlimited"
                  onChange={(e) =>
                    setForm((prev) => prev && { ...prev, maxProducts: e.target.value })
                  }
                  className={inputClass}
                />
              </label>

              <label className="space-y-1 text-sm text-slate-700">
                <span>Max Monthly Transactions</span>
                <input
                  type="number"
                  min="0"
                  value={form.maxMonthlyTransactions}
                  placeholder="Kosong = unlimited"
                  onChange={(e) =>
                    setForm(
                      (prev) => prev && { ...prev, maxMonthlyTransactions: e.target.value },
                    )
                  }
                  className={inputClass}
                />
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) =>
                    setForm((prev) => prev && { ...prev, isActive: e.target.checked })
                  }
                  className="h-4 w-4"
                />
                <span>Plan aktif</span>
              </label>

              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={submitting}
                className="h-11 rounded-2xl bg-emerald-600 px-5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {submitting ? 'Menyimpan...' : 'Perbarui Plan'}
              </button>

              <Link
                href="/dashboard/settings/billing"
                className="inline-flex h-11 items-center rounded-2xl border border-slate-300 px-5 text-sm font-semibold text-slate-900"
              >
                Batal
              </Link>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <p className="font-semibold text-slate-900">Info Plan</p>
              <div className="mt-3 space-y-2">
                <p>
                  Status:{' '}
                  <span className="font-medium text-slate-900">
                    {formatStatusLabel(plan.isActive ? 'ACTIVE' : 'INACTIVE')}
                  </span>
                </p>
                <p>
                  Business Type:{' '}
                  <span className="font-medium text-slate-900">
                    {plan.businessType ?? 'All types'}
                  </span>
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <p className="font-semibold text-slate-900">Petunjuk</p>
              <p className="mt-3">
                Kode plan tidak bisa diubah setelah dibuat untuk menjaga integritas data subscription.
              </p>
              <p className="mt-3">
                Kosongkan field limit untuk mengizinkan penggunaan tanpa batas (unlimited).
              </p>
              <p className="mt-3">
                Gunakan tombol Aktifkan/Nonaktifkan di bagian atas untuk mengubah visibilitas plan dari catalog.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
