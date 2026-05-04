import {
  BusinessUserStatus,
  OrderStatus,
  OutletStatus,
  PaymentStatus,
  ProductStatus,
  SubscriptionStatus,
  PlatformRoleCode,
} from '@prisma/client';
import { prisma } from '../../config/prisma';

const DEFAULT_BILLING_TIMEZONE = 'Asia/Jakarta';

export type SubscriptionUsageMetric =
  | 'OUTLETS'
  | 'USERS'
  | 'PRODUCTS'
  | 'MONTHLY_TRANSACTIONS';

export type SubscriptionUsageReader = Pick<
  typeof prisma,
  'outlet' | 'businessUser' | 'product' | 'payment' | 'subscriptionUsageMonthly'
>;

export type CalculatedSubscriptionUsage = {
  yearMonth: string;
  outletCount: number;
  userCount: number;
  productCount: number;
  transactionCount: number;
};

function getTimeZoneOffsetMinutes(timezone: string, date: Date): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'shortOffset',
    hour: '2-digit',
  });
  const timeZoneName = formatter
    .formatToParts(date)
    .find((part) => part.type === 'timeZoneName')?.value;

  if (!timeZoneName || timeZoneName === 'GMT' || timeZoneName === 'UTC') {
    return 0;
  }

  const match = timeZoneName.match(/^(?:GMT|UTC)([+-])(\d{1,2})(?::?(\d{2}))?$/);
  if (!match) {
    throw new Error(`Unsupported timezone offset format: ${timeZoneName}`);
  }

  const [, sign, hours, minutes] = match;
  const totalMinutes = Number(hours) * 60 + Number(minutes ?? '0');

  return sign === '+' ? totalMinutes : -totalMinutes;
}

function createUtcDateForLocalBoundary(
  dateValue: string,
  timezone: string,
  hour: number,
  minute: number,
  second: number,
  millisecond: number,
): Date {
  const [year, month, day] = dateValue.split('-').map(Number);
  const naiveUtcTimestamp = Date.UTC(
    year,
    month - 1,
    day,
    hour,
    minute,
    second,
    millisecond,
  );
  const offsetMinutes = getTimeZoneOffsetMinutes(timezone, new Date(naiveUtcTimestamp));

  return new Date(naiveUtcTimestamp - offsetMinutes * 60_000);
}

export function getCurrentYearMonth(timezone: string = DEFAULT_BILLING_TIMEZONE): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;

  if (!year || !month) {
    throw new Error('Gagal menghitung yearMonth billing');
  }

  return `${year}-${month}`;
}

export function getMonthRangeUtc(
  yearMonth: string,
  timezone: string = DEFAULT_BILLING_TIMEZONE,
) {
  const [year, month] = yearMonth.split('-').map(Number);
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDate = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDate).padStart(2, '0')}`;

  return {
    startUtc: createUtcDateForLocalBoundary(startDate, timezone, 0, 0, 0, 0),
    endUtc: createUtcDateForLocalBoundary(endDate, timezone, 23, 59, 59, 999),
  };
}

export async function calculateSubscriptionUsageMetricByBusiness(
  reader: SubscriptionUsageReader,
  businessId: string,
  metric: SubscriptionUsageMetric,
): Promise<number> {
  if (metric === 'OUTLETS') {
    return reader.outlet.count({
      where: {
        businessId,
        status: OutletStatus.ACTIVE,
      },
    });
  }

  if (metric === 'USERS') {
    return reader.businessUser.count({
      where: {
        businessId,
        status: BusinessUserStatus.ACTIVE,
        user: {
          platformRoles: {
            none: {
              platformRole: {
                code: PlatformRoleCode.SUPER_ADMIN,
              },
            },
          },
        },
      },
    });
  }

  if (metric === 'PRODUCTS') {
    return reader.product.count({
      where: {
        businessId,
        status: ProductStatus.ACTIVE,
      },
    });
  }

  const yearMonth = getCurrentYearMonth();
  const currentMonthRange = getMonthRangeUtc(yearMonth);

  return reader.payment.count({
    where: {
      businessId,
      status: PaymentStatus.PAID,
      paidAt: {
        gte: currentMonthRange.startUtc,
        lte: currentMonthRange.endUtc,
      },
      order: {
        status: {
          not: OrderStatus.CANCELLED,
        },
      },
    },
  });
}

export async function calculateCurrentUsageByBusinessFromReader(
  reader: SubscriptionUsageReader,
  businessId: string,
): Promise<CalculatedSubscriptionUsage> {
  const yearMonth = getCurrentYearMonth();

  const [outletCount, userCount, productCount, transactionCount] = await Promise.all([
    calculateSubscriptionUsageMetricByBusiness(reader, businessId, 'OUTLETS'),
    calculateSubscriptionUsageMetricByBusiness(reader, businessId, 'USERS'),
    calculateSubscriptionUsageMetricByBusiness(reader, businessId, 'PRODUCTS'),
    calculateSubscriptionUsageMetricByBusiness(reader, businessId, 'MONTHLY_TRANSACTIONS'),
  ]);

  return {
    yearMonth,
    outletCount,
    userCount,
    productCount,
    transactionCount,
  };
}

export async function calculateCurrentUsageByBusiness(
  businessId: string,
): Promise<CalculatedSubscriptionUsage> {
  return calculateCurrentUsageByBusinessFromReader(prisma, businessId);
}

export async function syncSubscriptionUsageSnapshot(params: {
  businessId: string;
  usage: CalculatedSubscriptionUsage;
}) {
  return prisma.subscriptionUsageMonthly.upsert({
    where: {
      businessId_yearMonth: {
        businessId: params.businessId,
        yearMonth: params.usage.yearMonth,
      },
    },
    create: {
      businessId: params.businessId,
      yearMonth: params.usage.yearMonth,
      outletCount: params.usage.outletCount,
      userCount: params.usage.userCount,
      productCount: params.usage.productCount,
      transactionCount: params.usage.transactionCount,
    },
    update: {
      outletCount: params.usage.outletCount,
      userCount: params.usage.userCount,
      productCount: params.usage.productCount,
      transactionCount: params.usage.transactionCount,
    },
  });
}

export async function getCurrentUsageSnapshotByBusiness(params: {
  businessId: string;
  subscriptionStatus: SubscriptionStatus;
}) {
  const usage = await calculateCurrentUsageByBusiness(params.businessId);

  await syncSubscriptionUsageSnapshot({
    businessId: params.businessId,
    usage,
  });

  return {
    yearMonth: usage.yearMonth,
    subscriptionStatus: params.subscriptionStatus,
    usage: {
      outlets: usage.outletCount,
      users: usage.userCount,
      products: usage.productCount,
      monthlyTransactions: usage.transactionCount,
    },
  };
}
