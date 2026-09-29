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
  /** Sum of non-deleted PAID payments for the order (money actually collected). */
  paidAmount: number;
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

export type SupplierPayableAgingBucket = {
  key: 'CURRENT' | 'DUE_1_30' | 'DUE_31_60' | 'DUE_61_90' | 'DUE_OVER_90';
  label: string;
  invoiceCount: number;
  outstandingAmount: number;
};

export type SupplierPayableReportItem = {
  id: string;
  invoiceNumber: string;
  supplierId: string;
  supplierName: string;
  supplierCode: string;
  outletId: string;
  outletName: string;
  goodsReceiptId: string | null;
  goodsReceiptNumber: string | null;
  purchaseOrderId: string | null;
  purchaseOrderNumber: string | null;
  invoiceDate: string;
  dueDate: string | null;
  outstandingBaseDate: string;
  daysOverdue: number;
  grandTotal: number;
  paidAmount: number;
  outstandingAmount: number;
  status: string;
};

export type SupplierPayablesReportResponse = {
  scope: 'business' | 'outlet';
  outletId: string | null;
  asOfDate: string;
  summary: {
    openInvoiceCount: number;
    totalOutstanding: number;
    overdueInvoiceCount: number;
    overdueOutstanding: number;
  };
  aging: SupplierPayableAgingBucket[];
  items: SupplierPayableReportItem[];
  meta: { page: number; perPage: number; total: number; totalPages: number };
};
