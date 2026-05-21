'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getActiveBusinessId, getCachedCurrentUser } from '@/lib/auth';
import {
  cancelSubscription,
  changeSubscriptionPlan,
  getCurrentSubscription,
  getSubscriptionChangePreview,
  getSubscriptionInvoiceDetail,
  getSubscriptionInvoices,
  getSubscriptionPlans,
  getSubscriptionUsage,
  recordSubscriptionInvoicePayment,
  reactivateSubscription,
  startSubscription,
  type CurrentSubscriptionResponse,
  type CurrentSubscriptionUsageResponse,
  type SubscriptionChangePreviewResponse,
  type SubscriptionInvoiceDetailResponse,
  type SubscriptionLifecycleActionResponse,
  type SubscriptionInvoiceListResponse,
  type SubscriptionInvoicePaymentResponse,
  type SubscriptionPaymentMethodCode,
  type SubscriptionPaymentStatusCode,
  type SubscriptionPlanChangeResultResponse,
  type SubscriptionPlanSummary,
  type SubscriptionStartResponse,
  type SubscriptionStatusCode,
} from '@/lib/subscription';

const PAYMENT_METHOD_OPTIONS: SubscriptionPaymentMethodCode[] = [
  'TRANSFER',
  'QRIS',
  'CARD',
  'CASH',
  'OTHER',
];

function formatCurrency(value: number, currencyCode: string) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string | null) {
  if (!value) {
    return '-';
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
  }).format(parsedDate);
}

function formatDateTime(value: string | null) {
  if (!value) {
    return '-';
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsedDate);
}

function formatLimit(value: number | null) {
  if (value === null) {
    return 'Custom';
  }

  return value.toLocaleString('id-ID');
}

function formatStatusLabel(value: string) {
  return value.replaceAll('_', ' ');
}

function toDateTimeLocalValue(date: Date) {
  const localTime = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
  return localTime.toISOString().slice(0, 16);
}

function getInvoiceStatusClasses(status: string) {
  if (status === 'PAID') {
    return 'bg-emerald-100 text-emerald-700';
  }

  if (status === 'OVERDUE') {
    return 'bg-rose-100 text-rose-700';
  }

  if (status === 'ISSUED') {
    return 'bg-amber-100 text-amber-700';
  }

  if (status === 'VOID') {
    return 'bg-slate-200 text-slate-600';
  }

  return 'bg-slate-100 text-slate-700';
}

function getPaymentStatusClasses(status: SubscriptionPaymentStatusCode) {
  if (status === 'PAID') {
    return 'bg-emerald-100 text-emerald-700';
  }

  if (status === 'PENDING') {
    return 'bg-amber-100 text-amber-700';
  }

  if (status === 'FAILED') {
    return 'bg-rose-100 text-rose-700';
  }

  if (status === 'VOID' || status === 'REFUNDED') {
    return 'bg-slate-200 text-slate-600';
  }

  return 'bg-slate-100 text-slate-700';
}

function getSubscriptionStatusClasses(status: SubscriptionStatusCode) {
  if (status === 'ACTIVE') {
    return 'bg-emerald-100 text-emerald-700';
  }

  if (status === 'TRIAL') {
    return 'bg-sky-100 text-sky-700';
  }

  if (status === 'PAST_DUE') {
    return 'bg-amber-100 text-amber-700';
  }

  if (status === 'SUSPENDED') {
    return 'bg-rose-100 text-rose-700';
  }

  return 'bg-slate-200 text-slate-600';
}

function calculatePaidAmount(invoice: SubscriptionInvoiceDetailResponse) {
  return invoice.payments.reduce((total, payment) => {
    if (payment.status !== 'PAID') {
      return total;
    }

    return total + payment.amount;
  }, 0);
}

function calculateOutstandingAmount(invoice: SubscriptionInvoiceDetailResponse) {
  return Math.max(0, invoice.totalAmount - calculatePaidAmount(invoice));
}

export default function BillingSettingsPage() {
  const [currentSubscription, setCurrentSubscription] =
    useState<CurrentSubscriptionResponse | null>(null);
  const [usage, setUsage] = useState<CurrentSubscriptionUsageResponse | null>(null);
  const [invoices, setInvoices] = useState<SubscriptionInvoiceListResponse | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [selectedInvoiceDetail, setSelectedInvoiceDetail] =
    useState<SubscriptionInvoiceDetailResponse | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlanSummary[]>([]);
  const [planPreview, setPlanPreview] =
    useState<SubscriptionChangePreviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingInvoiceDetail, setLoadingInvoiceDetail] = useState(false);
  const [loadingPlanPreview, setLoadingPlanPreview] = useState(false);
  const [submittingPlanChange, setSubmittingPlanChange] = useState(false);
  const [submittingSubscriptionStart, setSubmittingSubscriptionStart] = useState(false);
  const [submittingInvoicePayment, setSubmittingInvoicePayment] = useState(false);
  const [submittingLifecycleAction, setSubmittingLifecycleAction] = useState(false);
  const [message, setMessage] = useState('');
  const [invoiceFeedback, setInvoiceFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [planMessage, setPlanMessage] = useState('');
  const [lifecycleMessage, setLifecycleMessage] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [paymentMethod, setPaymentMethod] =
    useState<SubscriptionPaymentMethodCode>('TRANSFER');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentReferenceNumber, setPaymentReferenceNumber] = useState('');
  const [paymentPaidAt, setPaymentPaidAt] = useState(toDateTimeLocalValue(new Date()));

  const [forceImmediate, setForceImmediate] = useState(false);

  const isSuperAdmin = useMemo(() => {
    const currentUser = getCachedCurrentUser();
    return Boolean(currentUser?.platformRoles.includes('SUPER_ADMIN'));
  }, []);

  const ownerAccess = useMemo(() => {
    const currentUser = getCachedCurrentUser();
    if (!currentUser) {
      return false;
    }

    if (currentUser.platformRoles.includes('SUPER_ADMIN')) {
      return true;
    }

    const activeBusinessId = getActiveBusinessId();
    const activeMembership = currentUser.businessMemberships.find(
      (membership) =>
        membership.businessId === activeBusinessId && membership.status === 'ACTIVE',
    );

    return activeMembership?.role === 'OWNER';
  }, []);
  const subscriptionManagementAccess = useMemo(() => {
    const currentUser = getCachedCurrentUser();

    if (!currentUser) {
      return false;
    }

    return currentUser.platformRoles.includes('SUPER_ADMIN');
  }, []);

  async function refreshBillingData(preferredInvoiceId?: string | null) {
    setMessage('');
    const [plansResult, currentResult, usageResult, invoicesResult] = await Promise.all([
      getSubscriptionPlans(),
      getCurrentSubscription(),
      getSubscriptionUsage(),
      getSubscriptionInvoices({ page: 1, perPage: 10 }),
    ]);

    setPlans(plansResult);
    setCurrentSubscription(currentResult);
    setUsage(usageResult);
    setInvoices(invoicesResult);

    const matchedInvoiceId =
      preferredInvoiceId &&
      invoicesResult.items.some((invoice) => invoice.id === preferredInvoiceId)
        ? preferredInvoiceId
        : invoicesResult.items[0]?.id ?? null;

    setSelectedInvoiceId(matchedInvoiceId);

    return {
      currentResult,
      usageResult,
      invoicesResult,
      matchedInvoiceId,
    };
  }

  useEffect(() => {
    if (!ownerAccess) {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        await refreshBillingData();
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : 'Gagal memuat billing subscription',
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [ownerAccess]);

  useEffect(() => {
    if (!selectedInvoiceId) {
      setSelectedInvoiceDetail(null);
      setInvoiceFeedback(null);
      return;
    }

    let isCancelled = false;

    (async () => {
      try {
        setLoadingInvoiceDetail(true);
        const detail = await getSubscriptionInvoiceDetail(selectedInvoiceId);

        if (!isCancelled) {
          setSelectedInvoiceDetail(detail);
        }
      } catch (error) {
        if (!isCancelled) {
          setSelectedInvoiceDetail(null);
          setInvoiceFeedback({
            type: 'error',
            message:
              error instanceof Error
                ? error.message
                : 'Gagal memuat detail invoice subscription',
          });
        }
      } finally {
        if (!isCancelled) {
          setLoadingInvoiceDetail(false);
        }
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [selectedInvoiceId]);

  useEffect(() => {
    if (!selectedInvoiceDetail) {
      setPaymentMethod('TRANSFER');
      setPaymentAmount('');
      setPaymentReferenceNumber('');
      setPaymentPaidAt(toDateTimeLocalValue(new Date()));
      return;
    }

    const outstandingAmount = calculateOutstandingAmount(selectedInvoiceDetail);

    setPaymentMethod('TRANSFER');
    setPaymentAmount(
      outstandingAmount > 0 ? String(Math.round(outstandingAmount)) : '',
    );
    setPaymentReferenceNumber('');
    setPaymentPaidAt(toDateTimeLocalValue(new Date()));
  }, [selectedInvoiceDetail]);

  async function handlePreviewPlan(
    targetPlanCode: SubscriptionPlanSummary['code'],
    overrideForceImmediate?: boolean,
  ) {
    if (currentSubscription?.status === 'CANCELLED') {
      setPlanMessage(
        'Subscription yang sudah cancelled tidak bisa dipreview untuk perubahan plan dari halaman ini.',
      );
      setPlanPreview(null);
      return;
    }

    try {
      setLoadingPlanPreview(true);
      setPlanMessage('');
      const fi = overrideForceImmediate ?? forceImmediate;
      const preview = await getSubscriptionChangePreview(targetPlanCode, isSuperAdmin ? fi : false);
      setPlanPreview(preview);
    } catch (error) {
      setPlanMessage(
        error instanceof Error ? error.message : 'Gagal memuat preview perubahan plan',
      );
      setPlanPreview(null);
    } finally {
      setLoadingPlanPreview(false);
    }
  }

  async function handleToggleForceImmediate(checked: boolean) {
    setForceImmediate(checked);
    if (planPreview) {
      await handlePreviewPlan(planPreview.targetPlan.code, checked);
    }
  }

  async function handleApplyPlanChange() {
    if (!planPreview) {
      return;
    }

    if (currentSubscription?.status === 'CANCELLED') {
      setPlanMessage(
        'Subscription yang sudah cancelled tidak bisa diproses untuk perubahan plan.',
      );
      return;
    }

    try {
      setSubmittingPlanChange(true);
      setPlanMessage('');

      const result: SubscriptionPlanChangeResultResponse = await changeSubscriptionPlan(
        planPreview.targetPlan.code,
        isSuperAdmin ? forceImmediate : false,
      );

      await refreshBillingData(selectedInvoiceId);
      setPlanMessage(result.message);
      setPlanPreview(null);
    } catch (error) {
      setPlanMessage(
        error instanceof Error ? error.message : 'Gagal memproses perubahan plan',
      );
    } finally {
      setSubmittingPlanChange(false);
    }
  }

  async function handleStartSubscription(targetPlanCode: SubscriptionPlanSummary['code']) {
    try {
      setSubmittingSubscriptionStart(true);
      setPlanMessage('');
      setPlanPreview(null);

      const result: SubscriptionStartResponse = await startSubscription(targetPlanCode);

      await refreshBillingData();
      setPlanMessage(result.message);
      setSelectedInvoiceId(result.invoice.id);
      setInvoiceFeedback({
        type: 'success',
        message: `Invoice awal ${result.invoice.invoiceNumber} berhasil diterbitkan untuk subscription baru.`,
      });
    } catch (error) {
      setPlanMessage(
        error instanceof Error ? error.message : 'Gagal memulai subscription baru',
      );
    } finally {
      setSubmittingSubscriptionStart(false);
    }
  }

  async function handleCancelSubscription() {
    try {
      setSubmittingLifecycleAction(true);
      setLifecycleMessage(null);
      const result: SubscriptionLifecycleActionResponse = await cancelSubscription();

      await refreshBillingData(selectedInvoiceId);
      setLifecycleMessage({
        type: 'success',
        message: result.message,
      });
    } catch (error) {
      setLifecycleMessage({
        type: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Gagal menjadwalkan penghentian subscription',
      });
    } finally {
      setSubmittingLifecycleAction(false);
    }
  }

  async function handleReactivateSubscription() {
    try {
      setSubmittingLifecycleAction(true);
      setLifecycleMessage(null);
      const result: SubscriptionLifecycleActionResponse = await reactivateSubscription();

      await refreshBillingData(selectedInvoiceId);
      setLifecycleMessage({
        type: 'success',
        message: result.message,
      });
    } catch (error) {
      setLifecycleMessage({
        type: 'error',
        message:
          error instanceof Error ? error.message : 'Gagal mengaktifkan kembali subscription',
      });
    } finally {
      setSubmittingLifecycleAction(false);
    }
  }

  async function handleRecordInvoicePayment() {
    if (!selectedInvoiceDetail) {
      return;
    }

    const amount = Number(paymentAmount);
    if (Number.isNaN(amount) || amount <= 0) {
      setInvoiceFeedback({
        type: 'error',
        message: 'Nominal pembayaran subscription harus lebih dari 0.',
      });
      return;
    }

    try {
      setSubmittingInvoicePayment(true);
      setInvoiceFeedback(null);

      const result: SubscriptionInvoicePaymentResponse =
        await recordSubscriptionInvoicePayment({
          invoiceId: selectedInvoiceDetail.id,
          method: paymentMethod,
          amount,
          referenceNumber: paymentReferenceNumber.trim() || null,
          paidAt: paymentPaidAt ? new Date(paymentPaidAt).toISOString() : undefined,
        });

      await refreshBillingData(selectedInvoiceDetail.id);
      const updatedDetail = await getSubscriptionInvoiceDetail(selectedInvoiceDetail.id);
      setSelectedInvoiceDetail(updatedDetail);
      setInvoiceFeedback({
        type: 'success',
        message: `Payment ${formatCurrency(
          result.paidAmount,
          currentSubscription?.plan.currencyCode ?? 'IDR',
        )} berhasil dicatat untuk ${result.invoiceNumber}.`,
      });
    } catch (error) {
      setInvoiceFeedback({
        type: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Gagal mencatat pembayaran invoice subscription',
      });
    } finally {
      setSubmittingInvoicePayment(false);
    }
  }

  const currentCurrencyCode = currentSubscription?.plan.currencyCode ?? 'IDR';
  const selectedInvoicePaidAmount = selectedInvoiceDetail
    ? calculatePaidAmount(selectedInvoiceDetail)
    : 0;
  const selectedInvoiceOutstandingAmount = selectedInvoiceDetail
    ? calculateOutstandingAmount(selectedInvoiceDetail)
    : 0;
  const canRecordPayment =
    selectedInvoiceDetail !== null &&
    selectedInvoiceDetail.status !== 'PAID' &&
    selectedInvoiceDetail.status !== 'VOID' &&
    selectedInvoiceOutstandingAmount > 0;
  const isCancelledSubscription = currentSubscription?.status === 'CANCELLED';
  const canPreviewPlanChanges =
    subscriptionManagementAccess &&
    currentSubscription !== null &&
    currentSubscription.status !== 'CANCELLED';
  const canStartSubscription =
    subscriptionManagementAccess &&
    currentSubscription !== null &&
    currentSubscription.status === 'CANCELLED';

  if (!ownerAccess) {
    return (
      <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-amber-950">Billing Subscription</h1>
        <p className="mt-2 text-sm text-amber-800">
          Halaman billing hanya bisa diakses oleh owner business atau super admin.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        Memuat billing subscription...
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Billing Subscription</h1>
            <p className="text-sm text-slate-500">
              Lihat paket aktif, status subscription, usage bulan berjalan, dan invoice dasar.
            </p>
          </div>
          {message ? <p className="text-sm text-rose-600">{message}</p> : null}
        </div>
      </section>

      {currentSubscription?.cancelAtPeriodEnd ? (
        <section className="rounded-[28px] border border-slate-200 bg-slate-50 px-5 py-5 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Cancellation Scheduled
              </p>
              <h2 className="mt-2 text-lg font-semibold text-slate-900">
                Subscription akan berhenti di akhir periode aktif
              </h2>
              <p className="mt-2 text-sm text-slate-700">
                Access write akan berhenti setelah {formatDate(currentSubscription.currentPeriodEnd)}.
                Anda masih bisa membatalkan jadwal ini sebelum periode berakhir.
              </p>
            </div>
            <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
              Stops {formatDate(currentSubscription.currentPeriodEnd)}
            </span>
          </div>
        </section>
      ) : null}

      {currentSubscription && currentSubscription.status !== 'ACTIVE' ? (
        <section
          className={`rounded-[28px] border px-5 py-5 shadow-sm ${
            currentSubscription.status === 'SUSPENDED'
              ? 'border-rose-200 bg-rose-50'
              : currentSubscription.status === 'CANCELLED'
                ? 'border-slate-300 bg-slate-100'
              : 'border-amber-200 bg-amber-50'
          }`}
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Subscription Notice
              </p>
              <h2 className="mt-2 text-lg font-semibold text-slate-900">
                Status saat ini: {formatStatusLabel(currentSubscription.status)}
              </h2>
              <p className="mt-2 text-sm text-slate-700">
                {currentSubscription.status === 'PAST_DUE'
                  ? currentSubscription.graceEndsAt
                    ? `Invoice subscription masih overdue. Grace period aktif sampai ${formatDate(
                        currentSubscription.graceEndsAt,
                      )}.`
                    : 'Invoice subscription masih overdue dan butuh pembayaran.'
                  : currentSubscription.status === 'SUSPENDED'
                    ? 'Subscription sudah suspended. Catat pembayaran invoice overdue untuk mengaktifkan kembali access billing ini.'
                    : currentSubscription.status === 'CANCELLED'
                      ? `Subscription sudah berakhir pada ${formatDate(
                          currentSubscription.cancelledAt ?? currentSubscription.currentPeriodEnd,
                        )}. Histori invoice tetap tersedia di bawah, tetapi perubahan plan dari subscription ini sudah ditutup.`
                    : 'Subscription belum fully active.'}
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${getSubscriptionStatusClasses(
                currentSubscription.status,
              )}`}
            >
              {formatStatusLabel(currentSubscription.status)}
            </span>
          </div>
        </section>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Current Subscription</h2>
              <p className="text-sm text-slate-500">
                Ringkasan status plan terakhir dan kontrol lifecycle subscription.
              </p>
            </div>
            {subscriptionManagementAccess &&
            currentSubscription &&
            currentSubscription.status !== 'CANCELLED' ? (
              <div className="flex flex-wrap gap-3">
                {currentSubscription.cancelAtPeriodEnd ? (
                  <button
                    type="button"
                    onClick={() => void handleReactivateSubscription()}
                    disabled={submittingLifecycleAction}
                    className="h-11 rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {submittingLifecycleAction ? 'Memproses...' : 'Reactivate Subscription'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleCancelSubscription()}
                    disabled={submittingLifecycleAction}
                    className="h-11 rounded-2xl border border-rose-300 px-5 text-sm font-semibold text-rose-700 disabled:opacity-60"
                  >
                    {submittingLifecycleAction ? 'Memproses...' : 'Cancel At Period End'}
                  </button>
                )}
              </div>
            ) : null}
          </div>
          {currentSubscription ? (
            <div className="mt-4 space-y-4">
              {lifecycleMessage ? (
                <div
                  className={`rounded-2xl border px-4 py-4 text-sm ${
                    lifecycleMessage.type === 'success'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-rose-200 bg-rose-50 text-rose-700'
                  }`}
                >
                  {lifecycleMessage.message}
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-3xl bg-slate-950 px-5 py-5 text-white">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                  Active Plan
                </p>
                <p className="mt-3 text-3xl font-semibold">
                  {currentSubscription.plan.name}
                </p>
                <p className="mt-2 text-sm text-slate-300">
                  {currentSubscription.plan.description ?? 'Paket aktif untuk business saat ini.'}
                </p>
                <p className="mt-5 text-lg font-semibold">
                  {currentSubscription.plan.isCustomPricing
                    ? 'Custom pricing'
                    : formatCurrency(
                        currentSubscription.plan.monthlyPrice,
                        currentSubscription.plan.currencyCode,
                      )}
                </p>
              </div>

              <div className="grid gap-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Status
                  </p>
                  <div className="mt-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${getSubscriptionStatusClasses(
                        currentSubscription.status,
                      )}`}
                    >
                      {formatStatusLabel(currentSubscription.status)}
                    </span>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Current Period
                  </p>
                  <p className="mt-2 font-medium text-slate-900">
                    {formatDate(currentSubscription.currentPeriodStart)} -{' '}
                    {formatDate(currentSubscription.currentPeriodEnd)}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Grace Period
                  </p>
                  <p className="mt-2 font-medium text-slate-900">
                    {currentSubscription.isInGracePeriod && currentSubscription.graceEndsAt
                      ? `Aktif sampai ${formatDate(currentSubscription.graceEndsAt)}`
                      : 'Tidak aktif'}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Cancellation Schedule
                  </p>
                  <p className="mt-2 font-medium text-slate-900">
                    {currentSubscription.cancelledAt
                      ? `Berakhir pada ${formatDate(currentSubscription.cancelledAt)}`
                      : currentSubscription.cancelAtPeriodEnd
                      ? `Aktif, berhenti pada ${formatDate(currentSubscription.currentPeriodEnd)}`
                      : 'Tidak dijadwalkan'}
                  </p>
                </div>
              </div>
            </div>
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
              Belum ada subscription untuk business ini.
            </div>
          )}
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Usage This Month</h2>
          {usage ? (
            <div className="mt-4 grid gap-3">
              {[
                {
                  label: 'Outlets',
                  usageValue: usage.usage.outlets,
                  remainingValue: usage.remaining.outlets,
                  limitValue: usage.plan.limits.maxOutlets,
                },
                {
                  label: 'Active Users',
                  usageValue: usage.usage.users,
                  remainingValue: usage.remaining.users,
                  limitValue: usage.plan.limits.maxUsers,
                },
                {
                  label: 'Active Products',
                  usageValue: usage.usage.products,
                  remainingValue: usage.remaining.products,
                  limitValue: usage.plan.limits.maxProducts,
                },
                {
                  label: 'Monthly Transactions',
                  usageValue: usage.usage.monthlyTransactions,
                  remainingValue: usage.remaining.monthlyTransactions,
                  limitValue: usage.plan.limits.maxMonthlyTransactions,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                        {item.label}
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-slate-900">
                        {item.usageValue.toLocaleString('id-ID')}
                      </p>
                    </div>
                    <div className="text-right text-sm text-slate-500">
                      <p>Limit {formatLimit(item.limitValue)}</p>
                      <p>
                        Sisa{' '}
                        {item.remainingValue === null
                          ? 'Custom'
                          : item.remainingValue.toLocaleString('id-ID')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
              Usage subscription belum tersedia.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-slate-900">Plan Catalog</h2>
            {isCancelledSubscription && subscriptionManagementAccess ? (
              <p className="text-sm text-slate-500">
                Subscription ini sudah cancelled. Pilih plan untuk memulai subscription baru, lalu
                invoice awal akan diterbitkan otomatis untuk periode berjalan.
              </p>
            ) : isCancelledSubscription ? (
              <p className="text-sm text-slate-500">
                Subscription ini sudah cancelled. Untuk memulai plan baru, hubungi super admin
                sistem.
              </p>
            ) : currentSubscription && !subscriptionManagementAccess ? (
              <p className="text-sm text-slate-500">
                Owner business hanya dapat melihat plan. Perubahan plan subscription dilakukan oleh
                super admin sistem.
              </p>
            ) : null}
          </div>
          {subscriptionManagementAccess ? (
            <Link
              href="/dashboard/subscription-plans/create"
              className="inline-flex h-11 items-center rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white"
            >
              Buat Plan Baru
            </Link>
          ) : null}
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan) => {
            const isCurrentPlan =
              currentSubscription?.status !== 'CANCELLED' &&
              currentSubscription?.plan.code === plan.code;
            const isLastCancelledPlan =
              currentSubscription?.status === 'CANCELLED' &&
              currentSubscription.plan.code === plan.code;

            return (
              <article
                key={plan.id}
                className={`rounded-3xl border px-5 py-5 shadow-sm ${
                  isCurrentPlan
                    ? 'border-emerald-300 bg-emerald-50'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900">{plan.name}</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {plan.description ?? 'Paket subscription aktif.'}
                    </p>
                  </div>
                  {isCurrentPlan ? (
                    <span className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white">
                      Active
                    </span>
                  ) : isLastCancelledPlan ? (
                    <span className="rounded-full bg-slate-700 px-3 py-1 text-xs font-semibold text-white">
                      Last Plan
                    </span>
                  ) : null}
                </div>
                <p className="mt-4 text-2xl font-semibold text-slate-900">
                  {plan.isCustomPricing
                    ? 'Custom pricing'
                    : formatCurrency(plan.monthlyPrice, plan.currencyCode)}
                </p>
                <div className="mt-4 grid gap-2 text-sm text-slate-600">
                  <p>Outlets: {formatLimit(plan.limits.maxOutlets)}</p>
                  <p>Users: {formatLimit(plan.limits.maxUsers)}</p>
                  <p>Products: {formatLimit(plan.limits.maxProducts)}</p>
                  <p>
                    Transactions / month:{' '}
                    {formatLimit(plan.limits.maxMonthlyTransactions)}
                  </p>
                </div>
                {!isCurrentPlan && canPreviewPlanChanges ? (
                  <button
                    type="button"
                    onClick={() => void handlePreviewPlan(plan.code)}
                    className="mt-5 h-11 rounded-2xl border border-slate-300 px-4 text-sm font-semibold text-slate-900 transition hover:border-slate-900 hover:bg-slate-900 hover:text-white"
                  >
                    Preview Change
                  </button>
                ) : null}
                {canStartSubscription ? (
                  <button
                    type="button"
                    onClick={() => void handleStartSubscription(plan.code)}
                    disabled={submittingSubscriptionStart}
                    className="mt-5 h-11 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {submittingSubscriptionStart ? 'Memproses...' : 'Start Subscription'}
                  </button>
                ) : null}
                {subscriptionManagementAccess ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      href={`/dashboard/subscription-plans/${plan.id}/edit`}
                      className="inline-flex h-10 items-center rounded-2xl border border-slate-300 px-4 text-sm font-semibold text-slate-900 hover:border-slate-900 hover:bg-slate-100"
                    >
                      Edit Plan
                    </Link>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Plan Change Preview</h2>
            <p className="text-sm text-slate-500">
              Preview upgrade diterapkan langsung, sedangkan downgrade dijadwalkan di akhir periode.
            </p>
          </div>
          {planMessage ? <p className="text-sm text-slate-600">{planMessage}</p> : null}
        </div>

        {!subscriptionManagementAccess ? (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
            Preview perubahan plan hanya tersedia untuk super admin sistem.
          </div>
        ) : loadingPlanPreview ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
            Memuat preview perubahan plan...
          </div>
        ) : isCancelledSubscription ? (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
            Preview perubahan plan tidak tersedia untuk subscription yang sudah cancelled.
          </div>
        ) : planPreview ? (
          <div className="mt-4 space-y-4">
            <div className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Current Plan
                </p>
                <p className="mt-3 text-xl font-semibold text-slate-900">
                  {planPreview.currentPlan.name}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  {formatCurrency(
                    planPreview.currentPlan.monthlyPrice,
                    planPreview.currentPlan.currencyCode,
                  )}
                </p>
              </div>

              <div className="rounded-3xl border border-slate-900 bg-slate-950 p-4 text-white">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
                  Target Plan
                </p>
                <p className="mt-3 text-xl font-semibold">{planPreview.targetPlan.name}</p>
                <p className="mt-2 text-sm text-slate-300">
                  {formatCurrency(
                    planPreview.targetPlan.monthlyPrice,
                    planPreview.targetPlan.currencyCode,
                  )}
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Change Type
                </p>
                <p className="mt-2 font-medium text-slate-900">
                  {formatStatusLabel(planPreview.changeType)}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Effective At
                </p>
                <p className="mt-2 font-medium text-slate-900">
                  {formatDate(planPreview.effectiveAt)}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Policy
                </p>
                <p className="mt-2 font-medium text-slate-900">
                  {planPreview.isImmediate ? 'Immediate' : 'Scheduled'}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-sm font-medium text-slate-900">{planPreview.note}</p>
            </div>

            {isSuperAdmin && planPreview.changeType === 'DOWNGRADE' && (
              <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                <input
                  type="checkbox"
                  checked={forceImmediate}
                  onChange={(e) => { void handleToggleForceImmediate(e.target.checked); }}
                  className="h-4 w-4 accent-amber-600"
                />
                <div>
                  <p className="text-sm font-semibold text-amber-900">Force apply sekarang (Super Admin)</p>
                  <p className="text-xs text-amber-700">
                    Downgrade diterapkan langsung tanpa menunggu akhir periode.
                  </p>
                </div>
              </label>
            )}

            {planPreview.violations.length > 0 ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4">
                <p className="text-sm font-semibold text-rose-800">
                  Downgrade belum bisa diproses karena usage masih melebihi limit target:
                </p>
                <div className="mt-3 space-y-2 text-sm text-rose-700">
                  {planPreview.violations.map((violation) => (
                    <p key={violation.metric}>
                      {violation.label}: usage {violation.usage.toLocaleString('id-ID')} / limit{' '}
                      {violation.targetLimit.toLocaleString('id-ID')}
                    </p>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void handleApplyPlanChange()}
                disabled={submittingPlanChange || !planPreview.canProceed}
                className="h-11 rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {submittingPlanChange ? 'Menyimpan...' : 'Submit Plan Change'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPlanPreview(null);
                  setPlanMessage('');
                  setForceImmediate(false);
                }}
                className="h-11 rounded-2xl border border-slate-300 px-5 text-sm font-semibold text-slate-700"
              >
                Clear Preview
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
            Pilih plan target dari katalog untuk melihat preview upgrade atau downgrade.
          </div>
        )}
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Subscription Invoices</h2>
            <p className="text-sm text-slate-500">
              Riwayat invoice subscription dasar untuk business aktif.
            </p>
          </div>
          <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {invoices?.meta.total ?? 0} invoice
          </div>
        </div>

        {invoices && invoices.items.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.14em] text-slate-400">
                <tr>
                  <th className="px-3 py-3">Invoice</th>
                  <th className="px-3 py-3">Period</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Due Date</th>
                  <th className="px-3 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoices.items.map((invoice) => (
                  <tr key={invoice.id} className="border-t border-slate-100">
                    <td className="px-3 py-4">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedInvoiceId(invoice.id);
                          setInvoiceFeedback(null);
                        }}
                        className="text-left"
                      >
                        <p className="font-medium text-slate-900">{invoice.invoiceNumber}</p>
                        <p className="text-xs text-slate-500">
                          Payment entries: {invoice.payments.length}
                        </p>
                      </button>
                    </td>
                    <td className="px-3 py-4 text-slate-600">
                      {formatDate(invoice.billingPeriodStart)} -{' '}
                      {formatDate(invoice.billingPeriodEnd)}
                    </td>
                    <td className="px-3 py-4">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedInvoiceId(invoice.id);
                          setInvoiceFeedback(null);
                        }}
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${getInvoiceStatusClasses(
                          invoice.status,
                        )}`}
                      >
                        {formatStatusLabel(invoice.status)}
                      </button>
                    </td>
                    <td className="px-3 py-4 text-slate-600">
                      {formatDate(invoice.dueDate)}
                    </td>
                    <td className="px-3 py-4 text-right font-medium text-slate-900">
                      {formatCurrency(invoice.totalAmount, currentCurrencyCode)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
            Belum ada invoice subscription untuk business ini.
          </div>
        )}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_0.95fr]">
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Invoice Detail</h2>
              <p className="text-sm text-slate-500">
                Detail invoice subscription terpilih untuk billing period berikutnya.
              </p>
            </div>
            {selectedInvoiceDetail ? (
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${getInvoiceStatusClasses(
                  selectedInvoiceDetail.status,
                )}`}
              >
                {formatStatusLabel(selectedInvoiceDetail.status)}
              </span>
            ) : null}
          </div>

          {loadingInvoiceDetail ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
              Memuat detail invoice...
            </div>
          ) : invoiceFeedback?.type === 'error' && !selectedInvoiceDetail ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-6 text-sm text-rose-700">
              {invoiceFeedback.message}
            </div>
          ) : selectedInvoiceDetail ? (
            <div className="mt-4 space-y-4">
              {invoiceFeedback ? (
                <div
                  className={`rounded-2xl border px-4 py-4 text-sm ${
                    invoiceFeedback.type === 'success'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-rose-200 bg-rose-50 text-rose-700'
                  }`}
                >
                  {invoiceFeedback.message}
                </div>
              ) : null}

              <div className="rounded-3xl bg-slate-950 px-5 py-5 text-white">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                  Invoice Number
                </p>
                <p className="mt-3 text-2xl font-semibold">
                  {selectedInvoiceDetail.invoiceNumber}
                </p>
                <p className="mt-2 text-sm text-slate-300">
                  Period {formatDate(selectedInvoiceDetail.billingPeriodStart)} -{' '}
                  {formatDate(selectedInvoiceDetail.billingPeriodEnd)}
                </p>
                <p className="mt-5 text-lg font-semibold">
                  {formatCurrency(selectedInvoiceDetail.totalAmount, currentCurrencyCode)}
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Due Date
                  </p>
                  <p className="mt-2 font-medium text-slate-900">
                    {formatDate(selectedInvoiceDetail.dueDate)}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Issued At
                  </p>
                  <p className="mt-2 font-medium text-slate-900">
                    {formatDate(selectedInvoiceDetail.issuedAt)}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Paid At
                  </p>
                  <p className="mt-2 font-medium text-slate-900">
                    {formatDate(selectedInvoiceDetail.paidAt)}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Voided At
                  </p>
                  <p className="mt-2 font-medium text-slate-900">
                    {formatDate(selectedInvoiceDetail.voidedAt)}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Total Paid
                  </p>
                  <p className="mt-2 font-semibold text-slate-900">
                    {formatCurrency(selectedInvoicePaidAmount, currentCurrencyCode)}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Outstanding
                  </p>
                  <p className="mt-2 font-semibold text-slate-900">
                    {formatCurrency(selectedInvoiceOutstandingAmount, currentCurrencyCode)}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Payment Entries
                  </p>
                  <p className="mt-2 font-semibold text-slate-900">
                    {selectedInvoiceDetail.payments.length.toLocaleString('id-ID')}
                  </p>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-900">Amount Breakdown</h3>
                <div className="mt-3 space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-3 text-slate-600">
                    <span>Subtotal</span>
                    <span className="font-medium text-slate-900">
                      {formatCurrency(selectedInvoiceDetail.subtotal, currentCurrencyCode)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-slate-600">
                    <span>Tax</span>
                    <span className="font-medium text-slate-900">
                      {formatCurrency(selectedInvoiceDetail.taxAmount, currentCurrencyCode)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-3 text-slate-600">
                    <span>Total</span>
                    <span className="text-base font-semibold text-slate-950">
                      {formatCurrency(selectedInvoiceDetail.totalAmount, currentCurrencyCode)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
              Pilih invoice dari tabel untuk melihat detail.
            </div>
          )}
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Payment Entries</h2>
          <p className="text-sm text-slate-500">
            Riwayat payment yang sudah ditautkan ke invoice subscription terpilih.
          </p>

          {selectedInvoiceDetail ? (
            <div className="mt-4 space-y-4">
              {canRecordPayment ? (
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">
                        Record Manual Payment
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Catat pembayaran untuk invoice yang masih issued atau overdue.
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${getInvoiceStatusClasses(
                        selectedInvoiceDetail.status,
                      )}`}
                    >
                      {formatStatusLabel(selectedInvoiceDetail.status)}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                      <p>Invoice total</p>
                      <p className="mt-2 font-semibold text-slate-900">
                        {formatCurrency(selectedInvoiceDetail.totalAmount, currentCurrencyCode)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                      <p>Sisa tagihan</p>
                      <p className="mt-2 font-semibold text-slate-900">
                        {formatCurrency(selectedInvoiceOutstandingAmount, currentCurrencyCode)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3">
                    <label className="grid gap-2 text-sm text-slate-600">
                      <span className="font-medium text-slate-900">Metode pembayaran</span>
                      <select
                        value={paymentMethod}
                        onChange={(event) =>
                          setPaymentMethod(
                            event.target.value as SubscriptionPaymentMethodCode,
                          )
                        }
                        className="h-11 rounded-2xl border border-slate-300 bg-white px-3 text-slate-900 outline-none"
                      >
                        {PAYMENT_METHOD_OPTIONS.map((method) => (
                          <option key={method} value={method}>
                            {method}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="grid gap-2 text-sm text-slate-600">
                      <span className="font-medium text-slate-900">Nominal pembayaran</span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={paymentAmount}
                        onChange={(event) => setPaymentAmount(event.target.value)}
                        className="h-11 rounded-2xl border border-slate-300 bg-white px-3 text-slate-900 outline-none"
                      />
                    </label>

                    <label className="grid gap-2 text-sm text-slate-600">
                      <span className="font-medium text-slate-900">Reference number</span>
                      <input
                        type="text"
                        value={paymentReferenceNumber}
                        onChange={(event) => setPaymentReferenceNumber(event.target.value)}
                        placeholder="Contoh: PAY-SUB-001"
                        className="h-11 rounded-2xl border border-slate-300 bg-white px-3 text-slate-900 outline-none"
                      />
                    </label>

                    <label className="grid gap-2 text-sm text-slate-600">
                      <span className="font-medium text-slate-900">Paid at</span>
                      <input
                        type="datetime-local"
                        value={paymentPaidAt}
                        onChange={(event) => setPaymentPaidAt(event.target.value)}
                        className="h-11 rounded-2xl border border-slate-300 bg-white px-3 text-slate-900 outline-none"
                      />
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleRecordInvoicePayment()}
                    disabled={submittingInvoicePayment}
                    className="mt-4 h-11 rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {submittingInvoicePayment ? 'Menyimpan payment...' : 'Record Payment'}
                  </button>
                </div>
              ) : null}

              {selectedInvoiceDetail.payments.length > 0 ? (
                <div className="space-y-3">
                  {selectedInvoiceDetail.payments.map((payment) => (
                    <article
                      key={payment.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {payment.method}
                          </p>
                          <p className="text-xs text-slate-500">
                            Ref: {payment.referenceNumber ?? '-'}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${getPaymentStatusClasses(
                            payment.status,
                          )}`}
                        >
                          {formatStatusLabel(payment.status)}
                        </span>
                      </div>

                      <div className="mt-3 grid gap-2 text-sm text-slate-600">
                        <p>
                          Amount:{' '}
                          <span className="font-medium text-slate-900">
                            {formatCurrency(payment.amount, currentCurrencyCode)}
                          </span>
                        </p>
                        <p>
                          Paid At:{' '}
                          <span className="font-medium text-slate-900">
                            {formatDateTime(payment.paidAt)}
                          </span>
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
                  Belum ada payment entry untuk invoice ini.
                </div>
              )}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
              Pilih invoice terlebih dahulu.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
