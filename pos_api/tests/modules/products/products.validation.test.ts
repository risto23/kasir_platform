import {
  validateCreateProduct,
  validateUpdateProduct,
  validateListProducts,
  validateProductParams,
  validateUpdateProductStatus,
} from '../../../src/modules/products/products.validation';
import { createMockRequest, createMockResponse, createNext } from '../../helpers/express';

describe('products.validation', () => {
  it('accepts minimal valid create payload and normalizes optionals to null', () => {
    const req = createMockRequest({ body: { name: 'X', basePrice: 0 } });
    const resp = createMockResponse();
    const next = createNext();

    validateCreateProduct(req, resp.res, next);

    expect(next).toHaveBeenCalled();
    expect((resp.res as Record<string, unknown> & { locals: { validatedBody: unknown } }).locals.validatedBody).toEqual({
      name: 'X',
      basePrice: 0,
      categoryId: null,
      sku: null,
      barcode: null,
      brand: null,
      unit: null,
      description: null,
      imageUrl: null,
    });
  });

  it('rejects negative basePrice', () => {
    const req = createMockRequest({ body: { name: 'X', basePrice: -1 } });
    const resp = createMockResponse();

    validateCreateProduct(req, resp.res, createNext());

    expect(resp.statusCode).toBe(400);
  });

  it('list products sets defaults for page/perPage', () => {
    const req = createMockRequest({ query: {} });
    const resp = createMockResponse();
    const next = createNext();

    validateListProducts(req, resp.res, next);

    expect(next).toHaveBeenCalled();
    const q = (resp.res as Record<string, unknown> & { locals: { validatedQuery: { page: number; perPage: number } } }).locals.validatedQuery;
    expect(q.page).toBe(1);
    expect(q.perPage).toBe(10);
  });

  it('rejects invalid product params', () => {
    const req = createMockRequest({ params: { id: '   ' } });
    const resp = createMockResponse();

    validateProductParams(req, resp.res, createNext());

    expect(resp.statusCode).toBe(400);
  });

  it('accepts update payload and status payload', () => {
    const updateReq = createMockRequest({
      body: {
        name: '  Updated ',
        basePrice: 2000,
        imageUrl: '  /img.jpg ',
      },
    });
    const updateResp = createMockResponse();
    const next = createNext();

    validateUpdateProduct(updateReq, updateResp.res, next);

    expect(next).toHaveBeenCalled();
    expect(
      (
        updateResp.res as Record<string, unknown> & {
          locals: { validatedBody: { imageUrl: string } };
        }
      ).locals.validatedBody.imageUrl,
    ).toBe('/img.jpg');

    const statusReq = createMockRequest({
      body: {
        status: 'INACTIVE',
      },
    });
    const statusResp = createMockResponse();
    const statusNext = createNext();

    validateUpdateProductStatus(statusReq, statusResp.res, statusNext);

    expect(statusNext).toHaveBeenCalled();
    expect(
      (
        statusResp.res as Record<string, unknown> & {
          locals: { validatedBody: { status: string } };
        }
      ).locals.validatedBody,
    ).toEqual({
      status: 'INACTIVE',
    });
  });
});
