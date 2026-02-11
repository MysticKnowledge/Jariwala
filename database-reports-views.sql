-- =====================================================
-- REPORTING VIEWS & AUDIT LOG
-- All reports read from event_ledger
-- =====================================================

-- =====================================================
-- SUPPORTING TABLES
-- =====================================================

-- WhatsApp Opt-in tracking
CREATE TABLE IF NOT EXISTS whatsapp_opt_ins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(20) NOT NULL UNIQUE,
    customer_name VARCHAR(255),
    opted_in BOOLEAN NOT NULL DEFAULT true,
    opted_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    opted_out_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT phone_format CHECK (phone ~ '^\+?[1-9]\d{1,14}$')
);

CREATE INDEX idx_whatsapp_opt_ins_phone ON whatsapp_opt_ins(phone);
CREATE INDEX idx_whatsapp_opt_ins_opted_in ON whatsapp_opt_ins(opted_in) WHERE opted_in = true;

-- WhatsApp bot interaction logs
CREATE TABLE IF NOT EXISTS whatsapp_bot_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    intent VARCHAR(50),
    response TEXT,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT whatsapp_bot_logs_phone_format CHECK (phone ~ '^\+?[1-9]\d{1,14}$')
);

CREATE INDEX idx_whatsapp_bot_logs_phone ON whatsapp_bot_logs(phone);
CREATE INDEX idx_whatsapp_bot_logs_processed_at ON whatsapp_bot_logs(processed_at DESC);

-- =====================================================
-- ENHANCED AUDIT LOG TABLE
-- =====================================================

-- Drop existing audit_log if it exists (from previous schema)
DROP TABLE IF EXISTS audit_log CASCADE;

-- Recreate with enhanced schema
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Who performed the action
    user_id UUID NOT NULL, -- References auth.users or user_profiles
    user_role VARCHAR(50),
    user_email VARCHAR(255),
    
    -- What was done
    action VARCHAR(50) NOT NULL, -- INSERT, UPDATE, DELETE, LOGIN, LOGOUT, VIEW, EXPORT
    table_name VARCHAR(100),
    record_id UUID,
    event_id UUID, -- Reference to event_ledger if applicable
    
    -- When
    action_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Where
    ip_address INET,
    user_agent TEXT,
    location_id UUID REFERENCES locations(id),
    
    -- What changed
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    
    -- Context
    action_description TEXT,
    metadata JSONB,
    
    -- System info
    device_id VARCHAR(100),
    app_version VARCHAR(50),
    
    CONSTRAINT audit_log_action_valid CHECK (
        action IN ('INSERT', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'VIEW', 
                  'EXPORT', 'SYNC', 'RECONCILE', 'CUSTOM')
    )
);

-- Indexes for audit_log
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_timestamp ON audit_log(action_timestamp DESC);
CREATE INDEX idx_audit_log_table_record ON audit_log(table_name, record_id) WHERE table_name IS NOT NULL;
CREATE INDEX idx_audit_log_event_id ON audit_log(event_id) WHERE event_id IS NOT NULL;
CREATE INDEX idx_audit_log_location ON audit_log(location_id) WHERE location_id IS NOT NULL;
CREATE INDEX idx_audit_log_ip ON audit_log(ip_address) WHERE ip_address IS NOT NULL;

-- Partition by month for better performance (optional)
-- ALTER TABLE audit_log PARTITION BY RANGE (action_timestamp);

-- Prevent DELETE on audit_log
CREATE OR REPLACE FUNCTION prevent_audit_log_delete()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'DELETE operations are not allowed on audit_log. This is an immutable audit trail.';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_audit_log_delete_trigger
    BEFORE DELETE ON audit_log
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_log_delete();

-- Auto-update trigger for related tables
CREATE TRIGGER update_whatsapp_opt_ins_updated_at 
    BEFORE UPDATE ON whatsapp_opt_ins
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- REPORT VIEW 1: DAILY SALES REPORT
-- =====================================================

CREATE OR REPLACE VIEW daily_sales_report AS
WITH daily_sales AS (
    SELECT 
        DATE(el.created_at) AS sale_date,
        l.id AS location_id,
        l.name AS location_name,
        l.type AS location_type,
        el.channel,
        
        -- Sales metrics
        COUNT(DISTINCT el.reference_number) AS total_bills,
        COUNT(DISTINCT el.variant_id) AS unique_products_sold,
        SUM(ABS(el.quantity)) AS total_units_sold,
        SUM(el.total_amount) AS total_revenue,
        AVG(el.unit_selling_price) AS avg_selling_price,
        
        -- Product breakdown
        SUM(CASE WHEN v.size IN ('S', 'M') THEN ABS(el.quantity) ELSE 0 END) AS small_medium_units,
        SUM(CASE WHEN v.size IN ('L', 'XL', 'XXL') THEN ABS(el.quantity) ELSE 0 END) AS large_units,
        
        -- Channel breakdown
        SUM(CASE WHEN el.channel = 'STORE' THEN el.total_amount ELSE 0 END) AS store_revenue,
        SUM(CASE WHEN el.channel = 'AMAZON' THEN el.total_amount ELSE 0 END) AS amazon_revenue,
        SUM(CASE WHEN el.channel = 'WEBSITE' THEN el.total_amount ELSE 0 END) AS website_revenue
        
    FROM event_ledger el
    JOIN variants v ON el.variant_id = v.id
    LEFT JOIN locations l ON el.from_location_id = l.id
    WHERE 
        el.event_type = 'SALE'
        AND el.created_at >= CURRENT_DATE - INTERVAL '90 days' -- Last 90 days
    GROUP BY 
        DATE(el.created_at), l.id, l.name, l.type, el.channel
)
SELECT 
    sale_date,
    location_name,
    location_type,
    channel,
    total_bills,
    unique_products_sold,
    total_units_sold,
    total_revenue,
    avg_selling_price,
    small_medium_units,
    large_units,
    store_revenue,
    amazon_revenue,
    website_revenue,
    
    -- Day-over-day comparison
    total_revenue - LAG(total_revenue) OVER (
        PARTITION BY location_id, channel 
        ORDER BY sale_date
    ) AS revenue_change_from_prev_day,
    
    -- Running totals
    SUM(total_revenue) OVER (
        PARTITION BY location_id, channel 
        ORDER BY sale_date
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS cumulative_revenue
    
FROM daily_sales
ORDER BY sale_date DESC, location_name, channel;

COMMENT ON VIEW daily_sales_report IS 'Daily sales report aggregated from event_ledger - shows revenue, units sold, and channel breakdown';

-- =====================================================
-- REPORT VIEW 2: MONTHLY PRODUCT PERFORMANCE
-- =====================================================

CREATE OR REPLACE VIEW monthly_product_performance AS
WITH monthly_metrics AS (
    SELECT 
        DATE_TRUNC('month', el.created_at) AS month,
        p.id AS product_id,
        p.name AS product_name,
        p.category AS product_category,
        p.company AS product_company,
        v.color,
        
        -- Sales metrics
        SUM(CASE WHEN el.event_type = 'SALE' THEN ABS(el.quantity) ELSE 0 END) AS units_sold,
        SUM(CASE WHEN el.event_type = 'RETURN' THEN el.quantity ELSE 0 END) AS units_returned,
        SUM(CASE WHEN el.event_type = 'SALE' THEN el.total_amount ELSE 0 END) AS gross_revenue,
        SUM(CASE WHEN el.event_type = 'RETURN' THEN ABS(el.total_amount) ELSE 0 END) AS return_value,
        
        -- Cost metrics
        AVG(el.unit_cost_price) AS avg_cost_price,
        AVG(el.unit_selling_price) AS avg_selling_price,
        
        -- Inventory metrics
        SUM(CASE WHEN el.event_type = 'PURCHASE' THEN el.quantity ELSE 0 END) AS units_purchased,
        SUM(CASE WHEN el.event_type = 'DAMAGE' THEN ABS(el.quantity) ELSE 0 END) AS units_damaged,
        SUM(CASE WHEN el.event_type = 'LOSS' THEN ABS(el.quantity) ELSE 0 END) AS units_lost,
        
        -- Count distinct orders
        COUNT(DISTINCT CASE WHEN el.event_type = 'SALE' THEN el.reference_number END) AS order_count
        
    FROM event_ledger el
    JOIN variants v ON el.variant_id = v.id
    JOIN products p ON v.product_id = p.id
    WHERE el.created_at >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '12 months'
    GROUP BY 
        DATE_TRUNC('month', el.created_at),
        p.id, p.name, p.category, p.company,
        v.color
)
SELECT 
    month,
    product_name,
    product_category,
    product_company,
    color,
    units_sold,
    units_returned,
    units_purchased,
    units_damaged,
    units_lost,
    gross_revenue,
    return_value,
    gross_revenue - return_value AS net_revenue,
    avg_cost_price,
    avg_selling_price,
    
    -- Profit calculations
    (avg_selling_price - COALESCE(avg_cost_price, 0)) AS avg_profit_per_unit,
    (units_sold * (avg_selling_price - COALESCE(avg_cost_price, 0))) AS estimated_profit,
    
    -- Performance metrics
    CASE 
        WHEN units_sold + units_returned > 0 
        THEN ROUND((units_returned::NUMERIC / (units_sold + units_returned) * 100), 2)
        ELSE 0 
    END AS return_rate_percentage,
    
    order_count,
    CASE 
        WHEN order_count > 0 
        THEN ROUND(units_sold::NUMERIC / order_count, 2)
        ELSE 0 
    END AS avg_units_per_order,
    
    -- Ranking
    RANK() OVER (PARTITION BY month ORDER BY units_sold DESC) AS sales_rank,
    RANK() OVER (PARTITION BY month ORDER BY gross_revenue DESC) AS revenue_rank
    
FROM monthly_metrics
ORDER BY month DESC, units_sold DESC;

COMMENT ON VIEW monthly_product_performance IS 'Monthly product performance with sales, returns, profit, and rankings';

-- =====================================================
-- REPORT VIEW 3: SIZE-WISE DEMAND ANALYSIS
-- =====================================================

CREATE OR REPLACE VIEW size_wise_demand AS
WITH size_metrics AS (
    SELECT 
        p.category AS product_category,
        v.size,
        v.color,
        
        -- Demand metrics (last 90 days)
        SUM(CASE 
            WHEN el.event_type = 'SALE' AND el.created_at >= CURRENT_DATE - INTERVAL '90 days'
            THEN ABS(el.quantity) 
            ELSE 0 
        END) AS units_sold_90d,
        
        SUM(CASE 
            WHEN el.event_type = 'SALE' AND el.created_at >= CURRENT_DATE - INTERVAL '30 days'
            THEN ABS(el.quantity) 
            ELSE 0 
        END) AS units_sold_30d,
        
        SUM(CASE 
            WHEN el.event_type = 'SALE' AND el.created_at >= CURRENT_DATE - INTERVAL '7 days'
            THEN ABS(el.quantity) 
            ELSE 0 
        END) AS units_sold_7d,
        
        -- Current stock across all locations
        SUM(CASE 
            WHEN el.to_location_id IS NOT NULL THEN el.quantity
            WHEN el.from_location_id IS NOT NULL THEN -el.quantity
            ELSE 0
        END) AS current_stock,
        
        -- Average selling price
        AVG(CASE WHEN el.event_type = 'SALE' THEN el.unit_selling_price END) AS avg_price,
        
        -- Count of transactions
        COUNT(CASE WHEN el.event_type = 'SALE' THEN 1 END) AS sale_count
        
    FROM event_ledger el
    JOIN variants v ON el.variant_id = v.id
    JOIN products p ON v.product_id = p.id
    WHERE p.is_active = true
    GROUP BY p.category, v.size, v.color
)
SELECT 
    product_category,
    size,
    color,
    units_sold_90d,
    units_sold_30d,
    units_sold_7d,
    current_stock,
    sale_count,
    avg_price,
    
    -- Demand velocity (units per day)
    ROUND(units_sold_90d / 90.0, 2) AS avg_daily_demand_90d,
    ROUND(units_sold_30d / 30.0, 2) AS avg_daily_demand_30d,
    ROUND(units_sold_7d / 7.0, 2) AS avg_daily_demand_7d,
    
    -- Days of inventory remaining
    CASE 
        WHEN units_sold_30d > 0 
        THEN ROUND(current_stock / (units_sold_30d / 30.0), 1)
        ELSE NULL 
    END AS days_of_stock_remaining,
    
    -- Demand trend
    CASE 
        WHEN units_sold_7d > (units_sold_30d / 30.0 * 7) * 1.2 THEN 'INCREASING'
        WHEN units_sold_7d < (units_sold_30d / 30.0 * 7) * 0.8 THEN 'DECREASING'
        ELSE 'STABLE'
    END AS demand_trend,
    
    -- Reorder recommendation
    CASE 
        WHEN current_stock <= 0 THEN 'OUT_OF_STOCK - URGENT'
        WHEN current_stock / NULLIF(units_sold_30d / 30.0, 0) < 7 THEN 'LOW - REORDER'
        WHEN current_stock / NULLIF(units_sold_30d / 30.0, 0) < 14 THEN 'MONITOR'
        ELSE 'SUFFICIENT'
    END AS reorder_status,
    
    -- Size popularity rank
    RANK() OVER (PARTITION BY product_category, color ORDER BY units_sold_90d DESC) AS size_popularity_rank
    
FROM size_metrics
WHERE units_sold_90d > 0 OR current_stock > 0
ORDER BY product_category, units_sold_90d DESC;

COMMENT ON VIEW size_wise_demand IS 'Size-wise demand analysis with velocity, trends, and reorder recommendations';

-- =====================================================
-- REPORT VIEW 4: OUTSTANDING LEDGER
-- =====================================================

-- First, create a customer ledger table to track outstanding amounts
CREATE TABLE IF NOT EXISTS customer_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20),
    customer_email VARCHAR(255),
    
    -- Transaction details
    transaction_type VARCHAR(20) NOT NULL, -- SALE, PAYMENT, CREDIT_NOTE
    transaction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reference_number VARCHAR(100),
    reference_id UUID, -- Links to event_ledger or payment records
    
    -- Amounts
    debit_amount DECIMAL(10, 2) DEFAULT 0, -- Sale amount (customer owes)
    credit_amount DECIMAL(10, 2) DEFAULT 0, -- Payment received
    
    -- Metadata
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT customer_ledger_type_valid CHECK (
        transaction_type IN ('SALE', 'PAYMENT', 'CREDIT_NOTE', 'ADJUSTMENT')
    )
);

CREATE INDEX idx_customer_ledger_customer ON customer_ledger(customer_name);
CREATE INDEX idx_customer_ledger_date ON customer_ledger(transaction_date DESC);
CREATE INDEX idx_customer_ledger_reference ON customer_ledger(reference_id) WHERE reference_id IS NOT NULL;

-- Outstanding ledger view
CREATE OR REPLACE VIEW outstanding_ledger AS
WITH customer_transactions AS (
    SELECT 
        customer_name,
        customer_phone,
        customer_email,
        transaction_date,
        transaction_type,
        reference_number,
        debit_amount,
        credit_amount,
        debit_amount - credit_amount AS net_amount,
        SUM(debit_amount - credit_amount) OVER (
            PARTITION BY customer_name 
            ORDER BY transaction_date, created_at
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ) AS running_balance
    FROM customer_ledger
)
SELECT 
    customer_name,
    customer_phone,
    customer_email,
    SUM(debit_amount) AS total_sales,
    SUM(credit_amount) AS total_payments,
    SUM(net_amount) AS outstanding_amount,
    
    -- Aging analysis
    SUM(CASE 
        WHEN transaction_date >= CURRENT_DATE - INTERVAL '30 days' AND net_amount > 0
        THEN net_amount ELSE 0 
    END) AS outstanding_0_30_days,
    
    SUM(CASE 
        WHEN transaction_date >= CURRENT_DATE - INTERVAL '60 days' 
        AND transaction_date < CURRENT_DATE - INTERVAL '30 days'
        AND net_amount > 0
        THEN net_amount ELSE 0 
    END) AS outstanding_31_60_days,
    
    SUM(CASE 
        WHEN transaction_date >= CURRENT_DATE - INTERVAL '90 days'
        AND transaction_date < CURRENT_DATE - INTERVAL '60 days'
        AND net_amount > 0
        THEN net_amount ELSE 0 
    END) AS outstanding_61_90_days,
    
    SUM(CASE 
        WHEN transaction_date < CURRENT_DATE - INTERVAL '90 days' AND net_amount > 0
        THEN net_amount ELSE 0 
    END) AS outstanding_over_90_days,
    
    -- Latest transaction
    MAX(transaction_date) AS last_transaction_date,
    
    -- Status
    CASE 
        WHEN SUM(net_amount) <= 0 THEN 'PAID'
        WHEN MAX(transaction_date) < CURRENT_DATE - INTERVAL '90 days' THEN 'OVERDUE'
        WHEN SUM(net_amount) > 10000 THEN 'HIGH_OUTSTANDING'
        ELSE 'ACTIVE'
    END AS status
    
FROM customer_transactions
GROUP BY customer_name, customer_phone, customer_email
HAVING SUM(net_amount) != 0
ORDER BY outstanding_amount DESC;

COMMENT ON VIEW outstanding_ledger IS 'Customer outstanding amounts with aging analysis';

-- =====================================================
-- REPORT VIEW 5: DEAD STOCK REPORT
-- =====================================================

CREATE OR REPLACE VIEW dead_stock_report AS
WITH variant_movement AS (
    SELECT 
        v.id AS variant_id,
        v.sku_code,
        p.name AS product_name,
        p.category AS product_category,
        v.size,
        v.color,
        v.cost_price,
        v.selling_price,
        v.mrp,
        
        -- Current stock (calculated from event_ledger)
        COALESCE(SUM(
            CASE 
                WHEN el.to_location_id IS NOT NULL THEN el.quantity
                WHEN el.from_location_id IS NOT NULL THEN -el.quantity
                ELSE 0
            END
        ), 0) AS current_stock,
        
        -- Last sale date
        MAX(CASE WHEN el.event_type = 'SALE' THEN el.created_at END) AS last_sale_date,
        
        -- Total sales ever
        SUM(CASE WHEN el.event_type = 'SALE' THEN ABS(el.quantity) ELSE 0 END) AS total_units_sold,
        
        -- Sales in last 90 days
        SUM(CASE 
            WHEN el.event_type = 'SALE' AND el.created_at >= CURRENT_DATE - INTERVAL '90 days'
            THEN ABS(el.quantity) ELSE 0 
        END) AS units_sold_90d,
        
        -- First purchase date
        MIN(CASE WHEN el.event_type = 'PURCHASE' THEN el.created_at END) AS first_purchase_date,
        
        -- Total value at cost
        COALESCE(v.cost_price, 0) * COALESCE(SUM(
            CASE 
                WHEN el.to_location_id IS NOT NULL THEN el.quantity
                WHEN el.from_location_id IS NOT NULL THEN -el.quantity
                ELSE 0
            END
        ), 0) AS stock_value_cost
        
    FROM variants v
    JOIN products p ON v.product_id = p.id
    LEFT JOIN event_ledger el ON v.id = el.variant_id
    WHERE v.is_active = true AND p.is_active = true
    GROUP BY v.id, v.sku_code, p.name, p.category, v.size, v.color, 
             v.cost_price, v.selling_price, v.mrp
)
SELECT 
    sku_code,
    product_name,
    product_category,
    size,
    color,
    current_stock,
    cost_price,
    selling_price,
    mrp,
    stock_value_cost,
    
    -- Age calculations
    COALESCE(EXTRACT(DAY FROM (CURRENT_DATE - last_sale_date)), 999) AS days_since_last_sale,
    COALESCE(EXTRACT(DAY FROM (CURRENT_DATE - first_purchase_date)), 0) AS days_in_inventory,
    
    last_sale_date,
    first_purchase_date,
    total_units_sold,
    units_sold_90d,
    
    -- Velocity
    CASE 
        WHEN total_units_sold > 0 
        THEN ROUND(total_units_sold::NUMERIC / NULLIF(EXTRACT(DAY FROM (CURRENT_DATE - first_purchase_date)), 0) * 30, 2)
        ELSE 0 
    END AS avg_monthly_sales,
    
    -- Dead stock classification
    CASE 
        WHEN current_stock <= 0 THEN 'NO_STOCK'
        WHEN last_sale_date IS NULL AND EXTRACT(DAY FROM (CURRENT_DATE - first_purchase_date)) > 180 
            THEN 'DEAD - NEVER_SOLD'
        WHEN EXTRACT(DAY FROM (CURRENT_DATE - last_sale_date)) > 180 AND units_sold_90d = 0 
            THEN 'DEAD - NO_MOVEMENT_6M'
        WHEN EXTRACT(DAY FROM (CURRENT_DATE - last_sale_date)) > 90 AND units_sold_90d = 0 
            THEN 'SLOW_MOVING - NO_SALE_3M'
        WHEN units_sold_90d <= 1 
            THEN 'SLOW_MOVING - LOW_DEMAND'
        ELSE 'ACTIVE'
    END AS stock_classification,
    
    -- Action recommendation
    CASE 
        WHEN current_stock <= 0 THEN 'N/A'
        WHEN EXTRACT(DAY FROM (CURRENT_DATE - COALESCE(last_sale_date, first_purchase_date))) > 180 
            THEN 'CLEARANCE_SALE'
        WHEN EXTRACT(DAY FROM (CURRENT_DATE - COALESCE(last_sale_date, first_purchase_date))) > 90 
            THEN 'DISCOUNT_30%'
        WHEN units_sold_90d <= 1 
            THEN 'DISCOUNT_15%'
        ELSE 'MONITOR'
    END AS action_recommendation
    
FROM variant_movement
WHERE current_stock > 0
ORDER BY days_since_last_sale DESC, stock_value_cost DESC;

COMMENT ON VIEW dead_stock_report IS 'Identifies dead and slow-moving stock with clearance recommendations';

-- =====================================================
-- HELPER VIEWS
-- =====================================================

-- Quick summary view for dashboards
CREATE OR REPLACE VIEW inventory_summary AS
SELECT 
    (SELECT COUNT(*) FROM products WHERE is_active = true) AS total_products,
    (SELECT COUNT(*) FROM variants WHERE is_active = true) AS total_variants,
    (SELECT COUNT(DISTINCT location_id) FROM current_stock_view WHERE current_quantity > 0) AS active_locations,
    (SELECT SUM(current_quantity) FROM current_stock_view) AS total_stock_units,
    (SELECT SUM(stock_value_cost) FROM current_stock_view) AS total_stock_value,
    (SELECT COUNT(*) FROM current_stock_view WHERE stock_status = 'OUT_OF_STOCK') AS out_of_stock_items,
    (SELECT COUNT(*) FROM current_stock_view WHERE stock_status = 'LOW_STOCK') AS low_stock_items,
    (SELECT COUNT(*) FROM event_ledger WHERE created_at >= CURRENT_DATE) AS events_today,
    (SELECT SUM(total_amount) FROM event_ledger WHERE event_type = 'SALE' AND created_at >= CURRENT_DATE) AS sales_today;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant select on views to authenticated users (RLS will filter)
GRANT SELECT ON daily_sales_report TO authenticated;
GRANT SELECT ON monthly_product_performance TO authenticated;
GRANT SELECT ON size_wise_demand TO authenticated;
GRANT SELECT ON outstanding_ledger TO authenticated;
GRANT SELECT ON dead_stock_report TO authenticated;
GRANT SELECT ON inventory_summary TO authenticated;

-- Grant select on support tables
GRANT SELECT ON whatsapp_opt_ins TO authenticated;
GRANT SELECT ON customer_ledger TO authenticated;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE audit_log IS 'Immutable audit trail - tracks all user actions with IP and device info';
COMMENT ON TABLE whatsapp_opt_ins IS 'Tracks customer opt-in status for WhatsApp bot';
COMMENT ON TABLE whatsapp_bot_logs IS 'Logs all WhatsApp bot interactions';
COMMENT ON TABLE customer_ledger IS 'Tracks customer credit sales and payments';

-- =====================================================
-- END OF SCHEMA
-- =====================================================
