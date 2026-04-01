import {
  BusinessType,
  OrderItemStatus,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from '@prisma/client';

export type ListOrdersQuery = {
  outletId: string;
  page?: number;
  perPage?: number;
  search?: string;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
};

export type ListOrdersInput = {
  businessId: string;
  outletId: string;
  page: number;
  perPage: number;
  search?: string;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
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
  tableId?: string;
  notes?: string;
  items?: CreateOrderItemInput[];
};

export type CreateOrderBody = {
  outletId: string;
  tableId?: string;
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
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  tableId: string | null;
  tableName: string | null;
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

export type PaymentMethodValue = PaymentMethod;