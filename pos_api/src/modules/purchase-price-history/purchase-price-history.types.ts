export type ListPurchasePriceHistoryQuery = {
  outletId: string;
  page?: number;
  perPage?: number;
  search?: string;
  supplierId?: string;
  productId?: string;
  dateFrom?: Date;
  dateTo?: Date;
};

export type ListPurchasePriceHistoryInput = {
  businessId: string;
  outletId: string;
  page: number;
  perPage: number;
  search?: string;
  supplierId?: string;
  productId?: string;
  dateFrom?: Date;
  dateTo?: Date;
};

export type PurchasePriceHistoryItemDto = {
  id: string;
  businessId: string;
  outletId: string;
  outletName: string;
  supplierId: string;
  supplierName: string;
  supplierCode: string;
  productId: string;
  productName: string;
  productCode: string | null;
  productSku: string | null;
  productBarcode: string | null;
  unit: string | null;
  goodsReceiptId: string;
  goodsReceiptItemId: string;
  purchaseOrderId: string | null;
  purchaseOrderItemId: string | null;
  receiptNumber: string;
  supplierInvoiceNumber: string | null;
  effectiveDate: string;
  quantity: string;
  unitCost: string;
  createdAt: string;
};
