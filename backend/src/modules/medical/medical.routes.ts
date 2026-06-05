import { Router } from 'express';
import { AppointmentStatus, Prisma, Role } from '@prisma/client';
import { z } from 'zod';
import { asyncHandler } from '../../utils/async-handler';
import { prisma } from '../../config/prisma';
import { requireAuth, requireRole } from '../../middleware/auth';
import { ApiError } from '../../utils/api-error';
import { createAuditLog } from '../../utils/audit';

export const medicalRouter = Router();

medicalRouter.use(requireAuth);

const createRecordSchema = z.object({
  patientId: z.string().uuid(),
  appointmentId: z.string().uuid().optional(),
  recordType: z.string().min(1),
  diagnosis: z.string().nullable().optional(),
  treatment: z.string().nullable().optional(),
  prescription: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  isSensitive: z.coerce.boolean().optional().default(false)
});

const createVisitWithRecordSchema = z.object({
  patientId: z.string().uuid(),
  scheduledAt: z.string().datetime(),
  reason: z.string().trim().min(2).max(500),
  room: z.string().trim().max(50).optional(),
  recordType: z.string().min(1),
  diagnosis: z.string().nullable().optional(),
  treatment: z.string().nullable().optional(),
  prescription: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  isSensitive: z.coerce.boolean().optional().default(false)
});

const recordsDashboardQuerySchema = z.object({
  doctorId: z.string().uuid().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.nativeEnum(AppointmentStatus).optional(),
  q: z.string().trim().max(120).optional()
});

function dayBounds(value?: string) {
  const base = value ? new Date(`${value}T00:00:00.000Z`) : new Date();
  const start = new Date(base);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function resolveDoctorScope(requestUser: NonNullable<Express.Request['authUser']>, requestedDoctorId?: string) {
  if (requestUser.role === Role.DOCTOR) return requestUser.id;
  return requestedDoctorId;
}

function patientSearchWhere(query: string | undefined): Prisma.PatientWhereInput {
  if (!query) return {};
  return {
    OR: [
      { firstName: { contains: query, mode: 'insensitive' } },
      { lastName: { contains: query, mode: 'insensitive' } },
      { medicalRecordNumber: { contains: query, mode: 'insensitive' } },
      { idnp: { contains: query, mode: 'insensitive' } },
      { phone: { contains: query, mode: 'insensitive' } }
    ]
  };
}

medicalRouter.get(
  '/dashboard',
  requireRole(Role.ADMIN, Role.DOCTOR),
  asyncHandler(async (request, response) => {
    const query = recordsDashboardQuerySchema.parse(request.query);
    const doctorId = resolveDoctorScope(request.authUser!, query.doctorId);
    const { start, end } = dayBounds(query.date);
    const now = new Date();

    const appointmentWhere: Prisma.AppointmentWhereInput = {
      ...(doctorId ? { doctorId } : {}),
      ...(query.status ? { status: query.status } : {})
    };

    const [todayAppointments, upcomingAppointments, recentRecords, doctors] = await prisma.$transaction([
      prisma.appointment.findMany({
        where: {
          ...appointmentWhere,
          scheduledAt: { gte: start, lte: end },
          ...(query.q ? { patient: patientSearchWhere(query.q) } : {})
        },
        include: {
          patient: true,
          doctor: { select: { id: true, fullName: true, email: true, role: true } },
          doctorProfile: { select: { id: true, specialty: true, department: true, licenseNumber: true } }
        },
        orderBy: { scheduledAt: 'asc' },
        take: 100
      }),
      prisma.appointment.findMany({
        where: {
          ...appointmentWhere,
          scheduledAt: { gt: now },
          status: { in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CHECKED_IN, AppointmentStatus.IN_PROGRESS] }
        },
        include: {
          patient: true,
          doctor: { select: { id: true, fullName: true, email: true, role: true } },
          doctorProfile: { select: { id: true, specialty: true, department: true, licenseNumber: true } }
        },
        orderBy: { scheduledAt: 'asc' },
        take: 12
      }),
      prisma.medicalRecord.findMany({
        where: doctorId ? { authorId: doctorId } : undefined,
        include: {
          patient: true,
          author: { select: { id: true, fullName: true, email: true, role: true } },
          appointment: { select: { id: true, scheduledAt: true, status: true, reason: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 20
      }),
      prisma.user.findMany({
        where: { role: Role.DOCTOR, isActive: true },
        select: {
          id: true,
          fullName: true,
          email: true,
          doctorProfile: { select: { specialty: true, department: true, licenseNumber: true } }
        },
        orderBy: { fullName: 'asc' }
      })
    ]);

    response.json({
      data: {
        doctors,
        todayAppointments,
        upcomingAppointments,
        recentRecords,
        date: start.toISOString().slice(0, 10)
      }
    });
  })
);

medicalRouter.get(
  '/patients/search',
  requireRole(Role.ADMIN, Role.DOCTOR),
  asyncHandler(async (request, response) => {
    const query = z.object({ q: z.string().trim().min(2).max(120) }).parse(request.query);
    const where: Prisma.PatientWhereInput = {
      AND: [
        patientSearchWhere(query.q),
        ...(request.authUser?.role === Role.DOCTOR
          ? [{ appointments: { some: { doctorId: request.authUser.id } } }]
          : [])
      ]
    };

    const patients = await prisma.patient.findMany({
      where,
      select: {
        id: true,
        medicalRecordNumber: true,
        idnp: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        phone: true
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      take: 25
    });

    response.json({ data: patients });
  })
);

medicalRouter.post(
  '/',
  requireRole(Role.DOCTOR),
  asyncHandler(async (request, response) => {
    const payload = createRecordSchema.parse(request.body);

    const record = await prisma.medicalRecord.create({
      data: {
        patientId: payload.patientId,
        appointmentId: payload.appointmentId ?? undefined,
        authorId: request.authUser?.id ?? undefined,
        recordType: payload.recordType,
        diagnosis: payload.diagnosis ?? undefined,
        treatment: payload.treatment ?? undefined,
        prescription: payload.prescription ?? undefined,
        notes: payload.notes ?? undefined,
        isSensitive: payload.isSensitive
      }
    });

    try {
      await createAuditLog({
        actorId: request.authUser?.id ?? null,
        action: 'create:medical_record',
        entity: 'MedicalRecord',
        entityId: record.id,
        metadata: { patientId: payload.patientId }
      });
    } catch {}

    response.status(201).json({ data: record });
  })
);

medicalRouter.post(
  '/visits',
  requireRole(Role.DOCTOR),
  asyncHandler(async (request, response) => {
    const payload = createVisitWithRecordSchema.parse(request.body);

    const doctor = await prisma.user.findUnique({
      where: { id: request.authUser?.id ?? '' },
      select: {
        id: true,
        doctorProfile: {
          select: { id: true }
        }
      }
    });

    if (!doctor?.doctorProfile) {
      throw new ApiError(403, 'Doctor profile not found.');
    }

    const result = await prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.create({
        data: {
          patientId: payload.patientId,
          doctorId: doctor.id,
          doctorProfileId: doctor.doctorProfile?.id,
          createdById: doctor.id,
          scheduledAt: new Date(payload.scheduledAt),
          reason: payload.reason,
          notes: payload.notes ?? undefined,
          room: payload.room,
          status: 'COMPLETED'
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

      const medicalRecord = await tx.medicalRecord.create({
        data: {
          patientId: payload.patientId,
          appointmentId: appointment.id,
          authorId: doctor.id,
          recordType: payload.recordType,
          diagnosis: payload.diagnosis ?? undefined,
          treatment: payload.treatment ?? undefined,
          prescription: payload.prescription ?? undefined,
          notes: payload.notes ?? undefined,
          isSensitive: payload.isSensitive
        },
        include: {
          author: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
              doctorProfile: {
                select: {
                  specialty: true,
                  department: true
                }
              }
            }
          },
          appointment: {
            select: {
              id: true,
              scheduledAt: true,
              status: true,
              reason: true
            }
          }
        }
      });

      return { appointment, medicalRecord };
    });

    try {
      await createAuditLog({
        actorId: request.authUser?.id ?? null,
        action: 'create:visit_with_record',
        entity: 'Appointment',
        entityId: result.appointment.id,
        metadata: {
          patientId: payload.patientId,
          medicalRecordId: result.medicalRecord.id,
          recordType: payload.recordType
        }
      });
    } catch {}

    response.status(201).json({ data: result });
  })
);

const deletionRequestSchema = z.object({ reason: z.string().min(1).optional() });

medicalRouter.post(
  '/:recordId/request-deletion',
  requireRole(Role.DOCTOR),
  asyncHandler(async (request, response) => {
    const recordId = z.string().uuid().parse(request.params.recordId);
    const payload = deletionRequestSchema.parse(request.body);

    const existing = await prisma.medicalRecord.findUnique({ where: { id: recordId } });
    if (!existing) throw new ApiError(404, 'Medical record not found.');

    const inserted: any = await prisma.$queryRaw`
      INSERT INTO deletion_requests (medical_record_id, requester_id, reason, status, created_at)
      VALUES (${recordId}, ${request.authUser?.id}, ${payload.reason ?? null}, 'PENDING', now())
      RETURNING id, medical_record_id, requester_id, reason, status, created_at
    `;

    try {
      await createAuditLog({
        actorId: request.authUser?.id ?? null,
        action: 'request:medical_record_deletion',
        entity: 'MedicalRecord',
        entityId: recordId,
        metadata: { reason: payload.reason ?? null }
      });
    } catch {}

    response.status(201).json({ data: inserted[0] ?? inserted });
  })
);

// Admin: list deletion requests
medicalRouter.get(
  '/deletion-requests',
  requireRole(Role.ADMIN),
  asyncHandler(async (_request, response) => {
    const rows = await prisma.$queryRaw`
      SELECT dr.id, dr.medical_record_id, dr.requester_id, dr.reason, dr.status, dr.created_at,
             u.fullName as requester_name, mr.recordType as record_type
      FROM deletion_requests dr
      LEFT JOIN users u ON u.id = dr.requester_id
      LEFT JOIN medical_records mr ON mr.id = dr.medical_record_id
      ORDER BY dr.created_at DESC
    `;

    response.json({ data: rows });
  })
);

// Admin: review (approve/reject) a deletion request
medicalRouter.patch(
  '/deletion-requests/:id',
  requireRole(Role.ADMIN),
  asyncHandler(async (request, response) => {
    const id = z.string().uuid().parse(request.params.id);
    const body = z.object({ action: z.enum(['approve', 'reject']), metadata: z.any().optional() }).parse(request.body);

    const reqRow = await prisma.$queryRaw`
      SELECT id, medical_record_id, status FROM deletion_requests WHERE id = ${id} LIMIT 1
    `;

    const row = Array.isArray(reqRow) ? reqRow[0] : reqRow;
    if (!row) throw new ApiError(404, 'Deletion request not found.');
    if (row.status !== 'PENDING') throw new ApiError(400, 'Request already reviewed.');

    if (body.action === 'reject') {
      await prisma.$executeRaw`
        UPDATE deletion_requests SET status = 'REJECTED', reviewed_by = ${request.authUser?.id}, reviewed_at = now(), metadata = ${JSON.stringify(body.metadata ?? null)} WHERE id = ${id}
      `;

      try {
        await createAuditLog({
          actorId: request.authUser?.id ?? null,
          action: 'reject:medical_record_deletion',
          entity: 'DeletionRequest',
          entityId: id,
          metadata: { reason: 'rejected', ...body.metadata }
        });
      } catch {}

      response.status(200).json({ data: { id, status: 'REJECTED' } });
      return;
    }

    // Approve: delete the medical record and mark request approved
    await prisma.$transaction(async (tx) => {
      // delete the medical record
      await tx.medicalRecord.delete({ where: { id: row.medical_record_id } });

      // mark request
      await tx.$executeRaw`
        UPDATE deletion_requests SET status = 'APPROVED', reviewed_by = ${request.authUser?.id}, reviewed_at = now(), metadata = ${JSON.stringify(body.metadata ?? null)} WHERE id = ${id}
      `;

      try {
        await createAuditLog({
          actorId: request.authUser?.id ?? null,
          action: 'approve:medical_record_deletion',
          entity: 'DeletionRequest',
          entityId: id,
          metadata: { medicalRecordId: row.medical_record_id }
        });
      } catch {}
    });

    response.status(200).json({ data: { id, status: 'APPROVED' } });
  })
);

export default medicalRouter;
