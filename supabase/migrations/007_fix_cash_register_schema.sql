-- Repair missing cash_registers columns for the cashier flow
-- This is required when the DB was created before all cash_register columns were applied.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'cash_register_status'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.cash_register_status AS ENUM ('OPEN', 'CLOSED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'cash_register_status'
      AND n.nspname = 'public'
      AND e.enumlabel = 'OPEN'
  ) THEN
    ALTER TYPE public.cash_register_status ADD VALUE 'OPEN';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'cash_register_status'
      AND n.nspname = 'public'
      AND e.enumlabel = 'CLOSED'
  ) THEN
    ALTER TYPE public.cash_register_status ADD VALUE 'CLOSED';
  END IF;
END $$;

ALTER TABLE public.cash_registers
  ADD COLUMN IF NOT EXISTS cashier_id UUID,
  ADD COLUMN IF NOT EXISTS status cash_register_status,
  ADD COLUMN IF NOT EXISTS opening_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS closing_balance NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS expected_balance NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS difference NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE public.cash_registers
SET status = 'OPEN'
WHERE status IS NULL;

UPDATE public.cash_registers
SET opened_at = COALESCE(opened_at, created_at, NOW())
WHERE opened_at IS NULL;

UPDATE public.cash_registers
SET created_at = COALESCE(created_at, NOW())
WHERE created_at IS NULL;

ALTER TABLE public.cash_registers
  ALTER COLUMN status SET DEFAULT 'OPEN',
  ALTER COLUMN opening_balance SET DEFAULT 0,
  ALTER COLUMN opened_at SET DEFAULT NOW(),
  ALTER COLUMN created_at SET DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'cash_registers_cashier_id_fkey'
  ) THEN
    ALTER TABLE public.cash_registers
      ADD CONSTRAINT cash_registers_cashier_id_fkey
      FOREIGN KEY (cashier_id) REFERENCES public.profiles(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_cash_registers_cashier ON public.cash_registers(cashier_id);
CREATE INDEX IF NOT EXISTS idx_cash_registers_status ON public.cash_registers(status);

-- If a previous partial install created rows without cashier_id, keep them as-is
-- and let new openings populate this field correctly.
