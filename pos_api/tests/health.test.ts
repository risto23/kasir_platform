import request from 'supertest';
import app from '../src/app';

describe('Health endpoint', () => {
  it('GET /api/health returns success', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body && typeof res.body === 'object').toBe(true);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.message).toBe('string');
  });
});

