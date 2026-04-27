const fallbackApiBaseUrl = 'http://localhost:4000/api';

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ??
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ??
  fallbackApiBaseUrl;

export const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');
