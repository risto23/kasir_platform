import { z } from 'zod';

export const createOutletSchema = z.object({
  body: z.object({
    businessId: z.string(),
    name: z.string().min(2),
    code: z.string().min(2),
    address: z.string().optional(),
    phone: z.string().optional(),
  }),
});

export const outletIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
});

export const updateOutletSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    name: z.string().min(2),
    code: z.string().min(2),
    address: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
  }),
});

export const updateOutletStatusSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    status: z.enum(['ACTIVE', 'INACTIVE']),
  }),
});