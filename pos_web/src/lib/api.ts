// pos_web/src/lib/api.ts
import axios from 'axios';
import { getAccessToken } from './storage';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? getAccessToken() : null;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});