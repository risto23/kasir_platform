import { z } from 'zod';

export const stockSummaryQuerySchema = z.object({
  query: z.object({
    outletId: z.string().min(1),
    search: z.string().optional(),
    categoryId: z.string().optional(),
    productStatus: z.enum(['ACTIVE', 'INACTIVE']).optional(),
    available: z
      .union([z.literal('true'), z.literal('false')])
      .optional(),
  }),
});

export const movementListQuerySchema = z.object({
  query: z.object({
    outletId: z.string().min(1),
    productId: z.string().optional(),
    type: z
      .enum(['IN', 'OUT', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT'])
      .optional(),
    search: z.string().optional(),
  }),
});

export const stockChangeBodySchema = z.object({
  body: z.object({
    outletId: z.string().min(1),
    productId: z.string().min(1),
    quantity: z.number().positive(),
    note: z.string().max(500).optional(),
    referenceType: z.string().max(100).optional(),
    referenceId: z.string().max(100).optional(),
  }),
});

export const stockAdjustmentBodySchema = z.object({
  body: z.object({
    outletId: z.string().min(1),
    productId: z.string().min(1),
    type: z.enum(['ADJUSTMENT_IN', 'ADJUSTMENT_OUT']),
    quantity: z.number().positive(),
    note: z.string().max(500).optional(),
    referenceType: z.string().max(100).optional(),
    referenceId: z.string().max(100).optional(),
  }),
});
