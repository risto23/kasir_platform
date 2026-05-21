// pos_web/src/app/dashboard/payments/history/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faClockRotateLeft,
  faEye,
  faMagnifyingGlass,
  faReceipt,
  faRotateRight,
  faTrash,
  faTriangleExclamation,
  faWallet,
} from '@fortawesome/free-solid-svg-icons';

import { formatCurrency, formatDateTime, getPayments, getPosOutlets, softDeletePayment } from '@/lib/pos';
import { getReceiptByOrderId } from '@/lib/receipt';
import type { PosOutletItem, PosPaymentResponse } from '@/types/pos';

function getErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || fallback;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'PAID':
      return 'border border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'PARTIAL':
      return 'border border-amber-200 bg-amber-50 text-amber-700';
    case 'CANCELLED':
    case 'REFUNDED':
      return 'border border-rose-200 bg-rose-50 text-rose-700';
    default:
      return 'border border-slate-200 bg-slate-100 text-slate-700';
  }
}

function getMethodBadgeClass(method: string): string {
  switch (method) {
    case 'CASH':
      return 'border border-sky-200 bg-sky-50 text-sky-700';
    case 'QRIS':
      return 'border border-violet-200 bg-violet-50 text-violet-700';
    case 'CARD':
      return 'border border-indigo-200 bg-indigo-50 text-indigo-700';
    case 'TRANSFER':
      return 'border border-cyan-200 bg-cyan-50 text-cyan-700';
    default:
      return 'border border-slate-200 bg-slate-100 text-slate-700';
  }
}

export default function PaymentHistoryPage() {
  const router = useRouter();

  const [outlets, setOutlets] = useState<PosOutletItem[]>([]);
  const [selectedOutletId, setSelectedOutletId] = useState('');
  const [items, setItems] = useState<PosPaymentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [openLoadingId, setOpenLoadingId] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const totalAmount = useMemo(
    () => items.reduce((sum, item) => sum + item.amountPaid, 0),
    [items],
  );

  async function loadOutlets() {
    const response = await getPosOutlets();
    const outletItems = response.items;

    setOutlets(outletItems);

    if (outletItems.length > 0) {
      const storedOutletId =
        typeof window !== 'undefined'
          ? window.localStorage.getItem('activeOutletId')
          : null;

      const resolvedOutletId =
        storedOutletId && outletItems.some((item) => item.id === storedOutletId)
          ? storedOutletId
          : outletItems[0].id;

      setSelectedOutletId((prev) => prev || resolvedOutletId);
    }
  }

  async function loadPayments(outletId: string, search?: string) {
    if (!outletId) {
      setItems([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setMessage('');

      const response = await getPayments({
        outletId,
        perPage: 50,
        search: search?.trim() || undefined,
      });

      setItems(response.items);
    } catch (error: unknown) {
      setMessage(getErrorMessage(error, 'Gagal memuat histori payment'));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function initialize() {
      try {
        setLoading(true);
        await loadOutlets();
      } catch (error: unknown) {
        setMessage(getErrorMessage(error, 'Gagal memuat outlet'));
        setLoading(false);
      }
    }

    void initialize();
  }, []);

  useEffect(() => {
    if (!selectedOutletId) {
      return;
    }

    if (typeof window !== 'undefined') {
      window.localStorage.setItem('activeOutletId', selectedOutletId);
    }

    void loadPayments(selectedOutletId, searchKeyword);
  }, [selectedOutletId, searchKeyword]);

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearchKeyword(searchInput.trim());
  }

  function handleReset() {
    setSearchInput('');
    setSearchKeyword('');
  }

  async function handleOpenReceipt(item: PosPaymentResponse) {
    if (!selectedOutletId) {
      setMessage('Pilih outlet aktif terlebih dahulu');
      return;
    }

    try {
      setOpenLoadingId(item.id);
      setMessage('');

      const receipt = item.receiptId
        ? { id: item.receiptId }
        : await getReceiptByOrderId(item.orderId, selectedOutletId);

      router.push(`/dashboard/receipts/${receipt.id}`);
    } catch (error: unknown) {
      setMessage(getErrorMessage(error, 'Receipt untuk payment ini belum tersedia'));
    } finally {
      setOpenLoadingId('');
    }
  }

  async function handleDeletePayment() {
    if (!deleteTargetId || !selectedOutletId) return;
    try {
      setDeleteLoading(true);
      setMessage('');
      await softDeletePayment(deleteTargetId, selectedOutletId);
      setDeleteTargetId(null);
      await loadPayments(selectedOutletId, searchKeyword);
    } catch (error: unknown) {
      setMessage(getErrorMessage(error, 'Gagal menghapus payment'));
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-700">
              <FontAwesomeIcon icon={faWallet} className="h-3 w-3" />
              Payment History
            </div>

            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
              Histori Payment
            </h1>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Riwayat payment per outlet aktif. Dari sini bisa buka receipt lama dan print ulang.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/pos"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4" />
              Kembali ke POS
            </Link>

            <Link
              href="/dashboard/pos/history"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <FontAwesomeIcon icon={faClockRotateLeft} className="h-4 w-4" />
              Histori Transaksi
            </Link>
          </div>
        </div>
      </section>

      {message ? (
        <section className="rounded-[28px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700 shadow-sm sm:px-6">
          {message}
        </section>
      ) : null}

      <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
          <div className="grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)_auto_auto]">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Outlet
              </label>
              <select
                value={selectedOutletId}
                onChange={(event) => setSelectedOutletId(event.target.value)}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                disabled={loading && outlets.length === 0}
              >
                <option value="">Pilih outlet</option>
                {outlets.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.code})
                  </option>
                ))}
              </select>
            </div>

            <form onSubmit={handleSearchSubmit} className="lg:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Cari payment
              </label>
              <div className="flex gap-2">
                <div className="flex h-11 flex-1 items-center rounded-2xl border border-slate-200 px-4">
                  <FontAwesomeIcon
                    icon={faMagnifyingGlass}
                    className="mr-3 h-4 w-4 text-slate-400"
                  />
                  <input
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="Cari nomor payment, nomor order, order ID, atau payment ID"
                    className="h-full w-full bg-transparent text-sm text-slate-900 outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  <FontAwesomeIcon icon={faMagnifyingGlass} className="h-4 w-4" />
                  Cari
                </button>
              </div>
            </form>

            <div className="flex items-end">
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <FontAwesomeIcon icon={faRotateRight} className="h-4 w-4" />
                Reset
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-3 px-5 py-5 sm:px-6">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-slate-500 sm:px-6">
            Belum ada histori payment untuk outlet ini.
          </div>
        ) : (
          <>
            <div className="grid gap-3 p-5 sm:px-6 sm:py-5">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">
                          {item.paymentNumber}
                        </p>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${getStatusBadgeClass(
                            item.status,
                          )}`}
                        >
                          {item.status}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${getMethodBadgeClass(
                            item.method,
                          )}`}
                        >
                          {item.method}
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-500">
                        <span>Order ID: {item.orderId}</span>
                        {item.receiptNumber ? <span>• Receipt: {item.receiptNumber}</span> : null}
                        <span>• {formatDateTime(item.paidAt || item.createdAt)}</span>
                      </div>

                      {item.note ? (
                        <p className="mt-2 text-sm text-slate-600">{item.note}</p>
                      ) : null}
                    </div>

                    <div className="text-right">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Amount Paid
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {formatCurrency(item.amountPaid)}
                      </p>
                      {item.changeAmount > 0 ? (
                        <p className="mt-1 text-xs text-slate-500">
                          Kembalian {formatCurrency(item.changeAmount)}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void handleOpenReceipt(item)}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      disabled={openLoadingId === item.id}
                    >
                      <FontAwesomeIcon icon={faEye} className="h-4 w-4" />
                      {openLoadingId === item.id ? 'Membuka...' : 'Buka Receipt'}
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeleteTargetId(item.id)}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                    >
                      <FontAwesomeIcon icon={faTrash} className="h-4 w-4" />
                      Hapus
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-200 px-5 py-4 sm:px-6">
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>Total payment tampil</span>
                <span className="font-semibold text-slate-900">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            </div>
          </>
        )}
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white px-5 py-4 shadow-sm sm:px-6">
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <FontAwesomeIcon icon={faReceipt} className="h-4 w-4 text-slate-400" />
          Receipt final dibuka dari histori payment atau histori transaksi. Hapus payment untuk menyembunyikan dari histori dan laporan.
        </div>
      </section>

      {deleteTargetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-[28px] bg-white p-6 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100">
                <FontAwesomeIcon icon={faTriangleExclamation} className="h-5 w-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Hapus payment ini?</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Payment dan struk terkait akan dihapus dari histori dan tidak dihitung di laporan. Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTargetId(null)}
                disabled={deleteLoading}
                className="inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => void handleDeletePayment()}
                disabled={deleteLoading}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-rose-600 px-4 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
              >
                <FontAwesomeIcon icon={faTrash} className="h-4 w-4" />
                {deleteLoading ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
