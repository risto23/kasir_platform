'use client';

import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheck,
  faChevronLeft,
  faFloppyDisk,
  faSliders,
  faSpinner,
  faTableCells,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import Link from 'next/link';
import {
  getPlansFeatureMatrix,
  getPlatformAuditLogs,
  setPlanFeatureFlags,
  type PlatformAuditLogEntry,
  type PlansFeatureMatrix,
} from '@/lib/platform-features';

function getMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) return error.response?.data?.message || fallback;
  if (error instanceof Error) return error.message;
  return fallback;
}

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso));
}

export default function SuperAdminPlansPage() {
  const [matrix, setMatrix] = useState<PlansFeatureMatrix | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Per-plan dirty tracking: planId → Set<flagId>
  const [pendingByPlan, setPendingByPlan] = useState<Record<string, Set<string>>>({});
  const [savingPlanId, setSavingPlanId] = useState<string | null>(null);
  const [saveMessages, setSaveMessages] = useState<Record<string, { type: 'success' | 'error'; text: string }>>({});

  const [auditLogs, setAuditLogs] = useState<PlatformAuditLogEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const loadMatrix = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getPlansFeatureMatrix();
      setMatrix(data);
      // Initialize pending state from current state
      const initial: Record<string, Set<string>> = {};
      for (const plan of data.plans) {
        initial[plan.id] = new Set(data.enabledByPlan[plan.id] ?? []);
      }
      setPendingByPlan(initial);
    } catch (err) {
      setError(getMessage(err, 'Gagal memuat data'));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAuditLogs = useCallback(async () => {
    try {
      setAuditLoading(true);
      const logs = await getPlatformAuditLogs({ entityType: 'PLAN', limit: 30 });
      setAuditLogs(logs);
    } catch {
      // silent
    } finally {
      setAuditLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMatrix();
    void loadAuditLogs();
  }, [loadMatrix, loadAuditLogs]);

  function toggleCell(planId: string, flagId: string) {
    setPendingByPlan((prev) => {
      const current = new Set(prev[planId] ?? []);
      if (current.has(flagId)) {
        current.delete(flagId);
      } else {
        current.add(flagId);
      }
      return { ...prev, [planId]: current };
    });
  }

  function isChanged(planId: string) {
    if (!matrix) return false;
    const original = new Set(matrix.enabledByPlan[planId] ?? []);
    const pending = pendingByPlan[planId] ?? new Set();
    if (original.size !== pending.size) return true;
    for (const id of pending) {
      if (!original.has(id)) return true;
    }
    return false;
  }

  async function savePlan(planId: string) {
    if (!matrix) return;
    const pendingIds = [...(pendingByPlan[planId] ?? [])];
    const flagKeys = matrix.flags
      .filter((f) => pendingIds.includes(f.id))
      .map((f) => f.key);

    setSavingPlanId(planId);
    setSaveMessages((prev) => ({ ...prev, [planId]: { type: 'success', text: '' } }));

    try {
      await setPlanFeatureFlags(planId, flagKeys);
      // Refresh matrix to sync enabledByPlan
      const refreshed = await getPlansFeatureMatrix();
      setMatrix(refreshed);
      setPendingByPlan((prev) => ({
        ...prev,
        [planId]: new Set(refreshed.enabledByPlan[planId] ?? []),
      }));
      setSaveMessages((prev) => ({ ...prev, [planId]: { type: 'success', text: 'Disimpan' } }));
      void loadAuditLogs();
    } catch (err) {
      setSaveMessages((prev) => ({
        ...prev,
        [planId]: { type: 'error', text: getMessage(err, 'Gagal menyimpan') },
      }));
    } finally {
      setSavingPlanId(null);
      setTimeout(() => {
        setSaveMessages((prev) => {
          const next = { ...prev };
          delete next[planId];
          return next;
        });
      }, 3000);
    }
  }

  if (loading) {
    return (
      <div className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm">
        <div className="space-y-3">
          <div className="h-6 w-56 animate-pulse rounded bg-slate-100" />
          <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
        </div>
      </div>
    );
  }

  if (error || !matrix) {
    return (
      <div className="rounded-[28px] border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {error || 'Data tidak tersedia.'}
      </div>
    );
  }

  const { plans, flags } = matrix;

  return (
    <div className="space-y-5">
      {/* Header */}
      <section className="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-700">
            <FontAwesomeIcon icon={faTableCells} className="h-3 w-3" />
            Super Admin
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
            Plan × Feature Matrix
          </h1>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Kelola fitur yang tersedia per plan. Toggle per kolom lalu klik Simpan.
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

      {/* Matrix table */}
      <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
        {flags.length === 0 || plans.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-slate-500">
            Belum ada plan atau feature flag.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="sticky left-0 z-10 bg-white px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 after:absolute after:right-0 after:top-0 after:h-full after:w-px after:bg-slate-100">
                    Fitur
                  </th>
                  {plans.map((plan) => {
                    const changed = isChanged(plan.id);
                    const msg = saveMessages[plan.id];
                    return (
                      <th
                        key={plan.id}
                        className="min-w-[160px] px-4 py-4 text-center align-top"
                      >
                        <div className="flex flex-col items-center gap-2">
                          <span className="font-semibold text-slate-900">{plan.name}</span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                              plan.isActive
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {plan.isActive ? 'Aktif' : 'Nonaktif'}
                          </span>
                          {msg && msg.text ? (
                            <span
                              className={`text-[11px] font-medium ${
                                msg.type === 'success' ? 'text-emerald-600' : 'text-red-600'
                              }`}
                            >
                              {msg.text}
                            </span>
                          ) : null}
                          <button
                            type="button"
                            disabled={!changed || savingPlanId === plan.id}
                            onClick={() => void savePlan(plan.id)}
                            className={`inline-flex h-8 items-center gap-1.5 rounded-xl px-3 text-[12px] font-semibold transition ${
                              changed
                                ? 'bg-slate-900 text-white hover:bg-slate-800'
                                : 'cursor-default bg-slate-100 text-slate-400'
                            }`}
                          >
                            {savingPlanId === plan.id ? (
                              <FontAwesomeIcon icon={faSpinner} className="h-3 w-3 animate-spin" />
                            ) : (
                              <FontAwesomeIcon icon={faFloppyDisk} className="h-3 w-3" />
                            )}
                            {savingPlanId === plan.id ? 'Menyimpan...' : 'Simpan'}
                          </button>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {flags.map((flag, flagIdx) => (
                  <tr
                    key={flag.id}
                    className={flagIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}
                  >
                    <td className="sticky left-0 z-10 bg-inherit px-5 py-3.5 after:absolute after:right-0 after:top-0 after:h-full after:w-px after:bg-slate-100">
                      <p className="font-medium text-slate-800">{flag.name}</p>
                      <p className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">
                        {flag.key}
                      </p>
                    </td>
                    {plans.map((plan) => {
                      const enabled = (pendingByPlan[plan.id] ?? new Set()).has(flag.id);
                      const original = (matrix.enabledByPlan[plan.id] ?? []).includes(flag.id);
                      const dirty = enabled !== original;
                      return (
                        <td key={plan.id} className="px-4 py-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => toggleCell(plan.id, flag.id)}
                            title={enabled ? 'Klik untuk nonaktifkan' : 'Klik untuk aktifkan'}
                            className={`relative inline-flex h-8 w-8 items-center justify-center rounded-xl transition ${
                              enabled
                                ? 'bg-violet-100 text-violet-700 hover:bg-violet-200'
                                : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                            } ${dirty ? 'ring-2 ring-amber-400 ring-offset-1' : ''}`}
                          >
                            <FontAwesomeIcon
                              icon={enabled ? faCheck : faXmark}
                              className="h-3.5 w-3.5"
                            />
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 px-1 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-violet-100 text-violet-700">
            <FontAwesomeIcon icon={faCheck} className="h-3 w-3" />
          </span>
          Aktif
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-slate-100 text-slate-400">
            <FontAwesomeIcon icon={faXmark} className="h-3 w-3" />
          </span>
          Nonaktif
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-slate-100 ring-2 ring-amber-400" />
          Belum disimpan
        </span>
      </div>

      {/* Platform audit log */}
      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <FontAwesomeIcon icon={faSliders} className="h-4 w-4 text-slate-400" />
            Riwayat Perubahan Plan
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
                <div key={i} className="h-14 animate-pulse rounded-2xl bg-slate-100" />
              ))}
            </div>
          ) : auditLogs.length === 0 ? (
            <p className="rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-500">
              Belum ada riwayat perubahan.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {auditLogs.map((log) => (
                <div key={log.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {log.summary ?? log.action}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {log.actorUser
                          ? `${log.actorUser.fullName} (${log.actorUser.email})`
                          : 'System'}
                      </p>
                    </div>
                    <time className="shrink-0 text-xs text-slate-400">
                      {formatDateTime(log.createdAt)}
                    </time>
                  </div>
                  {log.changes !== null &&
                    log.changes !== undefined &&
                    typeof log.changes === 'object' &&
                    !Array.isArray(log.changes) && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(log.changes as { added?: string[]; removed?: string[] }).added
                          ?.length ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
                            +{(log.changes as { added: string[] }).added.join(', ')}
                          </span>
                        ) : null}
                        {(log.changes as { added?: string[]; removed?: string[] }).removed
                          ?.length ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-[11px] font-medium text-red-600">
                            −{(log.changes as { removed: string[] }).removed.join(', ')}
                          </span>
                        ) : null}
                      </div>
                    )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
