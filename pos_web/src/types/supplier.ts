export type SupplierStatus = 'ACTIVE' | 'INACTIVE';

export type Supplier = {
  id: string;
  businessId: string;
  code: string;
  name: string;
  status: SupplierStatus;
  phone: string | null;
  email: string | null;
  address: string | null;
  paymentTermDays: number | null;
  taxNumber: string | null;
  notes: string | null;
  leadTimeDays: number | null;
  isPreferred: boolean;
  lastOrderAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SupplierListResponse = {
  items: Supplier[];
  meta: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
};

export type SupplierProductMapping = {
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
