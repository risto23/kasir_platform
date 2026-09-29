import { api } from '@/lib/api';
import type {
  BusinessGroupBy,
  BusinessSalesByOutlet,
  BusinessSalesPerOutletRow,
  BusinessSalesReport,
  BusinessSalesTimeseries,
  OutletSalesReport,
  SalesSummary,
  SalesTimeseriesPoint,
} from '@/types/report';

type SummaryParams = {
  scope?: 'business' | 'outlet';
  outletId?: string;
  groupBy?: 'day' | 'week' | 'month';
  start: string;
  end: string;
  orderStatus?: string;
};

type OrdersParams = {
  scope?: 'business' | 'outlet';
  outletId?: string;
  page?: number;
  perPage?: number;
  start: string;
  end: string;
  orderStatus?: string;
};

type ItemsParams = {
  scope?: 'business' | 'outlet';
  outletId?: string;
  page?: number;
  perPage?: number;
  start: string;
  end: string;
  orderStatus?: string;
};

type ExportOutletParams = {
  outletId: string;
  dateFrom: string;
  dateTo: string;
  timezone?: string;
  orderStatus?: string;
};

type ExportBusinessParams = {
  outletIds: string[];
  dateFrom: string;
  dateTo: string;
  groupBy: BusinessGroupBy;
  timezone?: string;
  orderStatus?: string;
};

type OrdersReportItem = {
  id: string;
  orderNumber: string;
  outletId: string;
  outletName: string | null;
  totalAmount: number;
  paidAmount: number;
  paymentStatus: string;
  status: string;
  createdAt: string;
};

type OrdersReportResponse = {
  items: OrdersReportItem[];
  meta?: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
};

type ItemsReportItem = {
  productId: string;
  productName: string;
  quantity: number;
  revenue: number;
};

type ItemsReportResponse = {
  items: ItemsReportItem[];
  meta?: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
};

type SalesSummaryResponse = {
  scope: 'business' | 'outlet';
  outletId?: string | null;
  groupBy: 'day' | 'week' | 'month';
  start: string;
  end: string;
  totalRevenue: number;
  totalOrders: number;
  avgOrder: number;
  buckets: Array<{
    key: string;
    label: string;
    orders: number;
    revenue: number;
    avgOrder: number;
  }>;
};

const DEFAULT_MONEY = '0.00';
const REPORTS_PAGE_SIZE = 100;

function toMoneyString(value: number) {
  return value.toFixed(2);
}

function escapeCsvCell(value: string | number) {
  const stringValue = String(value);

  if (
    stringValue.includes(',') ||
    stringValue.includes('"') ||
    stringValue.includes('\n')
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

function createCsvBlob(rows: Array<Array<string | number>>) {
  const content = rows
    .map((row) => row.map(escapeCsvCell).join(','))
    .join('\r\n');

  return new Blob([`\uFEFF${content}`], {
    type: 'text/csv;charset=utf-8',
  });
}

function escapeXml(value: string | number) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function createExcelBlob(sheetName: string, rows: Array<Array<string | number>>) {
  const xmlRows = rows
    .map(
      (row) =>
        `<Row>${row
          .map((cell) => `<Cell><Data ss:Type="String">${escapeXml(cell)}</Data></Cell>`)
          .join('')}</Row>`,
    )
    .join('');

  const workbook = `<?xml version="1.0" encoding="UTF-8"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="${escapeXml(sheetName)}">
  <Table>${xmlRows}</Table>
 </Worksheet>
</Workbook>`;

  return new Blob([workbook], {
    type: 'application/vnd.ms-excel;charset=utf-8',
  });
}

function buildSummary(orders: number, gross: number): SalesSummary {
  return {
    orders,
    gross: toMoneyString(gross),
    discount: DEFAULT_MONEY,
    tax: DEFAULT_MONEY,
    service: DEFAULT_MONEY,
    net: toMoneyString(gross),
    items: 0,
    aov: toMoneyString(orders > 0 ? gross / orders : 0),
  };
}

function buildTimeseriesPoint(
  date: string,
  orders: number,
  gross: number,
): SalesTimeseriesPoint {
  return {
    date,
    orders,
    gross: toMoneyString(gross),
    discount: DEFAULT_MONEY,
    tax: DEFAULT_MONEY,
    service: DEFAULT_MONEY,
    net: toMoneyString(gross),
    items: 0,
  };
}

function normalizeOrderDate(createdAt: string) {
  return createdAt.slice(0, 10);
}

function filterOrdersByOutletIds(
  orders: OrdersReportItem[],
  outletIds: string[],
) {
  if (outletIds.length === 0) {
    return orders;
  }

  const allowed = new Set(outletIds);
  return orders.filter((order) => allowed.has(order.outletId));
}

async function fetchAllOrdersReport(params: OrdersParams) {
  const allItems: OrdersReportItem[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const payload = (await fetchOrdersReport({
      ...params,
      page,
      perPage: REPORTS_PAGE_SIZE,
    })) as OrdersReportResponse;

    const items = Array.isArray(payload?.items) ? payload.items : [];
    allItems.push(...items);

    totalPages = payload?.meta?.totalPages ?? 1;
    page += 1;
  }

  return allItems;
}

function buildTimeseriesFromOrders(orders: OrdersReportItem[]) {
  const buckets = new Map<string, { orders: number; gross: number }>();

  for (const order of orders) {
    const key = normalizeOrderDate(order.createdAt);
    const current = buckets.get(key) ?? { orders: 0, gross: 0 };

    current.orders += 1;
    current.gross += Number(order.paidAmount) || 0;
    buckets.set(key, current);
  }

  return Array.from(buckets.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, value]) => buildTimeseriesPoint(date, value.orders, value.gross));
}

function buildOutletRowsFromOrders(orders: OrdersReportItem[]) {
  const buckets = new Map<string, BusinessSalesPerOutletRow>();

  for (const order of orders) {
    const current = buckets.get(order.outletId) ?? {
      outletId: order.outletId,
      outletName: order.outletName ?? order.outletId,
      orders: 0,
      gross: DEFAULT_MONEY,
      discount: DEFAULT_MONEY,
      tax: DEFAULT_MONEY,
      service: DEFAULT_MONEY,
      net: DEFAULT_MONEY,
      items: 0,
      aov: DEFAULT_MONEY,
    };

    current.orders += 1;
    const nextGross = Number(current.gross) + (Number(order.paidAmount) || 0);
    current.gross = toMoneyString(nextGross);
    current.net = toMoneyString(nextGross);
    current.aov = toMoneyString(current.orders > 0 ? nextGross / current.orders : 0);
    buckets.set(order.outletId, current);
  }

  return Array.from(buckets.values()).sort(
    (left, right) => Number(right.net) - Number(left.net),
  );
}

function outletRowsToSheetRows(rows: BusinessSalesPerOutletRow[]) {
  return [
    ['Outlet', 'Orders', 'Gross', 'Discount', 'Tax', 'Service', 'Net', 'Items', 'AOV'],
    ...rows.map((row) => [
      row.outletName,
      row.orders,
      row.gross,
      row.discount,
      row.tax,
      row.service,
      row.net,
      row.items,
      row.aov,
    ]),
  ];
}

function timeseriesToSheetRows(rows: SalesTimeseriesPoint[]) {
  return [
    ['Date', 'Orders', 'Gross', 'Discount', 'Tax', 'Service', 'Net', 'Items', 'AOV'],
    ...rows.map((row) => [
      row.date,
      row.orders,
      row.gross,
      row.discount,
      row.tax,
      row.service,
      row.net,
      row.items,
      row.orders > 0 ? toMoneyString(Number(row.net) / row.orders) : DEFAULT_MONEY,
    ]),
  ];
}

export async function fetchSalesSummary(params: SummaryParams) {
  const response = await api.get('/reports/sales-summary', { params });
  return response.data?.data as SalesSummaryResponse;
}

export async function fetchOrdersReport(params: OrdersParams) {
  const response = await api.get('/reports/orders', { params });
  return response.data?.data as OrdersReportResponse;
}

export async function fetchItemsReport(params: ItemsParams) {
  const response = await api.get('/reports/items', { params });
  return response.data?.data as ItemsReportResponse;
}

export async function fetchOutletSales(
  params: ExportOutletParams,
): Promise<OutletSalesReport> {
  const orders = await fetchAllOrdersReport({
    scope: 'outlet',
    outletId: params.outletId,
    start: params.dateFrom,
    end: params.dateTo,
    orderStatus: params.orderStatus,
  });

  const gross = orders.reduce(
    (sum, order) => sum + (Number(order.paidAmount) || 0),
    0,
  );

  return {
    summary: buildSummary(orders.length, gross),
    timeseries: buildTimeseriesFromOrders(orders),
  };
}

export async function fetchBusinessSales(
  params: ExportBusinessParams,
): Promise<BusinessSalesReport> {
  const orders = filterOrdersByOutletIds(
    await fetchAllOrdersReport({
      scope: 'business',
      start: params.dateFrom,
      end: params.dateTo,
      orderStatus: params.orderStatus,
    }),
    params.outletIds,
  );

  const gross = orders.reduce(
    (sum, order) => sum + (Number(order.paidAmount) || 0),
    0,
  );
  const summary = buildSummary(orders.length, gross);

  if (params.groupBy === 'outlet') {
    const grouped: BusinessSalesByOutlet = {
      summary,
      outlets: buildOutletRowsFromOrders(orders),
    };

    return grouped;
  }

  const grouped: BusinessSalesTimeseries = {
    summary,
    timeseries: buildTimeseriesFromOrders(orders),
  };

  return grouped;
}

export async function exportOutletSalesCsv(params: ExportOutletParams) {
  const report = await fetchOutletSales(params);
  return createCsvBlob(timeseriesToSheetRows(report.timeseries));
}

export async function exportBusinessSalesCsv(params: ExportBusinessParams) {
  const report = await fetchBusinessSales(params);

  if ('outlets' in report) {
    return createCsvBlob(outletRowsToSheetRows(report.outlets));
  }

  return createCsvBlob(timeseriesToSheetRows(report.timeseries));
}

export async function exportOutletSalesXlsx(params: ExportOutletParams) {
  const report = await fetchOutletSales(params);
  return createExcelBlob('Outlet Sales', timeseriesToSheetRows(report.timeseries));
}

export async function exportBusinessSalesXlsx(params: ExportBusinessParams) {
  const report = await fetchBusinessSales(params);

  if ('outlets' in report) {
    return createExcelBlob('Business Sales', outletRowsToSheetRows(report.outlets));
  }

  return createExcelBlob('Business Sales', timeseriesToSheetRows(report.timeseries));
}

export type {
  ItemsReportItem,
  ItemsReportResponse,
  OrdersReportItem,
  OrdersReportResponse,
  SalesSummaryResponse,
};
