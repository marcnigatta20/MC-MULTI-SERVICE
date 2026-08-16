-- Repair missing audit_logs columns required by the app
-- Some databases were created before all audit tracking columns were added.

ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS ip_address TEXT;

UPDATE public.audit_logs
SET details = '{}'::jsonb
WHERE details IS NULL;

CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);