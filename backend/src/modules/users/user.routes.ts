import { Router } from 'express';
import { Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { asyncHandler } from '../../utils/async-handler';
import { prisma } from '../../config/prisma';
import { requireAuth, requireRole } from '../../middleware/auth';
import { ApiError } from '../../utils/api-error';
import { createAuditLog } from '../../utils/audit';

export const userRouter = Router();

userRouter.use(requireAuth, requireRole(Role.ADMIN));

const userListSelect = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  doctorProfile: {
    select: {
      id: true,
      specialty: true,
      phone: true,
      licenseNumber: true
    }
  }
} as const;

const createUserSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(12),
    fullName: z.string().trim().min(2).max(200),
    role: z.nativeEnum(Role).optional().default(Role.RECEPTIONIST),
    specialty: z.string().trim().min(2).max(120).optional(),
    phone: z.string().trim().max(50).optional()
  })
  .superRefine((value, context) => {
    if (value.role === Role.DOCTOR && !value.specialty?.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['specialty'],
        message: 'Specialty is required for doctor accounts.'
      });
    }
  });

const userUpdateSchema = z.object({
  fullName: z.string().trim().min(2).max(200).optional(),
  role: z.nativeEnum(Role).optional(),
  specialty: z.string().trim().min(2).max(120).optional(),
  phone: z.string().trim().max(50).optional(),
  isActive: z.boolean().optional()
});

function buildLicenseNumber() {
  return `LIC-${randomUUID().slice(0, 8).toUpperCase()}`;
}

userRouter.post(
  '/',
  asyncHandler(async (request, response) => {
    if (!request.authUser) {
      throw new ApiError(401, 'No authenticated user.');
    }

    const payload = createUserSchema.parse(request.body);
    const passwordHash = await bcrypt.hash(payload.password, 12);

    const createdUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: payload.email.trim().toLowerCase(),
          passwordHash,
          fullName: payload.fullName.trim(),
          role: payload.role
        }
      });

      if (payload.role === Role.DOCTOR) {
        await tx.doctor.create({
          data: {
            userId: user.id,
            specialty: payload.specialty!.trim(),
            phone: payload.phone?.trim() || null,
            licenseNumber: buildLicenseNumber()
          }
        });
      }

      return tx.user.findUnique({
        where: { id: user.id },
        select: userListSelect
      });
    });

    if (!createdUser) {
      throw new ApiError(500, 'Failed to create user.');
    }

    response.status(201).json({ data: createdUser });

    try {
      await createAuditLog({
        actorId: request.authUser.id,
        action: 'create:user',
        entity: 'User',
        entityId: createdUser.id,
        metadata: {
          email: createdUser.email,
          role: createdUser.role,
          specialty: createdUser.doctorProfile?.specialty ?? null
        }
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('Failed to create audit log for user creation', (err as Error).message);
    }
  })
);

userRouter.get(
  '/',
  asyncHandler(async (_request, response) => {
    const users = await prisma.user.findMany({
      select: userListSelect,
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    response.json({ data: users });
  })
);

userRouter.patch(
  '/:userId',
  asyncHandler(async (request, response) => {
    const userId = z.string().uuid().parse(request.params.userId);
    const payload = userUpdateSchema.parse(request.body);

    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, isActive: true, doctorProfile: { select: { id: true } } }
    });

    if (!existing) {
      throw new ApiError(404, 'User not found.');
    }

    if (!request.authUser) {
      throw new ApiError(401, 'No authenticated user.');
    }

    if (request.authUser.id === userId && (payload.role || payload.isActive === false)) {
      throw new ApiError(400, 'You cannot modify your own role or disable your own account.');
    }

    if (payload.role === Role.DOCTOR && !existing.doctorProfile && !payload.specialty) {
      throw new ApiError(400, 'Specialty is required when promoting a user to doctor.');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data: {
          ...(payload.fullName ? { fullName: payload.fullName } : {}),
          ...(payload.role ? { role: payload.role } : {}),
          ...(payload.isActive !== undefined ? { isActive: payload.isActive } : {})
        },
        select: userListSelect
      });

      if (payload.role === Role.DOCTOR && !existing.doctorProfile && payload.specialty) {
        await tx.doctor.create({
          data: {
            userId,
            specialty: payload.specialty,
            phone: payload.phone || null,
            licenseNumber: buildLicenseNumber()
          }
        });
      }

      return user;
    });

    response.json({ data: updated });

    try {
      await createAuditLog({
        actorId: request.authUser.id,
        action: 'update:user',
        entity: 'User',
        entityId: userId,
        metadata: {
          previousRole: existing.role,
          nextRole: updated.role,
          previousActive: existing.isActive,
          nextActive: updated.isActive,
          userEmail: existing.email
        }
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('Failed to create audit log for user update', (err as Error).message);
    }
  })
);

userRouter.delete(
  '/:userId',
  asyncHandler(async (request, response) => {
    const userId = z.string().uuid().parse(request.params.userId);

    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true }
    });

    if (!existing) {
      throw new ApiError(404, 'User not found.');
    }

    if (!request.authUser) {
      throw new ApiError(401, 'No authenticated user.');
    }

    if (request.authUser.id === userId) {
      throw new ApiError(400, 'You cannot delete your own account.');
    }

    await prisma.user.delete({
      where: { id: userId }
    });

    response.status(204).end();

    try {
      await createAuditLog({
        actorId: request.authUser.id,
        action: 'delete:user',
        entity: 'User',
        entityId: userId,
        metadata: {
          userEmail: existing.email
        }
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('Failed to create audit log for user delete', (err as Error).message);
    }
  })
);

userRouter.get(
  '/logs',
  asyncHandler(async (request, response) => {
    const query = z
      .object({
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(30),
        action: z.string().max(100).optional(),
        entity: z.string().max(100).optional(),
        actorId: z.string().uuid().optional(),
        from: z.string().datetime().optional(),
        to: z.string().datetime().optional()
      })
      .parse(request.query);

    const where: any = {};

    if (query.action) {
      where.action = { contains: query.action, mode: 'insensitive' };
    }

    if (query.entity) {
      where.entity = query.entity;
    }

    if (query.actorId) {
      where.actorId = query.actorId;
    }

    if (query.from || query.to) {
      where.createdAt = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {})
      };
    }

    const skip = (query.page - 1) * query.limit;
    const [total, logs] = await prisma.$transaction([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        include: {
          actor: {
            select: { id: true, fullName: true, email: true, role: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.limit
      })
    ]);

    response.json({
      data: logs,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit)
      }
    });
  })
);

userRouter.get(
  '/stats/overview',
  asyncHandler(async (_request, response) => {
    const [totalUsers, activeUsers, adminCount, doctorCount, receptionistCount, totalLogs, logsToday] = await prisma.$transaction([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { role: Role.ADMIN } }),
      prisma.user.count({ where: { role: Role.DOCTOR } }),
      prisma.user.count({ where: { role: Role.RECEPTIONIST } }),
      prisma.auditLog.count(),
      prisma.auditLog.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      })
    ]);

    const recentActions = await prisma.auditLog.findMany({
      include: {
        actor: {
          select: { id: true, fullName: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    response.json({
      data: {
        users: {
          total: totalUsers,
          active: activeUsers,
          byRole: {
            admin: adminCount,
            doctor: doctorCount,
            receptionist: receptionistCount
          }
        },
        auditLogs: {
          total: totalLogs,
          today: logsToday
        },
        recentActions
      }
    });
  })
);
