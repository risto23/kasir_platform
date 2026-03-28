import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowTrendUp,
  faLocationDot,
  faPercent,
  faPlus,
  faShop,
  faStore,
  faTags,
} from '@fortawesome/free-solid-svg-icons';
import Link from 'next/link';

const summaryCards = [
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
    title: 'Business Active',
    value: '10',
    description: 'Business yang saat ini berstatus aktif.',
    icon: faArrowTrendUp,
  },
  {
    title: 'Promo Module',
    value: 'Fase 3',
    description: 'Promo kategori, produk/menu, nama, brand, dan satuan.',
    icon: faPercent,
  },
];

const quickActions = [
  {
    title: 'Lihat Businesses',
    description: 'Cek daftar business yang sudah dibuat dan statusnya.',
    href: '/dashboard/businesses',
    icon: faShop,
  },
  {
    title: 'Tambah Business',
    description: 'Buat business baru dengan business type yang sesuai.',
    href: '/dashboard/businesses/create',
    icon: faPlus,
  },
  {
    title: 'Lihat Outlets',
    description: 'Kelola outlet berdasarkan business induknya.',
    href: '/dashboard/outlets',
    icon: faLocationDot,
  },
  {
    title: 'Lihat Promo',
    description: 'Kelola promo aktif, terjadwal, nonaktif, dan berakhir.',
    href: '/dashboard/promos',
    icon: faTags,
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,#0f172a_0%,#1e1b4b_48%,#312e81_100%)] text-white shadow-sm">
        <div className="grid gap-6 px-6 py-7 sm:px-8 sm:py-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div>
            <div className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium tracking-wide text-slate-100">
              Fase 3 Dashboard
            </div>

            <h2 className="mt-4 max-w-2xl text-2xl font-semibold leading-tight sm:text-3xl">
              Selamat datang di POS Platform.
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-200">
              Dashboard ini difokuskan untuk pengelolaan master data fase 3 secara
              sederhana, rapi, dan konsisten, termasuk kategori, produk/menu,
              pricing outlet, promo, dan meja outlet restaurant.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-300">
                Business Type
              </p>
              <p className="mt-2 text-base font-semibold text-white">
                RESTAURANT & RETAIL
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-300">
                Current Scope
              </p>
              <p className="mt-2 text-base font-semibold text-white">
                Master Data Fase 3
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
              <p className="text-sm font-semibold text-slate-900">
                Quick Actions
              </p>
              <p className="text-sm text-slate-500">
                Akses cepat untuk aktivitas utama fase 3.
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
          <p className="text-sm font-semibold text-slate-900">
            Ringkasan Arsitektur Fase 3
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Batasan utama tetap dijaga agar implementasi tetap konsisten.
          </p>

          <div className="mt-5 space-y-3">
            {[
              '1 business hanya punya 1 business type',
              '1 business bisa punya banyak outlet',
              'outlet mengikuti business induknya',
              'retail dan restaurant tetap dibedakan',
              'promo support category, product/menu, nama, brand, dan unit',
              'outlet table hanya untuk restaurant',
              'status efektif promo: ACTIVE / INACTIVE / SCHEDULED / EXPIRED',
              'tanpa hard delete',
            ].map((item) => (
              <div
                key={item}
                className="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3"
              >
                <span className="mt-1 h-2.5 w-2.5 rounded-full bg-indigo-500" />
                <p className="text-sm leading-6 text-slate-600">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}