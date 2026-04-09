import { signAccessToken, verifyAccessToken } from '../../src/utils/jwt';

describe('jwt utils', () => {
  it('signs and verifies access token', () => {
    const token = signAccessToken({ userId: 'u1', email: 'a@b.c' });
    const payload = verifyAccessToken(token);
    expect(payload.userId).toBe('u1');
    expect(payload.email).toBe('a@b.c');
  });
});
