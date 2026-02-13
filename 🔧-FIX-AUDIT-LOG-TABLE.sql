-- 🔧 FIX AUDIT_LOG TABLE
-- Run this to fix the column mismatch error

-- ============================================
-- OPTION 1: DROP AND RECREATE (RECOMMENDED)
-- ============================================
-- This will delete existing audit logs (if any) and start fresh

DROP TABLE IF EXISTS audit_log CASCADE;

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

-- Create indexes
CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_table ON audit_log(table_name);
CREATE INDEX idx_audit_log_created ON audit_log(created_at DESC);

-- Enable RLS
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can read own audit logs" ON audit_log;
CREATE POLICY "Users can read own audit logs"
  ON audit_log FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Owners can read all audit logs" ON audit_log;
CREATE POLICY "Owners can read all audit logs"
  ON audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'OWNER'
    )
  );

DROP POLICY IF EXISTS "System can insert audit logs" ON audit_log;
CREATE POLICY "System can insert audit logs"
  ON audit_log FOR INSERT
  WITH CHECK (true);

-- ============================================
-- ✅ DONE! Now continue with the rest of setup
-- ============================================

SELECT 'audit_log table fixed successfully!' as status;
