export type GoodsReceiptStatus = 'DRAFT' | 'POSTED' | 'VOID';

export type GoodsReceiptItem = {
  id: string;
  purchaseOrderItemId: string | null;
  productId: string;
  productName: string;
  productCode: string | null;
  productSku: string | null;
  productBarcode: string | null;
  unit: string | null;
  quantityReceived: string;
  quantityAccepted: string;
  quantityRejected: string;
  quantityReturned: string;
  unitCost: string;
  lineSubtotal: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

export type GoodsReceiptSummary = {
  id: string;
  businessId: string;
  outletId: string;
  supplierId: string;
  purchaseOrderId: string | null;
  supplierName: string;
  supplierCode: string;
  purchaseOrderNumber: string | null;
  receiptNumber: string;
  receiptDate: string;
  supplierInvoiceNumber: string | null;
  notes: string | null;
  status: GoodsReceiptStatus;
  subtotal: string;
  totalAmount: string;
  postedAt: string | null;
  voidedAt: string | null;
  createdAt: string;
  updatedAt: string;
  itemCount: number;
};

export type GoodsReceiptDetail = GoodsReceiptSummary & {
  outletName: string;
  createdByBusinessUserId: string;
  postedByBusinessUserId: string | null;
  items: GoodsReceiptItem[];
};
