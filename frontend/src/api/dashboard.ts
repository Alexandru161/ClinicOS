import { apiRequest } from './client';
import type { AppointmentStatus } from './appointments';

export interface DashboardOverview {
  metrics: {
    activePatients: number;
    openCharts: number;
    appointmentsToday: number;
    upcoming: number;
    completed: number;
    cancelled: number;
  };
  focus: {
    waitingToday: number;
    inProgressToday: number;
    recordsCreatedToday: number;
  };
  upcomingAppointments: Array<{
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
    doctorProfile: {
      specialty: string;
    } | null;
  }>;
}

export function getDashboardOverview() {
  return apiRequest<DashboardOverview>('/dashboard/overview');
}
