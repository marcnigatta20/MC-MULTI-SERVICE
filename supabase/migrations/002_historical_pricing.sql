-- Migration 002 : prix historiques, remises, barbiers enrichis, caisse
-- Exécuter après 001_initial_schema.sql

-- Transactions : snapshot historique (prix, commission figés à la création)
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS original_price DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS service_name TEXT;

-- Remplir les données existantes
UPDATE transactions t
SET
  original_price = COALESCE(original_price, amount + COALESCE(discount_amount, 0)),
  service_name = COALESCE(service_name, (SELECT name FROM services s WHERE s.id = t.service_id))
WHERE original_price IS NULL OR service_name IS NULL;

-- Barbiers : champs enrichis
ALTER TABLE barbers
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS photo_url TEXT;

UPDATE barbers
SET
  first_name = COALESCE(first_name, split_part(full_name, ' ', 1)),
  last_name = COALESCE(last_name, NULLIF(trim(substring(full_name from position(' ' in full_name) + 1)), ''), split_part(full_name, ' ', 1))
WHERE first_name IS NULL;

-- Caisse : explication obligatoire en cas d'écart
ALTER TABLE cash_registers
  ADD COLUMN IF NOT EXISTS difference_explanation TEXT;

-- Commission : ne recalculer QUE à l'insertion (jamais sur UPDATE/annulation)
DROP TRIGGER IF EXISTS calc_commission ON transactions;

CREATE OR REPLACE FUNCTION calculate_commission_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.commission_rate IS NULL OR NEW.commission_rate = 0 THEN
    SELECT commission_rate INTO NEW.commission_rate FROM barbers WHERE id = NEW.barber_id;
  END IF;
  IF NEW.commission_amount IS NULL OR NEW.commission_amount = 0 THEN
    NEW.commission_amount := ROUND(NEW.amount * NEW.commission_rate / 100, 2);
    NEW.shop_amount := NEW.amount - NEW.commission_amount;
  END IF;
  IF NEW.original_price IS NULL THEN
    NEW.original_price := NEW.amount + COALESCE(NEW.discount_amount, 0);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calc_commission
  BEFORE INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION calculate_commission_on_insert();

-- Vue barbiers enrichie avec CA et nombre de services
CREATE OR REPLACE VIEW barber_balances AS
SELECT
  b.id AS barber_id,
  b.full_name,
  b.first_name,
  b.last_name,
  b.email,
  b.phone,
  b.photo_url,
  b.commission_rate,
  b.is_active,
  b.created_at,
  b.user_id,
  COALESCE(SUM(CASE WHEN t.status = 'ACTIVE' THEN t.amount ELSE 0 END), 0) AS total_revenue,
  COALESCE(COUNT(CASE WHEN t.status = 'ACTIVE' THEN 1 END), 0)::INTEGER AS service_count,
  COALESCE(SUM(CASE WHEN t.status = 'ACTIVE' THEN t.commission_amount ELSE 0 END), 0) AS total_commissions,
  COALESCE(SUM(bp.amount), 0) AS total_paid,
  COALESCE(SUM(CASE WHEN t.status = 'ACTIVE' THEN t.commission_amount ELSE 0 END), 0)
    - COALESCE(SUM(bp.amount), 0) AS balance_due
FROM barbers b
LEFT JOIN transactions t ON t.barber_id = b.id
LEFT JOIN barber_payments bp ON bp.barber_id = b.id
GROUP BY b.id, b.full_name, b.first_name, b.last_name, b.email, b.phone,
         b.photo_url, b.commission_rate, b.is_active, b.created_at, b.user_id;

-- Services exemple (spec utilisateur)
UPDATE services SET price = 500, name = 'Coupe', description = 'Coupe cheveux' WHERE name ILIKE '%coupe classique%' OR name = 'Coupe';
UPDATE services SET price = 300, name = 'Barbe', description = 'Taille de barbe' WHERE name ILIKE '%barbe%' AND name NOT ILIKE '%+%';
UPDATE services SET price = 800, name = 'Coupe + Barbe', description = 'Coupe complète avec barbe' WHERE name ILIKE '%coupe%barbe%' OR name ILIKE '%+%barbe%';

INSERT INTO services (name, description, price, duration_minutes)
SELECT 'Coupe enfant', 'Coupe pour enfant', 400, 25
WHERE NOT EXISTS (SELECT 1 FROM services WHERE name = 'Coupe enfant');

INSERT INTO services (name, description, price, duration_minutes)
SELECT 'Coupe', 'Coupe cheveux', 500, 30
WHERE NOT EXISTS (SELECT 1 FROM services WHERE name = 'Coupe');

INSERT INTO services (name, description, price, duration_minutes)
SELECT 'Barbe', 'Taille de barbe', 300, 20
WHERE NOT EXISTS (SELECT 1 FROM services WHERE name = 'Barbe');

INSERT INTO services (name, description, price, duration_minutes)
SELECT 'Coupe + Barbe', 'Coupe complète avec barbe', 800, 45
WHERE NOT EXISTS (SELECT 1 FROM services WHERE name = 'Coupe + Barbe');

ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'PRODUCT_CREATED';
