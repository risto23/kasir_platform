import type {
  SupplierCreditSummary,
  SupplierCreditUsage,
} from '@/types/supplier-credit';

export type SupplierInvoiceStatus =
  | 'UNPAID'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'VOID';

export type SupplierPaymentMethod =
  | 'CASH'
  | 'CARD'
  | 'TRANSFER'
  | 'QRIS'
  | 'OTHER';

export type SupplierPayment = {
  id: string;
  supplierInvoiceId: string;
  paymentNumber: string;
  businessId: string;
  outletId: string;
  supplierId: string;
  method: SupplierPaymentMethod;
  amount: string;
  paymentDate: string;
  referenceNumber: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SupplierInvoiceSummary = {
  id: string;
  businessId: string;
  outletId: string;
  supplierId: string;
  goodsReceiptId: string | null;
  purchaseOrderId: string | null;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string | null;
  notes: string | null;
  status: SupplierInvoiceStatus;
  grandTotal: string;
  paidAmount: string;
  outstandingAmount: string;
  supplierName: string;
  supplierCode: string;
  goodsReceiptNumber: string | null;
  purchaseOrderNumber: string | null;
  paymentCount: number;
  createdAt: string;
  updatedAt: string;
};

export type SupplierInvoiceDetail = SupplierInvoiceSummary & {
  outletName: string;
  createdByBusinessUserId: string;
  payments: SupplierPayment[];
  // Optional so an older API build without supplier credits still renders.
  issuedCredits?: SupplierCreditSummary[];
  appliedCredits?: SupplierCreditUsage[];
};
