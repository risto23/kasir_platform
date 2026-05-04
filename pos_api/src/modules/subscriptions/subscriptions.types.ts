import type {
  BusinessType,
  PaymentMethod,
  SubscriptionScheduleChangeStatus,
  SubscriptionScheduleChangeType,
  SubscriptionInvoiceStatus,
  SubscriptionPaymentStatus,
  SubscriptionStatus,
  PlanCode,
} from '@prisma/client';

export type SubscriptionPlanSummary = {
  id: string;
  code: PlanCode;
  name: string;
  description: string | null;
  monthlyPrice: number;
  currencyCode: string;
  businessType: BusinessType | null;
  isCustomPricing: boolean;
  isActive: boolean;
  limits: {
    maxOutlets: number | null;
    maxUsers: number | null;
    maxProducts: number | null;
    maxMonthlyTransactions: number | null;
  };
};

export type CurrentSubscriptionResponse = {
  subscriptionId: string;
  businessId: string;
  status: SubscriptionStatus;
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
  subscriptionStatus: SubscriptionStatus;
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

export type SubscriptionInvoiceListItem = {
  id: string;
  invoiceNumber: string;
  subscriptionId: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  status: SubscriptionInvoiceStatus;
  dueDate: string;
  issuedAt: string | null;
  paidAt: string | null;
  voidedAt: string | null;
  payments: Array<{
    id: string;
    method: PaymentMethod;
    amount: number;
    status: SubscriptionPaymentStatus;
    referenceNumber: string | null;
    paidAt: string | null;
  }>;
};

export type SubscriptionInvoiceListResponse = {
  items: SubscriptionInvoiceListItem[];
  meta: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
};

export type SubscriptionInvoiceDetailResponse = SubscriptionInvoiceListItem;

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
  currentStatus: SubscriptionStatus;
  changeType: SubscriptionScheduleChangeType;
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
  changeType: SubscriptionScheduleChangeType;
  effectiveAt: string;
  isImmediate: boolean;
  status: SubscriptionStatus | SubscriptionScheduleChangeStatus;
  currentPlan: SubscriptionPlanSummary;
  targetPlan: SubscriptionPlanSummary;
  scheduleChange: {
    id: string;
    status: SubscriptionScheduleChangeStatus;
    effectiveAt: string;
  } | null;
  message: string;
};

export type SubscriptionInvoicePaymentResponse = {
  businessId: string;
  subscriptionId: string;
  invoiceId: string;
  invoiceNumber: string;
  invoiceStatus: SubscriptionInvoiceStatus;
  paidAmount: number;
  totalPaidAmount: number;
  outstandingAmount: number;
  paidAt: string;
  payment: {
    id: string;
    method: PaymentMethod;
    amount: number;
    status: SubscriptionPaymentStatus;
    referenceNumber: string | null;
    paidAt: string;
  };
  subscription: {
    status: SubscriptionStatus;
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
  status: SubscriptionStatus;
  effectiveAt: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string;
  message: string;
};

export type SubscriptionStartResponse = {
  businessId: string;
  subscriptionId: string;
  status: SubscriptionStatus;
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
    status: SubscriptionInvoiceStatus;
  };
  message: string;
};
