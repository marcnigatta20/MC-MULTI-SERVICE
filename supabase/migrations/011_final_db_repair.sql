-- Final database repair for MC Barber Management
-- Run this in the Supabase SQL editor when the live schema is out of sync.

-- 1) Ensure enum values exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'transaction_status' AND e.enumlabel = 'ACTIVE'
  ) THEN
    ALTER TYPE transaction_status ADD VALUE 'ACTIVE';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'transaction_status' AND e.enumlabel = 'CANCELLED'
  ) THEN
    ALTER TYPE transaction_status ADD VALUE 'CANCELLED';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'payment_method' AND e.enumlabel = 'ESPECES'
  ) THEN
    ALTER TYPE payment_method ADD VALUE 'ESPECES';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'payment_method' AND e.enumlabel = 'AUTRE_COMPTOIR'
  ) THEN
    ALTER TYPE payment_method ADD VALUE 'AUTRE_COMPTOIR';
  END IF;
END $$;

-- 2) Repair transactions table
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS amount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS original_price NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS service_price NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS total_amount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS service_name TEXT,
  ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS commission_amount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS shop_amount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS payment_method payment_method,
  ADD COLUMN IF NOT EXISTS status transaction_status,
  ADD COLUMN IF NOT EXISTS client_name TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_by UUID,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS transaction_date DATE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;

UPDATE public.transactions
SET
  amount = COALESCE(amount, 0),
  service_price = COALESCE(service_price, original_price, amount),
  total_amount = COALESCE(total_amount, amount, original_price),
  discount_amount = COALESCE(discount_amount, 0),
  commission_rate = COALESCE(commission_rate, 0),
  commission_amount = COALESCE(commission_amount, 0),
  shop_amount = COALESCE(shop_amount, 0),
  payment_method = COALESCE(payment_method, 'ESPECES'::payment_method),
  status = COALESCE(status, 'ACTIVE'::transaction_status),
  transaction_date = COALESCE(transaction_date, created_at::date, CURRENT_DATE)
WHERE amount IS NULL
   OR discount_amount IS NULL
   OR commission_rate IS NULL
   OR commission_amount IS NULL
   OR shop_amount IS NULL
   OR payment_method IS NULL
   OR status IS NULL
   OR transaction_date IS NULL;

UPDATE public.transactions t
SET
  original_price = COALESCE(t.original_price, t.amount + COALESCE(t.discount_amount, 0)),
  service_name = COALESCE(t.service_name, s.name)
FROM public.services s
WHERE t.service_id = s.id
  AND (t.original_price IS NULL OR t.service_name IS NULL);

-- 3) Repair cash_registers table
ALTER TABLE public.cash_registers
  ADD COLUMN IF NOT EXISTS cashier_id UUID,
  ADD COLUMN IF NOT EXISTS status TEXT,
  ADD COLUMN IF NOT EXISTS opening_balance NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS closing_balance NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS expected_balance NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS difference NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS difference_explanation TEXT,
  ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

UPDATE public.cash_registers
SET
  status = COALESCE(status, 'OPEN'),
  opening_balance = COALESCE(opening_balance, 0),
  opened_at = COALESCE(opened_at, created_at, NOW())
WHERE status IS NULL OR opening_balance IS NULL OR opened_at IS NULL;

-- 4) Repair audit_logs table
ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS ip_address TEXT;

-- 5) Repair services table
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

UPDATE public.services
SET
  description = COALESCE(description, ''),
  is_active = COALESCE(is_active, TRUE),
  duration_minutes = COALESCE(duration_minutes, 0),
  updated_at = COALESCE(updated_at, NOW())
WHERE description IS NULL OR is_active IS NULL OR duration_minutes IS NULL OR updated_at IS NULL;

-- 6) Final safety: ensure trigger for receipt generation exists
CREATE OR REPLACE FUNCTION public.generate_receipt_number()
RETURNS TRIGGER AS $$
DECLARE
  seq_num INTEGER;
  date_prefix TEXT;
BEGIN
  date_prefix := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');
  SELECT COALESCE(MAX(CAST(SPLIT_PART(receipt_number, '-', 3) AS INTEGER)), 0) + 1
  INTO seq_num
  FROM public.transactions
  WHERE receipt_number LIKE 'MC-' || date_prefix || '-%';

  IF NEW.receipt_number IS NULL OR NEW.receipt_number = '' THEN
    NEW.receipt_number := 'MC-' || date_prefix || '-' || LPAD(seq_num::TEXT, 4, '0');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_receipt_number ON public.transactions;
CREATE TRIGGER set_receipt_number
  BEFORE INSERT ON public.transactions
  FOR EACH ROW
  WHEN (NEW.receipt_number IS NULL OR NEW.receipt_number = '')
  EXECUTE FUNCTION public.generate_receipt_number();

-- 7) Optional: normalize current rows for transactions with NULL status
UPDATE public.transactions
SET status = 'ACTIVE'::transaction_status
WHERE status IS NULL;
