import type { StockOpnameStatus } from '@prisma/client';

export type StockOpnameListItem = {
  id: string;
  businessId: string;
  outletId: string;
  outletName: string;
  status: StockOpnameStatus;
  note: string | null;
  createdByName: string | null;
  finalizedByName: string | null;
  finalizedAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  itemCount: number;
  countedCount: number;
};

export type StockOpnameDetail = {
  id: string;
  businessId: string;
  outletId: string;
  outletName: string;
  status: StockOpnameStatus;
  note: string | null;
  createdByName: string | null;
  finalizedByName: string | null;
  finalizedAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  items: StockOpnameItemDetail[];
};

export type StockOpnameItemDetail = {
  id: string;
  productId: string;
  productName: string;
  productCode: string;
  sku: string | null;
  barcode: string | null;
  unit: string | null;
  systemStock: string;
  countedStock: string | null;
  variance: string | null;
  note: string | null;
};

export type CountItemInput = {
  productId: string;
  countedStock: number;
  note?: string;
};
