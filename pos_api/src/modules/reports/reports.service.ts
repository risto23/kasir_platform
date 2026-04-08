import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import type {
  BusinessGroupBy,
  BusinessSalesByOutlet,
  BusinessSalesPerOutletRow,
  BusinessSalesReport,
  BusinessSalesTimeseries,
  DateRange,
  OutletSalesReport,
  RawNumberLike,
  SalesSummary,
  SalesTimeseriesPoint,
} from './reports.types';

function toMoneyString(value: RawNumberLike): string {
  if (value === null || value === undefined) return '0.00';
  if (value instanceof Prisma.Decimal) return value.toFixed(2);
  const n = Number(value);
  if (!Number.isFinite(n)) return '0.00';
  return n.toFixed(2);
}

function normalizeDateOnly(input?: string | null): string | null {
  if (!input) return null;
  const s = input.trim();
  if (s.length === 0) return null;
  // Accept YYYY-MM-DD or ISO, take first 10 chars if contains 'T'
  const d = s.includes('T') ? s.slice(0, 10) : s;
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return null;
}

function resolveTzOffsetHours(tz?: string | null): number {
  const v = (tz || 'Asia/Jakarta').trim();
  if (v.toLowerCase() === 'asia/jakarta') return 7;
  const m = v.match(/^UTC([+-])(\d{1,2})(?::?(\d{2}))?$/i);
  if (m) {
    const sign = m[1] === '-' ? -1 : 1;
    const hh = Number(m[2] || '0');
    const mm = Number(m[3] || '0');
    return sign * (hh + mm / 60);
  }
  return 7; // default Asia/Jakarta
}

export function buildDateRangeUtc(
  dateFrom?: string | null,
  dateTo?: string | null,
  timezone?: string | null,
): DateRange {
  const tz = (timezone || 'Asia/Jakarta').trim() || 'Asia/Jakarta';
  const offset = resolveTzOffsetHours(tz);

  const todayLocal = new Date();
  // normalize today to requested tz by shifting with offset, use its date part
  const todayIso = new Date(todayLocal.getTime() + offset * 3600 * 1000)
    .toISOString()
    .slice(0, 10);

  const df = normalizeDateOnly(dateFrom) || todayIso;
  const dt = normalizeDateOnly(dateTo) || df;

  function toUtcRange(dateStr: string, endOfDay = false): Date {
    const baseUtcMs = Date.parse(`${dateStr}T00:00:00.000Z`);
    const ms = baseUtcMs + (endOfDay ? 24 * 3600 * 1000 - 1 : 0) - offset * 3600 * 1000;
    return new Date(ms);
  }

  const startUtc = toUtcRange(df, false);
  const endUtc = toUtcRange(dt, true);

  return { dateFrom: df, dateTo: dt, timezone: tz, startUtc, endUtc };
}

async function getRefundsSummary(params: {
  businessId: string;
  outletIds?: string[];
  startUtc: Date;
  endUtc: Date;
}): Promise<{ count: number; amount: string }> {
  const { businessId, outletIds, startUtc, endUtc } = params;

  const rows = (await prisma.$queryRaw<
    Array<{ count: bigint; amount: Prisma.Decimal | null }>
  >`SELECT COUNT(*)::bigint as count, COALESCE(SUM(p."amountPaid"), 0) as amount
     FROM "payments" p
     WHERE p."businessId" = ${businessId}
       ${outletIds && outletIds.length > 0 ? Prisma.sql`AND p."outletId" IN (${Prisma.join(outletIds)})` : Prisma.empty}
       AND p."status" = 'REFUNDED'
       AND p."updatedAt" BETWEEN ${startUtc} AND ${endUtc}`) as Array<{
    count: bigint;
    amount: Prisma.Decimal | null;
  }>;

  const row = rows[0] || { count: BigInt(0), amount: new Prisma.Decimal(0) };
  return { count: Number(row.count || 0n), amount: toMoneyString(row.amount) };
}

async function getOrdersTimeseries(params: {
  businessId: string;
  outletIds?: string[];
  startUtc: Date;
  endUtc: Date;
  timezone: string;
}): Promise<Array<{ date: string; orders: bigint; gross: Prisma.Decimal; discount: Prisma.Decimal; tax: Prisma.Decimal; service: Prisma.Decimal; net: Prisma.Decimal }>> {
  const { businessId, outletIds, startUtc, endUtc, timezone } = params;

  const rows = (await prisma.$queryRaw<
    Array<{
      date: string;
      orders: bigint;
      gross: Prisma.Decimal;
      discount: Prisma.Decimal;
      tax: Prisma.Decimal;
      service: Prisma.Decimal;
      net: Prisma.Decimal;
    }>
  >`SELECT 
        to_char(date_trunc('day', (o."createdAt" AT TIME ZONE ${timezone})), 'YYYY-MM-DD') AS date,
        COUNT(*)::bigint AS orders,
        COALESCE(SUM(o."subtotal"), 0) AS gross,
        COALESCE(SUM(o."discountAmount"), 0) AS discount,
        COALESCE(SUM(o."taxAmount"), 0) AS tax,
        COALESCE(SUM(o."serviceChargeAmount"), 0) AS service,
        COALESCE(SUM(o."totalAmount"), 0) AS net
      FROM "orders" o
      WHERE o."businessId" = ${businessId}
        ${outletIds && outletIds.length > 0 ? Prisma.sql`AND o."outletId" IN (${Prisma.join(outletIds)})` : Prisma.empty}
        AND o."status" = 'COMPLETED'
        AND o."paymentStatus" = 'PAID'
        AND o."createdAt" BETWEEN ${startUtc} AND ${endUtc}
      GROUP BY 1
      ORDER BY 1 ASC`) as Array<{
    date: string;
    orders: bigint;
    gross: Prisma.Decimal;
    discount: Prisma.Decimal;
    tax: Prisma.Decimal;
    service: Prisma.Decimal;
    net: Prisma.Decimal;
  }>;

  return rows;
}

async function getItemsTimeseries(params: {
  businessId: string;
  outletIds?: string[];
  startUtc: Date;
  endUtc: Date;
  timezone: string;
}): Promise<Array<{ date: string; items: Prisma.Decimal }>> {
  const { businessId, outletIds, startUtc, endUtc, timezone } = params;

  const rows = (await prisma.$queryRaw<
    Array<{ date: string; items: Prisma.Decimal }>
  >`SELECT 
        to_char(date_trunc('day', (o."createdAt" AT TIME ZONE ${timezone})), 'YYYY-MM-DD') AS date,
        COALESCE(SUM(oi."quantity"), 0) AS items
      FROM "orders" o
      JOIN "order_items" oi ON oi."orderId" = o."id"
      WHERE o."businessId" = ${businessId}
        ${outletIds && outletIds.length > 0 ? Prisma.sql`AND o."outletId" IN (${Prisma.join(outletIds)})` : Prisma.empty}
        AND o."status" = 'COMPLETED'
        AND o."paymentStatus" = 'PAID'
        AND o."createdAt" BETWEEN ${startUtc} AND ${endUtc}
      GROUP BY 1
      ORDER BY 1 ASC`) as Array<{ date: string; items: Prisma.Decimal }>;

  return rows;
}

function mergeTimeseries(
  range: DateRange,
  orders: Array<{ date: string; orders: bigint; gross: Prisma.Decimal; discount: Prisma.Decimal; tax: Prisma.Decimal; service: Prisma.Decimal; net: Prisma.Decimal }>,
  items: Array<{ date: string; items: Prisma.Decimal }>,
): SalesTimeseriesPoint[] {
  const map: Record<string, SalesTimeseriesPoint> = {};

  for (const row of orders) {
    map[row.date] = {
      date: row.date,
      orders: Number(row.orders || 0n),
      gross: toMoneyString(row.gross),
      discount: toMoneyString(row.discount),
      tax: toMoneyString(row.tax),
      service: toMoneyString(row.service),
      net: toMoneyString(row.net),
      items: 0,
    };
  }

  for (const row of items) {
    const target = map[row.date] || {
      date: row.date,
      orders: 0,
      gross: '0.00',
      discount: '0.00',
      tax: '0.00',
      service: '0.00',
      net: '0.00',
      items: 0,
    };

    target.items = Number(new Prisma.Decimal(row.items || 0).toNumber());
    map[row.date] = target;
  }

  // Fill missing days with zeroes between dateFrom..dateTo
  const points: SalesTimeseriesPoint[] = [];
  const start = Date.parse(`${range.dateFrom}T00:00:00.000Z`);
  const end = Date.parse(`${range.dateTo}T00:00:00.000Z`);
  for (let t = start; t <= end; t += 24 * 3600 * 1000) {
    const d = new Date(t + resolveTzOffsetHours(range.timezone) * 3600 * 1000)
      .toISOString()
      .slice(0, 10);
    points.push(
      map[d] || {
        date: d,
        orders: 0,
        gross: '0.00',
        discount: '0.00',
        tax: '0.00',
        service: '0.00',
        net: '0.00',
        items: 0,
      },
    );
  }

  return points;
}

function sumTimeseries(points: SalesTimeseriesPoint[]): SalesSummary {
  const orders = points.reduce((acc, p) => acc + p.orders, 0);
  const gross = points.reduce((acc, p) => acc + Number(p.gross), 0);
  const discount = points.reduce((acc, p) => acc + Number(p.discount), 0);
  const tax = points.reduce((acc, p) => acc + Number(p.tax), 0);
  const service = points.reduce((acc, p) => acc + Number(p.service), 0);
  const net = points.reduce((acc, p) => acc + Number(p.net), 0);
  const items = points.reduce((acc, p) => acc + p.items, 0);
  const aov = orders > 0 ? (net / orders) : 0;

  return {
    orders,
    gross: gross.toFixed(2),
    discount: discount.toFixed(2),
    tax: tax.toFixed(2),
    service: service.toFixed(2),
    net: net.toFixed(2),
    items,
    aov: aov.toFixed(2),
  };
}

export async function getOutletSalesReport(params: {
  businessId: string;
  outletId: string;
  dateFrom?: string;
  dateTo?: string;
  timezone?: string;
}): Promise<OutletSalesReport> {
  const range = buildDateRangeUtc(params.dateFrom, params.dateTo, params.timezone);

  const [orders, items, refunds] = await Promise.all([
    getOrdersTimeseries({
      businessId: params.businessId,
      outletIds: [params.outletId],
      startUtc: range.startUtc,
      endUtc: range.endUtc,
      timezone: range.timezone,
    }),
    getItemsTimeseries({
      businessId: params.businessId,
      outletIds: [params.outletId],
      startUtc: range.startUtc,
      endUtc: range.endUtc,
      timezone: range.timezone,
    }),
    getRefundsSummary({
      businessId: params.businessId,
      outletIds: [params.outletId],
      startUtc: range.startUtc,
      endUtc: range.endUtc,
    }),
  ]);

  const timeseries = mergeTimeseries(range, orders, items);
  const summary = sumTimeseries(timeseries);
  if (refunds.count > 0 || Number(refunds.amount) > 0) {
    summary.refunds = { count: refunds.count, amount: refunds.amount };
  }

  return { summary, timeseries };
}

export async function getBusinessSalesReport(params: {
  businessId: string;
  outletIds?: string[];
  dateFrom?: string;
  dateTo?: string;
  groupBy?: BusinessGroupBy;
  timezone?: string;
}): Promise<BusinessSalesReport> {
  const groupBy = params.groupBy || 'day';
  const range = buildDateRangeUtc(params.dateFrom, params.dateTo, params.timezone);

  if (groupBy === 'outlet') {
    const rows = (await prisma.$queryRaw<
      Array<{
        outlet_id: string;
        outlet_name: string;
        orders: bigint;
        gross: Prisma.Decimal;
        discount: Prisma.Decimal;
        tax: Prisma.Decimal;
        service: Prisma.Decimal;
        net: Prisma.Decimal;
        items: Prisma.Decimal;
      }>
    >`SELECT 
          o."outletId" as outlet_id,
          out."name" as outlet_name,
          COUNT(*)::bigint AS orders,
          COALESCE(SUM(o."subtotal"), 0) AS gross,
          COALESCE(SUM(o."discountAmount"), 0) AS discount,
          COALESCE(SUM(o."taxAmount"), 0) AS tax,
          COALESCE(SUM(o."serviceChargeAmount"), 0) AS service,
          COALESCE(SUM(o."totalAmount"), 0) AS net,
          COALESCE((SELECT SUM(oi."quantity") FROM "order_items" oi WHERE oi."orderId" = ANY(ARRAY_AGG(o."id"))), 0) AS items
        FROM "orders" o
        JOIN "outlets" out ON out."id" = o."outletId"
        WHERE o."businessId" = ${params.businessId}
          ${params.outletIds && params.outletIds.length > 0 ? Prisma.sql`AND o."outletId" IN (${Prisma.join(params.outletIds)})` : Prisma.empty}
          AND o."status" = 'COMPLETED'
          AND o."paymentStatus" = 'PAID'
          AND o."createdAt" BETWEEN ${range.startUtc} AND ${range.endUtc}
        GROUP BY o."outletId", out."name"
        ORDER BY out."name" ASC`) as Array<{
      outlet_id: string;
      outlet_name: string;
      orders: bigint;
      gross: Prisma.Decimal;
      discount: Prisma.Decimal;
      tax: Prisma.Decimal;
      service: Prisma.Decimal;
      net: Prisma.Decimal;
      items: Prisma.Decimal;
    }>;

    const outlets: BusinessSalesPerOutletRow[] = rows.map((r) => {
      const orders = Number(r.orders || 0n);
      const netNum = Number(r.net || 0);
      const aov = orders > 0 ? (netNum / orders) : 0;
      return {
        outletId: r.outlet_id,
        outletName: r.outlet_name,
        orders,
        gross: toMoneyString(r.gross),
        discount: toMoneyString(r.discount),
        tax: toMoneyString(r.tax),
        service: toMoneyString(r.service),
        net: toMoneyString(r.net),
        items: Number(r.items || 0),
        aov: aov.toFixed(2),
      };
    });

    const summary = outlets.reduce<SalesSummary>(
      (acc, row) => ({
        orders: acc.orders + row.orders,
        gross: (Number(acc.gross) + Number(row.gross)).toFixed(2),
        discount: (Number(acc.discount) + Number(row.discount)).toFixed(2),
        tax: (Number(acc.tax) + Number(row.tax)).toFixed(2),
        service: (Number(acc.service) + Number(row.service)).toFixed(2),
        net: (Number(acc.net) + Number(row.net)).toFixed(2),
        items: acc.items + row.items,
        aov: '0.00',
        refunds: acc.refunds,
      }),
      { orders: 0, gross: '0.00', discount: '0.00', tax: '0.00', service: '0.00', net: '0.00', items: 0, aov: '0.00' },
    );

    summary.aov = summary.orders > 0 ? (Number(summary.net) / summary.orders).toFixed(2) : '0.00';

    const refunds = await getRefundsSummary({
      businessId: params.businessId,
      outletIds: params.outletIds,
      startUtc: range.startUtc,
      endUtc: range.endUtc,
    });

    if (refunds.count > 0 || Number(refunds.amount) > 0) {
      summary.refunds = { count: refunds.count, amount: refunds.amount };
    }

    const result: BusinessSalesByOutlet = { summary, outlets };
    return result;
  }

  // groupBy day
  const [orders, items, refunds] = await Promise.all([
    getOrdersTimeseries({
      businessId: params.businessId,
      outletIds: params.outletIds,
      startUtc: range.startUtc,
      endUtc: range.endUtc,
      timezone: range.timezone,
    }),
    getItemsTimeseries({
      businessId: params.businessId,
      outletIds: params.outletIds,
      startUtc: range.startUtc,
      endUtc: range.endUtc,
      timezone: range.timezone,
    }),
    getRefundsSummary({
      businessId: params.businessId,
      outletIds: params.outletIds,
      startUtc: range.startUtc,
      endUtc: range.endUtc,
    }),
  ]);

  const timeseries = mergeTimeseries(range, orders, items);
  const summary = sumTimeseries(timeseries);
  if (refunds.count > 0 || Number(refunds.amount) > 0) {
    summary.refunds = { count: refunds.count, amount: refunds.amount };
  }

  const result: BusinessSalesTimeseries = { summary, timeseries };
  return result;
}


