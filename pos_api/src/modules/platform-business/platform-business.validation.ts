// pos_api/src/modules/platform-business/platform-business.validation.ts
import { z } from 'zod';

export const createBusinessSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    slug: z.string().min(2),
    businessType: z.enum(['RESTAURANT', 'RETAIL']),
    ownerUserId: z.string().optional(),
    featureFlagKeys: z.array(z.string()).optional(),
  }),
});

export const businessIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
});

export const updateBusinessSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    name: z.string().min(2),
    slug: z.string().min(2),
    ownerUserId: z.string().optional().nullable(),
  }),
});

export const updateBusinessStatusSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    status: z.enum(['ACTIVE', 'INACTIVE']),
  }),
});