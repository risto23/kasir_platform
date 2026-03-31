import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';

export type GetReceiptParams = {
  id: string;
};

export type GetReceiptByOrderParams = {
  orderId: string;
};

export type GetReceiptQuery = {
  outletId?: string;
};

export type ReceiptItemSnapshotDto = {
  id: string;
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
  status: string;
};

export type ReceiptContentSnapshotDto = {
  orderId: string;
  orderNumber: string;
  businessName: string;
  outletName: string;
  outletAddress: string | null;
  tableName: string | null;
  notes: string | null;
  subtotal: string;
  discountAmount: string;
  taxAmount: string;
  serviceChargeAmount: string;
  totalAmount: string;
  items: ReceiptItemSnapshotDto[];
};

export type ReceiptDetailDto = {
  id: string;
  receiptNumber: string;
  businessId: string;
  outletId: string;
  businessName: string;
  outletName: string;
  outletAddress: string | null;
  issuedAt: string;
  printedAt: string | null;
  order: {
    id: string;
    orderNumber: string;
    status: OrderStatus;
    paymentStatus: PaymentStatus;
    subtotal: string;
    discountAmount: string;
    taxAmount: string;
    serviceChargeAmount: string;
    totalAmount: string;
  };
  payment: {
    id: string;
    paymentNumber: string;
    method: PaymentMethod;
    status: PaymentStatus;
    amountPaid: string;
    amountTendered: string;
    changeAmount: string;
    paidAt: string | null;
  } | null;
  contentSnapshot: ReceiptContentSnapshotDto | null;
};