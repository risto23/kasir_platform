import { z } from 'zod';

const cuidSchema = z.string().cuid();

export const getReceiptByIdSchema = z.object({
  params: z.object({
    id: cuidSchema,
  }),
  query: z.object({
    outletId: cuidSchema.optional(),
  }),
  body: z.object({}).optional(),
});

export const getReceiptByOrderIdSchema = z.object({
  params: z.object({
    orderId: cuidSchema,
  }),
  query: z.object({
    outletId: cuidSchema.optional(),
  }),
  body: z.object({}).optional(),
});