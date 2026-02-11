#!/bin/bash

# =====================================================
# SEED DATA SCRIPT
# Inserts initial data for testing
# =====================================================

set -e

echo "🌱 Seeding initial data..."

# Run SQL file with seed data
supabase db push --db-url "$DATABASE_URL" << 'EOF'

-- =====================================================
-- SEED DATA
-- =====================================================

-- Insert locations
INSERT INTO locations (id, name, type, address_line1, city, state, is_active) VALUES
('11111111-1111-1111-1111-111111111111', 'Main Store Mumbai', 'STORE', '123 MG Road', 'Mumbai', 'Maharashtra', true),
('22222222-2222-2222-2222-222222222222', 'Store Pune', 'STORE', '456 FC Road', 'Pune', 'Maharashtra', true),
('33333333-3333-3333-3333-333333333333', 'Warehouse Central', 'GODOWN', '789 Industrial Area', 'Mumbai', 'Maharashtra', true),
('44444444-4444-4444-4444-444444444444', 'Amazon India', 'AMAZON', 'Virtual Location', 'Online', 'Online', true)
ON CONFLICT (id) DO NOTHING;

-- Insert products
INSERT INTO products (id, name, category, company, hsn_code) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Cotton T-Shirt', 'T-Shirt', 'FashionBrand', '61091000'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Denim Jeans', 'Jeans', 'DenimCo', '62034200'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Formal Shirt', 'Shirt', 'FormalWear', '62052000')
ON CONFLICT (id) DO NOTHING;

-- Insert variants (T-Shirts)
INSERT INTO variants (id, product_id, size, color, sku_code, cost_price, mrp, selling_price, barcode) VALUES
('10000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'S', 'Red', 'TS-RED-S', 250, 799, 599, 'BAR0000000001'),
('10000000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'M', 'Red', 'TS-RED-M', 250, 799, 599, 'BAR0000000002'),
('10000000-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'L', 'Red', 'TS-RED-L', 250, 799, 599, 'BAR0000000003'),
('10000000-0000-0000-0000-000000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'XL', 'Red', 'TS-RED-XL', 250, 799, 599, 'BAR0000000004'),
('10000000-0000-0000-0000-000000000005', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'S', 'Blue', 'TS-BLU-S', 250, 799, 599, 'BAR0000000005'),
('10000000-0000-0000-0000-000000000006', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'M', 'Blue', 'TS-BLU-M', 250, 799, 599, 'BAR0000000006'),
('10000000-0000-0000-0000-000000000007', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'L', 'Blue', 'TS-BLU-L', 250, 799, 599, 'BAR0000000007'),
('10000000-0000-0000-0000-000000000008', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'S', 'Black', 'TS-BLK-S', 250, 799, 599, 'BAR0000000008'),
('10000000-0000-0000-0000-000000000009', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'M', 'Black', 'TS-BLK-M', 250, 799, 599, 'BAR0000000009'),
('10000000-0000-0000-0000-000000000010', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'L', 'Black', 'TS-BLK-L', 250, 799, 599, 'BAR0000000010')
ON CONFLICT (id) DO NOTHING;

-- Insert variants (Jeans)
INSERT INTO variants (id, product_id, size, color, sku_code, cost_price, mrp, selling_price, barcode) VALUES
('20000000-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '30', 'Blue', 'JN-BLU-30', 600, 1999, 1499, 'BAR0000000011'),
('20000000-0000-0000-0000-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '32', 'Blue', 'JN-BLU-32', 600, 1999, 1499, 'BAR0000000012'),
('20000000-0000-0000-0000-000000000003', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '34', 'Blue', 'JN-BLU-34', 600, 1999, 1499, 'BAR0000000013'),
('20000000-0000-0000-0000-000000000004', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '30', 'Black', 'JN-BLK-30', 600, 1999, 1499, 'BAR0000000014'),
('20000000-0000-0000-0000-000000000005', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '32', 'Black', 'JN-BLK-32', 600, 1999, 1499, 'BAR0000000015')
ON CONFLICT (id) DO NOTHING;

-- Note: User profiles must be created after users sign up via Supabase Auth
-- This is just a template

-- =====================================================
-- INITIAL STOCK (via event_ledger)
-- =====================================================

-- Create a system user for initial stock entry (temporary)
-- In production, this should be done by actual users

-- Purchase event - Stock incoming to warehouse
INSERT INTO event_ledger (
    event_type, variant_id, quantity, to_location_id,
    channel, reference_type, reference_number,
    unit_cost_price, created_by
) VALUES
-- T-Shirts Red
('PURCHASE', '10000000-0000-0000-0000-000000000001', 50, '33333333-3333-3333-3333-333333333333', 'MANUAL', 'PURCHASE_ORDER', 'PO-INIT-001', 250, '00000000-0000-0000-0000-000000000000'),
('PURCHASE', '10000000-0000-0000-0000-000000000002', 100, '33333333-3333-3333-3333-333333333333', 'MANUAL', 'PURCHASE_ORDER', 'PO-INIT-001', 250, '00000000-0000-0000-0000-000000000000'),
('PURCHASE', '10000000-0000-0000-0000-000000000003', 80, '33333333-3333-3333-3333-333333333333', 'MANUAL', 'PURCHASE_ORDER', 'PO-INIT-001', 250, '00000000-0000-0000-0000-000000000000'),
('PURCHASE', '10000000-0000-0000-0000-000000000004', 50, '33333333-3333-3333-3333-333333333333', 'MANUAL', 'PURCHASE_ORDER', 'PO-INIT-001', 250, '00000000-0000-0000-0000-000000000000'),

-- T-Shirts Blue
('PURCHASE', '10000000-0000-0000-0000-000000000005', 60, '33333333-3333-3333-3333-333333333333', 'MANUAL', 'PURCHASE_ORDER', 'PO-INIT-002', 250, '00000000-0000-0000-0000-000000000000'),
('PURCHASE', '10000000-0000-0000-0000-000000000006', 120, '33333333-3333-3333-3333-333333333333', 'MANUAL', 'PURCHASE_ORDER', 'PO-INIT-002', 250, '00000000-0000-0000-0000-000000000000'),
('PURCHASE', '10000000-0000-0000-0000-000000000007', 90, '33333333-3333-3333-3333-333333333333', 'MANUAL', 'PURCHASE_ORDER', 'PO-INIT-002', 250, '00000000-0000-0000-0000-000000000000'),

-- T-Shirts Black
('PURCHASE', '10000000-0000-0000-0000-000000000008', 40, '33333333-3333-3333-3333-333333333333', 'MANUAL', 'PURCHASE_ORDER', 'PO-INIT-003', 250, '00000000-0000-0000-0000-000000000000'),
('PURCHASE', '10000000-0000-0000-0000-000000000009', 80, '33333333-3333-3333-3333-333333333333', 'MANUAL', 'PURCHASE_ORDER', 'PO-INIT-003', 250, '00000000-0000-0000-0000-000000000000'),
('PURCHASE', '10000000-0000-0000-0000-000000000010', 70, '33333333-3333-3333-3333-333333333333', 'MANUAL', 'PURCHASE_ORDER', 'PO-INIT-003', 250, '00000000-0000-0000-0000-000000000000'),

-- Jeans
('PURCHASE', '20000000-0000-0000-0000-000000000001', 30, '33333333-3333-3333-3333-333333333333', 'MANUAL', 'PURCHASE_ORDER', 'PO-INIT-004', 600, '00000000-0000-0000-0000-000000000000'),
('PURCHASE', '20000000-0000-0000-0000-000000000002', 50, '33333333-3333-3333-3333-333333333333', 'MANUAL', 'PURCHASE_ORDER', 'PO-INIT-004', 600, '00000000-0000-0000-0000-000000000000'),
('PURCHASE', '20000000-0000-0000-0000-000000000003', 40, '33333333-3333-3333-3333-333333333333', 'MANUAL', 'PURCHASE_ORDER', 'PO-INIT-004', 600, '00000000-0000-0000-0000-000000000000'),
('PURCHASE', '20000000-0000-0000-0000-000000000004', 35, '33333333-3333-3333-3333-333333333333', 'MANUAL', 'PURCHASE_ORDER', 'PO-INIT-004', 600, '00000000-0000-0000-0000-000000000000'),
('PURCHASE', '20000000-0000-0000-0000-000000000005', 45, '33333333-3333-3333-3333-333333333333', 'MANUAL', 'PURCHASE_ORDER', 'PO-INIT-004', 600, '00000000-0000-0000-0000-000000000000');

-- Transfer some stock to Main Store
INSERT INTO event_ledger (
    event_type, variant_id, quantity, 
    from_location_id, to_location_id,
    channel, reference_type, reference_number, created_by
) VALUES
('TRANSFER_OUT', '10000000-0000-0000-0000-000000000001', -20, '33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'MANUAL', 'TRANSFER_NOTE', 'TN-INIT-001', '00000000-0000-0000-0000-000000000000'),
('TRANSFER_OUT', '10000000-0000-0000-0000-000000000002', -30, '33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'MANUAL', 'TRANSFER_NOTE', 'TN-INIT-001', '00000000-0000-0000-0000-000000000000'),
('TRANSFER_OUT', '10000000-0000-0000-0000-000000000003', -25, '33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'MANUAL', 'TRANSFER_NOTE', 'TN-INIT-001', '00000000-0000-0000-0000-000000000000'),
('TRANSFER_OUT', '10000000-0000-0000-0000-000000000006', -40, '33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'MANUAL', 'TRANSFER_NOTE', 'TN-INIT-002', '00000000-0000-0000-0000-000000000000'),
('TRANSFER_OUT', '20000000-0000-0000-0000-000000000002', -20, '33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'MANUAL', 'TRANSFER_NOTE', 'TN-INIT-003', '00000000-0000-0000-0000-000000000000');

-- Some sample sales
INSERT INTO event_ledger (
    event_type, variant_id, quantity, from_location_id,
    channel, reference_type, reference_number,
    unit_selling_price, total_amount, created_by
) VALUES
('SALE', '10000000-0000-0000-0000-000000000002', -3, '11111111-1111-1111-1111-111111111111', 'STORE', 'BILL', 'INV-2026-0001', 599, 1797, '00000000-0000-0000-0000-000000000000'),
('SALE', '10000000-0000-0000-0000-000000000006', -2, '11111111-1111-1111-1111-111111111111', 'STORE', 'BILL', 'INV-2026-0002', 599, 1198, '00000000-0000-0000-0000-000000000000'),
('SALE', '20000000-0000-0000-0000-000000000002', -1, '11111111-1111-1111-1111-111111111111', 'STORE', 'BILL', 'INV-2026-0003', 1499, 1499, '00000000-0000-0000-0000-000000000000');

-- WhatsApp opt-ins (sample customers)
INSERT INTO whatsapp_opt_ins (phone, customer_name, opted_in) VALUES
('+919876543210', 'Test Customer 1', true),
('+919876543211', 'Test Customer 2', true),
('+919876543212', 'Test Customer 3', true);

-- Customer ledger (sample outstanding)
INSERT INTO customer_ledger (
    customer_name, customer_phone, transaction_type,
    transaction_date, reference_number, debit_amount, credit_amount
) VALUES
('Rajesh Kumar', '+919876543210', 'SALE', NOW() - INTERVAL '10 days', 'INV-2026-0001', 5000, 0),
('Rajesh Kumar', '+919876543210', 'PAYMENT', NOW() - INTERVAL '5 days', 'PAY-001', 0, 3000),
('Priya Sharma', '+919876543211', 'SALE', NOW() - INTERVAL '45 days', 'INV-2026-0002', 8000, 0),
('Amit Patel', '+919876543212', 'SALE', NOW() - INTERVAL '100 days', 'INV-2026-0003', 12000, 0);

COMMIT;

EOF

echo "✅ Seed data inserted successfully"
echo ""
echo "Seeded:"
echo "  - 4 Locations (2 stores, 1 godown, 1 Amazon)"
echo "  - 3 Products (T-Shirt, Jeans, Shirt)"
echo "  - 15 Variants (various sizes and colors)"
echo "  - Initial stock via PURCHASE events"
echo "  - Stock transfers to Main Store"
echo "  - Sample sales transactions"
echo "  - 3 WhatsApp opt-ins"
echo "  - Customer outstanding records"
echo ""
echo "Note: User profiles must be created after users sign up via Supabase Auth"
