'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChevronLeft,
  faChevronRight,
  faCircleCheck,
  faClockRotateLeft,
  faMoneyBillTransfer,
  faReceipt,
  faStore,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';

import { api } from '@/lib/api';
import { getActiveOutletId, setActiveOutletId } from '@/lib/auth';
import type { Outlet } from '@/types/outlet';
import type {
  SupplierCreditDetail,
  SupplierCreditListMeta,
  SupplierCreditStatus,
  SupplierCreditSummary,
} from '@/types/supplier-credit';
import type { SupplierPaymentMethod } from '@/types/supplier-invoice';

const PER_PAGE = 20;

type StatusFilter = 'ALL' | SupplierCreditStatus;

type OutletListEnvelope = {
  items?: Outlet[];
};

type RefundForm = {
  amount: string;
  method: SupplierPaymentMethod;
  refundDate: string;
  referenceNumber: string;
  note: string;
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

function formatCurrency(value: string) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(value || '0'));
}

function formatDate(value: string | null) {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
  }).format(new Date(value));
}

function getTodayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function getStatusBadgeClass(status: SupplierCreditStatus) {
  return status === 'OPEN'
    ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
    : 'border border-slate-200 bg-slate-100 text-slate-600';
}

function buildEmptyRefundForm(remainingAmount: string): RefundForm {
  return {
    amount: remainingAmount,
    method: 'TRANSFER',
    refundDate: getTodayInputValue(),
    referenceNumber: '',
    note: '',
  };
}

export default function SupplierCreditListPage() {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [selectedOutletId, setSelectedOutletId] = useState('');
  const [loadingOutlets, setLoadingOutlets] = useState(true);
  const [items, setItems] = useState<SupplierCreditSummary[]>([]);
  const [meta, setMeta] = useState<SupplierCreditListMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('OPEN');
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');

  const [detail, setDetail] = useState<SupplierCreditDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [refundForm, setRefundForm] = useState<RefundForm>(buildEmptyRefundForm('0'));
  const [refundLoading, setRefundLoading] = useState(false);

  async function fetchOutlets() {
    try {
      setLoadingOutlets(true);
      const response = await api.get('/business/outlets', {
        params: {
          status: 'ACTIVE',
          perPage: 100,
        },
      });

      const payload = response.data?.data as OutletListEnvelope | Outlet[];
      const outletItems = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.items)
          ? payload.items
          : [];

      setOutlets(outletItems);

      const storedOutletId = getActiveOutletId();
      const resolvedOutletId =
        outletItems.find((item) => item.id === storedOutletId)?.id ||
        outletItems[0]?.id ||
        '';

      setSelectedOutletId(resolvedOutletId);

      if (resolvedOutletId) {
        setActiveOutletId(resolvedOutletId);
      }
    } catch {
      setOutlets([]);
      setSelectedOutletId('');
    } finally {
      setLoadingOutlets(false);
    }
  }

  async function fetchData(targetPage = page) {
    if (!selectedOutletId) {
      setItems([]);
      setMeta(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const params: Record<string, string | number> = {
        outletId: selectedOutletId,
        page: targetPage,
        perPage: PER_PAGE,
      };

      if (statusFilter !== 'ALL') {
        params.status = statusFilter;
      }

      const response = await api.get('/supplier-credits', { params });
      setItems(Array.isArray(response.data?.data) ? response.data.data : []);
      setMeta(response.data?.meta ?? null);
    } catch (error: unknown) {
      setItems([]);
      setMessage(getMessage(error, 'Gagal memuat kredit supplier'));
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  }

  async function openDetail(creditId: string) {
    if (!selectedOutletId) {
      return;
    }

    try {
      setDetailLoading(true);
      const response = await api.get(`/supplier-credits/${creditId}`, {
        params: { outletId: selectedOutletId },
      });
      const nextDetail = response.data.data as SupplierCreditDetail;
      setDetail(nextDetail);
      setRefundForm(buildEmptyRefundForm(nextDetail.remainingAmount));
    } catch (error: unknown) {
      setMessage(getMessage(error, 'Gagal memuat detail kredit supplier'));
      setMessageType('error');
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleRefund(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!detail || detail.status !== 'OPEN') {
      return;
    }

    const amount = Number(refundForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage('Jumlah refund harus lebih besar dari 0.');
      setMessageType('error');
      return;
    }

    if (amount > Number(detail.remainingAmount)) {
      setMessage('Jumlah refund melebihi sisa kredit supplier.');
      setMessageType('error');
      return;
    }

    try {
      setRefundLoading(true);
      setMessage('');
      setMessageType('');

      const response = await api.post(`/supplier-credits/${detail.id}/refunds`, {
        outletId: detail.outletId,
        amount,
        method: refundForm.method,
        refundDate: refundForm.refundDate,
        referenceNumber: refundForm.referenceNumber.trim() || undefined,
        note: refundForm.note.trim() || undefined,
      });

      const nextDetail = response.data.data as SupplierCreditDetail;
      setDetail(nextDetail);
      setRefundForm(buildEmptyRefundForm(nextDetail.remainingAmount));
      setMessage('Refund kredit supplier berhasil dicatat');
      setMessageType('success');
      await fetchData(page);
    } catch (error: unknown) {
      setMessage(getMessage(error, 'Gagal mencatat refund kredit supplier'));
      setMessageType('error');
    } finally {
      setRefundLoading(false);
    }
  }

  function handleChangeOutlet(outletId: string) {
    setSelectedOutletId(outletId);
    setDetail(null);
    setPage(1);
    if (outletId) {
      setActiveOutletId(outletId);
    }
  }

  function handlePageChange(newPage: number) {
    setPage(newPage);
    void fetchData(newPage);
  }

  useEffect(() => {
    void fetchOutlets();
  }, []);

  useEffect(() => {
    setPage(1);
    void fetchData(1);
  }, [selectedOutletId, statusFilter]);

  const canRefund = detail?.status === 'OPEN' && Number(detail.remainingAmount) > 0;

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-700">
            <FontAwesomeIcon icon={faReceipt} className="h-3 w-3" />
            Supplier Payable
          </div>

          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
            Supplier Credits
          </h1>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Kelebihan bayar ke supplier (misalnya retur setelah invoice lunas). Bisa direfund
            atau dipakai untuk membayar invoice supplier yang sama.
          </p>
        </div>

        <Link
          href="/dashboard/supplier-invoices"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Supplier Invoices
        </Link>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Sisa Kredit Terbuka</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-emerald-600">
            {loading ? '-' : formatCurrency(meta?.totalOpenRemainingAmount ?? '0')}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Jumlah Kredit</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
            {loading ? '-' : (meta?.total ?? items.length)}
          </p>
        </div>
      </section>

      {message ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            messageType === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {message}
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <h2 className="text-base font-semibold text-slate-900">Daftar Kredit Supplier</h2>

            <div className="grid gap-3 sm:grid-cols-2">
              <select
                value={selectedOutletId}
                onChange={(event) => handleChangeOutlet(event.target.value)}
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">
                  {loadingOutlets ? 'Memuat outlet...' : 'Pilih outlet'}
                </option>
                {outlets.map((outlet) => (
                  <option key={outlet.id} value={outlet.id}>
                    {outlet.name}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="OPEN">Masih ada saldo</option>
                <option value="CLOSED">Sudah habis</option>
                <option value="ALL">Semua Status</option>
              </select>
            </div>
          </div>

          {!selectedOutletId && !loadingOutlets ? (
            <div className="px-5 py-12 text-center sm:px-6">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                <FontAwesomeIcon icon={faStore} className="h-5 w-5" />
              </div>
              <p className="mt-4 text-sm text-slate-500">
                Pilih outlet terlebih dahulu untuk melihat kredit supplier.
              </p>
            </div>
          ) : loading ? (
            <div className="grid gap-3 px-5 py-5 sm:px-6">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-16 animate-pulse rounded-2xl bg-slate-100" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-slate-500 sm:px-6">
              Belum ada kredit supplier untuk filter ini.
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => void openDetail(item.id)}
                  className={`flex w-full flex-col gap-2 px-5 py-4 text-left transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between sm:px-6 ${
                    detail?.id === item.id ? 'bg-indigo-50/60' : ''
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-900">{item.creditNumber}</p>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${getStatusBadgeClass(item.status)}`}
                      >
                        {item.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{item.supplierName}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      Dari {item.sourceSupplierInvoiceNumber || '-'}
                      {item.purchaseReturnNumber ? ` • Retur ${item.purchaseReturnNumber}` : ''}
                      {' • '}
                      {formatDate(item.createdAt)}
                    </p>
                  </div>

                  <div className="shrink-0 text-left sm:text-right">
                    <p className="text-sm font-semibold text-emerald-700">
                      Sisa {formatCurrency(item.remainingAmount)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      dari {formatCurrency(item.amount)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4 sm:px-6">
              <p className="text-sm text-slate-500">
                Halaman {meta.page} dari {meta.totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={meta.page <= 1}
                  onClick={() => handlePageChange(meta.page - 1)}
                  className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <FontAwesomeIcon icon={faChevronLeft} className="h-3 w-3" />
                  Prev
                </button>
                <button
                  type="button"
                  disabled={meta.page >= meta.totalPages}
                  onClick={() => handlePageChange(meta.page + 1)}
                  className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                  <FontAwesomeIcon icon={faChevronRight} className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}
        </section>

        <aside className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          {detailLoading ? (
            <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />
          ) : !detail ? (
            <div className="py-10 text-center text-sm text-slate-500">
              Pilih kredit dari daftar untuk melihat riwayat dan mencatat refund.
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">{detail.creditNumber}</h2>
                  <p className="mt-1 text-sm text-slate-500">{detail.supplierName}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setDetail(null)}
                  className="text-slate-400 transition hover:text-slate-600"
                  aria-label="Tutup detail"
                >
                  <FontAwesomeIcon icon={faXmark} />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="rounded-2xl bg-slate-50 px-3 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Kredit</p>
                  <p className="mt-1 font-semibold text-slate-900">{formatCurrency(detail.amount)}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-3 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Terpakai</p>
                  <p className="mt-1 font-semibold text-slate-900">{formatCurrency(detail.usedAmount)}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-3 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Sisa</p>
                  <p className="mt-1 font-semibold text-emerald-700">{formatCurrency(detail.remainingAmount)}</p>
                </div>
              </div>

              {detail.sourceSupplierInvoiceId ? (
                <p className="text-xs text-slate-500">
                  Sumber:{' '}
                  <Link
                    href={`/dashboard/supplier-invoices/${detail.sourceSupplierInvoiceId}/edit`}
                    className="font-semibold text-indigo-600 hover:text-indigo-700"
                  >
                    {detail.sourceSupplierInvoiceNumber}
                  </Link>
                  {detail.notes ? ` — ${detail.notes}` : ''}
                </p>
              ) : null}

              {canRefund ? (
                <form onSubmit={handleRefund} className="space-y-3 rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <FontAwesomeIcon icon={faMoneyBillTransfer} className="h-4 w-4 text-slate-500" />
                    Catat Refund dari Supplier
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="space-y-1 text-sm">
                      <span className="block font-medium text-slate-700">Jumlah</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={refundForm.amount}
                        onChange={(event) =>
                          setRefundForm((prev) => ({ ...prev, amount: event.target.value }))
                        }
                        disabled={refundLoading}
                        className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-70"
                      />
                    </label>

                    <label className="space-y-1 text-sm">
                      <span className="block font-medium text-slate-700">Tanggal</span>
                      <input
                        type="date"
                        value={refundForm.refundDate}
                        onChange={(event) =>
                          setRefundForm((prev) => ({ ...prev, refundDate: event.target.value }))
                        }
                        disabled={refundLoading}
                        className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-70"
                      />
                    </label>

                    <label className="space-y-1 text-sm">
                      <span className="block font-medium text-slate-700">Metode</span>
                      <select
                        value={refundForm.method}
                        onChange={(event) =>
                          setRefundForm((prev) => ({
                            ...prev,
                            method: event.target.value as SupplierPaymentMethod,
                          }))
                        }
                        disabled={refundLoading}
                        className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-70"
                      >
                        <option value="TRANSFER">TRANSFER</option>
                        <option value="CASH">CASH</option>
                        <option value="CARD">CARD</option>
                        <option value="QRIS">QRIS</option>
                        <option value="OTHER">OTHER</option>
                      </select>
                    </label>

                    <label className="space-y-1 text-sm">
                      <span className="block font-medium text-slate-700">No. Referensi</span>
                      <input
                        value={refundForm.referenceNumber}
                        onChange={(event) =>
                          setRefundForm((prev) => ({ ...prev, referenceNumber: event.target.value }))
                        }
                        disabled={refundLoading}
                        className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-70"
                      />
                    </label>
                  </div>

                  <label className="block space-y-1 text-sm">
                    <span className="block font-medium text-slate-700">Catatan</span>
                    <textarea
                      rows={2}
                      value={refundForm.note}
                      onChange={(event) =>
                        setRefundForm((prev) => ({ ...prev, note: event.target.value }))
                      }
                      disabled={refundLoading}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-indigo-500 disabled:opacity-70"
                    />
                  </label>

                  <button
                    type="submit"
                    disabled={refundLoading}
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <FontAwesomeIcon icon={faCircleCheck} className="h-4 w-4" />
                    {refundLoading ? 'Menyimpan...' : 'Simpan Refund'}
                  </button>
                  <p className="text-xs text-slate-500">
                    Untuk memotong invoice lain, buka detail invoice supplier yang sama lalu pilih
                    &quot;Pakai Kredit Supplier&quot;.
                  </p>
                </form>
              ) : (
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  Kredit ini sudah habis dipakai.
                </div>
              )}

              <div className="space-y-2">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <FontAwesomeIcon icon={faClockRotateLeft} className="h-3.5 w-3.5 text-slate-500" />
                  Riwayat Pemakaian
                </h3>

                {detail.usages.length === 0 ? (
                  <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    Belum ada pemakaian.
                  </div>
                ) : (
                  detail.usages.map((usage) => (
                    <div key={usage.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-900">{usage.usageNumber}</p>
                        <p className="text-sm font-semibold text-slate-900">{formatCurrency(usage.amount)}</p>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {usage.type === 'REFUND'
                          ? `Refund ${usage.method ?? ''}`
                          : `Dipakai untuk ${usage.supplierInvoiceNumber ?? 'invoice'}`}
                        {' • '}
                        {formatDate(usage.usageDate)}
                      </p>
                      {usage.referenceNumber || usage.note ? (
                        <p className="mt-1 text-xs text-slate-500">
                          {[usage.referenceNumber, usage.note].filter(Boolean).join(' — ')}
                        </p>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
