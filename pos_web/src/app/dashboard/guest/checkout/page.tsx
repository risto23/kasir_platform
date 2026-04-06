'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { clearGuestCart, createGuestOrder, getGuestCart } from '@/lib/guest';
import type {
  CreatedGuestOrderResponse,
  GuestCartItem,
  GuestCartStorage,
} from '@/types/guest';

type SubmitState = 'idle' | 'submitting' | 'success' | 'error';

const MAX_NOTE_LENGTH = 200;
const MAX_NAME_LENGTH = 100;
const MAX_ITEM_QUANTITY = 99;
const ID_PATTERN = /^[a-zA-Z0-9_-]+$/;
const TOKEN_PATTERN = /^[a-zA-Z0-9._-]+$/;

function getTextParam(value: string | null): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeIdParam(value: string | null): string {
  const normalized = getTextParam(value);

  if (!normalized || !ID_PATTERN.test(normalized)) {
    return '';
  }

  return normalized;
}

function normalizeTokenParam(value: string | null): string {
  const normalized = getTextParam(value);

  if (
    !normalized ||
    normalized.length < 16 ||
    normalized.length > 2048 ||
    !TOKEN_PATTERN.test(normalized)
  ) {
    return '';
  }

  return normalized;
}

function sanitizeGuestName(value: string): string {
  return value.trim().slice(0, MAX_NAME_LENGTH);
}

function sanitizeNote(value: string): string {
  return value.trim().slice(0, MAX_NOTE_LENGTH);
}

function clampQuantity(value: number): number {
  if (!Number.isFinite(value)) {
    return 1;
  }

  const safeInteger = Math.floor(value);

  if (safeInteger < 1) {
    return 1;
  }

  if (safeInteger > MAX_ITEM_QUANTITY) {
    return MAX_ITEM_QUANTITY;
  }

  return safeInteger;
}

function sanitizeCart(cart: GuestCartStorage | null, params: {
  outletId: string;
  tableId: string;
  token: string;
}): GuestCartStorage | null {
  if (!cart) {
    return null;
  }

  if (
    cart.outletId !== params.outletId ||
    cart.tableId !== params.tableId ||
    cart.token !== params.token
  ) {
    return null;
  }

  const sanitizedItems = cart.items.reduce<GuestCartItem[]>((accumulator, item) => {
    if (!item.productId || !ID_PATTERN.test(item.productId)) {
      return accumulator;
    }

    accumulator.push({
      productId: item.productId,
      productName: item.productName,
      productCode: item.productCode,
      quantity: clampQuantity(item.quantity),
      unitPrice: Number.isFinite(item.unitPrice) ? item.unitPrice : 0,
      note: sanitizeNote(item.note ?? '') || null,
      imageUrl: item.imageUrl,
    });

    return accumulator;
  }, []);

  if (sanitizedItems.length === 0) {
    return null;
  }

  return {
    outletId: params.outletId,
    tableId: params.tableId,
    token: params.token,
    items: sanitizedItems,
  };
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateTime(value: string | null): string {
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

function buildGuestMenuUrl(params: {
  outletId: string;
  tableId: string;
  token: string;
}): string {
  const nextParams = new URLSearchParams({
    outletId: params.outletId,
    tableId: params.tableId,
    token: params.token,
  });

  return `/guest/menu?${nextParams.toString()}`;
}

function OrderItemRow(props: { item: GuestCartItem }) {
  const { item } = props;

  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">
            {item.productName}
          </p>
          <p className="mt-1 text-xs text-slate-500">{item.productCode}</p>
          {item.note ? (
            <p className="mt-2 text-xs text-slate-600">Catatan: {item.note}</p>
          ) : null}
        </div>

        <p className="text-sm font-semibold text-slate-900">x{item.quantity}</p>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <p className="text-sm text-slate-500">{formatCurrency(item.unitPrice)}</p>
        <p className="text-sm font-semibold text-slate-900">
          {formatCurrency(item.unitPrice * item.quantity)}
        </p>
      </div>
    </div>
  );
}

export default function GuestCheckoutPage() {
  const searchParams = useSearchParams();

  const outletId = useMemo(
    () => normalizeIdParam(searchParams.get('outletId')),
    [searchParams],
  );
  const tableId = useMemo(
    () => normalizeIdParam(searchParams.get('tableId')),
    [searchParams],
  );
  const token = useMemo(
    () => normalizeTokenParam(searchParams.get('token')),
    [searchParams],
  );

  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [guestName, setGuestName] = useState<string>('');
  const [orderNotes, setOrderNotes] = useState<string>('');
  const [createdOrder, setCreatedOrder] = useState<CreatedGuestOrderResponse | null>(null);

  const cart = useMemo<GuestCartStorage | null>(() => {
    if (!outletId || !tableId || !token) {
      return null;
    }

    return sanitizeCart(getGuestCart(), {
      outletId,
      tableId,
      token,
    });
  }, [outletId, tableId, token]);

  const pageErrorMessage = useMemo<string>(() => {
    if (!outletId || !tableId || !token) {
      return 'outletId, tableId, dan token guest tidak valid.';
    }

    const storedCart = sanitizeCart(getGuestCart(), {
      outletId,
      tableId,
      token,
    });

    if (!storedCart) {
      return 'Cart guest tidak ditemukan, kosong, atau tidak cocok dengan QR/meja saat ini.';
    }

    return '';
  }, [outletId, tableId, token]);

  const totalItems = useMemo<number>(() => {
    if (!cart) {
      return 0;
    }

    return cart.items.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const subtotal = useMemo<number>(() => {
    if (!cart) {
      return 0;
    }

    return cart.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  }, [cart]);

  async function handleSubmitOrder(): Promise<void> {
    if (!cart || submitState === 'submitting') {
      return;
    }

    try {
      setSubmitState('submitting');
      setErrorMessage('');

      const safeGuestName = sanitizeGuestName(guestName);
      const safeOrderNotes = sanitizeNote(orderNotes);

      const result = await createGuestOrder({
        outletId: cart.outletId,
        payload: {
          tableId: cart.tableId,
          token: cart.token,
          guestName: safeGuestName || null,
          notes: safeOrderNotes || null,
          items: cart.items.map((item) => ({
            productId: item.productId,
            quantity: clampQuantity(item.quantity),
            note: sanitizeNote(item.note ?? '') || null,
          })),
        },
      });

      clearGuestCart();
      setCreatedOrder(result);
      setSubmitState('success');
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Gagal membuat guest order.';
      setErrorMessage(message);
      setSubmitState('error');
    }
  }

  if (submitState === 'success' && createdOrder) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-6">
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
            <h1 className="text-2xl font-bold text-emerald-700">
              Pesanan berhasil dibuat
            </h1>
            <p className="mt-2 text-sm text-emerald-700">
              Pesanan Anda sudah masuk ke antrian kasir dan menunggu pembayaran.
            </p>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Ringkasan Pesanan</h2>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Order Number
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {createdOrder.orderNumber}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Status</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {createdOrder.status}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Payment</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {createdOrder.paymentStatus}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Dibuat</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {formatDateTime(createdOrder.createdAt)}
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {createdOrder.items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-200 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {item.productName}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {item.productCode ?? '-'}
                      </p>
                      {item.note ? (
                        <p className="mt-2 text-xs text-slate-600">Catatan: {item.note}</p>
                      ) : null}
                    </div>

                    <p className="text-sm font-semibold text-slate-900">x{item.quantity}</p>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-sm text-slate-500">
                      {formatCurrency(item.unitPrice)}
                    </p>
                    <p className="text-sm font-semibold text-slate-900">
                      {formatCurrency(item.lineTotal)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 border-t border-slate-200 pt-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">Subtotal</p>
                <p className="text-sm font-semibold text-slate-900">
                  {formatCurrency(createdOrder.subtotal)}
                </p>
              </div>

              <div className="mt-2 flex items-center justify-between">
                <p className="text-sm text-slate-500">Diskon</p>
                <p className="text-sm font-semibold text-slate-900">
                  {formatCurrency(createdOrder.discountAmount)}
                </p>
              </div>

              <div className="mt-2 flex items-center justify-between">
                <p className="text-sm text-slate-500">Total</p>
                <p className="text-xl font-bold text-slate-900">
                  {formatCurrency(createdOrder.totalAmount)}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={buildGuestMenuUrl({
                  outletId,
                  tableId,
                  token,
                })}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Kembali ke Menu
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!cart) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-6">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h1 className="text-2xl font-bold text-slate-900">Guest Checkout</h1>
            <p className="mt-1 text-sm text-slate-600">
              Periksa pesanan Anda sebelum dikirim ke kasir.
            </p>
          </div>

          <div className="rounded-3xl border border-red-200 bg-red-50 p-5 shadow-sm">
            <h2 className="text-base font-semibold text-red-700">
              Checkout tidak bisa dibuka
            </h2>
            <p className="mt-2 text-sm text-red-600">{pageErrorMessage}</p>

            <div className="mt-4">
              <Link
                href={buildGuestMenuUrl({
                  outletId,
                  tableId,
                  token,
                })}
                className="inline-flex items-center justify-center rounded-2xl border border-red-300 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
              >
                Kembali ke Menu
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h1 className="text-2xl font-bold text-slate-900">Guest Checkout</h1>
          <p className="mt-1 text-sm text-slate-600">
            Periksa pesanan Anda sebelum dikirim ke kasir.
          </p>
        </div>

        {submitState === 'error' && errorMessage ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-5 shadow-sm">
            <h2 className="text-base font-semibold text-red-700">
              Gagal membuat pesanan
            </h2>
            <p className="mt-2 text-sm text-red-600">{errorMessage}</p>
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">
                Informasi Pemesan
              </h2>

              <div className="mt-5 grid gap-4">
                <div>
                  <label
                    htmlFor="guestName"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Nama Pemesan
                  </label>
                  <input
                    id="guestName"
                    type="text"
                    maxLength={MAX_NAME_LENGTH}
                    value={guestName}
                    onChange={(event) => setGuestName(event.target.value)}
                    placeholder="opsional"
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="orderNotes"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Catatan Pesanan
                  </label>
                  <textarea
                    id="orderNotes"
                    value={orderNotes}
                    maxLength={MAX_NOTE_LENGTH}
                    onChange={(event) => setOrderNotes(event.target.value)}
                    placeholder="opsional"
                    rows={4}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-500"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Item Pesanan</h2>

              <div className="mt-5 space-y-3">
                {cart.items.map((item) => (
                  <OrderItemRow key={item.productId} item={item} />
                ))}
              </div>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Ringkasan</h2>

              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-500">Total Item</p>
                  <p className="text-sm font-semibold text-slate-900">{totalItems}</p>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-500">Subtotal</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {formatCurrency(subtotal)}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => {
                    void handleSubmitOrder();
                  }}
                  disabled={submitState === 'submitting'}
                  className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitState === 'submitting'
                    ? 'Mengirim Pesanan...'
                    : 'Kirim Pesanan'}
                </button>

                <Link
                  href={buildGuestMenuUrl({
                    outletId,
                    tableId,
                    token,
                  })}
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Kembali ke Menu
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
