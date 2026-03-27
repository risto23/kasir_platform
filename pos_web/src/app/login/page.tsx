// pos_web/src/app/login/page.tsx 
import { LoginForm } from '@/components/forms/login-form';

export default function LoginPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.18),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.16),_transparent_28%),linear-gradient(to_bottom,_#f8fafc,_#eef2ff)]" />

      <div className="relative mx-auto flex min-h-screen max-w-7xl items-center px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="grid w-full overflow-hidden rounded-[28px] border border-white/60 bg-white/70 shadow-[0_30px_100px_rgba(15,23,42,0.12)] backdrop-blur lg:grid-cols-[1fr_0.95fr]">
          <section className="flex items-center px-5 py-8 sm:px-8 md:px-10 lg:px-10 lg:py-10 xl:px-12 xl:py-12">
            <div className="mx-auto w-full max-w-md">
              <LoginForm />
            </div>
          </section>

          <aside className="relative hidden min-h-full overflow-hidden lg:flex">
            <div className="absolute inset-0 bg-[linear-gradient(135deg,#0f172a_0%,#1e1b4b_45%,#312e81_100%)]" />
            <div className="absolute -left-16 top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute bottom-10 right-10 h-56 w-56 rounded-full bg-cyan-300/10 blur-3xl" />

            <div className="relative flex h-full w-full flex-col justify-between p-8 text-white xl:p-12">
              <div>
                <div className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-medium tracking-wide text-slate-100">
                  Multi-Business POS Platform
                </div>

                <div className="mt-8 max-w-md space-y-5">
                  <h2 className="text-2xl font-semibold leading-tight xl:text-3xl">
                    Kelola banyak bisnis dalam satu platform yang tetap rapi dan
                    konsisten.
                  </h2>

                  <p className="text-sm leading-7 text-slate-200">
                    Dirancang untuk kebutuhan dasar fase 1: business management,
                    outlet management, dan kontrol akses platform secara terpusat.
                  </p>
                </div>
              </div>

              <div className="grid gap-4">
                <div className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur-sm">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-300">
                    Business Type
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white">
                      RESTAURANT
                    </span>
                    <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white">
                      RETAIL
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur-sm">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-300">
                      Fokus
                    </p>
                    <p className="mt-2 text-sm font-medium text-white">
                      Fase 1
                    </p>
                    <p className="mt-1 text-xs leading-6 text-slate-200">
                      Business & outlet management
                    </p>
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur-sm">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-300">
                      Role
                    </p>
                    <p className="mt-2 text-sm font-medium text-white">
                      Super Admin
                    </p>
                    <p className="mt-1 text-xs leading-6 text-slate-200">
                      Kontrol platform utama
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}