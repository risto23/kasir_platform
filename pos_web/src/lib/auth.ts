import { api } from './api';
import { setAccessToken, removeAccessToken } from './storage';
import type { CurrentUser, LoginResponse } from '../types/auth';

const AUTH_USER_STORAGE_KEY = 'pos_current_user';

export async function login(email: string, password: string) {
  const response = await api.post('/auth/login', { email, password });
  const data = response.data.data as LoginResponse;

  setAccessToken(data.accessToken);

  if (typeof window !== 'undefined') {
    localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(data.user));
  }

  return data;
}

export async function getMe() {
  const response = await api.get('/auth/me');
  const data = response.data.data as CurrentUser;

  if (typeof window !== 'undefined') {
    localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(data));
  }

  return data;
}

export function getCachedCurrentUser(): CurrentUser | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = localStorage.getItem(AUTH_USER_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as CurrentUser;
  } catch {
    return null;
  }
}

export function clearCachedCurrentUser() {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.removeItem(AUTH_USER_STORAGE_KEY);
}

export function logout() {
  removeAccessToken();
  clearCachedCurrentUser();
}