import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Search, UserRound, Phone, CalendarClock, FileText, ShieldAlert } from 'lucide-react';
import { searchPatients, getPatientProfile, updatePatient, type PatientProfile, type PatientSearchItem } from '@/api/patients';
import { createVisitWithRecord } from '@/api/medical-records';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getAuthUser } from '@/lib/auth-session';

function formatDate(value: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString();
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString();
}

function toDateInput(value: string | null) {
  if (!value) {
    return '';
  }

  return value.slice(0, 10);
}

function toDateTimeInput(value: Date) {
  return new Date(value.getTime() - value.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function normalizeOptional(value: string) {
  return value.trim().length > 0 ? value.trim() : undefined;
}

type PatientEditForm = {
  medicalRecordNumber: string;
  idnp: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  sex: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
};

type VisitRecordForm = {
  scheduledAt: string;
  reason: string;
  room: string;
  recordType: string;
  diagnosis: string;
  treatment: string;
  prescription: string;
  notes: string;
  isSensitive: boolean;
};

const emptyPatientEditForm: PatientEditForm = {
  medicalRecordNumber: '',
  idnp: '',
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  sex: '',
  phone: '',
  email: '',
  address: '',
  notes: ''
};

const emptyVisitRecordForm: VisitRecordForm = {
  scheduledAt: toDateTimeInput(new Date()),
  reason: '',
  room: '',
  recordType: 'consultation',
  diagnosis: '',
  treatment: '',
  prescription: '',
  notes: '',
  isSensitive: false
};

export function PatientsPage() {
  const authUser = getAuthUser();
  const canSearchPatients = authUser?.role === 'ADMIN' || authUser?.role === 'DOCTOR' || authUser?.role === 'RECEPTIONIST';
  const canEditPatient = authUser?.role === 'DOCTOR';
  const canWriteVisits = authUser?.role === 'DOCTOR';
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PatientSearchItem[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [patientEditForm, setPatientEditForm] = useState<PatientEditForm>(emptyPatientEditForm);
  const [visitRecordForm, setVisitRecordForm] = useState<VisitRecordForm>(emptyVisitRecordForm);
  const [patientActionMessage, setPatientActionMessage] = useState<string | null>(null);
  const [visitActionMessage, setVisitActionMessage] = useState<string | null>(null);

  const selectedPatient = useMemo(
    () => results.find((item) => item.id === selectedPatientId) ?? null,
    [results, selectedPatientId]
  );

  const submitSearch = async (event: FormEvent) => {
    event.preventDefault();
    if (query.trim().length < 2) {
      setErrorMessage('Введите минимум 2 символа для поиска по IDNP, ФИО или телефону.');
      return;
    }

    if (!canSearchPatients) {
      setErrorMessage('Поиск пациентов разрешен только для ролей DOCTOR и RECEPTIONIST.');
      return;
    }

    setLoadingSearch(true);
    setErrorMessage(null);
    setProfile(null);
    setSelectedPatientId(null);

    try {
      const payload = await searchMutation.mutateAsync(query.trim());
      setResults(payload);

      if (payload.length === 0) {
        setErrorMessage('Пациенты не найдены.');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось выполнить поиск пациента.';
      setErrorMessage(message);
      setResults([]);
    } finally {
      setLoadingSearch(false);
    }
  };

  const openProfile = async (patientId: string) => {
    setSelectedPatientId(patientId);
    setLoadingProfile(true);
    setErrorMessage(null);

    try {
      const payload = await getPatientProfile(patientId);
      setProfile(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось загрузить анкету пациента.';
      setErrorMessage(message);
      setProfile(null);
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    if (!profile) {
      setPatientEditForm(emptyPatientEditForm);
      setVisitRecordForm(emptyVisitRecordForm);
      return;
    }

    setPatientEditForm({
      medicalRecordNumber: profile.medicalRecordNumber,
      idnp: profile.idnp ?? '',
      firstName: profile.firstName,
      lastName: profile.lastName,
      dateOfBirth: toDateInput(profile.dateOfBirth),
      sex: profile.sex ?? '',
      phone: profile.phone ?? '',
      email: profile.email ?? '',
      address: profile.address ?? '',
      notes: profile.notes ?? ''
    });
    setVisitRecordForm((current) => ({
      ...emptyVisitRecordForm,
      scheduledAt: current.scheduledAt || toDateTimeInput(new Date())
    }));
  }, [profile]);

  const searchMutation = useMutation({
    mutationFn: (q: string) => searchPatients(q)
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<PatientEditForm> }) =>
      updatePatient(id, {
        medicalRecordNumber: normalizeOptional(payload.medicalRecordNumber ?? '') ?? '',
        idnp: normalizeOptional(payload.idnp ?? ''),
        firstName: normalizeOptional(payload.firstName ?? '') ?? '',
        lastName: normalizeOptional(payload.lastName ?? '') ?? '',
        dateOfBirth: normalizeOptional(payload.dateOfBirth ?? ''),
        sex: normalizeOptional(payload.sex ?? ''),
        phone: normalizeOptional(payload.phone ?? ''),
        email: normalizeOptional(payload.email ?? ''),
        address: normalizeOptional(payload.address ?? ''),
        notes: normalizeOptional(payload.notes ?? '')
      })
  });

  const visitMutation = useMutation({
    mutationFn: createVisitWithRecord,
    onSuccess: async () => {
      setVisitActionMessage('Визит и медицинская запись сохранены.');
      if (selectedPatientId) {
        const payload = await getPatientProfile(selectedPatientId);
        setProfile(payload);
      }
    },
    onError: (error) => {
      setVisitActionMessage(error instanceof Error ? error.message : 'Не удалось сохранить визит и запись.');
    }
  });

  const submitPatientUpdate = (event: FormEvent) => {
    event.preventDefault();
    if (!profile) return;

    setPatientActionMessage(null);
    updateMutation.mutate(
      {
        id: profile.id,
        payload: patientEditForm
      },
      {
        onSuccess: async () => {
          setPatientActionMessage('Анкета пациента обновлена.');
          if (selectedPatientId) {
            const payload = await getPatientProfile(selectedPatientId);
            setProfile(payload);
          }
        },
        onError: (error) => {
          setPatientActionMessage(error instanceof Error ? error.message : 'Не удалось обновить анкету пациента.');
        }
      }
    );
  };

  const submitVisitRecord = (event: FormEvent) => {
    event.preventDefault();
    if (!profile) return;

    if (!visitRecordForm.reason.trim() || !visitRecordForm.recordType.trim()) {
      setVisitActionMessage('Заполните причину визита и тип записи.');
      return;
    }

    setVisitActionMessage(null);
    visitMutation.mutate({
      patientId: profile.id,
      scheduledAt: new Date(visitRecordForm.scheduledAt).toISOString(),
      reason: visitRecordForm.reason.trim(),
      room: normalizeOptional(visitRecordForm.room),
      recordType: visitRecordForm.recordType.trim(),
      diagnosis: normalizeOptional(visitRecordForm.diagnosis),
      treatment: normalizeOptional(visitRecordForm.treatment),
      prescription: normalizeOptional(visitRecordForm.prescription),
      notes: normalizeOptional(visitRecordForm.notes),
      isSensitive: visitRecordForm.isSensitive
    });
  };

  return (
    <div className="space-y-6">
      <Card className="border-white/10 bg-slate-950/70">
        <CardHeader>
          <CardTitle>Поиск пациентов</CardTitle>
          <CardDescription>Доступно только для ролей DOCTOR и RECEPTIONIST.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-3 sm:flex-row" onSubmit={submitSearch}>
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="IDNP / Имя Фамилия / номер телефона"
              aria-label="Поиск пациента"
              disabled={!canSearchPatients || loadingSearch}
            />
            <Button type="submit" disabled={!canSearchPatients || loadingSearch}>
              <Search className="h-4 w-4" />
              {loadingSearch ? 'Поиск...' : 'Найти'}
            </Button>
          </form>
          {!canSearchPatients ? <p className="mt-3 text-sm text-amber-300">Для этой роли поиск пациентов недоступен.</p> : null}
          {errorMessage ? <p className="mt-3 text-sm text-rose-300">{errorMessage}</p> : null}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[0.42fr_0.58fr]">
        <Card className="border-white/10 bg-slate-950/70">
          <CardHeader>
            <CardTitle>Результаты</CardTitle>
            <CardDescription>Выберите пациента, чтобы открыть анкету.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {results.length === 0 ? (
              <p className="text-sm text-slate-300">Результаты поиска появятся здесь.</p>
            ) : (
              results.map((patient) => {
                const isActive = patient.id === selectedPatientId;
                return (
                  <button
                    key={patient.id}
                    type="button"
                    onClick={() => openProfile(patient.id)}
                    className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                      isActive ? 'border-primary bg-primary/20' : 'border-white/10 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <p className="text-sm font-semibold text-white">
                      {patient.firstName} {patient.lastName}
                    </p>
                      <p className="text-xs text-slate-300">IDNP: {patient.idnp ?? '-'} • MRN: {patient.medicalRecordNumber}</p>
                    <p className="text-xs text-slate-300">Телефон: {patient.phone ?? '-'}</p>
                  </button>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-slate-950/70">
          <CardHeader>
            <CardTitle>Анкета пациента</CardTitle>
            <CardDescription>
              {selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : 'Выберите пациента из списка'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {loadingProfile ? <p className="text-sm text-slate-300">Загрузка анкеты...</p> : null}

            {!loadingProfile && !profile ? (
              <p className="text-sm text-slate-300">Здесь будут отображаться записи, рекомендации, история болезни и посещения врачей.</p>
            ) : null}

            {!loadingProfile && profile ? (
              <>
                <div className="grid gap-3 rounded-xl border border-white/10 bg-white/5 p-4 sm:grid-cols-2">
                  <p className="flex items-center gap-2 text-sm text-slate-200">
                    <UserRound className="h-4 w-4 text-primary" />
                    {profile.firstName} {profile.lastName}
                  </p>
                  <p className="text-sm text-slate-200">IDNP: {profile.idnp ?? '-'} • MRN: {profile.medicalRecordNumber}</p>
                  <p className="flex items-center gap-2 text-sm text-slate-200">
                    <Phone className="h-4 w-4 text-primary" />
                    {profile.phone ?? '-'}
                  </p>
                  <p className="text-sm text-slate-200">Email: {profile.email ?? '-'}</p>
                  <p className="text-sm text-slate-200">Дата рождения: {formatDate(profile.dateOfBirth)}</p>
                  <p className="text-sm text-slate-200">Пол: {profile.sex ?? '-'}</p>
                  <p className="text-sm text-slate-200 sm:col-span-2">Адрес: {profile.address ?? '-'}</p>
                  <p className="text-sm text-slate-200 sm:col-span-2">Примечания: {profile.notes ?? '-'}</p>
                </div>

                {canEditPatient ? (
                  <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
                    <div>
                      <h3 className="text-sm font-semibold text-white">Редактирование анкеты пациента</h3>
                      <p className="text-xs text-slate-300">Доступно для врача. Изменения сохраняются в базе и появляются в профиле сразу после обновления.</p>
                    </div>
                    <form className="space-y-3" onSubmit={submitPatientUpdate}>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Input value={patientEditForm.medicalRecordNumber} onChange={(event) => setPatientEditForm((current) => ({ ...current, medicalRecordNumber: event.target.value }))} placeholder="MRN" />
                        <Input value={patientEditForm.idnp} onChange={(event) => setPatientEditForm((current) => ({ ...current, idnp: event.target.value }))} placeholder="IDNP" />
                        <Input value={patientEditForm.firstName} onChange={(event) => setPatientEditForm((current) => ({ ...current, firstName: event.target.value }))} placeholder="Имя" />
                        <Input value={patientEditForm.lastName} onChange={(event) => setPatientEditForm((current) => ({ ...current, lastName: event.target.value }))} placeholder="Фамилия" />
                        <Input type="date" value={patientEditForm.dateOfBirth} onChange={(event) => setPatientEditForm((current) => ({ ...current, dateOfBirth: event.target.value }))} />
                        <Input value={patientEditForm.sex} onChange={(event) => setPatientEditForm((current) => ({ ...current, sex: event.target.value }))} placeholder="Пол" />
                        <Input value={patientEditForm.phone} onChange={(event) => setPatientEditForm((current) => ({ ...current, phone: event.target.value }))} placeholder="Телефон" />
                        <Input value={patientEditForm.email} onChange={(event) => setPatientEditForm((current) => ({ ...current, email: event.target.value }))} placeholder="Email" />
                      </div>
                      <Input value={patientEditForm.address} onChange={(event) => setPatientEditForm((current) => ({ ...current, address: event.target.value }))} placeholder="Адрес" />
                      <textarea
                        className="min-h-24 w-full rounded-xl border border-input bg-background/40 px-4 py-3 text-sm outline-none transition focus:border-primary"
                        value={patientEditForm.notes}
                        onChange={(event) => setPatientEditForm((current) => ({ ...current, notes: event.target.value }))}
                        placeholder="Примечания"
                      />
                      {patientActionMessage ? <p className="text-sm text-slate-200">{patientActionMessage}</p> : null}
                      <Button type="submit" disabled={updateMutation.isPending}>
                        {updateMutation.isPending ? 'Сохранение...' : 'Сохранить анкету'}
                      </Button>
                    </form>
                  </div>
                ) : null}

                {canWriteVisits ? (
                  <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
                    <div>
                      <h3 className="text-sm font-semibold text-white">Добавить визит и медицинскую запись</h3>
                      <p className="text-xs text-slate-300">Одна форма создаёт посещение врача и запись в истории болезни одновременно.</p>
                    </div>
                    <form className="space-y-3" onSubmit={submitVisitRecord}>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Input type="datetime-local" value={visitRecordForm.scheduledAt} onChange={(event) => setVisitRecordForm((current) => ({ ...current, scheduledAt: event.target.value }))} />
                        <Input value={visitRecordForm.reason} onChange={(event) => setVisitRecordForm((current) => ({ ...current, reason: event.target.value }))} placeholder="Причина визита" />
                        <Input value={visitRecordForm.recordType} onChange={(event) => setVisitRecordForm((current) => ({ ...current, recordType: event.target.value }))} placeholder="Тип записи, например cardiology" />
                        <Input value={visitRecordForm.room} onChange={(event) => setVisitRecordForm((current) => ({ ...current, room: event.target.value }))} placeholder="Кабинет" />
                      </div>
                      <textarea
                        className="min-h-20 w-full rounded-xl border border-input bg-background/40 px-4 py-3 text-sm outline-none transition focus:border-primary"
                        value={visitRecordForm.diagnosis}
                        onChange={(event) => setVisitRecordForm((current) => ({ ...current, diagnosis: event.target.value }))}
                        placeholder="Диагноз"
                      />
                      <textarea
                        className="min-h-20 w-full rounded-xl border border-input bg-background/40 px-4 py-3 text-sm outline-none transition focus:border-primary"
                        value={visitRecordForm.treatment}
                        onChange={(event) => setVisitRecordForm((current) => ({ ...current, treatment: event.target.value }))}
                        placeholder="Лечение"
                      />
                      <textarea
                        className="min-h-20 w-full rounded-xl border border-input bg-background/40 px-4 py-3 text-sm outline-none transition focus:border-primary"
                        value={visitRecordForm.prescription}
                        onChange={(event) => setVisitRecordForm((current) => ({ ...current, prescription: event.target.value }))}
                        placeholder="Рекомендации / назначения"
                      />
                      <textarea
                        className="min-h-20 w-full rounded-xl border border-input bg-background/40 px-4 py-3 text-sm outline-none transition focus:border-primary"
                        value={visitRecordForm.notes}
                        onChange={(event) => setVisitRecordForm((current) => ({ ...current, notes: event.target.value }))}
                        placeholder="Комментарий к визиту"
                      />
                      <label className="flex items-center gap-2 text-sm text-slate-200">
                        <input
                          type="checkbox"
                          checked={visitRecordForm.isSensitive}
                          onChange={(event) => setVisitRecordForm((current) => ({ ...current, isSensitive: event.target.checked }))}
                        />
                        Sensitive record
                      </label>
                      {visitActionMessage ? <p className="text-sm text-slate-200">{visitActionMessage}</p> : null}
                      <Button type="submit" disabled={visitMutation.isPending}>
                        {visitMutation.isPending ? 'Сохранение...' : 'Добавить визит и запись'}
                      </Button>
                    </form>
                  </div>
                ) : null}

                <div className="space-y-2">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                    <CalendarClock className="h-4 w-4 text-accent" />
                    Посещения врачей ({profile.appointments.length})
                  </h3>
                  <div className="space-y-2">
                    {profile.appointments.length === 0 ? (
                      <p className="text-sm text-slate-300">Нет записей о посещениях.</p>
                    ) : (
                      profile.appointments.map((appointment) => (
                        <div key={appointment.id} className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200">
                          <p className="font-medium text-white">{formatDateTime(appointment.scheduledAt)} • {appointment.status}</p>
                          <p>Причина: {appointment.reason}</p>
                          <p>
                            Врач: {appointment.doctor?.fullName ?? 'Не назначен'}
                            {appointment.doctorProfile?.specialty ? ` (${appointment.doctorProfile.specialty})` : ''}
                          </p>
                          <p>Кабинет: {appointment.room ?? '-'}</p>
                          <p>Комментарий: {appointment.notes ?? '-'}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                    <FileText className="h-4 w-4 text-accent" />
                    История болезни и рекомендации ({profile.medicalRecords.length})
                  </h3>
                  <div className="space-y-2">
                    {profile.medicalRecords.length === 0 ? (
                      <p className="text-sm text-slate-300">Медицинские записи отсутствуют.</p>
                    ) : (
                      profile.medicalRecords.map((record) => (
                        <div key={record.id} className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200">
                          <p className="font-medium text-white">{record.recordType} • {formatDateTime(record.createdAt)}</p>
                          <p>Диагноз: {record.diagnosis ?? '-'}</p>
                          <p>Лечение: {record.treatment ?? '-'}</p>
                          <p>Рекомендации / назначение: {record.prescription ?? '-'}</p>
                          <p>Комментарий: {record.notes ?? '-'}</p>
                          <p>
                            Автор: {record.author?.fullName ?? '-'}
                            {record.author?.doctorProfile?.specialty ? ` • ${record.author.doctorProfile.specialty}` : ''}
                          </p>
                          {record.isSensitive ? (
                            <p className="mt-1 flex items-center gap-1 text-amber-300">
                              <ShieldAlert className="h-4 w-4" /> Sensitive
                            </p>
                          ) : null}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
