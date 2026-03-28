export type BusinessRoleCode =
  | 'OWNER'
  | 'ADMIN'
  | 'CASHIER'
  | 'KITCHEN'
  | 'INVENTORY';

export type BusinessPermissionCode =
  | 'BUSINESS_ROLE_VIEW'
  | 'BUSINESS_PERMISSION_VIEW'
  | 'BUSINESS_USER_VIEW'
  | 'BUSINESS_USER_CREATE'
  | 'BUSINESS_USER_UPDATE'
  | 'BUSINESS_USER_STATUS_UPDATE'
  | 'BUSINESS_USER_ASSIGN_OUTLET'
  | 'OUTLET_SCOPE_VIEW'
  | 'OUTLET_VIEW'
  | 'OUTLET_CREATE'
  | 'OUTLET_UPDATE'
  | 'OUTLET_STATUS_UPDATE'
  | 'CATEGORY_VIEW'
  | 'CATEGORY_CREATE'
  | 'CATEGORY_UPDATE'
  | 'CATEGORY_STATUS_UPDATE'
  | 'PRODUCT_VIEW'
  | 'PRODUCT_CREATE'
  | 'PRODUCT_UPDATE'
  | 'PRODUCT_STATUS_UPDATE'
  | 'PRODUCT_OUTLET_VIEW'
  | 'PRODUCT_OUTLET_UPDATE'
  | 'OUTLET_TABLE_VIEW'
  | 'OUTLET_TABLE_CREATE'
  | 'OUTLET_TABLE_UPDATE'
  | 'OUTLET_TABLE_STATUS_UPDATE';

export type BusinessMembership = {
  businessUserId: string;
  businessId: string;
  businessName: string;
  businessType: 'RESTAURANT' | 'RETAIL';
  role: BusinessRoleCode;
  status: 'ACTIVE' | 'INACTIVE';
  isPrimary: boolean;
  hasAllOutletAccess: boolean;
  allowedOutletIds: string[];
  permissions: BusinessPermissionCode[];
};

export type AccessProfile = {
  isSuperAdmin: boolean;
  isBusinessUser: boolean;
  accessScope: 'PLATFORM' | 'BUSINESS' | 'HYBRID' | 'NONE';
  defaultBusinessMembership: BusinessMembership | null;
};

export type CurrentUser = {
  id: string;
  fullName: string;
  email: string;
  status: 'ACTIVE' | 'INACTIVE';
  lastLoginAt?: string | null;
  platformRoles: Array<'SUPER_ADMIN'>;
  businessMemberships: BusinessMembership[];
  accessProfile: AccessProfile;
};

export type LoginResponse = {
  accessToken: string;
  user: CurrentUser;
};