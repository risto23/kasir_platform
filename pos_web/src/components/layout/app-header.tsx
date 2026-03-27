'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBell,
  faChevronRight,
  faMagnifyingGlass,
  faRightFromBracket,
  faShop,
  faStore,
  faUser,
  faUsers,
  faLayerGroup,
  faLocationDot,
  faChartLine,
} from '@fortawesome/free-solid-svg-icons';

import { getCachedCurrentUser, logout } from '@/lib/auth';
import type { CurrentUser } from '@/types/auth';

type AppHeaderProps = {
  title?: string;
  subtitle?: string;
};

type MobileNavItem = {
  href: string;
  label: string;
  icon:
    | typeof faChartLine
    | typeof faShop
    | typeof faLayerGroup
    | typeof faLocationDot
    | typeof faUsers;
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
  },
  {
    href: '/dashboard/business-types',
    label: 'Business Types',
    icon: faLayerGroup,
  },
  {
    href: '/dashboard/outlets',
    label: 'Outlets',
    icon: faLocationDot,
  },
  {
    href: '/dashboard/business-users',
    label: 'Business Users',
    icon: faUsers,
  },
];

function getPrimaryRoleLabel(user: CurrentUser | null) {
  if (!user) {
    return 'User';
  }

  if (user.accessProfile.isSuperAdmin) {
    return 'Super Admin';
  }

  if (user.accessProfile.defaultBusinessMembership) {
    return user.accessProfile.defaultBusinessMembership.role;
  }

  return 'User';
}

function isMenuActive(pathname: string, href: string) {
  if (href === '/dashboard') {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppHeader({
  title = 'Dashboard',
  subtitle = 'Kelola POS Platform dengan tampilan yang rapi dan konsisten.',
}: AppHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();

  const currentUser = useMemo(() => getCachedCurrentUser(), []);
  const roleLabel = useMemo(
    () => getPrimaryRoleLabel(currentUser),
    [currentUser]
  );

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
          <p className="hidden text-sm text-slate-500 sm:block">{subtitle}</p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            className="hidden h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 sm:flex"
            aria-label="Search"
          >
            <FontAwesomeIcon icon={faMagnifyingGlass} className="h-4 w-4" />
          </button>

          <button
            type="button"
            className="hidden h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 sm:flex"
            aria-label="Notifications"
          >
            <FontAwesomeIcon icon={faBell} className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-800">
                {currentUser?.fullName || 'User'}
              </p>
              <p className="text-xs text-slate-500">
                {currentUser?.email || '-'}
              </p>
              <p className="mt-0.5 text-[11px] font-medium text-indigo-600">
                {roleLabel}
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
              <FontAwesomeIcon icon={faUser} className="h-4 w-4" />
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 text-sm font-semibold text-red-700 transition hover:bg-red-100"
            aria-label="Logout"
          >
            <FontAwesomeIcon icon={faRightFromBracket} className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>

      <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-3 sm:px-6 lg:hidden">
        <div className="mb-3 flex items-center gap-2 text-xs text-slate-500">
          <FontAwesomeIcon icon={faStore} className="h-3.5 w-3.5" />
          <span>Navigasi cepat untuk business, outlet, dan business users.</span>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {mobileNavItems.map((item) => {
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

                <span
                  className={`${
                    active ? 'text-white/80' : 'text-slate-400'
                  }`}
                >
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