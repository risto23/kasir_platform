import { prisma } from '../../config/prisma';

export type BusinessSettingsPayload = {
  businessName: string;
  supportEmail: string | null;
  supportPhone: string | null;
  websiteUrl: string | null;
  address: string | null;
  tagline: string | null;
};

export async function getBusinessSettings(businessId: string) {
  const [business, setting] = await Promise.all([
    prisma.business.findUnique({
      where: { id: businessId },
      select: {
        id: true,
        name: true,
        slug: true,
        businessType: true,
        status: true,
      },
    }),
    prisma.businessSetting.findUnique({
      where: { businessId },
    }),
  ]);

  if (!business) {
    throw new Error('Business tidak ditemukan');
  }

  return {
    businessName: business.name,
    supportEmail: setting?.supportEmail ?? null,
    supportPhone: setting?.supportPhone ?? null,
    websiteUrl: setting?.websiteUrl ?? null,
    address: setting?.address ?? null,
    tagline: setting?.tagline ?? null,
    defaults: {
      businessName: business.name,
      slug: business.slug,
      businessType: business.businessType,
      status: business.status,
    },
  };
}

export async function putBusinessSettings(params: {
  businessId: string;
  payload: BusinessSettingsPayload;
}) {
  const business = await prisma.business.findUnique({
    where: { id: params.businessId },
    select: { id: true, name: true },
  });

  if (!business) {
    throw new Error('Business tidak ditemukan');
  }

  const nextBusinessName = params.payload.businessName.trim() || business.name;

  await prisma.business.update({
    where: { id: params.businessId },
    data: {
      name: nextBusinessName,
    },
  });

  await prisma.businessSetting.upsert({
    where: { businessId: params.businessId },
    update: {
      supportEmail: params.payload.supportEmail,
      supportPhone: params.payload.supportPhone,
      websiteUrl: params.payload.websiteUrl,
      address: params.payload.address,
      tagline: params.payload.tagline,
    },
    create: {
      businessId: params.businessId,
      supportEmail: params.payload.supportEmail,
      supportPhone: params.payload.supportPhone,
      websiteUrl: params.payload.websiteUrl,
      address: params.payload.address,
      tagline: params.payload.tagline,
    },
  });

  return getBusinessSettings(params.businessId);
}
