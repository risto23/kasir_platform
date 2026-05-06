const fallbackApiBaseUrl = 'http://localhost:4000/api';

const configuredUrl =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ??
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ??
  fallbackApiBaseUrl;

function resolveApiBaseUrl(): string {
  if (typeof window === 'undefined') {
    return configuredUrl;
  }

  if (process.env.NODE_ENV === 'production') {
    return configuredUrl;
  }

  try {
    const url = new URL(configuredUrl);
    url.hostname = window.location.hostname;
    return url.toString().replace(/\/$/, '');
  } catch {
    return configuredUrl;
  }
}

export const API_BASE_URL = resolveApiBaseUrl();

export const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');
