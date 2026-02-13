-- =====================================================
-- RETAIL MANAGEMENT SYSTEM - REPORTING VIEWS (FIXED)
-- Migration: 02 - Create Views
-- =====================================================
-- Domain: jariwala.figma.site
-- Purpose: 5 SQL reporting views for analytics
-- Fixed: Removed references to invoices/invoice_items tables
-- =====================================================

-- =====================================================
-- VIEW 1: CURRENT STOCK VIEW (Materialized)
-- =====================================================
-- Purpose: Real-time stock levels per variant per location
-- Refresh: Every 5 minutes (or on-demand)
-- =====================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS current_stock_view AS
SELECT 
    v.id AS variant_id,
    v.sku_code,
    p.id AS product_id,
    p.product_name,
    v.size,
    v.color,
    v.barcode,
    l.id AS location_id,
    l.location_name,
    l.location_type,
    l.location_code,
    
    -- Stock calculation from events
    COALESCE(SUM(
        CASE 
            WHEN e.to_location_id = l.id THEN e.quantity
            WHEN e.from_location_id = l.id THEN e.quantity
            ELSE 0
        END
    ), 0) AS current_quantity,
    
    -- Stock value
    COALESCE(SUM(
        CASE 
            WHEN e.to_location_id = l.id THEN e.quantity * COALESCE(e.unit_cost_price, v.cost_price, 0)
            WHEN e.from_location_id = l.id THEN e.quantity * COALESCE(e.unit_cost_price, v.cost_price, 0)
            ELSE 0
        END
    ), 0) AS stock_value,
    
    -- Current prices
    v.cost_price,
    v.selling_price,
    v.mrp,
    
    -- Alert thresholds
    v.min_stock_level,
    v.max_stock_level,
    v.reorder_quantity,
    
    -- Stock status
    CASE 
        WHEN COALESCE(SUM(
            CASE 
                WHEN e.to_location_id = l.id THEN e.quantity
                WHEN e.from_location_id = l.id THEN e.quantity
                ELSE 0
            END
        ), 0) = 0 THEN 'OUT_OF_STOCK'
        WHEN COALESCE(SUM(
            CASE 
                WHEN e.to_location_id = l.id THEN e.quantity
                WHEN e.from_location_id = l.id THEN e.quantity
                ELSE 0
            END
        ), 0) <= v.min_stock_level THEN 'LOW'
        WHEN COALESCE(SUM(
            CASE 
                WHEN e.to_location_id = l.id THEN e.quantity
                WHEN e.from_location_id = l.id THEN e.quantity
                ELSE 0
            END
        ), 0) >= COALESCE(v.max_stock_level, 999999) THEN 'OVERSTOCK'
        ELSE 'OK'
    END AS stock_status,
    
    -- Last movement
    MAX(e.created_at) AS last_movement_date,
    
    -- Category & Brand
    c.category_name,
    b.brand_name
    
FROM product_variants v
CROSS JOIN locations l
LEFT JOIN event_ledger e ON (
    (e.variant_id = v.id) AND 
    (e.to_location_id = l.id OR e.from_location_id = l.id)
)
LEFT JOIN products p ON v.product_id = p.id
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN brands b ON p.brand_id = b.id
WHERE l.is_active = TRUE AND v.is_active = TRUE AND p.is_active = TRUE
GROUP BY 
    v.id, v.sku_code, v.size, v.color, v.barcode,
    v.cost_price, v.selling_price, v.mrp,
    v.min_stock_level, v.max_stock_level, v.reorder_quantity,
    p.id, p.product_name,
    l.id, l.location_name, l.location_type, l.location_code,
    c.category_name, b.brand_name;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_current_stock_variant ON current_stock_view(variant_id);
CREATE INDEX IF NOT EXISTS idx_current_stock_location ON current_stock_view(location_id);
CREATE INDEX IF NOT EXISTS idx_current_stock_status ON current_stock_view(stock_status);
CREATE INDEX IF NOT EXISTS idx_current_stock_sku ON current_stock_view(sku_code);
CREATE INDEX IF NOT EXISTS idx_current_stock_product ON current_stock_view(product_id);

-- =====================================================
-- VIEW 2: SALES SUMMARY VIEW (Event-based)
-- =====================================================
-- Purpose: Daily sales summary by location from event_ledger
-- =====================================================

CREATE OR REPLACE VIEW sales_summary_view AS
SELECT 
    DATE(e.created_at) AS sale_date,
    l.id AS location_id,
    l.location_name,
    l.location_type,
    l.location_code,
    
    -- Event metrics
    COUNT(DISTINCT e.reference_number) AS total_bills,
    COUNT(DISTINCT e.reference_number) AS unique_transactions,
    
    -- Financial metrics (for SALE events, quantity is negative, so use ABS)
    SUM(ABS(e.quantity)) AS items_sold,
    SUM(e.total_amount) AS total_revenue,
    AVG(e.total_amount) AS avg_bill_value,
    
    -- Product metrics
    COUNT(DISTINCT e.variant_id) AS unique_products_sold,
    
    -- Channel breakdown
    COUNT(DISTINCT e.reference_number) FILTER (WHERE e.channel = 'STORE') AS store_bills,
    COUNT(DISTINCT e.reference_number) FILTER (WHERE e.channel = 'AMAZON') AS amazon_bills,
    COUNT(DISTINCT e.reference_number) FILTER (WHERE e.channel = 'WEBSITE') AS website_bills,
    
    SUM(e.total_amount) FILTER (WHERE e.channel = 'STORE') AS store_revenue,
    SUM(e.total_amount) FILTER (WHERE e.channel = 'AMAZON') AS amazon_revenue,
    SUM(e.total_amount) FILTER (WHERE e.channel = 'WEBSITE') AS website_revenue
    
FROM event_ledger e
JOIN locations l ON e.from_location_id = l.id
WHERE e.event_type = 'SALE'
GROUP BY DATE(e.created_at), l.id, l.location_name, l.location_type, l.location_code
ORDER BY sale_date DESC, l.location_name;

-- =====================================================
-- VIEW 3: INVENTORY MOVEMENT VIEW
-- =====================================================
-- Purpose: Track all inventory movements with full details
-- =====================================================

CREATE OR REPLACE VIEW inventory_movement_view AS
SELECT 
    e.event_id,
    e.event_type,
    e.created_at AS movement_date,
    e.channel,
    
    -- Product info
    p.product_code,
    p.product_name,
    v.sku_code,
    v.size,
    v.color,
    v.barcode,
    
    -- Quantity & Value
    e.quantity,
    ABS(e.quantity) AS abs_quantity,
    e.unit_cost_price,
    e.unit_selling_price,
    e.total_amount,
    
    -- From location
    fl.id AS from_location_id,
    fl.location_code AS from_location_code,
    fl.location_name AS from_location,
    fl.location_type AS from_type,
    
    -- To location
    tl.id AS to_location_id,
    tl.location_code AS to_location_code,
    tl.location_name AS to_location,
    tl.location_type AS to_type,
    
    -- Reference
    e.reference_type,
    e.reference_number,
    e.notes,
    
    -- User info
    up.full_name AS performed_by,
    up.employee_code,
    r.display_name AS user_role,
    
    -- Category & Brand
    c.category_name,
    b.brand_name
    
FROM event_ledger e
JOIN product_variants v ON e.variant_id = v.id
JOIN products p ON v.product_id = p.id
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN brands b ON p.brand_id = b.id
LEFT JOIN locations fl ON e.from_location_id = fl.id
LEFT JOIN locations tl ON e.to_location_id = tl.id
LEFT JOIN user_profiles up ON e.created_by = up.user_id
LEFT JOIN roles r ON up.role_id = r.id
ORDER BY e.created_at DESC;

-- =====================================================
-- VIEW 4: PRODUCT PERFORMANCE VIEW (Event-based)
-- =====================================================
-- Purpose: Sales performance by product/variant from event_ledger
-- =====================================================

CREATE OR REPLACE VIEW product_performance_view AS
SELECT 
    p.id AS product_id,
    p.product_code,
    p.product_name,
    v.id AS variant_id,
    v.sku_code,
    v.size,
    v.color,
    
    -- Category & Brand
    c.category_name,
    b.brand_name,
    
    -- Sales metrics (from SALE events - quantity is negative, so use ABS)
    COUNT(DISTINCT e.reference_number) AS times_sold,
    COALESCE(SUM(ABS(e.quantity)) FILTER (WHERE e.event_type = 'SALE'), 0) AS total_quantity_sold,
    COALESCE(SUM(e.total_amount) FILTER (WHERE e.event_type = 'SALE'), 0) AS total_revenue,
    COALESCE(AVG(e.unit_selling_price) FILTER (WHERE e.event_type = 'SALE'), 0) AS avg_selling_price,
    COALESCE(MIN(e.unit_selling_price) FILTER (WHERE e.event_type = 'SALE'), 0) AS min_selling_price,
    COALESCE(MAX(e.unit_selling_price) FILTER (WHERE e.event_type = 'SALE'), 0) AS max_selling_price,
    
    -- Time period
    MIN(e.created_at) FILTER (WHERE e.event_type = 'SALE') AS first_sale_date,
    MAX(e.created_at) FILTER (WHERE e.event_type = 'SALE') AS last_sale_date,
    
    -- Current stock (total across all locations)
    COALESCE((
        SELECT SUM(current_quantity) 
        FROM current_stock_view 
        WHERE variant_id = v.id
    ), 0) AS current_stock_total,
    
    -- Stock value
    COALESCE((
        SELECT SUM(stock_value) 
        FROM current_stock_view 
        WHERE variant_id = v.id
    ), 0) AS stock_value_total,
    
    -- Pricing
    v.cost_price AS current_cost_price,
    v.selling_price AS current_selling_price,
    v.mrp,
    
    -- Profitability (estimated)
    CASE 
        WHEN SUM(ABS(e.quantity)) FILTER (WHERE e.event_type = 'SALE') > 0 AND v.cost_price > 0 THEN
            ((SUM(e.total_amount) FILTER (WHERE e.event_type = 'SALE') - 
              (SUM(ABS(e.quantity)) FILTER (WHERE e.event_type = 'SALE') * v.cost_price)) / 
              NULLIF(SUM(e.total_amount) FILTER (WHERE e.event_type = 'SALE'), 0)) * 100
        ELSE 0
    END AS profit_margin_percent
    
FROM products p
JOIN product_variants v ON p.id = v.product_id
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN brands b ON p.brand_id = b.id
LEFT JOIN event_ledger e ON v.id = e.variant_id AND e.event_type = 'SALE'
WHERE p.is_active = TRUE AND v.is_active = TRUE
GROUP BY 
    p.id, p.product_code, p.product_name,
    v.id, v.sku_code, v.size, v.color,
    v.cost_price, v.selling_price, v.mrp,
    c.category_name, b.brand_name
ORDER BY total_revenue DESC NULLS LAST;

-- =====================================================
-- VIEW 5: LOW STOCK ALERT VIEW (Simplified)
-- =====================================================
-- Purpose: Products needing reorder
-- =====================================================

CREATE OR REPLACE VIEW low_stock_alert_view AS
SELECT 
    v.id AS variant_id,
    v.sku_code,
    p.product_code,
    p.product_name,
    v.size,
    v.color,
    v.barcode,
    
    -- Location
    l.id AS location_id,
    l.location_code,
    l.location_name,
    l.location_type,
    
    -- Stock levels
    cs.current_quantity,
    v.min_stock_level,
    v.max_stock_level,
    v.reorder_quantity,
    (v.min_stock_level - cs.current_quantity) AS shortage,
    
    -- Last movement
    cs.last_movement_date,
    
    -- Urgency level
    CASE 
        WHEN cs.current_quantity = 0 THEN 'URGENT'
        WHEN cs.current_quantity <= (v.min_stock_level * 0.5) THEN 'HIGH'
        WHEN cs.current_quantity <= (v.min_stock_level * 0.75) THEN 'MEDIUM'
        ELSE 'LOW'
    END AS urgency,
    
    -- Pricing for reorder
    v.cost_price,
    (v.reorder_quantity * v.cost_price) AS estimated_reorder_cost,
    
    -- Category & Brand
    c.category_name,
    b.brand_name,
    
    -- Sales velocity from event_ledger (last 30 days)
    COALESCE((
        SELECT SUM(ABS(e.quantity))::DECIMAL / 30
        FROM event_ledger e
        WHERE e.variant_id = v.id
          AND e.from_location_id = l.id
          AND e.event_type = 'SALE'
          AND e.created_at >= CURRENT_DATE - INTERVAL '30 days'
    ), 0) AS avg_daily_sales,
    
    -- Days until stock out (estimated)
    CASE 
        WHEN COALESCE((
            SELECT SUM(ABS(e.quantity))::DECIMAL / 30
            FROM event_ledger e
            WHERE e.variant_id = v.id
              AND e.from_location_id = l.id
              AND e.event_type = 'SALE'
              AND e.created_at >= CURRENT_DATE - INTERVAL '30 days'
        ), 0) > 0 THEN
            FLOOR(cs.current_quantity / (
                SELECT SUM(ABS(e.quantity))::DECIMAL / 30
                FROM event_ledger e
                WHERE e.variant_id = v.id
                  AND e.from_location_id = l.id
                  AND e.event_type = 'SALE'
                  AND e.created_at >= CURRENT_DATE - INTERVAL '30 days'
            ))
        ELSE 999
    END AS days_until_stockout
    
FROM product_variants v
JOIN products p ON v.product_id = p.id
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN brands b ON p.brand_id = b.id
JOIN current_stock_view cs ON v.id = cs.variant_id
JOIN locations l ON cs.location_id = l.id
WHERE 
    v.is_active = TRUE 
    AND p.is_active = TRUE
    AND l.is_active = TRUE
    AND cs.current_quantity <= v.min_stock_level
ORDER BY 
    CASE 
        WHEN cs.current_quantity = 0 THEN 1
        WHEN cs.current_quantity <= (v.min_stock_level * 0.5) THEN 2
        WHEN cs.current_quantity <= (v.min_stock_level * 0.75) THEN 3
        ELSE 4
    END,
    cs.current_quantity ASC;

-- =====================================================
-- REFRESH FUNCTION FOR MATERIALIZED VIEW
-- =====================================================

CREATE OR REPLACE FUNCTION refresh_current_stock_view()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY current_stock_view;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ All views created successfully!';
    RAISE NOTICE '📊 Views:';
    RAISE NOTICE '   1. current_stock_view (Materialized) - Real-time stock levels';
    RAISE NOTICE '   2. sales_summary_view - Daily sales summary from event_ledger';
    RAISE NOTICE '   3. inventory_movement_view - Movement tracking';
    RAISE NOTICE '   4. product_performance_view - Sales performance from events';
    RAISE NOTICE '   5. low_stock_alert_view - Reorder alerts';
    RAISE NOTICE '';
    RAISE NOTICE '🔄 Refresh materialized view: SELECT refresh_current_stock_view();';
    RAISE NOTICE '🎯 Next: Run 03-seed-data.sql to populate test data';
END $$;