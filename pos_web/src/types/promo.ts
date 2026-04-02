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

export type PromoOutletScope = 'ALL_OUTLETS' | 'SELECTED_OUTLETS';

export type PromoMetaCategory = {
  id: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
};

export type PromoMetaProduct = {
  id: string;
  name: string;
  brand: string | null;
  unit: string | null;
  status: 'ACTIVE' | 'INACTIVE';
};

export type PromoMetaOutlet = {
  id: string;
  name: string;
  code: string;
  status: 'ACTIVE' | 'INACTIVE';
};

export type PromoFormMeta = {
  businessType: 'RESTAURANT' | 'RETAIL';
  targetTypes: PromoTargetType[];
  discountTypes: PromoDiscountType[];
  statuses: PromoStatus[];
  outletScopes: PromoOutletScope[];
  categories: PromoMetaCategory[];
  products: PromoMetaProduct[];
  outlets: PromoMetaOutlet[];
};

export type PromoSelectedOutletItem = {
  id: string;
  outletId: string;
  outletName: string;
  outletCode: string;
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
  outletScope: PromoOutletScope;
  selectedOutletCount: number;
  selectedOutlets: PromoSelectedOutletItem[];
  createdAt: string;
  updatedAt: string;
};

export type PromoPayload = {
  name: string;
  description: string | null;
  targetType: PromoTargetType;
  categoryId: string | null;
  productId: string | null;
  targetTextValue: string | null;
  discountType: PromoDiscountType;
  discountValue: number;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  status: PromoStatus;
  outletScope: PromoOutletScope;
  selectedOutletIds: string[];
};

export type PromoListParams = {
  search?: string;
  targetType?: PromoTargetType | '';
  status?: PromoStatus | '';
  effectiveStatus?: PromoEffectiveStatus | '';
  outletScope?: PromoOutletScope | '';
};