import type { Request, Response } from 'express';
import {
  listBusinessesController,
  getBusinessByIdController,
  createBusinessController,
  updateBusinessController,
  updateBusinessStatusController,
} from '../../../src/modules/platform-business/platform-business.controller';

jest.mock('../../../src/modules/platform-business/platform-business.service', () => ({
  listBusinessesService: jest.fn(async () => ([{ id: 'b1', name: 'Biz' }])),
  getBusinessByIdService: jest.fn(async (id: string) => ({ id, name: 'Biz' })),
  createBusinessService: jest.fn(async (b: any) => ({ id: 'b2', ...b })),
  updateBusinessService: jest.fn(async (id: string, b: any) => ({ id, ...b })),
  updateBusinessStatusService: jest.fn(async (id: string, status: any) => ({ id, status })),
}));

function resKit() {
  const res: Partial<Response> = {};
  const status = jest.fn().mockImplementation((c: number) => { (res as any)._status=c; return res as Response; });
  const json = jest.fn().mockImplementation((p: any) => { (res as any)._json=p; return res as Response; });
  (res as any).status = status; (res as any).json = json;
  return { res: res as Response, status, json };
}

describe('platform-business.controller', () => {
  it('list returns 200 & data', async () => {
    const { res, status, json } = resKit();
    await listBusinessesController({} as Request, res);
    expect(status).not.toHaveBeenCalled();
    const payload = (json as jest.Mock).mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(Array.isArray(payload.data)).toBe(true);
  });

  it('get by id not found → 404', async () => {
    const { getBusinessByIdService } = jest.requireMock('../../../src/modules/platform-business/platform-business.service');
    getBusinessByIdService.mockRejectedValueOnce(new Error('not found'));
    const { res, status } = resKit();
    await getBusinessByIdController({ params: { id: 'x' } } as any, res);
    expect(status).toHaveBeenCalledWith(404);
  });

  it('create returns 201', async () => {
    const { res, status } = resKit();
    await createBusinessController({ body: { name: 'N', slug: 's', businessType: 'RETAIL' } } as any, res);
    expect(status).toHaveBeenCalledWith(201);
  });

  it('update returns 200', async () => {
    const { res, status } = resKit();
    await updateBusinessController({ params: { id: 'b1' }, body: { name: 'U', slug: 'u' } } as any, res);
    expect(status).not.toHaveBeenCalled();
  });

  it('update status returns 200', async () => {
    const { res, status } = resKit();
    await updateBusinessStatusController({ params: { id: 'b1' }, body: { status: 'ACTIVE' } } as any, res);
    expect(status).not.toHaveBeenCalled();
  });
});
