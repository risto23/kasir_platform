export type ReceiptOrderStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'IN_PROGRESS'
  | 'READY'
  | 'COMPLETED'
  | 'CANCELLED';

export type ReceiptPaymentStatus =
  | 'UNPAID'
  | 'PAID'
  | 'PARTIAL'
  | 'CANCELLED'
  | 'REFUNDED';

export type ReceiptPaymentMethod =
  | 'CASH'
  | 'QRIS'
  | 'TRANSFER'
  | 'CARD'
  | 'OTHER';

export type ReceiptItemSnapshot = {
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

export type ReceiptContentSnapshot = {
  orderId: string;
  orderNumber: string;
  businessName: string;
  outletName: string;
  outletAddress: string | null;
  outletPhone?: string | null;
  brandName?: string | null;
  logoUrl?: string | null;
  headerText?: string | null;
  footerText?: string | null;
  showBusinessName?: boolean;
  showOutletName?: boolean;
  showOutletAddress?: boolean;
  showOutletPhone?: boolean;
  tableName: string | null;
  notes: string | null;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  serviceChargeAmount: number;
  totalAmount: number;
  items: ReceiptItemSnapshot[];
};

export type ReceiptDetailResponse = {
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
  contentSnapshot: ReceiptContentSnapshot | null;
  order?: {
    id: string;
    orderNumber: string;
    status: ReceiptOrderStatus;
    paymentStatus: ReceiptPaymentStatus;
    subtotal: number;
    discountAmount: number;
    taxAmount: number;
    serviceChargeAmount: number;
    totalAmount: number;
  };
  payment?: {
    id: string;
    paymentNumber: string;
    method: ReceiptPaymentMethod;
    status: ReceiptPaymentStatus;
    amountPaid: number;
    amountTendered: number;
    changeAmount: number;
    paidAt: string | null;
  } | null;

  receiptNo: string;
  total: number;
};
