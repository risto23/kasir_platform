import { JwtPayloadUser } from './auth';
import {
  BusinessPermissionCode,
  BusinessRoleCode,
  BusinessType,
} from '@prisma/client';

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
      authUser?: JwtPayloadUser;
      businessAccess?: RequestBusinessAccess;
    }
  }
}

export {};