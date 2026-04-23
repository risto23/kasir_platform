import { z } from 'zod';

const nullableTrimmedString = z
  .string()
  .trim()
  .max(255)
  .nullish()
  .transform((value) => {
    if (!value || value.trim() === '') {
      return null;
    }

    return value.trim();
  });

const nullableLongString = z
  .string()
  .trim()
  .max(1000)
  .nullish()
  .transform((value) => {
    if (!value || value.trim() === '') {
      return null;
    }

    return value.trim();
  });

export const getReceiptSettingsQuerySchema = z.object({
  query: z.object({
    outletId: z.string().cuid(),
  }),
});

export const putReceiptSettingsBodySchema = z.object({
  body: z.object({
    outletId: z.string().cuid(),
    brandName: nullableTrimmedString,
    logoUrl: nullableLongString,
    headerText: nullableLongString,
    footerText: nullableLongString,
    showBusinessName: z.boolean(),
    showOutletName: z.boolean(),
    showOutletAddress: z.boolean(),
    showOutletPhone: z.boolean(),
  }),
});
