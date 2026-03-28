'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faBoxOpen,
  faChartLine,
  faChevronRight,
  faLayerGroup,
  faLocationDot,
  faPercent,
  faShapes,
  faShop,
  faSliders,
  faStore,
  faTableCellsLarge,
  faUsers,
} from '@fortawesome/free-solid-svg-icons';

import { getActiveBusinessId, getCachedCurrentUser } from '@/lib/auth';
import type { CurrentUser, BusinessMembership } from '@/types/auth';

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

type MenuItem = {
  href: string;
  label: string;
  icon: IconDefinition;
  requiredPermissions?: string[];
  platformOnly?: boolean;
  businessOnly?: boolean;
  restaurantOnly?: boolean;
  requireOutletScope?: boolean;
};

type MenuGroup = {
  section: string;
  items: MenuItem[];
};

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

const menuGroups: MenuGroup[] = [
  {
    section: 'Overview',
    items: [
      {
        href: '/dashboard',
        label: 'Dashboard',
        icon: faChartLine,
      },
    ],
  },
  {
    section: 'Platform',
    items: [
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
    ],
  },
  {
    section: 'Business Management',
    items: [
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
    ],
  },
  {
    section: 'Master Data',
    items: [
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
        label: 'Outlet Pricing & Availability',
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
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();

  const currentUser = useMemo(() => getCachedCurrentUser(), []);
  const accessProfile = (currentUser?.accessProfile || {}) as AccessProfileLike;
  const activeMembership = useMemo(() => getActiveMembership(currentUser), [currentUser]);
  const isSuperAdmin = Boolean(accessProfile.isSuperAdmin);
  const permissionCodes = useMemo(() => getPermissionCodes(currentUser), [currentUser]);
  const businessType = useMemo(() => getBusinessType(currentUser), [currentUser]);
  const hasBusinessContext = Boolean(activeMembership);
  const outletScopeAvailable = useMemo(() => hasOutletScope(currentUser), [currentUser]);

  const filteredMenus = useMemo(() => {
    return menuGroups
      .map((group) => {
        const items = group.items.filter((item) => {
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

        return {
          ...group,
          items,
        };
      })
      .filter((group) => group.items.length > 0);
  }, [
    businessType,
    hasBusinessContext,
    isSuperAdmin,
    outletScopeAvailable,
    permissionCodes,
  ]);

  return (
    <aside className="hidden w-72 shrink-0 border-r border-slate-200 bg-white/95 lg:flex lg:flex-col">
      <div className="border-b border-slate-200 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
            <FontAwesomeIcon icon={faStore} className="h-4 w-4" />
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-indigo-600">
              POS Platform
            </p>
            <h2 className="text-base font-semibold text-slate-900">
              Admin Panel
            </h2>
          </div>
        </div>

        <p className="mt-4 text-xs leading-6 text-slate-500">
          Fase 3 management untuk category, product, outlet pricing, promo, dan meja outlet restoran.
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-5">
        <div className="space-y-6">
          {filteredMenus.map((group) => (
            <div key={group.section}>
              <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                {group.section}
              </p>

              <div className="space-y-1.5">
                {group.items.map((menu) => {
                  const active = isMenuActive(pathname, menu.href);

                  return (
                    <Link
                      key={menu.href}
                      href={menu.href}
                      className={`group flex items-center justify-between rounded-2xl px-3 py-3 text-sm transition ${
                        active
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${
                            active
                              ? 'bg-white/15 text-white'
                              : 'bg-slate-100 text-slate-600 group-hover:bg-white'
                          }`}
                        >
                          <FontAwesomeIcon icon={menu.icon} className="h-4 w-4" />
                        </span>

                        <span className="font-medium">{menu.label}</span>
                      </div>

                      <span
                        className={`transition ${
                          active
                            ? 'text-white/80'
                            : 'text-slate-300 group-hover:text-slate-500'
                        }`}
                      >
                        <FontAwesomeIcon icon={faChevronRight} className="h-3 w-3" />
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>

      <div className="border-t border-slate-200 px-4 py-4">
        <div className="rounded-2xl bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold text-slate-700">Current Scope</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {businessType === 'RESTAURANT'
              ? outletScopeAvailable
                ? 'Business type restaurant aktif. Modul meja outlet, promo, dan pricing tampil sesuai permission serta scope outlet.'
                : 'Business type restaurant aktif, tetapi scope outlet belum tersedia.'
              : businessType === 'RETAIL'
                ? outletScopeAvailable
                  ? 'Business type retail aktif. Modul meja outlet disembunyikan, promo dan pricing tampil sesuai permission dan scope outlet.'
                  : 'Business type retail aktif. Modul meja outlet disembunyikan, promo tetap mengikuti permission business.'
                : 'Pilih business aktif untuk menampilkan modul business-level dengan benar.'}
          </p>
        </div>
      </div>
    </aside>
  );
}