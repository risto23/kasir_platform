'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';

import { AppHeader } from '@/components/layout/app-header';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { getCachedCurrentUser, getMe, logout } from '@/lib/auth';
import type { CurrentUser } from '@/types/auth';

const DASHBOARD_ALLOWED_PERMISSIONS = [
  'BUSINESS_USER_VIEW',
  'BUSINESS_USER_CREATE',
  'BUSINESS_USER_UPDATE',
  'BUSINESS_USER_STATUS_UPDATE',
  'BUSINESS_USER_ASSIGN_OUTLET',
  'OUTLET_SCOPE_VIEW',
  'OUTLET_VIEW',
  'OUTLET_CREATE',
  'OUTLET_UPDATE',
  'OUTLET_STATUS_UPDATE',
  'CATEGORY_VIEW',
  'CATEGORY_CREATE',
  'CATEGORY_UPDATE',
  'CATEGORY_STATUS_UPDATE',
  'PRODUCT_VIEW',
  'PRODUCT_CREATE',
  'PRODUCT_UPDATE',
  'PRODUCT_STATUS_UPDATE',
  'PRODUCT_OUTLET_VIEW',
  'PRODUCT_OUTLET_UPDATE',
  'OUTLET_TABLE_VIEW',
  'OUTLET_TABLE_CREATE',
  'OUTLET_TABLE_UPDATE',
  'OUTLET_TABLE_STATUS_UPDATE',
  'PROMO_VIEW',
  'PROMO_CREATE',
  'PROMO_UPDATE',
  'PROMO_STATUS_UPDATE',
  'ORDER_VIEW',
  'ORDER_UPDATE',
  'REPORT_VIEW',
] as const;

type PermissionLike = {
  code?: string;
};

type MembershipLike = {
  permissions?: Array<string | PermissionLike>;
};

type AccessProfileLike = {
  isSuperAdmin?: boolean;
  permissions?: Array<string | PermissionLike>;
  businessPermissions?: Array<string | PermissionLike>;
  platformPermissions?: Array<string | PermissionLike>;
  defaultBusinessMembership?: MembershipLike | null;
  memberships?: MembershipLike[];
};

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

function getPermissionCodes(user: CurrentUser): string[] {
  const accessProfile = user.accessProfile as AccessProfileLike;

  const fromAccessProfile = normalizePermissionList(accessProfile.permissions);
  const fromBusinessPermissions = normalizePermissionList(
    accessProfile.businessPermissions
  );
  const fromPlatformPermissions = normalizePermissionList(
    accessProfile.platformPermissions
  );
  const fromDefaultMembership = normalizePermissionList(
    accessProfile.defaultBusinessMembership?.permissions
  );
  const fromMemberships = Array.isArray(accessProfile.memberships)
    ? accessProfile.memberships.flatMap((membership) =>
        normalizePermissionList(membership.permissions)
      )
    : [];
  const fromUserMemberships = Array.isArray(user.businessMemberships)
    ? user.businessMemberships.flatMap((membership) =>
        normalizePermissionList(membership.permissions)
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

function hasDashboardAccess(user: CurrentUser) {
  const accessProfile = user.accessProfile as AccessProfileLike;

  if (accessProfile.isSuperAdmin) {
    return true;
  }

  const permissions = getPermissionCodes(user);

  return DASHBOARD_ALLOWED_PERMISSIONS.some((permission) =>
    permissions.includes(permission)
  );
}

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const cachedUser = getCachedCurrentUser();

    if (cachedUser && hasDashboardAccess(cachedUser)) {
      setIsAllowed(true);
      setChecking(false);
    }

    async function validateAccess() {
      try {
        setChecking(true);
        setError('');

        const currentUser = (await getMe()) as CurrentUser;

        if (!hasDashboardAccess(currentUser)) {
          logout();
          setIsAllowed(false);
          setError('Akun ini tidak memiliki akses ke dashboard.');
          router.replace('/login');
          return;
        }

        setIsAllowed(true);
      } catch (err: unknown) {
        logout();

        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Session tidak valid');
        }

        router.replace('/login');
      } finally {
        setChecking(false);
      }
    }

    void validateAccess();
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-100">
        <div className="flex min-h-screen">
          <aside className="hidden w-72 shrink-0 border-r border-slate-200 bg-white/95 lg:block" />

          <div className="flex min-w-0 flex-1 flex-col">
            <div className="h-18.25 border-b border-slate-200 bg-white/80" />

            <main className="flex-1">
              <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-6">
                <div className="space-y-4">
                  <div className="h-24 animate-pulse rounded-[28px] bg-white" />
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div
                        key={index}
                        className="h-32 animate-pulse rounded-[28px] bg-white"
                      />
                    ))}
                  </div>
                  <div className="h-105 animate-pulse rounded-[28px] bg-white" />
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    );
  }

  if (!isAllowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <div className="w-full max-w-md rounded-[28px] border border-red-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">
            Akses dashboard ditolak
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {error || 'Anda tidak memiliki akses ke dashboard.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="flex min-h-screen">
        <AppSidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader />
          <main className="flex-1">
            <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
