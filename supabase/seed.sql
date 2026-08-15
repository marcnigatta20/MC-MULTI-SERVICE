-- SEED DATA COMPLET — DÉVELOPPEMENT UNIQUEMENT
-- NE PAS utiliser en production
--
-- ÉTAPE 1 : Créer les utilisateurs dans Supabase Auth (Dashboard → Authentication → Users)
--
-- admin@mcbarber.local       / Admin123!     metadata: {"full_name":"Administrateur","role":"ADMIN"}
-- cashier@mcbarber.local     / Cashier123!   metadata: {"full_name":"Marie Caissière","role":"CAISSIERE"}
--
-- ÉTAPE 2 : Exécuter ce script dans SQL Editor

-- Rôles profiles
UPDATE profiles SET role = 'ADMIN', full_name = 'Administrateur'
  WHERE email = 'admin@mcbarber.local';
UPDATE profiles SET role = 'CAISSIERE', full_name = 'Marie Caissière'
  WHERE email = 'cashier@mcbarber.local';

-- Barbiers Jean, Marc, David
INSERT INTO barbers (full_name, first_name, last_name, phone, email, commission_rate)
SELECT 'Jean Pierre', 'Jean', 'Pierre', '+509 1111 0001', 'jean@mcbarber.local', 40
WHERE NOT EXISTS (SELECT 1 FROM barbers WHERE first_name = 'Jean' AND last_name = 'Pierre');

INSERT INTO barbers (full_name, first_name, last_name, phone, email, commission_rate)
SELECT 'Marc Antoine', 'Marc', 'Antoine', '+509 1111 0002', 'marc@mcbarber.local', 45
WHERE NOT EXISTS (SELECT 1 FROM barbers WHERE first_name = 'Marc');

INSERT INTO barbers (full_name, first_name, last_name, phone, email, commission_rate)
SELECT 'David Louis', 'David', 'Louis', '+509 1111 0003', 'david@mcbarber.local', 40
WHERE NOT EXISTS (SELECT 1 FROM barbers WHERE first_name = 'David');

-- Services
DELETE FROM services WHERE name IN ('Coupe classique', 'Taille barbe', 'Rasage', 'Dégradé');

INSERT INTO services (name, description, price, duration_minutes) VALUES
  ('Coupe', 'Coupe cheveux', 500, 30),
  ('Barbe', 'Taille de barbe', 300, 20),
  ('Coupe + Barbe', 'Coupe complète avec barbe', 800, 45),
  ('Coupe enfant', 'Coupe pour enfant', 400, 25)
ON CONFLICT DO NOTHING;

-- Transactions fictives (7 derniers jours) pour dashboard visible
DO $$
DECLARE
  v_cashier_id UUID;
  v_barber_jean UUID;
  v_barber_marc UUID;
  v_barber_david UUID;
  v_service_coupe UUID;
  v_service_barbe UUID;
  v_service_combo UUID;
  v_cash_register UUID;
  d DATE;
  i INTEGER;
BEGIN
  SELECT id INTO v_cashier_id FROM profiles WHERE email = 'cashier@mcbarber.local' LIMIT 1;
  SELECT id INTO v_barber_jean FROM barbers WHERE first_name = 'Jean' LIMIT 1;
  SELECT id INTO v_barber_marc FROM barbers WHERE first_name = 'Marc' LIMIT 1;
  SELECT id INTO v_barber_david FROM barbers WHERE first_name = 'David' LIMIT 1;
  SELECT id INTO v_service_coupe FROM services WHERE name = 'Coupe' LIMIT 1;
  SELECT id INTO v_service_barbe FROM services WHERE name = 'Barbe' LIMIT 1;
  SELECT id INTO v_service_combo FROM services WHERE name = 'Coupe + Barbe' LIMIT 1;

  IF v_cashier_id IS NULL OR v_barber_jean IS NULL THEN
    RAISE NOTICE 'Seed transactions ignoré : créez d''abord admin@mcbarber.local et cashier@mcbarber.local';
    RETURN;
  END IF;

  -- Caisse ouverte aujourd'hui
  INSERT INTO cash_registers (cashier_id, status, opening_balance)
  SELECT v_cashier_id, 'OPEN', 5000
  WHERE NOT EXISTS (
    SELECT 1 FROM cash_registers WHERE cashier_id = v_cashier_id AND status = 'OPEN'
  )
  RETURNING id INTO v_cash_register;

  IF v_cash_register IS NULL THEN
    SELECT id INTO v_cash_register FROM cash_registers
    WHERE cashier_id = v_cashier_id AND status = 'OPEN' LIMIT 1;
  END IF;

  -- Transactions sur 7 jours
  FOR i IN 0..6 LOOP
    d := CURRENT_DATE - i;

    INSERT INTO transactions (
      barber_id, service_id, cashier_id, cash_register_id,
      amount, original_price, discount_amount, service_name,
      commission_rate, commission_amount, shop_amount,
      payment_method, status, transaction_date, receipt_number
    )
    SELECT v_barber_jean, v_service_coupe, v_cashier_id, v_cash_register,
      500, 500, 0, 'Coupe', 40, 200, 300, 'ESPECES', 'ACTIVE', d,
      'MC-' || TO_CHAR(d, 'YYYYMMDD') || '-SEED01'
    WHERE NOT EXISTS (
      SELECT 1 FROM transactions WHERE receipt_number = 'MC-' || TO_CHAR(d, 'YYYYMMDD') || '-SEED01'
    );

    INSERT INTO transactions (
      barber_id, service_id, cashier_id, cash_register_id,
      amount, original_price, discount_amount, service_name,
      commission_rate, commission_amount, shop_amount,
      payment_method, status, transaction_date, receipt_number
    )
    SELECT v_barber_marc, v_service_combo, v_cashier_id, v_cash_register,
      800, 800, 0, 'Coupe + Barbe', 45, 360, 440, 'ESPECES', 'ACTIVE', d,
      'MC-' || TO_CHAR(d, 'YYYYMMDD') || '-SEED02'
    WHERE NOT EXISTS (
      SELECT 1 FROM transactions WHERE receipt_number = 'MC-' || TO_CHAR(d, 'YYYYMMDD') || '-SEED02'
    );

    INSERT INTO transactions (
      barber_id, service_id, cashier_id, cash_register_id,
      amount, original_price, discount_amount, service_name,
      commission_rate, commission_amount, shop_amount,
      payment_method, status, transaction_date, receipt_number
    )
    SELECT v_barber_david, v_service_barbe, v_cashier_id, v_cash_register,
      300, 300, 0, 'Barbe', 40, 120, 180, 'AUTRE_COMPTOIR', 'ACTIVE', d,
      'MC-' || TO_CHAR(d, 'YYYYMMDD') || '-SEED03'
    WHERE NOT EXISTS (
      SELECT 1 FROM transactions WHERE receipt_number = 'MC-' || TO_CHAR(d, 'YYYYMMDD') || '-SEED03'
    );
  END LOOP;

  RAISE NOTICE 'Seed terminé : transactions fictives créées.';
END $$;

-- Dépense exemple
INSERT INTO expenses (category, amount, description, recorded_by, expense_date)
SELECT 'ELECTRICITE', 2500, 'Facture électricité — demo', p.id, CURRENT_DATE
FROM profiles p WHERE p.email = 'admin@mcbarber.local'
AND NOT EXISTS (
  SELECT 1 FROM expenses WHERE description = 'Facture électricité — demo'
);
