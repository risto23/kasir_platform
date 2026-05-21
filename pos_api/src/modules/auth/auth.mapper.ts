// pos_api/src/modules/auth/auth.mapper.ts
import {
  BusinessPermissionCode,
  BusinessRoleCode,
  BusinessType,
  PlatformRoleCode,
} from '@prisma/client';
import {
  BusinessMembershipAccess,
  UserAccessProfile,
} from './auth.types';

type AuthUserWithAccessRelations = {
  platformRoles: Array<{
    platformRole: {
      code: PlatformRoleCode;
    };
  }>;
  businessUsers: Array<{
    id: string;
    status: 'ACTIVE' | 'INACTIVE';
    isPrimary: boolean;
    hasAllOutletAccess: boolean;
    business: {
      id: string;
      name: string;
      businessType: BusinessType;
      outlets: Array<{
        id: string;
        status: 'ACTIVE' | 'INACTIVE';
      }>;
    };
    businessRole: {
      code: BusinessRoleCode;
      rolePermissions: Array<{
        businessPermission: {
          code: BusinessPermissionCode;
        };
      }>;
    };
    outletAccesses: Array<{
      outlet: {
        id: string;
        name: string;
        code: string;
        status: 'ACTIVE' | 'INACTIVE';
      };
    }>;
  }>;
};

function dedupePermissions(
  permissions: BusinessPermissionCode[],
): BusinessPermissionCode[] {
  return Array.from(new Set(permissions));
}

function dedupeOutletIds(outletIds: string[]): string[] {
  return Array.from(new Set(outletIds));
}

function mapAllowedOutletIds(membership: AuthUserWithAccessRelations['businessUsers'][number]): string[] {
  const allActiveOutletIds = membership.business.outlets
    .filter((outlet) => outlet.status === 'ACTIVE')
    .map((outlet) => outlet.id);

  if (
    membership.businessRole.code === BusinessRoleCode.OWNER ||
    membership.hasAllOutletAccess
  ) {
    return dedupeOutletIds(allActiveOutletIds);
  }

  const scopedOutletIds = membership.outletAccesses
    .filter((item) => item.outlet.status === 'ACTIVE')
    .map((item) => item.outlet.id);

  return dedupeOutletIds(scopedOutletIds);
}

export function mapBusinessMembership(
  membership: AuthUserWithAccessRelations['businessUsers'][number],
): BusinessMembershipAccess {
  const permissions = dedupePermissions(
    membership.businessRole.rolePermissions.map(
      (item) => item.businessPermission.code,
    ),
  );

  const allowedOutletIds = mapAllowedOutletIds(membership);

  const allowedOutlets = membership.outletAccesses
    .filter((item) => item.outlet.status === 'ACTIVE')
    .map((item) => ({
      id: item.outlet.id,
      name: item.outlet.name,
      code: item.outlet.code,
    }));

  return {
    businessUserId: membership.id,
    businessId: membership.business.id,
    businessName: membership.business.name,
    businessType: membership.business.businessType,
    role: membership.businessRole.code,
    status: membership.status,
    isPrimary: membership.isPrimary,
    hasAllOutletAccess:
      membership.businessRole.code === BusinessRoleCode.OWNER
        ? true
        : membership.hasAllOutletAccess,
    allowedOutletIds,
    allowedOutlets,
    permissions,
  };
}

export function mapBusinessMemberships(
  user: AuthUserWithAccessRelations,
): BusinessMembershipAccess[] {
  return user.businessUsers.map(mapBusinessMembership);
}

export function buildAccessProfile(user: AuthUserWithAccessRelations): UserAccessProfile {
  const platformRoleCodes = user.platformRoles.map((item) => item.platformRole.code);
  const isSuperAdmin = platformRoleCodes.includes(PlatformRoleCode.SUPER_ADMIN);

  const activeBusinessMemberships = mapBusinessMemberships(user).filter(
    (item) => item.status === 'ACTIVE',
  );

  const isBusinessUser = activeBusinessMemberships.length > 0;

  let accessScope: UserAccessProfile['accessScope'] = 'NONE';

  if (isSuperAdmin && isBusinessUser) {
    accessScope = 'HYBRID';
  } else if (isSuperAdmin) {
    accessScope = 'PLATFORM';
  } else if (isBusinessUser) {
    accessScope = 'BUSINESS';
  }

  const primaryMembership =
    activeBusinessMemberships.find((item) => item.isPrimary) ??
    activeBusinessMemberships[0] ??
    null;

  return {
    isSuperAdmin,
    isBusinessUser,
    accessScope,
    defaultBusinessMembership: primaryMembership,
  };
}