'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChartLine,
  faChevronRight,
  faLocationDot,
  faLayerGroup,
  faShop,
  faStore,
  faUsers,
} from '@fortawesome/free-solid-svg-icons';

const menus = [
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
    section: 'Business Management',
    items: [
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
    ],
  },
];

function isMenuActive(pathname: string, href: string) {
  if (href === '/dashboard') {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppSidebar() {
  const pathname = usePathname();

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
          Fase 2 management untuk business, outlet, dan business users.
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-5">
        <div className="space-y-6">
          {menus.map((group) => (
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
                        <FontAwesomeIcon
                          icon={faChevronRight}
                          className="h-3 w-3"
                        />
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
            Business type, outlet, business user, dan dashboard fase 2.
          </p>
        </div>
      </div>
    </aside>
  );
}