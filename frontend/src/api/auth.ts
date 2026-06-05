import { apiRequest } from './client';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: 'ADMIN' | 'DOCTOR' | 'RECEPTIONIST';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthPayload {
  user: AuthUser;
  token: string;
  refreshToken: string;
}

export function login(input: { email: string; password: string }) {
  return apiRequest<AuthPayload>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export function register(input: { email: string; password: string; fullName: string; role?: AuthUser['role'] }) {
  return apiRequest<AuthPayload>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export function refreshToken(refreshToken: string) {
  return apiRequest<{ user: AuthUser; token: string }>('/auth/refresh', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${refreshToken}`
    },
    body: JSON.stringify({})
  });
}