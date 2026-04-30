import { PurchaseReturnStatus } from '@prisma/client';
import { z } from 'zod';

const cuidSchema = z.string().cuid();

const purchaseReturnItemSchema = z.object({
  goodsReceiptItemId: cuidSchema,
  quantityReturned: z.coerce.number().positive(),
  note: z.string().trim().max(300).optional(),
});

export const listPurchaseReturnsSchema = z.object({
  query: z.object({
    outletId: cuidSchema,
    page: z.coerce.number().int().min(1).optional(),
    perPage: z.coerce.number().int().min(1).max(100).optional(),
    search: z.string().trim().optional(),
    status: z.nativeEnum(PurchaseReturnStatus).optional(),
    supplierId: cuidSchema.optional(),
    goodsReceiptId: cuidSchema.optional(),
  }),
  body: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const getPurchaseReturnByIdSchema = z.object({
  params: z.object({
    id: cuidSchema,
  }),
  query: z.object({
    outletId: cuidSchema.optional(),
  }),
  body: z.object({}).optional(),
});

export const createPurchaseReturnSchema = z.object({
  body: z.object({
    outletId: cuidSchema,
    goodsReceiptId: cuidSchema,
    returnDate: z.coerce.date(),
    reason: z.string().trim().max(300).optional(),
    notes: z.string().trim().max(1000).optional(),
    items: z.array(purchaseReturnItemSchema).min(1),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const updatePurchaseReturnSchema = z.object({
  params: z.object({
    id: cuidSchema,
  }),
  body: z.object({
    outletId: cuidSchema,
    goodsReceiptId: cuidSchema,
    returnDate: z.coerce.date(),
    reason: z.string().trim().max(300).optional(),
    notes: z.string().trim().max(1000).optional(),
    items: z.array(purchaseReturnItemSchema).min(1),
  }),
  query: z.object({}).optional(),
});

export const purchaseReturnActionSchema = z.object({
  params: z.object({
    id: cuidSchema,
  }),
  body: z.object({
    outletId: cuidSchema,
  }),
  query: z.object({}).optional(),
});
