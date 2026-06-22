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
  faPrint,
  faReceipt,
  faRotateRight,
  faTrash,
  faWallet,
} from '@fortawesome/free-solid-svg-icons';

import { getReceiptByOrderId, getPosOutlets, getOutletOrderHistory, deleteOrder } from '@/lib/pos';
import type { PosHistoryItem, PosOutletItem } from '@/types/pos';

type OrderStatusFilter = 'ALL' | 'DRAFT' | 'SUBMITTED' | 'IN_PROGRESS' | 'READY' | 'COMPLETED' | 'CANCELLED';
type PaymentStatusFilter = 'ALL' | 'PAID' | 'UNPAID' | 'PARTIAL' | 'CANCELLED' | 'REFUNDED';

function getErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || fallback;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

function getStatusBadgeClass(status: string) {
  switch (status) {
    case 'COMPLETED':
    case 'PAID':
      return 'border border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'CANCELLED':
      return 'border border-rose-200 bg-rose-50 text-rose-700';
    case 'READY':
      return 'border border-sky-200 bg-sky-50 text-sky-700';
    case 'IN_PROGRESS':
    case 'PARTIAL':
      return 'border border-amber-200 bg-amber-50 text-amber-700';
    case 'DRAFT':
      return 'border border-slate-200 bg-slate-100 text-slate-600';
    case 'SUBMITTED':
      return 'border border-indigo-200 bg-indigo-50 text-indigo-700';
    default:
      return 'border border-slate-200 bg-slate-100 text-slate-700';
  }
}

function formatOrderCurrency(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatOrderDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export default function PosOrderHistoryPage() {
  const router = useRouter();

  const [outlets, setOutlets] = useState<PosOutletItem[]>([]);
  const [selectedOutletId, setSelectedOutletId] = useState('');
  const [items, setItems] = useState<PosHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [openLoadingId, setOpenLoadingId] = useState('');
  const [printLoadingId, setPrintLoadingId] = useState('');
  const [deleteLoadingId, setDeleteLoadingId] = useState('');
  const [orderStatus, setOrderStatus] = useState<OrderStatusFilter>('ALL');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatusFilter>('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const totalAmount = useMemo(
    () => items.reduce((sum, item) => sum + item.totalAmount, 0),
    [items],
  );

  async function loadOutlets() {
    const response = await getPosOutlets();
    const outletItems = response.items;

    setOutlets(outletItems);

    if (outletItems.length === 0) {
      setSelectedOutletId('');
      setLoading(false);
      return;
    }

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

  async function loadOrders(
    outletId: string,
    opts: {
      search?: string;
      orderStatus: OrderStatusFilter;
      paymentStatus: PaymentStatusFilter;
      dateFrom: string;
      dateTo: string;
    },
  ) {
    if (!outletId) {
      setItems([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setMessage('');

      const response = await getOutletOrderHistory({
        outletId,
        perPage: 50,
        search: opts.search?.trim() || undefined,
        status: opts.orderStatus !== 'ALL' ? (opts.orderStatus as PosHistoryItem['status']) : undefined,
        paymentStatus: opts.paymentStatus !== 'ALL' ? (opts.paymentStatus as PosHistoryItem['paymentStatus']) : undefined,
        dateFrom: opts.dateFrom || undefined,
        dateTo: opts.dateTo || undefined,
      });

      setItems(response.items);
    } catch (error: unknown) {
      setMessage(getErrorMessage(error, 'Gagal memuat histori transaksi'));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function initialize() {
      try {
        setLoading(true);
        setMessage('');
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

    void loadOrders(selectedOutletId, { search: searchKeyword, orderStatus, paymentStatus, dateFrom, dateTo });
  }, [selectedOutletId, searchKeyword, orderStatus, paymentStatus, dateFrom, dateTo]);

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearchKeyword(searchInput.trim());
  }

  function handleReset() {
    setSearchInput('');
    setSearchKeyword('');
    setOrderStatus('ALL');
    setPaymentStatus('ALL');
    setDateFrom('');
    setDateTo('');
  }

  async function handleOpenReceipt(order: PosHistoryItem) {
    if (!selectedOutletId) {
      setMessage('Pilih outlet aktif terlebih dahulu');
      return;
    }

    try {
      setOpenLoadingId(order.id);
      setMessage('');

      const receipt = await getReceiptByOrderId(order.id, selectedOutletId);
      router.push(`/dashboard/receipts/${receipt.id}`);
    } catch (error: unknown) {
      setMessage(getErrorMessage(error, 'Receipt untuk order ini belum tersedia'));
    } finally {
      setOpenLoadingId('');
    }
  }

  async function handlePrintReceipt(order: PosHistoryItem) {
    if (!selectedOutletId) {
      setMessage('Pilih outlet aktif terlebih dahulu');
      return;
    }

    try {
      setPrintLoadingId(order.id);
      setMessage('');

      const receipt = await getReceiptByOrderId(order.id, selectedOutletId);
      window.open(`/dashboard/receipts/${receipt.id}`, '_blank', 'noopener,noreferrer');
    } catch (error: unknown) {
      setMessage(getErrorMessage(error, 'Receipt untuk order ini belum tersedia'));
    } finally {
      setPrintLoadingId('');
    }
  }

  async function handleDeleteOrder(order: PosHistoryItem) {
    if (!selectedOutletId) {
      setMessage('Pilih outlet aktif terlebih dahulu');
      return;
    }

    if (!confirm(`Hapus order ${order.orderNumber}? Tindakan ini tidak bisa dibatalkan.`)) {
      return;
    }

    try {
      setDeleteLoadingId(order.id);
      setMessage('');

      await deleteOrder(order.id, selectedOutletId);
      setItems((prev) => prev.filter((item) => item.id !== order.id));
    } catch (error: unknown) {
      setMessage(getErrorMessage(error, 'Gagal menghapus order'));
    } finally {
      setDeleteLoadingId('');
    }
  }

  const hasActiveFilter =
    searchKeyword || orderStatus !== 'ALL' || paymentStatus !== 'ALL' || dateFrom || dateTo;

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-700">
              <FontAwesomeIcon icon={faClockRotateLeft} className="h-3 w-3" />
              Order History
            </div>

            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
              Histori Transaksi Outlet
            </h1>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Riwayat order per outlet aktif. Buka receipt lama atau print ulang dengan aman dari sini.
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
              href="/dashboard/payments/history"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <FontAwesomeIcon icon={faWallet} className="h-4 w-4" />
              Payment History
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
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Status Order
              </label>
              <select
                value={orderStatus}
                onChange={(event) => setOrderStatus(event.target.value as OrderStatusFilter)}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="ALL">Semua Status</option>
                <option value="DRAFT">Draft</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="READY">Ready</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Status Pembayaran
              </label>
              <select
                value={paymentStatus}
                onChange={(event) => setPaymentStatus(event.target.value as PaymentStatusFilter)}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="ALL">Semua Status</option>
                <option value="PAID">Paid</option>
                <option value="UNPAID">Unpaid</option>
                <option value="PARTIAL">Partial</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="REFUNDED">Refunded</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Dari Tanggal
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
                max={dateTo || undefined}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Sampai Tanggal
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
                min={dateFrom || undefined}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <form onSubmit={handleSearchSubmit} className="flex flex-col">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Cari histori transaksi
              </label>
              <div className="flex flex-1 gap-2">
                <div className="relative flex-1">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                    <FontAwesomeIcon icon={faMagnifyingGlass} className="h-4 w-4" />
                  </span>
                  <input
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="Cari nomor order..."
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Cari
                </button>
              </div>
            </form>
          </div>

          {hasActiveFilter ? (
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-slate-500">
                Filter aktif — menampilkan {items.length} hasil
              </p>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
              >
                <FontAwesomeIcon icon={faRotateRight} className="h-3 w-3" />
                Reset semua filter
              </button>
            </div>
          ) : null}
        </div>

        {loading ? (
          <div className="grid gap-3 px-5 py-5 sm:px-6">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="h-24 animate-pulse rounded-2xl bg-slate-100"
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="px-5 py-12 text-center sm:px-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <FontAwesomeIcon icon={faReceipt} className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-slate-900">
              Belum ada histori transaksi
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Belum ada order untuk outlet aktif ini.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 p-5 sm:px-6 sm:py-5">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">
                          {item.orderNumber}
                        </p>

                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${getStatusBadgeClass(
                            item.status,
                          )}`}
                        >
                          {item.status}
                        </span>

                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${getStatusBadgeClass(
                            item.paymentStatus,
                          )}`}
                        >
                          {item.paymentStatus}
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-500">
                        <span>{item.outletName || '-'}</span>
                        {item.tableName ? <span>• {item.tableName}</span> : null}
                        <span>• {item.itemCount} item</span>
                        <span>• {formatOrderDateTime(item.createdAt)}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Total
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {formatOrderCurrency(item.totalAmount)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Subtotal: {formatOrderCurrency(item.subtotal)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {item.status === 'DRAFT' ? (
                      <button
                        type="button"
                        onClick={() => void handleDeleteOrder(item)}
                        disabled={deleteLoadingId === item.id}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <FontAwesomeIcon icon={faTrash} className="h-4 w-4" />
                        {deleteLoadingId === item.id ? 'Menghapus...' : 'Hapus Draft'}
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => void handleOpenReceipt(item)}
                          disabled={openLoadingId === item.id}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <FontAwesomeIcon icon={faEye} className="h-4 w-4" />
                          {openLoadingId === item.id ? 'Membuka...' : 'Buka Receipt'}
                        </button>

                        <button
                          type="button"
                          onClick={() => void handlePrintReceipt(item)}
                          disabled={printLoadingId === item.id}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <FontAwesomeIcon icon={faPrint} className="h-4 w-4" />
                          {printLoadingId === item.id ? 'Memuat...' : 'Print Ulang'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-200 px-5 py-4 sm:px-6">
              <div className="flex items-center justify-between rounded-2xl bg-slate-900 px-4 py-4 text-white">
                <span className="text-sm font-medium">Total Transaksi Tampil</span>
                <span className="text-lg font-semibold">
                  {formatOrderCurrency(totalAmount)}
                </span>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
