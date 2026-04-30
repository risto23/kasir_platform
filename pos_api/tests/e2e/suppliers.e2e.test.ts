import request from 'supertest';
import app from '../../src/app';
import {
  loginAsOwner,
  maybeDescribe,
  type BusinessContext,
  type SupplierDetail,
} from './procurement-test-helpers';

maybeDescribe('Suppliers E2E (DB-backed)', () => {
  let context: BusinessContext;

  beforeAll(async () => {
    context = await loginAsOwner();
  });

  it('create supplier and fetch it from list/detail', async () => {
    const suffix = `${Date.now()}-${Math.round(Math.random() * 100000)}`;
    const supplierCode = `E2E-SUP-${suffix}`;
    const supplierName = `E2E Supplier ${suffix}`;

    const createResponse = await request(app)
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

    expect(createResponse.status).toBe(201);
    expect(createResponse.body?.success).toBe(true);

    const createdSupplier = createResponse.body?.data as SupplierDetail;
    expect(createdSupplier.code).toBe(supplierCode);
    expect(createdSupplier.name).toBe(supplierName);
    expect(createdSupplier.status).toBe('ACTIVE');
    expect(createdSupplier.phone).toBe('081234567890');
    expect(createdSupplier.paymentTermDays).toBe(14);
    expect(createdSupplier.leadTimeDays).toBe(2);
    expect(createdSupplier.isPreferred).toBe(true);

    const listResponse = await request(app)
      .get('/api/suppliers')
      .set('Authorization', `Bearer ${context.token}`)
      .set('x-business-id', context.businessId)
      .query({
        search: supplierCode,
      });

    expect(listResponse.status).toBe(200);

    const suppliers = listResponse.body?.data as SupplierDetail[];
    expect(Array.isArray(suppliers)).toBe(true);

    const listedSupplier =
      suppliers.find((entry) => entry.id === createdSupplier.id) ?? null;

    expect(listedSupplier).not.toBeNull();
    expect(listedSupplier?.code).toBe(supplierCode);

    const detailResponse = await request(app)
      .get(`/api/suppliers/${createdSupplier.id}`)
      .set('Authorization', `Bearer ${context.token}`)
      .set('x-business-id', context.businessId);

    expect(detailResponse.status).toBe(200);

    const detailSupplier = detailResponse.body?.data as SupplierDetail;
    expect(detailSupplier.id).toBe(createdSupplier.id);
    expect(detailSupplier.name).toBe(supplierName);
  });
});
