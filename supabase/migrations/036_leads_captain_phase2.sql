-- =====================================================
-- LEADS CAPTAIN PHASE 2 TABLES
-- Supports Prompts 5, 7, 9 (Pro tier features)
-- =====================================================

-- =====================================================
-- 1. INSIGHTS TABLE (Prompt 5 Results)
-- =====================================================

CREATE TABLE IF NOT EXISTS leads_captain_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID NOT NULL REFERENCES leads_captain_config(id) ON DELETE CASCADE,

  -- Period this insight covers
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,

  -- Insight data (stored as JSONB for flexibility)
  insights JSONB NOT NULL DEFAULT '[]',
  key_metrics JSONB NOT NULL DEFAULT '{}',
  executive_summary TEXT,
  conversations_analyzed INTEGER DEFAULT 0,

  -- Metadata
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  model_used VARCHAR(50),
  tokens_used INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. HANDOFF SUMMARIES TABLE (Prompt 7 Results)
-- =====================================================

CREATE TABLE IF NOT EXISTS leads_captain_handoff_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES leads_captain_conversations_v2(id) ON DELETE CASCADE,

  -- Summary content
  quick_summary TEXT NOT NULL,
  customer_mood VARCHAR(20), -- calm, concerned, frustrated, angry, urgent
  handoff_reason TEXT,
  customer_wants JSONB DEFAULT '[]',
  already_discussed JSONB DEFAULT '[]',
  not_yet_discussed JSONB DEFAULT '[]',
  suggested_opening TEXT,
  urgency_level VARCHAR(20), -- low, medium, high, critical
  warning_flags JSONB DEFAULT '[]',

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  model_used VARCHAR(50),
  tokens_used INTEGER,

  -- One summary per conversation
  UNIQUE(conversation_id)
);

-- =====================================================
-- 3. SANDBOX TESTS TABLE (Prompt 9 Results)
-- =====================================================

CREATE TABLE IF NOT EXISTS leads_captain_sandbox_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID NOT NULL REFERENCES leads_captain_config(id) ON DELETE CASCADE,

  -- Test scenario
  scenario JSONB NOT NULL,

  -- Test results
  conversation JSONB NOT NULL DEFAULT '[]',
  analysis JSONB NOT NULL DEFAULT '{}',
  scenario_completed BOOLEAN DEFAULT false,
  turns_used INTEGER DEFAULT 0,
  tokens_used INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 4. INDEXES
-- =====================================================

-- Indexes for Insights
CREATE INDEX IF NOT EXISTS idx_lc_insights_config
  ON leads_captain_insights(config_id);

CREATE INDEX IF NOT EXISTS idx_lc_insights_generated
  ON leads_captain_insights(generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_lc_insights_period
  ON leads_captain_insights(config_id, period_start, period_end);

-- Indexes for Handoff Summaries
CREATE INDEX IF NOT EXISTS idx_lc_handoff_conversation
  ON leads_captain_handoff_summaries(conversation_id);

CREATE INDEX IF NOT EXISTS idx_lc_handoff_created
  ON leads_captain_handoff_summaries(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lc_handoff_urgency
  ON leads_captain_handoff_summaries(urgency_level);

-- Indexes for Sandbox Tests
CREATE INDEX IF NOT EXISTS idx_lc_sandbox_config
  ON leads_captain_sandbox_tests(config_id);

CREATE INDEX IF NOT EXISTS idx_lc_sandbox_created
  ON leads_captain_sandbox_tests(created_at DESC);

-- =====================================================
-- 5. ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS
ALTER TABLE leads_captain_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads_captain_handoff_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads_captain_sandbox_tests ENABLE ROW LEVEL SECURITY;

-- Policy for insights
DROP POLICY IF EXISTS insights_read_own_business ON leads_captain_insights;
CREATE POLICY insights_read_own_business ON leads_captain_insights
  FOR SELECT
  TO authenticated
  USING (
    config_id IN (
      SELECT lcc.id FROM leads_captain_config lcc
      JOIN users u ON u.business_id = lcc.business_id
      WHERE u.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS insights_insert_own_business ON leads_captain_insights;
CREATE POLICY insights_insert_own_business ON leads_captain_insights
  FOR INSERT
  TO authenticated
  WITH CHECK (
    config_id IN (
      SELECT lcc.id FROM leads_captain_config lcc
      JOIN users u ON u.business_id = lcc.business_id
      WHERE u.id = auth.uid()
    )
  );

-- Policy for handoff summaries
DROP POLICY IF EXISTS handoff_read_own_business ON leads_captain_handoff_summaries;
CREATE POLICY handoff_read_own_business ON leads_captain_handoff_summaries
  FOR SELECT
  TO authenticated
  USING (
    conversation_id IN (
      SELECT c.id FROM leads_captain_conversations_v2 c
      JOIN leads_captain_config lcc ON lcc.id = c.config_id
      JOIN users u ON u.business_id = lcc.business_id
      WHERE u.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS handoff_insert_own_business ON leads_captain_handoff_summaries;
CREATE POLICY handoff_insert_own_business ON leads_captain_handoff_summaries
  FOR INSERT
  TO authenticated
  WITH CHECK (
    conversation_id IN (
      SELECT c.id FROM leads_captain_conversations_v2 c
      JOIN leads_captain_config lcc ON lcc.id = c.config_id
      JOIN users u ON u.business_id = lcc.business_id
      WHERE u.id = auth.uid()
    )
  );

-- Policy for sandbox tests
DROP POLICY IF EXISTS sandbox_read_own_business ON leads_captain_sandbox_tests;
CREATE POLICY sandbox_read_own_business ON leads_captain_sandbox_tests
  FOR SELECT
  TO authenticated
  USING (
    config_id IN (
      SELECT lcc.id FROM leads_captain_config lcc
      JOIN users u ON u.business_id = lcc.business_id
      WHERE u.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS sandbox_insert_own_business ON leads_captain_sandbox_tests;
CREATE POLICY sandbox_insert_own_business ON leads_captain_sandbox_tests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    config_id IN (
      SELECT lcc.id FROM leads_captain_config lcc
      JOIN users u ON u.business_id = lcc.business_id
      WHERE u.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS sandbox_delete_own_business ON leads_captain_sandbox_tests;
CREATE POLICY sandbox_delete_own_business ON leads_captain_sandbox_tests
  FOR DELETE
  TO authenticated
  USING (
    config_id IN (
      SELECT lcc.id FROM leads_captain_config lcc
      JOIN users u ON u.business_id = lcc.business_id
      WHERE u.id = auth.uid()
    )
  );

-- =====================================================
-- 6. SERVICE ROLE POLICIES (For cron/API access)
-- =====================================================

-- Allow service role full access
DROP POLICY IF EXISTS insights_service_role ON leads_captain_insights;
CREATE POLICY insights_service_role ON leads_captain_insights
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS handoff_service_role ON leads_captain_handoff_summaries;
CREATE POLICY handoff_service_role ON leads_captain_handoff_summaries
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS sandbox_service_role ON leads_captain_sandbox_tests;
CREATE POLICY sandbox_service_role ON leads_captain_sandbox_tests
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- 7. VIEWS FOR ANALYTICS
-- =====================================================

-- View for recent insights summary
CREATE OR REPLACE VIEW leads_captain_insights_summary AS
SELECT
  config_id,
  (key_metrics->>'avgLeadQuality') as avg_lead_quality,
  (key_metrics->>'avgSentiment') as avg_sentiment,
  (key_metrics->>'conversionIndicators') as conversion_trend,
  conversations_analyzed,
  jsonb_array_length(insights) as insight_count,
  generated_at,
  period_start,
  period_end
FROM leads_captain_insights
WHERE generated_at >= NOW() - INTERVAL '30 days';

-- View for handoff trends
CREATE OR REPLACE VIEW leads_captain_handoff_trends AS
SELECT
  c.config_id,
  h.urgency_level,
  h.customer_mood,
  COUNT(*) as count,
  DATE_TRUNC('day', h.created_at) as date
FROM leads_captain_handoff_summaries h
JOIN leads_captain_conversations_v2 c ON c.id = h.conversation_id
WHERE h.created_at >= NOW() - INTERVAL '30 days'
GROUP BY c.config_id, h.urgency_level, h.customer_mood, DATE_TRUNC('day', h.created_at);

-- View for sandbox test results
CREATE OR REPLACE VIEW leads_captain_sandbox_results AS
SELECT
  config_id,
  (scenario->>'customerPersona') as persona,
  (scenario->>'serviceType') as service_type,
  (analysis->>'overallScore')::integer as score,
  (analysis->>'responseQuality') as response_quality,
  (analysis->>'informationGathering') as info_gathering,
  scenario_completed,
  turns_used,
  created_at
FROM leads_captain_sandbox_tests
WHERE created_at >= NOW() - INTERVAL '30 days';
