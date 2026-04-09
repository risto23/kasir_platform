import request from 'supertest';
import app from '../../src/app';

const E2E = process.env.DB_E2E === 'true';
const maybe = E2E ? describe : describe.skip;

type LoginResult = {
  accessToken: string;
  user: {
    businessMemberships: Array<{
      businessId: string;
      allowedOutletIds: string[];
    }>;
  };
};

maybe('Orders E2E (DB-backed)', () => {
  let token = '';
  let businessId = '';
  let outletId = '';
  let productId = '';

  it('login as owner', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'owner@demo.local', password: 'password123' });

    expect(res.status).toBe(200);
    const data = res.body?.data as LoginResult;
    expect(typeof data.accessToken).toBe('string');

    token = data.accessToken;
    const membership = data.user.businessMemberships[0];
    expect(membership).toBeTruthy();
    businessId = membership.businessId;
    outletId = membership.allowedOutletIds[0];
    expect(outletId).toBeTruthy();
  });

  it('pick a product', async () => {
    const res = await request(app)
      .get('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .set('x-business-id', businessId);

    expect(res.status).toBe(200);
    const items = res.body?.data as any[];
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBeGreaterThan(0);

    productId = items[0].id;
  });

  let orderId = '';

  it('create order (retail: no table required)', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .set('x-business-id', businessId)
      .send({
        outletId,
        notes: 'e2e order',
        items: [
          { productId, quantity: 2 },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body?.success).toBe(true);
    orderId = res.body?.data?.id;
    expect(orderId).toBeTruthy();
  });

  it('add another item', async () => {
    const res = await request(app)
      .post(`/api/orders/${orderId}/items`)
      .set('Authorization', `Bearer ${token}`)
      .set('x-business-id', businessId)
      .send({
        outletId,
        productId,
        quantity: 1,
      });

    expect(res.status).toBe(200);
    expect(res.body?.success).toBe(true);
    const items = res.body?.data?.items;
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBeGreaterThan(0);
  });

  it('progress status: DRAFT -> SUBMITTED -> IN_PROGRESS -> READY', async () => {
    const nextStatuses = ['SUBMITTED', 'IN_PROGRESS', 'READY'] as const;

    for (const status of nextStatuses) {
      const res = await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${token}`)
        .set('x-business-id', businessId)
        .send({ outletId, status });

      expect(res.status).toBe(200);
      expect(res.body?.data?.status).toBe(status);
    }
  });

  it('list orders for outlet', async () => {
    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .set('x-business-id', businessId)
      .query({ outletId, page: 1, perPage: 10 });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body?.data)).toBe(true);
    const meta = res.body?.meta;
    expect(meta?.page).toBe(1);
  });
  it('fetch order detail for total', async () => {
    const res = await request(app)
      .get(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${token}`)
      .set('x-business-id', businessId)
      .query({ outletId });

    expect(res.status).toBe(200);
    expect(res.body?.data?.totalAmount).toBeDefined();
  });

  it('create payment and generate receipt', async () => {
    const orderRes = await request(app)
      .get(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${token}`)
      .set('x-business-id', businessId)
      .query({ outletId });
    expect(orderRes.status).toBe(200);
    const totalStr = orderRes.body?.data?.totalAmount;
    const total = Number(totalStr);
    expect(Number.isFinite(total)).toBe(true);

    const payRes = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${token}`)
      .set('x-business-id', businessId)
      .send({
        orderId,
        outletId,
        method: 'CASH',
        amountPaid: total,
        amountTendered: total,
        note: 'e2e payment',
      });

    expect(payRes.status).toBe(201);
    expect(payRes.body?.data?.status).toBe('PAID');
    expect(payRes.body?.data?.receiptNumber).toBeDefined();
  });

  it('fetch receipt by order id', async () => {
    const res = await request(app)
      .get(`/api/receipts/order/${orderId}`)
      .set('Authorization', `Bearer ${token}`)
      .set('x-business-id', businessId)
      .query({ outletId });

    expect(res.status).toBe(200);
    expect(res.body?.data?.receiptNumber).toBeDefined();
  });

  it('complete order after paid', async () => {
    const res = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .set('x-business-id', businessId)
      .send({ outletId, status: 'COMPLETED' });

    expect(res.status).toBe(200);
    expect(res.body?.data?.status).toBe('COMPLETED');
    });
});
