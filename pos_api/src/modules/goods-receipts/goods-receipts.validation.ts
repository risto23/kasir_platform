import { GoodsReceiptStatus } from '@prisma/client';
import { z } from 'zod';

const cuidSchema = z.string().cuid();

const goodsReceiptItemSchema = z.object({
  purchaseOrderItemId: cuidSchema.optional(),
  productId: cuidSchema,
  quantityAccepted: z.coerce.number().positive(),
  unitCost: z.coerce.number().min(0),
  note: z.string().trim().max(300).optional(),
});

export const listGoodsReceiptsSchema = z.object({
  query: z.object({
    outletId: cuidSchema,
    page: z.coerce.number().int().min(1).optional(),
    perPage: z.coerce.number().int().min(1).max(100).optional(),
    search: z.string().trim().optional(),
    status: z.nativeEnum(GoodsReceiptStatus).optional(),
    supplierId: cuidSchema.optional(),
    purchaseOrderId: cuidSchema.optional(),
  }),
  body: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const getGoodsReceiptByIdSchema = z.object({
  params: z.object({
    id: cuidSchema,
  }),
  query: z.object({
    outletId: cuidSchema.optional(),
  }),
  body: z.object({}).optional(),
});

export const createGoodsReceiptSchema = z.object({
  body: z.object({
    outletId: cuidSchema,
    supplierId: cuidSchema,
    purchaseOrderId: cuidSchema.optional(),
    receiptDate: z.coerce.date(),
    supplierInvoiceNumber: z.string().trim().max(100).optional(),
    notes: z.string().trim().max(1000).optional(),
    items: z.array(goodsReceiptItemSchema).min(1),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const updateGoodsReceiptSchema = z.object({
  params: z.object({
    id: cuidSchema,
  }),
  body: z.object({
    outletId: cuidSchema,
    supplierId: cuidSchema,
    purchaseOrderId: cuidSchema.optional(),
    receiptDate: z.coerce.date(),
    supplierInvoiceNumber: z.string().trim().max(100).optional(),
    notes: z.string().trim().max(1000).optional(),
    items: z.array(goodsReceiptItemSchema).min(1),
  }),
  query: z.object({}).optional(),
});

export const goodsReceiptActionSchema = z.object({
  params: z.object({
    id: cuidSchema,
  }),
  body: z.object({
    outletId: cuidSchema,
  }),
  query: z.object({}).optional(),
});
