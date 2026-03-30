export type ProductListQuery = {
  search?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  categoryId?: string;
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