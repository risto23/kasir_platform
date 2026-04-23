'use client';

import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowsRotate,
  faClockRotateLeft,
  faFilter,
  faShieldHalved,
} from '@fortawesome/free-solid-svg-icons';
import { fetchAuditLogs } from '@/lib/audit-logs';
import { getPosOutlets } from '@/lib/pos';
import type { AuditLogItem } from '@/types/audit-log';

const ACTION_OPTIONS = [
  '',
  'BUSINESS_CREATED',
  'BUSINESS_UPDATED',
  'BUSINESS_STATUS_UPDATED',
  'OUTLET_CREATED',
  'OUTLET_UPDATED',
  'OUTLET_STATUS_UPDATED',
  'POS_SETTINGS_UPDATED',
  'RECEIPT_SETTINGS_UPDATED',
];

const ENTITY_TYPE_OPTIONS = ['', 'BUSINESS', 'OUTLET', 'POS_SETTINGS'];

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function formatActionLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatChanges(value: unknown) {
  if (!value || typeof value !== 'object') {
    return '-';
  }

  const fields = Array.isArray((value as { fields?: unknown }).fields)
    ? (value as { fields: string[] }).fields
    : [];

  return fields.length > 0 ? fields.join(', ') : 'Tersimpan';
}

export default function AuditLogsPage() {
  const [items, setItems] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [outlets, setOutlets] = useState<Array<{ id: string; name: string }>>([]);

  const [outletId, setOutletId] = useState('');
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');

  async function load(currentPage = page) {
    try {
      setRefreshing(true);
      setMessage('');
      const result = await fetchAuditLogs({
        page: currentPage,
        limit: 20,
        outletId: outletId || undefined,
        action: action || undefined,
        entityType: entityType || undefined,
      });

      setItems(result.items);
      setTotalPages(result.meta.totalPages || 1);
      setPage(result.meta.page || 1);
    } catch (error) {
      setItems([]);
      setTotalPages(1);
      setMessage(error instanceof Error ? error.message : 'Gagal memuat audit log');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        const result = await getPosOutlets();
        setOutlets(result.items.map((item) => ({ id: item.id, name: item.name })));
      } catch {
        setOutlets([]);
      }
    })();
  }, []);

  useEffect(() => {
    void load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-700">
              <FontAwesomeIcon icon={faShieldHalved} className="h-3 w-3" />
              Audit Logs
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
              Riwayat Perubahan Sistem
            </h1>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Lihat siapa mengubah apa, kapan perubahan terjadi, dan area mana yang terdampak.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void load(page)}
            disabled={refreshing}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            <FontAwesomeIcon icon={faArrowsRotate} className="h-4 w-4" />
            {refreshing ? 'Memuat...' : 'Refresh'}
          </button>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <FontAwesomeIcon icon={faFilter} className="h-4 w-4 text-slate-500" />
          Filter Audit
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Outlet
            </label>
            <select
              value={outletId}
              onChange={(event) => setOutletId(event.target.value)}
              className="h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm"
            >
              <option value="">Semua outlet</option>
              {outlets.map((outlet) => (
                <option key={outlet.id} value={outlet.id}>
                  {outlet.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Action
            </label>
            <select
              value={action}
              onChange={(event) => setAction(event.target.value)}
              className="h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm"
            >
              {ACTION_OPTIONS.map((option) => (
                <option key={option || 'all'} value={option}>
                  {option ? formatActionLabel(option) : 'Semua action'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Entity
            </label>
            <select
              value={entityType}
              onChange={(event) => setEntityType(event.target.value)}
              className="h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm"
            >
              {ENTITY_TYPE_OPTIONS.map((option) => (
                <option key={option || 'all'} value={option}>
                  {option || 'Semua entity'}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end gap-3">
            <button
              type="button"
              onClick={() => void load(1)}
              className="h-11 rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white"
            >
              Terapkan
            </button>
            <button
              type="button"
              onClick={() => {
                setOutletId('');
                setAction('');
                setEntityType('');
                void load(1);
              }}
              className="h-11 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700"
            >
              Reset
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <FontAwesomeIcon icon={faClockRotateLeft} className="h-4 w-4 text-slate-500" />
            Aktivitas Tercatat
          </div>
        </div>

        {loading ? (
          <div className="p-6 text-sm text-slate-500">Memuat audit log...</div>
        ) : message ? (
          <div className="p-6 text-sm text-red-600">{message}</div>
        ) : items.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">Belum ada audit log untuk filter ini.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.16em] text-slate-400">
                <tr>
                  <th className="px-5 py-3 sm:px-6">Waktu</th>
                  <th className="px-5 py-3 sm:px-6">Actor</th>
                  <th className="px-5 py-3 sm:px-6">Action</th>
                  <th className="px-5 py-3 sm:px-6">Entity</th>
                  <th className="px-5 py-3 sm:px-6">Outlet</th>
                  <th className="px-5 py-3 sm:px-6">Perubahan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {items.map((item) => (
                  <tr key={item.id} className="align-top">
                    <td className="px-5 py-4 text-slate-600 sm:px-6">{formatDateTime(item.createdAt)}</td>
                    <td className="px-5 py-4 sm:px-6">
                      <div className="font-medium text-slate-900">{item.actor?.fullName ?? 'System'}</div>
                      <div className="text-xs text-slate-500">{item.actor?.email ?? '-'}</div>
                    </td>
                    <td className="px-5 py-4 sm:px-6">
                      <div className="font-medium text-slate-900">{formatActionLabel(item.action)}</div>
                      <div className="text-xs text-slate-500">{item.summary ?? '-'}</div>
                    </td>
                    <td className="px-5 py-4 sm:px-6">
                      <div className="font-medium text-slate-900">{item.entityType}</div>
                      <div className="text-xs text-slate-500">{item.entityLabel ?? item.entityId ?? '-'}</div>
                    </td>
                    <td className="px-5 py-4 text-slate-600 sm:px-6">{item.outlet?.name ?? '-'}</td>
                    <td className="px-5 py-4 text-slate-600 sm:px-6">{formatChanges(item.changes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4 sm:px-6">
          <p className="text-sm text-slate-500">
            Halaman {page} dari {Math.max(totalPages, 1)}
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1 || refreshing}
              onClick={() => void load(page - 1)}
              className="h-10 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 disabled:opacity-50"
            >
              Sebelumnya
            </button>
            <button
              type="button"
              disabled={page >= totalPages || refreshing}
              onClick={() => void load(page + 1)}
              className="h-10 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 disabled:opacity-50"
            >
              Berikutnya
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
