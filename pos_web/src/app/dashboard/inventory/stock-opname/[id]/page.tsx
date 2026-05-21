'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCircleCheck,
  faCircleXmark,
  faPencil,
  faFloppyDisk,
  faCheck,
  faBan,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';
import {
  fetchOpnameDetail,
  putOpnameItems,
  postFinalizeOpname,
  postCancelOpname,
} from '../../../../../lib/stock-opname';
import type { StockOpnameDetail, StockOpnameItemDetail, StockOpnameStatus } from '../../../../../types/stock-opname';
import { Button } from '../../../../../components/ui/button';
import { Input } from '../../../../../components/ui/input';

function statusBadge(status: StockOpnameStatus) {
  if (status === 'FINALIZED')
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
        <FontAwesomeIcon icon={faCircleCheck} className="h-3 w-3" /> Finalized
      </span>
    );
  if (status === 'CANCELLED')
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-200">
        <FontAwesomeIcon icon={faCircleXmark} className="h-3 w-3" /> Cancelled
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
      <FontAwesomeIcon icon={faPencil} className="h-3 w-3" /> Draft
    </span>
  );
}

function varianceColor(v: string | null) {
  if (!v || v === '0' || v === '0.000') return 'text-slate-500';
  return Number(v) > 0 ? 'text-emerald-600 font-semibold' : 'text-red-600 font-semibold';
}

function varianceDisplay(v: string | null) {
  if (!v || v === '0' || v === '0.000') return '—';
  return Number(v) > 0 ? `+${Number(v)}` : `${Number(v)}`;
}

function getErrorMessage(err: unknown): string {
  if (typeof err === 'object' && err !== null) {
    const e = err as { response?: { data?: { message?: string } }; message?: string };
    return e.response?.data?.message ?? e.message ?? 'Gagal';
  }
  return 'Gagal';
}

type LocalCount = Record<string, { value: string; note: string }>;

export default function StockOpnameDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params['id'] as string;

  const [opname, setOpname] = useState<StockOpnameDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Local state for counting
  const [counts, setCounts] = useState<LocalCount>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);

  // Finalize modal
  const [finalizeOpen, setFinalizeOpen] = useState(false);
  const [finalizeNote, setFinalizeNote] = useState('');
  const [finalizing, setFinalizing] = useState(false);
  const [finalizeError, setFinalizeError] = useState<string | null>(null);

  // Cancel confirm
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Search
  const [search, setSearch] = useState('');
  const [showUncountedOnly, setShowUncountedOnly] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchOpnameDetail(id);
      setOpname(res.data);
      // Init local counts from existing countedStock
      const init: LocalCount = {};
      for (const it of res.data.items) {
        init[it.productId] = {
          value: it.countedStock !== null ? String(Number(it.countedStock)) : '',
          note: it.note ?? '',
        };
      }
      setCounts(init);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredItems = useMemo(() => {
    if (!opname) return [];
    return opname.items.filter((it) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        it.productName.toLowerCase().includes(q) ||
        it.productCode.toLowerCase().includes(q) ||
        (it.sku ?? '').toLowerCase().includes(q) ||
        (it.barcode ?? '').toLowerCase().includes(q);
      const matchUncounted = !showUncountedOnly || counts[it.productId]?.value === '';
      return matchSearch && matchUncounted;
    });
  }, [opname, search, showUncountedOnly, counts]);

  const countedTotal = useMemo(
    () => opname?.items.filter((it) => counts[it.productId]?.value !== '').length ?? 0,
    [opname, counts],
  );

  async function saveAll() {
    if (!opname) return;
    setSaving(true);
    setSaveError(null);
    setSaveOk(false);
    try {
      const items = opname.items
        .filter((it) => counts[it.productId]?.value !== '')
        .map((it) => ({
          productId: it.productId,
          countedStock: Number(counts[it.productId]?.value ?? 0),
          note: counts[it.productId]?.note || undefined,
        }));
      if (items.length === 0) {
        setSaveError('Belum ada item yang dihitung');
        return;
      }
      await putOpnameItems(id, items);
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 2000);
      await load();
    } catch (err: unknown) {
      setSaveError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function doFinalize() {
    setFinalizing(true);
    setFinalizeError(null);
    try {
      await postFinalizeOpname(id, finalizeNote.trim() || undefined);
      setFinalizeOpen(false);
      await load();
    } catch (err: unknown) {
      setFinalizeError(getErrorMessage(err));
    } finally {
      setFinalizing(false);
    }
  }

  async function doCancel() {
    setCancelling(true);
    try {
      await postCancelOpname(id);
      setCancelOpen(false);
      await load();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setCancelling(false);
    }
  }

  function setCount(item: StockOpnameItemDetail, value: string) {
    setCounts((prev) => ({ ...prev, [item.productId]: { ...prev[item.productId], value } }));
  }

  function setItemNote(item: StockOpnameItemDetail, note: string) {
    setCounts((prev) => ({ ...prev, [item.productId]: { ...prev[item.productId], note } }));
  }

  if (loading) return <div className="p-8 text-center text-sm text-slate-500">Memuat…</div>;
  if (error) return <div className="p-8 text-center text-sm text-red-600">{error}</div>;
  if (!opname) return null;

  const isDraft = opname.status === 'DRAFT';

  return (
    <div className="mx-auto max-w-6xl p-4 lg:p-6">
      {/* Header */}
      <div className="mb-4">
        <button
          onClick={() => router.push('/dashboard/inventory/stock-opname')}
          className="mb-2 text-xs text-blue-600 hover:underline"
        >
          ← Daftar sesi opname
        </button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-slate-900">{opname.outletName}</h1>
              {statusBadge(opname.status)}
            </div>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500">
              <span>{new Date(opname.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              {opname.createdByName && <span>Dibuat oleh: {opname.createdByName}</span>}
              {opname.finalizedByName && (
                <span>Difinalize oleh: {opname.finalizedByName} pada {new Date(opname.finalizedAt!).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              )}
              {opname.note && <span>"{opname.note}"</span>}
            </div>
          </div>

          {isDraft && (
            <div className="flex gap-2">
              <Button variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => setCancelOpen(true)}>
                <FontAwesomeIcon icon={faBan} className="mr-1.5 h-3.5 w-3.5" /> Batalkan
              </Button>
              <Button onClick={() => setFinalizeOpen(true)}>
                <FontAwesomeIcon icon={faCheck} className="mr-1.5 h-3.5 w-3.5" /> Finalize
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-slate-700">Progress Penghitungan</span>
          <span className="text-slate-500">{countedTotal} / {opname.items.length} produk</span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-blue-500 transition-all"
            style={{ width: opname.items.length > 0 ? `${(countedTotal / opname.items.length) * 100}%` : '0%' }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama/kode/SKU/barcode…"
            className="sm:max-w-xs"
          />
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={showUncountedOnly}
              onChange={(e) => setShowUncountedOnly(e.target.checked)}
              className="rounded"
            />
            Hanya yang belum dihitung
          </label>
          {isDraft && (
            <Button className="ml-auto" onClick={() => void saveAll()} disabled={saving}>
              <FontAwesomeIcon icon={faFloppyDisk} className="mr-1.5 h-3.5 w-3.5" />
              {saving ? 'Menyimpan…' : 'Simpan Hitungan'}
            </Button>
          )}
        </div>

        {saveError && (
          <div className="mx-4 mt-2 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700">{saveError}</div>
        )}
        {saveOk && (
          <div className="mx-4 mt-2 rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-700">Hitungan berhasil disimpan.</div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full table-auto border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="border-b border-slate-200 px-3 py-2">Produk</th>
                <th className="border-b border-slate-200 px-3 py-2">SKU / Barcode</th>
                <th className="border-b border-slate-200 px-3 py-2 text-right">Stok Sistem</th>
                <th className="border-b border-slate-200 px-3 py-2 text-right">Hitungan Fisik</th>
                <th className="border-b border-slate-200 px-3 py-2 text-right">Selisih</th>
                <th className="border-b border-slate-200 px-3 py-2">Catatan</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-sm text-slate-400">Tidak ada produk.</td>
                </tr>
              ) : (
                filteredItems.map((it) => {
                  const local = counts[it.productId] ?? { value: '', note: '' };
                  const hasCount = local.value !== '';
                  const localVariance = hasCount
                    ? Number(local.value) - Number(it.systemStock)
                    : null;

                  return (
                    <tr key={it.productId} className={`hover:bg-slate-50 ${hasCount ? '' : 'bg-amber-50/30'}`}>
                      <td className="border-b border-slate-100 px-3 py-2">
                        <div className="font-medium text-slate-900">{it.productName}</div>
                        <div className="text-xs text-slate-400">{it.productCode}{it.unit ? ` · ${it.unit}` : ''}</div>
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2 text-xs text-slate-500">
                        {it.sku || it.barcode ? (
                          <>
                            {it.sku && <div>{it.sku}</div>}
                            {it.barcode && <div>{it.barcode}</div>}
                          </>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2 text-right font-mono text-slate-700">
                        {Number(it.systemStock)}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2 text-right">
                        {isDraft ? (
                          <input
                            type="number"
                            min={0}
                            step={0.001}
                            value={local.value}
                            onChange={(e) => setCount(it, e.target.value)}
                            placeholder="—"
                            className="w-24 rounded border border-slate-300 px-2 py-1 text-right text-sm font-mono focus:border-blue-500 focus:outline-none"
                          />
                        ) : (
                          <span className="font-mono text-slate-700">
                            {it.countedStock !== null ? Number(it.countedStock) : <span className="text-slate-300">—</span>}
                          </span>
                        )}
                      </td>
                      <td className={`border-b border-slate-100 px-3 py-2 text-right font-mono ${varianceColor(isDraft && hasCount ? String(localVariance) : it.variance)}`}>
                        {isDraft && hasCount
                          ? localVariance !== null
                            ? localVariance === 0 ? '—' : localVariance > 0 ? `+${localVariance}` : `${localVariance}`
                            : '—'
                          : varianceDisplay(it.variance)}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2">
                        {isDraft ? (
                          <input
                            type="text"
                            value={local.note}
                            onChange={(e) => setItemNote(it, e.target.value)}
                            placeholder="opsional"
                            className="w-full rounded border border-slate-200 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
                          />
                        ) : (
                          <span className="text-xs text-slate-500">{it.note || '—'}</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Finalize Modal */}
      {finalizeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-start gap-3">
              <FontAwesomeIcon icon={faTriangleExclamation} className="mt-0.5 h-5 w-5 text-amber-500" />
              <div>
                <h3 className="font-semibold text-slate-900">Finalize Stock Opname?</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Sistem akan membuat adjustment movement untuk semua produk yang ada selisih. Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>
            </div>

            <div className="mt-4">
              <label className="mb-1 block text-xs font-medium text-slate-600">Catatan Finalisasi (opsional)</label>
              <Input
                value={finalizeNote}
                onChange={(e) => setFinalizeNote(e.target.value)}
                placeholder="mis: Difinalize setelah verifikasi ulang"
              />
            </div>

            {finalizeError && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700">{finalizeError}</div>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setFinalizeOpen(false); setFinalizeError(null); }}>Batal</Button>
              <Button onClick={() => void doFinalize()} disabled={finalizing}>
                {finalizing ? 'Memproses…' : 'Ya, Finalize'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirm */}
      {cancelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="font-semibold text-slate-900">Batalkan sesi opname ini?</h3>
            <p className="mt-1 text-sm text-slate-500">Semua data hitungan akan tetap tersimpan tapi sesi tidak bisa dilanjutkan.</p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCancelOpen(false)}>Tidak</Button>
              <Button
                variant="outline"
                className="border-red-300 text-red-600 hover:bg-red-50"
                onClick={() => void doCancel()}
                disabled={cancelling}
              >
                {cancelling ? 'Membatalkan…' : 'Ya, Batalkan'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
