import { z } from 'zod';

export const createOpnameBodySchema = z.object({
  body: z.object({
    outletId: z.string().min(1),
    note: z.string().max(500).optional(),
  }),
});

export const opnameIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
});

export const listOpnameQuerySchema = z.object({
  query: z.object({
    outletId: z.string().optional(),
    status: z.enum(['DRAFT', 'FINALIZED', 'CANCELLED']).optional(),
  }),
});

export const updateItemsBodySchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    items: z
      .array(
        z.object({
          productId: z.string().min(1),
          countedStock: z.number().min(0),
          note: z.string().max(500).optional(),
        }),
      )
      .min(1),
  }),
});

export const finalizeBodySchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    note: z.string().max(500).optional(),
  }),
});
