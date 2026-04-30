'use client';

import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faClock,
  faMagnifyingGlass,
  faReceipt,
  faRotateRight,
  faStore,
  faTruck,
} from '@fortawesome/free-solid-svg-icons';

import { api } from '@/lib/api';
import { getActiveOutletId, setActiveOutletId } from '@/lib/auth';
import type { Outlet } from '@/types/outlet';
import type { Supplier } from '@/types/supplier';
import type {
  SupplierPayableAgingBucket,
  SupplierPayablesReport,
} from '@/types/report';

type OutletListEnvelope = {
  items?: Outlet[];
};

function getTodayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function getMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || 'Gagal memuat laporan payable';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Terjadi kesalahan';
}

function formatDate(value: string | null) {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
  }).format(new Date(value));
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function getAgingTone(bucket: SupplierPayableAgingBucket['key']) {
  if (bucket === 'CURRENT') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  if (bucket === 'DUE_1_30') {
    return 'border-amber-200 bg-amber-50 text-amber-700';
  }

  if (bucket === 'DUE_31_60') {
    return 'border-orange-200 bg-orange-50 text-orange-700';
  }

  if (bucket === 'DUE_61_90') {
    return 'border-red-200 bg-red-50 text-red-700';
  }

  return 'border-red-300 bg-red-100 text-red-800';
}

export default function SupplierPayablesReportPage() {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [scope, setScope] = useState<'business' | 'outlet'>('outlet');
  const [selectedOutletId, setSelectedOutletId] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [asOfDate, setAsOfDate] = useState(getTodayInputValue());
  const [report, setReport] = useState<SupplierPayablesReport | null>(null);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function fetchMeta() {
    try {
      setLoadingMeta(true);

      const [outletResponse, supplierResponse] = await Promise.all([
        api.get('/business/outlets', {
          params: {
            status: 'ACTIVE',
            perPage: 100,
          },
        }),
        api.get('/suppliers', {
          params: {
            status: 'ACTIVE',
            perPage: 100,
          },
        }),
      ]);

      const outletPayload = outletResponse.data?.data as OutletListEnvelope | Outlet[];
      const outletItems = Array.isArray(outletPayload)
        ? outletPayload
        : Array.isArray(outletPayload?.items)
          ? outletPayload.items
          : [];

      setOutlets(outletItems);
      setSuppliers(
        Array.isArray(supplierResponse.data?.data) ? supplierResponse.data.data : [],
      );

      const storedOutletId = getActiveOutletId();
      const resolvedOutletId =
        outletItems.find((item) => item.id === storedOutletId)?.id ||
        outletItems[0]?.id ||
        '';

      setSelectedOutletId(resolvedOutletId);

      if (resolvedOutletId) {
        setActiveOutletId(resolvedOutletId);
      }
    } catch (error: unknown) {
      setMessage(getMessage(error));
    } finally {
      setLoadingMeta(false);
    }
  }

  async function loadReport() {
    if (scope === 'outlet' && !selectedOutletId) {
      setMessage('Pilih outlet terlebih dahulu.');
      return;
    }

    try {
      setLoading(true);
      setMessage('');

      const params: Record<string, string> = {
        scope,
        asOfDate,
        perPage: '100',
      };

      if (scope === 'outlet' && selectedOutletId) {
        params.outletId = selectedOutletId;
      }

      if (selectedSupplierId) {
        params.supplierId = selectedSupplierId;
      }

      const response = await api.get('/reports/supplier-payables', { params });
      setReport(response.data?.data ?? null);
    } catch (error: unknown) {
      setMessage(getMessage(error));
      setReport(null);
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setScope('outlet');
    setSelectedSupplierId('');
    setAsOfDate(getTodayInputValue());

    const storedOutletId = getActiveOutletId();
    const resolvedOutletId =
      outlets.find((item) => item.id === storedOutletId)?.id ||
      outlets[0]?.id ||
      '';
    setSelectedOutletId(resolvedOutletId);
  }

  useEffect(() => {
    void fetchMeta();
  }, []);

  useEffect(() => {
    if (!loadingMeta && (scope === 'business' || selectedOutletId)) {
      void loadReport();
    }
  }, [loadingMeta, scope, selectedOutletId, selectedSupplierId, asOfDate]);

  const currentBucket = useMemo(
    () => report?.aging.find((item) => item.key === 'CURRENT') ?? null,
    [report],
  );
  const overdueBuckets = useMemo(
    () => report?.aging.filter((item) => item.key !== 'CURRENT') ?? [],
    [report],
  );

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-700">
            <FontAwesomeIcon icon={faTruck} className="h-3 w-3" />
            Supplier Payable
          </div>

          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
            Payable Aging Report
          </h1>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Pantau outstanding hutang supplier dan bucket aging per tanggal laporan.
          </p>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[160px_220px_220px_180px_auto]">
            <select
              value={scope}
              onChange={(event) =>
                setScope(event.target.value as 'business' | 'outlet')
              }
              className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="outlet">Per Outlet</option>
              <option value="business">Semua Outlet</option>
            </select>

            <select
              value={selectedOutletId}
              onChange={(event) => {
                setSelectedOutletId(event.target.value);
                if (event.target.value) {
                  setActiveOutletId(event.target.value);
                }
              }}
              disabled={scope !== 'outlet'}
              className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <option value="">
                {loadingMeta ? 'Memuat outlet...' : 'Pilih outlet'}
              </option>
              {outlets.map((outlet) => (
                <option key={outlet.id} value={outlet.id}>
                  {outlet.name}
                </option>
              ))}
            </select>

            <select
              value={selectedSupplierId}
              onChange={(event) => setSelectedSupplierId(event.target.value)}
              className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">Semua supplier</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={asOfDate}
              onChange={(event) => setAsOfDate(event.target.value)}
              className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void loadReport()}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                <FontAwesomeIcon icon={faMagnifyingGlass} className="h-4 w-4" />
                Load
              </button>

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

        {message ? (
          <div className="px-5 pt-4 sm:px-6">
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {message}
            </div>
          </div>
        ) : null}

        {!report && !loading ? (
          <div className="px-5 py-12 text-center sm:px-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <FontAwesomeIcon icon={faStore} className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-slate-900">
              Belum ada data report
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Atur filter lalu klik load untuk melihat aging hutang supplier.
            </p>
          </div>
        ) : loading ? (
          <div className="grid gap-3 px-5 py-5 sm:px-6">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-16 animate-pulse rounded-2xl bg-slate-100"
              />
            ))}
          </div>
        ) : report ? (
          <div className="space-y-5 px-5 py-5 sm:px-6">
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">Open Invoice</p>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
                  {report.summary.openInvoiceCount}
                </p>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">Outstanding</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                  {formatCurrency(report.summary.totalOutstanding)}
                </p>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">Overdue Invoice</p>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-red-700">
                  {report.summary.overdueInvoiceCount}
                </p>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">Overdue Outstanding</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-red-700">
                  {formatCurrency(report.summary.overdueOutstanding)}
                </p>
              </div>
            </section>

            <section className="grid gap-4 xl:grid-cols-5">
              {report.aging.map((bucket) => (
                <div
                  key={bucket.key}
                  className={`rounded-3xl border p-5 shadow-sm ${getAgingTone(bucket.key)}`}
                >
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <FontAwesomeIcon icon={faClock} className="h-4 w-4" />
                    {bucket.label}
                  </div>
                  <p className="mt-3 text-3xl font-semibold tracking-tight">
                    {bucket.invoiceCount}
                  </p>
                  <p className="mt-2 text-sm">
                    {formatCurrency(bucket.outstandingAmount)}
                  </p>
                </div>
              ))}
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
                <h2 className="text-base font-semibold text-slate-900">
                  Detail Open Invoice
                </h2>
                <p className="text-sm text-slate-500">
                  Per tanggal {formatDate(report.asOfDate)}.
                </p>
              </div>

              <div className="hidden overflow-x-auto lg:block">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr className="border-b border-slate-200">
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.16em]">
                        Invoice
                      </th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.16em]">
                        Supplier
                      </th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.16em]">
                        Due Date
                      </th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.16em]">
                        Aging
                      </th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.16em]">
                        Outstanding
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.items.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-slate-200 last:border-b-0"
                      >
                        <td className="px-6 py-4">
                          <p className="font-semibold text-slate-900">
                            {item.invoiceNumber}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Invoice: {formatDate(item.invoiceDate)}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {item.goodsReceiptNumber || item.purchaseOrderNumber || item.outletName}
                          </p>
                        </td>

                        <td className="px-6 py-4">
                          <p className="font-medium text-slate-800">
                            {item.supplierName}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {item.supplierCode}
                          </p>
                        </td>

                        <td className="px-6 py-4 text-slate-700">
                          {formatDate(item.dueDate)}
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${item.daysOverdue > 0 ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}
                          >
                            {item.daysOverdue > 0
                              ? `${item.daysOverdue} hari overdue`
                              : 'Belum jatuh tempo'}
                          </span>
                        </td>

                        <td className="px-6 py-4 font-semibold text-slate-900">
                          {formatCurrency(item.outstandingAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-4 p-4 lg:hidden">
                {report.items.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-slate-900">
                          {item.invoiceNumber}
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          {item.supplierName}
                        </p>
                      </div>

                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold ${item.daysOverdue > 0 ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}
                      >
                        {item.daysOverdue > 0 ? `${item.daysOverdue} hari` : 'Current'}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl bg-white px-3 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                          Due Date
                        </p>
                        <p className="mt-2 text-sm font-medium text-slate-800">
                          {formatDate(item.dueDate)}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-white px-3 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                          Outstanding
                        </p>
                        <p className="mt-2 text-sm font-semibold text-slate-900">
                          {formatCurrency(item.outstandingAmount)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-base font-semibold text-slate-900">Current</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Invoice yang belum jatuh tempo.
                </p>
                <p className="mt-4 text-2xl font-semibold text-emerald-700">
                  {currentBucket ? formatCurrency(currentBucket.outstandingAmount) : formatCurrency(0)}
                </p>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-base font-semibold text-slate-900">Overdue Buckets</h2>
                <div className="mt-4 space-y-3">
                  {overdueBuckets.map((bucket) => (
                    <div
                      key={bucket.key}
                      className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm"
                    >
                      <span className="font-medium text-slate-700">{bucket.label}</span>
                      <span className="font-semibold text-slate-900">
                        {formatCurrency(bucket.outstandingAmount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        ) : null}
      </section>
    </div>
  );
}
