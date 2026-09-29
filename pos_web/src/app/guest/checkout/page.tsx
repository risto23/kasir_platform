'use client';

import Link from 'next/link';
import axios from 'axios';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faBasketShopping,
  faCashRegister,
  faCircleCheck,
  faClipboardList,
  faImage,
  faMinus,
  faPlus,
  faReceipt,
  faTrashCan,
} from '@fortawesome/free-solid-svg-icons';
import { resolveImageUrl } from '@/lib/resolve-image-url';
import {
  calculateGuestCharges,
  clearGuestCart,
  createGuestOrder,
  getGuestCart,
  getGuestMenu,
  saveGuestCart,
} from '@/lib/guest';
import type {
  CreateGuestOrderPayload,
  CreatedGuestOrderResponse,
  GuestCartItem,
  GuestCartStorage,
  GuestMenuCategoryGroup,
  GuestMenuChargeRule,
  GuestMenuItem,
  GuestMenuRoundingSetting,
} from '@/types/guest';
import Image from 'next/image';

type SubmitState = 'idle' | 'submitting' | 'success' | 'error';
type LoadState = 'idle' | 'loading' | 'success' | 'error';

const ID_PATTERN = /^[a-zA-Z0-9_-]+$/;
const TOKEN_PATTERN = /^[a-zA-Z0-9._:%-]+$/;
const MAX_ITEM_QUANTITY = 99;
const MAX_NOTE_LENGTH = 200;

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
    normalized.length > 4096 ||
    !TOKEN_PATTERN.test(normalized)
  ) {
    return '';
  }

  return normalized;
}

function sanitizeNote(value: string | null | undefined): string {
  if (typeof value !== 'string') {
    return '';
  }

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

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);
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

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const responseMessage = error.response?.data?.message;

    if (typeof responseMessage === 'string' && responseMessage.trim()) {
      return responseMessage;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Terjadi kesalahan.';
}

function flattenMenuItems(categories: GuestMenuCategoryGroup[]): GuestMenuItem[] {
  return categories.flatMap((group) => group.items);
}

function createMenuItemMap(categories: GuestMenuCategoryGroup[]): Map<string, GuestMenuItem> {
  return new Map(flattenMenuItems(categories).map((item) => [item.id, item]));
}

function sanitizeCartAgainstMenu(params: {
  existingCart: GuestCartStorage | null;
  outletId: string;
  tableId: string;
  token: string;
  menuItemMap: Map<string, GuestMenuItem>;
}): GuestCartStorage {
  const { existingCart, outletId, tableId, token, menuItemMap } = params;

  if (
    !existingCart ||
    existingCart.outletId !== outletId ||
    existingCart.tableId !== tableId ||
    existingCart.token !== token
  ) {
    return {
      outletId,
      tableId,
      token,
      items: [],
    };
  }

  const sanitizedItems = existingCart.items.reduce<GuestCartItem[]>((accumulator, cartItem) => {
    const menuItem = menuItemMap.get(cartItem.productId);

    if (!menuItem) {
      return accumulator;
    }

    accumulator.push({
      productId: menuItem.id,
      productName: menuItem.name,
      productCode: menuItem.code,
      quantity: clampQuantity(cartItem.quantity),
      unitPrice: menuItem.finalPrice,
      note: sanitizeNote(cartItem.note) || null,
      imageUrl: menuItem.imageUrl ?? null,
    });

    return accumulator;
  }, []);

  return {
    outletId,
    tableId,
    token,
    items: sanitizedItems,
  };
}

function GuestCheckoutPageContent() {
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

  const requestKey = `${outletId}::${tableId}::${token}`;
  const hasValidParams = Boolean(outletId && tableId && token);
  const invalidParamsMessage = 'outletId, tableId, dan token guest tidak valid.';

  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [loadErrorMessage, setLoadErrorMessage] = useState('');
  const [cartOverrideState, setCartOverrideState] = useState<{
    key: string;
    cart: GuestCartStorage | null;
  } | null>(null);

  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [successData, setSuccessData] = useState<CreatedGuestOrderResponse | null>(null);
  const [chargeConfig, setChargeConfig] = useState<{
    charges: GuestMenuChargeRule[];
    rounding: GuestMenuRoundingSetting | undefined;
  }>({ charges: [], rounding: undefined });

useEffect(() => {
  let isCancelled = false;

  async function loadCheckoutCart(): Promise<void> {
    if (!hasValidParams) {
      if (isCancelled) {
        return;
      }

      setLoadState('error');
      setLoadErrorMessage(invalidParamsMessage);
      setCartOverrideState({
        key: requestKey,
        cart: null,
      });
      return;
    }

    try {
      setLoadState('loading');
      setLoadErrorMessage('');

      const existingCart = getGuestCart();

      const menuResponse = await getGuestMenu({
        outletId,
        tableId,
        token,
      });

      if (isCancelled) {
        return;
      }

      const menuItemMap = createMenuItemMap(menuResponse.categories);

      setChargeConfig({
        charges: menuResponse.charges ?? [],
        rounding: menuResponse.rounding,
      });

      const sanitizedCart = sanitizeCartAgainstMenu({
        existingCart,
        outletId,
        tableId,
        token,
        menuItemMap,
      });

      saveGuestCart(sanitizedCart);

      setCartOverrideState({
        key: requestKey,
        cart: sanitizedCart,
      });

      setLoadState('success');
    } catch (error: unknown) {
      if (isCancelled) {
        return;
      }

      setLoadState('error');
      setLoadErrorMessage(getErrorMessage(error));
      setCartOverrideState({
        key: requestKey,
        cart: null,
      });
    }
  }

  void loadCheckoutCart();

  return () => {
    isCancelled = true;
  };
}, [hasValidParams, invalidParamsMessage, outletId, requestKey, tableId, token]);

  const cart =
    cartOverrideState && cartOverrideState.key === requestKey
      ? cartOverrideState.cart
      : null;

  const hasLoadError = loadState === 'error';
  const isLoading = loadState === 'idle' || loadState === 'loading';
  const effectiveErrorMessage = submitState === 'error' ? errorMessage : loadErrorMessage;

  function persistCart(nextCart: GuestCartStorage): void {
    setCartOverrideState({
      key: requestKey,
      cart: nextCart,
    });
    saveGuestCart(nextCart);
  }

  function handleIncrease(productId: string): void {
    if (!cart) {
      return;
    }

    const nextItems = cart.items.map((item) =>
      item.productId === productId
        ? {
            ...item,
            quantity: clampQuantity(item.quantity + 1),
          }
        : item,
    );

    persistCart({
      outletId: cart.outletId,
      tableId: cart.tableId,
      token: cart.token,
      items: nextItems,
    });
  }

  function handleDecrease(productId: string): void {
    if (!cart) {
      return;
    }

    const targetItem = cart.items.find((item) => item.productId === productId);

    if (!targetItem) {
      return;
    }

    const nextItems =
      targetItem.quantity <= 1
        ? cart.items.filter((item) => item.productId !== productId)
        : cart.items.map((item) =>
            item.productId === productId
              ? {
                  ...item,
                  quantity: clampQuantity(item.quantity - 1),
                }
              : item,
          );

    persistCart({
      outletId: cart.outletId,
      tableId: cart.tableId,
      token: cart.token,
      items: nextItems,
    });
  }

  function handleRemove(productId: string): void {
    if (!cart) {
      return;
    }

    persistCart({
      outletId: cart.outletId,
      tableId: cart.tableId,
      token: cart.token,
      items: cart.items.filter((item) => item.productId !== productId),
    });
  }

  function handleClearCart(): void {
    if (!cart) {
      return;
    }

    const emptyCart: GuestCartStorage = {
      outletId: cart.outletId,
      tableId: cart.tableId,
      token: cart.token,
      items: [],
    };

    persistCart(emptyCart);
  }

  async function handleSubmitOrder(): Promise<void> {
    if (!cart || cart.items.length === 0) {
      setSubmitState('error');
      setErrorMessage('Cart masih kosong.');
      return;
    }

    try {
      setSubmitState('submitting');
      setErrorMessage('');

      const payload: CreateGuestOrderPayload = {
        tableId,
        token,
        items: cart.items.map((item) => ({
          productId: item.productId,
          quantity: clampQuantity(item.quantity),
          note: sanitizeNote(item.note) || null,
        })),
      };

      const result = await createGuestOrder({
        outletId,
        payload,
      });

      clearGuestCart();

      setCartOverrideState({
        key: requestKey,
        cart: {
          outletId,
          tableId,
          token,
          items: [],
        },
      });

      setSuccessData(result);
      setSubmitState('success');
    } catch (error: unknown) {
      setSubmitState('error');
      setErrorMessage(getErrorMessage(error));
    }
  }

  const totalItems = useMemo(() => {
    if (!cart) {
      return 0;
    }

    return cart.items.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const subtotal = useMemo(() => {
    if (!cart) {
      return 0;
    }

    return cart.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  }, [cart]);

  const chargeSummary = useMemo(
    () => calculateGuestCharges(subtotal, chargeConfig.charges, chargeConfig.rounding),
    [subtotal, chargeConfig],
  );

  const menuUrl = hasValidParams
    ? buildGuestMenuUrl({
        outletId,
        tableId,
        token,
      })
    : '/guest/menu';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <section className="rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-700">
              <FontAwesomeIcon icon={faCashRegister} className="h-3 w-3" />
              Guest Checkout
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
              Checkout Guest
            </h1>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Memuat ringkasan pesanan...
            </p>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white px-5 py-10 shadow-sm sm:px-6">
            <div className="text-center text-sm text-slate-500">Loading...</div>
          </section>
        </div>
      </div>
    );
  }

  if (hasLoadError) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <section className="rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-700">
              <FontAwesomeIcon icon={faCashRegister} className="h-3 w-3" />
              Guest Checkout
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
              Checkout Guest
            </h1>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Periksa pesanan sebelum dikirim ke kasir.
            </p>
          </section>

          <section className="rounded-[28px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700 shadow-sm sm:px-6">
            {effectiveErrorMessage}
          </section>

          <Link
            href={menuUrl}
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Kembali ke Menu
          </Link>
        </div>
      </div>
    );
  }

  if (submitState === 'success') {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-6">
        <div className="mx-auto max-w-4xl space-y-6">
          <section className="rounded-[28px] border border-emerald-200 bg-white px-5 py-8 shadow-sm sm:px-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <FontAwesomeIcon icon={faCircleCheck} className="h-7 w-7" />
            </div>

            <div className="mt-5 text-center">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                Pesanan berhasil dikirim
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Pesanan guest sudah masuk ke sistem dan menunggu proses kasir.
              </p>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Outlet ID
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{outletId}</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Table ID
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{tableId}</p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Ringkasan Response
              </p>
              <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs leading-6 text-slate-700">
                {JSON.stringify(successData, null, 2)}
              </pre>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={menuUrl}
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Pesan Lagi
              </Link>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1 space-y-6">
            <section className="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-6 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-700">
                  <FontAwesomeIcon icon={faCashRegister} className="h-3 w-3" />
                  Guest Checkout
                </div>

                <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
                  Checkout Guest
                </h1>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Review item pesanan sebelum dikirim ke kasir.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Outlet ID
                  </p>
                  <p className="mt-2 break-all text-sm font-semibold text-slate-900">
                    {outletId}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Table ID
                  </p>
                  <p className="mt-2 break-all text-sm font-semibold text-slate-900">
                    {tableId}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Total Item
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{totalItems}</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Grand Total
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {formatCurrency(chargeSummary.grandTotal)}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">Ringkasan Pesanan</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Tampilan checkout dibuat searah dengan layout POS.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={menuUrl}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      <FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4" />
                      Kembali ke Menu
                    </Link>

                    <button
                      type="button"
                      onClick={handleClearCart}
                      disabled={!cart || cart.items.length === 0}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <FontAwesomeIcon icon={faTrashCan} className="h-4 w-4" />
                      Clear Cart
                    </button>
                  </div>
                </div>
              </div>

              {submitState === 'error' && effectiveErrorMessage ? (
                <div className="px-5 pt-5 sm:px-6">
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {effectiveErrorMessage}
                  </div>
                </div>
              ) : null}

              <div className="px-5 py-5 sm:px-6">
                {cart && cart.items.length > 0 ? (
                  <div className="grid gap-4">
                    {cart.items.map((item) => (
                      <article
                        key={item.productId}
                        className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm"
                      >
                        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start">
                          <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 text-slate-400">
                            {item.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <Image
                                width={96}
                                height={96}
                                src={resolveImageUrl(item.imageUrl)}
                                alt={item.productName}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <FontAwesomeIcon icon={faImage} className="h-5 w-5" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <h3 className="truncate text-base font-semibold text-slate-900">
                                  {item.productName}
                                </h3>
                                <p className="mt-1 text-xs text-slate-500">{item.productCode}</p>

                                {item.note ? (
                                  <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
                                    Catatan: {item.note}
                                  </div>
                                ) : null}
                              </div>

                              <div className="shrink-0 text-left sm:text-right">
                                <p className="text-xs text-slate-500">Harga satuan</p>
                                <p className="mt-1 text-sm font-semibold text-slate-900">
                                  {formatCurrency(item.unitPrice)}
                                </p>
                                <p className="mt-2 text-xs text-slate-500">Total</p>
                                <p className="mt-1 text-base font-semibold text-slate-900">
                                  {formatCurrency(item.unitPrice * item.quantity)}
                                </p>
                              </div>
                            </div>

                            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                              <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1">
                                <button
                                  type="button"
                                  onClick={() => handleDecrease(item.productId)}
                                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-700 transition hover:bg-white"
                                >
                                  <FontAwesomeIcon icon={faMinus} className="h-3.5 w-3.5" />
                                </button>

                                <span className="min-w-8 text-center text-sm font-semibold text-slate-900">
                                  {item.quantity}
                                </span>

                                <button
                                  type="button"
                                  onClick={() => handleIncrease(item.productId)}
                                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-700 transition hover:bg-white"
                                >
                                  <FontAwesomeIcon icon={faPlus} className="h-3.5 w-3.5" />
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleRemove(item.productId)}
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                              >
                                <FontAwesomeIcon icon={faTrashCan} className="h-3.5 w-3.5" />
                                Hapus
                              </button>
                            </div>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-5 py-12 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-500">
                      <FontAwesomeIcon icon={faBasketShopping} className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 text-base font-semibold text-slate-900">
                      Cart masih kosong
                    </h3>
                    <p className="mt-2 text-sm text-slate-500">
                      Tambahkan menu dulu sebelum checkout.
                    </p>
                    <Link
                      href={menuUrl}
                      className="mt-5 inline-flex h-11 items-center justify-center rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      Pilih Menu
                    </Link>
                  </div>
                )}
              </div>
            </section>
          </div>

          <aside className="w-full lg:sticky lg:top-6 lg:w-[380px]">
            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Payment Summary</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Pesanan guest akan dikirim ke kasir untuk proses pembayaran.
                </p>
              </div>

              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="flex items-center justify-between text-sm">
                  <p className="text-slate-500">Total Item</p>
                  <p className="font-semibold text-slate-900">{totalItems}</p>
                </div>

                <div className="mt-2 flex items-center justify-between text-sm">
                  <p className="text-slate-500">Subtotal</p>
                  <p className="font-semibold text-slate-900">{formatCurrency(subtotal)}</p>
                </div>

                <div className="mt-2 flex items-center justify-between text-sm">
                  <p className="text-slate-500">Tax</p>
                  <p className="font-semibold text-slate-900">
                    {formatCurrency(chargeSummary.taxAmount)}
                  </p>
                </div>

                <div className="mt-2 flex items-center justify-between text-sm">
                  <p className="text-slate-500">Service</p>
                  <p className="font-semibold text-slate-900">
                    {formatCurrency(chargeSummary.serviceChargeAmount)}
                  </p>
                </div>

                {chargeSummary.otherChargeAmount > 0 && (
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <p className="text-slate-500">Biaya Lain</p>
                    <p className="font-semibold text-slate-900">
                      {formatCurrency(chargeSummary.otherChargeAmount)}
                    </p>
                  </div>
                )}

                {chargeSummary.roundingAmount !== 0 && (
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <p className="text-slate-500">Pembulatan</p>
                    <p className="font-semibold text-slate-900">
                      {chargeSummary.roundingAmount > 0 ? '+' : '-'}
                      {formatCurrency(Math.abs(chargeSummary.roundingAmount))}
                    </p>
                  </div>
                )}

                <div className="mt-3 border-t border-slate-200 pt-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-600">Grand Total</p>
                    <p className="text-base font-semibold text-slate-900">
                      {formatCurrency(chargeSummary.grandTotal)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <button
                  type="button"
                  onClick={() => void handleSubmitOrder()}
                  disabled={!cart || cart.items.length === 0 || submitState === 'submitting'}
                  className={`inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold transition ${
                    !cart || cart.items.length === 0 || submitState === 'submitting'
                      ? 'cursor-not-allowed bg-slate-200 text-slate-400'
                      : 'bg-slate-900 text-white hover:bg-slate-800'
                  }`}
                >
                  <FontAwesomeIcon icon={faReceipt} className="h-4 w-4" />
                  {submitState === 'submitting' ? 'Mengirim Pesanan...' : 'Kirim ke Kasir'}
                </button>

                <Link
                  href={menuUrl}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <FontAwesomeIcon icon={faClipboardList} className="h-4 w-4" />
                  Ubah Pesanan
                </Link>
              </div>

              <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-xs leading-6 text-amber-800">
                Setelah dikirim, pesanan guest masuk ke alur kasir. Grand Total sudah termasuk
                tax, service, dan pembulatan outlet. Total akhir mengikuti struk dari kasir.
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default function GuestCheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <GuestCheckoutPageContent />
    </Suspense>
  );
}