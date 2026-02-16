-- =====================================================
-- MIGRATION 125: GUIDED TRAINING SYSTEM (GTS)
--
-- In-product interactive training with progress tracking
-- Browser-based overlays, localStorage-first with DB sync
--
-- Key Principle: "Training happens inside the product, not outside it."
--
-- EXPLICIT LOCKS (Non-Negotiable):
--   1. Zero external APIs (TTS uses browser SpeechSynthesis)
--   2. Content is bundled with app (no runtime fetching)
--   3. Progress is localStorage-first, synced to DB on exit
--   4. Analytics are batched and module-level only
-- =====================================================

-- =====================================================
-- 1. USER TRAINING PROGRESS
-- localStorage-first, synced on exit/module completion
-- =====================================================

CREATE TABLE IF NOT EXISTS user_training (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  portal VARCHAR(20) NOT NULL DEFAULT 'business'
    CHECK (portal IN ('business', 'admin')),

  -- Module progress
  module_id VARCHAR(50) NOT NULL,
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
COMMENT ON COLUMN user_training.module_id IS 'Training module identifier (e.g., dashboard-basics, job-workflow)';
COMMENT ON COLUMN user_training.local_progress_hash IS 'MD5 of localStorage data for conflict detection';

-- =====================================================
-- 2. TRAINING ANALYTICS (Module-level only)
-- Batched inserts, no per-step tracking
-- =====================================================

CREATE TABLE IF NOT EXISTS training_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Event info
  module_id VARCHAR(50) NOT NULL,
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
COMMENT ON COLUMN training_analytics.event_type IS 'Type of analytics event (module_started, module_completed, etc.)';

-- =====================================================
-- 3. TRAINING DISMISSALS
-- "Don't show again" preferences
-- =====================================================

CREATE TABLE IF NOT EXISTS training_dismissals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  dismissal_type VARCHAR(30) NOT NULL
    CHECK (dismissal_type IN ('module', 'all_training', 'contextual_tip', 'feature_tour')),

  module_id VARCHAR(50),
  tip_id VARCHAR(50),

  dismissed_at TIMESTAMPTZ DEFAULT NOW(),
  show_again_after TIMESTAMPTZ,

  UNIQUE(user_id, dismissal_type, COALESCE(module_id, ''), COALESCE(tip_id, ''))
);

COMMENT ON TABLE training_dismissals IS 'User dismissal preferences for training prompts';
COMMENT ON COLUMN training_dismissals.show_again_after IS 'NULL = never show again; TIMESTAMPTZ = snooze until date';

-- =====================================================
-- 4. TRAINING PREFERENCES
-- User preferences for training behavior
-- =====================================================

CREATE TABLE IF NOT EXISTS training_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Voice preferences
  voice_enabled BOOLEAN DEFAULT TRUE,
  voice_rate DECIMAL(2,1) DEFAULT 1.0,
  voice_pitch DECIMAL(2,1) DEFAULT 1.0,

  -- Display preferences
  auto_advance_delay_ms INTEGER DEFAULT 0,
  show_progress_bar BOOLEAN DEFAULT TRUE,
  keyboard_shortcuts_enabled BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id)
);

COMMENT ON TABLE training_preferences IS 'User preferences for training system behavior';

-- =====================================================
-- 5. INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_user_training_user ON user_training(user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_training_business ON user_training(business_id);
CREATE INDEX IF NOT EXISTS idx_user_training_module ON user_training(module_id);
CREATE INDEX IF NOT EXISTS idx_training_analytics_business ON training_analytics(business_id, created_at);
CREATE INDEX IF NOT EXISTS idx_training_analytics_user ON training_analytics(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_training_analytics_module ON training_analytics(module_id);
CREATE INDEX IF NOT EXISTS idx_training_dismissals_user ON training_dismissals(user_id);

-- =====================================================
-- 6. ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE user_training ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_dismissals ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_preferences ENABLE ROW LEVEL SECURITY;

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

-- Users can manage their own preferences
CREATE POLICY "Users can manage own preferences" ON training_preferences
  FOR ALL USING (user_id = auth.uid());

-- =====================================================
-- 7. SERVICE ROLE BYPASS
-- =====================================================

CREATE POLICY "Service role bypass user_training" ON user_training
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role bypass training_analytics" ON training_analytics
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role bypass training_dismissals" ON training_dismissals
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role bypass training_preferences" ON training_preferences
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =====================================================
-- 8. TRIGGER: Update updated_at
-- =====================================================

CREATE TRIGGER trigger_user_training_updated_at
  BEFORE UPDATE ON user_training
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_training_preferences_updated_at
  BEFORE UPDATE ON training_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
