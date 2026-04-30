import { z } from 'zod';

const cuidSchema = z.string().cuid();

export const listPurchasePriceHistorySchema = z.object({
  query: z.object({
    outletId: cuidSchema,
    page: z.coerce.number().int().min(1).optional(),
    perPage: z.coerce.number().int().min(1).max(100).optional(),
    search: z.string().trim().optional(),
    supplierId: cuidSchema.optional(),
    productId: cuidSchema.optional(),
    dateFrom: z.coerce.date().optional(),
    dateTo: z.coerce.date().optional(),
  }),
  body: z.object({}).optional(),
  params: z.object({}).optional(),
});
