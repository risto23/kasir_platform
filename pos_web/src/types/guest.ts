export type GuestMenuPromo = {
  id: string;
  name: string;
  targetType: string;
  discountType: string;
  discountValue: number;
} | null;

export type GuestMenuItem = {
  id: string;
  categoryId: string | null;
  categoryName: string | null;
  name: string;
  code: string;
  sku: string | null;
  barcode: string | null;
  brand: string | null;
  unit: string | null;
  description: string | null;
  imageUrl: string | null;
  basePrice: number;
  outletPrice: number;
  discountAmount: number;
  finalPrice: number;
  promo: GuestMenuPromo;
};

export type GuestMenuCategoryGroup = {
  categoryId: string | null;
  categoryName: string | null;
  items: GuestMenuItem[];
};

export type GuestMenuResponse = {
  outlet: {
    id: string;
    name: string;
    code: string;
    address: string | null;
    phone: string | null;
  };
  table: {
    id: string;
    code: string;
    name: string;
    capacity: number | null;
  };
  categories: GuestMenuCategoryGroup[];
  // Optional: older API builds do not send these; treat as no charges.
  charges?: GuestMenuChargeRule[];
  rounding?: GuestMenuRoundingSetting;
};

export type GuestMenuChargeRule = {
  key: string;
  label: string;
  type: 'PERCENTAGE' | 'FIXED_AMOUNT';
  value: number;
};

export type GuestMenuRoundingSetting = {
  enabled: boolean;
  method: 'NONE' | 'NEAREST' | 'CEIL' | 'FLOOR';
  unit: number;
};

export type GuestChargeSummary = {
  subtotal: number;
  taxAmount: number;
  serviceChargeAmount: number;
  otherChargeAmount: number;
  roundingAmount: number;
  grandTotal: number;
};

export type GetGuestMenuApiResponse = {
  success: boolean;
  message: string;
  data: GuestMenuResponse;
};

export type GuestCartItem = {
  productId: string;
  productName: string;
  productCode: string;
  quantity: number;
  unitPrice: number;
  note: string | null;
  imageUrl: string | null;
};

export type GuestCartStorage = {
  outletId: string;
  tableId: string;
  token: string;
  items: GuestCartItem[];
};

export type CreateGuestOrderItemPayload = {
  productId: string;
  quantity: number;
  note?: string | null;
};

export type CreateGuestOrderPayload = {
  tableId: string;
  token: string;
  guestName?: string | null;
  notes?: string | null;
  items: CreateGuestOrderItemPayload[];
};

export type CreatedGuestOrderItem = {
  id: string;
  productId: string;
  productName: string;
  productCode: string | null;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  lineSubtotal: number;
  lineTotal: number;
  note: string | null;
  status: string;
};

export type CreatedGuestOrderResponse = {
  id: string;
  businessId: string;
  outletId: string;
  tableId: string | null;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  guestName: string | null;
  notes: string | null;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  serviceChargeAmount: number;
  totalAmount: number;
  submittedAt: string | null;
  createdAt: string;
  items: CreatedGuestOrderItem[];
};

export type CreateGuestOrderApiResponse = {
  success: boolean;
  message: string;
  data: CreatedGuestOrderResponse;
};