'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getCachedCurrentUser } from '@/lib/auth';
import { createSubscriptionPlanAdmin } from '@/lib/subscription';

type BusinessTypeOption = 'RESTAURANT' | 'RETAIL' | '';

type FormData = {
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

function getFormDefault(): FormData {
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

function parseNullableNumber(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export default function CreateSubscriptionPlanPage() {
  const router = useRouter();
  const isSuperAdmin = useMemo(() => {
    const currentUser = getCachedCurrentUser();
    return Boolean(currentUser?.platformRoles.includes('SUPER_ADMIN'));
  }, []);

  const [form, setForm] = useState<FormData>(getFormDefault);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('error');

  if (!isSuperAdmin) {
    return (
      <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-amber-950">Buat Subscription Plan</h1>
        <p className="mt-2 text-sm text-amber-800">
          Halaman ini hanya bisa diakses oleh super admin.
        </p>
      </div>
    );
  }

  async function handleSubmit() {
    if (!form.name.trim()) {
      setMessage('Nama plan harus diisi.');
      setMessageType('error');
      return;
    }

    if (!form.code.trim()) {
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

      await createSubscriptionPlanAdmin({
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
      });

      router.push('/dashboard/settings/billing?success=plan_created');
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Gagal membuat plan subscription.',
      );
      setMessageType('error');
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    'w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-900';

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <Link
            href="/dashboard/settings/billing"
            className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
          >
            ← Kembali ke Billing
          </Link>
          <h1 className="text-2xl font-semibold text-slate-900">Buat Subscription Plan</h1>
          <p className="text-sm text-slate-500">
            Tambah plan baru untuk platform subscription. Kode plan harus uppercase dan unik.
          </p>
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
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1 text-sm text-slate-700">
                <span>Kode Plan</span>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
                  placeholder="Contoh: STARTER"
                  className={inputClass}
                />
              </label>

              <label className="space-y-1 text-sm text-slate-700">
                <span>Nama Plan</span>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  className={inputClass}
                />
              </label>
            </div>

            <label className="space-y-1 text-sm text-slate-700">
              <span>Deskripsi</span>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                className={inputClass}
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1 text-sm text-slate-700">
                <span>Business Type</span>
                <select
                  value={form.businessType}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      businessType:
                        e.target.value === ''
                          ? ''
                          : (e.target.value as 'RETAIL' | 'RESTAURANT'),
                    }))
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
                    setForm((prev) => ({ ...prev, currencyCode: e.target.value }))
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
                    setForm((prev) => ({ ...prev, monthlyPrice: e.target.value }))
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
                      setForm((prev) => ({ ...prev, isCustomPricing: e.target.checked }))
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
                  onChange={(e) => setForm((prev) => ({ ...prev, maxOutlets: e.target.value }))}
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
                  onChange={(e) => setForm((prev) => ({ ...prev, maxUsers: e.target.value }))}
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
                    setForm((prev) => ({ ...prev, maxProducts: e.target.value }))
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
                    setForm((prev) => ({
                      ...prev,
                      maxMonthlyTransactions: e.target.value,
                    }))
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
                  onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
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
                {submitting ? 'Menyimpan...' : 'Simpan Plan'}
              </button>

              <Link
                href="/dashboard/settings/billing"
                className="inline-flex h-11 items-center rounded-2xl border border-slate-300 px-5 text-sm font-semibold text-slate-900"
              >
                Batal
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <p className="font-semibold text-slate-900">Petunjuk</p>
            <p className="mt-3">
              Kode plan harus berupa uppercase dan unik di seluruh platform.
            </p>
            <p className="mt-3">
              Jika plan tidak aktif, pemilik business tidak dapat memilihnya saat perubahan subscription.
            </p>
            <p className="mt-3">
              Kosongkan field limit (Max Outlets, Max Users, dst.) untuk mengizinkan penggunaan tanpa batas (unlimited).
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
