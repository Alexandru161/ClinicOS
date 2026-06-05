import type { AuthPayload, AuthUser } from '@/api/auth';

const TOKEN_KEY = 'clinicos.token';
const REFRESH_TOKEN_KEY = 'clinicos.refreshToken';
const USER_KEY = 'clinicos.user';
const TOKEN_EXPIRY_KEY = 'clinicos.tokenExpiry';

export function setAuthSession(payload: AuthPayload) {
  window.localStorage.setItem(TOKEN_KEY, payload.token);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, payload.refreshToken);
  window.localStorage.setItem(USER_KEY, JSON.stringify(payload.user));
  
  // JWT tokens have expiry in the token, but we'll estimate 1 hour (3600 seconds) for now
  const expiryTime = new Date().getTime() + 3600 * 1000;
  window.localStorage.setItem(TOKEN_EXPIRY_KEY, String(expiryTime));
}

export function clearAuthSession() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
  window.localStorage.removeItem(TOKEN_EXPIRY_KEY);
}

export function getAuthToken() {
  return typeof window !== 'undefined' ? window.localStorage.getItem(TOKEN_KEY) : null;
}

export function getRefreshToken() {
  return typeof window !== 'undefined' ? window.localStorage.getItem(REFRESH_TOKEN_KEY) : null;
}

export function getAuthUser(): AuthUser | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function isTokenExpired(): boolean {
  if (typeof window === 'undefined') {
    return true;
  }

  const expiryStr = window.localStorage.getItem(TOKEN_EXPIRY_KEY);
  if (!expiryStr) {
    return true;
  }

  const expiryTime = parseInt(expiryStr, 10);
  return new Date().getTime() > expiryTime;
}

export function setTokenExpiry(expiresIn: number) {
  const expiryTime = new Date().getTime() + expiresIn * 1000;
  window.localStorage.setItem(TOKEN_EXPIRY_KEY, String(expiryTime));
}
