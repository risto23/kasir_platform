'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowRight,
  faBan,
  faBuilding,
  faCircleCheck,
  faPenToSquare,
  faPlus,
  faShop,
  faSliders
} from '@fortawesome/free-solid-svg-icons';

import { api } from '@/lib/api';
import { Business } from '@/types/business';

function getMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || 'Gagal memuat business';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Terjadi kesalahan';
}

function getStatusBadgeClass(status: Business['status']) {
  if (status === 'ACTIVE') {
    return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
  }

  return 'bg-slate-100 text-slate-600 border border-slate-200';
}

function getTypeBadgeClass(type: Business['businessType']) {
  if (type === 'RESTAURANT') {
    return 'bg-orange-50 text-orange-700 border border-orange-200';
  }

  return 'bg-sky-50 text-sky-700 border border-sky-200';
}

export default function BusinessListPage() {
  const [items, setItems] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  async function fetchData() {
    try {
      setLoading(true);
      setMessage('');

      const response = await api.get('/platform/businesses');
      setItems(response.data.data || []);
    } catch (error: unknown) {
      setMessage(getMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleStatus(item: Business) {
    const newStatus = item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

    try {
      setMessage('');

      await api.patch(`/platform/businesses/${item.id}/status`, {
        status: newStatus,
      });

      await fetchData();
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        setMessage(
          error.response?.data?.message || 'Gagal mengubah status business'
        );
      } else if (error instanceof Error) {
        setMessage(error.message);
      } else {
        setMessage('Terjadi kesalahan');
      }
    }
  }

  useEffect(() => {
    void fetchData();
  }, []);

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-700">
            <FontAwesomeIcon icon={faBuilding} className="h-3 w-3" />
            Business Management
          </div>

          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
            Businesses
          </h1>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Kelola daftar business pada platform beserta status aktif dan tipe
            business-nya.
          </p>
        </div>

        <Link
          href="/dashboard/businesses/create"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          <FontAwesomeIcon icon={faPlus} className="h-4 w-4" />
          Create Business
        </Link>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Total Business</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
            {loading ? '-' : items.length}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Active</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-emerald-600">
            {loading ? '-' : items.filter((item) => item.status === 'ACTIVE').length}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Inactive</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-600">
            {loading ? '-' : items.filter((item) => item.status === 'INACTIVE').length}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Business Type</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">
            RESTAURANT / RETAIL
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Tipe business ditentukan saat create.
          </p>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Daftar Business
            </h2>
            <p className="text-sm text-slate-500">
              Lihat business yang sudah terdaftar di platform.
            </p>
          </div>

          {loading ? (
            <span className="text-xs text-slate-400">Loading data...</span>
          ) : (
            <span className="text-xs text-slate-400">
              {items.length} business ditemukan
            </span>
          )}
        </div>

        {message ? (
          <div className="px-5 pt-4 sm:px-6">
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {message}
            </div>
          </div>
        ) : null}

        {loading ? (
          <div className="grid gap-3 px-5 py-5 sm:px-6">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-16 animate-pulse rounded-2xl bg-slate-100"
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="px-5 py-12 text-center sm:px-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <FontAwesomeIcon icon={faShop} className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-slate-900">
              Belum ada business
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Mulai dengan membuat business pertama untuk platform ini.
            </p>
            <Link
              href="/dashboard/businesses/create"
              className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <FontAwesomeIcon icon={faPlus} className="h-4 w-4" />
              Create Business
            </Link>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr className="border-b border-slate-200">
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.16em]">
                      Name
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.16em]">
                      Slug
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.16em]">
                      Type
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.16em]">
                      Status
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-[0.16em]">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-slate-200 last:border-b-0"
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold text-slate-900">
                            {item.name}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            ID: {item.id}
                          </p>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                          {item.slug}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getTypeBadgeClass(
                            item.businessType
                          )}`}
                        >
                          {item.businessType}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(
                            item.status
                          )}`}
                        >
                          {item.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="mt-5 grid gap-2 sm:grid-cols-3">
                          <Link
                            href={`/dashboard/businesses/${item.id}/features`}
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-violet-200 bg-violet-50 px-4 text-sm font-semibold text-violet-700 transition hover:bg-violet-100"
                          >
                            <FontAwesomeIcon icon={faSliders} className="h-4 w-4" />
                            Features
                          </Link>

                          <Link
                            href={`/dashboard/businesses/${item.id}/edit`}
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 text-sm font-semibold text-sky-700 transition hover:bg-sky-100"
                          >
                            <FontAwesomeIcon icon={faPenToSquare} className="h-4 w-4" />
                            Edit
                          </Link>

                          <button
                            type="button"
                            className={`inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold transition ${
                              item.status === 'ACTIVE'
                                ? 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                                : 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            }`}
                            onClick={() => void handleToggleStatus(item)}
                          >
                            <FontAwesomeIcon
                              icon={item.status === 'ACTIVE' ? faBan : faCircleCheck}
                              className="h-4 w-4"
                            />
                            {item.status === 'ACTIVE' ? 'Nonaktifkan' : 'Aktifkan'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-4 p-4 lg:hidden">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">
                        {item.name}
                      </h3>
                      <p className="mt-1 text-xs text-slate-400">{item.slug}</p>
                    </div>

                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold ${getStatusBadgeClass(
                        item.status
                      )}`}
                    >
                      {item.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold ${getTypeBadgeClass(
                        item.businessType
                      )}`}
                    >
                      {item.businessType}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-2 sm:grid-cols-2">
                    <Link
                      href={`/dashboard/businesses/${item.id}/features`}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-violet-200 bg-violet-50 px-4 text-sm font-semibold text-violet-700 transition hover:bg-violet-100"
                    >
                      <FontAwesomeIcon icon={faSliders} className="h-4 w-4" />
                      Features
                    </Link>
                    <Link
                      href={`/dashboard/businesses/${item.id}/edit`}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 text-sm font-semibold text-sky-700 transition hover:bg-sky-100"
                    >
                      <FontAwesomeIcon
                        icon={faPenToSquare}
                        className="h-4 w-4"
                      />
                      Edit
                    </Link>

                    <button
                      type="button"
                      className={`inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold transition ${
                        item.status === 'ACTIVE'
                          ? 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                          : 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      }`}
                      onClick={() => void handleToggleStatus(item)}
                    >
                      <FontAwesomeIcon
                        icon={item.status === 'ACTIVE' ? faBan : faCircleCheck}
                        className="h-4 w-4"
                      />
                      {item.status === 'ACTIVE' ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Informasi Penting
            </h2>
            <p className="text-sm text-slate-500">
              Ringkasan aturan utama untuk pengelolaan business.
            </p>
          </div>

          <Link
            href="/dashboard/businesses/create"
            className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 transition hover:text-indigo-700"
          >
            Tambah business baru
            <FontAwesomeIcon icon={faArrowRight} className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[
            'Business type dipilih saat create.',
            'Business type tidak diubah bebas setelah business dibuat.',
            'Status business memakai ACTIVE / INACTIVE.',
            'Business boleh diedit tanpa hard delete.',
            'Satu business bisa memiliki banyak outlet.',
            'Outlet selalu mengikuti business induknya.',
          ].map((note) => (
            <div
              key={note}
              className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600"
            >
              {note}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
