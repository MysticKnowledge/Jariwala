-- 🎯 FINAL WORKING DATABASE SETUP
-- This fixes the "relation users does not exist" error
-- by creating all tables FIRST, then adding policies AFTER

-- ============================================
-- STEP 1: DROP ALL EXISTING TABLES
-- ============================================

DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS sale_items CASCADE;
DROP TABLE IF EXISTS sales CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS locations CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- ============================================
-- STEP 2: CREATE HELPER FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STEP 3: CREATE ALL TABLES (No policies yet!)
-- ============================================

-- 3A. LOCATIONS TABLE
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_name TEXT NOT NULL,
  location_type TEXT NOT NULL CHECK (location_type IN ('STORE', 'GODOWN')),
  address TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  phone TEXT,
  gst_number TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_locations_type ON locations(location_type);
CREATE INDEX idx_locations_active ON locations(is_active);

-- 3B. USERS TABLE
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('OWNER', 'MANAGER', 'STORE_STAFF', 'GODOWN_STAFF')),
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_location ON users(location_id);
CREATE INDEX idx_users_active ON users(is_active);

-- 3C. AUDIT_LOG TABLE
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  table_name TEXT,
  record_id TEXT,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_table ON audit_log(table_name);
CREATE INDEX idx_audit_log_created ON audit_log(created_at DESC);

-- ============================================
-- STEP 4: INSERT DEFAULT DATA
-- ============================================

INSERT INTO locations (id, location_name, location_type, address, city, state, is_active)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'Main Store - Mumbai', 'STORE', 'Main Location', 'Mumbai', 'Maharashtra', true),
  ('00000000-0000-0000-0000-000000000002', 'Central Godown', 'GODOWN', 'Warehouse Area', 'Mumbai', 'Maharashtra', true);

-- ============================================
-- STEP 5: ENABLE RLS ON ALL TABLES
-- ============================================

ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 6: CREATE RLS POLICIES (Now users table exists!)
-- ============================================

-- 6A. LOCATIONS POLICIES
CREATE POLICY "Everyone can read locations"
  ON locations FOR SELECT
  USING (true);

CREATE POLICY "Owners can manage locations"
  ON locations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'OWNER'
    )
  );

-- 6B. USERS POLICIES
CREATE POLICY "Users can read all users"
  ON users FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Owners can manage all users"
  ON users FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'OWNER'
    )
  );

-- 6C. AUDIT_LOG POLICIES
CREATE POLICY "Users can read own audit logs"
  ON audit_log FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Owners can read all audit logs"
  ON audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'OWNER'
    )
  );

CREATE POLICY "System can insert audit logs"
  ON audit_log FOR INSERT
  WITH CHECK (true);

-- ============================================
-- STEP 7: CREATE TRIGGERS
-- ============================================

CREATE TRIGGER update_locations_updated_at
  BEFORE UPDATE ON locations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STEP 8: VERIFICATION
-- ============================================

-- Show table counts
SELECT 'locations' as table_name, COUNT(*) as row_count FROM locations
UNION ALL
SELECT 'users', COUNT(*) FROM users
UNION ALL
SELECT 'audit_log', COUNT(*) FROM audit_log;

-- Show locations
SELECT id, location_name, location_type, city, is_active FROM locations;

-- ============================================
-- ✅ SUCCESS!
-- ============================================

SELECT '✅✅✅ Database setup complete! ✅✅✅' as status;
SELECT '📍 Next step: Create owner user in Authentication → Users' as step_2;
SELECT '🔗 Then run: /🔐-CREATE-OWNER-ONLY.sql' as step_3;
SELECT '🛒 Finally run: /📋-SALES-TABLES-SCHEMA.sql' as step_4;
