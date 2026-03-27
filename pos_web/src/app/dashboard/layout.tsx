'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { AppHeader } from '@/components/layout/app-header';
import { getMe, logout } from '@/lib/auth';
import type { CurrentUser } from '@/types/auth';

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
    async function validateAccess() {
      try {
        setChecking(true);
        setError('');

        const currentUser: CurrentUser = await getMe();

        if (!currentUser.accessProfile.isSuperAdmin) {
          logout();
          setIsAllowed(false);
          setError('Akun ini tidak memiliki akses ke dashboard platform.');
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
            <div className="h-[73px] border-b border-slate-200 bg-white/80" />

            <main className="flex-1">
              <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-6">
                <div className="space-y-4">
                  <div className="h-24 animate-pulse rounded-[28px] bg-white" />
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div
                        key={index}
                        className="h-36 animate-pulse rounded-[24px] bg-white"
                      />
                    ))}
                  </div>
                  <div className="grid gap-4 xl:grid-cols-2">
                    <div className="h-72 animate-pulse rounded-[28px] bg-white" />
                    <div className="h-72 animate-pulse rounded-[28px] bg-white" />
                  </div>
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
          <h1 className="text-lg font-semibold text-slate-900">
            Akses tidak tersedia
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {error || 'Anda tidak memiliki akses ke dashboard platform.'}
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