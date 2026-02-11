-- =====================================================
-- EVENT LEDGER & ROW LEVEL SECURITY (RLS)
-- Append-Only Ledger with Database-Level Access Control
-- =====================================================

-- =====================================================
-- EVENT_LEDGER TABLE
-- Immutable, append-only transaction log
-- =====================================================

CREATE TABLE event_ledger (
    -- Primary identifier
    event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Event classification
    event_type VARCHAR(30) NOT NULL,
    
    -- What was affected
    variant_id UUID NOT NULL REFERENCES variants(id) ON DELETE RESTRICT,
    
    -- Quantity change (positive = increase, negative = decrease)
    quantity INTEGER NOT NULL,
    
    -- Location tracking
    from_location_id UUID REFERENCES locations(id) ON DELETE RESTRICT,
    to_location_id UUID REFERENCES locations(id) ON DELETE RESTRICT,
    
    -- Channel of transaction
    channel VARCHAR(20) NOT NULL DEFAULT 'STORE',
    
    -- Reference to related documents
    reference_type VARCHAR(50), -- e.g., 'BILL', 'PURCHASE_ORDER', 'TRANSFER_NOTE'
    reference_id UUID, -- Foreign key to related table
    reference_number VARCHAR(100), -- Human-readable reference
    
    -- Pricing information (snapshot at event time)
    unit_cost_price DECIMAL(10, 2),
    unit_selling_price DECIMAL(10, 2),
    total_amount DECIMAL(10, 2),
    
    -- Additional context
    notes TEXT,
    metadata JSONB, -- Flexible additional data
    
    -- Audit trail
    created_by UUID NOT NULL, -- References user_profiles(user_id) or auth.users(id)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Offline sync support
    sync_source VARCHAR(100), -- Device/location that originated this event
    client_timestamp TIMESTAMPTZ, -- Original timestamp from client
    
    -- Constraints
    CONSTRAINT event_ledger_quantity_not_zero CHECK (quantity != 0),
    CONSTRAINT event_ledger_type_valid CHECK (
        event_type IN (
            'SALE', 'PURCHASE', 'TRANSFER_OUT', 'TRANSFER_IN', 
            'RETURN', 'EXCHANGE_IN', 'EXCHANGE_OUT', 'ADJUSTMENT',
            'DAMAGE', 'LOSS', 'FOUND'
        )
    ),
    CONSTRAINT event_ledger_channel_valid CHECK (
        channel IN ('STORE', 'AMAZON', 'WEBSITE', 'WHOLESALE', 'MANUAL')
    ),
    CONSTRAINT event_ledger_location_logic CHECK (
        -- PURCHASE must have to_location
        (event_type = 'PURCHASE' AND to_location_id IS NOT NULL AND from_location_id IS NULL) OR
        -- SALE must have from_location
        (event_type = 'SALE' AND from_location_id IS NOT NULL AND to_location_id IS NULL) OR
        -- TRANSFER must have both locations and they must be different
        (event_type IN ('TRANSFER_OUT', 'TRANSFER_IN') AND 
         from_location_id IS NOT NULL AND to_location_id IS NOT NULL AND
         from_location_id != to_location_id) OR
        -- Other types must have at least one location
        (event_type IN ('RETURN', 'EXCHANGE_IN', 'EXCHANGE_OUT', 'ADJUSTMENT', 'DAMAGE', 'LOSS', 'FOUND') AND
         (from_location_id IS NOT NULL OR to_location_id IS NOT NULL))
    )
);

-- =====================================================
-- INDEXES FOR EVENT_LEDGER
-- =====================================================

-- Primary query indexes
CREATE INDEX idx_event_ledger_variant_id ON event_ledger(variant_id);
CREATE INDEX idx_event_ledger_from_location ON event_ledger(from_location_id) 
    WHERE from_location_id IS NOT NULL;
CREATE INDEX idx_event_ledger_to_location ON event_ledger(to_location_id) 
    WHERE to_location_id IS NOT NULL;
CREATE INDEX idx_event_ledger_created_at ON event_ledger(created_at DESC);

-- Additional useful indexes
CREATE INDEX idx_event_ledger_event_type ON event_ledger(event_type);
CREATE INDEX idx_event_ledger_channel ON event_ledger(channel);
CREATE INDEX idx_event_ledger_created_by ON event_ledger(created_by);
CREATE INDEX idx_event_ledger_reference ON event_ledger(reference_type, reference_id) 
    WHERE reference_id IS NOT NULL;

-- Composite indexes for common queries
CREATE INDEX idx_event_ledger_variant_location_date ON event_ledger(
    variant_id, to_location_id, created_at DESC
) WHERE to_location_id IS NOT NULL;

CREATE INDEX idx_event_ledger_location_date ON event_ledger(
    COALESCE(to_location_id, from_location_id), created_at DESC
);

-- Index for sync operations
CREATE INDEX idx_event_ledger_sync ON event_ledger(sync_source, client_timestamp) 
    WHERE sync_source IS NOT NULL;

-- =====================================================
-- PREVENT UPDATE AND DELETE ON EVENT_LEDGER
-- =====================================================

-- Trigger to prevent UPDATE operations
CREATE OR REPLACE FUNCTION prevent_event_ledger_update()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'UPDATE operations are not allowed on event_ledger. This is an append-only table.';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_event_ledger_update_trigger
    BEFORE UPDATE ON event_ledger
    FOR EACH ROW
    EXECUTE FUNCTION prevent_event_ledger_update();

-- Trigger to prevent DELETE operations
CREATE OR REPLACE FUNCTION prevent_event_ledger_delete()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'DELETE operations are not allowed on event_ledger. Use offsetting transactions to reverse entries.';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_event_ledger_delete_trigger
    BEFORE DELETE ON event_ledger
    FOR EACH ROW
    EXECUTE FUNCTION prevent_event_ledger_delete();

-- =====================================================
-- CURRENT_STOCK_VIEW
-- Read-only view aggregating event_ledger
-- =====================================================

CREATE OR REPLACE VIEW current_stock_view AS
WITH stock_calculations AS (
    SELECT 
        v.id AS variant_id,
        v.product_id,
        v.sku_code,
        v.size,
        v.color,
        v.barcode,
        l.id AS location_id,
        l.name AS location_name,
        l.type AS location_type,
        
        -- Calculate net quantity for this location
        COALESCE(SUM(
            CASE 
                -- Inbound events increase stock
                WHEN el.to_location_id = l.id THEN el.quantity
                -- Outbound events decrease stock
                WHEN el.from_location_id = l.id THEN -el.quantity
                ELSE 0
            END
        ), 0) AS current_quantity,
        
        -- Breakdown by event type for analysis
        COALESCE(SUM(CASE WHEN el.event_type = 'PURCHASE' AND el.to_location_id = l.id THEN el.quantity ELSE 0 END), 0) AS total_purchased,
        COALESCE(SUM(CASE WHEN el.event_type = 'SALE' AND el.from_location_id = l.id THEN ABS(el.quantity) ELSE 0 END), 0) AS total_sold,
        COALESCE(SUM(CASE WHEN el.event_type = 'TRANSFER_IN' AND el.to_location_id = l.id THEN el.quantity ELSE 0 END), 0) AS total_transferred_in,
        COALESCE(SUM(CASE WHEN el.event_type = 'TRANSFER_OUT' AND el.from_location_id = l.id THEN ABS(el.quantity) ELSE 0 END), 0) AS total_transferred_out,
        COALESCE(SUM(CASE WHEN el.event_type = 'RETURN' AND el.to_location_id = l.id THEN el.quantity ELSE 0 END), 0) AS total_returned,
        COALESCE(SUM(CASE WHEN el.event_type IN ('DAMAGE', 'LOSS') AND el.from_location_id = l.id THEN ABS(el.quantity) ELSE 0 END), 0) AS total_losses,
        
        -- Last activity timestamp
        MAX(el.created_at) AS last_transaction_date,
        
        -- Total events count
        COUNT(el.event_id) AS total_events
        
    FROM 
        variants v
        CROSS JOIN locations l
        LEFT JOIN event_ledger el ON (
            el.variant_id = v.id AND 
            (el.to_location_id = l.id OR el.from_location_id = l.id)
        )
    WHERE 
        v.is_active = true AND 
        l.is_active = true
    GROUP BY 
        v.id, v.product_id, v.sku_code, v.size, v.color, v.barcode,
        l.id, l.name, l.type
)
SELECT 
    sc.*,
    p.name AS product_name,
    p.category AS product_category,
    p.company AS product_company,
    v.mrp,
    v.selling_price,
    v.cost_price,
    
    -- Stock status indicator
    CASE 
        WHEN sc.current_quantity <= 0 THEN 'OUT_OF_STOCK'
        WHEN sc.current_quantity <= 5 THEN 'LOW_STOCK'
        WHEN sc.current_quantity <= 20 THEN 'MEDIUM_STOCK'
        ELSE 'IN_STOCK'
    END AS stock_status,
    
    -- Calculate stock value
    (sc.current_quantity * COALESCE(v.cost_price, 0)) AS stock_value_cost,
    (sc.current_quantity * v.selling_price) AS stock_value_selling,
    
    NOW() AS calculated_at
FROM 
    stock_calculations sc
    JOIN variants v ON sc.variant_id = v.id
    JOIN products p ON sc.product_id = p.id;

-- Add comment
COMMENT ON VIEW current_stock_view IS 'Read-only view showing current stock calculated from event_ledger. NO WRITES ALLOWED.';

-- =====================================================
-- INDEXES ON VIEW (for materialized view alternative)
-- =====================================================

-- If you want to create a materialized view for better performance:
/*
CREATE MATERIALIZED VIEW current_stock_materialized AS
SELECT * FROM current_stock_view;

CREATE UNIQUE INDEX idx_current_stock_mat_variant_location 
    ON current_stock_materialized(variant_id, location_id);
CREATE INDEX idx_current_stock_mat_location ON current_stock_materialized(location_id);
CREATE INDEX idx_current_stock_mat_sku ON current_stock_materialized(sku_code);
CREATE INDEX idx_current_stock_mat_status ON current_stock_materialized(stock_status);
CREATE INDEX idx_current_stock_mat_low_stock ON current_stock_materialized(location_id, variant_id) 
    WHERE stock_status IN ('OUT_OF_STOCK', 'LOW_STOCK');

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_current_stock()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY current_stock_materialized;
END;
$$ LANGUAGE plpgsql;
*/

-- =====================================================
-- HELPER FUNCTIONS FOR STOCK QUERIES
-- =====================================================

-- Get current stock for a specific variant at a location
CREATE OR REPLACE FUNCTION get_stock_at_location(
    p_variant_id UUID,
    p_location_id UUID
)
RETURNS INTEGER AS $$
DECLARE
    v_quantity INTEGER;
BEGIN
    SELECT current_quantity INTO v_quantity
    FROM current_stock_view
    WHERE variant_id = p_variant_id AND location_id = p_location_id;
    
    RETURN COALESCE(v_quantity, 0);
END;
$$ LANGUAGE plpgsql STABLE;

-- Get stock across all locations for a variant
CREATE OR REPLACE FUNCTION get_total_stock_for_variant(
    p_variant_id UUID
)
RETURNS TABLE (
    location_id UUID,
    location_name VARCHAR,
    location_type VARCHAR,
    quantity INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        csv.location_id,
        csv.location_name,
        csv.location_type,
        csv.current_quantity
    FROM current_stock_view csv
    WHERE csv.variant_id = p_variant_id
    ORDER BY csv.current_quantity DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- ROW LEVEL SECURITY (RLS) SETUP
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_location_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- HELPER FUNCTIONS FOR RLS
-- =====================================================

-- Get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS VARCHAR AS $$
    SELECT r.name
    FROM user_profiles up
    JOIN roles r ON up.role_id = r.id
    WHERE up.user_id = auth.uid()
    AND up.is_active = true
    LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Check if user is owner or manager
CREATE OR REPLACE FUNCTION is_owner_or_manager()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1
        FROM user_profiles up
        JOIN roles r ON up.role_id = r.id
        WHERE up.user_id = auth.uid()
        AND r.name IN ('OWNER', 'MANAGER')
        AND up.is_active = true
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Check if user is accountant
CREATE OR REPLACE FUNCTION is_accountant()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1
        FROM user_profiles up
        JOIN roles r ON up.role_id = r.id
        WHERE up.user_id = auth.uid()
        AND r.name = 'ACCOUNTANT'
        AND up.is_active = true
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Get user's accessible location IDs
CREATE OR REPLACE FUNCTION get_user_location_ids()
RETURNS SETOF UUID AS $$
    -- Primary location
    SELECT primary_location_id
    FROM user_profiles
    WHERE user_id = auth.uid()
    AND is_active = true
    AND primary_location_id IS NOT NULL
    
    UNION
    
    -- Additional locations from access table
    SELECT ula.location_id
    FROM user_location_access ula
    JOIN user_profiles up ON ula.user_profile_id = up.id
    WHERE up.user_id = auth.uid()
    AND ula.can_view = true;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Check if user has access to a specific location
CREATE OR REPLACE FUNCTION has_location_access(p_location_id UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM get_user_location_ids() WHERE get_user_location_ids = p_location_id
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- =====================================================
-- RLS POLICIES: PRODUCTS
-- =====================================================

-- OWNER & MANAGER: Full access
CREATE POLICY products_owner_manager_all ON products
    FOR ALL
    USING (is_owner_or_manager());

-- STORE_STAFF, GODOWN, ACCOUNTANT: Read-only access
CREATE POLICY products_staff_select ON products
    FOR SELECT
    USING (true); -- All authenticated users can read products

-- INSERT: Only OWNER and MANAGER
CREATE POLICY products_insert ON products
    FOR INSERT
    WITH CHECK (is_owner_or_manager());

-- UPDATE: Only OWNER and MANAGER
CREATE POLICY products_update ON products
    FOR UPDATE
    USING (is_owner_or_manager());

-- DELETE: Only OWNER (soft delete via updated_at)
CREATE POLICY products_delete ON products
    FOR DELETE
    USING (get_user_role() = 'OWNER');

-- =====================================================
-- RLS POLICIES: VARIANTS
-- =====================================================

-- OWNER & MANAGER: Full access
CREATE POLICY variants_owner_manager_all ON variants
    FOR ALL
    USING (is_owner_or_manager());

-- STORE_STAFF, GODOWN, ACCOUNTANT: Read-only access
CREATE POLICY variants_staff_select ON variants
    FOR SELECT
    USING (true);

-- INSERT: Only OWNER and MANAGER
CREATE POLICY variants_insert ON variants
    FOR INSERT
    WITH CHECK (is_owner_or_manager());

-- UPDATE: Only OWNER and MANAGER
CREATE POLICY variants_update ON variants
    FOR UPDATE
    USING (is_owner_or_manager());

-- =====================================================
-- RLS POLICIES: LOCATIONS
-- =====================================================

-- OWNER & MANAGER: Full access
CREATE POLICY locations_owner_manager_all ON locations
    FOR ALL
    USING (is_owner_or_manager());

-- STORE_STAFF & GODOWN: Can only see their assigned locations
CREATE POLICY locations_staff_select ON locations
    FOR SELECT
    USING (
        is_owner_or_manager() OR
        id IN (SELECT get_user_location_ids())
    );

-- ACCOUNTANT: Can see all locations (for reports)
CREATE POLICY locations_accountant_select ON locations
    FOR SELECT
    USING (is_accountant());

-- =====================================================
-- RLS POLICIES: USER_PROFILES
-- =====================================================

-- Users can view their own profile
CREATE POLICY user_profiles_own_select ON user_profiles
    FOR SELECT
    USING (user_id = auth.uid());

-- OWNER & MANAGER: Can see all profiles
CREATE POLICY user_profiles_owner_manager_select ON user_profiles
    FOR SELECT
    USING (is_owner_or_manager());

-- Only OWNER can insert/update/delete user profiles
CREATE POLICY user_profiles_owner_insert ON user_profiles
    FOR INSERT
    WITH CHECK (get_user_role() = 'OWNER');

CREATE POLICY user_profiles_owner_update ON user_profiles
    FOR UPDATE
    USING (get_user_role() = 'OWNER');

CREATE POLICY user_profiles_owner_delete ON user_profiles
    FOR DELETE
    USING (get_user_role() = 'OWNER');

-- =====================================================
-- RLS POLICIES: USER_LOCATION_ACCESS
-- =====================================================

-- Users can view their own access
CREATE POLICY user_location_access_own_select ON user_location_access
    FOR SELECT
    USING (
        user_profile_id IN (
            SELECT id FROM user_profiles WHERE user_id = auth.uid()
        )
    );

-- OWNER & MANAGER: Can see all access records
CREATE POLICY user_location_access_owner_manager_select ON user_location_access
    FOR SELECT
    USING (is_owner_or_manager());

-- Only OWNER can manage access
CREATE POLICY user_location_access_owner_all ON user_location_access
    FOR ALL
    USING (get_user_role() = 'OWNER');

-- =====================================================
-- RLS POLICIES: EVENT_LEDGER
-- =====================================================

-- OWNER & MANAGER: Can see all events
CREATE POLICY event_ledger_owner_manager_select ON event_ledger
    FOR SELECT
    USING (is_owner_or_manager());

-- ACCOUNTANT: Can see all events (read-only for reports)
CREATE POLICY event_ledger_accountant_select ON event_ledger
    FOR SELECT
    USING (is_accountant());

-- STORE_STAFF: Can only see events from their assigned stores
CREATE POLICY event_ledger_store_staff_select ON event_ledger
    FOR SELECT
    USING (
        get_user_role() = 'STORE_STAFF' AND (
            from_location_id IN (SELECT get_user_location_ids()) OR
            to_location_id IN (SELECT get_user_location_ids())
        )
    );

-- GODOWN: Can only see events from their assigned godowns
CREATE POLICY event_ledger_godown_select ON event_ledger
    FOR SELECT
    USING (
        get_user_role() = 'GODOWN_STAFF' AND (
            from_location_id IN (SELECT get_user_location_ids()) OR
            to_location_id IN (SELECT get_user_location_ids())
        )
    );

-- INSERT policies: Users can only create events for their locations
CREATE POLICY event_ledger_insert ON event_ledger
    FOR INSERT
    WITH CHECK (
        -- OWNER & MANAGER can insert anywhere
        is_owner_or_manager() OR
        
        -- STORE_STAFF can insert for their stores
        (get_user_role() = 'STORE_STAFF' AND (
            (from_location_id IS NULL OR has_location_access(from_location_id)) AND
            (to_location_id IS NULL OR has_location_access(to_location_id))
        )) OR
        
        -- GODOWN can insert for their godowns
        (get_user_role() = 'GODOWN_STAFF' AND (
            (from_location_id IS NULL OR has_location_access(from_location_id)) AND
            (to_location_id IS NULL OR has_location_access(to_location_id))
        ))
    );

-- UPDATE & DELETE: Prevented by triggers, but add RLS as additional layer
CREATE POLICY event_ledger_no_update ON event_ledger
    FOR UPDATE
    USING (false); -- No one can update

CREATE POLICY event_ledger_no_delete ON event_ledger
    FOR DELETE
    USING (false); -- No one can delete

-- =====================================================
-- RLS POLICIES: AUDIT_LOG
-- =====================================================

-- OWNER & MANAGER: Can see all audit logs
CREATE POLICY audit_log_owner_manager_select ON audit_log
    FOR SELECT
    USING (is_owner_or_manager());

-- ACCOUNTANT: Can see all audit logs (for compliance)
CREATE POLICY audit_log_accountant_select ON audit_log
    FOR SELECT
    USING (is_accountant());

-- Users can see their own actions
CREATE POLICY audit_log_own_select ON audit_log
    FOR SELECT
    USING (user_id = auth.uid());

-- INSERT: All authenticated users can write to audit log
CREATE POLICY audit_log_insert ON audit_log
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE & DELETE: No one can modify audit logs
CREATE POLICY audit_log_no_update ON audit_log
    FOR UPDATE
    USING (false);

CREATE POLICY audit_log_no_delete ON audit_log
    FOR DELETE
    USING (false);

-- =====================================================
-- VALIDATION FUNCTIONS
-- =====================================================

-- Function to validate event before insert (additional business logic)
CREATE OR REPLACE FUNCTION validate_event_insert()
RETURNS TRIGGER AS $$
DECLARE
    v_available_stock INTEGER;
    v_location_type VARCHAR;
BEGIN
    -- For SALE events, check if enough stock exists
    IF NEW.event_type = 'SALE' AND NEW.from_location_id IS NOT NULL THEN
        SELECT get_stock_at_location(NEW.variant_id, NEW.from_location_id) 
        INTO v_available_stock;
        
        IF v_available_stock + NEW.quantity < 0 THEN
            RAISE EXCEPTION 'Insufficient stock. Available: %, Requested: %', 
                v_available_stock, ABS(NEW.quantity);
        END IF;
    END IF;
    
    -- For TRANSFER_OUT, check stock at source location
    IF NEW.event_type = 'TRANSFER_OUT' AND NEW.from_location_id IS NOT NULL THEN
        SELECT get_stock_at_location(NEW.variant_id, NEW.from_location_id) 
        INTO v_available_stock;
        
        IF v_available_stock + NEW.quantity < 0 THEN
            RAISE EXCEPTION 'Insufficient stock for transfer. Available: %, Requested: %', 
                v_available_stock, ABS(NEW.quantity);
        END IF;
    END IF;
    
    -- Validate channel matches location type
    IF NEW.to_location_id IS NOT NULL THEN
        SELECT type INTO v_location_type 
        FROM locations 
        WHERE id = NEW.to_location_id;
        
        IF v_location_type = 'AMAZON' AND NEW.channel != 'AMAZON' THEN
            RAISE EXCEPTION 'Amazon location must use AMAZON channel';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply validation trigger
CREATE TRIGGER validate_event_before_insert
    BEFORE INSERT ON event_ledger
    FOR EACH ROW
    EXECUTE FUNCTION validate_event_insert();

-- =====================================================
-- AUDIT TRIGGER FOR EVENT_LEDGER
-- =====================================================

CREATE OR REPLACE FUNCTION audit_event_ledger_insert()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_log (
        table_name,
        record_id,
        action,
        user_id,
        new_values,
        action_description
    ) VALUES (
        'event_ledger',
        NEW.event_id,
        'INSERT',
        NEW.created_by,
        to_jsonb(NEW),
        'Event ledger entry created: ' || NEW.event_type
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_event_ledger_insert_trigger
    AFTER INSERT ON event_ledger
    FOR EACH ROW
    EXECUTE FUNCTION audit_event_ledger_insert();

-- =====================================================
-- USAGE EXAMPLES & COMMENTS
-- =====================================================

COMMENT ON TABLE event_ledger IS 'Immutable event ledger. INSERT-only. No UPDATE or DELETE allowed.';
COMMENT ON VIEW current_stock_view IS 'Calculated stock view from event_ledger. READ-ONLY.';
COMMENT ON FUNCTION get_user_role() IS 'Returns current authenticated users role name';
COMMENT ON FUNCTION is_owner_or_manager() IS 'Returns true if user is OWNER or MANAGER';
COMMENT ON FUNCTION get_user_location_ids() IS 'Returns set of location IDs user has access to';
COMMENT ON FUNCTION has_location_access(UUID) IS 'Check if user can access specific location';

-- =====================================================
-- SAMPLE QUERIES
-- =====================================================

/*
-- Insert a sale event (will be validated by RLS and triggers)
INSERT INTO event_ledger (
    event_type, variant_id, quantity, from_location_id, 
    channel, reference_type, reference_number, created_by
) VALUES (
    'SALE', 
    'VARIANT_UUID_HERE'::uuid, 
    -5, -- negative for outbound
    'LOCATION_UUID_HERE'::uuid,
    'STORE',
    'BILL',
    'INV-2026-0001',
    auth.uid()
);

-- Insert a purchase event
INSERT INTO event_ledger (
    event_type, variant_id, quantity, to_location_id,
    channel, reference_type, created_by, unit_cost_price
) VALUES (
    'PURCHASE',
    'VARIANT_UUID_HERE'::uuid,
    100, -- positive for inbound
    'LOCATION_UUID_HERE'::uuid,
    'STORE',
    'PURCHASE_ORDER',
    auth.uid(),
    250.00
);

-- Get current stock for all locations
SELECT 
    product_name, sku_code, size, color,
    location_name, location_type,
    current_quantity, stock_status
FROM current_stock_view
WHERE product_category = 'T-Shirt'
ORDER BY location_name, current_quantity DESC;

-- Get stock at specific location
SELECT get_stock_at_location(
    'VARIANT_UUID_HERE'::uuid,
    'LOCATION_UUID_HERE'::uuid
);

-- Get total stock across all locations for a variant
SELECT * FROM get_total_stock_for_variant('VARIANT_UUID_HERE'::uuid);

-- Low stock report (accessible based on RLS)
SELECT 
    product_name, sku_code, size, color,
    location_name, current_quantity
FROM current_stock_view
WHERE stock_status IN ('OUT_OF_STOCK', 'LOW_STOCK')
    AND location_type = 'STORE'
ORDER BY current_quantity ASC;
*/

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant execute on functions to authenticated users
GRANT EXECUTE ON FUNCTION get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION is_owner_or_manager() TO authenticated;
GRANT EXECUTE ON FUNCTION is_accountant() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_location_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION has_location_access(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_stock_at_location(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_total_stock_for_variant(UUID) TO authenticated;

-- Grant select on view to authenticated users (RLS will filter results)
GRANT SELECT ON current_stock_view TO authenticated;

-- =====================================================
-- TESTING RLS (Run as different users)
-- =====================================================

/*
-- Test as OWNER (should see everything)
SET ROLE authenticated;
SET request.jwt.claims.sub = 'OWNER_USER_UUID';
SELECT * FROM event_ledger; -- Should see all

-- Test as STORE_STAFF (should see only their store)
SET request.jwt.claims.sub = 'STAFF_USER_UUID';
SELECT * FROM event_ledger; -- Should see only their store's events

-- Test as ACCOUNTANT (should see all but not insert)
SET request.jwt.claims.sub = 'ACCOUNTANT_USER_UUID';
SELECT * FROM event_ledger; -- Should see all
INSERT INTO event_ledger (...); -- Should fail

-- Test UPDATE (should always fail)
UPDATE event_ledger SET quantity = 10 WHERE event_id = '...'; -- Should fail

-- Test DELETE (should always fail)
DELETE FROM event_ledger WHERE event_id = '...'; -- Should fail
*/

-- =====================================================
-- END OF SCHEMA
-- =====================================================
