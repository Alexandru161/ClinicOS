import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { ApiError } from '../utils/api-error';
import type { Role } from '@prisma/client';

interface JwtPayload {
  sub: string;
  email: string;
  fullName: string;
  role: Role;
}

export function requireAuth(request: Request, _response: Response, next: NextFunction) {
  const authorizationHeader = request.headers.authorization;

  if (!authorizationHeader?.startsWith('Bearer ')) {
    next(new ApiError(401, 'Missing bearer token.'));
    return;
  }

  const token = authorizationHeader.slice(7);

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    request.authUser = {
      id: payload.sub,
      email: payload.email,
      fullName: payload.fullName,
      role: payload.role
    };
    next();
  } catch {
    next(new ApiError(401, 'Invalid or expired token.'));
  }
}

export function requireRole(...allowedRoles: Role[]) {
  return (request: Request, _response: Response, next: NextFunction) => {
    if (!request.authUser) {
      next(new ApiError(401, 'Authentication required.'));
      return;
    }

    if (!allowedRoles.includes(request.authUser.role)) {
      next(new ApiError(403, 'You do not have permission to access this resource.'));
      return;
    }

    next();
  };
}