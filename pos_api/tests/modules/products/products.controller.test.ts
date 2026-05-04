import type { Request, Response, NextFunction } from 'express';
import {
  listProductsHandler,
  createProductHandler,
  getProductDetailHandler,
  updateProductHandler,
  updateProductStatusHandler,
} from '../../../src/modules/products/products.controller';

jest.mock('../../../src/modules/products/products.service', () => ({
  listProducts: jest.fn(async () => ({
    items: [{ id: 'p1', name: 'Test' }],
    meta: { page: 1, perPage: 10, total: 1, totalPages: 1 },
  })),
  getProductDetail: jest.fn(async () => ({ id: 'p1', name: 'Test' })),
  createProduct: jest.fn(async (_businessId: string, body: unknown) => ({
    id: 'p2',
    ...((body as Record<string, unknown>) ?? {}),
  })),
  updateProduct: jest.fn(async () => ({ id: 'p3', name: 'Updated' })),
  updateProductStatus: jest.fn(async () => ({ id: 'p3', status: 'INACTIVE' })),
}));

function createRes() {
  const res: Partial<Response> = {};
  const status = jest.fn().mockImplementation((code: number) => {
    (res as Record<string, unknown>)._status = code;
    return res as Response;
  });
  const json = jest.fn().mockImplementation((payload: unknown) => {
    (res as Record<string, unknown>)._json = payload;
    return res as Response;
  });
  (res as Record<string, unknown>).status = status;
  (res as Record<string, unknown>).json = json;
  return { res: res as Response, status, json };
}

function createReq(partial: Partial<Request> = {}): Request {
  return ({ headers: {}, ...partial } as unknown) as Request;
}

describe('products.controller', () => {
  describe('listProductsHandler', () => {
    it('throws 400 when business id missing', async () => {
      const req = createReq();
      const { res } = createRes();
      const next = jest.fn() as NextFunction;

      await listProductsHandler(req, res, next);

      expect(next).toHaveBeenCalled();
      const err = (next as jest.Mock).mock.calls[0][0] as Error & { statusCode?: number };
      expect(err.statusCode).toBe(400);
    });

    it('returns items when business id via header + validated query', async () => {
      const req = createReq({ headers: { 'x-business-id': 'b1' } as unknown as Request['headers'] });
      const { res, status, json } = createRes();
      (res as Record<string, unknown>).locals = { validatedQuery: { page: 1, perPage: 10 } };

      const next = jest.fn() as NextFunction;
      await listProductsHandler(req, res, next);

      expect(status).toHaveBeenCalledWith(200);
      expect(json).toHaveBeenCalled();
      const payload = (json as jest.Mock).mock.calls[0][0] as {
        success: boolean;
        data: unknown[];
        meta?: { page: number };
      };
      expect(payload.success).toBe(true);
      expect(Array.isArray(payload.data)).toBe(true);
      expect(payload.meta?.page).toBe(1);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('getProductDetailHandler', () => {
    it('returns product detail using validated params', async () => {
      const req = createReq({ headers: { 'x-business-id': 'b1' } as unknown as Request['headers'] });
      const { res, status, json } = createRes();
      (res as Record<string, unknown>).locals = { validatedParams: { id: 'p1' } };
      const next = jest.fn() as NextFunction;

      await getProductDetailHandler(req, res, next);

      expect(status).toHaveBeenCalledWith(200);
      expect(((json as jest.Mock).mock.calls[0][0] as { data: { id: string } }).data.id).toBe('p1');
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('createProductHandler', () => {
    it('merges uploaded image into body and 201', async () => {
      const req = createReq({
        headers: { 'x-business-id': 'b1' } as unknown as Request['headers'],
        file: { filename: 'image.jpg' } as unknown as Request['file'],
      });
      const { res, status, json } = createRes();
      (res as Record<string, unknown>).locals = { validatedBody: { name: 'A', basePrice: 1000 } };

      const next = jest.fn() as NextFunction;
      await createProductHandler(req, res, next);

      expect(status).toHaveBeenCalledWith(201);
      const payload = (json as jest.Mock).mock.calls[0][0] as {
        success: boolean;
        data: { imageUrl: string };
      };
      expect(payload.success).toBe(true);
      expect(payload.data.imageUrl).toMatch(/\/uploads\/products\/image\.jpg$/);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('updateProductHandler', () => {
    it('updates product without uploaded file', async () => {
      const req = createReq({ headers: { 'x-business-id': 'b1' } as unknown as Request['headers'] });
      const { res, status, json } = createRes();
      (res as Record<string, unknown>).locals = {
        validatedParams: { id: 'p1' },
        validatedBody: { name: 'Updated', basePrice: 2000 },
      };
      const next = jest.fn() as NextFunction;

      await updateProductHandler(req, res, next);

      expect(status).toHaveBeenCalledWith(200);
      expect(((json as jest.Mock).mock.calls[0][0] as { data: { id: string } }).data.id).toBe('p3');
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('updateProductStatusHandler', () => {
    it('updates product status using validated payload', async () => {
      const req = createReq({ headers: { 'x-business-id': 'b1' } as unknown as Request['headers'] });
      const { res, status, json } = createRes();
      (res as Record<string, unknown>).locals = {
        validatedParams: { id: 'p1' },
        validatedBody: { status: 'INACTIVE' },
      };
      const next = jest.fn() as NextFunction;

      await updateProductStatusHandler(req, res, next);

      expect(status).toHaveBeenCalledWith(200);
      expect(((json as jest.Mock).mock.calls[0][0] as { data: { status: string } }).data.status).toBe('INACTIVE');
      expect(next).not.toHaveBeenCalled();
    });
  });
});
