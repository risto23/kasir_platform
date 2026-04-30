export type SupplierProductParams = {
  supplierId: string;
};

export type SupplierProductMappingParams = {
  supplierId: string;
  mappingId: string;
};

export type ListSupplierProductsQuery = {
  search?: string;
  page?: number;
  perPage?: number;
};

export type ListSupplierProductsInput = {
  businessId: string;
  supplierId: string;
  search?: string;
  page: number;
  perPage: number;
};

export type CreateSupplierProductBody = {
  productId: string;
  supplierSku?: string;
  lastPurchasePrice?: number;
  minimumOrderQty?: number;
  isPrimarySupplier?: boolean;
};

export type UpdateSupplierProductBody = {
  productId: string;
  supplierSku?: string;
  lastPurchasePrice?: number;
  minimumOrderQty?: number;
  isPrimarySupplier?: boolean;
};

export type SupplierProductItemDto = {
  id: string;
  businessId: string;
  supplierId: string;
  productId: string;
  supplierSku: string | null;
  lastPurchasePrice: string | null;
  minimumOrderQty: string | null;
  isPrimarySupplier: boolean;
  createdAt: string;
  updatedAt: string;
  productName: string;
  productCode: string | null;
  productSku: string | null;
  productBarcode: string | null;
  productUnit: string | null;
  productStatus: string;
};
