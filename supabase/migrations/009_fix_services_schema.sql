-- Repair missing services columns required by the app
-- Some databases were created before all service fields were added.

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE public.services
SET duration_minutes = COALESCE(duration_minutes, 30)
WHERE duration_minutes IS NULL;

UPDATE public.services
SET is_active = COALESCE(is_active, true)
WHERE is_active IS NULL;

UPDATE public.services
SET created_at = COALESCE(created_at, NOW())
WHERE created_at IS NULL;

UPDATE public.services
SET updated_at = COALESCE(updated_at, created_at, NOW())
WHERE updated_at IS NULL;

ALTER TABLE public.services
  ALTER COLUMN duration_minutes SET DEFAULT 30,
  ALTER COLUMN is_active SET DEFAULT true,
  ALTER COLUMN created_at SET DEFAULT NOW(),
  ALTER COLUMN updated_at SET DEFAULT NOW();

-- Seed default services if none exist yet
INSERT INTO public.services (name, description, price, duration_minutes, is_active)
SELECT 'Coupe classique', 'Coupe homme classique', 1500, 30, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.services WHERE LOWER(name) = 'coupe classique'
);

INSERT INTO public.services (name, description, price, duration_minutes, is_active)
SELECT 'Barbe', 'Taillage et finition de barbe', 900, 20, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.services WHERE LOWER(name) = 'barbe'
);

INSERT INTO public.services (name, description, price, duration_minutes, is_active)
SELECT 'Tapering', 'Coupe tapering moderne', 2200, 45, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.services WHERE LOWER(name) = 'tapering'
);

INSERT INTO public.services (name, description, price, duration_minutes, is_active)
SELECT 'Soin visage', 'Soin facial et nettoyage', 1800, 30, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.services WHERE LOWER(name) = 'soin visage'
);
