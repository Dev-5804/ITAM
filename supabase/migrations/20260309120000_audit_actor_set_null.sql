-- Fix: allow deleting users who have audit log entries.
-- Audit logs are preserved for compliance; actor_id becomes NULL when the user is removed.

ALTER TABLE audit_logs DROP CONSTRAINT audit_logs_actor_id_fkey;
ALTER TABLE audit_logs ALTER COLUMN actor_id DROP NOT NULL;
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_actor_id_fkey
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL;
