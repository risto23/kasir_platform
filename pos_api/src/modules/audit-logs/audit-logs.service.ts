import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import type { RequestBusinessAccess } from '../auth/auth.types';
import type { ListAuditLogsQuery } from './audit-logs.validation';

export async function listAuditLogs(
  businessAccess: RequestBusinessAccess,
  query: ListAuditLogsQuery,
) {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const skip = (page - 1) * limit;

  const allowedOutletIds =
    businessAccess.hasAllOutletAccess || businessAccess.allowedOutletIds.length === 0
      ? null
      : businessAccess.allowedOutletIds;

  if (query.outletId && allowedOutletIds && !allowedOutletIds.includes(query.outletId)) {
    const error = new Error('Tidak memiliki akses ke outlet ini') as Error & {
      statusCode?: number;
    };
    error.statusCode = 403;
    throw error;
  }

  const where: Prisma.AuditLogWhereInput = {
    businessId: businessAccess.businessId,
    ...(query.action ? { action: query.action } : {}),
    ...(query.entityType ? { entityType: query.entityType } : {}),
    ...(query.outletId
      ? { outletId: query.outletId }
      : allowedOutletIds
        ? { outletId: { in: allowedOutletIds } }
        : {}),
  };

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        actorUser: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        outlet: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    items: items.map((item) => ({
      id: item.id,
      action: item.action,
      entityType: item.entityType,
      entityId: item.entityId,
      entityLabel: item.entityLabel,
      summary: item.summary,
      changes: item.changes,
      metadata: item.metadata,
      createdAt: item.createdAt,
      actor: item.actorUser
        ? {
            id: item.actorUser.id,
            fullName: item.actorUser.fullName,
            email: item.actorUser.email,
          }
        : null,
      outlet: item.outlet
        ? {
            id: item.outlet.id,
            name: item.outlet.name,
            code: item.outlet.code,
          }
        : null,
    })),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
