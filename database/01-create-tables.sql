-- =====================================================
-- RETAIL MANAGEMENT SYSTEM - DATABASE SCHEMA
-- Migration: 01 - Create Tables
-- =====================================================
-- Domain: jariwala.figma.site
-- Architecture: Event-driven, Ledger-first
-- Database: PostgreSQL (Supabase)
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- SUPPORTING TABLES (Create first - no dependencies)
-- =====================================================

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
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_code ON categories(category_code);

-- Brands
CREATE TABLE IF NOT EXISTS brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_code VARCHAR(50) UNIQUE NOT NULL,
    brand_name VARCHAR(200) NOT NULL,
    description TEXT,
    logo_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brands_code ON brands(brand_code);

-- =====================================================
-- USER & ROLE TABLES
-- =====================================================

-- Roles
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL CHECK (name IN (
        'OWNER',
        'MANAGER',
        'STORE_STAFF',
        'GODOWN_STAFF',
        'ACCOUNTANT'
    )),
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    permissions JSONB NOT NULL DEFAULT '{}',
    level INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- LOCATION TABLES
-- =====================================================

-- Locations
CREATE TABLE IF NOT EXISTS locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_code VARCHAR(50) UNIQUE NOT NULL,
    location_name VARCHAR(200) NOT NULL,
    location_type VARCHAR(50) NOT NULL CHECK (location_type IN (
        'STORE',
        'GODOWN',
        'SHOWROOM',
        'FACTORY',
        'TRANSIT'
    )),
    address_line1 VARCHAR(200),
    address_line2 VARCHAR(200),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'India',
    phone VARCHAR(20),
    email VARCHAR(100),
    manager_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    is_selling_location BOOLEAN DEFAULT FALSE,
    is_receiving_location BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_locations_type ON locations(location_type);
CREATE INDEX IF NOT EXISTS idx_locations_code ON locations(location_code);
CREATE INDEX IF NOT EXISTS idx_locations_manager ON locations(manager_id);

-- =====================================================
-- USER PROFILE TABLES
-- =====================================================

-- User Profiles
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(200) NOT NULL,
    employee_code VARCHAR(50) UNIQUE,
    phone VARCHAR(20),
    email VARCHAR(100),
    role_id UUID NOT NULL REFERENCES roles(id),
    primary_location_id UUID REFERENCES locations(id),
    date_of_joining DATE,
    date_of_leaving DATE,
    preferences JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_location ON user_profiles(primary_location_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_employee_code ON user_profiles(employee_code);

-- User Location Access
CREATE TABLE IF NOT EXISTS user_location_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    can_view BOOLEAN DEFAULT TRUE,
    can_sell BOOLEAN DEFAULT FALSE,
    can_receive BOOLEAN DEFAULT FALSE,
    can_transfer BOOLEAN DEFAULT FALSE,
    granted_by UUID REFERENCES auth.users(id),
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_profile_id, location_id)
);

CREATE INDEX IF NOT EXISTS idx_user_location_user ON user_location_access(user_profile_id);
CREATE INDEX IF NOT EXISTS idx_user_location_location ON user_location_access(location_id);

-- =====================================================
-- PRODUCT TABLES
-- =====================================================

-- Products
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_code VARCHAR(50) UNIQUE NOT NULL,
    product_name VARCHAR(200) NOT NULL,
    description TEXT,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
    product_type VARCHAR(50) CHECK (product_type IN (
        'GARMENT',
        'ACCESSORY',
        'FOOTWEAR',
        'FABRIC'
    )),
    attributes JSONB DEFAULT '{}',
    base_cost_price DECIMAL(10,2),
    base_selling_price DECIMAL(10,2),
    mrp DECIMAL(10,2),
    tax_rate DECIMAL(5,2) DEFAULT 18.00,
    hsn_code VARCHAR(20),
    image_urls TEXT[],
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand_id);
CREATE INDEX IF NOT EXISTS idx_products_code ON products(product_code);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(product_name);

-- Product Variants
CREATE TABLE IF NOT EXISTS product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sku_code VARCHAR(100) UNIQUE NOT NULL,
    size VARCHAR(20),
    color VARCHAR(50),
    color_code VARCHAR(20),
    variant_attributes JSONB DEFAULT '{}',
    cost_price DECIMAL(10,2),
    selling_price DECIMAL(10,2),
    mrp DECIMAL(10,2),
    barcode VARCHAR(100) UNIQUE,
    weight_grams INTEGER,
    dimensions JSONB,
    min_stock_level INTEGER DEFAULT 5,
    max_stock_level INTEGER,
    reorder_quantity INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_variants_sku ON product_variants(sku_code);
CREATE INDEX IF NOT EXISTS idx_variants_barcode ON product_variants(barcode);
CREATE INDEX IF NOT EXISTS idx_variants_size_color ON product_variants(size, color);

-- =====================================================
-- EVENT LEDGER (CORE TABLE)
-- =====================================================

-- Event Ledger (INSERT-ONLY)
CREATE TABLE IF NOT EXISTS event_ledger (
    -- Identity
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Event Classification
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
        'SALE',
        'PURCHASE',
        'TRANSFER_OUT',
        'TRANSFER_IN',
        'RETURN',
        'EXCHANGE_IN',
        'EXCHANGE_OUT',
        'ADJUSTMENT',
        'DAMAGE',
        'LOSS',
        'FOUND'
    )),
    
    -- What & How Much
    variant_id UUID NOT NULL REFERENCES product_variants(id),
    quantity INTEGER NOT NULL CHECK (quantity != 0),
    
    -- Where
    from_location_id UUID REFERENCES locations(id),
    to_location_id UUID REFERENCES locations(id),
    
    -- Sales Channel
    channel VARCHAR(50) DEFAULT 'STORE' CHECK (channel IN (
        'STORE',
        'AMAZON',
        'WEBSITE',
        'WHOLESALE',
        'MANUAL'
    )),
    
    -- References
    reference_type VARCHAR(50),
    reference_id UUID,
    reference_number VARCHAR(100),
    
    -- Financial
    unit_cost_price DECIMAL(10,2),
    unit_selling_price DECIMAL(10,2),
    total_amount DECIMAL(10,2),
    
    -- Metadata
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    
    -- Sync
    sync_source VARCHAR(50),
    client_timestamp TIMESTAMPTZ,
    
    -- Audit
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Business Logic Constraints
    CHECK (
        (event_type = 'SALE' AND from_location_id IS NOT NULL AND to_location_id IS NULL AND quantity < 0)
        OR
        (event_type = 'PURCHASE' AND to_location_id IS NOT NULL AND from_location_id IS NULL AND quantity > 0)
        OR
        (event_type IN ('TRANSFER_OUT', 'TRANSFER_IN') AND 
         from_location_id IS NOT NULL AND 
         to_location_id IS NOT NULL AND 
         from_location_id != to_location_id)
        OR
        (event_type NOT IN ('SALE', 'PURCHASE', 'TRANSFER_OUT', 'TRANSFER_IN'))
    )
);

CREATE INDEX IF NOT EXISTS idx_event_ledger_variant ON event_ledger(variant_id);
CREATE INDEX IF NOT EXISTS idx_event_ledger_from_location ON event_ledger(from_location_id);
CREATE INDEX IF NOT EXISTS idx_event_ledger_to_location ON event_ledger(to_location_id);
CREATE INDEX IF NOT EXISTS idx_event_ledger_event_type ON event_ledger(event_type);
CREATE INDEX IF NOT EXISTS idx_event_ledger_created_at ON event_ledger(created_at);
CREATE INDEX IF NOT EXISTS idx_event_ledger_reference ON event_ledger(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_event_ledger_channel ON event_ledger(channel);

-- =====================================================
-- CUSTOMER TABLES
-- =====================================================

-- Customers
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_code VARCHAR(50) UNIQUE,
    full_name VARCHAR(200) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(100),
    address_line1 VARCHAR(200),
    address_line2 VARCHAR(200),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    customer_type VARCHAR(50) CHECK (customer_type IN (
        'RETAIL',
        'WHOLESALE',
        'VIP'
    )),
    loyalty_points INTEGER DEFAULT 0,
    total_purchases DECIMAL(10,2) DEFAULT 0,
    whatsapp_opt_in BOOLEAN DEFAULT FALSE,
    email_opt_in BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_code ON customers(customer_code);
CREATE INDEX IF NOT EXISTS idx_customers_type ON customers(customer_type);

-- =====================================================
-- INVOICE TABLES
-- =====================================================

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    customer_name VARCHAR(200),
    customer_phone VARCHAR(20),
    customer_address TEXT,
    location_id UUID NOT NULL REFERENCES locations(id),
    billed_by UUID NOT NULL REFERENCES auth.users(id),
    subtotal DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) CHECK (payment_method IN (
        'CASH',
        'CARD',
        'UPI',
        'NET_BANKING',
        'CREDIT'
    )),
    payment_status VARCHAR(50) DEFAULT 'PAID' CHECK (payment_status IN (
        'PAID',
        'PENDING',
        'PARTIAL',
        'CANCELLED'
    )),
    reference_type VARCHAR(50),
    reference_id UUID,
    notes TEXT,
    internal_notes TEXT,
    status VARCHAR(50) DEFAULT 'COMPLETED' CHECK (status IN (
        'DRAFT',
        'COMPLETED',
        'CANCELLED',
        'RETURNED'
    )),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_location ON invoices(location_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

-- Invoice Items
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES product_variants(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL,
    discount_percent DECIMAL(5,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    tax_rate DECIMAL(5,2) NOT NULL,
    tax_amount DECIMAL(10,2) NOT NULL,
    line_total DECIMAL(10,2) NOT NULL,
    event_id UUID REFERENCES event_ledger(event_id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_variant ON invoice_items(variant_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_event ON invoice_items(event_id);

-- =====================================================
-- AUDIT TABLE
-- =====================================================

-- Audit Log
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_type VARCHAR(50) NOT NULL,
    table_name VARCHAR(100),
    record_id UUID,
    user_id UUID REFERENCES auth.users(id),
    user_role VARCHAR(50),
    user_location_id UUID REFERENCES locations(id),
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    request_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_table ON audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_record ON audit_log(table_name, record_id);

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ All tables created successfully!';
    RAISE NOTICE '📊 Tables: categories, brands, roles, locations, user_profiles, user_location_access, products, product_variants, event_ledger, customers, invoices, invoice_items, audit_log';
    RAISE NOTICE '🎯 Next: Run 02-create-views.sql to create reporting views';
END $$;
