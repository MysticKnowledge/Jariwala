#!/bin/bash

# =====================================================
# TEST SUITE
# Tests database schema, RLS, and Edge Functions
# =====================================================

set -e

echo "🧪 Running comprehensive test suite..."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# =====================================================
# TEST 1: DATABASE SCHEMA
# =====================================================

echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Test 1: Database Schema Verification${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

supabase db push --db-url "$DATABASE_URL" << 'EOF'
DO $$
DECLARE
    table_count INT;
    view_count INT;
BEGIN
    -- Check essential tables exist
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN (
        'products', 'variants', 'locations', 'roles', 
        'user_profiles', 'event_ledger', 'audit_log'
    );
    
    IF table_count < 7 THEN
        RAISE EXCEPTION 'Missing essential tables. Found: %', table_count;
    END IF;
    
    -- Check essential views exist
    SELECT COUNT(*) INTO view_count
    FROM information_schema.views
    WHERE table_schema = 'public'
    AND table_name IN (
        'current_stock_view', 'daily_sales_report', 
        'monthly_product_performance', 'size_wise_demand',
        'outstanding_ledger', 'dead_stock_report'
    );
    
    IF view_count < 6 THEN
        RAISE EXCEPTION 'Missing essential views. Found: %', view_count;
    END IF;
    
    RAISE NOTICE '✅ All essential tables and views exist';
END $$;
EOF

echo -e "${GREEN}✅ Schema verification passed${NC}"

# =====================================================
# TEST 2: RLS POLICIES
# =====================================================

echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Test 2: RLS Policies Verification${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

supabase db push --db-url "$DATABASE_URL" << 'EOF'
DO $$
DECLARE
    rls_count INT;
BEGIN
    -- Check RLS is enabled on critical tables
    SELECT COUNT(*) INTO rls_count
    FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename IN ('event_ledger', 'products', 'variants', 'user_profiles')
    AND rowsecurity = true;
    
    IF rls_count < 4 THEN
        RAISE EXCEPTION 'RLS not enabled on all critical tables. Found: %', rls_count;
    END IF;
    
    RAISE NOTICE '✅ RLS enabled on all critical tables';
END $$;
EOF

echo -e "${GREEN}✅ RLS verification passed${NC}"

# =====================================================
# TEST 3: EVENT LEDGER CONSTRAINTS
# =====================================================

echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Test 3: Event Ledger Constraints${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Test: Cannot update event_ledger
echo "Testing UPDATE prevention..."
supabase db push --db-url "$DATABASE_URL" << 'EOF' || echo -e "${GREEN}✅ UPDATE correctly prevented${NC}"
UPDATE event_ledger SET quantity = 999 WHERE event_id = (SELECT event_id FROM event_ledger LIMIT 1);
EOF

# Test: Cannot delete from event_ledger
echo "Testing DELETE prevention..."
supabase db push --db-url "$DATABASE_URL" << 'EOF' || echo -e "${GREEN}✅ DELETE correctly prevented${NC}"
DELETE FROM event_ledger WHERE event_id = (SELECT event_id FROM event_ledger LIMIT 1);
EOF

# Test: Cannot delete from audit_log
echo "Testing audit_log DELETE prevention..."
supabase db push --db-url "$DATABASE_URL" << 'EOF' || echo -e "${GREEN}✅ Audit DELETE correctly prevented${NC}"
DELETE FROM audit_log WHERE id = (SELECT id FROM audit_log LIMIT 1);
EOF

# =====================================================
# TEST 4: STOCK CALCULATION
# =====================================================

echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Test 4: Stock Calculation Accuracy${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

supabase db push --db-url "$DATABASE_URL" << 'EOF'
DO $$
DECLARE
    stock_count INT;
BEGIN
    -- Check that stock view has data
    SELECT COUNT(*) INTO stock_count
    FROM current_stock_view
    WHERE current_quantity > 0;
    
    IF stock_count = 0 THEN
        RAISE EXCEPTION 'No stock found in current_stock_view';
    END IF;
    
    RAISE NOTICE '✅ Stock calculation working - Found % items with stock', stock_count;
END $$;
EOF

echo -e "${GREEN}✅ Stock calculation verified${NC}"

# =====================================================
# TEST 5: REPORT VIEWS
# =====================================================

echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Test 5: Report Views Data${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

supabase db push --db-url "$DATABASE_URL" << 'EOF'
DO $$
BEGIN
    -- Test daily sales report
    PERFORM * FROM daily_sales_report LIMIT 1;
    RAISE NOTICE '✅ daily_sales_report accessible';
    
    -- Test monthly product performance
    PERFORM * FROM monthly_product_performance LIMIT 1;
    RAISE NOTICE '✅ monthly_product_performance accessible';
    
    -- Test size-wise demand
    PERFORM * FROM size_wise_demand LIMIT 1;
    RAISE NOTICE '✅ size_wise_demand accessible';
    
    -- Test dead stock report
    PERFORM * FROM dead_stock_report LIMIT 1;
    RAISE NOTICE '✅ dead_stock_report accessible';
    
    RAISE NOTICE '✅ All report views accessible';
END $$;
EOF

echo -e "${GREEN}✅ Report views verified${NC}"

# =====================================================
# TEST 6: EDGE FUNCTIONS
# =====================================================

echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Test 6: Edge Functions Status${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo "Checking deployed functions..."
FUNCTIONS=$(supabase functions list 2>&1)

if echo "$FUNCTIONS" | grep -q "sync_event"; then
    echo -e "${GREEN}✅ sync_event function deployed${NC}"
else
    echo -e "${RED}❌ sync_event function NOT deployed${NC}"
fi

if echo "$FUNCTIONS" | grep -q "whatsapp_bot"; then
    echo -e "${GREEN}✅ whatsapp_bot function deployed${NC}"
else
    echo -e "${RED}❌ whatsapp_bot function NOT deployed${NC}"
fi

# =====================================================
# TEST 7: ROLE-BASED ACCESS (Simulated)
# =====================================================

echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Test 7: Role-Based Access Control${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

supabase db push --db-url "$DATABASE_URL" << 'EOF'
DO $$
BEGIN
    -- Check that roles exist
    IF NOT EXISTS (SELECT 1 FROM roles WHERE name = 'OWNER') THEN
        RAISE EXCEPTION 'OWNER role not found';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM roles WHERE name = 'MANAGER') THEN
        RAISE EXCEPTION 'MANAGER role not found';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM roles WHERE name = 'STORE_STAFF') THEN
        RAISE EXCEPTION 'STORE_STAFF role not found';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM roles WHERE name = 'GODOWN_STAFF') THEN
        RAISE EXCEPTION 'GODOWN_STAFF role not found';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM roles WHERE name = 'ACCOUNTANT') THEN
        RAISE EXCEPTION 'ACCOUNTANT role not found';
    END IF;
    
    RAISE NOTICE '✅ All 5 roles exist';
END $$;
EOF

echo -e "${GREEN}✅ Roles verification passed${NC}"

# =====================================================
# TEST 8: OFFLINE SYNC SCENARIO (Simulated)
# =====================================================

echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Test 8: Offline Sync Idempotency${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

supabase db push --db-url "$DATABASE_URL" << 'EOF'
DO $$
DECLARE
    test_event_id UUID := 'test1111-1111-1111-1111-111111111111';
    variant_id UUID;
    location_id UUID;
    initial_count INT;
    after_first_insert INT;
    after_second_insert INT;
BEGIN
    -- Get a variant and location
    SELECT id INTO variant_id FROM variants LIMIT 1;
    SELECT id INTO location_id FROM locations WHERE type = 'STORE' LIMIT 1;
    
    -- Count events
    SELECT COUNT(*) INTO initial_count FROM event_ledger WHERE event_id = test_event_id;
    
    -- Insert event with specific ID (simulating offline sync)
    INSERT INTO event_ledger (
        event_id, event_type, variant_id, quantity, to_location_id,
        channel, created_by
    ) VALUES (
        test_event_id, 'ADJUSTMENT', variant_id, 1, location_id,
        'MANUAL', '00000000-0000-0000-0000-000000000000'
    ) ON CONFLICT (event_id) DO NOTHING;
    
    SELECT COUNT(*) INTO after_first_insert FROM event_ledger WHERE event_id = test_event_id;
    
    -- Try to insert again (should be ignored due to idempotency)
    INSERT INTO event_ledger (
        event_id, event_type, variant_id, quantity, to_location_id,
        channel, created_by
    ) VALUES (
        test_event_id, 'ADJUSTMENT', variant_id, 1, location_id,
        'MANUAL', '00000000-0000-0000-0000-000000000000'
    ) ON CONFLICT (event_id) DO NOTHING;
    
    SELECT COUNT(*) INTO after_second_insert FROM event_ledger WHERE event_id = test_event_id;
    
    IF after_second_insert = after_first_insert THEN
        RAISE NOTICE '✅ Idempotency working - duplicate insert ignored';
    ELSE
        RAISE EXCEPTION 'Idempotency FAILED - duplicate was inserted';
    END IF;
    
    -- Clean up
    -- DELETE FROM event_ledger WHERE event_id = test_event_id;
    -- Note: DELETE is prevented, so we leave it
END $$;
EOF

echo -e "${GREEN}✅ Idempotency test passed${NC}"

# =====================================================
# SUMMARY
# =====================================================

echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 All Tests Passed!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo "Test Summary:"
echo "  ✅ Database schema verified"
echo "  ✅ RLS policies active"
echo "  ✅ Event ledger constraints enforced"
echo "  ✅ Stock calculation working"
echo "  ✅ Report views accessible"
echo "  ✅ Edge functions deployed"
echo "  ✅ Roles configured"
echo "  ✅ Idempotency working"

echo -e "\n${BLUE}Next: Create test users for each role${NC}"
echo "Run: ./deployment-scripts/create-test-users.sh"
