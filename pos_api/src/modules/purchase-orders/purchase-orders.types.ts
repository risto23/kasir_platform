import { PurchaseOrderStatus } from '@prisma/client';

export type ListPurchaseOrdersQuery = {
  outletId: string;
  page?: number;
  perPage?: number;
  search?: string;
  status?: PurchaseOrderStatus;
  supplierId?: string;
};

export type ListPurchaseOrdersInput = {
  businessId: string;
  outletId: string;
  page: number;
  perPage: number;
  search?: string;
  status?: PurchaseOrderStatus;
  supplierId?: string;
};

export type GetPurchaseOrderParams = {
  id: string;
};

export type GetPurchaseOrderQuery = {
  outletId?: string;
};

export type PurchaseOrderItemPayload = {
  productId: string;
  quantity: number;
  unitCost: number;
  note?: string;
};

export type CreatePurchaseOrderBody = {
  outletId: string;
  supplierId: string;
  orderDate: Date;
  expectedDate?: Date;
  notes?: string;
  items: PurchaseOrderItemPayload[];
};

export type CreatePurchaseOrderInput = {
  businessId: string;
  businessUserId: string;
  outletId: string;
  supplierId: string;
  orderDate: Date;
  expectedDate?: Date;
  notes?: string;
  items: PurchaseOrderItemPayload[];
};

export type UpdatePurchaseOrderBody = {
  outletId: string;
  supplierId: string;
  orderDate: Date;
  expectedDate?: Date;
  notes?: string;
  items: PurchaseOrderItemPayload[];
};

export type UpdatePurchaseOrderInput = {
  businessId: string;
  purchaseOrderId: string;
  outletId: string;
  supplierId: string;
  orderDate: Date;
  expectedDate?: Date;
  notes?: string;
  items: PurchaseOrderItemPayload[];
};

export type UpdatePurchaseOrderStatusBody = {
  outletId: string;
  status: PurchaseOrderStatus;
};

export type UpdatePurchaseOrderStatusInput = {
  businessId: string;
  purchaseOrderId: string;
  outletId: string;
  status: PurchaseOrderStatus;
};

export type PurchaseOrderSummaryDto = {
  id: string;
  businessId: string;
  outletId: string;
  supplierId: string;
  supplierName: string;
  supplierCode: string;
  poNumber: string;
  orderDate: string;
  expectedDate: string | null;
  notes: string | null;
  status: PurchaseOrderStatus;
  subtotal: string;
  totalAmount: string;
  submittedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  itemCount: number;
};

export type PurchaseOrderItemDto = {
  id: string;
  productId: string;
  productName: string;
  productCode: string | null;
  productSku: string | null;
  productBarcode: string | null;
  unit: string | null;
  quantityOrdered: string;
  quantityReceived: string;
  unitCost: string;
  lineSubtotal: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PurchaseOrderDetailDto = PurchaseOrderSummaryDto & {
  outletName: string;
  createdByBusinessUserId: string;
  items: PurchaseOrderItemDto[];
};
