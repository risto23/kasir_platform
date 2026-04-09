import type { InventoryMovementType, ProductStatus, ProductOutletStatus } from '@prisma/client';

export type StockSummaryItem = {
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
  priceOverride: string | null; // Decimal as string
  stockOnHand: string; // Decimal as string
};

export type MovementListItem = {
  id: string;
  businessId: string;
  outletId: string;
  productId: string;
  type: InventoryMovementType;
  quantity: string; // Decimal as string
  note: string | null;
  referenceType: string | null;
  referenceId: string | null;
  createdByBusinessUserId: string | null;
  createdAt: Date;
  productName: string;
  productCode: string;
  sku: string | null;
  barcode: string | null;
};
