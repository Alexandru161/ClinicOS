import { ArrowUpRight, CalendarDays, ClipboardList, TrendingUp, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getDashboardOverview } from '@/api/dashboard';
import type { AppointmentStatus } from '@/api/appointments';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

function formatNumber(value: number | undefined) {
  return new Intl.NumberFormat().format(value ?? 0);
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString();
}

function statusVariant(status: AppointmentStatus) {
  if (status === 'COMPLETED') return 'success';
  if (status === 'CANCELLED' || status === 'NO_SHOW') return 'warning';
  return 'secondary';
}

export function DashboardPage() {
  const overviewQuery = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: getDashboardOverview
  });

  const overview = overviewQuery.data;
  const metrics = [
    {
      label: 'Active patients',
      value: formatNumber(overview?.metrics.activePatients),
      delta: 'registered patients',
      icon: Users
    },
    {
      label: 'Open charts',
      value: formatNumber(overview?.metrics.openCharts),
      delta: 'medical records',
      icon: ClipboardList
    },
    {
      label: 'Appointments today',
      value: formatNumber(overview?.metrics.appointmentsToday),
      delta: `${formatNumber(overview?.metrics.upcoming)} upcoming`,
      icon: CalendarDays
    },
    {
      label: 'Completed visits',
      value: formatNumber(overview?.metrics.completed),
      delta: `${formatNumber(overview?.metrics.cancelled)} cancelled`,
      icon: TrendingUp
    }
  ];

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card className="overflow-hidden border-white/10 bg-white/8">
          <CardHeader className="space-y-4 pb-4">
            <Badge className="w-fit bg-primary/15 text-primary">Operations overview</Badge>
            <div className="space-y-2">
              <CardTitle className="text-3xl sm:text-4xl">Coordinate care from intake to follow-up.</CardTitle>
              <CardDescription className="max-w-2xl text-base text-slate-300">
                ClinicOS keeps scheduling, patients, and clinical workflows in one secure workspace for the whole clinic team.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => {
              const Icon = metric.icon;
              return (
                <div key={metric.label} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-slate-400">{metric.label}</p>
                      <p className="mt-2 text-2xl font-semibold text-white">{overviewQuery.isLoading ? '-' : metric.value}</p>
                    </div>
                    <div className="rounded-xl bg-primary/15 p-2 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-emerald-300">{metric.delta}</p>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-slate-950/60">
          <CardHeader>
            <CardTitle>Today's focus</CardTitle>
            <CardDescription>Today's work at a glance.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-slate-400">Patients checked in</p>
              <p className="mt-2 text-lg font-semibold">{formatNumber(overview?.focus.waitingToday)} waiting for care</p>
              <p className="mt-1 text-sm text-slate-300">{formatNumber(overview?.focus.inProgressToday)} visits currently in progress.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-slate-400">Clinical notes</p>
              <p className="mt-2 text-lg font-semibold">{formatNumber(overview?.focus.recordsCreatedToday)} records created today</p>
              <p className="mt-1 text-sm text-slate-300">New clinical notes added today.</p>
            </div>
            <Button asChild className="w-full justify-between">
              <a href="/appointments">
                Open clinic board
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6">
        <Card className="border-white/10 bg-slate-950/60">
          <CardHeader>
            <CardTitle>Upcoming appointments</CardTitle>
            <CardDescription>Next scheduled visits.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(overview?.upcomingAppointments ?? []).length > 0 ? (
              overview?.upcomingAppointments.map((appointment) => (
                <div key={appointment.id} className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs text-slate-400">{formatDateTime(appointment.scheduledAt)}</p>
                      <p className="mt-1 font-semibold text-white">
                        {appointment.patient.firstName} {appointment.patient.lastName}
                      </p>
                    </div>
                    <Badge variant={statusVariant(appointment.status)}>{appointment.status}</Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
                    <span>{appointment.doctor?.fullName ?? 'Unassigned doctor'}</span>
                    <span className="text-slate-400">|</span>
                    <span>{appointment.doctorProfile?.specialty ?? appointment.reason}</span>
                    <span className="text-slate-400">|</span>
                    <span>MRN {appointment.patient.medicalRecordNumber}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-slate-400">
                <p>No upcoming appointments found.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
