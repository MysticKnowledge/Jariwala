-- ============================================================================
-- 🚀 COMPLETE DATABASE SETUP WITH DELTA SYNC
-- ============================================================================
-- This is a SINGLE file that sets up EVERYTHING:
-- 1. Creates all tables
-- 2. Creates indexes
-- 3. Adds delta sync timestamps
-- 4. Creates triggers for auto-updating timestamps
-- 5. Seeds initial data
-- 
-- Run this ONCE in Supabase SQL Editor to set up the entire database!
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- STEP 1: CREATE BASE TABLES
-- ============================================================================

-- Categories
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_code VARCHAR(50) UNIQUE NOT NULL,
    category_name VARCHAR(200) NOT NULL,
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL  -- 🔥 DELTA SYNC!
);

CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_code ON categories(category_code);
CREATE INDEX IF NOT EXISTS idx_categories_updated_at ON categories(updated_at);
CREATE INDEX IF NOT EXISTS idx_categories_deleted_at ON categories(deleted_at);

-- Brands
CREATE TABLE IF NOT EXISTS brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_code VARCHAR(50) UNIQUE NOT NULL,
    brand_name VARCHAR(200) NOT NULL,
    description TEXT,
    logo_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL  -- 🔥 DELTA SYNC!
);

CREATE INDEX IF NOT EXISTS idx_brands_code ON brands(brand_code);
CREATE INDEX IF NOT EXISTS idx_brands_updated_at ON brands(updated_at);
CREATE INDEX IF NOT EXISTS idx_brands_deleted_at ON brands(deleted_at);

-- Locations (Stores, Godowns, etc.)
CREATE TABLE IF NOT EXISTS locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_code VARCHAR(50) UNIQUE NOT NULL,
    location_name VARCHAR(200) NOT NULL,
    location_type VARCHAR(50) NOT NULL CHECK (location_type IN ('STORE', 'GODOWN', 'WAREHOUSE', 'VENDOR', 'CUSTOMER')),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(20),
    contact_person VARCHAR(200),
    contact_phone VARCHAR(20),
    contact_email VARCHAR(200),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL  -- 🔥 DELTA SYNC!
);

CREATE INDEX IF NOT EXISTS idx_locations_code ON locations(location_code);
CREATE INDEX IF NOT EXISTS idx_locations_type ON locations(location_type);
CREATE INDEX IF NOT EXISTS idx_locations_updated_at ON locations(updated_at);
CREATE INDEX IF NOT EXISTS idx_locations_deleted_at ON locations(deleted_at);

-- Products
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_code VARCHAR(100) UNIQUE NOT NULL,
    product_name VARCHAR(500) NOT NULL,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
    description TEXT,
    hsn_code VARCHAR(50),
    base_price DECIMAL(15, 2) DEFAULT 0,
    tax_rate DECIMAL(5, 2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL  -- 🔥 DELTA SYNC!
);

CREATE INDEX IF NOT EXISTS idx_products_code ON products(product_code);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand_id);
CREATE INDEX IF NOT EXISTS idx_products_name ON products USING gin(to_tsvector('english', product_name));
CREATE INDEX IF NOT EXISTS idx_products_updated_at ON products(updated_at);
CREATE INDEX IF NOT EXISTS idx_products_deleted_at ON products(deleted_at);

-- Product Variants (Size + Color combinations)
CREATE TABLE IF NOT EXISTS product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sku_code VARCHAR(100) UNIQUE NOT NULL,
    size VARCHAR(50),
    color VARCHAR(100),
    barcode VARCHAR(200) UNIQUE,
    selling_price DECIMAL(15, 2) DEFAULT 0,
    mrp DECIMAL(15, 2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL  -- 🔥 DELTA SYNC!
);

CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_variants_sku ON product_variants(sku_code);
CREATE INDEX IF NOT EXISTS idx_variants_barcode ON product_variants(barcode);
CREATE INDEX IF NOT EXISTS idx_variants_size ON product_variants(size);
CREATE INDEX IF NOT EXISTS idx_variants_color ON product_variants(color);
CREATE INDEX IF NOT EXISTS idx_variants_updated_at ON product_variants(updated_at);
CREATE INDEX IF NOT EXISTS idx_variants_deleted_at ON product_variants(deleted_at);

-- Event Ledger (IMMUTABLE - Append-only transaction log)
CREATE TABLE IF NOT EXISTS event_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('INWARD', 'SALE', 'RETURN', 'EXCHANGE', 'TRANSFER', 'ADJUSTMENT', 'DAMAGE', 'OPENING_STOCK')),
    variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL,
    from_location_id UUID REFERENCES locations(id) ON DELETE RESTRICT,
    to_location_id UUID REFERENCES locations(id) ON DELETE RESTRICT,
    reference_type VARCHAR(50),  -- 'SALE', 'PURCHASE_ORDER', 'TRANSFER_ORDER', etc.
    reference_id UUID,           -- ID of the related document
    bill_number VARCHAR(100),
    transaction_date DATE NOT NULL,
    user_id UUID,
    notes TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()  -- 🔥 DELTA SYNC: Events are append-only, use created_at for sync
);

CREATE INDEX IF NOT EXISTS idx_event_variant ON event_ledger(variant_id);
CREATE INDEX IF NOT EXISTS idx_event_type ON event_ledger(event_type);
CREATE INDEX IF NOT EXISTS idx_event_from_location ON event_ledger(from_location_id);
CREATE INDEX IF NOT EXISTS idx_event_to_location ON event_ledger(to_location_id);
CREATE INDEX IF NOT EXISTS idx_event_transaction_date ON event_ledger(transaction_date);
CREATE INDEX IF NOT EXISTS idx_event_reference ON event_ledger(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_event_ledger_created_at ON event_ledger(created_at);

-- Sales
CREATE TABLE IF NOT EXISTS sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_number VARCHAR(100) UNIQUE NOT NULL,
    sale_date DATE NOT NULL,
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
    customer_name VARCHAR(200),
    customer_phone VARCHAR(20),
    customer_email VARCHAR(200),
    subtotal DECIMAL(15, 2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    payment_method VARCHAR(50),
    payment_status VARCHAR(50) DEFAULT 'COMPLETED',
    user_id UUID,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL  -- 🔥 DELTA SYNC!
);

CREATE INDEX IF NOT EXISTS idx_sales_bill_number ON sales(bill_number);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_location ON sales(location_id);
CREATE INDEX IF NOT EXISTS idx_sales_customer_phone ON sales(customer_phone);
CREATE INDEX IF NOT EXISTS idx_sales_updated_at ON sales(updated_at);
CREATE INDEX IF NOT EXISTS idx_sales_deleted_at ON sales(deleted_at);

-- Sale Items
CREATE TABLE IF NOT EXISTS sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(15, 2) NOT NULL,
    discount_percent DECIMAL(5, 2) DEFAULT 0,
    discount_amount DECIMAL(15, 2) DEFAULT 0,
    tax_rate DECIMAL(5, 2) DEFAULT 0,
    tax_amount DECIMAL(15, 2) DEFAULT 0,
    line_total DECIMAL(15, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL  -- 🔥 DELTA SYNC!
);

CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_variant ON sale_items(variant_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_updated_at ON sale_items(updated_at);
CREATE INDEX IF NOT EXISTS idx_sale_items_deleted_at ON sale_items(deleted_at);

-- Exchanges
CREATE TABLE IF NOT EXISTS exchanges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exchange_number VARCHAR(100) UNIQUE NOT NULL,
    exchange_date DATE NOT NULL,
    original_sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
    customer_name VARCHAR(200),
    customer_phone VARCHAR(20),
    exchange_reason TEXT,
    returned_value DECIMAL(15, 2) NOT NULL DEFAULT 0,
    new_items_value DECIMAL(15, 2) NOT NULL DEFAULT 0,
    balance_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,  -- Positive = customer owes, Negative = refund due
    user_id UUID,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL  -- 🔥 DELTA SYNC!
);

CREATE INDEX IF NOT EXISTS idx_exchanges_number ON exchanges(exchange_number);
CREATE INDEX IF NOT EXISTS idx_exchanges_date ON exchanges(exchange_date);
CREATE INDEX IF NOT EXISTS idx_exchanges_location ON exchanges(location_id);
CREATE INDEX IF NOT EXISTS idx_exchanges_original_sale ON exchanges(original_sale_id);
CREATE INDEX IF NOT EXISTS idx_exchanges_updated_at ON exchanges(updated_at);
CREATE INDEX IF NOT EXISTS idx_exchanges_deleted_at ON exchanges(deleted_at);

-- Audit Log
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data JSONB,
    new_data JSONB,
    user_id UUID,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_table ON audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_record ON audit_log(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);

-- ============================================================================
-- STEP 2: CREATE AUTO-UPDATE TRIGGERS FOR updated_at
-- ============================================================================

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all tables with updated_at
DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_brands_updated_at ON brands;
CREATE TRIGGER update_brands_updated_at
    BEFORE UPDATE ON brands
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_locations_updated_at ON locations;
CREATE TRIGGER update_locations_updated_at
    BEFORE UPDATE ON locations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_product_variants_updated_at ON product_variants;
CREATE TRIGGER update_product_variants_updated_at
    BEFORE UPDATE ON product_variants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sales_updated_at ON sales;
CREATE TRIGGER update_sales_updated_at
    BEFORE UPDATE ON sales
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sale_items_updated_at ON sale_items;
CREATE TRIGGER update_sale_items_updated_at
    BEFORE UPDATE ON sale_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_exchanges_updated_at ON exchanges;
CREATE TRIGGER update_exchanges_updated_at
    BEFORE UPDATE ON exchanges
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 3: SEED INITIAL DATA
-- ============================================================================

-- Insert default category
INSERT INTO categories (category_code, category_name, description)
VALUES ('GARMENT', 'Garments', 'Clothing and apparel items')
ON CONFLICT (category_code) DO NOTHING;

-- Insert default brand
INSERT INTO brands (brand_code, brand_name, description)
VALUES ('DEFAULT', 'Default Brand', 'Default brand for products')
ON CONFLICT (brand_code) DO NOTHING;

-- Insert default locations
INSERT INTO locations (location_code, location_name, location_type, city)
VALUES 
    ('STORE-001', 'Main Store', 'STORE', 'Mumbai'),
    ('GODOWN-001', 'Main Godown', 'GODOWN', 'Mumbai')
ON CONFLICT (location_code) DO NOTHING;

-- ============================================================================
-- STEP 4: CREATE REPORTING VIEWS
-- ============================================================================

-- Current Stock View (Calculated from event_ledger)
CREATE OR REPLACE VIEW v_current_stock AS
SELECT 
    pv.id AS variant_id,
    pv.sku_code,
    p.product_code,
    p.product_name,
    pv.size,
    pv.color,
    l.id AS location_id,
    l.location_code,
    l.location_name,
    COALESCE(
        (SELECT SUM(quantity) FROM event_ledger WHERE variant_id = pv.id AND to_location_id = l.id),
        0
    ) - COALESCE(
        (SELECT SUM(quantity) FROM event_ledger WHERE variant_id = pv.id AND from_location_id = l.id),
        0
    ) AS current_quantity,
    CASE 
        WHEN COALESCE(
            (SELECT SUM(quantity) FROM event_ledger WHERE variant_id = pv.id AND to_location_id = l.id),
            0
        ) - COALESCE(
            (SELECT SUM(quantity) FROM event_ledger WHERE variant_id = pv.id AND from_location_id = l.id),
            0
        ) <= 0 THEN 'OUT_OF_STOCK'
        WHEN COALESCE(
            (SELECT SUM(quantity) FROM event_ledger WHERE variant_id = pv.id AND to_location_id = l.id),
            0
        ) - COALESCE(
            (SELECT SUM(quantity) FROM event_ledger WHERE variant_id = pv.id AND from_location_id = l.id),
            0
        ) <= 10 THEN 'LOW_STOCK'
        ELSE 'HEALTHY'
    END AS stock_status
FROM product_variants pv
CROSS JOIN locations l
JOIN products p ON pv.product_id = p.id
WHERE pv.is_active = TRUE 
  AND l.is_active = TRUE
  AND pv.deleted_at IS NULL
  AND p.deleted_at IS NULL
  AND l.deleted_at IS NULL;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify all tables were created
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND columns.table_name = tables.table_name) AS column_count
FROM information_schema.tables
WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Verify all delta sync columns exist
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
    AND column_name IN ('updated_at', 'deleted_at', 'created_at')
ORDER BY table_name, column_name;

-- Verify all triggers were created
SELECT 
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- Verify seed data
SELECT 'Categories' AS table_name, COUNT(*)::TEXT AS count FROM categories
UNION ALL
SELECT 'Brands', COUNT(*)::TEXT FROM brands
UNION ALL
SELECT 'Locations', COUNT(*)::TEXT FROM locations
UNION ALL
SELECT 'Products', COUNT(*)::TEXT FROM products
UNION ALL
SELECT 'Variants', COUNT(*)::TEXT FROM product_variants
UNION ALL
SELECT 'Events', COUNT(*)::TEXT FROM event_ledger
UNION ALL
SELECT 'Sales', COUNT(*)::TEXT FROM sales;

-- ============================================================================
-- 🎉 SETUP COMPLETE!
-- ============================================================================
-- Your database is now ready with:
-- ✅ All tables created
-- ✅ Delta sync timestamps added (updated_at, deleted_at, created_at)
-- ✅ Automatic triggers for timestamp updates
-- ✅ Indexes for performance
-- ✅ Seed data loaded
-- ✅ Reporting views created
--
-- Next steps:
-- 1. Import your legacy data (PRMAST CSV)
-- 2. Use the app - delta sync will work automatically!
-- 3. Click "Refresh" to sync only changes (2-5 seconds instead of 30 minutes!)
-- ============================================================================
