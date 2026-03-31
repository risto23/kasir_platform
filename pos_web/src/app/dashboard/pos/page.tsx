// pos_web/src/app/dashboard/pos/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowRotateLeft,
  faBasketShopping,
  faBoxesStacked,
  faCashRegister,
  faClockRotateLeft,
  faCreditCard,
  faEye,
  faMagnifyingGlass,
  faMinus,
  faPlus,
  faPrint,
  faReceipt,
  faTrashCan,
  faUtensils,
  faWallet,
} from '@fortawesome/free-solid-svg-icons';

import { getActiveBusinessId, getCachedCurrentUser } from '@/lib/auth';
import { getReceiptByOrderId } from '@/lib/receipt';
import {
  addOrderItem,
  buildCharges,
  calculateGrandTotal,
  createCartLine,
  createOrder,
  createPayment,
  formatCurrency,
  formatDateTime,
  getOutletOrderHistory,
  getPosChargeSettings,
  getPosOutlets,
  getPosProducts,
  getPosTables,
  recalculateCart,
} from '@/lib/pos';
import type {
  PosBusinessType,
  PosCartItem,
  PosHistoryItem,
  PosOutletItem,
  PosPaymentMethod,
  PosProductItem,
  PosReceiptResponse,
  PosSettingsChargeRule,
  PosTableItem,
} from '@/types/pos';

function getMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || fallback;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

function getBusinessType(): PosBusinessType {
  const currentUser = getCachedCurrentUser();
  const activeBusinessId = getActiveBusinessId();

  const membership = currentUser?.businessMemberships?.find(
    (item) => item.businessId === activeBusinessId,
  );

  return membership?.businessType === 'RESTAURANT' ? 'RESTAURANT' : 'RETAIL';
}

function getAvailableOutletsFromMembership(): string[] {
  const currentUser = getCachedCurrentUser();
  const activeBusinessId = getActiveBusinessId();

  const membership = currentUser?.businessMemberships?.find(
    (item) => item.businessId === activeBusinessId,
  );

  if (!membership) {
    return [];
  }

  if (membership.hasAllOutletAccess) {
    return [];
  }

  return Array.isArray(membership.allowedOutletIds)
    ? membership.allowedOutletIds
    : [];
}

function getPaymentMethods(): PosPaymentMethod[] {
  return ['CASH', 'QRIS', 'TRANSFER', 'CARD'];
}

function getStorageKey(activeBusinessId: string | null): string {
  return `pos_cart_${activeBusinessId || 'default'}`;
}

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'COMPLETED':
    case 'PAID':
      return 'border border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'CANCELLED':
      return 'border border-rose-200 bg-rose-50 text-rose-700';
    case 'READY':
      return 'border border-sky-200 bg-sky-50 text-sky-700';
    case 'IN_PROGRESS':
    case 'PROCESSING':
    case 'PARTIAL':
      return 'border border-amber-200 bg-amber-50 text-amber-700';
    default:
      return 'border border-slate-200 bg-slate-100 text-slate-700';
  }
}

export default function PosCashierPage() {
  const router = useRouter();
  const businessType = useMemo(() => getBusinessType(), []);
  const productLabel = businessType === 'RESTAURANT' ? 'Menu' : 'Produk';
  const productLabelLower = productLabel.toLowerCase();

  const [outlets, setOutlets] = useState<PosOutletItem[]>([]);
  const [selectedOutletId, setSelectedOutletId] = useState('');
  const [tables, setTables] = useState<PosTableItem[]>([]);
  const [selectedTableId, setSelectedTableId] = useState('');
  const [products, setProducts] = useState<PosProductItem[]>([]);
  const [cart, setCart] = useState<PosCartItem[]>([]);
  const [history, setHistory] = useState<PosHistoryItem[]>([]);
  const [chargeRules, setChargeRules] = useState<PosSettingsChargeRule[]>([]);

  const [initialLoading, setInitialLoading] = useState(true);
  const [productLoading, setProductLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [historyReceiptLoadingId, setHistoryReceiptLoadingId] = useState('');
  const [historyPrintLoadingId, setHistoryPrintLoadingId] = useState('');

  const [searchInput, setSearchInput] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [historySearchInput, setHistorySearchInput] = useState('');
  const [historySearch, setHistorySearch] = useState('');

  const [paymentMethod, setPaymentMethod] = useState<PosPaymentMethod>('CASH');
  const [paymentNote, setPaymentNote] = useState('');
  const [cartMessage, setCartMessage] = useState('');
  const [pageMessage, setPageMessage] = useState('');
  const [receiptResult, setReceiptResult] = useState<PosReceiptResponse | null>(null);

  const activeBusinessId =
    typeof window !== 'undefined' ? getActiveBusinessId() : null;

  const filteredProducts = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();

    if (!keyword) {
      return products;
    }

    return products.filter((item) => {
      const haystacks = [
        item.name,
        item.code,
        item.sku,
        item.barcode,
        item.brand,
        item.unit,
        item.category?.name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystacks.includes(keyword);
    });
  }, [products, searchKeyword]);

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.subtotal, 0),
    [cart],
  );

  const charges = useMemo(
    () => buildCharges(subtotal, chargeRules),
    [subtotal, chargeRules],
  );

  const grandTotal = useMemo(
    () => calculateGrandTotal(subtotal, charges),
    [subtotal, charges],
  );

  const selectedOutlet = useMemo(
    () => outlets.find((item) => item.id === selectedOutletId) || null,
    [outlets, selectedOutletId],
  );

  const totalItems = useMemo(
    () => cart.reduce((sum, item) => sum + item.qty, 0),
    [cart],
  );

  useEffect(() => {
    if (!activeBusinessId || typeof window === 'undefined') {
      return;
    }

    const raw = window.localStorage.getItem(getStorageKey(activeBusinessId));

    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as PosCartItem[];
      if (Array.isArray(parsed)) {
        setCart(recalculateCart(parsed));
      }
    } catch {
      setCart([]);
    }
  }, [activeBusinessId]);

  useEffect(() => {
    if (!activeBusinessId || typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(
      getStorageKey(activeBusinessId),
      JSON.stringify(cart),
    );
  }, [activeBusinessId, cart]);

  useEffect(() => {
    if (!selectedOutletId || typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem('activeOutletId', selectedOutletId);
  }, [selectedOutletId]);

  async function loadInitialData() {
    try {
      setInitialLoading(true);
      setPageMessage('');

      const [outletResponse, chargeSettingsResponse] = await Promise.all([
        getPosOutlets(),
        getPosChargeSettings(),
      ]);

      const allowedOutletIds = getAvailableOutletsFromMembership();
      const visibleOutlets =
        allowedOutletIds.length > 0
          ? outletResponse.items.filter((item) => allowedOutletIds.includes(item.id))
          : outletResponse.items;

      setOutlets(visibleOutlets);
      setChargeRules(chargeSettingsResponse.charges);

      if (visibleOutlets.length > 0) {
        const storedOutletId =
          typeof window !== 'undefined'
            ? window.localStorage.getItem('activeOutletId')
            : null;

        const resolvedOutletId =
          storedOutletId &&
          visibleOutlets.some((item) => item.id === storedOutletId)
            ? storedOutletId
            : visibleOutlets[0].id;

        setSelectedOutletId((prev) => prev || resolvedOutletId);
      } else {
        setProducts([]);
        setTables([]);
        setHistory([]);
      }
    } catch (error: unknown) {
      setPageMessage(getMessage(error, 'Gagal memuat data POS'));
    } finally {
      setInitialLoading(false);
    }
  }

  async function loadProducts(outletId: string) {
    if (!outletId) {
      setProducts([]);
      return;
    }

    try {
      setProductLoading(true);
      setPageMessage('');

      const response = await getPosProducts({
        outletId,
        status: 'ACTIVE',
        perPage: 100,
      });

      setProducts(response.items);
    } catch (error: unknown) {
      setProducts([]);
      setPageMessage(getMessage(error, `Gagal memuat ${productLabelLower}`));
    } finally {
      setProductLoading(false);
    }
  }

  async function loadTables(outletId: string) {
    if (businessType !== 'RESTAURANT' || !outletId) {
      setTables([]);
      setSelectedTableId('');
      return;
    }

    try {
      const response = await getPosTables(outletId);
      setTables(response.items);
      setSelectedTableId((prev) => {
        if (!prev) {
          return '';
        }

        const exists = response.items.some((item) => item.id === prev);
        return exists ? prev : '';
      });
    } catch {
      setTables([]);
      setSelectedTableId('');
    }
  }

  async function loadHistory(outletId: string, search?: string) {
    if (!outletId) {
      setHistory([]);
      return;
    }

    try {
      setHistoryLoading(true);
      setPageMessage('');

      const response = await getOutletOrderHistory({
        outletId,
        search: search?.trim() || undefined,
      });

      setHistory(response.items);
    } catch (error: unknown) {
      setHistory([]);
      setPageMessage(getMessage(error, 'Gagal memuat histori transaksi'));
    } finally {
      setHistoryLoading(false);
    }
  }

  async function refreshProducts() {
    await loadProducts(selectedOutletId);
  }

  useEffect(() => {
    void loadInitialData();
  }, []);

  useEffect(() => {
    if (!selectedOutletId) {
      return;
    }

    void loadProducts(selectedOutletId);
    void loadTables(selectedOutletId);
    void loadHistory(selectedOutletId, historySearch);
  }, [selectedOutletId, historySearch, businessType]);

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearchKeyword(searchInput.trim());
  }

  function handleHistorySearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setHistorySearch(historySearchInput.trim());
  }

  function handleResetProductSearch() {
    setSearchInput('');
    setSearchKeyword('');
  }

  function addToCart(product: PosProductItem) {
    setCartMessage('');

    setCart((prev) => {
      const existing = prev.find(
        (item) => item.productId === product.id && item.note.trim() === '',
      );

      if (existing) {
        return recalculateCart(
          prev.map((item) =>
            item.lineId === existing.lineId
              ? {
                  ...item,
                  qty: item.qty + 1,
                }
              : item,
          ),
        );
      }

      return recalculateCart([...prev, createCartLine(product)]);
    });
  }

  function updateCartQty(lineId: string, nextQty: number) {
    setCart((prev) =>
      recalculateCart(
        prev.map((item) =>
          item.lineId === lineId
            ? {
                ...item,
                qty: nextQty < 1 ? 1 : nextQty,
              }
            : item,
        ),
      ),
    );
  }

  function updateCartNote(lineId: string, note: string) {
    setCart((prev) =>
      recalculateCart(
        prev.map((item) =>
          item.lineId === lineId
            ? {
                ...item,
                note,
              }
            : item,
        ),
      ),
    );
  }

  function removeCartItem(lineId: string) {
    setCart((prev) => prev.filter((item) => item.lineId !== lineId));
  }

  function clearCart() {
    setCart([]);
    setCartMessage('');
  }

  async function handleOpenReceiptFromHistory(orderId: string) {
    if (!selectedOutletId) {
      setPageMessage('Pilih outlet aktif terlebih dahulu');
      return;
    }

    try {
      setHistoryReceiptLoadingId(orderId);
      setPageMessage('');

      const receipt = await getReceiptByOrderId(orderId, selectedOutletId);
      router.push(`/dashboard/receipts/${receipt.id}`);
    } catch (error: unknown) {
      setPageMessage(getMessage(error, 'Receipt untuk order ini belum tersedia'));
    } finally {
      setHistoryReceiptLoadingId('');
    }
  }

  async function handlePrintReceiptFromHistory(orderId: string) {
    if (!selectedOutletId) {
      setPageMessage('Pilih outlet aktif terlebih dahulu');
      return;
    }

    try {
      setHistoryPrintLoadingId(orderId);
      setPageMessage('');

      const receipt = await getReceiptByOrderId(orderId, selectedOutletId);
      window.open(`/dashboard/receipts/${receipt.id}`, '_blank', 'noopener,noreferrer');
    } catch (error: unknown) {
      setPageMessage(getMessage(error, 'Receipt untuk order ini belum tersedia'));
    } finally {
      setHistoryPrintLoadingId('');
    }
  }

  async function handleCheckout() {
    if (!selectedOutletId) {
      setCartMessage('Pilih outlet aktif terlebih dahulu');
      return;
    }

    if (businessType === 'RESTAURANT' && !selectedTableId) {
      setCartMessage('Pilih meja terlebih dahulu untuk transaksi restaurant');
      return;
    }

    if (cart.length === 0) {
      setCartMessage(`Tambahkan ${productLabelLower} ke cart terlebih dahulu`);
      return;
    }

    try {
      setCheckoutLoading(true);
      setCartMessage('');
      setPageMessage('');
      setReceiptResult(null);

      const order = await createOrder({
        outletId: selectedOutletId,
        tableId: businessType === 'RESTAURANT' ? selectedTableId || undefined : undefined,
      });

      for (const item of cart) {
        await addOrderItem(order.id, {
          outletId: selectedOutletId,
          productId: item.productId,
          quantity: item.qty,
          note: item.note.trim() || undefined,
        });
      }

      await createPayment({
        orderId: order.id,
        outletId: selectedOutletId,
        amountPaid: grandTotal,
        amountTendered: grandTotal,
        method: paymentMethod,
        note: paymentNote.trim() || undefined,
      });

      const receipt = await getReceiptByOrderId(order.id, selectedOutletId);

      setReceiptResult(receipt);
      clearCart();
      setPaymentMethod('CASH');
      setPaymentNote('');
      await loadHistory(selectedOutletId, historySearch);
    } catch (error: unknown) {
      setCartMessage(getMessage(error, 'Gagal menyelesaikan checkout'));
    } finally {
      setCheckoutLoading(false);
    }
  }

  if (initialLoading) {
    return (
      <div className="space-y-5">
        <section className="rounded-[28px] border border-slate-200 bg-white px-5 py-10 shadow-sm sm:px-6">
          <div className="grid gap-4 xl:grid-cols-[1.25fr_0.95fr]">
            <div className="h-[440px] animate-pulse rounded-[28px] bg-slate-100" />
            <div className="h-[440px] animate-pulse rounded-[28px] bg-slate-100" />
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-6 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-700">
            <FontAwesomeIcon
              icon={businessType === 'RESTAURANT' ? faUtensils : faCashRegister}
              className="h-3 w-3"
            />
            POS Cashier
          </div>

          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
            POS Kasir
          </h1>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Kiri untuk pilih {productLabelLower}, kanan untuk cart, checkout, dan receipt final.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Outlet Aktif
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              {selectedOutlet?.name || '-'}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Tipe Business
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-900">{businessType}</p>
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
              {formatCurrency(grandTotal)}
            </p>
          </div>
        </div>
      </section>

      {pageMessage ? (
        <section className="rounded-[28px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700 shadow-sm sm:px-6">
          {pageMessage}
        </section>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.95fr]">
        <div className="space-y-5">
          <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
              <div className="grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)_auto_auto]">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Outlet
                  </label>
                  <select
                    value={selectedOutletId}
                    onChange={(event) => setSelectedOutletId(event.target.value)}
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="">Pilih outlet</option>
                    {outlets.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>

                {businessType === 'RESTAURANT' ? (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Meja
                    </label>
                    <select
                      value={selectedTableId}
                      onChange={(event) => setSelectedTableId(event.target.value)}
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      disabled={!selectedOutletId}
                    >
                      <option value="">Pilih meja</option>
                      {tables.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div />
                )}

                <form onSubmit={handleSearchSubmit} className="flex items-end gap-2">
                  <div className="w-full">
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Cari {productLabelLower}
                    </label>
                    <div className="flex h-11 items-center rounded-2xl border border-slate-200 px-4">
                      <FontAwesomeIcon
                        icon={faMagnifyingGlass}
                        className="mr-3 h-4 w-4 text-slate-400"
                      />
                      <input
                        value={searchInput}
                        onChange={(event) => setSearchInput(event.target.value)}
                        placeholder={`Cari nama, kode, SKU, barcode, brand, atau unit`}
                        className="h-full w-full bg-transparent text-sm text-slate-900 outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    <FontAwesomeIcon icon={faMagnifyingGlass} className="h-4 w-4" />
                    Cari
                  </button>
                </form>

                <div className="flex items-end gap-2">
                  <button
                    type="button"
                    onClick={handleResetProductSearch}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <FontAwesomeIcon icon={faArrowRotateLeft} className="h-4 w-4" />
                    Reset
                  </button>

                  <button
                    type="button"
                    onClick={() => void refreshProducts()}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    disabled={productLoading || !selectedOutletId}
                  >
                    <FontAwesomeIcon icon={faBoxesStacked} className="h-4 w-4" />
                    {productLoading ? 'Memuat...' : 'Refresh'}
                  </button>
                </div>
              </div>
            </div>

            {productLoading ? (
              <div className="grid gap-3 p-5 sm:px-6 sm:py-5">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-slate-500 sm:px-6">
                Belum ada {productLabelLower} aktif untuk outlet ini.
              </div>
            ) : (
              <div className="grid gap-3 p-5 sm:grid-cols-2 sm:px-6 sm:py-5">
                {filteredProducts.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                          {item.code ? <span>Kode: {item.code}</span> : null}
                          {item.sku ? <span>SKU: {item.sku}</span> : null}
                          {item.barcode ? <span>Barcode: {item.barcode}</span> : null}
                          {item.brand ? <span>Brand: {item.brand}</span> : null}
                          {item.unit ? <span>Unit: {item.unit}</span> : null}
                          {item.category?.name ? <span>Kategori: {item.category.name}</span> : null}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => addToCart(item)}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
                      >
                        <FontAwesomeIcon icon={faPlus} className="h-4 w-4" />
                        Tambah
                      </button>
                    </div>

                    <p className="mt-4 text-sm font-semibold text-slate-900">
                      {formatCurrency(item.basePrice)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700">
                    <FontAwesomeIcon icon={faClockRotateLeft} className="h-3 w-3" />
                    Histori Transaksi Outlet
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    Buka receipt lama atau print ulang dari transaksi sebelumnya.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link
                    href="/dashboard/pos/history"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <FontAwesomeIcon icon={faClockRotateLeft} className="h-4 w-4" />
                    Histori Transaksi
                  </Link>
                  <Link
                    href="/dashboard/payments/history"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <FontAwesomeIcon icon={faWallet} className="h-4 w-4" />
                    Payment History
                  </Link>
                </div>
              </div>

              <form
                onSubmit={handleHistorySearchSubmit}
                className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto]"
              >
                <div className="flex h-11 items-center rounded-2xl border border-slate-200 px-4">
                  <FontAwesomeIcon
                    icon={faMagnifyingGlass}
                    className="mr-3 h-4 w-4 text-slate-400"
                  />
                  <input
                    value={historySearchInput}
                    onChange={(event) => setHistorySearchInput(event.target.value)}
                    placeholder="Cari nomor order atau catatan"
                    className="h-full w-full bg-transparent text-sm text-slate-900 outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  <FontAwesomeIcon icon={faMagnifyingGlass} className="h-4 w-4" />
                  Cari
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setHistorySearchInput('');
                    setHistorySearch('');
                  }}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <FontAwesomeIcon icon={faArrowRotateLeft} className="h-4 w-4" />
                  Reset
                </button>
              </form>
            </div>

            {historyLoading ? (
              <div className="grid gap-3 px-5 py-5 sm:px-6">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-20 animate-pulse rounded-2xl bg-slate-100" />
                ))}
              </div>
            ) : history.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-slate-500 sm:px-6">
                Belum ada transaksi untuk outlet ini.
              </div>
            ) : (
              <div className="grid gap-3 p-5 sm:px-6 sm:py-5">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900">
                            {item.orderNo}
                          </p>
                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${getStatusBadgeClass(
                              item.status,
                            )}`}
                          >
                            {item.status}
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${getStatusBadgeClass(
                              item.paymentStatus,
                            )}`}
                          >
                            {item.paymentStatus}
                          </span>
                        </div>

                        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-500">
                          <span>{item.outletName}</span>
                          {item.tableName ? <span>• {item.tableName}</span> : null}
                          <span>• {item.itemCount} item</span>
                          <span>• {formatDateTime(item.createdAt)}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Total
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">
                          {formatCurrency(item.totalAmount)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void handleOpenReceiptFromHistory(item.id)}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        disabled={historyReceiptLoadingId === item.id}
                      >
                        <FontAwesomeIcon icon={faEye} className="h-4 w-4" />
                        {historyReceiptLoadingId === item.id ? 'Membuka...' : 'Buka Receipt'}
                      </button>

                      <button
                        type="button"
                        onClick={() => void handlePrintReceiptFromHistory(item.id)}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
                        disabled={historyPrintLoadingId === item.id}
                      >
                        <FontAwesomeIcon icon={faPrint} className="h-4 w-4" />
                        {historyPrintLoadingId === item.id ? 'Mencetak...' : 'Print Ulang'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-5">
          <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700">
                    <FontAwesomeIcon icon={faBasketShopping} className="h-3 w-3" />
                    Cart & Checkout
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    Checkout membuat order, payment, lalu receipt final dari backend.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={clearCart}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                  disabled={cart.length === 0}
                >
                  <FontAwesomeIcon icon={faTrashCan} className="h-4 w-4" />
                  Kosongkan
                </button>
              </div>
            </div>

            {cartMessage ? (
              <div className="border-b border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700 sm:px-6">
                {cartMessage}
              </div>
            ) : null}

            {cart.length === 0 ? (
              <div className="px-5 py-10 text-center sm:px-6">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                  <FontAwesomeIcon icon={faBasketShopping} className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-slate-900">
                  Cart masih kosong
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  Tambahkan {productLabelLower} dari daftar sebelah kiri.
                </p>
              </div>
            ) : (
              <div className="space-y-4 p-5 sm:px-6 sm:py-5">
                {cart.map((item) => (
                  <div
                    key={item.lineId}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {item.productName}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                          {item.productCode ? <span>Kode: {item.productCode}</span> : null}
                          {item.unit ? <span>Unit: {item.unit}</span> : null}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeCartItem(item.lineId)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-700 transition hover:bg-rose-100"
                      >
                        <FontAwesomeIcon icon={faTrashCan} className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-1">
                        <button
                          type="button"
                          onClick={() => updateCartQty(item.lineId, item.qty - 1)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-700 transition hover:bg-slate-100"
                        >
                          <FontAwesomeIcon icon={faMinus} className="h-4 w-4" />
                        </button>
                        <span className="min-w-10 text-center text-sm font-semibold text-slate-900">
                          {item.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateCartQty(item.lineId, item.qty + 1)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-700 transition hover:bg-slate-100"
                        >
                          <FontAwesomeIcon icon={faPlus} className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="text-right">
                        <p className="text-xs text-slate-500">
                          {formatCurrency(item.price)} x {item.qty}
                        </p>
                        <p className="text-sm font-semibold text-slate-900">
                          {formatCurrency(item.subtotal)}
                        </p>
                      </div>
                    </div>

                    <textarea
                      value={item.note}
                      onChange={(event) => updateCartNote(item.lineId, event.target.value)}
                      rows={2}
                      placeholder="Catatan item (opsional)"
                      className="mt-4 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                ))}

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="grid gap-3">
                    <div className="flex items-center justify-between text-sm text-slate-600">
                      <span>Subtotal</span>
                      <span className="font-medium text-slate-900">
                        {formatCurrency(subtotal)}
                      </span>
                    </div>

                    {charges.map((charge) => (
                      <div
                        key={charge.key}
                        className="flex items-center justify-between text-sm text-slate-600"
                      >
                        <span>{charge.label}</span>
                        <span className="font-medium text-slate-900">
                          {formatCurrency(charge.amount)}
                        </span>
                      </div>
                    ))}

                    <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                      <span className="text-sm font-semibold text-slate-900">
                        Grand Total
                      </span>
                      <span className="text-base font-semibold text-slate-900">
                        {formatCurrency(grandTotal)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Metode Payment
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {getPaymentMethods().map((method) => (
                          <button
                            key={method}
                            type="button"
                            onClick={() => setPaymentMethod(method)}
                            className={`inline-flex h-11 items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-semibold transition ${
                              paymentMethod === method
                                ? 'border-slate-900 bg-slate-900 text-white'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <FontAwesomeIcon
                              icon={method === 'CASH' ? faWallet : faCreditCard}
                              className="h-4 w-4"
                            />
                            {method}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Catatan Payment
                      </label>
                      <textarea
                        value={paymentNote}
                        onChange={(event) => setPaymentNote(event.target.value)}
                        rows={3}
                        placeholder="Catatan payment (opsional)"
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => void handleCheckout()}
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={checkoutLoading || !selectedOutletId}
                    >
                      <FontAwesomeIcon icon={faReceipt} className="h-4 w-4" />
                      {checkoutLoading ? 'Memproses checkout...' : 'Checkout & Buat Receipt'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700">
                <FontAwesomeIcon icon={faReceipt} className="h-3 w-3" />
                Receipt Final
              </div>
              <p className="mt-2 text-sm text-slate-500">
                Receipt final dibuka setelah payment sukses dan bisa print ulang kapan saja.
              </p>
            </div>

            {!receiptResult ? (
              <div className="px-5 py-10 text-center sm:px-6">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                  <FontAwesomeIcon icon={faReceipt} className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-slate-900">
                  Belum ada struk baru
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  Selesaikan checkout untuk membuat struk.
                </p>
              </div>
            ) : (
              <div className="space-y-4 p-5 sm:px-6 sm:py-5">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="flex flex-col gap-1">
                    <p className="text-base font-semibold text-slate-900">
                      {receiptResult.businessName || 'Nama Business'}
                    </p>
                    <p className="text-sm text-slate-600">
                      {receiptResult.outletName || selectedOutlet?.name || '-'}
                    </p>
                    <p className="text-sm text-slate-500">
                      {receiptResult.outletAddress || selectedOutlet?.address || '-'}
                    </p>
                  </div>

                  <div className="mt-4 grid gap-2 text-sm text-slate-600">
                    <div className="flex items-center justify-between">
                      <span>Receipt</span>
                      <span className="font-medium text-slate-900">
                        {receiptResult.receiptNo || receiptResult.receiptNumber || receiptResult.id}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Order ID</span>
                      <span className="font-medium text-slate-900">
                        {receiptResult.orderId}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Waktu</span>
                      <span className="font-medium text-slate-900">
                        {formatDateTime(receiptResult.createdAt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Total</span>
                      <span className="font-semibold text-slate-900">
                        {formatCurrency(receiptResult.total ?? grandTotal)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <Link
                      href={`/dashboard/receipts/${receiptResult.id}`}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      <FontAwesomeIcon icon={faEye} className="h-4 w-4" />
                      Lihat Detail Struk
                    </Link>

                    <Link
                      href={`/dashboard/receipts/${receiptResult.id}`}
                      target="_blank"
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      <FontAwesomeIcon icon={faPrint} className="h-4 w-4" />
                      Buka & Print
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </section>
    </div>
  );
}
