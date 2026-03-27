'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEye,
  faEyeSlash,
  faLock,
  faEnvelope,
  faStore,
} from '@fortawesome/free-solid-svg-icons';

import { login, logout } from '@/lib/auth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function LoginForm() {
  const router = useRouter();

  const [form, setForm] = useState({
    email: 'superadmin@pos.local',
    password: 'password123',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await login(form.email, form.password);

      if (!result.user.accessProfile.isSuperAdmin) {
        logout();
        setError('Akun ini tidak memiliki akses ke dashboard platform.');
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || 'Login gagal');
      } else if (err instanceof Error) {
        setError(err.message || 'Login gagal');
      } else {
        setError('Login gagal');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
          <FontAwesomeIcon icon={faStore} className="h-5 w-5" />
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-indigo-600">
            POS Platform
          </p>
          <h1 className="text-xl font-semibold text-slate-900">
            Masuk ke Dashboard
          </h1>
        </div>
      </div>

      <div className="mb-6 space-y-2">
        <p className="text-sm leading-6 text-slate-600">
          Kelola business dan outlet dalam satu platform POS yang rapi, cepat,
          dan terstruktur.
        </p>

        <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-500">
          Fase 1 • Super Admin Access
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-[28px] border border-slate-200/80 bg-white/95 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur"
      >
        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">
            Email
          </label>

          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
              <FontAwesomeIcon icon={faEnvelope} className="h-4 w-4" />
            </span>

            <Input
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, email: e.target.value }))
              }
              placeholder="Masukkan email"
              className="h-12 rounded-2xl border-slate-200 bg-slate-50 pl-11 pr-4 text-sm shadow-none placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">
            Password
          </label>

          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
              <FontAwesomeIcon icon={faLock} className="h-4 w-4" />
            </span>

            <Input
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, password: e.target.value }))
              }
              placeholder="Masukkan password"
              className="h-12 rounded-2xl border-slate-200 bg-slate-50 pl-11 pr-12 text-sm shadow-none placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white"
            />

            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute inset-y-0 right-0 flex items-center px-4 text-slate-400 transition hover:text-slate-700"
              aria-label={
                showPassword ? 'Sembunyikan password' : 'Lihat password'
              }
            >
              <FontAwesomeIcon
                icon={showPassword ? faEyeSlash : faEye}
                className="h-4 w-4"
              />
            </button>
          </div>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="h-12 w-full rounded-2xl bg-slate-900 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? 'Sedang masuk...' : 'Masuk'}
        </Button>

        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-xs leading-6 text-slate-500">
          Gunakan akun Super Admin yang sudah disediakan untuk fase awal
          pengembangan dan pengujian platform.
        </div>
      </form>
    </div>
  );
}