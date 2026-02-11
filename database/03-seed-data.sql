-- =====================================================
-- RETAIL MANAGEMENT SYSTEM - SEED DATA
-- Migration: 03 - Seed Test Data
-- =====================================================
-- Domain: jariwala.figma.site
-- Purpose: Populate database with test data
-- =====================================================

-- =====================================================
-- 1. ROLES (Default roles for the system)
-- =====================================================

INSERT INTO roles (name, display_name, description, level, permissions) VALUES
('OWNER', 'Owner', 'Full system access', 1, '{"all": true}'::jsonb),
('MANAGER', 'Manager', 'Store and inventory management', 2, '{"inventory": {"read": true, "write": true}, "sales": {"read": true, "write": true}, "reports": {"read": true}, "users": {"read": true}}'::jsonb),
('STORE_STAFF', 'Store Staff', 'POS and sales operations', 3, '{"sales": {"read": true, "write": true}, "inventory": {"read": true}, "customers": {"read": true, "write": true}}'::jsonb),
('GODOWN_STAFF', 'Godown Staff', 'Warehouse and inventory operations', 3, '{"inventory": {"read": true, "write": true}, "transfers": {"read": true, "write": true}, "receiving": {"read": true, "write": true}}'::jsonb),
('ACCOUNTANT', 'Accountant', 'Financial reports only', 3, '{"reports": {"read": true}, "sales": {"read": true}, "inventory": {"read": true}}'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 2. CATEGORIES
-- =====================================================

INSERT INTO categories (category_code, category_name, description, display_order) VALUES
('CAT-001', 'Shirts', 'Formal and casual shirts', 1),
('CAT-002', 'T-Shirts', 'Round neck and polo t-shirts', 2),
('CAT-003', 'Trousers', 'Formal and casual trousers', 3),
('CAT-004', 'Jeans', 'Denim jeans all styles', 4),
('CAT-005', 'Jackets', 'Jackets and blazers', 5),
('CAT-006', 'Accessories', 'Belts, ties, wallets', 6)
ON CONFLICT (category_code) DO NOTHING;

-- =====================================================
-- 3. BRANDS
-- =====================================================

INSERT INTO brands (brand_code, brand_name, description) VALUES
('BRN-001', 'Van Heusen', 'Premium formal wear'),
('BRN-002', 'Peter England', 'Affordable formal wear'),
('BRN-003', 'Allen Solly', 'Smart casual wear'),
('BRN-004', 'Louis Philippe', 'Luxury formal wear'),
('BRN-005', 'Arrow', 'Classic menswear'),
('BRN-006', 'Generic', 'Store brand')
ON CONFLICT (brand_code) DO NOTHING;

-- =====================================================
-- 4. LOCATIONS
-- =====================================================

-- Note: manager_id will be NULL initially, update after creating users

INSERT INTO locations (location_code, location_name, location_type, city, state, is_selling_location, is_receiving_location) VALUES
('STORE-01', 'Main Store - MG Road', 'STORE', 'Bangalore', 'Karnataka', TRUE, TRUE),
('STORE-02', 'Store - Indiranagar', 'STORE', 'Bangalore', 'Karnataka', TRUE, TRUE),
('GODOWN-01', 'Main Warehouse', 'GODOWN', 'Bangalore', 'Karnataka', FALSE, TRUE),
('SHOWROOM-01', 'Premium Showroom - Koramangala', 'SHOWROOM', 'Bangalore', 'Karnataka', TRUE, FALSE)
ON CONFLICT (location_code) DO NOTHING;

-- =====================================================
-- 5. PRODUCTS
-- =====================================================

INSERT INTO products (product_code, product_name, description, category_id, brand_id, product_type, base_cost_price, base_selling_price, mrp, tax_rate, hsn_code) 
SELECT 
    'PROD-001', 
    'Cotton Formal Shirt', 
    'Premium cotton formal shirt', 
    c.id, 
    b.id, 
    'GARMENT', 
    800.00, 
    1299.00, 
    1499.00, 
    12.00, 
    '62052000'
FROM categories c, brands b
WHERE c.category_code = 'CAT-001' AND b.brand_code = 'BRN-001'
ON CONFLICT (product_code) DO NOTHING;

INSERT INTO products (product_code, product_name, description, category_id, brand_id, product_type, base_cost_price, base_selling_price, mrp, tax_rate, hsn_code) 
SELECT 
    'PROD-002', 
    'Slim Fit T-Shirt', 
    'Cotton slim fit t-shirt', 
    c.id, 
    b.id, 
    'GARMENT', 
    300.00, 
    599.00, 
    699.00, 
    12.00, 
    '61091000'
FROM categories c, brands b
WHERE c.category_code = 'CAT-002' AND b.brand_code = 'BRN-003'
ON CONFLICT (product_code) DO NOTHING;

INSERT INTO products (product_code, product_name, description, category_id, brand_id, product_type, base_cost_price, base_selling_price, mrp, tax_rate, hsn_code) 
SELECT 
    'PROD-003', 
    'Formal Trousers', 
    'Flat front formal trousers', 
    c.id, 
    b.id, 
    'GARMENT', 
    900.00, 
    1599.00, 
    1899.00, 
    12.00, 
    '62034200'
FROM categories c, brands b
WHERE c.category_code = 'CAT-003' AND b.brand_code = 'BRN-002'
ON CONFLICT (product_code) DO NOTHING;

INSERT INTO products (product_code, product_name, description, category_id, brand_id, product_type, base_cost_price, base_selling_price, mrp, tax_rate, hsn_code) 
SELECT 
    'PROD-004', 
    'Slim Fit Jeans', 
    'Stretch denim slim fit jeans', 
    c.id, 
    b.id, 
    'GARMENT', 
    1200.00, 
    2199.00, 
    2499.00, 
    12.00, 
    '62034300'
FROM categories c, brands b
WHERE c.category_code = 'CAT-004' AND b.brand_code = 'BRN-005'
ON CONFLICT (product_code) DO NOTHING;

INSERT INTO products (product_code, product_name, description, category_id, brand_id, product_type, base_cost_price, base_selling_price, mrp, tax_rate, hsn_code) 
SELECT 
    'PROD-005', 
    'Blazer', 
    'Single breasted blazer', 
    c.id, 
    b.id, 
    'GARMENT', 
    3500.00, 
    5999.00, 
    6999.00, 
    12.00, 
    '62034100'
FROM categories c, brands b
WHERE c.category_code = 'CAT-005' AND b.brand_code = 'BRN-004'
ON CONFLICT (product_code) DO NOTHING;

-- =====================================================
-- 6. PRODUCT VARIANTS (Size/Color combinations)
-- =====================================================

-- Cotton Formal Shirt variants
INSERT INTO product_variants (product_id, sku_code, size, color, color_code, cost_price, selling_price, mrp, barcode, min_stock_level, max_stock_level, reorder_quantity)
SELECT p.id, 'PROD-001-M-WHITE', 'M', 'White', '#FFFFFF', 800.00, 1299.00, 1499.00, '8901234567801', 10, 50, 20
FROM products p WHERE p.product_code = 'PROD-001'
ON CONFLICT (sku_code) DO NOTHING;

INSERT INTO product_variants (product_id, sku_code, size, color, color_code, cost_price, selling_price, mrp, barcode, min_stock_level, max_stock_level, reorder_quantity)
SELECT p.id, 'PROD-001-M-BLUE', 'M', 'Blue', '#0000FF', 800.00, 1299.00, 1499.00, '8901234567802', 10, 50, 20
FROM products p WHERE p.product_code = 'PROD-001'
ON CONFLICT (sku_code) DO NOTHING;

INSERT INTO product_variants (product_id, sku_code, size, color, color_code, cost_price, selling_price, mrp, barcode, min_stock_level, max_stock_level, reorder_quantity)
SELECT p.id, 'PROD-001-L-WHITE', 'L', 'White', '#FFFFFF', 800.00, 1299.00, 1499.00, '8901234567803', 10, 50, 20
FROM products p WHERE p.product_code = 'PROD-001'
ON CONFLICT (sku_code) DO NOTHING;

INSERT INTO product_variants (product_id, sku_code, size, color, color_code, cost_price, selling_price, mrp, barcode, min_stock_level, max_stock_level, reorder_quantity)
SELECT p.id, 'PROD-001-L-BLUE', 'L', 'Blue', '#0000FF', 800.00, 1299.00, 1499.00, '8901234567804', 10, 50, 20
FROM products p WHERE p.product_code = 'PROD-001'
ON CONFLICT (sku_code) DO NOTHING;

-- T-Shirt variants
INSERT INTO product_variants (product_id, sku_code, size, color, color_code, cost_price, selling_price, mrp, barcode, min_stock_level, max_stock_level, reorder_quantity)
SELECT p.id, 'PROD-002-M-BLACK', 'M', 'Black', '#000000', 300.00, 599.00, 699.00, '8901234567805', 15, 60, 25
FROM products p WHERE p.product_code = 'PROD-002'
ON CONFLICT (sku_code) DO NOTHING;

INSERT INTO product_variants (product_id, sku_code, size, color, color_code, cost_price, selling_price, mrp, barcode, min_stock_level, max_stock_level, reorder_quantity)
SELECT p.id, 'PROD-002-M-RED', 'M', 'Red', '#FF0000', 300.00, 599.00, 699.00, '8901234567806', 15, 60, 25
FROM products p WHERE p.product_code = 'PROD-002'
ON CONFLICT (sku_code) DO NOTHING;

INSERT INTO product_variants (product_id, sku_code, size, color, color_code, cost_price, selling_price, mrp, barcode, min_stock_level, max_stock_level, reorder_quantity)
SELECT p.id, 'PROD-002-L-BLACK', 'L', 'Black', '#000000', 300.00, 599.00, 699.00, '8901234567807', 15, 60, 25
FROM products p WHERE p.product_code = 'PROD-002'
ON CONFLICT (sku_code) DO NOTHING;

-- Trousers variants
INSERT INTO product_variants (product_id, sku_code, size, color, color_code, cost_price, selling_price, mrp, barcode, min_stock_level, max_stock_level, reorder_quantity)
SELECT p.id, 'PROD-003-32-BLACK', '32', 'Black', '#000000', 900.00, 1599.00, 1899.00, '8901234567808', 8, 40, 15
FROM products p WHERE p.product_code = 'PROD-003'
ON CONFLICT (sku_code) DO NOTHING;

INSERT INTO product_variants (product_id, sku_code, size, color, color_code, cost_price, selling_price, mrp, barcode, min_stock_level, max_stock_level, reorder_quantity)
SELECT p.id, 'PROD-003-34-BLACK', '34', 'Black', '#000000', 900.00, 1599.00, 1899.00, '8901234567809', 8, 40, 15
FROM products p WHERE p.product_code = 'PROD-003'
ON CONFLICT (sku_code) DO NOTHING;

-- Jeans variants
INSERT INTO product_variants (product_id, sku_code, size, color, color_code, cost_price, selling_price, mrp, barcode, min_stock_level, max_stock_level, reorder_quantity)
SELECT p.id, 'PROD-004-32-BLUE', '32', 'Denim Blue', '#1560BD', 1200.00, 2199.00, 2499.00, '8901234567810', 6, 30, 12
FROM products p WHERE p.product_code = 'PROD-004'
ON CONFLICT (sku_code) DO NOTHING;

INSERT INTO product_variants (product_id, sku_code, size, color, color_code, cost_price, selling_price, mrp, barcode, min_stock_level, max_stock_level, reorder_quantity)
SELECT p.id, 'PROD-004-34-BLUE', '34', 'Denim Blue', '#1560BD', 1200.00, 2199.00, 2499.00, '8901234567811', 6, 30, 12
FROM products p WHERE p.product_code = 'PROD-004'
ON CONFLICT (sku_code) DO NOTHING;

-- Blazer variants
INSERT INTO product_variants (product_id, sku_code, size, color, color_code, cost_price, selling_price, mrp, barcode, min_stock_level, max_stock_level, reorder_quantity)
SELECT p.id, 'PROD-005-M-NAVY', 'M', 'Navy', '#000080', 3500.00, 5999.00, 6999.00, '8901234567812', 3, 15, 5
FROM products p WHERE p.product_code = 'PROD-005'
ON CONFLICT (sku_code) DO NOTHING;

INSERT INTO product_variants (product_id, sku_code, size, color, color_code, cost_price, selling_price, mrp, barcode, min_stock_level, max_stock_level, reorder_quantity)
SELECT p.id, 'PROD-005-L-NAVY', 'L', 'Navy', '#000080', 3500.00, 5999.00, 6999.00, '8901234567813', 3, 15, 5
FROM products p WHERE p.product_code = 'PROD-005'
ON CONFLICT (sku_code) DO NOTHING;

-- =====================================================
-- 7. CUSTOMERS
-- =====================================================

INSERT INTO customers (customer_code, full_name, phone, email, city, state, customer_type, whatsapp_opt_in) VALUES
('CUST-001', 'Rajesh Kumar', '+919876543210', 'rajesh@example.com', 'Bangalore', 'Karnataka', 'RETAIL', TRUE),
('CUST-002', 'Priya Sharma', '+919876543211', 'priya@example.com', 'Bangalore', 'Karnataka', 'VIP', TRUE),
('CUST-003', 'Amit Patel', '+919876543212', 'amit@example.com', 'Bangalore', 'Karnataka', 'RETAIL', FALSE),
('CUST-004', 'Sneha Reddy', '+919876543213', 'sneha@example.com', 'Bangalore', 'Karnataka', 'WHOLESALE', TRUE),
('CUST-005', 'Vikram Singh', '+919876543214', 'vikram@example.com', 'Bangalore', 'Karnataka', 'RETAIL', TRUE)
ON CONFLICT (customer_code) DO NOTHING;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Seed data inserted successfully!';
    RAISE NOTICE '📊 Data Summary:';
    RAISE NOTICE '   • 5 Roles (OWNER, MANAGER, STORE_STAFF, GODOWN_STAFF, ACCOUNTANT)';
    RAISE NOTICE '   • 6 Categories (Shirts, T-Shirts, Trousers, Jeans, Jackets, Accessories)';
    RAISE NOTICE '   • 6 Brands (Van Heusen, Peter England, Allen Solly, Louis Philippe, Arrow, Generic)';
    RAISE NOTICE '   • 4 Locations (2 Stores, 1 Godown, 1 Showroom)';
    RAISE NOTICE '   • 5 Products (Formal Shirt, T-Shirt, Trousers, Jeans, Blazer)';
    RAISE NOTICE '   • 12 Product Variants (with barcodes)';
    RAISE NOTICE '   • 5 Customers';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 Next Steps:';
    RAISE NOTICE '   1. Create test users in Supabase Auth';
    RAISE NOTICE '   2. Link users to user_profiles table';
    RAISE NOTICE '   3. Run 04-test-events.sql to create sample events';
    RAISE NOTICE '   4. Refresh materialized view: SELECT refresh_current_stock_view();';
END $$;
