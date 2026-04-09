'use client';

import React, { useEffect, useState } from 'react';
import { fetchMovements, fetchStockSummary } from '../../../../lib/inventory';
import type { MovementListItem, InventoryMovementType, StockSummaryItem } from '../../../../types/inventory';
import type { Outlet } from '../../../../types/outlet';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { api } from '../../../../lib/api';

function getErrorMessage(err: unknown): string {
  if (typeof err === 'object' && err !== null) {
    const maybe = err as { response?: { data?: { message?: string } }; message?: string };
    return maybe.response?.data?.message || maybe.message || 'Gagal memuat';
  }
  return 'Gagal memuat';
}

export default function InventoryMovementsPage() {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [outletId, setOutletId] = useState('');

  const [type, setType] = useState<InventoryMovementType | ''>('');
  const [search, setSearch] = useState('');

  const [productSearch, setProductSearch] = useState('');
  const [products, setProducts] = useState<StockSummaryItem[]>([]);
  const [productId, setProductId] = useState('');

  const [items, setItems] = useState<MovementListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingProducts, setLoadingProducts] = useState(false);

  async function fetchOutlets() {
    try {
      const resp = await api.get('/business/outlets', { params: { status: 'ACTIVE', perPage: 100 } });
      const data = resp.data?.data;
      setOutlets(Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []);
    } catch {
      setOutlets([]);
    }
  }

  async function loadProducts() {
    if (!outletId) { setProducts([]); return; }
    try {
      setLoadingProducts(true);
      const res = await fetchStockSummary({ outletId, search: productSearch.trim() || undefined, perPage: 200 });
      setProducts(res.data.items || []);
    } catch { setProducts([]); }
    finally { setLoadingProducts(false); }
  }

  async function load() {
    if (!outletId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchMovements({
        outletId,
        productId: productId || undefined,
        type: (type || undefined) as InventoryMovementType | undefined,
        search: productId ? undefined : (search || undefined),
      });
      setItems(res.data.items);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void fetchOutlets(); }, []);
  useEffect(() => {
    if (outletId) { setProductId(''); setProductSearch(''); void loadProducts(); } else { setProducts([]); }
  }, [outletId]);

  return (
    <div className="mx-auto max-w-6xl p-4 lg:p-6">
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-slate-900">Inventory</h1>
        <p className="mt-1 text-sm text-slate-500">Histori pergerakan stok per outlet.</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Movement History</h2>
            <p className="text-xs text-slate-500">Filter berdasarkan outlet, type, product, dan pencarian.</p>
          </div>

          <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-5 lg:w-auto lg:grid-cols-5">
            <div className="flex flex-col">
              <label className="mb-1 text-xs font-medium text-slate-600">Outlet</label>
              <select value={outletId} onChange={(e) => setOutletId(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500">
                <option value="">Pilih outlet…</option>
                {outlets.map((o) => (<option key={o.id} value={o.id}>{o.name}</option>))}
              </select>
            </div>

            <div className="flex flex-col">
              <label className="mb-1 text-xs font-medium text-slate-600">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as InventoryMovementType | '')}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500"
              >
                <option value="">(All)</option>
                <option value="IN">IN</option>
                <option value="OUT">OUT</option>
                <option value="ADJUSTMENT_IN">ADJUSTMENT_IN</option>
                <option value="ADJUSTMENT_OUT">ADJUSTMENT_OUT</option>
              </select>
            </div>

            <div className="flex flex-col">
              <label className="mb-1 text-xs font-medium text-slate-600">Produk (per outlet)</label>
              <div className="flex gap-2">
                <Input value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder="ketik untuk mencari" disabled={!outletId} />
                <Button type="button" variant="outline" onClick={() => void loadProducts()} disabled={!outletId || loadingProducts}>{loadingProducts ? '...' : 'Search'}</Button>
              </div>
              <div className="mt-2">
                <select value={productId} onChange={(e) => setProductId(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500" disabled={!outletId}>
                  <option value="">{outletId ? 'Semua produk' : 'Pilih outlet dahulu'}</option>
                  {products.map((p) => (
                    <option key={p.productId} value={p.productId}>{p.productName} {p.sku ? `— ${p.sku}` : ''} {p.barcode ? `— ${p.barcode}` : ''}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col">
              <label className="mb-1 text-xs font-medium text-slate-600">Search</label>
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="nama/kode/sku/barcode" />
            </div>

            <div className="flex items-end">
              <Button onClick={() => void load()} disabled={loading || !outletId} className="w-full sm:w-auto">{loading ? 'Loading…' : 'Load'}</Button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mx-4 mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        <div className="p-4">
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <th className="border-b border-slate-200 px-3 py-2">Waktu</th>
                  <th className="border-b border-slate-200 px-3 py-2">Product</th>
                  <th className="border-b border-slate-200 px-3 py-2">Type</th>
                  <th className="border-b border-slate-200 px-3 py-2 text-right">Qty</th>
                  <th className="border-b border-slate-200 px-3 py-2">Note</th>
                  <th className="border-b border-slate-200 px-3 py-2">Ref</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-slate-500">Belum ada data.</td>
                  </tr>
                ) : (
                  items.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="border-b border-slate-100 px-3 py-2">{new Date(m.createdAt).toLocaleString()}</td>
                      <td className="border-b border-slate-100 px-3 py-2">{m.productName}</td>
                      <td className="border-b border-slate-100 px-3 py-2">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200">{m.type}</span>
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2 text-right font-semibold">{m.quantity}</td>
                      <td className="border-b border-slate-100 px-3 py-2">{m.note || '-'}</td>
                      <td className="border-b border-slate-100 px-3 py-2">{m.referenceType ? `${m.referenceType}:${m.referenceId}` : '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
