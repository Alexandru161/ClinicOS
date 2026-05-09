import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { getCurrentUser, loginUser, registerUser } from './auth.service';
import { loginSchema, registerSchema } from './auth.validation';
import { ApiError } from '../../utils/api-error';

export const registerController = asyncHandler(async (request: Request, response: Response) => {
  const payload = registerSchema.parse(request.body);
  const result = await registerUser(payload, request.authUser ? { role: request.authUser.role } : undefined);

  response.status(201).json({
    data: result
  });
});

export const loginController = asyncHandler(async (request: Request, response: Response) => {
  const payload = loginSchema.parse(request.body);
  const result = await loginUser(payload);

  response.status(200).json({
    data: result
  });
});

export const meController = asyncHandler(async (request: Request, response: Response) => {
  if (!request.authUser) {
    throw new ApiError(401, 'Authenticated user context missing.');
  }

  const user = await getCurrentUser(request.authUser.id);

  response.status(200).json({
    data: user
  });
});