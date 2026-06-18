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
  calculatePosSurcharge,
  createCartLine,
  createOrder,
  createPayment,
  formatCurrency,
  formatDateTime,
  getOrderDetail,
  getOutletPaymentMethods,
  getPosChargeSettings,
  getPosProducts,
  getPosTables,
  getOutletOrderHistory,
  recalculateCart,
} from '@/lib/pos';
import { getPromos } from '@/lib/promo';
import { calculateCartPromos } from '@/lib/promo-calc';

import type { PromoItem } from '@/types/promo';
import type {
  PosBusinessType,
  PosCartItem,
  PosHistoryItem,
  PosOrderQueue,
  PosOrderResponse,
  PosOutletItem,
  PosOutletPaymentMethod,
  PosPaymentMethod,
  PosProductItem,
  PosReceiptResponse,
  PosSettingsChargeRule,
  PosTableItem,
  PosRoundingSetting
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
  code: string;
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
      const code = getStringValue(item, 'code') ?? '';

      if (!id || !name) {
        return null;
      }

      return { id, name, code };
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
    const apiMessage = error.response?.data?.message;

    if (typeof apiMessage === 'string' && apiMessage.trim()) {
      return apiMessage;
    }

    return fallback;
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

  if (status === 'READY' || status === 'COMPLETED' || status === 'PAID') {
    return 'border border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  if (status === 'CANCELLED' || status === 'REFUNDED') {
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
    return membership.allowedOutlets.map((item) => ({
      id: item.id,
      businessId,
      code: item.code,
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
  const [promos, setPromos] = useState<PromoItem[]>([]);
  const [cart, setCart] = useState<PosCartItem[]>([]);
  
  
  const [chargeRules, setChargeRules] = useState<PosSettingsChargeRule[]>([]);
  const [roundingSetting, setRoundingSetting] = useState<PosRoundingSetting | null>(null);

  const [initialLoading, setInitialLoading] = useState(true);
  const [productLoading, setProductLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const [searchInput, setSearchInput] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const [customerName, setCustomerName] = useState('');
  const [outletPaymentMethods, setOutletPaymentMethods] = useState<PosOutletPaymentMethod[]>([]);
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
  const [queueCustomerName, setQueueCustomerName] = useState('');

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

      const haystacks = [item.name, item.category?.name, item.brand, item.code]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystacks.includes(keyword);
    });
  }, [products, searchKeyword, selectedCategory]);

  // Promos eligible for the active outlet (server already filtered to
  // active-now via effectiveStatus); scope is the only client-side filter.
  const eligiblePromos = useMemo(
    () =>
      promos.filter(
        (promo) =>
          promo.outletScope === 'ALL_OUTLETS' ||
          promo.selectedOutlets.some((outlet) => outlet.outletId === selectedOutletId),
      ),
    [promos, selectedOutletId],
  );

  // Mirror of the backend's recalculateAllDiscountsAndTotals so the cart preview
  // matches the order/receipt: best single regular promo per item, plus
  // min-charge promos stacked when their qualifying subtotal meets the threshold.
  const cartCalc = useMemo(
    () => calculateCartPromos(cart, eligiblePromos),
    [cart, eligiblePromos],
  );

  const grossSubtotal = cartCalc.grossSubtotal;
  const promoDiscountTotal = cartCalc.discountTotal;
  const subtotal = cartCalc.netSubtotal;

  const charges = useMemo(
    () => buildCharges(subtotal, chargeRules),
    [subtotal, chargeRules],
  );

  const grandTotal = useMemo(
    () => calculateGrandTotal(subtotal, charges),
    [subtotal, charges],
  );

  const selectedPaymentMethodConfig = useMemo(
    () => outletPaymentMethods.find((m) => m.code === paymentMethod) ?? null,
    [outletPaymentMethods, paymentMethod],
  );

  // Surcharge is calculated on pre-rounding total so rounding applies to the final amount
  const paymentSurcharge = useMemo(
    () => calculatePosSurcharge(grandTotal, selectedPaymentMethodConfig?.surchargeRules ?? []),
    [grandTotal, selectedPaymentMethodConfig],
  );

  // Rounding is applied after surcharge so the customer-facing total is always a round number
  const roundingCalc = useMemo(() => {
    const base = grandTotal + paymentSurcharge;
    const r = roundingSetting;
    if (!r || !r.enabled || !r.unit || r.method === 'NONE') {
      return { roundedTotal: base, roundingAmount: 0 };
    }
    const unit = Math.max(1, Math.floor(r.unit));
    const q = base / unit;
    let rounded = base;
    if (r.method === 'NEAREST') rounded = Math.round(q) * unit;
    else if (r.method === 'CEIL') rounded = Math.ceil(q) * unit;
    else if (r.method === 'FLOOR') rounded = Math.floor(q) * unit;
    const roundingAmount = rounded - base;
    return { roundedTotal: rounded, roundingAmount };
  }, [grandTotal, paymentSurcharge, roundingSetting]);

  const grandTotalWithSurcharge = roundingCalc.roundedTotal;

  const selectedOutlet = useMemo(
    () => outlets.find((item) => item.id === selectedOutletId) || null,
    [outlets, selectedOutletId],
  );

  const totalItems = useMemo(
    () => cart.reduce((sum, item) => sum + item.qty, 0),
    [cart],
  );

  const baseCartProductMap = useMemo(() => {
    return cart.reduce<Record<string, { lineId: string; qty: number }>>(
      (accumulator, item) => {
        if (item.note.trim() !== '') {
          return accumulator;
        }

        accumulator[item.productId] = {
          lineId: item.lineId,
          qty: item.qty,
        };

        return accumulator;
      },
      {},
    );
  }, [cart]);

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
    if (typeof window === 'undefined') {
      return;
    }

    if (!selectedOutletId) {
      window.localStorage.removeItem('activeOutletId');
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
        setQueueOrders([]);
        setSelectedQueueOrderId('');
        setSelectedQueueOrder(null);
        setPageMessage('Business aktif belum dipilih');
        return;
      }

      const [outletItems, chargeSettingsResponse] = await Promise.all([
        getPosOutletsForCurrentUser(activeBusinessId),
        getPosChargeSettings(),
      ]);

      setOutlets(outletItems);
      setChargeRules(chargeSettingsResponse.charges);
      setRoundingSetting(chargeSettingsResponse.rounding ?? null);if (outletItems.length > 0) {
        const storedOutletId =
          typeof window !== 'undefined'
            ? window.localStorage.getItem('activeOutletId')
            : null;

        const resolvedOutletId =
          storedOutletId &&
          outletItems.some((item) => item.id === storedOutletId)
            ? storedOutletId
            : '';

        setSelectedOutletId((prev) => {
          if (prev && outletItems.some((item) => item.id === prev)) {
            return prev;
          }

          return resolvedOutletId;
        });

        if (!resolvedOutletId) {
          setProducts([]);
          setTables([]);
          setQueueOrders([]);
          setSelectedQueueOrderId('');
          setSelectedQueueOrder(null);
          setSelectedTableId('');
        }
      } else {
        setSelectedOutletId('');
        setProducts([]);
        setTables([]);
        setQueueOrders([]);
        setSelectedQueueOrderId('');
        setSelectedQueueOrder(null);
        setSelectedTableId('');
      }
    } catch (error: unknown) {
      setPageMessage(getMessage(error, 'Gagal memuat data POS'));
      setOutlets([]);
      setSelectedOutletId('');
      setProducts([]);
      setTables([]);
      setQueueOrders([]);
      setSelectedQueueOrderId('');
      setSelectedQueueOrder(null);
      setSelectedTableId('');
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

      const [response, promoItems] = await Promise.all([
        getPosProducts({
          outletId,
          status: 'ACTIVE',
          perPage: 100,
        }),
        // Active-now promos (schedule/timezone resolved server-side via
        // effectiveStatus); a failure here must not block selling, the backend
        // recomputes discounts authoritatively at checkout.
        getPromos({ status: 'ACTIVE', effectiveStatus: 'ACTIVE' }).catch(
          () => [] as PromoItem[],
        ),
      ]);

      setProducts(response.items);
      setPromos(promoItems);
    } catch (error: unknown) {
      setProducts([]);
      setPromos([]);
      setPageMessage(getMessage(error, `Gagal memuat ${productLabelLower}`));
    } finally {
      setProductLoading(false);
    }
  }

  async function loadPaymentMethods(outletId: string) {
    if (!outletId) {
      setOutletPaymentMethods([]);
      return;
    }
    try {
      const methods = await getOutletPaymentMethods(outletId);
      setOutletPaymentMethods(methods);
      if (methods.length > 0) {
        setPaymentMethod((prev) => {
          const exists = methods.some((m) => m.code === prev);
          return exists ? prev : (methods[0]?.code ?? 'CASH');
        });
        setQueuePaymentMethod((prev) => {
          const exists = methods.some((m) => m.code === prev);
          return exists ? prev : (methods[0]?.code ?? 'CASH');
        });
      }
    } catch {
      setOutletPaymentMethods([]);
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
      setProducts([]);
      setTables([]);
      setSelectedTableId('');
      setQueueOrders([]);
      setSelectedQueueOrderId('');
      setSelectedQueueOrder(null);
      return;
    }

    void loadProducts(selectedOutletId);
    void loadTables(selectedOutletId);
    void loadPaymentMethods(selectedOutletId);
    void loadQueueOrders(selectedOutletId, cashierQueue);
  }, [selectedOutletId, businessType, cashierQueue]);
  useEffect(() => {
    if (!selectedOutletId) {
      setChargeRules([]);
      return;
    }
    (async () => {
      try {
        const resp = await getPosChargeSettings(selectedOutletId);
        setChargeRules(resp.charges);
        setRoundingSetting(resp.rounding ?? null);
      } catch {
        setChargeRules([]);
      }
    })();
  }, [selectedOutletId]);

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

  function decreaseBaseCartProduct(productId: string) {
    const baseLine = baseCartProductMap[productId];

    if (!baseLine) {
      return;
    }

    if (baseLine.qty <= 1) {
      removeCartItem(baseLine.lineId);
      return;
    }

    updateCartQty(baseLine.lineId, baseLine.qty - 1);
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
        customerName: customerName.trim() || undefined,
      });

      let lastOrder = order;
      for (const item of cart) {
        lastOrder = await addOrderItem(order.id, {
          outletId: selectedOutletId,
          productId: item.productId,
          quantity: item.qty,
          note: item.note.trim() || undefined,
        });
      }

      // Use DB total from the last addOrderItem response to avoid float mismatch
      const dbTotal = lastOrder.totalAmount;
      const dbSurcharge = calculatePosSurcharge(
        dbTotal,
        selectedPaymentMethodConfig?.surchargeRules ?? [],
      );
      const dbBase = dbTotal + dbSurcharge;
      let totalToPay = dbBase;
      const r = roundingSetting;
      if (r && r.enabled && r.unit > 1 && r.method !== 'NONE') {
        const unit = Math.max(1, Math.floor(r.unit));
        const q = dbBase / unit;
        if (r.method === 'NEAREST') totalToPay = Math.round(q) * unit;
        else if (r.method === 'CEIL') totalToPay = Math.ceil(q) * unit;
        else if (r.method === 'FLOOR') totalToPay = Math.floor(q) * unit;
      }
      await createPayment({
        orderId: order.id,
        outletId: selectedOutletId,
        amountPaid: totalToPay,
        amountTendered: totalToPay,
        method: paymentMethod,
        note: paymentNote.trim() || undefined,
      });

      const receipt = await getReceiptByOrderId(order.id, selectedOutletId);

      setReceiptResult(receipt);
      clearCart();
      setCustomerName('');
      setPaymentMethod(outletPaymentMethods[0]?.code ?? 'CASH');
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
      const queueMethodConfig = outletPaymentMethods.find((m) => m.code === queuePaymentMethod) ?? null;
      const queueSurcharge = calculatePosSurcharge(selectedQueueOrder.totalAmount, queueMethodConfig?.surchargeRules ?? []);
      const queuePreRound = selectedQueueOrder.totalAmount + queueSurcharge;
      let queueTotalToPay = queuePreRound;
      if (roundingSetting?.enabled && roundingSetting.unit > 1 && roundingSetting.method !== 'NONE') {
        const unit = Math.max(1, Math.floor(roundingSetting.unit));
        const q = queuePreRound / unit;
        if (roundingSetting.method === 'NEAREST') queueTotalToPay = Math.round(q) * unit;
        else if (roundingSetting.method === 'CEIL') queueTotalToPay = Math.ceil(q) * unit;
        else if (roundingSetting.method === 'FLOOR') queueTotalToPay = Math.floor(q) * unit;
      }
      await createPayment({
        orderId: selectedQueueOrder.id,
        outletId: selectedOutletId,
        amountPaid: queueTotalToPay,
        amountTendered: queueTotalToPay,
        method: queuePaymentMethod,
        note: queuePaymentNote.trim() || undefined,
      });

      const receipt = await getReceiptByOrderId(
        selectedQueueOrder.id,
        selectedOutletId,
      );

      setReceiptResult(receipt);
      setQueuePaymentMethod(outletPaymentMethods[0]?.code ?? 'CASH');
      setQueuePaymentNote('');
      setQueueCustomerName('');
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
              {formatCurrency(roundingCalc.roundedTotal)}
            </p>
          </div>
        </div>
      </section>

      {businessType === 'RESTAURANT' && (
        <section className="flex gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
          <span className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-center text-sm font-semibold text-white">
            Quick Service / Take Away
          </span>
          <button
            onClick={() => router.push('/dashboard/pos/dine-in')}
            className="flex-1 rounded-xl px-4 py-2.5 text-center text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Dine-In
          </button>
        </section>
      )}

      {pageMessage ? (
        <section className="rounded-[28px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700 shadow-sm sm:px-6">
          {pageMessage}
        </section>
      ) : null}

      <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Outlet & Filter</h2>
              <p className="mt-1 text-sm text-slate-500">
                Pilih outlet dulu sebelum memakai POS.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="min-w-[220px]">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Outlet
                </label>
                <select
                  value={selectedOutletId}
                  onChange={(event) => {
                    setSelectedOutletId(event.target.value);
                    setCartMessage('');
                    setQueueMessage('');
                    setReceiptResult(null);
                  }}
                  disabled={outlets.length === 0}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="">Pilih outlet</option>
                  {outlets.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.code})
                    </option>
                  ))}
                </select>
              </div>

              {businessType === 'RESTAURANT' ? (
  <>
    <div className="min-w-[200px]">
      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        Meja
      </label>
      <select
        value={selectedTableId}
        onChange={(event) => setSelectedTableId(event.target.value)}
        disabled={!selectedOutletId || tables.length === 0}
        className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <option value="">Pilih meja</option>
        {tables.map((table) => (
          <option key={table.id} value={table.id}>
            {table.name}
          </option>
        ))}
      </select>
    </div>

    <div className="min-w-[180px]">
      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        No Meja (ketik kode)
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Misal: T01"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const target = e.target as HTMLInputElement;
              const code = target.value.trim().toLowerCase();
              const found = tables.find(t => t.code?.toLowerCase() === code || t.name?.toLowerCase() === code);
              if (found) {
                setSelectedTableId(found.id);
              }
            }
          }}
          className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        />
        <button
          type="button"
          onClick={() => {
            const input = (document.activeElement as HTMLInputElement);
            const code = (input?.value || '').trim().toLowerCase();
            const found = tables.find(t => t.code?.toLowerCase() === code || t.name?.toLowerCase() === code);
            if (found) {
              setSelectedTableId(found.id);
            }
          }}
          className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Pilih
        </button>
      </div>
    </div>
  </>
) : null}

              <div className="min-w-[180px]">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Nama Pelanggan
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Opsional"
                  disabled={!selectedOutletId}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>

              <div className="min-w-[180px]">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Metode Bayar
                </label>
                <select
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value)}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                >
                  {outletPaymentMethods.length > 0
                    ? outletPaymentMethods.map((m) => (
                        <option key={m.code} value={m.code}>{m.name}</option>
                      ))
                    : ['CASH', 'QRIS', 'TRANSFER', 'CARD'].map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => void refreshProducts()}
                  disabled={!selectedOutletId || productLoading}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <FontAwesomeIcon icon={faArrowRotateLeft} className="h-4 w-4" />
                  {productLoading ? 'Memuat...' : 'Refresh Produk'}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <form
              onSubmit={handleSearchSubmit}
              className="flex w-full max-w-xl items-center gap-2"
            >
              <div className="relative flex-1">
                <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
                  <FontAwesomeIcon icon={faMagnifyingGlass} className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder={`Cari ${productLabelLower}, kategori, brand, atau code`}
                  disabled={!selectedOutletId}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>

              <button
                type="submit"
                disabled={!selectedOutletId}
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Cari
              </button>

              <button
                type="button"
                onClick={handleResetProductSearch}
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Reset
              </button>
            </form>

           
          </div>
        </div>

        <div className="px-5 py-5 ">
           <div className="flex flex-wrap gap-2">
              {categoryOptions.map((category) => {
                const isActive = selectedCategory === category;

                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setSelectedCategory(category)}
                    disabled={!selectedOutletId}
                    className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
                      isActive
                        ? 'bg-slate-900 text-white'
                        : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    } disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    {category}
                  </button>
                );
              })}
            </div>
        </div>

      

        {!selectedOutletId ? (
          <div className="px-5 py-5 sm:px-6">
            <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
              Pilih outlet dulu dari dropdown sebelum memakai POS.
            </div>
          </div>
        ) : (
          <div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1.25fr)_420px] sm:px-6 sm:py-5">
            
            <div className="space-y-4">
              {productLoading ? (
                <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-[260px] animate-pulse rounded-[24px] bg-slate-100"
                    />
                  ))}
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-12 text-center text-sm text-slate-500">
                  {searchKeyword || selectedCategory !== 'ALL'
                    ? `Tidak ada ${productLabelLower} yang cocok dengan filter.`
                    : `${productLabel} belum tersedia di outlet ini.`}
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                  {filteredProducts.map((product) => {
                    const imageUrl = getProductImageUrl(product);
                    const displayPrice = getProductDisplayPrice(product);
                    const baseCartEntry = baseCartProductMap[product.id];
                    const cardQuantity = baseCartEntry?.qty ?? 0;

                    return (
                      <article
                        key={product.id}
                        className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                      >
                        <div className="relative h-44 w-full bg-slate-100">
                          {imageUrl ? (
                            <Image
                              src={imageUrl}
                              alt={product.name}
                              fill
                              sizes="(max-width: 768px) 100vw, 33vw"
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-slate-400">
                              <FontAwesomeIcon icon={faImage} className="h-6 w-6" />
                            </div>
                          )}

                          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                            {product.category?.name ? (
                              <span className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-slate-700 backdrop-blur">
                                {product.category.name}
                              </span>
                            ) : null}

                            {product.effectivePrice > 0 &&
                            product.effectivePrice < product.basePrice ? (
                              <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold text-emerald-700">
                                Harga Outlet
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div className="space-y-4 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h3 className="line-clamp-2 text-base font-semibold text-slate-900">
                                {product.name}
                              </h3>
                              <p className="mt-1 text-xs text-slate-500">
                                {product.code || '-'}
                              </p>
                              {product.brand ? (
                                <p className="mt-2 line-clamp-1 text-sm text-slate-500">
                                  {product.brand}
                                </p>
                              ) : null}
                            </div>

                            <div className="text-right">
                              {product.effectivePrice > 0 &&
                              product.effectivePrice < product.basePrice ? (
                                <>
                                  <p className="text-xs text-slate-400 line-through">
                                    {formatCurrency(product.basePrice)}
                                  </p>
                                  <p className="text-base font-semibold text-emerald-600">
                                    {formatCurrency(displayPrice)}
                                  </p>
                                </>
                              ) : (
                                <p className="text-base font-semibold text-slate-900">
                                  {formatCurrency(displayPrice)}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-3">
                            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-xs font-medium text-slate-600">
                              <FontAwesomeIcon icon={faTag} className="h-3 w-3" />
                              {product.unit || 'Unit'}
                            </div>

                            <div className="flex items-center gap-3">
                              {cardQuantity > 0 ? (
                                <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-1">
                                  <button
                                    type="button"
                                    onClick={() => decreaseBaseCartProduct(product.id)}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-700 transition hover:bg-slate-50"
                                  >
                                    <FontAwesomeIcon icon={faMinus} className="h-3 w-3" />
                                  </button>

                                  <span className="min-w-6 text-center text-sm font-semibold text-slate-900">
                                    {cardQuantity}
                                  </span>

                                  <button
                                    type="button"
                                    onClick={() => addToCart(product)}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-700 transition hover:bg-slate-50"
                                  >
                                    <FontAwesomeIcon icon={faPlus} className="h-3 w-3" />
                                  </button>
                                </div>
                              ) : null}

                              
                            </div>
                          </div>
                          <div>
                              <button
                                type="button"
                                onClick={() => addToCart(product)}
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
                              >
                                <FontAwesomeIcon icon={faPlus} className="h-3.5 w-3.5" />
                                Tambah
                              </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>

            <aside className="xl:sticky xl:top-5">
              <div className="rounded-[24px] border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">Cart Kasir</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {selectedOutlet?.name || '-'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={clearCart}
                      disabled={cart.length === 0}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white px-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <FontAwesomeIcon icon={faTrashCan} className="h-3.5 w-3.5" />
                      Clear
                    </button>
                  </div>
                </div>

                {cartMessage ? (
                  <div className="border-b border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {cartMessage}
                  </div>
                ) : null}

                <div className="max-h-[420px] space-y-3 overflow-y-auto px-4 py-4">
                  {cart.length === 0 ? (
                    <div className="rounded-[20px] border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                      Belum ada {productLabelLower} di cart.
                    </div>
                  ) : (
                    cart.map((item) => {
                      const line = cartCalc.lines.get(item.lineId);
                      const unitNet = line ? line.unitNet : item.basePrice;
                      const lineNet = line ? line.lineNet : item.basePrice * item.qty;
                      const hasDiscount = line ? line.lineDiscount > 0 : false;

                      return (
                      <div
                        key={item.lineId}
                        className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">
                              {item.productName}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {hasDiscount ? (
                                <>
                                  <span className="line-through">
                                    {formatCurrency(item.basePrice)}
                                  </span>{' '}
                                  <span className="text-emerald-600">
                                    {formatCurrency(unitNet)}
                                  </span>{' '}
                                  / item
                                </>
                              ) : (
                                <>{formatCurrency(unitNet)} / item</>
                              )}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeCartItem(item.lineId)}
                            className="text-slate-400 transition hover:text-rose-600"
                          >
                            <FontAwesomeIcon icon={faTrashCan} className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-3">
                          <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-1">
                            <button
                              type="button"
                              onClick={() => updateCartQty(item.lineId, item.qty - 1)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-700 transition hover:bg-slate-50"
                            >
                              <FontAwesomeIcon icon={faMinus} className="h-3.5 w-3.5" />
                            </button>

                            <span className="min-w-8 text-center text-sm font-semibold text-slate-900">
                              {item.qty}
                            </span>

                            <button
                              type="button"
                              onClick={() => updateCartQty(item.lineId, item.qty + 1)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-700 transition hover:bg-slate-50"
                            >
                              <FontAwesomeIcon icon={faPlus} className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <span className="text-sm font-semibold text-slate-900">
                            {formatCurrency(lineNet)}
                          </span>
                        </div>

                        <textarea
                          value={item.note}
                          onChange={(event) =>
                            updateCartNote(item.lineId, event.target.value)
                          }
                          rows={2}
                          placeholder="Catatan item"
                          className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                        />
                      </div>
                      );
                    })
                  )}
                </div>

                <div className="border-t border-slate-200 px-4 py-4">
                  <div className="space-y-2 rounded-2xl bg-slate-50 px-4 py-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Subtotal</span>
                      <span className="font-semibold text-slate-900">
                        {formatCurrency(grossSubtotal)}
                      </span>
                    </div>

                    {promoDiscountTotal > 0 ? (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">Diskon</span>
                        <span className="font-semibold text-red-500">
                          -{formatCurrency(promoDiscountTotal)}
                        </span>
                      </div>
                    ) : null}

                    {charges.map((chargeRule,index) => (
                      <div
                        key={`${chargeRule.label}-${index}`}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-slate-500">{chargeRule.label}</span>
                        <span className="font-semibold text-slate-900">
                          {formatCurrency(chargeRule.amount)}
                        </span>
                      </div>
                    ))}

                    
                    {paymentSurcharge > 0 ? (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">
                          Service Charge
                        </span>
                        <span className="font-semibold text-amber-700">
                          +{formatCurrency(paymentSurcharge)}
                        </span>
                      </div>
                    ) : null}

                    {roundingSetting?.enabled && roundingCalc.roundingAmount !== 0 ? (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">Pembulatan</span>
                        <span className="font-semibold text-slate-900">
                          {roundingCalc.roundingAmount > 0 ? '+' : ''}{formatCurrency(roundingCalc.roundingAmount)}
                        </span>
                      </div>
                    ) : null}

                    <div className="border-t border-slate-200 pt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-600">
                          Grand Total
                        </span>
                        <span className="text-base font-semibold text-slate-900">
                          {formatCurrency(grandTotalWithSurcharge)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Catatan Payment
                      </label>
                      <textarea
                        value={paymentNote}
                        onChange={(event) => setPaymentNote(event.target.value)}
                        rows={2}
                        placeholder="Catatan payment"
                        className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => void handleCheckout()}
                      disabled={!selectedOutletId || cart.length === 0 || checkoutLoading}
                      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      <FontAwesomeIcon icon={faWallet} className="h-4 w-4" />
                      {checkoutLoading ? 'Memproses...' : 'Checkout & Bayar'}
                    </button>

                    {receiptResult ? (
                      <Link
                        href={`/dashboard/receipts/${receiptResult.id}`}
                        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        <FontAwesomeIcon icon={faPrint} className="h-4 w-4" />
                        Buka Receipt Terakhir
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            </aside>
          </div>
        )}
      </section>

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
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
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
                  disabled={!selectedOutletId}
                  className={`rounded-2xl px-4 py-3 text-left transition ${
                    isActive
                      ? 'bg-slate-900 text-white'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  } disabled:cursor-not-allowed disabled:opacity-60`}
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

        {!selectedOutletId ? (
          <div className="px-5 py-5 sm:px-6">
            <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
              Pilih outlet dulu untuk melihat antrian kasir.
            </div>
          </div>
        ) : (
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
                    <h4 className="text-sm font-semibold text-slate-900">Item Order</h4>

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
                    <h4 className="text-sm font-semibold text-slate-900">Aksi Kasir</h4>

                    {selectedQueueOrder.paymentStatus === 'PAID' ? (
                      <div className="mt-3 space-y-3">
                        <p className="text-sm text-slate-500">
                          Order ini sudah dibayar dan boleh diproses kitchen.
                        </p>

                        <button
                          type="button"
                          onClick={() => void handleOpenQueueReceipt()}
                          disabled={queueActionLoading}
                          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <FontAwesomeIcon icon={faPrint} className="h-4 w-4" />
                          {queueActionLoading ? 'Memuat...' : 'Buka Receipt'}
                        </button>
                      </div>
                    ) : (
                      <div className="mt-3 space-y-3">
                        <div>
                          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                            Metode Payment
                          </label>
                          <select
                            value={queuePaymentMethod}
                            onChange={(event) =>
                              setQueuePaymentMethod(
                                event.target.value as PosPaymentMethod,
                              )
                            }
                            className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                          >
                            {outletPaymentMethods.length > 0
                              ? outletPaymentMethods.map((m) => (
                                  <option key={m.code} value={m.code}>{m.name}</option>
                                ))
                              : ['CASH', 'QRIS', 'TRANSFER', 'CARD'].map((m) => (
                                  <option key={m} value={m}>{m}</option>
                                ))}
                          </select>
                        </div>

                        <div>
                          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                            Catatan Payment
                          </label>
                          <textarea
                            value={queuePaymentNote}
                            onChange={(event) => setQueuePaymentNote(event.target.value)}
                            rows={2}
                            placeholder="Catatan payment order aktif"
                            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => void handleQueuePayment()}
                          disabled={queueActionLoading}
                          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                        >
                          <FontAwesomeIcon icon={faCreditCard} className="h-4 w-4" />
                          {queueActionLoading ? 'Memproses...' : 'Proses Payment'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white px-5 py-4 shadow-sm sm:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Shortcut</h2>
            <p className="mt-1 text-sm text-slate-500">
              Akses cepat ke riwayat dan receipt.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/pos/history"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <FontAwesomeIcon icon={faReceipt} className="h-4 w-4" />
              History POS
            </Link>

            <Link
              href="/dashboard/payments/history"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <FontAwesomeIcon icon={faPrint} className="h-4 w-4" />
              History Payment
            </Link>

            <Link
              href="/dashboard/settings/payment-methods"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <FontAwesomeIcon icon={faCreditCard} className="h-4 w-4" />
              Metode Bayar
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}




























