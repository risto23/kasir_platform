import { OrderStatus, PaymentStatus } from '@prisma/client';
import { z } from 'zod';

const cuidSchema = z.string().cuid();

export const listOrdersSchema = z.object({
  query: z.object({
    outletId: cuidSchema,
    page: z.coerce.number().int().min(1).optional(),
    perPage: z.coerce.number().int().min(1).max(100).optional(),
    search: z.string().trim().optional(),
    status: z.nativeEnum(OrderStatus).optional(),
    paymentStatus: z.nativeEnum(PaymentStatus).optional(),
  }),
  body: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const getOrderByIdSchema = z.object({
  params: z.object({
    id: cuidSchema,
  }),
  query: z.object({
    outletId: cuidSchema.optional(),
  }),
  body: z.object({}).optional(),
});

export const createOrderSchema = z.object({
  body: z.object({
    outletId: cuidSchema,
    tableId: cuidSchema.optional(),
    notes: z.string().trim().max(500).optional(),
    items: z
      .array(
        z.object({
          productId: cuidSchema,
          quantity: z.coerce.number().positive(),
          note: z.string().trim().max(300).optional(),
        }),
      )
      .optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const addOrderItemSchema = z.object({
  params: z.object({
    id: cuidSchema,
  }),
  body: z.object({
    outletId: cuidSchema,
    productId: cuidSchema,
    quantity: z.coerce.number().positive(),
    note: z.string().trim().max(300).optional(),
  }),
  query: z.object({}).optional(),
});

export const updateOrderItemSchema = z.object({
  params: z.object({
    id: cuidSchema,
    itemId: cuidSchema,
  }),
  body: z.object({
    outletId: cuidSchema,
    quantity: z.coerce.number().positive(),
    note: z.string().trim().max(300).optional(),
  }),
  query: z.object({}).optional(),
});

export const updateOrderStatusSchema = z.object({
  params: z.object({
    id: cuidSchema,
  }),
  body: z.object({
    outletId: cuidSchema,
    status: z.nativeEnum(OrderStatus),
  }),
  query: z.object({}).optional(),
});