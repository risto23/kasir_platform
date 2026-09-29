import { PaymentMethod, SupplierCreditStatus } from '@prisma/client';
import { z } from 'zod';

const cuidSchema = z.string().cuid();

export const listSupplierCreditsSchema = z.object({
  query: z.object({
    outletId: cuidSchema,
    supplierId: cuidSchema.optional(),
    status: z.nativeEnum(SupplierCreditStatus).optional(),
    page: z.coerce.number().int().min(1).optional(),
    perPage: z.coerce.number().int().min(1).max(100).optional(),
  }),
  body: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const getSupplierCreditByIdSchema = z.object({
  params: z.object({
    id: cuidSchema,
  }),
  query: z.object({
    outletId: cuidSchema,
  }),
  body: z.object({}).optional(),
});

export const refundSupplierCreditSchema = z.object({
  params: z.object({
    id: cuidSchema,
  }),
  body: z.object({
    outletId: cuidSchema,
    amount: z.coerce.number().positive(),
    method: z.nativeEnum(PaymentMethod),
    refundDate: z.coerce.date(),
    referenceNumber: z.string().trim().max(100).optional(),
    note: z.string().trim().max(500).optional(),
  }),
  query: z.object({}).optional(),
});

export const applySupplierCreditSchema = z.object({
  params: z.object({
    id: cuidSchema,
  }),
  body: z.object({
    outletId: cuidSchema,
    supplierInvoiceId: cuidSchema,
    amount: z.coerce.number().positive(),
    usageDate: z.coerce.date().optional(),
    note: z.string().trim().max(500).optional(),
  }),
  query: z.object({}).optional(),
});
