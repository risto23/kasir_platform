import request from 'supertest';
import app from '../../src/app';
import {
  createPostedGoodsReceipt,
  createSubmittedPurchaseOrder,
  loginAsOwner,
  maybeDescribe,
  pickActiveProduct,
  toNumber,
  type ProcurementSeedContext,
} from './procurement-test-helpers';

type PurchasePriceHistoryItem = {
  id: string;
  supplierId: string;
  productId: string;
  goodsReceiptId: string;
  purchaseOrderId: string | null;
  receiptNumber: string;
  supplierInvoiceNumber: string | null;
  quantity: string;
  unitCost: string;
};

maybeDescribe('Purchase Price History E2E (DB-backed)', () => {
  let context: ProcurementSeedContext;

  beforeAll(async () => {
    const businessContext = await loginAsOwner();
    context = await pickActiveProduct(businessContext);
  });

  it('record purchase price history from posted goods receipt and find it by filters', async () => {
    const submittedOrder = await createSubmittedPurchaseOrder(context, {
      orderedQuantity: 5,
      unitCost: 2000,
    });
    const postedReceipt = await createPostedGoodsReceipt(submittedOrder);

    const listResponse = await request(app)
      .get('/api/purchase-price-history')
      .set('Authorization', `Bearer ${postedReceipt.token}`)
      .set('x-business-id', postedReceipt.businessId)
      .query({
        outletId: postedReceipt.outletId,
        supplierId: postedReceipt.supplierId,
        productId: postedReceipt.productId,
        search: postedReceipt.goodsReceiptInvoiceNumber,
        dateFrom: '2026-04-30',
        dateTo: '2026-04-30',
      });

    expect(listResponse.status).toBe(200);

    const items = listResponse.body?.data as PurchasePriceHistoryItem[];
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBeGreaterThan(0);

    const matchedItem =
      items.find((entry) => entry.goodsReceiptId === postedReceipt.goodsReceiptId) ??
      null;

    expect(matchedItem).not.toBeNull();
    expect(matchedItem?.supplierId).toBe(postedReceipt.supplierId);
    expect(matchedItem?.productId).toBe(postedReceipt.productId);
    expect(matchedItem?.purchaseOrderId).toBe(postedReceipt.purchaseOrderId);
    expect(matchedItem?.receiptNumber).toBeDefined();
    expect(matchedItem?.supplierInvoiceNumber).toBe(
      postedReceipt.goodsReceiptInvoiceNumber,
    );
    expect(toNumber(matchedItem?.quantity)).toBe(postedReceipt.orderedQuantity);
    expect(toNumber(matchedItem?.unitCost)).toBe(postedReceipt.unitCost);
  });
});
