'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBoxOpen,
  faChevronLeft,
  faChevronRight,
  faFilter,
  faRotateRight,
  faXmark,
  faArrowDown,
  faArrowUp,
  faSliders,
} from '@fortawesome/free-solid-svg-icons';

import { fetchStockSummary, postStockIn, postStockOut, postAdjustment } from '../../../lib/inventory';
import type { StockSummaryItem, ProductStatus } from '../../../types/inventory';
import type { Category } from '../../../types/category';
import type { Outlet } from '../../../types/outlet';
import { api } from '../../../lib/api';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';

function getErrorMessage(err: unknown): string {
  if (typeof err === 'object' && err !== null) {
    const maybeResp = err as { response?: { data?: { message?: string } }; message?: string };
    return maybeResp.response?.data?.message || maybeResp.message || 'Gagal memuat';
  }
  return 'Gagal memuat';
}

type StatusFilter = 'ALL' | ProductStatus;

type AvailableFilter = 'ALL' | 'AVAILABLE' | 'NOT_AVAILABLE';

type QuickAction = 'IN' | 'OUT' | 'ADJUST';

export default function InventoryStockSummaryPage() {
  const [outletOptions, setOutletOptions] = useState<Outlet[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<Category[]>([]);

  const [outletId, setOutletId] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [availableFilter, setAvailableFilter] = useState<AvailableFilter>('ALL');

  const [items, setItems] = useState<StockSummaryItem[]>([]);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Action modal states
  const [actionOpen, setActionOpen] = useState(false);
  const [actionType, setActionType] = useState<QuickAction>('IN');
  const [selectedProduct, setSelectedProduct] = useState<StockSummaryItem | null>(null);
  const [actionQty, setActionQty] = useState<number>(1);
  const [actionAdjType, setActionAdjType] = useState<'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT'>('ADJUSTMENT_IN');
  const [actionNote, setActionNote] = useState('');
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  function openAction(t: QuickAction, item: StockSummaryItem) {
    setSelectedProduct(item);
    setActionType(t);
    setActionQty(1);
    setActionAdjType('ADJUSTMENT_IN');
    setActionNote('');
    setActionError(null);
    setActionOpen(true);
  }

  async function submitAction() {
    if (!selectedProduct || !outletId) return;
    try {
      setActionSubmitting(true);
      setActionError(null);
      if (actionType === 'IN') {
        await postStockIn({ outletId, productId: selectedProduct.productId, quantity: Number(actionQty), note: actionNote || undefined });
      } else if (actionType === 'OUT') {
        await postStockOut({ outletId, productId: selectedProduct.productId, quantity: Number(actionQty), note: actionNote || undefined });
      } else {
        await postAdjustment({ outletId, productId: selectedProduct.productId, type: actionAdjType, quantity: Number(actionQty), note: actionNote || undefined });
      }
      setActionOpen(false);
      await load(page);
    } catch (err: unknown) {
      setActionError(getErrorMessage(err));
    } finally {
      setActionSubmitting(false);
    }
  }

  async function fetchOutlets() {
    try {
      const resp = await api.get('/business/outlets', { params: { status: 'ACTIVE', perPage: 100 } });
      const data = resp.data?.data;
      setOutletOptions(Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []);
    } catch {
      setOutletOptions([]);
    }
  }

  async function fetchCategories() {
    try {
      const resp = await api.get('/business/categories', { params: { status: 'ACTIVE', perPage: 100 } });
      const data = resp.data?.data;
      setCategoryOptions(Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []);
    } catch {
      setCategoryOptions([]);
    }
  }

  useEffect(() => {
    void fetchOutlets();
    void fetchCategories();
  }, []);

  async function load(targetPage?: number) {
    if (!outletId) return;
    setLoading(true);
    setError(null);

    try {
      const available =
        availableFilter === 'ALL' ? undefined : availableFilter === 'AVAILABLE' ? true : false;
      const productStatus = statusFilter === 'ALL' ? undefined : statusFilter;
      const nextPage = targetPage ?? page;

      const res = await fetchStockSummary({
        outletId,
        search: search || undefined,
        categoryId: categoryId || undefined,
        productStatus,
        available,
        page: nextPage,
        perPage,
      });

      const payload = res.data as unknown as { items: StockSummaryItem[]; meta?: { page: number; perPage: number; total: number; totalPages: number } };
      const meta = payload.meta;

      setItems(payload.items || []);
      if (meta && typeof meta.total === 'number') {
        setPage(meta.page || nextPage);
        setPerPage(meta.perPage || perPage);
        setTotal(meta.total || payload.items?.length || 0);
        setTotalPages(meta.totalPages || 1);
      } else {
        setTotal(payload.items?.length || 0);
        setTotalPages(1);
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err));
      setItems([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }

  function handleSearchSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSearch(searchInput.trim());
  }

  useEffect(() => {
    setPage(1);
  }, [outletId, search, categoryId, statusFilter, availableFilter, perPage]);

  const hasActiveFilter = useMemo(
    () => Boolean(search || categoryId || outletId || (statusFilter !== 'ALL') || (availableFilter !== 'ALL')),
    [search, categoryId, outletId, statusFilter, availableFilter]
  );

  const from = (page - 1) * perPage + (items.length > 0 ? 1 : 0);
  const to = (page - 1) * perPage + items.length;

  return (
    <div className="mx-auto max-w-6xl p-4 lg:p-6">
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-slate-900">Inventory</h1>
        <p className="mt-1 text-sm text-slate-500">Ringkasan stok per produk dan outlet.</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Stock Summary</h2>
              <p className="text-xs text-slate-500">Pilih outlet lalu gunakan filter untuk menampilkan stok produk.</p>
            </div>

            <div className="hidden gap-2 sm:flex">
              <Button variant="outline" onClick={() => { setSearchInput(''); setSearch(''); setCategoryId(''); setStatusFilter('ALL'); setAvailableFilter('ALL'); setPage(1); setItems([]); setTotal(0); setTotalPages(1); }}>
                <FontAwesomeIcon icon={faRotateRight} className="mr-2 h-3.5 w-3.5" />Reset
              </Button>
              <Button onClick={() => void load()} disabled={loading || !outletId}>
                {loading ? 'Loading…' : 'Load'}
              </Button>
            </div>
          </div>

          <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="flex flex-col">
              <label className="mb-1 text-xs font-medium text-slate-600">Outlet</label>
              <select
                value={outletId}
                onChange={(e) => setOutletId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500"
              >
                <option value="">Pilih outlet…</option>
                {outletOptions.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>

            <form className="flex flex-col" onSubmit={handleSearchSubmit}>
              <label className="mb-1 text-xs font-medium text-slate-600">Search</label>
              <div className="flex gap-2">
                <Input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="nama/sku/barcode/brand/unit" />
                <Button type="submit" variant="outline" className="shrink-0">Apply</Button>
              </div>
            </form>

            <div className="flex flex-col">
              <label className="mb-1 text-xs font-medium text-slate-600">Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500"
              >
                <option value="">(Semua)</option>
                {categoryOptions.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col">
              <label className="mb-1 text-xs font-medium text-slate-600">Available</label>
              <select
                value={availableFilter}
                onChange={(e) => setAvailableFilter(e.target.value as AvailableFilter)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500"
              >
                <option value="ALL">(Semua)</option>
                <option value="AVAILABLE">Available saja</option>
                <option value="NOT_AVAILABLE">Tidak available</option>
              </select>
            </div>

            <div className="flex flex-col">
              <label className="mb-1 text-xs font-medium text-slate-600">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500"
              >
                <option value="ALL">(Semua)</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>

            <div className="mt-1 flex gap-2 sm:hidden">
              <Button variant="outline" className="w-full" onClick={() => { setSearchInput(''); setSearch(''); setCategoryId(''); setStatusFilter('ALL'); setAvailableFilter('ALL'); setPage(1); setItems([]); setTotal(0); setTotalPages(1); }}>
                <FontAwesomeIcon icon={faRotateRight} className="mr-2 h-3.5 w-3.5" />Reset
              </Button>
              <Button className="w-full" onClick={() => void load()} disabled={loading || !outletId}>
                {loading ? 'Loading…' : 'Load'}
              </Button>
            </div>
          </div>

          {hasActiveFilter && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
                <FontAwesomeIcon icon={faFilter} className="h-3 w-3" /> Active Filters
              </span>

              {outletId && (
                <span className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 ring-1 ring-indigo-200">
                  Outlet: {outletOptions.find((o) => o.id === outletId)?.name || outletId}
                  <button className="ml-1" onClick={() => setOutletId('')} aria-label="Clear outlet">
                    <FontAwesomeIcon icon={faXmark} className="h-3 w-3" />
                  </button>
                </span>
              )}
              {categoryId && (
                <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-200">
                  Category: {categoryOptions.find((c) => c.id === categoryId)?.name || categoryId}
                  <button className="ml-1" onClick={() => setCategoryId('')} aria-label="Clear category">
                    <FontAwesomeIcon icon={faXmark} className="h-3 w-3" />
                  </button>
                </span>
              )}
              {statusFilter !== 'ALL' && (
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
                  Status: {statusFilter}
                  <button className="ml-1" onClick={() => setStatusFilter('ALL')} aria-label="Clear status">
                    <FontAwesomeIcon icon={faXmark} className="h-3 w-3" />
                  </button>
                </span>
              )}
              {availableFilter !== 'ALL' && (
                <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
                  Available: {availableFilter === 'AVAILABLE' ? 'Yes' : 'No'}
                  <button className="ml-1" onClick={() => setAvailableFilter('ALL')} aria-label="Clear available">
                    <FontAwesomeIcon icon={faXmark} className="h-3 w-3" />
                  </button>
                </span>
              )}
              {search && (
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
                  Search: “{search}”
                  <button className="ml-1" onClick={() => { setSearch(''); setSearchInput(''); }} aria-label="Clear search">
                    <FontAwesomeIcon icon={faXmark} className="h-3 w-3" />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="mx-4 mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        <div className="p-4">
          {items.length === 0 && !loading ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
              <FontAwesomeIcon icon={faBoxOpen} className="mb-3 h-10 w-10 text-slate-400" />
              <p className="text-sm font-semibold text-slate-700">Belum ada data</p>
              <p className="mt-1 max-w-md text-xs text-slate-500">Pilih outlet dan atur filter lalu klik Load untuk melihat ringkasan stok.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full table-auto border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                      <th className="border-b border-slate-200 px-3 py-2">Product</th>
                      <th className="border-b border-slate-200 px-3 py-2">SKU</th>
                      <th className="border-b border-slate-200 px-3 py-2">Barcode</th>
                      <th className="border-b border-slate-200 px-3 py-2">Brand</th>
                      <th className="border-b border-slate-200 px-3 py-2">Unit</th>
                      <th className="border-b border-slate-200 px-3 py-2">Available</th>
                      <th className="border-b border-slate-200 px-3 py-2">Status</th>
                      <th className="border-b border-slate-200 px-3 py-2 text-right">Stock</th>
                      <th className="border-b border-slate-200 px-3 py-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it) => (
                      <tr key={it.productId} className="hover:bg-slate-50">
                        <td className="border-b border-slate-100 px-3 py-2 font-medium text-slate-900">{it.productName}</td>
                        <td className="border-b border-slate-100 px-3 py-2">{it.sku || '-'}</td>
                        <td className="border-b border-slate-100 px-3 py-2">{it.barcode || '-'}</td>
                        <td className="border-b border-slate-100 px-3 py-2">{it.brand || '-'}</td>
                        <td className="border-b border-slate-100 px-3 py-2">{it.unit || '-'}</td>
                        <td className="border-b border-slate-100 px-3 py-2">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${it.isAvailable ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'}`}>
                            {it.isAvailable ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td className="border-b border-slate-100 px-3 py-2">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${it.productOutletStatus === 'ACTIVE' ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'}`}>
                            {it.productOutletStatus || '-'}
                          </span>
                        </td>
                        <td className="border-b border-slate-100 px-3 py-2 text-right font-semibold">{it.stockOnHand}</td>
                        <td className="border-b border-slate-100 px-3 py-2 text-right">
                          <div className="inline-flex gap-1">
                            <Button variant="outline" className="px-2 py-1 text-xs" title="Stock In" onClick={() => openAction('IN', it)}>
                              <FontAwesomeIcon icon={faArrowDown} className="h-3 w-3" />
                            </Button>
                            <Button variant="outline" className="px-2 py-1 text-xs" title="Stock Out" onClick={() => openAction('OUT', it)}>
                              <FontAwesomeIcon icon={faArrowUp} className="h-3 w-3" />
                            </Button>
                            <Button variant="outline" className="px-2 py-1 text-xs" title="Adjustment" onClick={() => openAction('ADJUST', it)}>
                              <FontAwesomeIcon icon={faSliders} className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
                <div className="text-xs text-slate-600">
                  {total > 0 ? (
                    <span>Menampilkan {from}-{to} dari {total} item</span>
                  ) : (
                    <span>&nbsp;</span>
                  )}
                </div>

                <div className="inline-flex items-center gap-2">
                  <Button
                    variant="outline"
                    className="gap-2"
                    disabled={loading || page <= 1}
                    onClick={() => void load(page - 1)}
                  >
                    <FontAwesomeIcon icon={faChevronLeft} className="h-3 w-3" />
                    Prev
                  </Button>

                  <span className="text-xs text-slate-600">
                    Halaman {page} dari {Math.max(totalPages, 1)}
                  </span>

                  <Button
                    variant="outline"
                    className="gap-2"
                    disabled={loading || page >= totalPages}
                    onClick={() => void load(page + 1)}
                  >
                    Next
                    <FontAwesomeIcon icon={faChevronRight} className="h-3 w-3" />
                  </Button>

                  <select
                    value={perPage}
                    onChange={(e) => setPerPage(Number(e.target.value) || 20)}
                    className="ml-2 rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-700 focus:border-blue-500"
                  >
                    {[10, 20, 50, 100].map((n) => (
                      <option key={n} value={n}>{n}/page</option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {actionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                {actionType === 'IN' ? 'Stock In' : actionType === 'OUT' ? 'Stock Out' : 'Stock Adjustment'}
              </h3>
              <button onClick={() => setActionOpen(false)} className="text-slate-500 hover:text-slate-700">
                <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-1 text-xs text-slate-500">{selectedProduct?.productName}</p>

            <div className="mt-4 grid grid-cols-1 gap-3">
              {actionType === 'ADJUST' && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Adjustment Type</label>
                  <select value={actionAdjType} onChange={(e) => setActionAdjType(e.target.value as 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500">
                    <option value="ADJUSTMENT_IN">ADJUSTMENT_IN (Tambah)</option>
                    <option value="ADJUSTMENT_OUT">ADJUSTMENT_OUT (Kurangi)</option>
                  </select>
                </div>
              )}
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Quantity</label>
                <Input type="number" min={0.001} step={0.001} value={actionQty} onChange={(e) => setActionQty(Number(e.target.value))} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Note</label>
                <Input value={actionNote} onChange={(e) => setActionNote(e.target.value)} placeholder="opsional" />
              </div>
            </div>

            {actionError && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700">{actionError}</div>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setActionOpen(false)}>Batal</Button>
              <Button onClick={() => void submitAction()} disabled={actionSubmitting || !outletId || !selectedProduct}>
                {actionSubmitting ? 'Memproses…' : 'Submit'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
