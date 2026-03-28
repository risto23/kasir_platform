'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faBan,
  faChair,
  faCircleCheck,
  faFloppyDisk,
  faMagnifyingGlass,
  faPenToSquare,
  faPlus,
  faRotateRight,
  faTableCellsLarge,
  faUtensils,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';

import { api } from '@/lib/api';
import { getActiveBusinessId, getCachedCurrentUser } from '@/lib/auth';
import type {
  OutletTable,
  OutletTableListResponse,
  OutletTableStatus,
} from '@/types/outlet-table';

type OutletDetail = {
  id: string;
  name: string;
  code: string;
  status: string;
};

type TableForm = {
  code: string;
  name: string;
  capacity: string;
  status: OutletTableStatus;
};

function getMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || 'Gagal memuat meja outlet';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Terjadi kesalahan';
}

function getBusinessType(): 'RESTAURANT' | 'RETAIL' {
  const currentUser = getCachedCurrentUser();
  const activeBusinessId = getActiveBusinessId();

  const membership = currentUser?.businessMemberships?.find(
    (item) => item.businessId === activeBusinessId
  );

  return membership?.businessType === 'RESTAURANT' ? 'RESTAURANT' : 'RETAIL';
}

function getStatusBadgeClass(status: OutletTableStatus) {
  if (status === 'ACTIVE') {
    return 'border border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  return 'border border-slate-200 bg-slate-100 text-slate-600';
}

const emptyForm: TableForm = {
  code: '',
  name: '',
  capacity: '',
  status: 'ACTIVE',
};

function validateCapacity(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return '';
  }

  const parsed = Number(trimmed);

  if (Number.isNaN(parsed)) {
    return 'Capacity harus berupa angka.';
  }

  if (parsed <= 0) {
    return 'Capacity harus lebih besar dari 0.';
  }

  return '';
}

export default function OutletTablesDetailPage() {
  const params = useParams<{ outletId: string }>();
  const businessType = useMemo(() => getBusinessType(), []);

  const [outlet, setOutlet] = useState<OutletDetail | null>(null);
  const [items, setItems] = useState<OutletTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState<TableForm>(emptyForm);
  const [savingCreate, setSavingCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormMap, setEditFormMap] = useState<Record<string, TableForm>>({});
  const [savingEditId, setSavingEditId] = useState<string | null>(null);
  const [statusLoadingId, setStatusLoadingId] = useState<string | null>(null);

  async function fetchData() {
    try {
      setLoading(true);
      setMessage('');
      setMessageType('');

      const [outletResponse, tableResponse] = await Promise.all([
        api.get(`/business/outlets/${params.outletId}`),
        api.get(`/business/outlets-tables/${params.outletId}/tables`, {
          params: {
            ...(search.trim() ? { search: search.trim() } : {}),
          },
        }),
      ]);

      const outletData = outletResponse.data.data as OutletDetail;
      const tablePayload: OutletTableListResponse = tableResponse.data.data;
      const rows = tablePayload?.items || [];

      const nextFormMap: Record<string, TableForm> = {};
      for (const row of rows) {
        nextFormMap[row.id] = {
          code: row.code,
          name: row.name,
          capacity:
            row.capacity !== null && row.capacity !== undefined
              ? String(row.capacity)
              : '',
          status: row.status,
        };
      }

      setOutlet(outletData);
      setItems(rows);
      setEditFormMap(nextFormMap);
    } catch (error: unknown) {
      setMessage(getMessage(error));
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const capacityError = validateCapacity(createForm.capacity);
    if (capacityError) {
      setMessage(capacityError);
      setMessageType('error');
      return;
    }

    try {
      setSavingCreate(true);
      setMessage('');
      setMessageType('');

      await api.post(`/business/outlets/${params.outletId}/tables`, {
        code: createForm.code.trim(),
        name: createForm.name.trim(),
        capacity:
          createForm.capacity.trim() === '' ? null : Number(createForm.capacity),
        status: createForm.status,
      });

      setCreateForm(emptyForm);
      setShowCreateForm(false);
      setMessage('Meja outlet berhasil dibuat');
      setMessageType('success');

      await fetchData();
    } catch (error: unknown) {
      setMessage(getMessage(error));
      setMessageType('error');
    } finally {
      setSavingCreate(false);
    }
  }

  async function handleUpdate(tableId: string) {
    const form = editFormMap[tableId];
    if (!form) return;

    const capacityError = validateCapacity(form.capacity);
    if (capacityError) {
      setMessage(capacityError);
      setMessageType('error');
      return;
    }

    try {
      setSavingEditId(tableId);
      setMessage('');
      setMessageType('');

      await api.put(`/business/outlets/${params.outletId}/tables/${tableId}`, {
        code: form.code.trim(),
        name: form.name.trim(),
        capacity: form.capacity.trim() === '' ? null : Number(form.capacity),
        status: form.status,
      });

      setEditingId(null);
      setMessage('Meja outlet berhasil diperbarui');
      setMessageType('success');

      await fetchData();
    } catch (error: unknown) {
      setMessage(getMessage(error));
      setMessageType('error');
    } finally {
      setSavingEditId(null);
    }
  }

  async function handleToggleStatus(item: OutletTable) {
    const newStatus: OutletTableStatus =
      item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

    try {
      setStatusLoadingId(item.id);
      setMessage('');
      setMessageType('');

      await api.patch(`/business/outlets/${params.outletId}/tables/${item.id}/status`, {
        status: newStatus,
      });

      setMessage('Status meja outlet berhasil diperbarui');
      setMessageType('success');

      await fetchData();
    } catch (error: unknown) {
      setMessage(getMessage(error));
      setMessageType('error');
    } finally {
      setStatusLoadingId(null);
    }
  }

  function handleSearchSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSearch(searchInput.trim());
  }

  function handleResetFilter() {
    setSearchInput('');
    setSearch('');
  }

  useEffect(() => {
    void fetchData();
  }, [params.outletId, search]);

  if (businessType !== 'RESTAURANT') {
    return (
      <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-10 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
          <FontAwesomeIcon icon={faUtensils} className="h-5 w-5" />
        </div>
        <h1 className="mt-4 text-xl font-semibold text-slate-900">
          Fitur meja outlet hanya untuk restoran
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Business aktif Anda bukan tipe restaurant, jadi halaman ini tidak digunakan.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-700">
            <FontAwesomeIcon icon={faTableCellsLarge} className="h-3 w-3" />
            Outlet Tables Detail
          </div>

          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
            Kelola Meja Outlet
          </h1>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Outlet: {outlet?.name || '-'} ({outlet?.code || '-'})
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/outlet-tables"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4" />
            Kembali
          </Link>

          <button
            type="button"
            onClick={() => setShowCreateForm((prev) => !prev)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <FontAwesomeIcon icon={showCreateForm ? faXmark : faPlus} className="h-4 w-4" />
            {showCreateForm ? 'Tutup Form' : 'Tambah Meja'}
          </button>
        </div>
      </section>

      {message ? (
        <div
          className={`rounded-2xl px-4 py-3 text-sm ${
            messageType === 'success'
              ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {message}
        </div>
      ) : null}

      {showCreateForm ? (
        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-base font-semibold text-slate-900">Tambah Meja Baru</h2>
          <p className="mt-1 text-sm text-slate-500">
            Buat meja baru untuk outlet ini.
          </p>

          <form onSubmit={handleCreate} className="mt-5 space-y-5">
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Code</label>
                <input
                  value={createForm.code}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, code: e.target.value }))
                  }
                  placeholder="Contoh: A01"
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Nama Meja</label>
                <input
                  value={createForm.name}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Contoh: Meja A1"
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Capacity</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={createForm.capacity}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, capacity: e.target.value }))
                  }
                  placeholder="Contoh: 4"
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Status</label>
                <select
                  value={createForm.status}
                  onChange={(e) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      status: e.target.value as OutletTableStatus,
                    }))
                  }
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={savingCreate}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <FontAwesomeIcon icon={faFloppyDisk} className="h-4 w-4" />
                {savingCreate ? 'Menyimpan...' : 'Simpan Meja'}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Daftar Meja
              </h2>
              <p className="text-sm text-slate-500">
                Cari, edit, dan ubah status meja outlet.
              </p>
            </div>

            <form
              onSubmit={handleSearchSubmit}
              className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]"
            >
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                  <FontAwesomeIcon
                    icon={faMagnifyingGlass}
                    className="h-4 w-4"
                  />
                </span>
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Cari code atau nama meja"
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  <FontAwesomeIcon
                    icon={faMagnifyingGlass}
                    className="h-4 w-4"
                  />
                  Cari
                </button>

                <button
                  type="button"
                  onClick={handleResetFilter}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <FontAwesomeIcon icon={faRotateRight} className="h-4 w-4" />
                  Reset
                </button>
              </div>
            </form>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-3 px-5 py-5 sm:px-6">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-24 animate-pulse rounded-2xl bg-slate-100"
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="px-5 py-12 text-center sm:px-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <FontAwesomeIcon icon={faChair} className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-slate-900">
              Belum ada meja
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Tambahkan meja pertama untuk outlet ini.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 p-4">
            {items.map((item) => {
              const isEditing = editingId === item.id;
              const editForm = editFormMap[item.id];
              const isSavingEdit = savingEditId === item.id;
              const isLoadingStatus = statusLoadingId === item.id;

              return (
                <div
                  key={item.id}
                  className="rounded-[24px] border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-500">
                        <FontAwesomeIcon icon={faChair} className="h-4 w-4" />
                      </div>

                      <div>
                        <h3 className="text-base font-semibold text-slate-900">
                          {item.name}
                        </h3>
                        <p className="mt-1 text-xs text-slate-400">
                          {item.code}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(
                          item.status
                        )}`}
                      >
                        {item.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                      </span>

                      <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                        Capacity: {item.capacity ?? '-'}
                      </span>
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="mt-5 space-y-5">
                      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-slate-700">
                            Code
                          </label>
                          <input
                            value={editForm?.code || ''}
                            onChange={(e) =>
                              setEditFormMap((prev) => ({
                                ...prev,
                                [item.id]: {
                                  ...(prev[item.id] || emptyForm),
                                  code: e.target.value,
                                },
                              }))
                            }
                            className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-slate-700">
                            Nama Meja
                          </label>
                          <input
                            value={editForm?.name || ''}
                            onChange={(e) =>
                              setEditFormMap((prev) => ({
                                ...prev,
                                [item.id]: {
                                  ...(prev[item.id] || emptyForm),
                                  name: e.target.value,
                                },
                              }))
                            }
                            className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-slate-700">
                            Capacity
                          </label>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={editForm?.capacity || ''}
                            onChange={(e) =>
                              setEditFormMap((prev) => ({
                                ...prev,
                                [item.id]: {
                                  ...(prev[item.id] || emptyForm),
                                  capacity: e.target.value,
                                },
                              }))
                            }
                            className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-slate-700">
                            Status
                          </label>
                          <select
                            value={editForm?.status || 'ACTIVE'}
                            onChange={(e) =>
                              setEditFormMap((prev) => ({
                                ...prev,
                                [item.id]: {
                                  ...(prev[item.id] || emptyForm),
                                  status: e.target.value as OutletTableStatus,
                                },
                              }))
                            }
                            className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                          >
                            <option value="ACTIVE">ACTIVE</option>
                            <option value="INACTIVE">INACTIVE</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(null);
                            setEditFormMap((prev) => ({
                              ...prev,
                              [item.id]: {
                                code: item.code,
                                name: item.name,
                                capacity:
                                  item.capacity !== null && item.capacity !== undefined
                                    ? String(item.capacity)
                                    : '',
                                status: item.status,
                              },
                            }));
                          }}
                          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
                          Batal
                        </button>

                        <button
                          type="button"
                          disabled={isSavingEdit}
                          onClick={() => void handleUpdate(item.id)}
                          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          <FontAwesomeIcon icon={faFloppyDisk} className="h-4 w-4" />
                          {isSavingEdit ? 'Menyimpan...' : 'Simpan Perubahan'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="grid gap-2 sm:grid-cols-3">
                        <div className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-600">
                          Code: <span className="font-semibold text-slate-900">{item.code}</span>
                        </div>
                        <div className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-600">
                          Nama: <span className="font-semibold text-slate-900">{item.name}</span>
                        </div>
                        <div className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-600">
                          Capacity:{' '}
                          <span className="font-semibold text-slate-900">
                            {item.capacity ?? '-'}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingId(item.id)}
                          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 text-sm font-semibold text-sky-700 transition hover:bg-sky-100"
                        >
                          <FontAwesomeIcon icon={faPenToSquare} className="h-4 w-4" />
                          Edit
                        </button>

                        <button
                          type="button"
                          disabled={isLoadingStatus}
                          onClick={() => void handleToggleStatus(item)}
                          className={`inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-70 ${
                            item.status === 'ACTIVE'
                              ? 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                              : 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          }`}
                        >
                          <FontAwesomeIcon
                            icon={item.status === 'ACTIVE' ? faBan : faCircleCheck}
                            className="h-4 w-4"
                          />
                          {isLoadingStatus
                            ? 'Memproses...'
                            : item.status === 'ACTIVE'
                              ? 'Nonaktifkan'
                              : 'Aktifkan'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-6">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Catatan Meja Outlet
          </h2>
          <p className="text-sm text-slate-500">
            Meja hanya berlaku untuk outlet restoran ini.
          </p>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[
            'Setiap meja harus punya code unik per outlet.',
            'Nama meja bisa dibuat fleksibel.',
            'Capacity boleh dikosongkan bila belum dipakai.',
            'Status meja bisa diubah tanpa hapus data.',
            'Edit dan create dilakukan langsung di halaman outlet ini.',
            'Validasi utama tetap dilakukan di backend.',
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