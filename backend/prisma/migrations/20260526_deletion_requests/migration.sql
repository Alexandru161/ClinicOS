-- Migration: 20260526_deletion_requests
-- Purpose: Create table for doctor-initiated deletion requests of medical records
BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medical_record_id uuid NOT NULL,
  requester_id uuid NULL,
  reason text,
  status varchar(16) NOT NULL DEFAULT 'PENDING',
  reviewed_by uuid NULL,
  reviewed_at timestamp with time zone NULL,
  metadata jsonb NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE deletion_requests
  ADD CONSTRAINT fk_deletion_medical_record FOREIGN KEY (medical_record_id) REFERENCES medical_records(id) ON DELETE CASCADE;

ALTER TABLE deletion_requests
  ADD CONSTRAINT fk_deletion_requester FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_deletion_requests_status ON deletion_requests(status);

COMMIT;
