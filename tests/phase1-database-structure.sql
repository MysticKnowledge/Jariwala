-- =====================================================
-- PHASE 1: DATABASE & SCHEMA TESTS
-- Tests table structure, constraints, and ledger immutability
-- =====================================================

\echo '=================================================='
\echo 'PHASE 1: DATABASE & SCHEMA TESTS'
\echo '=================================================='

-- =====================================================
-- TEST 1.1: TABLE STRUCTURE VERIFICATION
-- =====================================================

\echo '\n🧱 TEST 1.1: Verifying all tables exist...'

DO $$
DECLARE
    missing_tables TEXT[];
    required_tables TEXT[] := ARRAY[
        'products', 'variants', 'locations', 'roles', 
        'user_profiles', 'user_location_access', 
        'event_ledger', 'audit_log', 
        'whatsapp_opt_ins', 'customer_ledger'
    ];
    table_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY required_tables
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = table_name
        ) THEN
            missing_tables := array_append(missing_tables, table_name);
        END IF;
    END LOOP;
    
    IF array_length(missing_tables, 1) > 0 THEN
        RAISE EXCEPTION '❌ CRITICAL: Missing tables: %', missing_tables;
    END IF;
    
    RAISE NOTICE '✅ All required tables exist';
END $$;

-- =====================================================
-- TEST 1.2: PRIMARY KEYS VERIFICATION
-- =====================================================

\echo '\n🔑 TEST 1.2: Verifying primary keys...'

DO $$
DECLARE
    missing_pk TEXT[];
BEGIN
    -- Check each critical table has primary key
    SELECT array_agg(tablename) INTO missing_pk
    FROM pg_tables t
    WHERE schemaname = 'public'
    AND tablename IN ('products', 'variants', 'locations', 'event_ledger', 'audit_log')
    AND NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = t.tablename 
        AND indexdef LIKE '%PRIMARY KEY%'
    );
    
    IF array_length(missing_pk, 1) > 0 THEN
        RAISE EXCEPTION '❌ Tables missing primary keys: %', missing_pk;
    END IF;
    
    RAISE NOTICE '✅ All critical tables have primary keys';
END $$;

-- =====================================================
-- TEST 1.3: FOREIGN KEY CONSTRAINTS
-- =====================================================

\echo '\n🔗 TEST 1.3: Verifying foreign key constraints...'

DO $$
DECLARE
    fk_count INT;
BEGIN
    -- Check that critical foreign keys exist
    SELECT COUNT(*) INTO fk_count
    FROM information_schema.table_constraints
    WHERE constraint_type = 'FOREIGN KEY'
    AND table_schema = 'public';
    
    IF fk_count < 5 THEN
        RAISE EXCEPTION '❌ Insufficient foreign key constraints. Found: %', fk_count;
    END IF;
    
    RAISE NOTICE '✅ Foreign key constraints exist (Count: %)', fk_count;
END $$;

-- =====================================================
-- TEST 1.4: NOT NULL CONSTRAINTS
-- =====================================================

\echo '\n🚫 TEST 1.4: Testing NOT NULL constraints...'

-- Test 1.4.1: Event without variant_id (MUST FAIL)
\echo '  Testing event without variant_id...'
DO $$
BEGIN
    INSERT INTO event_ledger (
        event_type, quantity, to_location_id, channel, created_by
    ) VALUES (
        'PURCHASE', 10, 
        (SELECT id FROM locations LIMIT 1),
        'MANUAL', 
        '00000000-0000-0000-0000-000000000000'
    );
    
    RAISE EXCEPTION '❌ CRITICAL: Event inserted without variant_id';
EXCEPTION
    WHEN not_null_violation THEN
        RAISE NOTICE '✅ Correctly rejected event without variant_id';
    WHEN OTHERS THEN
        RAISE EXCEPTION '❌ Wrong error: %', SQLERRM;
END $$;

-- Test 1.4.2: Event without quantity (MUST FAIL)
\echo '  Testing event without quantity...'
DO $$
BEGIN
    INSERT INTO event_ledger (
        event_type, variant_id, to_location_id, channel, created_by
    ) VALUES (
        'PURCHASE', 
        (SELECT id FROM variants LIMIT 1),
        (SELECT id FROM locations LIMIT 1),
        'MANUAL', 
        '00000000-0000-0000-0000-000000000000'
    );
    
    RAISE EXCEPTION '❌ CRITICAL: Event inserted without quantity';
EXCEPTION
    WHEN not_null_violation THEN
        RAISE NOTICE '✅ Correctly rejected event without quantity';
    WHEN OTHERS THEN
        RAISE EXCEPTION '❌ Wrong error: %', SQLERRM;
END $$;

-- Test 1.4.3: Event with zero quantity (MUST FAIL)
\echo '  Testing event with zero quantity...'
DO $$
BEGIN
    INSERT INTO event_ledger (
        event_type, variant_id, quantity, to_location_id, channel, created_by
    ) VALUES (
        'PURCHASE', 
        (SELECT id FROM variants LIMIT 1),
        0,
        (SELECT id FROM locations LIMIT 1),
        'MANUAL', 
        '00000000-0000-0000-0000-000000000000'
    );
    
    RAISE EXCEPTION '❌ CRITICAL: Event inserted with zero quantity';
EXCEPTION
    WHEN check_violation THEN
        RAISE NOTICE '✅ Correctly rejected event with zero quantity';
    WHEN OTHERS THEN
        RAISE EXCEPTION '❌ Wrong error: %', SQLERRM;
END $$;

-- =====================================================
-- TEST 1.5: UUID AUTO-GENERATION
-- =====================================================

\echo '\n🆔 TEST 1.5: Testing UUID auto-generation...'

DO $$
DECLARE
    test_product_id UUID;
    test_variant_id UUID;
BEGIN
    -- Insert product without ID
    INSERT INTO products (name, category, company)
    VALUES ('Test Product', 'Test', 'TestCo')
    RETURNING id INTO test_product_id;
    
    IF test_product_id IS NULL THEN
        RAISE EXCEPTION '❌ UUID not auto-generated for products';
    END IF;
    
    -- Insert variant without ID
    INSERT INTO variants (product_id, size, color, sku_code, mrp, selling_price)
    VALUES (test_product_id, 'TEST', 'TEST', 'TEST-UUID', 100, 100)
    RETURNING id INTO test_variant_id;
    
    IF test_variant_id IS NULL THEN
        RAISE EXCEPTION '❌ UUID not auto-generated for variants';
    END IF;
    
    RAISE NOTICE '✅ UUID auto-generation working';
    
    -- Cleanup
    DELETE FROM variants WHERE id = test_variant_id;
    DELETE FROM products WHERE id = test_product_id;
END $$;

-- =====================================================
-- TEST 2: LEDGER IMMUTABILITY (CRITICAL)
-- =====================================================

\echo '\n🔒 TEST 2: LEDGER IMMUTABILITY TEST (CRITICAL)'

-- Test 2.1: Insert event (MUST SUCCEED)
\echo '  Inserting test event...'
DO $$
DECLARE
    test_event_id UUID;
BEGIN
    INSERT INTO event_ledger (
        event_id, event_type, variant_id, quantity, to_location_id, 
        channel, created_by
    ) VALUES (
        'test2222-2222-2222-2222-222222222222',
        'PURCHASE',
        (SELECT id FROM variants LIMIT 1),
        10,
        (SELECT id FROM locations WHERE type = 'GODOWN' LIMIT 1),
        'MANUAL',
        '00000000-0000-0000-0000-000000000000'
    ) RETURNING event_id INTO test_event_id;
    
    RAISE NOTICE '✅ Event inserted successfully: %', test_event_id;
END $$;

-- Test 2.2: Try UPDATE (MUST FAIL)
\echo '  Testing UPDATE prevention (MUST FAIL)...'
DO $$
BEGIN
    UPDATE event_ledger 
    SET quantity = 999 
    WHERE event_id = 'test2222-2222-2222-2222-222222222222';
    
    RAISE EXCEPTION '❌ CRITICAL FAILURE: UPDATE worked on event_ledger!';
EXCEPTION
    WHEN SQLSTATE 'P0001' THEN
        IF SQLERRM LIKE '%UPDATE operations are not allowed%' THEN
            RAISE NOTICE '✅ UPDATE correctly prevented';
        ELSE
            RAISE EXCEPTION '❌ Wrong trigger message: %', SQLERRM;
        END IF;
    WHEN OTHERS THEN
        RAISE EXCEPTION '❌ Unexpected error: %', SQLERRM;
END $$;

-- Test 2.3: Try DELETE (MUST FAIL)
\echo '  Testing DELETE prevention (MUST FAIL)...'
DO $$
BEGIN
    DELETE FROM event_ledger 
    WHERE event_id = 'test2222-2222-2222-2222-222222222222';
    
    RAISE EXCEPTION '❌ CRITICAL FAILURE: DELETE worked on event_ledger!';
EXCEPTION
    WHEN SQLSTATE 'P0001' THEN
        IF SQLERRM LIKE '%DELETE operations are not allowed%' THEN
            RAISE NOTICE '✅ DELETE correctly prevented';
        ELSE
            RAISE EXCEPTION '❌ Wrong trigger message: %', SQLERRM;
        END IF;
    WHEN OTHERS THEN
        RAISE EXCEPTION '❌ Unexpected error: %', SQLERRM;
END $$;

-- =====================================================
-- TEST 3: STOCK DERIVATION TEST
-- =====================================================

\echo '\n📊 TEST 3: STOCK DERIVATION TEST'

DO $$
DECLARE
    test_variant_id UUID;
    test_location_id UUID;
    calculated_stock INT;
BEGIN
    -- Get test variant and location
    SELECT id INTO test_variant_id FROM variants WHERE sku_code = 'TS-RED-M' LIMIT 1;
    SELECT id INTO test_location_id FROM locations WHERE name = 'Main Store Mumbai' LIMIT 1;
    
    IF test_variant_id IS NULL OR test_location_id IS NULL THEN
        RAISE EXCEPTION '❌ Test data not found';
    END IF;
    
    -- Get initial stock
    SELECT COALESCE(current_quantity, 0) INTO calculated_stock
    FROM current_stock_view
    WHERE variant_id = test_variant_id AND location_id = test_location_id;
    
    RAISE NOTICE 'Initial stock: %', calculated_stock;
    
    -- Insert PURCHASE +10
    INSERT INTO event_ledger (event_type, variant_id, quantity, to_location_id, channel, created_by)
    VALUES ('PURCHASE', test_variant_id, 10, test_location_id, 'MANUAL', '00000000-0000-0000-0000-000000000000');
    RAISE NOTICE '  Added PURCHASE +10';
    
    -- Insert SALE -3
    INSERT INTO event_ledger (event_type, variant_id, quantity, from_location_id, channel, created_by)
    VALUES ('SALE', test_variant_id, -3, test_location_id, 'STORE', '00000000-0000-0000-0000-000000000000');
    RAISE NOTICE '  Added SALE -3';
    
    -- Insert TRANSFER -2
    INSERT INTO event_ledger (event_type, variant_id, quantity, from_location_id, to_location_id, channel, created_by)
    VALUES ('TRANSFER_OUT', test_variant_id, -2, test_location_id, 
            (SELECT id FROM locations WHERE type = 'GODOWN' LIMIT 1), 'MANUAL', '00000000-0000-0000-0000-000000000000');
    RAISE NOTICE '  Added TRANSFER_OUT -2';
    
    -- Calculate expected stock
    calculated_stock := calculated_stock + 10 - 3 - 2;
    
    -- Query current_stock_view
    SELECT current_quantity INTO calculated_stock
    FROM current_stock_view
    WHERE variant_id = test_variant_id AND location_id = test_location_id;
    
    RAISE NOTICE 'Final calculated stock: %', calculated_stock;
    
    -- Verify it matches expected
    IF calculated_stock = (
        SELECT COALESCE(SUM(
            CASE 
                WHEN to_location_id = test_location_id THEN quantity
                WHEN from_location_id = test_location_id THEN -quantity
            END
        ), 0)
        FROM event_ledger
        WHERE variant_id = test_variant_id
        AND (to_location_id = test_location_id OR from_location_id = test_location_id)
    ) THEN
        RAISE NOTICE '✅ Stock correctly derived from events';
    ELSE
        RAISE EXCEPTION '❌ Stock calculation mismatch!';
    END IF;
    
    -- Check that stock is NOT stored in a separate table
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'variants' AND column_name = 'stock'
    ) THEN
        RAISE EXCEPTION '❌ CRITICAL: Stock column found in variants table! System design is WRONG!';
    END IF;
    
    RAISE NOTICE '✅ No stock column in variants table - correct design';
END $$;

\echo '\n=================================================='
\echo '✅ PHASE 1 TESTS COMPLETE'
\echo '=================================================='
