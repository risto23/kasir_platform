'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowTrendUp,
  faBowlFood,
  faCashRegister,
  faClock,
  faLocationDot,
  faPercent,
  faQrcode,
  faReceipt,
  faShop,
  faStore,
  faTableCellsLarge,
  faTags,
  faUtensils,
} from '@fortawesome/free-solid-svg-icons';

import { getActiveBusinessId, getCachedCurrentUser } from '@/lib/auth';
import type { BusinessMembership, CurrentUser } from '@/types/auth';

type DashboardCard = {
  title: string;
  value: string;
  description: string;
  icon: typeof faShop;
};

type DashboardAction = {
  title: string;
  description: string;
  href: string;
  icon: typeof faShop;
};

function getCurrentUser(): CurrentUser | null {
  const user = getCachedCurrentUser();

  if (!user) {
    return null;
  }

  return user as CurrentUser;
}

function getActiveMembership(
  user: CurrentUser | null,
): BusinessMembership | null {
  if (!user) {
    return null;
  }

  const activeBusinessId = getActiveBusinessId();

  const matchedMembership = Array.isArray(user.businessMemberships)
    ? user.businessMemberships.find(
        (item) =>
          item.businessId === activeBusinessId && item.status === 'ACTIVE',
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

function isSuperAdminUser(user: CurrentUser | null): boolean {
  return Boolean(user?.accessProfile?.isSuperAdmin);
}

function getDashboardVariant(user: CurrentUser | null) {
  const activeMembership = getActiveMembership(user);
  const isSuperAdmin = isSuperAdminUser(user);

  if (
    activeMembership?.role === 'KITCHEN' &&
    activeMembership.businessType === 'RESTAURANT'
  ) {
    return 'KITCHEN';
  }

  if (isSuperAdmin && activeMembership?.businessType === 'RESTAURANT') {
    return 'SUPER_ADMIN_RESTAURANT';
  }

  if (isSuperAdmin) {
    return 'SUPER_ADMIN_PLATFORM';
  }

  return 'DEFAULT';
}

function getKitchenSummaryCards(): DashboardCard[] {
  return [
    {
      title: 'Area Kitchen',
      value: 'Restaurant',
      description:
        'Dashboard ini difokuskan untuk operasional kitchen per outlet.',
      icon: faUtensils,
    },
    {
      title: 'Sumber Antrian',
      value: 'Order',
      description: 'Antrian kitchen diambil dari order aktif restaurant.',
      icon: faReceipt,
    },
    {
      title: 'Alur Item',
      value: '3 Step',
      description: 'PENDING → PROCESSING → DONE → SERVED.',
      icon: faArrowTrendUp,
    },
    {
      title: 'Akses Outlet',
      value: 'Terbatas',
      description:
        'Kitchen hanya melihat outlet yang memang menjadi hak aksesnya.',
      icon: faLocationDot,
    },
  ];
}

function getKitchenQuickActions(isSuperAdmin: boolean): DashboardAction[] {
  const actions: DashboardAction[] = [
    {
      title: 'Buka Kitchen Display',
      description:
        'Lihat antrian kitchen aktif dan update status item pesanan.',
      href: '/dashboard/kitchen',
      icon: faBowlFood,
    },
  ];

  if (isSuperAdmin) {
    actions.push(
      {
        title: 'Monitor Meja',
        description:
          'Masuk ke halaman monitor meja restaurant. Jika outlet belum dipilih, halaman akan memberi petunjuk.',
        href: '/dashboard/tables/monitor',
        icon: faTableCellsLarge,
      },
      {
        title: 'QR Meja',
        description:
          'Masuk ke halaman QR meja. Jika meja belum dipilih, halaman akan mengarahkan ke daftar meja.',
        href: '/dashboard/tables/qr',
        icon: faQrcode,
      },
      {
        title: 'Lihat Meja Outlet',
        description: 'Cek data meja restaurant yang aktif di outlet terkait.',
        href: '/dashboard/outlet-tables',
        icon: faTableCellsLarge,
      },
    );
  }

  return actions;
}

function getKitchenArchitectureNotes(isSuperAdmin: boolean): string[] {
  const notes = [
    'Area kitchen tersedia khusus untuk business restaurant.',
    'Antrian kitchen menampilkan order aktif dari outlet yang dipilih.',
    'Status item membantu tim memantau pesanan dari proses hingga tersaji.',
    'Akses tetap mengikuti outlet yang ditugaskan ke pengguna.',
    'Fokus halaman ini ada di proses pesanan, bukan pembayaran.',
    'Super admin juga bisa membuka area kitchen saat business restaurant aktif.',
  ];

  if (isSuperAdmin) {
    notes.unshift(
      'Business context restaurant sedang aktif untuk akun super admin.',
    );
  } else {
    notes.unshift('Tampilan ini menyesuaikan akses role kitchen yang sedang aktif.');
  }

  return notes;
}

function getDefaultSummaryCards(isSuperAdmin: boolean): DashboardCard[] {
  if (isSuperAdmin) {
    return [
      {
        title: 'Total Businesses',
        value: '12',
        description: 'Semua business yang sudah terdaftar di platform.',
        icon: faShop,
      },
      {
        title: 'Total Outlets',
        value: '28',
        description: 'Jumlah outlet dari seluruh business aktif.',
        icon: faLocationDot,
      },
      {
        title: 'Business Aktif',
        value: '10',
        description: 'Business yang saat ini berstatus aktif.',
        icon: faArrowTrendUp,
      },
      {
        title: 'Promo Module',
        value: 'Ready',
        description:
          'Promo kategori, produk/menu, nama, brand, dan satuan.',
        icon: faPercent,
      },
    ];
  }

  return [
    {
      title: 'Business Aktif',
      value: 'Aktif',
      description: 'Dashboard ini mengikuti business context yang sedang aktif.',
      icon: faShop,
    },
    {
      title: 'Akses Outlet',
      value: 'Sesuai Role',
      description: 'Akses outlet tetap mengikuti role dan assignment user.',
      icon: faLocationDot,
    },
    {
      title: 'POS Module',
      value: 'Ready',
      description: 'Flow order, payment, dan receipt sudah tersedia.',
      icon: faCashRegister,
    },
    {
      title: 'Promo Module',
      value: 'Ready',
      description: 'Promo business tetap tersedia sesuai permission user.',
      icon: faPercent,
    },
  ];
}

function getDefaultQuickActions(params: {
  isSuperAdmin: boolean;
  activeMembership: BusinessMembership | null;
}): DashboardAction[] {
  const { isSuperAdmin, activeMembership } = params;

  if (isSuperAdmin) {
    return [
      {
        title: 'Lihat Businesses',
        description: 'Cek daftar business yang sudah dibuat dan statusnya.',
        href: '/dashboard/businesses',
        icon: faShop,
      },
      {
        title: 'POS Kasir',
        description: 'Masuk ke halaman POS untuk transaksi dan checkout.',
        href: '/dashboard/pos',
        icon: faCashRegister,
      },
      {
        title: 'Lihat Outlets',
        description: 'Kelola outlet berdasarkan business induknya.',
        href: '/dashboard/outlets',
        icon: faLocationDot,
      },
      {
        title: 'Lihat Promo',
        description:
          'Kelola promo aktif, terjadwal, nonaktif, dan berakhir.',
        href: '/dashboard/promos',
        icon: faTags,
      },
    ];
  }

  const isRestaurantAdminArea =
    activeMembership?.businessType === 'RESTAURANT' &&
    (activeMembership.role === 'OWNER' || activeMembership.role === 'ADMIN');

  if (isRestaurantAdminArea) {
    return [
      {
        title: 'Kitchen Display',
        description: 'Masuk ke antrian kitchen restaurant per outlet.',
        href: '/dashboard/kitchen',
        icon: faBowlFood,
      },
      {
        title: 'Monitor Meja',
        description:
          'Buka monitor meja restaurant. Jika outlet belum dipilih, halaman akan memberi petunjuk.',
        href: '/dashboard/tables/monitor',
        icon: faTableCellsLarge,
      },
      {
        title: 'QR Meja',
        description:
          'Buka halaman QR meja. Pilih meja dari daftar meja bila belum ada parameter.',
        href: '/dashboard/tables/qr',
        icon: faQrcode,
      },
      {
        title: 'Outlet Tables',
        description: 'Masuk ke master meja untuk memilih meja dan generate QR.',
        href: '/dashboard/outlet-tables',
        icon: faTableCellsLarge,
      },
    ];
  }

  return [
    {
      title: 'POS Kasir',
      description: 'Masuk ke halaman POS untuk transaksi dan checkout.',
      href: '/dashboard/pos',
      icon: faCashRegister,
    },
    {
      title: 'Histori Transaksi',
      description: 'Lihat histori transaksi outlet yang bisa diakses.',
      href: '/dashboard/pos/history',
      icon: faReceipt,
    },
    {
      title: 'Payment History',
      description: 'Lihat histori pembayaran outlet yang bisa diakses.',
      href: '/dashboard/payments',
      icon: faReceipt,
    },
    {
      title: 'Lihat Promo',
      description: 'Cek promo yang aktif pada business yang sedang dipilih.',
      href: '/dashboard/promos',
      icon: faTags,
    },
  ];
}

function getDefaultArchitectureNotes(params: {
  isSuperAdmin: boolean;
  activeMembership: BusinessMembership | null;
}): string[] {
  const { isSuperAdmin, activeMembership } = params;

  if (isSuperAdmin) {
    return [
      'Setiap business memiliki tipe usaha yang jelas.',
      'Satu business dapat memiliki beberapa outlet.',
      'Outlet tetap dikelola di bawah business induknya.',
      'Retail dan restaurant memiliki alur kerja yang berbeda.',
      'Promo bisa diterapkan ke kategori, produk, nama, brand, dan satuan.',
      'Pengelolaan meja tersedia untuk business restaurant.',
      'Status promo membantu membedakan promo aktif, terjadwal, dan selesai.',
    ];
  }

  if (activeMembership?.businessType === 'RESTAURANT') {
    return [
      'Menu dan fitur mengikuti role yang sedang aktif.',
      'Area operasional restaurant tetap dipisahkan dari retail.',
      'Kitchen, monitor meja, dan QR meja tersedia saat context restaurant aktif.',
      'Akses outlet tetap mengikuti assignment pengguna.',
      'Guest flow hanya ditampilkan untuk business restaurant.',
    ];
  }

  return [
    'Dashboard menyesuaikan business yang sedang aktif.',
    'Akses menu mengikuti role dan izin yang dimiliki pengguna.',
    'Akses outlet tetap mengikuti outlet yang ditugaskan.',
    'POS tetap fokus pada order, pembayaran, dan struk.',
    'Master data hanya muncul bila pengguna memiliki akses.',
  ];
}

export default function DashboardPage() {
  const currentUser = useMemo(() => getCurrentUser(), []);
  const activeMembership = useMemo(
    () => getActiveMembership(currentUser),
    [currentUser],
  );
  const isSuperAdmin = useMemo(
    () => isSuperAdminUser(currentUser),
    [currentUser],
  );
  const variant = useMemo(
    () => getDashboardVariant(currentUser),
    [currentUser],
  );

  const isKitchenLikeDashboard =
    variant === 'KITCHEN' || variant === 'SUPER_ADMIN_RESTAURANT';

  const summaryCards = isKitchenLikeDashboard
    ? getKitchenSummaryCards()
    : getDefaultSummaryCards(isSuperAdmin);

  const quickActions = isKitchenLikeDashboard
    ? getKitchenQuickActions(isSuperAdmin)
    : getDefaultQuickActions({
        isSuperAdmin,
        activeMembership,
      });

  const architectureNotes = isKitchenLikeDashboard
    ? getKitchenArchitectureNotes(isSuperAdmin)
    : getDefaultArchitectureNotes({
        isSuperAdmin,
        activeMembership,
      });

  const heroBadge = isKitchenLikeDashboard
    ? 'Kitchen Dashboard'
    : isSuperAdmin
      ? 'POS Platform Dashboard'
      : 'Business Dashboard';

  const heroTitle = isKitchenLikeDashboard
    ? 'Selamat datang di dashboard kitchen.'
    : isSuperAdmin
      ? 'Selamat datang di POS Platform.'
      : 'Selamat datang di dashboard business.';

  const heroDescription = isKitchenLikeDashboard
    ? 'Dashboard ini difokuskan untuk operasional kitchen restaurant secara sederhana, cepat, dan aman. Fokus utamanya adalah melihat antrian order per outlet dan memproses status item pesanan.'
    : isSuperAdmin
      ? 'Dashboard ini difokuskan untuk pengelolaan master data dan operasional POS secara sederhana, rapi, dan konsisten, termasuk kategori, produk/menu, pricing outlet, promo, dan meja outlet restaurant.'
      : activeMembership?.businessType === 'RESTAURANT'
        ? 'Dashboard ini difokuskan untuk area kerja restaurant yang sedang aktif. Kitchen, monitor meja, dan QR meja tersedia dalam alur kerja yang lebih rapi dan mudah diakses.'
        : 'Dashboard ini difokuskan untuk area kerja business yang sedang aktif. Menu, outlet, dan fitur yang terlihat tetap mengikuti role, permission, dan akses outlet user.';

  const businessTypeLabel = activeMembership?.businessType ?? 'UNKNOWN';

  const currentScopeLabel = isKitchenLikeDashboard
    ? 'Kitchen Operation'
    : activeMembership?.businessType === 'RESTAURANT'
      ? 'Restaurant Operation'
      : isSuperAdmin
        ? 'Master Data & POS'
        : 'Business Operation';

  const roleLabel = isSuperAdmin
    ? 'SUPER_ADMIN'
    : activeMembership?.role || 'UNKNOWN';

  const accessModelLabel = isSuperAdmin
    ? 'Super Admin Access'
    : activeMembership?.hasAllOutletAccess
      ? 'Business Wide Access'
      : 'Outlet Scoped Access';

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,#0f172a_0%,#1e1b4b_48%,#312e81_100%)] text-white shadow-sm">
        <div className="grid gap-6 px-6 py-7 sm:px-8 sm:py-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div>
            <div className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium tracking-wide text-slate-100">
              {heroBadge}
            </div>

            <h2 className="mt-4 max-w-2xl text-2xl font-semibold leading-tight sm:text-3xl">
              {heroTitle}
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-200">
              {heroDescription}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-300">
                Jenis Business
              </p>
              <p className="mt-2 text-base font-semibold text-white">
                {businessTypeLabel}
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-300">
                Area Kerja
              </p>
              <p className="mt-2 text-base font-semibold text-white">
                {currentScopeLabel}
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-300">
                Role Aktif
              </p>
              <p className="mt-2 text-base font-semibold text-white">
                {roleLabel}
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-300">
                Akses
              </p>
              <p className="mt-2 text-base font-semibold text-white">
                {accessModelLabel}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <div
            key={card.title}
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                <FontAwesomeIcon icon={card.icon} className="h-4 w-4" />
              </div>

              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                Summary
              </span>
            </div>

            <p className="mt-5 text-sm font-medium text-slate-500">
              {card.title}
            </p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
              {card.value}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {card.description}
            </p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p data-testid="dashboard-quick-actions" className="text-sm font-semibold text-slate-900">
                Quick Actions
              </p>
              <p className="text-sm text-slate-500">
                {isKitchenLikeDashboard
                  ? 'Akses cepat untuk operasional kitchen.'
                  : activeMembership?.businessType === 'RESTAURANT'
                    ? 'Akses cepat untuk operasional restaurant yang sedang aktif.'
                    : isSuperAdmin
                      ? 'Akses cepat untuk aktivitas utama dashboard.'
                      : 'Akses cepat untuk area kerja business yang aktif.'}
              </p>
            </div>

            <span className="text-xs text-slate-400">
              Ringan, aman, dan mudah dilanjutkan
            </span>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="group rounded-[22px] border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-300 hover:bg-white hover:shadow-sm"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm transition group-hover:bg-slate-900 group-hover:text-white">
                  <FontAwesomeIcon icon={action.icon} className="h-4 w-4" />
                </div>

                <h3 className="mt-4 text-base font-semibold text-slate-900">
                  {action.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {action.description}
                </p>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <p data-testid="dashboard-quick-actions" className="text-sm font-semibold text-slate-900">
            {isKitchenLikeDashboard
              ? 'Ringkasan Kitchen'
              : isSuperAdmin
                ? 'Ringkasan Dashboard'
                : 'Informasi Akses'}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {isKitchenLikeDashboard
              ? 'Informasi singkat untuk membantu operasional kitchen tetap lancar.'
              : isSuperAdmin
                ? 'Gambaran singkat area utama yang tersedia di dashboard.'
                : 'Ringkasan akses dan area kerja yang tersedia untuk akun ini.'}
          </p>

          <div className="mt-5 space-y-3">
            {architectureNotes.map((item) => (
              <div
                key={item}
                className="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3"
              >
                <span className="mt-1 h-2.5 w-2.5 rounded-full bg-indigo-500" />
                <p className="text-sm leading-6 text-slate-600">{item}</p>
              </div>
            ))}
          </div>

          {isKitchenLikeDashboard ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                <div className="flex items-center gap-2 text-slate-700">
                  <FontAwesomeIcon icon={faClock} className="h-4 w-4" />
                  <p className="text-sm font-semibold">Status Item</p>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Fokus utama kitchen adalah update status item pesanan, bukan
                  payment atau receipt admin.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                <div className="flex items-center gap-2 text-slate-700">
                  <FontAwesomeIcon icon={faStore} className="h-4 w-4" />
                  <p className="text-sm font-semibold">Scope Outlet</p>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Data kitchen tetap mengikuti outlet access user, kecuali login
                  sebagai super admin.
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
