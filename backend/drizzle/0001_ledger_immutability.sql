-- T4.8: Ledger immutability — revoke UPDATE/DELETE at role level
-- The ledger must be append-only. No row should ever be modified or deleted.
--
-- Strategy:
--   1. Create a restricted app role (nepocorp_app) for runtime connections.
--   2. Grant SELECT on all tables, INSERT/UPDATE/DELETE on mutable tables.
--   3. Grant ONLY SELECT + INSERT on ledger (no UPDATE, no DELETE).
--   4. The superuser/owner retains full access for maintenance.
--
-- Usage:
--   psql -d nepocorp -f 0001_ledger_immutability.sql
--   Then update DATABASE_URL to connect as nepocorp_app in production.
--   IMPORTANT: Set the role password via PGPASSWORD env var before running:
--     PGPASSWORD=<secure-password> psql -d nepocorp -f 0001_ledger_immutability.sql

-- Create app role (skip if exists)
-- Password must be set via environment variable; replace :ROLE_PASSWORD with actual value
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'nepocorp_app') THEN
    CREATE ROLE nepocorp_app WITH LOGIN;
  END IF;
END
$$;

-- Set password separately (run: ALTER ROLE nepocorp_app WITH PASSWORD '<from-env>';)
-- This avoids hardcoding credentials in VCS-tracked migration files.

-- Grant schema usage
GRANT USAGE ON SCHEMA public TO nepocorp_app;

-- Grant SELECT on all current and future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO nepocorp_app;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO nepocorp_app;

-- Grant INSERT on all tables (needed for CRUD operations)
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT INSERT ON TABLES TO nepocorp_app;
GRANT INSERT ON ALL TABLES IN SCHEMA public TO nepocorp_app;

-- Grant UPDATE on all current and future tables, then revoke on ledger
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT UPDATE ON TABLES TO nepocorp_app;
GRANT UPDATE ON ALL TABLES IN SCHEMA public TO nepocorp_app;

-- Grant DELETE on all current and future tables, then revoke on ledger
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT DELETE ON TABLES TO nepocorp_app;
GRANT DELETE ON ALL TABLES IN SCHEMA public TO nepocorp_app;

-- Revoke UPDATE and DELETE on ledger (append-only enforcement)
REVOKE UPDATE, DELETE ON ledger FROM nepocorp_app;

-- Grant sequence usage for serial PKs
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO nepocorp_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO nepocorp_app;
