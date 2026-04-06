'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { getOutletTableMonitor } from '@/lib/restaurant-operations';
import type {
  OutletTableMonitorResponse,
  TableMonitorItem,
  TableMonitorStatus,
} from '@/types/restaurant-operations';

type LoadState = 'idle' | 'loading' | 'success' | 'error';

function getTextParam(value: string | null): string {
  return typeof value === 'string' ? value.trim() : '';
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return '-';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function getMonitorBadgeClass(status: TableMonitorStatus): string {
  switch (status) {
    case 'AVAILABLE':
      return 'bg-emerald-100 text-emerald-700 ring-emerald-200';
    case 'WAITING_KITCHEN':
      return 'bg-amber-100 text-amber-700 ring-amber-200';
    case 'PROCESSING':
      return 'bg-sky-100 text-sky-700 ring-sky-200';
    case 'READY_TO_SERVE':
      return 'bg-violet-100 text-violet-700 ring-violet-200';
    case 'SERVED':
      return 'bg-teal-100 text-teal-700 ring-teal-200';
    case 'WAITING_PAYMENT':
      return 'bg-rose-100 text-rose-700 ring-rose-200';
    default:
      return 'bg-slate-100 text-slate-700 ring-slate-200';
  }
}

function getMonitorLabel(status: TableMonitorStatus): string {
  switch (status) {
    case 'AVAILABLE':
      return 'Tersedia';
    case 'WAITING_KITCHEN':
      return 'Menunggu Kitchen';
    case 'PROCESSING':
      return 'Diproses';
    case 'READY_TO_SERVE':
      return 'Siap Disajikan';
    case 'SERVED':
      return 'Sudah Disajikan';
    case 'WAITING_PAYMENT':
      return 'Menunggu Bayar';
    default:
      return status;
  }
}

function SummaryCard(props: {
  title: string;
  value: number;
  description: string;
}) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <p className="text-sm font-medium text-slate-500">{props.title}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">{props.value}</p>
      <p className="mt-2 text-xs text-slate-500">{props.description}</p>
    </div>
  );
}

function TableCard(props: {
  item: TableMonitorItem;
  outletId: string;
}) {
  const { item, outletId } = props;

  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-900">{item.name}</h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
              {item.code}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-500">
            <span>Kapasitas: {item.capacity ?? '-'}</span>
            <span>Status master: {item.tableStatus}</span>
          </div>
        </div>

        <div
          className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${getMonitorBadgeClass(item.monitorStatus)}`}
        >
          {getMonitorLabel(item.monitorStatus)}
        </div>
      </div>

      {item.activeOrder ? (
        <div className="mt-5 space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Order</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {item.activeOrder.orderNumber}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Payment</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {item.activeOrder.paymentStatus}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Total Item</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {item.activeOrder.totalItems}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Total Order</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {formatCurrency(item.activeOrder.totalAmount)}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Pending</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {item.activeOrder.itemSummary.pending}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Processing</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {item.activeOrder.itemSummary.processing}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Done</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {item.activeOrder.itemSummary.done}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Served</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {item.activeOrder.itemSummary.served}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Cancelled</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {item.activeOrder.itemSummary.cancelled}
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Dibuat</p>
              <p className="mt-1 text-sm font-medium text-slate-900">
                {formatDateTime(item.activeOrder.createdAt)}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Submitted</p>
              <p className="mt-1 text-sm font-medium text-slate-900">
                {formatDateTime(item.activeOrder.submittedAt)}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Catatan Order</p>
            <p className="mt-1 text-sm text-slate-700">
              {item.activeOrder.notes?.trim() ? item.activeOrder.notes : '-'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/dashboard/tables/qr?outletId=${encodeURIComponent(outletId)}&tableId=${encodeURIComponent(item.id)}`}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Lihat QR
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
          Belum ada order aktif di meja ini.
        </div>
      )}
    </div>
  );
}

export default function TableMonitorPage() {
  const searchParams = useSearchParams();
  const outletId = useMemo(() => getTextParam(searchParams.get('outletId')), [searchParams]);

  const [state, setState] = useState<LoadState>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [data, setData] = useState<OutletTableMonitorResponse | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadMonitor() {
      if (!outletId) {
        setState('idle');
        setErrorMessage('');
        return;
      }

      try {
        setState('loading');
        setErrorMessage('');

        const result = await getOutletTableMonitor({
          outletId,
        });

        if (!isMounted) {
          return;
        }

        setData(result);
        setState('success');
      } catch (error: unknown) {
        if (!isMounted) {
          return;
        }

        const message =
          error instanceof Error ? error.message : 'Gagal memuat monitor meja.';
        setErrorMessage(message);
        setState('error');
      }
    }

    void loadMonitor();

    return () => {
      isMounted = false;
    };
  }, [outletId]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-3 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Monitor Meja</h1>
            <p className="mt-1 text-sm text-slate-600">
              Pantau status meja, order aktif, dan progres item kitchen per outlet.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Kembali
            </Link>

            <button
              type="button"
              onClick={() => {
                window.location.reload();
              }}
              className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Refresh
            </button>
          </div>
        </div>

        {state === 'idle' && (
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">
              Pilih outlet terlebih dahulu
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Halaman monitor meja butuh <span className="font-semibold">outletId</span>{' '}
              di query string. Untuk alur normal, buka dulu daftar meja outlet lalu
              lanjutkan ke monitor meja dari sana.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/dashboard/outlet-tables"
                className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                Buka Outlet Tables
              </Link>

              <Link
                href="/dashboard/tables/qr"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Ke Halaman QR Meja
              </Link>
            </div>
          </div>
        )}

        {state === 'loading' && (
          <div className="rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-600">Memuat monitor meja...</p>
          </div>
        )}

        {state === 'error' && (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-5 shadow-sm">
            <h2 className="text-base font-semibold text-red-700">Gagal memuat monitor meja</h2>
            <p className="mt-2 text-sm text-red-600">{errorMessage}</p>
          </div>
        )}

        {state === 'success' && data && (
          <>
            <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <p className="text-sm text-slate-500">Outlet aktif</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">
                {data.outlet.name}
              </h2>
              <p className="mt-1 text-sm text-slate-500">{data.outlet.code}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <SummaryCard
                title="Total Meja"
                value={data.summary.totalTables}
                description="Seluruh meja aktif di outlet."
              />
              <SummaryCard
                title="Tersedia"
                value={data.summary.availableTables}
                description="Belum ada order aktif."
              />
              <SummaryCard
                title="Terisi"
                value={data.summary.occupiedTables}
                description="Sedang ada order aktif."
              />
              <SummaryCard
                title="Siap Disajikan"
                value={data.summary.readyTables}
                description="Item sudah done/served."
              />
              <SummaryCard
                title="Menunggu Bayar"
                value={data.summary.waitingPaymentTables}
                description="Order selesai, pembayaran belum final."
              />
            </div>

            {data.items.length > 0 ? (
              <div className="grid gap-5 xl:grid-cols-2">
                {data.items.map((item) => (
                  <TableCard key={item.id} item={item} outletId={outletId} />
                ))}
              </div>
            ) : (
              <div className="rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
                <p className="text-sm text-slate-600">Belum ada data meja aktif.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}