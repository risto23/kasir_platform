export type BusinessMembership = {
  businessId: string;
  businessName: string;
  businessType: 'RESTAURANT' | 'RETAIL';
  role: 'OWNER' | 'ADMIN' | 'CASHIER' | 'KITCHEN' | 'INVENTORY';
  isPrimary: boolean;
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