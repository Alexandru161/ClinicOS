<p align="center">
  <img src="frontend/public/clinicos-logo.svg" width="88" height="88" alt="ClinicOS logo" />
</p>

<h1 align="center">ClinicOS</h1>

<p align="center">
  ClinicOS is a medical CRM for everyday clinic work: patients, appointments, staff accounts,
  medical records, CSV imports, and role-based access in one clean workspace.
</p>

---

## What It Does

ClinicOS is built for a small or mid-sized clinic where the front desk, doctors, and administrators need to work from the same data.

- Patients can be imported from CSV and searched by staff.
- Appointments are created with doctor, patient, date, time, status, and conflict checks.
- Doctors can work with their own patient records and visit notes.
- Administrators can manage staff accounts, roles, users, imports, and audit activity.
- Interface settings let users choose language, theme, and scale.

## Stack

- React + Vite + TailwindCSS
- Node.js + Express
- Prisma + PostgreSQL
- Docker Compose + Caddy

## Roles

`ADMIN` sees the whole clinic and manages users, imports, appointments, and records.

`DOCTOR` sees their own appointments, patients, and medical records.

`RECEPTIONIST` can work with patients and appointments, but medical notes stay restricted.

## Local Run

Create environment files from the examples:

```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Start the project:

```bash
docker compose up --build -d
```

Open:

- App: `http://localhost`
- Health check: `http://localhost/api/health`
- Prisma Studio, when started manually: `http://localhost:5555`

The production container runs database migrations on startup. Seed data is not loaded automatically.

## First Admin

On a clean database, open `/register`. The first created account becomes the administrator.

For local development only, you can also create an admin through the manual seed script:

```bash
cd backend
BOOTSTRAP_ADMIN_EMAIL=admin@example.com BOOTSTRAP_ADMIN_PASSWORD='change-me-strongly' npm run prisma:seed
```

Keep real passwords and secrets out of code. Use `.env` files only.

## CSV Patient Import

Admins can import patients from `/admin`.

Required columns:

- `medicalRecordNumber`
- `firstName`
- `lastName`

Optional columns:

- `idnp`
- `dateOfBirth`
- `sex`
- `phone`
- `email`
- `address`
- `notes`

Validation:

- `dateOfBirth` must use `YYYY-MM-DD`
- `idnp` must contain exactly 13 digits
- `email` must be a valid email
- `phone` must look like a phone number

Rows are matched by `medicalRecordNumber`: existing patients are updated, new patients are created.

## Deployment Notes

1. Copy the repository to the server.
2. Create `.env` from `.env.example`.
3. Set strong values for database password, `JWT_SECRET`, `CLINICOS_DATABASE_URL`, and CORS.
4. Run `docker compose up --build -d`.
5. Check `http://your-domain/api/health`.
6. Create the first admin or restore/import clinic data.

## Development

Backend:

```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

## Data Safety

Do not run:

```bash
docker compose down -v
```

That removes the PostgreSQL volume. Use database backups before destructive Docker commands.
