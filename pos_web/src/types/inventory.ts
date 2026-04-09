export type InventoryMovementType = 'IN' | 'OUT' | 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT';
export type ProductStatus = 'ACTIVE' | 'INACTIVE';
export type ProductOutletStatus = 'ACTIVE' | 'INACTIVE';

export interface StockSummaryItem {
  productId: string;
  outletId: string;
  businessId: string;
  categoryId: string | null;
  productName: string;
  productCode: string;
  sku: string | null;
  barcode: string | null;
  brand: string | null;
  unit: string | null;
  productStatus: ProductStatus;
  isAvailable: boolean;
  productOutletStatus: ProductOutletStatus | null;
  priceOverride: string | null;
  stockOnHand: string;
}

export interface MovementListItem {
  id: string;
  businessId: string;
  outletId: string;
  productId: string;
  type: InventoryMovementType;
  quantity: string;
  note: string | null;
  referenceType: string | null;
  referenceId: string | null;
  createdByBusinessUserId: string | null;
  createdAt: string | Date;
  productName: string;
  productCode: string;
  sku: string | null;
  barcode: string | null;
}

export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};
