import type {
  PromoDiscountType,
  PromoOutletScope,
  PromoStatus,
  PromoTargetType,
} from '@prisma/client';

export type PromoEffectiveStatus = 'ACTIVE' | 'INACTIVE' | 'SCHEDULED' | 'EXPIRED';

export type PromoListQuery = {
  search?: string;
  targetType?: PromoTargetType;
  effectiveStatus?: PromoEffectiveStatus;
  status?: PromoStatus;
  outletScope?: PromoOutletScope;
};

export type PromoBody = {
  name: string;
  description?: string | null;
  targetType: PromoTargetType;
  categoryId?: string | null;
  productId?: string | null;
  targetTextValue?: string | null;
  discountType: PromoDiscountType;
  discountValue: number;
  minChargeAmount?: number | null;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  status?: PromoStatus;
  outletScope: PromoOutletScope;
  selectedOutletIds: string[];
};

export type PromoStatusBody = {
  status: PromoStatus;
};

export type PromoParams = {
  id: string;
};

export type ListPromoParams = {
  businessId: string;
  search?: string;
  targetType?: PromoTargetType;
  effectiveStatus?: PromoEffectiveStatus;
  status?: PromoStatus;
  outletScope?: PromoOutletScope;
};

export type PromoOutletItem = {
  id: string;
  outletId: string;
  outletName: string;
  outletCode: string;
};

export type PromoMetaOutletItem = {
  id: string;
  name: string;
  code: string;
  status: 'ACTIVE' | 'INACTIVE';
};

export type PromoMappedItem = {
  id: string;
  businessId: string;
  name: string;
  description: string | null;
  targetType: PromoTargetType;
  categoryId: string | null;
  productId: string | null;
  targetTextValue: string | null;
  targetLabel: string | null;
  targetValue: string | null;
  discountType: PromoDiscountType;
  discountValue: string;
  discountPreview: string;
  minChargeAmount: string | null;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  status: PromoStatus;
  effectiveStatus: PromoEffectiveStatus;
  outletScope: PromoOutletScope;
  selectedOutletCount: number;
  selectedOutlets: PromoOutletItem[];
  createdAt: Date;
  updatedAt: Date;
};