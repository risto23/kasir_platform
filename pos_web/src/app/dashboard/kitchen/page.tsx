'use client';

import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowRotateRight,
  faBowlFood,
  faCheck,
  faCircleNotch,
  faClock,
  faReceipt,
  faStore,
  faTruckFast,
  faUtensils,
} from '@fortawesome/free-solid-svg-icons';

import {
  canAccessKitchenPage,
  fetchKitchenOrders,
  fetchKitchenOutlets,
  getActiveBusinessMembership,
  isSuperAdminUser,
  updateKitchenItemStatus,
} from '@/lib/kitchen';
import type {
  KitchenItemStatus,
  KitchenOrder,
  KitchenQueueFilter,
  OutletOption,
} from '@/types/kitchen';

type AllowedActionStatus = Extract<
  KitchenItemStatus,
  'PROCESSING' | 'DONE' | 'SERVED'
>;

function getMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || 'Terjadi kesalahan';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Terjadi kesalahan';
}

function formatDateTime(value: string | null) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function getKitchenItemBadgeClass(status: KitchenItemStatus) {
  if (status === 'PENDING') {
    return 'border border-amber-200 bg-amber-50 text-amber-700';
  }

  if (status === 'PROCESSING') {
    return 'border border-sky-200 bg-sky-50 text-sky-700';
  }

  if (status === 'DONE') {
    return 'border border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  if (status === 'SERVED') {
    return 'border border-violet-200 bg-violet-50 text-violet-700';
  }

  return 'border border-slate-200 bg-slate-100 text-slate-600';
}

function getKitchenOrderBadgeClass(status: KitchenOrder['status']) {
  if (status === 'SUBMITTED') {
    return 'border border-amber-200 bg-amber-50 text-amber-700';
  }

  if (status === 'IN_PROGRESS') {
    return 'border border-sky-200 bg-sky-50 text-sky-700';
  }

  if (status === 'READY') {
    return 'border border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  return 'border border-slate-200 bg-slate-100 text-slate-600';
}

function getKitchenActionLabel(status: AllowedActionStatus) {
  if (status === 'PROCESSING') {
    return 'Proses';
  }

  if (status === 'DONE') {
    return 'Done';
  }

  return 'Served';
}

function getNextKitchenAction(
  currentStatus: KitchenItemStatus,
): AllowedActionStatus | null {
  if (currentStatus === 'PENDING') {
    return 'PROCESSING';
  }

  if (currentStatus === 'PROCESSING') {
    return 'DONE';
  }

  if (currentStatus === 'DONE') {
    return 'SERVED';
  }

  return null;
}

const kitchenQueues: Array<{
  value: KitchenQueueFilter;
  label: string;
  helper: string;
}> = [
  {
    value: 'WAITING',
    label: 'Menunggu Diproses',
    helper: 'Hanya menampilkan item dengan status pending.',
  },
  {
    value: 'PROCESSING',
    label: 'Sedang Diproses',
    helper: 'Hanya menampilkan item yang sedang dikerjakan kitchen.',
  },
  {
    value: 'READY',
    label: 'Siap Disajikan',
    helper: 'Hanya menampilkan item yang sudah done dan siap disajikan.',
  },
];

export default function KitchenDashboardPage() {
  const router = useRouter();
  const membership = useMemo(() => getActiveBusinessMembership(), []);
  const isSuperAdmin = useMemo(() => isSuperAdminUser(), []);
  const hasAccess = useMemo(() => canAccessKitchenPage(), []);

  const [outlets, setOutlets] = useState<OutletOption[]>([]);
  const [selectedOutletId, setSelectedOutletId] = useState('');
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [outletLoading, setOutletLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [actionLoadingKey, setActionLoadingKey] = useState<string | null>(null);
  const [queue, setQueue] = useState<KitchenQueueFilter>('WAITING');

  async function loadOutlets() {
    try {
      setOutletLoading(true);
      setMessage('');

      const result = await fetchKitchenOutlets();
      setOutlets(result);

      if (result.length > 0) {
        setSelectedOutletId((currentValue) =>
          currentValue && result.some((item) => item.id === currentValue)
            ? currentValue
            : result[0].id,
        );
      } else {
        setSelectedOutletId('');
      }
    } catch (error: unknown) {
      setMessage(getMessage(error));
      setOutlets([]);
      setSelectedOutletId('');
    } finally {
      setOutletLoading(false);
    }
  }

  async function loadOrders(outletId: string, currentQueue: KitchenQueueFilter) {
    if (!outletId) {
      setOrders([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setMessage('');

      const result = await fetchKitchenOrders({
        outletId,
        page: 1,
        perPage: 50,
        queue: currentQueue,
      });

      setOrders(result.items);
    } catch (error: unknown) {
      setMessage(getMessage(error));
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    if (!selectedOutletId) {
      return;
    }

    await loadOrders(selectedOutletId, queue);
  }

  async function handleUpdateItemStatus(params: {
    orderId: string;
    itemId: string;
    nextStatus: AllowedActionStatus;
  }) {
    const actionKey = `${params.orderId}:${params.itemId}`;

    try {
      setActionLoadingKey(actionKey);
      setMessage('');

      await updateKitchenItemStatus({
        orderId: params.orderId,
        itemId: params.itemId,
        status: params.nextStatus,
      });

      await loadOrders(selectedOutletId, queue);
    } catch (error: unknown) {
      setMessage(getMessage(error));
    } finally {
      setActionLoadingKey(null);
    }
  }

  useEffect(() => {
    if (!hasAccess) {
      router.replace('/dashboard');
      return;
    }

    if (!isSuperAdmin && membership?.businessType !== 'RESTAURANT') {
      router.replace('/dashboard');
      return;
    }

    void loadOutlets();
  }, [hasAccess, isSuperAdmin, membership?.businessType, router]);

  useEffect(() => {
    if (!hasAccess) {
      return;
    }

    if (!selectedOutletId) {
      setOrders([]);
      setLoading(false);
      return;
    }

    void loadOrders(selectedOutletId, queue);
  }, [hasAccess, selectedOutletId, queue]);

  const pendingCount = useMemo(
    () =>
      orders.reduce(
        (total, order) =>
          total +
          order.items.filter((item) => item.status === 'PENDING').length,
        0,
      ),
    [orders],
  );

  const processingCount = useMemo(
    () =>
      orders.reduce(
        (total, order) =>
          total +
          order.items.filter((item) => item.status === 'PROCESSING').length,
        0,
      ),
    [orders],
  );

  const doneCount = useMemo(
    () =>
      orders.reduce(
        (total, order) =>
          total + order.items.filter((item) => item.status === 'DONE').length,
        0,
      ),
    [orders],
  );

  const selectedOutlet = useMemo(
    () => outlets.find((item) => item.id === selectedOutletId) ?? null,
    [outlets, selectedOutletId],
  );

  if (!hasAccess) {
    return null;
  }

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-700">
            <FontAwesomeIcon icon={faUtensils} className="h-3 w-3" />
            Kitchen Display
          </div>

          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
            Dashboard Kitchen
          </h1>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Kitchen hanya melihat order yang memang sudah siap diproses dari kasir.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void handleRefresh()}
          disabled={loading || !selectedOutletId}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <FontAwesomeIcon icon={faArrowRotateRight} className="h-4 w-4" />
          Refresh
        </button>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Outlet Aktif</p>
          <p className="mt-2 text-lg font-semibold tracking-tight text-slate-900">
            {selectedOutlet ? `${selectedOutlet.name} (${selectedOutlet.code})` : '-'}
          </p>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Order Tampil</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
            {loading ? '-' : orders.length}
          </p>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Item Pending</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-amber-600">
            {loading ? '-' : pendingCount}
          </p>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Item Diproses / Done</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-sky-600">
            {loading ? '-' : processingCount + doneCount}
          </p>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-end">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Antrian Kitchen
              </h2>
              <p className="text-sm text-slate-500">
                Filter queue sekarang berdasarkan status item kitchen.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Outlet
              </label>
              <select
                value={selectedOutletId}
                onChange={(event) => setSelectedOutletId(event.target.value)}
                disabled={outletLoading || outlets.length === 0}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:ring-1 focus:ring-orange-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {outlets.length === 0 ? (
                  <option value="">Tidak ada outlet</option>
                ) : null}

                {outlets.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {kitchenQueues.map((queueOption) => {
              const isActive = queueOption.value === queue;

              return (
                <button
                  key={queueOption.value}
                  type="button"
                  onClick={() => setQueue(queueOption.value)}
                  className={`rounded-2xl px-4 py-3 text-left transition ${
                    isActive
                      ? 'bg-slate-900 text-white'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-sm font-semibold">{queueOption.label}</div>
                  <div
                    className={`mt-1 text-xs ${
                      isActive ? 'text-slate-200' : 'text-slate-500'
                    }`}
                  >
                    {queueOption.helper}
                  </div>
                </button>
              );
            })}
          </div>
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
                className="h-32 animate-pulse rounded-2xl bg-slate-100"
              />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="px-5 py-12 text-center sm:px-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <FontAwesomeIcon icon={faBowlFood} className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-slate-900">
              Belum ada item kitchen
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Saat ada item yang sesuai dengan queue ini, datanya akan tampil di sini.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 p-4 sm:p-6">
            {orders.map((order) => (
              <div
                key={order.id}
                className="rounded-[24px] border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-slate-900">
                        {order.orderNumber}
                      </h3>

                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold ${getKitchenOrderBadgeClass(
                          order.status,
                        )}`}
                      >
                        {order.status}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-500">
                      <span className="inline-flex items-center gap-2">
                        <FontAwesomeIcon icon={faStore} className="h-3.5 w-3.5" />
                        {selectedOutlet?.name || '-'}
                      </span>

                      <span className="inline-flex items-center gap-2">
                        <FontAwesomeIcon icon={faReceipt} className="h-3.5 w-3.5" />
                        {order.table
                          ? `${order.table.name} (${order.table.code})`
                          : 'Tanpa meja'}
                      </span>

                      <span className="inline-flex items-center gap-2">
                        <FontAwesomeIcon icon={faClock} className="h-3.5 w-3.5" />
                        {formatDateTime(order.submittedAt || order.createdAt)}
                      </span>
                    </div>

                    {order.notes ? (
                      <p className="mt-3 rounded-2xl bg-white px-3 py-2 text-sm text-slate-600">
                        Catatan order: {order.notes}
                      </p>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-3 gap-2 lg:min-w-[260px]">
                    <div className="rounded-2xl bg-white px-3 py-3 text-center">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Pending
                      </p>
                      <p className="mt-1 text-xl font-semibold text-amber-600">
                        {
                          order.items.filter((item) => item.status === 'PENDING')
                            .length
                        }
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white px-3 py-3 text-center">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Process
                      </p>
                      <p className="mt-1 text-xl font-semibold text-sky-600">
                        {
                          order.items.filter(
                            (item) => item.status === 'PROCESSING',
                          ).length
                        }
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white px-3 py-3 text-center">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Done
                      </p>
                      <p className="mt-1 text-xl font-semibold text-emerald-600">
                        {
                          order.items.filter((item) => item.status === 'DONE')
                            .length
                        }
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-3">
                  {order.items.map((item) => {
                    const nextAction = getNextKitchenAction(item.status);
                    const actionKey = `${order.id}:${item.id}`;
                    const isActionLoading = actionLoadingKey === actionKey;

                    return (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-slate-200 bg-white p-4"
                      >
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-slate-900">
                                {item.productName}
                              </p>
                              <span
                                className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold ${getKitchenItemBadgeClass(
                                  item.status,
                                )}`}
                              >
                                {item.status}
                              </span>
                            </div>

                            <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-500">
                              <span>Qty: {item.quantity}</span>
                              <span>Code: {item.productCode || '-'}</span>
                              <span>SKU: {item.productSku || '-'}</span>
                            </div>

                            {item.note ? (
                              <p className="mt-2 text-sm text-slate-600">
                                Catatan item: {item.note}
                              </p>
                            ) : null}
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {nextAction ? (
                              <button
                                type="button"
                                disabled={isActionLoading}
                                onClick={() =>
                                  void handleUpdateItemStatus({
                                    orderId: order.id,
                                    itemId: item.id,
                                    nextStatus: nextAction,
                                  })
                                }
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <FontAwesomeIcon
                                  icon={
                                    isActionLoading
                                      ? faCircleNotch
                                      : nextAction === 'SERVED'
                                        ? faTruckFast
                                        : faCheck
                                  }
                                  className={`h-4 w-4 ${
                                    isActionLoading ? 'animate-spin' : ''
                                  }`}
                                />
                                {isActionLoading
                                  ? 'Memproses...'
                                  : getKitchenActionLabel(nextAction)}
                              </button>
                            ) : (
                              <div className="inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-500">
                                Tidak ada aksi
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}