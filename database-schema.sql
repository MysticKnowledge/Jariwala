-- =====================================================
-- RETAIL INVENTORY SYSTEM - PostgreSQL Schema
-- Event-Driven, Ledger-First Architecture
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- MASTER TABLES
-- =====================================================

-- 1. PRODUCTS TABLE
-- Stores master product information (e.g., "Cotton T-Shirt")
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL, -- e.g., "T-Shirt", "Jeans", "Shirt"
    company VARCHAR(100), -- Brand/Manufacturer
    hsn_code VARCHAR(8), -- HSN code for GST
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID, -- Reference to user who created
    updated_by UUID, -- Reference to user who last updated
    
    -- Soft delete support (no hard deletes allowed)
    deleted_at TIMESTAMPTZ,
    deleted_by UUID,
    
    CONSTRAINT products_name_not_empty CHECK (TRIM(name) != '')
);

-- Indexes for products
CREATE INDEX idx_products_category ON products(category) WHERE is_active = true;
CREATE INDEX idx_products_company ON products(company) WHERE is_active = true;
CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_products_created_at ON products(created_at DESC);
CREATE INDEX idx_products_name_search ON products USING gin(to_tsvector('english', name));

-- Auto-update timestamp trigger for products
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_products_updated_at 
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================

-- 2. VARIANTS TABLE
-- Stores SKU-level variants (e.g., "Cotton T-Shirt - Red - L")
CREATE TABLE variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    
    -- Variant attributes
    size VARCHAR(20) NOT NULL, -- "S", "M", "L", "XL", "XXL", "32", "34", etc.
    color VARCHAR(50) NOT NULL, -- "Red", "Blue", "Black", etc.
    sku_code VARCHAR(50) NOT NULL UNIQUE, -- Globally unique SKU
    
    -- Pricing
    cost_price DECIMAL(10, 2), -- Purchase/Cost price
    mrp DECIMAL(10, 2) NOT NULL, -- Maximum Retail Price
    selling_price DECIMAL(10, 2) NOT NULL, -- Actual selling price
    
    -- Metadata
    barcode VARCHAR(100) UNIQUE, -- For barcode scanning
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    
    -- Soft delete support
    deleted_at TIMESTAMPTZ,
    deleted_by UUID,
    
    -- Constraints
    CONSTRAINT variants_sku_not_empty CHECK (TRIM(sku_code) != ''),
    CONSTRAINT variants_size_not_empty CHECK (TRIM(size) != ''),
    CONSTRAINT variants_color_not_empty CHECK (TRIM(color) != ''),
    CONSTRAINT variants_prices_positive CHECK (
        cost_price >= 0 AND 
        mrp > 0 AND 
        selling_price > 0
    ),
    CONSTRAINT variants_selling_lte_mrp CHECK (selling_price <= mrp)
);

-- Indexes for variants
CREATE INDEX idx_variants_product_id ON variants(product_id);
CREATE INDEX idx_variants_sku_code ON variants(sku_code);
CREATE INDEX idx_variants_barcode ON variants(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX idx_variants_active ON variants(is_active);
CREATE INDEX idx_variants_size ON variants(size);
CREATE INDEX idx_variants_color ON variants(color);
CREATE INDEX idx_variants_product_active ON variants(product_id, is_active);

-- Composite index for common queries
CREATE INDEX idx_variants_product_size_color ON variants(product_id, size, color) WHERE is_active = true;

-- Trigger for variants updated_at
CREATE TRIGGER update_variants_updated_at 
    BEFORE UPDATE ON variants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================

-- 3. LOCATIONS TABLE
-- Stores all physical and virtual locations
CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL, -- STORE, GODOWN, AMAZON
    
    -- Address details
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    country VARCHAR(100) DEFAULT 'India',
    
    -- Contact details
    phone VARCHAR(20),
    email VARCHAR(255),
    gst_number VARCHAR(15), -- GST registration number
    
    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    
    -- Soft delete support
    deleted_at TIMESTAMPTZ,
    deleted_by UUID,
    
    -- Constraints
    CONSTRAINT locations_name_not_empty CHECK (TRIM(name) != ''),
    CONSTRAINT locations_type_valid CHECK (type IN ('STORE', 'GODOWN', 'AMAZON'))
);

-- Indexes for locations
CREATE INDEX idx_locations_type ON locations(type) WHERE is_active = true;
CREATE INDEX idx_locations_active ON locations(is_active);
CREATE INDEX idx_locations_city ON locations(city) WHERE is_active = true;
CREATE INDEX idx_locations_state ON locations(state) WHERE is_active = true;

-- Trigger for locations updated_at
CREATE TRIGGER update_locations_updated_at 
    BEFORE UPDATE ON locations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================

-- 4. ROLES TABLE
-- Defines user roles in the system
CREATE TABLE roles (
    id SERIAL PRIMARY KEY, -- Using SERIAL for roles as they're predefined
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    permissions JSONB, -- Store role permissions as JSON
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT roles_name_not_empty CHECK (TRIM(name) != '')
);

-- Indexes for roles
CREATE INDEX idx_roles_name ON roles(name);
CREATE INDEX idx_roles_active ON roles(is_active);

-- Trigger for roles updated_at
CREATE TRIGGER update_roles_updated_at 
    BEFORE UPDATE ON roles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert predefined roles
INSERT INTO roles (name, description, permissions) VALUES
('OWNER', 'Business owner with full access', 
 '{"all": true, "manage_users": true, "view_reports": true, "manage_settings": true}'::jsonb),
('MANAGER', 'Store/Operations manager', 
 '{"view_reports": true, "manage_inventory": true, "manage_sales": true, "manage_staff": true}'::jsonb),
('STORE_STAFF', 'Store counter staff', 
 '{"create_bills": true, "process_exchanges": true, "view_inventory": true}'::jsonb),
('GODOWN_STAFF', 'Warehouse/Godown staff', 
 '{"manage_inward": true, "manage_transfers": true, "view_inventory": true}'::jsonb),
('ACCOUNTANT', 'Accountant with financial access', 
 '{"view_reports": true, "view_financials": true, "manage_settlements": true}'::jsonb);

-- =====================================================

-- 5. USER_PROFILES TABLE
-- Links authentication users to roles and locations
-- Assumes auth.users table exists (e.g., Supabase Auth)
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE, -- References auth.users(id)
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    
    -- User details
    full_name VARCHAR(255) NOT NULL,
    employee_code VARCHAR(50) UNIQUE,
    
    -- Primary location assignment
    primary_location_id UUID REFERENCES locations(id) ON DELETE RESTRICT,
    
    -- Contact
    phone VARCHAR(20),
    email VARCHAR(255),
    
    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    
    -- Soft delete support
    deleted_at TIMESTAMPTZ,
    deleted_by UUID,
    
    CONSTRAINT user_profiles_full_name_not_empty CHECK (TRIM(full_name) != '')
);

-- Indexes for user_profiles
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_role_id ON user_profiles(role_id);
CREATE INDEX idx_user_profiles_location_id ON user_profiles(primary_location_id);
CREATE INDEX idx_user_profiles_active ON user_profiles(is_active);
CREATE INDEX idx_user_profiles_employee_code ON user_profiles(employee_code) WHERE employee_code IS NOT NULL;

-- Trigger for user_profiles updated_at
CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================

-- USER_LOCATION_ACCESS TABLE
-- Allows users to access multiple locations (many-to-many)
CREATE TABLE user_location_access (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    
    -- Access permissions for this specific location
    can_view BOOLEAN NOT NULL DEFAULT true,
    can_edit BOOLEAN NOT NULL DEFAULT false,
    can_transfer BOOLEAN NOT NULL DEFAULT false,
    
    -- Timestamps
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    granted_by UUID,
    
    -- Prevent duplicate access entries
    CONSTRAINT user_location_access_unique UNIQUE (user_profile_id, location_id)
);

-- Indexes for user_location_access
CREATE INDEX idx_user_location_access_user ON user_location_access(user_profile_id);
CREATE INDEX idx_user_location_access_location ON user_location_access(location_id);

-- =====================================================
-- TRANSACTION/EVENT TABLES (Ledger-First Design)
-- =====================================================

-- INVENTORY_TRANSACTIONS TABLE
-- Core ledger table - ALL inventory movements are recorded here
-- Stock levels are DERIVED from this table, never stored directly
CREATE TABLE inventory_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Transaction identification
    transaction_number VARCHAR(50) NOT NULL UNIQUE, -- e.g., "GWI-2026-0001"
    transaction_type VARCHAR(30) NOT NULL, -- INWARD, OUTWARD, TRANSFER, ADJUSTMENT, SALE, RETURN, EXCHANGE
    transaction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Variant and location
    variant_id UUID NOT NULL REFERENCES variants(id) ON DELETE RESTRICT,
    from_location_id UUID REFERENCES locations(id) ON DELETE RESTRICT, -- NULL for INWARD
    to_location_id UUID REFERENCES locations(id) ON DELETE RESTRICT, -- NULL for OUTWARD
    
    -- Quantity (positive for inward, negative for outward at location perspective)
    quantity INTEGER NOT NULL,
    
    -- Related document references
    reference_type VARCHAR(30), -- BILL, PURCHASE_ORDER, TRANSFER_NOTE, MANUAL_ADJUSTMENT
    reference_id UUID, -- Foreign key to related table (bills, purchase_orders, etc.)
    reference_number VARCHAR(50), -- Human-readable reference
    
    -- Pricing at transaction time (for historical accuracy)
    unit_cost_price DECIMAL(10, 2),
    unit_selling_price DECIMAL(10, 2),
    
    -- Notes and metadata
    notes TEXT,
    metadata JSONB, -- Store additional flexible data
    
    -- Audit trail
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL, -- User who performed the transaction
    
    -- Sync tracking for offline-to-online
    synced_at TIMESTAMPTZ,
    sync_source VARCHAR(50), -- Which device/location originated this
    
    -- NO DELETE ALLOWED - This is append-only ledger
    -- Reversals must be done with offsetting transactions
    
    CONSTRAINT inventory_txn_quantity_not_zero CHECK (quantity != 0),
    CONSTRAINT inventory_txn_type_valid CHECK (
        transaction_type IN ('INWARD', 'OUTWARD', 'TRANSFER', 'ADJUSTMENT', 
                            'SALE', 'RETURN', 'EXCHANGE_IN', 'EXCHANGE_OUT')
    ),
    CONSTRAINT inventory_txn_location_logic CHECK (
        (transaction_type = 'INWARD' AND from_location_id IS NULL AND to_location_id IS NOT NULL) OR
        (transaction_type = 'OUTWARD' AND from_location_id IS NOT NULL AND to_location_id IS NULL) OR
        (transaction_type = 'TRANSFER' AND from_location_id IS NOT NULL AND to_location_id IS NOT NULL 
         AND from_location_id != to_location_id) OR
        (transaction_type IN ('SALE', 'RETURN', 'EXCHANGE_IN', 'EXCHANGE_OUT', 'ADJUSTMENT'))
    )
);

-- Critical indexes for inventory_transactions
CREATE INDEX idx_inv_txn_variant_id ON inventory_transactions(variant_id);
CREATE INDEX idx_inv_txn_from_location ON inventory_transactions(from_location_id) WHERE from_location_id IS NOT NULL;
CREATE INDEX idx_inv_txn_to_location ON inventory_transactions(to_location_id) WHERE to_location_id IS NOT NULL;
CREATE INDEX idx_inv_txn_date ON inventory_transactions(transaction_date DESC);
CREATE INDEX idx_inv_txn_type ON inventory_transactions(transaction_type);
CREATE INDEX idx_inv_txn_reference ON inventory_transactions(reference_type, reference_id) WHERE reference_id IS NOT NULL;
CREATE INDEX idx_inv_txn_created_by ON inventory_transactions(created_by);
CREATE INDEX idx_inv_txn_sync ON inventory_transactions(synced_at) WHERE synced_at IS NULL;

-- Composite indexes for common stock calculation queries
CREATE INDEX idx_inv_txn_variant_location_date ON inventory_transactions(variant_id, to_location_id, transaction_date DESC);
CREATE INDEX idx_inv_txn_location_variant ON inventory_transactions(to_location_id, variant_id) WHERE to_location_id IS NOT NULL;

-- Prevent accidental deletes on inventory_transactions
CREATE OR REPLACE FUNCTION prevent_inventory_transaction_delete()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Deleting inventory transactions is not allowed. Use offsetting transactions instead.';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_inventory_txn_delete
    BEFORE DELETE ON inventory_transactions
    FOR EACH ROW
    EXECUTE FUNCTION prevent_inventory_transaction_delete();

-- =====================================================

-- MATERIALIZED VIEW: CURRENT_STOCK_LEVELS
-- This view calculates current stock from the ledger
-- Refreshed periodically for performance
CREATE MATERIALIZED VIEW current_stock_levels AS
SELECT 
    v.id AS variant_id,
    v.product_id,
    v.sku_code,
    l.id AS location_id,
    l.name AS location_name,
    l.type AS location_type,
    
    -- Calculate stock by summing all transactions
    COALESCE(SUM(
        CASE 
            WHEN it.to_location_id = l.id THEN it.quantity
            WHEN it.from_location_id = l.id THEN -it.quantity
            ELSE 0
        END
    ), 0) AS current_quantity,
    
    -- Last transaction date for this variant-location combination
    MAX(it.transaction_date) AS last_transaction_date,
    
    -- Total inward and outward for analysis
    COALESCE(SUM(CASE WHEN it.to_location_id = l.id THEN it.quantity ELSE 0 END), 0) AS total_inward,
    COALESCE(SUM(CASE WHEN it.from_location_id = l.id THEN it.quantity ELSE 0 END), 0) AS total_outward,
    
    NOW() AS refreshed_at
FROM 
    variants v
    CROSS JOIN locations l
    LEFT JOIN inventory_transactions it ON (
        (it.variant_id = v.id) AND 
        (it.to_location_id = l.id OR it.from_location_id = l.id)
    )
WHERE 
    v.is_active = true AND 
    l.is_active = true
GROUP BY 
    v.id, v.product_id, v.sku_code, l.id, l.name, l.type;

-- Indexes on materialized view
CREATE INDEX idx_current_stock_variant ON current_stock_levels(variant_id);
CREATE INDEX idx_current_stock_location ON current_stock_levels(location_id);
CREATE INDEX idx_current_stock_sku ON current_stock_levels(sku_code);
CREATE INDEX idx_current_stock_positive ON current_stock_levels(location_id, variant_id) 
    WHERE current_quantity > 0;

-- Function to refresh stock levels
CREATE OR REPLACE FUNCTION refresh_stock_levels()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY current_stock_levels;
END;
$$ LANGUAGE plpgsql;

-- =====================================================

-- AUDIT_LOG TABLE
-- Comprehensive audit trail for all critical operations
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- What happened
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL, -- INSERT, UPDATE, DELETE, CUSTOM
    
    -- Who did it
    user_id UUID NOT NULL,
    user_role VARCHAR(50),
    
    -- When and where
    action_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    location_id UUID REFERENCES locations(id),
    
    -- What changed
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[], -- Array of field names that changed
    
    -- Context
    action_description TEXT,
    ip_address INET,
    user_agent TEXT,
    
    -- Sync tracking
    sync_source VARCHAR(50),
    
    CONSTRAINT audit_log_action_valid CHECK (action IN ('INSERT', 'UPDATE', 'DELETE', 'CUSTOM'))
);

-- Indexes for audit_log
CREATE INDEX idx_audit_log_table_record ON audit_log(table_name, record_id);
CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_timestamp ON audit_log(action_timestamp DESC);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_location ON audit_log(location_id) WHERE location_id IS NOT NULL;

-- Partition audit_log by month for performance (optional, for high-volume systems)
-- CREATE TABLE audit_log_y2026m01 PARTITION OF audit_log
--     FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

-- =====================================================

-- SYNC_QUEUE TABLE
-- For offline-to-online synchronization
CREATE TABLE sync_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Sync metadata
    source_location_id UUID NOT NULL REFERENCES locations(id),
    source_device_id VARCHAR(100) NOT NULL, -- Unique device identifier
    
    -- What to sync
    table_name VARCHAR(100) NOT NULL,
    operation VARCHAR(20) NOT NULL, -- INSERT, UPDATE, DELETE
    record_data JSONB NOT NULL, -- Complete record data
    record_id UUID NOT NULL, -- ID of the record being synced
    
    -- Sync status
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, PROCESSING, COMPLETED, FAILED
    sync_attempts INTEGER NOT NULL DEFAULT 0,
    last_attempt_at TIMESTAMPTZ,
    error_message TEXT,
    
    -- Conflict resolution
    client_timestamp TIMESTAMPTZ NOT NULL,
    server_timestamp TIMESTAMPTZ DEFAULT NOW(),
    conflict_detected BOOLEAN DEFAULT false,
    conflict_resolved BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    
    CONSTRAINT sync_queue_status_valid CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
    CONSTRAINT sync_queue_operation_valid CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE'))
);

-- Indexes for sync_queue
CREATE INDEX idx_sync_queue_status ON sync_queue(status) WHERE status IN ('PENDING', 'FAILED');
CREATE INDEX idx_sync_queue_location ON sync_queue(source_location_id);
CREATE INDEX idx_sync_queue_device ON sync_queue(source_device_id);
CREATE INDEX idx_sync_queue_table_record ON sync_queue(table_name, record_id);
CREATE INDEX idx_sync_queue_created ON sync_queue(created_at DESC);

-- =====================================================
-- HELPER FUNCTIONS & VIEWS
-- =====================================================

-- Function to get current stock for a variant at a location
CREATE OR REPLACE FUNCTION get_current_stock(
    p_variant_id UUID,
    p_location_id UUID
)
RETURNS INTEGER AS $$
DECLARE
    v_stock INTEGER;
BEGIN
    SELECT current_quantity INTO v_stock
    FROM current_stock_levels
    WHERE variant_id = p_variant_id AND location_id = p_location_id;
    
    RETURN COALESCE(v_stock, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to get stock history for a variant at a location
CREATE OR REPLACE FUNCTION get_stock_history(
    p_variant_id UUID,
    p_location_id UUID,
    p_from_date TIMESTAMPTZ DEFAULT NULL,
    p_to_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
    transaction_date TIMESTAMPTZ,
    transaction_type VARCHAR,
    quantity INTEGER,
    reference_number VARCHAR,
    running_balance BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        it.transaction_date,
        it.transaction_type,
        CASE 
            WHEN it.to_location_id = p_location_id THEN it.quantity
            WHEN it.from_location_id = p_location_id THEN -it.quantity
        END AS quantity,
        it.reference_number,
        SUM(
            CASE 
                WHEN it.to_location_id = p_location_id THEN it.quantity
                WHEN it.from_location_id = p_location_id THEN -it.quantity
            END
        ) OVER (ORDER BY it.transaction_date, it.created_at) AS running_balance
    FROM inventory_transactions it
    WHERE 
        it.variant_id = p_variant_id
        AND (it.to_location_id = p_location_id OR it.from_location_id = p_location_id)
        AND (p_from_date IS NULL OR it.transaction_date >= p_from_date)
        AND (p_to_date IS NULL OR it.transaction_date <= p_to_date)
    ORDER BY it.transaction_date DESC, it.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- View: Low stock items (configurable threshold)
CREATE OR REPLACE VIEW low_stock_items AS
SELECT 
    csl.variant_id,
    v.sku_code,
    p.name AS product_name,
    v.size,
    v.color,
    csl.location_id,
    csl.location_name,
    csl.current_quantity,
    10 AS threshold -- This could be configurable per product/location
FROM current_stock_levels csl
JOIN variants v ON csl.variant_id = v.id
JOIN products p ON v.product_id = p.id
WHERE 
    csl.current_quantity > 0 
    AND csl.current_quantity <= 10
    AND csl.location_type = 'STORE' -- Alert only for stores, not godowns
    AND v.is_active = true
    AND p.is_active = true;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE products IS 'Master product catalog (e.g., T-Shirt, Jeans)';
COMMENT ON TABLE variants IS 'SKU-level variants with size, color, and pricing';
COMMENT ON TABLE locations IS 'All physical stores, godowns, and virtual locations like Amazon';
COMMENT ON TABLE roles IS 'User role definitions with permissions';
COMMENT ON TABLE user_profiles IS 'User profiles linked to authentication and roles';
COMMENT ON TABLE user_location_access IS 'Multi-location access control for users';
COMMENT ON TABLE inventory_transactions IS 'Immutable ledger of ALL inventory movements - stock is derived from this';
COMMENT ON MATERIALIZED VIEW current_stock_levels IS 'Materialized view of current stock calculated from transactions';
COMMENT ON TABLE audit_log IS 'Comprehensive audit trail for compliance and debugging';
COMMENT ON TABLE sync_queue IS 'Queue for offline-to-online synchronization with conflict detection';

COMMENT ON COLUMN inventory_transactions.quantity IS 'Quantity in transaction - positive for additions, negative for reductions';
COMMENT ON COLUMN inventory_transactions.from_location_id IS 'Source location (NULL for INWARD operations)';
COMMENT ON COLUMN inventory_transactions.to_location_id IS 'Destination location (NULL for OUTWARD operations)';
COMMENT ON COLUMN variants.sku_code IS 'Globally unique SKU identifier for this variant';

-- =====================================================
-- SAMPLE QUERIES
-- =====================================================

-- Get current stock for all variants at Main Store
-- SELECT v.sku_code, p.name, v.size, v.color, 
--        get_current_stock(v.id, 'LOCATION_UUID_HERE') as stock
-- FROM variants v
-- JOIN products p ON v.product_id = p.id
-- WHERE v.is_active = true;

-- Get stock history for a specific variant at a location
-- SELECT * FROM get_stock_history(
--     'VARIANT_UUID_HERE'::uuid, 
--     'LOCATION_UUID_HERE'::uuid,
--     '2026-01-01'::timestamptz,
--     NOW()
-- );

-- =====================================================
-- SECURITY POLICIES (Optional - for Row Level Security)
-- =====================================================

-- Enable RLS on sensitive tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;

-- Example policy: Users can only see their own profile
-- CREATE POLICY user_profiles_select_own ON user_profiles
--     FOR SELECT
--     USING (user_id = auth.uid());

-- Example policy: Users can only see transactions from their assigned locations
-- CREATE POLICY inventory_txn_location_access ON inventory_transactions
--     FOR SELECT
--     USING (
--         to_location_id IN (
--             SELECT location_id FROM user_location_access 
--             WHERE user_profile_id = (
--                 SELECT id FROM user_profiles WHERE user_id = auth.uid()
--             )
--         )
--     );

-- =====================================================
-- END OF SCHEMA
-- =====================================================
