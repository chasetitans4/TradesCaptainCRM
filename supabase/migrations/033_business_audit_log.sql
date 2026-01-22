-- =====================================================
-- BUSINESS AUDIT LOG TABLE
-- Track user actions within each business for compliance
-- =====================================================

-- Create business_audit_log table
CREATE TABLE IF NOT EXISTS business_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name TEXT,

  -- Action details
  action VARCHAR(100) NOT NULL,
  -- Actions: customer.created, lead.updated, job.status_changed, etc.

  target_type VARCHAR(50) NOT NULL,
  -- Types: customer, lead, job, quote, invoice, equipment, inventory, etc.

  target_id VARCHAR(255),
  target_name TEXT,

  -- Change tracking
  details JSONB DEFAULT '{}',
  old_values JSONB,
  new_values JSONB,

  -- Request context
  ip_address INET,
  user_agent TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_log_business
  ON business_audit_log(business_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user
  ON business_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created
  ON business_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action
  ON business_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_target
  ON business_audit_log(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_business_created
  ON business_audit_log(business_id, created_at DESC);

-- Composite index for common filter combinations
CREATE INDEX IF NOT EXISTS idx_audit_log_business_action_created
  ON business_audit_log(business_id, action, created_at DESC);

-- Enable RLS
ALTER TABLE business_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see audit logs for their own business
CREATE POLICY audit_log_read_own_business ON business_audit_log
  FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM users WHERE id = auth.uid()
    )
  );

-- Insert is only allowed via service role (server-side logging)
-- No INSERT policy for authenticated = only service role can write

-- Function to automatically log changes on certain tables
CREATE OR REPLACE FUNCTION log_table_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_user_name TEXT;
  v_old_values JSONB;
  v_new_values JSONB;
  v_action TEXT;
  v_target_name TEXT;
BEGIN
  -- Try to get the current user from the session
  v_user_id := auth.uid();

  IF v_user_id IS NOT NULL THEN
    SELECT name INTO v_user_name FROM users WHERE id = v_user_id;
  END IF;

  -- Determine action based on operation
  IF TG_OP = 'INSERT' THEN
    v_action := TG_TABLE_NAME || '.created';
    v_new_values := to_jsonb(NEW);
    v_target_name := COALESCE(NEW.name, NEW.title, NEW.id::TEXT);

    INSERT INTO business_audit_log (
      business_id, user_id, user_name, action, target_type, target_id, target_name, new_values
    ) VALUES (
      NEW.business_id, COALESCE(v_user_id, '00000000-0000-0000-0000-000000000000'::UUID),
      COALESCE(v_user_name, 'System'), v_action, TG_TABLE_NAME, NEW.id::TEXT, v_target_name, v_new_values
    );

    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    v_action := TG_TABLE_NAME || '.updated';
    v_old_values := to_jsonb(OLD);
    v_new_values := to_jsonb(NEW);
    v_target_name := COALESCE(NEW.name, NEW.title, NEW.id::TEXT);

    -- Check for status change
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      v_action := TG_TABLE_NAME || '.status_changed';
    END IF;

    INSERT INTO business_audit_log (
      business_id, user_id, user_name, action, target_type, target_id, target_name, old_values, new_values
    ) VALUES (
      NEW.business_id, COALESCE(v_user_id, '00000000-0000-0000-0000-000000000000'::UUID),
      COALESCE(v_user_name, 'System'), v_action, TG_TABLE_NAME, NEW.id::TEXT, v_target_name, v_old_values, v_new_values
    );

    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    v_action := TG_TABLE_NAME || '.deleted';
    v_old_values := to_jsonb(OLD);
    v_target_name := COALESCE(OLD.name, OLD.title, OLD.id::TEXT);

    INSERT INTO business_audit_log (
      business_id, user_id, user_name, action, target_type, target_id, target_name, old_values
    ) VALUES (
      OLD.business_id, COALESCE(v_user_id, '00000000-0000-0000-0000-000000000000'::UUID),
      COALESCE(v_user_name, 'System'), v_action, TG_TABLE_NAME, OLD.id::TEXT, v_target_name, v_old_values
    );

    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: Triggers can be enabled on specific tables as needed:
-- CREATE TRIGGER audit_customers
--   AFTER INSERT OR UPDATE OR DELETE ON customers
--   FOR EACH ROW EXECUTE FUNCTION log_table_changes();
--
-- CREATE TRIGGER audit_jobs
--   AFTER INSERT OR UPDATE OR DELETE ON jobs
--   FOR EACH ROW EXECUTE FUNCTION log_table_changes();

-- Documentation
COMMENT ON TABLE business_audit_log IS 'Audit trail for all user actions within a business';
COMMENT ON COLUMN business_audit_log.action IS 'Action format: entity.action (e.g., customer.created, job.status_changed)';
COMMENT ON COLUMN business_audit_log.target_type IS 'Entity type: customer, lead, job, quote, invoice, etc.';
COMMENT ON COLUMN business_audit_log.old_values IS 'Previous state for updates/deletes';
COMMENT ON COLUMN business_audit_log.new_values IS 'New state for creates/updates';
