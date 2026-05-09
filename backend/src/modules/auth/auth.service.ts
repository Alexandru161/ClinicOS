import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Role, type User } from '@prisma/client';
import { env } from '../../config/env';
import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/api-error';

function sanitizeUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

function createToken(user: User) {
  return jwt.sign(
    {
      email: user.email,
      fullName: user.fullName,
      role: user.role
    },
    env.JWT_SECRET,
    {
      subject: user.id,
      expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn']
    }
  );
}

export async function registerUser(
  input: { email: string; password: string; fullName: string; role?: Role },
  actor?: { role: Role }
) {
  const existingUser = await prisma.user.findUnique({
    where: { email: input.email }
  });

  if (existingUser) {
    throw new ApiError(409, 'An account with this email already exists.');
  }

  const userCount = await prisma.user.count();
  const isBootstrapRegistration = userCount === 0;

  if (!isBootstrapRegistration && actor?.role !== Role.ADMIN) {
    throw new ApiError(403, 'Only administrators can create additional staff accounts.');
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      fullName: input.fullName,
      role: isBootstrapRegistration ? Role.ADMIN : input.role ?? Role.RECEPTIONIST
    }
  });

  return {
    user: sanitizeUser(user),
    token: createToken(user)
  };
}

export async function loginUser(input: { email: string; password: string }) {
  const user = await prisma.user.findUnique({
    where: { email: input.email }
  });

  if (!user || !user.isActive) {
    throw new ApiError(401, 'Invalid email or password.');
  }

  const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);

  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid email or password.');
  }

  return {
    user: sanitizeUser(user),
    token: createToken(user)
  };
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true
    }
  });

  if (!user) {
    throw new ApiError(404, 'User not found.');
  }

  return user;
}