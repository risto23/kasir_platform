export type BusinessType = 'RETAIL' | 'RESTAURANT';

export type PromoTargetType =
  | 'CATEGORY'
  | 'PRODUCT'
  | 'PRODUCT_NAME'
  | 'BRAND'
  | 'UNIT';

export type PromoDiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT';

export type PromoStatus = 'ACTIVE' | 'INACTIVE';

export type PromoEffectiveStatus =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'SCHEDULED'
  | 'EXPIRED';

export type PromoCategoryOption = {
  id: string;
  name: string;
  status: string;
};

export type PromoProductOption = {
  id: string;
  name: string;
  brand: string | null;
  unit: string | null;
  status: string;
};

export type PromoFormMeta = {
  businessType: BusinessType;
  targetTypes: PromoTargetType[];
  discountTypes: PromoDiscountType[];
  statuses: PromoStatus[];
  categories: PromoCategoryOption[];
  products: PromoProductOption[];
};

export type PromoItem = {
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
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  status: PromoStatus;
  effectiveStatus: PromoEffectiveStatus;
  createdAt: string;
  updatedAt: string;
};

export type PromoPayload = {
  name: string;
  description?: string | null;
  targetType: PromoTargetType;
  categoryId?: string | null;
  productId?: string | null;
  targetTextValue?: string | null;
  discountType: PromoDiscountType;
  discountValue: number;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  status?: PromoStatus;
};

export type PromoListFilters = {
  search?: string;
  targetType?: PromoTargetType | '';
  status?: PromoStatus | '';
  effectiveStatus?: PromoEffectiveStatus | '';
};