-- Migration 005 : rétablir la colonne full_name sur barbers si elle manque
-- Utilisée pour compatibilité avec les requêtes de l'application MC Barber Management

ALTER TABLE public.barbers
  ADD COLUMN IF NOT EXISTS full_name TEXT;

UPDATE public.barbers
SET full_name = TRIM(
  COALESCE(full_name, '') || ' ' ||
  COALESCE(first_name, '') || ' ' ||
  COALESCE(last_name, '')
)
WHERE full_name IS NULL
   OR TRIM(full_name) = '';

UPDATE public.barbers
SET first_name = COALESCE(first_name, split_part(full_name, ' ', 1)),
    last_name = COALESCE(last_name, NULLIF(trim(substring(full_name from position(' ' in full_name) + 1)), ''), split_part(full_name, ' ', 1))
WHERE first_name IS NULL OR last_name IS NULL;

ALTER TABLE public.barbers
  ALTER COLUMN full_name SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_barbers_full_name
  ON public.barbers (full_name);

ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'PRODUCT_CREATED';
