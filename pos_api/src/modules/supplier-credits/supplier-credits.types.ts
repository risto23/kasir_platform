import {
  PaymentMethod,
  SupplierCreditSource,
  SupplierCreditStatus,
  SupplierCreditUsageType,
} from '@prisma/client';

export type ListSupplierCreditsQuery = {
  outletId: string;
  supplierId?: string;
  status?: SupplierCreditStatus;
  page?: number;
  perPage?: number;
};

export type ListSupplierCreditsInput = {
  businessId: string;
  outletId: string;
  supplierId?: string;
  status?: SupplierCreditStatus;
  page: number;
  perPage: number;
};

export type SupplierCreditParams = {
  id: string;
};

export type SupplierCreditQuery = {
  outletId: string;
};

export type RefundSupplierCreditBody = {
  outletId: string;
  amount: number;
  method: PaymentMethod;
  refundDate: Date;
  referenceNumber?: string;
  note?: string;
};

export type RefundSupplierCreditInput = {
  businessId: string;
  businessUserId: string;
  supplierCreditId: string;
  outletId: string;
  amount: number;
  method: PaymentMethod;
  refundDate: Date;
  referenceNumber?: string;
  note?: string;
};

export type ApplySupplierCreditBody = {
  outletId: string;
  supplierInvoiceId: string;
  amount: number;
  usageDate?: Date;
  note?: string;
};

export type ApplySupplierCreditInput = {
  businessId: string;
  businessUserId: string;
  supplierCreditId: string;
  outletId: string;
  supplierInvoiceId: string;
  amount: number;
  usageDate?: Date;
  note?: string;
};

export type SupplierCreditUsageDto = {
  id: string;
  supplierCreditId: string;
  creditNumber: string;
  usageNumber: string;
  type: SupplierCreditUsageType;
  supplierInvoiceId: string | null;
  supplierInvoiceNumber: string | null;
  method: PaymentMethod | null;
  amount: string;
  usageDate: string;
  referenceNumber: string | null;
  note: string | null;
  createdAt: string;
};

export type SupplierCreditSummaryDto = {
  id: string;
  businessId: string;
  outletId: string;
  supplierId: string;
  supplierName: string;
  supplierCode: string;
  creditNumber: string;
  sourceType: SupplierCreditSource;
  status: SupplierCreditStatus;
  sourceSupplierInvoiceId: string | null;
  sourceSupplierInvoiceNumber: string | null;
  purchaseReturnId: string | null;
  purchaseReturnNumber: string | null;
  amount: string;
  usedAmount: string;
  remainingAmount: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SupplierCreditDetailDto = SupplierCreditSummaryDto & {
  usages: SupplierCreditUsageDto[];
};

export type IssueSupplierCreditForOverpaymentParams = {
  businessId: string;
  outletId: string;
  supplierId: string;
  sourceSupplierInvoiceId: string;
  purchaseReturnId: string | null;
  createdByBusinessUserId: string;
  amount: string;
  notes: string | null;
};
