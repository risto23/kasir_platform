'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowRotateLeft,
  faBasketShopping,
  faBoxesStacked,
  faCashRegister,
  faCreditCard,
  faImage,
  faMagnifyingGlass,
  faMinus,
  faPlus,
  faPrint,
  faReceipt,
  faTag,
  faTrashCan,
  faUtensils,
  faWallet,
} from '@fortawesome/free-solid-svg-icons';

import { api } from '@/lib/api';
import { getActiveBusinessId, getCachedCurrentUser } from '@/lib/auth';
import { getReceiptByOrderId } from '@/lib/receipt';
import { resolveImageUrl } from '@/lib/resolve-image-url';
import {
  addOrderItem,
  buildCharges,
  calculateGrandTotal,
  createCartLine,
  createOrder,
  createPayment,
  formatCurrency,
  formatDateTime,
  getOrderDetail,
  getPosChargeSettings,
  getPosProducts,
  getPosTables,
  getOutletOrderHistory,
  recalculateCart,
} from '@/lib/pos';
import type {
  PosBusinessType,
  PosCartItem,
  PosHistoryItem,
  PosOrderQueue,
  PosOrderResponse,
  PosOutletItem,
  PosPaymentMethod,
  PosProductItem,
  PosReceiptResponse,
  PosSettingsChargeRule,
  PosTableItem,
} from '@/types/pos';

type OutletListEnvelope = {
  success?: boolean;
  message?: string;
  data?: {
    items?: PosOutletItem[];
    meta?: {
      page?: number;
      limit?: number;
      total?: number;
      totalPages?: number;
    };
  };
};

type ParsedMembershipOutlet = {
  id: string;
  name: string;
};

type ParsedMembership = {
  businessId: string;
  businessType: PosBusinessType;
  hasAllOutletAccess: boolean;
  allowedOutletIds: string[];
  allowedOutlets: ParsedMembershipOutlet[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getStringValue(
  source: Record<string, unknown>,
  key: string,
): string | null {
  const value = source[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function getBooleanValue(
  source: Record<string, unknown>,
  key: string,
): boolean {
  return source[key] === true;
}

function getStringArrayValue(
  source: Record<string, unknown>,
  key: string,
): string[] {
  const value = source[key];

  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is string => typeof item === 'string' && item.trim().length > 0,
  );
}

function getAllowedOutletsValue(
  source: Record<string, unknown>,
): ParsedMembershipOutlet[] {
  const rawAllowedOutlets = source['allowedOutlets'];

  if (!Array.isArray(rawAllowedOutlets)) {
    return [];
  }

  return rawAllowedOutlets
    .map((item) => {
      if (!isRecord(item)) {
        return null;
      }

      const id = getStringValue(item, 'id');
      const name = getStringValue(item, 'name');

      if (!id || !name) {
        return null;
      }

      return { id, name };
    })
    .filter((item): item is ParsedMembershipOutlet => item !== null);
}

function getActiveMembership(): ParsedMembership | null {
  const activeBusinessId = getActiveBusinessId();
  const currentUserUnknown: unknown = getCachedCurrentUser();

  if (!activeBusinessId || !isRecord(currentUserUnknown)) {
    return null;
  }

  const rawMemberships = currentUserUnknown['businessMemberships'];

  if (!Array.isArray(rawMemberships)) {
    return null;
  }

  for (const item of rawMemberships) {
    if (!isRecord(item)) {
      continue;
    }

    const membershipBusinessId = getStringValue(item, 'businessId');

    if (membershipBusinessId !== activeBusinessId) {
      continue;
    }

    const membershipBusinessType = getStringValue(item, 'businessType');
    const businessType: PosBusinessType =
      membershipBusinessType === 'RESTAURANT' ? 'RESTAURANT' : 'RETAIL';

    return {
      businessId: membershipBusinessId,
      businessType,
      hasAllOutletAccess: getBooleanValue(item, 'hasAllOutletAccess'),
      allowedOutletIds: getStringArrayValue(item, 'allowedOutletIds'),
      allowedOutlets: getAllowedOutletsValue(item),
    };
  }

  return null;
}

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
  const membership = getActiveMembership();
  return membership?.businessType === 'RESTAURANT' ? 'RESTAURANT' : 'RETAIL';
}

function getPaymentMethods(): PosPaymentMethod[] {
  return ['CASH', 'QRIS', 'TRANSFER', 'CARD'];
}

function getStorageKey(activeBusinessId: string | null): string {
  return `pos_cart_${activeBusinessId || 'default'}`;
}

function getProductImageUrl(product: PosProductItem): string {
  return resolveImageUrl(product.imageUrl);
}

function getProductDisplayPrice(product: PosProductItem): number {
  return product.effectivePrice > 0 ? product.effectivePrice : product.basePrice;
}

function getOrderBadgeClass(status: string) {
  if (status === 'DRAFT') {
    return 'border border-amber-200 bg-amber-50 text-amber-700';
  }

  if (status === 'SUBMITTED' || status === 'IN_PROGRESS') {
    return 'border border-sky-200 bg-sky-50 text-sky-700';
  }

  if (status === 'READY' || status === 'COMPLETED') {
    return 'border border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  if (status === 'CANCELLED') {
    return 'border border-rose-200 bg-rose-50 text-rose-700';
  }

  return 'border border-slate-200 bg-slate-100 text-slate-700';
}

async function getManagedOutlets(businessId: string): Promise<PosOutletItem[]> {
  const response = await api.get<OutletListEnvelope>('/business/outlets', {
    params: {
      businessId,
      status: 'ACTIVE',
      page: 1,
      perPage: 100,
    },
    headers: {
      'x-business-id': businessId,
    },
  });

  const items = response.data.data?.items;
  return Array.isArray(items) ? items : [];
}

function buildFallbackOutletsFromMembership(
  businessId: string,
  membership: ParsedMembership,
): PosOutletItem[] {
  if (membership.allowedOutlets.length > 0) {
    return membership.allowedOutlets.map((item, index) => ({
      id: item.id,
      businessId,
      code: `OUTLET-${String(index + 1).padStart(2, '0')}`,
      name: item.name,
      address: '',
      phone: '',
      status: 'ACTIVE',
      createdAt: '',
      updatedAt: '',
      totalAssignedUsers: 0,
    }));
  }

  return membership.allowedOutletIds.map((id, index) => ({
    id,
    businessId,
    code: `OUTLET-${String(index + 1).padStart(2, '0')}`,
    name: `Outlet ${index + 1}`,
    address: '',
    phone: '',
    status: 'ACTIVE',
    createdAt: '',
    updatedAt: '',
    totalAssignedUsers: 0,
  }));
}

async function getPosOutletsForCurrentUser(
  businessId: string,
): Promise<PosOutletItem[]> {
  const membership = getActiveMembership();

  if (!membership) {
    return [];
  }

  if (membership.hasAllOutletAccess) {
    return getManagedOutlets(businessId);
  }

  return buildFallbackOutletsFromMembership(businessId, membership);
}

const cashierQueueOptions: Array<{
  value: PosOrderQueue;
  label: string;
  helper: string;
}> = [
  {
    value: 'GUEST_WAITING_PAYMENT',
    label: 'Guest Menunggu Bayar',
    helper: 'Guest checkout masuk ke kasir dulu, belum ke kitchen.',
  },
  {
    value: 'CASHIER_UNPAID',
    label: 'Semua Unpaid',
    helper: 'Semua order aktif yang belum dibayar.',
  },
  {
    value: 'CASHIER_ACTIVE',
    label: 'Order Aktif',
    helper: 'Draft, submitted, in progress, dan ready.',
  },
];

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
  const [chargeRules, setChargeRules] = useState<PosSettingsChargeRule[]>([]);

  const [initialLoading, setInitialLoading] = useState(true);
  const [productLoading, setProductLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const [searchInput, setSearchInput] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const [paymentMethod, setPaymentMethod] = useState<PosPaymentMethod>('CASH');
  const [paymentNote, setPaymentNote] = useState('');
  const [cartMessage, setCartMessage] = useState('');
  const [pageMessage, setPageMessage] = useState('');
  const [receiptResult, setReceiptResult] = useState<PosReceiptResponse | null>(null);

  const [cashierQueue, setCashierQueue] =
    useState<PosOrderQueue>('GUEST_WAITING_PAYMENT');
  const [queueOrders, setQueueOrders] = useState<PosHistoryItem[]>([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [queueMessage, setQueueMessage] = useState('');
  const [selectedQueueOrderId, setSelectedQueueOrderId] = useState('');
  const [selectedQueueOrder, setSelectedQueueOrder] =
    useState<PosOrderResponse | null>(null);
  const [queueDetailLoading, setQueueDetailLoading] = useState(false);
  const [queueActionLoading, setQueueActionLoading] = useState(false);
  const [queuePaymentMethod, setQueuePaymentMethod] =
    useState<PosPaymentMethod>('CASH');
  const [queuePaymentNote, setQueuePaymentNote] = useState('');

  const activeBusinessId =
    typeof window !== 'undefined' ? getActiveBusinessId() : null;

  const categoryOptions = useMemo(() => {
    const categoryMap = new Map<string, string>();

    products.forEach((item) => {
      const categoryName = item.category?.name?.trim();

      if (categoryName) {
        categoryMap.set(categoryName, categoryName);
      }
    });

    return ['ALL', ...Array.from(categoryMap.values()).sort((a, b) => a.localeCompare(b))];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();

    return products.filter((item) => {
      const matchesCategory =
        selectedCategory === 'ALL'
          ? true
          : item.category?.name?.trim() === selectedCategory;

      if (!matchesCategory) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      const haystacks = [item.name, item.category?.name, item.brand]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystacks.includes(keyword);
    });
  }, [products, searchKeyword, selectedCategory]);

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

      if (!activeBusinessId) {
        setOutlets([]);
        setProducts([]);
        setTables([]);
        setPageMessage('Business aktif belum dipilih');
        return;
      }

      const [outletItems, chargeSettingsResponse] = await Promise.all([
        getPosOutletsForCurrentUser(activeBusinessId),
        getPosChargeSettings(),
      ]);

      setOutlets(outletItems);
      setChargeRules(chargeSettingsResponse.charges);

      if (outletItems.length > 0) {
        const storedOutletId =
          typeof window !== 'undefined'
            ? window.localStorage.getItem('activeOutletId')
            : null;

        const resolvedOutletId =
          storedOutletId &&
          outletItems.some((item) => item.id === storedOutletId)
            ? storedOutletId
            : outletItems[0].id;

        setSelectedOutletId((prev) => prev || resolvedOutletId);
      } else {
        setSelectedOutletId('');
        setProducts([]);
        setTables([]);
      }
    } catch (error: unknown) {
      setPageMessage(getMessage(error, 'Gagal memuat data POS'));
      setOutlets([]);
      setSelectedOutletId('');
      setProducts([]);
      setTables([]);
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

  async function loadQueueOrders(outletId: string, queue: PosOrderQueue) {
    if (!outletId) {
      setQueueOrders([]);
      setSelectedQueueOrderId('');
      setSelectedQueueOrder(null);
      return;
    }

    try {
      setQueueLoading(true);
      setQueueMessage('');

      const response = await getOutletOrderHistory({
        outletId,
        perPage: 50,
        queue,
      });

      setQueueOrders(response.items);

      setSelectedQueueOrderId((currentValue) => {
        const nextValue =
          currentValue && response.items.some((item) => item.id === currentValue)
            ? currentValue
            : response.items[0]?.id || '';

        return nextValue;
      });
    } catch (error: unknown) {
      setQueueMessage(getMessage(error, 'Gagal memuat antrian kasir'));
      setQueueOrders([]);
      setSelectedQueueOrderId('');
      setSelectedQueueOrder(null);
    } finally {
      setQueueLoading(false);
    }
  }

  async function loadQueueOrderDetail(orderId: string, outletId: string) {
    if (!orderId || !outletId) {
      setSelectedQueueOrder(null);
      return;
    }

    try {
      setQueueDetailLoading(true);
      setQueueMessage('');

      const detail = await getOrderDetail(orderId, outletId);
      setSelectedQueueOrder(detail);
    } catch (error: unknown) {
      setQueueMessage(getMessage(error, 'Gagal memuat detail order'));
      setSelectedQueueOrder(null);
    } finally {
      setQueueDetailLoading(false);
    }
  }

  async function refreshProducts() {
    await loadProducts(selectedOutletId);
  }

  async function refreshQueue() {
    await loadQueueOrders(selectedOutletId, cashierQueue);
  }

  useEffect(() => {
    void loadInitialData();
  }, [activeBusinessId]);

  useEffect(() => {
    if (!selectedOutletId) {
      return;
    }

    void loadProducts(selectedOutletId);
    void loadTables(selectedOutletId);
    void loadQueueOrders(selectedOutletId, cashierQueue);
  }, [selectedOutletId, businessType, cashierQueue]);

  useEffect(() => {
    if (!selectedQueueOrderId || !selectedOutletId) {
      setSelectedQueueOrder(null);
      return;
    }

    void loadQueueOrderDetail(selectedQueueOrderId, selectedOutletId);
  }, [selectedQueueOrderId, selectedOutletId]);

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearchKeyword(searchInput.trim());
  }

  function handleResetProductSearch() {
    setSearchInput('');
    setSearchKeyword('');
    setSelectedCategory('ALL');
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
        tableId:
          businessType === 'RESTAURANT' ? selectedTableId || undefined : undefined,
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
      await refreshQueue();

      router.push(`/dashboard/receipts/${receipt.id}`);
    } catch (error: unknown) {
      setCartMessage(getMessage(error, 'Gagal menyelesaikan checkout'));
    } finally {
      setCheckoutLoading(false);
    }
  }

  async function handleQueuePayment() {
    if (!selectedQueueOrder || !selectedOutletId) {
      setQueueMessage('Pilih order aktif terlebih dahulu');
      return;
    }

    if (selectedQueueOrder.paymentStatus === 'PAID') {
      setQueueMessage('Order ini sudah dibayar');
      return;
    }

    try {
      setQueueActionLoading(true);
      setQueueMessage('');

      await createPayment({
        orderId: selectedQueueOrder.id,
        outletId: selectedOutletId,
        amountPaid: selectedQueueOrder.totalAmount,
        amountTendered: selectedQueueOrder.totalAmount,
        method: queuePaymentMethod,
        note: queuePaymentNote.trim() || undefined,
      });

      const receipt = await getReceiptByOrderId(
        selectedQueueOrder.id,
        selectedOutletId,
      );

      setReceiptResult(receipt);
      setQueuePaymentMethod('CASH');
      setQueuePaymentNote('');
      await loadQueueOrders(selectedOutletId, cashierQueue);
      await loadQueueOrderDetail(selectedQueueOrder.id, selectedOutletId);

      router.push(`/dashboard/receipts/${receipt.id}`);
    } catch (error: unknown) {
      setQueueMessage(getMessage(error, 'Gagal memproses payment order aktif'));
    } finally {
      setQueueActionLoading(false);
    }
  }

  async function handleOpenQueueReceipt() {
    if (!selectedQueueOrder || !selectedOutletId) {
      setQueueMessage('Pilih order aktif terlebih dahulu');
      return;
    }

    try {
      setQueueActionLoading(true);
      setQueueMessage('');

      const receipt = await getReceiptByOrderId(
        selectedQueueOrder.id,
        selectedOutletId,
      );

      router.push(`/dashboard/receipts/${receipt.id}`);
    } catch (error: unknown) {
      setQueueMessage(getMessage(error, 'Receipt untuk order ini belum tersedia'));
    } finally {
      setQueueActionLoading(false);
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
            Kasir bisa input order langsung, melihat order aktif guest, lalu memproses payment sebelum order masuk ke kitchen.
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

      <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-700">
                <FontAwesomeIcon icon={faReceipt} className="h-3 w-3" />
                Antrian Kasir
              </div>
              <h2 className="mt-2 text-base font-semibold text-slate-900">
                Order aktif yang harus diproses kasir
              </h2>
              <p className="text-sm text-slate-500">
                Guest checkout masuk ke sini dulu dan belum boleh diproses kitchen sebelum payment berhasil.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void refreshQueue()}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              disabled={queueLoading || !selectedOutletId}
            >
              <FontAwesomeIcon icon={faBoxesStacked} className="h-4 w-4" />
              {queueLoading ? 'Memuat...' : 'Refresh Antrian'}
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {cashierQueueOptions.map((queueOption) => {
              const isActive = cashierQueue === queueOption.value;

              return (
                <button
                  key={queueOption.value}
                  type="button"
                  onClick={() => setCashierQueue(queueOption.value)}
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

        {queueMessage ? (
          <div className="border-b border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700 sm:px-6">
            {queueMessage}
          </div>
        ) : null}

        <div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1.1fr)_420px] sm:px-6 sm:py-5">
          <div className="space-y-3 xl:max-h-[520px] xl:overflow-y-auto xl:pr-1">
            {queueLoading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-28 animate-pulse rounded-[24px] bg-slate-100"
                />
              ))
            ) : queueOrders.length === 0 ? (
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
                Tidak ada order pada antrian ini.
              </div>
            ) : (
              queueOrders.map((order) => {
                const isSelected = selectedQueueOrderId === order.id;

                return (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => setSelectedQueueOrderId(order.id)}
                    className={`block w-full rounded-[24px] border px-4 py-4 text-left transition ${
                      isSelected
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-slate-50 text-slate-900 hover:bg-white'
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold">{order.orderNumber}</span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          isSelected
                            ? 'bg-white/15 text-white'
                            : order.orderSource === 'GUEST'
                              ? 'border border-orange-200 bg-orange-50 text-orange-700'
                              : 'border border-slate-200 bg-white text-slate-700'
                        }`}
                      >
                        {order.orderSource}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          isSelected
                            ? 'bg-white/15 text-white'
                            : getOrderBadgeClass(order.status)
                        }`}
                      >
                        {order.status}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          isSelected
                            ? 'bg-white/15 text-white'
                            : getOrderBadgeClass(order.paymentStatus)
                        }`}
                      >
                        {order.paymentStatus}
                      </span>
                    </div>

                    <div
                      className={`mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm ${
                        isSelected ? 'text-slate-200' : 'text-slate-500'
                      }`}
                    >
                      <span>{order.outletName || selectedOutlet?.name || '-'}</span>
                      {order.tableName ? <span>• {order.tableName}</span> : null}
                      <span>• {order.itemCount} item</span>
                      <span>• {formatDateTime(order.createdAt)}</span>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <span
                        className={`text-xs font-semibold uppercase tracking-[0.16em] ${
                          isSelected ? 'text-slate-300' : 'text-slate-500'
                        }`}
                      >
                        Total
                      </span>
                      <span className="text-sm font-semibold">
                        {formatCurrency(order.totalAmount)}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
            {!selectedQueueOrderId ? (
              <div className="flex h-full min-h-[260px] items-center justify-center text-center text-sm text-slate-500">
                Pilih order dari antrian kasir untuk melihat detail dan memproses payment.
              </div>
            ) : queueDetailLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-20 animate-pulse rounded-2xl bg-slate-200"
                  />
                ))}
              </div>
            ) : !selectedQueueOrder ? (
              <div className="flex h-full min-h-[260px] items-center justify-center text-center text-sm text-slate-500">
                Detail order tidak tersedia.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-2xl bg-white px-4 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-slate-900">
                      {selectedQueueOrder.orderNumber}
                    </h3>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${getOrderBadgeClass(
                        selectedQueueOrder.orderSource,
                      )}`}
                    >
                      {selectedQueueOrder.orderSource}
                    </span>
                  </div>

                  <div className="mt-2 grid gap-2 text-sm text-slate-600">
                    <div className="flex items-center justify-between">
                      <span>Status Order</span>
                      <span className="font-medium text-slate-900">
                        {selectedQueueOrder.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Status Payment</span>
                      <span className="font-medium text-slate-900">
                        {selectedQueueOrder.paymentStatus}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Meja</span>
                      <span className="font-medium text-slate-900">
                        {selectedQueueOrder.tableName || '-'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Total</span>
                      <span className="font-semibold text-slate-900">
                        {formatCurrency(selectedQueueOrder.totalAmount)}
                      </span>
                    </div>
                  </div>

                  {selectedQueueOrder.notes ? (
                    <p className="mt-3 rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
                      Catatan order: {selectedQueueOrder.notes}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-3 rounded-2xl bg-white px-4 py-4">
                  <h4 className="text-sm font-semibold text-slate-900">
                    Item Order
                  </h4>

                  {selectedQueueOrder.items?.length ? (
                    selectedQueueOrder.items.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-slate-200 px-3 py-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {item.productName}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              Qty {item.quantity} • {formatCurrency(item.lineTotal)}
                            </p>
                          </div>

                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${getOrderBadgeClass(
                              item.status,
                            )}`}
                          >
                            {item.status}
                          </span>
                        </div>

                        {item.note ? (
                          <p className="mt-2 text-sm text-slate-600">
                            Catatan item: {item.note}
                          </p>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-slate-500">
                      Item order belum tersedia.
                    </div>
                  )}
                </div>

                <div className="rounded-2xl bg-white px-4 py-4">
                  <h4 className="text-sm font-semibold text-slate-900">
                    Aksi Kasir
                  </h4>

                  {selectedQueueOrder.paymentStatus === 'PAID' ? (
                    <div className="mt-3 space-y-3">
                      <p className="text-sm text-slate-500">
                        Order ini sudah dibayar dan boleh diproses kitchen.
                      </p>

                      <button
                        type="button"
                        onClick={() => void handleOpenQueueReceipt()}
                        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={queueActionLoading}
                      >
                        <FontAwesomeIcon icon={faPrint} className="h-4 w-4" />
                        {queueActionLoading ? 'Memuat...' : 'Buka Receipt'}
                      </button>
                    </div>
                  ) : (
                    <div className="mt-3 space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        {getPaymentMethods().map((method) => (
                          <button
                            key={method}
                            type="button"
                            onClick={() => setQueuePaymentMethod(method)}
                            className={`inline-flex h-11 items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-semibold transition ${
                              queuePaymentMethod === method
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

                      <textarea
                        value={queuePaymentNote}
                        onChange={(event) => setQueuePaymentNote(event.target.value)}
                        rows={3}
                        placeholder="Catatan payment order aktif (opsional)"
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      />

                      <button
                        type="button"
                        onClick={() => void handleQueuePayment()}
                        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={queueActionLoading}
                      >
                        <FontAwesomeIcon icon={faReceipt} className="h-4 w-4" />
                        {queueActionLoading
                          ? 'Memproses payment...'
                          : 'Bayar & Lanjutkan ke Kitchen'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_380px] 2xl:grid-cols-[minmax(0,1.35fr)_420px] xl:items-start">
        <div className="space-y-5">
          <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm xl:flex xl:flex-col xl:overflow-hidden">
            <div className="border-b border-slate-200 bg-white px-5 py-4 sm:px-6 xl:sticky xl:top-0 xl:z-10">
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
                        placeholder={`Cari nama ${productLabelLower}`}
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

              <div className="mt-4 flex flex-wrap gap-2">
                {categoryOptions.map((category) => {
                  const isActive = selectedCategory === category;
                  const label = category === 'ALL' ? 'Semua' : category;

                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setSelectedCategory(category)}
                      className={`inline-flex h-10 items-center justify-center rounded-2xl px-4 text-sm font-semibold transition ${
                        isActive
                          ? 'bg-slate-900 text-white'
                          : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="xl:max-h-[620px] xl:overflow-y-auto">
              {productLoading ? (
                <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-2 sm:px-6 sm:py-5">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-[280px] animate-pulse rounded-[24px] bg-slate-100"
                    />
                  ))}
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-slate-500 sm:px-6">
                  Belum ada {productLabelLower} aktif untuk outlet ini.
                </div>
              ) : (
                <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-2 sm:px-6 sm:py-5">
                  {filteredProducts.map((item) => {
                    const imageUrl = getProductImageUrl(item);
                    const hasPromo =
                      item.appliedPromo !== null &&
                      item.promoDiscountAmount > 0 &&
                      item.effectivePrice < item.basePrice;

                    return (
                      <div
                        key={item.id}
                        className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                      >
                        <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
                          {imageUrl ? (
                            <Image
                              src={imageUrl}
                              alt={item.name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-slate-400">
                              <FontAwesomeIcon icon={faImage} className="h-10 w-10" />
                            </div>
                          )}

                          {item.category?.name ? (
                            <div className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur">
                              {item.category.name}
                            </div>
                          ) : null}

                          {hasPromo ? (
                            <div className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-rose-600 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                              <FontAwesomeIcon icon={faTag} className="h-3 w-3" />
                              Promo
                            </div>
                          ) : null}
                        </div>

                        <div className="space-y-4 p-4">
                          <div>
                            <h3 className="line-clamp-2 text-base font-semibold text-slate-900 sm:text-lg">
                              {item.name}
                            </h3>

                            {item.brand ? (
                              <p className="mt-1 text-sm text-slate-500">{item.brand}</p>
                            ) : null}
                          </div>

                          <div className="flex items-center justify-between gap-3">
                            <div>
                              {hasPromo ? (
                                <>
                                  <p className="text-base font-semibold text-rose-600 sm:text-lg">
                                    {formatCurrency(getProductDisplayPrice(item))}
                                  </p>
                                  <p className="mt-1 text-xs text-slate-400 line-through">
                                    {formatCurrency(item.basePrice)}
                                  </p>
                                  <p className="mt-1 text-xs font-medium text-emerald-600">
                                    Hemat {formatCurrency(item.promoDiscountAmount)}
                                  </p>
                                </>
                              ) : (
                                <p className="text-base font-semibold text-slate-900 sm:text-lg">
                                  {formatCurrency(item.basePrice)}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center">
                            <button
                              type="button"
                              onClick={() => addToCart(item)}
                              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
                            >
                              <FontAwesomeIcon icon={faPlus} className="h-4 w-4" />
                              Tambah
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="space-y-5 xl:sticky xl:top-5">
          <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm xl:flex xl:flex-col">
            <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700">
                    <FontAwesomeIcon icon={faBasketShopping} className="h-3 w-3" />
                    Cart & Checkout
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    Checkout manual tetap membuat order, payment, lalu receipt final dari backend.
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
                <div>
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
              </div>
            ) : (
              <div className="p-5 sm:px-6 sm:py-5 xl:flex xl:flex-col">
                <div className="space-y-4 xl:max-h-[360px] xl:overflow-y-auto xl:pr-1">
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
                          {item.unit ? (
                            <div className="mt-1 text-xs text-slate-500">{item.unit}</div>
                          ) : null}
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
                </div>

                <div className="mt-4 shrink-0 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
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
                  Selesaikan checkout atau payment order aktif untuk membuat struk.
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
                      <FontAwesomeIcon icon={faPrint} className="h-4 w-4" />
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
