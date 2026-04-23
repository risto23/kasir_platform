import { api } from './api';
import type {
  CurrentUser,
  LoginResponse,
  BusinessMembership,
  BusinessRoleCode,
} from '../types/auth';

const AUTH_USER_STORAGE_KEY = 'pos_current_user';
const ACTIVE_BUSINESS_ID_STORAGE_KEY = 'activeBusinessId';
const ACTIVE_OUTLET_ID_STORAGE_KEY = 'activeOutletId';
const LEGACY_TOKEN_STORAGE_KEY = 'pos_access_token';

function persistCurrentUser(user: CurrentUser | null) {
  if (typeof window === 'undefined' || !user) {
    return;
  }

  localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event('pos-current-user-updated'));
}

function clearActiveBusinessContext() {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.removeItem(ACTIVE_BUSINESS_ID_STORAGE_KEY);
}

function clearActiveOutletContext() {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.removeItem(ACTIVE_OUTLET_ID_STORAGE_KEY);
}

export function getActiveBusinessId(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return localStorage.getItem(ACTIVE_BUSINESS_ID_STORAGE_KEY);
}

export function setActiveBusinessId(businessId: string) {
  if (typeof window === 'undefined') {
    return;
  }

  const value = businessId.trim();

  if (!value) {
    return;
  }

  localStorage.setItem(ACTIVE_BUSINESS_ID_STORAGE_KEY, value);
}

export function getActiveOutletId(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return localStorage.getItem(ACTIVE_OUTLET_ID_STORAGE_KEY);
}

export function setActiveOutletId(outletId: string) {
  if (typeof window === 'undefined') {
    return;
  }

  const value = outletId.trim();

  if (!value) {
    return;
  }

  localStorage.setItem(ACTIVE_OUTLET_ID_STORAGE_KEY, value);
}

export function getCachedCurrentUser(): CurrentUser | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = localStorage.getItem(AUTH_USER_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as CurrentUser;
  } catch {
    return null;
  }
}

export function clearCachedCurrentUser() {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.removeItem(AUTH_USER_STORAGE_KEY);
  window.dispatchEvent(new Event('pos-current-user-updated'));
}

export function updateCachedBusinessName(
  businessId: string,
  businessName: string,
) {
  if (typeof window === 'undefined') {
    return;
  }

  const currentUser = getCachedCurrentUser();

  if (!currentUser) {
    return;
  }

  const nextMemberships = currentUser.businessMemberships.map((membership) =>
    membership.businessId === businessId
      ? {
          ...membership,
          businessName,
        }
      : membership,
  );

  const nextDefaultMembership =
    currentUser.accessProfile.defaultBusinessMembership?.businessId === businessId
      ? {
          ...currentUser.accessProfile.defaultBusinessMembership,
          businessName,
        }
      : currentUser.accessProfile.defaultBusinessMembership;

  persistCurrentUser({
    ...currentUser,
    businessMemberships: nextMemberships,
    accessProfile: {
      ...currentUser.accessProfile,
      defaultBusinessMembership: nextDefaultMembership ?? null,
    },
  });
}

export function updateCachedOutletName(outletId: string, outletName: string) {
  if (typeof window === 'undefined') {
    return;
  }

  const currentUser = getCachedCurrentUser() as
    | (CurrentUser & {
        businessMemberships: Array<
          BusinessMembership & {
            allowedOutlets?: Array<{
              outletId: string;
              outletName?: string | null;
              [key: string]: unknown;
            }>;
          }
        >;
        accessProfile: CurrentUser['accessProfile'] & {
          defaultBusinessMembership?: (BusinessMembership & {
            allowedOutlets?: Array<{
              outletId: string;
              outletName?: string | null;
              [key: string]: unknown;
            }>;
          }) | null;
        };
      })
    | null;

  if (!currentUser) {
    return;
  }

  const patchMembership = <T extends BusinessMembership & { allowedOutlets?: Array<{ outletId: string; outletName?: string | null; [key: string]: unknown }> }>(membership: T): T => ({
    ...membership,
    allowedOutlets: Array.isArray(membership.allowedOutlets)
      ? membership.allowedOutlets.map((outlet) =>
          outlet.outletId === outletId
            ? {
                ...outlet,
                outletName,
              }
            : outlet,
        )
      : membership.allowedOutlets,
  });

  persistCurrentUser({
    ...currentUser,
    businessMemberships: currentUser.businessMemberships.map(patchMembership),
    accessProfile: {
      ...currentUser.accessProfile,
      defaultBusinessMembership: currentUser.accessProfile.defaultBusinessMembership
        ? patchMembership(currentUser.accessProfile.defaultBusinessMembership)
        : null,
    },
  });
}

export function getDefaultBusinessMembership(
  user: CurrentUser | null | undefined
): BusinessMembership | null {
  if (!user) {
    return null;
  }

  if (user.accessProfile?.defaultBusinessMembership) {
    return user.accessProfile.defaultBusinessMembership;
  }

  const primaryMembership =
    user.businessMemberships.find((item) => item.isPrimary) ?? null;

  if (primaryMembership) {
    return primaryMembership;
  }

  return user.businessMemberships[0] ?? null;
}

export function getDefaultOutletId(
  membership: BusinessMembership | null | undefined
): string | null {
  if (!membership) {
    return null;
  }

  if (membership.allowedOutletIds.length > 0) {
    return membership.allowedOutletIds[0] ?? null;
  }

  return null;
}

export function applyDefaultAccessContext(user: CurrentUser | null | undefined) {
  const membership = getDefaultBusinessMembership(user);

  if (!membership) {
    clearActiveBusinessContext();
    clearActiveOutletContext();
    return;
  }

  setActiveBusinessId(membership.businessId);

  const outletId = getDefaultOutletId(membership);

  if (outletId) {
    setActiveOutletId(outletId);
  } else {
    clearActiveOutletContext();
  }
}

export function resolveRouteByRole(user: CurrentUser): string {
  if (user.accessProfile.isSuperAdmin) {
    return '/dashboard';
  }

  const membership = getDefaultBusinessMembership(user);

  if (!membership) {
    return '/login';
  }

  const role: BusinessRoleCode = membership.role;

  if (role === 'CASHIER') {
    return '/dashboard/pos';
  }

  if (role === 'KITCHEN') {
    return '/dashboard/kitchen';
  }

  if (role === 'INVENTORY') {
    return '/dashboard/inventory';
  }

  return '/dashboard/business';
}

export async function login(email: string, password: string) {
  const response = await api.post('/auth/login', { email, password });
  const data = response.data.data as LoginResponse;

  localStorage.removeItem(LEGACY_TOKEN_STORAGE_KEY);
  persistCurrentUser(data.user);
  applyDefaultAccessContext(data.user);

  return data;
}

export async function getMe() {
  const response = await api.get('/auth/me');
  const data = response.data.data as CurrentUser;

  persistCurrentUser(data);
  applyDefaultAccessContext(data);

  return data;
}

export function logout() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(LEGACY_TOKEN_STORAGE_KEY);
  }

  void api.post('/auth/logout').catch(() => undefined);
  clearCachedCurrentUser();
  clearActiveBusinessContext();
  clearActiveOutletContext();
}
