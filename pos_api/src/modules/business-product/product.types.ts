// pos_api/src/modules/business-product/product.types.ts
import { ProductStatus } from '@prisma/client';

export type ProductListQuery = {
  search?: string;
  status?: ProductStatus;
  categoryId?: string;
};

export type CreateProductInput = {
  categoryId?: string | null;
  name: string;
  sku?: string | null;
  brand?: string | null;
  unit?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  basePrice: number;
};

export type UpdateProductInput = {
  categoryId?: string | null;
  name: string;
  sku?: string | null;
  brand?: string | null;
  unit?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  basePrice: number;
};

export type UpdateProductStatusInput = {
  status: ProductStatus;
};

export type ProductResponse = {
  id: string;
  businessId: string;
  categoryId: string | null;
  name: string;
  code: string | null;
  sku: string | null;
  brand: string | null;
  unit: string | null;
  description: string | null;
  imageUrl: string | null;
  basePrice: number;
  status: ProductStatus;
  createdAt: Date;
  updatedAt: Date;
  category: {
    id: string;
    name: string;
    code: string | null;
  } | null;
};

export type ProductListItemResponse = ProductResponse;