-- 🛒 SALES TABLES SCHEMA FOR REAL POS SYSTEM
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. SALES TABLE (Main transaction record)
-- ============================================
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number TEXT UNIQUE NOT NULL,
  location_id UUID REFERENCES locations(id) NOT NULL,
  sale_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Customer info (optional)
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  
  -- Amounts
  subtotal DECIMAL(12,2) NOT NULL,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  discount_amount DECIMAL(12,2) DEFAULT 0,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  total_amount DECIMAL(12,2) NOT NULL,
  
  -- Payment
  payment_method TEXT CHECK (payment_method IN ('CASH', 'CARD', 'UPI', 'CREDIT')) NOT NULL DEFAULT 'CASH',
  payment_reference TEXT,
  payment_status TEXT DEFAULT 'PAID' CHECK (payment_status IN ('PAID', 'PENDING', 'PARTIAL')),
  
  -- Sale status
  sale_status TEXT DEFAULT 'COMPLETED' CHECK (sale_status IN ('COMPLETED', 'HOLD', 'CANCELLED', 'RETURNED')),
  
  -- Exchange info (if this is an exchange transaction)
  is_exchange BOOLEAN DEFAULT false,
  original_sale_id UUID REFERENCES sales(id),
  
  -- Metadata
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sales_invoice ON sales(invoice_number);
CREATE INDEX IF NOT EXISTS idx_sales_location ON sales(location_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_customer_phone ON sales(customer_phone);
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(sale_status);
CREATE INDEX IF NOT EXISTS idx_sales_created_by ON sales(created_by);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_sales_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sales_updated_at
  BEFORE UPDATE ON sales
  FOR EACH ROW
  EXECUTE FUNCTION update_sales_updated_at();

-- ============================================
-- 2. SALE_ITEMS TABLE (Line items in a sale)
-- ============================================
CREATE TABLE IF NOT EXISTS sale_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE NOT NULL,
  variant_id UUID REFERENCES product_variants(id) NOT NULL,
  
  -- Product snapshot (denormalized for historical accuracy)
  product_code TEXT NOT NULL,
  product_name TEXT NOT NULL,
  size TEXT,
  color TEXT,
  barcode TEXT,
  
  -- Pricing
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  rate DECIMAL(12,2) NOT NULL,
  mrp DECIMAL(12,2),
  discount_percent DECIMAL(5,2) DEFAULT 0,
  discount_amount DECIMAL(12,2) DEFAULT 0,
  tax_percent DECIMAL(5,2) DEFAULT 0,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  amount DECIMAL(12,2) NOT NULL,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_variant ON sale_items(variant_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_barcode ON sale_items(barcode);

-- ============================================
-- 3. RPC FUNCTION: Search products for POS
-- ============================================
CREATE OR REPLACE FUNCTION search_products_for_pos(search_query TEXT)
RETURNS TABLE (
  id UUID,
  product_code TEXT,
  product_name TEXT,
  brand TEXT,
  category TEXT,
  barcode TEXT,
  size TEXT,
  color TEXT,
  mrp DECIMAL,
  selling_price DECIMAL,
  base_price DECIMAL,
  available_stock BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pv.id,
    pv.product_code,
    p.product_name,
    p.brand,
    p.category,
    pv.barcode,
    pv.size,
    pv.color,
    pv.mrp,
    pv.selling_price,
    pv.base_price,
    COALESCE(
      (SELECT SUM(quantity) FROM event_ledger WHERE variant_id = pv.id),
      0
    ) as available_stock
  FROM product_variants pv
  INNER JOIN products p ON pv.product_id = p.id
  WHERE 
    pv.is_active = true
    AND (
      pv.barcode ILIKE '%' || search_query || '%'
      OR pv.product_code ILIKE '%' || search_query || '%'
      OR p.product_name ILIKE '%' || search_query || '%'
    )
  LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4. RPC FUNCTION: Get variant stock
-- ============================================
CREATE OR REPLACE FUNCTION get_variant_stock(p_variant_id UUID)
RETURNS BIGINT AS $$
BEGIN
  RETURN COALESCE(
    (SELECT SUM(quantity) FROM event_ledger WHERE variant_id = p_variant_id),
    0
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 5. RPC FUNCTION: Get daily sales summary
-- ============================================
CREATE OR REPLACE FUNCTION get_daily_sales_summary(
  p_location_id UUID,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  total_sales BIGINT,
  total_amount DECIMAL,
  cash_sales DECIMAL,
  card_sales DECIMAL,
  upi_sales DECIMAL,
  credit_sales DECIMAL,
  total_discount DECIMAL,
  total_items BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_sales,
    SUM(s.total_amount) as total_amount,
    SUM(CASE WHEN s.payment_method = 'CASH' THEN s.total_amount ELSE 0 END) as cash_sales,
    SUM(CASE WHEN s.payment_method = 'CARD' THEN s.total_amount ELSE 0 END) as card_sales,
    SUM(CASE WHEN s.payment_method = 'UPI' THEN s.total_amount ELSE 0 END) as upi_sales,
    SUM(CASE WHEN s.payment_method = 'CREDIT' THEN s.total_amount ELSE 0 END) as credit_sales,
    SUM(s.discount_amount) as total_discount,
    (SELECT COUNT(*)::BIGINT FROM sale_items si WHERE si.sale_id IN (
      SELECT id FROM sales WHERE location_id = p_location_id AND DATE(sale_date) = p_date
    )) as total_items
  FROM sales s
  WHERE 
    s.location_id = p_location_id
    AND DATE(s.sale_date) = p_date
    AND s.sale_status = 'COMPLETED';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 6. Enable Row Level Security
-- ============================================
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view sales from their location
CREATE POLICY sales_select_own_location ON sales
  FOR SELECT
  USING (
    location_id IN (
      SELECT location_id FROM users WHERE id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('OWNER', 'MANAGER')
    )
  );

-- Policy: Users can insert sales at their location
CREATE POLICY sales_insert_own_location ON sales
  FOR INSERT
  WITH CHECK (
    location_id IN (
      SELECT location_id FROM users WHERE id = auth.uid()
    )
  );

-- Policy: Sale items follow parent sale permissions
CREATE POLICY sale_items_select ON sale_items
  FOR SELECT
  USING (
    sale_id IN (
      SELECT id FROM sales
      WHERE location_id IN (
        SELECT location_id FROM users WHERE id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('OWNER', 'MANAGER')
      )
    )
  );

CREATE POLICY sale_items_insert ON sale_items
  FOR INSERT
  WITH CHECK (
    sale_id IN (
      SELECT id FROM sales
      WHERE location_id IN (
        SELECT location_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- ============================================
-- 7. Sample Data (Optional - for testing)
-- ============================================

-- Note: To create test users, follow the guide in:
-- /🔐-CREATE-USERS-FIXED.md

-- Create users via Supabase Dashboard first, then link them.
-- DO NOT try to insert directly into auth.users!

-- ============================================
-- DONE! Your POS system is now connected to real database!
-- ============================================

-- Verify tables created:
SELECT 
  table_name, 
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name IN ('sales', 'sale_items')
ORDER BY table_name;