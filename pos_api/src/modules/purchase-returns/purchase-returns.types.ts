import { PurchaseReturnStatus } from '@prisma/client';

export type ListPurchaseReturnsQuery = {
  outletId: string;
  page?: number;
  perPage?: number;
  search?: string;
  status?: PurchaseReturnStatus;
  supplierId?: string;
  goodsReceiptId?: string;
};

export type ListPurchaseReturnsInput = {
  businessId: string;
  outletId: string;
  page: number;
  perPage: number;
  search?: string;
  status?: PurchaseReturnStatus;
  supplierId?: string;
  goodsReceiptId?: string;
};

export type GetPurchaseReturnParams = {
  id: string;
};

export type GetPurchaseReturnQuery = {
  outletId?: string;
};

export type PurchaseReturnItemPayload = {
  goodsReceiptItemId: string;
  quantityReturned: number;
  note?: string;
};

export type CreatePurchaseReturnBody = {
  outletId: string;
  goodsReceiptId: string;
  returnDate: Date;
  reason?: string;
  notes?: string;
  items: PurchaseReturnItemPayload[];
};

export type CreatePurchaseReturnInput = {
  businessId: string;
  businessUserId: string;
  outletId: string;
  goodsReceiptId: string;
  returnDate: Date;
  reason?: string;
  notes?: string;
  items: PurchaseReturnItemPayload[];
};

export type UpdatePurchaseReturnBody = {
  outletId: string;
  goodsReceiptId: string;
  returnDate: Date;
  reason?: string;
  notes?: string;
  items: PurchaseReturnItemPayload[];
};

export type UpdatePurchaseReturnInput = {
  businessId: string;
  purchaseReturnId: string;
  outletId: string;
  goodsReceiptId: string;
  returnDate: Date;
  reason?: string;
  notes?: string;
  items: PurchaseReturnItemPayload[];
};

export type PurchaseReturnActionBody = {
  outletId: string;
};

export type PostPurchaseReturnInput = {
  businessId: string;
  purchaseReturnId: string;
  outletId: string;
  postedByBusinessUserId: string;
};

export type VoidPurchaseReturnInput = {
  businessId: string;
  purchaseReturnId: string;
  outletId: string;
};

export type PurchaseReturnSummaryDto = {
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

export type PurchaseReturnItemDto = {
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

export type PurchaseReturnDetailDto = PurchaseReturnSummaryDto & {
  outletName: string;
  createdByBusinessUserId: string;
  postedByBusinessUserId: string | null;
  items: PurchaseReturnItemDto[];
};
