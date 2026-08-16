-- Migration 010 : repair missing columns on public.transactions
-- This resolves runtime errors like:
-- "Could not find the 'amount' column of 'transactions' in the schema cache"

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
  status = COALESCE(status, 'ACTIVE'),
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

ALTER TABLE public.transactions
  ALTER COLUMN amount SET DEFAULT 0,
  ALTER COLUMN discount_amount SET DEFAULT 0,
  ALTER COLUMN commission_rate SET DEFAULT 0,
  ALTER COLUMN commission_amount SET DEFAULT 0,
  ALTER COLUMN shop_amount SET DEFAULT 0,
  ALTER COLUMN payment_method SET DEFAULT 'ESPECES',
  ALTER COLUMN status SET DEFAULT 'ACTIVE',
  ALTER COLUMN transaction_date SET DEFAULT CURRENT_DATE;

-- Keep the table compatible with the app’s expected contract.
-- If some rows were created before this migration and have NULLs, this fills them in.
UPDATE public.transactions
SET amount = COALESCE(amount, 0),
    commission_rate = COALESCE(commission_rate, 0),
    commission_amount = COALESCE(commission_amount, 0),
    shop_amount = COALESCE(shop_amount, 0),
    discount_amount = COALESCE(discount_amount, 0)
WHERE amount IS NULL
   OR commission_rate IS NULL
   OR commission_amount IS NULL
   OR shop_amount IS NULL
   OR discount_amount IS NULL;
