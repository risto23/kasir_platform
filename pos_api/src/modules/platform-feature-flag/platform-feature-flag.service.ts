import { prisma } from '../../config/prisma';

type FeatureFlagClient = Pick<
  typeof prisma,
  'featureFlag' | 'planFeatureFlag' | 'businessFeatureFlag'
>;

export async function listFeatureFlagsService() {
  return prisma.featureFlag.findMany({
    orderBy: {
      key: 'asc',
    },
  });
}

export async function getBusinessFeatureFlagsService(businessId: string) {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: {
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

  const allFeatureFlags = await prisma.featureFlag.findMany({
    orderBy: {
      key: 'asc',
    },
  });

  const enabledMap = new Map(
    business.businessFeatures.map((item) => [item.featureFlag.key, item.enabled])
  );

  return {
    business: {
      id: business.id,
      name: business.name,
      slug: business.slug,
      businessType: business.businessType,
      status: business.status,
    },
    items: allFeatureFlags.map((flag) => ({
      id: flag.id,
      key: flag.key,
      name: flag.name,
      description: flag.description,
      enabled: enabledMap.get(flag.key) ?? false,
    })),
  };
}

export async function syncBusinessFeatureFlags(
  businessId: string,
  planId: string,
  client?: FeatureFlagClient
): Promise<void> {
  const db = client ?? prisma;

  const [allFlags, planFlagLinks] = await Promise.all([
    db.featureFlag.findMany({ select: { id: true } }),
    db.planFeatureFlag.findMany({
      where: { planId },
      select: { featureFlagId: true },
    }),
  ]);

  const planFlagIds = new Set(planFlagLinks.map((pf) => pf.featureFlagId));

  for (const flag of allFlags) {
    const enabled = planFlagIds.has(flag.id);
    await db.businessFeatureFlag.upsert({
      where: {
        businessId_featureFlagId: {
          businessId,
          featureFlagId: flag.id,
        },
      },
      create: {
        businessId,
        featureFlagId: flag.id,
        enabled,
      },
      update: { enabled },
    });
  }
}

export async function updateBusinessFeatureFlagsService(
  businessId: string,
  featureFlagKeys: string[]
) {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
  });

  if (!business) {
    throw new Error('Business tidak ditemukan');
  }

  const masterFlags = await prisma.featureFlag.findMany({
    orderBy: {
      key: 'asc',
    },
  });

  const masterKeySet = new Set(masterFlags.map((flag) => flag.key));

  for (const key of featureFlagKeys) {
    if (!masterKeySet.has(key)) {
      throw new Error(`Feature flag tidak valid: ${key}`);
    }
  }

  await prisma.$transaction(async (tx) => {
    for (const flag of masterFlags) {
      const shouldEnable = featureFlagKeys.includes(flag.key);

      const existing = await tx.businessFeatureFlag.findUnique({
        where: {
          businessId_featureFlagId: {
            businessId,
            featureFlagId: flag.id,
          },
        },
      });

      if (existing) {
        await tx.businessFeatureFlag.update({
          where: {
            businessId_featureFlagId: {
              businessId,
              featureFlagId: flag.id,
            },
          },
          data: {
            enabled: shouldEnable,
          },
        });
      } else {
        await tx.businessFeatureFlag.create({
          data: {
            businessId,
            featureFlagId: flag.id,
            enabled: shouldEnable,
          },
        });
      }
    }
  });

  return getBusinessFeatureFlagsService(businessId);
}