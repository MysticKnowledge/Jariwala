-- =====================================================
-- CREATE SYSTEM USER FOR BULK OPERATIONS
-- Must be run FIRST before bulk import
-- =====================================================

-- This script creates a system user in auth.users table
-- Used for bulk imports and system-generated operations
-- UUID: 00000000-0000-0000-0000-000000000000

-- =====================================================
-- IMPORTANT: Run this in Supabase SQL Editor ONCE
-- =====================================================

-- Insert system user into auth.users (Supabase Auth table)
-- This allows bulk imports to reference created_by = 00000000-0000-0000-0000-000000000000

INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin
)
VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    'system@bulk-import.internal',
    '$2a$10$AAAAAAAAAAAAAAAAAAAAAA', -- Unusable encrypted password
    NOW(),
    NOW(),
    NOW(),
    '{"provider": "system", "providers": ["system"]}'::jsonb,
    '{"full_name": "Bulk Import System", "is_system": true}'::jsonb,
    false
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- VERIFY SYSTEM USER EXISTS
-- =====================================================

SELECT 
    id, 
    email, 
    raw_user_meta_data->>'full_name' as full_name,
    raw_user_meta_data->>'is_system' as is_system,
    confirmed_at
FROM auth.users 
WHERE id = '00000000-0000-0000-0000-000000000000';

-- Expected output:
-- id: 00000000-0000-0000-0000-000000000000
-- email: system@bulk-import.internal
-- full_name: Bulk Import System
-- is_system: true
-- confirmed_at: (auto-generated timestamp)

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ System user created successfully!';
    RAISE NOTICE 'You can now run bulk imports.';
END $$;