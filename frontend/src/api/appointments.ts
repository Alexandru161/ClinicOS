import { apiRequest } from './client';

export type AppointmentStatus = 'SCHEDULED' | 'CHECKED_IN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

export interface AppointmentItem {
  id: string;
  patientId: string;
  doctorId: string | null;
  doctorProfileId: string | null;
  createdById: string | null;
  scheduledAt: string;
  status: AppointmentStatus;
  reason: string;
  notes: string | null;
  room: string | null;
  createdAt: string;
  updatedAt: string;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    medicalRecordNumber: string;
    idnp: string | null;
    phone: string | null;
  };
  doctor: {
    id: string;
    fullName: string;
    email: string;
    role: 'ADMIN' | 'DOCTOR' | 'RECEPTIONIST';
  } | null;
  doctorProfile: {
    id: string;
    specialty: string;
    department: string | null;
    licenseNumber: string;
  } | null;
  creator: {
    id: string;
    fullName: string;
    role: 'ADMIN' | 'DOCTOR' | 'RECEPTIONIST';
  } | null;
}

export interface AppointmentListResponse {
  data: AppointmentItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AppointmentListQuery {
  page?: number;
  limit?: number;
  status?: AppointmentStatus;
  doctorId?: string;
  patientId?: string;
  q?: string;
  from?: string;
  to?: string;
  history?: boolean;
}

export interface CreateAppointmentInput {
  patientId: string;
  doctorId?: string;
  scheduledAt: string;
  reason: string;
  notes?: string;
  room?: string;
  status?: AppointmentStatus;
}

export interface UpdateAppointmentInput {
  patientId?: string;
  doctorId?: string | null;
  scheduledAt?: string;
  reason?: string;
  notes?: string | null;
  room?: string | null;
  status?: AppointmentStatus;
}

export interface CalendarDay {
  date: string;
  count: number;
  appointments: Array<{
    id: string;
    scheduledAt: string;
    status: AppointmentStatus;
    reason: string;
    patient: {
      id: string;
      firstName: string;
      lastName: string;
      medicalRecordNumber: string;
    };
    doctor: {
      id: string;
      fullName: string;
    } | null;
  }>;
}

export interface AppointmentStats {
  total: number;
  todayCount: number;
  upcoming: number;
  byStatus: {
    scheduled: number;
    completed: number;
    cancelled: number;
  };
  byDoctor: Array<{
    doctorId: string | null;
    doctorName: string;
    total: number;
  }>;
}

export interface DoctorDirectoryItem {
  id: string;
  fullName: string;
  email: string;
  doctorProfile: {
    specialty: string;
    department: string | null;
    licenseNumber: string;
  } | null;
}

export interface PatientDirectoryItem {
  id: string;
  firstName: string;
  lastName: string;
  medicalRecordNumber: string;
  idnp: string | null;
  phone: string | null;
}

export interface PatientDoctorRelationItem {
  doctorId: string;
  doctorName: string;
  doctorEmail: string;
  specialty: string | null;
  department: string | null;
  appointmentsCount: number;
  firstAppointmentAt: string;
  lastAppointmentAt: string;
}

function buildQuery(params: Record<string, string | number | boolean | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    query.set(key, String(value));
  });
  const encoded = query.toString();
  return encoded.length ? `?${encoded}` : '';
}

export async function getAppointments(params: AppointmentListQuery = {}): Promise<AppointmentListResponse> {
  const query = buildQuery({
    page: params.page,
    limit: params.limit,
    status: params.status,
    doctorId: params.doctorId,
    patientId: params.patientId,
    q: params.q,
    from: params.from,
    to: params.to,
    history: params.history
  });

  return apiRequest<AppointmentListResponse>(`/appointments${query}`);
}

export function createAppointment(payload: CreateAppointmentInput) {
  return apiRequest<AppointmentItem>('/appointments', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function updateAppointment(appointmentId: string, payload: UpdateAppointmentInput) {
  return apiRequest<AppointmentItem>(`/appointments/${appointmentId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export function getAppointmentCalendar(params: { from?: string; to?: string; doctorId?: string; status?: AppointmentStatus }) {
  const query = buildQuery(params);
  return apiRequest<{ from: string; to: string; days: CalendarDay[] }>(`/appointments/calendar${query}`);
}

export function getAppointmentStats(params: { from?: string; to?: string } = {}) {
  const query = buildQuery(params);
  return apiRequest<AppointmentStats>(`/appointments/stats${query}`);
}

export function getDoctorsDirectory() {
  return apiRequest<DoctorDirectoryItem[]>('/appointments/doctors');
}

export function getPatientsDirectory(query: string, limit = 20) {
  const encoded = buildQuery({ q: query, limit });
  return apiRequest<PatientDirectoryItem[]>(`/appointments/patients${encoded}`);
}

export function getPatientDoctorRelations(patientId: string) {
  const encoded = buildQuery({ patientId });
  return apiRequest<PatientDoctorRelationItem[]>(`/appointments/relations/patient-doctors${encoded}`);
}
