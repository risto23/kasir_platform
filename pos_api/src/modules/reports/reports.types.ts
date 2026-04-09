export type SalesSummaryBucket = {
  key: string; // e.g., 2026-04-09 / 2026-W15 / 2026-04
  label: string; // human label
  orders: number;
  revenue: number;
  avgOrder: number;
};

export type SalesSummaryResponse = {
  scope: 'business'|'outlet';
  outletId?: string | null;
  groupBy: 'day'|'week'|'month';
  start: string; // yyyy-mm-dd
  end: string;   // yyyy-mm-dd
  totalRevenue: number;
  totalOrders: number;
  avgOrder: number;
  buckets: SalesSummaryBucket[];
};

export type OrdersReportItem = {
  id: string;
  orderNumber: string;
  outletId: string;
  outletName: string | null;
  totalAmount: number;
  paymentStatus: string;
  status: string;
  createdAt: string;
};

export type OrdersReportResponse = {
  items: OrdersReportItem[];
  meta: { page: number; perPage: number; total: number; totalPages: number };
};

export type ItemsReportRow = {
  productId: string;
  productName: string;
  quantity: number;
  revenue: number;
};

export type ItemsReportResponse = {
  items: ItemsReportRow[];
  meta: { page: number; perPage: number; total: number; totalPages: number };
};
