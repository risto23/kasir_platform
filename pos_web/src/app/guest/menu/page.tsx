'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  clearGuestCart,
  getGuestCart,
  getGuestMenu,
  saveGuestCart,
} from '@/lib/guest';
import type {
  GuestCartItem,
  GuestCartStorage,
  GuestMenuCategoryGroup,
  GuestMenuItem,
  GuestMenuResponse,
} from '@/types/guest';

type LoadState = 'idle' | 'loading' | 'success' | 'error';

const MAX_NOTE_LENGTH = 200;
const MAX_ITEM_QUANTITY = 99;
const ID_PATTERN = /^[a-zA-Z0-9_-]+$/;
const TOKEN_PATTERN = /^[a-zA-Z0-9._:%-]+$/;

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

function buildGuestCheckoutUrl(params: {
  outletId: string;
  tableId: string;
  token: string;
}): string {
  const nextParams = new URLSearchParams({
    outletId: params.outletId,
    tableId: params.tableId,
    token: params.token,
  });

  return `/guest/checkout?${nextParams.toString()}`;
}

function getInitialNoteMap(items: GuestCartItem[]): Record<string, string> {
  return items.reduce<Record<string, string>>((accumulator, item) => {
    accumulator[item.productId] = sanitizeNote(item.note);
    return accumulator;
  }, {});
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
      imageUrl: menuItem.imageUrl,
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

function MenuItemCard(props: {
  item: GuestMenuItem;
  quantity: number;
  note: string;
  onIncrease: (item: GuestMenuItem) => void;
  onDecrease: (productId: string) => void;
  onNoteChange: (productId: string, note: string) => void;
}) {
  const { item, quantity, note, onIncrease, onDecrease, onNoteChange } = props;

  return (
    <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="flex gap-4">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-100">
          {item.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.imageUrl}
              alt={item.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-xs font-medium text-slate-400">No Image</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900">{item.name}</h3>
              <p className="mt-1 text-xs text-slate-500">{item.code}</p>
              {item.description ? (
                <p className="mt-2 line-clamp-2 text-sm text-slate-600">
                  {item.description}
                </p>
              ) : null}
            </div>

            <div className="text-right">
              {item.discountAmount > 0 ? (
                <>
                  <p className="text-xs text-slate-400 line-through">
                    {formatCurrency(item.outletPrice)}
                  </p>
                  <p className="text-base font-bold text-emerald-600">
                    {formatCurrency(item.finalPrice)}
                  </p>
                </>
              ) : (
                <p className="text-base font-bold text-slate-900">
                  {formatCurrency(item.finalPrice)}
                </p>
              )}
            </div>
          </div>

          {item.promo ? (
            <div className="mt-3 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
              Promo: {item.promo.name}
            </div>
          ) : null}

          <div className="mt-4">
            <label className="mb-1 block text-xs font-medium text-slate-500">
              Catatan
            </label>
            <input
              type="text"
              value={note}
              maxLength={MAX_NOTE_LENGTH}
              onChange={(event) => onNoteChange(item.id, event.target.value)}
              placeholder="contoh: pedas, tanpa es, dll"
              className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-500"
            />
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 p-1">
              <button
                type="button"
                onClick={() => onDecrease(item.id)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-lg font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                -
              </button>

              <span className="min-w-8 text-center text-sm font-semibold text-slate-900">
                {quantity}
              </span>

              <button
                type="button"
                onClick={() => onIncrease(item)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-lg font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                +
              </button>
            </div>

            <button
              type="button"
              onClick={() => onIncrease(item)}
              className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Tambah
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CategorySection(props: {
  group: GuestMenuCategoryGroup;
  quantities: Record<string, number>;
  notes: Record<string, string>;
  onIncrease: (item: GuestMenuItem) => void;
  onDecrease: (productId: string) => void;
  onNoteChange: (productId: string, note: string) => void;
}) {
  const { group, quantities, notes, onIncrease, onDecrease, onNoteChange } = props;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-slate-900">
          {group.categoryName ?? 'Lainnya'}
        </h2>
        <p className="mt-1 text-sm text-slate-500">{group.items.length} menu</p>
      </div>

      <div className="grid gap-4">
        {group.items.map((item) => (
          <MenuItemCard
            key={item.id}
            item={item}
            quantity={quantities[item.id] ?? 0}
            note={notes[item.id] ?? ''}
            onIncrease={onIncrease}
            onDecrease={onDecrease}
            onNoteChange={onNoteChange}
          />
        ))}
      </div>
    </section>
  );
}

export default function GuestMenuPage() {
  const searchParams = useSearchParams();
  const hasLoadedRef = useRef(false);

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

  const [state, setState] = useState<LoadState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [data, setData] = useState<GuestMenuResponse | null>(null);
  const [cart, setCart] = useState<GuestCartStorage | null>(null);
  const [notesMap, setNotesMap] = useState<Record<string, string>>({});

  useEffect(() => {
    hasLoadedRef.current = false;
  }, [requestKey]);

  useEffect(() => {
    if (!hasValidParams) {
      clearGuestCart();
      return;
    }

    if (hasLoadedRef.current) {
      return;
    }

    hasLoadedRef.current = true;

    const controller = new AbortController();

    async function loadMenu() {
      try {
        setState('loading');
        setErrorMessage('');

        const result = await getGuestMenu(
          {
            outletId,
            tableId,
            token,
          },
          {
            signal: controller.signal,
          },
        );

        if (controller.signal.aborted) {
          return;
        }

        if (result.outlet.id !== outletId || result.table.id !== tableId) {
          clearGuestCart();
          setErrorMessage('Token guest tidak cocok dengan outlet atau meja yang diminta.');
          setData(null);
          setCart(null);
          setNotesMap({});
          setState('error');
          return;
        }

        const menuItemMap = createMenuItemMap(result.categories);
        const sanitizedCart = sanitizeCartAgainstMenu({
          existingCart: getGuestCart(),
          outletId,
          tableId,
          token,
          menuItemMap,
        });

        saveGuestCart(sanitizedCart);
        setData(result);
        setCart(sanitizedCart);
        setNotesMap(getInitialNoteMap(sanitizedCart.items));
        setState('success');
      } catch (error: unknown) {
        if (controller.signal.aborted) {
          return;
        }

        clearGuestCart();

        const message =
          error instanceof Error ? error.message : 'Gagal memuat guest menu.';
        setErrorMessage(message);
        setData(null);
        setCart(null);
        setNotesMap({});
        setState('error');
      }
    }

    void loadMenu();

    return () => {
      controller.abort();
    };
  }, [hasValidParams, outletId, tableId, token, requestKey]);

  function persistCart(nextCart: GuestCartStorage): void {
    setCart(nextCart);
    saveGuestCart(nextCart);
  }

  function handleIncrease(item: GuestMenuItem): void {
    if (!cart) {
      return;
    }

    const currentNote = sanitizeNote(notesMap[item.id] ?? '');
    const existingItem = cart.items.find((cartItem) => cartItem.productId === item.id);

    let nextItems: GuestCartItem[];

    if (existingItem) {
      nextItems = cart.items.map((cartItem) =>
        cartItem.productId === item.id
          ? {
              ...cartItem,
              quantity: clampQuantity(cartItem.quantity + 1),
              unitPrice: item.finalPrice,
              productName: item.name,
              productCode: item.code,
              imageUrl: item.imageUrl,
              note: currentNote || null,
            }
          : cartItem,
      );
    } else {
      nextItems = [
        ...cart.items,
        {
          productId: item.id,
          productName: item.name,
          productCode: item.code,
          quantity: 1,
          unitPrice: item.finalPrice,
          note: currentNote || null,
          imageUrl: item.imageUrl,
        },
      ];
    }

    persistCart({
      ...cart,
      items: nextItems,
    });
  }

  function handleDecrease(productId: string): void {
    if (!cart) {
      return;
    }

    const existingItem = cart.items.find((cartItem) => cartItem.productId === productId);

    if (!existingItem) {
      return;
    }

    const nextItems =
      existingItem.quantity <= 1
        ? cart.items.filter((cartItem) => cartItem.productId !== productId)
        : cart.items.map((cartItem) =>
            cartItem.productId === productId
              ? {
                  ...cartItem,
                  quantity: clampQuantity(cartItem.quantity - 1),
                }
              : cartItem,
          );

    persistCart({
      ...cart,
      items: nextItems,
    });
  }

  function handleNoteChange(productId: string, note: string): void {
    const sanitized = sanitizeNote(note);

    setNotesMap((previous) => ({
      ...previous,
      [productId]: sanitized,
    }));

    if (!cart) {
      return;
    }

    const existingItem = cart.items.find((cartItem) => cartItem.productId === productId);

    if (!existingItem) {
      return;
    }

    const nextItems = cart.items.map((cartItem) =>
      cartItem.productId === productId
        ? {
            ...cartItem,
            note: sanitized || null,
          }
        : cartItem,
    );

    persistCart({
      ...cart,
      items: nextItems,
    });
  }

  function handleClearCart(): void {
    if (!cart) {
      return;
    }

    const nextCart: GuestCartStorage = {
      ...cart,
      items: [],
    };

    persistCart(nextCart);
    setNotesMap({});
  }

  const quantities = useMemo<Record<string, number>>(() => {
    if (!cart) {
      return {};
    }

    return cart.items.reduce<Record<string, number>>((accumulator, item) => {
      accumulator[item.productId] = item.quantity;
      return accumulator;
    }, {});
  }, [cart]);

  const totalItems = useMemo(() => {
    if (!cart) {
      return 0;
    }

    return cart.items.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const totalAmount = useMemo(() => {
    if (!cart) {
      return 0;
    }

    return cart.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  }, [cart]);

  if (!hasValidParams) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-6">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h1 className="text-2xl font-bold text-slate-900">Guest Menu</h1>
            <p className="mt-1 text-sm text-slate-600">
              Pilih menu untuk meja Anda lalu lanjut ke checkout.
            </p>
          </div>

          <div className="rounded-3xl border border-red-200 bg-red-50 p-5 shadow-sm">
            <h2 className="text-base font-semibold text-red-700">
              Guest menu tidak bisa dibuka
            </h2>
            <p className="mt-2 text-sm text-red-600">{invalidParamsMessage}</p>
          </div>
        </div>
      </div>
    );
  }

  if (state === 'loading' || state === 'idle') {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-6">
        <div className="mx-auto max-w-6xl rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-600">Memuat guest menu...</p>
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-6">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h1 className="text-2xl font-bold text-slate-900">Guest Menu</h1>
            <p className="mt-1 text-sm text-slate-600">
              Pilih menu untuk meja Anda lalu lanjut ke checkout.
            </p>
          </div>

          <div className="rounded-3xl border border-red-200 bg-red-50 p-5 shadow-sm">
            <h2 className="text-base font-semibold text-red-700">
              Guest menu tidak bisa dibuka
            </h2>
            <p className="mt-2 text-sm text-red-600">{errorMessage}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-4 py-6 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1 space-y-6">
          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h1 className="text-2xl font-bold text-slate-900">Guest Menu</h1>
            <p className="mt-1 text-sm text-slate-600">
              Pilih menu untuk meja Anda lalu lanjut ke checkout.
            </p>

            {data ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Outlet</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {data.outlet.name}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Meja</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {data.table.name}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Total Item
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {totalItems}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Total</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {formatCurrency(totalAmount)}
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          {data?.categories.map((group) => (
            <CategorySection
              key={group.categoryId ?? group.categoryName ?? 'uncategorized'}
              group={group}
              quantities={quantities}
              notes={notesMap}
              onIncrease={handleIncrease}
              onDecrease={handleDecrease}
              onNoteChange={handleNoteChange}
            />
          ))}
        </div>

        <aside className="w-full lg:sticky lg:top-6 lg:w-[360px]">
          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Cart</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Periksa item yang akan dikirim ke checkout.
                </p>
              </div>

              <button
                type="button"
                onClick={handleClearCart}
                disabled={!cart || cart.items.length === 0}
                className="inline-flex items-center justify-center rounded-2xl border border-red-300 px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Clear Cart
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {cart && cart.items.length > 0 ? (
                cart.items.map((item) => (
                  <div
                    key={item.productId}
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {item.productName}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">{item.productCode}</p>
                        {item.note ? (
                          <p className="mt-2 text-xs text-slate-600">
                            Catatan: {item.note}
                          </p>
                        ) : null}
                      </div>

                      <p className="text-sm font-semibold text-slate-900">
                        x{item.quantity}
                      </p>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-sm text-slate-500">
                        {formatCurrency(item.unitPrice)}
                      </p>
                      <p className="text-sm font-semibold text-slate-900">
                        {formatCurrency(item.unitPrice * item.quantity)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
                  Cart masih kosong. Tambahkan menu terlebih dahulu.
                </div>
              )}
            </div>

            <div className="mt-5 border-t border-slate-200 pt-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">Total Item</p>
                <p className="text-sm font-semibold text-slate-900">{totalItems}</p>
              </div>

              <div className="mt-2 flex items-center justify-between">
                <p className="text-sm text-slate-500">Subtotal</p>
                <p className="text-sm font-semibold text-slate-900">
                  {formatCurrency(totalAmount)}
                </p>
              </div>
            </div>

            <div className="mt-5">
              <Link
                href={buildGuestCheckoutUrl({
                  outletId,
                  tableId,
                  token,
                })}
                className={`inline-flex w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-medium transition ${
                  cart && cart.items.length > 0
                    ? 'bg-slate-900 text-white hover:bg-slate-800'
                    : 'pointer-events-none bg-slate-200 text-slate-400'
                }`}
              >
                Lanjut ke Checkout
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}