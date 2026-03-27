// pos_api/src/modules/platform-business/platform-business.service.ts
import { prisma } from '../../config/prisma';
import { BusinessStatus } from '@prisma/client';

export async function listBusinessesService() {
  return prisma.business.findMany({
    include: {
      ownerUser: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
      outlets: true,
      businessFeatures: {
        include: {
          featureFlag: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

export async function getBusinessByIdService(id: string) {
  const business = await prisma.business.findUnique({
    where: { id },
    include: {
      ownerUser: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
      outlets: true,
      businessFeatures: {
        include: {
          featureFlag: true,
        },
      },
    },
  });

  if (!business) {
    throw new Error('Business tidak ditemukan');
  }

  return business;
}

export async function createBusinessService(payload: {
  name: string;
  slug: string;
  businessType: 'RESTAURANT' | 'RETAIL';
  ownerUserId?: string;
  featureFlagKeys?: string[];
}) {
  const business = await prisma.business.create({
    data: {
      name: payload.name,
      slug: payload.slug,
      businessType: payload.businessType,
      ownerUserId: payload.ownerUserId,
    },
  });

  if (payload.featureFlagKeys?.length) {
    const featureFlags = await prisma.featureFlag.findMany({
      where: {
        key: {
          in: payload.featureFlagKeys,
        },
      },
    });

    for (const featureFlag of featureFlags) {
      await prisma.businessFeatureFlag.create({
        data: {
          businessId: business.id,
          featureFlagId: featureFlag.id,
          enabled: true,
        },
      });
    }
  }

  return getBusinessByIdService(business.id);
}

export async function updateBusinessService(
  id: string,
  payload: {
    name: string;
    slug: string;
    ownerUserId?: string | null;
  }
) {
  const existing = await prisma.business.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new Error('Business tidak ditemukan');
  }

  await prisma.business.update({
    where: { id },
    data: {
      name: payload.name,
      slug: payload.slug,
      ownerUserId: payload.ownerUserId ?? null,
    },
  });

  return getBusinessByIdService(id);
}

export async function updateBusinessStatusService(
  id: string,
  status: BusinessStatus
) {
  const existing = await prisma.business.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new Error('Business tidak ditemukan');
  }

  await prisma.business.update({
    where: { id },
    data: { status },
  });

  return getBusinessByIdService(id);
}