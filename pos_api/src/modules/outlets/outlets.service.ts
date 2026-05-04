import { OutletStatus, Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { enforceOutletLimit } from '../../middlewares/subscription-limit.middleware';
import type {
  CreateOutletBody,
  ListOutletsQuery,
  UpdateOutletBody,
  UpdateOutletStatusBody,
} from './outlets.validation';

function buildHttpError(statusCode: number, message: string) {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = statusCode;
  return error;
}

type OutletWithRelations = Prisma.OutletGetPayload<{
  include: {
    _count: {
      select: {
        businessUserAccesses: true;
      };
    };
  };
}>;

function normalizeNullableText(value?: string | null) {
  const normalized = value?.trim();

  if (!normalized) {
    return null;
  }

  return normalized;
}

function slugifyOutletName(name: string) {
  return name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function mapOutlet(item: OutletWithRelations) {
  return {
    id: item.id,
    businessId: item.businessId,
    code: item.code,
    name: item.name,
    address: item.address,
    phone: item.phone,
    status: item.status,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    totalAssignedUsers: item._count.businessUserAccesses,
  };
}

async function getOutletOrThrow(businessId: string, outletId: string) {
  const outlet = await prisma.outlet.findFirst({
    where: {
      id: outletId,
      businessId,
    },
    include: {
      _count: {
        select: {
          businessUserAccesses: true,
        },
      },
    },
  });

  if (!outlet) {
    throw buildHttpError(404, 'Outlet tidak ditemukan');
  }

  return outlet;
}

async function ensureOutletCodeUnique(
  businessId: string,
  code: string,
  excludeId?: string,
) {
  const existing = await prisma.outlet.findFirst({
    where: {
      businessId,
      code,
      ...(excludeId
        ? {
            id: {
              not: excludeId,
            },
          }
        : {}),
    },
    select: {
      id: true,
    },
  });

  if (existing) {
    throw buildHttpError(409, 'Code outlet sudah digunakan di business ini');
  }
}

async function generateOutletCode(
  businessId: string,
  outletName: string,
) {
  const baseSlug = slugifyOutletName(outletName) || 'OUTLET';

  for (let index = 1; index <= 9999; index += 1) {
    const candidate = `${baseSlug}-${String(index).padStart(3, '0')}`;

    const exists = await prisma.outlet.findFirst({
      where: {
        businessId,
        code: candidate,
      },
      select: {
        id: true,
      },
    });

    if (!exists) {
      return candidate;
    }
  }

  throw buildHttpError(500, 'Gagal generate code outlet');
}

export async function listOutlets(
  businessId: string,
  query: ListOutletsQuery,
) {
  const page = query.page ?? 1;
  const limit = query.limit ?? 10;
  const skip = (page - 1) * limit;

  const where: Prisma.OutletWhereInput = {
    businessId,
    ...(query.status ? { status: query.status } : {}),
    ...(query.search
      ? {
          OR: [
            {
              name: {
                contains: query.search,
                mode: 'insensitive',
              },
            },
            {
              code: {
                contains: query.search,
                mode: 'insensitive',
              },
            },
            {
              address: {
                contains: query.search,
                mode: 'insensitive',
              },
            },
            {
              phone: {
                contains: query.search,
                mode: 'insensitive',
              },
            },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.outlet.findMany({
      where,
      include: {
        _count: {
          select: {
            businessUserAccesses: true,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
      skip,
      take: limit,
    }),
    prisma.outlet.count({ where }),
  ]);

  return {
    items: items.map(mapOutlet),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function createOutlet(
  businessId: string,
  payload: CreateOutletBody,
) {
  const targetStatus = payload.status ?? OutletStatus.ACTIVE;

  if (targetStatus === OutletStatus.ACTIVE) {
    await enforceOutletLimit({
      businessId,
      blockedAction: 'CREATE_OUTLET',
    });
  }

  const name = payload.name.trim();
  const code = await generateOutletCode(businessId, name);

  await ensureOutletCodeUnique(businessId, code);

  const created = await prisma.outlet.create({
    data: {
      businessId,
      code,
      name,
      address: normalizeNullableText(payload.address),
      phone: normalizeNullableText(payload.phone),
      status: targetStatus,
    },
    include: {
      _count: {
        select: {
          businessUserAccesses: true,
        },
      },
    },
  });

  return mapOutlet(created);
}

export async function getOutletDetail(
  businessId: string,
  outletId: string,
) {
  const outlet = await getOutletOrThrow(businessId, outletId);
  return mapOutlet(outlet);
}

export async function updateOutlet(
  businessId: string,
  outletId: string,
  payload: UpdateOutletBody,
) {
  const currentOutlet = await getOutletOrThrow(businessId, outletId);
  const name = payload.name.trim();
  const targetStatus = payload.status ?? OutletStatus.ACTIVE;

  if (
    currentOutlet.status !== OutletStatus.ACTIVE &&
    targetStatus === OutletStatus.ACTIVE
  ) {
    await enforceOutletLimit({
      businessId,
      blockedAction: 'ACTIVATE_OUTLET',
    });
  }

  const updated = await prisma.outlet.update({
    where: {
      id: currentOutlet.id,
    },
    data: {
      name,
      address: normalizeNullableText(payload.address),
      phone: normalizeNullableText(payload.phone),
      status: targetStatus,
    },
    include: {
      _count: {
        select: {
          businessUserAccesses: true,
        },
      },
    },
  });

  return mapOutlet(updated);
}

export async function updateOutletStatus(
  businessId: string,
  outletId: string,
  payload: UpdateOutletStatusBody,
) {
  const currentOutlet = await getOutletOrThrow(businessId, outletId);

  if (
    currentOutlet.status !== OutletStatus.ACTIVE &&
    payload.status === OutletStatus.ACTIVE
  ) {
    await enforceOutletLimit({
      businessId,
      blockedAction: 'ACTIVATE_OUTLET',
    });
  }

  if (
    currentOutlet.status === OutletStatus.ACTIVE &&
    payload.status === OutletStatus.INACTIVE &&
    currentOutlet._count.businessUserAccesses > 0
  ) {
    throw buildHttpError(
      400,
      'Outlet masih dipakai oleh business user. Lepaskan akses user dulu sebelum menonaktifkan outlet',
    );
  }

  const updated = await prisma.outlet.update({
    where: {
      id: outletId,
    },
    data: {
      status: payload.status,
    },
    include: {
      _count: {
        select: {
          businessUserAccesses: true,
        },
      },
    },
  });

  return mapOutlet(updated);
}
