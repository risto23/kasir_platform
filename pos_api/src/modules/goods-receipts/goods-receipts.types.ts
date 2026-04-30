import { GoodsReceiptStatus } from '@prisma/client';

export type ListGoodsReceiptsQuery = {
  outletId: string;
  page?: number;
  perPage?: number;
  search?: string;
  status?: GoodsReceiptStatus;
  supplierId?: string;
  purchaseOrderId?: string;
};

export type ListGoodsReceiptsInput = {
  businessId: string;
  outletId: string;
  page: number;
  perPage: number;
  search?: string;
  status?: GoodsReceiptStatus;
  supplierId?: string;
  purchaseOrderId?: string;
};

export type GetGoodsReceiptParams = {
  id: string;
};

export type GetGoodsReceiptQuery = {
  outletId?: string;
};

export type GoodsReceiptItemPayload = {
  purchaseOrderItemId?: string;
  productId: string;
  quantityAccepted: number;
  unitCost: number;
  note?: string;
};

export type CreateGoodsReceiptBody = {
  outletId: string;
  supplierId: string;
  purchaseOrderId?: string;
  receiptDate: Date;
  supplierInvoiceNumber?: string;
  notes?: string;
  items: GoodsReceiptItemPayload[];
};

export type CreateGoodsReceiptInput = {
  businessId: string;
  businessUserId: string;
  outletId: string;
  supplierId: string;
  purchaseOrderId?: string;
  receiptDate: Date;
  supplierInvoiceNumber?: string;
  notes?: string;
  items: GoodsReceiptItemPayload[];
};

export type UpdateGoodsReceiptBody = {
  outletId: string;
  supplierId: string;
  purchaseOrderId?: string;
  receiptDate: Date;
  supplierInvoiceNumber?: string;
  notes?: string;
  items: GoodsReceiptItemPayload[];
};

export type UpdateGoodsReceiptInput = {
  businessId: string;
  goodsReceiptId: string;
  outletId: string;
  supplierId: string;
  purchaseOrderId?: string;
  receiptDate: Date;
  supplierInvoiceNumber?: string;
  notes?: string;
  items: GoodsReceiptItemPayload[];
};

export type GoodsReceiptActionBody = {
  outletId: string;
};

export type GoodsReceiptPostInput = {
  businessId: string;
  goodsReceiptId: string;
  outletId: string;
  postedByBusinessUserId: string;
};

export type GoodsReceiptVoidInput = {
  businessId: string;
  goodsReceiptId: string;
  outletId: string;
};

export type GoodsReceiptSummaryDto = {
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

export type GoodsReceiptItemDto = {
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

export type GoodsReceiptDetailDto = GoodsReceiptSummaryDto & {
  outletName: string;
  createdByBusinessUserId: string;
  postedByBusinessUserId: string | null;
  items: GoodsReceiptItemDto[];
};
