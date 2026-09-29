'use client';

import Link from 'next/link';
import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowRight,
  faCashRegister,
  faFilter,
  faReceipt,
  faRotateRight,
  faWallet,
} from '@fortawesome/free-solid-svg-icons';

import { getPosOutlets, formatCurrency as formatPosCurrency } from '@/lib/pos';
import {
  formatPaymentCurrency,
  formatPaymentDateTime,
  getPaymentHistory,
} from '@/lib/payment';
import type { PosOutletItem } from '@/types/pos';
import type {
  PaymentHistoryItem,
  PaymentHistoryMethod,
  PaymentHistoryStatus,
} from '@/types/payment';

function getErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || fallback;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

function getMethodLabel(method: PaymentHistoryMethod): string {
  switch (method) {
    case 'CASH':
      return 'Cash';
    case 'QRIS':
      return 'QRIS';
    case 'TRANSFER':
      return 'Transfer';
    case 'CARD':
      return 'Card';
    case 'OTHER':
      return 'Lainnya';
    default:
      return method;
  }
}

function getStatusBadgeClass(status: PaymentHistoryStatus): string {
  switch (status) {
    case 'PAID':
      return 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200';
    case 'PARTIAL':
      return 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200';
    case 'UNPAID':
      return 'bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200';
    case 'CANCELLED':
      return 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200';
    case 'REFUNDED':
      return 'bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200';
    default:
      return 'bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200';
  }
}

export default function PaymentHistoryPage() {
  const [outlets, setOutlets] = useState<PosOutletItem[]>([]);
  const [selectedOutletId, setSelectedOutletId] = useState('');
  const [payments, setPayments] = useState<PaymentHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [outletLoading, setOutletLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | PaymentHistoryStatus>('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    async function loadOutlets() {
      try {
        setOutletLoading(true);
        const response = await getPosOutlets();
        setOutlets(response.items);

        const storedOutletId =
          typeof window !== 'undefined'
            ? localStorage.getItem('activeOutletId')
            : null;

        const firstOutletId = response.items[0]?.id ?? '';

        const resolvedOutletId =
          storedOutletId && response.items.some((item) => item.id === storedOutletId)
            ? storedOutletId
            : firstOutletId;

        setSelectedOutletId(resolvedOutletId);

        if (typeof window !== 'undefined' && resolvedOutletId) {
          localStorage.setItem('activeOutletId', resolvedOutletId);
        }
      } catch (error: unknown) {
        setErrorMessage(getErrorMessage(error, 'Gagal memuat outlet'));
      } finally {
        setOutletLoading(false);
      }
    }

    void loadOutlets();
  }, []);

  useEffect(() => {
    async function loadPayments() {
      if (!selectedOutletId) {
        setPayments([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setErrorMessage('');

        const response = await getPaymentHistory({
          outletId: selectedOutletId,
          page: 1,
          perPage: 100,
          status: filterStatus === 'ALL' ? undefined : filterStatus,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        });

        setPayments(response.items);
      } catch (error: unknown) {
        setErrorMessage(getErrorMessage(error, 'Gagal memuat histori payment'));
      } finally {
        setLoading(false);
      }
    }

    if (!outletLoading) {
      void loadPayments();
    }
  }, [selectedOutletId, outletLoading, filterStatus, dateFrom, dateTo]);

  async function handleRefresh() {
    if (!selectedOutletId) {
      return;
    }

    try {
      setRefreshing(true);
      setErrorMessage('');

      const response = await getPaymentHistory({
        outletId: selectedOutletId,
        page: 1,
        perPage: 100,
        status: filterStatus === 'ALL' ? undefined : filterStatus,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });

      setPayments(response.items);
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, 'Gagal memperbarui histori payment'));
    } finally {
      setRefreshing(false);
    }
  }

  function handleOutletChange(outletId: string) {
    setSelectedOutletId(outletId);

    if (typeof window !== 'undefined') {
      localStorage.setItem('activeOutletId', outletId);
    }
  }

  function handleResetFilter() {
    setFilterStatus('ALL');
    setDateFrom('');
    setDateTo('');
  }

  const summary = useMemo(() => {
    return payments.reduce(
      (acc, item) => {
        acc.totalAmount += item.amountPaid;
        acc.totalCount += 1;

        if (item.status === 'PAID') {
          acc.totalPaid += 1;
        }

        return acc;
      },
      {
        totalAmount: 0,
        totalCount: 0,
        totalPaid: 0,
      },
    );
  }, [payments]);

  const hasActiveFilter = filterStatus !== 'ALL' || dateFrom || dateTo;

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
              Histori Payment Outlet
            </h1>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Lihat riwayat pembayaran per outlet, lalu buka receipt untuk print ulang jika sudah tersedia.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {hasActiveFilter && (
              <button
                type="button"
                onClick={handleResetFilter}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Reset Filter
              </button>
            )}
            <button
              type="button"
              onClick={() => void handleRefresh()}
              disabled={refreshing || !selectedOutletId}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FontAwesomeIcon
                icon={faRotateRight}
                className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
              />
              Refresh
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
              <FontAwesomeIcon icon={faCashRegister} className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Total Payment</p>
              <h2 className="text-xl font-semibold text-slate-900">
                {summary.totalCount}
              </h2>
            </div>
          </div>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              <FontAwesomeIcon icon={faWallet} className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Total Paid</p>
              <h2 className="text-xl font-semibold text-slate-900">
                {summary.totalPaid}
              </h2>
            </div>
          </div>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
              <FontAwesomeIcon icon={faReceipt} className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Nominal Payment</p>
              <h2 className="text-xl font-semibold text-slate-900">
                {formatPosCurrency(summary.totalAmount)}
              </h2>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Pilih Outlet
            </label>
            <select
              value={selectedOutletId}
              onChange={(event) => handleOutletChange(event.target.value)}
              disabled={outletLoading}
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-slate-400"
            >
              <option value="">Pilih outlet</option>
              {outlets.map((outlet) => (
                <option key={outlet.id} value={outlet.id}>
                  {outlet.name} ({outlet.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Filter Status
            </label>
            <div className="relative">
              <select
                value={filterStatus}
                onChange={(event) =>
                  setFilterStatus(event.target.value as 'ALL' | PaymentHistoryStatus)
                }
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 pr-10 text-sm text-slate-700 outline-none transition focus:border-slate-400"
              >
                <option value="ALL">Semua Status</option>
                <option value="PAID">Paid</option>
                <option value="PARTIAL">Partial</option>
                <option value="UNPAID">Unpaid</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="REFUNDED">Refunded</option>
              </select>

              <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-400">
                <FontAwesomeIcon icon={faFilter} className="h-4 w-4" />
              </span>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Dari Tanggal
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              max={dateTo || undefined}
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-slate-400"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Sampai Tanggal
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              min={dateFrom || undefined}
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-slate-400"
            />
          </div>
        </div>
      </section>

      {errorMessage ? (
        <section className="rounded-[28px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700 shadow-sm sm:px-6">
          {errorMessage}
        </section>
      ) : null}

      <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
          <h2 className="text-base font-semibold text-slate-900">Daftar Payment</h2>
          <p className="mt-1 text-sm text-slate-500">
            Payment tetap dipisah dari receipt. Receipt dipakai untuk bukti final dan print ulang.
          </p>
        </div>

        {loading ? (
          <div className="space-y-3 px-5 py-5 sm:px-6">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={`payment-skeleton-${index}`}
                className="h-20 animate-pulse rounded-2xl bg-slate-100"
              />
            ))}
          </div>
        ) : payments.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-slate-500 sm:px-6">
            Belum ada histori payment untuk outlet ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0">
              <thead>
                <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  <th className="border-b border-slate-200 px-5 py-3 sm:px-6">Payment</th>
                  <th className="border-b border-slate-200 px-5 py-3">Order</th>
                  <th className="border-b border-slate-200 px-5 py-3">Method</th>
                  <th className="border-b border-slate-200 px-5 py-3">Status</th>
                  <th className="border-b border-slate-200 px-5 py-3">Amount</th>
                  <th className="border-b border-slate-200 px-5 py-3">Paid At</th>
                  <th className="border-b border-slate-200 px-5 py-3 text-right sm:px-6">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((item) => (
                  <tr key={item.id} className="text-sm text-slate-700">
                    <td className="border-b border-slate-100 px-5 py-4 align-top sm:px-6">
                      <div className="font-semibold text-slate-900">{item.paymentNumber}</div>
                      <div className="mt-1 text-xs text-slate-500">{item.id}</div>
                    </td>

                    <td className="border-b border-slate-100 px-5 py-4 align-top">
                      <div className="font-medium text-slate-900">{item.orderNumber ?? '-'}</div>
                      {item.receiptNumber ? (
                        <div className="mt-1 text-xs text-indigo-600">
                          Receipt: {item.receiptNumber}
                        </div>
                      ) : (
                        <div className="mt-1 text-xs text-slate-400">Belum ada receipt</div>
                      )}
                    </td>

                    <td className="border-b border-slate-100 px-5 py-4 align-top">
                      {getMethodLabel(item.method)}
                    </td>

                    <td className="border-b border-slate-100 px-5 py-4 align-top">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${getStatusBadgeClass(
                          item.status,
                        )}`}
                      >
                        {item.status}
                      </span>
                    </td>

                    <td className="border-b border-slate-100 px-5 py-4 align-top">
                      <div className="font-semibold text-slate-900">
                        {formatPaymentCurrency(item.amountPaid)}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        Tendered {formatPosCurrency(item.amountTendered)}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        Change {formatPosCurrency(item.changeAmount)}
                      </div>
                    </td>

                    <td className="border-b border-slate-100 px-5 py-4 align-top">
                      {formatPaymentDateTime(item.paidAt || item.createdAt)}
                    </td>

                    <td className="border-b border-slate-100 px-5 py-4 align-top text-right sm:px-6">
                      {item.receiptId ? (
                        <Link
                          href={`/dashboard/receipts/${item.receiptId}`}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          <FontAwesomeIcon icon={faArrowRight} className="h-3.5 w-3.5" />
                          Buka Receipt
                        </Link>
                      ) : (
                        <span className="inline-flex h-10 items-center justify-center rounded-2xl bg-slate-100 px-4 text-xs font-semibold text-slate-500">
                          No Receipt
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
