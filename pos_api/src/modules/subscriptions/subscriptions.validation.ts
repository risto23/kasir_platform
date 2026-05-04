import { PaymentMethod } from '@prisma/client';
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

export const subscriptionInvoicesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  perPage: z.coerce.number().int().min(1).max(100).optional(),
});

export const subscriptionInvoiceIdParamSchema = z.object({
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
