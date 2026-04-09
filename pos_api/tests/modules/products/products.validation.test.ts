import { validateCreateProduct, validateUpdateProduct, validateListProducts } from '../../../src/modules/products/products.validation';
import { createMockRequest, createMockResponse, createNext } from '../../helpers/express';

describe('products.validation', () => {
  it('accepts minimal valid create payload and normalizes optionals to null', () => {
    const req = createMockRequest({ body: { name: 'X', basePrice: 0 } });
    const resp = createMockResponse();
    const next = createNext();

    validateCreateProduct(req, resp.res, next);

    expect(next).toHaveBeenCalled();
    expect((resp.res as any).locals.validatedBody).toEqual({
      name: 'X', basePrice: 0,
      categoryId: null, sku: null, barcode: null, brand: null, unit: null, description: null, imageUrl: null,
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
    const q = (resp.res as any).locals.validatedQuery;
    expect(q.page).toBe(1);
    expect(q.perPage).toBe(10);
  });
});
