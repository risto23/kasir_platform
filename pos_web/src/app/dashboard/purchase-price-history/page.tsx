'use client';

import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBoxesStacked,
  faChartLine,
  faMagnifyingGlass,
  faReceipt,
  faRotateRight,
  faStore,
  faTruck,
} from '@fortawesome/free-solid-svg-icons';

import { api } from '@/lib/api';
import { getActiveOutletId, setActiveOutletId } from '@/lib/auth';
import type { Outlet } from '@/types/outlet';
import type { Product } from '@/types/product';
import type { PurchasePriceHistoryItem } from '@/types/purchase-price-history';
import type { Supplier } from '@/types/supplier';

type OutletListEnvelope = {
  items?: Outlet[];
};

function getMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || 'Gagal memuat histori harga beli';
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

function formatQuantity(value: string) {
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(Number(value || '0'));
}

export default function PurchasePriceHistoryPage() {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [items, setItems] = useState<PurchasePriceHistoryItem[]>([]);
  const [selectedOutletId, setSelectedOutletId] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [message, setMessage] = useState('');

  async function fetchMeta() {
    try {
      setLoadingMeta(true);

      const [outletResponse, supplierResponse, productResponse] =
        await Promise.all([
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
          api.get('/business/products', {
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
      setProducts(
        Array.isArray(productResponse.data?.data) ? productResponse.data.data : [],
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
      setOutlets([]);
      setSuppliers([]);
      setProducts([]);
      setSelectedOutletId('');
    } finally {
      setLoadingMeta(false);
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
        perPage: '100',
      };

      if (search.trim()) {
        params.search = search.trim();
      }

      if (selectedSupplierId) {
        params.supplierId = selectedSupplierId;
      }

      if (selectedProductId) {
        params.productId = selectedProductId;
      }

      if (dateFrom) {
        params.dateFrom = dateFrom;
      }

      if (dateTo) {
        params.dateTo = dateTo;
      }

      const response = await api.get('/purchase-price-history', { params });
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
    setSelectedSupplierId('');
    setSelectedProductId('');
    setDateFrom('');
    setDateTo('');
  }

  function handleChangeOutlet(outletId: string) {
    setSelectedOutletId(outletId);
    if (outletId) {
      setActiveOutletId(outletId);
    }
  }

  useEffect(() => {
    void fetchMeta();
  }, []);

  useEffect(() => {
    void fetchData();
  }, [selectedOutletId, selectedSupplierId, selectedProductId, dateFrom, dateTo, search]);

  const totalRecords = items.length;
  const totalQuantity = useMemo(
    () => items.reduce((total, item) => total + Number(item.quantity || '0'), 0),
    [items],
  );
  const totalProducts = useMemo(
    () => new Set(items.map((item) => item.productId)).size,
    [items],
  );
  const totalSuppliers = useMemo(
    () => new Set(items.map((item) => item.supplierId)).size,
    [items],
  );

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-700">
            <FontAwesomeIcon icon={faChartLine} className="h-3 w-3" />
            Procurement Analytics
          </div>

          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
            Purchase Price History
          </h1>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Lihat histori harga beli yang tercatat dari goods receipt per outlet.
          </p>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Total Record</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
            {loading ? '-' : totalRecords}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Total Qty</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
            {loading ? '-' : formatQuantity(String(totalQuantity))}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Produk</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
            {loading ? '-' : totalProducts}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Supplier</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
            {loading ? '-' : totalSuppliers}
          </p>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-end 2xl:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Histori Harga Beli
              </h2>
              <p className="text-sm text-slate-500">
                Sumber data dari goods receipt yang sudah diposting.
              </p>
            </div>

            <form
              onSubmit={handleSearchSubmit}
              className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-[190px_190px_190px_160px_160px_minmax(0,1fr)_auto]"
            >
              <select
                value={selectedOutletId}
                onChange={(event) => handleChangeOutlet(event.target.value)}
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
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

              <select
                value={selectedProductId}
                onChange={(event) => setSelectedProductId(event.target.value)}
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">Semua product</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>

              <input
                type="date"
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />

              <input
                type="date"
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />

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
                  placeholder="Cari product, supplier, receipt, invoice"
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

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

        {!selectedOutletId && !loadingMeta ? (
          <div className="px-5 py-12 text-center sm:px-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <FontAwesomeIcon icon={faStore} className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-slate-900">
              Outlet belum dipilih
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Pilih outlet terlebih dahulu untuk melihat histori harga beli.
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
              <FontAwesomeIcon icon={faBoxesStacked} className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-slate-900">
              Belum ada histori harga beli
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Histori akan muncul dari goods receipt yang sudah diposting.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr className="border-b border-slate-200">
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.16em]">
                      Tanggal
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.16em]">
                      Product
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.16em]">
                      Supplier
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.16em]">
                      Receipt
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.16em]">
                      Qty
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.16em]">
                      Unit Cost
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-slate-200 last:border-b-0"
                    >
                      <td className="px-6 py-4 text-slate-700">
                        <p>{formatDate(item.effectiveDate)}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          {item.outletName}
                        </p>
                      </td>

                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-900">
                          {item.productName}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {item.productCode || item.productSku || item.productBarcode || '-'}
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
                        <p>{item.receiptNumber}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          {item.supplierInvoiceNumber || 'Tanpa invoice supplier'}
                        </p>
                      </td>

                      <td className="px-6 py-4 font-medium text-slate-900">
                        {formatQuantity(item.quantity)} {item.unit || ''}
                      </td>

                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {formatCurrency(item.unitCost)}
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
                        {item.productName}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {item.supplierName}
                      </p>
                    </div>

                    <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                      {formatDate(item.effectiveDate)}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-white px-3 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Receipt
                      </p>
                      <p className="mt-2 text-sm font-medium text-slate-800">
                        {item.receiptNumber}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white px-3 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Unit Cost
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {formatCurrency(item.unitCost)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 rounded-2xl bg-white px-3 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Quantity
                    </p>
                    <p className="mt-2 text-sm text-slate-700">
                      {formatQuantity(item.quantity)} {item.unit || ''}
                    </p>
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
              Catatan Histori
            </h2>
            <p className="text-sm text-slate-500">
              Histori harga beli terbentuk otomatis saat goods receipt diposting.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[
            'Harga beli tidak mencampur harga jual POS.',
            'Data ini berasal dari goods receipt yang sudah posted.',
            'Perubahan harga supplier akan terlihat per tanggal receipt.',
            'Filter outlet tetap dipertahankan supaya analisis per cabang rapi.',
            'Histori ini bisa jadi dasar laporan supplier dan costing tahap berikutnya.',
            'Draft goods receipt belum masuk histori sebelum diposting.',
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
