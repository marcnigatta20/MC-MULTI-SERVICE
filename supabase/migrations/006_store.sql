-- Migration 006 : Module Store / Boutique
-- Exécuter après 005_add_barber_full_name.sql

-- ═══ ENUMS ═══
DO $$ BEGIN
  CREATE TYPE store_sale_status AS ENUM ('VALIDEE', 'ANNULEE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE stock_movement_type AS ENUM (
    'INITIAL', 'ACHAT', 'VENTE', 'AJUSTEMENT', 'RETOUR', 'PERTE', 'PRODUIT_ENDOMMAGE'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Étendre audit_action
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'PRODUCT_CREATED';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'PRODUCT_UPDATED';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'PRODUCT_DISABLED';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'PRODUCT_ENABLED';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'STOCK_ADDED';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'STOCK_ADJUSTED';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'STORE_SALE_CREATED';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'STORE_SALE_CANCELLED';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'PRODUCT_RETURNED';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'CATEGORY_CREATED';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'CATEGORY_UPDATED';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'SUPPLIER_CREATED';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'SUPPLIER_UPDATED';

-- ═══ TABLES ═══
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  sku TEXT UNIQUE,
  description TEXT,
  image_url TEXT,
  purchase_price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (purchase_price >= 0),
  selling_price NUMERIC(12,2) NOT NULL CHECK (selling_price > 0),
  stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  minimum_stock INTEGER NOT NULL DEFAULT 0 CHECK (minimum_stock >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS store_sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  receipt_number TEXT UNIQUE NOT NULL,
  cashier_id UUID NOT NULL REFERENCES profiles(id),
  cash_register_id UUID REFERENCES cash_registers(id),
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  discount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  total_amount NUMERIC(12,2) NOT NULL CHECK (total_amount >= 0),
  payment_method payment_method NOT NULL DEFAULT 'ESPECES',
  status store_sale_status NOT NULL DEFAULT 'VALIDEE',
  cancelled_by UUID REFERENCES profiles(id),
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS store_sale_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID NOT NULL REFERENCES store_sales(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  product_name TEXT NOT NULL,
  sku TEXT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_purchase_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  unit_selling_price NUMERIC(12,2) NOT NULL,
  subtotal NUMERIC(12,2) NOT NULL,
  profit NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id),
  movement_type stock_movement_type NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  stock_before INTEGER NOT NULL,
  stock_after INTEGER NOT NULL,
  purchase_price NUMERIC(12,2),
  reference_id UUID,
  reason TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══ INDEXES ═══
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_store_sales_created ON store_sales(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_store_sales_cashier ON store_sales(cashier_id);
CREATE INDEX IF NOT EXISTS idx_store_sales_status ON store_sales(status);
CREATE INDEX IF NOT EXISTS idx_store_sales_receipt ON store_sales(receipt_number);
CREATE INDEX IF NOT EXISTS idx_store_sale_items_sale ON store_sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_store_sale_items_product ON store_sale_items(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created ON stock_movements(created_at DESC);

-- ═══ TRIGGERS ═══
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS categories_updated_at ON categories;
CREATE TRIGGER categories_updated_at
  BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS suppliers_updated_at ON suppliers;
CREATE TRIGGER suppliers_updated_at
  BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS products_updated_at ON products;
CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Numéro de reçu Store : MCS-YYYYMMDD-0001
CREATE OR REPLACE FUNCTION generate_store_receipt_number()
RETURNS TRIGGER AS $$
DECLARE
  seq_num INTEGER;
  date_prefix TEXT;
BEGIN
  date_prefix := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');
  SELECT COALESCE(MAX(CAST(SPLIT_PART(receipt_number, '-', 3) AS INTEGER)), 0) + 1
  INTO seq_num
  FROM store_sales
  WHERE receipt_number LIKE 'MCS-' || date_prefix || '-%';
  NEW.receipt_number := 'MCS-' || date_prefix || '-' || LPAD(seq_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_store_receipt_number ON store_sales;
CREATE TRIGGER set_store_receipt_number
  BEFORE INSERT ON store_sales
  FOR EACH ROW
  WHEN (NEW.receipt_number IS NULL OR NEW.receipt_number = '')
  EXECUTE FUNCTION generate_store_receipt_number();

-- ═══ RPC : VENTE ATOMIQUE ═══
CREATE OR REPLACE FUNCTION process_store_sale(
  p_cashier_id UUID,
  p_cash_register_id UUID,
  p_payment_method payment_method,
  p_discount NUMERIC,
  p_items JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sale_id UUID;
  v_item JSONB;
  v_product RECORD;
  v_qty INTEGER;
  v_subtotal NUMERIC := 0;
  v_total NUMERIC := 0;
  v_line_subtotal NUMERIC;
  v_line_profit NUMERIC;
  v_stock_before INTEGER;
  v_stock_after INTEGER;
BEGIN
  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Vente vide.';
  END IF;

  -- Calculer sous-total
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT * INTO v_product FROM products
    WHERE id = (v_item->>'product_id')::UUID
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Produit introuvable.';
    END IF;
    IF NOT v_product.is_active THEN
      RAISE EXCEPTION 'Produit inactif : %', v_product.name;
    END IF;

    v_qty := (v_item->>'quantity')::INTEGER;
    IF v_qty <= 0 THEN
      RAISE EXCEPTION 'Quantité invalide.';
    END IF;
    IF v_product.stock_quantity < v_qty THEN
      RAISE EXCEPTION 'Stock insuffisant pour : %', v_product.name;
    END IF;

    v_subtotal := v_subtotal + (v_product.selling_price * v_qty);
  END LOOP;

  v_total := GREATEST(v_subtotal - COALESCE(p_discount, 0), 0);

  INSERT INTO store_sales (
    receipt_number, cashier_id, cash_register_id,
    subtotal, discount, total_amount, payment_method, status
  ) VALUES (
    '', p_cashier_id, p_cash_register_id,
    v_subtotal, COALESCE(p_discount, 0), v_total, p_payment_method, 'VALIDEE'
  ) RETURNING id INTO v_sale_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT * INTO v_product FROM products
    WHERE id = (v_item->>'product_id')::UUID
    FOR UPDATE;

    v_qty := (v_item->>'quantity')::INTEGER;
    v_stock_before := v_product.stock_quantity;
    v_stock_after := v_stock_before - v_qty;
    v_line_subtotal := v_product.selling_price * v_qty;
    v_line_profit := (v_product.selling_price - v_product.purchase_price) * v_qty;

    INSERT INTO store_sale_items (
      sale_id, product_id, product_name, sku, quantity,
      unit_purchase_price, unit_selling_price, subtotal, profit
    ) VALUES (
      v_sale_id, v_product.id, v_product.name, v_product.sku, v_qty,
      v_product.purchase_price, v_product.selling_price, v_line_subtotal, v_line_profit
    );

    UPDATE products SET stock_quantity = v_stock_after WHERE id = v_product.id;

    INSERT INTO stock_movements (
      product_id, movement_type, quantity, stock_before, stock_after,
      purchase_price, reference_id, reason, created_by
    ) VALUES (
      v_product.id, 'VENTE', v_qty, v_stock_before, v_stock_after,
      v_product.purchase_price, v_sale_id, 'Vente ' || v_sale_id::TEXT, p_cashier_id
    );
  END LOOP;

  INSERT INTO audit_logs (user_id, action, entity_type, entity_id, description, details)
  VALUES (
    p_cashier_id, 'STORE_SALE_CREATED', 'store_sale', v_sale_id,
    'Vente store créée — ' || v_total || ' HTG',
    jsonb_build_object('total_amount', v_total, 'item_count', jsonb_array_length(p_items))
  );

  RETURN v_sale_id;
END;
$$;

-- ═══ RPC : ANNULATION VENTE ═══
CREATE OR REPLACE FUNCTION cancel_store_sale(
  p_sale_id UUID,
  p_user_id UUID,
  p_reason TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sale RECORD;
  v_item RECORD;
  v_stock_before INTEGER;
  v_stock_after INTEGER;
BEGIN
  SELECT * INTO v_sale FROM store_sales WHERE id = p_sale_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Vente introuvable.'; END IF;
  IF v_sale.status = 'ANNULEE' THEN RAISE EXCEPTION 'Vente déjà annulée.'; END IF;

  FOR v_item IN SELECT * FROM store_sale_items WHERE sale_id = p_sale_id
  LOOP
    SELECT stock_quantity INTO v_stock_before FROM products WHERE id = v_item.product_id FOR UPDATE;
    v_stock_after := v_stock_before + v_item.quantity;

    UPDATE products SET stock_quantity = v_stock_after WHERE id = v_item.product_id;

    INSERT INTO stock_movements (
      product_id, movement_type, quantity, stock_before, stock_after,
      reference_id, reason, created_by
    ) VALUES (
      v_item.product_id, 'RETOUR', v_item.quantity, v_stock_before, v_stock_after,
      p_sale_id, 'Annulation vente — ' || p_reason, p_user_id
    );
  END LOOP;

  UPDATE store_sales SET
    status = 'ANNULEE',
    cancelled_by = p_user_id,
    cancelled_at = NOW(),
    cancellation_reason = p_reason
  WHERE id = p_sale_id;

  INSERT INTO audit_logs (user_id, action, entity_type, entity_id, description, details)
  VALUES (
    p_user_id, 'STORE_SALE_CANCELLED', 'store_sale', p_sale_id,
    'Vente store annulée — ' || p_reason,
    jsonb_build_object('reason', p_reason, 'total_amount', v_sale.total_amount)
  );

  RETURN p_sale_id;
END;
$$;

-- ═══ RPC : AJOUT STOCK ═══
CREATE OR REPLACE FUNCTION add_product_stock(
  p_product_id UUID,
  p_quantity INTEGER,
  p_purchase_price NUMERIC,
  p_user_id UUID,
  p_reason TEXT DEFAULT NULL,
  p_supplier_id UUID DEFAULT NULL,
  p_invoice_ref TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product RECORD;
  v_stock_before INTEGER;
  v_stock_after INTEGER;
  v_movement_id UUID;
BEGIN
  IF p_quantity <= 0 THEN RAISE EXCEPTION 'Quantité invalide.'; END IF;

  SELECT * INTO v_product FROM products WHERE id = p_product_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Produit introuvable.'; END IF;

  v_stock_before := v_product.stock_quantity;
  v_stock_after := v_stock_before + p_quantity;

  UPDATE products SET stock_quantity = v_stock_after WHERE id = p_product_id;

  INSERT INTO stock_movements (
    product_id, movement_type, quantity, stock_before, stock_after,
    purchase_price, reason, created_by
  ) VALUES (
    p_product_id, 'ACHAT', p_quantity, v_stock_before, v_stock_after,
    COALESCE(p_purchase_price, v_product.purchase_price),
    COALESCE(p_reason, 'Réapprovisionnement') ||
      CASE WHEN p_invoice_ref IS NOT NULL THEN ' — Facture: ' || p_invoice_ref ELSE '' END,
    p_user_id
  ) RETURNING id INTO v_movement_id;

  INSERT INTO audit_logs (user_id, action, entity_type, entity_id, description, details)
  VALUES (
    p_user_id, 'STOCK_ADDED', 'product', p_product_id,
    'Stock ajouté : +' || p_quantity || ' pour ' || v_product.name,
    jsonb_build_object('quantity', p_quantity, 'stock_after', v_stock_after, 'supplier_id', p_supplier_id)
  );

  RETURN v_movement_id;
END;
$$;

-- ═══ RPC : RETOUR PRODUIT ═══
CREATE OR REPLACE FUNCTION return_store_product(
  p_sale_id UUID,
  p_product_id UUID,
  p_quantity INTEGER,
  p_user_id UUID,
  p_reason TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sale RECORD;
  v_item RECORD;
  v_stock_before INTEGER;
  v_stock_after INTEGER;
  v_movement_id UUID;
BEGIN
  SELECT * INTO v_sale FROM store_sales WHERE id = p_sale_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Vente introuvable.'; END IF;
  IF v_sale.status != 'VALIDEE' THEN RAISE EXCEPTION 'Vente non valide pour retour.'; END IF;

  SELECT * INTO v_item FROM store_sale_items
  WHERE sale_id = p_sale_id AND product_id = p_product_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Produit non trouvé dans cette vente.'; END IF;
  IF p_quantity <= 0 OR p_quantity > v_item.quantity THEN
    RAISE EXCEPTION 'Quantité de retour invalide.';
  END IF;

  SELECT stock_quantity INTO v_stock_before FROM products WHERE id = p_product_id FOR UPDATE;
  v_stock_after := v_stock_before + p_quantity;
  UPDATE products SET stock_quantity = v_stock_after WHERE id = p_product_id;

  INSERT INTO stock_movements (
    product_id, movement_type, quantity, stock_before, stock_after,
    reference_id, reason, created_by
  ) VALUES (
    p_product_id, 'RETOUR', p_quantity, v_stock_before, v_stock_after,
    p_sale_id, p_reason, p_user_id
  ) RETURNING id INTO v_movement_id;

  INSERT INTO audit_logs (user_id, action, entity_type, entity_id, description, details)
  VALUES (
    p_user_id, 'PRODUCT_RETURNED', 'store_sale', p_sale_id,
    'Retour produit — ' || p_reason,
    jsonb_build_object('product_id', p_product_id, 'quantity', p_quantity)
  );

  RETURN v_movement_id;
END;
$$;

-- ═══ DONNÉES INITIALES CATÉGORIES ═══
INSERT INTO categories (name, description) VALUES
  ('Parfums', 'Parfums et eaux de toilette'),
  ('Cosmétiques', 'Produits cosmétiques'),
  ('Cheveux', 'Produits pour cheveux'),
  ('Barbe', 'Produits pour barbe'),
  ('Casquettes', 'Casquettes et chapeaux'),
  ('Accessoires', 'Accessoires divers'),
  ('Soins', 'Produits de soin'),
  ('Autres', 'Autres produits')
ON CONFLICT (name) DO NOTHING;

-- ═══ RLS ═══
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

-- Categories
CREATE POLICY "categories_select" ON categories FOR SELECT TO authenticated
  USING (is_admin() OR is_cashier_or_admin() OR is_accountant_or_admin());
CREATE POLICY "categories_admin_write" ON categories FOR INSERT TO authenticated
  WITH CHECK (is_admin());
CREATE POLICY "categories_admin_update" ON categories FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "categories_no_delete" ON categories FOR DELETE TO authenticated USING (false);

-- Suppliers
CREATE POLICY "suppliers_select" ON suppliers FOR SELECT TO authenticated
  USING (is_admin() OR is_accountant_or_admin());
CREATE POLICY "suppliers_admin_write" ON suppliers FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "suppliers_admin_update" ON suppliers FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "suppliers_no_delete" ON suppliers FOR DELETE TO authenticated USING (false);

-- Products
CREATE POLICY "products_select" ON products FOR SELECT TO authenticated
  USING (is_admin() OR is_cashier_or_admin() OR is_accountant_or_admin());
CREATE POLICY "products_admin_insert" ON products FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "products_admin_update" ON products FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "products_no_delete" ON products FOR DELETE TO authenticated USING (false);

-- Store sales
CREATE POLICY "store_sales_select" ON store_sales FOR SELECT TO authenticated USING (
  is_admin() OR is_accountant_or_admin()
  OR (is_cashier_or_admin() AND cashier_id = auth.uid())
);
CREATE POLICY "store_sales_insert" ON store_sales FOR INSERT TO authenticated
  WITH CHECK (is_cashier_or_admin() AND cashier_id = auth.uid());
CREATE POLICY "store_sales_admin_update" ON store_sales FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "store_sales_no_delete" ON store_sales FOR DELETE TO authenticated USING (false);

-- Store sale items
CREATE POLICY "store_sale_items_select" ON store_sale_items FOR SELECT TO authenticated USING (
  is_admin() OR is_accountant_or_admin()
  OR (is_cashier_or_admin() AND sale_id IN (
    SELECT id FROM store_sales WHERE cashier_id = auth.uid()
  ))
);
CREATE POLICY "store_sale_items_insert" ON store_sale_items FOR INSERT TO authenticated
  WITH CHECK (is_cashier_or_admin());
CREATE POLICY "store_sale_items_no_update" ON store_sale_items FOR UPDATE TO authenticated USING (false);
CREATE POLICY "store_sale_items_no_delete" ON store_sale_items FOR DELETE TO authenticated USING (false);

-- Stock movements
CREATE POLICY "stock_movements_select" ON stock_movements FOR SELECT TO authenticated USING (
  is_admin() OR is_accountant_or_admin()
  OR (is_cashier_or_admin() AND created_by = auth.uid())
);
CREATE POLICY "stock_movements_insert" ON stock_movements FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR is_cashier_or_admin());
CREATE POLICY "stock_movements_no_update" ON stock_movements FOR UPDATE TO authenticated USING (false);
CREATE POLICY "stock_movements_no_delete" ON stock_movements FOR DELETE TO authenticated USING (false);

-- Grant RPC execute
GRANT EXECUTE ON FUNCTION process_store_sale TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_store_sale TO authenticated;
GRANT EXECUTE ON FUNCTION add_product_stock TO authenticated;
GRANT EXECUTE ON FUNCTION return_store_product TO authenticated;
