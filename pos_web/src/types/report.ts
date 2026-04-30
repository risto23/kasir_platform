export type MoneyString = string;

export type SalesSummary = {
  orders: number;
  gross: MoneyString;
  discount: MoneyString;
  tax: MoneyString;
  service: MoneyString;
  net: MoneyString;
  items: number;
  aov: MoneyString;
  refunds?: { count: number; amount: MoneyString };
};

export type SalesTimeseriesPoint = {
  date: string;
  orders: number;
  gross: MoneyString;
  discount: MoneyString;
  tax: MoneyString;
  service: MoneyString;
  net: MoneyString;
  items: number;
};

export type OutletSalesReport = {
  summary: SalesSummary;
  timeseries: SalesTimeseriesPoint[];
};

export type BusinessGroupBy = 'day' | 'outlet';

export type BusinessSalesTimeseries = {
  summary: SalesSummary;
  timeseries: SalesTimeseriesPoint[];
};

export type BusinessSalesPerOutletRow = {
  outletId: string;
  outletName: string;
  orders: number;
  gross: MoneyString;
  discount: MoneyString;
  tax: MoneyString;
  service: MoneyString;
  net: MoneyString;
  items: number;
  aov: MoneyString;
};

export type BusinessSalesByOutlet = {
  summary: SalesSummary;
  outlets: BusinessSalesPerOutletRow[];
};

export type BusinessSalesReport = BusinessSalesTimeseries | BusinessSalesByOutlet;

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

export type SupplierPayablesReport = {
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
  meta: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
};
