import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, Filter, PlusCircle, Stethoscope, UserRound } from 'lucide-react';
import {
  createAppointment,
  getAppointmentCalendar,
  getAppointments,
  getAppointmentStats,
  getDoctorsDirectory,
  getPatientDoctorRelations,
  getPatientsDirectory,
  type AppointmentItem,
  type AppointmentStatus,
  type CreateAppointmentInput,
  updateAppointment
} from '@/api/appointments';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const statusOptions: AppointmentStatus[] = ['SCHEDULED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];
const doctorPalette = [
  'border-cyan-400/70 bg-cyan-400/15 text-cyan-100',
  'border-emerald-400/70 bg-emerald-400/15 text-emerald-100',
  'border-amber-400/70 bg-amber-400/15 text-amber-100',
  'border-rose-400/70 bg-rose-400/15 text-rose-100',
  'border-violet-400/70 bg-violet-400/15 text-violet-100',
  'border-sky-400/70 bg-sky-400/15 text-sky-100'
];

function toDateInput(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString();
}

function statusBadgeVariant(status: AppointmentStatus) {
  if (status === 'COMPLETED') return 'success';
  if (status === 'CANCELLED') return 'warning';
  return 'secondary';
}

function statusAccentClass(status: AppointmentStatus) {
  if (status === 'COMPLETED') return 'border-emerald-400/60 bg-emerald-400/15';
  if (status === 'CANCELLED') return 'border-rose-400/60 bg-rose-400/15';
  if (status === 'IN_PROGRESS') return 'border-cyan-400/60 bg-cyan-400/15';
  if (status === 'CHECKED_IN') return 'border-amber-400/60 bg-amber-400/15';
  if (status === 'NO_SHOW') return 'border-slate-400/60 bg-slate-400/15';
  return 'border-blue-400/60 bg-blue-400/15';
}

function doctorColorClass(doctorId: string | null, doctorIndexMap: Map<string, number>) {
  if (!doctorId) return 'border-slate-400/60 bg-slate-400/10 text-slate-100';
  const index = doctorIndexMap.get(doctorId) ?? 0;
  return doctorPalette[index % doctorPalette.length];
}

export function AppointmentsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<AppointmentStatus | ''>('');
  const [doctorId, setDoctorId] = useState('');
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [history, setHistory] = useState(false);
  const [monthAnchor, setMonthAnchor] = useState(() => new Date());
  const [weekAnchor, setWeekAnchor] = useState(() => new Date());

  const [patientSearch, setPatientSearch] = useState('');
  const [form, setForm] = useState<CreateAppointmentInput>({
    patientId: '',
    doctorId: '',
    scheduledAt: toDateInput(new Date(Date.now() + 60 * 60 * 1000)),
    reason: '',
    notes: '',
    room: '',
    status: 'SCHEDULED'
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedPatientForRelation, setSelectedPatientForRelation] = useState('');

  const listQuery = useQuery({
    queryKey: ['appointments', page, status, doctorId, search, fromDate, toDate, history],
    queryFn: () =>
      getAppointments({
        page,
        limit: 12,
        status: status || undefined,
        doctorId: doctorId || undefined,
        q: search || undefined,
        from: fromDate ? new Date(`${fromDate}T00:00:00`).toISOString() : undefined,
        to: toDate ? new Date(`${toDate}T23:59:59`).toISOString() : undefined,
        history
      })
  });

  const doctorsQuery = useQuery({
    queryKey: ['appointments-doctors'],
    queryFn: getDoctorsDirectory
  });

  const patientDirectoryQuery = useQuery({
    queryKey: ['appointments-patients', patientSearch],
    queryFn: () => getPatientsDirectory(patientSearch, 10),
    enabled: patientSearch.trim().length >= 2
  });

  const monthBounds = useMemo(() => {
    const from = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), 1);
    const to = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 0, 23, 59, 59);
    return {
      from: from.toISOString(),
      to: to.toISOString(),
      title: monthAnchor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    };
  }, [monthAnchor]);

  const weekBounds = useMemo(() => {
    const start = new Date(weekAnchor);
    const day = start.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + mondayOffset);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });

    return {
      from: start.toISOString(),
      to: end.toISOString(),
      days,
      title: `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`
    };
  }, [weekAnchor]);

  const calendarQuery = useQuery({
    queryKey: ['appointments-calendar', monthBounds.from, monthBounds.to, doctorId, status],
    queryFn: () =>
      getAppointmentCalendar({
        from: monthBounds.from,
        to: monthBounds.to,
        doctorId: doctorId || undefined,
        status: status || undefined
      })
  });

  const weekScheduleQuery = useQuery({
    queryKey: ['appointments-week-schedule', weekBounds.from, weekBounds.to, doctorId, status],
    queryFn: () =>
      getAppointmentCalendar({
        from: weekBounds.from,
        to: weekBounds.to,
        doctorId: doctorId || undefined,
        status: status || undefined
      })
  });

  const statsQuery = useQuery({
    queryKey: ['appointments-stats'],
    queryFn: () => getAppointmentStats()
  });

  const relationsQuery = useQuery({
    queryKey: ['patient-doctor-relations', selectedPatientForRelation],
    queryFn: () => getPatientDoctorRelations(selectedPatientForRelation),
    enabled: selectedPatientForRelation.length > 0
  });

  const createMutation = useMutation({
    mutationFn: createAppointment,
    onSuccess: () => {
      setFormError(null);
      setForm((current) => ({
        ...current,
        patientId: '',
        reason: '',
        notes: '',
        room: '',
        status: 'SCHEDULED',
        scheduledAt: toDateInput(new Date(Date.now() + 60 * 60 * 1000))
      }));
      setPatientSearch('');
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointments-calendar'] });
      queryClient.invalidateQueries({ queryKey: ['appointments-stats'] });
    },
    onError: (error) => {
      setFormError(error instanceof Error ? error.message : 'Failed to create appointment');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ appointmentId, payload }: { appointmentId: string; payload: { status: AppointmentStatus } }) =>
      updateAppointment(appointmentId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointments-calendar'] });
      queryClient.invalidateQueries({ queryKey: ['appointments-stats'] });
    }
  });

  const calendarDayMap = useMemo(() => {
    const map = new Map<string, AppointmentItem[]>();
    for (const day of calendarQuery.data?.days ?? []) {
      map.set(day.date, day.appointments as AppointmentItem[]);
    }
    return map;
  }, [calendarQuery.data?.days]);

  const weekDayMap = useMemo(() => {
    const map = new Map<string, AppointmentItem[]>();
    for (const day of weekScheduleQuery.data?.days ?? []) {
      map.set(day.date, day.appointments as AppointmentItem[]);
    }
    return map;
  }, [weekScheduleQuery.data?.days]);

  const doctorIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    const doctorIds = new Set<string>();

    for (const day of weekScheduleQuery.data?.days ?? []) {
      for (const appointment of day.appointments ?? []) {
        if (appointment.doctor?.id) {
          doctorIds.add(appointment.doctor.id);
        }
      }
    }

    Array.from(doctorIds).forEach((id, index) => map.set(id, index));
    return map;
  }, [weekScheduleQuery.data?.days]);

  const monthGrid = useMemo(() => {
    const firstDay = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), 1);
    const lastDay = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 0);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const totalDays = lastDay.getDate();
    const cells: Array<{ date: Date; currentMonth: boolean }> = [];

    for (let i = 0; i < startOffset; i += 1) {
      const date = new Date(firstDay);
      date.setDate(firstDay.getDate() - (startOffset - i));
      cells.push({ date, currentMonth: false });
    }

    for (let day = 1; day <= totalDays; day += 1) {
      cells.push({ date: new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), day), currentMonth: true });
    }

    while (cells.length % 7 !== 0) {
      const last = cells[cells.length - 1].date;
      const next = new Date(last);
      next.setDate(last.getDate() + 1);
      cells.push({ date: next, currentMonth: false });
    }

    return cells;
  }, [monthAnchor]);

  const submitCreate = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.patientId) {
      setFormError('Select patient from directory.');
      return;
    }
    if (!form.scheduledAt || !form.reason.trim()) {
      setFormError('Scheduled time and reason are required.');
      return;
    }

    createMutation.mutate({
      ...form,
      doctorId: form.doctorId || undefined,
      scheduledAt: new Date(form.scheduledAt).toISOString(),
      notes: form.notes || undefined,
      room: form.room || undefined
    });
  };

  const meta = listQuery.data?.meta;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-white/10 bg-slate-950/70">
          <CardHeader className="pb-2">
            <CardDescription>Total appointments</CardDescription>
            <CardTitle className="text-2xl">{statsQuery.data?.total ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-white/10 bg-slate-950/70">
          <CardHeader className="pb-2">
            <CardDescription>Today</CardDescription>
            <CardTitle className="text-2xl">{statsQuery.data?.todayCount ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-white/10 bg-slate-950/70">
          <CardHeader className="pb-2">
            <CardDescription>Completed</CardDescription>
            <CardTitle className="text-2xl">{statsQuery.data?.byStatus.completed ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-white/10 bg-slate-950/70">
          <CardHeader className="pb-2">
            <CardDescription>Cancelled</CardDescription>
            <CardTitle className="text-2xl">{statsQuery.data?.byStatus.cancelled ?? 0}</CardTitle>
          </CardHeader>
        </Card>
      </section>

      <Card className="border-white/10 bg-slate-950/70">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Weekly schedule</CardTitle>
            <CardDescription>Appointments grouped by weekday, with colors for status and doctor.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setWeekAnchor(new Date(weekAnchor.getFullYear(), weekAnchor.getMonth(), weekAnchor.getDate() - 7))}>
              Prev week
            </Button>
            <Button variant="outline" onClick={() => setWeekAnchor(new Date())}>
              Today
            </Button>
            <Button variant="outline" onClick={() => setWeekAnchor(new Date(weekAnchor.getFullYear(), weekAnchor.getMonth(), weekAnchor.getDate() + 7))}>
              Next week
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-slate-300">Week of {weekBounds.title}</div>
          <div className="grid gap-3 xl:grid-cols-7">
            {weekBounds.days.map((date) => {
              const key = date.toISOString().slice(0, 10);
              const appointments = weekDayMap.get(key) ?? [];

              return (
                <div key={key} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-400">{date.toLocaleDateString(undefined, { weekday: 'short' })}</p>
                      <p className="text-lg font-semibold text-white">{date.getDate()}</p>
                    </div>
                    <Badge variant="outline" className="border-white/10 bg-white/5 text-slate-200">
                      {appointments.length}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    {appointments.length === 0 ? (
                      <p className="text-xs text-slate-400">No visits</p>
                    ) : (
                      appointments.map((appointment) => (
                        <div
                          key={appointment.id}
                          className={`rounded-xl border-l-4 p-2 text-xs ${statusAccentClass(appointment.status)}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-semibold text-white">
                              {new Date(appointment.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <Badge variant={statusBadgeVariant(appointment.status)} className="text-[10px]">
                              {appointment.status}
                            </Badge>
                          </div>
                          <p className="mt-1 line-clamp-2 text-slate-100">{appointment.patient.firstName} {appointment.patient.lastName}</p>
                          <p className="line-clamp-2 text-slate-200/90">{appointment.reason}</p>
                          <div className={`mt-2 rounded-lg border px-2 py-1 ${doctorColorClass(appointment.doctor?.id ?? null, doctorIndexMap)}`}>
                            <p className="font-medium">{appointment.doctor?.fullName ?? 'Unassigned doctor'}</p>
                            {appointment.doctorProfile?.specialty ? (
                              <p className="text-[10px] opacity-90">{appointment.doctorProfile.specialty}</p>
                            ) : null}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {weekScheduleQuery.isLoading ? <p className="text-sm text-slate-300">Loading weekly schedule...</p> : null}
        </CardContent>
      </Card>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="border-white/10 bg-slate-950/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlusCircle className="h-4 w-4 text-primary" />
              Create appointment
            </CardTitle>
            <CardDescription>Assign doctor, status and schedule patient visit.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={submitCreate}>
              <Input
                placeholder="Search patient by name, MRN, IDNP"
                value={patientSearch}
                onChange={(event) => setPatientSearch(event.target.value)}
              />
              {patientDirectoryQuery.data?.length ? (
                <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-2">
                  {patientDirectoryQuery.data.map((patient) => (
                    <button
                      key={patient.id}
                      type="button"
                      onClick={() => {
                        setForm((current) => ({ ...current, patientId: patient.id }));
                        setSelectedPatientForRelation(patient.id);
                      }}
                      className={`w-full rounded-lg border px-3 py-2 text-left text-xs ${
                        form.patientId === patient.id ? 'border-primary bg-primary/20' : 'border-white/10 bg-white/5'
                      }`}
                    >
                      {patient.firstName} {patient.lastName} • MRN {patient.medicalRecordNumber}
                    </button>
                  ))}
                </div>
              ) : null}

              <select
                className="h-11 w-full rounded-xl border border-input bg-background/40 px-4 py-2 text-sm"
                value={form.doctorId}
                onChange={(event) => setForm((current) => ({ ...current, doctorId: event.target.value }))}
              >
                <option value="">Unassigned doctor</option>
                {(doctorsQuery.data ?? []).map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.fullName}
                    {doctor.doctorProfile?.specialty ? ` (${doctor.doctorProfile.specialty})` : ''}
                  </option>
                ))}
              </select>

              <Input
                type="datetime-local"
                value={form.scheduledAt}
                onChange={(event) => setForm((current) => ({ ...current, scheduledAt: event.target.value }))}
              />
              <Input
                placeholder="Reason"
                value={form.reason}
                onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  placeholder="Room"
                  value={form.room}
                  onChange={(event) => setForm((current) => ({ ...current, room: event.target.value }))}
                />
                <select
                  className="h-11 w-full rounded-xl border border-input bg-background/40 px-4 py-2 text-sm"
                  value={form.status}
                  onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as AppointmentStatus }))}
                >
                  {statusOptions.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
              <Input
                placeholder="Notes"
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              />

              {formError ? <p className="text-sm text-rose-300">{formError}</p> : null}
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create appointment'}
              </Button>
            </form>

            <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="mb-2 text-sm font-semibold text-white">Patient-doctor relations</p>
              {!selectedPatientForRelation ? (
                <p className="text-xs text-slate-300">Select patient to view doctor relation history.</p>
              ) : relationsQuery.isLoading ? (
                <p className="text-xs text-slate-300">Loading relation history...</p>
              ) : (
                <div className="space-y-2">
                  {(relationsQuery.data ?? []).slice(0, 4).map((relation) => (
                    <div key={relation.doctorId} className="rounded-lg border border-white/10 bg-slate-950/40 p-2 text-xs text-slate-200">
                      <p className="font-semibold">{relation.doctorName}</p>
                      <p>
                        {relation.specialty ?? 'General'} • visits: {relation.appointmentsCount}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-white/10 bg-slate-950/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-primary" />
                Appointment filtering and history
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 lg:grid-cols-7">
                <Input
                  placeholder="Search reason/patient/doctor"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  className="lg:col-span-2"
                />
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(event) => {
                    setFromDate(event.target.value);
                    setPage(1);
                  }}
                />
                <Input
                  type="date"
                  value={toDate}
                  onChange={(event) => {
                    setToDate(event.target.value);
                    setPage(1);
                  }}
                />
                <select
                  className="h-11 w-full rounded-xl border border-input bg-background/40 px-4 py-2 text-sm"
                  value={status}
                  onChange={(event) => {
                    setStatus(event.target.value as AppointmentStatus | '');
                    setPage(1);
                  }}
                >
                  <option value="">All statuses</option>
                  {statusOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
                <select
                  className="h-11 w-full rounded-xl border border-input bg-background/40 px-4 py-2 text-sm"
                  value={doctorId}
                  onChange={(event) => {
                    setDoctorId(event.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">All doctors</option>
                  {(doctorsQuery.data ?? []).map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>
                      {doctor.fullName}
                    </option>
                  ))}
                </select>
                <Button
                  variant={history ? 'default' : 'outline'}
                  onClick={() => {
                    setHistory((value) => !value);
                    setPage(1);
                  }}
                >
                  {history ? 'History ON' : 'History OFF'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-slate-950/70">
            <CardHeader>
              <CardTitle>Appointment list</CardTitle>
              <CardDescription>
                {meta ? `${meta.total} records • page ${meta.page}/${Math.max(meta.totalPages, 1)}` : 'Loading appointments...'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(listQuery.data?.data ?? []).map((appointment) => (
                  <div key={appointment.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {appointment.patient.firstName} {appointment.patient.lastName}
                        </p>
                        <p className="text-xs text-slate-300">{formatDateTime(appointment.scheduledAt)}</p>
                      </div>
                      <Badge variant={statusBadgeVariant(appointment.status)}>{appointment.status}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-slate-200">{appointment.reason}</p>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-300">
                      <span className="inline-flex items-center gap-1">
                        <Stethoscope className="h-3.5 w-3.5" />
                        {appointment.doctor?.fullName ?? 'Unassigned'}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <UserRound className="h-3.5 w-3.5" />
                        MRN {appointment.patient.medicalRecordNumber}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <CalendarClock className="h-3.5 w-3.5" />
                        Room {appointment.room ?? '-'}
                      </span>
                    </div>
                    <div className="mt-3 flex gap-2">
                      {statusOptions.map((nextStatus) => (
                        <Button
                          key={nextStatus}
                          size="sm"
                          variant={appointment.status === nextStatus ? 'default' : 'outline'}
                          onClick={() => updateMutation.mutate({ appointmentId: appointment.id, payload: { status: nextStatus } })}
                          disabled={updateMutation.isPending}
                        >
                          {nextStatus}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
                {listQuery.isLoading ? <p className="text-sm text-slate-300">Loading...</p> : null}
                {!listQuery.isLoading && (listQuery.data?.data.length ?? 0) === 0 ? (
                  <p className="text-sm text-slate-300">No appointments found for current filters.</p>
                ) : null}
              </div>

              <div className="mt-4 flex items-center justify-between">
                <Button variant="outline" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>
                  Previous
                </Button>
                <p className="text-sm text-slate-300">Page {page}</p>
                <Button
                  variant="outline"
                  disabled={!meta || page >= meta.totalPages}
                  onClick={() => setPage((value) => value + 1)}
                >
                  Next
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <Card className="border-white/10 bg-slate-950/70">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Calendar view</CardTitle>
            <CardDescription>{monthBounds.title}</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setMonthAnchor(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() - 1, 1))}>
              Prev
            </Button>
            <Button variant="outline" onClick={() => setMonthAnchor(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 1))}>
              Next
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-2 grid grid-cols-7 gap-2 text-center text-xs uppercase text-slate-400">
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
            <span>Sun</span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {monthGrid.map((cell) => {
              const key = cell.date.toISOString().slice(0, 10);
              const dayAppointments = calendarDayMap.get(key) ?? [];
              return (
                <div
                  key={key}
                  className={`min-h-28 rounded-xl border p-2 ${
                    cell.currentMonth ? 'border-white/10 bg-white/5' : 'border-white/5 bg-slate-900/40 text-slate-500'
                  }`}
                >
                  <p className="text-xs font-semibold">{cell.date.getDate()}</p>
                  <p className="mt-1 text-[11px] text-slate-300">{dayAppointments.length} appt</p>
                  <div className="mt-1 space-y-1">
                    {dayAppointments.slice(0, 2).map((appointment) => (
                      <p key={appointment.id} className="truncate rounded bg-primary/15 px-1.5 py-0.5 text-[10px] text-primary-foreground">
                        {new Date(appointment.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{' '}
                        {appointment.patient.firstName}
                      </p>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
