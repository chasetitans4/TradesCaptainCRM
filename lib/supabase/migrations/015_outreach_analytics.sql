-- =====================================================
-- OUTREACH MODULE ANALYTICS & INTEGRATIONS
-- Version: 5.8
-- Migration 015: A/B testing, metrics, integrations
-- =====================================================

-- =====================================================
-- A/B TESTING
-- =====================================================

CREATE TABLE IF NOT EXISTS ab_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(200) NOT NULL,
    description TEXT,
    test_type VARCHAR(50) NOT NULL,           -- 'initial_message', 'timing', 'qualification', 'call_time'

    campaign_id UUID REFERENCES outreach_campaigns(id),

    status VARCHAR(20) DEFAULT 'draft',       -- 'draft', 'running', 'completed', 'stopped'

    sample_size_target INTEGER,
    confidence_threshold DECIMAL(3,2) DEFAULT 0.95,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,

    winner_variant_id UUID,
    winning_metric VARCHAR(50),               -- 'reply_rate', 'qualification_rate', 'booking_rate', 'conversion_rate'

    created_by UUID REFERENCES admin_users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ab_tests_campaign ON ab_tests(campaign_id);
CREATE INDEX idx_ab_tests_status ON ab_tests(status);

CREATE TABLE IF NOT EXISTS ab_test_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,

    variant_name VARCHAR(50) NOT NULL,        -- 'A', 'B', 'C', etc.
    is_control BOOLEAN DEFAULT false,
    traffic_percent INTEGER DEFAULT 50,

    content TEXT NOT NULL,                    -- Message text or config
    content_type VARCHAR(50),                 -- 'message', 'timing', 'prompt'

    -- Stats
    impressions INTEGER DEFAULT 0,
    replies INTEGER DEFAULT 0,
    qualified INTEGER DEFAULT 0,
    booked INTEGER DEFAULT 0,
    converted INTEGER DEFAULT 0,

    -- Calculated metrics (updated periodically)
    reply_rate DECIMAL(5,2),
    qualification_rate DECIMAL(5,2),
    booking_rate DECIMAL(5,2),
    conversion_rate DECIMAL(5,2),

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ab_test_variants_test ON ab_test_variants(test_id);

-- =====================================================
-- SPEED-TO-LEAD METRICS
-- =====================================================

CREATE TABLE IF NOT EXISTS speed_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID NOT NULL REFERENCES outreach_contacts(id) ON DELETE CASCADE,

    -- Timestamps
    form_submitted_at TIMESTAMPTZ,
    first_text_sent_at TIMESTAMPTZ,
    first_reply_at TIMESTAMPTZ,
    qualified_at TIMESTAMPTZ,
    call_booked_at TIMESTAMPTZ,
    call_completed_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,

    -- Calculated durations (in seconds)
    form_to_first_text_seconds INTEGER,
    first_text_to_reply_seconds INTEGER,
    reply_to_qualified_seconds INTEGER,
    qualified_to_booked_seconds INTEGER,
    reply_to_booked_seconds INTEGER,

    -- Flags
    met_60_second_target BOOLEAN,             -- First text within 60 seconds
    met_5_minute_reply_target BOOLEAN,        -- Reply within 5 minutes
    met_30_minute_booking_target BOOLEAN,     -- Booking within 30 minutes of reply

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_speed_metrics_contact ON speed_metrics(contact_id);
CREATE INDEX idx_speed_metrics_targets ON speed_metrics(met_60_second_target, met_5_minute_reply_target);

-- =====================================================
-- LEAD REASSIGNMENT HISTORY
-- =====================================================

CREATE TABLE IF NOT EXISTS lead_reassignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    from_agent_id UUID NOT NULL REFERENCES admin_users(id),
    to_agent_id UUID REFERENCES admin_users(id),  -- NULL for distribution
    reason VARCHAR(50) NOT NULL,              -- 'leaving', 'vacation', 'load_balance', 'performance', 'request'

    leads_count INTEGER NOT NULL,
    lead_ids JSONB,                           -- Array of contact IDs
    distribution_method VARCHAR(20),          -- 'specific', 'even', 'round_robin', 'weighted'

    notify_new_agent BOOLEAN DEFAULT true,
    notify_leads BOOLEAN DEFAULT false,

    performed_by UUID REFERENCES admin_users(id),
    performed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lead_reassignments_from ON lead_reassignments(from_agent_id);
CREATE INDEX idx_lead_reassignments_to ON lead_reassignments(to_agent_id);
CREATE INDEX idx_lead_reassignments_date ON lead_reassignments(performed_at);

-- =====================================================
-- SLACK INTEGRATION
-- =====================================================

CREATE TABLE IF NOT EXISTS slack_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    workspace_id VARCHAR(50),
    workspace_name VARCHAR(100),
    access_token TEXT,                        -- Encrypted
    bot_token TEXT,                           -- Encrypted

    connected_by UUID REFERENCES admin_users(id),
    connected_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS slack_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    channel_id VARCHAR(50) NOT NULL,
    channel_name VARCHAR(100) NOT NULL,
    channel_type VARCHAR(20),                 -- 'public', 'private', 'dm'

    -- Agent-specific channel (for DMs)
    agent_id UUID REFERENCES admin_users(id),

    -- Notification settings
    notify_new_leads BOOLEAN DEFAULT false,
    notify_hot_leads BOOLEAN DEFAULT false,
    notify_qualified BOOLEAN DEFAULT false,
    notify_booked BOOLEAN DEFAULT false,
    notify_closed BOOLEAN DEFAULT false,
    notify_no_shows BOOLEAN DEFAULT false,
    notify_speed_alerts BOOLEAN DEFAULT false,
    notify_escalations BOOLEAN DEFAULT false,

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_slack_channels_agent ON slack_channels(agent_id);

-- =====================================================
-- LEAD ENRICHMENT
-- =====================================================

CREATE TABLE IF NOT EXISTS lead_enrichment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID NOT NULL REFERENCES outreach_contacts(id) ON DELETE CASCADE,

    -- Company info
    website_url TEXT,
    company_size VARCHAR(20),                 -- 'solo', '2-5', '6-10', '11-25', '26-50', '50+'
    estimated_revenue VARCHAR(30),            -- '$0-100k', '$100k-250k', '$250k-500k', '$500k-1M', '$1M+'
    years_in_business INTEGER,
    founded_year INTEGER,

    -- Google presence
    google_review_count INTEGER,
    google_review_avg DECIMAL(2,1),
    google_place_id VARCHAR(100),

    -- Website analysis
    website_platform VARCHAR(50),             -- 'wordpress', 'wix', 'squarespace', 'custom', 'none'
    website_age_years INTEGER,
    has_ssl BOOLEAN,
    mobile_friendly BOOLEAN,

    -- Social
    facebook_url TEXT,
    instagram_url TEXT,
    linkedin_url TEXT,

    -- AI insights
    ai_insights JSONB,                        -- Structured insights from AI analysis

    enrichment_provider VARCHAR(20),          -- 'clearbit', 'apollo', 'manual', 'google'
    enriched_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lead_enrichment_contact ON lead_enrichment(contact_id);

-- =====================================================
-- COMPETITOR MENTIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS competitor_mentions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID NOT NULL REFERENCES outreach_contacts(id) ON DELETE CASCADE,

    competitor_name VARCHAR(100),
    mention_type VARCHAR(30),                 -- 'current_user', 'considering', 'past_user', 'contract_bound'
    contract_end_date DATE,

    -- What they said
    likes TEXT,
    dislikes TEXT,
    switching_reason TEXT,

    message_id UUID REFERENCES outreach_messages(id),
    detected_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_competitor_mentions_contact ON competitor_mentions(contact_id);
CREATE INDEX idx_competitor_mentions_competitor ON competitor_mentions(competitor_name);

-- =====================================================
-- REVENUE FORECASTING
-- =====================================================

CREATE TABLE IF NOT EXISTS revenue_forecasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    forecast_month DATE NOT NULL,             -- First of the month

    -- Predictions
    predicted_mrr INTEGER,                    -- Expected MRR in cents
    predicted_mrr_low INTEGER,                -- Pessimistic
    predicted_mrr_high INTEGER,               -- Optimistic
    confidence_pct INTEGER,                   -- 0-100

    -- Actual (filled in after month ends)
    actual_mrr INTEGER,
    variance_pct DECIMAL(5,2),

    -- Pipeline snapshot at forecast time
    pipeline_snapshot JSONB,                  -- Leads by stage and probability

    generated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(forecast_month)
);

CREATE INDEX idx_revenue_forecasts_month ON revenue_forecasts(forecast_month);

-- =====================================================
-- MULTI-TOUCH ATTRIBUTION
-- =====================================================

CREATE TABLE IF NOT EXISTS attribution_touchpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID NOT NULL REFERENCES outreach_contacts(id) ON DELETE CASCADE,

    touchpoint_type VARCHAR(50) NOT NULL,     -- 'form_submit', 'ai_text', 'qualification', 'call_scheduled', 'call_completed', 'proposal', 'close'
    touchpoint_at TIMESTAMPTZ NOT NULL,
    touchpoint_details JSONB,

    -- Did this lead to conversion?
    converted BOOLEAN DEFAULT false,
    conversion_value_cents INTEGER,

    -- Attribution credits (filled in on conversion)
    first_touch_credit DECIMAL(5,2),
    last_touch_credit DECIMAL(5,2),
    linear_credit DECIMAL(5,2),
    time_decay_credit DECIMAL(5,2),
    position_credit DECIMAL(5,2),

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_attribution_contact ON attribution_touchpoints(contact_id);
CREATE INDEX idx_attribution_type ON attribution_touchpoints(touchpoint_type);
CREATE INDEX idx_attribution_converted ON attribution_touchpoints(converted) WHERE converted = true;

-- =====================================================
-- WEBHOOK ENDPOINTS (Zapier/Integrations)
-- =====================================================

CREATE TABLE IF NOT EXISTS webhook_endpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(100),
    url TEXT NOT NULL,
    secret_key VARCHAR(100),                  -- For signature verification

    -- Events to trigger
    event_new_lead BOOLEAN DEFAULT false,
    event_qualified BOOLEAN DEFAULT false,
    event_call_scheduled BOOLEAN DEFAULT false,
    event_call_completed BOOLEAN DEFAULT false,
    event_deal_closed BOOLEAN DEFAULT false,
    event_opt_out BOOLEAN DEFAULT false,

    -- Delivery settings
    retry_count INTEGER DEFAULT 3,
    timeout_seconds INTEGER DEFAULT 30,

    -- Status
    is_active BOOLEAN DEFAULT true,
    last_triggered_at TIMESTAMPTZ,
    last_success_at TIMESTAMPTZ,
    last_error TEXT,
    failure_count INTEGER DEFAULT 0,

    created_by UUID REFERENCES admin_users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_webhook_endpoints_active ON webhook_endpoints(is_active) WHERE is_active = true;

-- Webhook delivery log
CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint_id UUID NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,

    event_type VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,

    response_status INTEGER,
    response_body TEXT,
    response_time_ms INTEGER,

    success BOOLEAN,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,

    delivered_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_webhook_deliveries_endpoint ON webhook_deliveries(endpoint_id);
CREATE INDEX idx_webhook_deliveries_date ON webhook_deliveries(delivered_at DESC);

-- =====================================================
-- LEAD IMPORTS
-- =====================================================

CREATE TABLE IF NOT EXISTS lead_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    filename VARCHAR(200) NOT NULL,
    source_label VARCHAR(50) DEFAULT 'CSV Import',
    source_campaign VARCHAR(100),

    -- Stats
    total_rows INTEGER,
    imported_count INTEGER,
    skipped_duplicates INTEGER,
    skipped_invalid INTEGER,
    skipped_dnc INTEGER,
    skipped_opted_out INTEGER,

    -- Options used
    check_dnc BOOLEAN DEFAULT true,
    check_opt_outs BOOLEAN DEFAULT true,
    skip_duplicates BOOLEAN DEFAULT true,
    normalize_phones BOOLEAN DEFAULT true,
    auto_start_campaign BOOLEAN DEFAULT false,

    column_mapping JSONB,                     -- How CSV columns map to contact fields
    error_details JSONB,                      -- Details on skipped rows

    status VARCHAR(20) DEFAULT 'pending',     -- 'pending', 'processing', 'completed', 'failed'
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    assign_to_agent_id UUID REFERENCES admin_users(id),
    assign_to_campaign_id UUID REFERENCES outreach_campaigns(id),

    imported_by UUID REFERENCES admin_users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lead_imports_status ON lead_imports(status);
CREATE INDEX idx_lead_imports_date ON lead_imports(created_at DESC);

-- =====================================================
-- SELF-SCHEDULING LINKS
-- =====================================================

CREATE TABLE IF NOT EXISTS scheduling_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    agent_id UUID REFERENCES admin_users(id), -- NULL for team link
    slug VARCHAR(50) NOT NULL UNIQUE,         -- URL slug: book.tradescaptain.com/{slug}

    link_type VARCHAR(20) DEFAULT 'agent',    -- 'agent', 'team', 'campaign'
    campaign_id UUID REFERENCES outreach_campaigns(id),

    -- Settings
    use_agent_hours BOOLEAN DEFAULT true,
    custom_hours JSONB,                       -- Override hours if not using agent hours

    -- Form requirements
    require_name BOOLEAN DEFAULT true,
    require_phone BOOLEAN DEFAULT true,
    require_email BOOLEAN DEFAULT false,
    require_trade BOOLEAN DEFAULT true,
    require_company BOOLEAN DEFAULT false,
    custom_fields JSONB,

    -- Branding
    logo_url TEXT,
    primary_color VARCHAR(7) DEFAULT '#2563EB',
    header_text TEXT DEFAULT 'Book a Call',
    description_text TEXT,

    -- Limits
    max_bookings_per_day INTEGER,
    buffer_before_minutes INTEGER DEFAULT 0,
    buffer_after_minutes INTEGER DEFAULT 0,

    is_active BOOLEAN DEFAULT true,
    bookings_count INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_scheduling_links_slug ON scheduling_links(slug);
CREATE INDEX idx_scheduling_links_agent ON scheduling_links(agent_id);

-- =====================================================
-- EMAIL PREFERENCES
-- =====================================================

CREATE TABLE IF NOT EXISTS email_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,

    email VARCHAR(200) NOT NULL,

    -- Notification types
    new_lead_assigned BOOLEAN DEFAULT true,
    hot_lead_alert BOOLEAN DEFAULT true,
    call_reminder BOOLEAN DEFAULT true,
    call_reminder_minutes INTEGER DEFAULT 15,
    daily_summary BOOLEAN DEFAULT true,
    daily_summary_time TIME DEFAULT '08:00',
    weekly_performance BOOLEAN DEFAULT true,

    -- Admin-specific
    speed_alerts BOOLEAN DEFAULT false,
    escalation_alerts BOOLEAN DEFAULT false,
    overflow_alerts BOOLEAN DEFAULT false,

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(agent_id)
);

CREATE INDEX idx_email_preferences_agent ON email_preferences(agent_id);

-- =====================================================
-- AGENT ACHIEVEMENTS (Gamification)
-- =====================================================

CREATE TABLE IF NOT EXISTS agent_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,

    achievement_type VARCHAR(50) NOT NULL,    -- 'first_close', 'closing_streak', 'speed_demon', 'big_game', 'monthly_goal', 'quarterly_goal'
    achievement_name VARCHAR(100),
    achievement_description TEXT,

    tier VARCHAR(20),                         -- 'bronze', 'silver', 'gold', 'platinum'
    value INTEGER,                            -- Numeric value (streak count, deals, etc.)

    earned_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,                   -- For time-limited achievements

    notified BOOLEAN DEFAULT false
);

CREATE INDEX idx_achievements_agent ON agent_achievements(agent_id);
CREATE INDEX idx_achievements_type ON agent_achievements(achievement_type);
CREATE INDEX idx_achievements_earned ON agent_achievements(earned_at DESC);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_test_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE speed_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_reassignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE slack_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE slack_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_enrichment ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE attribution_touchpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduling_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_achievements ENABLE ROW LEVEL SECURITY;

-- A/B Tests - admin only
CREATE POLICY ab_tests_admin ON ab_tests
    FOR ALL USING (
        EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
    );

CREATE POLICY ab_test_variants_admin ON ab_test_variants
    FOR ALL USING (
        EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
    );

-- Speed metrics - tied to contacts
CREATE POLICY speed_metrics_policy ON speed_metrics
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM outreach_contacts oc
            WHERE oc.id = speed_metrics.contact_id
            AND (oc.assigned_agent_id = auth.uid() OR
                 EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND role IN ('super_admin', 'admin')))
        )
    );

-- Lead reassignments - admin only
CREATE POLICY lead_reassignments_admin ON lead_reassignments
    FOR ALL USING (
        EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
    );

-- Slack settings - admin only
CREATE POLICY slack_settings_admin ON slack_settings
    FOR ALL USING (
        EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
    );

CREATE POLICY slack_channels_admin ON slack_channels
    FOR ALL USING (
        EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
    );

-- Lead enrichment - tied to contacts
CREATE POLICY lead_enrichment_policy ON lead_enrichment
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM outreach_contacts oc
            WHERE oc.id = lead_enrichment.contact_id
            AND (oc.assigned_agent_id = auth.uid() OR
                 EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND role IN ('super_admin', 'admin')))
        )
    );

-- Competitor mentions - tied to contacts
CREATE POLICY competitor_mentions_policy ON competitor_mentions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM outreach_contacts oc
            WHERE oc.id = competitor_mentions.contact_id
            AND (oc.assigned_agent_id = auth.uid() OR
                 EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND role IN ('super_admin', 'admin')))
        )
    );

-- Revenue forecasts - admin only
CREATE POLICY revenue_forecasts_admin ON revenue_forecasts
    FOR ALL USING (
        EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
    );

-- Attribution - tied to contacts
CREATE POLICY attribution_policy ON attribution_touchpoints
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM outreach_contacts oc
            WHERE oc.id = attribution_touchpoints.contact_id
            AND (oc.assigned_agent_id = auth.uid() OR
                 EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND role IN ('super_admin', 'admin')))
        )
    );

-- Webhooks - admin only
CREATE POLICY webhook_endpoints_admin ON webhook_endpoints
    FOR ALL USING (
        EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
    );

CREATE POLICY webhook_deliveries_admin ON webhook_deliveries
    FOR ALL USING (
        EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
    );

-- Lead imports - admin only
CREATE POLICY lead_imports_admin ON lead_imports
    FOR ALL USING (
        EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
    );

-- Scheduling links - agents see their own, admins see all
CREATE POLICY scheduling_links_policy ON scheduling_links
    FOR ALL USING (
        agent_id = auth.uid() OR
        agent_id IS NULL OR
        EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
    );

-- Email preferences - agents see their own, admins see all
CREATE POLICY email_preferences_policy ON email_preferences
    FOR ALL USING (
        agent_id = auth.uid() OR
        EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
    );

-- Achievements - agents see their own, admins see all
CREATE POLICY achievements_policy ON agent_achievements
    FOR ALL USING (
        agent_id = auth.uid() OR
        EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
    );

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE TRIGGER update_ab_tests_updated_at
    BEFORE UPDATE ON ab_tests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_slack_settings_updated_at
    BEFORE UPDATE ON slack_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_webhook_endpoints_updated_at
    BEFORE UPDATE ON webhook_endpoints
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scheduling_links_updated_at
    BEFORE UPDATE ON scheduling_links
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_preferences_updated_at
    BEFORE UPDATE ON email_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE ab_tests IS 'A/B tests for message optimization';
COMMENT ON TABLE ab_test_variants IS 'Variants within an A/B test';
COMMENT ON TABLE speed_metrics IS 'Speed-to-lead tracking per contact';
COMMENT ON TABLE lead_reassignments IS 'History of lead reassignments between agents';
COMMENT ON TABLE slack_settings IS 'Slack workspace connection settings';
COMMENT ON TABLE slack_channels IS 'Slack channel notification settings';
COMMENT ON TABLE lead_enrichment IS 'Enriched company data per contact';
COMMENT ON TABLE competitor_mentions IS 'Tracked competitor mentions in conversations';
COMMENT ON TABLE revenue_forecasts IS 'Monthly revenue predictions';
COMMENT ON TABLE attribution_touchpoints IS 'Multi-touch attribution tracking';
COMMENT ON TABLE webhook_endpoints IS 'Webhook endpoints for integrations (Zapier, etc.)';
COMMENT ON TABLE webhook_deliveries IS 'Webhook delivery log';
COMMENT ON TABLE lead_imports IS 'CSV/bulk lead import history';
COMMENT ON TABLE scheduling_links IS 'Self-scheduling booking links';
COMMENT ON TABLE email_preferences IS 'Agent email notification preferences';
COMMENT ON TABLE agent_achievements IS 'Agent gamification achievements';

-- =====================================================
-- DONE - Migration 015
-- =====================================================
