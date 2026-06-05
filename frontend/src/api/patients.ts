import { apiRequest } from './client';

export interface PatientSearchItem {
  id: string;
  medicalRecordNumber: string;
  idnp?: string | null;
  firstName: string;
  lastName: string;
  phone: string | null;
  dateOfBirth: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PatientProfile {
  id: string;
  medicalRecordNumber: string;
  idnp?: string | null;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  sex: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  appointments: Array<{
    id: string;
    scheduledAt: string;
    status: 'SCHEDULED' | 'CHECKED_IN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
    reason: string;
    notes: string | null;
    room: string | null;
    doctor: {
      id: string;
      fullName: string;
      email: string;
      role: 'ADMIN' | 'DOCTOR' | 'RECEPTIONIST';
    } | null;
    doctorProfile: {
      specialty: string;
      department: string | null;
      licenseNumber: string;
    } | null;
  }>;
  medicalRecords: Array<{
    id: string;
    recordType: string;
    diagnosis: string | null;
    treatment: string | null;
    prescription: string | null;
    notes: string | null;
    isSensitive: boolean;
    createdAt: string;
    updatedAt: string;
    author: {
      id: string;
      fullName: string;
      email: string;
      role: 'ADMIN' | 'DOCTOR' | 'RECEPTIONIST';
      doctorProfile: {
        specialty: string | null;
        department: string | null;
      } | null;
    } | null;
    appointment: {
      id: string;
      scheduledAt: string;
      status: 'SCHEDULED' | 'CHECKED_IN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
      reason: string;
    } | null;
  }>;
}

export function searchPatients(query: string) {
  const encoded = encodeURIComponent(query);
  return apiRequest<PatientSearchItem[]>(`/patients/search?q=${encoded}`);
}

export function getPatientProfile(patientId: string) {
  return apiRequest<PatientProfile>(`/patients/profile/${patientId}`);
}

export interface PatientCreateInput {
  medicalRecordNumber: string;
  idnp?: string | null;
  firstName: string;
  lastName: string;
  dateOfBirth?: string | null;
  sex?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
}

export function createPatient(payload: PatientCreateInput) {
  return apiRequest<PatientProfile>(`/patients`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function updatePatient(patientId: string, payload: Partial<PatientCreateInput>) {
  return apiRequest<PatientProfile>(`/patients/${patientId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export function deletePatient(patientId: string) {
  return apiRequest<void>(`/patients/${patientId}`, { method: 'DELETE' });
}

export interface PatientImportResult {
  row: number;
  medicalRecordNumber?: string;
  status: 'created' | 'updated' | 'skipped' | 'error';
  message?: string;
}

export interface PatientImportResponse {
  summary: {
    created: number;
    updated: number;
    skipped: number;
    errors: number;
  };
  results: PatientImportResult[];
}

export function importPatientsFromCsv(csv: string) {
  return apiRequest<PatientImportResponse>('/patients/import', {
    method: 'POST',
    body: JSON.stringify({ csv })
  });
}
