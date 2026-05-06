import {
  BusinessType,
  Prisma,
  SubscriptionInvoiceStatus,
  SubscriptionScheduleChangeStatus,
  SubscriptionScheduleChangeType,
  SubscriptionStatus,
} from '@prisma/client';
import { prisma } from '../../config/prisma';
import type {
  CurrentSubscriptionResponse,
  SubscriptionInvoiceDetailResponse,
  CurrentSubscriptionUsageResponse,
  SubscriptionChangePreviewResponse,
  SubscriptionLifecycleActionResponse,
  SubscriptionLimitViolation,
  SubscriptionPlanChangeResultResponse,
  SubscriptionStartResponse,
  SubscriptionInvoiceListResponse,
  SubscriptionPlanSummary,
} from './subscriptions.types';
import { getCurrentUsageSnapshotByBusiness } from './subscription-usage.service';
import { syncBusinessFeatureFlags } from '../platform-feature-flag/platform-feature-flag.service';

const PLAN_DISPLAY_ORDER = [
  'STARTER',
  'BASIC',
  'RESTAURANT',
  'RETAIL_PRO',
  'BUSINESS',
  'ENTERPRISE',
];

function mapPlanSummary(plan: {
  id: string;
  code: string;
  name: string;
  description: string | null;
  monthlyPrice: unknown;
  currencyCode: string;
  businessType: BusinessType | null;
  isCustomPricing: boolean;
  isActive: boolean;
  maxOutlets: number | null;
  maxUsers: number | null;
  maxProducts: number | null;
  maxMonthlyTransactions: number | null;
}): SubscriptionPlanSummary {
  return {
    id: plan.id,
    code: plan.code,
    name: plan.name,
    description: plan.description,
    monthlyPrice: Number(plan.monthlyPrice),
    currencyCode: plan.currencyCode,
    businessType: plan.businessType,
    isCustomPricing: plan.isCustomPricing,
    isActive: plan.isActive,
    limits: {
      maxOutlets: plan.maxOutlets,
      maxUsers: plan.maxUsers,
      maxProducts: plan.maxProducts,
      maxMonthlyTransactions: plan.maxMonthlyTransactions,
    },
  };
}

function getPlanDisplayOrder(code: string) {
  const index = PLAN_DISPLAY_ORDER.indexOf(code);

  if (index >= 0) {
    return index;
  }

  return PLAN_DISPLAY_ORDER.length + 100;
}

function getOrderedPlans<T extends { code: string; name: string }>(plans: T[]): T[] {
  return plans.sort((left, right) => {
    const leftIndex = getPlanDisplayOrder(left.code);
    const rightIndex = getPlanDisplayOrder(right.code);

    if (leftIndex !== rightIndex) {
      return leftIndex - rightIndex;
    }

    return left.name.localeCompare(right.name);
  });
}

function compareNullableLimit(current: number | null, target: number | null) {
  if (current === null && target === null) {
    return 0;
  }

  if (current === null) {
    return 1;
  }

  if (target === null) {
    return -1;
  }

  return current - target;
}

function resolveChangeType(params: {
  currentPlan: SubscriptionPlanSummary;
  targetPlan: SubscriptionPlanSummary;
}) {
  const comparisons = [
    compareNullableLimit(
      params.currentPlan.limits.maxOutlets,
      params.targetPlan.limits.maxOutlets,
    ),
    compareNullableLimit(
      params.currentPlan.limits.maxUsers,
      params.targetPlan.limits.maxUsers,
    ),
    compareNullableLimit(
      params.currentPlan.limits.maxProducts,
      params.targetPlan.limits.maxProducts,
    ),
    compareNullableLimit(
      params.currentPlan.limits.maxMonthlyTransactions,
      params.targetPlan.limits.maxMonthlyTransactions,
    ),
  ];

  const hasHigherCapability = comparisons.some((comparison) => comparison < 0);
  const hasLowerCapability = comparisons.some((comparison) => comparison > 0);

  if (hasHigherCapability && !hasLowerCapability) {
    return SubscriptionScheduleChangeType.UPGRADE;
  }

  if (hasLowerCapability && !hasHigherCapability) {
    return SubscriptionScheduleChangeType.DOWNGRADE;
  }

  if (params.targetPlan.monthlyPrice >= params.currentPlan.monthlyPrice) {
    return SubscriptionScheduleChangeType.UPGRADE;
  }

  return SubscriptionScheduleChangeType.DOWNGRADE;
}

function buildLimitViolations(params: {
  usage: CurrentSubscriptionUsageResponse['usage'];
  targetPlan: SubscriptionPlanSummary;
}): SubscriptionLimitViolation[] {
  const violations: SubscriptionLimitViolation[] = [];
  const checks: Array<{
    metric: SubscriptionLimitViolation['metric'];
    label: string;
    usage: number;
    targetLimit: number | null;
  }> = [
    {
      metric: 'OUTLETS',
      label: 'Outlet aktif',
      usage: params.usage.outlets,
      targetLimit: params.targetPlan.limits.maxOutlets,
    },
    {
      metric: 'USERS',
      label: 'User aktif',
      usage: params.usage.users,
      targetLimit: params.targetPlan.limits.maxUsers,
    },
    {
      metric: 'PRODUCTS',
      label: 'Product aktif',
      usage: params.usage.products,
      targetLimit: params.targetPlan.limits.maxProducts,
    },
    {
      metric: 'MONTHLY_TRANSACTIONS',
      label: 'Transaksi bulanan',
      usage: params.usage.monthlyTransactions,
      targetLimit: params.targetPlan.limits.maxMonthlyTransactions,
    },
  ];

  for (const check of checks) {
    if (check.targetLimit !== null && check.usage > check.targetLimit) {
      violations.push({
        metric: check.metric,
        label: check.label,
        usage: check.usage,
        targetLimit: check.targetLimit,
      });
    }
  }

  return violations;
}

function buildPlanChangeConflictError(message: string, errors?: unknown) {
  const error = new Error(message) as Error & {
    statusCode?: number;
    errors?: unknown;
  };
  error.statusCode = 409;
  error.errors = errors;
  return error;
}

function calculateCurrentBillingPeriod(startedAt: Date) {
  const currentPeriodStart = new Date(startedAt);
  const currentPeriodEnd = new Date(startedAt);

  currentPeriodEnd.setUTCMonth(currentPeriodEnd.getUTCMonth() + 1);
  currentPeriodEnd.setMilliseconds(currentPeriodEnd.getMilliseconds() - 1);

  return {
    currentPeriodStart,
    currentPeriodEnd,
  };
}

function toInvoiceYearMonthKey(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');

  return `${year}${month}`;
}

async function generateSubscriptionInvoiceNumber(params: {
  tx: Prisma.TransactionClient;
  businessId: string;
  billingPeriodStart: Date;
}) {
  const prefix = `SINV-${toInvoiceYearMonthKey(params.billingPeriodStart)}`;
  const latestInvoice = await params.tx.subscriptionInvoice.findFirst({
    where: {
      businessId: params.businessId,
      invoiceNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      invoiceNumber: 'desc',
    },
    select: {
      invoiceNumber: true,
    },
  });

  const latestSequence = latestInvoice?.invoiceNumber
    ? Number(latestInvoice.invoiceNumber.split('-').pop() ?? '0')
    : 0;

  return `${prefix}-${String(latestSequence + 1).padStart(4, '0')}`;
}

async function getBusinessTypeByBusinessId(businessId: string) {
  const business = await prisma.business.findUnique({
    where: {
      id: businessId,
    },
    select: {
      businessType: true,
    },
  });

  if (!business) {
    throw new Error('Business subscription tidak ditemukan');
  }

  return business.businessType;
}

async function getTargetPlanByCode(params: {
  businessType: BusinessType;
  targetPlanCode: string;
}) {
  const plan = await prisma.plan.findFirst({
    where: {
      code: params.targetPlanCode,
      isActive: true,
      OR: [{ businessType: null }, { businessType: params.businessType }],
    },
  });

  if (!plan) {
    throw new Error('Target plan subscription tidak ditemukan');
  }

  return mapPlanSummary(plan);
}

function mapSubscriptionInvoice(invoice: {
  id: string;
  invoiceNumber: string;
  subscriptionId: string;
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
  subtotal: unknown;
  taxAmount: unknown;
  totalAmount: unknown;
  status: import('@prisma/client').SubscriptionInvoiceStatus;
  dueDate: Date;
  issuedAt: Date | null;
  paidAt: Date | null;
  voidedAt: Date | null;
  payments: Array<{
    id: string;
    method: import('@prisma/client').PaymentMethod;
    amount: unknown;
    status: import('@prisma/client').SubscriptionPaymentStatus;
    referenceNumber: string | null;
    paidAt: Date | null;
  }>;
}) {
  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    subscriptionId: invoice.subscriptionId,
    billingPeriodStart: invoice.billingPeriodStart.toISOString(),
    billingPeriodEnd: invoice.billingPeriodEnd.toISOString(),
    subtotal: Number(invoice.subtotal),
    taxAmount: Number(invoice.taxAmount),
    totalAmount: Number(invoice.totalAmount),
    status: invoice.status,
    dueDate: invoice.dueDate.toISOString(),
    issuedAt: invoice.issuedAt?.toISOString() ?? null,
    paidAt: invoice.paidAt?.toISOString() ?? null,
    voidedAt: invoice.voidedAt?.toISOString() ?? null,
    payments: invoice.payments.map((payment) => ({
      id: payment.id,
      method: payment.method,
      amount: Number(payment.amount),
      status: payment.status,
      referenceNumber: payment.referenceNumber ?? null,
      paidAt: payment.paidAt?.toISOString() ?? null,
    })),
  };
}

export async function getActiveSubscriptionByBusiness(businessId: string) {
  return prisma.businessSubscription.findFirst({
    where: {
      businessId,
      status: {
        in: [
          SubscriptionStatus.TRIAL,
          SubscriptionStatus.ACTIVE,
          SubscriptionStatus.PAST_DUE,
          SubscriptionStatus.SUSPENDED,
        ],
      },
    },
    include: {
      plan: true,
    },
    orderBy: [
      {
        currentPeriodEnd: 'desc',
      },
      {
        createdAt: 'desc',
      },
    ],
  });
}

export async function getLatestSubscriptionByBusiness(businessId: string) {
  return prisma.businessSubscription.findFirst({
    where: {
      businessId,
      status: {
        in: [
          SubscriptionStatus.TRIAL,
          SubscriptionStatus.ACTIVE,
          SubscriptionStatus.PAST_DUE,
          SubscriptionStatus.SUSPENDED,
          SubscriptionStatus.CANCELLED,
        ],
      },
    },
    include: {
      plan: true,
    },
    orderBy: [
      {
        currentPeriodEnd: 'desc',
      },
      {
        createdAt: 'desc',
      },
    ],
  });
}

async function getCurrentOrLatestSubscriptionByBusiness(businessId: string) {
  const activeSubscription = await getActiveSubscriptionByBusiness(businessId);

  if (activeSubscription) {
    return activeSubscription;
  }

  return getLatestSubscriptionByBusiness(businessId);
}

export function isBusinessInGracePeriod(subscription: {
  status: SubscriptionStatus;
  graceEndsAt: Date | null;
}) {
  if (subscription.status !== SubscriptionStatus.PAST_DUE) {
    return false;
  }

  if (!subscription.graceEndsAt) {
    return false;
  }

  return subscription.graceEndsAt.getTime() >= Date.now();
}

export async function getSubscriptionPlansByBusinessType(
  businessType: BusinessType,
): Promise<SubscriptionPlanSummary[]> {
  const plans = await prisma.plan.findMany({
    where: {
      isActive: true,
      OR: [{ businessType: null }, { businessType }],
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  return getOrderedPlans(plans).map(mapPlanSummary);
}

export async function getSubscriptionPlans(): Promise<SubscriptionPlanSummary[]> {
  const plans = await prisma.plan.findMany({
    orderBy: {
      createdAt: 'asc',
    },
  });

  return getOrderedPlans(plans).map(mapPlanSummary);
}

export async function getSubscriptionPlanById(
  planId: string,
): Promise<SubscriptionPlanSummary> {
  const plan = await prisma.plan.findUnique({
    where: {
      id: planId,
    },
  });

  if (!plan) {
    throw new Error('Plan subscription tidak ditemukan');
  }

  return mapPlanSummary(plan);
}

export async function createSubscriptionPlan(params: {
  code: string;
  name: string;
  description: string | null;
  monthlyPrice: number;
  currencyCode: string;
  businessType: BusinessType | null;
  maxOutlets: number | null;
  maxUsers: number | null;
  maxProducts: number | null;
  maxMonthlyTransactions: number | null;
  isCustomPricing: boolean;
  isActive: boolean;
}): Promise<SubscriptionPlanSummary> {
  const existingPlan = await prisma.plan.findFirst({
    where: {
      OR: [{ code: params.code }, { name: params.name }],
    },
  });

  if (existingPlan) {
    throw new Error('Code atau nama plan sudah digunakan');
  }

  const plan = await prisma.plan.create({
    data: {
      code: params.code,
      name: params.name,
      description: params.description,
      monthlyPrice: new Prisma.Decimal(params.monthlyPrice),
      currencyCode: params.currencyCode,
      businessType: params.businessType,
      maxOutlets: params.maxOutlets,
      maxUsers: params.maxUsers,
      maxProducts: params.maxProducts,
      maxMonthlyTransactions: params.maxMonthlyTransactions,
      isCustomPricing: params.isCustomPricing,
      isActive: params.isActive,
    },
  });

  return mapPlanSummary(plan);
}

export async function updateSubscriptionPlan(params: {
  planId: string;
  name?: string;
  description?: string | null;
  monthlyPrice?: number;
  currencyCode?: string;
  businessType?: BusinessType | null;
  maxOutlets?: number | null;
  maxUsers?: number | null;
  maxProducts?: number | null;
  maxMonthlyTransactions?: number | null;
  isCustomPricing?: boolean;
  isActive?: boolean;
}): Promise<SubscriptionPlanSummary> {
  const plan = await prisma.plan.findUnique({
    where: {
      id: params.planId,
    },
  });

  if (!plan) {
    throw new Error('Plan subscription tidak ditemukan');
  }

  const data: {
    name?: string;
    description?: string | null;
    monthlyPrice?: Prisma.Decimal;
    currencyCode?: string;
    businessType?: BusinessType | null;
    maxOutlets?: number | null;
    maxUsers?: number | null;
    maxProducts?: number | null;
    maxMonthlyTransactions?: number | null;
    isCustomPricing?: boolean;
    isActive?: boolean;
  } = {};

  if (params.name !== undefined) {
    data.name = params.name;
  }

  if (params.description !== undefined) {
    data.description = params.description;
  }

  if (params.monthlyPrice !== undefined) {
    data.monthlyPrice = new Prisma.Decimal(params.monthlyPrice);
  }

  if (params.currencyCode !== undefined) {
    data.currencyCode = params.currencyCode;
  }

  if (params.businessType !== undefined) {
    data.businessType = params.businessType;
  }

  if (params.maxOutlets !== undefined) {
    data.maxOutlets = params.maxOutlets;
  }

  if (params.maxUsers !== undefined) {
    data.maxUsers = params.maxUsers;
  }

  if (params.maxProducts !== undefined) {
    data.maxProducts = params.maxProducts;
  }

  if (params.maxMonthlyTransactions !== undefined) {
    data.maxMonthlyTransactions = params.maxMonthlyTransactions;
  }

  if (params.isCustomPricing !== undefined) {
    data.isCustomPricing = params.isCustomPricing;
  }

  if (params.isActive !== undefined) {
    data.isActive = params.isActive;
  }

  const updatedPlan = await prisma.plan.update({
    where: {
      id: params.planId,
    },
    data,
  });

  return mapPlanSummary(updatedPlan);
}

export async function setSubscriptionPlanActiveStatus(params: {
  planId: string;
  isActive: boolean;
}): Promise<SubscriptionPlanSummary> {
  const plan = await prisma.plan.findUnique({
    where: {
      id: params.planId,
    },
  });

  if (!plan) {
    throw new Error('Plan subscription tidak ditemukan');
  }

  const updatedPlan = await prisma.plan.update({
    where: {
      id: params.planId,
    },
    data: {
      isActive: params.isActive,
    },
  });

  return mapPlanSummary(updatedPlan);
}

export async function getCurrentSubscriptionByBusiness(
  businessId: string,
): Promise<CurrentSubscriptionResponse> {
  const subscription = await getCurrentOrLatestSubscriptionByBusiness(businessId);

  if (!subscription) {
    throw new Error('Subscription business tidak ditemukan');
  }

  return {
    subscriptionId: subscription.id,
    businessId: subscription.businessId,
    status: subscription.status,
    startedAt: subscription.startedAt.toISOString(),
    currentPeriodStart: subscription.currentPeriodStart.toISOString(),
    currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
    trialEndsAt: subscription.trialEndsAt?.toISOString() ?? null,
    graceEndsAt: subscription.graceEndsAt?.toISOString() ?? null,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    cancelledAt: subscription.cancelledAt?.toISOString() ?? null,
    suspendedAt: subscription.suspendedAt?.toISOString() ?? null,
    isInGracePeriod: isBusinessInGracePeriod(subscription),
    plan: mapPlanSummary(subscription.plan),
  };
}

export async function getCurrentUsageByBusiness(
  businessId: string,
): Promise<CurrentSubscriptionUsageResponse> {
  const subscription = await getCurrentOrLatestSubscriptionByBusiness(businessId);

  if (!subscription) {
    throw new Error('Subscription business tidak ditemukan');
  }

  const plan = mapPlanSummary(subscription.plan);
  const snapshot = await getCurrentUsageSnapshotByBusiness({
    businessId,
    subscriptionStatus: subscription.status,
  });

  return {
    businessId,
    yearMonth: snapshot.yearMonth,
    subscriptionStatus: snapshot.subscriptionStatus,
    plan,
    usage: snapshot.usage,
    remaining: {
      outlets:
        plan.limits.maxOutlets === null ? null : plan.limits.maxOutlets - snapshot.usage.outlets,
      users: plan.limits.maxUsers === null ? null : plan.limits.maxUsers - snapshot.usage.users,
      products:
        plan.limits.maxProducts === null ? null : plan.limits.maxProducts - snapshot.usage.products,
      monthlyTransactions:
        plan.limits.maxMonthlyTransactions === null
          ? null
          : plan.limits.maxMonthlyTransactions - snapshot.usage.monthlyTransactions,
    },
  };
}

export async function getSubscriptionInvoicesByBusiness(params: {
  businessId: string;
  page: number;
  perPage: number;
}): Promise<SubscriptionInvoiceListResponse> {
  const where = {
    businessId: params.businessId,
  };

  const [total, rows] = await Promise.all([
    prisma.subscriptionInvoice.count({ where }),
    prisma.subscriptionInvoice.findMany({
      where,
      include: {
        payments: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
      orderBy: [
        {
          billingPeriodStart: 'desc',
        },
        {
          createdAt: 'desc',
        },
      ],
      skip: (params.page - 1) * params.perPage,
      take: params.perPage,
    }),
  ]);

  return {
    items: rows.map(mapSubscriptionInvoice),
    meta: {
      page: params.page,
      perPage: params.perPage,
      total,
      totalPages: Math.max(1, Math.ceil(total / params.perPage)),
    },
  };
}

export async function getSubscriptionInvoiceDetailByBusiness(params: {
  businessId: string;
  invoiceId: string;
}): Promise<SubscriptionInvoiceDetailResponse> {
  const invoice = await prisma.subscriptionInvoice.findFirst({
    where: {
      id: params.invoiceId,
      businessId: params.businessId,
    },
    include: {
      payments: {
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
  });

  if (!invoice) {
    throw new Error('Invoice subscription tidak ditemukan');
  }

  return mapSubscriptionInvoice(invoice);
}

async function getPlanChangePreviewInternal(params: {
  businessId: string;
  targetPlanCode: string;
  forceImmediate?: boolean;
}): Promise<SubscriptionChangePreviewResponse> {
  const [subscription, usageResponse, businessType] = await Promise.all([
    getActiveSubscriptionByBusiness(params.businessId),
    getCurrentUsageByBusiness(params.businessId),
    getBusinessTypeByBusinessId(params.businessId),
  ]);

  if (!subscription) {
    throw new Error('Subscription aktif tidak ditemukan');
  }

  const currentPlan = mapPlanSummary(subscription.plan);
  const targetPlan = await getTargetPlanByCode({
    businessType,
    targetPlanCode: params.targetPlanCode,
  });

  if (currentPlan.code === targetPlan.code) {
    throw buildPlanChangeConflictError('Target plan sama dengan plan aktif saat ini');
  }

  const changeType = resolveChangeType({
    currentPlan,
    targetPlan,
  });
  const isImmediate =
    params.forceImmediate === true || changeType === SubscriptionScheduleChangeType.UPGRADE;
  const effectiveAt = isImmediate
    ? new Date().toISOString()
    : subscription.currentPeriodEnd.toISOString();
  const violations =
    changeType === SubscriptionScheduleChangeType.DOWNGRADE
      ? buildLimitViolations({
          usage: usageResponse.usage,
          targetPlan,
        })
      : [];

  const noteForDowngrade =
    params.forceImmediate === true
      ? 'Downgrade dipaksa diterapkan langsung oleh super admin.'
      : 'Downgrade dijadwalkan pada akhir periode aktif saat ini.';

  return {
    businessId: params.businessId,
    subscriptionId: subscription.id,
    currentPlan,
    targetPlan,
    currentStatus: subscription.status,
    changeType,
    effectiveAt,
    isImmediate,
    usage: usageResponse.usage,
    violations,
    canProceed: violations.length === 0,
    note: isImmediate && changeType === SubscriptionScheduleChangeType.UPGRADE
      ? 'Upgrade diterapkan langsung tanpa mengubah periode billing berjalan.'
      : noteForDowngrade,
  };
}

export async function getSubscriptionChangePreviewByBusiness(params: {
  businessId: string;
  targetPlanCode: string;
  forceImmediate?: boolean;
}): Promise<SubscriptionChangePreviewResponse> {
  return getPlanChangePreviewInternal(params);
}

export async function changeSubscriptionPlanByBusiness(params: {
  businessId: string;
  targetPlanCode: string;
  forceImmediate?: boolean;
}): Promise<SubscriptionPlanChangeResultResponse> {
  const preview = await getPlanChangePreviewInternal({
    businessId: params.businessId,
    targetPlanCode: params.targetPlanCode,
    forceImmediate: params.forceImmediate,
  });
  const businessType = await getBusinessTypeByBusinessId(params.businessId);

  if (!preview.canProceed) {
    throw buildPlanChangeConflictError(
      'Target downgrade tidak bisa diproses karena usage saat ini melebihi limit plan tujuan',
      {
        violations: preview.violations,
        targetPlan: preview.targetPlan,
      },
    );
  }

  return prisma.$transaction(async (tx) => {
    const subscription = await tx.businessSubscription.findFirst({
      where: {
        id: preview.subscriptionId,
        businessId: params.businessId,
      },
      include: {
        plan: true,
      },
    });

    if (!subscription) {
      throw new Error('Subscription aktif tidak ditemukan');
    }

    const targetPlan = await tx.plan.findFirst({
      where: {
        code: params.targetPlanCode,
        isActive: true,
        OR: [{ businessType: null }, { businessType }],
      },
    });

    if (!targetPlan) {
      throw new Error('Target plan subscription tidak ditemukan');
    }

    await tx.subscriptionScheduleChange.updateMany({
      where: {
        businessId: params.businessId,
        status: SubscriptionScheduleChangeStatus.PENDING,
      },
      data: {
        status: SubscriptionScheduleChangeStatus.CANCELLED,
        processedAt: new Date(),
      },
    });

    if (preview.isImmediate) {
      await tx.businessSubscription.update({
        where: {
          id: subscription.id,
        },
        data: {
          planId: targetPlan.id,
        },
      });

      const appliedScheduleChange = await tx.subscriptionScheduleChange.create({
        data: {
          businessId: params.businessId,
          subscriptionId: subscription.id,
          fromPlanId: subscription.planId,
          toPlanId: targetPlan.id,
          type: preview.changeType,
          effectiveAt: new Date(preview.effectiveAt),
          status: SubscriptionScheduleChangeStatus.APPLIED,
          processedAt: new Date(),
        },
      });

      await syncBusinessFeatureFlags(params.businessId, targetPlan.id, tx);

      return {
        businessId: params.businessId,
        subscriptionId: subscription.id,
        changeType: preview.changeType,
        effectiveAt: preview.effectiveAt,
        isImmediate: true,
        status: subscription.status,
        currentPlan: preview.currentPlan,
        targetPlan: preview.targetPlan,
        scheduleChange: {
          id: appliedScheduleChange.id,
          status: appliedScheduleChange.status,
          effectiveAt: appliedScheduleChange.effectiveAt.toISOString(),
        },
        message: 'Upgrade plan berhasil diterapkan langsung.',
      };
    }

    const scheduledChange = await tx.subscriptionScheduleChange.create({
      data: {
        businessId: params.businessId,
        subscriptionId: subscription.id,
        fromPlanId: subscription.planId,
        toPlanId: targetPlan.id,
        type: preview.changeType,
        effectiveAt: new Date(preview.effectiveAt),
        status: SubscriptionScheduleChangeStatus.PENDING,
      },
    });

    return {
      businessId: params.businessId,
      subscriptionId: subscription.id,
      changeType: preview.changeType,
      effectiveAt: preview.effectiveAt,
      isImmediate: false,
      status: scheduledChange.status,
      currentPlan: preview.currentPlan,
      targetPlan: preview.targetPlan,
      scheduleChange: {
        id: scheduledChange.id,
        status: scheduledChange.status,
        effectiveAt: scheduledChange.effectiveAt.toISOString(),
      },
      message: params.forceImmediate
        ? 'Downgrade plan berhasil diterapkan langsung oleh super admin.'
        : 'Downgrade plan berhasil dijadwalkan pada akhir periode aktif.',
    };
  });
}

export async function cancelSubscriptionByBusiness(params: {
  businessId: string;
}): Promise<SubscriptionLifecycleActionResponse> {
  const subscription = await getActiveSubscriptionByBusiness(params.businessId);

  if (!subscription) {
    throw new Error('Subscription aktif tidak ditemukan');
  }

  if (subscription.cancelAtPeriodEnd) {
    throw buildPlanChangeConflictError(
      'Subscription sudah dijadwalkan untuk berhenti pada akhir periode aktif',
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.businessSubscription.update({
      where: {
        id: subscription.id,
      },
      data: {
        cancelAtPeriodEnd: true,
      },
    });

    await tx.subscriptionScheduleChange.updateMany({
      where: {
        businessId: params.businessId,
        status: SubscriptionScheduleChangeStatus.PENDING,
      },
      data: {
        status: SubscriptionScheduleChangeStatus.CANCELLED,
        processedAt: new Date(),
      },
    });
  });

  return {
    businessId: params.businessId,
    subscriptionId: subscription.id,
    action: 'CANCEL_AT_PERIOD_END',
    status: subscription.status,
    effectiveAt: subscription.currentPeriodEnd.toISOString(),
    cancelAtPeriodEnd: true,
    currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
    message: 'Subscription berhasil dijadwalkan berhenti pada akhir periode aktif.',
  };
}

export async function reactivateSubscriptionByBusiness(params: {
  businessId: string;
}): Promise<SubscriptionLifecycleActionResponse> {
  const subscription = await getActiveSubscriptionByBusiness(params.businessId);

  if (!subscription) {
    throw new Error('Subscription aktif tidak ditemukan');
  }

  if (!subscription.cancelAtPeriodEnd) {
    throw buildPlanChangeConflictError(
      'Subscription saat ini tidak sedang dijadwalkan berhenti',
    );
  }

  await prisma.businessSubscription.update({
    where: {
      id: subscription.id,
    },
    data: {
      cancelAtPeriodEnd: false,
    },
  });

  return {
    businessId: params.businessId,
    subscriptionId: subscription.id,
    action: 'REACTIVATE',
    status: subscription.status,
    effectiveAt: new Date().toISOString(),
    cancelAtPeriodEnd: false,
    currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
    message: 'Jadwal penghentian subscription berhasil dibatalkan.',
  };
}

export async function startSubscriptionByBusiness(params: {
  businessId: string;
  targetPlanCode: string;
}): Promise<SubscriptionStartResponse> {
  const [activeSubscription, latestSubscription, businessType] = await Promise.all([
    getActiveSubscriptionByBusiness(params.businessId),
    getLatestSubscriptionByBusiness(params.businessId),
    getBusinessTypeByBusinessId(params.businessId),
  ]);

  if (activeSubscription) {
    throw buildPlanChangeConflictError(
      'Business masih memiliki subscription aktif sehingga subscription baru belum dapat dimulai',
      {
        currentStatus: activeSubscription.status,
        currentPlan: mapPlanSummary(activeSubscription.plan),
      },
    );
  }

  if (latestSubscription && latestSubscription.status !== SubscriptionStatus.CANCELLED) {
    throw buildPlanChangeConflictError(
      'Subscription baru hanya dapat dimulai setelah subscription sebelumnya benar-benar cancelled',
      {
        latestStatus: latestSubscription.status,
        latestPlan: mapPlanSummary(latestSubscription.plan),
      },
    );
  }

  const targetPlan = await getTargetPlanByCode({
    businessType,
    targetPlanCode: params.targetPlanCode,
  });
  const startedAt = new Date();
  const { currentPeriodStart, currentPeriodEnd } = calculateCurrentBillingPeriod(startedAt);

  return prisma.$transaction(async (tx) => {
    await tx.subscriptionScheduleChange.updateMany({
      where: {
        businessId: params.businessId,
        status: SubscriptionScheduleChangeStatus.PENDING,
      },
      data: {
        status: SubscriptionScheduleChangeStatus.CANCELLED,
        processedAt: startedAt,
      },
    });

    const createdSubscription = await tx.businessSubscription.create({
      data: {
        businessId: params.businessId,
        planId: targetPlan.id,
        status: SubscriptionStatus.ACTIVE,
        startedAt,
        currentPeriodStart,
        currentPeriodEnd,
        trialEndsAt: null,
        graceEndsAt: null,
        cancelAtPeriodEnd: false,
        cancelledAt: null,
        suspendedAt: null,
      },
      include: {
        plan: true,
      },
    });

    const invoiceNumber = await generateSubscriptionInvoiceNumber({
      tx,
      businessId: params.businessId,
      billingPeriodStart: currentPeriodStart,
    });
    const subtotal = new Prisma.Decimal(targetPlan.monthlyPrice);
    const taxAmount = new Prisma.Decimal(0);
    const totalAmount = subtotal.plus(taxAmount);

    const createdInvoice = await tx.subscriptionInvoice.create({
      data: {
        businessId: params.businessId,
        subscriptionId: createdSubscription.id,
        invoiceNumber,
        billingPeriodStart: currentPeriodStart,
        billingPeriodEnd: currentPeriodEnd,
        subtotal,
        taxAmount,
        totalAmount,
        status: SubscriptionInvoiceStatus.ISSUED,
        dueDate: currentPeriodEnd,
        issuedAt: startedAt,
      },
    });

    await syncBusinessFeatureFlags(params.businessId, createdSubscription.planId, tx);

    return {
      businessId: params.businessId,
      subscriptionId: createdSubscription.id,
      status: createdSubscription.status,
      startedAt: createdSubscription.startedAt.toISOString(),
      currentPeriodStart: createdSubscription.currentPeriodStart.toISOString(),
      currentPeriodEnd: createdSubscription.currentPeriodEnd.toISOString(),
      plan: mapPlanSummary(createdSubscription.plan),
      invoice: {
        id: createdInvoice.id,
        invoiceNumber: createdInvoice.invoiceNumber,
        billingPeriodStart: createdInvoice.billingPeriodStart.toISOString(),
        billingPeriodEnd: createdInvoice.billingPeriodEnd.toISOString(),
        dueDate: createdInvoice.dueDate.toISOString(),
        subtotal: Number(createdInvoice.subtotal),
        taxAmount: Number(createdInvoice.taxAmount),
        totalAmount: Number(createdInvoice.totalAmount),
        status: createdInvoice.status,
      },
      message:
        'Subscription baru berhasil dimulai dan invoice awal sudah diterbitkan untuk periode berjalan.',
    } satisfies SubscriptionStartResponse;
  });
}
