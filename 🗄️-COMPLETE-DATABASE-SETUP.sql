-- 🗄️ COMPLETE DATABASE SETUP
-- Run this FIRST before anything else!
-- This creates all the core tables needed for the system.

-- ============================================
-- 1. LOCATIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS locations (
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

-- Create index
CREATE INDEX IF NOT EXISTS idx_locations_type ON locations(location_type);
CREATE INDEX IF NOT EXISTS idx_locations_active ON locations(is_active);

-- ============================================
-- 2. USERS TABLE (Extended from auth.users)
-- ============================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('OWNER', 'MANAGER', 'STORE_STAFF', 'GODOWN_STAFF')),
  location_id UUID REFERENCES locations(id),
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_location ON users(location_id);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

-- ============================================
-- 3. AUDIT LOG TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  table_name TEXT,
  record_id TEXT,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_table ON audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);

-- ============================================
-- 4. INSERT DEFAULT LOCATIONS (if they don't exist)
-- ============================================

INSERT INTO locations (id, location_name, location_type, address, city, state, is_active)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'Main Store - Mumbai', 'STORE', 'Main Location', 'Mumbai', 'Maharashtra', true),
  ('00000000-0000-0000-0000-000000000002', 'Central Godown', 'GODOWN', 'Warehouse Area', 'Mumbai', 'Maharashtra', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Users table policies
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

-- Locations table policies
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

-- Audit log policies
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
-- 6. TRIGGERS FOR UPDATED_AT
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_locations_updated_at ON locations;
CREATE TRIGGER update_locations_updated_at
  BEFORE UPDATE ON locations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 7. VERIFICATION QUERIES
-- ============================================

-- Check tables exist
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_name IN ('users', 'locations', 'audit_log')
ORDER BY table_name;

-- Check locations
SELECT * FROM locations ORDER BY location_type, location_name;

-- Check users (should be empty initially)
SELECT COUNT(*) as user_count FROM users;

-- ============================================
-- ✅ DONE!
-- ============================================

-- Next steps:
-- 1. Create owner user in Supabase Dashboard (Authentication → Users)
-- 2. Run /🔐-CREATE-OWNER-ONLY.sql to link owner to users table
-- 3. Run /📋-SALES-TABLES-SCHEMA.sql to create POS tables
-- 4. Login and start using the app!
