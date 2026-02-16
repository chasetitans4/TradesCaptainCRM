-- =====================================================
-- MIGRATION 130: GUIDED TRAINING SYSTEM v1.5
--
-- Simplifies training schema per GTS v1.5 specification:
-- - One row per user per portal (not per module)
-- - localStorage-first with DB sync on exit only
-- - Course-level dismissals only
-- - Module-level analytics only (no per-step tracking)
--
-- Final schema (3 tables):
--   1. user_training (one row per user per portal)
--   2. training_analytics (module-level events only)
--   3. training_dismissals (course-level dismissals)
-- =====================================================

-- =====================================================
-- PART 1: BACKUP EXISTING DATA
-- =====================================================

-- Create backup of user progress before schema change
CREATE TABLE IF NOT EXISTS user_training_backup_gts15 AS
SELECT * FROM user_training;

-- =====================================================
-- PART 2: DROP AND RECREATE user_training
-- =====================================================

-- Drop existing table (backup already created)
DROP TABLE IF EXISTS user_training CASCADE;

-- Create new simplified user_training table
-- One row per user per portal (not per module)
CREATE TABLE user_training (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  portal VARCHAR(20) NOT NULL DEFAULT 'business'
    CHECK (portal IN ('business', 'customer', 'admin')),

  -- Progress tracking (localStorage-first)
  completed_modules TEXT[] DEFAULT '{}',
  last_position VARCHAR(200),  -- Format: "course/module/step"

  -- User preferences
  voice_muted BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One row per user per portal
  UNIQUE(user_id, portal)
);

COMMENT ON TABLE user_training IS 'User training progress per GTS v1.5 - localStorage-first with DB sync on exit';
COMMENT ON COLUMN user_training.completed_modules IS 'Array of completed module IDs (format: course_id/module_id)';
COMMENT ON COLUMN user_training.last_position IS 'Resume position: course_id/module_id/step_index';
COMMENT ON COLUMN user_training.portal IS 'Portal type: business (owner), customer (portal), admin';

-- =====================================================
-- PART 3: RECREATE training_analytics
-- =====================================================

-- Drop and recreate with GTS v1.5 event types
DROP TABLE IF EXISTS training_analytics CASCADE;

CREATE TABLE training_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  business_id UUID,

  -- Event identification
  event_type VARCHAR(30) NOT NULL
    CHECK (event_type IN (
      'module_started',
      'module_completed',
      'module_exited',
      'training_completed'
    )),

  -- Context
  course_id VARCHAR(100),
  module_id VARCHAR(100),
  duration_ms INTEGER,
  metadata JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE training_analytics IS 'Module-level training analytics per GTS v1.5 - batched inserts only';
COMMENT ON COLUMN training_analytics.event_type IS 'module_started, module_completed, module_exited, training_completed';
COMMENT ON COLUMN training_analytics.duration_ms IS 'Time spent in module (tracked client-side)';

-- =====================================================
-- PART 4: RECREATE training_dismissals
-- =====================================================

-- Drop and recreate with course-level dismissals only
DROP TABLE IF EXISTS training_dismissals CASCADE;

CREATE TABLE training_dismissals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id VARCHAR(100) NOT NULL,
  dismissed_at TIMESTAMPTZ DEFAULT NOW(),
  show_again_after TIMESTAMPTZ,

  -- One dismissal per course per user
  UNIQUE(user_id, course_id)
);

COMMENT ON TABLE training_dismissals IS 'Course dismissals per GTS v1.5 - user can dismiss entire courses';
COMMENT ON COLUMN training_dismissals.show_again_after IS 'Optional: show prompt again after this time (for feature updates)';

-- =====================================================
-- PART 5: INDEXES
-- =====================================================

-- user_training indexes
CREATE INDEX idx_user_training_user_portal ON user_training(user_id, portal);

-- training_analytics indexes (for batch reads)
CREATE INDEX idx_training_analytics_business ON training_analytics(business_id, created_at)
  WHERE business_id IS NOT NULL;
CREATE INDEX idx_training_analytics_course ON training_analytics(course_id, event_type);

-- training_dismissals indexes
CREATE INDEX idx_training_dismissals_user ON training_dismissals(user_id);

-- =====================================================
-- PART 6: ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE user_training ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_dismissals ENABLE ROW LEVEL SECURITY;

-- user_training: users manage their own
CREATE POLICY "Users manage own training" ON user_training
  FOR ALL USING (user_id = auth.uid());

-- training_analytics: users insert, admins read
CREATE POLICY "Users insert own analytics" ON training_analytics
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins view analytics" ON training_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND (role = 'admin' OR role = 'owner')
    )
  );

-- training_dismissals: users manage their own
CREATE POLICY "Users manage own dismissals" ON training_dismissals
  FOR ALL USING (user_id = auth.uid());

-- Service role bypass for all tables
CREATE POLICY "Service role bypass user_training" ON user_training
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role bypass training_analytics" ON training_analytics
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role bypass training_dismissals" ON training_dismissals
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =====================================================
-- PART 7: TRIGGER FOR UPDATED_AT
-- =====================================================

CREATE TRIGGER trigger_user_training_updated_at
  BEFORE UPDATE ON user_training
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PART 8: MIGRATE EXISTING DATA (IF ANY)
-- =====================================================

-- Migrate completed modules from backup
-- Aggregate by user_id and portal, collecting unique completed module_ids
INSERT INTO user_training (user_id, portal, completed_modules, voice_muted, created_at)
SELECT
  user_id,
  COALESCE(portal, 'business') as portal,
  ARRAY_AGG(DISTINCT module_id) FILTER (WHERE status = 'completed'),
  COALESCE(bool_or(voice_muted), false),
  MIN(created_at)
FROM user_training_backup_gts15
GROUP BY user_id, portal
ON CONFLICT (user_id, portal) DO UPDATE SET
  completed_modules = EXCLUDED.completed_modules,
  voice_muted = EXCLUDED.voice_muted;

-- =====================================================
-- FINAL SCHEMA (GTS v1.5):
--
-- user_training:
--   - id, user_id, portal (UNIQUE user_id + portal)
--   - completed_modules TEXT[] (array of completed IDs)
--   - last_position VARCHAR(200) (resume point)
--   - voice_muted BOOLEAN
--   - created_at, updated_at
--
-- training_analytics:
--   - id, user_id, business_id
--   - event_type (module_started, module_completed, module_exited, training_completed)
--   - course_id, module_id, duration_ms, metadata
--   - created_at
--
-- training_dismissals:
--   - id, user_id, course_id (UNIQUE user_id + course_id)
--   - dismissed_at, show_again_after
--
-- STOP CONDITIONS:
-- - No per-step database writes
-- - No per-step analytics
-- - DB writes only on module complete/exit and training complete
-- =====================================================
