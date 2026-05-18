import { api } from './api';
import { getActiveBusinessId, getCachedCurrentUser } from './auth';
import type {  PosAddOrderItemPayload,  PosAppliedPromo,  PosCartItem,  PosChargeItem,  PosCreateOrderPayload,  PosCreatePaymentPayload,  PosHistoryItem,  PosHistoryResponse,  PosListMeta,  PosOrderQueue,  PosOrderSource,  PosOrderStatus,  PosOrderItemResponse,  PosOrderResponse,  PosOrderType,  PosOutletItem,  PosOutletListResponse,  PosPaymentMethod,  PosPaymentResponse,  PosProductItem,  PosProductListResponse,  PosReceiptContentSnapshot,  PosReceiptItemSnapshot,  PosReceiptPayload,  PosReceiptResponse,  PosSettingsChargeRule,  PosSettingsChargesResponse,  PosTableItem,  PosTableListResponse,  TableOccupancyItem,  PosUpdateOrderItemPayload,  PosOutletPaymentMethod,  PosSurchargeRule,} from '@/types/pos';
import type { BusinessMembership, CurrentUser } from '@/types/auth';
type ApiEnvelope<T> = {  success?: boolean;
  message?: string;
  data?: T;
  meta?: Partial<PosListMeta>;
};
type ListApiData<T> =  | T[]  | {      items?: T[];
      meta?: Partial<PosListMeta>;
    };
type ProductApiAppliedPromoRow = {  id: string;
  name: string;
  targetType: 'CATEGORY' | 'PRODUCT' | 'PRODUCT_NAME' | 'BRAND' | 'UNIT';
  targetValue: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: string;
  discountAmount?: string | number | null;
};
type ProductApiRow = {  id: string;
  businessId: string;
  categoryId?: string | null;
  name: string;
  code?: string | null;
  sku?: string | null;
  barcode?: string | null;
  brand?: string | null;
  unit?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  basePrice?: string | number | null;
  effectivePrice?: string | number | null;
  promoPrice?: string | number | null;
  promoDiscountAmount?: string | number | null;
  appliedPromo?: ProductApiAppliedPromoRow | null;
  status?: 'ACTIVE' | 'INACTIVE';
  category?: {    id: string;
    name: string;
    code?: string | null;
  } | null;
};
type ProductListApiData = ListApiData<ProductApiRow>;
type OutletApiRow = {  id: string;
  businessId: string;
  name: string;
  code: string;
  address?: string | null;
  phone?: string | null;
  status?: 'ACTIVE' | 'INACTIVE';
};
type TableApiRow = {  id: string;
  outletId: string;
  code: string;
  name: string;
  capacity?: number | null;
  status?: 'ACTIVE' | 'INACTIVE';
};
type OrderItemApiRow = {  id: string;
  productId: string;
  productName: string;
  productCode?: string | null;
  productSku?: string | null;
  productBarcode?: string | null;
  quantity?: string | number | null;
  unitPrice?: string | number | null;
  lineSubtotal?: string | number | null;
  lineDiscountAmount?: string | number | null;
  lineTotal?: string | number | null;
  note?: string | null;
  status?: string;
};
type OrderApiRow = {  id: string;
  businessId: string;
  outletId: string;
  outletName?: string | null;
  businessType?: 'RETAIL' | 'RESTAURANT';
  orderType?: PosOrderType | null;
  tableId?: string | null;
  tableName?: string | null;
  customerName?: string | null;
  orderNumber: string;
  status: PosOrderResponse['status'];
  paymentStatus: PosOrderResponse['paymentStatus'];
  notes?: string | null;
  subtotal?: string | number | null;
  discountAmount?: string | number | null;
  taxAmount?: string | number | null;
  serviceChargeAmount?: string | number | null;
  totalAmount?: string | number | null;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  itemCount?: number | null;
  items?: OrderItemApiRow[];
  isGuestOrder?: boolean | null;
  orderSource?: 'GUEST' | 'STAFF' | null;
};
type PaymentApiRow = {  id: string;
  paymentNumber: string;
  orderId: string;
  businessId: string;
  outletId: string;
  method: PosPaymentMethod;
  status: PosPaymentResponse['status'];
  amountPaid?: string | number | null;
  amountTendered?: string | number | null;
  changeAmount?: string | number | null;
  note?: string | null;
  paidAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  receipt?: {    id: string;
    receiptNumber: string;
  } | null;
  receiptId?: string | null;
  receiptNumber?: string | null;
};
type ReceiptItemApiRow = {  id: string;
  productName: string;
  productCode?: string | null;
  productSku?: string | null;
  productBarcode?: string | null;
  quantity?: string | number | null;
  unitPrice?: string | number | null;
  lineSubtotal?: string | number | null;
  lineDiscountAmount?: string | number | null;
  lineTotal?: string | number | null;
  note?: string | null;
  status?: string;
};
type ReceiptSnapshotApiRow = {  orderId: string;
  orderNumber: string;
  businessName: string;
  outletName: string;
  outletAddress?: string | null;
  tableName?: string | null;
  customerName?: string | null;
  cashierName?: string | null;
  notes?: string | null;
  subtotal?: string | number | null;
  discountAmount?: string | number | null;
  taxAmount?: string | number | null;
  serviceChargeAmount?: string | number | null;
  surchargeAmount?: string | number | null;
  totalAmount?: string | number | null;
  items?: ReceiptItemApiRow[];
};
type ReceiptApiRow = {  id: string;
  receiptNumber: string;
  businessId: string;
  outletId: string;
  businessName?: string | null;
  outletName?: string | null;
  outletAddress?: string | null;
  issuedAt: string;
  printedAt?: string | null;
  order?: {    id: string;
    orderNumber: string;
    status: PosOrderResponse['status'];
    paymentStatus: PosOrderResponse['paymentStatus'];
    subtotal?: string | number | null;
    discountAmount?: string | number | null;
    taxAmount?: string | number | null;
    serviceChargeAmount?: string | number | null;
    totalAmount?: string | number | null;
  };
  payment?: {    id: string;
    paymentNumber: string;
    method: PosPaymentMethod;
    status: PosPaymentResponse['status'];
    amountPaid?: string | number | null;
    amountTendered?: string | number | null;
    changeAmount?: string | number | null;
    paidAt?: string | null;
  } | null;
  contentSnapshot?: ReceiptSnapshotApiRow | null;
};
type ProductListParams = {  outletId?: string;
  page?: number;
  perPage?: number;
  search?: string;
  status?: 'ACTIVE' | 'INACTIVE';
};
type OrderHistoryParams = {  outletId: string;
  page?: number;
  perPage?: number;
  search?: string;
  status?: PosOrderResponse['status'];
  paymentStatus?: PosOrderResponse['paymentStatus'];
  queue?: PosOrderQueue;
  source?: PosOrderSource;
};
type PosChargeRuleApiRow = {
  key?: string | null;
  label?: string | null;
  type?: string | null;
  value?: string | number | null;
  enabled?: boolean | null;
};
type PosRoundingApiRow = {
  enabled?: boolean | null;
  method?: string | null;
  unit?: string | number | null;
};
type PosSettingsApiData = {
  charges?: PosChargeRuleApiRow[] | null;
  rounding?: PosRoundingApiRow | null;
};
function isRecord(value: unknown): value is Record<string, unknown> {  return typeof value === 'object' && value !== null;
}function isOrderApiRow(value: unknown): value is OrderApiRow {  if (!isRecord(value)) {    return false;
  }  return (    typeof value.id === 'string' &&    typeof value.businessId === 'string' &&    typeof value.outletId === 'string' &&    typeof value.orderNumber === 'string' &&    typeof value.createdAt === 'string' &&    typeof value.updatedAt === 'string'  );
}function extractOrderApiRow(value: unknown): OrderApiRow | null {  if (isOrderApiRow(value)) {    return value;
  }  if (!isRecord(value)) {    return null;
  }  const candidateKeys = ['order', 'item', 'result', 'payload'];
  for (const key of candidateKeys) {    const candidate = value[key];
    if (isOrderApiRow(candidate)) {      return candidate;
    }  }  return null;
}function getBusinessIdOrThrow(): string {  const businessId = getActiveBusinessId();
  if (!businessId) {    throw new Error('Business aktif belum dipilih');
  }  return businessId;
}function resolveOutletId(outletId?: string): string {  if (outletId && outletId.trim()) {    return outletId.trim();
  }  if (typeof window !== 'undefined') {    const storedOutletId = window.localStorage.getItem('activeOutletId');
    if (storedOutletId && storedOutletId.trim()) {      return storedOutletId.trim();
    }  }  throw new Error('Outlet aktif belum dipilih');
}function buildScopedHeaders(outletId?: string): Record<string, string> {  const headers: Record<string, string> = {    'x-business-id': getBusinessIdOrThrow(),  };
  if (outletId) {    headers['x-outlet-id'] = outletId;
  }  return headers;
}function toNumber(value: string | number | null | undefined): number {  if (value === null || value === undefined || value === '') {    return 0;
  }  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}function normalizeMeta(meta?: Partial<PosListMeta>): PosListMeta {  return {    page: meta?.page ?? 1,    perPage: meta?.perPage ?? 10,    total: meta?.total ?? 0,    totalPages: meta?.totalPages ?? 1,  };
}function extractListRows<T>(data: ListApiData<T> | undefined): T[] {  if (Array.isArray(data)) {    return data;
  }  if (data && Array.isArray(data.items)) {    return data.items;
  }  return [];
}function extractListMeta<T>(  envelopeMeta: Partial<PosListMeta> | undefined,  data: ListApiData<T> | undefined,): PosListMeta {  if (data && !Array.isArray(data) && data.meta) {    return normalizeMeta(data.meta);
  }  return normalizeMeta(envelopeMeta);
}function mapAppliedPromo(row?: ProductApiAppliedPromoRow | null): PosAppliedPromo | null {  if (!row) {    return null;
  }  return {    id: row.id,    name: row.name,    targetType: row.targetType,    targetValue: row.targetValue,    discountType: row.discountType,    discountValue: row.discountValue,    discountAmount: toNumber(row.discountAmount),  };
}function mapProduct(row: ProductApiRow): PosProductItem {  const basePrice = toNumber(row.basePrice);
  const effectivePrice =    row.effectivePrice !== undefined && row.effectivePrice !== null      ? toNumber(row.effectivePrice)      : basePrice;
  const promoPrice =    row.promoPrice !== undefined && row.promoPrice !== null      ? toNumber(row.promoPrice)      : effectivePrice;
  const promoDiscountAmount = toNumber(row.promoDiscountAmount);
  const appliedPromo = mapAppliedPromo(row.appliedPromo);
  return {    id: row.id,    businessId: row.businessId,    categoryId: row.categoryId ?? null,    name: row.name,    code: row.code ?? null,    sku: row.sku ?? null,    barcode: row.barcode ?? null,    brand: row.brand ?? null,    unit: row.unit ?? null,    description: row.description ?? null,    imageUrl: row.imageUrl ?? null,    basePrice,    effectivePrice,    promoPrice,    promoDiscountAmount,    appliedPromo,    status: row.status ?? 'ACTIVE',    category: row.category      ? {          id: row.category.id,          name: row.category.name,          code: row.category.code ?? null,        }      : null,  };
}function mapOutlet(row: OutletApiRow): PosOutletItem {  return {    id: row.id,    businessId: row.businessId,    name: row.name,    code: row.code,    address: row.address ?? null,    phone: row.phone ?? null,    status: row.status ?? 'ACTIVE',  };
}function mapTable(row: TableApiRow): PosTableItem {  return {    id: row.id,    outletId: row.outletId,    code: row.code,    name: row.name,    capacity: row.capacity ?? null,    status: row.status ?? 'ACTIVE',  };
}function mapOrderItem(row: OrderItemApiRow, orderId: string): PosOrderItemResponse {  const quantity = toNumber(row.quantity);
  const unitPrice = toNumber(row.unitPrice);
  const lineSubtotal = toNumber(row.lineSubtotal);
  const lineDiscountAmount = toNumber(row.lineDiscountAmount);
  const lineTotal = toNumber(row.lineTotal);
  return {    id: row.id,    orderId,    productId: row.productId,    productName: row.productName,    productCode: row.productCode ?? null,    productSku: row.productSku ?? null,    productBarcode: row.productBarcode ?? null,    quantity,    unitPrice,    lineSubtotal,    lineDiscountAmount,    lineTotal,    note: row.note ?? null,    status: row.status ?? 'PENDING',    qty: quantity,    price: unitPrice,    subtotal: lineSubtotal,  };
}function mapOrder(row: OrderApiRow): PosOrderResponse {  const subtotal = toNumber(row.subtotal);
  const discountAmount = toNumber(row.discountAmount);
  const taxAmount = toNumber(row.taxAmount);
  const serviceChargeAmount = toNumber(row.serviceChargeAmount);
  const totalAmount = toNumber(row.totalAmount);
  return {    id: row.id,    businessId: row.businessId,    outletId: row.outletId,    outletName: row.outletName ?? null,    businessType: row.businessType,    orderType: row.orderType ?? 'QUICK_SERVICE',    tableId: row.tableId ?? null,    tableName: row.tableName ?? null,    customerName: row.customerName ?? null,    orderNumber: row.orderNumber,    status: row.status,    paymentStatus: row.paymentStatus,    notes: row.notes ?? null,    subtotal,    discountAmount,    taxAmount,    serviceChargeAmount,    totalAmount,    createdAt: row.createdAt,    updatedAt: row.updatedAt,    submittedAt: row.submittedAt ?? null,    completedAt: row.completedAt ?? null,    cancelledAt: row.cancelledAt ?? null,    itemCount: row.itemCount ?? (row.items?.length ?? 0),    items: Array.isArray(row.items)      ? row.items.map((item) => mapOrderItem(item, row.id))      : undefined,    isGuestOrder: row.isGuestOrder === true || row.orderSource === 'GUEST',    orderSource: row.orderSource === 'GUEST' ? 'GUEST' : 'STAFF',    orderNo: row.orderNumber,    note: row.notes ?? null,    total: totalAmount,  };
}function mapPayment(row: PaymentApiRow): PosPaymentResponse {  const amountPaid = toNumber(row.amountPaid);
  const amountTendered = toNumber(row.amountTendered);
  const changeAmount = toNumber(row.changeAmount);
  return {    id: row.id,    paymentNumber: row.paymentNumber,    orderId: row.orderId,    businessId: row.businessId,    outletId: row.outletId,    method: row.method,    status: row.status,    amountPaid,    amountTendered,    changeAmount,    note: row.note ?? null,    paidAt: row.paidAt ?? null,    createdAt: row.createdAt,    updatedAt: row.updatedAt,    receipt: row.receipt ?? null,    receiptId: row.receiptId ?? row.receipt?.id ?? null,    receiptNumber: row.receiptNumber ?? row.receipt?.receiptNumber ?? null,    amount: amountPaid,  };
}function mapReceiptItem(row: ReceiptItemApiRow): PosReceiptItemSnapshot {  const quantity = toNumber(row.quantity);
  const unitPrice = toNumber(row.unitPrice);
  const lineSubtotal = toNumber(row.lineSubtotal);
  const lineDiscountAmount = toNumber(row.lineDiscountAmount);
  const lineTotal = toNumber(row.lineTotal);
  return {    id: row.id,    productName: row.productName,    productCode: row.productCode ?? null,    productSku: row.productSku ?? null,    productBarcode: row.productBarcode ?? null,    quantity,    unitPrice,    lineSubtotal,    lineDiscountAmount,    lineTotal,    note: row.note ?? null,    status: row.status ?? 'PENDING',    qty: quantity,    price: unitPrice,    subtotal: lineSubtotal,  };
}function mapReceiptSnapshot(  row: ReceiptSnapshotApiRow | null | undefined,): PosReceiptContentSnapshot | null {  if (!row) {    return null;
  }  return {    orderId: row.orderId,    orderNumber: row.orderNumber,    businessName: row.businessName,    outletName: row.outletName,    outletAddress: row.outletAddress ?? null,    tableName: row.tableName ?? null,    customerName: row.customerName ?? null,    cashierName: row.cashierName ?? null,    notes: row.notes ?? null,    subtotal: toNumber(row.subtotal),    discountAmount: toNumber(row.discountAmount),    taxAmount: toNumber(row.taxAmount),    serviceChargeAmount: toNumber(row.serviceChargeAmount),    surchargeAmount: toNumber(row.surchargeAmount),    totalAmount: toNumber(row.totalAmount),    items: Array.isArray(row.items) ? row.items.map(mapReceiptItem) : [],  };
}function mapReceipt(row: ReceiptApiRow): PosReceiptResponse {  const snapshot = mapReceiptSnapshot(row.contentSnapshot);
  return {    id: row.id,    receiptNumber: row.receiptNumber,    paymentId: row.payment?.id ?? null,    orderId: row.order?.id ?? snapshot?.orderId ?? '',    businessId: row.businessId,    outletId: row.outletId,    businessName: row.businessName ?? snapshot?.businessName ?? null,    outletName: row.outletName ?? snapshot?.outletName ?? null,    outletAddress: row.outletAddress ?? snapshot?.outletAddress ?? null,    issuedAt: row.issuedAt,    printedAt: row.printedAt ?? null,    createdAt: row.issuedAt,    contentSnapshot: snapshot,    order: row.order      ? {          id: row.order.id,          orderNumber: row.order.orderNumber,          status: row.order.status,          paymentStatus: row.order.paymentStatus,          subtotal: toNumber(row.order.subtotal),          discountAmount: toNumber(row.order.discountAmount),          taxAmount: toNumber(row.order.taxAmount),          serviceChargeAmount: toNumber(row.order.serviceChargeAmount),          totalAmount: toNumber(row.order.totalAmount),        }      : undefined,    payment: row.payment      ? {          id: row.payment.id,          paymentNumber: row.payment.paymentNumber,          method: row.payment.method,          status: row.payment.status,          amountPaid: toNumber(row.payment.amountPaid),          amountTendered: toNumber(row.payment.amountTendered),          changeAmount: toNumber(row.payment.changeAmount),          paidAt: row.payment.paidAt ?? null,        }      : null,    receiptNo: row.receiptNumber,    total: toNumber(row.order?.totalAmount ?? snapshot?.totalAmount ?? 0),  };
}function mapHistoryItem(row: OrderApiRow): PosHistoryItem {  const mapped = mapOrder(row);
  return {    id: mapped.id,    orderNumber: mapped.orderNumber,    orderNo: mapped.orderNo,    outletId: mapped.outletId,    outletName: mapped.outletName ?? '-',    tableName: mapped.tableName,    status: mapped.status,    paymentStatus: mapped.paymentStatus,    subtotal: mapped.subtotal,    totalAmount: mapped.totalAmount,    total: mapped.total,    itemCount: mapped.itemCount,    createdAt: mapped.createdAt,    isGuestOrder: mapped.isGuestOrder,    orderSource: mapped.orderSource,  };
}function getActiveMembership(user: CurrentUser | null): BusinessMembership | null {  if (!user) {    return null;
  }  const activeBusinessId = getActiveBusinessId();
  const matchedMembership = Array.isArray(user.businessMemberships)    ? user.businessMemberships.find(        (item) => item.businessId === activeBusinessId && item.status === 'ACTIVE',      )    : null;
  if (matchedMembership) {    return matchedMembership;
  }  const defaultMembership = user.accessProfile?.defaultBusinessMembership;
  if (defaultMembership?.status === 'ACTIVE') {    return defaultMembership;
  }  const firstActiveMembership = Array.isArray(user.businessMemberships)    ? user.businessMemberships.find((item) => item.status === 'ACTIVE')    : null;
  return firstActiveMembership ?? null;
}function getOutletListFromMembership(): PosOutletItem[] {  const currentUser = getCachedCurrentUser();
  const membership = getActiveMembership(currentUser);
  if (!membership || membership.status !== 'ACTIVE') {    return [];
  }  const rawAllowedOutlets = Array.isArray(    (membership as BusinessMembership & { allowedOutlets?: unknown }).allowedOutlets,  )    ? ((membership as BusinessMembership & {        allowedOutlets?: Array<{          id?: string;          outletId?: string;
          name?: string | null;
          outletName?: string | null;
          code?: string | null;
          outletCode?: string | null;
          outletAddress?: string | null;
          outletPhone?: string | null;
          status?: 'ACTIVE' | 'INACTIVE';
        }>;
      }).allowedOutlets ?? [])    : [];
  if (rawAllowedOutlets.length > 0) {    return rawAllowedOutlets.map((item) => ({      id: (item.id ?? item.outletId) as string,      businessId: membership.businessId,      name: item.name ?? item.outletName ?? item.code ?? item.outletCode ?? 'Outlet',      code: item.code ?? item.outletCode ?? '-',      address: item.outletAddress ?? null,      phone: item.outletPhone ?? null,      status: item.status ?? 'ACTIVE',    }));
  }  if (membership.hasAllOutletAccess) {    return [];
  }  return (membership.allowedOutletIds ?? []).map((outletId, index) => ({    id: outletId,    businessId: membership.businessId,    name: `Outlet ${index + 1}`,    code: `OUTLET-${index + 1}`,    address: null,    phone: null,    status: 'ACTIVE',  }));
}function extractProductRows(data: ProductListApiData | undefined): ProductApiRow[] {  if (Array.isArray(data)) {    return data;
  }  if (data && Array.isArray(data.items)) {    return data.items;
  }  return [];
}function extractProductMeta(  envelopeMeta: Partial<PosListMeta> | undefined,  data: ProductListApiData | undefined,): PosListMeta {  if (data && !Array.isArray(data) && data.meta) {    return normalizeMeta(data.meta);
  }  return normalizeMeta(envelopeMeta);
}
export function formatCurrency(value: number): string {  return new Intl.NumberFormat('id-ID', {    style: 'currency',    currency: 'IDR',    maximumFractionDigits: 0,  }).format(value);
}
export function formatDateTime(value: string | null | undefined): string {  if (!value) {    return '-';
  }  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {    return '-';
  }  return new Intl.DateTimeFormat('id-ID', {    dateStyle: 'medium',    timeStyle: 'short',  }).format(date);
}
export function createCartLine(product: PosProductItem): PosCartItem {  const linePrice = product.effectivePrice;
  return {    lineId: `${product.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,    productId: product.id,    productName: product.name,    productCode: product.code,    unit: product.unit,    note: '',    qty: 1,    price: linePrice,    subtotal: linePrice,    imageUrl: product.imageUrl,  };
}
export function recalculateCart(cart: PosCartItem[]): PosCartItem[] {  return cart.map((item) => {    const qty = item.qty < 1 ? 1 : item.qty;
    const price = toNumber(item.price);
    return {      ...item,      qty,      price,      subtotal: qty * price,    };
  });
}
export function buildCharges(  subtotal: number,  rules: PosSettingsChargeRule[],): PosChargeItem[] {  if (!Array.isArray(rules) || rules.length === 0) {    return [];
  }  return rules    .filter((rule) => rule.enabled)    .map((rule) => {      const amount =        rule.type === 'PERCENTAGE'          ? (subtotal * toNumber(rule.value)) / 100          : toNumber(rule.value);
      return {        key: rule.key,        label: rule.label,        type: rule.type,        value: toNumber(rule.value),        amount,      };
    });
}
export function calculateGrandTotal(subtotal: number, charges: PosChargeItem[]): number {  const chargeTotal = charges.reduce((sum, item) => sum + item.amount, 0);
  return subtotal + chargeTotal;
}
export async function getPosProducts(  params: ProductListParams = {},): Promise<PosProductListResponse> {  const outletId = params.outletId?.trim() || undefined;
  const response = await api.get<ApiEnvelope<ProductListApiData>>('/products', {    params: {      outletId,      page: params.page ?? 1,      perPage: params.perPage ?? 100,      search: params.search,      status: params.status,    },    headers: buildScopedHeaders(outletId),  });
  const rows = extractProductRows(response.data.data);
  const meta = extractProductMeta(response.data.meta, response.data.data);
  return {    items: rows.map(mapProduct),    meta,  };
}
export async function getPosOutlets(): Promise<PosOutletListResponse> {  const outletsFromMembership = getOutletListFromMembership();
  if (outletsFromMembership.length > 0) {    return {      items: outletsFromMembership,      meta: {        page: 1,        perPage: outletsFromMembership.length,        total: outletsFromMembership.length,        totalPages: 1,      },    };
  }
  const response = await api.get<ApiEnvelope<ListApiData<OutletApiRow>>>('/business/outlets', {    params: {      businessId: getBusinessIdOrThrow(),    },    headers: buildScopedHeaders(),  });
  const rows = extractListRows(response.data.data);
  const meta = extractListMeta(response.data.meta, response.data.data);
  return {    items: rows.map(mapOutlet),    meta,  };
}
export async function getPosTables(outletId: string): Promise<PosTableListResponse> {  const response = await api.get<ApiEnvelope<ListApiData<TableApiRow>>>(    `/business/outlets-tables/${outletId}/tables`,    {      params: {        page: 1,        perPage: 100,      },      headers: buildScopedHeaders(outletId),    },  );
  const rows = extractListRows(response.data.data);
  const meta = extractListMeta(response.data.meta, response.data.data);
  return {    items: rows.map(mapTable),    meta,  };
}
export async function createOrder(  payload: PosCreateOrderPayload,): Promise<PosOrderResponse> {  const response = await api.post<ApiEnvelope<unknown>>(    '/orders',    {      outletId: payload.outletId,      orderType: payload.orderType,      tableId: payload.tableId,      customerName: payload.customerName,      notes: payload.notes,      items: payload.items,    },    {      headers: buildScopedHeaders(payload.outletId),    },  );
  const orderRow = extractOrderApiRow(response.data.data);
  if (!orderRow) {    throw new Error('Response order kosong');
  }  return mapOrder(orderRow);
}
export async function addOrderItem(  orderId: string,  payload: PosAddOrderItemPayload,): Promise<PosOrderResponse> {  const quantity = payload.quantity ?? payload.qty ?? 1;
  const response = await api.post<ApiEnvelope<unknown>>(    `/orders/${orderId}/items`,    {      outletId: payload.outletId,      productId: payload.productId,      quantity,      note: payload.note,    },    {      headers: buildScopedHeaders(payload.outletId),    },  );
  const orderRow = extractOrderApiRow(response.data.data);
  if (!orderRow) {    throw new Error('Response add item order kosong');
  }  return mapOrder(orderRow);
}
export async function updateOrderItem(  orderId: string,  itemId: string,  payload: PosUpdateOrderItemPayload,): Promise<PosOrderResponse> {  const quantity = payload.quantity ?? payload.qty ?? 1;
  const response = await api.put<ApiEnvelope<unknown>>(    `/orders/${orderId}/items/${itemId}`,    {      outletId: payload.outletId,      quantity,      note: payload.note,    },    {      headers: buildScopedHeaders(payload.outletId),    },  );
  const orderRow = extractOrderApiRow(response.data.data);
  if (!orderRow) {    throw new Error('Response update item order kosong');
  }  return mapOrder(orderRow);
}
export async function getOrderDetail(  orderId: string,  outletId: string,): Promise<PosOrderResponse> {  const response = await api.get<ApiEnvelope<unknown>>(`/orders/${orderId}`, {    params: {      outletId,    },    headers: buildScopedHeaders(outletId),  });
  const orderRow = extractOrderApiRow(response.data.data);
  if (!orderRow) {    throw new Error('Detail order tidak ditemukan');
  }  return mapOrder(orderRow);
}
export async function getOutletOrderHistory(  params: OrderHistoryParams,): Promise<PosHistoryResponse> {  const response = await api.get<ApiEnvelope<ListApiData<OrderApiRow>>>('/orders', {    params: {      outletId: params.outletId,      page: params.page ?? 1,      perPage: params.perPage ?? 20,      search: params.search,      status: params.status,      paymentStatus: params.paymentStatus,      queue: params.queue,      source: params.source,    },    headers: buildScopedHeaders(params.outletId),  });
  const rows = extractListRows(response.data.data);
  const meta = extractListMeta(response.data.meta, response.data.data);
  return {    items: rows.map(mapHistoryItem),    meta,  };
}
export async function createPayment(payload: PosCreatePaymentPayload): Promise<PosPaymentResponse> {
  const amountPaid = payload.amountPaid ?? payload.amount ?? 0;
  const amountTendered = payload.amountTendered ?? amountPaid;
  const response = await api.post<ApiEnvelope<PaymentApiRow>>(    '/payments',    {      orderId: payload.orderId,      outletId: payload.outletId,      method: payload.method,      amountPaid,      amountTendered,      note: payload.note,    },    {      headers: buildScopedHeaders(payload.outletId),    },  );
  if (!response.data.data) {    throw new Error('Response payment kosong');
  }  return mapPayment(response.data.data);
}
export async function getPayments(params: {  outletId: string;
  page?: number;
  perPage?: number;
  orderId?: string;
  search?: string;
}): Promise<{  items: PosPaymentResponse[];
  meta: PosListMeta;
}> {  const response = await api.get<ApiEnvelope<ListApiData<PaymentApiRow>>>('/payments', {    params: {      outletId: params.outletId,      page: params.page ?? 1,      perPage: params.perPage ?? 20,      orderId: params.orderId,      search: params.search,    },    headers: buildScopedHeaders(params.outletId),  });
  const rows = extractListRows(response.data.data);
  const meta = extractListMeta(response.data.meta, response.data.data);
  return {    items: rows.map(mapPayment),    meta,  };
}
export async function getPaymentDetail(  paymentId: string,  outletId: string,): Promise<PosPaymentResponse> {  const response = await api.get<ApiEnvelope<PaymentApiRow>>(`/payments/${paymentId}`, {    params: {      outletId,    },    headers: buildScopedHeaders(outletId),  });
  if (!response.data.data) {    throw new Error('Detail payment tidak ditemukan');
  }  return mapPayment(response.data.data);
}
export async function getReceiptByOrderFromPos(  payload: PosReceiptPayload,): Promise<PosReceiptResponse> {  const outletId = resolveOutletId(payload.outletId);
  const response = await api.get<ApiEnvelope<ReceiptApiRow>>(    `/receipts/order/${payload.orderId}`,    {      params: {        outletId,      },      headers: buildScopedHeaders(outletId),    },  );
  if (!response.data.data) {    throw new Error('Receipt tidak ditemukan');
  }  return mapReceipt(response.data.data);
}
export async function getReceiptDetail(  receiptId: string,  outletId?: string,): Promise<PosReceiptResponse> {  const resolvedOutletId = resolveOutletId(outletId);
  const response = await api.get<ApiEnvelope<ReceiptApiRow>>(`/receipts/${receiptId}`, {    params: {      outletId: resolvedOutletId,    },    headers: buildScopedHeaders(resolvedOutletId),  });
  if (!response.data.data) {    throw new Error('Detail receipt tidak ditemukan');
  }  return mapReceipt(response.data.data);
}
export async function getReceiptByOrderId(  orderId: string,  outletId?: string,): Promise<PosReceiptResponse> {  const resolvedOutletId = resolveOutletId(outletId);
  const response = await api.get<ApiEnvelope<ReceiptApiRow>>(    `/receipts/order/${orderId}`,    {      params: {        outletId: resolvedOutletId,      },      headers: buildScopedHeaders(resolvedOutletId),    },  );
  if (!response.data.data) {    throw new Error('Receipt order tidak ditemukan');
  }  return mapReceipt(response.data.data);
}
export function calculatePosSurcharge(amount: number, rules: PosSurchargeRule[]): number {
  if (!rules.length) return 0;
  const sorted = [...rules].sort((a, b) => a.minAmount - b.minAmount);
  let rule: PosSurchargeRule | undefined;
  for (const r of sorted) {
    if (amount >= r.minAmount && (r.maxAmount === null || amount < r.maxAmount)) {
      rule = r;
    }
  }
  if (!rule) return 0;
  if (rule.type === 'PERCENTAGE') return Math.round((amount * rule.value) / 100);
  return rule.value;
}

export async function getOutletPaymentMethods(outletId: string): Promise<PosOutletPaymentMethod[]> {
  const response = await api.get<ApiEnvelope<PosOutletPaymentMethod[]>>(
    `/outlets/${outletId}/payment-methods`,
    {
      params: { activeOnly: 'true' },
      headers: buildScopedHeaders(outletId),
    },
  );
  const data = response.data.data;
  return Array.isArray(data) ? data : [];
}

export async function getTableOccupancy(outletId: string): Promise<TableOccupancyItem[]> {
  const response = await api.get<ApiEnvelope<TableOccupancyItem[]>>(
    `/business/outlets-tables/${outletId}/tables/occupancy`,
    { headers: buildScopedHeaders(outletId) },
  );
  return Array.isArray(response.data.data) ? response.data.data : [];
}

export async function updateOrderStatus(
  orderId: string,
  outletId: string,
  status: PosOrderStatus,
): Promise<PosOrderResponse> {
  const response = await api.patch<ApiEnvelope<unknown>>(
    `/orders/${orderId}/status`,
    { outletId, status },
    { headers: buildScopedHeaders(outletId) },
  );
  const orderRow = extractOrderApiRow(response.data.data);
  if (!orderRow) throw new Error('Response update status order kosong');
  return mapOrder(orderRow);
}

export async function getPosChargeSettings(outletId?: string): Promise<PosSettingsChargesResponse> {
  const resolvedOutletId = (outletId && outletId.trim())
    || (typeof window !== 'undefined' ? (window.localStorage.getItem('activeOutletId') || '').trim() : '');

  if (!resolvedOutletId) {
    return { charges: [] };
  }
  const response = await api.get<ApiEnvelope<PosSettingsApiData>>(
    '/settings/pos-charges',
    {
      params: { outletId: resolvedOutletId },
      headers: buildScopedHeaders(resolvedOutletId),
    },
  );

  const data = response.data.data;
  const charges: PosSettingsChargeRule[] = Array.isArray(data?.charges)
    ? data.charges.map((rule) => ({
        key: String(rule.key ?? ''),
        label: String(rule.label ?? rule.key ?? ''),
        type: rule.type === 'FIXED_AMOUNT' ? 'FIXED_AMOUNT' : 'PERCENTAGE',
        value: toNumber(rule.value),
        enabled: Boolean(rule.enabled),
      }))
    : [];

  const rounding = data?.rounding
    ? {
        enabled: Boolean(data.rounding.enabled),
        method: (['NONE','NEAREST','CEIL','FLOOR'].includes(String(data.rounding.method))
          ? data.rounding.method
          : 'CEIL') as 'NONE'|'NEAREST'|'CEIL'|'FLOOR',
        unit: Math.max(1, Math.floor(toNumber(data.rounding.unit) || 100)),
      }
    : undefined;

  return { charges, ...(rounding ? { rounding } : {}) } as PosSettingsChargesResponse;
}

