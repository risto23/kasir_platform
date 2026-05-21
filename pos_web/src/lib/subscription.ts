import { api } from '@/lib/api';

export type SubscriptionPlanCode =
  | 'STARTER'
  | 'BASIC'
  | 'RESTAURANT'
  | 'RETAIL_PRO'
  | 'BUSINESS'
  | 'ENTERPRISE';

export type SubscriptionStatusCode =
  | 'TRIAL'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'SUSPENDED'
  | 'CANCELLED';

export type SubscriptionInvoiceStatusCode =
  | 'DRAFT'
  | 'ISSUED'
  | 'PAID'
  | 'OVERDUE'
  | 'VOID';

export type SubscriptionPaymentStatusCode =
  | 'PENDING'
  | 'PAID'
  | 'FAILED'
  | 'VOID'
  | 'REFUNDED';

export type SubscriptionPaymentMethodCode =
  | 'CASH'
  | 'CARD'
  | 'TRANSFER'
  | 'QRIS'
  | 'OTHER';

export type SubscriptionPlanSummary = {
  id: string;
  code: SubscriptionPlanCode;
  name: string;
  description: string | null;
  monthlyPrice: number;
  currencyCode: string;
  businessType: 'RESTAURANT' | 'RETAIL' | null;
  isCustomPricing: boolean;
  isActive: boolean;
  limits: {
    maxOutlets: number | null;
    maxUsers: number | null;
    maxProducts: number | null;
    maxMonthlyTransactions: number | null;
  };
};

export type SubscriptionPlanAdminBusinessType = 'RESTAURANT' | 'RETAIL' | null;

export type CreateSubscriptionPlanRequest = {
  code: string;
  name: string;
  description?: string | null;
  monthlyPrice: number;
  currencyCode: string;
  businessType?: SubscriptionPlanAdminBusinessType;
  isCustomPricing?: boolean;
  isActive?: boolean;
  maxOutlets?: number | null;
  maxUsers?: number | null;
  maxProducts?: number | null;
  maxMonthlyTransactions?: number | null;
};

export type UpdateSubscriptionPlanRequest = {
  name?: string;
  description?: string | null;
  monthlyPrice?: number;
  currencyCode?: string;
  businessType?: SubscriptionPlanAdminBusinessType;
  isCustomPricing?: boolean;
  isActive?: boolean;
  maxOutlets?: number | null;
  maxUsers?: number | null;
  maxProducts?: number | null;
  maxMonthlyTransactions?: number | null;
};

export type CurrentSubscriptionResponse = {
  subscriptionId: string;
  businessId: string;
  status: SubscriptionStatusCode;
  startedAt: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEndsAt: string | null;
  graceEndsAt: string | null;
  cancelAtPeriodEnd: boolean;
  cancelledAt: string | null;
  suspendedAt: string | null;
  isInGracePeriod: boolean;
  plan: SubscriptionPlanSummary;
};

export type CurrentSubscriptionUsageResponse = {
  businessId: string;
  yearMonth: string;
  subscriptionStatus: SubscriptionStatusCode;
  plan: SubscriptionPlanSummary;
  usage: {
    outlets: number;
    users: number;
    products: number;
    monthlyTransactions: number;
  };
  remaining: {
    outlets: number | null;
    users: number | null;
    products: number | null;
    monthlyTransactions: number | null;
  };
};

export type SubscriptionInvoiceListResponse = {
  items: Array<{
    id: string;
    invoiceNumber: string;
    subscriptionId: string;
    billingPeriodStart: string;
    billingPeriodEnd: string;
    subtotal: number;
    taxAmount: number;
    totalAmount: number;
    status: SubscriptionInvoiceStatusCode;
    dueDate: string;
    issuedAt: string | null;
    paidAt: string | null;
    voidedAt: string | null;
    payments: Array<{
      id: string;
      method: SubscriptionPaymentMethodCode;
      amount: number;
      status: SubscriptionPaymentStatusCode;
      referenceNumber: string | null;
      paidAt: string | null;
    }>;
  }>;
  meta: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
};

export type SubscriptionInvoiceDetailResponse =
  SubscriptionInvoiceListResponse['items'][number];

export type SubscriptionLimitViolation = {
  metric: 'OUTLETS' | 'USERS' | 'PRODUCTS' | 'MONTHLY_TRANSACTIONS';
  label: string;
  usage: number;
  targetLimit: number;
};

export type SubscriptionChangePreviewResponse = {
  businessId: string;
  subscriptionId: string;
  currentPlan: SubscriptionPlanSummary;
  targetPlan: SubscriptionPlanSummary;
  currentStatus: SubscriptionStatusCode;
  changeType: 'UPGRADE' | 'DOWNGRADE';
  effectiveAt: string;
  isImmediate: boolean;
  usage: {
    outlets: number;
    users: number;
    products: number;
    monthlyTransactions: number;
  };
  violations: SubscriptionLimitViolation[];
  canProceed: boolean;
  note: string;
};

export type SubscriptionPlanChangeResultResponse = {
  businessId: string;
  subscriptionId: string;
  changeType: 'UPGRADE' | 'DOWNGRADE';
  effectiveAt: string;
  isImmediate: boolean;
  status: SubscriptionStatusCode | 'PENDING' | 'APPLIED' | 'CANCELLED' | 'REJECTED';
  currentPlan: SubscriptionPlanSummary;
  targetPlan: SubscriptionPlanSummary;
  scheduleChange: {
    id: string;
    status: 'PENDING' | 'APPLIED' | 'CANCELLED' | 'REJECTED';
    effectiveAt: string;
  } | null;
  message: string;
};

export type SubscriptionInvoicePaymentResponse = {
  businessId: string;
  subscriptionId: string;
  invoiceId: string;
  invoiceNumber: string;
  invoiceStatus: SubscriptionInvoiceStatusCode;
  paidAmount: number;
  totalPaidAmount: number;
  outstandingAmount: number;
  paidAt: string;
  payment: {
    id: string;
    method: SubscriptionPaymentMethodCode;
    amount: number;
    status: SubscriptionPaymentStatusCode;
    referenceNumber: string | null;
    paidAt: string;
  };
  subscription: {
    status: SubscriptionStatusCode;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    graceEndsAt: string | null;
    suspendedAt: string | null;
  };
};

export type SubscriptionLifecycleActionResponse = {
  businessId: string;
  subscriptionId: string;
  action: 'CANCEL_AT_PERIOD_END' | 'REACTIVATE';
  status: SubscriptionStatusCode;
  effectiveAt: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string;
  message: string;
};

export type SubscriptionStartResponse = {
  businessId: string;
  subscriptionId: string;
  status: SubscriptionStatusCode;
  startedAt: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  plan: SubscriptionPlanSummary;
  invoice: {
    id: string;
    invoiceNumber: string;
    billingPeriodStart: string;
    billingPeriodEnd: string;
    dueDate: string;
    subtotal: number;
    taxAmount: number;
    totalAmount: number;
    status: SubscriptionInvoiceStatusCode;
  };
  message: string;
};

type Envelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

function unwrapEnvelope<T>(response: { data: Envelope<T> }, fallbackMessage: string) {
  if (!response.data.data) {
    throw new Error(fallbackMessage);
  }

  return response.data.data;
}

export async function getSubscriptionPlans() {
  const response = await api.get<Envelope<SubscriptionPlanSummary[]>>('/subscriptions/plans');

  return unwrapEnvelope(response, 'Subscription plan tidak ditemukan');
}

export async function getSubscriptionPlansAdmin() {
  const response = await api.get<Envelope<SubscriptionPlanSummary[]>>(
    '/platform/subscription-plans',
  );

  return unwrapEnvelope(response, 'Subscription plans tidak ditemukan');
}

export async function getSubscriptionPlanAdmin(planId: string) {
  const response = await api.get<Envelope<SubscriptionPlanSummary>>(
    `/platform/subscription-plans/${planId}`,
  );

  return unwrapEnvelope(response, 'Plan subscription tidak ditemukan');
}

export async function createSubscriptionPlanAdmin(
  payload: CreateSubscriptionPlanRequest,
) {
  const response = await api.post<Envelope<SubscriptionPlanSummary>>(
    '/platform/subscription-plans',
    payload,
  );

  return unwrapEnvelope(response, 'Gagal membuat plan subscription');
}

export async function updateSubscriptionPlanAdmin(
  planId: string,
  payload: UpdateSubscriptionPlanRequest,
) {
  const response = await api.patch<Envelope<SubscriptionPlanSummary>>(
    `/platform/subscription-plans/${planId}`,
    payload,
  );

  return unwrapEnvelope(response, 'Gagal memperbarui plan subscription');
}

export async function activateSubscriptionPlanAdmin(planId: string) {
  const response = await api.patch<Envelope<SubscriptionPlanSummary>>(
    `/platform/subscription-plans/${planId}/activate`,
    {},
  );

  return unwrapEnvelope(response, 'Gagal mengaktifkan plan subscription');
}

export async function deactivateSubscriptionPlanAdmin(planId: string) {
  const response = await api.patch<Envelope<SubscriptionPlanSummary>>(
    `/platform/subscription-plans/${planId}/deactivate`,
    {},
  );

  return unwrapEnvelope(response, 'Gagal menonaktifkan plan subscription');
}

export async function getCurrentSubscription() {
  const response = await api.get<Envelope<CurrentSubscriptionResponse>>('/subscriptions/current');

  return unwrapEnvelope(response, 'Subscription aktif tidak ditemukan');
}

export async function getSubscriptionUsage() {
  const response = await api.get<Envelope<CurrentSubscriptionUsageResponse>>(
    '/subscriptions/usage',
  );

  return unwrapEnvelope(response, 'Usage subscription tidak ditemukan');
}

export async function getSubscriptionInvoices(params?: {
  page?: number;
  perPage?: number;
}) {
  const response = await api.get<Envelope<SubscriptionInvoiceListResponse>>(
    '/subscriptions/invoices',
    {
      params,
    },
  );

  return unwrapEnvelope(response, 'Invoice subscription tidak ditemukan');
}

export async function getSubscriptionInvoiceDetail(invoiceId: string) {
  const response = await api.get<Envelope<SubscriptionInvoiceDetailResponse>>(
    `/subscriptions/invoices/${invoiceId}`,
  );

  return unwrapEnvelope(response, 'Detail invoice subscription tidak ditemukan');
}

export async function getSubscriptionChangePreview(
  targetPlanCode: SubscriptionPlanCode,
  forceImmediate?: boolean,
) {
  const response = await api.get<Envelope<SubscriptionChangePreviewResponse>>(
    '/subscriptions/change-preview',
    {
      params: {
        targetPlanCode,
        ...(forceImmediate ? { forceImmediate: 'true' } : {}),
      },
    },
  );

  return unwrapEnvelope(response, 'Preview perubahan plan tidak ditemukan');
}

export async function changeSubscriptionPlan(
  targetPlanCode: SubscriptionPlanCode,
  forceImmediate?: boolean,
) {
  const response = await api.post<Envelope<SubscriptionPlanChangeResultResponse>>(
    '/subscriptions/change-plan',
    {
      targetPlanCode,
      ...(forceImmediate ? { forceImmediate: true } : {}),
    },
  );

  return unwrapEnvelope(response, 'Perubahan plan subscription gagal diproses');
}

export async function recordSubscriptionInvoicePayment(params: {
  invoiceId: string;
  method: SubscriptionPaymentMethodCode;
  amount: number;
  referenceNumber?: string | null;
  paidAt?: string;
}) {
  const response = await api.post<Envelope<SubscriptionInvoicePaymentResponse>>(
    `/subscriptions/invoices/${params.invoiceId}/payments`,
    {
      method: params.method,
      amount: params.amount,
      referenceNumber: params.referenceNumber ?? null,
      paidAt: params.paidAt,
    },
  );

  return unwrapEnvelope(response, 'Pembayaran invoice subscription gagal diproses');
}

export async function cancelSubscription() {
  const response = await api.post<Envelope<SubscriptionLifecycleActionResponse>>(
    '/subscriptions/cancel',
    {},
  );

  return unwrapEnvelope(response, 'Jadwal penghentian subscription gagal diproses');
}

export async function reactivateSubscription() {
  const response = await api.post<Envelope<SubscriptionLifecycleActionResponse>>(
    '/subscriptions/reactivate',
    {},
  );

  return unwrapEnvelope(response, 'Reaktivasi subscription gagal diproses');
}

export async function startSubscription(targetPlanCode: SubscriptionPlanCode) {
  const response = await api.post<Envelope<SubscriptionStartResponse>>('/subscriptions/start', {
    targetPlanCode,
  });

  return unwrapEnvelope(response, 'Subscription baru gagal dimulai');
}
