import { clearAuthSession, getAuthToken } from '@/lib/auth-session';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api';

interface ApiResponse<T> {
  data: T;
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getAuthToken();

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {})
    }
  });

  if (!response.ok) {
    const text = await response.text().catch(() => null);
    let payload: { message?: string } | null = null;
    if (text) {
      try {
        payload = JSON.parse(text) as { message?: string };
      } catch {
        // not JSON
      }
    }
    if (response.status === 401) {
      clearAuthSession();
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }

    throw new Error(payload?.message ?? `Request failed: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    const text = await response.text().catch(() => '');
    throw new Error(`Expected JSON response but received: ${text.slice(0, 200)}`);
  }

  const payload = (await response.json()) as ApiResponse<T> | T;
  if (payload && typeof payload === 'object' && 'data' in payload) {
      const keys = Object.keys(payload as unknown as Record<string, unknown>);
    if (keys.length === 1) {
      return (payload as ApiResponse<T>).data;
    }
  }

  return payload as T;
}
