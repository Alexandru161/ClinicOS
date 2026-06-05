import type { NextFunction, Request, Response } from 'express';
import type { ZodSchema } from 'zod';
import { ApiError } from '../utils/api-error';

export function validateBody<T extends ZodSchema>(schema: T) {
  return (request: Request, _response: Response, next: NextFunction) => {
    try {
      schema.parse(request.body);
      next();
    } catch (err: any) {
      next(new ApiError(400, err?.message ?? 'Invalid request body'));
    }
  };
}

export function validateParams<T extends ZodSchema>(schema: T) {
  return (request: Request, _response: Response, next: NextFunction) => {
    try {
      schema.parse(request.params);
      next();
    } catch (err: any) {
      next(new ApiError(400, err?.message ?? 'Invalid request parameters'));
    }
  };
}
