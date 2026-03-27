import { prisma } from '../../config/prisma';

export async function getBusinessRolesReference() {
  const roles = await prisma.businessRole.findMany({
    orderBy: { createdAt: 'asc' },
    include: {
      rolePermissions: {
        include: {
          businessPermission: true,
        },
        orderBy: {
          businessPermission: {
            code: 'asc',
          },
        },
      },
    },
  });

  return roles.map((role) => ({
    id: role.id,
    code: role.code,
    name: role.name,
    description: role.description,
    permissions: role.rolePermissions.map((item) => ({
      id: item.businessPermission.id,
      code: item.businessPermission.code,
      name: item.businessPermission.name,
      description: item.businessPermission.description,
    })),
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
  }));
}

export async function getBusinessPermissionsReference() {
  const permissions = await prisma.businessPermission.findMany({
    orderBy: { code: 'asc' },
  });

  return permissions.map((permission) => ({
    id: permission.id,
    code: permission.code,
    name: permission.name,
    description: permission.description,
    createdAt: permission.createdAt,
    updatedAt: permission.updatedAt,
  }));
}