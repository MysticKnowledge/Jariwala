#!/bin/bash

# =====================================================
# CREATE TEST USERS FOR EACH ROLE
# Creates dummy users for testing RLS and permissions
# =====================================================

set -e

echo "👥 Creating test users for each role..."

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Creating Test User Profiles${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

supabase db push --db-url "$DATABASE_URL" << 'EOF'

-- =====================================================
-- TEST USER PROFILES
-- Note: In production, these users should be created
-- via Supabase Auth signup. These are placeholder entries
-- for testing RLS policies.
-- =====================================================

-- Test user IDs (simulate auth.users UUIDs)
DO $$
DECLARE
    owner_user_id UUID := 'user0001-0000-0000-0000-000000000001';
    manager_user_id UUID := 'user0002-0000-0000-0000-000000000002';
    store_staff_user_id UUID := 'user0003-0000-0000-0000-000000000003';
    godown_staff_user_id UUID := 'user0004-0000-0000-0000-000000000004';
    accountant_user_id UUID := 'user0005-0000-0000-0000-000000000005';
    
    main_store_id UUID;
    warehouse_id UUID;
    store_pune_id UUID;
BEGIN
    -- Get location IDs
    SELECT id INTO main_store_id FROM locations WHERE name = 'Main Store Mumbai' LIMIT 1;
    SELECT id INTO warehouse_id FROM locations WHERE name = 'Warehouse Central' LIMIT 1;
    SELECT id INTO store_pune_id FROM locations WHERE name = 'Store Pune' LIMIT 1;
    
    -- =====================================================
    -- 1. OWNER User Profile
    -- =====================================================
    INSERT INTO user_profiles (
        user_id, role_id, full_name, employee_code,
        primary_location_id, phone, email, is_active
    ) VALUES (
        owner_user_id,
        (SELECT id FROM roles WHERE name = 'OWNER'),
        'Test Owner',
        'OWNER-001',
        main_store_id,
        '+919999999901',
        'owner@test.com',
        true
    ) ON CONFLICT (user_id) DO NOTHING;
    
    -- Owner has access to all locations
    INSERT INTO user_location_access (user_profile_id, location_id, can_view, can_edit, can_transfer)
    SELECT 
        (SELECT id FROM user_profiles WHERE user_id = owner_user_id),
        l.id,
        true,
        true,
        true
    FROM locations l
    ON CONFLICT (user_profile_id, location_id) DO NOTHING;
    
    RAISE NOTICE '✅ Created OWNER user profile';
    
    -- =====================================================
    -- 2. MANAGER User Profile
    -- =====================================================
    INSERT INTO user_profiles (
        user_id, role_id, full_name, employee_code,
        primary_location_id, phone, email, is_active
    ) VALUES (
        manager_user_id,
        (SELECT id FROM roles WHERE name = 'MANAGER'),
        'Test Manager',
        'MGR-001',
        main_store_id,
        '+919999999902',
        'manager@test.com',
        true
    ) ON CONFLICT (user_id) DO NOTHING;
    
    -- Manager has access to stores and warehouse
    INSERT INTO user_location_access (user_profile_id, location_id, can_view, can_edit, can_transfer)
    SELECT 
        (SELECT id FROM user_profiles WHERE user_id = manager_user_id),
        l.id,
        true,
        true,
        true
    FROM locations l
    WHERE l.type IN ('STORE', 'GODOWN')
    ON CONFLICT (user_profile_id, location_id) DO NOTHING;
    
    RAISE NOTICE '✅ Created MANAGER user profile';
    
    -- =====================================================
    -- 3. STORE_STAFF User Profile
    -- =====================================================
    INSERT INTO user_profiles (
        user_id, role_id, full_name, employee_code,
        primary_location_id, phone, email, is_active
    ) VALUES (
        store_staff_user_id,
        (SELECT id FROM roles WHERE name = 'STORE_STAFF'),
        'Test Store Staff',
        'STAFF-001',
        main_store_id,
        '+919999999903',
        'staff@test.com',
        true
    ) ON CONFLICT (user_id) DO NOTHING;
    
    -- Store staff only has access to Main Store
    INSERT INTO user_location_access (user_profile_id, location_id, can_view, can_edit, can_transfer)
    VALUES (
        (SELECT id FROM user_profiles WHERE user_id = store_staff_user_id),
        main_store_id,
        true,
        true,
        false
    ) ON CONFLICT (user_profile_id, location_id) DO NOTHING;
    
    RAISE NOTICE '✅ Created STORE_STAFF user profile';
    
    -- =====================================================
    -- 4. GODOWN_STAFF User Profile
    -- =====================================================
    INSERT INTO user_profiles (
        user_id, role_id, full_name, employee_code,
        primary_location_id, phone, email, is_active
    ) VALUES (
        godown_staff_user_id,
        (SELECT id FROM roles WHERE name = 'GODOWN_STAFF'),
        'Test Godown Staff',
        'GODOWN-001',
        warehouse_id,
        '+919999999904',
        'godown@test.com',
        true
    ) ON CONFLICT (user_id) DO NOTHING;
    
    -- Godown staff only has access to Warehouse
    INSERT INTO user_location_access (user_profile_id, location_id, can_view, can_edit, can_transfer)
    VALUES (
        (SELECT id FROM user_profiles WHERE user_id = godown_staff_user_id),
        warehouse_id,
        true,
        true,
        true
    ) ON CONFLICT (user_profile_id, location_id) DO NOTHING;
    
    RAISE NOTICE '✅ Created GODOWN_STAFF user profile';
    
    -- =====================================================
    -- 5. ACCOUNTANT User Profile
    -- =====================================================
    INSERT INTO user_profiles (
        user_id, role_id, full_name, employee_code,
        primary_location_id, phone, email, is_active
    ) VALUES (
        accountant_user_id,
        (SELECT id FROM roles WHERE name = 'ACCOUNTANT'),
        'Test Accountant',
        'ACC-001',
        main_store_id,
        '+919999999905',
        'accountant@test.com',
        true
    ) ON CONFLICT (user_id) DO NOTHING;
    
    -- Accountant has view access to all locations (for reports)
    INSERT INTO user_location_access (user_profile_id, location_id, can_view, can_edit, can_transfer)
    SELECT 
        (SELECT id FROM user_profiles WHERE user_id = accountant_user_id),
        l.id,
        true,
        false,
        false
    FROM locations l
    ON CONFLICT (user_profile_id, location_id) DO NOTHING;
    
    RAISE NOTICE '✅ Created ACCOUNTANT user profile';
    
END $$;

COMMIT;

-- =====================================================
-- DISPLAY TEST USER CREDENTIALS
-- =====================================================

SELECT 
    up.user_id,
    up.full_name,
    up.employee_code,
    r.name as role,
    l.name as primary_location,
    up.email,
    up.phone
FROM user_profiles up
JOIN roles r ON up.role_id = r.id
LEFT JOIN locations l ON up.primary_location_id = l.id
WHERE up.employee_code LIKE '%001'
ORDER BY r.name;

EOF

echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Test Users Created Successfully${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo "Test User Credentials:"
echo ""
echo "1. OWNER"
echo "   Email: owner@test.com"
echo "   User ID: user0001-0000-0000-0000-000000000001"
echo "   Access: ALL locations"
echo ""
echo "2. MANAGER"
echo "   Email: manager@test.com"
echo "   User ID: user0002-0000-0000-0000-000000000002"
echo "   Access: Stores and Godowns"
echo ""
echo "3. STORE_STAFF"
echo "   Email: staff@test.com"
echo "   User ID: user0003-0000-0000-0000-000000000003"
echo "   Access: Main Store Mumbai only"
echo ""
echo "4. GODOWN_STAFF"
echo "   Email: godown@test.com"
echo "   User ID: user0004-0000-0000-0000-000000000004"
echo "   Access: Warehouse Central only"
echo ""
echo "5. ACCOUNTANT"
echo "   Email: accountant@test.com"
echo "   User ID: user0005-0000-0000-0000-000000000005"
echo "   Access: VIEW-ONLY all locations"
echo ""
echo -e "${YELLOW}⚠️  Note: In production, users must sign up via Supabase Auth${NC}"
echo -e "${YELLOW}   These are test profiles for RLS testing only${NC}\n"
