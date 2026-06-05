import { apiRequest } from './client';
import type { AppointmentItem, AppointmentStatus, DoctorDirectoryItem, PatientDirectoryItem } from './appointments';

export interface MedicalRecordAuthor {
  id: string;
  fullName: string;
  email: string;
  role: 'ADMIN' | 'DOCTOR' | 'RECEPTIONIST';
  doctorProfile: {
    specialty: string | null;
    department: string | null;
  } | null;
}

export interface CreateVisitWithRecordInput {
  patientId: string;
  scheduledAt: string;
  reason: string;
  room?: string;
  recordType: string;
  diagnosis?: string | null;
  treatment?: string | null;
  prescription?: string | null;
  notes?: string | null;
  isSensitive?: boolean;
}

export interface VisitWithRecordResponse {
  appointment: AppointmentItem;
  medicalRecord: {
    id: string;
    author: MedicalRecordAuthor | null;
  };
}

export interface RecordsDashboard {
  doctors: DoctorDirectoryItem[];
  todayAppointments: AppointmentItem[];
  upcomingAppointments: AppointmentItem[];
  recentRecords: Array<{
    id: string;
    patientId: string;
    appointmentId: string | null;
    authorId: string | null;
    recordType: string;
    diagnosis: string | null;
    treatment: string | null;
    prescription: string | null;
    notes: string | null;
    isSensitive: boolean;
    createdAt: string;
    updatedAt: string;
    patient: {
      id: string;
      medicalRecordNumber: string;
      firstName: string;
      lastName: string;
      phone: string | null;
    };
    author: {
      id: string;
      fullName: string;
      email: string;
      role: 'ADMIN' | 'DOCTOR' | 'RECEPTIONIST';
    } | null;
    appointment: {
      id: string;
      scheduledAt: string;
      status: AppointmentStatus;
      reason: string;
    } | null;
  }>;
  date: string;
}

function buildQuery(params: Record<string, string | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  const encoded = query.toString();
  return encoded ? `?${encoded}` : '';
}

export function createVisitWithRecord(payload: CreateVisitWithRecordInput) {
  return apiRequest<VisitWithRecordResponse>('/medical-records/visits', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function getRecordsDashboard(params: { doctorId?: string; date?: string; status?: AppointmentStatus; q?: string } = {}) {
  return apiRequest<RecordsDashboard>(`/medical-records/dashboard${buildQuery(params)}`);
}

export function searchRecordPatients(query: string) {
  return apiRequest<PatientDirectoryItem[]>(`/medical-records/patients/search${buildQuery({ q: query })}`);
}
