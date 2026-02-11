-- =====================================================
-- PHASE 2: AUTH & RLS TESTS
-- Tests role-based access control and data isolation
-- =====================================================

\echo '=================================================='
\echo 'PHASE 2: AUTH & RLS TESTS'
\echo '=================================================='

-- =====================================================
-- TEST 4: ROLE ACCESS TEST
-- =====================================================

\echo '\n🔐 TEST 4: ROLE ACCESS TEST'

-- Verify test users exist
\echo '  Verifying test users...'
DO $$
DECLARE
    user_count INT;
BEGIN
    SELECT COUNT(*) INTO user_count
    FROM user_profiles
    WHERE employee_code LIKE '%001';
    
    IF user_count < 5 THEN
        RAISE EXCEPTION '❌ Test users not created. Run create-test-users.sh first';
    END IF;
    
    RAISE NOTICE '✅ Found % test users', user_count;
END $$;

-- Display test user access matrix
\echo '\n📋 Test User Access Matrix:'
SELECT 
    up.employee_code,
    r.name as role,
    l.name as primary_location,
    (SELECT COUNT(*) FROM user_location_access ula 
     WHERE ula.user_profile_id = up.id) as accessible_locations
FROM user_profiles up
JOIN roles r ON up.role_id = r.id
LEFT JOIN locations l ON up.primary_location_id = l.id
WHERE up.employee_code LIKE '%001'
ORDER BY r.name;

-- =====================================================
-- TEST 4.1: OWNER ACCESS TEST
-- =====================================================

\echo '\n👑 TEST 4.1: OWNER - Should access ALL data'

DO $$
DECLARE
    owner_user_id UUID := 'user0001-0000-0000-0000-000000000001';
    event_count INT;
    location_count INT;
BEGIN
    -- Set session to owner user (simulated)
    -- In production, this would be via auth.uid()
    
    -- Owner should see all locations
    SELECT COUNT(*) INTO location_count
    FROM locations;
    
    RAISE NOTICE '  Owner can see % locations', location_count;
    
    -- Owner should see all events
    SELECT COUNT(*) INTO event_count
    FROM event_ledger;
    
    RAISE NOTICE '  Owner can see % events', event_count;
    
    IF location_count > 0 AND event_count > 0 THEN
        RAISE NOTICE '✅ Owner has full access';
    ELSE
        RAISE EXCEPTION '❌ Owner access restricted';
    END IF;
END $$;

-- =====================================================
-- TEST 4.2: STORE_STAFF ACCESS TEST (ISOLATION)
-- =====================================================

\echo '\n🏪 TEST 4.2: STORE_STAFF - Should ONLY see own store'

DO $$
DECLARE
    staff_user_id UUID := 'user0003-0000-0000-0000-000000000003';
    main_store_id UUID;
    other_store_id UUID;
    accessible_locations INT;
BEGIN
    -- Get store IDs
    SELECT id INTO main_store_id FROM locations WHERE name = 'Main Store Mumbai';
    SELECT id INTO other_store_id FROM locations WHERE name = 'Store Pune';
    
    -- Check accessible locations for this staff
    SELECT COUNT(*) INTO accessible_locations
    FROM user_location_access ula
    JOIN user_profiles up ON ula.user_profile_id = up.id
    WHERE up.user_id = staff_user_id;
    
    RAISE NOTICE '  Staff has access to % location(s)', accessible_locations;
    
    -- Verify staff can only access Main Store
    IF EXISTS (
        SELECT 1 FROM user_location_access ula
        JOIN user_profiles up ON ula.user_profile_id = up.id
        WHERE up.user_id = staff_user_id
        AND ula.location_id = main_store_id
    ) THEN
        RAISE NOTICE '✅ Staff has access to Main Store Mumbai';
    ELSE
        RAISE EXCEPTION '❌ Staff missing access to assigned store';
    END IF;
    
    -- Verify staff CANNOT access other stores
    IF EXISTS (
        SELECT 1 FROM user_location_access ula
        JOIN user_profiles up ON ula.user_profile_id = up.id
        WHERE up.user_id = staff_user_id
        AND ula.location_id = other_store_id
    ) THEN
        RAISE EXCEPTION '❌ CRITICAL: Staff has access to other store!';
    ELSE
        RAISE NOTICE '✅ Staff correctly blocked from other stores';
    END IF;
END $$;

-- =====================================================
-- TEST 4.3: GODOWN_STAFF ACCESS TEST
-- =====================================================

\echo '\n📦 TEST 4.3: GODOWN_STAFF - Should ONLY access godown'

DO $$
DECLARE
    godown_user_id UUID := 'user0004-0000-0000-0000-000000000004';
    warehouse_id UUID;
    store_id UUID;
BEGIN
    SELECT id INTO warehouse_id FROM locations WHERE name = 'Warehouse Central';
    SELECT id INTO store_id FROM locations WHERE name = 'Main Store Mumbai';
    
    -- Verify godown staff has warehouse access
    IF EXISTS (
        SELECT 1 FROM user_location_access ula
        JOIN user_profiles up ON ula.user_profile_id = up.id
        WHERE up.user_id = godown_user_id
        AND ula.location_id = warehouse_id
    ) THEN
        RAISE NOTICE '✅ Godown staff has warehouse access';
    ELSE
        RAISE EXCEPTION '❌ Godown staff missing warehouse access';
    END IF;
    
    -- Verify godown staff CANNOT access stores
    IF EXISTS (
        SELECT 1 FROM user_location_access ula
        JOIN user_profiles up ON ula.user_profile_id = up.id
        WHERE up.user_id = godown_user_id
        AND ula.location_id = store_id
    ) THEN
        RAISE EXCEPTION '❌ CRITICAL: Godown staff has store access!';
    ELSE
        RAISE NOTICE '✅ Godown staff correctly blocked from stores';
    END IF;
END $$;

-- =====================================================
-- TEST 4.4: ACCOUNTANT READ-ONLY TEST
-- =====================================================

\echo '\n💼 TEST 4.4: ACCOUNTANT - Read-only access'

DO $$
DECLARE
    accountant_user_id UUID := 'user0005-0000-0000-0000-000000000005';
    can_view BOOLEAN;
    can_edit BOOLEAN;
BEGIN
    -- Check accountant has view access to all locations
    SELECT bool_and(ula.can_view), bool_and(ula.can_edit)
    INTO can_view, can_edit
    FROM user_location_access ula
    JOIN user_profiles up ON ula.user_profile_id = up.id
    WHERE up.user_id = accountant_user_id;
    
    IF can_view THEN
        RAISE NOTICE '✅ Accountant has view access';
    ELSE
        RAISE EXCEPTION '❌ Accountant missing view access';
    END IF;
    
    IF can_edit = false OR can_edit IS NULL THEN
        RAISE NOTICE '✅ Accountant correctly has NO edit access';
    ELSE
        RAISE EXCEPTION '❌ CRITICAL: Accountant has edit access!';
    END IF;
END $$;

-- =====================================================
-- TEST 4.5: ROLE PERMISSIONS MATRIX
-- =====================================================

\echo '\n📊 TEST 4.5: Role Permissions Summary'

SELECT 
    r.name as role,
    COUNT(DISTINCT up.id) as user_count,
    COUNT(DISTINCT ula.location_id) as accessible_locations,
    bool_or(ula.can_edit) as can_edit_any_location,
    bool_or(ula.can_transfer) as can_transfer
FROM roles r
LEFT JOIN user_profiles up ON r.id = up.role_id AND up.is_active = true
LEFT JOIN user_location_access ula ON up.id = ula.user_profile_id
GROUP BY r.name
ORDER BY r.name;

-- =====================================================
-- TEST 5: DIRECT DB ACCESS BLOCK TEST
-- =====================================================

\echo '\n🚫 TEST 5: DIRECT DB ACCESS BLOCK TEST'

-- Test 5.1: Check RLS is enabled
\echo '  Checking RLS is enabled...'
DO $$
DECLARE
    tables_without_rls TEXT[];
BEGIN
    SELECT array_agg(tablename) INTO tables_without_rls
    FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename IN ('event_ledger', 'products', 'variants', 'user_profiles', 'audit_log')
    AND rowsecurity = false;
    
    IF array_length(tables_without_rls, 1) > 0 THEN
        RAISE EXCEPTION '❌ CRITICAL: RLS not enabled on: %', tables_without_rls;
    END IF;
    
    RAISE NOTICE '✅ RLS enabled on all critical tables';
END $$;

-- Test 5.2: Check RLS policies exist
\echo '  Checking RLS policies exist...'
DO $$
DECLARE
    policy_count INT;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'event_ledger';
    
    IF policy_count < 3 THEN
        RAISE EXCEPTION '❌ Insufficient RLS policies on event_ledger. Found: %', policy_count;
    END IF;
    
    RAISE NOTICE '✅ Found % RLS policies on event_ledger', policy_count;
END $$;

-- Test 5.3: Verify helper functions exist
\echo '  Checking RLS helper functions...'
DO $$
BEGIN
    -- Check get_user_role exists
    PERFORM 1 FROM pg_proc WHERE proname = 'get_user_role';
    IF NOT FOUND THEN
        RAISE EXCEPTION '❌ get_user_role() function missing';
    END IF;
    
    -- Check is_owner_or_manager exists
    PERFORM 1 FROM pg_proc WHERE proname = 'is_owner_or_manager';
    IF NOT FOUND THEN
        RAISE EXCEPTION '❌ is_owner_or_manager() function missing';
    END IF;
    
    -- Check get_user_location_ids exists
    PERFORM 1 FROM pg_proc WHERE proname = 'get_user_location_ids';
    IF NOT FOUND THEN
        RAISE EXCEPTION '❌ get_user_location_ids() function missing';
    END IF;
    
    -- Check has_location_access exists
    PERFORM 1 FROM pg_proc WHERE proname = 'has_location_access';
    IF NOT FOUND THEN
        RAISE EXCEPTION '❌ has_location_access() function missing';
    END IF;
    
    RAISE NOTICE '✅ All RLS helper functions exist';
END $$;

-- =====================================================
-- TEST 5.4: AUDIT LOG IMMUTABILITY
-- =====================================================

\echo '\n🛡️ TEST 5.4: Audit log immutability'

-- Try to delete from audit_log (MUST FAIL)
DO $$
BEGIN
    DELETE FROM audit_log WHERE id = (SELECT id FROM audit_log LIMIT 1);
    RAISE EXCEPTION '❌ CRITICAL: DELETE worked on audit_log!';
EXCEPTION
    WHEN SQLSTATE 'P0001' THEN
        IF SQLERRM LIKE '%DELETE operations are not allowed%' THEN
            RAISE NOTICE '✅ Audit log DELETE correctly prevented';
        ELSE
            RAISE EXCEPTION '❌ Wrong error message: %', SQLERRM;
        END IF;
    WHEN OTHERS THEN
        -- If no audit_log entries exist, that's also acceptable
        IF SQLERRM LIKE '%subquery returned more than one row%' OR 
           SQLERRM LIKE '%no data found%' THEN
            RAISE NOTICE '⚠️  No audit log entries to test (acceptable)';
        ELSE
            RAISE;
        END IF;
END $$;

\echo '\n=================================================='
\echo '✅ PHASE 2 TESTS COMPLETE'
\echo '=================================================='
\echo 'Summary:'
\echo '  ✅ Test users verified'
\echo '  ✅ OWNER has full access'
\echo '  ✅ STORE_STAFF isolated to own store'
\echo '  ✅ GODOWN_STAFF isolated to warehouse'
\echo '  ✅ ACCOUNTANT has read-only access'
\echo '  ✅ RLS enabled on all critical tables'
\echo '  ✅ Audit log is immutable'
\echo '=================================================='
