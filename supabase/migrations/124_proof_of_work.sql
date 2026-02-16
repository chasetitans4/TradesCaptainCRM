-- =====================================================
-- MIGRATION 124: PROOF OF WORK (TM) SYSTEM
--
-- Homeowner-facing trust verification artifacts
-- GPS-verified timestamps, verified photos, system-generated timelines
--
-- Key Principle: "Proof of Work turns invisible work into visible trust."
--
-- EXPLICIT LOCKS (Non-Negotiable):
--   1. Finalization delay MUST read from businesses.pow_finalization_delay_minutes
--      (never hard-coded in service code)
--   2. PDF export is NOT in v1 scope (Phase 2+ only)
-- =====================================================

-- =====================================================
-- 1. SUMMARY TEMPLATES (Pre-seeded, LOCKED)
-- Must be created first as proof_of_work references it
-- =====================================================

CREATE TABLE IF NOT EXISTS summary_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  trade VARCHAR(50),        -- NULL = universal
  category VARCHAR(50),     -- NULL = trade default
  outcome VARCHAR(20) NOT NULL
    CHECK (outcome IN ('COMPLETED', 'DIAGNOSED', 'PARTIAL', 'DEFERRED')),

  template_text TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE summary_templates IS 'Pre-seeded work summary templates - LOCKED, no user editing';
COMMENT ON COLUMN summary_templates.trade IS 'Trade type (HVAC, Plumbing, etc.) - NULL for universal';
COMMENT ON COLUMN summary_templates.outcome IS 'Job outcome type this template applies to';

-- =====================================================
-- 2. PROOF OF WORK MAIN TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS proof_of_work (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  technician_id UUID NOT NULL REFERENCES users(id),
  customer_id UUID REFERENCES customers(id),

  -- Identifiers
  public_token VARCHAR(16) UNIQUE NOT NULL,
  short_code VARCHAR(6) UNIQUE NOT NULL,
  reference_number VARCHAR(20) NOT NULL,

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'FINALIZED')),

  -- Service Details
  service_type VARCHAR(100) NOT NULL,
  service_category VARCHAR(100),
  job_outcome VARCHAR(20) DEFAULT 'COMPLETED'
    CHECK (job_outcome IN ('COMPLETED', 'DIAGNOSED', 'PARTIAL', 'DEFERRED')),
  service_date DATE NOT NULL,

  -- Privacy-safe location (no street address)
  location_city VARCHAR(100) NOT NULL,
  location_state VARCHAR(2) NOT NULL,
  location_zip VARCHAR(10), -- Optional per business setting

  -- Time Tracking (immutable after capture)
  arrival_time TIMESTAMPTZ,
  departure_time TIMESTAMPTZ,
  duration_minutes INTEGER,

  -- GPS Verification
  arrival_latitude DECIMAL(10, 8),
  arrival_longitude DECIMAL(11, 8),
  arrival_distance_meters INTEGER,
  location_verified BOOLEAN DEFAULT FALSE,

  -- Content
  summary_template_id UUID REFERENCES summary_templates(id),
  summary_text TEXT NOT NULL,

  -- Verification Badges
  badge_verified_business BOOLEAN DEFAULT FALSE,
  badge_verified_technician BOOLEAN DEFAULT FALSE,
  badge_location_verified BOOLEAN DEFAULT FALSE,
  badge_photo_evidence BOOLEAN DEFAULT FALSE,
  badge_timestamped BOOLEAN DEFAULT FALSE,

  -- Delivery
  delivery_enabled BOOLEAN DEFAULT TRUE,
  delivery_channel VARCHAR(10) DEFAULT 'SMS'
    CHECK (delivery_channel IN ('SMS', 'EMAIL', 'BOTH')),
  delivery_delay_minutes INTEGER DEFAULT 15,
  delivery_scheduled_at TIMESTAMPTZ,
  delivery_sent_at TIMESTAMPTZ,

  -- QR Code Assets
  qr_code_png_url TEXT,
  qr_code_svg_url TEXT,

  -- Analytics
  view_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  first_viewed_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  finalized_at TIMESTAMPTZ,

  CONSTRAINT valid_finalized CHECK (
    (status != 'FINALIZED') OR (finalized_at IS NOT NULL)
  )
);

COMMENT ON TABLE proof_of_work IS 'Proof of Work (TM) - Homeowner-facing trust artifacts for completed jobs';
COMMENT ON COLUMN proof_of_work.public_token IS 'Unguessable 16-char token for public URL';
COMMENT ON COLUMN proof_of_work.short_code IS '6-char code for QR/short URLs (pow.tc/{code})';
COMMENT ON COLUMN proof_of_work.finalized_at IS 'After this timestamp, record is IMMUTABLE (except view/share counts)';
COMMENT ON COLUMN proof_of_work.location_city IS 'Privacy-safe: city only, no street address exposed';

-- =====================================================
-- 3. EXTEND JOB_PHOTOS FOR VERIFICATION
-- =====================================================

ALTER TABLE job_photos
  ADD COLUMN IF NOT EXISTS verification_level INTEGER DEFAULT 0
    CHECK (verification_level BETWEEN 0 AND 3),
  ADD COLUMN IF NOT EXISTS source_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS time_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS location_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS direct_capture BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS distance_meters INTEGER,
  ADD COLUMN IF NOT EXISTS capture_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS perceptual_hash VARCHAR(16),
  ADD COLUMN IF NOT EXISTS upload_source VARCHAR(20) DEFAULT 'UNKNOWN'
    CHECK (upload_source IN ('MOBILE_APP', 'DESKTOP', 'API', 'UNKNOWN'));

COMMENT ON COLUMN job_photos.verification_level IS '0=unverified, 1=time only, 2=time+location, 3=fully verified (time+location+source)';
COMMENT ON COLUMN job_photos.perceptual_hash IS 'For duplicate photo detection across jobs (64-bit phash as hex)';
COMMENT ON COLUMN job_photos.locked_at IS 'Once set, photo metadata cannot be modified';
COMMENT ON COLUMN job_photos.upload_source IS 'Where the photo was uploaded from - affects verification level';

-- =====================================================
-- 4. TIMELINE EVENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS proof_of_work_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proof_of_work_id UUID NOT NULL REFERENCES proof_of_work(id) ON DELETE CASCADE,

  event_type VARCHAR(30) NOT NULL
    CHECK (event_type IN (
      'SCHEDULED', 'ASSIGNED', 'EN_ROUTE', 'ARRIVED',
      'WORK_STARTED', 'PHOTOS_ADDED', 'COMPLETED', 'SENT'
    )),
  event_time TIMESTAMPTZ NOT NULL,
  event_icon VARCHAR(10) NOT NULL,
  event_label VARCHAR(100) NOT NULL,
  verification_badge VARCHAR(50),
  metadata JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE proof_of_work_timeline IS 'System-generated timeline events for Proof of Work - not user-editable';
COMMENT ON COLUMN proof_of_work_timeline.event_icon IS 'Emoji icon for display (e.g., calendar, wrench, camera)';
COMMENT ON COLUMN proof_of_work_timeline.verification_badge IS 'Badge text like "GPS Verified" if applicable';

-- =====================================================
-- 5. AUDIT LOG (Views, Shares, QR Scans)
-- =====================================================

CREATE TABLE IF NOT EXISTS proof_of_work_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proof_of_work_id UUID NOT NULL REFERENCES proof_of_work(id) ON DELETE CASCADE,

  event_type VARCHAR(30) NOT NULL
    CHECK (event_type IN (
      'CREATED', 'FINALIZED', 'VIEWED', 'SHARED',
      'DELIVERED', 'DELIVERY_FAILED', 'QR_SCANNED'
      -- Note: PDF_DOWNLOADED intentionally omitted - Phase 2+ only
    )),

  -- Actor info (anonymized for homeowners)
  actor_type VARCHAR(20) NOT NULL
    CHECK (actor_type IN ('SYSTEM', 'BUSINESS', 'HOMEOWNER', 'ANONYMOUS')),
  actor_id UUID,

  -- Request metadata (privacy-safe)
  ip_hash VARCHAR(64), -- SHA-256 hashed, not raw IP
  user_agent TEXT,
  referrer TEXT,
  utm_source VARCHAR(50),

  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE proof_of_work_audit IS 'Audit log for PoW views, shares, and delivery events';
COMMENT ON COLUMN proof_of_work_audit.ip_hash IS 'SHA-256 hashed IP for privacy - never store raw IPs';

-- =====================================================
-- 6. SHORT URL REDIRECTS
-- =====================================================

CREATE TABLE IF NOT EXISTS short_url_redirects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_code VARCHAR(6) UNIQUE NOT NULL,
  target_type VARCHAR(20) NOT NULL DEFAULT 'proof_of_work'
    CHECK (target_type IN ('proof_of_work', 'invoice', 'quote')),
  target_id UUID NOT NULL,

  click_count INTEGER DEFAULT 0,
  last_clicked_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE short_url_redirects IS 'Short URL mapping for pow.tc/{code} redirects';
COMMENT ON COLUMN short_url_redirects.short_code IS '6-char alphanumeric code for short URLs';

-- =====================================================
-- 7. BUSINESS SETTINGS FOR PROOF OF WORK
-- =====================================================

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS pow_enabled BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS pow_auto_delivery BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS pow_delivery_channel VARCHAR(10) DEFAULT 'SMS'
    CHECK (pow_delivery_channel IN ('SMS', 'EMAIL', 'BOTH')),
  ADD COLUMN IF NOT EXISTS pow_delivery_delay_minutes INTEGER DEFAULT 15,
  ADD COLUMN IF NOT EXISTS pow_show_zip BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS pow_require_photos BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS pow_finalization_delay_minutes INTEGER DEFAULT 30;

COMMENT ON COLUMN businesses.pow_enabled IS 'Whether Proof of Work is enabled for this business';
COMMENT ON COLUMN businesses.pow_finalization_delay_minutes IS 'CONFIGURABLE: Minutes after job completion before PoW is finalized and immutable. Default 30. Services MUST read this value, never hard-code.';
COMMENT ON COLUMN businesses.pow_show_zip IS 'Whether to include ZIP code on public page (privacy setting)';

-- =====================================================
-- 8. ADD POW REFERENCE TO JOBS
-- =====================================================

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS proof_of_work_id UUID REFERENCES proof_of_work(id);

-- =====================================================
-- 9. INDEXES
-- =====================================================

-- Main lookup indexes
CREATE INDEX IF NOT EXISTS idx_pow_public_token ON proof_of_work(public_token);
CREATE INDEX IF NOT EXISTS idx_pow_short_code ON proof_of_work(short_code);
CREATE INDEX IF NOT EXISTS idx_pow_job_id ON proof_of_work(job_id);
CREATE INDEX IF NOT EXISTS idx_pow_business_id ON proof_of_work(business_id);

-- Status-based queries (exclude finalized for active queries)
CREATE INDEX IF NOT EXISTS idx_pow_status ON proof_of_work(status) WHERE status != 'FINALIZED';

-- Delivery queue index
CREATE INDEX IF NOT EXISTS idx_pow_delivery_pending ON proof_of_work(delivery_scheduled_at)
  WHERE delivery_sent_at IS NULL AND delivery_enabled = TRUE;

-- Timeline and audit indexes
CREATE INDEX IF NOT EXISTS idx_pow_timeline_pow_id ON proof_of_work_timeline(proof_of_work_id);
CREATE INDEX IF NOT EXISTS idx_pow_audit_pow_id ON proof_of_work_audit(proof_of_work_id);
CREATE INDEX IF NOT EXISTS idx_pow_audit_created ON proof_of_work_audit(created_at);

-- Template lookup
CREATE INDEX IF NOT EXISTS idx_templates_lookup ON summary_templates(trade, category, outcome);

-- Short URL lookup
CREATE INDEX IF NOT EXISTS idx_short_urls ON short_url_redirects(short_code);

-- Photo verification indexes
CREATE INDEX IF NOT EXISTS idx_job_photos_hash ON job_photos(perceptual_hash)
  WHERE perceptual_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_job_photos_verification ON job_photos(job_id, verification_level);

-- =====================================================
-- 10. ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE proof_of_work ENABLE ROW LEVEL SECURITY;
ALTER TABLE proof_of_work_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE proof_of_work_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE summary_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE short_url_redirects ENABLE ROW LEVEL SECURITY;

-- Service role bypass (for API/backend operations)
CREATE POLICY "Service role bypass pow" ON proof_of_work
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role bypass pow_timeline" ON proof_of_work_timeline
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role bypass pow_audit" ON proof_of_work_audit
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role bypass templates" ON summary_templates
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role bypass short_urls" ON short_url_redirects
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Business users can read their own PoW records
CREATE POLICY "Business users can read own pow" ON proof_of_work
  FOR SELECT TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM users WHERE id = auth.uid()
    )
  );

-- Business users can create PoW for their business
CREATE POLICY "Business users can create pow" ON proof_of_work
  FOR INSERT TO authenticated
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM users WHERE id = auth.uid()
    )
  );

-- Business users can update non-finalized PoW
CREATE POLICY "Business users can update non-finalized pow" ON proof_of_work
  FOR UPDATE TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM users WHERE id = auth.uid()
    )
    AND finalized_at IS NULL
  );

-- Templates are read-only for all authenticated users
CREATE POLICY "Templates are readable" ON summary_templates
  FOR SELECT TO authenticated
  USING (is_active = TRUE);

-- =====================================================
-- 11. IMMUTABILITY TRIGGER
-- Prevents modification of finalized PoW records
-- (except view_count and share_count for analytics)
-- =====================================================

CREATE OR REPLACE FUNCTION prevent_pow_modification()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.finalized_at IS NOT NULL THEN
    -- Allow only view_count, share_count, first_viewed_at updates
    IF (
      NEW.view_count IS DISTINCT FROM OLD.view_count OR
      NEW.share_count IS DISTINCT FROM OLD.share_count OR
      NEW.first_viewed_at IS DISTINCT FROM OLD.first_viewed_at
    ) AND (
      NEW.public_token = OLD.public_token AND
      NEW.short_code = OLD.short_code AND
      NEW.status = OLD.status AND
      NEW.summary_text = OLD.summary_text AND
      NEW.finalized_at = OLD.finalized_at
    ) THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Cannot modify finalized Proof of Work record (id: %)', OLD.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_pow_immutability ON proof_of_work;
CREATE TRIGGER enforce_pow_immutability
  BEFORE UPDATE ON proof_of_work
  FOR EACH ROW EXECUTE FUNCTION prevent_pow_modification();

-- =====================================================
-- 12. PHOTO LOCK TRIGGER
-- Prevents modification of locked photos
-- =====================================================

CREATE OR REPLACE FUNCTION prevent_photo_modification()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.locked_at IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot modify locked photo (id: %)', OLD.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_photo_lock ON job_photos;
CREATE TRIGGER enforce_photo_lock
  BEFORE UPDATE ON job_photos
  FOR EACH ROW
  WHEN (OLD.locked_at IS NOT NULL)
  EXECUTE FUNCTION prevent_photo_modification();

-- =====================================================
-- 13. SEED SUMMARY TEMPLATES
-- Pre-seeded templates by trade and outcome
-- =====================================================

INSERT INTO summary_templates (trade, category, outcome, template_text) VALUES
  -- Universal templates (NULL trade = applies to all)
  (NULL, NULL, 'COMPLETED', 'Service completed successfully. All work performed as requested.'),
  (NULL, NULL, 'DIAGNOSED', 'Diagnostic assessment completed. Findings documented for review.'),
  (NULL, NULL, 'PARTIAL', 'Initial work completed. Additional service may be required.'),
  (NULL, NULL, 'DEFERRED', 'Service visit completed. Work deferred pending customer approval or parts.'),

  -- HVAC templates
  ('HVAC', 'Maintenance', 'COMPLETED', 'HVAC maintenance completed. System inspected, filters checked, and all components verified operational.'),
  ('HVAC', 'Repair', 'COMPLETED', 'HVAC repair completed. System restored to proper operation and tested.'),
  ('HVAC', 'Installation', 'COMPLETED', 'HVAC installation completed. New equipment installed and system tested for proper operation.'),
  ('HVAC', 'Diagnostic', 'DIAGNOSED', 'HVAC diagnostic completed. System issues identified and documented.'),

  -- Plumbing templates
  ('Plumbing', 'Repair', 'COMPLETED', 'Plumbing repair completed. Leak/issue resolved and tested for proper function.'),
  ('Plumbing', 'Maintenance', 'COMPLETED', 'Plumbing maintenance completed. System inspected and preventive service performed.'),
  ('Plumbing', 'Installation', 'COMPLETED', 'Plumbing installation completed. New fixtures/equipment installed and tested.'),
  ('Plumbing', 'Drain', 'COMPLETED', 'Drain service completed. Blockage cleared and drain tested for proper flow.'),

  -- Electrical templates
  ('Electrical', 'Repair', 'COMPLETED', 'Electrical repair completed. Issue resolved and circuit tested for safety.'),
  ('Electrical', 'Installation', 'COMPLETED', 'Electrical installation completed. New wiring/fixtures installed and tested.'),
  ('Electrical', 'Inspection', 'COMPLETED', 'Electrical inspection completed. All accessible components examined and documented.'),

  -- General/Handyman templates
  ('General', NULL, 'COMPLETED', 'Service completed as requested. Work performed to specification.'),
  ('General', NULL, 'PARTIAL', 'Partial work completed. Remaining items documented for follow-up.')

ON CONFLICT DO NOTHING;

-- =====================================================
-- 14. HELPER FUNCTION: Generate secure tokens
-- =====================================================

CREATE OR REPLACE FUNCTION generate_pow_token()
RETURNS VARCHAR(16) AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  result VARCHAR(16) := '';
  i INTEGER;
BEGIN
  FOR i IN 1..16 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_short_code()
RETURNS VARCHAR(6) AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result VARCHAR(6) := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_pow_token IS 'Generate 16-char unguessable token for public PoW URLs';
COMMENT ON FUNCTION generate_short_code IS 'Generate 6-char code for short URLs (excludes ambiguous chars: 0, O, 1, I, l)';

-- =====================================================
-- 15. HELPER FUNCTION: Calculate verification level
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_photo_verification_level(
  p_time_verified BOOLEAN,
  p_location_verified BOOLEAN,
  p_source_verified BOOLEAN
)
RETURNS INTEGER AS $$
BEGIN
  IF p_time_verified AND p_location_verified AND p_source_verified THEN
    RETURN 3; -- Fully verified
  ELSIF p_time_verified AND p_location_verified THEN
    RETURN 2; -- Time + location
  ELSIF p_time_verified THEN
    RETURN 1; -- Time only
  ELSE
    RETURN 0; -- Unverified
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_photo_verification_level IS 'Calculate verification level (0-3) based on verified flags';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
