'use client';

import Link from 'next/link';import { getActiveBusinessId } from '@/lib/auth';import { getBusinessFeatureFlags } from '@/lib/feature-flags';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import {
  getOutletTableMonitor,
  getTableQr,
  getTableQrBulkByOutlet,
} from '@/lib/restaurant-operations';
import type {
  OutletTableMonitorResponse,
  TableQrBulkItem,
  TableQrResponse,
} from '@/types/restaurant-operations';

type LoadState = 'idle' | 'loading' | 'success' | 'error';

function getTextParam(value: string | null): string {
  return typeof value === 'string' ? value.trim() : '';
}

function buildDashboardGuestMenuUrl(params: {
  outletId: string;
  tableId: string;
  token: string;
}): string {
  const nextSearchParams = new URLSearchParams({
    outletId: params.outletId,
    tableId: params.tableId,
    token: params.token,
  });

  return `/dashboard/guest/menu?${nextSearchParams.toString()}`;
}

function extractTokenFromUrl(urlValue: string): string {
  try {
    const resolvedUrl = new URL(urlValue, window.location.origin);
    return resolvedUrl.searchParams.get('token')?.trim() ?? '';
  } catch {
    return '';
  }
}

function formatCapacity(value: number | null): string {
  if (value === null) {
    return '-';
  }

  return String(value);
}

function SingleQrCard({ data }: { data: TableQrResponse }) {
  const guestToken = useMemo(() => {
    if (!data.guestMenuUrl) {
      return '';
    }

    return extractTokenFromUrl(data.guestMenuUrl);
  }, [data]);

  const dashboardGuestPreviewUrl = useMemo(() => {
    if (!guestToken) {
      return '';
    }

    return buildDashboardGuestMenuUrl({
      outletId: data.outlet.id,
      tableId: data.table.id,
      token: guestToken,
    });
  }, [data, guestToken]);

  async function handleCopyPublicLink(): Promise<void> {
    await navigator.clipboard.writeText(data.guestMenuUrl);
  }

  async function handleCopyPreviewLink(): Promise<void> {
    if (!dashboardGuestPreviewUrl) {
      return;
    }

    await navigator.clipboard.writeText(
      `${window.location.origin}${dashboardGuestPreviewUrl}`,
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">Informasi Meja</h2>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Outlet
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {data.outlet.name}
            </p>
            <p className="mt-1 text-xs text-slate-500">{data.outlet.code}</p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Meja
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {data.table.name}
            </p>
            <p className="mt-1 text-xs text-slate-500">{data.table.code}</p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Kapasitas
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {formatCapacity(data.table.capacity)}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Status
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {data.table.status}
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Public Guest URL
          </p>
          <p className="mt-2 break-all text-sm text-slate-700">
            {data.guestMenuUrl}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                void handleCopyPublicLink();
              }}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Copy Public Link
            </button>

            <a
              href={data.guestMenuUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Buka Public URL
            </a>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Frontend Preview URL
          </p>
          <p className="mt-2 break-all text-sm text-slate-700">
            {dashboardGuestPreviewUrl || '-'}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                void handleCopyPreviewLink();
              }}
              disabled={!dashboardGuestPreviewUrl}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Copy Preview Link
            </button>

            {dashboardGuestPreviewUrl ? (
              <Link
                href={dashboardGuestPreviewUrl}
                className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                Preview Guest Menu
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-center text-lg font-semibold text-slate-900">
          QR Scan Meja
        </h2>

        <div className="mt-6 flex flex-col items-center">
          <div className="rounded-3xl border border-slate-200 bg-white p-5">
            <QRCodeSVG value={data.qrValue} size={260} level="M" includeMargin />
          </div>

          <div className="mt-5 text-center">
            <p className="text-lg font-bold text-slate-900">{data.outlet.name}</p>
            <p className="mt-1 text-sm text-slate-600">{data.table.name}</p>
            <p className="mt-2 text-xs text-slate-500">
              Scan untuk lihat menu dan buat pesanan guest
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function BulkQrCard({ item }: { item: TableQrBulkItem }) {
  const guestToken = useMemo(() => extractTokenFromUrl(item.guestMenuUrl), [item.guestMenuUrl]);

  const dashboardGuestPreviewUrl = useMemo(() => {
    if (!guestToken) {
      return '';
    }

    return buildDashboardGuestMenuUrl({
      outletId: item.outlet.id,
      tableId: item.table.id,
      token: guestToken,
    });
  }, [guestToken, item.outlet.id, item.table.id]);

  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 print:break-inside-avoid">
      <div className="text-center">
        <p className="text-lg font-bold text-slate-900">{item.outlet.name}</p>
        <p className="mt-1 text-sm font-semibold text-slate-700">{item.table.name}</p>
        <p className="mt-1 text-xs text-slate-500">{item.table.code}</p>
      </div>

      <div className="mt-5 flex justify-center">
        <div className="rounded-3xl border border-slate-200 bg-white p-4">
          <QRCodeSVG value={item.qrValue} size={220} level="M" includeMargin />
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">
          <span className="font-semibold">Kapasitas:</span> {formatCapacity(item.table.capacity)}
        </div>

        <div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">
          <span className="font-semibold">Status:</span> {item.table.status}
        </div>

        <div className="rounded-2xl bg-slate-50 p-3 text-xs text-slate-600">
          <p className="font-semibold text-slate-700">Public Guest URL</p>
          <p className="mt-1 break-all">{item.guestMenuUrl}</p>
        </div>

        {dashboardGuestPreviewUrl ? (
          <div className="rounded-2xl bg-slate-50 p-3 text-xs text-slate-600">
            <p className="font-semibold text-slate-700">Preview URL</p>
            <p className="mt-1 break-all">{dashboardGuestPreviewUrl}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function TableQrPage() {
  const searchParams = useSearchParams();

  const outletId = useMemo(
    () => getTextParam(searchParams.get('outletId')),
    [searchParams],
  );
  const tableId = useMemo(
    () => getTextParam(searchParams.get('tableId')),
    [searchParams],
  );

  const [state, setState] = useState<LoadState>('idle');  const [featureEnabled, setFeatureEnabled] = useState<boolean>(true);  const [businessId, setBusinessId] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [singleData, setSingleData] = useState<TableQrResponse | null>(null);
  const [bulkItems, setBulkItems] = useState<TableQrBulkItem[]>([]);
  const [monitorData, setMonitorData] = useState<OutletTableMonitorResponse | null>(null);

  const isSingleMode = Boolean(outletId && tableId);
  const isBulkMode = Boolean(outletId && !tableId && false);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      if (!outletId) {
        setState('idle');
        setErrorMessage('');
        setSingleData(null);
        setBulkItems([]);
        setMonitorData(null);
        return;
      }

      try {
        setState('loading');
        setErrorMessage('');
        setSingleData(null);
        setBulkItems([]);
        setMonitorData(null);

        if (tableId) {
          const result = await getTableQr({
            outletId,
            tableId,
          });

          if (!isMounted) {
            return;
          }

          setSingleData(result);
          setState('success');
          return;
        }

        const [monitorResult, bulkResult] = await Promise.all([
          getOutletTableMonitor({ outletId }),
          getTableQrBulkByOutlet({ outletId }),
        ]);

        if (!isMounted) {
          return;
        }

        setMonitorData(monitorResult);
        setBulkItems(bulkResult);
        setState('success');
      } catch (error: unknown) {
        if (!isMounted) {
          return;
        }

        const message =
          error instanceof Error ? error.message : 'Gagal memuat QR meja.';
        setErrorMessage(message);
        setState('error');
      }
    }

    void loadData();

    return () => {
      isMounted = false;
    };
  }, [outletId, tableId]);

  function handlePrint(): void {
    window.print();
  }

  const backHref = useMemo(() => {
    if (outletId) {
      return `/dashboard/outlet-tables/${encodeURIComponent(outletId)}`;
    }

    return '/dashboard/outlet-tables';
  }, [outletId]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-3 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {isBulkMode ? 'QR Semua Meja Outlet' : 'QR Meja'}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              {isBulkMode
                ? 'Generate dan cetak QR semua meja aktif dalam satu outlet.'
                : 'Generate dan cetak QR untuk akses guest menu per meja.'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={backHref}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Kembali
            </Link>

            <button
              type="button"
              onClick={handlePrint}
              disabled={
                state !== 'success' ||
                (isSingleMode ? !singleData : bulkItems.length === 0)
              }
              className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Print QR
            </button>
          </div>
        </div>

        {state === 'idle' && (
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">
              Pilih outlet terlebih dahulu
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Halaman QR meja butuh <span className="font-semibold">outletId</span>.
              Kalau ingin satu meja saja, tambahkan juga{' '}
              <span className="font-semibold">tableId</span>. Kalau hanya outletId,
              sistem akan generate semua QR meja dalam outlet itu.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/dashboard/outlet-tables"
                className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                Buka Outlet Tables
              </Link>

              <Link
                href="/dashboard/tables/monitor"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Buka Monitor Meja
              </Link>
            </div>
          </div>
        )}

        {state === 'loading' && (
          <div className="rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-600">Memuat QR meja...</p>
          </div>
        )}

        {state === 'error' && (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-5 shadow-sm">
            <h2 className="text-base font-semibold text-red-700">
              Gagal memuat QR meja
            </h2>
            <p className="mt-2 text-sm text-red-600">{errorMessage}</p>
          </div>
        )}

        {state === 'success' && isSingleMode && singleData ? (
          <>
            <SingleQrCard data={singleData} />

            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm text-amber-800">
                QR tetap memakai value dari backend agar signed token tetap konsisten.
                Preview frontend dipakai untuk pengecekan alur dari dashboard tanpa
                harus scan QR fisik dulu.
              </p>
            </div>
          </>
        ) : null}

        {state === 'success' && isBulkMode ? (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                <p className="text-sm text-slate-500">Outlet</p>
                <p className="mt-2 text-xl font-bold text-slate-900">
                  {monitorData?.outlet.name ?? '-'}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {monitorData?.outlet.code ?? '-'}
                </p>
              </div>

              <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                <p className="text-sm text-slate-500">Total QR Aktif</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {bulkItems.length}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Hanya meja aktif yang digenerate.
                </p>
              </div>

              <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                <p className="text-sm text-slate-500">Total Meja Outlet</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {monitorData?.summary.totalTables ?? 0}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Berdasarkan monitor meja outlet.
                </p>
              </div>

              <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                <p className="text-sm text-slate-500">Aksi</p>
                <Link
                  href={`/dashboard/tables/monitor?outletId=${encodeURIComponent(outletId)}`}
                  className="mt-2 inline-flex items-center justify-center rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Buka Monitor Meja
                </Link>
              </div>
            </div>

            {bulkItems.length === 0 ? (
              <div className="rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
                <p className="text-sm text-slate-600">
                  Tidak ada meja aktif yang bisa digenerate QR-nya.
                </p>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {bulkItems.map((item) => (
                  <BulkQrCard key={item.table.id} item={item} />
                ))}
              </div>
            )}

            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm text-amber-800">
                Mode bulk tetap memakai generator QR backend per meja, jadi token signed
                tetap aman. Halaman ini hanya menggabungkan hasilnya untuk print semua
                meja outlet sekaligus.
              </p>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}



