-- =====================================================
-- ADDITIONAL FEATURES MIGRATION
-- Version: 5.8
-- Creates tables for Pipeline, Offers, Onboarding, Locations
-- =====================================================

-- =====================================================
-- PIPELINE LEADS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS pipeline_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES admin_users(id),
    company_name TEXT,
    contact_name TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    source TEXT CHECK (source IN ('website', 'referral', 'cold_outreach', 'google_ads', 'social')),
    interested_plan TEXT,
    interested_track TEXT,
    estimated_value_cents INTEGER,
    notes TEXT,
    stage TEXT NOT NULL DEFAULT 'new' CHECK (stage IN ('new', 'contacted', 'qualified', 'proposal', 'won', 'lost')),
    stage_changed_at TIMESTAMPTZ DEFAULT NOW(),
    lost_reason TEXT,
    converted_client_id UUID REFERENCES crm_accounts(id),
    converted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pipeline_leads_agent ON pipeline_leads(agent_id);
CREATE INDEX idx_pipeline_leads_stage ON pipeline_leads(stage);
CREATE INDEX idx_pipeline_leads_created ON pipeline_leads(created_at DESC);

-- =====================================================
-- PIPELINE ACTIVITIES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS pipeline_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES pipeline_leads(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES admin_users(id),
    activity_type TEXT NOT NULL CHECK (activity_type IN ('call', 'email', 'meeting', 'note', 'stage_change', 'task_completed')),
    description TEXT,
    duration_minutes INTEGER,
    outcome TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pipeline_activities_lead ON pipeline_activities(lead_id);
CREATE INDEX idx_pipeline_activities_agent ON pipeline_activities(agent_id);
CREATE INDEX idx_pipeline_activities_created ON pipeline_activities(created_at DESC);

-- =====================================================
-- PIPELINE TASKS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS pipeline_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES pipeline_leads(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES admin_users(id),
    task_type TEXT NOT NULL CHECK (task_type IN ('call', 'email', 'demo', 'proposal', 'followup', 'other')),
    description TEXT,
    due_date DATE NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pipeline_tasks_lead ON pipeline_tasks(lead_id);
CREATE INDEX idx_pipeline_tasks_agent ON pipeline_tasks(agent_id);
CREATE INDEX idx_pipeline_tasks_due ON pipeline_tasks(due_date);
CREATE INDEX idx_pipeline_tasks_pending ON pipeline_tasks(agent_id, is_completed, due_date) WHERE is_completed = FALSE;

-- =====================================================
-- UPDATE OFFER_CODES TABLE (add missing columns)
-- =====================================================

-- Add missing columns if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'offer_codes' AND column_name = 'applicable_plans') THEN
        ALTER TABLE offer_codes ADD COLUMN applicable_plans TEXT[];
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'offer_codes' AND column_name = 'commission_impact_type') THEN
        ALTER TABLE offer_codes ADD COLUMN commission_impact_type TEXT CHECK (commission_impact_type IN ('reduce_upfront', 'reduce_all', 'delay_upfront', 'none'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'offer_codes' AND column_name = 'commission_impact_value') THEN
        ALTER TABLE offer_codes ADD COLUMN commission_impact_value NUMERIC(10,2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'offer_codes' AND column_name = 'discount_duration_months') THEN
        ALTER TABLE offer_codes ADD COLUMN discount_duration_months INTEGER;
    END IF;
END $$;

-- =====================================================
-- OFFER USAGE TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS offer_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    offer_code_id UUID NOT NULL REFERENCES offer_codes(id),
    client_id UUID NOT NULL REFERENCES crm_accounts(id),
    agent_id UUID NOT NULL REFERENCES admin_users(id),
    subscription_id TEXT,
    applied_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_offer_usage_offer ON offer_usage(offer_code_id);
CREATE INDEX idx_offer_usage_client ON offer_usage(client_id);
CREATE INDEX idx_offer_usage_agent ON offer_usage(agent_id);

-- =====================================================
-- OFFER APPROVAL REQUESTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS offer_approval_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    offer_code_id UUID NOT NULL REFERENCES offer_codes(id),
    agent_id UUID NOT NULL REFERENCES admin_users(id),
    client_id UUID NOT NULL REFERENCES crm_accounts(id),
    justification TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES admin_users(id),
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_offer_approval_status ON offer_approval_requests(status);
CREATE INDEX idx_offer_approval_agent ON offer_approval_requests(agent_id);

-- =====================================================
-- ONBOARDING TEMPLATES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS onboarding_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_track TEXT NOT NULL,
    phase_number INTEGER NOT NULL,
    phase_name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(plan_track, phase_number)
);

CREATE INDEX idx_onboarding_templates_track ON onboarding_templates(plan_track);

-- =====================================================
-- ONBOARDING TEMPLATE TASKS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS onboarding_template_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES onboarding_templates(id) ON DELETE CASCADE,
    task_name TEXT NOT NULL,
    task_description TEXT,
    assigned_to TEXT CHECK (assigned_to IN ('auto', 'agent', 'client', 'team')),
    depends_on_task_id UUID REFERENCES onboarding_template_tasks(id),
    estimated_days INTEGER,
    display_order INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_template_tasks_template ON onboarding_template_tasks(template_id);

-- =====================================================
-- CLIENT ONBOARDING TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS client_onboarding (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES crm_accounts(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('not_started', 'in_progress', 'completed', 'stalled')),
    progress_percent INTEGER DEFAULT 0,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(client_id)
);

CREATE INDEX idx_client_onboarding_status ON client_onboarding(status);
CREATE INDEX idx_client_onboarding_client ON client_onboarding(client_id);

-- =====================================================
-- CLIENT ONBOARDING TASKS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS client_onboarding_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    onboarding_id UUID NOT NULL REFERENCES client_onboarding(id) ON DELETE CASCADE,
    template_task_id UUID REFERENCES onboarding_template_tasks(id),
    task_name TEXT NOT NULL,
    phase_name TEXT,
    phase_number INTEGER,
    assigned_to TEXT CHECK (assigned_to IN ('auto', 'agent', 'client', 'team', 'support')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'blocked')),
    blocked_reason TEXT,
    due_date DATE,
    completed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES admin_users(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_onboarding_tasks_onboarding ON client_onboarding_tasks(onboarding_id);
CREATE INDEX idx_onboarding_tasks_status ON client_onboarding_tasks(status);

-- =====================================================
-- CLIENT LOCATIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS client_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES crm_accounts(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT FALSE,
    location_name TEXT,
    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    phone TEXT,
    email TEXT,
    nevermiss_phone TEXT,
    shares_nevermiss_with UUID REFERENCES client_locations(id),
    gbp_listing_url TEXT,
    gbp_verified BOOLEAN DEFAULT FALSE,
    is_addon BOOLEAN DEFAULT FALSE,
    addon_price_cents INTEGER,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'pending', 'inactive')),
    added_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_client_locations_client ON client_locations(client_id);
CREATE INDEX idx_client_locations_primary ON client_locations(client_id, is_primary);

-- =====================================================
-- ADD sms_soft_cap TO CRM_ACCOUNTS IF NOT EXISTS
-- =====================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_accounts' AND column_name = 'sms_soft_cap') THEN
        ALTER TABLE crm_accounts ADD COLUMN sms_soft_cap INTEGER DEFAULT 500;
    END IF;
END $$;

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE pipeline_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE offer_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE offer_approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_template_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_onboarding_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_locations ENABLE ROW LEVEL SECURITY;

-- Admin users can access all records (service role bypasses RLS)
-- For admin portal, we use service role key, so these policies are for any user-facing access

-- Pipeline leads: agents can see their own, admins can see all
CREATE POLICY pipeline_leads_agent_policy ON pipeline_leads
    FOR ALL USING (agent_id = auth.uid() OR EXISTS (
        SELECT 1 FROM admin_users WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    ));

-- Pipeline activities: tied to leads
CREATE POLICY pipeline_activities_policy ON pipeline_activities
    FOR ALL USING (EXISTS (
        SELECT 1 FROM pipeline_leads WHERE id = pipeline_activities.lead_id AND (
            agent_id = auth.uid() OR EXISTS (
                SELECT 1 FROM admin_users WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
            )
        )
    ));

-- Pipeline tasks: tied to leads
CREATE POLICY pipeline_tasks_policy ON pipeline_tasks
    FOR ALL USING (EXISTS (
        SELECT 1 FROM pipeline_leads WHERE id = pipeline_tasks.lead_id AND (
            agent_id = auth.uid() OR EXISTS (
                SELECT 1 FROM admin_users WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
            )
        )
    ));

-- Offer usage: agents can see their own
CREATE POLICY offer_usage_policy ON offer_usage
    FOR ALL USING (agent_id = auth.uid() OR EXISTS (
        SELECT 1 FROM admin_users WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    ));

-- Offer approval requests: agents can see their own
CREATE POLICY offer_approval_requests_policy ON offer_approval_requests
    FOR ALL USING (agent_id = auth.uid() OR EXISTS (
        SELECT 1 FROM admin_users WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    ));

-- Onboarding templates: read-only for all agents
CREATE POLICY onboarding_templates_read_policy ON onboarding_templates
    FOR SELECT USING (true);

-- Template tasks: read-only for all agents
CREATE POLICY template_tasks_read_policy ON onboarding_template_tasks
    FOR SELECT USING (true);

-- Client onboarding: tied to CRM accounts
CREATE POLICY client_onboarding_policy ON client_onboarding
    FOR ALL USING (EXISTS (
        SELECT 1 FROM crm_accounts WHERE id = client_onboarding.client_id AND (
            agent_id = auth.uid() OR EXISTS (
                SELECT 1 FROM admin_users WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
            )
        )
    ));

-- Client onboarding tasks: tied to onboarding
CREATE POLICY client_onboarding_tasks_policy ON client_onboarding_tasks
    FOR ALL USING (EXISTS (
        SELECT 1 FROM client_onboarding co
        JOIN crm_accounts ca ON ca.id = co.client_id
        WHERE co.id = client_onboarding_tasks.onboarding_id AND (
            ca.agent_id = auth.uid() OR EXISTS (
                SELECT 1 FROM admin_users WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
            )
        )
    ));

-- Client locations: tied to CRM accounts
CREATE POLICY client_locations_policy ON client_locations
    FOR ALL USING (EXISTS (
        SELECT 1 FROM crm_accounts WHERE id = client_locations.client_id AND (
            agent_id = auth.uid() OR EXISTS (
                SELECT 1 FROM admin_users WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
            )
        )
    ));

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_pipeline_leads_updated_at
    BEFORE UPDATE ON pipeline_leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_client_onboarding_updated_at
    BEFORE UPDATE ON client_onboarding
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_client_locations_updated_at
    BEFORE UPDATE ON client_locations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SEED ONBOARDING TEMPLATES
-- =====================================================

INSERT INTO onboarding_templates (plan_track, phase_number, phase_name) VALUES
('nevermiss', 1, 'Day 1: Welcome & Setup'),
('nevermiss', 2, 'Days 2-3: Configuration'),
('nevermiss', 3, 'Days 4-7: Training & Go-Live'),
('nevermiss', 4, 'Days 8-14: Follow-up & Optimization'),
('gold', 1, 'Day 1: Welcome & Setup'),
('gold', 2, 'Days 2-3: Configuration'),
('gold', 3, 'Days 4-7: Training & Go-Live'),
('gold', 4, 'Days 8-14: Follow-up & Optimization')
ON CONFLICT (plan_track, phase_number) DO NOTHING;

-- Get template IDs and insert tasks
DO $$
DECLARE
    nm_phase1 UUID;
    nm_phase2 UUID;
    nm_phase3 UUID;
    nm_phase4 UUID;
BEGIN
    SELECT id INTO nm_phase1 FROM onboarding_templates WHERE plan_track = 'nevermiss' AND phase_number = 1;
    SELECT id INTO nm_phase2 FROM onboarding_templates WHERE plan_track = 'nevermiss' AND phase_number = 2;
    SELECT id INTO nm_phase3 FROM onboarding_templates WHERE plan_track = 'nevermiss' AND phase_number = 3;
    SELECT id INTO nm_phase4 FROM onboarding_templates WHERE plan_track = 'nevermiss' AND phase_number = 4;

    -- Phase 1 tasks
    INSERT INTO onboarding_template_tasks (template_id, task_name, task_description, assigned_to, display_order) VALUES
    (nm_phase1, 'Send welcome email with login credentials', 'Email template with credentials and getting started link', 'auto', 1),
    (nm_phase1, 'Schedule kickoff call', 'Book 30-min intro call to review setup', 'agent', 2),
    (nm_phase1, 'Collect business info questionnaire', 'Get trade type, service area, hours, etc.', 'client', 3)
    ON CONFLICT DO NOTHING;

    -- Phase 2 tasks
    INSERT INTO onboarding_template_tasks (template_id, task_name, task_description, assigned_to, display_order) VALUES
    (nm_phase2, 'Provision NeverMiss phone number', 'Set up dedicated local phone number', 'team', 1),
    (nm_phase2, 'Configure AI responder settings', 'Set business hours, services, booking rules', 'agent', 2),
    (nm_phase2, 'Update Google Business Profile', 'Add NeverMiss number as primary contact', 'client', 3)
    ON CONFLICT DO NOTHING;

    -- Phase 3 tasks
    INSERT INTO onboarding_template_tasks (template_id, task_name, task_description, assigned_to, display_order) VALUES
    (nm_phase3, 'Conduct training session', '1-hour training on dashboard and features', 'agent', 1),
    (nm_phase3, 'Send test leads', 'Verify AI is capturing and responding correctly', 'team', 2),
    (nm_phase3, 'Go live confirmation', 'Client confirms ready for live traffic', 'client', 3)
    ON CONFLICT DO NOTHING;

    -- Phase 4 tasks
    INSERT INTO onboarding_template_tasks (template_id, task_name, task_description, assigned_to, display_order) VALUES
    (nm_phase4, 'Week 1 check-in call', 'Review first week performance and questions', 'agent', 1),
    (nm_phase4, 'Review SMS usage and optimize', 'Check conversation quality, adjust settings', 'agent', 2),
    (nm_phase4, 'Collect initial feedback', 'NPS survey and feature requests', 'auto', 3)
    ON CONFLICT DO NOTHING;
END $$;

-- =====================================================
-- SEED STANDARD OFFER CODES
-- =====================================================

INSERT INTO offer_codes (code, name, description, discount_type, discount_value, applicable_plans, discount_duration_months, requires_approval, commission_impact_type, is_active) VALUES
('WELCOME2025', 'New Year Welcome', '25% off first month for new customers', 'percentage', 25, ARRAY['nevermiss', 'gold', 'starter'], 1, FALSE, 'none', TRUE),
('SUMMER25', 'Summer Special', '25% off first month', 'percentage', 25, ARRAY['nevermiss', 'gold', 'starter'], 1, FALSE, 'none', TRUE),
('REFERRAL20', 'Referral Discount', '20% off first month for referred customers', 'percentage', 20, ARRAY['nevermiss', 'gold', 'starter'], 1, FALSE, 'none', TRUE),
('GOLD50', 'Gold 50% Discount', '50% off first month - requires manager approval', 'percentage', 50, ARRAY['gold'], 1, TRUE, 'reduce_upfront', TRUE),
('LOYALVIP', 'VIP Loyalty Upgrade', '30% off forever - requires VP approval', 'percentage', 30, ARRAY['gold'], NULL, TRUE, 'reduce_all', TRUE)
ON CONFLICT DO NOTHING;

-- =====================================================
-- DONE
-- =====================================================

COMMENT ON TABLE pipeline_leads IS 'Sales pipeline leads for agent tracking';
COMMENT ON TABLE pipeline_activities IS 'Activity log for pipeline leads';
COMMENT ON TABLE pipeline_tasks IS 'Tasks and follow-ups for pipeline leads';
COMMENT ON TABLE offer_usage IS 'Tracks which offers were applied to which clients';
COMMENT ON TABLE offer_approval_requests IS 'Approval requests for restricted offers';
COMMENT ON TABLE onboarding_templates IS 'Templates for client onboarding phases';
COMMENT ON TABLE onboarding_template_tasks IS 'Tasks within each onboarding phase template';
COMMENT ON TABLE client_onboarding IS 'Active client onboarding tracking';
COMMENT ON TABLE client_onboarding_tasks IS 'Individual task progress for client onboarding';
COMMENT ON TABLE client_locations IS 'Multiple business locations per client';
