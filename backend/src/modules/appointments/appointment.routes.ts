import { Router } from 'express';
import { Role } from '@prisma/client';
import { asyncHandler } from '../../utils/async-handler';
import { prisma } from '../../config/prisma';
import { requireAuth, requireRole } from '../../middleware/auth';
import { ApiError } from '../../utils/api-error';

export const appointmentRouter = Router();

appointmentRouter.use(requireAuth);

appointmentRouter.get(
  '/',
  requireRole(Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST),
  asyncHandler(async (_request, response) => {
    const appointments = await prisma.appointment.findMany({
      include: {
        patient: true,
        doctor: {
          select: { id: true, fullName: true, email: true, role: true }
        }
      },
      orderBy: { scheduledAt: 'asc' },
      take: 50
    });

    response.json({ data: appointments });
  })
);

appointmentRouter.post(
  '/',
  requireRole(Role.ADMIN, Role.RECEPTIONIST),
  asyncHandler(async (request, response) => {
    const { patientId, doctorId, scheduledAt, reason, notes } = request.body as Record<string, unknown>;

    if (!patientId || !scheduledAt || !reason) {
      throw new ApiError(400, 'patientId, scheduledAt, and reason are required.');
    }

    const appointment = await prisma.appointment.create({
      data: {
        patientId: String(patientId),
        doctorId: doctorId ? String(doctorId) : undefined,
        createdById: request.authUser?.id,
        scheduledAt: new Date(String(scheduledAt)),
        reason: String(reason),
        notes: notes ? String(notes) : undefined
      }
    });

    response.status(201).json({ data: appointment });
  })
);