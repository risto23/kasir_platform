import { PaymentStatus, Prisma, SupplierInvoiceStatus } from '@prisma/client';
import { prisma } from '../../config/prisma';
import type {
  ItemsReportResponse,
  OrdersReportResponse,
  SalesSummaryBucket,
  SalesSummaryResponse,
  SupplierPayablesReportResponse,
} from './reports.types';

type DateRangeUtc = {
  dateFrom: string;
  dateTo: string;
  timezone: string;
  startUtc: Date;
  endUtc: Date;
};

function normalizeDateInput(value: string): string {
  const trimmedValue = value.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedValue)) {
    return trimmedValue;
  }

  const parsedDate = new Date(trimmedValue);
  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error(`Invalid date input: ${value}`);
  }

  return parsedDate.toISOString().slice(0, 10);
}

function getTimeZoneOffsetMinutes(timezone: string, date: Date): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'shortOffset',
    hour: '2-digit',
  });

  const timeZoneName = formatter
    .formatToParts(date)
    .find((part) => part.type === 'timeZoneName')?.value;

  if (!timeZoneName) {
    throw new Error(`Unable to resolve timezone offset for ${timezone}`);
  }

  if (timeZoneName === 'GMT' || timeZoneName === 'UTC') {
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

export function buildDateRangeUtc(
  start: string,
  end: string,
  timezone: string,
): DateRangeUtc {
  const dateFrom = normalizeDateInput(start);
  const dateTo = normalizeDateInput(end);

  if (dateFrom > dateTo) {
    throw new Error('Tanggal mulai tidak boleh lebih besar dari tanggal akhir');
  }

  return {
    dateFrom,
    dateTo,
    timezone,
    startUtc: createUtcDateForLocalBoundary(dateFrom, timezone, 0, 0, 0, 0),
    endUtc: createUtcDateForLocalBoundary(dateTo, timezone, 23, 59, 59, 999),
  };
}

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

function endOfDay(value: string): Date {
  return new Date(`${value}T23:59:59.999Z`);
}

export async function getSalesSummaryService(params: {
  businessId: string;
  scope: 'business'|'outlet';
  outletId?: string | null;
  groupBy: 'day'|'week'|'month';
  start: string; end: string;
}): Promise<SalesSummaryResponse> {
  const dateRange = buildDateRangeUtc(params.start, params.end, 'Asia/Jakarta');

  const orders = await prisma.order.findMany({
    where: {
      businessId: params.businessId,
      ...(params.scope === 'outlet' && params.outletId ? { outletId: params.outletId } : {}),
      paymentStatus: PaymentStatus.PAID,
      createdAt: { gte: dateRange.startUtc, lte: dateRange.endUtc },
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
  const dateRange = buildDateRangeUtc(params.start, params.end, 'Asia/Jakarta');

  const where: Prisma.OrderWhereInput = {
    businessId: params.businessId,
    ...(params.scope === 'outlet' && params.outletId ? { outletId: params.outletId } : {}),
    createdAt: { gte: dateRange.startUtc, lte: dateRange.endUtc },
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
  const dateRange = buildDateRangeUtc(params.start, params.end, 'Asia/Jakarta');

  const orders = await prisma.order.findMany({
    where: {
      businessId: params.businessId,
      ...(params.scope === 'outlet' && params.outletId ? { outletId: params.outletId } : {}),
      createdAt: { gte: dateRange.startUtc, lte: dateRange.endUtc },
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

export async function getSupplierPayablesReportService(params: {
  businessId: string;
  scope: 'business' | 'outlet';
  outletId?: string | null;
  supplierId?: string | null;
  asOfDate: string;
  page: number;
  perPage: number;
}): Promise<SupplierPayablesReportResponse> {
  const asOf = endOfDay(params.asOfDate);

  const where: Prisma.SupplierInvoiceWhereInput = {
    businessId: params.businessId,
    ...(params.scope === 'outlet' && params.outletId ? { outletId: params.outletId } : {}),
    ...(params.supplierId ? { supplierId: params.supplierId } : {}),
    status: {
      in: [SupplierInvoiceStatus.UNPAID, SupplierInvoiceStatus.PARTIALLY_PAID],
    },
    outstandingAmount: {
      gt: new Prisma.Decimal(0),
    },
    invoiceDate: {
      lte: asOf,
    },
  };

  const [total, rows, allOpenInvoices] = await Promise.all([
    prisma.supplierInvoice.count({ where }),
    prisma.supplierInvoice.findMany({
      where,
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        outlet: {
          select: {
            id: true,
            name: true,
          },
        },
        goodsReceipt: {
          select: {
            id: true,
            receiptNumber: true,
          },
        },
        purchaseOrder: {
          select: {
            id: true,
            poNumber: true,
          },
        },
      },
      orderBy: [
        {
          dueDate: 'asc',
        },
        {
          invoiceDate: 'asc',
        },
      ],
      skip: (params.page - 1) * params.perPage,
      take: params.perPage,
    }),
    prisma.supplierInvoice.findMany({
      where,
      select: {
        id: true,
        invoiceDate: true,
        dueDate: true,
        outstandingAmount: true,
      },
    }),
  ]);

  const agingMap = new Map<
    'CURRENT' | 'DUE_1_30' | 'DUE_31_60' | 'DUE_61_90' | 'DUE_OVER_90',
    { label: string; invoiceCount: number; outstandingAmount: number }
  >([
    ['CURRENT', { label: 'Belum Jatuh Tempo', invoiceCount: 0, outstandingAmount: 0 }],
    ['DUE_1_30', { label: '1-30 Hari', invoiceCount: 0, outstandingAmount: 0 }],
    ['DUE_31_60', { label: '31-60 Hari', invoiceCount: 0, outstandingAmount: 0 }],
    ['DUE_61_90', { label: '61-90 Hari', invoiceCount: 0, outstandingAmount: 0 }],
    ['DUE_OVER_90', { label: '> 90 Hari', invoiceCount: 0, outstandingAmount: 0 }],
  ]);

  let totalOutstanding = 0;
  let overdueInvoiceCount = 0;
  let overdueOutstanding = 0;

  for (const invoice of allOpenInvoices) {
    const baseDate = invoice.dueDate ?? invoice.invoiceDate;
    const diffTime = asOf.getTime() - baseDate.getTime();
    const daysOverdue = Math.floor(diffTime / 86400000);
    const amount = Number(invoice.outstandingAmount);

    totalOutstanding += amount;

    let bucketKey:
      | 'CURRENT'
      | 'DUE_1_30'
      | 'DUE_31_60'
      | 'DUE_61_90'
      | 'DUE_OVER_90';

    if (daysOverdue <= 0) {
      bucketKey = 'CURRENT';
    } else if (daysOverdue <= 30) {
      bucketKey = 'DUE_1_30';
    } else if (daysOverdue <= 60) {
      bucketKey = 'DUE_31_60';
    } else if (daysOverdue <= 90) {
      bucketKey = 'DUE_61_90';
    } else {
      bucketKey = 'DUE_OVER_90';
    }

    const bucket = agingMap.get(bucketKey);
    if (bucket) {
      bucket.invoiceCount += 1;
      bucket.outstandingAmount += amount;
    }

    if (daysOverdue > 0) {
      overdueInvoiceCount += 1;
      overdueOutstanding += amount;
    }
  }

  return {
    scope: params.scope,
    outletId: params.scope === 'outlet' ? params.outletId ?? null : null,
    asOfDate: params.asOfDate,
    summary: {
      openInvoiceCount: total,
      totalOutstanding,
      overdueInvoiceCount,
      overdueOutstanding,
    },
    aging: Array.from(agingMap.entries()).map(([key, bucket]) => ({
      key,
      label: bucket.label,
      invoiceCount: bucket.invoiceCount,
      outstandingAmount: bucket.outstandingAmount,
    })),
    items: rows.map((invoice) => {
      const baseDate = invoice.dueDate ?? invoice.invoiceDate;
      const diffTime = asOf.getTime() - baseDate.getTime();
      const daysOverdue = Math.floor(diffTime / 86400000);

      return {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        supplierId: invoice.supplierId,
        supplierName: invoice.supplier.name,
        supplierCode: invoice.supplier.code,
        outletId: invoice.outletId,
        outletName: invoice.outlet.name,
        goodsReceiptId: invoice.goodsReceiptId,
        goodsReceiptNumber: invoice.goodsReceipt?.receiptNumber ?? null,
        purchaseOrderId: invoice.purchaseOrderId,
        purchaseOrderNumber: invoice.purchaseOrder?.poNumber ?? null,
        invoiceDate: invoice.invoiceDate.toISOString(),
        dueDate: invoice.dueDate ? invoice.dueDate.toISOString() : null,
        outstandingBaseDate: baseDate.toISOString(),
        daysOverdue,
        grandTotal: Number(invoice.grandTotal),
        paidAmount: Number(invoice.paidAmount),
        outstandingAmount: Number(invoice.outstandingAmount),
        status: invoice.status,
      };
    }),
    meta: {
      page: params.page,
      perPage: params.perPage,
      total,
      totalPages: Math.max(1, Math.ceil(total / params.perPage)),
    },
  };
}

