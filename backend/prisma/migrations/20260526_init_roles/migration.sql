-- Migration: 20260526_init_roles
-- Purpose: Ensure platform roles exist in the `roles` table.
BEGIN;

INSERT INTO "roles" (id, code, name, description, "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'ADMIN', 'Administrator', 'Full clinic system access', now(), now()),
  (gen_random_uuid(), 'DOCTOR', 'Doctor', 'Clinical access to assigned patients and appointments', now(), now()),
  (gen_random_uuid(), 'RECEPTIONIST', 'Receptionist', 'Front desk scheduling and patient operations', now(), now())
ON CONFLICT (code) DO NOTHING;

COMMIT;
