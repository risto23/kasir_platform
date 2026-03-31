// pos_web/src/types/order.ts
export type OrderHistoryStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'IN_PROGRESS'
  | 'READY'
  | 'COMPLETED'
  | 'CANCELLED';

export type OrderPaymentStatus =
  | 'UNPAID'
  | 'PAID'
  | 'PARTIAL'
  | 'CANCELLED'
  | 'REFUNDED';

export type OrderHistoryMeta = {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
};

export type OrderHistoryItem = {
  id: string;
  orderNumber: string;
  businessId: string;
  outletId: string;
  outletName: string | null;
  tableId: string | null;
  tableName: string | null;
  status: OrderHistoryStatus;
  paymentStatus: OrderPaymentStatus;
  itemCount: number;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  serviceChargeAmount: number;
  totalAmount: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;

  orderNo: string;
  total: number;
};

export type OrderHistoryListResponse = {
  items: OrderHistoryItem[];
  meta: OrderHistoryMeta;
};

export type OrderHistoryDetailResponse = OrderHistoryItem;

export type OrderHistoryListParams = {
  outletId: string;
  page?: number;
  perPage?: number;
  search?: string;
};