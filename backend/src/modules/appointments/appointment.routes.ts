import { Router } from 'express';
import { AppointmentStatus, Prisma, Role } from '@prisma/client';
import { z } from 'zod';
import { asyncHandler } from '../../utils/async-handler';
import { prisma } from '../../config/prisma';
import { requireAuth, requireRole } from '../../middleware/auth';
import { ApiError } from '../../utils/api-error';
import { createAuditLog } from '../../utils/audit';

export const appointmentRouter = Router();

appointmentRouter.use(requireAuth);

const appointmentCreateSchema = z.object({
  patientId: z.string().uuid(),
  doctorId: z.string().uuid().optional(),
  scheduledAt: z.string().datetime(),
  reason: z.string().trim().min(2).max(500),
  notes: z.string().trim().max(2000).optional(),
  room: z.string().trim().max(50).optional(),
  status: z.nativeEnum(AppointmentStatus).optional()
});

const appointmentUpdateSchema = z.object({
  patientId: z.string().uuid().optional(),
  doctorId: z.string().uuid().nullable().optional(),
  scheduledAt: z.string().datetime().optional(),
  reason: z.string().trim().min(2).max(500).optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  room: z.string().trim().max(50).nullable().optional(),
  status: z.nativeEnum(AppointmentStatus).optional()
});

const appointmentListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(30),
  status: z.nativeEnum(AppointmentStatus).optional(),
  doctorId: z.string().uuid().optional(),
  patientId: z.string().uuid().optional(),
  q: z.string().trim().max(120).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  history: z.coerce.boolean().optional().default(false)
});

const calendarQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  doctorId: z.string().uuid().optional(),
  status: z.nativeEnum(AppointmentStatus).optional()
});

const statsQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional()
});

function buildAppointmentWhere(query: z.infer<typeof appointmentListQuerySchema>): Prisma.AppointmentWhereInput {
  const where: Prisma.AppointmentWhereInput = {};

  if (query.status) {
    where.status = query.status;
  }

  if (query.doctorId) {
    where.doctorId = query.doctorId;
  }

  if (query.patientId) {
    where.patientId = query.patientId;
  }

  if (query.from || query.to || query.history) {
    where.scheduledAt = {
      ...(query.from ? { gte: new Date(query.from) } : {}),
      ...(query.to ? { lte: new Date(query.to) } : {}),
      ...(query.history && !query.from ? { lt: new Date() } : {})
    };
  }

  if (query.q) {
    where.OR = [
      { reason: { contains: query.q, mode: 'insensitive' } },
      { patient: { firstName: { contains: query.q, mode: 'insensitive' } } },
      { patient: { lastName: { contains: query.q, mode: 'insensitive' } } },
      { patient: { medicalRecordNumber: { contains: query.q, mode: 'insensitive' } } },
      { patient: { idnp: { contains: query.q, mode: 'insensitive' } } },
      { doctor: { fullName: { contains: query.q, mode: 'insensitive' } } }
    ];
  }

  return where;
}

function scopedAppointmentWhere(requestUser: NonNullable<Express.Request['authUser']>, where: Prisma.AppointmentWhereInput = {}) {
  if (requestUser.role === Role.DOCTOR) {
    return { ...where, doctorId: requestUser.id };
  }
  return where;
}

async function ensureDoctorIsAvailable(doctorId: string | null | undefined, scheduledAt: Date, ignoredAppointmentId?: string) {
  if (!doctorId) return;

  const conflictingAppointment = await prisma.appointment.findFirst({
    where: {
      doctorId,
      scheduledAt,
      status: {
        in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CHECKED_IN, AppointmentStatus.IN_PROGRESS]
      },
      ...(ignoredAppointmentId ? { id: { not: ignoredAppointmentId } } : {})
    },
    select: { id: true }
  });

  if (conflictingAppointment) {
    throw new ApiError(409, 'Doctor already has an active appointment at this time.');
  }
}

appointmentRouter.get(
  '/',
  requireRole(Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST),
  asyncHandler(async (request, response) => {
    const query = appointmentListQuerySchema.parse(request.query);
    const where = scopedAppointmentWhere(request.authUser!, buildAppointmentWhere(query));
    const skip = (query.page - 1) * query.limit;

    const [total, appointments] = await prisma.$transaction([
      prisma.appointment.count({ where }),
      prisma.appointment.findMany({
        where,
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              medicalRecordNumber: true,
              idnp: true,
              phone: true
            }
          },
          doctor: {
            select: { id: true, fullName: true, email: true, role: true }
          },
          doctorProfile: {
            select: { id: true, specialty: true, department: true, licenseNumber: true }
          },
          creator: {
            select: { id: true, fullName: true, role: true }
          }
        },
        orderBy: { scheduledAt: query.history ? 'desc' : 'asc' },
        skip,
        take: query.limit
      })
    ]);

    response.json({
      data: appointments,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit)
      }
    });
  })
);

appointmentRouter.get(
  '/calendar',
  requireRole(Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST),
  asyncHandler(async (request, response) => {
    const query = calendarQuerySchema.parse(request.query);

    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
    const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59));
    const from = query.from ? new Date(query.from) : monthStart;
    const to = query.to ? new Date(query.to) : monthEnd;

    const appointments = await prisma.appointment.findMany({
      where: scopedAppointmentWhere(request.authUser!, {
        scheduledAt: {
          gte: from,
          lte: to
        },
        ...(query.doctorId ? { doctorId: query.doctorId } : {}),
        ...(query.status ? { status: query.status } : {})
      }),
      select: {
        id: true,
        scheduledAt: true,
        status: true,
        reason: true,
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
        }
      },
      orderBy: { scheduledAt: 'asc' }
    });

    const byDate = new Map<
      string,
      Array<{
        id: string;
        scheduledAt: Date;
        status: AppointmentStatus;
        reason: string;
        patient: { id: string; firstName: string; lastName: string; medicalRecordNumber: string };
        doctor: { id: string; fullName: string } | null;
      }>
    >();

    for (const appointment of appointments) {
      const dateKey = appointment.scheduledAt.toISOString().slice(0, 10);
      const existing = byDate.get(dateKey) ?? [];
      existing.push(appointment);
      byDate.set(dateKey, existing);
    }

    response.json({
      data: {
        from,
        to,
        days: Array.from(byDate.entries()).map(([date, dayAppointments]) => ({
          date,
          count: dayAppointments.length,
          appointments: dayAppointments
        }))
      }
    });
  })
);

appointmentRouter.get(
  '/stats',
  requireRole(Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST),
  asyncHandler(async (request, response) => {
    const query = statsQuerySchema.parse(request.query);
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    const baseWhere: Prisma.AppointmentWhereInput = {
      ...(query.from || query.to
        ? {
            scheduledAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {})
            }
          }
        : {})
    };
    const scopedBaseWhere = scopedAppointmentWhere(request.authUser!, baseWhere);

    const [total, scheduled, completed, cancelled, todayCount, upcoming] = await prisma.$transaction([
      prisma.appointment.count({ where: scopedBaseWhere }),
      prisma.appointment.count({ where: { ...scopedBaseWhere, status: AppointmentStatus.SCHEDULED } }),
      prisma.appointment.count({ where: { ...scopedBaseWhere, status: AppointmentStatus.COMPLETED } }),
      prisma.appointment.count({ where: { ...scopedBaseWhere, status: AppointmentStatus.CANCELLED } }),
      prisma.appointment.count({ where: { ...scopedBaseWhere, scheduledAt: { gte: startOfToday, lte: endOfToday } } }),
      prisma.appointment.count({
        where: {
          ...scopedBaseWhere,
          status: AppointmentStatus.SCHEDULED,
          scheduledAt: { gt: now }
        }
      })
    ]);

    const grouped = await prisma.appointment.groupBy({
      by: ['doctorId'],
      where: {
        ...scopedBaseWhere,
        doctorId: { not: null }
      },
      _count: { _all: true }
    });

    const doctorIds = grouped.map((item) => item.doctorId).filter((value): value is string => Boolean(value));
    const doctors = doctorIds.length
      ? await prisma.user.findMany({
          where: { id: { in: doctorIds } },
          select: { id: true, fullName: true }
        })
      : [];
    const doctorMap = new Map(doctors.map((doctor) => [doctor.id, doctor.fullName]));

    response.json({
      data: {
        total,
        todayCount,
        upcoming,
        byStatus: {
          scheduled,
          completed,
          cancelled
        },
        byDoctor: grouped
          .filter((item) => item.doctorId)
          .map((item) => ({
            doctorId: item.doctorId,
            doctorName: doctorMap.get(item.doctorId as string) ?? 'Unknown doctor',
            total: item._count._all
          }))
          .sort((a, b) => b.total - a.total)
      }
    });
  })
);

appointmentRouter.get(
  '/relations/patient-doctors',
  requireRole(Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST),
  asyncHandler(async (request, response) => {
    const patientId = z.string().uuid().parse(request.query.patientId);

    const appointments = await prisma.appointment.findMany({
      where: {
        patientId,
        doctorId: { not: null },
        ...(request.authUser?.role === Role.DOCTOR ? { doctorId: request.authUser.id } : {})
      },
      include: {
        doctor: { select: { id: true, fullName: true, email: true } },
        doctorProfile: { select: { specialty: true, department: true } }
      },
      orderBy: { scheduledAt: 'desc' }
    });

    const relationMap = new Map<
      string,
      {
        doctorId: string;
        doctorName: string;
        doctorEmail: string;
        specialty: string | null;
        department: string | null;
        appointmentsCount: number;
        firstAppointmentAt: Date;
        lastAppointmentAt: Date;
      }
    >();

    for (const appointment of appointments) {
      if (!appointment.doctorId || !appointment.doctor) continue;

      const existing = relationMap.get(appointment.doctorId);
      if (!existing) {
        relationMap.set(appointment.doctorId, {
          doctorId: appointment.doctorId,
          doctorName: appointment.doctor.fullName,
          doctorEmail: appointment.doctor.email,
          specialty: appointment.doctorProfile?.specialty ?? null,
          department: appointment.doctorProfile?.department ?? null,
          appointmentsCount: 1,
          firstAppointmentAt: appointment.scheduledAt,
          lastAppointmentAt: appointment.scheduledAt
        });
      } else {
        existing.appointmentsCount += 1;
        if (appointment.scheduledAt < existing.firstAppointmentAt) {
          existing.firstAppointmentAt = appointment.scheduledAt;
        }
        if (appointment.scheduledAt > existing.lastAppointmentAt) {
          existing.lastAppointmentAt = appointment.scheduledAt;
        }
      }
    }

    response.json({
      data: Array.from(relationMap.values()).sort((a, b) => b.appointmentsCount - a.appointmentsCount)
    });
  })
);

appointmentRouter.get(
  '/doctors',
  requireRole(Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST),
  asyncHandler(async (_request, response) => {
    const doctors = await prisma.user.findMany({
      where: {
        role: Role.DOCTOR,
        isActive: true
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        doctorProfile: {
          select: {
            specialty: true,
            department: true,
            licenseNumber: true
          }
        }
      },
      orderBy: { fullName: 'asc' }
    });

    response.json({ data: doctors });
  })
);

appointmentRouter.get(
  '/patients',
  requireRole(Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST),
  asyncHandler(async (request, response) => {
    const query = z.object({ q: z.string().trim().max(120).optional(), limit: z.coerce.number().int().min(1).max(100).default(20) }).parse(request.query);
    const searchWhere: Prisma.PatientWhereInput = query.q
      ? {
          OR: [
            { firstName: { contains: query.q, mode: Prisma.QueryMode.insensitive } },
            { lastName: { contains: query.q, mode: Prisma.QueryMode.insensitive } },
            { medicalRecordNumber: { contains: query.q, mode: Prisma.QueryMode.insensitive } },
            { idnp: { contains: query.q, mode: Prisma.QueryMode.insensitive } },
            { phone: { contains: query.q, mode: Prisma.QueryMode.insensitive } }
          ]
        }
      : {};

    const patients = await prisma.patient.findMany({
      where: {
        AND: [
          searchWhere,
          ...(request.authUser?.role === Role.DOCTOR ? [{ appointments: { some: { doctorId: request.authUser.id } } }] : [])
        ]
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        medicalRecordNumber: true,
        idnp: true,
        phone: true
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      take: query.limit
    });

    response.json({ data: patients });
  })
);

appointmentRouter.post(
  '/',
  requireRole(Role.ADMIN, Role.RECEPTIONIST),
  asyncHandler(async (request, response) => {
    const payload = appointmentCreateSchema.parse(request.body);

    const patient = await prisma.patient.findUnique({ where: { id: payload.patientId }, select: { id: true } });
    if (!patient) {
      throw new ApiError(404, 'Patient not found.');
    }

    let doctorProfileId: string | undefined;
    if (payload.doctorId) {
      const doctor = await prisma.user.findFirst({
        where: {
          id: payload.doctorId,
          role: Role.DOCTOR,
          isActive: true
        },
        select: {
          id: true,
          doctorProfile: {
            select: { id: true }
          }
        }
      });

      if (!doctor) {
        throw new ApiError(404, 'Doctor not found or inactive.');
      }

      doctorProfileId = doctor.doctorProfile?.id;
    }

    await ensureDoctorIsAvailable(payload.doctorId, new Date(payload.scheduledAt));

    const appointment = await prisma.appointment.create({
      data: {
        patientId: payload.patientId,
        doctorId: payload.doctorId,
        doctorProfileId,
        createdById: request.authUser?.id,
        scheduledAt: new Date(payload.scheduledAt),
        reason: payload.reason,
        notes: payload.notes,
        room: payload.room,
        status: payload.status ?? AppointmentStatus.SCHEDULED
      },
      include: {
        patient: true,
        doctor: {
          select: { id: true, fullName: true, email: true, role: true }
        },
        doctorProfile: {
          select: { id: true, specialty: true, department: true, licenseNumber: true }
        }
      }
    });

    response.status(201).json({ data: appointment });

    // Audit: appointment created
    try {
      await createAuditLog({
        actorId: request.authUser?.id ?? null,
        action: 'create:appointment',
        entity: 'Appointment',
        entityId: appointment.id,
        metadata: {
          patientId: appointment.patientId,
          doctorId: appointment.doctorId,
          scheduledAt: appointment.scheduledAt
        }
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('Failed to create audit log for appointment create', (err as Error).message);
    }
  })
);

appointmentRouter.patch(
  '/:appointmentId',
  requireRole(Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST),
  asyncHandler(async (request, response) => {
    const appointmentId = z.string().uuid().parse(request.params.appointmentId);
    const payload = appointmentUpdateSchema.parse(request.body);

    const existing = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: {
        id: true,
        doctorId: true,
        patientId: true,
        status: true
      }
    });

    if (!existing) {
      throw new ApiError(404, 'Appointment not found.');
    }

    if (request.authUser?.role === Role.DOCTOR && request.authUser.id !== existing.doctorId) {
      throw new ApiError(403, 'Doctors can update only their own appointments.');
    }

    let doctorProfileId: string | null | undefined;
    if (payload.doctorId !== undefined) {
      if (payload.doctorId === null) {
        doctorProfileId = null;
      } else {
        const doctor = await prisma.user.findFirst({
          where: {
            id: payload.doctorId,
            role: Role.DOCTOR,
            isActive: true
          },
          select: {
            id: true,
            doctorProfile: {
              select: { id: true }
            }
          }
        });

        if (!doctor) {
          throw new ApiError(404, 'Doctor not found or inactive.');
        }

        doctorProfileId = doctor.doctorProfile?.id ?? null;
      }
    }

    const nextDoctorId = payload.doctorId === undefined ? existing.doctorId : payload.doctorId;
    const nextScheduledAt = payload.scheduledAt ? new Date(payload.scheduledAt) : undefined;
    if (nextScheduledAt) {
      await ensureDoctorIsAvailable(nextDoctorId, nextScheduledAt, appointmentId);
    }

    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        ...(payload.patientId ? { patientId: payload.patientId } : {}),
        ...(payload.doctorId !== undefined ? { doctorId: payload.doctorId } : {}),
        ...(doctorProfileId !== undefined ? { doctorProfileId } : {}),
        ...(payload.scheduledAt ? { scheduledAt: new Date(payload.scheduledAt) } : {}),
        ...(payload.reason ? { reason: payload.reason } : {}),
        ...(payload.notes !== undefined ? { notes: payload.notes } : {}),
        ...(payload.room !== undefined ? { room: payload.room } : {}),
        ...(payload.status ? { status: payload.status } : {})
      },
      include: {
        patient: true,
        doctor: {
          select: { id: true, fullName: true, email: true, role: true }
        },
        doctorProfile: {
          select: { id: true, specialty: true, department: true, licenseNumber: true }
        }
      }
    });

    response.json({ data: updated });

    try {
      await createAuditLog({
        actorId: request.authUser?.id ?? null,
        action: 'update:appointment',
        entity: 'Appointment',
        entityId: appointmentId,
        metadata: {
          previousStatus: existing.status,
          nextStatus: updated.status,
          doctorId: updated.doctorId,
          patientId: updated.patientId
        }
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('Failed to create audit log for appointment update', (err as Error).message);
    }
  })
);
