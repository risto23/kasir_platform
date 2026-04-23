import { z } from 'zod';

function nullableString(maxLength: number) {
  return z
    .string()
    .trim()
    .max(maxLength)
    .nullish()
    .transform((value) => {
      if (!value || value.trim() === '') {
        return null;
      }

      return value.trim();
    });
}

export const putBusinessSettingsBodySchema = z.object({
  body: z.object({
    businessName: z.string().trim().min(1).max(255),
    supportEmail: nullableString(255),
    supportPhone: nullableString(100),
    websiteUrl: nullableString(500),
    address: nullableString(1000),
    tagline: nullableString(500),
  }),
});
