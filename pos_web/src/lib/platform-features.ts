import { api } from '@/lib/api';

// ─── types ────────────────────────────────────────────────────────────────────

export type FeatureFlagItem = {
  id: string;
  key: string;
  name: string;
  description: string | null;
};

export type PlanInfo = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  businessType: 'RESTAURANT' | 'RETAIL' | null;
};

export type PlansFeatureMatrix = {
  plans: PlanInfo[];
  flags: FeatureFlagItem[];
  enabledByPlan: Record<string, string[]>; // planId → featureFlagId[]
};

export type PlanFeatureFlagsResponse = {
  plan: PlanInfo;
  items: (FeatureFlagItem & { enabled: boolean })[];
};

export type BusinessFeatureFlagsResponse = {
  business: {
    id: string;
    name: string;
    slug: string;
    businessType: 'RESTAURANT' | 'RETAIL';
    status: 'ACTIVE' | 'INACTIVE';
  };
  items: (FeatureFlagItem & { enabled: boolean })[];
};

export type BusinessFeatureSummaryItem = {
  id: string;
  name: string;
  slug: string;
  businessType: 'RESTAURANT' | 'RETAIL';
  status: 'ACTIVE' | 'INACTIVE';
  plan: { id: string; code: string; name: string } | null;
  features: {
    total: number;
    enabled: number;
    items: { key: string; name: string; enabled: boolean }[];
  };
};

export type PlatformAuditLogEntry = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  entityLabel: string | null;
  summary: string | null;
  changes: unknown;
  metadata: unknown;
  createdAt: string;
  actorUser: { id: string; fullName: string; email: string } | null;
};

export type BusinessAuditLogEntry = {
  id: string;
  action: string;
  entityLabel: string | null;
  summary: string | null;
  changes: unknown;
  metadata: unknown;
  createdAt: string;
  actorUser: { id: string; fullName: string; email: string } | null;
};

// ─── plan feature flags ───────────────────────────────────────────────────────

export async function getPlansFeatureMatrix(): Promise<PlansFeatureMatrix> {
  const res = await api.get('/platform/feature-flags/plans-matrix');
  return res.data.data as PlansFeatureMatrix;
}

export async function getPlanFeatureFlags(planId: string): Promise<PlanFeatureFlagsResponse> {
  const res = await api.get(`/platform/feature-flags/plans/${planId}`);
  return res.data.data as PlanFeatureFlagsResponse;
}

export async function setPlanFeatureFlags(
  planId: string,
  featureFlagKeys: string[]
): Promise<PlanFeatureFlagsResponse> {
  const res = await api.put(`/platform/feature-flags/plans/${planId}`, { featureFlagKeys });
  return res.data.data as PlanFeatureFlagsResponse;
}

// ─── business feature flags ───────────────────────────────────────────────────

export async function getBusinessFeatureFlags(
  businessId: string
): Promise<BusinessFeatureFlagsResponse> {
  const res = await api.get(`/platform/feature-flags/businesses/${businessId}/feature-flags`);
  return res.data.data as BusinessFeatureFlagsResponse;
}

export async function overrideBusinessFeatureFlag(
  businessId: string,
  featureFlagKey: string,
  enabled: boolean,
  reason?: string | null
): Promise<{ business: { id: string; name: string }; flag: { id: string; key: string; name: string }; enabled: boolean; reason: string | null }> {
  const res = await api.patch(`/platform/feature-flags/businesses/${businessId}/feature-override`, {
    featureFlagKey,
    enabled,
    reason: reason ?? null,
  });
  return res.data.data;
}

export async function getBusinessFeatureFlagAuditLogs(
  businessId: string,
  limit = 30
): Promise<BusinessAuditLogEntry[]> {
  const res = await api.get(
    `/platform/feature-flags/businesses/${businessId}/audit-logs?limit=${limit}`
  );
  return res.data.data as BusinessAuditLogEntry[];
}

// ─── businesses summary ───────────────────────────────────────────────────────

export async function getBusinessesFeatureSummary(): Promise<BusinessFeatureSummaryItem[]> {
  const res = await api.get('/platform/feature-flags/businesses-summary');
  return res.data.data as BusinessFeatureSummaryItem[];
}

// ─── platform audit logs ──────────────────────────────────────────────────────

export async function getPlatformAuditLogs(opts?: {
  entityType?: string;
  entityId?: string;
  limit?: number;
}): Promise<PlatformAuditLogEntry[]> {
  const params = new URLSearchParams();
  if (opts?.entityType) params.set('entityType', opts.entityType);
  if (opts?.entityId) params.set('entityId', opts.entityId);
  if (opts?.limit) params.set('limit', String(opts.limit));

  const res = await api.get(`/platform/feature-flags/platform-audit-logs?${params.toString()}`);
  return res.data.data as PlatformAuditLogEntry[];
}
