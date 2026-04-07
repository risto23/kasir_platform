'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  faCheck,
  faCircleNotch,
  faPenToSquare,
  faPlus,
  faPowerOff,
  faRotate,
  faSitemap,
  faUsers,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import {
  createBusinessUser,
  getAuthContext,
  getBusinessRoles,
  getBusinessUserDetail,
  getBusinessUserOutletAccess,
  getBusinessUsers,
  getOutlets,
  updateBusinessUser,
  updateBusinessUserOutletAccess,
  updateBusinessUserStatus,
} from '@/lib/business-user-client';
import type {
  AuthUserContext,
  BusinessRoleCode,
  BusinessRoleItem,
  BusinessUserListItem,
  BusinessUserStatus,
  OutletItem,
} from '@/types/business-user';

type ModalMode = 'create' | 'edit' | null;

type UserFormState = {
  fullName: string;
  email: string;
  password: string;
  businessRoleCode: BusinessRoleCode | '';
  hasAllOutletAccess: boolean;
  outletIds: string[];
};

type OutletAccessFormState = {
  businessUserId: string;
  hasAllOutletAccess: boolean;
  outletIds: string[];
};

const INITIAL_USER_FORM: UserFormState = {
  fullName: '',
  email: '',
  password: '',
  businessRoleCode: '',
  hasAllOutletAccess: false,
  outletIds: [],
};

const INITIAL_OUTLET_ACCESS_FORM: OutletAccessFormState = {
  businessUserId: '',
  hasAllOutletAccess: false,
  outletIds: [],
};

function clsxm(...classNames: Array<string | false | null | undefined>) {
  return classNames.filter(Boolean).join(' ');
}

function hasPermission(context: AuthUserContext | null, code: string) {
  return Boolean(context?.permissions.includes(code));
}

function isSuperAdmin(context: AuthUserContext | null) {
  return Boolean(context?.platformRoles.includes('SUPER_ADMIN'));
}

function formatDateTime(value?: string | null) {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function getStatusBadgeClass(status: BusinessUserStatus) {
  return status === 'ACTIVE'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : 'border-rose-200 bg-rose-50 text-rose-700';
}

function getOutletNames(user: BusinessUserListItem) {
  if (user.hasAllOutletAccess) {
    return 'Semua outlet';
  }

  const names =
    user.outletAccesses
      ?.map((item) => item.outlet?.name || item.outlet?.code)
      .filter(Boolean)
      .join(', ') ?? '';

  return names || '-';
}

function isOutletScopedRole(roleCode: BusinessRoleCode | '') {
  return roleCode === 'CASHIER' || roleCode === 'KITCHEN' || roleCode === 'INVENTORY';
}

function isOwnerRole(roleCode: BusinessRoleCode | '') {
  return roleCode === 'OWNER';
}

function isAdminRole(roleCode: BusinessRoleCode | '') {
  return roleCode === 'ADMIN';
}

export default function BusinessUsersPage() {
  const [authContext, setAuthContext] = useState<AuthUserContext | null>(null);
  const [roles, setRoles] = useState<BusinessRoleItem[]>([]);
  const [outlets, setOutlets] = useState<OutletItem[]>([]);
  const [users, setUsers] = useState<BusinessUserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [outletSubmitLoading, setOutletSubmitLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [feedback, setFeedback] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedUser, setSelectedUser] = useState<BusinessUserListItem | null>(null);
  const [userForm, setUserForm] = useState<UserFormState>(INITIAL_USER_FORM);
  const [outletModalOpen, setOutletModalOpen] = useState(false);
  const [outletAccessForm, setOutletAccessForm] = useState<OutletAccessFormState>(INITIAL_OUTLET_ACCESS_FORM);

  const canView = hasPermission(authContext, 'BUSINESS_USER_VIEW') || isSuperAdmin(authContext);
  const canCreate = hasPermission(authContext, 'BUSINESS_USER_CREATE') || isSuperAdmin(authContext);
  const canUpdate = hasPermission(authContext, 'BUSINESS_USER_UPDATE') || isSuperAdmin(authContext);
  const canUpdateStatus =
    hasPermission(authContext, 'BUSINESS_USER_STATUS_UPDATE') || isSuperAdmin(authContext);
  const canAssignOutlet =
    hasPermission(authContext, 'BUSINESS_USER_ASSIGN_OUTLET') || isSuperAdmin(authContext);

  const activeBusinessId = authContext?.activeBusinessId ?? null;

  const filteredUsers = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    if (!keyword) {
      return users;
    }

    return users.filter((item) => {
      const haystack = [
        item.user.fullName,
        item.user.email,
        item.businessRole.name,
        item.businessRole.code,
        getOutletNames(item),
        item.status,
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(keyword);
    });
  }, [query, users]);

  async function loadPage() {
    setLoading(true);
    setError('');
    setFeedback('');

    try {
      const nextAuth = await getAuthContext();
      setAuthContext(nextAuth);

      if (!nextAuth.activeBusinessId) {
        setRoles([]);
        setOutlets([]);
        setUsers([]);
        return;
      }

      const [nextRoles, nextOutlets, nextUsers] = await Promise.all([
        getBusinessRoles(nextAuth.activeBusinessId),
        getOutlets(nextAuth.activeBusinessId),
        getBusinessUsers(nextAuth.activeBusinessId),
      ]);

      setRoles(nextRoles);
      setOutlets(nextOutlets);
      setUsers(nextUsers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat halaman business users');
    } finally {
      setLoading(false);
    }
  }

  async function refreshUsers() {
    if (!activeBusinessId) return;

    setTableLoading(true);
    setError('');

    try {
      const nextUsers = await getBusinessUsers(activeBusinessId);
      setUsers(nextUsers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat daftar user');
    } finally {
      setTableLoading(false);
    }
  }

  useEffect(() => {
    void loadPage();
  }, []);

  function openCreateModal() {
    const defaultRoleCode = roles[0]?.code ?? '';

    setSelectedUser(null);
    setUserForm({
      ...INITIAL_USER_FORM,
      businessRoleCode: defaultRoleCode,
      hasAllOutletAccess: defaultRoleCode === 'OWNER' || defaultRoleCode === 'ADMIN',
    });
    setModalMode('create');
  }

  async function openEditModal(user: BusinessUserListItem) {
    setSubmitLoading(true);
    setError('');
    setFeedback('');

    try {
      const detail = await getBusinessUserDetail(user.id, activeBusinessId);

      setSelectedUser(detail);
      setUserForm({
        fullName: detail.user.fullName,
        email: detail.user.email,
        password: '',
        businessRoleCode: detail.businessRole.code,
        hasAllOutletAccess: detail.hasAllOutletAccess,
        outletIds: (detail.outletAccesses ?? [])
          .map((item) => item.outletId)
          .filter((item) => Boolean(item)),
      });
      setModalMode('edit');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat detail user');
    } finally {
      setSubmitLoading(false);
    }
  }

  function closeUserModal() {
    setModalMode(null);
    setSelectedUser(null);
    setUserForm(INITIAL_USER_FORM);
  }

  function handleChangeRole(roleCode: BusinessRoleCode | '') {
    if (isOwnerRole(roleCode)) {
      setUserForm((prev) => ({
        ...prev,
        businessRoleCode: roleCode,
        hasAllOutletAccess: true,
        outletIds: [],
      }));
      return;
    }

    if (isOutletScopedRole(roleCode)) {
      setUserForm((prev) => ({
        ...prev,
        businessRoleCode: roleCode,
        hasAllOutletAccess: false,
      }));
      return;
    }

    if (isAdminRole(roleCode)) {
      setUserForm((prev) => ({
        ...prev,
        businessRoleCode: roleCode,
        hasAllOutletAccess: true,
        outletIds: [],
      }));
      return;
    }

    setUserForm((prev) => ({
      ...prev,
      businessRoleCode: roleCode,
    }));
  }

  function toggleUserOutlet(outletId: string) {
    setUserForm((prev) => {
      const exists = prev.outletIds.includes(outletId);

      return {
        ...prev,
        outletIds: exists
          ? prev.outletIds.filter((item) => item !== outletId)
          : [...prev.outletIds, outletId],
      };
    });
  }

  async function handleSubmitUser() {
    if (!activeBusinessId) {
      setError('Business aktif belum dipilih');
      return;
    }

    if (!userForm.fullName.trim() || !userForm.email.trim() || !userForm.businessRoleCode) {
      setError('Nama, email, dan role wajib diisi');
      return;
    }

    if (modalMode === 'create' && !userForm.password.trim()) {
      setError('Password wajib diisi');
      return;
    }

    if (isOutletScopedRole(userForm.businessRoleCode) && userForm.outletIds.length === 0) {
      setError('Role outlet-scoped wajib memiliki minimal 1 outlet access');
      return;
    }

    if (
      isAdminRole(userForm.businessRoleCode) &&
      !userForm.hasAllOutletAccess &&
      userForm.outletIds.length === 0
    ) {
      setError('ADMIN limited wajib memiliki minimal 1 outlet access');
      return;
    }

    setSubmitLoading(true);
    setError('');
    setFeedback('');

    try {
      if (modalMode === 'create') {
        await createBusinessUser(
          {
            fullName: userForm.fullName.trim(),
            email: userForm.email.trim(),
            password: userForm.password,
            businessRoleCode: userForm.businessRoleCode,
            hasAllOutletAccess: isOwnerRole(userForm.businessRoleCode)
              ? true
              : userForm.hasAllOutletAccess,
            outletIds:
              isOwnerRole(userForm.businessRoleCode) || userForm.hasAllOutletAccess
                ? []
                : userForm.outletIds,
          },
          activeBusinessId,
        );
        setFeedback('User bisnis berhasil dibuat');
      }

      if (modalMode === 'edit' && selectedUser) {
        await updateBusinessUser(
          selectedUser.id,
          {
            fullName: userForm.fullName.trim(),
            email: userForm.email.trim(),
            businessRoleCode: userForm.businessRoleCode,
            hasAllOutletAccess: isOwnerRole(userForm.businessRoleCode)
              ? true
              : userForm.hasAllOutletAccess,
            outletIds:
              isOwnerRole(userForm.businessRoleCode) || userForm.hasAllOutletAccess
                ? []
                : userForm.outletIds,
          },
          activeBusinessId,
        );
        setFeedback('User bisnis berhasil diperbarui');
      }

      closeUserModal();
      await refreshUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan user bisnis');
    } finally {
      setSubmitLoading(false);
    }
  }

  async function handleToggleStatus(user: BusinessUserListItem) {
    if (!activeBusinessId) {
      setError('Business aktif belum dipilih');
      return;
    }

    const nextStatus: BusinessUserStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

    setTableLoading(true);
    setError('');
    setFeedback('');

    try {
      await updateBusinessUserStatus(
        user.id,
        {
          status: nextStatus,
        },
        activeBusinessId,
      );

      setFeedback(`Status user berhasil diubah ke ${nextStatus}`);
      await refreshUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengubah status user');
    } finally {
      setTableLoading(false);
    }
  }

  async function openOutletAccessModal(user: BusinessUserListItem) {
    if (!activeBusinessId) {
      setError('Business aktif belum dipilih');
      return;
    }

    setOutletSubmitLoading(true);
    setError('');
    setFeedback('');

    try {
      const detail = await getBusinessUserOutletAccess(user.id, outlets, activeBusinessId);

      setSelectedUser(user);
      setOutletAccessForm({
        businessUserId: user.id,
        hasAllOutletAccess: detail.hasAllOutletAccess,
        outletIds: detail.selectedOutletIds,
      });
      setOutletModalOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat outlet access');
    } finally {
      setOutletSubmitLoading(false);
    }
  }

  function closeOutletModal() {
    setOutletModalOpen(false);
    setSelectedUser(null);
    setOutletAccessForm(INITIAL_OUTLET_ACCESS_FORM);
  }

  async function handleSubmitOutletAccess() {
    if (!activeBusinessId || !outletAccessForm.businessUserId) {
      setError('Business aktif atau business user tidak valid');
      return;
    }

    if (!outletAccessForm.hasAllOutletAccess && outletAccessForm.outletIds.length === 0) {
      setError('Pilih minimal satu outlet atau aktifkan semua outlet');
      return;
    }

    setOutletSubmitLoading(true);
    setError('');
    setFeedback('');

    try {
      await updateBusinessUserOutletAccess(
        outletAccessForm.businessUserId,
        {
          hasAllOutletAccess: outletAccessForm.hasAllOutletAccess,
          outletIds: outletAccessForm.hasAllOutletAccess ? [] : outletAccessForm.outletIds,
        },
        activeBusinessId,
      );

      setFeedback('Outlet access berhasil diperbarui');
      closeOutletModal();
      await refreshUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memperbarui outlet access');
    } finally {
      setOutletSubmitLoading(false);
    }
  }

  function toggleOutlet(outletId: string) {
    setOutletAccessForm((prev) => {
      const exists = prev.outletIds.includes(outletId);

      return {
        ...prev,
        outletIds: exists
          ? prev.outletIds.filter((item) => item !== outletId)
          : [...prev.outletIds, outletId],
      };
    });
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600 shadow-sm">
          <FontAwesomeIcon icon={faCircleNotch} className="animate-spin" />
          Memuat business user management...
        </div>
      </div>
    );
  }

  if (!activeBusinessId) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-800">
          Business aktif belum dipilih. Untuk super admin, pilih business aktif dulu supaya header
          <span className="mx-1 font-semibold">x-business-id</span>
          ikut terkirim.
        </div>
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-700">
        Kamu tidak punya akses untuk melihat business users.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-2 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white">
              <FontAwesomeIcon icon={faUsers} />
            </div>
            <h1 className="text-2xl font-semibold text-slate-900">Business Users</h1>
            <p className="mt-1 text-sm text-slate-500">
              Kelola user bisnis, role bisnis, status user, dan outlet access.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => void refreshUsers()}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <FontAwesomeIcon icon={faRotate} className={clsxm(tableLoading && 'animate-spin')} />
              Refresh
            </button>

            {canCreate ? (
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                <FontAwesomeIcon icon={faPlus} />
                Tambah User
              </button>
            ) : null}
          </div>
        </div>

        {feedback ? (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {feedback}
          </div>
        ) : null}

        {error ? (
          <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm text-slate-500">Total user</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">{users.length}</div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm text-slate-500">User aktif</div>
            <div className="mt-2 text-2xl font-semibold text-emerald-700">
              {users.filter((item) => item.status === 'ACTIVE').length}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm text-slate-500">Role tersedia</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">{roles.length}</div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-md">
            <label className="mb-2 block text-sm font-medium text-slate-700">Cari user</label>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari nama, email, role, outlet, status"
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
            />
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  User
                </th>
                <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Role
                </th>
                <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Outlet Access
                </th>
                <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Status
                </th>
                <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Dibuat
                </th>
                <th className="border-b border-slate-200 px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">
                    Tidak ada business user.
                  </td>
                </tr>
              ) : null}

              {filteredUsers.map((item) => (
                <tr key={item.id} className="odd:bg-white even:bg-slate-50/50">
                  <td className="border-b border-slate-100 px-4 py-4 align-top">
                    <div className="font-medium text-slate-900">{item.user.fullName}</div>
                    <div className="mt-1 text-sm text-slate-500">{item.user.email}</div>
                  </td>

                  <td className="border-b border-slate-100 px-4 py-4 align-top">
                    <div className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      {item.businessRole.name}
                    </div>
                    <div className="mt-2 text-xs text-slate-500">{item.businessRole.code}</div>
                  </td>

                  <td className="border-b border-slate-100 px-4 py-4 align-top">
                    <div className="text-sm text-slate-700">{getOutletNames(item)}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {item.hasAllOutletAccess ? 'Scope: all outlets' : 'Scope: selected outlets'}
                    </div>
                  </td>

                  <td className="border-b border-slate-100 px-4 py-4 align-top">
                    <span
                      className={clsxm(
                        'inline-flex rounded-full border px-3 py-1 text-xs font-semibold',
                        getStatusBadgeClass(item.status),
                      )}
                    >
                      {item.status}
                    </span>
                  </td>

                  <td className="border-b border-slate-100 px-4 py-4 align-top text-sm text-slate-500">
                    {formatDateTime(item.createdAt)}
                  </td>

                  <td className="border-b border-slate-100 px-4 py-4 align-top">
                    <div className="flex justify-end gap-2">
                      {canUpdate ? (
                        <button
                          type="button"
                          onClick={() => void openEditModal(item)}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          <FontAwesomeIcon icon={faPenToSquare} />
                          Edit
                        </button>
                      ) : null}

                      {canAssignOutlet ? (
                        <button
                          type="button"
                          onClick={() => void openOutletAccessModal(item)}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          <FontAwesomeIcon icon={faSitemap} />
                          Outlet
                        </button>
                      ) : null}

                      {canUpdateStatus ? (
                        <button
                          type="button"
                          onClick={() => void handleToggleStatus(item)}
                          className={clsxm(
                            'inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium',
                            item.status === 'ACTIVE'
                              ? 'border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                              : 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
                          )}
                        >
                          <FontAwesomeIcon icon={faPowerOff} />
                          {item.status === 'ACTIVE' ? 'Nonaktifkan' : 'Aktifkan'}
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {modalMode ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-3xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  {modalMode === 'create' ? 'Tambah Business User' : 'Edit Business User'}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {modalMode === 'create'
                    ? 'Buat user bisnis baru lalu assign role sesuai kebutuhan.'
                    : 'Perbarui data user bisnis tanpa mengubah yang tidak perlu.'}
                </p>
              </div>

              <button
                type="button"
                onClick={closeUserModal}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 hover:bg-slate-50"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-700">Nama lengkap</label>
                <input
                  value={userForm.fullName}
                  onChange={(event) =>
                    setUserForm((prev) => ({
                      ...prev,
                      fullName: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                  placeholder="Masukkan nama lengkap"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-700">Email</label>
                <input
                  type="email"
                  value={userForm.email}
                  onChange={(event) =>
                    setUserForm((prev) => ({
                      ...prev,
                      email: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                  placeholder="Masukkan email"
                />
              </div>

              {modalMode === 'create' ? (
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-700">Password</label>
                  <input
                    type="password"
                    value={userForm.password}
                    onChange={(event) =>
                      setUserForm((prev) => ({
                        ...prev,
                        password: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                    placeholder="Masukkan password"
                  />
                </div>
              ) : null}

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-700">Role</label>
                <select
                  value={userForm.businessRoleCode}
                  onChange={(event) =>
                    handleChangeRole(event.target.value as BusinessRoleCode | '')
                  }
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                >
                  <option value="">Pilih role</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.code}>
                      {role.name} ({role.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={userForm.hasAllOutletAccess}
                    onChange={(event) =>
                      setUserForm((prev) => ({
                        ...prev,
                        hasAllOutletAccess: isOwnerRole(prev.businessRoleCode)
                          ? true
                          : isOutletScopedRole(prev.businessRoleCode)
                            ? false
                            : event.target.checked,
                        outletIds:
                          event.target.checked || isOwnerRole(prev.businessRoleCode)
                            ? []
                            : prev.outletIds,
                      }))
                    }
                    disabled={
                      isOwnerRole(userForm.businessRoleCode) ||
                      isOutletScopedRole(userForm.businessRoleCode)
                    }
                    className="mt-1 h-4 w-4 rounded border-slate-300"
                  />
                  <div>
                    <div className="font-medium text-slate-900">Berikan akses ke semua outlet</div>
                    <div className="mt-1 text-sm text-slate-500">
                      OWNER selalu all outlet. CASHIER, KITCHEN, dan INVENTORY wajib outlet-scoped.
                    </div>
                  </div>
                </label>
              </div>

              <div className="md:col-span-2">
                <div className="mb-3 text-sm font-medium text-slate-700">Pilih outlet access</div>

                <div className="grid max-h-[260px] gap-3 overflow-y-auto md:grid-cols-2">
                  {outlets.map((outlet) => {
                    const checked = userForm.outletIds.includes(outlet.id);
                    const disabled =
                      userForm.hasAllOutletAccess || isOwnerRole(userForm.businessRoleCode);

                    return (
                      <label
                        key={outlet.id}
                        className={clsxm(
                          'flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition',
                          checked
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-200 bg-white text-slate-900 hover:bg-slate-50',
                          disabled && 'pointer-events-none opacity-50',
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleUserOutlet(outlet.id)}
                          disabled={disabled}
                          className="mt-1 h-4 w-4 rounded"
                        />

                        <div>
                          <div className="font-medium">{outlet.name}</div>
                          <div className={clsxm('mt-1 text-sm', checked ? 'text-slate-200' : 'text-slate-500')}>
                            {outlet.code}
                          </div>
                          {outlet.address ? (
                            <div className={clsxm('mt-1 text-xs', checked ? 'text-slate-300' : 'text-slate-400')}>
                              {outlet.address}
                            </div>
                          ) : null}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeUserModal}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={() => void handleSubmitUser()}
                disabled={submitLoading}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FontAwesomeIcon
                  icon={submitLoading ? faCircleNotch : faCheck}
                  className={clsxm(submitLoading && 'animate-spin')}
                />
                {modalMode === 'create' ? 'Simpan User' : 'Update User'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {outletModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-3xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Assign Outlet Access</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Atur scope outlet untuk {selectedUser?.user.fullName ?? 'user ini'}.
                </p>
              </div>

              <button
                type="button"
                onClick={closeOutletModal}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 hover:bg-slate-50"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={outletAccessForm.hasAllOutletAccess}
                  onChange={(event) =>
                    setOutletAccessForm((prev) => ({
                      ...prev,
                      hasAllOutletAccess: event.target.checked,
                      outletIds: event.target.checked ? [] : prev.outletIds,
                    }))
                  }
                  className="mt-1 h-4 w-4 rounded border-slate-300"
                />
                <div>
                  <div className="font-medium text-slate-900">Berikan akses ke semua outlet</div>
                  <div className="mt-1 text-sm text-slate-500">
                    Jika aktif, outlet access manual tidak perlu dipilih.
                  </div>
                </div>
              </label>
            </div>

            <div className="mt-5">
              <div className="mb-3 text-sm font-medium text-slate-700">Daftar outlet</div>

              <div className="grid max-h-[320px] gap-3 overflow-y-auto md:grid-cols-2">
                {outlets.map((outlet) => {
                  const checked = outletAccessForm.outletIds.includes(outlet.id);

                  return (
                    <label
                      key={outlet.id}
                      className={clsxm(
                        'flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition',
                        checked
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 bg-white text-slate-900 hover:bg-slate-50',
                        outletAccessForm.hasAllOutletAccess && 'pointer-events-none opacity-50',
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleOutlet(outlet.id)}
                        disabled={outletAccessForm.hasAllOutletAccess}
                        className="mt-1 h-4 w-4 rounded"
                      />

                      <div>
                        <div className="font-medium">{outlet.name}</div>
                        <div className={clsxm('mt-1 text-sm', checked ? 'text-slate-200' : 'text-slate-500')}>
                          {outlet.code}
                        </div>
                        {outlet.address ? (
                          <div className={clsxm('mt-1 text-xs', checked ? 'text-slate-300' : 'text-slate-400')}>
                            {outlet.address}
                          </div>
                        ) : null}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeOutletModal}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={() => void handleSubmitOutletAccess()}
                disabled={outletSubmitLoading}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FontAwesomeIcon
                  icon={outletSubmitLoading ? faCircleNotch : faCheck}
                  className={clsxm(outletSubmitLoading && 'animate-spin')}
                />
                Simpan Outlet Access
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}