-- MC Barber Management - Schéma initial
-- Exécuter ce script dans l'éditeur SQL Supabase

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum types
CREATE TYPE user_role AS ENUM ('ADMIN', 'CAISSIERE', 'BARBER', 'COMPTABLE');
CREATE TYPE payment_method AS ENUM ('ESPECES', 'AUTRE_COMPTOIR');
CREATE TYPE transaction_status AS ENUM ('ACTIVE', 'CANCELLED');
CREATE TYPE cash_register_status AS ENUM ('OPEN', 'CLOSED');
CREATE TYPE expense_category AS ENUM ('FOURNITURES', 'LOYER', 'SALAIRE', 'MAINTENANCE', 'AUTRE');
CREATE TYPE audit_action AS ENUM (
  'LOGIN', 'LOGOUT', 'SALE_CREATED', 'SALE_CANCELLED', 'PAYMENT_RECORDED',
  'CASH_OPENED', 'CASH_CLOSED', 'EXPENSE_CREATED', 'BARBER_PAYMENT',
  'USER_CREATED', 'USER_UPDATED', 'SERVICE_CREATED', 'SERVICE_UPDATED',
  'COMMISSION_UPDATED', 'SETTINGS_UPDATED', 'PRODUCT_CREATED'
);

-- Profiles (lié à auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'CAISSIERE',
  is_active BOOLEAN NOT NULL DEFAULT true,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Barbiers
CREATE TABLE barbers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  commission_rate DECIMAL(5,2) NOT NULL DEFAULT 40.00 CHECK (commission_rate >= 0 AND commission_rate <= 100),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Services
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(12,2) NOT NULL CHECK (price >= 0),
  duration_minutes INTEGER DEFAULT 30,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Paramètres globaux
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id)
);

INSERT INTO settings (key, value) VALUES
  ('shop_name', '"MC Barber Management"'),
  ('default_commission_rate', '40'),
  ('currency', '"HTG"');

-- Sessions de caisse
CREATE TABLE cash_registers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cashier_id UUID NOT NULL REFERENCES profiles(id),
  status cash_register_status NOT NULL DEFAULT 'OPEN',
  opening_balance DECIMAL(12,2) NOT NULL DEFAULT 0,
  closing_balance DECIMAL(12,2),
  expected_balance DECIMAL(12,2),
  difference DECIMAL(12,2),
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Transactions (ventes)
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  receipt_number TEXT UNIQUE NOT NULL,
  barber_id UUID NOT NULL REFERENCES barbers(id),
  service_id UUID NOT NULL REFERENCES services(id),
  cashier_id UUID NOT NULL REFERENCES profiles(id),
  cash_register_id UUID REFERENCES cash_registers(id),
  amount DECIMAL(12,2) NOT NULL CHECK (amount >= 0),
  commission_rate DECIMAL(5,2) NOT NULL,
  commission_amount DECIMAL(12,2) NOT NULL,
  shop_amount DECIMAL(12,2) NOT NULL,
  payment_method payment_method NOT NULL DEFAULT 'ESPECES',
  status transaction_status NOT NULL DEFAULT 'ACTIVE',
  client_name TEXT,
  notes TEXT,
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES profiles(id),
  cancellation_reason TEXT,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Paiements aux barbiers
CREATE TABLE barber_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barber_id UUID NOT NULL REFERENCES barbers(id),
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  payment_method payment_method NOT NULL DEFAULT 'ESPECES',
  paid_by UUID NOT NULL REFERENCES profiles(id),
  notes TEXT,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Dépenses
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category expense_category NOT NULL DEFAULT 'AUTRE',
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  recorded_by UUID NOT NULL REFERENCES profiles(id),
  cash_register_id UUID REFERENCES cash_registers(id),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Journal d'audit
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  action audit_action NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_transactions_barber ON transactions(barber_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_cash_registers_cashier ON cash_registers(cashier_id);
CREATE INDEX idx_cash_registers_status ON cash_registers(status);
CREATE INDEX idx_barber_payments_barber ON barber_payments(barber_id);
CREATE INDEX idx_expenses_date ON expenses(expense_date);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

-- Fonction: créer profil à l'inscription
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'CAISSIERE')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Fonction: numéro de reçu auto
CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS TRIGGER AS $$
DECLARE
  seq_num INTEGER;
  date_prefix TEXT;
BEGIN
  date_prefix := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');
  SELECT COALESCE(MAX(CAST(SPLIT_PART(receipt_number, '-', 3) AS INTEGER)), 0) + 1
  INTO seq_num
  FROM transactions
  WHERE receipt_number LIKE 'MC-' || date_prefix || '-%';
  NEW.receipt_number := 'MC-' || date_prefix || '-' || LPAD(seq_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_receipt_number
  BEFORE INSERT ON transactions
  FOR EACH ROW
  WHEN (NEW.receipt_number IS NULL OR NEW.receipt_number = '')
  EXECUTE FUNCTION generate_receipt_number();

-- Fonction: calcul commission
CREATE OR REPLACE FUNCTION calculate_commission()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.commission_rate IS NULL THEN
    SELECT commission_rate INTO NEW.commission_rate FROM barbers WHERE id = NEW.barber_id;
  END IF;
  NEW.commission_amount := ROUND(NEW.amount * NEW.commission_rate / 100, 2);
  NEW.shop_amount := NEW.amount - NEW.commission_amount;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calc_commission
  BEFORE INSERT OR UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION calculate_commission();

-- Vue: soldes barbiers
CREATE OR REPLACE VIEW barber_balances AS
SELECT
  b.id AS barber_id,
  b.full_name,
  b.commission_rate,
  COALESCE(SUM(CASE WHEN t.status = 'ACTIVE' THEN t.commission_amount ELSE 0 END), 0) AS total_commissions,
  COALESCE(SUM(bp.amount), 0) AS total_paid,
  COALESCE(SUM(CASE WHEN t.status = 'ACTIVE' THEN t.commission_amount ELSE 0 END), 0)
    - COALESCE(SUM(bp.amount), 0) AS balance_due
FROM barbers b
LEFT JOIN transactions t ON t.barber_id = b.id
LEFT JOIN barber_payments bp ON bp.barber_id = b.id
WHERE b.is_active = true
GROUP BY b.id, b.full_name, b.commission_rate;

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE barbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE barber_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper: rôle utilisateur courant
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT get_user_role() = 'ADMIN';
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_cashier_or_admin()
RETURNS BOOLEAN AS $$
  SELECT get_user_role() IN ('ADMIN', 'CAISSIERE');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_accountant_or_admin()
RETURNS BOOLEAN AS $$
  SELECT get_user_role() IN ('ADMIN', 'COMPTABLE');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Policies profiles
CREATE POLICY "Profiles: own read" ON profiles FOR SELECT USING (auth.uid() = id OR is_admin() OR is_accountant_or_admin());
CREATE POLICY "Profiles: admin update" ON profiles FOR UPDATE USING (is_admin());
CREATE POLICY "Profiles: admin insert" ON profiles FOR INSERT WITH CHECK (is_admin());

-- Policies barbers
CREATE POLICY "Barbers: read active or admin" ON barbers FOR SELECT USING (
  is_admin() OR is_cashier_or_admin() OR is_accountant_or_admin()
  OR (get_user_role() = 'BARBER' AND user_id = auth.uid())
);
CREATE POLICY "Barbers: admin manage" ON barbers FOR ALL USING (is_admin());

-- Policies services
CREATE POLICY "Services: read all authenticated" ON services FOR SELECT TO authenticated USING (true);
CREATE POLICY "Services: admin manage" ON services FOR ALL USING (is_admin());

-- Policies settings
CREATE POLICY "Settings: read admin accountant" ON settings FOR SELECT USING (is_admin() OR is_accountant_or_admin());
CREATE POLICY "Settings: admin update" ON settings FOR ALL USING (is_admin());

-- Policies cash_registers
CREATE POLICY "Cash: read own or admin" ON cash_registers FOR SELECT USING (
  is_admin() OR is_accountant_or_admin() OR cashier_id = auth.uid()
);
CREATE POLICY "Cash: cashier open" ON cash_registers FOR INSERT WITH CHECK (
  is_cashier_or_admin() AND cashier_id = auth.uid()
);
CREATE POLICY "Cash: cashier close own" ON cash_registers FOR UPDATE USING (
  is_admin() OR (cashier_id = auth.uid() AND status = 'OPEN')
);

-- Policies transactions
CREATE POLICY "Transactions: read by role" ON transactions FOR SELECT USING (
  is_admin() OR is_accountant_or_admin()
  OR (is_cashier_or_admin() AND cashier_id = auth.uid())
  OR (get_user_role() = 'BARBER' AND barber_id IN (SELECT id FROM barbers WHERE user_id = auth.uid()))
);
CREATE POLICY "Transactions: cashier create" ON transactions FOR INSERT WITH CHECK (
  is_cashier_or_admin() AND cashier_id = auth.uid()
);
CREATE POLICY "Transactions: admin cancel" ON transactions FOR UPDATE USING (is_admin());

-- Policies barber_payments
CREATE POLICY "Barber payments: read" ON barber_payments FOR SELECT USING (
  is_admin() OR is_accountant_or_admin()
  OR (get_user_role() = 'BARBER' AND barber_id IN (SELECT id FROM barbers WHERE user_id = auth.uid()))
);
CREATE POLICY "Barber payments: admin create" ON barber_payments FOR INSERT WITH CHECK (is_admin());

-- Policies expenses
CREATE POLICY "Expenses: read admin accountant" ON expenses FOR SELECT USING (
  is_admin() OR is_accountant_or_admin() OR recorded_by = auth.uid()
);
CREATE POLICY "Expenses: create authorized" ON expenses FOR INSERT WITH CHECK (
  is_admin() OR is_cashier_or_admin()
);

-- Policies audit_logs
CREATE POLICY "Audit: admin read" ON audit_logs FOR SELECT USING (is_admin() OR is_accountant_or_admin());
CREATE POLICY "Audit: insert authenticated" ON audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- Données initiales (services exemple)
INSERT INTO services (name, description, price, duration_minutes) VALUES
  ('Coupe classique', 'Coupe cheveux traditionnelle', 1500, 30),
  ('Coupe + Barbe', 'Coupe complète avec taille de barbe', 2500, 45),
  ('Taille barbe', 'Taille et entretien de barbe', 1000, 20),
  ('Rasage', 'Rasage à la serviette chaude', 1200, 25),
  ('Dégradé', 'Coupe dégradé moderne', 2000, 35);
