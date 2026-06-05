import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, FileText, Search, Stethoscope, UserRound } from 'lucide-react';
import { getPatientProfile, type PatientProfile } from '@/api/patients';
import { createVisitWithRecord, getRecordsDashboard, searchRecordPatients } from '@/api/medical-records';
import type { AppointmentStatus, PatientDirectoryItem } from '@/api/appointments';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getAuthUser } from '@/lib/auth-session';

function todayInputValue() {
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function dateTimeInputValue(date = new Date()) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString();
}

function normalizeOptional(value: string) {
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

function statusVariant(status: AppointmentStatus) {
  if (status === 'COMPLETED') return 'success';
  if (status === 'CANCELLED') return 'warning';
  return 'secondary';
}

export function RecordsPage() {
  const authUser = getAuthUser();
  const queryClient = useQueryClient();
  const [date, setDate] = useState(todayInputValue);
  const [doctorId, setDoctorId] = useState('');
  const [status, setStatus] = useState<AppointmentStatus | ''>('');
  const [query, setQuery] = useState('');
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<PatientDirectoryItem | null>(null);
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [recordForm, setRecordForm] = useState({
    scheduledAt: dateTimeInputValue(),
    reason: '',
    room: '',
    recordType: 'consultation',
    diagnosis: '',
    treatment: '',
    prescription: '',
    notes: '',
    isSensitive: false
  });
  const [message, setMessage] = useState<string | null>(null);

  const canUseRecords = authUser?.role === 'ADMIN' || authUser?.role === 'DOCTOR';
  const isAdmin = authUser?.role === 'ADMIN';

  const dashboardQuery = useQuery({
    queryKey: ['records-dashboard', date, doctorId, status, query],
    queryFn: () => getRecordsDashboard({ date, doctorId: isAdmin ? doctorId || undefined : undefined, status: status || undefined, q: query || undefined }),
    enabled: canUseRecords
  });

  const patientSearchQuery = useQuery({
    queryKey: ['records-patient-search', patientSearch],
    queryFn: () => searchRecordPatients(patientSearch),
    enabled: canUseRecords && patientSearch.trim().length >= 2
  });

  const todaysUniquePatients = useMemo(() => {
    const map = new Map<string, PatientDirectoryItem>();
    for (const appointment of dashboardQuery.data?.todayAppointments ?? []) {
      map.set(appointment.patient.id, appointment.patient);
    }
    return Array.from(map.values());
  }, [dashboardQuery.data?.todayAppointments]);

  const openPatient = async (patient: PatientDirectoryItem) => {
    setSelectedPatient(patient);
    setMessage(null);
    const payload = await getPatientProfile(patient.id);
    setProfile(payload);
  };

  const createRecordMutation = useMutation({
    mutationFn: createVisitWithRecord,
    onSuccess: async () => {
      setMessage('Medical record saved.');
      setRecordForm({
        scheduledAt: dateTimeInputValue(),
        reason: '',
        room: '',
        recordType: 'consultation',
        diagnosis: '',
        treatment: '',
        prescription: '',
        notes: '',
        isSensitive: false
      });
      queryClient.invalidateQueries({ queryKey: ['records-dashboard'] });
      if (selectedPatient) {
        setProfile(await getPatientProfile(selectedPatient.id));
      }
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : 'Failed to save medical record.');
    }
  });

  const submitRecord = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedPatient) {
      setMessage('Select a patient first.');
      return;
    }
    if (!recordForm.reason.trim() || !recordForm.recordType.trim()) {
      setMessage('Reason and record type are required.');
      return;
    }

    createRecordMutation.mutate({
      patientId: selectedPatient.id,
      scheduledAt: new Date(recordForm.scheduledAt).toISOString(),
      reason: recordForm.reason.trim(),
      room: normalizeOptional(recordForm.room),
      recordType: recordForm.recordType.trim(),
      diagnosis: normalizeOptional(recordForm.diagnosis),
      treatment: normalizeOptional(recordForm.treatment),
      prescription: normalizeOptional(recordForm.prescription),
      notes: normalizeOptional(recordForm.notes),
      isSensitive: recordForm.isSensitive
    });
  };

  if (!canUseRecords) {
    return (
      <Card className="border-white/10 bg-slate-950/70">
        <CardHeader>
          <CardTitle>Medical records</CardTitle>
          <CardDescription>Medical notes are available only to doctors and administrators.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-white/10 bg-slate-950/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-primary" />
            Doctor workspace
          </CardTitle>
          <CardDescription>
            {isAdmin ? 'Administrator view across doctors.' : `Personal workspace for ${authUser?.fullName}.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 lg:grid-cols-5">
            <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            {isAdmin ? (
              <select className="h-11 rounded-xl border border-input bg-background/40 px-4 text-sm" value={doctorId} onChange={(event) => setDoctorId(event.target.value)}>
                <option value="">All doctors</option>
                {(dashboardQuery.data?.doctors ?? []).map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.fullName}
                  </option>
                ))}
              </select>
            ) : null}
            <select className="h-11 rounded-xl border border-input bg-background/40 px-4 text-sm" value={status} onChange={(event) => setStatus(event.target.value as AppointmentStatus | '')}>
              <option value="">All statuses</option>
              {(['SCHEDULED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'] as AppointmentStatus[]).map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <Input className="lg:col-span-2" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter patient, MRN, IDNP, phone" />
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="border-white/10 bg-slate-950/70">
          <CardHeader>
            <CardTitle>Patients today</CardTitle>
            <CardDescription>{todaysUniquePatients.length} patient(s)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {todaysUniquePatients.length === 0 ? <p className="text-sm text-slate-300">No patients for this date.</p> : null}
            {todaysUniquePatients.map((patient) => (
              <button key={patient.id} type="button" onClick={() => openPatient(patient)} className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-left hover:bg-white/10">
                <p className="text-sm font-semibold text-white">{patient.firstName} {patient.lastName}</p>
                <p className="text-xs text-slate-300">MRN {patient.medicalRecordNumber} | {patient.phone ?? '-'}</p>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-slate-950/70 lg:col-span-2">
          <CardHeader>
            <CardTitle>Upcoming appointments</CardTitle>
            <CardDescription>Nearest active visits for the current scope.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {(dashboardQuery.data?.upcomingAppointments ?? []).map((appointment) => (
              <button key={appointment.id} type="button" onClick={() => openPatient(appointment.patient)} className="rounded-xl border border-white/10 bg-white/5 p-3 text-left hover:bg-white/10">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-white">{appointment.patient.firstName} {appointment.patient.lastName}</p>
                  <Badge variant={statusVariant(appointment.status)}>{appointment.status}</Badge>
                </div>
                <p className="mt-1 text-xs text-slate-300">{formatDateTime(appointment.scheduledAt)}</p>
                <p className="text-xs text-slate-300">{appointment.reason}</p>
              </button>
            ))}
            {(dashboardQuery.data?.upcomingAppointments.length ?? 0) === 0 ? <p className="text-sm text-slate-300">No upcoming appointments.</p> : null}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.4fr_0.6fr]">
        <Card className="border-white/10 bg-slate-950/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-4 w-4 text-primary" />
              Patient search
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input value={patientSearch} onChange={(event) => setPatientSearch(event.target.value)} placeholder="Name, MRN, IDNP, phone" />
            <div className="space-y-2">
              {(patientSearchQuery.data ?? []).map((patient) => (
                <button key={patient.id} type="button" onClick={() => openPatient(patient)} className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-left hover:bg-white/10">
                  <p className="text-sm font-semibold text-white">{patient.firstName} {patient.lastName}</p>
                  <p className="text-xs text-slate-300">MRN {patient.medicalRecordNumber} | IDNP {patient.idnp ?? '-'}</p>
                </button>
              ))}
              {patientSearch.trim().length >= 2 && !patientSearchQuery.isLoading && (patientSearchQuery.data?.length ?? 0) === 0 ? (
                <p className="text-sm text-slate-300">No patients found.</p>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-slate-950/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserRound className="h-4 w-4 text-primary" />
              Patient card
            </CardTitle>
            <CardDescription>{selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : 'Select a patient from today, upcoming list, or search.'}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {!profile ? <p className="text-sm text-slate-300">Patient details will appear here.</p> : null}
            {profile ? (
              <>
                <div className="grid gap-3 rounded-xl border border-white/10 bg-white/5 p-4 md:grid-cols-2">
                  <p className="text-sm text-slate-200">MRN: {profile.medicalRecordNumber}</p>
                  <p className="text-sm text-slate-200">IDNP: {profile.idnp ?? '-'}</p>
                  <p className="text-sm text-slate-200">Phone: {profile.phone ?? '-'}</p>
                  <p className="text-sm text-slate-200">Email: {profile.email ?? '-'}</p>
                  <p className="text-sm text-slate-200 md:col-span-2">Address: {profile.address ?? '-'}</p>
                </div>

                <form className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4" onSubmit={submitRecord}>
                  <h3 className="text-sm font-semibold text-white">Add visit and medical record</h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Input type="datetime-local" value={recordForm.scheduledAt} onChange={(event) => setRecordForm((current) => ({ ...current, scheduledAt: event.target.value }))} />
                    <Input value={recordForm.reason} onChange={(event) => setRecordForm((current) => ({ ...current, reason: event.target.value }))} placeholder="Visit reason" />
                    <Input value={recordForm.recordType} onChange={(event) => setRecordForm((current) => ({ ...current, recordType: event.target.value }))} placeholder="Record type" />
                    <Input value={recordForm.room} onChange={(event) => setRecordForm((current) => ({ ...current, room: event.target.value }))} placeholder="Room" />
                  </div>
                  <textarea className="min-h-20 w-full rounded-xl border border-input bg-background/40 px-4 py-3 text-sm outline-none focus:border-primary" value={recordForm.diagnosis} onChange={(event) => setRecordForm((current) => ({ ...current, diagnosis: event.target.value }))} placeholder="Diagnosis" />
                  <textarea className="min-h-20 w-full rounded-xl border border-input bg-background/40 px-4 py-3 text-sm outline-none focus:border-primary" value={recordForm.treatment} onChange={(event) => setRecordForm((current) => ({ ...current, treatment: event.target.value }))} placeholder="Treatment" />
                  <textarea className="min-h-20 w-full rounded-xl border border-input bg-background/40 px-4 py-3 text-sm outline-none focus:border-primary" value={recordForm.prescription} onChange={(event) => setRecordForm((current) => ({ ...current, prescription: event.target.value }))} placeholder="Recommendations / prescription" />
                  <textarea className="min-h-20 w-full rounded-xl border border-input bg-background/40 px-4 py-3 text-sm outline-none focus:border-primary" value={recordForm.notes} onChange={(event) => setRecordForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Internal notes" />
                  <label className="flex items-center gap-2 text-sm text-slate-200">
                    <input type="checkbox" checked={recordForm.isSensitive} onChange={(event) => setRecordForm((current) => ({ ...current, isSensitive: event.target.checked }))} />
                    Sensitive record
                  </label>
                  {message ? <p className="text-sm text-slate-200">{message}</p> : null}
                  <Button type="submit" disabled={createRecordMutation.isPending}>{createRecordMutation.isPending ? 'Saving...' : 'Save medical record'}</Button>
                </form>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-2">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                      <CalendarDays className="h-4 w-4 text-accent" />
                      Visit history
                    </h3>
                    {profile.appointments.map((appointment) => (
                      <div key={appointment.id} className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200">
                        <p className="font-medium text-white">{formatDateTime(appointment.scheduledAt)}</p>
                        <p>{appointment.reason} | {appointment.status}</p>
                        <p>Doctor: {appointment.doctor?.fullName ?? '-'}</p>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                      <FileText className="h-4 w-4 text-accent" />
                      Medical records
                    </h3>
                    {profile.medicalRecords.map((record) => (
                      <div key={record.id} className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200">
                        <p className="font-medium text-white">{record.recordType} | {formatDateTime(record.createdAt)}</p>
                        <p>Diagnosis: {record.diagnosis ?? '-'}</p>
                        <p>Treatment: {record.treatment ?? '-'}</p>
                        <p>Recommendations: {record.prescription ?? '-'}</p>
                        <p>Notes: {record.notes ?? '-'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
