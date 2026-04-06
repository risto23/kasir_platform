import { z } from 'zod';

const ID_PATTERN = /^[a-zA-Z0-9_-]+$/;
const TOKEN_PATTERN = /^[a-zA-Z0-9._:-]+$/;

const paramsSchema = z
  .object({
    outletId: z
      .string()
      .trim()
      .min(1, 'outletId wajib diisi')
      .max(100, 'outletId terlalu panjang')
      .regex(ID_PATTERN, 'Format outletId tidak valid'),
  })
  .strict();

const menuQuerySchema = z
  .object({
    tableId: z
      .string()
      .trim()
      .min(1, 'tableId wajib diisi')
      .max(100, 'tableId terlalu panjang')
      .regex(ID_PATTERN, 'Format tableId tidak valid'),
    token: z
      .string()
      .trim()
      .min(16, 'token wajib diisi')
      .max(2048, 'token terlalu panjang')
      .regex(TOKEN_PATTERN, 'Format token tidak valid'),
  })
  .strict();

const createGuestOrderItemSchema = z
  .object({
    productId: z
      .string()
      .trim()
      .min(1, 'productId wajib diisi')
      .max(100, 'productId terlalu panjang')
      .regex(ID_PATTERN, 'Format productId tidak valid'),
    quantity: z
      .number()
      .refine((value) => Number.isFinite(value), {
        message: 'quantity harus berupa number',
      })
      .int('quantity harus berupa bilangan bulat')
      .positive('quantity harus lebih dari 0')
      .max(99, 'quantity maksimal 99'),
    note: z.string().trim().max(200).optional().nullable(),
  })
  .strict();

const createGuestOrderBodySchema = z
  .object({
    tableId: z
      .string()
      .trim()
      .min(1, 'tableId wajib diisi')
      .max(100, 'tableId terlalu panjang')
      .regex(ID_PATTERN, 'Format tableId tidak valid'),
    token: z
      .string()
      .trim()
      .min(16, 'token wajib diisi')
      .max(2048, 'token terlalu panjang')
      .regex(TOKEN_PATTERN, 'Format token tidak valid'),
    guestName: z.string().trim().max(100).optional().nullable(),
    notes: z.string().trim().max(500).optional().nullable(),
    items: z.array(createGuestOrderItemSchema).min(1, 'items minimal 1').max(50, 'items maksimal 50'),
  })
  .strict();

export const guestMenuValidationSchema = z.object({
  params: paramsSchema,
  query: menuQuerySchema,
  body: z.object({}).optional(),
});

export const createGuestOrderValidationSchema = z.object({
  params: paramsSchema,
  query: z.object({}).optional(),
  body: createGuestOrderBodySchema,
});