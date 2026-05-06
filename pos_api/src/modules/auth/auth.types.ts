import {
  BusinessPermissionCode,
  BusinessRoleCode,
  BusinessType,
  PlatformRoleCode,
  UserStatus,
} from '@prisma/client';

export type AuthUserPayload = {
  userId: string;
  email: string;
  platformRoles?: PlatformRoleCode[];
};

export type BusinessMembershipAccess = {
  businessUserId: string;
  businessId: string;
  businessName: string;
  businessType: BusinessType;
  role: BusinessRoleCode;
  status: 'ACTIVE' | 'INACTIVE';
  isPrimary: boolean;
  hasAllOutletAccess: boolean;
  allowedOutletIds: string[];
  permissions: BusinessPermissionCode[];
};

export type UserAccessProfile = {
  isSuperAdmin: boolean;
  isBusinessUser: boolean;
  accessScope: 'PLATFORM' | 'BUSINESS' | 'HYBRID' | 'NONE';
  defaultBusinessMembership: BusinessMembershipAccess | null;
};

export type AuthUserResponse = {
  id: string;
  fullName: string;
  email: string;
  status: UserStatus;
  lastLoginAt?: Date | null;
  platformRoles: PlatformRoleCode[];
  businessMemberships: BusinessMembershipAccess[];
  accessProfile: UserAccessProfile;
};

export type AuthLoginResponse = {
  accessToken: string;
  user: AuthUserResponse;
};

export type RequestBusinessAccess = {
  businessUserId: string;
  businessId: string;
  businessName: string;
  businessType: BusinessType;
  role: BusinessRoleCode;
  status: 'ACTIVE' | 'INACTIVE';
  isPrimary: boolean;
  hasAllOutletAccess: boolean;
  allowedOutletIds: string[];
  permissions: BusinessPermissionCode[];
};

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthUserPayload;
      businessAccess?: RequestBusinessAccess;
    }
  }
}