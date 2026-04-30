import request from 'supertest';
import app from '../../src/app';
import {
  createSubmittedPurchaseOrder,
  loginAsOwner,
  maybeDescribe,
  pickActiveProduct,
  toNumber,
  type ProcurementSeedContext,
  type PurchaseOrderDetail,
} from './procurement-test-helpers';

maybeDescribe('Purchase Orders E2E (DB-backed)', () => {
  let context: ProcurementSeedContext;

  beforeAll(async () => {
    const businessContext = await loginAsOwner();
    context = await pickActiveProduct(businessContext);
  });

  it('create submitted purchase order and validate persisted detail', async () => {
    const submittedOrder = await createSubmittedPurchaseOrder(context, {
      orderedQuantity: 5,
      unitCost: 2000,
    });

    const detailResponse = await request(app)
      .get(`/api/purchase-orders/${submittedOrder.purchaseOrderId}`)
      .set('Authorization', `Bearer ${submittedOrder.token}`)
      .set('x-business-id', submittedOrder.businessId)
      .query({
        outletId: submittedOrder.outletId,
      });

    expect(detailResponse.status).toBe(200);

    const detail = detailResponse.body?.data as PurchaseOrderDetail;
    expect(detail.id).toBe(submittedOrder.purchaseOrderId);
    expect(detail.supplierId).toBe(submittedOrder.supplierId);
    expect(detail.status).toBe('SUBMITTED');
    expect(detail.items).toHaveLength(1);
    expect(detail.items[0].productId).toBe(submittedOrder.productId);
    expect(toNumber(detail.items[0].quantityOrdered)).toBe(
      submittedOrder.orderedQuantity,
    );
    expect(toNumber(detail.items[0].quantityReceived)).toBe(0);
    expect(toNumber(detail.items[0].unitCost)).toBe(submittedOrder.unitCost);
  });
});
