import { useMemo, useState, type ChangeEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2, Edit3, Eye, EyeOff, Shield, CheckCircle2, AlertCircle, UserPlus } from 'lucide-react';
import {
  createUser,
  getUsers,
  updateUser,
  deleteUser,
  getAuditLogs,
  getSystemOverview,
  type CreateUserPayload,
  type UserRole,
  type UpdateUserPayload
} from '@/api/admin';
import { importPatientsFromCsv, type PatientImportResponse } from '@/api/patients';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const roleOptions: UserRole[] = ['ADMIN', 'DOCTOR', 'RECEPTIONIST'];
const specialtyOptions = [
  'Cardiolog',
  'Endocrinolog',
  'Neurolog',
  'Pediatru',
  'Chirurg',
  'Dermatolog',
  'ORL',
  'Ginecolog',
  'Oftalmolog',
  'Medic de familie',
  'Urolog',
  'Psihiatru',
  'Oncolog',
  'Reumatolog',
  'Traumatolog',
  'Pneumolog',
  'Gastroenterolog',
  'Nefrolog',
  'Anesteziolog',
  'Radiolog'
];

const requiredPatientColumns = ['medicalRecordNumber', 'firstName', 'lastName'];
const optionalPatientColumns = ['idnp', 'dateOfBirth', 'sex', 'phone', 'email', 'address', 'notes'];

type CsvPreviewRow = {
  rowNumber: number;
  values: string[];
};

type CsvPreview = {
  headers: string[];
  rows: CsvPreviewRow[];
  totalRows: number;
  missingRequiredColumns: string[];
  error: string | null;
};

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += character;
  }

  values.push(current.trim());
  return values;
}

function parseCsvPreview(csv: string): CsvPreview {
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return {
      headers: [],
      rows: [],
      totalRows: 0,
      missingRequiredColumns: requiredPatientColumns.slice(),
      error: null
    };
  }

  const headers = parseCsvLine(lines[0]);
  const normalizedHeaders = headers.map((header) => header.trim());
  const missingRequiredColumns = requiredPatientColumns.filter(
    (column) => !normalizedHeaders.some((header) => header.toLowerCase() === column.toLowerCase())
  );

  const previewRows = lines.slice(1, 6).map((line, index) => ({
    rowNumber: index + 2,
    values: parseCsvLine(line)
  }));

  return {
    headers: normalizedHeaders,
    rows: previewRows,
    totalRows: Math.max(lines.length - 1, 0),
    missingRequiredColumns,
    error: lines.length < 2 ? 'CSV file must contain a header row and at least one patient row.' : null
  };
}

function roleColor(role: UserRole) {
  if (role === 'ADMIN') return 'bg-red-500/15 text-red-300';
  if (role === 'DOCTOR') return 'bg-blue-500/15 text-blue-300';
  return 'bg-slate-500/15 text-slate-300';
}

export function AdminPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [logsPage, setLogsPage] = useState(1);
  const [filterAction, setFilterAction] = useState('');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<UpdateUserPayload>({});
  const [editError, setEditError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<CreateUserPayload>({
    email: '',
    password: '',
    fullName: '',
    role: 'RECEPTIONIST',
    specialty: ''
  });
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [patientImportCsvText, setPatientImportCsvText] = useState('');
  const [patientImportError, setPatientImportError] = useState<string | null>(null);
  const [patientImportResult, setPatientImportResult] = useState<PatientImportResponse | null>(null);
  const [patientImportFileName, setPatientImportFileName] = useState<string | null>(null);

  const usersQuery = useQuery({ queryKey: ['admin-users'], queryFn: getUsers });
  const overviewQuery = useQuery({ queryKey: ['admin-overview'], queryFn: getSystemOverview });
  const logsQuery = useQuery({
    queryKey: ['admin-logs', logsPage, filterAction],
    queryFn: () => getAuditLogs({ page: logsPage, limit: 20, action: filterAction || undefined })
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ userId, payload }: { userId: string; payload: UpdateUserPayload }) => updateUser(userId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
      setEditingUserId(null);
      setEditForm({});
      setEditError(null);
    },
    onError: (error) => {
      setEditError(error instanceof Error ? error.message : 'Failed to update user');
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
    }
  });

  const createUserMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
      setCreateForm({ email: '', password: '', fullName: '', role: 'RECEPTIONIST', specialty: '' });
      setCreateError(null);
      setCreateSuccess('Staff account created successfully.');
    },
    onError: (error) => {
      setCreateSuccess(null);
      setCreateError(error instanceof Error ? error.message : 'Failed to create user');
    }
  });

  const patientImportMutation = useMutation({
    mutationFn: importPatientsFromCsv,
    onSuccess: (payload) => {
      setPatientImportError(null);
      setPatientImportResult(payload);
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
    onError: (error) => {
      setPatientImportResult(null);
      setPatientImportError(error instanceof Error ? error.message : 'Failed to import patients');
    }
  });

  const handleEditClick = (userId: string, currentRole: UserRole, currentActive: boolean) => {
    setEditingUserId(userId);
    setEditForm({ role: currentRole, isActive: currentActive });
    setEditError(null);
  };

  const handleSaveEdit = () => {
    if (!editingUserId) return;
    if (!editForm.role) {
      setEditError('Select a role');
      return;
    }
    updateUserMutation.mutate({ userId: editingUserId, payload: editForm });
  };

  const handleDeleteClick = (userId: string) => {
    if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      deleteUserMutation.mutate(userId);
    }
  };

  const handleCreateUser = () => {
    setCreateError(null);
    setCreateSuccess(null);

    if (!createForm.email || !createForm.password || !createForm.fullName) {
      setCreateError('Email, full name, and password are required.');
      return;
    }

    if (createForm.role === 'DOCTOR' && !createForm.specialty?.trim()) {
      setCreateError('Choose a specialty for doctor accounts.');
      return;
    }

    createUserMutation.mutate({
      email: createForm.email.trim(),
      password: createForm.password,
      fullName: createForm.fullName.trim(),
      role: createForm.role,
      specialty: createForm.role === 'DOCTOR' ? createForm.specialty?.trim() : undefined
    });
  };

  const handleImportPatients = () => {
    setPatientImportError(null);
    setPatientImportResult(null);

    if (!patientImportCsvText.trim()) {
      setPatientImportError('Choose a CSV file first.');
      return;
    }

    patientImportMutation.mutate(patientImportCsvText);
  };

  const handlePatientFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setPatientImportError('Please upload a .csv file.');
      return;
    }

    const text = await file.text();
    setPatientImportCsvText(text);
    setPatientImportFileName(file.name);
    setPatientImportError(null);
    setPatientImportResult(null);
  };

  const patientImportPreview = useMemo(() => parseCsvPreview(patientImportCsvText), [patientImportCsvText]);

  const stats = overviewQuery.data;
  const users = usersQuery.data ?? [];
  const logsData = logsQuery.data?.data;
  const logsMeta = logsQuery.data?.meta;

  return (
    <div className="min-w-0 space-y-6 overflow-x-hidden">
      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-white/10 bg-slate-950/70">
          <CardHeader>
            <CardTitle>Import patients from CSV file</CardTitle>
            <CardDescription>Upload a CSV file, preview the rows, then import the patients into ClinicOS.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200" htmlFor="patient-import-file">CSV file</label>
              <Input id="patient-import-file" type="file" accept=".csv,text/csv" onChange={handlePatientFileChange} />
              {patientImportFileName ? <p className="text-xs text-slate-400">Loaded file: {patientImportFileName}</p> : null}
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-slate-300">
              Required columns: medicalRecordNumber, firstName, lastName. Optional: {optionalPatientColumns.join(', ')}.
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-slate-300">
              Preview rows: {patientImportPreview.totalRows}. {patientImportPreview.error ? patientImportPreview.error : null}
              {patientImportPreview.missingRequiredColumns.length > 0 ? (
                <span className="block text-rose-300">Missing required columns: {patientImportPreview.missingRequiredColumns.join(', ')}.</span>
              ) : null}
            </div>
            {patientImportPreview.headers.length > 0 ? (
              <div className="overflow-hidden rounded-xl border border-white/10 bg-slate-950/55">
                <table className="w-full table-fixed text-left text-xs">
                  <thead className="border-b border-white/10 text-slate-300">
                    <tr>
                      <th className="w-12 px-3 py-2 font-semibold">#</th>
                      {patientImportPreview.headers.map((header) => (
                        <th key={header} className="break-words px-3 py-2 font-semibold">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {patientImportPreview.rows.map((row) => (
                      <tr key={row.rowNumber} className="border-t border-white/5">
                        <td className="px-3 py-2 text-slate-400">{row.rowNumber}</td>
                        {row.values.map((value, index) => (
                          <td key={`${row.rowNumber}-${index}`} className="break-words px-3 py-2 text-slate-200">
                            {value || '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
            {patientImportError ? <p className="text-sm text-rose-300">{patientImportError}</p> : null}
            {patientImportResult ? (
              <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200">
                <p className="font-semibold text-white">Import summary</p>
                <p>Created: {patientImportResult.summary.created}</p>
                <p>Updated: {patientImportResult.summary.updated}</p>
                <p>Skipped: {patientImportResult.summary.skipped}</p>
                <p>Errors: {patientImportResult.summary.errors}</p>
                <div className="mt-3 space-y-1 text-xs text-slate-300">
                  {patientImportResult.results.map((result) => (
                    <p key={`${result.row}-${result.medicalRecordNumber ?? 'row'}`}>
                      Row {result.row}: {result.medicalRecordNumber ?? 'n/a'} - {result.status}
                      {result.message ? ` (${result.message})` : ''}
                    </p>
                  ))}
                </div>
              </div>
            ) : null}
            <Button className="w-full" onClick={handleImportPatients} disabled={patientImportMutation.isPending}>
              {patientImportMutation.isPending ? 'Importing...' : 'Import patients'}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-slate-950/70">
          <CardHeader>
            <CardTitle>CSV template</CardTitle>
            <CardDescription>Use this structure when exporting a table from Excel or Google Sheets.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-300">
            <pre className="whitespace-pre-wrap break-words rounded-xl border border-white/10 bg-slate-950/60 p-3 text-xs leading-6 text-slate-200">medicalRecordNumber,idnp,firstName,lastName,dateOfBirth,sex,phone,email,address,notes{"\n"}MRN-1001,1234567890123,John,Smith,1988-03-20,M,0790000000,john@example.com,Main street 1,Imported from CSV</pre>
            <p>Rows are matched by medicalRecordNumber. Existing patients are updated, new ones are created.</p>
            <p>For your table, keep these columns in the first row: medicalRecordNumber, firstName, lastName, and optionally idnp, dateOfBirth, sex, phone, email, address, notes.</p>
            <p>Export the sheet as CSV, choose the file above, verify the preview, then import.</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="border-white/10 bg-slate-950/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-primary" />
              Create staff account
            </CardTitle>
            <CardDescription>Create a staff account for clinic access.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200" htmlFor="create-fullName">Full name</label>
              <Input
                id="create-fullName"
                value={createForm.fullName}
                onChange={(event) => setCreateForm((current) => ({ ...current, fullName: event.target.value }))}
                placeholder="Dr. Jane Smith"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200" htmlFor="create-email">Email</label>
              <Input
                id="create-email"
                type="email"
                value={createForm.email}
                onChange={(event) => setCreateForm((current) => ({ ...current, email: event.target.value }))}
                placeholder="jane@clinic.local"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200" htmlFor="create-password">Password</label>
              <Input
                id="create-password"
                type="password"
                value={createForm.password}
                onChange={(event) => setCreateForm((current) => ({ ...current, password: event.target.value }))}
                placeholder="Minimum 12 characters"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200" htmlFor="create-role">Role</label>
              <select
                id="create-role"
                className="h-11 w-full rounded-xl border border-input bg-background/40 px-4 py-2 text-sm"
                value={createForm.role}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    role: event.target.value as UserRole,
                    specialty: event.target.value === 'DOCTOR' ? current.specialty : ''
                  }))
                }
              >
                {roleOptions.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>
            {createForm.role === 'DOCTOR' ? (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200" htmlFor="create-specialty">Specialty</label>
                <select
                  id="create-specialty"
                  className="h-11 w-full rounded-xl border border-input bg-background/40 px-4 py-2 text-sm"
                  value={createForm.specialty ?? ''}
                  onChange={(event) => setCreateForm((current) => ({ ...current, specialty: event.target.value }))}
                >
                  <option value="">Choose specialty</option>
                  {specialtyOptions.map((specialty) => (
                    <option key={specialty} value={specialty}>{specialty}</option>
                  ))}
                </select>
              </div>
            ) : null}
            {createError ? <p className="text-sm text-rose-300">{createError}</p> : null}
            {createSuccess ? <p className="text-sm text-green-300">{createSuccess}</p> : null}
            <Button className="w-full" onClick={handleCreateUser} disabled={createUserMutation.isPending}>
              {createUserMutation.isPending ? 'Creating...' : 'Create user'}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-slate-950/70">
          <CardHeader>
            <CardTitle>Database-backed auth</CardTitle>
            <CardDescription>
              Accounts created here are stored in `users` and can log in immediately with the password you set.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-300">
            <p>Use this panel instead of hardcoded scripts or demo seeds.</p>
            <p>Passwords are hashed server-side before they are saved.</p>
            <p>After creation, the user can sign in through the normal login page.</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-white/10 bg-slate-950/70">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Shield className="h-3.5 w-3.5" />
              Total users
            </CardDescription>
            <CardTitle className="text-2xl">{stats?.users.total ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-white/10 bg-slate-950/70">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Active users
            </CardDescription>
            <CardTitle className="text-2xl">{stats?.users.active ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-white/10 bg-slate-950/70">
          <CardHeader className="pb-2">
            <CardDescription>Audit logs</CardDescription>
            <CardTitle className="text-2xl">{stats?.auditLogs.total ?? 0}</CardTitle>
            <p className="mt-1 text-xs text-slate-400">{stats?.auditLogs.today ?? 0} today</p>
          </CardHeader>
        </Card>
        <Card className="border-white/10 bg-slate-950/70">
          <CardHeader className="pb-2">
            <CardDescription>Staff breakdown</CardDescription>
            <div className="mt-2 space-y-0.5 text-xs">
              <p>
                <span className="inline-block w-16">Admin:</span>
                <span className="font-semibold">{stats?.users.byRole.admin ?? 0}</span>
              </p>
              <p>
                <span className="inline-block w-16">Doctor:</span>
                <span className="font-semibold">{stats?.users.byRole.doctor ?? 0}</span>
              </p>
              <p>
                <span className="inline-block w-16">Reception:</span>
                <span className="font-semibold">{stats?.users.byRole.receptionist ?? 0}</span>
              </p>
            </div>
          </CardHeader>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.6fr_1.4fr]">
        <Card className="border-white/10 bg-slate-950/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-primary" />
              Recent actions
            </CardTitle>
            <CardDescription>Last 10 system events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(stats?.recentActions ?? []).map((log) => (
                <div key={log.id} className="rounded-lg border border-white/10 bg-white/5 p-2 text-xs">
                  <p className="font-semibold text-white">
                    {log.actor?.fullName ?? 'System'} • {log.action}
                  </p>
                  <p className="text-slate-400">{log.entity} • {new Date(log.createdAt).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-slate-950/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              User management
            </CardTitle>
            <CardDescription>Manage roles, status, and permissions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {users.length === 0 ? (
                <p className="text-sm text-slate-300">No users found.</p>
              ) : (
                users.map((user) => (
                  <div key={user.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                    {editingUserId === user.id ? (
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs text-slate-400">Name</p>
                          <p className="font-semibold text-white">{user.fullName}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 mb-1">Role</p>
                          <select
                            className="h-9 w-full rounded-lg border border-input bg-background/40 px-3 py-1.5 text-sm"
                            value={editForm.role || user.role}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, role: e.target.value as UserRole }))}
                          >
                            {roleOptions.map((role) => (
                              <option key={role} value={role}>
                                {role}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex gap-2">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={editForm.isActive ?? user.isActive}
                              onChange={(e) => setEditForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                              className="rounded border border-input"
                            />
                            <span className="text-xs text-slate-300">Active</span>
                          </label>
                        </div>
                        {editError ? <p className="text-xs text-rose-300">{editError}</p> : null}
                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleSaveEdit} disabled={updateUserMutation.isPending}>
                            Save
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingUserId(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-white">{user.fullName}</p>
                            <p className="text-xs text-slate-400">{user.email}</p>
                          </div>
                          <Badge className={roleColor(user.role)}>{user.role}</Badge>
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-xs text-slate-300">
                          {user.isActive ? (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                              Active
                            </>
                          ) : (
                            <>
                              <EyeOff className="h-3.5 w-3.5 text-amber-400" />
                              Disabled
                            </>
                          )}
                          <span className="text-slate-500">•</span>
                          <span>{new Date(user.createdAt).toLocaleDateString()}</span>
                        </div>
                        {user.role === 'DOCTOR' ? (
                          <p className="mt-2 text-xs text-cyan-300">
                            Specialty: {user.doctorProfile?.specialty ?? 'not set'}
                          </p>
                        ) : null}
                        <div className="mt-3 flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditClick(user.id, user.role, user.isActive)}
                            className="gap-1"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteClick(user.id)}
                            disabled={deleteUserMutation.isPending}
                            className="gap-1 text-rose-300"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="border-white/10 bg-slate-950/70">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" />
              Activity logs
            </CardTitle>
            <CardDescription>System audit trail of all actions</CardDescription>
          </div>
          <Input
            placeholder="Filter by action (e.g., create:user, update:appointment)"
            value={filterAction}
            onChange={(e) => {
              setFilterAction(e.target.value);
              setLogsPage(1);
            }}
            className="max-w-xs"
          />
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden">
            <table className="w-full table-fixed text-sm">
              <thead className="border-b border-white/10 text-left text-xs uppercase text-slate-400">
                <tr>
                  <th className="w-[32%] pb-2 pr-3 font-semibold">Actor</th>
                  <th className="w-[24%] pb-2 pr-3 font-semibold">Action</th>
                  <th className="w-[18%] pb-2 pr-3 font-semibold">Entity</th>
                  <th className="w-[26%] pb-2 font-semibold">Date / Time</th>
                </tr>
              </thead>
              <tbody className="space-y-1 divide-y divide-white/5">
                {logsData && logsData.length > 0 ? (
                  logsData.map((log) => (
                    <tr key={log.id} className="border-white/5 hover:bg-white/5">
                      <td className="break-words py-2 pr-3">
                        <div>
                          <p className="font-medium text-white">{log.actor?.fullName ?? 'System'}</p>
                          <p className="text-xs text-slate-400">{log.actor?.email ?? '-'}</p>
                        </div>
                      </td>
                      <td className="break-words py-2 pr-3">
                        <Badge variant="secondary" className="max-w-full whitespace-normal break-words text-xs">
                          {log.action}
                        </Badge>
                      </td>
                      <td className="break-words py-2 pr-3 text-slate-300">{log.entity}</td>
                      <td className="break-words py-2 text-slate-400">{new Date(log.createdAt).toLocaleString()}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-slate-300">
                      No logs found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-400">
              Page {logsPage} of {logsMeta?.totalPages ?? 1} ({logsMeta?.total ?? 0} total)
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" disabled={logsPage <= 1} onClick={() => setLogsPage((p) => p - 1)}>
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!logsMeta || logsPage >= logsMeta.totalPages}
                onClick={() => setLogsPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
