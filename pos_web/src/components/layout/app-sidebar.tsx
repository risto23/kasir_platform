'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronRight, faStore } from '@fortawesome/free-solid-svg-icons';
import { getFilteredNavigation, getNavigationContext, isMenuActive } from '@/components/layout/app-navigation';
import { getCachedCurrentUser } from '@/lib/auth';
import { getBusinessFeatureFlags } from '@/lib/feature-flags';

export function AppSidebar() {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState(() => getCachedCurrentUser());
  const [featureKeys, setFeatureKeys] = useState<string[] | null>(null);
  useEffect(() => {
    const syncUser = () => setCurrentUser(getCachedCurrentUser());

    window.addEventListener('storage', syncUser);
    window.addEventListener('pos-current-user-updated', syncUser);

    return () => {
      window.removeEventListener('storage', syncUser);
      window.removeEventListener('pos-current-user-updated', syncUser);
    };
  }, []);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const keys = await getBusinessFeatureFlags();
        if (mounted) setFeatureKeys(keys);
      } catch {
        if (mounted) setFeatureKeys([]);
      }
    })();
    return () => { mounted = false; };
  }, []);
  const filteredMenus = useMemo(() => getFilteredNavigation(currentUser, featureKeys || undefined), [currentUser, featureKeys]);
  const { businessType, outletScopeAvailable } = useMemo(
    () => getNavigationContext(currentUser),
    [currentUser],
  );

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
            <h2 className="text-base font-semibold text-slate-900">Admin Panel</h2>
          </div>
        </div>

        <p className="mt-4 text-xs leading-6 text-slate-500">
          POS management untuk master data, transaksi kasir, promo, dan operasional
          restaurant seperti kitchen, monitor meja, dan QR guest menu.
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
                            : 'text-slate-400 group-hover:translate-x-0.5 group-hover:text-slate-500'
                        }`}
                      >
                        <FontAwesomeIcon icon={faChevronRight} className="h-3.5 w-3.5" />
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>

      <div className="border-t border-slate-200 px-6 py-5">
        <div className="rounded-3xl bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Current Context
          </p>

          <div className="mt-3 space-y-2 text-sm text-slate-600">
            <div className="flex items-center justify-between gap-3">
              <span>Business Type</span>
              <span className="font-medium text-slate-900">
                {businessType ?? '-'}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span>Outlet Scope</span>
              <span className="font-medium text-slate-900">
                {outletScopeAvailable ? 'Available' : 'Not Ready'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

