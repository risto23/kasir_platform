import { describe, it, expect } from 'vitest';
import { resolveRouteByRole } from '../../src/lib/auth';
import type { CurrentUser } from '../../src/types/auth';

function makeUser(partial: Partial<CurrentUser> = {}): CurrentUser {
  return {
    id: 'u1',
    fullName: 'User 1',
    email: 'u1@example.com',
    status: 'ACTIVE',
    lastLoginAt: null,
    platformRoles: [],
    businessMemberships: [
      {
        businessUserId: 'bu-1',
        businessId: 'b-1',
        businessName: 'Demo',
        businessType: 'RESTAURANT',
        role: 'OWNER',
        status: 'ACTIVE',
        isPrimary: true,
        hasAllOutletAccess: true,
        allowedOutletIds: ['o-1'],
        permissions: [],
      },
    ],
    accessProfile: {
      isSuperAdmin: false,
      isBusinessUser: true,
      accessScope: 'BUSINESS',
      defaultBusinessMembership: null,
    },
    ...partial,
  };
}

describe('resolveRouteByRole', () => {
  it('routes super admin to /dashboard', () => {
    const user = makeUser({ accessProfile: { isSuperAdmin: true, isBusinessUser: true, accessScope: 'PLATFORM', defaultBusinessMembership: null } });
    expect(resolveRouteByRole(user)).toBe('/dashboard');
  });

  it('routes cashier to /dashboard/pos', () => {
    const user = makeUser({ businessMemberships: [{
      businessUserId: 'bu-1', businessId: 'b-1', businessName: 'Demo', businessType: 'RESTAURANT', role: 'CASHIER', status: 'ACTIVE', isPrimary: true, hasAllOutletAccess: false, allowedOutletIds: ['o-1'], permissions: []
    }]});
    expect(resolveRouteByRole(user)).toBe('/dashboard/pos');
  });

  it('routes kitchen to /dashboard/kitchen', () => {
    const user = makeUser({ businessMemberships: [{
      businessUserId: 'bu-1', businessId: 'b-1', businessName: 'Demo', businessType: 'RESTAURANT', role: 'KITCHEN', status: 'ACTIVE', isPrimary: true, hasAllOutletAccess: false, allowedOutletIds: ['o-1'], permissions: []
    }]});
    expect(resolveRouteByRole(user)).toBe('/dashboard/kitchen');
  });

  it('routes others to /dashboard/business', () => {
    const user = makeUser();
    expect(resolveRouteByRole(user)).toBe('/dashboard/business');
  });
});