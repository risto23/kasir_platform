import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CurrentUser } from '../../src/types/auth';

vi.mock('../../src/lib/api', () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

import { api } from '../../src/lib/api';
import {
  applyDefaultAccessContext,
  clearCachedCurrentUser,
  getActiveBusinessId,
  getActiveOutletId,
  getCachedCurrentUser,
  getDefaultBusinessMembership,
  getDefaultOutletId,
  getMe,
  login,
  logout,
  resolveRouteByRole,
  setActiveBusinessId,
  setActiveOutletId,
  updateCachedBusinessName,
  updateCachedOutletName,
} from '../../src/lib/auth';

class MemoryStorage implements Storage {
  private readonly store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

type BrowserWindowMock = {
  localStorage: Storage;
  dispatchEvent: ReturnType<typeof vi.fn>;
};

type AuthApiMock = {
  post: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
};

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

function attachBrowserWindow(): BrowserWindowMock {
  const storage = new MemoryStorage();
  const dispatchEvent = vi.fn();
  const browserWindow = {
    localStorage: storage,
    dispatchEvent,
  };

  Object.defineProperty(globalThis, 'window', {
    value: browserWindow,
    configurable: true,
  });

  Object.defineProperty(globalThis, 'localStorage', {
    value: storage,
    configurable: true,
  });

  return browserWindow;
}

function detachBrowserWindow() {
  Reflect.deleteProperty(globalThis, 'window');
  Reflect.deleteProperty(globalThis, 'localStorage');
}

describe('auth helpers', () => {
  const apiMock = api as unknown as AuthApiMock;

  beforeEach(() => {
    vi.clearAllMocks();
    detachBrowserWindow();
  });

  it('returns null for active business and outlet in SSR mode', () => {
    expect(getActiveBusinessId()).toBeNull();
    expect(getActiveOutletId()).toBeNull();
  });

  it('stores active business and outlet only when trimmed values are not empty', () => {
    attachBrowserWindow();

    setActiveBusinessId('  b-1  ');
    setActiveBusinessId('   ');
    setActiveOutletId('  o-1  ');
    setActiveOutletId('   ');

    expect(getActiveBusinessId()).toBe('b-1');
    expect(getActiveOutletId()).toBe('o-1');
  });

  it('reads cached user and tolerates invalid JSON', () => {
    const browserWindow = attachBrowserWindow();
    const user = makeUser();
    browserWindow.localStorage.setItem('pos_current_user', JSON.stringify(user));

    expect(getCachedCurrentUser()).toEqual(user);

    browserWindow.localStorage.setItem('pos_current_user', '{bad json');
    expect(getCachedCurrentUser()).toBeNull();
  });

  it('clears cached user and dispatches update event', () => {
    const browserWindow = attachBrowserWindow();
    browserWindow.localStorage.setItem('pos_current_user', JSON.stringify(makeUser()));

    clearCachedCurrentUser();

    expect(browserWindow.localStorage.getItem('pos_current_user')).toBeNull();
    expect(browserWindow.dispatchEvent).toHaveBeenCalledTimes(1);
  });

  it('updates cached business name and outlet name', () => {
    const browserWindow = attachBrowserWindow();
    const rawUser = {
      ...makeUser(),
      businessMemberships: [
        {
          ...makeUser().businessMemberships[0],
          allowedOutlets: [{ outletId: 'o-1', outletName: 'Old Outlet' }],
        },
      ],
      accessProfile: {
        ...makeUser().accessProfile,
        defaultBusinessMembership: {
          ...makeUser().businessMemberships[0],
          allowedOutlets: [{ outletId: 'o-1', outletName: 'Old Outlet' }],
        },
      },
    };

    browserWindow.localStorage.setItem('pos_current_user', JSON.stringify(rawUser));

    updateCachedBusinessName('b-1', 'Updated Biz');
    updateCachedOutletName('o-1', 'Updated Outlet');

    const updated = JSON.parse(
      browserWindow.localStorage.getItem('pos_current_user') ?? '{}',
    ) as {
      businessMemberships: Array<{
        businessName: string;
        allowedOutlets?: Array<{ outletName?: string }>;
      }>;
      accessProfile: {
        defaultBusinessMembership?: {
          businessName: string;
          allowedOutlets?: Array<{ outletName?: string }>;
        } | null;
      };
    };

    expect(updated.businessMemberships[0]?.businessName).toBe('Updated Biz');
    expect(updated.businessMemberships[0]?.allowedOutlets?.[0]?.outletName).toBe('Updated Outlet');
    expect(updated.accessProfile.defaultBusinessMembership?.businessName).toBe('Updated Biz');
  });

  it('returns safely when updating cached names without browser or cached user', () => {
    updateCachedBusinessName('b-1', 'Ignored');
    updateCachedOutletName('o-1', 'Ignored');

    const browserWindow = attachBrowserWindow();
    updateCachedBusinessName('b-1', 'Ignored');
    updateCachedOutletName('o-1', 'Ignored');

    expect(browserWindow.localStorage.getItem('pos_current_user')).toBeNull();
  });

  it('resolves default membership from access profile, primary membership, or first membership', () => {
    const defaultMembership = makeUser().businessMemberships[0];
    const userWithDefault = makeUser({
      accessProfile: {
        ...makeUser().accessProfile,
        defaultBusinessMembership: defaultMembership,
      },
    });

    expect(getDefaultBusinessMembership(null)).toBeNull();
    expect(getDefaultBusinessMembership(userWithDefault)?.businessId).toBe('b-1');

    const userWithPrimary = makeUser({
      businessMemberships: [
        { ...defaultMembership, businessId: 'b-2', isPrimary: false },
        { ...defaultMembership, businessId: 'b-3', isPrimary: true },
      ],
    });

    expect(getDefaultBusinessMembership(userWithPrimary)?.businessId).toBe('b-3');

    const userWithFirstOnly = makeUser({
      businessMemberships: [
        { ...defaultMembership, businessId: 'b-4', isPrimary: false },
      ],
    });

    expect(getDefaultBusinessMembership(userWithFirstOnly)?.businessId).toBe('b-4');
  });

  it('returns default outlet id when available', () => {
    expect(getDefaultOutletId(null)).toBeNull();
    expect(
      getDefaultOutletId({
        ...makeUser().businessMemberships[0],
        allowedOutletIds: [],
      }),
    ).toBeNull();
    expect(getDefaultOutletId(makeUser().businessMemberships[0])).toBe('o-1');
  });

  it('applies or clears default access context', () => {
    const browserWindow = attachBrowserWindow();

    applyDefaultAccessContext(makeUser());
    expect(browserWindow.localStorage.getItem('activeBusinessId')).toBe('b-1');
    expect(browserWindow.localStorage.getItem('activeOutletId')).toBe('o-1');

    applyDefaultAccessContext(
      makeUser({
        businessMemberships: [
          {
            ...makeUser().businessMemberships[0],
            allowedOutletIds: [],
          },
        ],
      }),
    );
    expect(browserWindow.localStorage.getItem('activeBusinessId')).toBe('b-1');
    expect(browserWindow.localStorage.getItem('activeOutletId')).toBeNull();

    applyDefaultAccessContext(null);
    expect(browserWindow.localStorage.getItem('activeBusinessId')).toBeNull();
    expect(browserWindow.localStorage.getItem('activeOutletId')).toBeNull();
  });

  it('routes roles to the correct dashboard pages', () => {
    const superAdmin = makeUser({
      accessProfile: {
        isSuperAdmin: true,
        isBusinessUser: true,
        accessScope: 'PLATFORM',
        defaultBusinessMembership: null,
      },
    });
    const cashier = makeUser({
      businessMemberships: [{ ...makeUser().businessMemberships[0], role: 'CASHIER' }],
    });
    const kitchen = makeUser({
      businessMemberships: [{ ...makeUser().businessMemberships[0], role: 'KITCHEN' }],
    });
    const inventory = makeUser({
      businessMemberships: [{ ...makeUser().businessMemberships[0], role: 'INVENTORY' }],
    });
    const noMembership = makeUser({ businessMemberships: [] });

    expect(resolveRouteByRole(superAdmin)).toBe('/dashboard');
    expect(resolveRouteByRole(cashier)).toBe('/dashboard/pos');
    expect(resolveRouteByRole(kitchen)).toBe('/dashboard/kitchen');
    expect(resolveRouteByRole(inventory)).toBe('/dashboard/inventory');
    expect(resolveRouteByRole(noMembership)).toBe('/login');
  });

  it('persists user and access context on login', async () => {
    const browserWindow = attachBrowserWindow();
    const user = makeUser();
    apiMock.post.mockResolvedValueOnce({
      data: {
        data: {
          accessToken: 'token-1',
          user,
        },
      },
    });
    browserWindow.localStorage.setItem('pos_access_token', 'legacy');

    const result = await login('owner@example.com', 'secret');

    expect(apiMock.post).toHaveBeenCalledWith('/auth/login', {
      email: 'owner@example.com',
      password: 'secret',
    });
    expect(result.user).toEqual(user);
    expect(browserWindow.localStorage.getItem('pos_access_token')).toBeNull();
    expect(browserWindow.localStorage.getItem('activeBusinessId')).toBe('b-1');
    expect(browserWindow.dispatchEvent).toHaveBeenCalled();
  });

  it('persists user and access context on getMe', async () => {
    const browserWindow = attachBrowserWindow();
    const user = makeUser();
    apiMock.get.mockResolvedValueOnce({
      data: {
        data: user,
      },
    });

    const result = await getMe();

    expect(apiMock.get).toHaveBeenCalledWith('/auth/me');
    expect(result).toEqual(user);
    expect(browserWindow.localStorage.getItem('activeBusinessId')).toBe('b-1');
    expect(browserWindow.dispatchEvent).toHaveBeenCalled();
  });

  it('clears local state on logout even when api request fails', async () => {
    const browserWindow = attachBrowserWindow();
    browserWindow.localStorage.setItem('pos_access_token', 'legacy');
    browserWindow.localStorage.setItem('pos_current_user', JSON.stringify(makeUser()));
    browserWindow.localStorage.setItem('activeBusinessId', 'b-1');
    browserWindow.localStorage.setItem('activeOutletId', 'o-1');
    apiMock.post.mockRejectedValueOnce(new Error('network'));

    logout();
    await Promise.resolve();

    expect(apiMock.post).toHaveBeenCalledWith('/auth/logout');
    expect(browserWindow.localStorage.getItem('pos_access_token')).toBeNull();
    expect(browserWindow.localStorage.getItem('pos_current_user')).toBeNull();
    expect(browserWindow.localStorage.getItem('activeBusinessId')).toBeNull();
    expect(browserWindow.localStorage.getItem('activeOutletId')).toBeNull();
  });
});
