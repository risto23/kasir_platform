import type {
  OrderItemStatus,
  OrderStatus,
  PaymentStatus,
  PromoDiscountType,
  PromoTargetType,
} from '@prisma/client';

export type GuestMenuQuery = {
  tableId?: string;
  token?: string;
};

export type GuestOrderItemInput = {
  productId: string;
  quantity: number;
  note?: string | null;
};

export type CreateGuestOrderInput = {
  tableId: string;
  token: string;
  guestName?: string | null;
  notes?: string | null;
  items: GuestOrderItemInput[];
};

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
  promo: {
    id: string;
    name: string;
    targetType: PromoTargetType;
    discountType: PromoDiscountType;
    discountValue: number;
  } | null;
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
  // Outlet tax/service/rounding so the guest page previews the same total
  // that createGuestOrder will bill.
  charges: GuestMenuChargeRule[];
  rounding: GuestMenuRoundingSetting;
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
  status: OrderItemStatus;
};

export type CreatedGuestOrderResponse = {
  id: string;
  businessId: string;
  outletId: string;
  tableId: string | null;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
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