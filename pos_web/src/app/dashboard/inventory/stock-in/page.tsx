'use client';

import React, { useEffect, useState } from 'react';
import { postStockIn } from '../../../../lib/inventory';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import type { Outlet } from '../../../../types/outlet';
import { api } from '../../../../lib/api';
import { fetchStockSummary } from '../../../../lib/inventory';
import type { StockSummaryItem } from '../../../../types/inventory';

function getErrorMessage(err: unknown): string {
  if (typeof err === 'object' && err !== null) {
    const e = err as { response?: { data?: { message?: string } }; message?: string };
    return e.response?.data?.message || e.message || 'Gagal';
  }
  return 'Gagal';
}

export default function StockInPage() {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [products, setProducts] = useState<StockSummaryItem[]>([]);
  const [productSearch, setProductSearch] = useState('');

  const [outletId, setOutletId] = useState('');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [note, setNote] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
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
    if (!outletId) {
      setProducts([]);
      return;
    }
    try {
      setLoadingProducts(true);
      const res = await fetchStockSummary({
        outletId,
        search: productSearch.trim() || undefined,
        perPage: 200,
      });
      setProducts(res.data.items || []);
    } catch {
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  }

  useEffect(() => {
    void fetchOutlets();
  }, []);

  useEffect(() => {
    // Auto-load products for selected outlet
    if (outletId) {
      setProductId('');
      setProductSearch('');
      void loadProducts();
    } else {
      setProducts([]);
    }
  }, [outletId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    try {
      setLoading(true);
      const res = await postStockIn({ outletId, productId, quantity: Number(quantity), note: note || undefined });
      setResult(`OK: movementId=${res.data.movementId}`);
      setProductSearch('');
      setProducts([]);
      setProductId('');
      setQuantity(1);
      setNote('');
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-4 lg:p-6">
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-slate-900">Inventory</h1>
        <p className="mt-1 text-sm text-slate-500">Form stok masuk manual.</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-slate-900">Stock In</h2>
        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Outlet</label>
            <select
              value={outletId}
              onChange={(e) => setOutletId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500"
              required
            >
              <option value="">Pilih outlet…</option>
              {outlets.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Produk (per outlet)</label>
            <div className="flex gap-2">
              <Input
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="ketik untuk mencari di outlet ini"
                disabled={!outletId}
              />
              <Button type="button" variant="outline" onClick={() => void loadProducts()} disabled={!outletId || loadingProducts}>
                {loadingProducts ? '...' : 'Search'}
              </Button>
            </div>
            <div className="mt-2">
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500"
                required
                disabled={!outletId}
              >
                <option value="">{outletId ? 'Pilih produk…' : 'Pilih outlet dahulu'}</option>
                {products.map((p) => (
                  <option key={p.productId} value={p.productId}>
                    {p.productName} {p.sku ? `— ${p.sku}` : ''} {p.barcode ? `— ${p.barcode}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Quantity</label>
              <Input type="number" min={0.001} step={0.001} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} required />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Note</label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          </div>
          <div className="mt-2 flex gap-2">
            <Button type="submit" className="px-5" disabled={loading || !outletId || !productId}>{loading ? 'Memproses…' : 'Submit'}</Button>
            {result && <span className="self-center text-sm text-emerald-700">{result}</span>}
            {error && <span className="self-center text-sm text-red-700">{error}</span>}
          </div>
        </form>
      </div>
    </div>
  );
}
