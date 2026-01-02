-- =====================================================
-- OUTREACH MODULE CAMPAIGNS & CONTACTS
-- Version: 5.8
-- Migration 014: Campaigns, contacts, conversations, nurture, referrals
-- =====================================================

-- =====================================================
-- OUTREACH CAMPAIGNS
-- =====================================================

CREATE TABLE IF NOT EXISTS outreach_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(200) NOT NULL,
    description TEXT,
    campaign_type VARCHAR(50) NOT NULL,       -- 'website_instant', 'referral', 'reengagement', 'scheduled', 'sms_widget'

    status VARCHAR(20) DEFAULT 'draft',       -- 'draft', 'active', 'paused', 'completed'

    -- Messaging
    initial_message_template TEXT NOT NULL,
    ai_system_prompt TEXT,
    ai_goal VARCHAR(50),                      -- 'qualify_and_book', 'qualify_only', 'book_only'
    max_ai_messages INTEGER DEFAULT 5,

    -- Timing
    trigger_type VARCHAR(50),                 -- 'immediate', 'delayed', 'scheduled'
    trigger_delay_minutes INTEGER DEFAULT 0,
    sending_window_start TIME DEFAULT '09:00',
    sending_window_end TIME DEFAULT '18:00',
    sending_days INTEGER[] DEFAULT '{1,2,3,4,5}',  -- 1=Mon, 7=Sun
    daily_send_limit INTEGER,

    -- Auto-trigger settings (for auto campaigns)
    trigger_source VARCHAR(50),               -- 'website_form', 'referral', 'lead_status_change', 'sms_widget'
    trigger_conditions JSONB,

    -- Stats (denormalized for performance)
    contacts_total INTEGER DEFAULT 0,
    contacts_messaged INTEGER DEFAULT 0,
    contacts_replied INTEGER DEFAULT 0,
    contacts_qualified INTEGER DEFAULT 0,
    demos_booked INTEGER DEFAULT 0,
    deals_closed INTEGER DEFAULT 0,

    created_by UUID REFERENCES admin_users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_outreach_campaigns_status ON outreach_campaigns(status);
CREATE INDEX idx_outreach_campaigns_type ON outreach_campaigns(campaign_type);

-- =====================================================
-- OUTREACH CONTACTS (Leads)
-- =====================================================

CREATE TABLE IF NOT EXISTS outreach_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES outreach_campaigns(id),

    -- Contact info
    phone VARCHAR(20) NOT NULL,
    name VARCHAR(100),
    company_name VARCHAR(200),
    email VARCHAR(200),
    trade VARCHAR(50),
    city VARCHAR(100),
    state VARCHAR(50),

    -- Timezone (for scheduling)
    timezone VARCHAR(50),                     -- 'America/Los_Angeles', detected from area code or asked
    timezone_source VARCHAR(20),              -- 'area_code', 'user_provided', 'city_state', 'default'

    -- Source tracking (IMPORTANT: Always labeled)
    source VARCHAR(50) NOT NULL,              -- 'SMS', 'SMS_WIDGET', 'REFERRAL', 'WEBSITE', 'INBOUND_CALL', 'COLD_EMAIL', 'MANUAL'
    source_campaign VARCHAR(50),              -- 'website_instant', 'referral', 'reengagement', etc.
    source_details JSONB,                     -- Form URL, referrer info, widget location, etc.
    referrer_client_id UUID REFERENCES crm_accounts(id),

    -- Consent
    consent_id UUID REFERENCES sms_consent(id),

    -- Status
    status VARCHAR(30) DEFAULT 'pending',     -- 'pending', 'contacted', 'replied', 'qualifying',
                                              -- 'qualified', 'call_scheduled', 'call_completed',
                                              -- 'pending_admin', 'converted', 'nurture', 'opted_out', 'unresponsive'

    -- Admin overflow
    overflow_to_admin BOOLEAN DEFAULT false,  -- TRUE if no agent availability
    overflow_reason VARCHAR(100),             -- 'no_availability', 'all_agents_at_capacity', 'weekend_request', etc.
    overflow_at TIMESTAMPTZ,                  -- When pushed to admin
    admin_notified BOOLEAN DEFAULT false,
    admin_assigned_by UUID REFERENCES admin_users(id),  -- Admin who picked it up
    admin_assigned_at TIMESTAMPTZ,

    -- Lead scoring
    score INTEGER DEFAULT 0,
    score_breakdown JSONB,
    interest_level VARCHAR(20),               -- 'hot', 'warm', 'cold'

    -- AI qualification data
    pain_points TEXT[],
    current_solution TEXT,
    timeline VARCHAR(50),
    budget_signal VARCHAR(50),
    recommended_plan VARCHAR(50),
    qualification_summary TEXT,
    decision_maker BOOLEAN,
    decision_maker_name VARCHAR(100),

    -- Call scheduling
    scheduled_call_id UUID REFERENCES scheduled_calls(id),
    assigned_agent_id UUID REFERENCES admin_users(id),

    -- Conversion
    converted_at TIMESTAMPTZ,
    converted_client_id UUID REFERENCES crm_accounts(id),
    converted_plan VARCHAR(50),

    -- Messaging stats
    messages_sent INTEGER DEFAULT 0,
    messages_received INTEGER DEFAULT 0,
    first_message_at TIMESTAMPTZ,
    last_message_at TIMESTAMPTZ,
    first_reply_at TIMESTAMPTZ,
    last_reply_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_outreach_contacts_campaign ON outreach_contacts(campaign_id);
CREATE INDEX idx_outreach_contacts_status ON outreach_contacts(status);
CREATE INDEX idx_outreach_contacts_phone ON outreach_contacts(phone);
CREATE INDEX idx_outreach_contacts_source ON outreach_contacts(source);
CREATE INDEX idx_outreach_contacts_overflow ON outreach_contacts(overflow_to_admin) WHERE overflow_to_admin = true;
CREATE INDEX idx_outreach_contacts_pending_admin ON outreach_contacts(status) WHERE status = 'pending_admin';
CREATE INDEX idx_outreach_contacts_agent ON outreach_contacts(assigned_agent_id);
CREATE INDEX idx_outreach_contacts_interest ON outreach_contacts(interest_level);

-- =====================================================
-- OUTREACH CONVERSATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS outreach_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID NOT NULL REFERENCES outreach_contacts(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES outreach_campaigns(id),

    status VARCHAR(20) DEFAULT 'active',      -- 'active', 'qualified', 'scheduled', 'closed', 'opted_out', 'human_takeover'

    -- AI context
    ai_context JSONB,                         -- For maintaining conversation state
    ai_extracted_data JSONB,                  -- Qualification data extracted

    -- Human takeover
    human_takeover BOOLEAN DEFAULT false,
    human_takeover_by UUID REFERENCES admin_users(id),
    human_takeover_at TIMESTAMPTZ,
    human_takeover_reason VARCHAR(100),

    messages_count INTEGER DEFAULT 0,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    last_message_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_outreach_conversations_contact ON outreach_conversations(contact_id);
CREATE INDEX idx_outreach_conversations_campaign ON outreach_conversations(campaign_id);
CREATE INDEX idx_outreach_conversations_status ON outreach_conversations(status);

-- =====================================================
-- OUTREACH MESSAGES
-- =====================================================

CREATE TABLE IF NOT EXISTS outreach_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES outreach_conversations(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES outreach_contacts(id) ON DELETE CASCADE,

    direction VARCHAR(10) NOT NULL,           -- 'outbound', 'inbound'
    message_text TEXT NOT NULL,
    sender_type VARCHAR(20) DEFAULT 'ai',     -- 'ai', 'human', 'lead', 'system'
    sender_id UUID REFERENCES admin_users(id), -- For human messages

    -- AI analysis
    ai_intent VARCHAR(50),                    -- 'interested', 'question', 'objection', 'stop', 'scheduling', etc.
    ai_confidence DECIMAL(3,2),
    ai_extracted JSONB,                       -- Data points extracted from this message

    -- Delivery (Twilio)
    twilio_sid VARCHAR(50),
    status VARCHAR(20),                       -- 'queued', 'sent', 'delivered', 'failed', 'received'
    error_message TEXT,
    error_code VARCHAR(20),

    -- Compliance
    consent_verified BOOLEAN DEFAULT true,
    opt_out_checked BOOLEAN DEFAULT true,
    within_send_window BOOLEAN DEFAULT true,

    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_outreach_messages_conversation ON outreach_messages(conversation_id);
CREATE INDEX idx_outreach_messages_contact ON outreach_messages(contact_id);
CREATE INDEX idx_outreach_messages_created ON outreach_messages(created_at DESC);
CREATE INDEX idx_outreach_messages_status ON outreach_messages(status);

-- =====================================================
-- NURTURE SEQUENCES
-- =====================================================

CREATE TABLE IF NOT EXISTS nurture_sequences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(200) NOT NULL,
    description TEXT,

    trigger_type VARCHAR(50) NOT NULL,        -- 'manual', 'not_ready', 'no_show', 'competitor_contract', 'cold_lead'
    trigger_conditions JSONB,

    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES admin_users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_nurture_sequences_trigger ON nurture_sequences(trigger_type);
CREATE INDEX idx_nurture_sequences_active ON nurture_sequences(is_active) WHERE is_active = true;

-- Nurture sequence steps
CREATE TABLE IF NOT EXISTS nurture_sequence_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sequence_id UUID NOT NULL REFERENCES nurture_sequences(id) ON DELETE CASCADE,

    step_number INTEGER NOT NULL,
    delay_days INTEGER NOT NULL,              -- Days after previous step (or enrollment for step 1)
    message_template TEXT NOT NULL,

    -- Options
    exit_on_reply BOOLEAN DEFAULT true,       -- Exit sequence if lead replies
    require_business_hours BOOLEAN DEFAULT true,
    send_time TIME,                           -- Preferred time to send (in lead's timezone)

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(sequence_id, step_number)
);

CREATE INDEX idx_nurture_steps_sequence ON nurture_sequence_steps(sequence_id);

-- Nurture enrollments
CREATE TABLE IF NOT EXISTS nurture_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    contact_id UUID NOT NULL REFERENCES outreach_contacts(id) ON DELETE CASCADE,
    sequence_id UUID NOT NULL REFERENCES nurture_sequences(id) ON DELETE CASCADE,

    current_step INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',      -- 'active', 'completed', 'exited', 'converted', 'paused'

    enrolled_at TIMESTAMPTZ DEFAULT NOW(),
    enrolled_by UUID REFERENCES admin_users(id),
    enrolled_reason VARCHAR(100),

    next_message_at TIMESTAMPTZ,
    exited_at TIMESTAMPTZ,
    exit_reason VARCHAR(50),                  -- 'replied', 'converted', 'manual', 'opted_out'

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_nurture_enrollments_contact ON nurture_enrollments(contact_id);
CREATE INDEX idx_nurture_enrollments_sequence ON nurture_enrollments(sequence_id);
CREATE INDEX idx_nurture_enrollments_next ON nurture_enrollments(next_message_at) WHERE status = 'active';
CREATE INDEX idx_nurture_enrollments_status ON nurture_enrollments(status);

-- =====================================================
-- REFERRAL TRACKING
-- =====================================================

CREATE TABLE IF NOT EXISTS referral_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    referrer_client_id UUID NOT NULL REFERENCES crm_accounts(id),
    referrer_agent_id UUID REFERENCES admin_users(id),  -- Original agent who signed referrer

    -- Referral info
    referral_name VARCHAR(100) NOT NULL,
    referral_phone VARCHAR(20) NOT NULL,
    referral_company VARCHAR(200),
    referral_trade VARCHAR(50),
    referral_email VARCHAR(200),
    referral_notes TEXT,

    -- Tracking
    outreach_contact_id UUID REFERENCES outreach_contacts(id),
    status VARCHAR(30) DEFAULT 'submitted',   -- 'submitted', 'contacted', 'qualified', 'scheduled', 'converted', 'lost'

    -- Reward
    reward_amount_cents INTEGER DEFAULT 10000,  -- $100 default
    reward_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'earned', 'paid', 'voided'
    reward_earned_at TIMESTAMPTZ,
    reward_paid_at TIMESTAMPTZ,
    reward_notes TEXT,

    -- Notifications
    referrer_notified_on_contact BOOLEAN DEFAULT false,
    referrer_notified_on_conversion BOOLEAN DEFAULT false,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_referral_submissions_referrer ON referral_submissions(referrer_client_id);
CREATE INDEX idx_referral_submissions_agent ON referral_submissions(referrer_agent_id);
CREATE INDEX idx_referral_submissions_status ON referral_submissions(status);
CREATE INDEX idx_referral_submissions_reward ON referral_submissions(reward_status);

-- =====================================================
-- TEXT WIDGET TRACKING
-- =====================================================

CREATE TABLE IF NOT EXISTS text_widget_clicks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_url TEXT NOT NULL,
    button_location VARCHAR(50),              -- 'floating', 'header', 'hero', 'sticky_mobile', 'footer'
    clicked_at TIMESTAMPTZ DEFAULT NOW(),
    contact_id UUID REFERENCES outreach_contacts(id),  -- Linked after they text
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_text_widget_clicks_page ON text_widget_clicks(page_url);
CREATE INDEX idx_text_widget_clicks_location ON text_widget_clicks(button_location);
CREATE INDEX idx_text_widget_clicks_date ON text_widget_clicks(clicked_at);

-- =====================================================
-- UPDATE FOREIGN KEYS IN CORE TABLES
-- Add foreign key references now that outreach_contacts exists
-- =====================================================

-- Add foreign key to dnc_checks
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'dnc_checks_contact_id_fkey'
    ) THEN
        ALTER TABLE dnc_checks
        ADD CONSTRAINT dnc_checks_contact_id_fkey
        FOREIGN KEY (contact_id) REFERENCES outreach_contacts(id);
    END IF;
END $$;

-- Add foreign key to call_distribution_log
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'call_distribution_log_contact_id_fkey'
    ) THEN
        ALTER TABLE call_distribution_log
        ADD CONSTRAINT call_distribution_log_contact_id_fkey
        FOREIGN KEY (contact_id) REFERENCES outreach_contacts(id);
    END IF;
END $$;

-- Add foreign key to scheduled_calls
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'scheduled_calls_contact_id_fkey'
    ) THEN
        ALTER TABLE scheduled_calls
        ADD CONSTRAINT scheduled_calls_contact_id_fkey
        FOREIGN KEY (contact_id) REFERENCES outreach_contacts(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'scheduled_calls_campaign_id_fkey'
    ) THEN
        ALTER TABLE scheduled_calls
        ADD CONSTRAINT scheduled_calls_campaign_id_fkey
        FOREIGN KEY (campaign_id) REFERENCES outreach_campaigns(id);
    END IF;
END $$;

-- Add foreign key to call_distribution_log for scheduled_call_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'call_distribution_log_scheduled_call_id_fkey'
    ) THEN
        ALTER TABLE call_distribution_log
        ADD CONSTRAINT call_distribution_log_scheduled_call_id_fkey
        FOREIGN KEY (scheduled_call_id) REFERENCES scheduled_calls(id);
    END IF;
END $$;

-- Add foreign key to no_show_escalations
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'no_show_escalations_contact_id_fkey'
    ) THEN
        ALTER TABLE no_show_escalations
        ADD CONSTRAINT no_show_escalations_contact_id_fkey
        FOREIGN KEY (contact_id) REFERENCES outreach_contacts(id);
    END IF;
END $$;

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE outreach_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE nurture_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE nurture_sequence_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE nurture_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE text_widget_clicks ENABLE ROW LEVEL SECURITY;

-- Campaigns - all admins can read, super_admin/admin can write
CREATE POLICY outreach_campaigns_read ON outreach_campaigns
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'agent'))
    );

CREATE POLICY outreach_campaigns_write ON outreach_campaigns
    FOR ALL USING (
        EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
    );

-- Contacts - agents see their assigned, admins see all
CREATE POLICY outreach_contacts_policy ON outreach_contacts
    FOR ALL USING (
        assigned_agent_id = auth.uid() OR
        EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
    );

-- Conversations - tied to contacts
CREATE POLICY outreach_conversations_policy ON outreach_conversations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM outreach_contacts oc
            WHERE oc.id = outreach_conversations.contact_id
            AND (oc.assigned_agent_id = auth.uid() OR
                 EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND role IN ('super_admin', 'admin')))
        )
    );

-- Messages - tied to conversations
CREATE POLICY outreach_messages_policy ON outreach_messages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM outreach_contacts oc
            WHERE oc.id = outreach_messages.contact_id
            AND (oc.assigned_agent_id = auth.uid() OR
                 EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND role IN ('super_admin', 'admin')))
        )
    );

-- Nurture sequences - admin only for management
CREATE POLICY nurture_sequences_read ON nurture_sequences
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'agent'))
    );

CREATE POLICY nurture_sequences_write ON nurture_sequences
    FOR ALL USING (
        EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
    );

CREATE POLICY nurture_sequence_steps_read ON nurture_sequence_steps
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'agent'))
    );

CREATE POLICY nurture_sequence_steps_write ON nurture_sequence_steps
    FOR ALL USING (
        EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
    );

-- Nurture enrollments - tied to contacts
CREATE POLICY nurture_enrollments_policy ON nurture_enrollments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM outreach_contacts oc
            WHERE oc.id = nurture_enrollments.contact_id
            AND (oc.assigned_agent_id = auth.uid() OR
                 EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND role IN ('super_admin', 'admin')))
        )
    );

-- Referral submissions - agents see their referrals, admins see all
CREATE POLICY referral_submissions_policy ON referral_submissions
    FOR ALL USING (
        referrer_agent_id = auth.uid() OR
        EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
    );

-- Text widget clicks - admin only
CREATE POLICY text_widget_clicks_policy ON text_widget_clicks
    FOR ALL USING (
        EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
    );

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE TRIGGER update_outreach_campaigns_updated_at
    BEFORE UPDATE ON outreach_campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_outreach_contacts_updated_at
    BEFORE UPDATE ON outreach_contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_nurture_sequences_updated_at
    BEFORE UPDATE ON nurture_sequences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_referral_submissions_updated_at
    BEFORE UPDATE ON referral_submissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SEED DEFAULT CAMPAIGNS
-- =====================================================

INSERT INTO outreach_campaigns (
    name,
    description,
    campaign_type,
    status,
    initial_message_template,
    ai_goal,
    trigger_type,
    trigger_source
) VALUES
(
    'Website Form Instant Response',
    'Instant AI response to website form submissions',
    'website_instant',
    'active',
    'Hey {{name}}! Just saw you checked out Trades Captain. I help {{trade}} businesses get more calls — what''s your biggest challenge right now?',
    'qualify_and_book',
    'immediate',
    'website_form'
),
(
    'Text Us Widget',
    'AI response to visitors who text from the website widget',
    'sms_widget',
    'active',
    'Hey! Thanks for reaching out 👋 I''m Alex from Trades Captain. What kind of trade business do you have?',
    'qualify_and_book',
    'immediate',
    'sms_widget'
),
(
    'Referral Outreach',
    'AI response to referred leads from existing clients',
    'referral',
    'active',
    'Hey {{name}}! {{referrer_name}} from {{referrer_company}} thought you might be interested in what we do at Trades Captain. They''ve been seeing great results. Got a minute to chat about your {{trade}} business?',
    'qualify_and_book',
    'immediate',
    'referral'
),
(
    '30-Day Re-engagement',
    'Re-engage cold leads after 30 days of inactivity',
    'reengagement',
    'draft',
    'Hey {{name}}! It''s been a while since we chatted. Just checking in — has anything changed with your marketing needs?',
    'qualify_and_book',
    'scheduled',
    'lead_status_change'
)
ON CONFLICT DO NOTHING;

-- =====================================================
-- SEED DEFAULT NURTURE SEQUENCES
-- =====================================================

INSERT INTO nurture_sequences (name, description, trigger_type, is_active) VALUES
(
    'Not Ready - Long Term Nurture',
    'For leads who aren''t ready to buy but showed interest',
    'not_ready',
    true
),
(
    'No-Show Recovery',
    'Attempt to re-engage leads who no-showed scheduled calls',
    'no_show',
    true
),
(
    'Competitor Contract',
    'Nurture leads who are under contract with a competitor',
    'competitor_contract',
    true
)
ON CONFLICT DO NOTHING;

-- Get sequence IDs and insert steps
DO $$
DECLARE
    not_ready_id UUID;
    no_show_id UUID;
BEGIN
    SELECT id INTO not_ready_id FROM nurture_sequences WHERE trigger_type = 'not_ready' LIMIT 1;
    SELECT id INTO no_show_id FROM nurture_sequences WHERE trigger_type = 'no_show' LIMIT 1;

    IF not_ready_id IS NOT NULL THEN
        INSERT INTO nurture_sequence_steps (sequence_id, step_number, delay_days, message_template) VALUES
        (not_ready_id, 1, 7, 'Hey {{name}}, just wanted to share a quick tip for {{trade}} businesses... [value tip]'),
        (not_ready_id, 2, 14, 'Following up on my last message — have things changed with your marketing plans?'),
        (not_ready_id, 3, 30, 'Hey {{name}}, one of our {{trade}} clients just hit [milestone]. Thought of you — still interested in growing your business?'),
        (not_ready_id, 4, 60, 'Last check-in for a while — want me to reach out again in a few months?')
        ON CONFLICT DO NOTHING;
    END IF;

    IF no_show_id IS NOT NULL THEN
        INSERT INTO nurture_sequence_steps (sequence_id, step_number, delay_days, message_template) VALUES
        (no_show_id, 1, 1, 'Hey {{name}}, we missed you for our call yesterday. Want to reschedule? I have some time tomorrow.'),
        (no_show_id, 2, 3, 'Just following up — still interested in chatting about your {{trade}} business?'),
        (no_show_id, 3, 7, 'Last try — should I close your file or would you like to reschedule our call?')
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE outreach_campaigns IS 'SMS outreach campaigns with templates and triggers';
COMMENT ON TABLE outreach_contacts IS 'Leads/contacts in outreach campaigns';
COMMENT ON TABLE outreach_conversations IS 'AI and human conversations with contacts';
COMMENT ON TABLE outreach_messages IS 'Individual SMS messages in conversations';
COMMENT ON TABLE nurture_sequences IS 'Automated nurture sequences for long-term follow-up';
COMMENT ON TABLE nurture_sequence_steps IS 'Steps within a nurture sequence';
COMMENT ON TABLE nurture_enrollments IS 'Contact enrollments in nurture sequences';
COMMENT ON TABLE referral_submissions IS 'Referrals submitted by existing clients';
COMMENT ON TABLE text_widget_clicks IS 'Tracking clicks on website Text Us widget';

-- =====================================================
-- DONE - Migration 014
-- =====================================================
