-- =====================================================
-- MIGRATION 127: TRAINING SYSTEM CONSOLIDATION
--
-- Self-contained migration that:
--   1. Creates base tables if they don't exist (from migration 125)
--   2. Consolidates to 3 tables per GTS v1.3 spec
--
-- Final schema (3 tables):
--   1. user_training (progress + preferences)
--   2. training_analytics (batched events)
--   3. training_dismissals (don't show again)
--
-- Drops: training_preferences (merged into user_training)
-- =====================================================

-- =====================================================
-- PART 1: CREATE BASE TABLES (IF NOT EXISTS)
-- =====================================================

-- 1.1 USER TRAINING PROGRESS
CREATE TABLE IF NOT EXISTS user_training (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  portal VARCHAR(20) NOT NULL DEFAULT 'business'
    CHECK (portal IN ('business', 'admin')),

  -- Module progress
  module_id VARCHAR(100) NOT NULL,
  current_step_index INTEGER DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'in_progress', 'completed', 'skipped')),

  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  total_time_seconds INTEGER DEFAULT 0,

  -- Sync metadata
  last_synced_at TIMESTAMPTZ,
  local_progress_hash VARCHAR(32),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, module_id)
);

COMMENT ON TABLE user_training IS 'User progress through training modules - localStorage-first with DB sync';
COMMENT ON COLUMN user_training.module_id IS 'Training module identifier (e.g., getting-started/navigation)';

-- 1.2 TRAINING ANALYTICS (Module-level only)
CREATE TABLE IF NOT EXISTS training_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Event info
  module_id VARCHAR(100) NOT NULL,
  event_type VARCHAR(30) NOT NULL
    CHECK (event_type IN (
      'module_started',
      'module_completed',
      'module_skipped',
      'module_exited',
      'checkpoint_passed',
      'checkpoint_failed',
      'tts_enabled',
      'tts_disabled'
    )),

  -- Context (optional)
  step_index INTEGER,
  duration_seconds INTEGER,
  metadata JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE training_analytics IS 'Module-level training analytics - batched inserts only';

-- 1.3 TRAINING DISMISSALS
CREATE TABLE IF NOT EXISTS training_dismissals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  dismissal_type VARCHAR(30) NOT NULL,

  module_id VARCHAR(100),
  tip_id VARCHAR(100),

  dismissed_at TIMESTAMPTZ DEFAULT NOW(),
  show_again_after TIMESTAMPTZ
);

-- Unique index with COALESCE for nullable columns
CREATE UNIQUE INDEX IF NOT EXISTS idx_training_dismissals_unique
  ON training_dismissals (user_id, dismissal_type, COALESCE(module_id, ''), COALESCE(tip_id, ''));

COMMENT ON TABLE training_dismissals IS 'User dismissal preferences for training prompts';

-- 1.4 TRAINING PREFERENCES (temporary - will be dropped after migration)
CREATE TABLE IF NOT EXISTS training_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  voice_enabled BOOLEAN DEFAULT TRUE,
  voice_rate DECIMAL(2,1) DEFAULT 1.0,
  voice_pitch DECIMAL(2,1) DEFAULT 1.0,

  auto_advance_delay_ms INTEGER DEFAULT 0,
  show_progress_bar BOOLEAN DEFAULT TRUE,
  keyboard_shortcuts_enabled BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id)
);

-- =====================================================
-- PART 2: INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_user_training_user ON user_training(user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_training_business ON user_training(business_id);
CREATE INDEX IF NOT EXISTS idx_user_training_module ON user_training(module_id);
CREATE INDEX IF NOT EXISTS idx_training_analytics_business ON training_analytics(business_id, created_at);
CREATE INDEX IF NOT EXISTS idx_training_analytics_user ON training_analytics(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_training_analytics_module ON training_analytics(module_id);
CREATE INDEX IF NOT EXISTS idx_training_dismissals_user ON training_dismissals(user_id);

-- =====================================================
-- PART 3: ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE user_training ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_dismissals ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "Users can manage own training progress" ON user_training;
DROP POLICY IF EXISTS "Business users can view training analytics" ON training_analytics;
DROP POLICY IF EXISTS "Users can insert own analytics" ON training_analytics;
DROP POLICY IF EXISTS "Users can manage own dismissals" ON training_dismissals;
DROP POLICY IF EXISTS "Service role bypass user_training" ON user_training;
DROP POLICY IF EXISTS "Service role bypass training_analytics" ON training_analytics;
DROP POLICY IF EXISTS "Service role bypass training_dismissals" ON training_dismissals;

-- Users can manage their own training progress
CREATE POLICY "Users can manage own training progress" ON user_training
  FOR ALL USING (user_id = auth.uid());

-- Business users can view aggregated training analytics
CREATE POLICY "Business users can view training analytics" ON training_analytics
  FOR SELECT USING (
    business_id IN (SELECT business_id FROM users WHERE id = auth.uid())
  );

-- Users can insert their own analytics
CREATE POLICY "Users can insert own analytics" ON training_analytics
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can manage their own dismissals
CREATE POLICY "Users can manage own dismissals" ON training_dismissals
  FOR ALL USING (user_id = auth.uid());

-- Service role bypass
CREATE POLICY "Service role bypass user_training" ON user_training
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role bypass training_analytics" ON training_analytics
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role bypass training_dismissals" ON training_dismissals
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =====================================================
-- PART 4: CONSOLIDATION - ADD NEW COLUMNS
-- =====================================================

-- Add voice preference to user_training
ALTER TABLE user_training
  ADD COLUMN IF NOT EXISTS voice_muted BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN user_training.voice_muted IS 'User preference for TTS voice narration';

-- Add completed_courses array for tracking full course completions
ALTER TABLE user_training
  ADD COLUMN IF NOT EXISTS completed_courses TEXT[] DEFAULT '{}';

COMMENT ON COLUMN user_training.completed_courses IS 'Array of completed course IDs for this user';

-- =====================================================
-- PART 5: MIGRATE EXISTING PREFERENCES (IF ANY)
-- =====================================================

-- Migrate voice_enabled (inverted to voice_muted) from training_preferences
UPDATE user_training ut
SET voice_muted = NOT tp.voice_enabled
FROM training_preferences tp
WHERE ut.user_id = tp.user_id
  AND tp.voice_enabled = FALSE;

-- =====================================================
-- PART 6: DROP TRAINING_PREFERENCES TABLE
-- =====================================================

-- Drop RLS policies first
DROP POLICY IF EXISTS "Users can manage own preferences" ON training_preferences;
DROP POLICY IF EXISTS "Service role bypass training_preferences" ON training_preferences;

-- Drop triggers if they exist
DROP TRIGGER IF EXISTS trigger_training_preferences_updated_at ON training_preferences;

-- Drop the table
DROP TABLE IF EXISTS training_preferences;

-- =====================================================
-- PART 7: UPDATE DISMISSALS CONSTRAINT
-- =====================================================

-- Update dismissal_type constraint to include 'tour' type
ALTER TABLE training_dismissals
  DROP CONSTRAINT IF EXISTS training_dismissals_dismissal_type_check;

ALTER TABLE training_dismissals
  ADD CONSTRAINT training_dismissals_dismissal_type_check
  CHECK (dismissal_type IN ('module', 'all_training', 'contextual_tip', 'feature_tour', 'tour'));

-- =====================================================
-- PART 8: TRIGGER FOR UPDATED_AT
-- =====================================================

-- Create or replace the trigger (idempotent)
DROP TRIGGER IF EXISTS trigger_user_training_updated_at ON user_training;

CREATE TRIGGER trigger_user_training_updated_at
  BEFORE UPDATE ON user_training
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- FINAL SCHEMA (3 TABLES):
--
-- user_training:
--   - id, user_id, business_id, portal
--   - module_id, current_step_index, status
--   - started_at, completed_at, total_time_seconds
--   - last_synced_at, local_progress_hash
--   - voice_muted (consolidated from preferences)
--   - completed_courses (new)
--   - created_at, updated_at
--
-- training_analytics:
--   - id, business_id, user_id
--   - module_id, event_type
--   - step_index, duration_seconds, metadata
--   - created_at
--
-- training_dismissals:
--   - id, user_id
--   - dismissal_type (module, all_training, contextual_tip, feature_tour, tour)
--   - module_id, tip_id
--   - dismissed_at, show_again_after
-- =====================================================
