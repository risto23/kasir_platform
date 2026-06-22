import {
  BusinessType,
  OrderItemStatus,
  OrderStatus,
  OrderType,
  PaymentStatus,
} from '@prisma/client';

export type OrderListQueue =
  | 'CASHIER_ACTIVE'
  | 'CASHIER_UNPAID'
  | 'GUEST_WAITING_PAYMENT'
  | 'DINE_IN_OPEN';

export type OrderSourceFilter = 'ALL' | 'GUEST' | 'STAFF';

export type ListOrdersQuery = {
  outletId: string;
  page?: number;
  perPage?: number;
  search?: string;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  queue?: OrderListQueue;
  source?: OrderSourceFilter;
  dateFrom?: string;
  dateTo?: string;
};

export type ListOrdersInput = {
  businessId: string;
  outletId: string;
  page: number;
  perPage: number;
  search?: string;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  queue?: OrderListQueue;
  source?: OrderSourceFilter;
  dateFrom?: string;
  dateTo?: string;
};

export type GetOrderParams = {
  id: string;
};

export type GetOrderQuery = {
  outletId?: string;
};

export type CreateOrderItemInput = {
  productId: string;
  quantity: number;
  note?: string;
};

export type CreateOrderInput = {
  businessId: string;
  outletId: string;
  businessUserId: string;
  orderType?: OrderType;
  tableId?: string;
  customerName?: string;
  notes?: string;
  items?: CreateOrderItemInput[];
};

export type CreateOrderBody = {
  outletId: string;
  orderType?: OrderType;
  tableId?: string;
  customerName?: string;
  notes?: string;
  items?: CreateOrderItemInput[];
};

export type AddOrderItemInput = {
  businessId: string;
  outletId: string;
  orderId: string;
  productId: string;
  quantity: number;
  note?: string;
};

export type AddOrderItemBody = {
  outletId: string;
  productId: string;
  quantity: number;
  note?: string;
};

export type UpdateOrderItemParams = {
  id: string;
  itemId: string;
};

export type UpdateOrderItemInput = {
  businessId: string;
  outletId: string;
  orderId: string;
  itemId: string;
  quantity: number;
  note?: string;
};

export type UpdateOrderItemBody = {
  outletId: string;
  quantity: number;
  note?: string;
};

export type UpdateOrderStatusInput = {
  businessId: string;
  outletId: string;
  orderId: string;
  status: OrderStatus;
};

export type UpdateOrderStatusBody = {
  outletId: string;
  status: OrderStatus;
};

export type OrderSummaryDto = {
  id: string;
  orderNumber: string;
  businessId: string;
  outletId: string;
  orderType: OrderType;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  tableId: string | null;
  tableName: string | null;
  customerName: string | null;
  notes: string | null;
  subtotal: string;
  discountAmount: string;
  taxAmount: string;
  serviceChargeAmount: string;
  totalAmount: string;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  itemCount: number;
  isGuestOrder: boolean;
  orderSource: 'GUEST' | 'STAFF';
};

export type OrderItemDto = {
  id: string;
  productId: string;
  productName: string;
  productCode: string | null;
  productSku: string | null;
  productBarcode: string | null;
  quantity: string;
  unitPrice: string;
  lineSubtotal: string;
  lineDiscountAmount: string;
  lineTotal: string;
  note: string | null;
  status: OrderItemStatus;
  createdAt: string;
  updatedAt: string;
};

export type OrderDetailDto = OrderSummaryDto & {
  businessType: BusinessType;
  outletName: string;
  items: OrderItemDto[];
};

export type PaymentMethodValue = string;
