import { z } from 'zod';

export const businessFeatureFlagParamSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
});

export const updateBusinessFeatureFlagsSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    featureFlagKeys: z.array(z.string()),
  }),
});