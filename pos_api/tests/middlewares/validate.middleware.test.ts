import { z } from 'zod';
import { validate } from '../../src/middlewares/validate.middleware';
import { createMockRequest, createMockResponse, createNext } from '../helpers/express';

describe('validate.middleware', () => {
  const schema = z.object({
    body: z.object({ name: z.string().min(1) })
  });

  it('passes when valid', () => {
    const req = createMockRequest({ body: { name: 'ok' } });
    const resp = createMockResponse(); const { res } = resp;
    const next = createNext();

    validate(schema)(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('returns 400 with Zod error when invalid', () => {
    const req = createMockRequest({ body: {} });
    const resp2 = createMockResponse(); const { res: res2 } = resp2;

    validate(schema)(req, res2, createNext());

    expect(resp2.statusCode).toBe(400);
    expect((resp2.jsonBody as any).success).toBe(false);
    expect((resp2.jsonBody as any).message).toContain('Validation error');
  });
});

