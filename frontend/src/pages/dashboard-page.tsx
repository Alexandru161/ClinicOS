import { ArrowUpRight, CalendarDays, ClipboardList, Download, TrendingUp, Users } from 'lucide-react';
import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const metrics = [
  { label: 'Active patients', value: '1,284', delta: '+14%', icon: Users },
  { label: 'Appointments today', value: '42', delta: '+8%', icon: CalendarDays },
  { label: 'Open charts', value: '18', delta: '+3', icon: ClipboardList },
  { label: 'Follow-up rate', value: '91%', delta: '+6%', icon: TrendingUp }
];

const allAppointments = [
  { id: 1, time: '08:30', date: '2026-05-09', patient: 'Ava Martinez', doctor: 'Dr. Harper', specialty: 'General Checkup', status: 'Checked in' },
  { id: 2, time: '09:10', date: '2026-05-09', patient: 'Noah Patel', doctor: 'Dr. Ionescu', specialty: 'Cardiology', status: 'Scheduled' },
  { id: 3, time: '10:00', date: '2026-05-09', patient: 'Mia Johnson', doctor: 'Dr. Kim', specialty: 'Dermatology', status: 'In progress' },
  { id: 4, time: '11:20', date: '2026-05-09', patient: 'Sophia Green', doctor: 'Dr. Gomez', specialty: 'Orthopedics', status: 'Scheduled' },
  { id: 5, time: '13:00', date: '2026-05-09', patient: 'James Wilson', doctor: 'Dr. Harper', specialty: 'General Checkup', status: 'Scheduled' },
  { id: 6, time: '14:30', date: '2026-05-10', patient: 'Emma Davis', doctor: 'Dr. Kim', specialty: 'Pediatrics', status: 'Scheduled' },
  { id: 7, time: '15:00', date: '2026-05-10', patient: 'Oliver Brown', doctor: 'Dr. Ionescu', specialty: 'Cardiology', status: 'Scheduled' },
  { id: 8, time: '16:15', date: '2026-05-10', patient: 'Isabella Martinez', doctor: 'Dr. Gomez', specialty: 'Orthopedics', status: 'Scheduled' },
  { id: 9, time: '09:00', date: '2026-05-11', patient: 'Lucas Anderson', doctor: 'Dr. Harper', specialty: 'General Checkup', status: 'Scheduled' },
  { id: 10, time: '10:45', date: '2026-05-11', patient: 'Amelia Taylor', doctor: 'Dr. Kim', specialty: 'Dermatology', status: 'Scheduled' },
  { id: 11, time: '11:30', date: '2026-05-11', patient: 'Mason Thomas', doctor: 'Dr. Ionescu', specialty: 'Cardiology', status: 'Scheduled' },
  { id: 12, time: '13:00', date: '2026-05-12', patient: 'Charlotte Garcia', doctor: 'Dr. Gomez', specialty: 'Orthopedics', status: 'Scheduled' },
  { id: 13, time: '14:00', date: '2026-05-12', patient: 'Benjamin Lee', doctor: 'Dr. Harper', specialty: 'General Checkup', status: 'Scheduled' },
  { id: 14, time: '15:30', date: '2026-05-12', patient: 'Harper White', doctor: 'Dr. Kim', specialty: 'Pediatrics', status: 'Scheduled' },
  { id: 15, time: '16:00', date: '2026-05-13', patient: 'Evelyn Harris', doctor: 'Dr. Ionescu', specialty: 'Cardiology', status: 'Scheduled' },
];

function exportToCSV(appointments: typeof allAppointments, filename: string) {
  const headers = ['Date', 'Time', 'Patient', 'Doctor', 'Specialty', 'Status'];
  const csv = [
    headers.join(','),
    ...appointments.map(apt => 
      `${apt.date},${apt.time},"${apt.patient}","${apt.doctor}","${apt.specialty}",${apt.status}`
    )
  ].join('\n');
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}

export function DashboardPage() {
  const [visibleCount, setVisibleCount] = useState(8);
  const [selectedPeriod, setSelectedPeriod] = useState(7);

  const filteredAppointments = useMemo(() => {
    const now = new Date('2026-05-09');
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - selectedPeriod);
    
    return allAppointments.filter(apt => {
      const aptDate = new Date(apt.date);
      return aptDate >= startDate && aptDate <= now;
    });
  }, [selectedPeriod]);

  const displayedAppointments = useMemo(() => {
    return filteredAppointments.slice(0, visibleCount);
  }, [filteredAppointments, visibleCount]);

  const handleExport = (period: number, periodLabel: string) => {
    const now = new Date('2026-05-09');
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - period);
    
    const toExport = allAppointments.filter(apt => {
      const aptDate = new Date(apt.date);
      return aptDate >= startDate && aptDate <= now;
    });
    
    exportToCSV(toExport, `appointments_${periodLabel}_${now.toISOString().split('T')[0]}.csv`);
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card className="overflow-hidden border-white/10 bg-white/8">
          <CardHeader className="space-y-4 pb-4">
            <Badge className="w-fit bg-primary/15 text-primary">Operations overview</Badge>
            <div className="space-y-2">
              <CardTitle className="text-3xl sm:text-4xl">Coordinate care from intake to follow-up.</CardTitle>
              <CardDescription className="max-w-2xl text-base text-slate-300">
                ClinicOS keeps scheduling, patients, and clinical workflows in one secure surface so front-desk and clinical teams work from the same source of truth.
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
                      <p className="mt-2 text-2xl font-semibold text-white">{metric.value}</p>
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
            <CardTitle>Today&apos;s focus</CardTitle>
            <CardDescription>Prioritized tasks for reception and care teams.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-slate-400">Priority queue</p>
              <p className="mt-2 text-lg font-semibold">3 patients waiting for triage</p>
              <p className="mt-1 text-sm text-slate-300">Average wait time is currently 11 minutes.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-slate-400">Clinical alerts</p>
              <p className="mt-2 text-lg font-semibold">2 results require review</p>
              <p className="mt-1 text-sm text-slate-300">Flagged by the lab intake workflow.</p>
            </div>
            <Button className="w-full justify-between">
              Open clinic board
              <ArrowUpRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <Card className="border-white/10 bg-slate-950/60">
          <CardHeader>
            <CardTitle>Upcoming appointments</CardTitle>
            <CardDescription>Operational snapshot for the next queue of patients.</CardDescription>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button 
                variant={selectedPeriod === 7 ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setSelectedPeriod(7)}
              >
                7 days
              </Button>
              <Button 
                variant={selectedPeriod === 14 ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setSelectedPeriod(14)}
              >
                14 days
              </Button>
              <Button 
                variant={selectedPeriod === 30 ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setSelectedPeriod(30)}
              >
                30 days
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {displayedAppointments.length > 0 ? (
              <>
                {displayedAppointments.map((appointment) => (
                  <div key={appointment.id} className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs text-slate-400">{appointment.date} • {appointment.time}</p>
                        <p className="mt-1 font-semibold text-white">{appointment.patient}</p>
                      </div>
                      <Badge variant={appointment.status === 'In progress' ? 'warning' : 'secondary'}>{appointment.status}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-300">
                      <span>{appointment.doctor}</span>
                      <span className="text-slate-400">•</span>
                      <span>{appointment.specialty}</span>
                    </div>
                  </div>
                ))}
                <div className="space-y-2 border-t border-white/10 pt-4">
                  {visibleCount < filteredAppointments.length && (
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => setVisibleCount(visibleCount + 8)}
                    >
                      Load more ({filteredAppointments.length - visibleCount} remaining)
                    </Button>
                  )}
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="flex-1 justify-center gap-2"
                      onClick={() => handleExport(7, '7days')}
                    >
                      <Download className="h-4 w-4" />
                      Export 7d
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="flex-1 justify-center gap-2"
                      onClick={() => handleExport(14, '14days')}
                    >
                      <Download className="h-4 w-4" />
                      Export 14d
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="flex-1 justify-center gap-2"
                      onClick={() => handleExport(30, '30days')}
                    >
                      <Download className="h-4 w-4" />
                      Export 30d
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-slate-400">
                <p>No appointments found for the selected period.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/8">
          <CardHeader>
            <CardTitle>System readiness</CardTitle>
            <CardDescription>Deployment and API surface are wired for production use.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-300">
            <p>Frontend uses a clean API client layer with an `/api` base path so the Caddy reverse proxy stays in control.</p>
            <p>Backend routes are grouped by domain with JWT and role guards for ADMIN, DOCTOR, and RECEPTIONIST access.</p>
            <p>Prisma schema includes users, patients, appointments, and audit logs as the core operational records.</p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}