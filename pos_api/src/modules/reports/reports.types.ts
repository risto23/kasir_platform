import type { Prisma } from '@prisma/client';

export type MoneyString = string; // formatted decimal with 2 places

export type SalesSummary = {
  orders: number;
  gross: MoneyString;
  discount: MoneyString;
  tax: MoneyString;
  service: MoneyString;
  net: MoneyString;
  items: number;
  aov: MoneyString; // Average Order Value = net / orders (paid orders)
  refunds?: {
    count: number;
    amount: MoneyString;
  };
};

export type SalesTimeseriesPoint = {
  date: string; // YYYY-MM-DD (in requested timezone)
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

export type DateRange = {
  dateFrom: string; // YYYY-MM-DD (local tz)
  dateTo: string; // YYYY-MM-DD (local tz)
  timezone: string; // e.g., Asia/Jakarta
  startUtc: Date;
  endUtc: Date;
};

export type RawNumberLike = Prisma.Decimal | number | string | null | undefined;