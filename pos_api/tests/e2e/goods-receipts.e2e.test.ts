import request from 'supertest';
import app from '../../src/app';
import {
  createPostedGoodsReceipt,
  createSubmittedPurchaseOrder,
  findSupplierInvoiceByGoodsReceipt,
  getStockSummaryItem,
  loginAsOwner,
  maybeDescribe,
  pickActiveProduct,
  toNumber,
  type GoodsReceiptDetail,
  type ProcurementSeedContext,
} from './procurement-test-helpers';

maybeDescribe('Goods Receipts E2E (DB-backed)', () => {
  let context: ProcurementSeedContext;

  beforeAll(async () => {
    const businessContext = await loginAsOwner();
    context = await pickActiveProduct(businessContext);
  });

  it('post goods receipt, increase stock, and auto-create supplier invoice', async () => {
    const submittedOrder = await createSubmittedPurchaseOrder(context, {
      orderedQuantity: 5,
      unitCost: 2000,
    });

    const postedReceipt = await createPostedGoodsReceipt(submittedOrder);

    const stockItem = await getStockSummaryItem({
      token: postedReceipt.token,
      businessId: postedReceipt.businessId,
      outletId: postedReceipt.outletId,
      productId: postedReceipt.productId,
    });

    expect(stockItem).not.toBeNull();
    expect(toNumber(stockItem?.stockOnHand)).toBe(
      postedReceipt.initialStock + postedReceipt.orderedQuantity,
    );

    const detailResponse = await request(app)
      .get(`/api/goods-receipts/${postedReceipt.goodsReceiptId}`)
      .set('Authorization', `Bearer ${postedReceipt.token}`)
      .set('x-business-id', postedReceipt.businessId)
      .query({
        outletId: postedReceipt.outletId,
      });

    expect(detailResponse.status).toBe(200);

    const detail = detailResponse.body?.data as GoodsReceiptDetail;
    expect(detail.id).toBe(postedReceipt.goodsReceiptId);
    expect(detail.status).toBe('POSTED');
    expect(detail.supplierInvoiceNumber).toBe(
      postedReceipt.goodsReceiptInvoiceNumber,
    );
    expect(detail.items).toHaveLength(1);
    expect(toNumber(detail.items[0].quantityAccepted)).toBe(
      postedReceipt.orderedQuantity,
    );
    expect(toNumber(detail.items[0].quantityReturned)).toBe(0);

    const invoice = await findSupplierInvoiceByGoodsReceipt({
      token: postedReceipt.token,
      businessId: postedReceipt.businessId,
      outletId: postedReceipt.outletId,
      goodsReceiptId: postedReceipt.goodsReceiptId,
      search: postedReceipt.goodsReceiptInvoiceNumber,
    });

    expect(invoice).not.toBeNull();
    expect(invoice?.id).toBe(postedReceipt.supplierInvoiceId);
    expect(invoice?.invoiceNumber).toBe(postedReceipt.goodsReceiptInvoiceNumber);
    expect(invoice?.status).toBe('UNPAID');
    expect(toNumber(invoice?.grandTotal)).toBe(
      postedReceipt.orderedQuantity * postedReceipt.unitCost,
    );
    expect(toNumber(invoice?.outstandingAmount)).toBe(
      postedReceipt.orderedQuantity * postedReceipt.unitCost,
    );
  });
});
