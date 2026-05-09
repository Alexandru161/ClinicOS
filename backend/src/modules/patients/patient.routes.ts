import { Router } from 'express';
import { Role } from '@prisma/client';
import { asyncHandler } from '../../utils/async-handler';
import { prisma } from '../../config/prisma';
import { requireAuth, requireRole } from '../../middleware/auth';
import { ApiError } from '../../utils/api-error';

export const patientRouter = Router();

patientRouter.use(requireAuth);

patientRouter.get(
  '/',
  requireRole(Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST),
  asyncHandler(async (_request, response) => {
    const patients = await prisma.patient.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    response.json({ data: patients });
  })
);

patientRouter.post(
  '/',
  requireRole(Role.ADMIN, Role.RECEPTIONIST),
  asyncHandler(async (request, response) => {
    const { medicalRecordNumber, firstName, lastName, dateOfBirth, sex, phone, email, address, notes } = request.body as Record<string, unknown>;

    if (!medicalRecordNumber || !firstName || !lastName) {
      throw new ApiError(400, 'medicalRecordNumber, firstName, and lastName are required.');
    }

    const patient = await prisma.patient.create({
      data: {
        medicalRecordNumber: String(medicalRecordNumber),
        firstName: String(firstName),
        lastName: String(lastName),
        dateOfBirth: dateOfBirth ? new Date(String(dateOfBirth)) : undefined,
        sex: sex ? String(sex) : undefined,
        phone: phone ? String(phone) : undefined,
        email: email ? String(email) : undefined,
        address: address ? String(address) : undefined,
        notes: notes ? String(notes) : undefined
      }
    });

    response.status(201).json({ data: patient });
  })
);