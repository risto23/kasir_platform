import {
  PaymentMethod,
  Prisma,
  SubscriptionInvoiceStatus,
  SubscriptionPaymentStatus,
  SubscriptionScheduleChangeStatus,
  SubscriptionScheduleChangeType,
  SubscriptionStatus,
} from '@prisma/client';
import { prisma } from '../../config/prisma';
import type { SubscriptionInvoicePaymentResponse } from './subscriptions.types';
import { syncBusinessFeatureFlags } from '../platform-feature-flag/platform-feature-flag.service';

const DEFAULT_RENEWAL_LEAD_DAYS = 7;
const DEFAULT_GRACE_DAYS = 7;
const MILLISECONDS_IN_DAY = 24 * 60 * 60 * 1000;
const DECIMAL_TOLERANCE = 0.0001;

type SubscriptionBillingReader = Pick<
  typeof prisma,
  | '$transaction'
  | 'businessSubscription'
  | 'subscriptionInvoice'
  | 'subscriptionPayment'
  | 'subscriptionScheduleChange'
  | 'plan'
>;

type BillingSubscription = {
  id: string;
  businessId: string;
  planId: string;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialEndsAt: Date | null;
  graceEndsAt: Date | null;
  cancelAtPeriodEnd: boolean;
  suspendedAt: Date | null;
  createdAt: Date;
  plan: {
    id: string;
    name: string;
    monthlyPrice: Prisma.Decimal;
    currencyCode: string;
  };
};

type BillingInvoicePayment = {
  id: string;
  amount: Prisma.Decimal;
  status: SubscriptionPaymentStatus;
  createdAt: Date;
};

type BillingInvoiceWithPayments = {
  id: string;
  businessId: string;
  subscriptionId: string;
  invoiceNumber: string;
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
  totalAmount: Prisma.Decimal;
  status: SubscriptionInvoiceStatus;
  dueDate: Date;
  paidAt: Date | null;
  payments: BillingInvoicePayment[];
  subscription: {
    id: string;
    status: SubscriptionStatus;
    trialEndsAt: Date | null;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    graceEndsAt: Date | null;
    suspendedAt: Date | null;
  };
};

type BillingInvoiceWithSubscription = {
  id: string;
  subscriptionId: string;
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
  dueDate: Date;
  status: SubscriptionInvoiceStatus;
  paidAt: Date | null;
  subscription: {
    id: string;
    status: SubscriptionStatus;
    trialEndsAt: Date | null;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    graceEndsAt: Date | null;
    suspendedAt: Date | null;
  };
};

export type GeneratedSubscriptionInvoiceSummary = {
  subscriptionId: string;
  businessId: string;
  invoiceId: string;
  invoiceNumber: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  dueDate: string;
  totalAmount: number;
  status: SubscriptionInvoiceStatus;
};

export type SubscriptionBillingCycleResult = {
  generatedCount: number;
  overdueMarkedCount: number;
  activatedRenewalCount: number;
  appliedScheduledChangeCount: number;
  cancelledAtPeriodEndCount: number;
  pastDueCount: number;
  suspendedCount: number;
  generatedInvoices: GeneratedSubscriptionInvoiceSummary[];
};

function toYearMonthKey(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');

  return `${year}${month}`;
}

function buildBillingError(message: string, statusCode: number, errors?: unknown) {
  const error = new Error(message) as Error & {
    statusCode?: number;
    errors?: unknown;
  };
  error.statusCode = statusCode;
  error.errors = errors;
  return error;
}

function calculateNextBillingPeriod(subscription: BillingSubscription) {
  const durationMs =
    subscription.currentPeriodEnd.getTime() -
    subscription.currentPeriodStart.getTime() +
    1;
  const billingPeriodStart = new Date(subscription.currentPeriodEnd.getTime() + 1);
  const billingPeriodEnd = new Date(
    billingPeriodStart.getTime() + durationMs - 1,
  );

  return {
    billingPeriodStart,
    billingPeriodEnd,
  };
}

function shouldGenerateRenewalInvoice(
  subscription: BillingSubscription,
  now: Date,
  leadDays: number,
) {
  if (subscription.cancelAtPeriodEnd) {
    return false;
  }

  const renewalWindowStart = new Date(
    subscription.currentPeriodEnd.getTime() - leadDays * MILLISECONDS_IN_DAY,
  );

  return now.getTime() >= renewalWindowStart.getTime();
}

function calculateGraceEndsAt(dueDate: Date, graceDays: number) {
  return new Date(dueDate.getTime() + graceDays * MILLISECONDS_IN_DAY);
}

function sumPaidPayments(payments: BillingInvoicePayment[]) {
  return payments.reduce((total, payment) => {
    if (payment.status !== SubscriptionPaymentStatus.PAID) {
      return total;
    }

    return total + Number(payment.amount);
  }, 0);
}

function shouldTreatAsFullyPaid(totalPaidAmount: number, totalAmount: number) {
  return totalPaidAmount + DECIMAL_TOLERANCE >= totalAmount;
}

async function generateInvoiceNumber(params: {
  tx: Prisma.TransactionClient;
  businessId: string;
  billingPeriodStart: Date;
}) {
  const prefix = `SINV-${toYearMonthKey(params.billingPeriodStart)}`;
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

async function createRecurringInvoiceForSubscription(params: {
  reader: SubscriptionBillingReader;
  subscription: BillingSubscription;
  now: Date;
}) {
  const { billingPeriodStart, billingPeriodEnd } = calculateNextBillingPeriod(
    params.subscription,
  );

  const existingInvoice = await params.reader.subscriptionInvoice.findFirst({
    where: {
      subscriptionId: params.subscription.id,
      billingPeriodStart,
      billingPeriodEnd,
    },
    select: {
      id: true,
    },
  });

  if (existingInvoice) {
    return null;
  }

  return params.reader.$transaction(async (tx) => {
    const invoiceNumber = await generateInvoiceNumber({
      tx,
      businessId: params.subscription.businessId,
      billingPeriodStart,
    });
    const subtotal = params.subscription.plan.monthlyPrice;
    const taxAmount = new Prisma.Decimal(0);
    const totalAmount = subtotal.plus(taxAmount);

    const createdInvoice = await tx.subscriptionInvoice.create({
      data: {
        businessId: params.subscription.businessId,
        subscriptionId: params.subscription.id,
        invoiceNumber,
        billingPeriodStart,
        billingPeriodEnd,
        subtotal,
        taxAmount,
        totalAmount,
        status: SubscriptionInvoiceStatus.ISSUED,
        dueDate: params.subscription.currentPeriodEnd,
        issuedAt: params.now,
      },
    });

    return {
      subscriptionId: params.subscription.id,
      businessId: params.subscription.businessId,
      invoiceId: createdInvoice.id,
      invoiceNumber: createdInvoice.invoiceNumber,
      billingPeriodStart: createdInvoice.billingPeriodStart.toISOString(),
      billingPeriodEnd: createdInvoice.billingPeriodEnd.toISOString(),
      dueDate: createdInvoice.dueDate.toISOString(),
      totalAmount: Number(createdInvoice.totalAmount),
      status: createdInvoice.status,
    } satisfies GeneratedSubscriptionInvoiceSummary;
  });
}

export async function markOverdueSubscriptionInvoices(params?: {
  reader?: SubscriptionBillingReader;
  now?: Date;
}) {
  const reader = params?.reader ?? prisma;
  const now = params?.now ?? new Date();

  const result = await reader.subscriptionInvoice.updateMany({
    where: {
      status: SubscriptionInvoiceStatus.ISSUED,
      paidAt: null,
      dueDate: {
        lt: now,
      },
    },
    data: {
      status: SubscriptionInvoiceStatus.OVERDUE,
    },
  });

  return result.count;
}

export async function activatePaidSubscriptionRenewals(params?: {
  reader?: SubscriptionBillingReader;
  now?: Date;
}) {
  const reader = params?.reader ?? prisma;
  const now = params?.now ?? new Date();

  const paidInvoices = (await reader.subscriptionInvoice.findMany({
    where: {
      status: SubscriptionInvoiceStatus.PAID,
      paidAt: {
        not: null,
      },
      billingPeriodStart: {
        lte: now,
      },
      subscription: {
        status: {
          in: [
            SubscriptionStatus.TRIAL,
            SubscriptionStatus.ACTIVE,
            SubscriptionStatus.PAST_DUE,
            SubscriptionStatus.SUSPENDED,
          ],
        },
      },
    },
    include: {
      subscription: {
        select: {
          id: true,
          status: true,
          trialEndsAt: true,
          currentPeriodStart: true,
          currentPeriodEnd: true,
          graceEndsAt: true,
          suspendedAt: true,
        },
      },
    },
    orderBy: [
      {
        billingPeriodStart: 'asc',
      },
      {
        createdAt: 'asc',
      },
    ],
  })) as BillingInvoiceWithSubscription[];

  let activatedCount = 0;

  for (const invoice of paidInvoices) {
    const shouldAdvancePeriod =
      invoice.billingPeriodEnd.getTime() > invoice.subscription.currentPeriodEnd.getTime();
    const shouldReactivate =
      invoice.subscription.status === SubscriptionStatus.TRIAL ||
      invoice.subscription.status === SubscriptionStatus.PAST_DUE ||
      invoice.subscription.status === SubscriptionStatus.SUSPENDED;

    if (!shouldAdvancePeriod && !shouldReactivate) {
      continue;
    }

    await reader.businessSubscription.update({
      where: {
        id: invoice.subscription.id,
      },
      data: {
        status: SubscriptionStatus.ACTIVE,
        trialEndsAt: null,
        currentPeriodStart: shouldAdvancePeriod
          ? invoice.billingPeriodStart
          : invoice.subscription.currentPeriodStart,
        currentPeriodEnd: shouldAdvancePeriod
          ? invoice.billingPeriodEnd
          : invoice.subscription.currentPeriodEnd,
        graceEndsAt: null,
        suspendedAt: null,
      },
    });
    activatedCount += 1;
  }

  return activatedCount;
}

export async function syncPastDueSubscriptions(params?: {
  reader?: SubscriptionBillingReader;
  now?: Date;
  graceDays?: number;
}) {
  const reader = params?.reader ?? prisma;
  const graceDays = params?.graceDays ?? DEFAULT_GRACE_DAYS;

  const overdueInvoices = (await reader.subscriptionInvoice.findMany({
    where: {
      status: SubscriptionInvoiceStatus.OVERDUE,
      paidAt: null,
      subscription: {
        status: {
          in: [SubscriptionStatus.TRIAL, SubscriptionStatus.ACTIVE],
        },
      },
    },
    include: {
      subscription: {
        select: {
          id: true,
          status: true,
          trialEndsAt: true,
          currentPeriodStart: true,
          currentPeriodEnd: true,
          graceEndsAt: true,
          suspendedAt: true,
        },
      },
    },
    orderBy: [
      {
        dueDate: 'asc',
      },
      {
        createdAt: 'asc',
      },
    ],
  })) as BillingInvoiceWithSubscription[];

  let updatedCount = 0;
  const processedSubscriptionIds = new Set<string>();

  for (const invoice of overdueInvoices) {
    if (processedSubscriptionIds.has(invoice.subscription.id)) {
      continue;
    }

    await reader.businessSubscription.update({
      where: {
        id: invoice.subscription.id,
      },
      data: {
        status: SubscriptionStatus.PAST_DUE,
        graceEndsAt: calculateGraceEndsAt(invoice.dueDate, graceDays),
        suspendedAt: null,
      },
    });

    processedSubscriptionIds.add(invoice.subscription.id);
    updatedCount += 1;
  }

  return updatedCount;
}

export async function suspendExpiredGraceSubscriptions(params?: {
  reader?: SubscriptionBillingReader;
  now?: Date;
}) {
  const reader = params?.reader ?? prisma;
  const now = params?.now ?? new Date();

  const subscriptions = await reader.businessSubscription.findMany({
    where: {
      status: SubscriptionStatus.PAST_DUE,
      graceEndsAt: {
        lt: now,
      },
      invoices: {
        some: {
          status: SubscriptionInvoiceStatus.OVERDUE,
          paidAt: null,
        },
      },
    },
    select: {
      id: true,
    },
  });

  if (subscriptions.length === 0) {
    return 0;
  }

  let suspendedCount = 0;

  for (const subscription of subscriptions) {
    await reader.businessSubscription.update({
      where: {
        id: subscription.id,
      },
      data: {
        status: SubscriptionStatus.SUSPENDED,
        suspendedAt: now,
      },
    });
    suspendedCount += 1;
  }

  return suspendedCount;
}

export async function applyScheduledSubscriptionPlanChanges(params?: {
  reader?: SubscriptionBillingReader;
  now?: Date;
}) {
  const reader = params?.reader ?? prisma;
  const now = params?.now ?? new Date();

  const changes = await reader.subscriptionScheduleChange.findMany({
    where: {
      status: SubscriptionScheduleChangeStatus.PENDING,
      effectiveAt: {
        lte: now,
      },
      subscriptionId: {
        not: null,
      },
      type: SubscriptionScheduleChangeType.DOWNGRADE,
    },
    include: {
      toPlan: {
        select: {
          id: true,
          monthlyPrice: true,
        },
      },
      subscription: {
        select: {
          id: true,
          status: true,
          currentPeriodEnd: true,
        },
      },
    },
    orderBy: [
      {
        effectiveAt: 'asc',
      },
      {
        requestedAt: 'asc',
      },
    ],
  });

  let appliedCount = 0;

  for (const change of changes) {
    if (!change.subscriptionId || !change.subscription) {
      continue;
    }

    const subscription = change.subscription;

    await reader.$transaction(async (tx) => {
      await tx.businessSubscription.update({
        where: {
          id: change.subscriptionId!,
        },
        data: {
          planId: change.toPlanId,
        },
      });

      const nextInvoice = await tx.subscriptionInvoice.findFirst({
        where: {
          subscriptionId: change.subscriptionId!,
          status: {
            in: [SubscriptionInvoiceStatus.ISSUED, SubscriptionInvoiceStatus.OVERDUE],
          },
          paidAt: null,
          billingPeriodStart: {
            gt: subscription.currentPeriodEnd,
          },
        },
        include: {
          payments: {
            where: {
              status: SubscriptionPaymentStatus.PAID,
            },
            select: {
              id: true,
            },
          },
        },
        orderBy: [
          {
            billingPeriodStart: 'asc',
          },
          {
            createdAt: 'asc',
          },
        ],
      });

      if (nextInvoice && nextInvoice.payments.length === 0) {
        await tx.subscriptionInvoice.update({
          where: {
            id: nextInvoice.id,
          },
          data: {
            subtotal: change.toPlan.monthlyPrice,
            taxAmount: new Prisma.Decimal(0),
            totalAmount: change.toPlan.monthlyPrice,
          },
        });
      }

      await tx.subscriptionScheduleChange.update({
        where: {
          id: change.id,
        },
        data: {
          status: SubscriptionScheduleChangeStatus.APPLIED,
          processedAt: now,
        },
      });

      await syncBusinessFeatureFlags(change.businessId, change.toPlanId, tx);
    });

    appliedCount += 1;
  }

  return appliedCount;
}

export async function finalizeCancelledSubscriptions(params?: {
  reader?: SubscriptionBillingReader;
  now?: Date;
}) {
  const reader = params?.reader ?? prisma;
  const now = params?.now ?? new Date();

  const subscriptions = await reader.businessSubscription.findMany({
    where: {
      cancelAtPeriodEnd: true,
      status: {
        in: [
          SubscriptionStatus.TRIAL,
          SubscriptionStatus.ACTIVE,
          SubscriptionStatus.PAST_DUE,
          SubscriptionStatus.SUSPENDED,
        ],
      },
      currentPeriodEnd: {
        lt: now,
      },
    },
    select: {
      id: true,
      businessId: true,
    },
  });

  let cancelledCount = 0;

  for (const subscription of subscriptions) {
    await reader.$transaction(async (tx) => {
      await tx.businessSubscription.update({
        where: {
          id: subscription.id,
        },
        data: {
          status: SubscriptionStatus.CANCELLED,
          cancelledAt: now,
          graceEndsAt: null,
          suspendedAt: null,
        },
      });

      await tx.subscriptionScheduleChange.updateMany({
        where: {
          businessId: subscription.businessId,
          status: SubscriptionScheduleChangeStatus.PENDING,
        },
        data: {
          status: SubscriptionScheduleChangeStatus.CANCELLED,
          processedAt: now,
        },
      });
    });

    cancelledCount += 1;
  }

  return cancelledCount;
}

export async function generateRecurringSubscriptionInvoices(params?: {
  reader?: SubscriptionBillingReader;
  now?: Date;
  leadDays?: number;
}) {
  const reader = params?.reader ?? prisma;
  const now = params?.now ?? new Date();
  const leadDays = params?.leadDays ?? DEFAULT_RENEWAL_LEAD_DAYS;

  const subscriptions = (await reader.businessSubscription.findMany({
    where: {
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
      plan: {
        select: {
          id: true,
          name: true,
          monthlyPrice: true,
          currencyCode: true,
        },
      },
    },
    orderBy: [
      {
        currentPeriodEnd: 'asc',
      },
      {
        createdAt: 'asc',
      },
    ],
  })) as BillingSubscription[];

  const generatedInvoices: GeneratedSubscriptionInvoiceSummary[] = [];

  for (const subscription of subscriptions) {
    if (!shouldGenerateRenewalInvoice(subscription, now, leadDays)) {
      continue;
    }

    const createdInvoice = await createRecurringInvoiceForSubscription({
      reader,
      subscription,
      now,
    });

    if (createdInvoice) {
      generatedInvoices.push(createdInvoice);
    }
  }

  return generatedInvoices;
}

export async function recordSubscriptionInvoicePayment(
  params: {
    businessId: string;
    invoiceId: string;
    method: PaymentMethod;
    amount: number;
    referenceNumber?: string | null;
    paidAt?: Date;
  },
  options?: {
    reader?: SubscriptionBillingReader;
  },
): Promise<SubscriptionInvoicePaymentResponse> {
  const reader = options?.reader ?? prisma;
  const paymentDate = params.paidAt ?? new Date();

  return reader.$transaction(async (tx) => {
    const invoice = (await tx.subscriptionInvoice.findFirst({
      where: {
        id: params.invoiceId,
        businessId: params.businessId,
      },
      include: {
        payments: {
          where: {
            status: SubscriptionPaymentStatus.PAID,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        subscription: {
          select: {
            id: true,
            status: true,
            trialEndsAt: true,
            currentPeriodStart: true,
            currentPeriodEnd: true,
            graceEndsAt: true,
            suspendedAt: true,
          },
        },
      },
    })) as BillingInvoiceWithPayments | null;

    if (!invoice) {
      throw buildBillingError('Invoice subscription tidak ditemukan', 404);
    }

    if (invoice.status === SubscriptionInvoiceStatus.VOID) {
      throw buildBillingError('Invoice subscription yang sudah void tidak dapat dibayar', 409);
    }

    if (invoice.status === SubscriptionInvoiceStatus.PAID) {
      throw buildBillingError('Invoice subscription sudah lunas', 409);
    }

    const totalAmount = Number(invoice.totalAmount);
    const totalPaidBefore = sumPaidPayments(invoice.payments);
    const outstandingAmountBefore = Math.max(0, totalAmount - totalPaidBefore);

    if (params.amount <= 0) {
      throw buildBillingError('Nominal pembayaran subscription harus lebih dari 0', 400);
    }

    if (params.amount > outstandingAmountBefore + DECIMAL_TOLERANCE) {
      throw buildBillingError(
        'Nominal pembayaran subscription melebihi sisa tagihan invoice',
        409,
        {
          totalAmount,
          totalPaidAmount: totalPaidBefore,
          outstandingAmount: outstandingAmountBefore,
        },
      );
    }

    const createdPayment = await tx.subscriptionPayment.create({
      data: {
        invoiceId: invoice.id,
        method: params.method,
        amount: new Prisma.Decimal(params.amount),
        status: SubscriptionPaymentStatus.PAID,
        referenceNumber: params.referenceNumber ?? null,
        paidAt: paymentDate,
      },
    });

    const totalPaidAmount = totalPaidBefore + params.amount;
    const outstandingAmount = Math.max(0, totalAmount - totalPaidAmount);
    const invoiceStatus = shouldTreatAsFullyPaid(totalPaidAmount, totalAmount)
      ? SubscriptionInvoiceStatus.PAID
      : invoice.status;

    if (invoiceStatus === SubscriptionInvoiceStatus.PAID) {
      await tx.subscriptionInvoice.update({
        where: {
          id: invoice.id,
        },
        data: {
          status: SubscriptionInvoiceStatus.PAID,
          paidAt: paymentDate,
        },
      });
    }

    let updatedSubscriptionStatus = invoice.subscription.status;
    let updatedCurrentPeriodStart = invoice.subscription.currentPeriodStart;
    let updatedCurrentPeriodEnd = invoice.subscription.currentPeriodEnd;
    let updatedGraceEndsAt = invoice.subscription.graceEndsAt;
    let updatedSuspendedAt = invoice.subscription.suspendedAt;

    if (invoiceStatus === SubscriptionInvoiceStatus.PAID) {
      const shouldAdvancePeriod =
        invoice.billingPeriodStart.getTime() <= paymentDate.getTime() &&
        invoice.billingPeriodEnd.getTime() > invoice.subscription.currentPeriodEnd.getTime();
      const shouldReactivate =
        invoice.subscription.status === SubscriptionStatus.TRIAL ||
        invoice.subscription.status === SubscriptionStatus.PAST_DUE ||
        invoice.subscription.status === SubscriptionStatus.SUSPENDED;

      if (shouldAdvancePeriod || shouldReactivate) {
        const updatedSubscription = await tx.businessSubscription.update({
          where: {
            id: invoice.subscription.id,
          },
          data: {
            status: SubscriptionStatus.ACTIVE,
            trialEndsAt: null,
            currentPeriodStart: shouldAdvancePeriod
              ? invoice.billingPeriodStart
              : invoice.subscription.currentPeriodStart,
            currentPeriodEnd: shouldAdvancePeriod
              ? invoice.billingPeriodEnd
              : invoice.subscription.currentPeriodEnd,
            graceEndsAt: null,
            suspendedAt: null,
          },
          select: {
            status: true,
            currentPeriodStart: true,
            currentPeriodEnd: true,
            graceEndsAt: true,
            suspendedAt: true,
          },
        });

        updatedSubscriptionStatus = updatedSubscription.status;
        updatedCurrentPeriodStart = updatedSubscription.currentPeriodStart;
        updatedCurrentPeriodEnd = updatedSubscription.currentPeriodEnd;
        updatedGraceEndsAt = updatedSubscription.graceEndsAt;
        updatedSuspendedAt = updatedSubscription.suspendedAt;
      }
    }

    return {
      businessId: params.businessId,
      subscriptionId: invoice.subscriptionId,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      invoiceStatus,
      paidAmount: params.amount,
      totalPaidAmount,
      outstandingAmount,
      paidAt: paymentDate.toISOString(),
      payment: {
        id: createdPayment.id,
        method: createdPayment.method,
        amount: Number(createdPayment.amount),
        status: createdPayment.status,
        referenceNumber: createdPayment.referenceNumber ?? null,
        paidAt: createdPayment.paidAt?.toISOString() ?? paymentDate.toISOString(),
      },
      subscription: {
        status: updatedSubscriptionStatus,
        currentPeriodStart: updatedCurrentPeriodStart.toISOString(),
        currentPeriodEnd: updatedCurrentPeriodEnd.toISOString(),
        graceEndsAt: updatedGraceEndsAt?.toISOString() ?? null,
        suspendedAt: updatedSuspendedAt?.toISOString() ?? null,
      },
    } satisfies SubscriptionInvoicePaymentResponse;
  });
}

export async function runSubscriptionBillingCycle(params?: {
  reader?: SubscriptionBillingReader;
  now?: Date;
  leadDays?: number;
  graceDays?: number;
}) {
  const reader = params?.reader ?? prisma;
  const now = params?.now ?? new Date();
  const leadDays = params?.leadDays ?? DEFAULT_RENEWAL_LEAD_DAYS;
  const graceDays = params?.graceDays ?? DEFAULT_GRACE_DAYS;

  const overdueMarkedCount = await markOverdueSubscriptionInvoices({
    reader,
    now,
  });
  const activatedRenewalCount = await activatePaidSubscriptionRenewals({
    reader,
    now,
  });
  const appliedScheduledChangeCount = await applyScheduledSubscriptionPlanChanges({
    reader,
    now,
  });
  const cancelledAtPeriodEndCount = await finalizeCancelledSubscriptions({
    reader,
    now,
  });
  const pastDueCount = await syncPastDueSubscriptions({
    reader,
    now,
    graceDays,
  });
  const suspendedCount = await suspendExpiredGraceSubscriptions({
    reader,
    now,
  });
  const generatedInvoices = await generateRecurringSubscriptionInvoices({
    reader,
    now,
    leadDays,
  });

  return {
    generatedCount: generatedInvoices.length,
    overdueMarkedCount,
    activatedRenewalCount,
    appliedScheduledChangeCount,
    cancelledAtPeriodEndCount,
    pastDueCount,
    suspendedCount,
    generatedInvoices,
  } satisfies SubscriptionBillingCycleResult;
}
