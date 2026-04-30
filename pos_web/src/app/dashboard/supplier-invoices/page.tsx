'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowRight,
  faMagnifyingGlass,
  faPenToSquare,
  faPlus,
  faReceipt,
  faRotateRight,
  faStore,
  faTruck,
} from '@fortawesome/free-solid-svg-icons';

import { api } from '@/lib/api';
import { getActiveOutletId, setActiveOutletId } from '@/lib/auth';
import type { Outlet } from '@/types/outlet';
import type {
  SupplierInvoiceStatus,
  SupplierInvoiceSummary,
} from '@/types/supplier-invoice';

type StatusFilter = 'ALL' | SupplierInvoiceStatus;

type OutletListEnvelope = {
  items?: Outlet[];
};

function getMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || 'Gagal memuat supplier invoice';
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

function formatCurrency(value: string) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(value || '0'));
}

function getStatusBadgeClass(status: SupplierInvoiceStatus) {
  if (status === 'UNPAID') {
    return 'border border-amber-200 bg-amber-50 text-amber-700';
  }

  if (status === 'PARTIALLY_PAID') {
    return 'border border-sky-200 bg-sky-50 text-sky-700';
  }

  if (status === 'PAID') {
    return 'border border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  return 'border border-red-200 bg-red-50 text-red-700';
}

export default function SupplierInvoiceListPage() {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [selectedOutletId, setSelectedOutletId] = useState('');
  const [items, setItems] = useState<SupplierInvoiceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingOutlets, setLoadingOutlets] = useState(true);
  const [message, setMessage] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');

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

  async function fetchData() {
    if (!selectedOutletId) {
      setItems([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setMessage('');

      const params: Record<string, string> = {
        outletId: selectedOutletId,
      };

      if (search.trim()) {
        params.search = search.trim();
      }

      if (statusFilter !== 'ALL') {
        params.status = statusFilter;
      }

      const response = await api.get('/supplier-invoices', { params });
      setItems(Array.isArray(response.data?.data) ? response.data.data : []);
    } catch (error: unknown) {
      setMessage(getMessage(error));
    } finally {
      setLoading(false);
    }
  }

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearch(searchInput.trim());
  }

  function handleResetFilter() {
    setSearchInput('');
    setSearch('');
    setStatusFilter('ALL');
  }

  function handleChangeOutlet(outletId: string) {
    setSelectedOutletId(outletId);
    if (outletId) {
      setActiveOutletId(outletId);
    }
  }

  useEffect(() => {
    void fetchOutlets();
  }, []);

  useEffect(() => {
    void fetchData();
  }, [selectedOutletId, search, statusFilter]);

  const totalInvoice = items.length;
  const totalOutstanding = useMemo(
    () =>
      items.reduce(
        (total, item) => total + Number(item.outstandingAmount || '0'),
        0,
      ),
    [items],
  );
  const totalPaid = useMemo(
    () => items.filter((item) => item.status === 'PAID').length,
    [items],
  );
  const totalUnpaid = useMemo(
    () =>
      items.filter(
        (item) =>
          item.status === 'UNPAID' || item.status === 'PARTIALLY_PAID',
      ).length,
    [items],
  );

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-700">
            <FontAwesomeIcon icon={faReceipt} className="h-3 w-3" />
            Supplier Payable
          </div>

          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
            Supplier Invoices
          </h1>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Kelola tagihan supplier dan status pembayarannya per outlet.
          </p>
        </div>

        <Link
          href="/dashboard/supplier-invoices/create"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          <FontAwesomeIcon icon={faPlus} className="h-4 w-4" />
          Tambah Invoice
        </Link>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Total Invoice</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
            {loading ? '-' : totalInvoice}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Butuh Dibayar</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-amber-600">
            {loading ? '-' : totalUnpaid}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Lunas</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-emerald-600">
            {loading ? '-' : totalPaid}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Outstanding</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
            {loading ? '-' : formatCurrency(String(totalOutstanding))}
          </p>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Daftar Supplier Invoice
              </h2>
              <p className="text-sm text-slate-500">
                Data invoice supplier berdasarkan outlet aktif.
              </p>
            </div>

            <form
              onSubmit={handleSearchSubmit}
              className="grid gap-3 md:grid-cols-2 xl:grid-cols-[220px_minmax(0,1fr)_180px_auto]"
            >
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

              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                  <FontAwesomeIcon
                    icon={faMagnifyingGlass}
                    className="h-4 w-4"
                  />
                </span>
                <input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Cari invoice, supplier, receipt, atau PO"
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as StatusFilter)
                }
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="ALL">Semua Status</option>
                <option value="UNPAID">UNPAID</option>
                <option value="PARTIALLY_PAID">PARTIALLY PAID</option>
                <option value="PAID">PAID</option>
                <option value="VOID">VOID</option>
              </select>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  <FontAwesomeIcon
                    icon={faMagnifyingGlass}
                    className="h-4 w-4"
                  />
                  Cari
                </button>

                <button
                  type="button"
                  onClick={handleResetFilter}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <FontAwesomeIcon icon={faRotateRight} className="h-4 w-4" />
                  Reset
                </button>
              </div>
            </form>
          </div>
        </div>

        {message ? (
          <div className="px-5 pt-4 sm:px-6">
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {message}
            </div>
          </div>
        ) : null}

        {!selectedOutletId && !loadingOutlets ? (
          <div className="px-5 py-12 text-center sm:px-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <FontAwesomeIcon icon={faStore} className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-slate-900">
              Outlet belum dipilih
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Pilih outlet terlebih dahulu untuk melihat invoice supplier.
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
        ) : items.length === 0 ? (
          <div className="px-5 py-12 text-center sm:px-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <FontAwesomeIcon icon={faTruck} className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-slate-900">
              Belum ada supplier invoice
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Buat invoice supplier pertama untuk outlet ini.
            </p>
            <Link
              href="/dashboard/supplier-invoices/create"
              className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <FontAwesomeIcon icon={faPlus} className="h-4 w-4" />
              Tambah Invoice
            </Link>
          </div>
        ) : (
          <>
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
                      Referensi
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.16em]">
                      Nilai
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.16em]">
                      Status
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-[0.16em]">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
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
                          Jatuh tempo: {formatDate(item.dueDate)}
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
                        <p>{item.goodsReceiptNumber || '-'}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          {item.purchaseOrderNumber || '-'}
                        </p>
                      </td>

                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-900">
                          {formatCurrency(item.grandTotal)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Paid: {formatCurrency(item.paidAmount)}
                        </p>
                        <p className="mt-1 text-xs text-amber-700">
                          Outstanding: {formatCurrency(item.outstandingAmount)}
                        </p>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(
                            item.status,
                          )}`}
                        >
                          {item.status}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/dashboard/supplier-invoices/${item.id}/edit`}
                            className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700 transition hover:bg-sky-100"
                          >
                            <FontAwesomeIcon
                              icon={faPenToSquare}
                              className="h-3.5 w-3.5"
                            />
                            Detail
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-4 p-4 lg:hidden">
              {items.map((item) => (
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
                      className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold ${getStatusBadgeClass(
                        item.status,
                      )}`}
                    >
                      {item.status}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-white px-3 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Grand Total
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {formatCurrency(item.grandTotal)}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white px-3 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Outstanding
                      </p>
                      <p className="mt-2 text-sm font-semibold text-amber-700">
                        {formatCurrency(item.outstandingAmount)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 rounded-2xl bg-white px-3 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Referensi
                    </p>
                    <p className="mt-2 text-sm text-slate-700">
                      {item.goodsReceiptNumber || '-'}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {item.purchaseOrderNumber || '-'}
                    </p>
                  </div>

                  <div className="mt-5">
                    <Link
                      href={`/dashboard/supplier-invoices/${item.id}/edit`}
                      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 text-sm font-semibold text-sky-700 transition hover:bg-sky-100"
                    >
                      <FontAwesomeIcon
                        icon={faPenToSquare}
                        className="h-4 w-4"
                      />
                      Detail
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Catatan Invoice
            </h2>
            <p className="text-sm text-slate-500">
              Tagihan supplier dikelola per outlet aktif.
            </p>
          </div>

          <Link
            href="/dashboard/supplier-invoices/create"
            className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 transition hover:text-indigo-700"
          >
            Buat invoice supplier baru
            <FontAwesomeIcon icon={faArrowRight} className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[
            'Invoice bisa dibuat dari goods receipt atau manual.',
            'Pembayaran invoice akan mengurangi outstanding otomatis.',
            'Invoice yang sudah punya pembayaran tidak bisa diedit lagi di fase ini.',
            'Invoice VOID tidak bisa dibayar.',
            'Status UNPAID, PARTIALLY_PAID, dan PAID diupdate backend.',
            'Harga jual POS tetap tidak tercampur dengan hutang supplier.',
          ].map((note) => (
            <div
              key={note}
              className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600"
            >
              {note}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
