import request from 'supertest';
import app from '../../src/app';

export const E2E = process.env.DB_E2E === 'true';
export const maybeDescribe = E2E ? describe : describe.skip;

export type LoginResult = {
  accessToken: string;
  user: {
    businessMemberships: Array<{
      businessId: string;
      allowedOutletIds: string[];
    }>;
  };
};

export type ProductListItem = {
  id: string;
  name: string;
};

export type SupplierDetail = {
  id: string;
  code: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
  phone: string | null;
  paymentTermDays: number | null;
  leadTimeDays: number | null;
  isPreferred: boolean;
};

export type PurchaseOrderDetail = {
  id: string;
  supplierId: string;
  status: 'DRAFT' | 'SUBMITTED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED';
  items: Array<{
    id: string;
    productId: string;
    unitCost: string;
    quantityOrdered: string;
    quantityReceived: string;
  }>;
};

export type GoodsReceiptDetail = {
  id: string;
  supplierId: string;
  receiptNumber: string;
  supplierInvoiceNumber: string | null;
  status: 'DRAFT' | 'POSTED' | 'VOID';
  items: Array<{
    id: string;
    productId: string;
    quantityAccepted: string;
    quantityReturned: string;
    unitCost: string;
  }>;
};

export type SupplierInvoiceSummary = {
  id: string;
  goodsReceiptId: string | null;
  invoiceNumber: string;
  grandTotal: string;
  outstandingAmount: string;
  status: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'VOID';
};

export type SupplierInvoiceDetail = SupplierInvoiceSummary & {
  paidAmount: string;
};

export type PurchaseReturnDetail = {
  id: string;
  totalAmount: string;
  status: 'DRAFT' | 'POSTED' | 'VOID';
  items: Array<{
    goodsReceiptItemId: string;
    quantityReturned: string;
  }>;
};

export type StockSummaryItem = {
  productId: string;
  stockOnHand: string;
};

export type InventoryMovementItem = {
  referenceType: string | null;
  referenceId: string | null;
  type: 'IN' | 'OUT' | 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT';
};

export type BusinessContext = {
  token: string;
  businessId: string;
  outletId: string;
};

export type ProcurementSeedContext = BusinessContext & {
  productId: string;
  initialStock: number;
};

export type SubmittedPurchaseOrderContext = ProcurementSeedContext & {
  supplierId: string;
  purchaseOrderId: string;
  purchaseOrderItemId: string;
  unitCost: number;
  orderedQuantity: number;
};

export type PostedGoodsReceiptContext = SubmittedPurchaseOrderContext & {
  goodsReceiptId: string;
  goodsReceiptItemId: string;
  goodsReceiptInvoiceNumber: string;
  supplierInvoiceId: string;
};

export function uniqueSuffix() {
  return `${Date.now()}-${Math.round(Math.random() * 100000)}`;
}

export function toNumber(value: string | null | undefined) {
  return Number(value ?? '0');
}

export async function loginAsOwner(): Promise<BusinessContext> {
  const response = await request(app)
    .post('/api/auth/login')
    .send({ email: 'owner@demo.local', password: 'password123' });

  expect(response.status).toBe(200);

  const data = response.body?.data as LoginResult;
  expect(typeof data.accessToken).toBe('string');

  const membership = data.user.businessMemberships[0];
  expect(membership).toBeTruthy();
  expect(typeof membership.businessId).toBe('string');
  expect(typeof membership.allowedOutletIds[0]).toBe('string');

  return {
    token: data.accessToken,
    businessId: membership.businessId,
    outletId: membership.allowedOutletIds[0],
  };
}

export async function pickActiveProduct(
  context: BusinessContext,
): Promise<ProcurementSeedContext> {
  const response = await request(app)
    .get('/api/products')
    .set('Authorization', `Bearer ${context.token}`)
    .set('x-business-id', context.businessId);

  expect(response.status).toBe(200);

  const products = response.body?.data as ProductListItem[];
  expect(Array.isArray(products)).toBe(true);
  expect(products.length).toBeGreaterThan(0);

  const productId = products[0].id;
  expect(typeof productId).toBe('string');

  const stockItem = await getStockSummaryItem({
    token: context.token,
    businessId: context.businessId,
    outletId: context.outletId,
    productId,
  });

  return {
    ...context,
    productId,
    initialStock: stockItem ? toNumber(stockItem.stockOnHand) : 0,
  };
}

export async function getStockSummaryItem(params: {
  token: string;
  businessId: string;
  outletId: string;
  productId: string;
}) {
  const response = await request(app)
    .get('/api/inventory/stock-summary')
    .set('Authorization', `Bearer ${params.token}`)
    .set('x-business-id', params.businessId)
    .query({
      outletId: params.outletId,
    });

  expect(response.status).toBe(200);

  const items = response.body?.data?.items as StockSummaryItem[];
  expect(Array.isArray(items)).toBe(true);

  return items.find((entry) => entry.productId === params.productId) ?? null;
}

export async function createSupplier(context: BusinessContext) {
  const suffix = uniqueSuffix();
  const supplierCode = `E2E-SUP-${suffix}`;
  const supplierName = `E2E Supplier ${suffix}`;

  const response = await request(app)
    .post('/api/suppliers')
    .set('Authorization', `Bearer ${context.token}`)
    .set('x-business-id', context.businessId)
    .send({
      code: supplierCode,
      name: supplierName,
      phone: '081234567890',
      paymentTermDays: 14,
      leadTimeDays: 2,
      isPreferred: true,
    });

  expect(response.status).toBe(201);
  expect(response.body?.success).toBe(true);

  const supplier = response.body?.data as SupplierDetail;
  expect(supplier.code).toBe(supplierCode);
  expect(supplier.name).toBe(supplierName);

  return supplier;
}

export async function createSubmittedPurchaseOrder(
  context: ProcurementSeedContext,
  params?: {
    orderedQuantity?: number;
    unitCost?: number;
  },
): Promise<SubmittedPurchaseOrderContext> {
  const supplier = await createSupplier(context);
  const orderedQuantity = params?.orderedQuantity ?? 5;
  const unitCost = params?.unitCost ?? 2000;

  const createResponse = await request(app)
    .post('/api/purchase-orders')
    .set('Authorization', `Bearer ${context.token}`)
    .set('x-business-id', context.businessId)
    .send({
      outletId: context.outletId,
      supplierId: supplier.id,
      orderDate: '2026-04-30',
      expectedDate: '2026-05-02',
      notes: 'E2E procurement flow',
      items: [
        {
          productId: context.productId,
          quantity: orderedQuantity,
          unitCost,
          note: 'E2E PO item',
        },
      ],
    });

  expect(createResponse.status).toBe(201);
  expect(createResponse.body?.success).toBe(true);

  const purchaseOrder = createResponse.body?.data as PurchaseOrderDetail;
  expect(typeof purchaseOrder.id).toBe('string');
  expect(typeof purchaseOrder.items[0]?.id).toBe('string');

  const submitResponse = await request(app)
    .patch(`/api/purchase-orders/${purchaseOrder.id}/status`)
    .set('Authorization', `Bearer ${context.token}`)
    .set('x-business-id', context.businessId)
    .send({
      outletId: context.outletId,
      status: 'SUBMITTED',
    });

  expect(submitResponse.status).toBe(200);
  expect(submitResponse.body?.data?.status).toBe('SUBMITTED');

  return {
    ...context,
    supplierId: supplier.id,
    purchaseOrderId: purchaseOrder.id,
    purchaseOrderItemId: purchaseOrder.items[0].id,
    unitCost,
    orderedQuantity,
  };
}

export async function createPostedGoodsReceipt(
  context: SubmittedPurchaseOrderContext,
): Promise<PostedGoodsReceiptContext> {
  const goodsReceiptInvoiceNumber = `E2E-INV-${uniqueSuffix()}`;

  const createResponse = await request(app)
    .post('/api/goods-receipts')
    .set('Authorization', `Bearer ${context.token}`)
    .set('x-business-id', context.businessId)
    .send({
      outletId: context.outletId,
      supplierId: context.supplierId,
      purchaseOrderId: context.purchaseOrderId,
      receiptDate: '2026-04-30',
      supplierInvoiceNumber: goodsReceiptInvoiceNumber,
      notes: 'E2E GR',
      items: [
        {
          purchaseOrderItemId: context.purchaseOrderItemId,
          productId: context.productId,
          quantityAccepted: context.orderedQuantity,
          unitCost: context.unitCost,
          note: 'E2E GR item',
        },
      ],
    });

  expect(createResponse.status).toBe(201);
  expect(createResponse.body?.success).toBe(true);

  const goodsReceiptId = createResponse.body?.data?.id as string;
  const goodsReceiptItemId = createResponse.body?.data?.items?.[0]?.id as string;
  expect(typeof goodsReceiptId).toBe('string');
  expect(typeof goodsReceiptItemId).toBe('string');

  const postResponse = await request(app)
    .patch(`/api/goods-receipts/${goodsReceiptId}/post`)
    .set('Authorization', `Bearer ${context.token}`)
    .set('x-business-id', context.businessId)
    .send({
      outletId: context.outletId,
    });

  expect(postResponse.status).toBe(200);

  const postedReceipt = postResponse.body?.data as GoodsReceiptDetail;
  expect(postedReceipt.status).toBe('POSTED');
  expect(postedReceipt.supplierInvoiceNumber).toBe(goodsReceiptInvoiceNumber);

  const invoice = await findSupplierInvoiceByGoodsReceipt({
    token: context.token,
    businessId: context.businessId,
    outletId: context.outletId,
    goodsReceiptId,
    search: goodsReceiptInvoiceNumber,
  });

  expect(invoice).toBeTruthy();

  return {
    ...context,
    goodsReceiptId,
    goodsReceiptItemId,
    goodsReceiptInvoiceNumber,
    supplierInvoiceId: invoice?.id ?? '',
  };
}

export async function findSupplierInvoiceByGoodsReceipt(params: {
  token: string;
  businessId: string;
  outletId: string;
  goodsReceiptId: string;
  search: string;
}) {
  const response = await request(app)
    .get('/api/supplier-invoices')
    .set('Authorization', `Bearer ${params.token}`)
    .set('x-business-id', params.businessId)
    .query({
      outletId: params.outletId,
      search: params.search,
    });

  expect(response.status).toBe(200);

  const invoices = response.body?.data as SupplierInvoiceSummary[];
  expect(Array.isArray(invoices)).toBe(true);

  return (
    invoices.find((entry) => entry.goodsReceiptId === params.goodsReceiptId) ??
    null
  );
}
