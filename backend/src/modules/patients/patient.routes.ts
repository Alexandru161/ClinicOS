import { Router } from 'express';
import { Prisma, Role } from '@prisma/client';
import { z } from 'zod';
import { ZodError } from 'zod';
import { asyncHandler } from '../../utils/async-handler';
import { prisma } from '../../config/prisma';
import { requireAuth, requireRole } from '../../middleware/auth';
import { ApiError } from '../../utils/api-error';
import { createAuditLog } from '../../utils/audit';

export const patientRouter = Router();

const patientSearchQuerySchema = z.object({
  q: z.string().trim().min(2, 'Search query must have at least 2 characters.').max(120)
});

const patientProfileParamsSchema = z.object({
  patientId: z.string().uuid('Invalid patient id.')
});

const patientCreateSchema = z.object({
  medicalRecordNumber: z.string().min(1),
  idnp: z.string().nullable().optional(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dateOfBirth: z.string().nullable().optional(),
  sex: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  address: z.string().nullable().optional(),
  notes: z.string().nullable().optional()
});

const patientUpdateSchema = patientCreateSchema.partial();

const patientImportSchema = z.object({
  csv: z.string().min(1)
});

const idnpSchema = z.string().regex(/^\d{13}$/, 'IDNP must contain exactly 13 digits.');
const phoneSchema = z.string().regex(/^\+?\d[\d\s().-]{2,24}$/, 'Phone number format is invalid.');

type PatientImportResult = {
  row: number;
  medicalRecordNumber?: string;
  status: 'created' | 'updated' | 'skipped' | 'error';
  message?: string;
};

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += character;
  }

  values.push(current.trim());
  return values;
}

function normalizeCell(value: string | undefined) {
  const trimmed = value?.trim() ?? '';
  return trimmed.length ? trimmed : null;
}

function normalizeHeader(header: string) {
  return header.trim().toLowerCase().replace(/[\s_-]+/g, '');
}

function parseCsvPatients(csv: string) {
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new ApiError(400, 'CSV file must contain a header row and at least one patient row.');
  }

  const headers = parseCsvLine(lines[0]).map(normalizeHeader);
  const requiredHeaders = ['medicalrecordnumber', 'firstname', 'lastname'];

  for (const requiredHeader of requiredHeaders) {
    if (!headers.includes(requiredHeader)) {
      throw new ApiError(400, `CSV header must include ${requiredHeader}.`);
    }
  }

  return lines.slice(1).map((line, index) => {
    const values = parseCsvLine(line);
    const row: Record<string, string> = {};

    headers.forEach((header, headerIndex) => {
      row[header] = values[headerIndex] ?? '';
    });

    return {
      rowNumber: index + 2,
      medicalRecordNumber: normalizeCell(row.medicalrecordnumber),
      idnp: normalizeCell(row.idnp),
      firstName: normalizeCell(row.firstname),
      lastName: normalizeCell(row.lastname),
      dateOfBirth: normalizeCell(row.dateofbirth),
      sex: normalizeCell(row.sex),
      phone: normalizeCell(row.phone),
      email: normalizeCell(row.email),
      address: normalizeCell(row.address),
      notes: normalizeCell(row.notes)
    };
  });
}

function parseDateOrNull(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseDateStrict(value: string | null, rowNumber: number) {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ApiError(400, `Row ${rowNumber}: dateOfBirth must use YYYY-MM-DD format.`);
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new ApiError(400, `Row ${rowNumber}: dateOfBirth is invalid.`);
  }

  return parsed;
}

function validatePatientImportRow(row: ReturnType<typeof parseCsvPatients>[number]) {
  if (!row.medicalRecordNumber) throw new ApiError(400, `Row ${row.rowNumber}: medicalRecordNumber is required.`);
  if (!row.firstName) throw new ApiError(400, `Row ${row.rowNumber}: firstName is required.`);
  if (!row.lastName) throw new ApiError(400, `Row ${row.rowNumber}: lastName is required.`);
  if (row.idnp) idnpSchema.parse(row.idnp);
  if (row.phone) phoneSchema.parse(row.phone);
  if (row.email) z.string().email(`Row ${row.rowNumber}: email is invalid.`).parse(row.email);
  return {
    medicalRecordNumber: row.medicalRecordNumber,
    idnp: row.idnp,
    firstName: row.firstName,
    lastName: row.lastName,
    dateOfBirth: parseDateStrict(row.dateOfBirth, row.rowNumber),
    sex: row.sex,
    phone: row.phone,
    email: row.email,
    address: row.address,
    notes: row.notes
  };
}

function doctorPatientScope(doctorId: string): Prisma.PatientWhereInput {
  return {
    OR: [
      { appointments: { some: { doctorId } } },
      { medicalRecords: { some: { authorId: doctorId } } }
    ]
  };
}

patientRouter.use(requireAuth);

patientRouter.get(
  '/',
  requireRole(Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST),
  asyncHandler(async (request, response) => {
    const patients = await prisma.patient.findMany({
      where: request.authUser?.role === Role.DOCTOR ? doctorPatientScope(request.authUser.id) : undefined,
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    response.json({ data: patients });
  })
);

patientRouter.post(
  '/import',
  requireRole(Role.ADMIN),
  asyncHandler(async (request, response) => {
    const payload = patientImportSchema.parse(request.body);
    const rows = parseCsvPatients(payload.csv);

    const summary = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: 0
    };

    const results: PatientImportResult[] = [];

    for (const row of rows) {
      try {
        const data = validatePatientImportRow(row);

        const existing = await prisma.patient.findUnique({
          where: { medicalRecordNumber: data.medicalRecordNumber }
        });

        if (existing) {
          const updated = await prisma.patient.update({
            where: { id: existing.id },
            data: {
              ...data,
              idnp: data.idnp ?? undefined,
              dateOfBirth: data.dateOfBirth ?? undefined,
              sex: data.sex ?? undefined,
              phone: data.phone ?? undefined,
              email: data.email ?? undefined,
              address: data.address ?? undefined,
              notes: data.notes ?? undefined
            }
          });

          summary.updated += 1;
          results.push({
            row: row.rowNumber,
            medicalRecordNumber: updated.medicalRecordNumber,
            status: 'updated'
          });
          continue;
        }

        const created = await prisma.patient.create({
          data: {
            ...data,
            idnp: data.idnp ?? undefined,
            dateOfBirth: data.dateOfBirth ?? undefined,
            sex: data.sex ?? undefined,
            phone: data.phone ?? undefined,
            email: data.email ?? undefined,
            address: data.address ?? undefined,
            notes: data.notes ?? undefined
          }
        });
        summary.created += 1;
        results.push({
          row: row.rowNumber,
          medicalRecordNumber: created.medicalRecordNumber,
          status: 'created'
        });
      } catch (error) {
        summary.errors += 1;
        results.push({
          row: row.rowNumber,
          medicalRecordNumber: row.medicalRecordNumber ?? undefined,
          status: 'error',
          message:
            error instanceof ZodError
              ? error.issues.map((issue) => `Row ${row.rowNumber}: ${issue.message}`).join(' ')
              : error instanceof Error
                ? error.message
                : 'Import failed.'
        });
      }
    }

    try {
      await createAuditLog({
        actorId: request.authUser?.id ?? null,
        action: 'import:patients',
        entity: 'Patient',
        entityId: results.find((result) => result.medicalRecordNumber)?.medicalRecordNumber ?? 'bulk-import',
        metadata: {
          summary,
          totalRows: rows.length
        }
      });
    } catch {}

    response.status(200).json({
      data: {
        summary,
        results
      }
    });
  })
);

patientRouter.patch(
  '/:patientId',
  requireRole(Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST),
  asyncHandler(async (request, response) => {
    const { patientId } = patientProfileParamsSchema.parse(request.params);
    const payload = patientUpdateSchema.parse(request.body);

    const existing = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!existing) throw new ApiError(404, 'Patient not found.');

    const updated = await prisma.patient.update({
      where: { id: patientId },
      data: {
        medicalRecordNumber: payload.medicalRecordNumber ?? existing.medicalRecordNumber,
        idnp: payload.idnp ?? existing.idnp ?? undefined,
        firstName: payload.firstName ?? existing.firstName,
        lastName: payload.lastName ?? existing.lastName,
        dateOfBirth: payload.dateOfBirth ? new Date(payload.dateOfBirth) : existing.dateOfBirth ?? undefined,
        sex: payload.sex ?? existing.sex ?? undefined,
        phone: payload.phone ?? existing.phone ?? undefined,
        email: payload.email ?? existing.email ?? undefined,
        address: payload.address ?? existing.address ?? undefined,
        notes: payload.notes ?? existing.notes ?? undefined
      }
    });

    response.json({ data: updated });

    try {
      await createAuditLog({
        actorId: request.authUser?.id ?? null,
        action: 'update:patient',
        entity: 'Patient',
        entityId: updated.id,
        metadata: { medicalRecordNumber: updated.medicalRecordNumber }
      });
    } catch {}
  })
);

patientRouter.delete(
  '/:patientId',
  requireRole(Role.ADMIN, Role.RECEPTIONIST),
  asyncHandler(async (request, response) => {
    const { patientId } = patientProfileParamsSchema.parse(request.params);

    const existing = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!existing) throw new ApiError(404, 'Patient not found.');

    await prisma.patient.delete({ where: { id: patientId } });

    response.status(204).send();

    try {
      await createAuditLog({
        actorId: request.authUser?.id ?? null,
        action: 'delete:patient',
        entity: 'Patient',
        entityId: patientId,
        metadata: { medicalRecordNumber: existing.medicalRecordNumber }
      });
    } catch {}
  })
);

patientRouter.get(
  '/search',
  requireRole(Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST),
  asyncHandler(async (request, response) => {
    const { q } = patientSearchQuerySchema.parse(request.query);
    const words = q.split(/\s+/).filter(Boolean);

    const patients = await prisma.patient.findMany({
      where: {
        AND: [
          ...(request.authUser?.role === Role.DOCTOR ? [doctorPatientScope(request.authUser.id)] : []),
          {
            OR: [
              {
                medicalRecordNumber: {
                  contains: q,
                  mode: 'insensitive'
                }
              },
              {
                phone: {
                  contains: q,
                  mode: 'insensitive'
                }
              },
              {
                idnp: {
                  contains: q,
                  mode: 'insensitive'
                }
              },
              {
                AND: words.map((word) => ({
                  OR: [
                    {
                      firstName: {
                        contains: word,
                        mode: 'insensitive'
                      }
                    },
                    {
                      lastName: {
                        contains: word,
                        mode: 'insensitive'
                      }
                    }
                  ]
                }))
              }
            ]
          }
        ]
      },
      select: {
          id: true,
          medicalRecordNumber: true,
          idnp: true,
          firstName: true,
          lastName: true,
          phone: true,
          dateOfBirth: true,
          createdAt: true,
          updatedAt: true
        },
      take: 25,
      orderBy: {
        updatedAt: 'desc'
      }
    });

    try {
      await createAuditLog({
        actorId: request.authUser?.id ?? null,
        action: 'search:patient',
        entity: 'Patient',
        entityId: patients[0]?.id ?? 'none',
        metadata: {
          query: q,
          resultCount: patients.length
        }
      });
    } catch {
      // noop
    }

    response.json({
      data: patients
    });
  })
);

patientRouter.get(
  '/profile/:patientId',
  requireRole(Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST),
  asyncHandler(async (request, response) => {
    const { patientId } = patientProfileParamsSchema.parse(request.params);
    const canReadMedicalRecords = request.authUser?.role === Role.ADMIN || request.authUser?.role === Role.DOCTOR;

    const patient = await prisma.patient.findUnique({
      where: {
        id: patientId
      },
      include: {
        appointments: {
          include: {
            doctor: {
              select: {
                id: true,
                fullName: true,
                email: true,
                role: true
              }
            },
            doctorProfile: {
              select: {
                specialty: true,
                department: true,
                licenseNumber: true
              }
            }
          },
          orderBy: {
            scheduledAt: 'desc'
          },
          take: 100
        },
        ...(canReadMedicalRecords
          ? {
              medicalRecords: {
                where: request.authUser?.role === Role.DOCTOR ? { authorId: request.authUser.id } : undefined,
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
                },
                orderBy: {
                  createdAt: 'desc'
                },
                take: 200
              }
            }
          : {})
      }
    });

    if (!patient) {
      throw new ApiError(404, 'Patient not found.');
    }

    if (request.authUser?.role === Role.DOCTOR) {
      const hasAccess = await prisma.patient.count({
        where: { id: patientId, ...doctorPatientScope(request.authUser.id) }
      });
      if (!hasAccess) {
        throw new ApiError(403, 'Doctors can open only assigned patients.');
      }
    }

    try {
      await createAuditLog({
        actorId: request.authUser?.id ?? null,
        action: 'read:patient-profile',
        entity: 'Patient',
        entityId: patient.id,
        metadata: {
          appointmentsCount: patient.appointments.length,
          medicalRecordsCount: 'medicalRecords' in patient ? patient.medicalRecords.length : 0
        }
      });
    } catch {
      // noop
    }

    response.json({ data: canReadMedicalRecords ? patient : { ...patient, medicalRecords: [] } });
  })
);

patientRouter.post(
  '/',
  requireRole(Role.ADMIN, Role.RECEPTIONIST),
  asyncHandler(async (request, response) => {
    const payload = patientCreateSchema.parse(request.body);

    const patient = await prisma.patient.create({
      data: {
        medicalRecordNumber: payload.medicalRecordNumber,
        idnp: payload.idnp ?? undefined,
        firstName: payload.firstName,
        lastName: payload.lastName,
        dateOfBirth: payload.dateOfBirth ? new Date(payload.dateOfBirth) : undefined,
        sex: payload.sex ?? undefined,
        phone: payload.phone ?? undefined,
        email: payload.email ?? undefined,
        address: payload.address ?? undefined,
        notes: payload.notes ?? undefined
      }
    });

    response.status(201).json({ data: patient });

    // Audit: patient created
    try {
      await createAuditLog({
        actorId: request.authUser?.id ?? null,
        action: 'create:patient',
        entity: 'Patient',
        entityId: patient.id,
        metadata: {
          medicalRecordNumber: patient.medicalRecordNumber,
          firstName: patient.firstName,
          lastName: patient.lastName
        }
      });
    } catch (err) {
      // swallow audit errors, but log to console to aid debugging
      // runtime logger will capture this in production
      // eslint-disable-next-line no-console
      console.warn('Failed to create audit log for patient create', (err as Error).message);
    }
  })
);
