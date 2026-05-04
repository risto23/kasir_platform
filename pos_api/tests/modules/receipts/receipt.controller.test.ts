import type { NextFunction, Request, Response } from 'express';
import { PaymentMethod, PaymentStatus, OrderStatus } from '@prisma/client';
import {
  getReceiptByIdHandler,
  getReceiptByOrderIdHandler,
} from '../../../src/modules/receipts/receipt.controller';

jest.mock('../../../src/modules/receipts/receipt.service', () => ({
  getReceiptById: jest.fn(),
  getReceiptByOrderId: jest.fn(),
}));

type ReceiptServiceMock = {
  getReceiptById: jest.Mock;
  getReceiptByOrderId: jest.Mock;
};

function createResponse() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;

  return res;
}

function createReceiptDetail() {
  return {
    id: 'receipt-1',
    receiptNumber: 'RCT-1',
    businessId: 'biz-1',
    outletId: 'cmomwnmoe000mfur0ue4mge5b',
    businessName: 'Biz 1',
    outletName: 'Outlet 1',
    outletAddress: null,
    issuedAt: new Date().toISOString(),
    printedAt: null,
    order: {
      id: 'order-1',
      orderNumber: 'ORD-1',
      status: OrderStatus.COMPLETED,
      paymentStatus: PaymentStatus.PAID,
      subtotal: '10000',
      discountAmount: '0',
      taxAmount: '0',
      serviceChargeAmount: '0',
      totalAmount: '10000',
    },
    payment: {
      id: 'payment-1',
      paymentNumber: 'PAY-1',
      method: PaymentMethod.CASH,
      status: PaymentStatus.PAID,
      amountPaid: '10000',
      amountTendered: '10000',
      changeAmount: '0',
      paidAt: null,
    },
    contentSnapshot: null,
  };
}

describe('receipt.controller', () => {
  const receiptServiceMock = jest.requireMock('../../../src/modules/receipts/receipt.service') as ReceiptServiceMock;

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('passes 400 error to next when business header is missing', async () => {
    const req = {
      headers: {},
      params: { id: 'cmomwnmoe000mfur0ue4mge5b' },
      query: {},
    } as unknown as Request;
    const res = createResponse();
    const next = jest.fn() as NextFunction;

    await getReceiptByIdHandler(req, res, next);

    const error = next.mock.calls[0][0] as Error & { statusCode?: number };
    expect(error.statusCode).toBe(400);
  });

  it('passes 400 error to next when outlet context is missing', async () => {
    const req = {
      headers: { 'x-business-id': 'biz-1' },
      params: { id: 'cmomwnmoe000mfur0ue4mge5b' },
      query: {},
    } as unknown as Request;
    const res = createResponse();
    const next = jest.fn() as NextFunction;

    await getReceiptByIdHandler(req, res, next);

    const error = next.mock.calls[0][0] as Error & { statusCode?: number };
    expect(error.statusCode).toBe(400);
  });

  it('returns receipt detail by id', async () => {
    receiptServiceMock.getReceiptById.mockResolvedValueOnce(createReceiptDetail());

    const req = {
      headers: {
        'x-business-id': 'biz-1',
        'x-outlet-id': 'cmomwnmoe000mfur0ue4mge5b',
      },
      params: { id: 'cmomwnmoe000mfur0ue4mge5b' },
      query: {},
    } as unknown as Request;
    const res = createResponse();
    const next = jest.fn() as NextFunction;

    await getReceiptByIdHandler(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns receipt detail by order id', async () => {
    receiptServiceMock.getReceiptByOrderId.mockResolvedValueOnce(createReceiptDetail());

    const req = {
      headers: {
        'x-business-id': 'biz-1',
      },
      params: { orderId: 'cmomwnmoe000mfur0ue4mge5b' },
      query: { outletId: 'cmomwnmoe000mfur0ue4mge5b' },
    } as unknown as Request;
    const res = createResponse();
    const next = jest.fn() as NextFunction;

    await getReceiptByOrderIdHandler(req, res, next);

    expect(receiptServiceMock.getReceiptByOrderId).toHaveBeenCalledWith({
      businessId: 'biz-1',
      outletId: 'cmomwnmoe000mfur0ue4mge5b',
      orderId: 'cmomwnmoe000mfur0ue4mge5b',
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(next).not.toHaveBeenCalled();
  });
});
