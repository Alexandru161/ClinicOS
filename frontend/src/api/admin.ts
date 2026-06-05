import { apiRequest } from './client';

export type UserRole = 'ADMIN' | 'DOCTOR' | 'RECEPTIONIST';

export interface UserItem {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  doctorProfile?: {
    id: string;
    specialty: string;
    phone: string | null;
    licenseNumber: string;
  } | null;
}

export interface UsersListResponse {
  data: UserItem[];
}

export interface AuditLogItem {
  id: string;
  actorId: string | null;
  action: string;
  entity: string;
  entityId: string;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actor: {
    id: string;
    fullName: string;
    email: string;
    role: UserRole;
  } | null;
}

export interface AuditLogsResponse {
  data: AuditLogItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SystemOverviewStats {
  users: {
    total: number;
    active: number;
    byRole: {
      admin: number;
      doctor: number;
      receptionist: number;
    };
  };
  auditLogs: {
    total: number;
    today: number;
  };
  recentActions: AuditLogItem[];
}

export interface UpdateUserPayload {
  fullName?: string;
  role?: UserRole;
  isActive?: boolean;
}

export interface CreateUserPayload {
  email: string;
  password: string;
  fullName: string;
  role?: UserRole;
  specialty?: string;
  phone?: string;
}

export async function getUsers() {
  return apiRequest<UserItem[]>('/users');
}

export async function createUser(payload: CreateUserPayload) {
  return apiRequest<UserItem>('/users', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function updateUser(userId: string, payload: UpdateUserPayload) {
  return apiRequest<UserItem>(`/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export async function deleteUser(userId: string) {
  return apiRequest<void>(`/users/${userId}`, { method: 'DELETE' });
}

export async function getAuditLogs(params: {
  page?: number;
  limit?: number;
  action?: string;
  entity?: string;
  actorId?: string;
  from?: string;
  to?: string;
} = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) query.set(key, String(value));
  });
  const encoded = query.toString();
  const path = `/users/logs${encoded ? `?${encoded}` : ''}`;
  return apiRequest<AuditLogsResponse>(path);
}

export async function getSystemOverview() {
  return apiRequest<SystemOverviewStats>('/users/stats/overview');
}
