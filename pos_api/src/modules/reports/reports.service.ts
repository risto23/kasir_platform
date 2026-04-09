import { PaymentStatus, Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import type { ItemsReportResponse, OrdersReportResponse, SalesSummaryBucket, SalesSummaryResponse } from './reports.types';

function toDate(value: string): Date { return new Date(value + 'T00:00:00.000Z'); }
function ymd(date: Date): string { return date.toISOString().slice(0,10); }
function monthKey(date: Date): string { return date.getUTCFullYear() + '-' + String(date.getUTCMonth()+1).padStart(2,'0'); }
function weekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = (d.getUTCDay()+6)%7;
  d.setUTCDate(d.getUTCDate() - day + 3);
  const weekYear = d.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(weekYear,0,4));
  const week = Math.floor(1 + (d.getTime() - firstThursday.getTime()) / 604800000);
  return weekYear + '-W' + String(week).padStart(2,'0');
}

function labelOf(groupBy: 'day'|'week'|'month', key: string): string { return key; }

export async function getSalesSummaryService(params: {
  businessId: string;
  scope: 'business'|'outlet';
  outletId?: string | null;
  groupBy: 'day'|'week'|'month';
  start: string; end: string;
}): Promise<SalesSummaryResponse> {
  const startDate = toDate(params.start);
  const endDate = toDate(params.end);

  const orders = await prisma.order.findMany({
    where: {
      businessId: params.businessId,
      ...(params.scope === 'outlet' && params.outletId ? { outletId: params.outletId } : {}),
      paymentStatus: PaymentStatus.PAID,
      createdAt: { gte: startDate, lte: new Date(endDate.getTime() + 86399999) },
    },
    select: {
      id: true, totalAmount: true, createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  const buckets = new Map<string, { orders: number; revenue: number }>();

  for (const o of orders) {
    const d = o.createdAt;
    let key: string;
    if (params.groupBy === 'day') key = ymd(d);
    else if (params.groupBy === 'week') key = weekKey(d);
    else key = monthKey(d);

    const b = buckets.get(key) || { orders: 0, revenue: 0 };
    b.orders += 1;
    b.revenue += Number(o.totalAmount);
    buckets.set(key, b);
  }

  const sortedKeys = Array.from(buckets.keys()).sort();
  const outBuckets: SalesSummaryBucket[] = sortedKeys.map((key) => {
    const b = buckets.get(key)!;
    return { key, label: labelOf(params.groupBy, key), orders: b.orders, revenue: b.revenue, avgOrder: b.orders ? b.revenue / b.orders : 0 };
  });

  const totalRevenue = outBuckets.reduce((s, b) => s + b.revenue, 0);
  const totalOrders = outBuckets.reduce((s, b) => s + b.orders, 0);
  const avgOrder = totalOrders ? totalRevenue / totalOrders : 0;

  return {
    scope: params.scope,
    outletId: params.outletId ?? null,
    groupBy: params.groupBy,
    start: params.start,
    end: params.end,
    totalRevenue,
    totalOrders,
    avgOrder,
    buckets: outBuckets,
  };
}

export async function getOrdersReportService(params: {
  businessId: string; scope: 'business'|'outlet'; outletId?: string | null; start: string; end: string; page: number; perPage: number;
}): Promise<OrdersReportResponse> {
  const startDate = toDate(params.start);
  const endDate = toDate(params.end);

  const where: Prisma.OrderWhereInput = {
    businessId: params.businessId,
    ...(params.scope === 'outlet' && params.outletId ? { outletId: params.outletId } : {}),
    createdAt: { gte: startDate, lte: new Date(endDate.getTime() + 86399999) },
  };

  const [total, rows] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where, orderBy: { createdAt: 'desc' }, skip: (params.page-1)*params.perPage, take: params.perPage,
      select: { id: true, orderNumber: true, outletId: true, totalAmount: true, paymentStatus: true, status: true, createdAt: true, outlet: { select: { name: true } } },
    })
  ]);

  return {
    items: rows.map((r) => ({ id: r.id, orderNumber: r.orderNumber, outletId: r.outletId, outletName: r.outlet?.name ?? null, totalAmount: Number(r.totalAmount), paymentStatus: r.paymentStatus, status: r.status, createdAt: r.createdAt.toISOString() })),
    meta: { page: params.page, perPage: params.perPage, total, totalPages: Math.max(1, Math.ceil(total/params.perPage)) },
  };
}

export async function getItemsReportService(params: {
  businessId: string; scope: 'business'|'outlet'; outletId?: string | null; start: string; end: string; page: number; perPage: number;
}): Promise<ItemsReportResponse> {
  const startDate = toDate(params.start);
  const endDate = toDate(params.end);

  const orders = await prisma.order.findMany({
    where: {
      businessId: params.businessId,
      ...(params.scope === 'outlet' && params.outletId ? { outletId: params.outletId } : {}),
      createdAt: { gte: startDate, lte: new Date(endDate.getTime() + 86399999) },
    },
    select: { id: true },
  });

  if (orders.length === 0) {
    return { items: [], meta: { page: params.page, perPage: params.perPage, total: 0, totalPages: 1 } };
  }

  const orderIds = orders.map((o) => o.id);
  const items = await prisma.orderItem.findMany({
    where: { orderId: { in: orderIds } },
    select: { productId: true, productName: true, quantity: true, lineTotal: true },
  });

  const map = new Map<string, { productId: string; productName: string; quantity: number; revenue: number }>();
  for (const it of items) {
    const key = it.productId;
    const row = map.get(key) || { productId: it.productId, productName: it.productName, quantity: 0, revenue: 0 };
    row.quantity += Number(it.quantity);
    row.revenue += Number(it.lineTotal);
    map.set(key, row);
  }

  const all = Array.from(map.values()).sort((a,b) => b.revenue - a.revenue);
  const total = all.length;
  const start = (params.page-1)*params.perPage;
  const sliced = all.slice(start, start + params.perPage);

  return { items: sliced, meta: { page: params.page, perPage: params.perPage, total, totalPages: Math.max(1, Math.ceil(total/params.perPage)) } };
}

