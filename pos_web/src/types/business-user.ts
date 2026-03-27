export type ApiListMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type BusinessUserStatus = 'ACTIVE' | 'INACTIVE';

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
  | 'OUTLET_STATUS_UPDATE';

export type BusinessRoleCode =
  | 'OWNER'
  | 'ADMIN'
  | 'CASHIER'
  | 'KITCHEN'
  | 'INVENTORY';

export type BusinessRoleItem = {
  id: string;
  code: BusinessRoleCode;
  name: string;
  description: string | null;
};

export type OutletItem = {
  id: string;
  name: string;
  code: string;
  address: string | null;
  phone: string | null;
  status?: 'ACTIVE' | 'INACTIVE';
};

export type BusinessUserListItem = {
  id: string;
  businessId: string;
  userId: string;
  businessRoleId: string;
  status: BusinessUserStatus;
  isPrimary: boolean;
  hasAllOutletAccess: boolean;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    status?: 'ACTIVE' | 'INACTIVE';
  };
  businessRole: BusinessRoleItem;
  outletAccesses?: Array<{
    id: string;
    outletId: string;
    outlet?: OutletItem;
  }>;
};

export type BusinessUserDetail = BusinessUserListItem;

export type BusinessUserOutletAccessDetail = {
  businessUserId: string;
  hasAllOutletAccess: boolean;
  outlets: OutletItem[];
  selectedOutletIds: string[];
};

export type BusinessUserCreatePayload = {
  fullName: string;
  email: string;
  password: string;
  businessRoleId: string;
};

export type BusinessUserUpdatePayload = {
  fullName: string;
  email: string;
  businessRoleId: string;
};

export type BusinessUserStatusPayload = {
  status: BusinessUserStatus;
};

export type BusinessUserOutletAccessPayload = {
  hasAllOutletAccess: boolean;
  outletIds: string[];
};

export type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
  meta?: ApiListMeta;
};

export type AuthUserContext = {
  userId?: string;
  fullName?: string;
  email?: string;
  platformRoles: string[];
  businessRoles: string[];
  permissions: string[];
  activeBusinessId: string | null;
};