'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBuilding,
  faCheck,
  faChevronLeft,
  faClockRotateLeft,
  faSliders,
  faSpinner,
  faToggleOff,
  faToggleOn,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import {
  getBusinessFeatureFlags,
  getBusinessFeatureFlagAuditLogs,
  overrideBusinessFeatureFlag,
  type BusinessAuditLogEntry,
  type BusinessFeatureFlagsResponse,
} from '@/lib/platform-features';

function getMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) return error.response?.data?.message || fallback;
  if (error instanceof Error) return error.message;
  return fallback;
}

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(iso)
  );
}

type OverrideModalState = {
  flagKey: string;
  flagName: string;
  currentEnabled: boolean;
  targetEnabled: boolean;
} | null;

export default function BusinessFeatureOverridePage() {
  const { id: businessId } = useParams<{ id: string }>();

  const [data, setData] = useState<BusinessFeatureFlagsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');

  const [auditLogs, setAuditLogs] = useState<BusinessAuditLogEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  // Override modal
  const [modal, setModal] = useState<OverrideModalState>(null);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setPageError('');
      const result = await getBusinessFeatureFlags(businessId);
      setData(result);
    } catch (err) {
      setPageError(getMessage(err, 'Gagal memuat data'));
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  const loadAuditLogs = useCallback(async () => {
    try {
      setAuditLoading(true);
      const logs = await getBusinessFeatureFlagAuditLogs(businessId, 30);
      setAuditLogs(logs);
    } catch {
      // silent
    } finally {
      setAuditLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    void loadData();
    void loadAuditLogs();
  }, [loadData, loadAuditLogs]);

  function openModal(flagKey: string, flagName: string, currentEnabled: boolean) {
    setModal({ flagKey, flagName, currentEnabled, targetEnabled: !currentEnabled });
    setReason('');
    setSaveError('');
  }

  function closeModal() {
    if (saving) return;
    setModal(null);
    setReason('');
    setSaveError('');
  }

  async function handleOverrideConfirm() {
    if (!modal) return;
    setSaving(true);
    setSaveError('');
    try {
      await overrideBusinessFeatureFlag(businessId, modal.flagKey, modal.targetEnabled, reason || null);
      closeModal();
      await loadData();
      await loadAuditLogs();
    } catch (err) {
      setSaveError(getMessage(err, 'Gagal menyimpan perubahan'));
    } finally {
      setSaving(false);
    }
  }

  const enabledCount = data?.items.filter((i) => i.enabled).length ?? 0;

  if (loading) {
    return (
      <div className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm">
        <div className="space-y-3">
          <div className="h-6 w-56 animate-pulse rounded bg-slate-100" />
          <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
        </div>
      </div>
    );
  }

  if (pageError || !data) {
    return (
      <div className="rounded-[28px] border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {pageError || 'Data tidak tersedia.'}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-5">
        {/* Header */}
        <section className="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-700">
              <FontAwesomeIcon icon={faSliders} className="h-3 w-3" />
              Super Admin — Feature Override
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
              {data.business.name}
            </h1>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Override fitur secara manual di luar plan. Setiap perubahan dicatat dalam audit log.
            </p>
          </div>
          <Link
            href="/dashboard/businesses"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <FontAwesomeIcon icon={faChevronLeft} className="h-4 w-4" />
            Kembali
          </Link>
        </section>

        {/* Stats */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Business</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{data.business.name}</p>
            <p className="mt-1 text-xs text-slate-500">{data.business.slug}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Tipe</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{data.business.businessType}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Status</p>
            <span
              className={`mt-2 inline-block rounded-full px-3 py-1 text-sm font-semibold ${
                data.business.status === 'ACTIVE'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {data.business.status}
            </span>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Fitur Aktif</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
              {enabledCount}
              <span className="ml-1 text-base font-normal text-slate-400">
                / {data.items.length}
              </span>
            </p>
          </div>
        </section>

        {/* Feature flags list */}
        <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-base font-semibold text-slate-900">Kelola Fitur</h2>
            <p className="mt-1 text-sm text-slate-500">
              Klik toggle untuk mengubah status fitur. Alasan opsional tapi direkomendasikan.
            </p>

            <div className="mt-5 space-y-3">
              {data.items.length === 0 ? (
                <div className="rounded-2xl bg-slate-50 px-4 py-5 text-sm text-slate-500">
                  Belum ada master feature flag.
                </div>
              ) : (
                data.items.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between gap-4 rounded-3xl border px-4 py-4 transition ${
                      item.enabled
                        ? 'border-violet-200 bg-violet-50'
                        : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                        {item.enabled ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                            <FontAwesomeIcon icon={faCheck} className="h-2.5 w-2.5" />
                            Aktif
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-semibold text-slate-500">
                            Nonaktif
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">
                        {item.key}
                      </p>
                      {item.description ? (
                        <p className="mt-1.5 text-xs text-slate-500">{item.description}</p>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      onClick={() => openModal(item.key, item.name, item.enabled)}
                      title={item.enabled ? 'Nonaktifkan fitur ini' : 'Aktifkan fitur ini'}
                      className={`shrink-0 transition ${
                        item.enabled ? 'text-violet-600 hover:text-violet-700' : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      <FontAwesomeIcon
                        icon={item.enabled ? faToggleOn : faToggleOff}
                        className="h-8 w-8"
                      />
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Business info sidebar */}
          <aside className="space-y-4">
            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                <FontAwesomeIcon icon={faBuilding} className="h-4 w-4" />
              </div>
              <h2 className="mt-4 text-base font-semibold text-slate-900">Info Business</h2>
              <div className="mt-4 space-y-3 text-sm">
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Name</p>
                  <p className="mt-1.5 font-medium text-slate-800">{data.business.name}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Slug</p>
                  <p className="mt-1.5 font-medium text-slate-800">{data.business.slug}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Tipe</p>
                  <p className="mt-1.5 font-medium text-slate-800">{data.business.businessType}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-5 shadow-sm">
              <p className="text-sm font-semibold text-amber-900">Catatan Override</p>
              <div className="mt-3 space-y-2 text-xs text-amber-800">
                {[
                  'Override mengubah flag langsung, terlepas dari plan aktif.',
                  'Perubahan plan otomatis akan menimpa override ini.',
                  'Selalu isi alasan agar audit log informatif.',
                ].map((note) => (
                  <div key={note} className="rounded-xl bg-amber-100/60 px-3 py-2">
                    {note}
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>

        {/* Audit log */}
        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <FontAwesomeIcon icon={faClockRotateLeft} className="h-4 w-4 text-slate-400" />
              Riwayat Override Fitur
            </h2>
            <button
              type="button"
              onClick={() => void loadAuditLogs()}
              className="text-xs font-medium text-violet-600 hover:text-violet-700"
            >
              Refresh
            </button>
          </div>

          <div className="mt-4">
            {auditLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 animate-pulse rounded-2xl bg-slate-100" />
                ))}
              </div>
            ) : auditLogs.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-500">
                Belum ada riwayat override.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {auditLogs.map((log) => {
                  const meta = log.metadata as { reason?: string | null; featureFlagKey?: string } | null;
                  const changes = log.changes as { before?: { enabled: boolean }; after?: { enabled: boolean } } | null;
                  return (
                    <div key={log.id} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium text-slate-800">
                              {log.entityLabel ?? '—'}
                            </p>
                            {changes ? (
                              <span
                                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                  changes.after?.enabled
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-red-50 text-red-600'
                                }`}
                              >
                                {changes.after?.enabled ? 'Diaktifkan' : 'Dinonaktifkan'}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {log.actorUser
                              ? `${log.actorUser.fullName} (${log.actorUser.email})`
                              : 'System'}
                          </p>
                          {meta?.reason ? (
                            <p className="mt-1 text-xs italic text-slate-500">
                              &ldquo;{meta.reason}&rdquo;
                            </p>
                          ) : null}
                        </div>
                        <time className="shrink-0 text-xs text-slate-400">
                          {formatDateTime(log.createdAt)}
                        </time>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Override confirmation modal */}
      {modal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-semibold text-slate-900">
                {modal.targetEnabled ? 'Aktifkan' : 'Nonaktifkan'} Fitur?
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <FontAwesomeIcon icon={faXmark} className="h-5 w-5" />
              </button>
            </div>

            <p className="mt-3 text-sm text-slate-600">
              Fitur{' '}
              <span className="font-semibold text-slate-900">{modal.flagName}</span> akan
              di-{modal.targetEnabled ? 'aktifkan' : 'nonaktifkan'} untuk business{' '}
              <span className="font-semibold text-slate-900">{data?.business.name}</span>.
            </p>

            <div className="mt-5">
              <label className="block text-sm font-semibold text-slate-700">
                Alasan Override{' '}
                <span className="font-normal text-slate-400">(opsional)</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Contoh: Request dari pemilik bisnis, promosi khusus, dsb."
                rows={3}
                maxLength={500}
                className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-violet-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-100"
              />
            </div>

            {saveError ? (
              <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {saveError}
              </div>
            ) : null}

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="flex-1 rounded-2xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => void handleOverrideConfirm()}
                disabled={saving}
                className={`flex-1 inline-flex items-center justify-center gap-2 rounded-2xl py-2.5 text-sm font-semibold text-white transition ${
                  modal.targetEnabled
                    ? 'bg-violet-600 hover:bg-violet-700'
                    : 'bg-red-500 hover:bg-red-600'
                }`}
              >
                {saving ? (
                  <FontAwesomeIcon icon={faSpinner} className="h-4 w-4 animate-spin" />
                ) : (
                  <FontAwesomeIcon
                    icon={modal.targetEnabled ? faToggleOn : faToggleOff}
                    className="h-4 w-4"
                  />
                )}
                {saving ? 'Menyimpan...' : modal.targetEnabled ? 'Aktifkan' : 'Nonaktifkan'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
