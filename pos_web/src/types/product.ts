export type ProductStatus = 'ACTIVE' | 'INACTIVE';

export type ProductCategorySummary = {
  id: string;
  name: string;
  code: string | null;
};

export type Product = {
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
  status: ProductStatus;
  createdAt?: string;
  updatedAt?: string;
  category?: ProductCategorySummary | null;
};

export type ProductListResponse = {
  items: Product[];
  meta: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
};