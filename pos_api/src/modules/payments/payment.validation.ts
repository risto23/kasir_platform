import { PaymentMethod } from '@prisma/client';
import { z } from 'zod';

const cuidSchema = z.string().cuid();

export const createPaymentSchema = z.object({
  body: z.object({
    orderId: cuidSchema,
    outletId: cuidSchema,
    method: z.nativeEnum(PaymentMethod),
    amountPaid: z.coerce.number().positive(),
    amountTendered: z.coerce.number().positive().optional(),
    note: z.string().trim().max(500).optional(),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const listPaymentsSchema = z.object({
  query: z.object({
    outletId: cuidSchema,
    page: z.coerce.number().int().min(1).optional(),
    perPage: z.coerce.number().int().min(1).max(100).optional(),
    orderId: cuidSchema.optional(),
  }),
  body: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const getPaymentByIdSchema = z.object({
  params: z.object({
    id: cuidSchema,
  }),
  query: z.object({
    outletId: cuidSchema.optional(),
  }),
  body: z.object({}).optional(),
});