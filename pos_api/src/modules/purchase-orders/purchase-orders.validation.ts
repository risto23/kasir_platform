import { PurchaseOrderStatus } from '@prisma/client';
import { z } from 'zod';

const cuidSchema = z.string().cuid();

const purchaseOrderItemSchema = z.object({
  productId: cuidSchema,
  quantity: z.coerce.number().positive(),
  unitCost: z.coerce.number().min(0),
  note: z.string().trim().max(300).optional(),
});

export const listPurchaseOrdersSchema = z.object({
  query: z.object({
    outletId: cuidSchema,
    page: z.coerce.number().int().min(1).optional(),
    perPage: z.coerce.number().int().min(1).max(100).optional(),
    search: z.string().trim().optional(),
    status: z.nativeEnum(PurchaseOrderStatus).optional(),
    supplierId: cuidSchema.optional(),
  }),
  body: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const getPurchaseOrderByIdSchema = z.object({
  params: z.object({
    id: cuidSchema,
  }),
  query: z.object({
    outletId: cuidSchema.optional(),
  }),
  body: z.object({}).optional(),
});

export const createPurchaseOrderSchema = z.object({
  body: z.object({
    outletId: cuidSchema,
    supplierId: cuidSchema,
    orderDate: z.coerce.date(),
    expectedDate: z.coerce.date().optional(),
    notes: z.string().trim().max(1000).optional(),
    items: z.array(purchaseOrderItemSchema).min(1),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const updatePurchaseOrderSchema = z.object({
  params: z.object({
    id: cuidSchema,
  }),
  body: z.object({
    outletId: cuidSchema,
    supplierId: cuidSchema,
    orderDate: z.coerce.date(),
    expectedDate: z.coerce.date().optional(),
    notes: z.string().trim().max(1000).optional(),
    items: z.array(purchaseOrderItemSchema).min(1),
  }),
  query: z.object({}).optional(),
});

export const updatePurchaseOrderStatusSchema = z.object({
  params: z.object({
    id: cuidSchema,
  }),
  body: z.object({
    outletId: cuidSchema,
    status: z.enum([
      PurchaseOrderStatus.SUBMITTED,
      PurchaseOrderStatus.CANCELLED,
    ]),
  }),
  query: z.object({}).optional(),
});
