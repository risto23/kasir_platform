'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faFileInvoice,
  faRotateLeft,
  faSave,
  faStar,
  faTruck,
} from '@fortawesome/free-solid-svg-icons';

import { api } from '@/lib/api';

type SupplierFormState = {
  code: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  paymentTermDays: string;
  taxNumber: string;
  notes: string;
  leadTimeDays: string;
  isPreferred: boolean;
};

function getMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || 'Gagal menyimpan supplier';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Terjadi kesalahan';
}

function parseNullableNumber(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export default function SupplierCreatePage() {
  const router = useRouter();

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const [form, setForm] = useState<SupplierFormState>({
    code: '',
    name: '',
    phone: '',
    email: '',
    address: '',
    paymentTermDays: '',
    taxNumber: '',
    notes: '',
    leadTimeDays: '',
    isPreferred: false,
  });

  function updateField<K extends keyof SupplierFormState>(
    key: K,
    value: SupplierFormState[K],
  ) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function handleReset() {
    setMessage('');
    setForm({
      code: '',
      name: '',
      phone: '',
      email: '',
      address: '',
      paymentTermDays: '',
      taxNumber: '',
      notes: '',
      leadTimeDays: '',
      isPreferred: false,
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.name.trim()) {
      setMessage('Nama supplier wajib diisi.');
      return;
    }

    const parsedPaymentTermDays = parseNullableNumber(form.paymentTermDays);
    const parsedLeadTimeDays = parseNullableNumber(form.leadTimeDays);

    if (
      Number.isNaN(parsedPaymentTermDays) ||
      (parsedPaymentTermDays !== null && parsedPaymentTermDays < 0)
    ) {
      setMessage('Payment term harus berupa angka 0 atau lebih besar.');
      return;
    }

    if (
      Number.isNaN(parsedLeadTimeDays) ||
      (parsedLeadTimeDays !== null && parsedLeadTimeDays < 0)
    ) {
      setMessage('Lead time harus berupa angka 0 atau lebih besar.');
      return;
    }

    try {
      setSubmitting(true);
      setMessage('');

      await api.post('/suppliers', {
        code: form.code.trim() || null,
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        address: form.address.trim() || null,
        paymentTermDays: parsedPaymentTermDays,
        taxNumber: form.taxNumber.trim() || null,
        notes: form.notes.trim() || null,
        leadTimeDays: parsedLeadTimeDays,
        isPreferred: form.isPreferred,
      });

      router.push('/dashboard/suppliers');
      router.refresh();
    } catch (error: unknown) {
      setMessage(getMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-700">
            <FontAwesomeIcon icon={faTruck} className="h-3 w-3" />
            Supplier Management
          </div>

          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
            Tambah Supplier
          </h1>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Buat supplier baru pada business aktif untuk persiapan SRM dan
            pembelian.
          </p>
        </div>

        <Link
          href="/dashboard/suppliers"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4" />
          Kembali ke List
        </Link>
      </section>

      <form
        onSubmit={handleSubmit}
        className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]"
      >
        <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
            <h2 className="text-base font-semibold text-slate-900">
              Form Supplier
            </h2>
            <p className="text-sm text-slate-500">
              Isi data supplier sesuai business aktif.
            </p>
          </div>

          <div className="grid gap-5 px-5 py-5 sm:px-6">
            {message ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {message}
              </div>
            ) : null}

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-800">
                  Code Supplier
                </label>
                <input
                  value={form.code}
                  onChange={(event) => updateField('code', event.target.value)}
                  placeholder="Kosongkan untuk auto generate"
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-800">
                  Nama Supplier <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.name}
                  onChange={(event) => updateField('name', event.target.value)}
                  placeholder="Contoh: PT Sumber Niaga"
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-800">
                  Phone
                </label>
                <input
                  value={form.phone}
                  onChange={(event) => updateField('phone', event.target.value)}
                  placeholder="Nomor telepon supplier"
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-800">
                  Email
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => updateField('email', event.target.value)}
                  placeholder="email@supplier.com"
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-800">
                  Payment Term (hari)
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.paymentTermDays}
                  onChange={(event) =>
                    updateField('paymentTermDays', event.target.value)
                  }
                  placeholder="Contoh: 14"
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-800">
                  Lead Time (hari)
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.leadTimeDays}
                  onChange={(event) =>
                    updateField('leadTimeDays', event.target.value)
                  }
                  placeholder="Contoh: 3"
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold text-slate-800">
                  Tax Number / NPWP
                </label>
                <input
                  value={form.taxNumber}
                  onChange={(event) =>
                    updateField('taxNumber', event.target.value)
                  }
                  placeholder="Nomor NPWP / tax number"
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold text-slate-800">
                  Address
                </label>
                <textarea
                  value={form.address}
                  onChange={(event) =>
                    updateField('address', event.target.value)
                  }
                  rows={4}
                  placeholder="Alamat supplier"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold text-slate-800">
                  Notes
                </label>
                <textarea
                  value={form.notes}
                  onChange={(event) => updateField('notes', event.target.value)}
                  rows={5}
                  placeholder="Catatan supplier"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 md:col-span-2">
                <input
                  type="checkbox"
                  checked={form.isPreferred}
                  onChange={(event) =>
                    updateField('isPreferred', event.target.checked)
                  }
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                />
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Jadikan preferred supplier
                  </p>
                  <p className="text-xs text-slate-500">
                    Tanda prioritas supplier untuk pembelian berikutnya.
                  </p>
                </div>
              </label>
            </div>
          </div>
        </section>

        <section className="space-y-5">
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Ringkasan</h2>

            <div className="mt-4 space-y-3">
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Supplier
                </p>
                <p className="mt-2 text-sm font-medium text-slate-800">
                  {form.name.trim() || '-'}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {form.code.trim() || 'Code akan digenerate backend'}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  <FontAwesomeIcon icon={faFileInvoice} className="h-3 w-3" />
                  Payment Term
                </div>
                <p className="mt-2 text-sm font-medium text-slate-800">
                  {form.paymentTermDays.trim()
                    ? `${form.paymentTermDays.trim()} hari`
                    : '-'}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  <FontAwesomeIcon icon={faStar} className="h-3 w-3" />
                  Preferred
                </div>
                <p className="mt-2 text-sm font-medium text-slate-800">
                  {form.isPreferred ? 'Ya' : 'Tidak'}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <FontAwesomeIcon icon={faSave} className="h-4 w-4" />
                {submitting ? 'Menyimpan...' : 'Simpan Supplier'}
              </button>

              <button
                type="button"
                onClick={handleReset}
                disabled={submitting}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <FontAwesomeIcon icon={faRotateLeft} className="h-4 w-4" />
                Reset Form
              </button>

              <Link
                href="/dashboard/suppliers"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4" />
                Batal
              </Link>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Catatan</h2>

            <div className="mt-4 grid gap-3">
              {[
                'Supplier dibuat di business aktif.',
                'Code supplier boleh dikosongkan untuk auto generate.',
                'Field pricing pembelian belum masuk di fase ini.',
                'Status awal supplier akan ACTIVE.',
              ].map((note) => (
                <div
                  key={note}
                  className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600"
                >
                  {note}
                </div>
              ))}
            </div>
          </div>
        </section>
      </form>
    </div>
  );
}
