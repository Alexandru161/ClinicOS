# ClinicOS

ClinicOS is a production-ready medical clinic management system scaffold built with React, Vite, TailwindCSS, shadcn/ui patterns, Node.js, Express, PostgreSQL, Prisma, JWT, bcrypt, Docker, Docker Compose, and Caddy.

## Stack

- Frontend: React + Vite + TailwindCSS + shadcn/ui-style primitives
- Backend: Node.js + Express + Prisma
- Database: PostgreSQL
- Authentication: JWT + bcrypt
- Deployment: Docker + Docker Compose
- Reverse proxy: Caddy
- Roles: ADMIN, DOCTOR, RECEPTIONIST

## Project Structure

```text
ClinicOS/
  frontend/
    src/
      api/
      components/
      lib/
      pages/
    Dockerfile
    package.json
    tailwind.config.ts
    vite.config.ts
  backend/
    prisma/
    src/
      config/
      middleware/
      modules/
      routes/
      types/
      utils/
    Dockerfile
    package.json
    tsconfig.json
  docker-compose.yml
  Caddyfile
  README.md
```

## What is included

- Clean service-oriented backend structure with auth, patients, appointments, and user routes
- Prisma schema with `User`, `Patient`, `Appointment`, and `AuditLog` models
- Bootstrap admin flow for the first account, then admin-only staff creation
- Responsive dashboard and login shell on the frontend
- Shared UI primitives in a shadcn/ui-compatible style
- Dockerized app flow with PostgreSQL and Caddy reverse proxy

## Environment Variables

Copy the example environment files before running the stack:

- `backend/.env.example` -> `backend/.env`
- `frontend/.env.example` -> `frontend/.env`

Backend variables:

- `NODE_ENV`
- `PORT`
- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `CORS_ORIGIN`

Frontend variables:

- `VITE_API_BASE_URL`

## Local Development

1. Install dependencies in `frontend/` and `backend/`.
2. Generate Prisma client and apply migrations from `backend/`.
3. Run the backend API and frontend Vite server separately.

Example commands:

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

```bash
cd frontend
npm install
npm run dev
```

## Docker

Bring up the stack with:

```bash
docker compose up --build
```

The flow is:

- PostgreSQL starts first
- The backend applies Prisma migrations and starts on port 4000
- The frontend builds into a shared static volume
- Caddy serves the frontend and proxies `/api` to the backend

## API Surface

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/patients`
- `POST /api/patients`
- `GET /api/appointments`
- `POST /api/appointments`
- `GET /api/users`

## Next Steps

- Add validation middleware around patient and appointment creation
- Add pagination, filtering, and audit logging helpers
- Expand the frontend into authenticated role-based routes
- Add seeded demo users and fixture data
