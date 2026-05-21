export type PaymentHistoryStatus =
  | 'UNPAID'
  | 'PAID'
  | 'PARTIAL'
  | 'CANCELLED'
  | 'REFUNDED';

export type PaymentHistoryMethod =
  | 'CASH'
  | 'QRIS'
  | 'TRANSFER'
  | 'CARD'
  | 'OTHER';

export type PaymentHistoryMeta = {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
};

export type PaymentHistoryReceiptLink = {
  id: string;
  receiptNumber: string;
};

export type PaymentHistoryItem = {
  id: string;
  paymentNumber: string;
  orderId: string;
  businessId: string;
  outletId: string;
  method: PaymentHistoryMethod;
  status: PaymentHistoryStatus;
  amountPaid: number;
  amountTendered: number;
  changeAmount: number;
  note: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
  receipt: PaymentHistoryReceiptLink | null;
  receiptId: string | null;
  receiptNumber: string | null;

  amount: number;
};

export type PaymentHistoryListResponse = {
  items: PaymentHistoryItem[];
  meta: PaymentHistoryMeta;
};

export type PaymentHistoryDetailResponse = PaymentHistoryItem;

export type PaymentHistoryListParams = {
  outletId: string;
  page?: number;
  perPage?: number;
  orderId?: string;
  status?: PaymentHistoryStatus;
};