export type ProductListQuery = {
  search?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  categoryId?: string;
  outletId?: string;
  page: number;
  perPage: number;
};

export type ProductParams = {
  id: string;
};

export type CreateProductBody = {
  categoryId?: string | null;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  brand?: string | null;
  unit?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  basePrice: number;
};

export type UpdateProductBody = {
  categoryId?: string | null;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  brand?: string | null;
  unit?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  basePrice: number;
};

export type UpdateProductStatusBody = {
  status: 'ACTIVE' | 'INACTIVE';
};

export type ProductAppliedPromo = {
  id: string;
  name: string;
  targetType: 'CATEGORY' | 'PRODUCT' | 'PRODUCT_NAME' | 'BRAND' | 'UNIT';
  targetValue: string | null;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: string;
  discountAmount: number;
};

export type ProductListItem = {
  id: string;
  businessId: string;
  categoryId: string | null;
  name: string;
  code: string | null;
  sku: string | null;
  barcode: string | null;
  brand: string | null;
  unit: string | null;
  description: string | null;
  imageUrl: string | null;
  basePrice: number;
  /** Price charged at the requested outlet (priceOverride ?? basePrice). */
  outletPrice: number;
  effectivePrice: number;
  promoPrice: number;
  promoDiscountAmount: number;
  appliedPromo: ProductAppliedPromo | null;
  status: 'ACTIVE' | 'INACTIVE';
  category: {
    id: string;
    businessId: string;
    name: string;
    code: string;
    description: string | null;
    sortOrder: number;
    status: 'ACTIVE' | 'INACTIVE';
    createdAt: Date;
    updatedAt: Date;
  } | null;
};