import { AppointmentStatus, Prisma, Role } from '@prisma/client';
import { Router } from 'express';
import { prisma } from '../../config/prisma';
import { requireAuth, requireRole } from '../../middleware/auth';
import { asyncHandler } from '../../utils/async-handler';

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth, requireRole(Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST));

function appointmentScope(user: NonNullable<Express.Request['authUser']>): Prisma.AppointmentWhereInput {
  return user.role === Role.DOCTOR ? { doctorId: user.id } : {};
}

dashboardRouter.get(
  '/overview',
  asyncHandler(async (request, response) => {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);
    const nextThirtyDays = new Date(now);
    nextThirtyDays.setDate(nextThirtyDays.getDate() + 30);

    const scope = appointmentScope(request.authUser!);
    const activeAppointmentStatus = {
      in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CHECKED_IN, AppointmentStatus.IN_PROGRESS]
    };

    const [
      activePatients,
      openCharts,
      appointmentsToday,
      upcoming,
      completed,
      cancelled,
      upcomingAppointments,
      waitingToday,
      inProgressToday,
      recentRecords
    ] = await prisma.$transaction([
      prisma.patient.count(),
      prisma.medicalRecord.count({
        where:
          request.authUser?.role === Role.DOCTOR
            ? { authorId: request.authUser.id }
            : undefined
      }),
      prisma.appointment.count({
        where: {
          ...scope,
          scheduledAt: { gte: startOfToday, lte: endOfToday }
        }
      }),
      prisma.appointment.count({
        where: {
          ...scope,
          status: activeAppointmentStatus,
          scheduledAt: { gt: now }
        }
      }),
      prisma.appointment.count({ where: { ...scope, status: AppointmentStatus.COMPLETED } }),
      prisma.appointment.count({ where: { ...scope, status: AppointmentStatus.CANCELLED } }),
      prisma.appointment.findMany({
        where: {
          ...scope,
          status: activeAppointmentStatus,
          scheduledAt: { gte: now, lte: nextThirtyDays }
        },
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              medicalRecordNumber: true
            }
          },
          doctor: {
            select: {
              id: true,
              fullName: true
            }
          },
          doctorProfile: {
            select: {
              specialty: true
            }
          }
        },
        orderBy: { scheduledAt: 'asc' },
        take: 12
      }),
      prisma.appointment.count({
        where: {
          ...scope,
          status: AppointmentStatus.CHECKED_IN,
          scheduledAt: { gte: startOfToday, lte: endOfToday }
        }
      }),
      prisma.appointment.count({
        where: {
          ...scope,
          status: AppointmentStatus.IN_PROGRESS,
          scheduledAt: { gte: startOfToday, lte: endOfToday }
        }
      }),
      prisma.medicalRecord.count({
        where: {
          ...(request.authUser?.role === Role.DOCTOR ? { authorId: request.authUser.id } : {}),
          createdAt: { gte: startOfToday, lte: endOfToday }
        }
      })
    ]);

    response.json({
      data: {
        metrics: {
          activePatients,
          openCharts,
          appointmentsToday,
          upcoming,
          completed,
          cancelled
        },
        focus: {
          waitingToday,
          inProgressToday,
          recordsCreatedToday: recentRecords
        },
        upcomingAppointments
      }
    });
  })
);
