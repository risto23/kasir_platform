'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faBell,
  faBoxOpen,
  faChevronRight,
  faChartLine,
  faLayerGroup,
  faLocationDot,
  faPercent,
  faRightFromBracket,
  faShapes,
  faShop,
  faSliders,
  faStore,
  faTableCellsLarge,
  faUser,
  faUsers,
} from '@fortawesome/free-solid-svg-icons';

import { getActiveBusinessId, getCachedCurrentUser, logout } from '@/lib/auth';
import type { CurrentUser, BusinessMembership } from '@/types/auth';

type AppHeaderProps = {
  title?: string;
  subtitle?: string;
};

type PermissionLike = {
  code?: string;
};

type AccessProfileLike = {
  isSuperAdmin?: boolean;
  permissions?: Array<string | PermissionLike>;
  businessPermissions?: Array<string | PermissionLike>;
  platformPermissions?: Array<string | PermissionLike>;
  defaultBusinessMembership?: BusinessMembership | null;
  memberships?: BusinessMembership[];
};

type MobileNavItem = {
  href: string;
  label: string;
  icon: IconDefinition;
  requiredPermissions?: string[];
  platformOnly?: boolean;
  businessOnly?: boolean;
  restaurantOnly?: boolean;
  requireOutletScope?: boolean;
};

const mobileNavItems: MobileNavItem[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: faChartLine,
  },
  {
    href: '/dashboard/businesses',
    label: 'Businesses',
    icon: faShop,
    platformOnly: true,
  },
  {
    href: '/dashboard/business-types',
    label: 'Business Types',
    icon: faLayerGroup,
    platformOnly: true,
  },
  {
    href: '/dashboard/outlets',
    label: 'Outlets',
    icon: faLocationDot,
    requiredPermissions: ['OUTLET_VIEW'],
    businessOnly: true,
  },
  {
    href: '/dashboard/business-users',
    label: 'Business Users',
    icon: faUsers,
    requiredPermissions: ['BUSINESS_USER_VIEW'],
    businessOnly: true,
  },
  {
    href: '/dashboard/categories',
    label: 'Categories',
    icon: faShapes,
    requiredPermissions: ['CATEGORY_VIEW'],
    businessOnly: true,
  },
  {
    href: '/dashboard/products',
    label: 'Products / Menu',
    icon: faBoxOpen,
    requiredPermissions: ['PRODUCT_VIEW'],
    businessOnly: true,
  },
  {
    href: '/dashboard/product-outlet-settings',
    label: 'Outlet Pricing',
    icon: faSliders,
    requiredPermissions: ['PRODUCT_OUTLET_VIEW'],
    businessOnly: true,
    requireOutletScope: true,
  },
  {
    href: '/dashboard/outlet-tables',
    label: 'Outlet Tables',
    icon: faTableCellsLarge,
    requiredPermissions: ['OUTLET_TABLE_VIEW'],
    businessOnly: true,
    restaurantOnly: true,
    requireOutletScope: true,
  },
  {
    href: '/dashboard/promos',
    label: 'Promos',
    icon: faPercent,
    requiredPermissions: ['PROMO_VIEW'],
    businessOnly: true,
  },
];

function isMenuActive(pathname: string, href: string) {
  if (href === '/dashboard') {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function normalizePermissionList(
  values: Array<string | PermissionLike> | undefined
): string[] {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .map((item) => {
      if (typeof item === 'string') {
        return item;
      }

      if (item && typeof item.code === 'string') {
        return item.code;
      }

      return null;
    })
    .filter((item): item is string => Boolean(item));
}

function getPermissionCodes(user: CurrentUser | null): string[] {
  if (!user) {
    return [];
  }

  const accessProfile = (user.accessProfile || {}) as AccessProfileLike;

  const fromAccessProfile = normalizePermissionList(accessProfile.permissions);
  const fromBusinessPermissions = normalizePermissionList(
    accessProfile.businessPermissions
  );
  const fromPlatformPermissions = normalizePermissionList(
    accessProfile.platformPermissions
  );
  const fromDefaultMembership = Array.isArray(
    accessProfile.defaultBusinessMembership?.permissions
  )
    ? accessProfile.defaultBusinessMembership.permissions
    : [];
  const fromMemberships = Array.isArray(accessProfile.memberships)
    ? accessProfile.memberships.flatMap((membership) =>
        Array.isArray(membership.permissions) ? membership.permissions : []
      )
    : [];
  const fromUserMemberships = Array.isArray(user.businessMemberships)
    ? user.businessMemberships.flatMap((membership) =>
        Array.isArray(membership.permissions) ? membership.permissions : []
      )
    : [];

  return Array.from(
    new Set([
      ...fromAccessProfile,
      ...fromBusinessPermissions,
      ...fromPlatformPermissions,
      ...fromDefaultMembership,
      ...fromMemberships,
      ...fromUserMemberships,
    ])
  );
}

function getActiveMembership(user: CurrentUser | null): BusinessMembership | null {
  if (!user) {
    return null;
  }

  const activeBusinessId = getActiveBusinessId();

  const matchedMembership = Array.isArray(user.businessMemberships)
    ? user.businessMemberships.find(
        (item) => item.businessId === activeBusinessId && item.status === 'ACTIVE'
      )
    : null;

  if (matchedMembership) {
    return matchedMembership;
  }

  const defaultMembership = user.accessProfile?.defaultBusinessMembership;

  if (defaultMembership?.status === 'ACTIVE') {
    return defaultMembership;
  }

  const firstActiveMembership = Array.isArray(user.businessMemberships)
    ? user.businessMemberships.find((item) => item.status === 'ACTIVE')
    : null;

  return firstActiveMembership ?? null;
}

function getBusinessType(user: CurrentUser | null): 'RESTAURANT' | 'RETAIL' | null {
  const membership = getActiveMembership(user);

  if (membership?.businessType === 'RESTAURANT') {
    return 'RESTAURANT';
  }

  if (membership?.businessType === 'RETAIL') {
    return 'RETAIL';
  }

  return null;
}

function getPrimaryRoleLabel(user: CurrentUser | null) {
  if (!user) {
    return 'User';
  }

  const membership = getActiveMembership(user);

  if (user.accessProfile?.isSuperAdmin) {
    if (membership?.role) {
      return `Super Admin • ${membership.role}`;
    }

    return 'Super Admin';
  }

  if (membership?.role) {
    return membership.role;
  }

  return 'User';
}

function hasOutletScope(user: CurrentUser | null): boolean {
  const membership = getActiveMembership(user);

  if (!membership || membership.status !== 'ACTIVE') {
    return false;
  }

  if (membership.hasAllOutletAccess) {
    return true;
  }

  return Array.isArray(membership.allowedOutletIds) && membership.allowedOutletIds.length > 0;
}

function getOutletScopeLabel(user: CurrentUser | null): string {
  const membership = getActiveMembership(user);

  if (!membership || membership.status !== 'ACTIVE') {
    return 'Belum ada scope';
  }

  if (membership.hasAllOutletAccess) {
    return 'Semua outlet';
  }

  const total = Array.isArray(membership.allowedOutletIds)
    ? membership.allowedOutletIds.length
    : 0;

  if (total > 0) {
    return `${total} outlet`;
  }

  return '0 outlet';
}

export function AppHeader({
  title = 'Dashboard',
  subtitle = 'Kelola POS Platform dengan tampilan yang rapi dan konsisten.',
}: AppHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();

  const currentUser = useMemo(() => getCachedCurrentUser(), []);
  const accessProfile = (currentUser?.accessProfile || {}) as AccessProfileLike;
  const activeMembership = useMemo(() => getActiveMembership(currentUser), [currentUser]);
  const isSuperAdmin = Boolean(accessProfile.isSuperAdmin);
  const permissionCodes = useMemo(() => getPermissionCodes(currentUser), [currentUser]);
  const businessType = useMemo(() => getBusinessType(currentUser), [currentUser]);
  const roleLabel = useMemo(() => getPrimaryRoleLabel(currentUser), [currentUser]);
  const hasBusinessContext = Boolean(activeMembership);
  const outletScopeAvailable = useMemo(() => hasOutletScope(currentUser), [currentUser]);
  const outletScopeLabel = useMemo(() => getOutletScopeLabel(currentUser), [currentUser]);

  const filteredMobileNavItems = useMemo(() => {
    return mobileNavItems.filter((item) => {
      if (item.platformOnly && !isSuperAdmin) {
        return false;
      }

      if (item.businessOnly && !hasBusinessContext) {
        return false;
      }

      if (item.restaurantOnly && businessType !== 'RESTAURANT') {
        return false;
      }

      if (item.requireOutletScope && !isSuperAdmin && !outletScopeAvailable) {
        return false;
      }

      if (!item.requiredPermissions || item.requiredPermissions.length === 0) {
        return true;
      }

      if (isSuperAdmin && item.platformOnly) {
        return true;
      }

      if (isSuperAdmin && item.businessOnly && hasBusinessContext) {
        return true;
      }

      return item.requiredPermissions.some((permission) =>
        permissionCodes.includes(permission)
      );
    });
  }, [
    businessType,
    hasBusinessContext,
    isSuperAdmin,
    outletScopeAvailable,
    permissionCodes,
  ]);

  function handleLogout() {
    logout();
    router.replace('/login');
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="flex min-h-[72px] items-center justify-between gap-4 px-4 sm:px-6">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-indigo-600">
            POS Platform
          </p>
          <h1 className="truncate text-lg font-semibold text-slate-900 sm:text-xl">
            {title}
          </h1>
          <p className="hidden truncate text-sm text-slate-500 sm:block">
            {subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50"
            aria-label="Notifications"
          >
            <FontAwesomeIcon icon={faBell} className="h-4 w-4" />
          </button>

          <div className="hidden items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 sm:flex">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
              <FontAwesomeIcon icon={faUser} className="h-4 w-4" />
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">
                {currentUser?.fullName || currentUser?.email || 'User'}
              </p>
              <p className="truncate text-xs text-slate-500">{roleLabel}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            aria-label="Logout"
          >
            <FontAwesomeIcon icon={faRightFromBracket} className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>

      <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-white px-3 py-1 font-medium text-slate-700 ring-1 ring-slate-200">
            {businessType === 'RESTAURANT'
              ? 'Business Type: RESTAURANT'
              : businessType === 'RETAIL'
                ? 'Business Type: RETAIL'
                : 'Business Type: -'}
          </span>

          <span className="rounded-full bg-white px-3 py-1 font-medium text-slate-700 ring-1 ring-slate-200">
            Business Context: {hasBusinessContext ? 'Active' : 'Belum dipilih'}
          </span>

          <span className="rounded-full bg-white px-3 py-1 font-medium text-slate-700 ring-1 ring-slate-200">
            Outlet Scope: {outletScopeLabel}
          </span>
        </div>
      </div>

      <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-3 sm:px-6 lg:hidden">
        <div className="mb-3 flex items-center gap-2 text-xs text-slate-500">
          <FontAwesomeIcon icon={faStore} className="h-3.5 w-3.5" />
          <span>
            Navigasi cepat untuk modul fase 3, termasuk category, product, promo, pricing, dan meja outlet restaurant.
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {filteredMobileNavItems.map((item) => {
            const active = isMenuActive(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between rounded-2xl border px-3 py-3 text-sm transition ${
                  active
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                      active
                        ? 'bg-white/15 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <FontAwesomeIcon icon={item.icon} className="h-4 w-4" />
                  </span>
                  <span className="font-medium">{item.label}</span>
                </div>

                <span className={active ? 'text-white/80' : 'text-slate-400'}>
                  <FontAwesomeIcon icon={faChevronRight} className="h-3 w-3" />
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}