export type PosBusinessType = 'RETAIL' | 'RESTAURANT';

export type PosOrderStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'IN_PROGRESS'
  | 'READY'
  | 'COMPLETED'
  | 'CANCELLED';

export type PosPaymentStatus =
  | 'UNPAID'
  | 'PAID'
  | 'PARTIAL'
  | 'CANCELLED'
  | 'REFUNDED';

export type PosPaymentMethod =
  | 'CASH'
  | 'QRIS'
  | 'TRANSFER'
  | 'CARD'
  | 'OTHER';

export type PosOrderQueue =
  | 'CASHIER_ACTIVE'
  | 'CASHIER_UNPAID'
  | 'GUEST_WAITING_PAYMENT';

export type PosOrderSource = 'ALL' | 'GUEST' | 'STAFF';

export type PosProductStatus = 'ACTIVE' | 'INACTIVE';

export type PosChargeType = 'PERCENTAGE' | 'FIXED_AMOUNT';

export type PosPromoTargetType =
  | 'CATEGORY'
  | 'PRODUCT'
  | 'PRODUCT_NAME'
  | 'BRAND'
  | 'UNIT';

export type PosPromoDiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT';

export type PosAppliedPromo = {
  id: string;
  name: string;
  targetType: PosPromoTargetType;
  targetValue: string;
  discountType: PosPromoDiscountType;
  discountValue: string;
  discountAmount: number;
};

export type PosProductItem = {
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
  effectivePrice: number;
  promoPrice: number;
  promoDiscountAmount: number;
  appliedPromo: PosAppliedPromo | null;
  status: PosProductStatus;
  category?: {
    id: string;
    name: string;
    code?: string | null;
  } | null;
};

export type PosProductListResponse = {
  items: PosProductItem[];
  meta?: PosListMeta;
};

export type PosOutletItem = {
  id: string;
  businessId: string;
  name: string;
  code: string;
  address: string | null;
  phone: string | null;
  status: 'ACTIVE' | 'INACTIVE';
};

export type PosOutletListResponse = {
  items: PosOutletItem[];
  meta?: PosListMeta;
};

export type PosTableItem = {
  id: string;
  outletId: string;
  code: string;
  name: string;
  capacity: number | null;
  status: 'ACTIVE' | 'INACTIVE';
};

export type PosTableListResponse = {
  items: PosTableItem[];
  meta?: PosListMeta;
};

export type PosCartItem = {
  lineId: string;
  productId: string;
  productName: string;
  productCode: string | null;
  unit: string | null;
  note: string;
  qty: number;
  price: number;
  subtotal: number;
  imageUrl: string | null;
};

export type PosChargeItem = {
  key: string;
  label: string;
  type: PosChargeType;
  value: number;
  amount: number;
};

export type PosSettingsChargeRule = {
  key: string;
  label: string;
  type: PosChargeType;
  value: number;
  enabled: boolean;
};

export type PosSettingsChargesResponse = {
  charges: PosSettingsChargeRule[];
};

export type PosListMeta = {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
};

export type PosOrderItemResponse = {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  productCode: string | null;
  productSku: string | null;
  productBarcode: string | null;
  quantity: number;
  unitPrice: number;
  lineSubtotal: number;
  lineDiscountAmount: number;
  lineTotal: number;
  note: string | null;
  status: string;

  qty: number;
  price: number;
  subtotal: number;
};

export type PosOrderResponse = {
  id: string;
  businessId: string;
  outletId: string;
  outletName?: string | null;
  businessType?: PosBusinessType;
  tableId: string | null;
  tableName: string | null;
  orderNumber: string;
  status: PosOrderStatus;
  paymentStatus: PosPaymentStatus;
  notes: string | null;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  serviceChargeAmount: number;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  itemCount: number;
  items?: PosOrderItemResponse[];
  isGuestOrder: boolean;
  orderSource: 'GUEST' | 'STAFF';

  orderNo: string;
  note: string | null;
  total: number;
};

export type PosPaymentReceiptLink = {
  id: string;
  receiptNumber: string;
};

export type PosPaymentResponse = {
  id: string;
  paymentNumber: string;
  orderId: string;
  businessId: string;
  outletId: string;
  method: PosPaymentMethod;
  status: PosPaymentStatus;
  amountPaid: number;
  amountTendered: number;
  changeAmount: number;
  note: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt?: string;
  receipt?: PosPaymentReceiptLink | null;
  receiptId?: string | null;
  receiptNumber?: string | null;

  amount: number;
};

export type PosReceiptItemSnapshot = {
  id: string;
  productName: string;
  productCode: string | null;
  productSku: string | null;
  productBarcode: string | null;
  quantity: number;
  unitPrice: number;
  lineSubtotal: number;
  lineDiscountAmount: number;
  lineTotal: number;
  note: string | null;
  status: string;

  qty: number;
  price: number;
  subtotal: number;
};

export type PosReceiptContentSnapshot = {
  orderId: string;
  orderNumber: string;
  businessName: string;
  outletName: string;
  outletAddress: string | null;
  tableName: string | null;
  notes: string | null;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  serviceChargeAmount: number;
  totalAmount: number;
  items: PosReceiptItemSnapshot[];
};

export type PosReceiptResponse = {
  id: string;
  receiptNumber: string;
  paymentId: string | null;
  orderId: string;
  businessId: string;
  outletId: string;
  businessName: string | null;
  outletName: string | null;
  outletAddress: string | null;
  issuedAt: string;
  printedAt: string | null;
  createdAt: string;
  contentSnapshot: PosReceiptContentSnapshot | null;
  order?: {
    id: string;
    orderNumber: string;
    status: PosOrderStatus;
    paymentStatus: PosPaymentStatus;
    subtotal: number;
    discountAmount: number;
    taxAmount: number;
    serviceChargeAmount: number;
    totalAmount: number;
  };
  payment?: {
    id: string;
    paymentNumber: string;
    method: PosPaymentMethod;
    status: PosPaymentStatus;
    amountPaid: number;
    amountTendered: number;
    changeAmount: number;
    paidAt: string | null;
  } | null;

  receiptNo: string;
  total: number;
};

export type PosHistoryItem = {
  id: string;
  orderNumber: string;
  orderNo: string;
  outletId: string;
  outletName: string;
  tableName: string | null;
  status: PosOrderStatus;
  paymentStatus: PosPaymentStatus;
  subtotal: number;
  totalAmount: number;
  total: number;
  itemCount: number;
  createdAt: string;
  isGuestOrder: boolean;
  orderSource: 'GUEST' | 'STAFF';
};

export type PosHistoryResponse = {
  items: PosHistoryItem[];
  meta?: PosListMeta;
};

export type PosCreateOrderItemPayload = {
  productId: string;
  quantity: number;
  note?: string;
};

export type PosCreateOrderPayload = {
  outletId: string;
  tableId?: string;
  notes?: string;
  items?: PosCreateOrderItemPayload[];
};

export type PosAddOrderItemPayload = {
  outletId: string;
  productId: string;
  quantity: number;
  note?: string;

  qty?: number;
};

export type PosUpdateOrderItemPayload = {
  outletId: string;
  quantity: number;
  note?: string;

  qty?: number;
};

export type PosCreatePaymentPayload = {
  orderId: string;
  outletId: string;
  method: PosPaymentMethod;
  amountPaid: number;
  amountTendered?: number;
  note?: string;

  amount?: number;
};

export type PosReceiptPayload = {
  orderId: string;
  paymentId?: string;
  outletId: string;
};
