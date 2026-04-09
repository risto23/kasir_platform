import { errorResponse, successResponse } from '../../src/utils/api-response';

describe('api-response utils', () => {
  it('successResponse returns standard shape', () => {
    const out = successResponse('ok', { a: 1 });
    expect(out).toEqual({ success: true, message: 'ok', data: { a: 1 } });
  });

  it('errorResponse returns standard shape', () => {
    const out = errorResponse('bad', { e: 'x' });
    expect(out).toEqual({ success: false, message: 'bad', errors: { e: 'x' } });
  });
});
