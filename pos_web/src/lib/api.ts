import axios from 'axios';
import { getAccessToken } from './storage';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = getAccessToken();
    const activeBusinessId = localStorage.getItem('activeBusinessId');
    const url = config.url ?? '';
    const isBusinessEndpoint = url.startsWith('/business/');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (isBusinessEndpoint && activeBusinessId) {
      config.headers['x-business-id'] = activeBusinessId;
    }
  }

  return config;
});