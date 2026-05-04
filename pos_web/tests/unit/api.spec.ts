import { afterEach, describe, expect, it, vi } from 'vitest';

const requestUse = vi.fn();
const axiosInstance = {
  interceptors: {
    request: {
      use: requestUse,
    },
  },
};
const axiosCreate = vi.fn(() => axiosInstance);

vi.mock('axios', () => ({
  default: {
    create: axiosCreate,
  },
}));

vi.mock('@/lib/api-config', () => ({
  API_BASE_URL: 'http://localhost:4000/api',
}));

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
};

function attachBrowserWindow(): BrowserWindowMock {
  const storage = new MemoryStorage();
  const browserWindow = {
    localStorage: storage,
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

async function loadApiModule() {
  vi.resetModules();
  requestUse.mockClear();
  const apiModule = await import('../../src/lib/api');
  const interceptor = requestUse.mock.calls[0]?.[0] as
    | ((config: { url?: string; headers: Record<string, string> }) => { url?: string; headers: Record<string, string> })
    | undefined;

  return {
    api: apiModule.api,
    interceptor,
  };
}

describe('api request interceptor', () => {
  afterEach(() => {
    detachBrowserWindow();
  });

  it('creates axios instance with credentials enabled', async () => {
    const { api } = await loadApiModule();

    expect(api).toBe(axiosInstance);
    expect(axiosCreate).toHaveBeenCalledWith({
      baseURL: 'http://localhost:4000/api',
      withCredentials: true,
    });
    expect(requestUse).toHaveBeenCalledTimes(1);
  });

  it('attaches x-business-id header for protected routes', async () => {
    const browserWindow = attachBrowserWindow();
    browserWindow.localStorage.setItem('activeBusinessId', 'biz-1');
    const { interceptor } = await loadApiModule();

    const config = interceptor?.({
      url: '/products',
      headers: {},
    });

    expect(config?.headers['x-business-id']).toBe('biz-1');
  });

  it('does not attach x-business-id for public routes', async () => {
    const browserWindow = attachBrowserWindow();
    browserWindow.localStorage.setItem('activeBusinessId', 'biz-1');
    const { interceptor } = await loadApiModule();

    const config = interceptor?.({
      url: '/auth/login',
      headers: {},
    });

    expect(config?.headers['x-business-id']).toBeUndefined();
  });

  it('does not attach header when window is unavailable', async () => {
    const { interceptor } = await loadApiModule();

    const config = interceptor?.({
      url: '/orders',
      headers: {},
    });

    expect(config?.headers['x-business-id']).toBeUndefined();
  });
});
