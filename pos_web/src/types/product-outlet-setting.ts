export type ProductOutletSettingStatus = 'ACTIVE' | 'INACTIVE';

export type ProductOutletSettingItem = {
  id: string;
  productId: string;
  outletId: string;
  status: ProductOutletSettingStatus;
  isAvailable: boolean;
  priceOverride: number | null;
  createdAt?: string;
  updatedAt?: string;
  product?: {
    id: string;
    name: string;
    code: string | null;
    sku: string | null;
    basePrice: number;
    status: string;
    category: {
      id: string;
      name: string;
      code: string | null;
    } | null;
  };
  outlet?: {
    id: string;
    name: string;
    code: string;
    status: string;
  };
};

export type ProductOutletSettingListResponse = {
  items: ProductOutletSettingItem[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};