import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faBoxOpen,
  faCashRegister,
  faChartLine,
  faClockRotateLeft,
  faLayerGroup,
  faLocationDot,
  faPercent,
  faQrcode,
  faReceipt,
  faShapes,
  faShop,
  faSliders,
  faTableCellsLarge,
  faUsers,
  faUtensils,
  faArrowDown,
  faArrowUp,
} from '@fortawesome/free-solid-svg-icons';

import { getActiveBusinessId } from '@/lib/auth';
import type { BusinessMembership, CurrentUser } from '@/types/auth';

type PermissionLike = { code?: string };

type AccessProfileLike = {
  isSuperAdmin?: boolean;
  permissions?: Array<string | PermissionLike>;
  businessPermissions?: Array<string | PermissionLike>;
  platformPermissions?: Array<string | PermissionLike>;
  defaultBusinessMembership?: BusinessMembership | null;
  memberships?: BusinessMembership[];
};

export type AppNavItem = {
  href: string;
  label: string;
  icon: IconDefinition;
  requiredPermissions?: string[];
  platformOnly?: boolean;
  businessOnly?: boolean;
  restaurantOnly?: boolean;
  requireOutletScope?: boolean;
  allowedRoles?: Array<'OWNER' | 'ADMIN' | 'CASHIER' | 'KITCHEN' | 'INVENTORY'>;
};

export type AppNavGroup = {
  section: string;
  items: AppNavItem[];
};

const protectedExactRoutes = [
  '/dashboard/pos',
  '/dashboard/pos/history',
  '/dashboard/payments',
  '/dashboard/kitchen',
  '/dashboard/tables/monitor',
  '/dashboard/tables/qr',
  '/dashboard/inventory',
  '/dashboard/reports',
];

export function isMenuActive(pathname: string, href: string) {
  if (href === '/dashboard') {
    return pathname === href;
  }

  if (pathname === href) {
    return true;
  }

  if (protectedExactRoutes.includes(href)) {
    return false;
  }

  return pathname.startsWith(`${href}/`);
}

function normalizePermissionList(values: Array<string | PermissionLike> | undefined): string[] {
  if (!Array.isArray(values)) return [];
  return values
    .map((item) => {
      if (typeof item === 'string') return item;
      if (item && typeof item.code === 'string') return item.code;
      return null;
    })
    .filter((item): item is string => Boolean(item));
}

function getPermissionCodes(user: CurrentUser | null): string[] {
  if (!user) return [];

  const accessProfile = (user.accessProfile || {}) as AccessProfileLike;

  const fromAccessProfile = normalizePermissionList(accessProfile.permissions);
  const fromBusinessPermissions = normalizePermissionList(accessProfile.businessPermissions);
  const fromPlatformPermissions = normalizePermissionList(accessProfile.platformPermissions);
  const fromDefaultMembership = Array.isArray(accessProfile.defaultBusinessMembership?.permissions)
    ? (accessProfile.defaultBusinessMembership?.permissions as string[])
    : [];
  const fromMemberships = Array.isArray(accessProfile.memberships)
    ? accessProfile.memberships.flatMap((m) => (Array.isArray(m.permissions) ? m.permissions : []))
    : [];
  const fromUserMemberships = Array.isArray(user.businessMemberships)
    ? user.businessMemberships.flatMap((m) => (Array.isArray(m.permissions) ? m.permissions : []))
    : [];

  return Array.from(
    new Set([
      ...fromAccessProfile,
      ...fromBusinessPermissions,
      ...fromPlatformPermissions,
      ...fromDefaultMembership,
      ...fromMemberships,
      ...fromUserMemberships,
    ]),
  );
}

function getActiveMembership(user: CurrentUser | null): BusinessMembership | null {
  if (!user) return null;

  const activeBusinessId = getActiveBusinessId();

  const matchedMembership = Array.isArray(user.businessMemberships)
    ? user.businessMemberships.find((item) => item.businessId === activeBusinessId && item.status === 'ACTIVE')
    : null;

  if (matchedMembership) return matchedMembership;

  const def = user.accessProfile?.defaultBusinessMembership;
  if (def?.status === 'ACTIVE') return def;

  const firstActive = Array.isArray(user.businessMemberships)
    ? user.businessMemberships.find((item) => item.status === 'ACTIVE')
    : null;

  return firstActive ?? null;
}

function getBusinessType(user: CurrentUser | null): 'RESTAURANT' | 'RETAIL' | null {
  const membership = getActiveMembership(user);
  if (membership?.businessType === 'RESTAURANT') return 'RESTAURANT';
  if (membership?.businessType === 'RETAIL') return 'RETAIL';
  return null;
}

function hasOutletScope(user: CurrentUser | null): boolean {
  const membership = getActiveMembership(user);
  if (!membership || membership.status !== 'ACTIVE') return false;
  if (membership.hasAllOutletAccess) return true;
  return Array.isArray(membership.allowedOutletIds) && membership.allowedOutletIds.length > 0;
}

const menuGroups: AppNavGroup[] = [
  {
    section: 'Business Master',
    items: [
      { href: '/dashboard/businesses', label: 'Businesses', icon: faShop, platformOnly: true },
      { href: '/dashboard/business-types', label: 'Business Types', icon: faLayerGroup, platformOnly: true },
      { href: '/dashboard/products', label: 'Products', icon: faShapes, requiredPermissions: ['PRODUCT_VIEW'], businessOnly: true },
      { href: '/dashboard/categories', label: 'Categories', icon: faBoxOpen, requiredPermissions: ['CATEGORY_VIEW'], businessOnly: true },
      { href: '/dashboard/promos', label: 'Promos', icon: faPercent, requiredPermissions: ['PROMO_VIEW'], businessOnly: true },
      { href: '/dashboard/outlets', label: 'Outlets', icon: faLocationDot, requiredPermissions: ['OUTLET_VIEW'], businessOnly: true },
      { href: '/dashboard/business-users', label: 'Business Users', icon: faUsers, requiredPermissions: ['BUSINESS_USER_VIEW'], businessOnly: true },
      { href: '/dashboard/product-outlet-settings', label: 'Product Outlet Settings', icon: faSliders, requiredPermissions: ['PRODUCT_OUTLET_VIEW'], businessOnly: true },
      { href: '/dashboard/outlet-tables', label: 'Outlet Tables', icon: faTableCellsLarge, requiredPermissions: ['OUTLET_TABLE_VIEW'], businessOnly: true, restaurantOnly: true },
    ],
  },
  {
    section: 'Inventory',
    items: [
      { href: '/dashboard/inventory', label: 'Stock Summary', icon: faBoxOpen, requiredPermissions: ['INVENTORY_VIEW'], businessOnly: true, requireOutletScope: true, allowedRoles: ['OWNER', 'ADMIN', 'INVENTORY'] },
      { href: '/dashboard/inventory/stock-in', label: 'Stock In', icon: faArrowDown, requiredPermissions: ['INVENTORY_STOCK_IN'], businessOnly: true, requireOutletScope: true, allowedRoles: ['OWNER', 'ADMIN', 'INVENTORY'] },
      { href: '/dashboard/inventory/stock-out', label: 'Stock Out', icon: faArrowUp, requiredPermissions: ['INVENTORY_STOCK_OUT'], businessOnly: true, requireOutletScope: true, allowedRoles: ['OWNER', 'ADMIN', 'INVENTORY'] },
      { href: '/dashboard/inventory/adjustment', label: 'Stock Adjustment', icon: faSliders, requiredPermissions: ['INVENTORY_ADJUST'], businessOnly: true, requireOutletScope: true, allowedRoles: ['OWNER', 'ADMIN', 'INVENTORY'] },
    ],
  },
  {
    section: 'POS Transaction',
    items: [
      { href: '/dashboard/pos', label: 'POS Kasir', icon: faCashRegister, businessOnly: true, requireOutletScope: true, allowedRoles: ['OWNER', 'ADMIN', 'CASHIER'] },
      { href: '/dashboard/pos/history', label: 'Histori Transaksi', icon: faClockRotateLeft, businessOnly: true, requireOutletScope: true, allowedRoles: ['OWNER', 'ADMIN', 'CASHIER'] },
      { href: '/dashboard/payments', label: 'Payment History', icon: faReceipt, businessOnly: true, requireOutletScope: true, allowedRoles: ['OWNER', 'ADMIN', 'CASHIER'] },
    ],
  },
  {
    section: 'Analytics & Reports',
    items: [
      { href: '/dashboard/reports', label: 'Reports', icon: faChartLine, requiredPermissions: ['REPORT_VIEW'], businessOnly: true, allowedRoles: ['OWNER', 'ADMIN'] },
    ],
  },
  {
    section: 'Restaurant Operation',
    items: [
      { href: '/dashboard/kitchen', label: 'Kitchen Display', icon: faUtensils, requiredPermissions: ['ORDER_VIEW'], businessOnly: true, restaurantOnly: true, requireOutletScope: true, allowedRoles: ['OWNER', 'ADMIN', 'KITCHEN'] },
      { href: '/dashboard/tables/monitor', label: 'Monitor Meja', icon: faTableCellsLarge, requiredPermissions: ['OUTLET_TABLE_VIEW'], businessOnly: true, restaurantOnly: true, requireOutletScope: true, allowedRoles: ['OWNER', 'ADMIN'] },
      { href: '/dashboard/tables/qr', label: 'QR Meja', icon: faQrcode, requiredPermissions: ['OUTLET_TABLE_VIEW'], businessOnly: true, restaurantOnly: true, requireOutletScope: true, allowedRoles: ['OWNER', 'ADMIN'] },
    ],
  },
];

export function getFilteredNavigation(user: CurrentUser | null): AppNavGroup[] {
  const accessProfile = (user?.accessProfile || {}) as AccessProfileLike;
  const activeMembership = getActiveMembership(user);
  const isSuperAdmin = Boolean(accessProfile.isSuperAdmin);
  const permissionCodes = getPermissionCodes(user);
  const businessType = getBusinessType(user);
  const hasBusinessContext = Boolean(activeMembership);
  const outletScopeAvailable = hasOutletScope(user);
  const activeRole = activeMembership?.role ?? null;

  return menuGroups
    .map((group) => {
      const items = group.items.filter((item) => {
        if (item.platformOnly && !isSuperAdmin) return false;
        if (item.businessOnly && !hasBusinessContext) return false;
        if (item.restaurantOnly && businessType !== 'RESTAURANT') return false;
        if (item.requireOutletScope && !isSuperAdmin && !outletScopeAvailable) return false;

        if (item.allowedRoles && item.allowedRoles.length > 0 && !isSuperAdmin) {
          if (!activeRole || !item.allowedRoles.includes(activeRole)) return false;
        }

        if (!item.requiredPermissions || item.requiredPermissions.length === 0) return true;

        if (isSuperAdmin && item.platformOnly) return true;
        if (isSuperAdmin && item.businessOnly && hasBusinessContext) return true;

        return item.requiredPermissions.some((permission) => permissionCodes.includes(permission));
      });

      return { ...group, items };
    })
    .filter((group) => group.items.length > 0);
}

export function getNavigationContext(user: CurrentUser | null) {
  const accessProfile = (user?.accessProfile || {}) as AccessProfileLike;
  const activeMembership = getActiveMembership(user);
  const businessType = getBusinessType(user);
  const outletScopeAvailable = hasOutletScope(user);

  return {
    accessProfile,
    activeMembership,
    isSuperAdmin: Boolean(accessProfile.isSuperAdmin),
    permissionCodes: getPermissionCodes(user),
    businessType,
    hasBusinessContext: Boolean(activeMembership),
    outletScopeAvailable,
  };
}