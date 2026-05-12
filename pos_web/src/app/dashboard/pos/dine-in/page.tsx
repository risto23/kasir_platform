'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowRotateLeft,
  faChair,
  faPlus,
  faUtensils,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';

import {
  createOrder,
  formatCurrency,
  getTableOccupancy,
} from '@/lib/pos';
import type { PosTableItem, TableOccupancyItem } from '@/types/pos';

type LoadState = 'idle' | 'loading' | 'success' | 'error';

function getStatusColor(item: TableOccupancyItem): string {
  if (!item.isOccupied) return 'bg-emerald-50 border-emerald-300 hover:bg-emerald-100';
  const status = item.activeOrder?.status;
  if (status === 'DRAFT') return 'bg-amber-50 border-amber-300 hover:bg-amber-100';
  if (status === 'SUBMITTED') return 'bg-sky-50 border-sky-300 hover:bg-sky-100';
  if (status === 'IN_PROGRESS') return 'bg-sky-50 border-sky-300 hover:bg-sky-100';
  if (status === 'READY') return 'bg-violet-50 border-violet-300 hover:bg-violet-100';
  return 'bg-slate-50 border-slate-300 hover:bg-slate-100';
}

function getStatusBadge(item: TableOccupancyItem): { label: string; cls: string } {
  if (!item.isOccupied) return { label: 'Kosong', cls: 'bg-emerald-100 text-emerald-700' };
  const status = item.activeOrder?.status;
  if (status === 'DRAFT') return { label: 'Memesan', cls: 'bg-amber-100 text-amber-700' };
  if (status === 'SUBMITTED') return { label: 'Diproses Kitchen', cls: 'bg-sky-100 text-sky-700' };
  if (status === 'IN_PROGRESS') return { label: 'Sedang Dimasak', cls: 'bg-sky-100 text-sky-700' };
  if (status === 'READY') return { label: 'Siap Disajikan', cls: 'bg-violet-100 text-violet-700' };
  return { label: 'Terisi', cls: 'bg-slate-100 text-slate-700' };
}

type CreateOrderDialogProps = {
  table: PosTableItem;
  outletId: string;
  onConfirm: (customerName: string) => Promise<void>;
  onClose: () => void;
  loading: boolean;
};

function CreateOrderDialog({ table, onConfirm, onClose, loading }: CreateOrderDialogProps) {
  const [customerName, setCustomerName] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-800">
            Buka Order — {table.name}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        <p className="text-sm text-slate-500 mb-4">
          Kapasitas: {table.capacity ?? '-'} orang
        </p>

        <label className="block text-sm font-medium text-slate-700 mb-1">
          Nama Pelanggan <span className="text-slate-400">(opsional)</span>
        </label>
        <input
          type="text"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder="Cth: Meja pak Budi"
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 mb-5"
        />

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 border border-slate-300 text-slate-600 rounded-lg py-2 text-sm hover:bg-slate-50"
          >
            Batal
          </button>
          <button
            onClick={() => onConfirm(customerName)}
            disabled={loading}
            className="flex-1 bg-sky-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-sky-700 disabled:opacity-50"
          >
            {loading ? 'Membuka...' : 'Buka Order'}
          </button>
        </div>
      </div>
    </div>
  );
}

function getOutletIdFromStorage(): string {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem('activeOutletId') ?? '';
}

function getOutletNameFromStorage(): string {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem('activeOutletName') ?? 'Outlet';
}

export default function DineInTableMapPage() {
  const router = useRouter();

  const [outletId, setOutletId] = useState('');
  const [outletName, setOutletName] = useState('');
  const [tables, setTables] = useState<TableOccupancyItem[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [error, setError] = useState('');

  const [selectedTable, setSelectedTable] = useState<PosTableItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    const id = getOutletIdFromStorage();
    const name = getOutletNameFromStorage();
    setOutletId(id);
    setOutletName(name);
    if (id) loadTables(id);
  }, []);

  async function loadTables(id: string) {
    setLoadState('loading');
    setError('');
    try {
      const data = await getTableOccupancy(id);
      setTables(data);
      setLoadState('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat data meja');
      setLoadState('error');
    }
  }

  function handleTableClick(item: TableOccupancyItem) {
    if (item.isOccupied && item.activeOrder) {
      router.push(`/dashboard/pos/dine-in/${item.activeOrder.id}?outletId=${outletId}`);
    } else {
      setSelectedTable(item);
      setCreateError('');
    }
  }

  async function handleCreateOrder(customerName: string) {
    if (!selectedTable || !outletId) return;
    setCreating(true);
    setCreateError('');
    try {
      const order = await createOrder({
        outletId,
        orderType: 'DINE_IN',
        tableId: selectedTable.id,
        customerName: customerName.trim() || undefined,
      });
      router.push(`/dashboard/pos/dine-in/${order.id}?outletId=${outletId}`);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Gagal membuka order');
      setCreating(false);
    }
  }

  const emptyCount = tables.filter((t) => !t.isOccupied).length;
  const occupiedCount = tables.filter((t) => t.isOccupied).length;

  return (
    <div className="space-y-5">
      {/* Header card — sama gaya dengan POS page */}
      <section className="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-6 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-700">
            <FontAwesomeIcon icon={faUtensils} className="h-3 w-3" />
            POS Cashier
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
            POS Kasir — Dine-In
          </h1>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            {outletName || 'Pilih outlet terlebih dahulu'} · Pilih meja untuk membuka atau melanjutkan order.
          </p>
        </div>
        <button
          onClick={() => outletId && loadTables(outletId)}
          disabled={loadState === 'loading'}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors self-start xl:self-center"
        >
          <FontAwesomeIcon
            icon={faArrowRotateLeft}
            className={loadState === 'loading' ? 'animate-spin' : ''}
          />
          Refresh
        </button>
      </section>

      {/* Mode tab — Dine-In aktif */}
      <section className="flex gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
        <button
          onClick={() => router.push('/dashboard/pos')}
          className="flex-1 rounded-xl px-4 py-2.5 text-center text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
        >
          Quick Service / Take Away
        </button>
        <span className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-center text-sm font-semibold text-white">
          Dine-In
        </span>
      </section>

      <div className="max-w-5xl">
        {/* Summary */}
        {loadState === 'success' && tables.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
              <div className="text-2xl font-bold text-slate-800">{tables.length}</div>
              <div className="text-xs text-slate-500 mt-0.5">Total Meja</div>
            </div>
            <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-3 text-center">
              <div className="text-2xl font-bold text-emerald-700">{emptyCount}</div>
              <div className="text-xs text-emerald-600 mt-0.5">Kosong</div>
            </div>
            <div className="bg-amber-50 rounded-xl border border-amber-200 p-3 text-center">
              <div className="text-2xl font-bold text-amber-700">{occupiedCount}</div>
              <div className="text-xs text-amber-600 mt-0.5">Terisi</div>
            </div>
          </div>
        )}

        {/* Error */}
        {loadState === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm mb-4">
            {error}
          </div>
        )}

        {/* No outlet */}
        {!outletId && (
          <div className="text-center py-16 text-slate-400">
            <FontAwesomeIcon icon={faChair} className="text-4xl mb-3" />
            <p className="text-sm">Outlet belum dipilih. Buka POS terlebih dahulu untuk memilih outlet.</p>
          </div>
        )}

        {/* Loading skeleton */}
        {loadState === 'loading' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 animate-pulse h-28" />
            ))}
          </div>
        )}

        {/* Table grid */}
        {loadState === 'success' && tables.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <FontAwesomeIcon icon={faChair} className="text-4xl mb-3" />
            <p className="text-sm">Belum ada meja aktif di outlet ini.</p>
            <p className="text-xs mt-1">Tambahkan meja di menu Pengaturan → Meja.</p>
          </div>
        )}

        {loadState === 'success' && tables.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {tables.map((item) => {
              const badge = getStatusBadge(item);
              const colorCls = getStatusColor(item);

              return (
                <button
                  key={item.id}
                  onClick={() => handleTableClick(item)}
                  className={`text-left border-2 rounded-xl p-4 transition-all cursor-pointer ${colorCls}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-semibold text-slate-800 text-sm leading-tight">
                      {item.name}
                    </span>
                    {!item.isOccupied && (
                      <span className="text-emerald-500">
                        <FontAwesomeIcon icon={faPlus} className="text-xs" />
                      </span>
                    )}
                  </div>

                  {item.capacity && (
                    <p className="text-xs text-slate-400 mb-2">
                      <FontAwesomeIcon icon={faChair} className="mr-1" />
                      {item.capacity} orang
                    </p>
                  )}

                  <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${badge.cls}`}>
                    {badge.label}
                  </span>

                  {item.isOccupied && item.activeOrder && (
                    <div className="mt-2 pt-2 border-t border-slate-200/60">
                      <p className="text-xs text-slate-500 truncate">
                        {item.activeOrder.orderNumber}
                      </p>
                      <p className="text-xs font-semibold text-slate-700 mt-0.5">
                        {formatCurrency(Number(item.activeOrder.totalAmount))}
                      </p>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Create order dialog */}
      {selectedTable && (
        <CreateOrderDialog
          table={selectedTable}
          outletId={outletId}
          onConfirm={handleCreateOrder}
          onClose={() => {
            setSelectedTable(null);
            setCreateError('');
          }}
          loading={creating}
        />
      )}

      {createError && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-red-600 text-white text-sm px-4 py-2 rounded-lg shadow-lg">
          {createError}
        </div>
      )}
    </div>
  );
}
