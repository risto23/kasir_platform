import { PaymentStatus } from '@prisma/client';

export type CreatePaymentBody = {
  orderId: string;
  outletId: string;
  method: string;
  amountPaid: number;
  amountTendered?: number;
  note?: string;
};

export type ListPaymentsQuery = {
  businessId: string;
  outletId: string;
  page: number;
  perPage: number;
  orderId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type GetPaymentParams = {
  id: string;
};

export type GetPaymentQuery = {
  outletId: string;
};

export type CreatePaymentInput = {
  businessId: string;
  outletId: string;
  businessUserId: string;
  orderId: string;
  method: string;
  amountPaid: number;
  amountTendered?: number;
  note?: string;
};

export type PaymentSummaryDto = {
  id: string;
  paymentNumber: string;
  orderId: string;
  businessId: string;
  outletId: string;
  method: string;
  status: PaymentStatus;
  amountPaid: string;
  amountTendered: string;
  changeAmount: string;
  surchargeAmount: string;
  note: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PaymentDetailDto = PaymentSummaryDto & {
  receipt: {
    id: string;
    receiptNumber: string;
  } | null;
};

export type PaymentCreateResultDto = {
  id: string;
  paymentNumber: string;
  orderId: string;
  businessId: string;
  outletId: string;
  method: string;
  status: PaymentStatus;
  amountPaid: string;
  amountTendered: string;
  changeAmount: string;
  surchargeAmount: string;
  note: string | null;
  paidAt: string | null;
  receiptId: string;
  receiptNumber: string;
};
