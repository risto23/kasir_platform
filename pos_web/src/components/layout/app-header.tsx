'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBars,
  faBell,
  faChevronRight,
  faRightFromBracket,
  faStore,
  faXmark,
  faUser,
} from '@fortawesome/free-solid-svg-icons';

import { getCachedCurrentUser, logout } from '@/lib/auth';
import {
  getFilteredNavigation,
  getNavigationContext,
  isMenuActive,
} from '@/components/layout/app-navigation';

type AppHeaderProps = {
  title?: string;
  subtitle?: string;
};

function getPrimaryRoleLabel(
  isSuperAdmin: boolean,
  membershipRole: string | null | undefined,
) {
  if (isSuperAdmin) {
    if (membershipRole) {
      return `Super Admin • ${membershipRole}`;
    }

    return 'Super Admin';
  }

  return membershipRole || 'User';
}

function getOutletScopeLabel(currentUser: ReturnType<typeof getCachedCurrentUser>): string {
  const membership = getNavigationContext(currentUser).activeMembership;

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

  const [currentUser, setCurrentUser] = useState(() => getCachedCurrentUser());
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  useEffect(() => {
    const syncUser = () => setCurrentUser(getCachedCurrentUser());

    window.addEventListener('storage', syncUser);
    window.addEventListener('pos-current-user-updated', syncUser);

    return () => {
      window.removeEventListener('storage', syncUser);
      window.removeEventListener('pos-current-user-updated', syncUser);
    };
  }, []);
  const filteredMobileNavItems = useMemo(
    () => getFilteredNavigation(currentUser).flatMap((group) => group.items),
    [currentUser],
  );
  const {
    activeMembership,
    isSuperAdmin,
    businessType,
    hasBusinessContext,
  } = useMemo(() => getNavigationContext(currentUser), [currentUser]);

  const outletScopeLabel = useMemo(
    () => getOutletScopeLabel(currentUser),
    [currentUser],
  );

  const roleLabel = useMemo(
    () => getPrimaryRoleLabel(isSuperAdmin, activeMembership?.role),
    [activeMembership?.role, isSuperAdmin],
  );

  function handleLogout() {
    logout();
    router.replace('/login');
    router.refresh();
  }

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="flex min-h-18 items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setIsMobileNavOpen(true)}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 lg:hidden"
              aria-label="Buka menu navigasi"
            >
              <FontAwesomeIcon icon={faBars} className="h-4 w-4" />
            </button>

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
      </header>

      {/* Mobile nav drawer */}
      {isMobileNavOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setIsMobileNavOpen(false)}
          />

          {/* Drawer */}
          <aside className="absolute left-0 top-0 flex h-full w-72 flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
                  <FontAwesomeIcon icon={faStore} className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-indigo-600">
                    POS Platform
                  </p>
                  <h2 className="text-base font-semibold text-slate-900">Admin Panel</h2>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsMobileNavOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50"
                aria-label="Tutup menu"
              >
                <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-4 py-5">
              <div className="space-y-1">
                {filteredMobileNavItems.map((item) => {
                  const active = isMenuActive(pathname, item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsMobileNavOpen(false)}
                      className={`flex items-center justify-between rounded-2xl px-3 py-3 text-sm transition ${
                        active
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'text-slate-700 hover:bg-slate-100'
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

                      <FontAwesomeIcon
                        icon={faChevronRight}
                        className={`h-3.5 w-3.5 ${active ? 'text-white/80' : 'text-slate-400'}`}
                      />
                    </Link>
                  );
                })}
              </div>
            </nav>

            <div className="border-t border-slate-200 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                  <FontAwesomeIcon icon={faUser} className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {currentUser?.fullName || currentUser?.email || 'User'}
                  </p>
                  <p className="truncate text-xs text-slate-500">{roleLabel}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <FontAwesomeIcon icon={faRightFromBracket} className="h-4 w-4" />
                Logout
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
