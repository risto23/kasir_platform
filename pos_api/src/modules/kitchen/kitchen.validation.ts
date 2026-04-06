// pos_api/src/modules/kitchen/kitchen.validation.ts
import { z } from 'zod';

export const kitchenQueueSchema = z.enum(['WAITING', 'PROCESSING', 'READY']);

export const listKitchenOrdersSchema = z.object({
  params: z.object({
    outletId: z.string().trim().min(1, 'outletId wajib diisi'),
  }),
  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    perPage: z.coerce.number().int().min(1).max(100).optional().default(20),
    queue: kitchenQueueSchema.optional(),
  }),
  body: z.object({}).optional(),
});

export const updateKitchenOrderItemStatusSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1, 'id order wajib diisi'),
    itemId: z.string().trim().min(1, 'itemId wajib diisi'),
  }),
  body: z.object({
    status: z.enum(['PROCESSING', 'DONE', 'SERVED', 'CANCELLED']),
  }),
  query: z.object({}).optional(),
});

export type ListKitchenOrdersInput = z.infer<typeof listKitchenOrdersSchema>;
export type UpdateKitchenOrderItemStatusInput = z.infer<
  typeof updateKitchenOrderItemStatusSchema
>;
