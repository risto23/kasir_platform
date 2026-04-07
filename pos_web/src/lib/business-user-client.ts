'use client';

import { api } from '@/lib/api';
import { getActiveBusinessId } from '@/lib/auth';
import type {
  ApiEnvelope,
  AuthUserContext,
  BusinessRoleCode,
  BusinessRoleItem,
  BusinessUserCreatePayload,
  BusinessUserDetail,
  BusinessUserListItem,
  BusinessUserOutletAccessDetail,
  BusinessUserOutletAccessPayload,
  BusinessUserStatusPayload,
  BusinessUserUpdatePayload,
  OutletItem,
} from '@/types/business-user';

const VALID_BUSINESS_ROLE_CODES: BusinessRoleCode[] = [
  'OWNER',
  'ADMIN',
  'CASHIER',
  'KITCHEN',
  'INVENTORY',
];

function normalizeStringArray(values: unknown): string[] {
  if (!Array.isArray(values)) {
    return [];
  }

  return values.filter((item): item is string => typeof item === 'string');
}

function extractPermissionsFromMemberships(memberships: unknown): string[] {
  if (!Array.isArray(memberships)) {
    return [];
  }

  const permissions = memberships.flatMap((membership) => {
    if (!membership || typeof membership !== 'object') {
      return [];
    }

    return normalizeStringArray((membership as Record<string, unknown>).permissions);
  });

  return Array.from(new Set(permissions));
}

function extractBusinessRolesFromMemberships(memberships: unknown): string[] {
  if (!Array.isArray(memberships)) {
    return [];
  }

  const roles = memberships
    .map((membership) => {
      if (!membership || typeof membership !== 'object') {
        return null;
      }

      const role = (membership as Record<string, unknown>).role;
      return typeof role === 'string' ? role : null;
    })
    .filter((item): item is string => Boolean(item));

  return Array.from(new Set(roles));
}

function extractActiveBusinessIdFromAuthPayload(data: unknown): string | null {
  if (!data || typeof data !== 'object') {
    return getActiveBusinessId();
  }

  const record = data as Record<string, unknown>;
  const accessProfile =
    record.accessProfile && typeof record.accessProfile === 'object'
      ? (record.accessProfile as Record<string, unknown>)
      : null;

  const defaultBusinessMembership =
    accessProfile?.defaultBusinessMembership &&
    typeof accessProfile.defaultBusinessMembership === 'object'
      ? (accessProfile.defaultBusinessMembership as Record<string, unknown>)
      : null;

  const directBusinessId =
    typeof record.activeBusinessId === 'string'
      ? record.activeBusinessId
      : typeof record.businessId === 'string'
        ? record.businessId
        : typeof defaultBusinessMembership?.businessId === 'string'
          ? defaultBusinessMembership.businessId
          : null;

  if (directBusinessId && directBusinessId.trim().length > 0) {
    return directBusinessId;
  }

  return getActiveBusinessId();
}

function buildAuthContextFromData(data: unknown): AuthUserContext {
  const record =
    data && typeof data === 'object' ? (data as Record<string, unknown>) : {};

  const platformRoles = normalizeStringArray(record.platformRoles);
  const businessMemberships = Array.isArray(record.businessMemberships)
    ? record.businessMemberships
    : [];

  const accessProfile =
    record.accessProfile && typeof record.accessProfile === 'object'
      ? (record.accessProfile as Record<string, unknown>)
      : null;

  const defaultBusinessMembership =
    accessProfile?.defaultBusinessMembership &&
    typeof accessProfile.defaultBusinessMembership === 'object'
      ? (accessProfile.defaultBusinessMembership as Record<string, unknown>)
      : null;

  const permissions = Array.from(
    new Set([
      ...extractPermissionsFromMemberships(businessMemberships),
      ...normalizeStringArray(accessProfile?.permissions),
      ...normalizeStringArray(defaultBusinessMembership?.permissions),
    ]),
  );

  return {
    userId: typeof record.id === 'string' ? record.id : undefined,
    fullName: typeof record.fullName === 'string' ? record.fullName : undefined,
    email: typeof record.email === 'string' ? record.email : undefined,
    platformRoles,
    businessRoles: extractBusinessRolesFromMemberships(businessMemberships),
    permissions,
    activeBusinessId: extractActiveBusinessIdFromAuthPayload(data),
  };
}

function getHeaders(businessId?: string | null) {
  const resolvedBusinessId = businessId ?? getActiveBusinessId();

  return resolvedBusinessId
    ? {
        'x-business-id': resolvedBusinessId,
      }
    : undefined;
}

function normalizeEnvelopeData<T>(payload: unknown): T {
  if (
    payload &&
    typeof payload === 'object' &&
    'data' in (payload as Record<string, unknown>)
  ) {
    return (payload as ApiEnvelope<T>).data;
  }

  return payload as T;
}

function normalizeBusinessRoleCode(value: unknown): BusinessRoleCode {
  if (typeof value !== 'string') {
    return 'ADMIN';
  }

  const normalized = value.trim().toUpperCase();

  if (VALID_BUSINESS_ROLE_CODES.includes(normalized as BusinessRoleCode)) {
    return normalized as BusinessRoleCode;
  }

  return 'ADMIN';
}

function normalizeRole(raw: unknown, fallbackId?: string): BusinessRoleItem {
  const record =
    raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};

  const id =
    typeof record.id === 'string'
      ? record.id
      : typeof fallbackId === 'string'
        ? fallbackId
        : '';

  const code = normalizeBusinessRoleCode(
    typeof record.code === 'string'
      ? record.code
      : typeof record.roleCode === 'string'
        ? record.roleCode
        : typeof record.businessRoleCode === 'string'
          ? record.businessRoleCode
          : typeof record.role === 'string'
            ? record.role
            : typeof record.name === 'string'
              ? record.name.toUpperCase().replace(/\s+/g, '_')
              : 'ADMIN',
  );

  const name =
    typeof record.name === 'string'
      ? record.name
      : typeof record.roleName === 'string'
        ? record.roleName
        : typeof record.businessRoleName === 'string'
          ? record.businessRoleName
          : code;

  const description =
    typeof record.description === 'string' ? record.description : null;

  return {
    id,
    code,
    name,
    description,
  };
}

function normalizeOutlet(raw: unknown): OutletItem {
  const record =
    raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};

  return {
    id: typeof record.id === 'string' ? record.id : '',
    name: typeof record.name === 'string' ? record.name : '-',
    code: typeof record.code === 'string' ? record.code : '-',
    address: typeof record.address === 'string' ? record.address : null,
    phone: typeof record.phone === 'string' ? record.phone : null,
    status:
      record.status === 'ACTIVE' || record.status === 'INACTIVE'
        ? record.status
        : undefined,
  };
}

function normalizeUserSummary(raw: unknown): BusinessUserListItem['user'] {
  const record =
    raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};

  return {
    id: typeof record.id === 'string' ? record.id : '',
    fullName: typeof record.fullName === 'string' ? record.fullName : '-',
    email: typeof record.email === 'string' ? record.email : '-',
    status:
      record.status === 'ACTIVE' || record.status === 'INACTIVE'
        ? record.status
        : undefined,
  };
}

function buildFallbackOutlet(record: Record<string, unknown>): OutletItem {
  const fallbackStatus =
    record.outletStatus === 'ACTIVE' || record.outletStatus === 'INACTIVE'
      ? record.outletStatus
      : record.status === 'ACTIVE' || record.status === 'INACTIVE'
        ? record.status
        : undefined;

  return {
    id:
      typeof record.outletId === 'string'
        ? record.outletId
        : typeof record.id === 'string'
          ? record.id
          : '',
    name:
      typeof record.outletName === 'string'
        ? record.outletName
        : typeof record.name === 'string'
          ? record.name
          : '-',
    code:
      typeof record.outletCode === 'string'
        ? record.outletCode
        : typeof record.code === 'string'
          ? record.code
          : '-',
    address: typeof record.address === 'string' ? record.address : null,
    phone: typeof record.phone === 'string' ? record.phone : null,
    status: fallbackStatus,
  };
}

function normalizeOutletAccesses(
  raw: unknown,
): BusinessUserListItem['outletAccesses'] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.map((item) => {
    const record =
      item && typeof item === 'object' ? (item as Record<string, unknown>) : {};

    const outlet: OutletItem =
      record.outlet && typeof record.outlet === 'object'
        ? normalizeOutlet(record.outlet)
        : buildFallbackOutlet(record);

    return {
      id: typeof record.id === 'string' ? record.id : '',
      outletId:
        typeof record.outletId === 'string'
          ? record.outletId
          : outlet.id,
      outlet,
    };
  });
}

function normalizeBusinessUser(raw: unknown): BusinessUserListItem {
  const record =
    raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};

  const businessRoleId =
    typeof record.businessRoleId === 'string'
      ? record.businessRoleId
      : record.role && typeof record.role === 'object'
        ? typeof (record.role as Record<string, unknown>).id === 'string'
          ? ((record.role as Record<string, unknown>).id as string)
          : ''
        : '';

  const nestedBusinessRole =
    record.businessRole && typeof record.businessRole === 'object'
      ? record.businessRole
      : record.role && typeof record.role === 'object'
        ? record.role
        : {
            id: businessRoleId,
            code:
              typeof record.businessRoleCode === 'string'
                ? record.businessRoleCode
                : typeof record.roleCode === 'string'
                  ? record.roleCode
                  : typeof record.role === 'string'
                    ? record.role
                    : 'ADMIN',
            name:
              typeof record.businessRoleName === 'string'
                ? record.businessRoleName
                : typeof record.roleName === 'string'
                  ? record.roleName
                  : typeof record.role === 'string'
                    ? record.role
                    : 'Admin',
            description:
              typeof record.businessRoleDescription === 'string'
                ? record.businessRoleDescription
                : null,
          };

  return {
    id: typeof record.id === 'string' ? record.id : '',
    businessId: typeof record.businessId === 'string' ? record.businessId : '',
    userId: typeof record.userId === 'string' ? record.userId : '',
    businessRoleId,
    status: record.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
    isPrimary: Boolean(record.isPrimary),
    hasAllOutletAccess: Boolean(record.hasAllOutletAccess),
    createdAt: typeof record.createdAt === 'string' ? record.createdAt : '',
    updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : '',
    user: normalizeUserSummary(record.user),
    businessRole: normalizeRole(nestedBusinessRole, businessRoleId),
    outletAccesses: normalizeOutletAccesses(record.outletAccesses),
  };
}

function normalizeArrayData<T>(payload: unknown): T[] {
  const data = normalizeEnvelopeData<unknown>(payload);

  if (Array.isArray(data)) {
    return data as T[];
  }

  if (
    data &&
    typeof data === 'object' &&
    Array.isArray((data as Record<string, unknown>).items)
  ) {
    return (data as { items: T[] }).items;
  }

  return [];
}

function normalizeBusinessUsersArray(payload: unknown): BusinessUserListItem[] {
  return normalizeArrayData<unknown>(payload).map((item) => normalizeBusinessUser(item));
}

function normalizeOutletAccessDetail(
  raw: unknown,
  fallbackOutlets: OutletItem[],
): BusinessUserOutletAccessDetail {
  const record =
    raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};

  const selectedOutletIds =
    Array.isArray(record.selectedOutletIds)
      ? record.selectedOutletIds.filter(
          (item): item is string => typeof item === 'string',
        )
      : Array.isArray(record.outletIds)
        ? record.outletIds.filter(
            (item): item is string => typeof item === 'string',
          )
        : Array.isArray(record.outlets)
          ? record.outlets
              .map((item) => {
                if (!item || typeof item !== 'object') {
                  return null;
                }

                const outletRecord = item as Record<string, unknown>;

                if (typeof outletRecord.id === 'string') {
                  return outletRecord.id;
                }

                if (typeof outletRecord.outletId === 'string') {
                  return outletRecord.outletId;
                }

                if (
                  outletRecord.outlet &&
                  typeof outletRecord.outlet === 'object' &&
                  typeof (outletRecord.outlet as Record<string, unknown>).id ===
                    'string'
                ) {
                  return (outletRecord.outlet as Record<string, unknown>).id as string;
                }

                return null;
              })
              .filter((item): item is string => Boolean(item))
          : [];

  const outlets =
    Array.isArray(record.outlets) && record.outlets.length > 0
      ? (record.outlets as unknown[]).map((item) =>
          item &&
          typeof item === 'object' &&
          'outlet' in (item as Record<string, unknown>) &&
          (item as Record<string, unknown>).outlet
            ? normalizeOutlet((item as Record<string, unknown>).outlet)
            : normalizeOutlet(item),
        )
      : fallbackOutlets;

  return {
    businessUserId:
      typeof record.businessUserId === 'string'
        ? record.businessUserId
        : typeof record.id === 'string'
          ? record.id
          : '',
    hasAllOutletAccess: Boolean(record.hasAllOutletAccess),
    outlets,
    selectedOutletIds,
  };
}

export async function getAuthContext(): Promise<AuthUserContext> {
  const response = await api.get('/auth/me');
  const data = normalizeEnvelopeData<unknown>(response.data);

  return buildAuthContextFromData(data);
}

export async function getBusinessRoles(
  businessId?: string | null,
): Promise<BusinessRoleItem[]> {
  const response = await api.get('/business/roles', {
    headers: getHeaders(businessId),
  });

  return normalizeArrayData<unknown>(response.data).map((item) => normalizeRole(item));
}

export async function getOutlets(
  businessId?: string | null,
): Promise<OutletItem[]> {
  const response = await api.get('/business/outlets', {
    params: { status: 'ACTIVE' },
    headers: getHeaders(businessId),
  });

  return normalizeArrayData<unknown>(response.data).map((item) => normalizeOutlet(item));
}

export async function getBusinessUsers(
  businessId?: string | null,
): Promise<BusinessUserListItem[]> {
  const response = await api.get('/business-users', {
    headers: getHeaders(businessId),
  });

  return normalizeBusinessUsersArray(response.data);
}

export async function getBusinessUserDetail(
  businessUserId: string,
  businessId?: string | null,
): Promise<BusinessUserDetail> {
  const response = await api.get(`/business-users/${businessUserId}`, {
    headers: getHeaders(businessId),
  });

  return normalizeBusinessUser(normalizeEnvelopeData<unknown>(response.data)) as BusinessUserDetail;
}

export async function createBusinessUser(
  payload: BusinessUserCreatePayload,
  businessId?: string | null,
): Promise<BusinessUserDetail> {
  const response = await api.post('/business-users', payload, {
    headers: getHeaders(businessId),
  });

  return normalizeBusinessUser(normalizeEnvelopeData<unknown>(response.data)) as BusinessUserDetail;
}

export async function updateBusinessUser(
  businessUserId: string,
  payload: BusinessUserUpdatePayload,
  businessId?: string | null,
): Promise<BusinessUserDetail> {
  const response = await api.put(`/business-users/${businessUserId}`, payload, {
    headers: getHeaders(businessId),
  });

  return normalizeBusinessUser(normalizeEnvelopeData<unknown>(response.data)) as BusinessUserDetail;
}

export async function updateBusinessUserStatus(
  businessUserId: string,
  payload: BusinessUserStatusPayload,
  businessId?: string | null,
): Promise<BusinessUserDetail> {
  const response = await api.patch(
    `/business-users/${businessUserId}/status`,
    payload,
    {
      headers: getHeaders(businessId),
    },
  );

  return normalizeBusinessUser(normalizeEnvelopeData<unknown>(response.data)) as BusinessUserDetail;
}

export async function getBusinessUserOutletAccess(
  businessUserId: string,
  outlets: OutletItem[],
  businessId?: string | null,
): Promise<BusinessUserOutletAccessDetail> {
  const response = await api.get(`/business-users/${businessUserId}/outlet-access`, {
    headers: getHeaders(businessId),
  });

  return normalizeOutletAccessDetail(
    normalizeEnvelopeData<unknown>(response.data),
    outlets,
  );
}

export async function updateBusinessUserOutletAccess(
  businessUserId: string,
  payload: BusinessUserOutletAccessPayload,
  businessId?: string | null,
): Promise<BusinessUserOutletAccessDetail> {
  const response = await api.put(
    `/business-users/${businessUserId}/outlet-access`,
    payload,
    {
      headers: getHeaders(businessId),
    },
  );

  return normalizeOutletAccessDetail(
    normalizeEnvelopeData<unknown>(response.data),
    [],
  );
}