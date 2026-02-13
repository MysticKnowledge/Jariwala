-- ============================================================================
-- DELTA SYNC SUPPORT: Add timestamps for offline-first sync
-- ============================================================================
-- This migration adds updated_at and deleted_at columns to all tables
-- to support delta synchronization between offline and online systems.
--
-- Features:
-- 1. updated_at: Auto-updated timestamp on every record change
-- 2. deleted_at: Soft delete support (NULL = active, timestamp = deleted)
-- 3. Automatic triggers to maintain updated_at
-- ============================================================================

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PRODUCTS TABLE
-- ============================================================================
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Create index for delta sync queries
CREATE INDEX IF NOT EXISTS idx_products_updated_at ON products(updated_at);
CREATE INDEX IF NOT EXISTS idx_products_deleted_at ON products(deleted_at);

-- Create trigger
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PRODUCT_VARIANTS TABLE
-- ============================================================================
ALTER TABLE product_variants 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_product_variants_updated_at ON product_variants(updated_at);
CREATE INDEX IF NOT EXISTS idx_product_variants_deleted_at ON product_variants(deleted_at);

DROP TRIGGER IF EXISTS update_product_variants_updated_at ON product_variants;
CREATE TRIGGER update_product_variants_updated_at
    BEFORE UPDATE ON product_variants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- LOCATIONS TABLE
-- ============================================================================
ALTER TABLE locations 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_locations_updated_at ON locations(updated_at);
CREATE INDEX IF NOT EXISTS idx_locations_deleted_at ON locations(deleted_at);

DROP TRIGGER IF EXISTS update_locations_updated_at ON locations;
CREATE TRIGGER update_locations_updated_at
    BEFORE UPDATE ON locations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- EVENT_LEDGER TABLE (Insert-only, but track timestamp for sync)
-- ============================================================================
ALTER TABLE event_ledger 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_event_ledger_created_at ON event_ledger(created_at);

-- Note: event_ledger is append-only, so no updated_at or deleted_at needed
-- We use created_at to sync new events

-- ============================================================================
-- CATEGORIES TABLE
-- ============================================================================
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_categories_updated_at ON categories(updated_at);
CREATE INDEX IF NOT EXISTS idx_categories_deleted_at ON categories(deleted_at);

DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SALES TABLE
-- ============================================================================
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_sales_updated_at ON sales(updated_at);
CREATE INDEX IF NOT EXISTS idx_sales_deleted_at ON sales(deleted_at);

DROP TRIGGER IF EXISTS update_sales_updated_at ON sales;
CREATE TRIGGER update_sales_updated_at
    BEFORE UPDATE ON sales
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SALE_ITEMS TABLE
-- ============================================================================
ALTER TABLE sale_items 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_sale_items_updated_at ON sale_items(updated_at);
CREATE INDEX IF NOT EXISTS idx_sale_items_deleted_at ON sale_items(deleted_at);

DROP TRIGGER IF EXISTS update_sale_items_updated_at ON sale_items;
CREATE TRIGGER update_sale_items_updated_at
    BEFORE UPDATE ON sale_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- EXCHANGES TABLE
-- ============================================================================
ALTER TABLE exchanges 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_exchanges_updated_at ON exchanges(updated_at);
CREATE INDEX IF NOT EXISTS idx_exchanges_deleted_at ON exchanges(deleted_at);

DROP TRIGGER IF EXISTS update_exchanges_updated_at ON exchanges;
CREATE TRIGGER update_exchanges_updated_at
    BEFORE UPDATE ON exchanges
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify all columns were added
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
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
    AND trigger_name LIKE '%updated_at%'
ORDER BY event_object_table;

-- Verify all indexes were created
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
    AND (indexname LIKE '%updated_at%' OR indexname LIKE '%deleted_at%' OR indexname LIKE '%created_at%')
ORDER BY tablename, indexname;

-- ============================================================================
-- COMPLETE! 
-- ============================================================================
-- Now you can:
-- 1. Fetch only changed records: WHERE updated_at > $lastSync
-- 2. Fetch deleted records: WHERE deleted_at > $lastSync
-- 3. Fetch new events: WHERE created_at > $lastSync
-- 4. Soft delete: UPDATE products SET deleted_at = NOW() WHERE id = $id
-- ============================================================================
