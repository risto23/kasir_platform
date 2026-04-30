export type PurchaseReturnStatus = 'DRAFT' | 'POSTED' | 'VOID';

export type PurchaseReturnItem = {
  id: string;
  goodsReceiptItemId: string;
  productId: string;
  productName: string;
  productCode: string | null;
  productSku: string | null;
  productBarcode: string | null;
  unit: string | null;
  quantityReturned: string;
  unitCost: string;
  lineSubtotal: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PurchaseReturnSummary = {
  id: string;
  businessId: string;
  outletId: string;
  supplierId: string;
  goodsReceiptId: string;
  supplierInvoiceId: string | null;
  supplierName: string;
  supplierCode: string;
  goodsReceiptNumber: string;
  supplierInvoiceNumber: string | null;
  returnNumber: string;
  returnDate: string;
  reason: string | null;
  notes: string | null;
  status: PurchaseReturnStatus;
  subtotal: string;
  totalAmount: string;
  postedAt: string | null;
  voidedAt: string | null;
  createdAt: string;
  updatedAt: string;
  itemCount: number;
};

export type PurchaseReturnDetail = PurchaseReturnSummary & {
  outletName: string;
  createdByBusinessUserId: string;
  postedByBusinessUserId: string | null;
  items: PurchaseReturnItem[];
};
