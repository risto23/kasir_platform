import request from 'supertest';
import app from '../../src/app';
import {
  createPostedGoodsReceipt,
  createSubmittedPurchaseOrder,
  getStockSummaryItem,
  loginAsOwner,
  maybeDescribe,
  pickActiveProduct,
  toNumber,
  type GoodsReceiptDetail,
  type InventoryMovementItem,
  type ProcurementSeedContext,
  type PurchaseReturnDetail,
  type SupplierInvoiceDetail,
} from './procurement-test-helpers';

maybeDescribe('Purchase Returns E2E (DB-backed)', () => {
  let context: ProcurementSeedContext;

  beforeAll(async () => {
    const businessContext = await loginAsOwner();
    context = await pickActiveProduct(businessContext);
  });

  it('post purchase return, reduce stock, and adjust linked payable', async () => {
    const submittedOrder = await createSubmittedPurchaseOrder(context, {
      orderedQuantity: 5,
      unitCost: 2000,
    });
    const postedReceipt = await createPostedGoodsReceipt(submittedOrder);
    const returnedQuantity = 2;
    const expectedAdjustedInvoiceTotal =
      postedReceipt.orderedQuantity * postedReceipt.unitCost -
      returnedQuantity * postedReceipt.unitCost;

    const createResponse = await request(app)
      .post('/api/purchase-returns')
      .set('Authorization', `Bearer ${postedReceipt.token}`)
      .set('x-business-id', postedReceipt.businessId)
      .send({
        outletId: postedReceipt.outletId,
        goodsReceiptId: postedReceipt.goodsReceiptId,
        returnDate: '2026-04-30',
        reason: 'E2E retur pembelian',
        notes: 'Sebagian barang dikembalikan',
        items: [
          {
            goodsReceiptItemId: postedReceipt.goodsReceiptItemId,
            quantityReturned: returnedQuantity,
            note: 'Retur 2 pcs',
          },
        ],
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body?.success).toBe(true);

    const purchaseReturnId = createResponse.body?.data?.id as string;
    expect(typeof purchaseReturnId).toBe('string');

    const postResponse = await request(app)
      .patch(`/api/purchase-returns/${purchaseReturnId}/post`)
      .set('Authorization', `Bearer ${postedReceipt.token}`)
      .set('x-business-id', postedReceipt.businessId)
      .send({
        outletId: postedReceipt.outletId,
      });

    expect(postResponse.status).toBe(200);

    const purchaseReturn = postResponse.body?.data as PurchaseReturnDetail;
    expect(purchaseReturn.status).toBe('POSTED');
    expect(toNumber(purchaseReturn.totalAmount)).toBe(
      returnedQuantity * postedReceipt.unitCost,
    );
    expect(toNumber(purchaseReturn.items[0]?.quantityReturned)).toBe(
      returnedQuantity,
    );

    const stockItem = await getStockSummaryItem({
      token: postedReceipt.token,
      businessId: postedReceipt.businessId,
      outletId: postedReceipt.outletId,
      productId: postedReceipt.productId,
    });

    expect(stockItem).not.toBeNull();
    expect(toNumber(stockItem?.stockOnHand)).toBe(
      postedReceipt.initialStock +
        postedReceipt.orderedQuantity -
        returnedQuantity,
    );

    const goodsReceiptDetailResponse = await request(app)
      .get(`/api/goods-receipts/${postedReceipt.goodsReceiptId}`)
      .set('Authorization', `Bearer ${postedReceipt.token}`)
      .set('x-business-id', postedReceipt.businessId)
      .query({
        outletId: postedReceipt.outletId,
      });

    expect(goodsReceiptDetailResponse.status).toBe(200);

    const goodsReceiptDetail = goodsReceiptDetailResponse.body
      ?.data as GoodsReceiptDetail;
    expect(toNumber(goodsReceiptDetail.items[0]?.quantityReturned)).toBe(
      returnedQuantity,
    );

    const supplierInvoiceDetailResponse = await request(app)
      .get(`/api/supplier-invoices/${postedReceipt.supplierInvoiceId}`)
      .set('Authorization', `Bearer ${postedReceipt.token}`)
      .set('x-business-id', postedReceipt.businessId)
      .query({
        outletId: postedReceipt.outletId,
      });

    expect(supplierInvoiceDetailResponse.status).toBe(200);

    const invoiceDetail =
      supplierInvoiceDetailResponse.body?.data as SupplierInvoiceDetail;
    expect(invoiceDetail.status).toBe('UNPAID');
    expect(toNumber(invoiceDetail.grandTotal)).toBe(expectedAdjustedInvoiceTotal);
    expect(toNumber(invoiceDetail.outstandingAmount)).toBe(
      expectedAdjustedInvoiceTotal,
    );
    expect(toNumber(invoiceDetail.paidAmount)).toBe(0);

    const movementsResponse = await request(app)
      .get('/api/inventory/movements')
      .set('Authorization', `Bearer ${postedReceipt.token}`)
      .set('x-business-id', postedReceipt.businessId)
      .query({
        outletId: postedReceipt.outletId,
        productId: postedReceipt.productId,
        type: 'OUT',
      });

    expect(movementsResponse.status).toBe(200);

    const movements = movementsResponse.body?.data?.items as InventoryMovementItem[];
    expect(Array.isArray(movements)).toBe(true);

    const purchaseReturnMovement =
      movements.find(
        (entry) =>
          entry.referenceType === 'PURCHASE_RETURN' &&
          entry.referenceId === purchaseReturnId,
      ) ?? null;

    expect(purchaseReturnMovement).not.toBeNull();
  });
});
