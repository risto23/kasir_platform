'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faBan,
  faCircleCheck,
  faFileInvoice,
  faFloppyDisk,
  faLock,
  faPenToSquare,
  faBoxesStacked,
  faStar,
  faTruck,
} from '@fortawesome/free-solid-svg-icons';

import type { Supplier, SupplierStatus } from '@/types/supplier';
import { api } from '@/lib/api';

type EditSupplierForm = {
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

function getMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || fallback;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

function getStatusBadgeClass(status: SupplierStatus) {
  if (status === 'ACTIVE') {
    return 'border border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  return 'border border-slate-200 bg-slate-100 text-slate-600';
}

function parseNullableNumber(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export default function EditSupplierPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [form, setForm] = useState<EditSupplierForm>({
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
  const [detail, setDetail] = useState<Supplier | null>(null);
  const [status, setStatus] = useState<SupplierStatus>('ACTIVE');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>(
    '',
  );

  useEffect(() => {
    async function fetchDetail() {
      try {
        setLoading(true);

        const detailResponse = await api.get(`/suppliers/${params.id}`);
        const item: Supplier = detailResponse.data.data;

        setDetail(item);
        setStatus(item.status);
        setForm({
          code: item.code ?? '',
          name: item.name ?? '',
          phone: item.phone ?? '',
          email: item.email ?? '',
          address: item.address ?? '',
          paymentTermDays:
            item.paymentTermDays !== null ? String(item.paymentTermDays) : '',
          taxNumber: item.taxNumber ?? '',
          notes: item.notes ?? '',
          leadTimeDays:
            item.leadTimeDays !== null ? String(item.leadTimeDays) : '',
          isPreferred: item.isPreferred,
        });
      } catch (error: unknown) {
        setMessage(getMessage(error, 'Gagal memuat supplier'));
        setMessageType('error');
      } finally {
        setLoading(false);
      }
    }

    void fetchDetail();
  }, [params.id]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setMessageType('');

    if (!form.name.trim()) {
      setMessage('Nama supplier wajib diisi.');
      setMessageType('error');
      return;
    }

    const parsedPaymentTermDays = parseNullableNumber(form.paymentTermDays);
    const parsedLeadTimeDays = parseNullableNumber(form.leadTimeDays);

    if (
      Number.isNaN(parsedPaymentTermDays) ||
      (parsedPaymentTermDays !== null && parsedPaymentTermDays < 0)
    ) {
      setMessage('Payment term harus berupa angka 0 atau lebih besar.');
      setMessageType('error');
      return;
    }

    if (
      Number.isNaN(parsedLeadTimeDays) ||
      (parsedLeadTimeDays !== null && parsedLeadTimeDays < 0)
    ) {
      setMessage('Lead time harus berupa angka 0 atau lebih besar.');
      setMessageType('error');
      return;
    }

    try {
      setSaving(true);

      const response = await api.put(`/suppliers/${params.id}`, {
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

      const updated: Supplier = response.data.data;

      setDetail(updated);
      setStatus(updated.status);
      setForm({
        code: updated.code ?? '',
        name: updated.name ?? '',
        phone: updated.phone ?? '',
        email: updated.email ?? '',
        address: updated.address ?? '',
        paymentTermDays:
          updated.paymentTermDays !== null
            ? String(updated.paymentTermDays)
            : '',
        taxNumber: updated.taxNumber ?? '',
        notes: updated.notes ?? '',
        leadTimeDays:
          updated.leadTimeDays !== null ? String(updated.leadTimeDays) : '',
        isPreferred: updated.isPreferred,
      });

      setMessage('Supplier berhasil diperbarui');
      setMessageType('success');
    } catch (error: unknown) {
      setMessage(getMessage(error, 'Gagal memperbarui supplier'));
      setMessageType('error');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStatus() {
    const newStatus: SupplierStatus =
      status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

    try {
      setStatusLoading(true);
      setMessage('');
      setMessageType('');

      const response = await api.patch(`/suppliers/${params.id}/status`, {
        status: newStatus,
      });

      const updated: Supplier = response.data.data;

      setDetail(updated);
      setStatus(updated.status);
      setMessage('Status supplier berhasil diperbarui');
      setMessageType('success');
    } catch (error: unknown) {
      setMessage(getMessage(error, 'Gagal memperbarui status supplier'));
      setMessageType('error');
    } finally {
      setStatusLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-3">
          <div className="h-6 w-40 animate-pulse rounded bg-slate-100" />
          <div className="h-12 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-12 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-12 animate-pulse rounded-2xl bg-slate-100" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-700">
            <FontAwesomeIcon icon={faPenToSquare} className="h-3 w-3" />
            Edit Supplier
          </div>

          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
            Edit Supplier
          </h1>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Perbarui informasi supplier dalam business aktif.
          </p>
        </div>

        <button
          type="button"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          onClick={() => router.push('/dashboard/suppliers')}
        >
          <FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4" />
          Kembali ke List
        </button>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white px-5 py-4 shadow-sm sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Mapping Supplier ke Product
            </h2>
            <p className="text-sm text-slate-500">
              Kelola daftar product yang disuplai supplier ini, harga beli
              terakhir, dan supplier SKU.
            </p>
          </div>

          <Link
            href={`/dashboard/suppliers/${params.id}/products`}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <FontAwesomeIcon icon={faBoxesStacked} className="h-4 w-4" />
            Kelola Mapping Product
          </Link>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          {message ? (
            <div
              className={`mb-5 rounded-2xl px-4 py-3 text-sm ${
                messageType === 'success'
                  ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border border-red-200 bg-red-50 text-red-700'
              }`}
            >
              {message}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Code Supplier
                </label>
                <div className="relative">
                  <input
                    value={form.code}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, code: event.target.value }))
                    }
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 pr-12 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400">
                    <FontAwesomeIcon icon={faLock} className="h-4 w-4" />
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Code supplier bisa diubah jika dibutuhkan, selama tetap unik.
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Nama Supplier
                </label>
                <input
                  value={form.name}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Phone
                </label>
                <input
                  value={form.phone}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, phone: event.target.value }))
                  }
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Email
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, email: event.target.value }))
                  }
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Payment Term (hari)
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.paymentTermDays}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      paymentTermDays: event.target.value,
                    }))
                  }
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Lead Time (hari)
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.leadTimeDays}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      leadTimeDays: event.target.value,
                    }))
                  }
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="block text-sm font-medium text-slate-700">
                  Tax Number / NPWP
                </label>
                <input
                  value={form.taxNumber}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      taxNumber: event.target.value,
                    }))
                  }
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="block text-sm font-medium text-slate-700">
                  Address
                </label>
                <textarea
                  value={form.address}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      address: event.target.value,
                    }))
                  }
                  rows={4}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-indigo-500 focus:bg-white"
                  placeholder="Masukkan alamat supplier"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="block text-sm font-medium text-slate-700">
                  Notes
                </label>
                <textarea
                  value={form.notes}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      notes: event.target.value,
                    }))
                  }
                  rows={5}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-indigo-500 focus:bg-white"
                  placeholder="Masukkan catatan supplier"
                />
              </div>

              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 md:col-span-2">
                <input
                  type="checkbox"
                  checked={form.isPreferred}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      isPreferred: event.target.checked,
                    }))
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

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Status Supplier
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Status diubah lewat endpoint terpisah agar konsisten dengan
                      flow edit/status.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(
                        status,
                      )}`}
                    >
                      {status === 'ACTIVE' ? 'Active' : 'Inactive'}
                    </span>

                    <button
                      type="button"
                      onClick={() => void handleToggleStatus()}
                      disabled={statusLoading}
                      className={`inline-flex h-10 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold transition ${
                        status === 'ACTIVE'
                          ? 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                          : 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      } disabled:cursor-not-allowed disabled:opacity-70`}
                    >
                      <FontAwesomeIcon
                        icon={status === 'ACTIVE' ? faBan : faCircleCheck}
                        className="h-4 w-4"
                      />
                      {statusLoading
                        ? 'Memproses...'
                        : status === 'ACTIVE'
                          ? 'Nonaktifkan'
                          : 'Aktifkan'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
              <Link
                href="/dashboard/suppliers"
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Batal
              </Link>

              <button
                type="submit"
                disabled={saving}
                className="h-11 rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <span className="inline-flex items-center gap-2">
                  <FontAwesomeIcon icon={faFloppyDisk} className="h-4 w-4" />
                  {saving ? 'Menyimpan...' : 'Save Changes'}
                </span>
              </button>
            </div>
          </form>
        </section>

        <aside className="space-y-4">
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
              <FontAwesomeIcon icon={faTruck} className="h-4 w-4" />
            </div>

            <h2 className="mt-4 text-base font-semibold text-slate-900">
              Ringkasan Supplier
            </h2>

            <div className="mt-4 space-y-3 text-sm">
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Supplier ID
                </p>
                <p className="mt-2 break-all font-medium text-slate-800">
                  {detail?.id || '-'}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Business ID
                </p>
                <p className="mt-2 break-all font-medium text-slate-800">
                  {detail?.businessId || '-'}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  <FontAwesomeIcon icon={faFileInvoice} className="h-3 w-3" />
                  Payment Term
                </div>
                <p className="mt-2 font-medium text-slate-800">
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
                <p className="mt-2 font-medium text-slate-800">
                  {form.isPreferred ? 'Ya' : 'Tidak'}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Status
                </p>
                <p className="mt-2 font-medium text-slate-800">{status}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-base font-semibold text-slate-900">
              Catatan Edit
            </p>

            <div className="mt-4 space-y-2">
              {[
                'Nama, contact, terms, dan catatan supplier boleh diperbarui.',
                'Status supplier boleh diubah ACTIVE / INACTIVE.',
                'Preferred supplier bisa diaktifkan sesuai kebutuhan pembelian.',
                'Business scope supplier tetap dijaga backend.',
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
        </aside>
      </div>
    </div>
  );
}
