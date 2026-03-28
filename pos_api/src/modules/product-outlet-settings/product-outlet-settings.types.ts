import type { ProductOutletStatus } from '@prisma/client';

export type ProductOutletSettingsListQuery = {
  page: number;
  limit: number;
  search?: string;
  productId?: string;
  outletId?: string;
  status?: ProductOutletStatus;
  isAvailable?: boolean;
};

export type ProductOutletSettingsParams = {
  productId: string;
  outletId: string;
};

export type UpdateProductOutletSettingInput = {
  status?: ProductOutletStatus;
  isAvailable?: boolean;
  priceOverride?: number | null;
};

export type ProductOutletSettingListItem = {
  id: string;
  productId: string;
  outletId: string;
  status: ProductOutletStatus;
  isAvailable: boolean;
  priceOverride: number | null;
  createdAt: string;
  updatedAt: string;
  product: {
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
  outlet: {
    id: string;
    name: string;
    code: string;
    status: string;
  };
};

export type ProductOutletSettingsListResponse = {
  items: ProductOutletSettingListItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};