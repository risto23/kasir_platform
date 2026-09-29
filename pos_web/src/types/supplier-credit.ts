import type { SupplierPaymentMethod } from '@/types/supplier-invoice';

export type SupplierCreditStatus = 'OPEN' | 'CLOSED';

export type SupplierCreditSource = 'PURCHASE_RETURN_OVERPAYMENT';

export type SupplierCreditUsageType = 'APPLY_TO_INVOICE' | 'REFUND';

export type SupplierCreditUsage = {
  id: string;
  supplierCreditId: string;
  creditNumber: string;
  usageNumber: string;
  type: SupplierCreditUsageType;
  supplierInvoiceId: string | null;
  supplierInvoiceNumber: string | null;
  method: SupplierPaymentMethod | null;
  amount: string;
  usageDate: string;
  referenceNumber: string | null;
  note: string | null;
  createdAt: string;
};

export type SupplierCreditSummary = {
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

export type SupplierCreditDetail = SupplierCreditSummary & {
  usages: SupplierCreditUsage[];
};

export type SupplierCreditListMeta = {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
  totalOpenRemainingAmount: string;
};
