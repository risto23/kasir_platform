export type PurchaseOrderStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'PARTIALLY_RECEIVED'
  | 'RECEIVED'
  | 'CANCELLED';

export type PurchaseOrderItem = {
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

export type PurchaseOrderSummary = {
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

export type PurchaseOrderDetail = PurchaseOrderSummary & {
  outletName: string;
  createdByBusinessUserId: string;
  items: PurchaseOrderItem[];
};
