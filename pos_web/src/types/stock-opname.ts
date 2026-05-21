export type StockOpnameStatus = 'DRAFT' | 'FINALIZED' | 'CANCELLED';

export type StockOpnameListItem = {
  id: string;
  businessId: string;
  outletId: string;
  outletName: string;
  status: StockOpnameStatus;
  note: string | null;
  createdByName: string | null;
  finalizedByName: string | null;
  finalizedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  itemCount: number;
  countedCount: number;
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

export type StockOpnameDetail = {
  id: string;
  businessId: string;
  outletId: string;
  outletName: string;
  status: StockOpnameStatus;
  note: string | null;
  createdByName: string | null;
  finalizedByName: string | null;
  finalizedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  items: StockOpnameItemDetail[];
};
