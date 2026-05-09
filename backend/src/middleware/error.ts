import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ApiError } from '../utils/api-error';

export function notFoundHandler(_request: Request, response: Response) {
  response.status(404).json({
    error: 'Not Found',
    message: 'The requested resource does not exist.'
  });
}

export function errorHandler(error: unknown, _request: Request, response: Response, _next: NextFunction) {
  if (error instanceof ApiError) {
    response.status(error.statusCode).json({
      error: error.name,
      message: error.message
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    response.status(400).json({
      error: 'Database Error',
      message: 'A database constraint was violated.'
    });
    return;
  }

  const message = error instanceof Error ? error.message : 'Unexpected server error.';

  response.status(500).json({
    error: 'Internal Server Error',
    message
  });
}