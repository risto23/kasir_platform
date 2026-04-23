'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
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
import { resolveImageUrl } from '@/lib/resolve-image-url';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTag, faTrashCan } from '@fortawesome/free-solid-svg-icons';

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
  onIncrease: (item: GuestMenuItem) => void;
  onDecrease: (productId: string) => void;
}) {
  const { item, quantity, onIncrease, onDecrease } = props;

  return (
    <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="relative h-44 w-full overflow-hidden bg-slate-100">
        {item.imageUrl ? (
          <Image
            fill
            src={resolveImageUrl(item.imageUrl)}
            alt={item.name}
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm font-medium text-slate-400">
            No Image
          </div>
        )}

        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          {item.categoryName ? (
            <span className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-slate-700 backdrop-blur">
              {item.categoryName}
            </span>
          ) : null}

          {item.promo ? (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold text-amber-700">
              Promo
            </span>
          ) : null}
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="line-clamp-2 text-base font-semibold text-slate-900">
              {item.name}
            </h3>
            <p className="mt-1 text-xs text-slate-500">{item.code}</p>
            {item.description ? (
              <p className="mt-2 line-clamp-2 text-sm text-slate-500">
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
                <p className="text-base font-semibold text-emerald-600">
                  {formatCurrency(item.finalPrice)}
                </p>
              </>
            ) : (
              <p className="text-base font-semibold text-slate-900">
                {formatCurrency(item.finalPrice)}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-xs font-medium text-slate-600">
            <FontAwesomeIcon icon={faTag} className="h-3 w-3" />
            {item.unit || 'Unit'}
          </div>

          <div className="flex items-center gap-3">
            {quantity > 0 ? (
              <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-1">
                <button
                  type="button"
                  onClick={() => onDecrease(item.id)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-700 transition hover:bg-slate-50"
                >
                  -
                </button>

                <span className="min-w-8 text-center text-sm font-semibold text-slate-900">
                  {quantity}
                </span>

                <button
                  type="button"
                  onClick={() => onIncrease(item)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-700 transition hover:bg-slate-50"
                >
                  +
                </button>
              </div>
            ) : null}

            {/* <button
              type="button"
              onClick={() => onIncrease(item)}
              className={`inline-flex h-11 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 ${
                quantity > 0 ? 'flex-1' : 'w-full'
              }`}
            >
              Tambah
            </button> */}
          </div>
        </div>
        <div>
            <button
              type="button"
              onClick={() =>  onIncrease(item)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <FontAwesomeIcon icon={faPlus} className="h-3.5 w-3.5" />
              Tambah
            </button>
        </div>

        
      </div>
    </div>
  );
}

function GuestMenuPageContent() {
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
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('ALL');

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
        setSelectedCategoryId('ALL');
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

  const categoryOptions = useMemo(() => {
    if (!data) {
      return [];
    }

    return data.categories.map((group, index) => ({
      id: group.categoryId ?? `uncategorized-${index}`,
      label: group.categoryName ?? 'Lainnya',
      count: group.items.length,
    }));
  }, [data]);

  const filteredItems = useMemo(() => {
    if (!data) {
      return [];
    }

    const normalizedKeyword = searchKeyword.trim().toLowerCase();

    return flattenMenuItems(data.categories).filter((item) => {
      const matchesCategory =
        selectedCategoryId === 'ALL' ? true : item.categoryId === selectedCategoryId;

      if (!matchesCategory) {
        return false;
      }

      if (!normalizedKeyword) {
        return true;
      }

      const haystack = [
        item.name,
        item.code,
        item.description ?? '',
        item.categoryName ?? '',
        item.brand ?? '',
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedKeyword);
    });
  }, [data, searchKeyword, selectedCategoryId]);

  const menuItemsById = useMemo(() => {
    if (!data) {
      return new Map<string, GuestMenuItem>();
    }

    return createMenuItemMap(data.categories);
  }, [data]);

  const totalVisibleItems = filteredItems.length;

  if (!hasValidParams) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <section className="rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-6">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              Guest Menu
            </h1>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Pilih menu untuk meja Anda lalu lanjut ke checkout.
            </p>
          </section>

          <section className="rounded-[28px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700 shadow-sm sm:px-6">
            {invalidParamsMessage}
          </section>
        </div>
      </div>
    );
  }

  if (state === 'loading' || state === 'idle') {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-6">
        <div className="mx-auto max-w-7xl rounded-[28px] border border-slate-200 bg-white px-5 py-10 text-center shadow-sm sm:px-6">
          <p className="text-sm text-slate-600">Memuat guest menu...</p>
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <section className="rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-6">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              Guest Menu
            </h1>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Pilih menu untuk meja Anda lalu lanjut ke checkout.
            </p>
          </section>

          <section className="rounded-[28px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700 shadow-sm sm:px-6">
            {errorMessage}
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
                  Guest Order
                </div>

                <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
                  Guest Menu
                </h1>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Pilih menu, atur catatan, lalu lanjut ke checkout untuk dikirim ke kasir.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Outlet
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {data?.outlet.name ?? '-'}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Meja
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {data?.table.name ?? '-'}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Total Item Cart
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{totalItems}</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Grand Total
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {formatCurrency(totalAmount)}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">Daftar Menu</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Semua menu tampil langsung seperti POS. Kategori hanya untuk filter.
                    </p>
                  </div>

                  <div className="w-full lg:max-w-md">
                    <input
                      type="text"
                      value={searchKeyword}
                      onChange={(event) => setSearchKeyword(event.target.value)}
                      placeholder="Cari menu, kode, atau kategori..."
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                    />
                  </div>
                </div>
              </div>

              <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedCategoryId('ALL')}
                    className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
                      selectedCategoryId === 'ALL'
                        ? 'bg-slate-900 text-white'
                        : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Semua ({data?.categories.reduce((sum, group) => sum + group.items.length, 0) ?? 0})
                  </button>

                  {categoryOptions.map((category) => {
                    const isActive = selectedCategoryId === category.id;

                    return (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => setSelectedCategoryId(category.id)}
                        className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
                          isActive
                            ? 'bg-slate-900 text-white'
                            : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {category.label} ({category.count})
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="px-5 py-5 sm:px-6">
                {filteredItems.length > 0 ? (
                  <div className="space-y-4">
                    <div className="text-sm text-slate-500">
                      Menampilkan{' '}
                      <span className="font-semibold text-slate-900">{totalVisibleItems}</span>{' '}
                      menu.
                    </div>

                    <div className="xl:max-h-[calc(100vh-290px)] xl:overflow-y-auto xl:pr-2">
                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {filteredItems.map((item) => (
                          <MenuItemCard
                            key={item.id}
                            item={item}
                            quantity={quantities[item.id] ?? 0}
                            onIncrease={handleIncrease}
                            onDecrease={handleDecrease}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
                    Tidak ada menu yang cocok dengan filter saat ini.
                  </div>
                )}
              </div>
            </section>
          </div>

          <aside className="w-full lg:sticky lg:top-6 lg:w-[380px] lg:self-start">
            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Cart & Checkout</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Pesanan guest akan masuk ke kasir untuk diproses pembayaran.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleClearCart}
                  disabled={!cart || cart.items.length === 0}
                  className="inline-flex h-10 items-center justify-center rounded-2xl border border-rose-200 px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <FontAwesomeIcon icon={faTrashCan} className="h-3.5 w-3.5" />
                  Clear
                </button>
              </div>

              <div className="mt-5 space-y-3 lg:max-h-[300px] lg:overflow-y-auto lg:pr-1">
                {cart && cart.items.length > 0 ? (
                  cart.items.map((item) => (
                    <div
                      key={item.productId}
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {item.productName}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">{item.productCode}</p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveFromCart(item.productId)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                        >
                          <FontAwesomeIcon icon={faTrashCan} className="h-3.5 w-3.5" />
                          
                        </button>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-3">
                        <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-1">
                          <button
                            type="button"
                            onClick={() => handleDecrease(item.productId)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-700 transition hover:bg-slate-50"
                          >
                            -
                          </button>

                          <span className="min-w-8 text-center text-sm font-semibold text-slate-900">
                            {item.quantity}
                          </span>

                          <button
                            type="button"
                            onClick={() => {
                              const sourceItem = menuItemsById.get(item.productId);

                              if (sourceItem) {
                                handleIncrease(sourceItem);
                              }
                            }}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-700 transition hover:bg-slate-50"
                          >
                            +
                          </button>
                        </div>

                        <div className="text-right text-sm">
                          <p className="text-slate-500">{formatCurrency(item.unitPrice)}</p>
                          <p className="font-semibold text-slate-900">
                            {formatCurrency(item.unitPrice * item.quantity)}
                          </p>
                        </div>
                      </div>

                      <textarea
                        value={notesMap[item.productId] ?? item.note ?? ''}
                        onChange={(event) =>
                          handleNoteChange(item.productId, event.target.value)
                        }
                        rows={2}
                        maxLength={MAX_NOTE_LENGTH}
                        placeholder="Catatan item"
                        className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                      />
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                    Cart masih kosong. Tambahkan menu terlebih dahulu.
                  </div>
                )}
              </div>

              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="flex items-center justify-between text-sm">
                  <p className="text-slate-500">Total Item</p>
                  <p className="font-semibold text-slate-900">{totalItems}</p>
                </div>

                <div className="mt-2 flex items-center justify-between text-sm">
                  <p className="text-slate-500">Subtotal</p>
                  <p className="font-semibold text-slate-900">
                    {formatCurrency(totalAmount)}
                  </p>
                </div>

                <div className="mt-3 border-t border-slate-200 pt-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-600">Grand Total</p>
                    <p className="text-base font-semibold text-slate-900">
                      {formatCurrency(totalAmount)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5">
                <Link
                  href={buildGuestCheckoutUrl({
                    outletId,
                    tableId,
                    token,
                  })}
                  className={`inline-flex h-12 w-full items-center justify-center rounded-2xl px-4 text-sm font-semibold transition ${
                    cart && cart.items.length > 0
                      ? 'bg-slate-900 text-white hover:bg-slate-800'
                      : 'pointer-events-none bg-slate-200 text-slate-400'
                  }`}
                >
                  Lanjut ke Checkout
                </Link>
              </div>

              <p className="mt-3 text-xs leading-5 text-slate-500">
                Checkout guest tetap membawa parameter outlet, meja, dan token supaya flow
                public guest tetap aman dan tidak nyasar.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );

  function handleRemoveFromCart(productId: string): void {
    if (!cart) {
      return;
    }

    persistCart({
      ...cart,
      items: cart.items.filter((cartItem) => cartItem.productId !== productId),
    });
  }
}

export default function GuestMenuPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <GuestMenuPageContent />
    </Suspense>
  );
}
