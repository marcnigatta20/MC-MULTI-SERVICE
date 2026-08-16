-- 1) Vérifier les valeurs actuelles du type enum
SELECT enumlabel
FROM pg_enum e
JOIN pg_type t ON t.oid = e.enumtypid
WHERE t.typname = 'transaction_status'
ORDER BY e.enumsortorder;

-- 2) Ajouter les valeurs manquantes si elles n'existent pas
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
END $$;

-- 3) Remplir les lignes vides
UPDATE public.transactions
SET status = 'ACTIVE'::transaction_status
WHERE status IS NULL;

-- 4) Si tu veux aussi reconstruire les colonnes manquantes
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS amount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS original_price NUMERIC(12,2),
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
  discount_amount = COALESCE(discount_amount, 0),
  commission_rate = COALESCE(commission_rate, 0),
  commission_amount = COALESCE(commission_amount, 0),
  shop_amount = COALESCE(shop_amount, 0),
  payment_method = COALESCE(payment_method, 'ESPECES'),
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