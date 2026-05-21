import { z } from 'zod';

export const businessFeatureFlagParamSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

export const updateBusinessFeatureFlagsSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({ featureFlagKeys: z.array(z.string()) }),
});

export const planFeatureFlagParamSchema = z.object({
  params: z.object({ planId: z.string().min(1) }),
});

export const setPlanFeatureFlagsSchema = z.object({
  params: z.object({ planId: z.string().min(1) }),
  body: z.object({ featureFlagKeys: z.array(z.string()) }),
});

export const overrideBusinessFeatureFlagSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    featureFlagKey: z.string().min(1),
    enabled: z.boolean(),
    reason: z.string().trim().max(500).optional().nullable(),
  }),
});
