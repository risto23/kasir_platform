import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';

type Primitive = string | number | boolean | null;
type JsonLike =
  | Primitive
  | JsonLike[]
  | {
      [key: string]: JsonLike;
    };

export type AuditLogPayload = {
  businessId: string;
  outletId?: string | null;
  actorUserId?: string | null;
  actorBusinessUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  entityLabel?: string | null;
  summary?: string | null;
  changes?: JsonLike | null;
  metadata?: JsonLike | null;
};

export async function createAuditLog(payload: AuditLogPayload) {
  return prisma.auditLog.create({
    data: {
      businessId: payload.businessId,
      outletId: payload.outletId ?? null,
      actorUserId: payload.actorUserId ?? null,
      actorBusinessUserId: payload.actorBusinessUserId ?? null,
      action: payload.action,
      entityType: payload.entityType,
      entityId: payload.entityId ?? null,
      entityLabel: payload.entityLabel ?? null,
      summary: payload.summary ?? null,
      changes:
        payload.changes === undefined || payload.changes === null
          ? undefined
          : (payload.changes as Prisma.InputJsonValue),
      metadata:
        payload.metadata === undefined || payload.metadata === null
          ? undefined
          : (payload.metadata as Prisma.InputJsonValue),
    },
  });
}

export async function createAuditLogSafely(payload: AuditLogPayload) {
  try {
    await createAuditLog(payload);
  } catch (error) {
    console.error('[audit-log] failed to write audit log', error);
  }
}

function normalizeValue(value: unknown): JsonLike {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(normalizeValue);
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [key, normalizeValue(nested)]),
    );
  }

  return value === undefined ? null : String(value);
}

export function buildFieldChangeSet(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  fields: string[],
) {
  const changedFields: string[] = [];
  const beforeSnapshot: Record<string, JsonLike> = {};
  const afterSnapshot: Record<string, JsonLike> = {};

  for (const field of fields) {
    const beforeValue = normalizeValue(before[field]);
    const afterValue = normalizeValue(after[field]);

    if (JSON.stringify(beforeValue) === JSON.stringify(afterValue)) {
      continue;
    }

    changedFields.push(field);
    beforeSnapshot[field] = beforeValue;
    afterSnapshot[field] = afterValue;
  }

  if (changedFields.length === 0) {
    return null;
  }

  return {
    fields: changedFields,
    before: beforeSnapshot,
    after: afterSnapshot,
  };
}
