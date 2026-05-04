import axios from 'axios';
import { API_BASE_URL } from '@/lib/api-config';

function shouldAttachBusinessHeader(url: string): boolean {
  return (
    url.startsWith('/business/') ||
    url.startsWith('/products') ||
    url.startsWith('/suppliers') ||
    url.startsWith('/purchase-orders') ||
    url.startsWith('/goods-receipts') ||
    url.startsWith('/purchase-returns') ||
    url.startsWith('/purchase-price-history') ||
    url.startsWith('/supplier-invoices') ||
    url.startsWith('/promos') ||
    url.startsWith('/orders') ||
    url.startsWith('/payments') ||
    url.startsWith('/receipts') ||
    url.startsWith('/inventory') ||
    url.startsWith('/subscriptions') ||
    url.startsWith('/reports') ||
    url.startsWith('/audit-logs') ||
    url.startsWith('/settings')
  );
}

export const api = axios.create({
  baseURL: API_BASE_URL,
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
