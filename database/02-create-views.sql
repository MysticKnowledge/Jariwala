-- =====================================================
-- RETAIL MANAGEMENT SYSTEM - REPORTING VIEWS
-- Migration: 02 - Create Views
-- =====================================================
-- Domain: jariwala.figma.site
-- Purpose: 5 SQL reporting views for analytics
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
-- VIEW 2: SALES SUMMARY VIEW
-- =====================================================
-- Purpose: Daily sales summary by location
-- =====================================================

CREATE OR REPLACE VIEW sales_summary_view AS
SELECT 
    i.invoice_date,
    i.location_id,
    l.location_name,
    l.location_type,
    l.location_code,
    
    -- Invoice metrics
    COUNT(DISTINCT i.id) AS total_invoices,
    COUNT(DISTINCT i.customer_id) AS unique_customers,
    
    -- Financial metrics
    SUM(i.subtotal) AS gross_sales,
    SUM(i.discount_amount) AS total_discounts,
    SUM(i.tax_amount) AS total_tax,
    SUM(i.total_amount) AS net_sales,
    
    -- Item metrics
    SUM(ii.quantity) AS items_sold,
    COUNT(DISTINCT ii.variant_id) AS unique_products_sold,
    
    -- Averages
    AVG(i.total_amount) AS avg_invoice_value,
    AVG(ii.unit_price) AS avg_item_price,
    
    -- Payment methods
    COUNT(DISTINCT i.id) FILTER (WHERE i.payment_method = 'CASH') AS cash_transactions,
    COUNT(DISTINCT i.id) FILTER (WHERE i.payment_method = 'CARD') AS card_transactions,
    COUNT(DISTINCT i.id) FILTER (WHERE i.payment_method = 'UPI') AS upi_transactions,
    
    SUM(i.total_amount) FILTER (WHERE i.payment_method = 'CASH') AS cash_amount,
    SUM(i.total_amount) FILTER (WHERE i.payment_method = 'CARD') AS card_amount,
    SUM(i.total_amount) FILTER (WHERE i.payment_method = 'UPI') AS upi_amount
    
FROM invoices i
JOIN locations l ON i.location_id = l.id
LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
WHERE i.status = 'COMPLETED'
GROUP BY i.invoice_date, i.location_id, l.location_name, l.location_type, l.location_code
ORDER BY i.invoice_date DESC, l.location_name;

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
-- VIEW 4: PRODUCT PERFORMANCE VIEW
-- =====================================================
-- Purpose: Sales performance by product/variant
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
    
    -- Sales metrics
    COUNT(DISTINCT ii.invoice_id) AS times_sold,
    SUM(ii.quantity) AS total_quantity_sold,
    SUM(ii.line_total) AS total_revenue,
    SUM(ii.discount_amount) AS total_discounts,
    SUM(ii.tax_amount) AS total_tax,
    AVG(ii.unit_price) AS avg_selling_price,
    MIN(ii.unit_price) AS min_selling_price,
    MAX(ii.unit_price) AS max_selling_price,
    
    -- Time period
    MIN(i.invoice_date) AS first_sale_date,
    MAX(i.invoice_date) AS last_sale_date,
    
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
        WHEN SUM(ii.quantity) > 0 AND v.cost_price > 0 THEN
            ((SUM(ii.line_total) - (SUM(ii.quantity) * v.cost_price)) / SUM(ii.line_total)) * 100
        ELSE 0
    END AS profit_margin_percent
    
FROM products p
JOIN product_variants v ON p.id = v.product_id
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN brands b ON p.brand_id = b.id
LEFT JOIN invoice_items ii ON v.id = ii.variant_id
LEFT JOIN invoices i ON ii.invoice_id = i.id AND i.status = 'COMPLETED'
WHERE p.is_active = TRUE AND v.is_active = TRUE
GROUP BY 
    p.id, p.product_code, p.product_name,
    v.id, v.sku_code, v.size, v.color,
    v.cost_price, v.selling_price, v.mrp,
    c.category_name, b.brand_name
ORDER BY total_revenue DESC NULLS LAST;

-- =====================================================
-- VIEW 5: LOW STOCK ALERT VIEW
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
    
    -- Sales velocity (items sold per day in last 30 days)
    COALESCE((
        SELECT SUM(ii.quantity)::DECIMAL / 30
        FROM invoice_items ii
        JOIN invoices i ON ii.invoice_id = i.id
        WHERE ii.variant_id = v.id
          AND i.location_id = l.id
          AND i.invoice_date >= CURRENT_DATE - INTERVAL '30 days'
          AND i.status = 'COMPLETED'
    ), 0) AS avg_daily_sales,
    
    -- Days until stock out (estimated)
    CASE 
        WHEN COALESCE((
            SELECT SUM(ii.quantity)::DECIMAL / 30
            FROM invoice_items ii
            JOIN invoices i ON ii.invoice_id = i.id
            WHERE ii.variant_id = v.id
              AND i.location_id = l.id
              AND i.invoice_date >= CURRENT_DATE - INTERVAL '30 days'
              AND i.status = 'COMPLETED'
        ), 0) > 0 THEN
            FLOOR(cs.current_quantity / (
                SELECT SUM(ii.quantity)::DECIMAL / 30
                FROM invoice_items ii
                JOIN invoices i ON ii.invoice_id = i.id
                WHERE ii.variant_id = v.id
                  AND i.location_id = l.id
                  AND i.invoice_date >= CURRENT_DATE - INTERVAL '30 days'
                  AND i.status = 'COMPLETED'
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
    CASE urgency
        WHEN 'URGENT' THEN 1
        WHEN 'HIGH' THEN 2
        WHEN 'MEDIUM' THEN 3
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
    RAISE NOTICE '   2. sales_summary_view - Daily sales summary';
    RAISE NOTICE '   3. inventory_movement_view - Movement tracking';
    RAISE NOTICE '   4. product_performance_view - Sales performance';
    RAISE NOTICE '   5. low_stock_alert_view - Reorder alerts';
    RAISE NOTICE '';
    RAISE NOTICE '🔄 Refresh materialized view: SELECT refresh_current_stock_view();';
    RAISE NOTICE '🎯 Next: Run 03-seed-data.sql to populate test data';
END $$;
