// pos_api/src/modules/business-users/business-users.service.ts
import {
  BusinessRoleCode,
  BusinessUserStatus,
  Prisma,
  UserStatus,
} from '@prisma/client';
import bcrypt from 'bcryptjs';
import { prisma } from '../../config/prisma';
import { enforceBusinessUserLimit } from '../../middlewares/subscription-limit.middleware';
import type {
  CreateBusinessUserBody,
  ListBusinessUsersQuery,
  UpdateBusinessUserBody,
  UpdateBusinessUserOutletAccessBody,
  UpdateBusinessUserStatusBody,
} from './business-users.validation';

type BusinessUserWithRelations = Prisma.BusinessUserGetPayload<{
  include: {
    user: true;
    businessRole: {
      include: {
        rolePermissions: {
          include: {
            businessPermission: true;
          };
        };
      };
    };
    outletAccesses: {
      include: {
        outlet: true;
      };
    };
  };
}>;

function buildHttpError(statusCode: number, message: string) {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = statusCode;
  return error;
}

function normalizeOutletIds(outletIds: string[]) {
  return Array.from(new Set(outletIds));
}

function validateRoleOutletAccessRule(
  roleCode: BusinessRoleCode,
  hasAllOutletAccess: boolean,
  outletIds: string[],
) {
  if (roleCode === BusinessRoleCode.OWNER) {
    if (!hasAllOutletAccess) {
      throw buildHttpError(400, 'OWNER wajib full outlet access');
    }

    if (outletIds.length > 0) {
      throw buildHttpError(400, 'OWNER tidak boleh memakai limited outlet access');
    }

    return;
  }

  if (roleCode === BusinessRoleCode.ADMIN) {
    if (!hasAllOutletAccess && outletIds.length === 0) {
      throw buildHttpError(400, 'ADMIN limited wajib memiliki minimal 1 outlet access');
    }

    if (hasAllOutletAccess && outletIds.length > 0) {
      throw buildHttpError(400, 'ADMIN all outlet tidak perlu outletIds');
    }

    return;
  }

  if (
    roleCode === BusinessRoleCode.CASHIER ||
    roleCode === BusinessRoleCode.KITCHEN ||
    roleCode === BusinessRoleCode.INVENTORY
  ) {
    if (hasAllOutletAccess) {
      throw buildHttpError(
        400,
        `${roleCode} wajib outlet-scoped dan tidak boleh full outlet access`,
      );
    }

    if (outletIds.length === 0) {
      throw buildHttpError(400, `${roleCode} wajib memiliki minimal 1 outlet access`);
    }
  }
}

async function ensureOutletsBelongToBusiness(
  tx: Prisma.TransactionClient,
  businessId: string,
  outletIds: string[],
) {
  if (outletIds.length === 0) {
    return;
  }

  const outlets = await tx.outlet.findMany({
    where: {
      id: { in: outletIds },
      businessId,
    },
    select: {
      id: true,
    },
  });

  if (outlets.length !== outletIds.length) {
    throw buildHttpError(400, 'Ada outlet yang tidak termasuk business yang sama');
  }
}

async function replaceOutletAccess(
  tx: Prisma.TransactionClient,
  businessUserId: string,
  outletIds: string[],
) {
  await tx.businessUserOutletAccess.deleteMany({
    where: {
      businessUserId,
    },
  });

  if (outletIds.length === 0) {
    return;
  }

  await tx.businessUserOutletAccess.createMany({
    data: outletIds.map((outletId) => ({
      businessUserId,
      outletId,
    })),
    skipDuplicates: true,
  });
}

function mapBusinessUser(item: BusinessUserWithRelations) {
  return {
    id: item.id,
    businessId: item.businessId,
    userId: item.userId,
    status: item.status,
    isPrimary: item.isPrimary,
    hasAllOutletAccess: item.hasAllOutletAccess,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    user: {
      id: item.user.id,
      fullName: item.user.fullName,
      email: item.user.email,
      status: item.user.status,
      lastLoginAt: item.user.lastLoginAt,
      createdAt: item.user.createdAt,
      updatedAt: item.user.updatedAt,
    },
    role: {
      id: item.businessRole.id,
      code: item.businessRole.code,
      name: item.businessRole.name,
      description: item.businessRole.description,
      permissions: item.businessRole.rolePermissions.map((permission) => ({
        id: permission.businessPermission.id,
        code: permission.businessPermission.code,
        name: permission.businessPermission.name,
        description: permission.businessPermission.description,
      })),
    },
    outletAccesses: item.outletAccesses.map((access) => ({
      id: access.id,
      outletId: access.outlet.id,
      outletName: access.outlet.name,
      outletCode: access.outlet.code,
      outletStatus: access.outlet.status,
    })),
  };
}

async function getMembershipOrThrow(
  businessId: string,
  businessUserId: string,
) {
  const businessUser = await prisma.businessUser.findFirst({
    where: {
      id: businessUserId,
      businessId,
    },
    include: {
      user: true,
      businessRole: {
        include: {
          rolePermissions: {
            include: {
              businessPermission: true,
            },
          },
        },
      },
      outletAccesses: {
        include: {
          outlet: true,
        },
        orderBy: {
          outlet: {
            name: 'asc',
          },
        },
      },
    },
  });

  if (!businessUser) {
    throw buildHttpError(404, 'Business user tidak ditemukan');
  }

  return businessUser;
}

export async function listBusinessUsers(
  businessId: string,
  query: ListBusinessUsersQuery,
) {
  const page = query.page ?? 1;
  const limit = query.limit ?? 10;
  const skip = (page - 1) * limit;

  const where: Prisma.BusinessUserWhereInput = {
    businessId,
    ...(query.status ? { status: query.status } : {}),
    ...(query.roleCode
      ? {
          businessRole: {
            code: query.roleCode,
          },
        }
      : {}),
    ...(query.search
      ? {
          OR: [
            {
              user: {
                fullName: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
            },
            {
              user: {
                email: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
            },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.businessUser.findMany({
      where,
      include: {
        user: true,
        businessRole: {
          include: {
            rolePermissions: {
              include: {
                businessPermission: true,
              },
            },
          },
        },
        outletAccesses: {
          include: {
            outlet: true,
          },
          orderBy: {
            outlet: {
              name: 'asc',
            },
          },
        },
      },
      orderBy: [
        { createdAt: 'desc' },
      ],
      skip,
      take: limit,
    }),
    prisma.businessUser.count({ where }),
  ]);

  return {
    items: items.map(mapBusinessUser),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function createBusinessUser(
  businessId: string,
  payload: CreateBusinessUserBody,
) {
  const outletIds = normalizeOutletIds(payload.outletIds ?? []);
  validateRoleOutletAccessRule(
    payload.businessRoleCode,
    payload.hasAllOutletAccess ?? false,
    outletIds,
  );

  return prisma.$transaction(async (tx) => {
    await ensureOutletsBelongToBusiness(tx, businessId, outletIds);

    if ((payload.status ?? BusinessUserStatus.ACTIVE) === BusinessUserStatus.ACTIVE) {
      await enforceBusinessUserLimit({
        reader: tx,
        businessId,
        blockedAction: 'CREATE_BUSINESS_USER',
      });
    }

    const role = await tx.businessRole.findUnique({
      where: {
        code: payload.businessRoleCode,
      },
    });

    if (!role) {
      throw buildHttpError(404, 'Business role tidak ditemukan');
    }

    const existingUser = await tx.user.findUnique({
      where: {
        email: payload.email,
      },
    });

    let userId: string;

    if (!existingUser) {
      const passwordHash = await bcrypt.hash(payload.password, 10);

      const createdUser = await tx.user.create({
        data: {
          fullName: payload.fullName,
          email: payload.email,
          passwordHash,
          status: UserStatus.ACTIVE,
        },
      });

      userId = createdUser.id;
    } else {
      const existingMembership = await tx.businessUser.findUnique({
        where: {
          businessId_userId: {
            businessId,
            userId: existingUser.id,
          },
        },
      });

      if (existingMembership) {
        throw buildHttpError(409, 'User sudah terdaftar pada business ini');
      }

      await tx.user.update({
        where: {
          id: existingUser.id,
        },
        data: {
          fullName: payload.fullName,
          email: payload.email,
        },
      });

      userId = existingUser.id;
    }

    const createdMembership = await tx.businessUser.create({
      data: {
        businessId,
        userId,
        businessRoleId: role.id,
        status: payload.status ?? BusinessUserStatus.ACTIVE,
        hasAllOutletAccess:
          payload.businessRoleCode === BusinessRoleCode.OWNER
            ? true
            : (payload.hasAllOutletAccess ?? false),
        isPrimary: false,
      },
    });

    await replaceOutletAccess(
      tx,
      createdMembership.id,
      payload.businessRoleCode === BusinessRoleCode.OWNER ? [] : outletIds,
    );

    const freshMembership = await tx.businessUser.findUnique({
      where: {
        id: createdMembership.id,
      },
      include: {
        user: true,
        businessRole: {
          include: {
            rolePermissions: {
              include: {
                businessPermission: true,
              },
            },
          },
        },
        outletAccesses: {
          include: {
            outlet: true,
          },
          orderBy: {
            outlet: {
              name: 'asc',
            },
          },
        },
      },
    });

    if (!freshMembership) {
      throw buildHttpError(500, 'Gagal mengambil data business user yang baru dibuat');
    }

    return mapBusinessUser(freshMembership);
  });
}

export async function getBusinessUserDetail(
  businessId: string,
  businessUserId: string,
) {
  const businessUser = await getMembershipOrThrow(businessId, businessUserId);
  return mapBusinessUser(businessUser);
}

export async function updateBusinessUser(
  businessId: string,
  businessUserId: string,
  payload: UpdateBusinessUserBody,
) {
  const outletIds = normalizeOutletIds(payload.outletIds ?? []);
  validateRoleOutletAccessRule(
    payload.businessRoleCode,
    payload.hasAllOutletAccess ?? false,
    outletIds,
  );

  return prisma.$transaction(async (tx) => {
    const currentMembership = await tx.businessUser.findFirst({
      where: {
        id: businessUserId,
        businessId,
      },
      include: {
        user: true,
        businessRole: true,
      },
    });

    if (!currentMembership) {
      throw buildHttpError(404, 'Business user tidak ditemukan');
    }

    if (
      currentMembership.status !== BusinessUserStatus.ACTIVE &&
      payload.status === BusinessUserStatus.ACTIVE
    ) {
      await enforceBusinessUserLimit({
        reader: tx,
        businessId,
        blockedAction: 'ACTIVATE_BUSINESS_USER',
      });
    }

    if (currentMembership.isPrimary && payload.businessRoleCode !== BusinessRoleCode.OWNER) {
      throw buildHttpError(400, 'Primary owner tidak boleh diubah ke role selain OWNER');
    }

    await ensureOutletsBelongToBusiness(tx, businessId, outletIds);

    const role = await tx.businessRole.findUnique({
      where: {
        code: payload.businessRoleCode,
      },
    });

    if (!role) {
      throw buildHttpError(404, 'Business role tidak ditemukan');
    }

    const emailOwner = await tx.user.findUnique({
      where: {
        email: payload.email,
      },
    });

    if (emailOwner && emailOwner.id !== currentMembership.userId) {
      const duplicateMembership = await tx.businessUser.findUnique({
        where: {
          businessId_userId: {
            businessId,
            userId: emailOwner.id,
          },
        },
      });

      if (duplicateMembership) {
        throw buildHttpError(
          409,
          'Email tersebut sudah dipakai oleh business user lain pada business ini',
        );
      }
    }

    await tx.user.update({
      where: {
        id: currentMembership.userId,
      },
      data: {
        fullName: payload.fullName,
        email: payload.email,
      },
    });

    await tx.businessUser.update({
      where: {
        id: currentMembership.id,
      },
      data: {
        businessRoleId: role.id,
        status: payload.status,
        hasAllOutletAccess:
          payload.businessRoleCode === BusinessRoleCode.OWNER
            ? true
            : (payload.hasAllOutletAccess ?? false),
      },
    });

    await replaceOutletAccess(
      tx,
      currentMembership.id,
      payload.businessRoleCode === BusinessRoleCode.OWNER ? [] : outletIds,
    );

    const freshMembership = await tx.businessUser.findUnique({
      where: {
        id: currentMembership.id,
      },
      include: {
        user: true,
        businessRole: {
          include: {
            rolePermissions: {
              include: {
                businessPermission: true,
              },
            },
          },
        },
        outletAccesses: {
          include: {
            outlet: true,
          },
          orderBy: {
            outlet: {
              name: 'asc',
            },
          },
        },
      },
    });

    if (!freshMembership) {
      throw buildHttpError(500, 'Gagal mengambil data business user setelah update');
    }

    return mapBusinessUser(freshMembership);
  });
}

export async function updateBusinessUserStatus(
  businessId: string,
  businessUserId: string,
  payload: UpdateBusinessUserStatusBody,
) {
  const currentMembership = await prisma.businessUser.findFirst({
    where: {
      id: businessUserId,
      businessId,
    },
  });

  if (!currentMembership) {
    throw buildHttpError(404, 'Business user tidak ditemukan');
  }

  if (currentMembership.isPrimary && payload.status === BusinessUserStatus.INACTIVE) {
    throw buildHttpError(400, 'Primary owner tidak boleh dinonaktifkan');
  }

  if (
    currentMembership.status !== BusinessUserStatus.ACTIVE &&
    payload.status === BusinessUserStatus.ACTIVE
  ) {
    await enforceBusinessUserLimit({
      businessId,
      blockedAction: 'ACTIVATE_BUSINESS_USER',
    });
  }

  const updated = await prisma.businessUser.update({
    where: {
      id: currentMembership.id,
    },
    include: {
      user: true,
      businessRole: {
        include: {
          rolePermissions: {
            include: {
              businessPermission: true,
            },
          },
        },
      },
      outletAccesses: {
        include: {
          outlet: true,
        },
        orderBy: {
          outlet: {
            name: 'asc',
          },
        },
      },
    },
    data: {
      status: payload.status,
    },
  });

  return mapBusinessUser(updated);
}

export async function getBusinessUserOutletAccess(
  businessId: string,
  businessUserId: string,
) {
  const businessUser = await getMembershipOrThrow(businessId, businessUserId);

  return {
    businessUserId: businessUser.id,
    businessId: businessUser.businessId,
    role: {
      id: businessUser.businessRole.id,
      code: businessUser.businessRole.code,
      name: businessUser.businessRole.name,
    },
    hasAllOutletAccess: businessUser.hasAllOutletAccess,
    outletAccesses: businessUser.outletAccesses.map((access) => ({
      id: access.id,
      outletId: access.outlet.id,
      outletName: access.outlet.name,
      outletCode: access.outlet.code,
      outletStatus: access.outlet.status,
    })),
  };
}

export async function updateBusinessUserOutletAccess(
  businessId: string,
  businessUserId: string,
  payload: UpdateBusinessUserOutletAccessBody,
) {
  const outletIds = normalizeOutletIds(payload.outletIds ?? []);

  return prisma.$transaction(async (tx) => {
    const currentMembership = await tx.businessUser.findFirst({
      where: {
        id: businessUserId,
        businessId,
      },
      include: {
        businessRole: true,
      },
    });

    if (!currentMembership) {
      throw buildHttpError(404, 'Business user tidak ditemukan');
    }

    validateRoleOutletAccessRule(
      currentMembership.businessRole.code,
      payload.hasAllOutletAccess ?? false,
      outletIds,
    );

    await ensureOutletsBelongToBusiness(tx, businessId, outletIds);

    const updatedMembership = await tx.businessUser.update({
      where: {
        id: currentMembership.id,
      },
      data: {
        hasAllOutletAccess:
          currentMembership.businessRole.code === BusinessRoleCode.OWNER
            ? true
            : (payload.hasAllOutletAccess ?? false),
      },
    });

    await replaceOutletAccess(
      tx,
      currentMembership.id,
      currentMembership.businessRole.code === BusinessRoleCode.OWNER ? [] : outletIds,
    );

    const freshMembership = await tx.businessUser.findUnique({
      where: {
        id: updatedMembership.id,
      },
      include: {
        businessRole: true,
        outletAccesses: {
          include: {
            outlet: true,
          },
          orderBy: {
            outlet: {
              name: 'asc',
            },
          },
        },
      },
    });

    if (!freshMembership) {
      throw buildHttpError(500, 'Gagal mengambil outlet access setelah update');
    }

    return {
      businessUserId: freshMembership.id,
      businessId: freshMembership.businessId,
      role: {
        id: freshMembership.businessRole.id,
        code: freshMembership.businessRole.code,
        name: freshMembership.businessRole.name,
      },
      hasAllOutletAccess: freshMembership.hasAllOutletAccess,
      outletAccesses: freshMembership.outletAccesses.map((access) => ({
        id: access.id,
        outletId: access.outlet.id,
        outletName: access.outlet.name,
        outletCode: access.outlet.code,
        outletStatus: access.outlet.status,
      })),
    };
  });
}
