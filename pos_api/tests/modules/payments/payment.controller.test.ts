import type { NextFunction, Request, Response } from 'express';
import { PaymentMethod, PaymentStatus } from '@prisma/client';
import {
  createPaymentHandler,
  getPaymentByIdHandler,
  listPaymentsHandler,
} from '../../../src/modules/payments/payment.controller';

jest.mock('../../../src/modules/payments/payment.service', () => ({
  createPayment: jest.fn(),
  getPaymentById: jest.fn(),
  listPayments: jest.fn(),
}));

type PaymentServiceMock = {
  createPayment: jest.Mock;
  getPaymentById: jest.Mock;
  listPayments: jest.Mock;
};

function createResponse() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;

  return res;
}

describe('payment.controller', () => {
  const paymentServiceMock = jest.requireMock('../../../src/modules/payments/payment.service') as PaymentServiceMock;

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('passes 400 error to next when business header is missing on list', async () => {
    const req = {
      headers: {},
      query: {},
    } as Request;
    const res = createResponse();
    const next = jest.fn() as NextFunction;

    await listPaymentsHandler(req, res, next);

    const error = next.mock.calls[0][0] as Error & { statusCode?: number };
    expect(error.statusCode).toBe(400);
  });

  it('returns payment list on success', async () => {
    paymentServiceMock.listPayments.mockResolvedValueOnce({
      items: [{ id: 'payment-1' }],
      meta: { page: 1, perPage: 10, total: 1, totalPages: 1 },
    });

    const req = {
      headers: { 'x-business-id': 'biz-1' },
      query: {
        outletId: 'cmomwnmoe000mfur0ue4mge5b',
        page: '1',
        perPage: '10',
      },
    } as unknown as Request;
    const res = createResponse();
    const next = jest.fn() as NextFunction;

    await listPaymentsHandler(req, res, next);

    expect(paymentServiceMock.listPayments).toHaveBeenCalledWith({
      businessId: 'biz-1',
      outletId: 'cmomwnmoe000mfur0ue4mge5b',
      page: 1,
      perPage: 10,
      orderId: undefined,
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('passes 400 error to next when outletId is missing on detail', async () => {
    const req = {
      headers: { 'x-business-id': 'biz-1' },
      params: { id: 'cmomwnmoe000mfur0ue4mge5b' },
      query: {},
    } as unknown as Request;
    const res = createResponse();
    const next = jest.fn() as NextFunction;

    await getPaymentByIdHandler(req, res, next);

    const error = next.mock.calls[0][0] as Error & { statusCode?: number };
    expect(error.statusCode).toBe(400);
  });

  it('returns payment detail on success', async () => {
    paymentServiceMock.getPaymentById.mockResolvedValueOnce({
      id: 'payment-1',
      paymentNumber: 'PAY-1',
      orderId: 'order-1',
      orderNumber: 'ORD-1',
      businessId: 'biz-1',
      outletId: 'cmomwnmoe000mfur0ue4mge5b',
      method: PaymentMethod.CASH,
      status: PaymentStatus.PAID,
      amountPaid: '10000',
      amountTendered: '10000',
      changeAmount: '0',
      note: null,
      paidAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      receiptId: null,
      receiptNumber: null,
      receipt: null,
    });

    const req = {
      headers: { 'x-business-id': 'biz-1' },
      params: { id: 'cmomwnmoe000mfur0ue4mge5b' },
      query: { outletId: 'cmomwnmoe000mfur0ue4mge5b' },
    } as unknown as Request;
    const res = createResponse();
    const next = jest.fn() as NextFunction;

    await getPaymentByIdHandler(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(next).not.toHaveBeenCalled();
  });

  it('passes 400 error to next when business user context is missing on create', async () => {
    const req = {
      headers: { 'x-business-id': 'biz-1' },
      body: {
        orderId: 'cmomwnmoe000mfur0ue4mge5b',
        outletId: 'cmomwnmoe000mfur0ue4mge5b',
        method: PaymentMethod.CASH,
        amountPaid: 10000,
      },
    } as unknown as Request;
    const res = createResponse();
    const next = jest.fn() as NextFunction;

    await createPaymentHandler(req, res, next);

    const error = next.mock.calls[0][0] as Error & { statusCode?: number };
    expect(error.statusCode).toBe(400);
  });

  it('creates payment on success', async () => {
    paymentServiceMock.createPayment.mockResolvedValueOnce({
      id: 'payment-1',
      paymentNumber: 'PAY-1',
      orderId: 'cmomwnmoe000mfur0ue4mge5b',
      businessId: 'biz-1',
      outletId: 'cmomwnmoe000mfur0ue4mge5b',
      method: PaymentMethod.CASH,
      status: PaymentStatus.PAID,
      amountPaid: '10000',
      amountTendered: '10000',
      changeAmount: '0',
      note: null,
      paidAt: null,
      receiptId: 'receipt-1',
      receiptNumber: 'RCT-1',
    });

    const req = {
      headers: { 'x-business-id': 'biz-1' },
      businessAccess: {
        businessUserId: 'business-user-1',
      },
      body: {
        orderId: 'cmomwnmoe000mfur0ue4mge5b',
        outletId: 'cmomwnmoe000mfur0ue4mge5b',
        method: PaymentMethod.CASH,
        amountPaid: 10000,
        amountTendered: 10000,
        note: 'Cash payment',
      },
    } as unknown as Request;
    const res = createResponse();
    const next = jest.fn() as NextFunction;

    await createPaymentHandler(req, res, next);

    expect(paymentServiceMock.createPayment).toHaveBeenCalledWith({
      businessId: 'biz-1',
      outletId: 'cmomwnmoe000mfur0ue4mge5b',
      businessUserId: 'business-user-1',
      orderId: 'cmomwnmoe000mfur0ue4mge5b',
      method: PaymentMethod.CASH,
      amountPaid: 10000,
      amountTendered: 10000,
      note: 'Cash payment',
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(next).not.toHaveBeenCalled();
  });
});
