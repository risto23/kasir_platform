import type { Request, Response, NextFunction } from 'express';
import { listProductsHandler, createProductHandler } from '../../../src/modules/products/products.controller';

jest.mock('../../../src/modules/products/products.service', () => ({
  listProducts: jest.fn(async () => ({
    items: [{ id: 'p1', name: 'Test' }],
    meta: { page: 1, perPage: 10, total: 1, totalPages: 1 },
  })),
  createProduct: jest.fn(async (_businessId: string, body: any) => ({ id: 'p2', ...body })),
}));

function createRes() {
  const res: Partial<Response> = {};
  const status = jest.fn().mockImplementation((code: number) => {
    (res as any)._status = code; return res as Response;
  });
  const json = jest.fn().mockImplementation((payload: any) => {
    (res as any)._json = payload; return res as Response;
  });
  (res as any).status = status; (res as any).json = json;
  return { res: res as Response, status, json };
}

function createReq(partial: Partial<Request> = {}): Request {
  return ({ headers: {}, ...partial } as any) as Request;
}

describe('products.controller', () => {
  describe('listProductsHandler', () => {
    it('throws 400 when business id missing', async () => {
      const req = createReq();
      const { res } = createRes();
      const next = jest.fn() as NextFunction;

      await listProductsHandler(req, res, next);

      expect(next).toHaveBeenCalled();
      const err = (next as jest.Mock).mock.calls[0][0] as any;
      expect(err?.statusCode).toBe(400);
    });

    it('returns items when business id via header + validated query', async () => {
      const req = createReq({ headers: { 'x-business-id': 'b1' } as any });
      const { res, status, json } = createRes();
      (res as any).locals = { validatedQuery: { page: 1, perPage: 10 } };

      const next = jest.fn() as NextFunction;
      await listProductsHandler(req, res, next);

      expect(status).toHaveBeenCalledWith(200);
      expect(json).toHaveBeenCalled();
      const payload = (json as jest.Mock).mock.calls[0][0];
      expect(payload.success).toBe(true);
      expect(Array.isArray(payload.data)).toBe(true);
      expect(payload.meta?.page).toBe(1);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('createProductHandler', () => {
    it('merges uploaded image into body and 201', async () => {
      const req = createReq({
        headers: { 'x-business-id': 'b1' } as any,
        file: { filename: 'image.jpg' } as any,
      });
      const { res, status, json } = createRes();
      (res as any).locals = { validatedBody: { name: 'A', basePrice: 1000 } };

      const next = jest.fn() as NextFunction;
      await createProductHandler(req, res, next);

      expect(status).toHaveBeenCalledWith(201);
      const payload = (json as jest.Mock).mock.calls[0][0];
      expect(payload.success).toBe(true);
      expect(payload.data.imageUrl).toMatch(/\/uploads\/products\/image\.jpg$/);
      expect(next).not.toHaveBeenCalled();
    });
  });
});
