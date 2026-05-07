import { z } from 'zod';

const cuidSchema = z.string().cuid();

const surchargeRuleSchema = z.object({
  minAmount: z.number().min(0),
  maxAmount: z.number().min(0).nullable(),
  type: z.enum(['PERCENTAGE', 'FLAT']),
  value: z.number().min(0),
});

export const listOutletPaymentMethodsSchema = z.object({
  params: z.object({ outletId: cuidSchema }),
  query: z.object({
    activeOnly: z
      .string()
      .optional()
      .transform((v) => v === 'true'),
  }),
  body: z.object({}).optional(),
});

export const createOutletPaymentMethodSchema = z.object({
  params: z.object({ outletId: cuidSchema }),
  body: z.object({
    name: z.string().trim().min(1).max(100),
    code: z.string().trim().min(1).max(50),
    isActive: z.boolean().optional(),
    surchargeRules: z.array(surchargeRuleSchema).optional(),
    sortOrder: z.number().int().min(0).optional(),
  }),
  query: z.object({}).optional(),
});

export const updateOutletPaymentMethodSchema = z.object({
  params: z.object({ outletId: cuidSchema, id: cuidSchema }),
  body: z.object({
    name: z.string().trim().min(1).max(100).optional(),
    isActive: z.boolean().optional(),
    surchargeRules: z.array(surchargeRuleSchema).optional(),
    sortOrder: z.number().int().min(0).optional(),
  }),
  query: z.object({}).optional(),
});

export const deleteOutletPaymentMethodSchema = z.object({
  params: z.object({ outletId: cuidSchema, id: cuidSchema }),
  body: z.object({}).optional(),
  query: z.object({}).optional(),
});
