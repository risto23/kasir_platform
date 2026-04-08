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