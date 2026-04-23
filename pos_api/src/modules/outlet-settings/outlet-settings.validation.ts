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

export const getOutletSettingsQuerySchema = z.object({
  query: z.object({
    outletId: z.string().cuid(),
  }),
});

export const putOutletSettingsBodySchema = z.object({
  body: z.object({
    outletId: z.string().cuid(),
    outletName: z.string().trim().min(1).max(255),
    guestQrEnabled: z.boolean(),
    contactEmail: nullableString(255),
    whatsappNumber: nullableString(100),
    mapsUrl: nullableString(500),
    notes: nullableString(1000),
  }),
});
