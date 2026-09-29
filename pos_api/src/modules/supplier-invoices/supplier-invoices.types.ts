import { PaymentMethod, SupplierInvoiceStatus } from '@prisma/client';
import type {
  SupplierCreditSummaryDto,
  SupplierCreditUsageDto,
} from '../supplier-credits/supplier-credits.types';

export type ListSupplierInvoicesQuery = {
  outletId: string;
  page?: number;
  perPage?: number;
  search?: string;
  status?: SupplierInvoiceStatus;
  supplierId?: string;
};

export type ListSupplierInvoicesInput = {
  businessId: string;
  outletId: string;
  page: number;
  perPage: number;
  search?: string;
  status?: SupplierInvoiceStatus;
  supplierId?: string;
};

export type SupplierInvoiceParams = {
  id: string;
};

export type SupplierInvoiceQuery = {
  outletId?: string;
};

export type CreateSupplierInvoiceBody = {
  outletId: string;
  supplierId: string;
  goodsReceiptId?: string;
  purchaseOrderId?: string;
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate?: Date;
  notes?: string;
  grandTotal?: number;
};

export type CreateSupplierInvoiceInput = {
  businessId: string;
  businessUserId: string;
  outletId: string;
  supplierId: string;
  goodsReceiptId?: string;
  purchaseOrderId?: string;
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate?: Date;
  notes?: string;
  grandTotal?: number;
};

export type UpdateSupplierInvoiceBody = {
  outletId: string;
  supplierId: string;
  goodsReceiptId?: string;
  purchaseOrderId?: string;
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate?: Date;
  notes?: string;
  grandTotal?: number;
};

export type UpdateSupplierInvoiceInput = {
  businessId: string;
  supplierInvoiceId: string;
  outletId: string;
  supplierId: string;
  goodsReceiptId?: string;
  purchaseOrderId?: string;
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate?: Date;
  notes?: string;
  grandTotal?: number;
};

export type SupplierInvoiceActionBody = {
  outletId: string;
};

export type VoidSupplierInvoiceInput = {
  businessId: string;
  supplierInvoiceId: string;
  outletId: string;
};

export type CreateSupplierPaymentBody = {
  outletId: string;
  paymentDate: Date;
  method: PaymentMethod;
  amount: number;
  referenceNumber?: string;
  note?: string;
};

export type CreateSupplierPaymentInput = {
  businessId: string;
  businessUserId: string;
  supplierInvoiceId: string;
  outletId: string;
  paymentDate: Date;
  method: PaymentMethod;
  amount: number;
  referenceNumber?: string;
  note?: string;
};

export type SupplierPaymentDto = {
  id: string;
  supplierInvoiceId: string;
  paymentNumber: string;
  businessId: string;
  outletId: string;
  supplierId: string;
  method: PaymentMethod;
  amount: string;
  paymentDate: string;
  referenceNumber: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SupplierInvoiceSummaryDto = {
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

export type SupplierInvoiceDetailDto = SupplierInvoiceSummaryDto & {
  outletName: string;
  createdByBusinessUserId: string;
  payments: SupplierPaymentDto[];
  // Credit issued because this invoice ended up overpaid (after a return).
  issuedCredits: SupplierCreditSummaryDto[];
  // Supplier credit used to pay this invoice (counted in paidAmount).
  appliedCredits: SupplierCreditUsageDto[];
};
