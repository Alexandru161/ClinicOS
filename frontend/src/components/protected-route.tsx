import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import type { AuthUser } from '@/api/auth';
import { getAuthUser } from '@/lib/auth-session';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: AuthUser['role'][];
}

export function ProtectedRoute({ children, requiredRoles }: ProtectedRouteProps) {
  const authUser = getAuthUser();

  if (!authUser) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRoles && !requiredRoles.includes(authUser.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
