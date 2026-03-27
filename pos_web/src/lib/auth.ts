import { api } from './api';
import { setAccessToken, removeAccessToken } from './storage';
import type { CurrentUser, LoginResponse } from '../types/auth';

const AUTH_USER_STORAGE_KEY = 'pos_current_user';
const ACTIVE_BUSINESS_ID_STORAGE_KEY = 'activeBusinessId';

type DefaultBusinessMembershipLike = {
  businessId?: string | null;
};

type AccessProfileLike = {
  defaultBusinessMembership?: DefaultBusinessMembershipLike | null;
};

function extractActiveBusinessId(user: CurrentUser | LoginResponse['user'] | null | undefined) {
  if (!user) {
    return null;
  }

  const accessProfile = user.accessProfile as AccessProfileLike | undefined;
  const businessId = accessProfile?.defaultBusinessMembership?.businessId;

  if (typeof businessId === 'string' && businessId.trim().length > 0) {
    return businessId;
  }

  return null;
}

function persistCurrentUser(user: CurrentUser | LoginResponse['user']) {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));

  const activeBusinessId = extractActiveBusinessId(user);

  if (activeBusinessId) {
    localStorage.setItem(ACTIVE_BUSINESS_ID_STORAGE_KEY, activeBusinessId);
  }
}

function clearActiveBusinessContext() {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.removeItem(ACTIVE_BUSINESS_ID_STORAGE_KEY);
}

export function getActiveBusinessId(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return localStorage.getItem(ACTIVE_BUSINESS_ID_STORAGE_KEY);
}

export function setActiveBusinessId(businessId: string) {
  if (typeof window === 'undefined') {
    return;
  }

  const value = businessId.trim();

  if (!value) {
    return;
  }

  localStorage.setItem(ACTIVE_BUSINESS_ID_STORAGE_KEY, value);
}

export async function login(email: string, password: string) {
  const response = await api.post('/auth/login', { email, password });
  const data = response.data.data as LoginResponse;

  setAccessToken(data.accessToken);
  persistCurrentUser(data.user);

  return data;
}

export async function getMe() {
  const response = await api.get('/auth/me');
  const data = response.data.data as CurrentUser;

  persistCurrentUser(data);

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
  clearActiveBusinessContext();
}