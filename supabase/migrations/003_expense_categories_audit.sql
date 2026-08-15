-- Migration 003 : catégories dépenses, justificatifs, audit description
-- Exécuter après 002_historical_pricing.sql

ALTER TYPE expense_category ADD VALUE IF NOT EXISTS 'ELECTRICITE';
ALTER TYPE expense_category ADD VALUE IF NOT EXISTS 'EAU';
ALTER TYPE expense_category ADD VALUE IF NOT EXISTS 'INTERNET';
ALTER TYPE expense_category ADD VALUE IF NOT EXISTS 'PRODUITS';
ALTER TYPE expense_category ADD VALUE IF NOT EXISTS 'MATERIEL';
ALTER TYPE expense_category ADD VALUE IF NOT EXISTS 'ENTRETIEN';
ALTER TYPE expense_category ADD VALUE IF NOT EXISTS 'TRANSPORT';
ALTER TYPE expense_category ADD VALUE IF NOT EXISTS 'SALAIRES';

ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'PRODUCT_CREATED';

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS receipt_url TEXT;

ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS description TEXT;

-- Index pour recherche transactions
CREATE INDEX IF NOT EXISTS idx_transactions_receipt ON transactions(receipt_number);
CREATE INDEX IF NOT EXISTS idx_transactions_cashier ON transactions(cashier_id);
CREATE INDEX IF NOT EXISTS idx_transactions_service ON transactions(service_id);
CREATE INDEX IF NOT EXISTS idx_transactions_payment ON transactions(payment_method);

-- Vue commissions par barber (période configurable côté app)
CREATE OR REPLACE VIEW barber_commissions AS
SELECT
  b.id AS barber_id,
  b.full_name,
  b.commission_rate,
  COALESCE(SUM(CASE WHEN t.status = 'ACTIVE' THEN t.amount ELSE 0 END), 0) AS total_revenue,
  COALESCE(SUM(CASE WHEN t.status = 'ACTIVE' THEN t.commission_amount ELSE 0 END), 0) AS total_commission,
  COALESCE(SUM(bp.amount), 0) AS total_paid,
  COALESCE(SUM(CASE WHEN t.status = 'ACTIVE' THEN t.commission_amount ELSE 0 END), 0)
    - COALESCE(SUM(bp.amount), 0) AS balance_due
FROM barbers b
LEFT JOIN transactions t ON t.barber_id = b.id
LEFT JOIN barber_payments bp ON bp.barber_id = b.id
WHERE b.is_active = true
GROUP BY b.id, b.full_name, b.commission_rate;
