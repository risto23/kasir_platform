import axios from 'axios';

function shouldAttachBusinessHeader(url: string): boolean {
  return (
    url.startsWith('/business/') ||
    url.startsWith('/products') ||
    url.startsWith('/promos') ||
    url.startsWith('/orders') ||
    url.startsWith('/payments') ||
    url.startsWith('/receipts') ||
    url.startsWith('/inventory') ||
    url.startsWith('/reports') ||
    url.startsWith('/audit-logs') ||
    url.startsWith('/settings')
  );
}

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const activeBusinessId = window.localStorage.getItem('activeBusinessId');
    const url = config.url ?? '';

    if (activeBusinessId && shouldAttachBusinessHeader(url)) {
      config.headers['x-business-id'] = activeBusinessId;
    }
  }

  return config;
});
