-- Migration 004 : RLS renforcé — permissions par rôle
-- Exécuter après 003_expense_categories_audit.sql

-- Helpers supplémentaires
CREATE OR REPLACE FUNCTION is_barber()
RETURNS BOOLEAN AS $$
  SELECT get_user_role() = 'BARBER';
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_comptable()
RETURNS BOOLEAN AS $$
  SELECT get_user_role() = 'COMPTABLE';
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_barber_id_for_user()
RETURNS UUID AS $$
  SELECT id FROM barbers WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Supprimer les anciennes policies pour les recréer proprement
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname, tablename FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename IN (
      'profiles', 'barbers', 'services', 'settings',
      'cash_registers', 'transactions', 'barber_payments',
      'expenses', 'audit_logs'
    )
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- ═══ PROFILES ═══
CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated USING (
  auth.uid() = id OR is_admin() OR is_accountant_or_admin()
);
CREATE POLICY "profiles_admin_all" ON profiles FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

-- ═══ BARBIERS ═══
CREATE POLICY "barbers_select" ON barbers FOR SELECT TO authenticated USING (
  is_admin()
  OR is_cashier_or_admin()
  OR is_accountant_or_admin()
  OR (is_barber() AND user_id = auth.uid())
);
CREATE POLICY "barbers_admin_write" ON barbers FOR INSERT TO authenticated
  WITH CHECK (is_admin());
CREATE POLICY "barbers_admin_update" ON barbers FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "barbers_admin_delete" ON barbers FOR DELETE TO authenticated
  USING (is_admin());

-- ═══ SERVICES ═══
CREATE POLICY "services_select" ON services FOR SELECT TO authenticated USING (true);
CREATE POLICY "services_admin_write" ON services FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "services_admin_update" ON services FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "services_admin_delete" ON services FOR DELETE TO authenticated USING (is_admin());

-- ═══ SETTINGS ═══
CREATE POLICY "settings_select" ON settings FOR SELECT TO authenticated
  USING (is_admin() OR is_accountant_or_admin());
CREATE POLICY "settings_admin" ON settings FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

-- ═══ CAISSE ═══
CREATE POLICY "cash_select" ON cash_registers FOR SELECT TO authenticated USING (
  is_admin()
  OR is_accountant_or_admin()
  OR cashier_id = auth.uid()
);
CREATE POLICY "cash_insert" ON cash_registers FOR INSERT TO authenticated
  WITH CHECK (is_cashier_or_admin() AND cashier_id = auth.uid());
CREATE POLICY "cash_update" ON cash_registers FOR UPDATE TO authenticated
  USING (is_admin() OR (cashier_id = auth.uid() AND status = 'OPEN'))
  WITH CHECK (is_admin() OR cashier_id = auth.uid());

-- ═══ TRANSACTIONS ═══
-- Admin : accès complet | Caissière : ses transactions | Barber : les siennes | Comptable : lecture
CREATE POLICY "transactions_select" ON transactions FOR SELECT TO authenticated USING (
  is_admin()
  OR is_accountant_or_admin()
  OR (is_cashier_or_admin() AND cashier_id = auth.uid())
  OR (is_barber() AND barber_id = get_barber_id_for_user())
);
CREATE POLICY "transactions_insert" ON transactions FOR INSERT TO authenticated
  WITH CHECK (
    is_cashier_or_admin()
    AND cashier_id = auth.uid()
    AND barber_id IS NOT NULL
    AND service_id IS NOT NULL
    AND payment_method IS NOT NULL
    AND amount >= 0
  );
-- Seul ADMIN peut annuler (UPDATE status)
CREATE POLICY "transactions_admin_update" ON transactions FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());
-- Interdire DELETE pour tous (soft delete via statut uniquement)
CREATE POLICY "transactions_no_delete" ON transactions FOR DELETE TO authenticated
  USING (false);

-- ═══ PAIEMENTS BARBIERS ═══
CREATE POLICY "barber_payments_select" ON barber_payments FOR SELECT TO authenticated USING (
  is_admin()
  OR is_accountant_or_admin()
  OR (is_barber() AND barber_id = get_barber_id_for_user())
);
CREATE POLICY "barber_payments_insert" ON barber_payments FOR INSERT TO authenticated
  WITH CHECK (is_admin() AND amount > 0);
CREATE POLICY "barber_payments_no_update" ON barber_payments FOR UPDATE TO authenticated USING (false);
CREATE POLICY "barber_payments_no_delete" ON barber_payments FOR DELETE TO authenticated USING (false);

-- ═══ DÉPENSES ═══
CREATE POLICY "expenses_select" ON expenses FOR SELECT TO authenticated USING (
  is_admin()
  OR is_accountant_or_admin()
  OR recorded_by = auth.uid()
);
CREATE POLICY "expenses_insert" ON expenses FOR INSERT TO authenticated
  WITH CHECK (
    (is_admin() OR is_cashier_or_admin())
    AND recorded_by = auth.uid()
    AND amount > 0
  );
CREATE POLICY "expenses_admin_update" ON expenses FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "expenses_no_delete" ON expenses FOR DELETE TO authenticated USING (false);

-- ═══ AUDIT LOGS — lecture admin/comptable, insertion authentifiée, jamais modifiable ═══
CREATE POLICY "audit_select" ON audit_logs FOR SELECT TO authenticated
  USING (is_admin() OR is_accountant_or_admin());
CREATE POLICY "audit_insert" ON audit_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "audit_no_update" ON audit_logs FOR UPDATE TO authenticated USING (false);
CREATE POLICY "audit_no_delete" ON audit_logs FOR DELETE TO authenticated USING (false);

-- Accès aux vues pour les rôles autorisés
GRANT SELECT ON barber_balances TO authenticated;
GRANT SELECT ON barber_commissions TO authenticated;

-- Ajouter une valeur à l'enum audit_action
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'PRODUCT_CREATED';
