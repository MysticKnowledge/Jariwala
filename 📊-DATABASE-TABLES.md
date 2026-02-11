# 📊 DATABASE TABLES - Complete Schema

## 🗄️ **Retail Management System Database**

**Architecture:** Ledger-first, Event-driven  
**Database:** PostgreSQL (Supabase)  
**Domain:** jariwala.figma.site

---

## 📋 **Table of Contents**

1. [Core Event System](#core-event-system)
2. [Product & Inventory](#product--inventory)
3. [User & Access Control](#user--access-control)
4. [Transactions & Billing](#transactions--billing)
5. [Reporting Views](#reporting-views)
6. [Audit & Logging](#audit--logging)
7. [Supporting Tables](#supporting-tables)

---

## 🎯 **Core Event System**

### **1. event_ledger** (INSERT-only)

**Purpose:** Immutable record of all inventory movements  
**Pattern:** Event sourcing - current stock calculated from events

```sql
CREATE TABLE event_ledger (
    -- Identity
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Event Classification
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
        'SALE',           -- Retail sale (decreases stock)
        'PURCHASE',       -- Supplier purchase (increases stock)
        'TRANSFER_OUT',   -- Stock sent to another location
        'TRANSFER_IN',    -- Stock received from another location
        'RETURN',         -- Customer return (increases stock)
        'EXCHANGE_IN',    -- Exchange - item received back
        'EXCHANGE_OUT',   -- Exchange - new item given
        'ADJUSTMENT',     -- Stock correction (+ or -)
        'DAMAGE',         -- Damaged goods (decreases stock)
        'LOSS',           -- Lost/stolen (decreases stock)
        'FOUND'           -- Found inventory (increases stock)
    )),
    
    -- What & How Much
    variant_id UUID NOT NULL REFERENCES product_variants(id),
    quantity INTEGER NOT NULL CHECK (quantity != 0),
    
    -- Where (Location tracking)
    from_location_id UUID REFERENCES locations(id),  -- Source location
    to_location_id UUID REFERENCES locations(id),    -- Destination location
    
    -- Sales Channel
    channel VARCHAR(50) DEFAULT 'STORE' CHECK (channel IN (
        'STORE',      -- Physical store
        'AMAZON',     -- Amazon marketplace
        'WEBSITE',    -- Own website
        'WHOLESALE',  -- Bulk wholesale
        'MANUAL'      -- Manual entry
    )),
    
    -- References
    reference_type VARCHAR(50),      -- 'INVOICE', 'PO', 'TRANSFER', 'ADJUSTMENT'
    reference_id UUID,                -- ID of referenced document
    reference_number VARCHAR(100),    -- Human-readable reference (INV-001)
    
    -- Financial Data
    unit_cost_price DECIMAL(10,2),       -- Cost per unit
    unit_selling_price DECIMAL(10,2),    -- Selling price per unit
    total_amount DECIMAL(10,2),          -- Total transaction amount
    
    -- Metadata
    notes TEXT,                           -- Additional notes
    metadata JSONB,                       -- Flexible additional data
    
    -- Sync & Offline Support
    sync_source VARCHAR(50),              -- 'STORE_1', 'GODOWN', 'MOBILE'
    client_timestamp TIMESTAMPTZ,         -- When event created on client
    
    -- Audit Trail
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Constraints
    CHECK (
        -- SALE: from_location required, no to_location
        (event_type = 'SALE' AND from_location_id IS NOT NULL AND to_location_id IS NULL AND quantity < 0)
        OR
        -- PURCHASE: to_location required, no from_location
        (event_type = 'PURCHASE' AND to_location_id IS NOT NULL AND from_location_id IS NULL AND quantity > 0)
        OR
        -- TRANSFER: both locations required, different
        (event_type IN ('TRANSFER_OUT', 'TRANSFER_IN') AND 
         from_location_id IS NOT NULL AND 
         to_location_id IS NOT NULL AND 
         from_location_id != to_location_id)
        OR
        -- Other types
        (event_type NOT IN ('SALE', 'PURCHASE', 'TRANSFER_OUT', 'TRANSFER_IN'))
    )
);

-- Indexes for performance
CREATE INDEX idx_event_ledger_variant ON event_ledger(variant_id);
CREATE INDEX idx_event_ledger_from_location ON event_ledger(from_location_id);
CREATE INDEX idx_event_ledger_to_location ON event_ledger(to_location_id);
CREATE INDEX idx_event_ledger_event_type ON event_ledger(event_type);
CREATE INDEX idx_event_ledger_created_at ON event_ledger(created_at);
CREATE INDEX idx_event_ledger_reference ON event_ledger(reference_type, reference_id);
```

**Quantity Rules:**
- **Negative:** SALE, TRANSFER_OUT, DAMAGE, LOSS, EXCHANGE_OUT
- **Positive:** PURCHASE, TRANSFER_IN, RETURN, FOUND, EXCHANGE_IN
- **Either:** ADJUSTMENT (can be + or -)

---

## 📦 **Product & Inventory**

### **2. products**

**Purpose:** Product master data (garments)

```sql
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Product Info
    product_code VARCHAR(50) UNIQUE NOT NULL,    -- PROD-001
    product_name VARCHAR(200) NOT NULL,          -- "Cotton Shirt"
    description TEXT,
    
    -- Categorization
    category_id UUID REFERENCES categories(id),
    brand_id UUID REFERENCES brands(id),
    
    -- Product Type
    product_type VARCHAR(50) CHECK (product_type IN (
        'GARMENT',
        'ACCESSORY',
        'FOOTWEAR',
        'FABRIC'
    )),
    
    -- Attributes
    attributes JSONB,  -- {"fabric": "cotton", "fit": "slim", "collar": "spread"}
    
    -- Pricing
    base_cost_price DECIMAL(10,2),
    base_selling_price DECIMAL(10,2),
    mrp DECIMAL(10,2),
    
    -- Tax
    tax_rate DECIMAL(5,2) DEFAULT 18.00,  -- GST rate
    hsn_code VARCHAR(20),                  -- HSN code for taxation
    
    -- Images
    image_urls TEXT[],                     -- Array of image URLs
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Audit
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_brand ON products(brand_id);
CREATE INDEX idx_products_code ON products(product_code);
```

---

### **3. product_variants**

**Purpose:** Size/color variants of products

```sql
CREATE TABLE product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Parent Product
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    
    -- Variant Attributes
    sku_code VARCHAR(100) UNIQUE NOT NULL,  -- PROD-001-M-BLUE
    
    -- Size & Color
    size VARCHAR(20),           -- S, M, L, XL, XXL, 32, 34, 36
    color VARCHAR(50),          -- Blue, Red, White
    color_code VARCHAR(20),     -- Hex code #0000FF
    
    -- Additional Variant Attributes
    variant_attributes JSONB,   -- {"sleeve": "full", "pattern": "plain"}
    
    -- Pricing (can override product base price)
    cost_price DECIMAL(10,2),
    selling_price DECIMAL(10,2),
    mrp DECIMAL(10,2),
    
    -- Barcode
    barcode VARCHAR(100) UNIQUE,  -- EAN-13 or custom barcode
    
    -- Physical
    weight_grams INTEGER,
    dimensions JSONB,  -- {"length": 30, "width": 20, "height": 5}
    
    -- Stock Alerts
    min_stock_level INTEGER DEFAULT 5,
    max_stock_level INTEGER,
    reorder_quantity INTEGER,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Audit
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_variants_product ON product_variants(product_id);
CREATE INDEX idx_variants_sku ON product_variants(sku_code);
CREATE INDEX idx_variants_barcode ON product_variants(barcode);
CREATE INDEX idx_variants_size_color ON product_variants(size, color);
```

---

### **4. locations**

**Purpose:** Physical locations (stores, godowns, warehouses)

```sql
CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Location Info
    location_code VARCHAR(50) UNIQUE NOT NULL,  -- STORE-01, GODOWN-01
    location_name VARCHAR(200) NOT NULL,         -- "Main Store - MG Road"
    
    -- Location Type
    location_type VARCHAR(50) NOT NULL CHECK (location_type IN (
        'STORE',           -- Retail store
        'GODOWN',          -- Warehouse/godown
        'SHOWROOM',        -- Display showroom
        'FACTORY',         -- Manufacturing
        'TRANSIT'          -- In-transit stock
    )),
    
    -- Address
    address_line1 VARCHAR(200),
    address_line2 VARCHAR(200),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'India',
    
    -- Contact
    phone VARCHAR(20),
    email VARCHAR(100),
    
    -- Location Manager
    manager_id UUID REFERENCES auth.users(id),
    
    -- Settings
    is_selling_location BOOLEAN DEFAULT FALSE,  -- Can make sales
    is_receiving_location BOOLEAN DEFAULT TRUE, -- Can receive stock
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Audit
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_locations_type ON locations(location_type);
CREATE INDEX idx_locations_code ON locations(location_code);
```

---

## 👥 **User & Access Control**

### **5. roles**

**Purpose:** User role definitions

```sql
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Role Info
    name VARCHAR(50) UNIQUE NOT NULL CHECK (name IN (
        'OWNER',          -- Full access
        'MANAGER',        -- Store/inventory management
        'STORE_STAFF',    -- Sales and billing
        'GODOWN_STAFF',   -- Warehouse operations
        'ACCOUNTANT'      -- Financial access only
    )),
    
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Permissions
    permissions JSONB NOT NULL,  
    /* Example:
    {
        "inventory": {"read": true, "write": true, "delete": false},
        "sales": {"read": true, "write": true},
        "reports": {"read": true},
        "users": {"read": true, "write": false}
    }
    */
    
    -- Hierarchy
    level INTEGER NOT NULL,  -- 1=Owner, 2=Manager, 3=Staff
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default roles
INSERT INTO roles (name, display_name, level, permissions) VALUES
('OWNER', 'Owner', 1, '{"all": true}'),
('MANAGER', 'Manager', 2, '{"inventory": {"read": true, "write": true}, "sales": {"read": true, "write": true}, "reports": {"read": true}}'),
('STORE_STAFF', 'Store Staff', 3, '{"sales": {"read": true, "write": true}, "inventory": {"read": true}}'),
('GODOWN_STAFF', 'Godown Staff', 3, '{"inventory": {"read": true, "write": true}, "transfers": {"read": true, "write": true}}'),
('ACCOUNTANT', 'Accountant', 3, '{"reports": {"read": true}, "sales": {"read": true}}');
```

---

### **6. user_profiles**

**Purpose:** Extended user information

```sql
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Auth Link
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Personal Info
    full_name VARCHAR(200) NOT NULL,
    employee_code VARCHAR(50) UNIQUE,
    phone VARCHAR(20),
    email VARCHAR(100),
    
    -- Role & Location
    role_id UUID NOT NULL REFERENCES roles(id),
    primary_location_id UUID REFERENCES locations(id),
    
    -- Employment
    date_of_joining DATE,
    date_of_leaving DATE,
    
    -- Settings
    preferences JSONB,  -- UI preferences, notification settings
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Audit
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_role ON user_profiles(role_id);
CREATE INDEX idx_user_profiles_location ON user_profiles(primary_location_id);
```

---

### **7. user_location_access**

**Purpose:** Multi-location access control

```sql
CREATE TABLE user_location_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User & Location
    user_profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    
    -- Permissions
    can_view BOOLEAN DEFAULT TRUE,
    can_sell BOOLEAN DEFAULT FALSE,
    can_receive BOOLEAN DEFAULT FALSE,
    can_transfer BOOLEAN DEFAULT FALSE,
    
    -- Audit
    granted_by UUID REFERENCES auth.users(id),
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_profile_id, location_id)
);

CREATE INDEX idx_user_location_user ON user_location_access(user_profile_id);
CREATE INDEX idx_user_location_location ON user_location_access(location_id);
```

---

## 💰 **Transactions & Billing**

### **8. invoices**

**Purpose:** Sales invoices (POS billing)

```sql
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Invoice Info
    invoice_number VARCHAR(50) UNIQUE NOT NULL,  -- INV-2026-0001
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Customer
    customer_id UUID REFERENCES customers(id),
    customer_name VARCHAR(200),  -- For walk-in customers
    customer_phone VARCHAR(20),
    customer_address TEXT,
    
    -- Location & Staff
    location_id UUID NOT NULL REFERENCES locations(id),
    billed_by UUID NOT NULL REFERENCES auth.users(id),
    
    -- Financial
    subtotal DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    
    -- Payment
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
    
    -- References
    reference_type VARCHAR(50),  -- 'EXCHANGE', 'RETURN'
    reference_id UUID,
    
    -- Notes
    notes TEXT,
    internal_notes TEXT,
    
    -- Status
    status VARCHAR(50) DEFAULT 'COMPLETED' CHECK (status IN (
        'DRAFT',
        'COMPLETED',
        'CANCELLED',
        'RETURNED'
    )),
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invoices_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_date ON invoices(invoice_date);
CREATE INDEX idx_invoices_customer ON invoices(customer_id);
CREATE INDEX idx_invoices_location ON invoices(location_id);
```

---

### **9. invoice_items**

**Purpose:** Line items in invoices

```sql
CREATE TABLE invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Invoice Link
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    
    -- Product
    variant_id UUID NOT NULL REFERENCES product_variants(id),
    
    -- Quantity & Price
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL,
    discount_percent DECIMAL(5,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    tax_rate DECIMAL(5,2) NOT NULL,
    tax_amount DECIMAL(10,2) NOT NULL,
    line_total DECIMAL(10,2) NOT NULL,
    
    -- Reference to event
    event_id UUID REFERENCES event_ledger(event_id),
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX idx_invoice_items_variant ON invoice_items(variant_id);
```

---

## 📊 **Reporting Views**

### **10. current_stock_view** (Materialized View)

**Purpose:** Real-time stock levels per variant per location

```sql
CREATE MATERIALIZED VIEW current_stock_view AS
SELECT 
    v.id AS variant_id,
    v.sku_code,
    p.product_name,
    v.size,
    v.color,
    l.id AS location_id,
    l.location_name,
    l.location_type,
    
    -- Stock calculation from events
    COALESCE(SUM(
        CASE 
            WHEN e.to_location_id = l.id THEN e.quantity
            WHEN e.from_location_id = l.id THEN e.quantity
            ELSE 0
        END
    ), 0) AS current_quantity,
    
    -- Value
    COALESCE(SUM(
        CASE 
            WHEN e.to_location_id = l.id THEN e.quantity * e.unit_cost_price
            WHEN e.from_location_id = l.id THEN e.quantity * e.unit_cost_price
            ELSE 0
        END
    ), 0) AS stock_value,
    
    -- Alert status
    v.min_stock_level,
    CASE 
        WHEN COALESCE(SUM(e.quantity), 0) <= v.min_stock_level THEN 'LOW'
        WHEN COALESCE(SUM(e.quantity), 0) = 0 THEN 'OUT_OF_STOCK'
        ELSE 'OK'
    END AS stock_status,
    
    -- Last movement
    MAX(e.created_at) AS last_movement_date
    
FROM product_variants v
CROSS JOIN locations l
LEFT JOIN event_ledger e ON (
    (e.variant_id = v.id) AND 
    (e.to_location_id = l.id OR e.from_location_id = l.id)
)
LEFT JOIN products p ON v.product_id = p.id
WHERE l.is_active = TRUE AND v.is_active = TRUE
GROUP BY v.id, v.sku_code, p.product_name, v.size, v.color, 
         l.id, l.location_name, l.location_type, v.min_stock_level;

-- Refresh periodically
CREATE INDEX idx_current_stock_variant ON current_stock_view(variant_id);
CREATE INDEX idx_current_stock_location ON current_stock_view(location_id);
CREATE INDEX idx_current_stock_status ON current_stock_view(stock_status);
```

---

### **11. sales_summary_view**

**Purpose:** Daily sales summary

```sql
CREATE VIEW sales_summary_view AS
SELECT 
    i.invoice_date,
    i.location_id,
    l.location_name,
    COUNT(DISTINCT i.id) AS total_invoices,
    COUNT(DISTINCT i.customer_id) AS unique_customers,
    SUM(i.subtotal) AS gross_sales,
    SUM(i.discount_amount) AS total_discounts,
    SUM(i.tax_amount) AS total_tax,
    SUM(i.total_amount) AS net_sales,
    SUM(ii.quantity) AS items_sold,
    AVG(i.total_amount) AS avg_invoice_value
FROM invoices i
JOIN locations l ON i.location_id = l.id
LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
WHERE i.status = 'COMPLETED'
GROUP BY i.invoice_date, i.location_id, l.location_name;
```

---

### **12. inventory_movement_view**

**Purpose:** Track inventory movements

```sql
CREATE VIEW inventory_movement_view AS
SELECT 
    e.event_id,
    e.event_type,
    e.created_at AS movement_date,
    v.sku_code,
    p.product_name,
    v.size,
    v.color,
    e.quantity,
    
    -- From location
    fl.location_name AS from_location,
    fl.location_type AS from_type,
    
    -- To location
    tl.location_name AS to_location,
    tl.location_type AS to_type,
    
    e.reference_number,
    e.channel,
    e.total_amount,
    
    -- User info
    u.full_name AS performed_by,
    r.display_name AS user_role
    
FROM event_ledger e
JOIN product_variants v ON e.variant_id = v.id
JOIN products p ON v.product_id = p.id
LEFT JOIN locations fl ON e.from_location_id = fl.id
LEFT JOIN locations tl ON e.to_location_id = tl.id
LEFT JOIN user_profiles u ON e.created_by = u.user_id
LEFT JOIN roles r ON u.role_id = r.id
ORDER BY e.created_at DESC;
```

---

### **13. product_performance_view**

**Purpose:** Product sales performance

```sql
CREATE VIEW product_performance_view AS
SELECT 
    p.id AS product_id,
    p.product_code,
    p.product_name,
    v.id AS variant_id,
    v.sku_code,
    v.size,
    v.color,
    
    -- Sales metrics
    COUNT(DISTINCT ii.invoice_id) AS times_sold,
    SUM(ii.quantity) AS total_quantity_sold,
    SUM(ii.line_total) AS total_revenue,
    AVG(ii.unit_price) AS avg_selling_price,
    
    -- Time period
    MIN(i.invoice_date) AS first_sale_date,
    MAX(i.invoice_date) AS last_sale_date,
    
    -- Current stock (total across all locations)
    COALESCE((
        SELECT SUM(current_quantity) 
        FROM current_stock_view 
        WHERE variant_id = v.id
    ), 0) AS current_stock_total
    
FROM products p
JOIN product_variants v ON p.id = v.product_id
LEFT JOIN invoice_items ii ON v.id = ii.variant_id
LEFT JOIN invoices i ON ii.invoice_id = i.id AND i.status = 'COMPLETED'
GROUP BY p.id, p.product_code, p.product_name, v.id, v.sku_code, v.size, v.color;
```

---

### **14. low_stock_alert_view**

**Purpose:** Products needing reorder

```sql
CREATE VIEW low_stock_alert_view AS
SELECT 
    v.id AS variant_id,
    v.sku_code,
    p.product_name,
    v.size,
    v.color,
    l.location_name,
    cs.current_quantity,
    v.min_stock_level,
    v.reorder_quantity,
    (v.min_stock_level - cs.current_quantity) AS shortage,
    cs.last_movement_date,
    
    -- Urgency
    CASE 
        WHEN cs.current_quantity = 0 THEN 'URGENT'
        WHEN cs.current_quantity <= (v.min_stock_level * 0.5) THEN 'HIGH'
        ELSE 'MEDIUM'
    END AS urgency
    
FROM product_variants v
JOIN products p ON v.product_id = p.id
JOIN current_stock_view cs ON v.id = cs.variant_id
JOIN locations l ON cs.location_id = l.id
WHERE 
    v.is_active = TRUE 
    AND l.is_active = TRUE
    AND cs.current_quantity <= v.min_stock_level
ORDER BY urgency DESC, cs.current_quantity ASC;
```

---

## 📝 **Audit & Logging**

### **15. audit_log**

**Purpose:** Complete action tracking

```sql
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Action Info
    action_type VARCHAR(50) NOT NULL,  -- 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT'
    table_name VARCHAR(100),            -- Table affected
    record_id UUID,                     -- Record affected
    
    -- User & Context
    user_id UUID REFERENCES auth.users(id),
    user_role VARCHAR(50),
    user_location_id UUID REFERENCES locations(id),
    
    -- Changes
    old_values JSONB,                   -- Before state
    new_values JSONB,                   -- After state
    
    -- Request Info
    ip_address INET,
    user_agent TEXT,
    request_id UUID,
    
    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_table ON audit_log(table_name);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);
CREATE INDEX idx_audit_log_action ON audit_log(action_type);
```

---

## 🏢 **Supporting Tables**

### **16. categories**

```sql
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_code VARCHAR(50) UNIQUE NOT NULL,
    category_name VARCHAR(200) NOT NULL,
    parent_id UUID REFERENCES categories(id),  -- For subcategories
    description TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### **17. brands**

```sql
CREATE TABLE brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_code VARCHAR(50) UNIQUE NOT NULL,
    brand_name VARCHAR(200) NOT NULL,
    description TEXT,
    logo_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### **18. customers**

```sql
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Customer Info
    customer_code VARCHAR(50) UNIQUE,
    full_name VARCHAR(200) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(100),
    
    -- Address
    address_line1 VARCHAR(200),
    address_line2 VARCHAR(200),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    
    -- Customer Type
    customer_type VARCHAR(50) CHECK (customer_type IN (
        'RETAIL',
        'WHOLESALE',
        'VIP'
    )),
    
    -- Loyalty
    loyalty_points INTEGER DEFAULT 0,
    total_purchases DECIMAL(10,2) DEFAULT 0,
    
    -- Settings
    whatsapp_opt_in BOOLEAN DEFAULT FALSE,
    email_opt_in BOOLEAN DEFAULT FALSE,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_code ON customers(customer_code);
```

---

### **19. kv_store_c45d1eeb** (Pre-existing)

**Purpose:** Key-value store for flexible data

```sql
CREATE TABLE kv_store_c45d1eeb (
    key TEXT PRIMARY KEY,
    value JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_kv_store_updated ON kv_store_c45d1eeb(updated_at);
```

---

## 📐 **Database Schema Diagram**

```
┌─────────────────────────────────────────────────────────────┐
│                    EVENT-DRIVEN CORE                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
        ┌──────────────────────────────────────┐
        │      event_ledger (INSERT-only)      │
        │  • All inventory movements           │
        │  • Immutable event sourcing          │
        │  • Current stock = SUM(events)       │
        └──────────────────────────────────────┘
                 │              │
                 │              │
        ┌────────┴─────┐   ┌────┴──────┐
        ▼              ▼   ▼           ▼
   ┌─────────┐  ┌──────────────┐  ┌──────────┐
   │products │  │product_      │  │locations │
   │         │◄─┤variants      │  │          │
   └─────────┘  └──────────────┘  └──────────┘
        │              │                │
        ▼              ▼                ▼
   ┌─────────┐  ┌──────────────┐  ┌──────────┐
   │brands   │  │current_stock_│  │users &   │
   │         │  │view          │  │roles     │
   └─────────┘  └──────────────┘  └──────────┘
   ┌─────────┐                     
   │categories│                     ┌──────────┐
   └─────────┘                     │invoices  │
                                   │          │
                                   └──────────┘
                                        │
                                        ▼
                                   ┌──────────┐
                                   │invoice_  │
                                   │items     │
                                   └──────────┘
```

---

## 🎯 **Key Design Principles**

1. **Event Sourcing** - All inventory changes recorded as events
2. **Immutability** - event_ledger is INSERT-only, never UPDATE/DELETE
3. **Calculated Stock** - Current stock derived from event aggregation
4. **Audit Trail** - Complete history of all changes
5. **Role-Based** - Granular permissions per role
6. **Location-Aware** - Multi-location tracking built-in
7. **Offline-Ready** - Sync support with client_timestamp
8. **Idempotency** - Duplicate prevention with event_id

---

## 📊 **Table Statistics**

| Category | Tables | Purpose |
|----------|--------|---------|
| **Core Events** | 1 | event_ledger |
| **Products** | 2 | products, product_variants |
| **Locations** | 1 | locations |
| **Users** | 3 | roles, user_profiles, user_location_access |
| **Transactions** | 2 | invoices, invoice_items |
| **Customers** | 1 | customers |
| **Supporting** | 3 | categories, brands, kv_store |
| **Audit** | 1 | audit_log |
| **Views** | 5 | Reporting views |
| **Total** | **14 Tables + 5 Views** | Complete system |

---

## ✅ **Status**

- ✅ Schema designed
- ✅ Event sourcing pattern
- ✅ Role-based access
- ✅ Audit logging
- ✅ Reporting views
- ⏳ Migration scripts needed
- ⏳ Test data needed

---

**Created:** February 10, 2026  
**Status:** Ready for migration  
**Domain:** jariwala.figma.site
