import {
  SubscriptionStatus,
} from '@prisma/client';
import { prisma } from '../config/prisma';
import {
  calculateSubscriptionUsageMetricByBusiness,
  type SubscriptionUsageMetric,
  type SubscriptionUsageReader,
} from '../modules/subscriptions/subscription-usage.service';

type LimitReader = SubscriptionUsageReader & Pick<typeof prisma, 'businessSubscription'>;

type LimitKey =
  | 'maxOutlets'
  | 'maxUsers'
  | 'maxProducts'
  | 'maxMonthlyTransactions';

type BlockedAction =
  | 'CREATE_OUTLET'
  | 'ACTIVATE_OUTLET'
  | 'CREATE_BUSINESS_USER'
  | 'ACTIVATE_BUSINESS_USER'
  | 'CREATE_PRODUCT'
  | 'ACTIVATE_PRODUCT'
  | 'CREATE_ORDER'
  | 'CREATE_FINAL_PAYMENT';

type LimitRule = {
  metric: SubscriptionUsageMetric;
  limitKey: LimitKey;
  limitLabel: string;
  blockedAction: BlockedAction;
  suggestion: string;
};

type SubscriptionLimitErrorPayload = {
  code: 'SUBSCRIPTION_LIMIT_EXCEEDED';
  plan: {
    id: string;
    code: string;
    name: string;
  };
  subscription: {
    id: string;
    status: SubscriptionStatus;
  };
  limitType: SubscriptionUsageMetric;
  limit: number;
  usage: number;
  blockedAction: BlockedAction;
  suggestion: string;
};

type HttpErrorWithPayload = Error & {
  statusCode?: number;
  errors?: SubscriptionLimitErrorPayload;
};

const ACTIVE_SUBSCRIPTION_STATUSES: SubscriptionStatus[] = [
  SubscriptionStatus.TRIAL,
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.PAST_DUE,
  SubscriptionStatus.SUSPENDED,
];

function buildSubscriptionLimitError(params: {
  plan: {
    id: string;
    code: string;
    name: string;
  };
  subscription: {
    id: string;
    status: SubscriptionStatus;
  };
  rule: LimitRule;
  limit: number;
  usage: number;
}): HttpErrorWithPayload {
  const error = new Error(
    `Paket ${params.plan.name} sudah mencapai batas ${params.rule.limitLabel}. Upgrade paket untuk melanjutkan aksi ini.`,
  ) as HttpErrorWithPayload;

  error.statusCode = 403;
  error.errors = {
    code: 'SUBSCRIPTION_LIMIT_EXCEEDED',
    plan: params.plan,
    subscription: params.subscription,
    limitType: params.rule.metric,
    limit: params.limit,
    usage: params.usage,
    blockedAction: params.rule.blockedAction,
    suggestion: params.rule.suggestion,
  };

  return error;
}

async function getActiveSubscriptionByBusiness(
  reader: LimitReader,
  businessId: string,
) {
  const subscription = await reader.businessSubscription.findFirst({
    where: {
      businessId,
      status: {
        in: ACTIVE_SUBSCRIPTION_STATUSES,
      },
    },
    include: {
      plan: {
        select: {
          id: true,
          code: true,
          name: true,
          maxOutlets: true,
          maxUsers: true,
          maxProducts: true,
          maxMonthlyTransactions: true,
        },
      },
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

  if (!subscription) {
    const error = new Error('Subscription aktif tidak ditemukan untuk business ini') as HttpErrorWithPayload;
    error.statusCode = 403;
    return Promise.reject(error);
  }

  return subscription;
}

async function enforceLimit(params: {
  reader?: LimitReader;
  businessId: string;
  rule: LimitRule;
}) {
  const reader = params.reader ?? prisma;
  const subscription = await getActiveSubscriptionByBusiness(reader, params.businessId);
  const limit = subscription.plan[params.rule.limitKey];

  if (limit === null) {
    return;
  }

  const usage = await calculateSubscriptionUsageMetricByBusiness(
    reader,
    params.businessId,
    params.rule.metric,
  );

  if (usage < limit) {
    return;
  }

  throw buildSubscriptionLimitError({
    plan: {
      id: subscription.plan.id,
      code: subscription.plan.code,
      name: subscription.plan.name,
    },
    subscription: {
      id: subscription.id,
      status: subscription.status,
    },
    rule: params.rule,
    limit,
    usage,
  });
}

export async function enforceOutletLimit(params: {
  reader?: LimitReader;
  businessId: string;
  blockedAction?: Extract<BlockedAction, 'CREATE_OUTLET' | 'ACTIVATE_OUTLET'>;
}) {
  const blockedAction = params.blockedAction ?? 'CREATE_OUTLET';

  return enforceLimit({
    reader: params.reader,
    businessId: params.businessId,
    rule: {
      metric: 'OUTLETS',
      limitKey: 'maxOutlets',
      limitLabel: 'outlet aktif',
      blockedAction,
      suggestion: 'Upgrade paket aktif untuk menambah limit outlet.',
    },
  });
}

export async function enforceBusinessUserLimit(params: {
  reader?: LimitReader;
  businessId: string;
  blockedAction?: Extract<
    BlockedAction,
    'CREATE_BUSINESS_USER' | 'ACTIVATE_BUSINESS_USER'
  >;
}) {
  const blockedAction = params.blockedAction ?? 'CREATE_BUSINESS_USER';

  return enforceLimit({
    reader: params.reader,
    businessId: params.businessId,
    rule: {
      metric: 'USERS',
      limitKey: 'maxUsers',
      limitLabel: 'user aktif',
      blockedAction,
      suggestion: 'Upgrade paket aktif untuk menambah limit user.',
    },
  });
}

export async function enforceProductLimit(params: {
  reader?: LimitReader;
  businessId: string;
  blockedAction?: Extract<BlockedAction, 'CREATE_PRODUCT' | 'ACTIVATE_PRODUCT'>;
}) {
  const blockedAction = params.blockedAction ?? 'CREATE_PRODUCT';

  return enforceLimit({
    reader: params.reader,
    businessId: params.businessId,
    rule: {
      metric: 'PRODUCTS',
      limitKey: 'maxProducts',
      limitLabel: 'product aktif',
      blockedAction,
      suggestion: 'Upgrade paket aktif untuk menambah limit product.',
    },
  });
}

export async function enforceMonthlyTransactionLimit(params: {
  reader?: LimitReader;
  businessId: string;
  blockedAction?: Extract<BlockedAction, 'CREATE_ORDER' | 'CREATE_FINAL_PAYMENT'>;
}) {
  const blockedAction = params.blockedAction ?? 'CREATE_ORDER';

  return enforceLimit({
    reader: params.reader,
    businessId: params.businessId,
    rule: {
      metric: 'MONTHLY_TRANSACTIONS',
      limitKey: 'maxMonthlyTransactions',
      limitLabel: 'transaksi bulanan',
      blockedAction,
      suggestion: 'Upgrade paket aktif untuk menambah limit transaksi bulanan.',
    },
  });
}
