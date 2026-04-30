import { PaymentMethod, SupplierInvoiceStatus } from '@prisma/client';
import { z } from 'zod';

const cuidSchema = z.string().cuid();

export const listSupplierInvoicesSchema = z.object({
  query: z.object({
    outletId: cuidSchema,
    page: z.coerce.number().int().min(1).optional(),
    perPage: z.coerce.number().int().min(1).max(100).optional(),
    search: z.string().trim().optional(),
    status: z.nativeEnum(SupplierInvoiceStatus).optional(),
    supplierId: cuidSchema.optional(),
  }),
  body: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const getSupplierInvoiceByIdSchema = z.object({
  params: z.object({
    id: cuidSchema,
  }),
  query: z.object({
    outletId: cuidSchema.optional(),
  }),
  body: z.object({}).optional(),
});

export const createSupplierInvoiceSchema = z.object({
  body: z.object({
    outletId: cuidSchema,
    supplierId: cuidSchema,
    goodsReceiptId: cuidSchema.optional(),
    purchaseOrderId: cuidSchema.optional(),
    invoiceNumber: z.string().trim().min(1).max(100),
    invoiceDate: z.coerce.date(),
    dueDate: z.coerce.date().optional(),
    notes: z.string().trim().max(1000).optional(),
    grandTotal: z.coerce.number().positive().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const updateSupplierInvoiceSchema = z.object({
  params: z.object({
    id: cuidSchema,
  }),
  body: z.object({
    outletId: cuidSchema,
    supplierId: cuidSchema,
    goodsReceiptId: cuidSchema.optional(),
    purchaseOrderId: cuidSchema.optional(),
    invoiceNumber: z.string().trim().min(1).max(100),
    invoiceDate: z.coerce.date(),
    dueDate: z.coerce.date().optional(),
    notes: z.string().trim().max(1000).optional(),
    grandTotal: z.coerce.number().positive().optional(),
  }),
  query: z.object({}).optional(),
});

export const supplierInvoiceActionSchema = z.object({
  params: z.object({
    id: cuidSchema,
  }),
  body: z.object({
    outletId: cuidSchema,
  }),
  query: z.object({}).optional(),
});

export const createSupplierPaymentSchema = z.object({
  params: z.object({
    id: cuidSchema,
  }),
  body: z.object({
    outletId: cuidSchema,
    paymentDate: z.coerce.date(),
    method: z.nativeEnum(PaymentMethod),
    amount: z.coerce.number().positive(),
    referenceNumber: z.string().trim().max(100).optional(),
    note: z.string().trim().max(500).optional(),
  }),
  query: z.object({}).optional(),
});
