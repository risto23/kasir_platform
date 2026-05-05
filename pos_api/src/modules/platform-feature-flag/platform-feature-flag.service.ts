import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { createAuditLogSafely } from '../../utils/audit-log';

type FeatureFlagClient = Pick<
  typeof prisma,
  'featureFlag' | 'planFeatureFlag' | 'businessFeatureFlag'
>;

type EffectiveFeatureFlagSource = 'PLAN' | 'OVERRIDE';

type EffectiveBusinessFeatureFlagItem = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  enabled: boolean;
  planEnabled: boolean;
  overrideEnabled: boolean | null;
  overrideReason: string | null;
  source: EffectiveFeatureFlagSource;
};

function normalizeOverrideReason(reason?: string | null): string | null {
  const trimmedReason = reason?.trim() ?? '';
  return trimmedReason.length > 0 ? trimmedReason : null;
}

function buildEffectiveBusinessFeatureFlagItem(params: {
  flag: {
    id: string;
    key: string;
    name: string;
    description: string | null;
  };
  planEnabled: boolean;
  override?: {
    enabled: boolean;
    reason: string | null;
  } | null;
}): EffectiveBusinessFeatureFlagItem {
  const overrideEnabled = params.override?.enabled ?? null;
  const overrideReason = params.override?.reason ?? null;

  return {
    id: params.flag.id,
    key: params.flag.key,
    name: params.flag.name,
    description: params.flag.description,
    enabled: overrideEnabled ?? params.planEnabled,
    planEnabled: params.planEnabled,
    overrideEnabled,
    overrideReason,
    source: params.override ? 'OVERRIDE' : 'PLAN',
  };
}

export async function getEffectiveBusinessFeatureFlagState(
  businessId: string,
  featureFlagKey: string
): Promise<EffectiveBusinessFeatureFlagItem | null> {
  const flag = await prisma.featureFlag.findUnique({
    where: { key: featureFlagKey },
    select: {
      id: true,
      key: true,
      name: true,
      description: true,
    },
  });

  if (!flag) {
    return null;
  }

  const [baseFlag, overrideFlag] = await Promise.all([
    prisma.businessFeatureFlag.findUnique({
      where: {
        businessId_featureFlagId: {
          businessId,
          featureFlagId: flag.id,
        },
      },
      select: { enabled: true },
    }),
    prisma.businessFeatureFlagOverride.findUnique({
      where: {
        businessId_featureFlagId: {
          businessId,
          featureFlagId: flag.id,
        },
      },
      select: {
        enabled: true,
        reason: true,
      },
    }),
  ]);

  return buildEffectiveBusinessFeatureFlagItem({
    flag,
    planEnabled: baseFlag?.enabled ?? false,
    override: overrideFlag
      ? {
          enabled: overrideFlag.enabled,
          reason: overrideFlag.reason,
        }
      : null,
  });
}

export async function listFeatureFlagsService() {
  return prisma.featureFlag.findMany({ orderBy: { key: 'asc' } });
}

export async function getBusinessFeatureFlagsService(businessId: string) {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: {
      businessFeatures: { include: { featureFlag: true } },
      featureFlagOverrides: {
        include: {
          featureFlag: true,
        },
      },
    },
  });

  if (!business) throw new Error('Business tidak ditemukan');

  const allFlags = await prisma.featureFlag.findMany({ orderBy: { key: 'asc' } });
  const planEnabledMap = new Map(
    business.businessFeatures.map((item) => [item.featureFlagId, item.enabled])
  );
  const overrideMap = new Map(
    business.featureFlagOverrides.map((item) => [
      item.featureFlagId,
      {
        enabled: item.enabled,
        reason: item.reason,
      },
    ])
  );

  return {
    business: {
      id: business.id,
      name: business.name,
      slug: business.slug,
      businessType: business.businessType,
      status: business.status,
    },
    items: allFlags.map((flag) =>
      buildEffectiveBusinessFeatureFlagItem({
        flag,
        planEnabled: planEnabledMap.get(flag.id) ?? false,
        override: overrideMap.get(flag.id) ?? null,
      })
    ),
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
      where: { businessId_featureFlagId: { businessId, featureFlagId: flag.id } },
      create: { businessId, featureFlagId: flag.id, enabled },
      update: { enabled },
    });
  }
}

export async function updateBusinessFeatureFlagsService(
  businessId: string,
  featureFlagKeys: string[]
) {
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business) throw new Error('Business tidak ditemukan');

  const masterFlags = await prisma.featureFlag.findMany({ orderBy: { key: 'asc' } });
  const masterKeySet = new Set(masterFlags.map((flag) => flag.key));

  for (const key of featureFlagKeys) {
    if (!masterKeySet.has(key)) throw new Error(`Feature flag tidak valid: ${key}`);
  }

  await prisma.$transaction(async (tx) => {
    for (const flag of masterFlags) {
      const shouldEnable = featureFlagKeys.includes(flag.key);
      await tx.businessFeatureFlag.upsert({
        where: { businessId_featureFlagId: { businessId, featureFlagId: flag.id } },
        create: { businessId, featureFlagId: flag.id, enabled: shouldEnable },
        update: { enabled: shouldEnable },
      });
    }
  });

  return getBusinessFeatureFlagsService(businessId);
}

export async function getPlanFeatureFlagsService(planId: string) {
  const plan = await prisma.plan.findUnique({
    where: { id: planId },
    include: { featureFlags: { select: { featureFlagId: true } } },
  });

  if (!plan) throw new Error('Plan tidak ditemukan');

  const allFlags = await prisma.featureFlag.findMany({ orderBy: { key: 'asc' } });
  const enabledIds = new Set(plan.featureFlags.map((pf) => pf.featureFlagId));

  return {
    plan: {
      id: plan.id,
      code: plan.code,
      name: plan.name,
      isActive: plan.isActive,
      businessType: plan.businessType,
    },
    items: allFlags.map((flag) => ({
      id: flag.id,
      key: flag.key,
      name: flag.name,
      description: flag.description,
      enabled: enabledIds.has(flag.id),
    })),
  };
}

export async function setPlanFeatureFlagsService(
  planId: string,
  featureFlagKeys: string[],
  actorUserId?: string | null
) {
  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) throw new Error('Plan tidak ditemukan');

  const allFlags = await prisma.featureFlag.findMany({ orderBy: { key: 'asc' } });
  const allKeySet = new Set(allFlags.map((f) => f.key));

  for (const key of featureFlagKeys) {
    if (!allKeySet.has(key)) throw new Error(`Feature flag tidak valid: ${key}`);
  }

  const enabledKeySet = new Set(featureFlagKeys);
  const enabledFlagIds = allFlags.filter((f) => enabledKeySet.has(f.key)).map((f) => f.id);

  const currentLinks = await prisma.planFeatureFlag.findMany({
    where: { planId },
    select: { featureFlagId: true },
  });
  const currentFlagIds = new Set(currentLinks.map((pf) => pf.featureFlagId));

  await prisma.$transaction(async (tx) => {
    await tx.planFeatureFlag.deleteMany({ where: { planId } });
    if (enabledFlagIds.length > 0) {
      await tx.planFeatureFlag.createMany({
        data: enabledFlagIds.map((featureFlagId) => ({ planId, featureFlagId })),
      });
    }
  });

  const added = enabledFlagIds.filter((id) => !currentFlagIds.has(id));
  const removed = [...currentFlagIds].filter((id) => !enabledFlagIds.includes(id));

  if (added.length > 0 || removed.length > 0) {
    const addedKeys = allFlags.filter((f) => added.includes(f.id)).map((f) => f.key);
    const removedKeys = allFlags.filter((f) => removed.includes(f.id)).map((f) => f.key);

    await prisma.platformAuditLog.create({
      data: {
        actorUserId: actorUserId ?? null,
        action: 'PLAN_FEATURE_FLAGS_UPDATED',
        entityType: 'PLAN',
        entityId: planId,
        entityLabel: plan.code,
        summary: `Plan ${plan.code}: ${added.length} flag ditambah, ${removed.length} flag dihapus`,
        changes: { added: addedKeys, removed: removedKeys } as Prisma.InputJsonValue,
      },
    });
  }

  return getPlanFeatureFlagsService(planId);
}

export async function getPlansFeatureMatrixService() {
  const [plans, flags] = await Promise.all([
    prisma.plan.findMany({
      orderBy: { createdAt: 'asc' },
      include: { featureFlags: { select: { featureFlagId: true } } },
    }),
    prisma.featureFlag.findMany({ orderBy: { key: 'asc' } }),
  ]);

  const enabledByPlan: Record<string, string[]> = {};
  for (const plan of plans) {
    enabledByPlan[plan.id] = plan.featureFlags.map((pf) => pf.featureFlagId);
  }

  return {
    plans: plans.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      isActive: p.isActive,
      businessType: p.businessType,
    })),
    flags: flags.map((f) => ({
      id: f.id,
      key: f.key,
      name: f.name,
      description: f.description,
    })),
    enabledByPlan,
  };
}

export async function overrideBusinessFeatureFlagService(
  businessId: string,
  featureFlagKey: string,
  enabled: boolean,
  reason?: string | null,
  actorUserId?: string | null
) {
  const [business, flag] = await Promise.all([
    prisma.business.findUnique({ where: { id: businessId } }),
    prisma.featureFlag.findUnique({ where: { key: featureFlagKey } }),
  ]);

  if (!business) throw new Error('Business tidak ditemukan');
  if (!flag) throw new Error('Feature flag tidak ditemukan');

  const normalizedReason = normalizeOverrideReason(reason);

  const [baseFlag, existingOverride] = await Promise.all([
    prisma.businessFeatureFlag.findUnique({
      where: { businessId_featureFlagId: { businessId, featureFlagId: flag.id } },
      select: { enabled: true },
    }),
    prisma.businessFeatureFlagOverride.findUnique({
      where: { businessId_featureFlagId: { businessId, featureFlagId: flag.id } },
      select: { enabled: true, reason: true },
    }),
  ]);

  const planEnabled = baseFlag?.enabled ?? false;
  const previousOverrideEnabled = existingOverride?.enabled ?? null;
  const previousOverrideReason = existingOverride?.reason ?? null;
  const previousEffectiveEnabled = existingOverride?.enabled ?? planEnabled;

  if (enabled === planEnabled) {
    if (existingOverride) {
      await prisma.businessFeatureFlagOverride.delete({
        where: { businessId_featureFlagId: { businessId, featureFlagId: flag.id } },
      });

      await createAuditLogSafely({
        businessId,
        actorUserId,
        action: 'FEATURE_FLAG_OVERRIDE',
        entityType: 'BUSINESS_FEATURE_FLAG',
        entityId: flag.id,
        entityLabel: flag.key,
        summary: `Override fitur "${flag.name}" dihapus dan kembali mengikuti plan`,
        changes: {
          before: {
            planEnabled,
            overrideEnabled: previousOverrideEnabled,
            overrideReason: previousOverrideReason,
            enabled: previousEffectiveEnabled,
          },
          after: {
            planEnabled,
            overrideEnabled: null,
            overrideReason: null,
            enabled: planEnabled,
          },
        },
        metadata: {
          operation: 'REMOVE',
          featureFlagKey: flag.key,
          reason: normalizedReason,
        },
      });
    }

    const effectiveFlag = buildEffectiveBusinessFeatureFlagItem({
      flag,
      planEnabled,
      override: null,
    });

    return {
      business: { id: business.id, name: business.name },
      flag: { id: flag.id, key: flag.key, name: flag.name },
      enabled: effectiveFlag.enabled,
      reason: effectiveFlag.overrideReason,
      planEnabled: effectiveFlag.planEnabled,
      overrideEnabled: effectiveFlag.overrideEnabled,
      overrideReason: effectiveFlag.overrideReason,
      source: effectiveFlag.source,
    };
  }

  if (
    existingOverride &&
    existingOverride.enabled === enabled &&
    (existingOverride.reason ?? null) === normalizedReason
  ) {
    const effectiveFlag = buildEffectiveBusinessFeatureFlagItem({
      flag,
      planEnabled,
      override: {
        enabled: existingOverride.enabled,
        reason: existingOverride.reason,
      },
    });

    return {
      business: { id: business.id, name: business.name },
      flag: { id: flag.id, key: flag.key, name: flag.name },
      enabled: effectiveFlag.enabled,
      reason: effectiveFlag.overrideReason,
      planEnabled: effectiveFlag.planEnabled,
      overrideEnabled: effectiveFlag.overrideEnabled,
      overrideReason: effectiveFlag.overrideReason,
      source: effectiveFlag.source,
    };
  }

  await prisma.businessFeatureFlagOverride.upsert({
    where: { businessId_featureFlagId: { businessId, featureFlagId: flag.id } },
    create: {
      businessId,
      featureFlagId: flag.id,
      enabled,
      reason: normalizedReason,
      actorUserId: actorUserId ?? null,
    },
    update: {
      enabled,
      reason: normalizedReason,
      actorUserId: actorUserId ?? null,
    },
  });

  await createAuditLogSafely({
    businessId,
    actorUserId,
    action: 'FEATURE_FLAG_OVERRIDE',
    entityType: 'BUSINESS_FEATURE_FLAG',
    entityId: flag.id,
    entityLabel: flag.key,
    summary: `Override fitur "${flag.name}" ${existingOverride ? 'diperbarui' : 'dibuat'}`,
    changes: {
      before: {
        planEnabled,
        overrideEnabled: previousOverrideEnabled,
        overrideReason: previousOverrideReason,
        enabled: previousEffectiveEnabled,
      },
      after: {
        planEnabled,
        overrideEnabled: enabled,
        overrideReason: normalizedReason,
        enabled,
      },
    },
    metadata: {
      operation: existingOverride ? 'UPDATE' : 'CREATE',
      featureFlagKey: flag.key,
      reason: normalizedReason,
    },
  });

  const effectiveFlag = buildEffectiveBusinessFeatureFlagItem({
    flag,
    planEnabled,
    override: {
      enabled,
      reason: normalizedReason,
    },
  });

  return {
    business: { id: business.id, name: business.name },
    flag: { id: flag.id, key: flag.key, name: flag.name },
    enabled: effectiveFlag.enabled,
    reason: effectiveFlag.overrideReason,
    planEnabled: effectiveFlag.planEnabled,
    overrideEnabled: effectiveFlag.overrideEnabled,
    overrideReason: effectiveFlag.overrideReason,
    source: effectiveFlag.source,
  };
}

export async function getBusinessesFeatureSummaryService() {
  const businesses = await prisma.business.findMany({
    orderBy: { name: 'asc' },
    include: {
      subscriptions: {
        where: { status: { not: 'CANCELLED' } },
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: { plan: { select: { id: true, code: true, name: true } } },
      },
      businessFeatures: {
        include: { featureFlag: { select: { key: true, name: true } } },
      },
    },
  });

  return businesses.map((b) => {
    const activeSub = b.subscriptions[0] ?? null;
    const enabledCount = b.businessFeatures.filter((f) => f.enabled).length;

    return {
      id: b.id,
      name: b.name,
      slug: b.slug,
      businessType: b.businessType,
      status: b.status,
      plan: activeSub
        ? {
            id: activeSub.plan.id,
            code: activeSub.plan.code,
            name: activeSub.plan.name,
          }
        : null,
      features: {
        total: b.businessFeatures.length,
        enabled: enabledCount,
        items: b.businessFeatures.map((f) => ({
          key: f.featureFlag.key,
          name: f.featureFlag.name,
          enabled: f.enabled,
        })),
      },
    };
  });
}

export async function getPlatformAuditLogsService(opts?: {
  entityType?: string;
  entityId?: string;
  limit?: number;
}) {
  const logs = await prisma.platformAuditLog.findMany({
    where: {
      ...(opts?.entityType ? { entityType: opts.entityType } : {}),
      ...(opts?.entityId ? { entityId: opts.entityId } : {}),
    },
    include: {
      actorUser: { select: { id: true, fullName: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: opts?.limit ?? 50,
  });

  return logs.map((log) => ({
    id: log.id,
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId,
    entityLabel: log.entityLabel,
    summary: log.summary,
    changes: log.changes,
    metadata: log.metadata,
    createdAt: log.createdAt.toISOString(),
    actorUser: log.actorUser
      ? { id: log.actorUser.id, fullName: log.actorUser.fullName, email: log.actorUser.email }
      : null,
  }));
}

export async function getBusinessFeatureFlagAuditLogsService(
  businessId: string,
  limit = 30
) {
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business) throw new Error('Business tidak ditemukan');

  const logs = await prisma.auditLog.findMany({
    where: { businessId, action: 'FEATURE_FLAG_OVERRIDE' },
    include: {
      actorUser: { select: { id: true, fullName: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return logs.map((log) => ({
    id: log.id,
    action: log.action,
    entityLabel: log.entityLabel,
    summary: log.summary,
    changes: log.changes,
    metadata: log.metadata,
    createdAt: log.createdAt.toISOString(),
    actorUser: log.actorUser
      ? { id: log.actorUser.id, fullName: log.actorUser.fullName, email: log.actorUser.email }
      : null,
  }));
}
