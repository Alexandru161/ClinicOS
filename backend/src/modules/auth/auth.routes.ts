import { Router } from 'express';
import { loginController, meController, registerController, refreshController } from './auth.controller';
import { requireAuth, requireRole } from '../../middleware/auth';
import { Role } from '@prisma/client';

export const authRouter = Router();

authRouter.post('/register', registerController);
authRouter.post('/login', loginController);
authRouter.post('/refresh', requireAuth, refreshController);
authRouter.get('/me', requireAuth, meController);