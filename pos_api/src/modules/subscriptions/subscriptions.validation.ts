import { BusinessType, PaymentMethod } from '@prisma/client';
import { z } from 'zod';

export const subscriptionPlanCodeSchema = z
  .string()
  .trim()
  .min(2)
  .max(50)
  .regex(
    /^[A-Z][A-Z0-9_]*$/,
    'Target plan code harus uppercase dan hanya boleh berisi huruf, angka, atau underscore.',
  );

export const subscriptionPlanBusinessTypeSchema = z
  .nativeEnum(BusinessType)
  .optional()
  .nullable();

export const subscriptionPlanLimitsSchema = z.object({
  maxOutlets: z.union([z.coerce.number().int().nonnegative(), z.null()]).optional(),
  maxUsers: z.union([z.coerce.number().int().nonnegative(), z.null()]).optional(),
  maxProducts: z.union([z.coerce.number().int().nonnegative(), z.null()]).optional(),
  maxMonthlyTransactions: z.union([z.coerce.number().int().nonnegative(), z.null()]).optional(),
});

export const createSubscriptionPlanBodySchema = z.object({
  code: subscriptionPlanCodeSchema,
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).optional().nullable().default(null),
  monthlyPrice: z.coerce.number().min(0),
  currencyCode: z.string().trim().min(1).max(10),
  businessType: subscriptionPlanBusinessTypeSchema.default(null),
  isCustomPricing: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
  maxOutlets: z.union([z.coerce.number().int().nonnegative(), z.null()]).optional().default(null),
  maxUsers: z.union([z.coerce.number().int().nonnegative(), z.null()]).optional().default(null),
  maxProducts: z.union([z.coerce.number().int().nonnegative(), z.null()]).optional().default(null),
  maxMonthlyTransactions: z.union([z.coerce.number().int().nonnegative(), z.null()]).optional().default(null),
});

export const updateSubscriptionPlanBodySchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().max(500).optional().nullable(),
  monthlyPrice: z.coerce.number().min(0).optional(),
  currencyCode: z.string().trim().min(1).max(10).optional(),
  businessType: subscriptionPlanBusinessTypeSchema,
  isCustomPricing: z.boolean().optional(),
  isActive: z.boolean().optional(),
  ...subscriptionPlanLimitsSchema.shape,
});

export const subscriptionInvoicesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  perPage: z.coerce.number().int().min(1).max(100).optional(),
});

export const subscriptionInvoiceIdParamSchema = z.object({
  id: z.string().min(1),
});

export const subscriptionPlanIdParamSchema = z.object({
  id: z.string().min(1),
});

export const subscriptionChangePreviewQuerySchema = z.object({
  targetPlanCode: subscriptionPlanCodeSchema,
});

export const subscriptionChangePlanBodySchema = z.object({
  targetPlanCode: subscriptionPlanCodeSchema,
});

export const subscriptionStartBodySchema = z.object({
  targetPlanCode: subscriptionPlanCodeSchema,
});

export const subscriptionInvoicePaymentBodySchema = z.object({
  method: z.nativeEnum(PaymentMethod),
  amount: z.coerce.number().positive(),
  referenceNumber: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .optional()
    .nullable(),
  paidAt: z.coerce.date().optional(),
});

export const subscriptionLifecycleActionBodySchema = z.object({});
