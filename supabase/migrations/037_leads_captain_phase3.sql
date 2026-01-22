-- =====================================================
-- LEADS CAPTAIN PHASE 3 TABLES
-- Supports Prompt 8 (Photo Analyzer - Advanced tier)
-- =====================================================

-- =====================================================
-- 1. PHOTO ANALYSIS TABLE (Prompt 8 Results)
-- =====================================================

CREATE TABLE IF NOT EXISTS leads_captain_photo_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID NOT NULL REFERENCES leads_captain_config(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES leads_captain_conversations_v2(id) ON DELETE SET NULL,

  -- Image reference
  image_url TEXT NOT NULL,

  -- Analysis results
  category VARCHAR(20) NOT NULL, -- equipment, damage, installation, before_after, issue, general
  summary TEXT NOT NULL,
  detected_issues JSONB NOT NULL DEFAULT '[]',
  equipment JSONB, -- EquipmentIdentification or null
  urgency VARCHAR(20) NOT NULL DEFAULT 'low', -- critical, high, medium, low, none
  safety_warnings JSONB NOT NULL DEFAULT '[]',
  recommended_actions JSONB NOT NULL DEFAULT '[]',
  estimated_service_type VARCHAR(50), -- repair, replacement, maintenance, inspection
  confidence INTEGER DEFAULT 0, -- 0-100

  -- Metadata
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  model_used VARCHAR(50),
  tokens_used INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. INDEXES
-- =====================================================

-- Indexes for Photo Analysis
CREATE INDEX IF NOT EXISTS idx_lc_photo_config
  ON leads_captain_photo_analysis(config_id);

CREATE INDEX IF NOT EXISTS idx_lc_photo_conversation
  ON leads_captain_photo_analysis(conversation_id);

CREATE INDEX IF NOT EXISTS idx_lc_photo_created
  ON leads_captain_photo_analysis(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lc_photo_urgency
  ON leads_captain_photo_analysis(urgency);

CREATE INDEX IF NOT EXISTS idx_lc_photo_category
  ON leads_captain_photo_analysis(category);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_lc_photo_config_urgency
  ON leads_captain_photo_analysis(config_id, urgency, created_at DESC);

-- =====================================================
-- 3. ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS
ALTER TABLE leads_captain_photo_analysis ENABLE ROW LEVEL SECURITY;

-- Policy for reading own business photos
DROP POLICY IF EXISTS photo_read_own_business ON leads_captain_photo_analysis;
CREATE POLICY photo_read_own_business ON leads_captain_photo_analysis
  FOR SELECT
  TO authenticated
  USING (
    config_id IN (
      SELECT lcc.id FROM leads_captain_config lcc
      JOIN users u ON u.business_id = lcc.business_id
      WHERE u.id = auth.uid()
    )
  );

-- Policy for inserting photos
DROP POLICY IF EXISTS photo_insert_own_business ON leads_captain_photo_analysis;
CREATE POLICY photo_insert_own_business ON leads_captain_photo_analysis
  FOR INSERT
  TO authenticated
  WITH CHECK (
    config_id IN (
      SELECT lcc.id FROM leads_captain_config lcc
      JOIN users u ON u.business_id = lcc.business_id
      WHERE u.id = auth.uid()
    )
  );

-- Policy for deleting photos
DROP POLICY IF EXISTS photo_delete_own_business ON leads_captain_photo_analysis;
CREATE POLICY photo_delete_own_business ON leads_captain_photo_analysis
  FOR DELETE
  TO authenticated
  USING (
    config_id IN (
      SELECT lcc.id FROM leads_captain_config lcc
      JOIN users u ON u.business_id = lcc.business_id
      WHERE u.id = auth.uid()
    )
  );

-- Service role full access
DROP POLICY IF EXISTS photo_service_role ON leads_captain_photo_analysis;
CREATE POLICY photo_service_role ON leads_captain_photo_analysis
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- 4. ANALYTICS VIEWS
-- =====================================================

-- View for photo analysis summary by category
CREATE OR REPLACE VIEW leads_captain_photo_category_stats AS
SELECT
  config_id,
  category,
  COUNT(*) as count,
  AVG(confidence) as avg_confidence,
  DATE_TRUNC('day', created_at) as date
FROM leads_captain_photo_analysis
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY config_id, category, DATE_TRUNC('day', created_at);

-- View for urgency distribution
CREATE OR REPLACE VIEW leads_captain_photo_urgency_stats AS
SELECT
  config_id,
  urgency,
  COUNT(*) as count,
  DATE_TRUNC('day', created_at) as date
FROM leads_captain_photo_analysis
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY config_id, urgency, DATE_TRUNC('day', created_at);

-- View for recent critical/high urgency photos
CREATE OR REPLACE VIEW leads_captain_urgent_photos AS
SELECT
  id,
  config_id,
  conversation_id,
  image_url,
  category,
  summary,
  urgency,
  safety_warnings,
  recommended_actions,
  created_at
FROM leads_captain_photo_analysis
WHERE urgency IN ('critical', 'high')
  AND created_at >= NOW() - INTERVAL '7 days'
ORDER BY
  CASE urgency
    WHEN 'critical' THEN 1
    WHEN 'high' THEN 2
  END,
  created_at DESC;

-- View for equipment condition tracking
CREATE OR REPLACE VIEW leads_captain_equipment_conditions AS
SELECT
  config_id,
  (equipment->>'type') as equipment_type,
  (equipment->>'condition') as condition,
  (equipment->>'brand') as brand,
  COUNT(*) as count,
  AVG((equipment->>'confidence')::integer) as avg_confidence
FROM leads_captain_photo_analysis
WHERE equipment IS NOT NULL
  AND created_at >= NOW() - INTERVAL '90 days'
GROUP BY config_id, equipment_type, condition, brand;

-- =====================================================
-- 5. HELPER FUNCTIONS
-- =====================================================

-- Function to get photo analysis stats for a config
CREATE OR REPLACE FUNCTION get_photo_analysis_stats(p_config_id UUID, p_days INTEGER DEFAULT 30)
RETURNS TABLE (
  total_photos BIGINT,
  critical_count BIGINT,
  high_count BIGINT,
  medium_count BIGINT,
  low_count BIGINT,
  avg_confidence NUMERIC,
  top_category TEXT,
  top_service_type TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE urgency = 'critical') as critical,
      COUNT(*) FILTER (WHERE urgency = 'high') as high,
      COUNT(*) FILTER (WHERE urgency = 'medium') as medium,
      COUNT(*) FILTER (WHERE urgency = 'low') as low,
      AVG(confidence) as avg_conf
    FROM leads_captain_photo_analysis
    WHERE config_id = p_config_id
      AND created_at >= NOW() - (p_days || ' days')::INTERVAL
  ),
  top_cat AS (
    SELECT category
    FROM leads_captain_photo_analysis
    WHERE config_id = p_config_id
      AND created_at >= NOW() - (p_days || ' days')::INTERVAL
    GROUP BY category
    ORDER BY COUNT(*) DESC
    LIMIT 1
  ),
  top_svc AS (
    SELECT estimated_service_type
    FROM leads_captain_photo_analysis
    WHERE config_id = p_config_id
      AND created_at >= NOW() - (p_days || ' days')::INTERVAL
      AND estimated_service_type IS NOT NULL
    GROUP BY estimated_service_type
    ORDER BY COUNT(*) DESC
    LIMIT 1
  )
  SELECT
    s.total,
    s.critical,
    s.high,
    s.medium,
    s.low,
    s.avg_conf,
    tc.category,
    ts.estimated_service_type
  FROM stats s
  LEFT JOIN top_cat tc ON true
  LEFT JOIN top_svc ts ON true;
END;
$$ LANGUAGE plpgsql;
