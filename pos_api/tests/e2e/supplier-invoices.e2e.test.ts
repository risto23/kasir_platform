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
  type SupplierInvoiceDetail,
} from './procurement-test-helpers';

type SupplierPaymentResult = {
  payment: {
    paymentNumber: string;
    amount: string;
    method: string;
  };
  invoice: SupplierInvoiceDetail;
};

maybeDescribe('Supplier Invoices E2E (DB-backed)', () => {
  let context: ProcurementSeedContext;

  beforeAll(async () => {
    const businessContext = await loginAsOwner();
    context = await pickActiveProduct(businessContext);
  });

  it('create payments on auto invoice until invoice is paid', async () => {
    const submittedOrder = await createSubmittedPurchaseOrder(context, {
      orderedQuantity: 5,
      unitCost: 2000,
    });
    const postedReceipt = await createPostedGoodsReceipt(submittedOrder);
    const totalAmount = postedReceipt.orderedQuantity * postedReceipt.unitCost;
    const partialAmount = 4000;
    const remainingAmount = totalAmount - partialAmount;

    const detailBeforePaymentResponse = await request(app)
      .get(`/api/supplier-invoices/${postedReceipt.supplierInvoiceId}`)
      .set('Authorization', `Bearer ${postedReceipt.token}`)
      .set('x-business-id', postedReceipt.businessId)
      .query({
        outletId: postedReceipt.outletId,
      });

    expect(detailBeforePaymentResponse.status).toBe(200);

    const detailBeforePayment =
      detailBeforePaymentResponse.body?.data as SupplierInvoiceDetail;
    expect(detailBeforePayment.status).toBe('UNPAID');
    expect(toNumber(detailBeforePayment.grandTotal)).toBe(totalAmount);
    expect(toNumber(detailBeforePayment.paidAmount)).toBe(0);
    expect(toNumber(detailBeforePayment.outstandingAmount)).toBe(totalAmount);
    expect(detailBeforePayment.paymentCount).toBe(0);

    const partialPaymentResponse = await request(app)
      .post(`/api/supplier-invoices/${postedReceipt.supplierInvoiceId}/payments`)
      .set('Authorization', `Bearer ${postedReceipt.token}`)
      .set('x-business-id', postedReceipt.businessId)
      .send({
        outletId: postedReceipt.outletId,
        paymentDate: '2026-04-30',
        method: 'CASH',
        amount: partialAmount,
        referenceNumber: 'E2E-PAY-001',
        note: 'Partial payment',
      });

    expect(partialPaymentResponse.status).toBe(201);

    const partialPaymentResult =
      partialPaymentResponse.body?.data as SupplierPaymentResult;
    expect(partialPaymentResult.payment.paymentNumber).toContain('SPAY-');
    expect(toNumber(partialPaymentResult.payment.amount)).toBe(partialAmount);
    expect(partialPaymentResult.payment.method).toBe('CASH');
    expect(partialPaymentResult.invoice.status).toBe('PARTIALLY_PAID');
    expect(toNumber(partialPaymentResult.invoice.paidAmount)).toBe(partialAmount);
    expect(toNumber(partialPaymentResult.invoice.outstandingAmount)).toBe(
      remainingAmount,
    );
    expect(partialPaymentResult.invoice.payments).toHaveLength(1);

    const finalPaymentResponse = await request(app)
      .post(`/api/supplier-invoices/${postedReceipt.supplierInvoiceId}/payments`)
      .set('Authorization', `Bearer ${postedReceipt.token}`)
      .set('x-business-id', postedReceipt.businessId)
      .send({
        outletId: postedReceipt.outletId,
        paymentDate: '2026-04-30',
        method: 'TRANSFER',
        amount: remainingAmount,
        referenceNumber: 'E2E-PAY-002',
        note: 'Final payment',
      });

    expect(finalPaymentResponse.status).toBe(201);

    const finalPaymentResult =
      finalPaymentResponse.body?.data as SupplierPaymentResult;
    expect(toNumber(finalPaymentResult.payment.amount)).toBe(remainingAmount);
    expect(finalPaymentResult.payment.method).toBe('TRANSFER');
    expect(finalPaymentResult.invoice.status).toBe('PAID');
    expect(toNumber(finalPaymentResult.invoice.grandTotal)).toBe(totalAmount);
    expect(toNumber(finalPaymentResult.invoice.paidAmount)).toBe(totalAmount);
    expect(toNumber(finalPaymentResult.invoice.outstandingAmount)).toBe(0);
    expect(finalPaymentResult.invoice.payments).toHaveLength(2);

    const listResponse = await request(app)
      .get('/api/supplier-invoices')
      .set('Authorization', `Bearer ${postedReceipt.token}`)
      .set('x-business-id', postedReceipt.businessId)
      .query({
        outletId: postedReceipt.outletId,
        search: postedReceipt.goodsReceiptInvoiceNumber,
      });

    expect(listResponse.status).toBe(200);

    const invoices = listResponse.body?.data as SupplierInvoiceDetail[];
    expect(Array.isArray(invoices)).toBe(true);

    const listedInvoice =
      invoices.find((entry) => entry.id === postedReceipt.supplierInvoiceId) ??
      null;

    expect(listedInvoice).not.toBeNull();
    expect(listedInvoice?.status).toBe('PAID');
    expect(toNumber(listedInvoice?.outstandingAmount)).toBe(0);
  });
});
