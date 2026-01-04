-- =====================================================
-- TRADES CAPTAIN MICRO CRM - DATABASE SCHEMA
-- Supabase (PostgreSQL)
-- =====================================================

-- =====================================================
-- BUSINESSES
-- =====================================================
CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Account
  name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  owner_phone TEXT, -- Personal phone for SMS forwarding
  
  -- Plan
  plan_tier TEXT NOT NULL DEFAULT 'starter' CHECK (plan_tier IN ('starter', 'growth', 'pro')),
  leads_limit INTEGER, -- NULL for starter, 200 for growth, 300 for pro
  leads_used INTEGER DEFAULT 0,
  leads_reset_date DATE, -- First of each month
  
  -- Settings
  timezone TEXT DEFAULT 'America/Chicago',
  trade_type TEXT, -- 'plumbing', 'hvac', 'electrical', 'roofing', 'general'
  service_area JSONB, -- ZIP codes or radius
  business_hours JSONB, -- { mon: { start: '08:00', end: '17:00' }, ... }
  tax_rate DECIMAL(5,4) DEFAULT 0.0825, -- Default tax rate for quotes
  
  -- Branding
  logo_url TEXT,
  primary_color TEXT DEFAULT '#2d5aa0',
  
  -- Review Links
  review_link_google TEXT,
  review_link_yelp TEXT,
  review_link_facebook TEXT,
  review_link_primary TEXT DEFAULT 'google', -- Which one to use in auto-requests
  
  -- AI SMS Settings
  ai_sms_enabled BOOLEAN DEFAULT TRUE,
  ai_sms_disabled_until TIMESTAMPTZ, -- For timed disable
  ai_late_night_acknowledgment BOOLEAN DEFAULT TRUE,
  
  -- Notification Settings
  settings_notifications JSONB DEFAULT '{
    "customer_reminders": {
      "enabled": true,
      "day_before": true,
      "hour_before": true
    },
    "push_notifications": {
      "new_leads": true,
      "customer_confirms": true,
      "customer_reschedules": true,
      "reminders_sent_summary": true,
      "personal_reminders": true,
      "lead_limit_warnings": true
    },
    "quiet_hours": {
      "enabled": true,
      "start": "21:00",
      "end": "07:00"
    },
    "muted_until": null
  }',
  
  -- Onboarding & Walkthrough
  onboarding_completed BOOLEAN DEFAULT FALSE,
  onboarding_completed_at TIMESTAMPTZ,
  walkthrough_completed BOOLEAN DEFAULT FALSE,
  walkthrough_completed_at TIMESTAMPTZ,
  tips_seen TEXT[] DEFAULT '{}',
  guides_completed TEXT[] DEFAULT '{}',

  -- Questionnaire
  questionnaire_completed BOOLEAN DEFAULT FALSE,
  questionnaire_completed_at TIMESTAMPTZ,
  team_size TEXT CHECK (team_size IN ('solo', '2-5', '6-10', '10+')),

  -- Per-User Pricing
  billable_user_count INTEGER DEFAULT 1,

  -- Google Reviews
  google_place_id TEXT
);

-- =====================================================
-- USERS (Team Members)
-- =====================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Auth
  email TEXT NOT NULL UNIQUE,
  auth_user_id UUID REFERENCES auth.users(id),
  
  -- Profile
  name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  
  -- Business relationship
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'technician' CHECK (role IN ('owner', 'admin', 'technician')),
  
  -- Invitation
  invited_by UUID REFERENCES users(id),
  invited_at TIMESTAMPTZ,
  invite_token TEXT,
  accepted_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'deactivated')),
  
  -- Notification preferences
  notification_settings JSONB DEFAULT '{
    "push_enabled": true,
    "email_enabled": true,
    "push_events": {
      "assigned_jobs": true,
      "schedule_changes": true,
      "new_leads": false,
      "customer_confirms": true,
      "customer_reschedules": true,
      "reminders": true
    },
    "email_events": {
      "assigned_jobs": true,
      "schedule_changes": true,
      "new_leads": false,
      "daily_summary": false
    }
  }'
);

-- =====================================================
-- EMAIL NOTIFICATION RECIPIENTS
-- =====================================================
CREATE TABLE email_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Recipient
  email TEXT NOT NULL,
  name TEXT,
  role_label TEXT, -- 'Office Manager', 'Bookkeeper', 'Technician', 'Other'
  
  -- What to send
  notify_new_leads BOOLEAN DEFAULT TRUE,
  notify_customer_confirms BOOLEAN DEFAULT TRUE,
  notify_customer_reschedules BOOLEAN DEFAULT TRUE,
  notify_lead_limit BOOLEAN DEFAULT FALSE,
  notify_daily_summary BOOLEAN DEFAULT TRUE,
  notify_weekly_summary BOOLEAN DEFAULT FALSE,
  
  -- Status
  is_verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  verification_token TEXT,
  
  UNIQUE(business_id, email)
);

-- =====================================================
-- CUSTOMERS
-- =====================================================
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Contact
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  
  -- Address
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  
  -- Timezone (for reminder scheduling)
  timezone TEXT,
  
  -- Notes
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  
  -- Source tracking
  source TEXT, -- 'website', 'phone', 'referral', 'ai_sms'
  
  -- Stats (denormalized for quick display)
  total_jobs INTEGER DEFAULT 0,
  total_revenue DECIMAL(10,2) DEFAULT 0,
  last_job_date DATE,
  
  UNIQUE(business_id, phone)
);

-- =====================================================
-- LEADS
-- =====================================================
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Contact (duplicated from customer for quick access)
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  
  -- Lead details
  service_needed TEXT,
  description TEXT,
  urgency TEXT CHECK (urgency IN ('low', 'normal', 'high', 'emergency')),
  
  -- Pipeline
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'quoted', 'scheduled', 'won', 'lost')),
  lost_reason TEXT,
  
  -- Source
  source TEXT NOT NULL, -- 'website_chat', 'phone', 'ai_sms', 'manual', 'missed_call'
  
  -- Assignment
  assigned_to UUID REFERENCES users(id),
  
  -- Value
  estimated_value DECIMAL(10,2)
);

-- =====================================================
-- JOBS
-- =====================================================
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id),
  lead_id UUID REFERENCES leads(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Scheduling
  scheduled_date DATE NOT NULL,
  scheduled_time_start TIME,
  scheduled_time_end TIME,
  
  -- Job details
  service_type TEXT NOT NULL,
  description TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'no_show')),
  
  -- Notes for technician (legacy single field)
  tech_notes TEXT,
  
  -- Address (can differ from customer address)
  job_address_line1 TEXT,
  job_address_city TEXT,
  job_address_state TEXT,
  job_address_zip TEXT,
  
  -- Assignment
  assigned_to UUID REFERENCES users(id),
  
  -- Completion
  completed_at TIMESTAMPTZ,
  completion_notes TEXT,
  
  -- Customer Reminders
  customer_reminders_enabled BOOLEAN DEFAULT TRUE,
  customer_confirmed BOOLEAN DEFAULT FALSE,
  customer_confirmed_at TIMESTAMPTZ,
  
  -- Google Calendar sync
  google_calendar_event_id TEXT
);

-- =====================================================
-- JOB NOTES (Multi-user with attribution)
-- =====================================================
CREATE TABLE job_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  content TEXT NOT NULL
);

-- =====================================================
-- JOB PHOTOS
-- =====================================================
CREATE TABLE job_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id), -- Who uploaded
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  url TEXT NOT NULL,
  label TEXT, -- 'before', 'after', 'issue', 'other'
  notes TEXT,
  sort_order INTEGER DEFAULT 0
);

-- =====================================================
-- QUOTES
-- =====================================================
CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id),
  lead_id UUID REFERENCES leads(id),
  job_id UUID REFERENCES jobs(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Quote details
  quote_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'accepted', 'declined', 'expired')),
  
  -- Amounts
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax_rate DECIMAL(5,4) DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  
  -- Validity
  valid_until DATE,
  
  -- Notes
  notes TEXT,
  terms TEXT,
  
  -- Converted to invoice
  converted_to_invoice BOOLEAN DEFAULT FALSE,
  converted_at TIMESTAMPTZ
);

-- =====================================================
-- QUOTE LINE ITEMS
-- =====================================================
CREATE TABLE quote_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE,
  
  -- Item details
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  
  -- Ordering
  sort_order INTEGER DEFAULT 0
);

-- =====================================================
-- INVOICES
-- =====================================================
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id),
  quote_id UUID REFERENCES quotes(id),
  job_id UUID REFERENCES jobs(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Invoice details
  invoice_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'paid', 'overdue', 'cancelled')),
  
  -- Amounts
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax_rate DECIMAL(5,4) DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  
  -- Payment
  due_date DATE,
  paid_at TIMESTAMPTZ,
  payment_method TEXT, -- 'stripe', 'cash', 'check', 'venmo', 'zelle', 'other'
  stripe_payment_link TEXT,
  stripe_payment_id TEXT,
  
  -- Notes
  notes TEXT
);

-- =====================================================
-- INVOICE LINE ITEMS
-- =====================================================
CREATE TABLE invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  
  sort_order INTEGER DEFAULT 0
);

-- =====================================================
-- SAVED SERVICES (Reusable Line Items)
-- =====================================================
CREATE TABLE saved_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  description TEXT,
  default_price DECIMAL(10,2) NOT NULL,
  
  -- Categorization
  category TEXT, -- 'labor', 'parts', 'flat_rate'
  
  UNIQUE(business_id, name)
);

-- =====================================================
-- PERSONAL REMINDERS (Owner's To-Do's)
-- =====================================================
CREATE TABLE reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id), -- Which team member owns this reminder
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Content
  title TEXT NOT NULL,
  notes TEXT,
  
  -- Timing
  remind_at TIMESTAMPTZ NOT NULL,
  
  -- Links (all optional)
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  
  -- Status
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  snoozed_until TIMESTAMPTZ,
  
  -- Retention setting
  retention TEXT DEFAULT 'forever' CHECK (retention IN ('30_days', 'forever'))
);

-- =====================================================
-- SMS CONVERSATIONS
-- =====================================================
CREATE TABLE sms_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id),
  lead_id UUID REFERENCES leads(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  phone TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed', 'opted_out')),
  
  -- For quiet hours exception tracking
  last_customer_message_at TIMESTAMPTZ,
  is_customer_initiated BOOLEAN DEFAULT FALSE
);

-- =====================================================
-- SMS MESSAGES
-- =====================================================
CREATE TABLE sms_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES sms_conversations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  sender TEXT NOT NULL, -- 'customer', 'ai', 'staff'
  sender_user_id UUID REFERENCES users(id), -- If sent by staff
  body TEXT NOT NULL,
  
  -- Delivery
  status TEXT DEFAULT 'sent' CHECK (status IN ('queued', 'sent', 'delivered', 'failed')),
  
  -- Forwarding (when AI is off)
  forwarded_to TEXT,
  forwarded_at TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB -- For AI context, tool calls, etc.
);

-- =====================================================
-- CUSTOMER APPOINTMENT REMINDERS (Automated SMS to Customers)
-- =====================================================
CREATE TABLE customer_reminder_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  
  type TEXT NOT NULL CHECK (type IN ('day_before', 'hour_before')),
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'skipped', 'failed')),
  skip_reason TEXT, -- 'quiet_hours', 'disabled', 'customer_opted_out', 'job_cancelled'
  
  -- Response tracking
  customer_response TEXT, -- 'confirmed', 'reschedule', 'no_response'
  customer_response_at TIMESTAMPTZ
);

-- =====================================================
-- AUTOMATION EVENTS (Follow-ups, Review Requests)
-- =====================================================
CREATE TABLE automation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  
  -- Target
  job_id UUID REFERENCES jobs(id),
  customer_id UUID REFERENCES customers(id),
  lead_id UUID REFERENCES leads(id),
  quote_id UUID REFERENCES quotes(id),
  
  -- Event type
  type TEXT NOT NULL CHECK (type IN (
    'review_request',
    'review_followup',
    'lead_followup',
    'quote_followup'
  )),
  
  -- Scheduling
  scheduled_for TIMESTAMPTZ NOT NULL,
  executed_at TIMESTAMPTZ,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'skipped', 'failed')),
  skip_reason TEXT
);

-- =====================================================
-- CALL LOGS
-- =====================================================
CREATE TABLE call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id),
  lead_id UUID REFERENCES leads(id),
  user_id UUID REFERENCES users(id), -- Who logged the call
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Call details
  phone TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  duration_seconds INTEGER,
  
  -- Outcome
  outcome TEXT CHECK (outcome IN ('answered', 'voicemail', 'no_answer', 'scheduled', 'not_interested', 'callback_requested')),
  notes TEXT
);

-- =====================================================
-- EMAIL LOGS (Track sent emails)
-- =====================================================
CREATE TABLE email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Recipient
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  recipient_id UUID REFERENCES email_recipients(id),
  
  -- Email details
  email_type TEXT NOT NULL, -- 'new_lead', 'customer_confirms', 'daily_summary', etc.
  subject TEXT NOT NULL,
  
  -- Related entities
  lead_id UUID REFERENCES leads(id),
  job_id UUID REFERENCES jobs(id),
  
  -- Status
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'bounced', 'failed')),
  error_message TEXT
);

-- =====================================================
-- KNOWLEDGE BASE ARTICLES
-- =====================================================
CREATE TABLE kb_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Content
  slug TEXT NOT NULL UNIQUE, -- 'how-ai-sms-works'
  title TEXT NOT NULL,
  body TEXT NOT NULL, -- Markdown content
  excerpt TEXT, -- Short description for lists
  read_time_minutes INTEGER DEFAULT 3,
  
  -- Organization
  category TEXT NOT NULL, -- 'getting-started', 'leads-pipeline', etc.
  sort_order INTEGER DEFAULT 0,
  
  -- Related articles
  related_articles TEXT[], -- Array of slugs
  
  -- Metadata
  is_published BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE, -- Shows in "Popular Articles"
  
  -- Search
  search_keywords TEXT[], -- Additional keywords for search
  
  -- Contextual help
  show_on_screens TEXT[] -- ['leads', 'lead-detail'] for contextual help
);

-- =====================================================
-- KNOWLEDGE BASE FEEDBACK
-- =====================================================
CREATE TABLE kb_article_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES kb_articles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  helpful BOOLEAN NOT NULL, -- true = thumbs up, false = thumbs down
  comment TEXT -- Optional feedback
);

-- =====================================================
-- KNOWLEDGE BASE VIEWS (Analytics)
-- =====================================================
CREATE TABLE kb_article_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES kb_articles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  viewed_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- KNOWLEDGE BASE SEARCH LOGS
-- =====================================================
CREATE TABLE kb_search_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query TEXT NOT NULL,
  results_count INTEGER,
  user_id UUID REFERENCES users(id),
  searched_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TEAM INVITATIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Invitee
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'technician')),

  -- Inviter
  invited_by UUID NOT NULL REFERENCES users(id),

  -- Token for invite link
  token TEXT NOT NULL UNIQUE,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),

  -- Timestamps
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,

  -- Can't invite same email twice to same business while pending
  UNIQUE(business_id, email)
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_users_business ON users(business_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_invite_token ON users(invite_token) WHERE invite_token IS NOT NULL;
CREATE INDEX idx_team_invitations_token ON team_invitations(token);
CREATE INDEX idx_team_invitations_business ON team_invitations(business_id, status);
CREATE INDEX idx_email_recipients_business ON email_recipients(business_id);
CREATE INDEX idx_leads_business_status ON leads(business_id, status);
CREATE INDEX idx_jobs_business_date ON jobs(business_id, scheduled_date);
CREATE INDEX idx_jobs_assigned ON jobs(assigned_to);
CREATE INDEX idx_customers_business_phone ON customers(business_id, phone);
CREATE INDEX idx_reminders_due ON reminders(business_id, remind_at) WHERE completed = FALSE;
CREATE INDEX idx_reminders_user ON reminders(user_id);
CREATE INDEX idx_customer_reminders_scheduled ON customer_reminder_events(scheduled_for) WHERE status = 'pending';
CREATE INDEX idx_automation_scheduled ON automation_events(scheduled_for) WHERE status = 'pending';
CREATE INDEX idx_sms_conversations_phone ON sms_conversations(business_id, phone);
CREATE INDEX idx_job_notes_job ON job_notes(job_id);
CREATE INDEX idx_kb_articles_category ON kb_articles(category) WHERE is_published = TRUE;
CREATE INDEX idx_kb_articles_slug ON kb_articles(slug);
CREATE INDEX idx_kb_articles_search ON kb_articles USING gin(to_tsvector('english', title || ' ' || body || ' ' || array_to_string(search_keywords, ' ')));

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_businesses_updated_at BEFORE UPDATE ON businesses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_email_recipients_updated_at BEFORE UPDATE ON email_recipients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON quotes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sms_conversations_updated_at BEFORE UPDATE ON sms_conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_kb_articles_updated_at BEFORE UPDATE ON kb_articles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update conversation activity when customer sends message
CREATE OR REPLACE FUNCTION update_conversation_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.direction = 'inbound' AND NEW.sender = 'customer' THEN
    UPDATE sms_conversations 
    SET 
      last_customer_message_at = NOW(),
      is_customer_initiated = TRUE,
      updated_at = NOW()
    WHERE id = NEW.conversation_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_sms_message_received
AFTER INSERT ON sms_messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_activity();

-- Update customer stats when job completes
CREATE OR REPLACE FUNCTION update_customer_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE customers 
    SET 
      total_jobs = total_jobs + 1,
      last_job_date = NEW.scheduled_date,
      updated_at = NOW()
    WHERE id = NEW.customer_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_job_completed
AFTER UPDATE ON jobs
FOR EACH ROW
EXECUTE FUNCTION update_customer_stats();

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_reminder_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's business_id
CREATE OR REPLACE FUNCTION get_user_business_id()
RETURNS UUID AS $$
  SELECT business_id FROM users WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper function to get user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM users WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper function to get user's id
CREATE OR REPLACE FUNCTION get_user_id()
RETURNS UUID AS $$
  SELECT id FROM users WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Businesses: Users can only see their own business
CREATE POLICY "Users can view own business" ON businesses
  FOR SELECT USING (id = get_user_business_id());

CREATE POLICY "Owners can update own business" ON businesses
  FOR UPDATE USING (
    id = get_user_business_id() 
    AND get_user_role() IN ('owner', 'admin')
  );

-- Users: Can see team members in same business
CREATE POLICY "Users can view team members" ON users
  FOR SELECT USING (business_id = get_user_business_id());

CREATE POLICY "Owners/Admins can manage team" ON users
  FOR ALL USING (
    business_id = get_user_business_id() 
    AND get_user_role() IN ('owner', 'admin')
  );

-- Email Recipients: Owner/Admin only
CREATE POLICY "Owner/Admin can manage email recipients" ON email_recipients
  FOR ALL USING (
    business_id = get_user_business_id() 
    AND get_user_role() IN ('owner', 'admin')
  );

-- Customers: All users in business can view, Owner/Admin can manage
CREATE POLICY "Users can view customers" ON customers
  FOR SELECT USING (business_id = get_user_business_id());

CREATE POLICY "Owner/Admin can manage customers" ON customers
  FOR ALL USING (
    business_id = get_user_business_id() 
    AND get_user_role() IN ('owner', 'admin')
  );

-- Leads: Owner/Admin only
CREATE POLICY "Owner/Admin can view leads" ON leads
  FOR SELECT USING (
    business_id = get_user_business_id() 
    AND get_user_role() IN ('owner', 'admin')
  );

CREATE POLICY "Owner/Admin can manage leads" ON leads
  FOR ALL USING (
    business_id = get_user_business_id() 
    AND get_user_role() IN ('owner', 'admin')
  );

-- Jobs: Owner/Admin see all, Technicians see assigned only
CREATE POLICY "Users can view jobs" ON jobs
  FOR SELECT USING (
    business_id = get_user_business_id()
    AND (
      get_user_role() IN ('owner', 'admin')
      OR assigned_to = get_user_id()
    )
  );

CREATE POLICY "Owner/Admin can manage jobs" ON jobs
  FOR ALL USING (
    business_id = get_user_business_id() 
    AND get_user_role() IN ('owner', 'admin')
  );

CREATE POLICY "Technicians can update assigned jobs" ON jobs
  FOR UPDATE USING (
    business_id = get_user_business_id()
    AND get_user_role() = 'technician'
    AND assigned_to = get_user_id()
  );

-- Job Notes: Anyone can add to jobs they can see
CREATE POLICY "Users can view job notes" ON job_notes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM jobs 
      WHERE jobs.id = job_notes.job_id 
      AND jobs.business_id = get_user_business_id()
      AND (
        get_user_role() IN ('owner', 'admin')
        OR jobs.assigned_to = get_user_id()
      )
    )
  );

CREATE POLICY "Users can add job notes" ON job_notes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM jobs 
      WHERE jobs.id = job_notes.job_id 
      AND jobs.business_id = get_user_business_id()
      AND (
        get_user_role() IN ('owner', 'admin')
        OR jobs.assigned_to = get_user_id()
      )
    )
  );

-- Job Photos: Same as job notes
CREATE POLICY "Users can view job photos" ON job_photos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM jobs 
      WHERE jobs.id = job_photos.job_id 
      AND jobs.business_id = get_user_business_id()
      AND (
        get_user_role() IN ('owner', 'admin')
        OR jobs.assigned_to = get_user_id()
      )
    )
  );

CREATE POLICY "Users can add job photos" ON job_photos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM jobs 
      WHERE jobs.id = job_photos.job_id 
      AND jobs.business_id = get_user_business_id()
      AND (
        get_user_role() IN ('owner', 'admin')
        OR jobs.assigned_to = get_user_id()
      )
    )
  );

-- Quotes: Owner/Admin only
CREATE POLICY "Owner/Admin can manage quotes" ON quotes
  FOR ALL USING (
    business_id = get_user_business_id() 
    AND get_user_role() IN ('owner', 'admin')
  );

CREATE POLICY "Owner/Admin can manage quote items" ON quote_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM quotes 
      WHERE quotes.id = quote_items.quote_id 
      AND quotes.business_id = get_user_business_id()
      AND get_user_role() IN ('owner', 'admin')
    )
  );

-- Invoices: Owner/Admin only
CREATE POLICY "Owner/Admin can manage invoices" ON invoices
  FOR ALL USING (
    business_id = get_user_business_id() 
    AND get_user_role() IN ('owner', 'admin')
  );

CREATE POLICY "Owner/Admin can manage invoice items" ON invoice_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM invoices 
      WHERE invoices.id = invoice_items.invoice_id 
      AND invoices.business_id = get_user_business_id()
      AND get_user_role() IN ('owner', 'admin')
    )
  );

-- Saved Services: Owner/Admin only
CREATE POLICY "Owner/Admin can manage saved services" ON saved_services
  FOR ALL USING (
    business_id = get_user_business_id() 
    AND get_user_role() IN ('owner', 'admin')
  );

-- Reminders: Users see their own reminders
CREATE POLICY "Users can view own reminders" ON reminders
  FOR SELECT USING (
    business_id = get_user_business_id()
    AND user_id = get_user_id()
  );

CREATE POLICY "Users can manage own reminders" ON reminders
  FOR ALL USING (
    business_id = get_user_business_id()
    AND user_id = get_user_id()
  );

-- SMS: Owner/Admin only
CREATE POLICY "Owner/Admin can view conversations" ON sms_conversations
  FOR SELECT USING (
    business_id = get_user_business_id() 
    AND get_user_role() IN ('owner', 'admin')
  );

CREATE POLICY "Owner/Admin can view messages" ON sms_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sms_conversations 
      WHERE sms_conversations.id = sms_messages.conversation_id 
      AND sms_conversations.business_id = get_user_business_id()
      AND get_user_role() IN ('owner', 'admin')
    )
  );

-- Customer reminder events: Owner/Admin only
CREATE POLICY "Owner/Admin can view customer reminders" ON customer_reminder_events
  FOR SELECT USING (
    business_id = get_user_business_id() 
    AND get_user_role() IN ('owner', 'admin')
  );

-- Automation events: Owner/Admin only
CREATE POLICY "Owner/Admin can view automation events" ON automation_events
  FOR SELECT USING (
    business_id = get_user_business_id() 
    AND get_user_role() IN ('owner', 'admin')
  );

-- Call logs: All users can view and add
CREATE POLICY "Users can view call logs" ON call_logs
  FOR SELECT USING (business_id = get_user_business_id());

CREATE POLICY "Users can add call logs" ON call_logs
  FOR INSERT WITH CHECK (business_id = get_user_business_id());

-- Email logs: Owner/Admin only
CREATE POLICY "Owner/Admin can view email logs" ON email_logs
  FOR SELECT USING (
    business_id = get_user_business_id()
    AND get_user_role() IN ('owner', 'admin')
  );

-- =====================================================
-- CALENDAR INTEGRATION (Nylas)
-- =====================================================

-- Calendar connections via Nylas
CREATE TABLE IF NOT EXISTS calendar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nylas_grant_id TEXT NOT NULL,           -- Nylas grant ID for this connection
  provider TEXT NOT NULL,                  -- 'google', 'icloud', 'microsoft'
  email TEXT NOT NULL,                     -- Connected email address
  calendar_id TEXT,                        -- Primary calendar ID to sync to
  sync_enabled BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)                          -- One calendar connection per user
);

-- Working hours per business (or per user for technicians)
CREATE TABLE IF NOT EXISTS working_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- NULL = business default
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  is_working_day BOOLEAN DEFAULT true,
  start_time TIME DEFAULT '08:00',
  end_time TIME DEFAULT '17:00',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, user_id, day_of_week)
);

-- Schedule blocks (lunch, breaks, personal time)
CREATE TABLE IF NOT EXISTS schedule_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- NULL = applies to all
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
  specific_date DATE,                      -- For one-time blocks
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  label TEXT NOT NULL,
  is_recurring BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (day_of_week IS NOT NULL OR specific_date IS NOT NULL)
);

-- Track which jobs are synced to external calendar (update jobs table)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS external_calendar_event_id TEXT;

-- Scheduling settings per business
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS drive_time_enabled BOOLEAN DEFAULT true;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS drive_time_default_minutes INTEGER DEFAULT 30;

-- =====================================================
-- CALENDAR INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_calendar_connections_user ON calendar_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_working_hours_business ON working_hours(business_id);
CREATE INDEX IF NOT EXISTS idx_working_hours_user ON working_hours(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_schedule_blocks_business ON schedule_blocks(business_id);
CREATE INDEX IF NOT EXISTS idx_schedule_blocks_user ON schedule_blocks(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_schedule_blocks_date ON schedule_blocks(specific_date) WHERE specific_date IS NOT NULL;

-- =====================================================
-- CALENDAR RLS POLICIES
-- =====================================================
ALTER TABLE calendar_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE working_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_blocks ENABLE ROW LEVEL SECURITY;

-- Calendar connections: Users can only manage their own
CREATE POLICY "Users can manage own calendar connection" ON calendar_connections
  FOR ALL USING (user_id = get_user_id());

-- Working hours: All users can view business working hours, Owner/Admin can manage
CREATE POLICY "Users can view business working hours" ON working_hours
  FOR SELECT USING (
    business_id = get_user_business_id()
  );

CREATE POLICY "Owners/admins can manage working hours" ON working_hours
  FOR ALL USING (
    business_id = get_user_business_id()
    AND get_user_role() IN ('owner', 'admin')
  );

CREATE POLICY "Users can manage own working hours" ON working_hours
  FOR ALL USING (
    user_id = get_user_id()
  );

-- Schedule blocks: All users can view, users can manage their own or business-wide (owner/admin)
CREATE POLICY "Users can view business schedule blocks" ON schedule_blocks
  FOR SELECT USING (
    business_id = get_user_business_id()
  );

CREATE POLICY "Users can manage own schedule blocks" ON schedule_blocks
  FOR ALL USING (
    user_id = get_user_id()
  );

CREATE POLICY "Owners/admins can manage business schedule blocks" ON schedule_blocks
  FOR ALL USING (
    user_id IS NULL
    AND business_id = get_user_business_id()
    AND get_user_role() IN ('owner', 'admin')
  );

-- =====================================================
-- CALENDAR TRIGGERS
-- =====================================================
CREATE TRIGGER update_calendar_connections_updated_at
  BEFORE UPDATE ON calendar_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- TWILIO SMS & PHONE INTEGRATION
-- =====================================================

-- Add Twilio phone number to businesses
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS twilio_phone_number TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS twilio_phone_sid TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS phone_number_strategy TEXT DEFAULT 'single';

-- AI SMS enhanced settings
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS ai_sms_quiet_start TIME DEFAULT '20:00';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS ai_sms_quiet_end TIME DEFAULT '08:00';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS ai_sms_knowledge_base TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS ai_sms_tone TEXT DEFAULT 'professional';

-- Call forwarding settings
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS call_forwarding_mode TEXT DEFAULT 'voicemail';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS call_forward_numbers TEXT[];
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS call_ring_timeout INTEGER DEFAULT 20;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS call_business_hours_only BOOLEAN DEFAULT false;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS call_after_hours_mode TEXT DEFAULT 'voicemail';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS voicemail_greeting_url TEXT;

-- Add Twilio-specific columns to sms_messages
ALTER TABLE sms_messages ADD COLUMN IF NOT EXISTS twilio_sid TEXT;
ALTER TABLE sms_messages ADD COLUMN IF NOT EXISTS is_ai_response BOOLEAN DEFAULT false;
ALTER TABLE sms_messages ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Add human handoff tracking to sms_conversations
ALTER TABLE sms_conversations ADD COLUMN IF NOT EXISTS ai_response_count INTEGER DEFAULT 0;
ALTER TABLE sms_conversations ADD COLUMN IF NOT EXISTS needs_human_attention BOOLEAN DEFAULT false;
ALTER TABLE sms_conversations ADD COLUMN IF NOT EXISTS human_attention_reason TEXT;
ALTER TABLE sms_conversations ADD COLUMN IF NOT EXISTS human_attention_at TIMESTAMPTZ;

-- SMS Templates
CREATE TABLE IF NOT EXISTS sms_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT CHECK (category IN ('appointment', 'follow_up', 'quote', 'invoice', 'general')),
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scheduled Messages (for appointment reminders)
CREATE TABLE IF NOT EXISTS scheduled_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  content TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'cancelled', 'failed')),
  sent_at TIMESTAMPTZ,
  twilio_sid TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TWILIO INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_sms_templates_business ON sms_templates(business_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_status ON scheduled_messages(status, scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_business ON scheduled_messages(business_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_job ON scheduled_messages(job_id);
CREATE INDEX IF NOT EXISTS idx_sms_conversations_human_attention ON sms_conversations(business_id, needs_human_attention) WHERE needs_human_attention = true;

-- =====================================================
-- TWILIO RLS POLICIES
-- =====================================================
ALTER TABLE sms_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own business templates" ON sms_templates
  FOR SELECT USING (business_id = get_user_business_id());

CREATE POLICY "Owner/Admin can manage templates" ON sms_templates
  FOR ALL USING (
    business_id = get_user_business_id()
    AND get_user_role() IN ('owner', 'admin')
  );

CREATE POLICY "Users can view own business scheduled messages" ON scheduled_messages
  FOR SELECT USING (business_id = get_user_business_id());

CREATE POLICY "Owner/Admin can manage scheduled messages" ON scheduled_messages
  FOR ALL USING (
    business_id = get_user_business_id()
    AND get_user_role() IN ('owner', 'admin')
  );

-- =====================================================
-- TWILIO FUNCTIONS
-- =====================================================

-- Function to increment AI response count
CREATE OR REPLACE FUNCTION increment_ai_response_count(conv_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE sms_conversations
  SET ai_response_count = COALESCE(ai_response_count, 0) + 1,
      updated_at = NOW()
  WHERE id = conv_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TWILIO TRIGGERS
-- =====================================================
CREATE TRIGGER update_sms_templates_updated_at
  BEFORE UPDATE ON sms_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- QUOTES & INVOICES WITH STRIPE
-- =====================================================

-- Payments table (for tracking multiple payments per invoice)
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,

  amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT, -- 'stripe', 'cash', 'check', 'other'

  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,

  notes TEXT,
  paid_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Business settings for quotes/invoices
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS default_tax_rate DECIMAL(5,2) DEFAULT 0;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS quote_validity_days INTEGER DEFAULT 30;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS invoice_due_days INTEGER DEFAULT 30;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS quote_terms TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS invoice_terms TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS next_quote_number INTEGER DEFAULT 1;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS next_invoice_number INTEGER DEFAULT 1;

-- Stripe Connect (for receiving payments)
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS stripe_account_id TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS stripe_onboarding_complete BOOLEAN DEFAULT false;

-- Stripe Subscription (for billing)
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS stripe_subscription_status TEXT; -- active, past_due, canceled, etc.
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS billing_cycle_anchor TIMESTAMPTZ;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT false;

-- Multi-location add-on
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS has_multi_location_addon BOOLEAN DEFAULT false;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS additional_locations_count INTEGER DEFAULT 0;

-- Lead usage tracking (enhanced)
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS leads_this_month INTEGER DEFAULT 0;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS leads_month_reset_at TIMESTAMPTZ;

-- Add access tokens to quotes and invoices for public viewing
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS access_token TEXT UNIQUE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS access_token TEXT UNIQUE;

-- Add Stripe fields to invoices
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS stripe_payment_link_url TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(10,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS amount_due DECIMAL(10,2) DEFAULT 0;

-- Add viewed_at tracking
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ;

-- Add recurring invoice support
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS service_agreement_id UUID REFERENCES service_agreements(id);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_date DATE;

-- Track invoice reminders
CREATE TABLE IF NOT EXISTS invoice_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  method TEXT NOT NULL CHECK (method IN ('email', 'sms'))
);

CREATE INDEX IF NOT EXISTS idx_invoice_reminders_invoice ON invoice_reminders(invoice_id);
ALTER TABLE invoice_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view reminders for their business invoices" ON invoice_reminders
  FOR ALL USING (
    invoice_id IN (SELECT id FROM invoices WHERE business_id = get_user_business_id())
  );

-- =====================================================
-- QUOTES & INVOICES INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_business ON payments(business_id);
CREATE INDEX IF NOT EXISTS idx_quotes_access_token ON quotes(access_token) WHERE access_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_access_token ON invoices(access_token) WHERE access_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(business_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(business_id, status);

-- =====================================================
-- QUOTES & INVOICES RLS POLICIES
-- =====================================================
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own business payments" ON payments
  FOR SELECT USING (business_id = get_user_business_id());

CREATE POLICY "Owner/Admin can manage payments" ON payments
  FOR ALL USING (
    business_id = get_user_business_id()
    AND get_user_role() IN ('owner', 'admin')
  );

-- =====================================================
-- INVOICE REFUNDS
-- =====================================================
CREATE TABLE IF NOT EXISTS invoice_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  stripe_refund_id TEXT,
  amount DECIMAL(10, 2) NOT NULL,
  reason TEXT NOT NULL DEFAULT 'requested_by_customer'
    CHECK (reason IN ('duplicate', 'fraudulent', 'requested_by_customer', 'other')),
  notes TEXT,
  refunded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_refunds_invoice ON invoice_refunds(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_refunds_payment ON invoice_refunds(payment_id);
CREATE INDEX IF NOT EXISTS idx_invoice_refunds_stripe ON invoice_refunds(stripe_refund_id);
CREATE INDEX IF NOT EXISTS idx_invoice_refunds_created ON invoice_refunds(created_at DESC);

ALTER TABLE invoice_refunds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view refunds for their business invoices" ON invoice_refunds
  FOR SELECT USING (
    invoice_id IN (
      SELECT i.id FROM invoices i
      JOIN profiles p ON p.business_id = i.business_id
      WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "Users can create refunds for their business invoices" ON invoice_refunds
  FOR INSERT WITH CHECK (
    invoice_id IN (
      SELECT i.id FROM invoices i
      JOIN profiles p ON p.business_id = i.business_id
      WHERE p.id = auth.uid()
    )
  );

-- =====================================================
-- QUOTES & INVOICES TRIGGERS
-- =====================================================
CREATE TRIGGER update_quotes_updated_at
  BEFORE UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_saved_services_updated_at
  BEFORE UPDATE ON saved_services
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ADVANCED FEATURES SCHEMA
-- =====================================================

-- Feature Settings (toggles per business)
CREATE TABLE IF NOT EXISTS feature_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  -- Communication
  ai_sms_enabled BOOLEAN DEFAULT false,
  auto_appointment_reminders BOOLEAN DEFAULT true,
  auto_review_requests BOOLEAN DEFAULT false,

  -- Scheduling
  online_booking_enabled BOOLEAN DEFAULT false,
  route_optimization_enabled BOOLEAN DEFAULT true,

  -- CRM Features
  timesheets_enabled BOOLEAN DEFAULT true,
  receipts_enabled BOOLEAN DEFAULT true,
  quotes_enabled BOOLEAN DEFAULT true,
  invoices_enabled BOOLEAN DEFAULT true,

  -- Notifications
  email_notifications BOOLEAN DEFAULT true,
  sms_notifications BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(business_id)
);

-- Timesheets / Time Entries
CREATE TABLE IF NOT EXISTS time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,

  clock_in_at TIMESTAMPTZ NOT NULL,
  clock_out_at TIMESTAMPTZ,

  -- Location tracking
  clock_in_latitude DECIMAL(10,7),
  clock_in_longitude DECIMAL(10,7),
  clock_out_latitude DECIMAL(10,7),
  clock_out_longitude DECIMAL(10,7),

  -- Calculated fields
  duration_minutes INTEGER,

  -- Entry type
  entry_type TEXT DEFAULT 'work' CHECK (entry_type IN ('work', 'break', 'travel')),

  notes TEXT,

  -- Approval workflow
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Weekly Timesheet Summaries
CREATE TABLE IF NOT EXISTS timesheet_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,

  total_hours DECIMAL(10,2),
  regular_hours DECIMAL(10,2),
  overtime_hours DECIMAL(10,2),

  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
  submitted_at TIMESTAMPTZ,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, week_start_date)
);

-- Receipts
CREATE TABLE IF NOT EXISTS receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,

  -- Receipt details
  vendor_name TEXT,
  amount DECIMAL(10,2),
  receipt_date DATE,
  category TEXT CHECK (category IN ('materials', 'fuel', 'tools', 'supplies', 'other')),
  description TEXT,

  -- Image storage
  image_url TEXT NOT NULL,
  image_path TEXT NOT NULL,

  -- OCR extracted data
  ocr_data JSONB,

  -- Reimbursement tracking
  reimbursement_status TEXT DEFAULT 'pending' CHECK (reimbursement_status IN ('pending', 'approved', 'reimbursed', 'rejected')),
  reimbursed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Google Review Requests
CREATE TABLE IF NOT EXISTS review_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,

  sent_at TIMESTAMPTZ,
  sent_via TEXT CHECK (sent_via IN ('sms', 'email')),

  -- Tracking
  clicked_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Route Optimization - Daily Routes
CREATE TABLE IF NOT EXISTS daily_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  route_date DATE NOT NULL,

  -- Ordered list of job IDs
  job_order UUID[] NOT NULL,

  -- Route metrics
  total_distance_miles DECIMAL(10,2),
  total_drive_time_minutes INTEGER,
  estimated_start_time TIME,
  estimated_end_time TIME,

  -- Optimization metadata
  optimized_at TIMESTAMPTZ,
  optimization_score DECIMAL(5,2),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, route_date)
);

-- Geocoded Addresses Cache
CREATE TABLE IF NOT EXISTS geocoded_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address_hash TEXT NOT NULL UNIQUE,
  original_address TEXT NOT NULL,
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  formatted_address TEXT,
  geocoded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add coordinates to customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,7);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS longitude DECIMAL(10,7);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS geocoded_at TIMESTAMPTZ;

-- Add user type and calendar sharing to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS user_type TEXT DEFAULT 'technician' CHECK (user_type IN ('technician', 'receptionist', 'office_staff'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS shared_calendar_user_id UUID REFERENCES users(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS home_latitude DECIMAL(10,7);
ALTER TABLE users ADD COLUMN IF NOT EXISTS home_longitude DECIMAL(10,7);
ALTER TABLE users ADD COLUMN IF NOT EXISTS home_address TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS vehicle_type TEXT;

-- Add per-user billing fields to businesses
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS billable_user_count INTEGER DEFAULT 0;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS free_user_limit INTEGER DEFAULT 3;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS per_user_price DECIMAL(10,2) DEFAULT 25.00;

-- Add Google review settings to businesses
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS google_place_id TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS auto_review_request_enabled BOOLEAN DEFAULT false;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS review_request_delay_hours INTEGER DEFAULT 24;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS review_request_message TEXT;

-- =====================================================
-- ADVANCED FEATURES INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_feature_settings_business ON feature_settings(business_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user ON time_entries(user_id, clock_in_at);
CREATE INDEX IF NOT EXISTS idx_time_entries_business ON time_entries(business_id, clock_in_at);
CREATE INDEX IF NOT EXISTS idx_time_entries_job ON time_entries(job_id) WHERE job_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_timesheet_summaries_user ON timesheet_summaries(user_id, week_start_date);
CREATE INDEX IF NOT EXISTS idx_receipts_business ON receipts(business_id, receipt_date);
CREATE INDEX IF NOT EXISTS idx_receipts_job ON receipts(job_id) WHERE job_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_review_requests_business ON review_requests(business_id);
CREATE INDEX IF NOT EXISTS idx_daily_routes_user ON daily_routes(user_id, route_date);
CREATE INDEX IF NOT EXISTS idx_geocoded_addresses_hash ON geocoded_addresses(address_hash);
CREATE INDEX IF NOT EXISTS idx_customers_coordinates ON customers(business_id, latitude, longitude) WHERE latitude IS NOT NULL;

-- =====================================================
-- ADVANCED FEATURES RLS POLICIES
-- =====================================================
ALTER TABLE feature_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE timesheet_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE geocoded_addresses ENABLE ROW LEVEL SECURITY;

-- Feature Settings: Owner/Admin can manage
CREATE POLICY "Owner/Admin can manage feature settings" ON feature_settings
  FOR ALL USING (
    business_id = get_user_business_id()
    AND get_user_role() IN ('owner', 'admin')
  );

CREATE POLICY "Users can view feature settings" ON feature_settings
  FOR SELECT USING (business_id = get_user_business_id());

-- Time Entries: Users see their own, Owner/Admin see all
CREATE POLICY "Users can view own time entries" ON time_entries
  FOR SELECT USING (
    business_id = get_user_business_id()
    AND (user_id = get_user_id() OR get_user_role() IN ('owner', 'admin'))
  );

CREATE POLICY "Users can create own time entries" ON time_entries
  FOR INSERT WITH CHECK (
    business_id = get_user_business_id()
    AND user_id = get_user_id()
  );

CREATE POLICY "Users can update own time entries" ON time_entries
  FOR UPDATE USING (
    business_id = get_user_business_id()
    AND (user_id = get_user_id() OR get_user_role() IN ('owner', 'admin'))
  );

-- Timesheet Summaries: Similar to time entries
CREATE POLICY "Users can view own timesheet summaries" ON timesheet_summaries
  FOR SELECT USING (
    business_id = get_user_business_id()
    AND (user_id = get_user_id() OR get_user_role() IN ('owner', 'admin'))
  );

CREATE POLICY "Users can manage own timesheet summaries" ON timesheet_summaries
  FOR ALL USING (
    business_id = get_user_business_id()
    AND user_id = get_user_id()
  );

-- Receipts: Users see their own, Owner/Admin see all
CREATE POLICY "Users can view business receipts" ON receipts
  FOR SELECT USING (
    business_id = get_user_business_id()
    AND (uploaded_by = get_user_id() OR get_user_role() IN ('owner', 'admin'))
  );

CREATE POLICY "Users can upload receipts" ON receipts
  FOR INSERT WITH CHECK (
    business_id = get_user_business_id()
    AND uploaded_by = get_user_id()
  );

CREATE POLICY "Owner/Admin can manage receipts" ON receipts
  FOR ALL USING (
    business_id = get_user_business_id()
    AND get_user_role() IN ('owner', 'admin')
  );

-- Review Requests: Owner/Admin only
CREATE POLICY "Owner/Admin can manage review requests" ON review_requests
  FOR ALL USING (
    business_id = get_user_business_id()
    AND get_user_role() IN ('owner', 'admin')
  );

-- Daily Routes: Users see their own, Owner/Admin see all
CREATE POLICY "Users can view own routes" ON daily_routes
  FOR SELECT USING (
    business_id = get_user_business_id()
    AND (user_id = get_user_id() OR get_user_role() IN ('owner', 'admin'))
  );

CREATE POLICY "Owner/Admin can manage routes" ON daily_routes
  FOR ALL USING (
    business_id = get_user_business_id()
    AND get_user_role() IN ('owner', 'admin')
  );

-- Geocoded Addresses: Public read, system write
CREATE POLICY "Anyone can read geocoded addresses" ON geocoded_addresses
  FOR SELECT USING (true);

-- =====================================================
-- MILEAGE TRACKING TABLES
-- =====================================================

-- Mileage entries per job/trip
-- Removed

-- Daily mileage summaries per technician
-- Removed

-- Add mileage rate and tracking settings to businesses
-- Removed

-- Add arrival tracking to jobs
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS arrived_at TIMESTAMPTZ;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS departed_at TIMESTAMPTZ;
-- Removed

-- Mileage indexes
-- Removed

-- Mileage RLS
-- Removed

-- Removed

-- =====================================================
-- QUICKBOOKS INTEGRATION TABLES
-- =====================================================

-- QuickBooks connection per business
CREATE TABLE IF NOT EXISTS quickbooks_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  -- OAuth tokens (encrypted in production)
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,

  -- QuickBooks company info
  realm_id TEXT NOT NULL,
  company_name TEXT,

  -- Sync settings
  sync_customers BOOLEAN DEFAULT true,
  sync_invoices BOOLEAN DEFAULT true,
  sync_payments BOOLEAN DEFAULT true,
  sync_expenses BOOLEAN DEFAULT true,

  -- Auto-sync
  auto_sync_enabled BOOLEAN DEFAULT false,
  last_sync_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(business_id)
);

-- Map local records to QuickBooks IDs
CREATE TABLE IF NOT EXISTS quickbooks_sync_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  entity_type TEXT NOT NULL CHECK (entity_type IN ('customer', 'invoice', 'payment', 'expense')),
  local_id UUID NOT NULL,
  quickbooks_id TEXT NOT NULL,

  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  sync_status TEXT DEFAULT 'synced' CHECK (sync_status IN ('synced', 'pending', 'error')),
  sync_error TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(business_id, entity_type, local_id)
);

-- QuickBooks indexes
CREATE INDEX IF NOT EXISTS idx_quickbooks_connections_business ON quickbooks_connections(business_id);
CREATE INDEX IF NOT EXISTS idx_quickbooks_sync_map_business ON quickbooks_sync_map(business_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_quickbooks_sync_map_local ON quickbooks_sync_map(local_id);

-- QuickBooks RLS
ALTER TABLE quickbooks_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE quickbooks_sync_map ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage QuickBooks connection" ON quickbooks_connections
  FOR ALL USING (
    business_id = get_user_business_id()
    AND get_user_role() = 'owner'
  );

CREATE POLICY "Owner/Admin can view QuickBooks sync map" ON quickbooks_sync_map
  FOR SELECT USING (
    business_id = get_user_business_id()
    AND get_user_role() IN ('owner', 'admin')
  );

CREATE POLICY "Owner can manage QuickBooks sync map" ON quickbooks_sync_map
  FOR ALL USING (
    business_id = get_user_business_id()
    AND get_user_role() = 'owner'
  );

-- =====================================================
-- ADVANCED FEATURES TRIGGERS
-- =====================================================
CREATE TRIGGER update_feature_settings_updated_at
  BEFORE UPDATE ON feature_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_time_entries_updated_at
  BEFORE UPDATE ON time_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_receipts_updated_at
  BEFORE UPDATE ON receipts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_routes_updated_at
  BEFORE UPDATE ON daily_routes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-calculate duration when clocking out
CREATE OR REPLACE FUNCTION calculate_time_entry_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.clock_out_at IS NOT NULL AND OLD.clock_out_at IS NULL THEN
    NEW.duration_minutes = EXTRACT(EPOCH FROM (NEW.clock_out_at - NEW.clock_in_at)) / 60;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_time_entry_clock_out
  BEFORE UPDATE ON time_entries
  FOR EACH ROW
  EXECUTE FUNCTION calculate_time_entry_duration();

-- =====================================================
-- CRITICAL FEATURES SCHEMA
-- =====================================================

-- =====================================================
-- 1. ENHANCED JOB PHOTOS
-- =====================================================
-- Add missing columns to job_photos if they don't exist
ALTER TABLE job_photos ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id) ON DELETE CASCADE;
ALTER TABLE job_photos ADD COLUMN IF NOT EXISTS storage_path TEXT;
ALTER TABLE job_photos ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE job_photos ADD COLUMN IF NOT EXISTS photo_type TEXT DEFAULT 'general';
ALTER TABLE job_photos ADD COLUMN IF NOT EXISTS caption TEXT;
ALTER TABLE job_photos ADD COLUMN IF NOT EXISTS taken_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE job_photos ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,7);
ALTER TABLE job_photos ADD COLUMN IF NOT EXISTS longitude DECIMAL(10,7);
ALTER TABLE job_photos ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Rename columns to match spec
ALTER TABLE job_photos RENAME COLUMN url TO photo_url;
ALTER TABLE job_photos RENAME COLUMN user_id TO uploaded_by;
ALTER TABLE job_photos RENAME COLUMN label TO photo_type_legacy;

-- Update photo_type from legacy label
UPDATE job_photos SET photo_type = COALESCE(photo_type_legacy, 'general') WHERE photo_type = 'general';

-- Index for fast job photo lookup
CREATE INDEX IF NOT EXISTS idx_job_photos_job_id ON job_photos(job_id);
CREATE INDEX IF NOT EXISTS idx_job_photos_business ON job_photos(business_id);

-- RLS for job_photos
ALTER TABLE job_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view photos for their business" ON job_photos
  FOR SELECT USING (
    business_id = get_user_business_id()
  );

CREATE POLICY "Users can insert photos for their business" ON job_photos
  FOR INSERT WITH CHECK (
    business_id = get_user_business_id()
  );

CREATE POLICY "Users can delete photos they uploaded or admins" ON job_photos
  FOR DELETE USING (
    uploaded_by = get_user_id() OR
    get_user_role() IN ('owner', 'admin')
  );

-- =====================================================
-- 2. DIGITAL SIGNATURES
-- =====================================================
CREATE TABLE IF NOT EXISTS signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  -- What is being signed
  entity_type TEXT NOT NULL CHECK (entity_type IN ('job', 'quote', 'invoice', 'document')),
  entity_id UUID NOT NULL,

  -- Signature data
  signature_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,

  -- Signer info
  signer_name TEXT NOT NULL,
  signer_email TEXT,
  signer_phone TEXT,

  -- Legal
  ip_address TEXT,
  user_agent TEXT,
  signed_at TIMESTAMPTZ DEFAULT NOW(),

  -- What they agreed to
  agreement_text TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add signature reference to jobs and quotes
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS signature_id UUID REFERENCES signatures(id);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS requires_signature BOOLEAN DEFAULT true;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS signature_id UUID REFERENCES signatures(id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_signatures_business ON signatures(business_id);
CREATE INDEX IF NOT EXISTS idx_signatures_entity ON signatures(entity_type, entity_id);

-- RLS
ALTER TABLE signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view signatures for their business" ON signatures
  FOR SELECT USING (business_id = get_user_business_id());

CREATE POLICY "Users can create signatures for their business" ON signatures
  FOR INSERT WITH CHECK (business_id = get_user_business_id());

-- =====================================================
-- 3. CUSTOMER EQUIPMENT TRACKING
-- =====================================================
CREATE TABLE IF NOT EXISTS customer_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

  -- Equipment details
  equipment_type TEXT NOT NULL,
  name TEXT,
  brand TEXT,
  model TEXT,
  serial_number TEXT,

  -- Location
  location_in_property TEXT,

  -- Dates
  install_date DATE,
  manufacture_date DATE,
  last_service_date DATE,
  next_service_due DATE,

  -- Warranty
  warranty_expires DATE,
  warranty_provider TEXT,
  warranty_details TEXT,

  -- Specs (flexible JSON for different equipment types)
  specifications JSONB,

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'needs_repair', 'replaced', 'removed')),
  condition TEXT CHECK (condition IN ('excellent', 'good', 'fair', 'poor')),

  -- Photos
  photo_urls TEXT[],

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track which equipment was serviced on each job
CREATE TABLE IF NOT EXISTS job_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES customer_equipment(id) ON DELETE CASCADE,
  service_performed TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(job_id, equipment_id)
);

-- Equipment types lookup (customizable per business)
CREATE TABLE IF NOT EXISTS equipment_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT,
  default_specs JSONB,

  UNIQUE(business_id, name)
);

-- Seed default equipment types
INSERT INTO equipment_types (business_id, name, icon, default_specs) VALUES
(NULL, 'AC Unit', 'wind', '{"tonnage": null, "seer": null, "refrigerant": null}'),
(NULL, 'Furnace', 'flame', '{"btu": null, "efficiency": null, "fuel_type": null}'),
(NULL, 'Heat Pump', 'thermometer', '{"tonnage": null, "seer": null, "hspf": null}'),
(NULL, 'Water Heater', 'droplet', '{"gallons": null, "fuel_type": null, "energy_factor": null}'),
(NULL, 'Electrical Panel', 'zap', '{"amperage": null, "voltage": null, "circuits": null}'),
(NULL, 'Thermostat', 'gauge', '{"brand": null, "smart": false}'),
(NULL, 'Ductwork', 'wind', '{"material": null, "insulation": null}'),
(NULL, 'Other', 'box', '{}')
ON CONFLICT DO NOTHING;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_customer_equipment_customer ON customer_equipment(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_equipment_type ON customer_equipment(equipment_type);
CREATE INDEX IF NOT EXISTS idx_customer_equipment_warranty ON customer_equipment(warranty_expires) WHERE warranty_expires IS NOT NULL;

-- RLS
ALTER TABLE customer_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage equipment for their business" ON customer_equipment
  FOR ALL USING (business_id = get_user_business_id());

CREATE POLICY "Users can manage job equipment for their business" ON job_equipment
  FOR ALL USING (
    job_id IN (SELECT id FROM jobs WHERE business_id = get_user_business_id())
  );

CREATE POLICY "Users can view equipment types" ON equipment_types
  FOR SELECT USING (business_id IS NULL OR business_id = get_user_business_id());

-- =====================================================
-- 4. JOB CHECKLISTS
-- =====================================================
-- Checklist templates (reusable)
CREATE TABLE IF NOT EXISTS checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,

  -- When to use
  job_types TEXT[],
  checklist_type TEXT DEFAULT 'service' CHECK (checklist_type IN ('pre_job', 'service', 'post_job', 'safety')),

  -- Items (ordered)
  items JSONB NOT NULL DEFAULT '[]',

  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Checklist instances on jobs
CREATE TABLE IF NOT EXISTS job_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  template_id UUID REFERENCES checklist_templates(id) ON DELETE SET NULL,

  name TEXT NOT NULL,
  checklist_type TEXT,

  -- Copied items with completion status
  items JSONB NOT NULL DEFAULT '[]',

  -- Progress
  total_items INTEGER DEFAULT 0,
  completed_items INTEGER DEFAULT 0,

  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_checklist_templates_business ON checklist_templates(business_id);
CREATE INDEX IF NOT EXISTS idx_job_checklists_job ON job_checklists(job_id);

-- RLS
ALTER TABLE checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage checklist templates for their business" ON checklist_templates
  FOR ALL USING (business_id = get_user_business_id());

CREATE POLICY "Users can manage job checklists for their business" ON job_checklists
  FOR ALL USING (
    job_id IN (SELECT id FROM jobs WHERE business_id = get_user_business_id())
  );

-- =====================================================
-- 5. CUSTOMER PRE-JOB CHECKLIST
-- =====================================================
-- Pre-job checklist items (per customer)
CREATE TABLE IF NOT EXISTS customer_pre_job_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

  -- Item details
  item_type TEXT NOT NULL CHECK (item_type IN ('part', 'material', 'tool', 'reminder', 'access')),
  label TEXT NOT NULL,
  description TEXT,

  -- For parts/materials
  quantity INTEGER,
  sku TEXT,

  -- Ordering
  display_order INTEGER DEFAULT 0,

  -- Active/archived
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Job-specific items (one-time for specific job)
CREATE TABLE IF NOT EXISTS job_pre_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,

  item_type TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  quantity INTEGER,

  -- Completion tracking
  is_checked BOOLEAN DEFAULT false,
  checked_at TIMESTAMPTZ,
  checked_by UUID REFERENCES users(id),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add access fields to customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS gate_code TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS parking_notes TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS access_notes TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS has_dog BOOLEAN DEFAULT false;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS dog_info TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS preferred_contact_method TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS best_time_to_contact TEXT;

-- Index
CREATE INDEX IF NOT EXISTS idx_customer_pre_job_items_customer ON customer_pre_job_items(customer_id);

-- RLS
ALTER TABLE customer_pre_job_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_pre_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage customer pre-job items for their business" ON customer_pre_job_items
  FOR ALL USING (business_id = get_user_business_id());

CREATE POLICY "Users can manage job pre-checklist items for their business" ON job_pre_checklist_items
  FOR ALL USING (
    job_id IN (SELECT id FROM jobs WHERE business_id = get_user_business_id())
  );

-- =====================================================
-- 6. CUSTOMER ACTIVITY LOG
-- =====================================================
CREATE TABLE IF NOT EXISTS customer_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

  -- Activity type
  activity_type TEXT NOT NULL,

  -- Description
  title TEXT NOT NULL,
  description TEXT,

  -- Related entities
  related_entity_type TEXT,
  related_entity_id UUID,

  -- Metadata
  metadata JSONB,

  -- Who created it
  created_by UUID REFERENCES users(id),
  created_by_system BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast customer timeline lookup
CREATE INDEX IF NOT EXISTS idx_customer_activity_customer ON customer_activity(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_activity_type ON customer_activity(customer_id, activity_type);

-- RLS
ALTER TABLE customer_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage customer activity for their business" ON customer_activity
  FOR ALL USING (business_id = get_user_business_id());

-- =====================================================
-- 7. PUSH NOTIFICATIONS
-- =====================================================
-- Push subscription storage
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Web Push
  endpoint TEXT,
  keys_p256dh TEXT,
  keys_auth TEXT,

  -- FCM (mobile)
  fcm_token TEXT,

  -- Device info
  device_type TEXT NOT NULL CHECK (device_type IN ('web', 'ios', 'android')),
  device_name TEXT,

  -- Status
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, endpoint),
  UNIQUE(user_id, fcm_token)
);

-- Notification history
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  -- Content
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  icon TEXT,

  -- Action
  action_type TEXT,
  action_data JSONB,

  -- Status
  read_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User notification preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Channel preferences
  push_enabled BOOLEAN DEFAULT true,
  email_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT false,

  -- Type preferences
  new_lead_notifications BOOLEAN DEFAULT true,
  job_assignment_notifications BOOLEAN DEFAULT true,
  schedule_change_notifications BOOLEAN DEFAULT true,
  message_notifications BOOLEAN DEFAULT true,
  payment_notifications BOOLEAN DEFAULT true,
  reminder_notifications BOOLEAN DEFAULT true,

  -- Quiet hours
  quiet_hours_enabled BOOLEAN DEFAULT false,
  quiet_hours_start TIME,
  quiet_hours_end TIME,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id) WHERE read_at IS NULL;

-- Notification logs for tracking sent notifications
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  reference_id UUID,
  channel TEXT, -- 'email', 'sms', 'push'
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_notification_logs_business ON notification_logs(business_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_logs_customer ON notification_logs(customer_id, sent_at DESC);

-- RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own push subscriptions" ON push_subscriptions
  FOR ALL USING (user_id = get_user_id());

CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (user_id = get_user_id());

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (user_id = get_user_id());

CREATE POLICY "System can create notifications" ON notifications
  FOR INSERT WITH CHECK (business_id = get_user_business_id());

CREATE POLICY "Users can manage own notification preferences" ON notification_preferences
  FOR ALL USING (user_id = get_user_id());

-- =====================================================
-- 8. RECURRING JOBS / SERVICE AGREEMENTS
-- =====================================================
CREATE TABLE IF NOT EXISTS service_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

  -- Agreement details
  name TEXT NOT NULL,
  description TEXT,

  -- Scheduling
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'monthly', 'quarterly', 'biannual', 'annual')),
  start_date DATE NOT NULL,
  end_date DATE,

  -- Next scheduled
  next_service_date DATE,

  -- Pricing
  price_per_service DECIMAL(10,2),
  annual_price DECIMAL(10,2),

  -- Job template
  job_template JSONB,

  -- Auto-generation settings
  auto_generate_jobs BOOLEAN DEFAULT true,
  days_before_to_generate INTEGER DEFAULT 14,
  auto_notify_customer BOOLEAN DEFAULT true,

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled', 'expired')),

  -- Renewal
  auto_renew BOOLEAN DEFAULT false,
  renewal_reminder_days INTEGER DEFAULT 30,

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Jobs generated from agreements
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS service_agreement_id UUID REFERENCES service_agreements(id);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false;

-- Equipment covered by agreement
CREATE TABLE IF NOT EXISTS agreement_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_agreement_id UUID NOT NULL REFERENCES service_agreements(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES customer_equipment(id) ON DELETE CASCADE,

  UNIQUE(service_agreement_id, equipment_id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_service_agreements_next_date ON service_agreements(next_service_date) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_service_agreements_customer ON service_agreements(customer_id);

-- RLS
ALTER TABLE service_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE agreement_equipment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage service agreements for their business" ON service_agreements
  FOR ALL USING (business_id = get_user_business_id());

CREATE POLICY "Users can manage agreement equipment for their business" ON agreement_equipment
  FOR ALL USING (
    service_agreement_id IN (SELECT id FROM service_agreements WHERE business_id = get_user_business_id())
  );

-- =====================================================
-- 9. EMAIL INTEGRATION
-- =====================================================
-- Email messages
CREATE TABLE IF NOT EXISTS emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,

  -- Email details
  message_id TEXT,
  thread_id TEXT,

  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),

  from_email TEXT NOT NULL,
  from_name TEXT,
  to_emails TEXT[] NOT NULL,
  cc_emails TEXT[],
  bcc_emails TEXT[],
  reply_to TEXT,

  subject TEXT,
  body_text TEXT,
  body_html TEXT,

  -- Attachments
  attachments JSONB,

  -- Status (for outbound)
  status TEXT DEFAULT 'sent' CHECK (status IN ('draft', 'queued', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed')),

  -- Tracking
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,

  -- Related to
  related_entity_type TEXT,
  related_entity_id UUID,

  sent_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email templates
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,

  -- Template type
  template_type TEXT CHECK (template_type IN ('quote', 'invoice', 'appointment_reminder', 'follow_up', 'review_request', 'custom')),

  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add reply_to_email to businesses
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS reply_to_email TEXT;

-- Index
CREATE INDEX IF NOT EXISTS idx_emails_customer ON emails(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_emails_thread ON emails(thread_id);

-- RLS
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage emails for their business" ON emails
  FOR ALL USING (business_id = get_user_business_id());

CREATE POLICY "Users can manage email templates for their business" ON email_templates
  FOR ALL USING (business_id = get_user_business_id());

-- =====================================================
-- 10. CUSTOMER SATISFACTION SURVEYS
-- =====================================================
CREATE TABLE IF NOT EXISTS survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,

  -- Access
  access_token TEXT NOT NULL UNIQUE,

  -- Response data
  overall_rating INTEGER CHECK (overall_rating BETWEEN 1 AND 5),
  service_quality INTEGER CHECK (service_quality BETWEEN 1 AND 5),
  technician_rating INTEGER CHECK (technician_rating BETWEEN 1 AND 5),
  communication_rating INTEGER CHECK (communication_rating BETWEEN 1 AND 5),
  value_rating INTEGER CHECK (value_rating BETWEEN 1 AND 5),

  -- Follow-up questions based on rating
  what_went_well TEXT,
  what_could_improve TEXT,
  additional_comments TEXT,

  -- Would recommend
  nps_score INTEGER CHECK (nps_score BETWEEN 0 AND 10),

  -- Google review status
  google_review_prompted BOOLEAN DEFAULT false,
  google_review_clicked BOOLEAN DEFAULT false,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
  completed_at TIMESTAMPTZ,

  -- Sent tracking
  sent_at TIMESTAMPTZ,
  sent_via TEXT CHECK (sent_via IN ('sms', 'email')),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Business survey settings
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS survey_enabled BOOLEAN DEFAULT true;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS survey_delay_hours INTEGER DEFAULT 2;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS google_review_threshold INTEGER DEFAULT 4;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS auto_send_survey BOOLEAN DEFAULT true;

-- Index
CREATE INDEX IF NOT EXISTS idx_survey_responses_customer ON survey_responses(customer_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_job ON survey_responses(job_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_token ON survey_responses(access_token);

-- RLS
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view surveys for their business" ON survey_responses
  FOR SELECT USING (business_id = get_user_business_id());

-- =====================================================
-- 11. DOCUMENT STORAGE
-- =====================================================
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  -- Document details
  name TEXT NOT NULL,
  description TEXT,

  -- File info
  file_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,

  -- Organization
  category TEXT CHECK (category IN ('contract', 'permit', 'license', 'insurance', 'manual', 'other')),
  tags TEXT[],

  -- Related entities (optional)
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  equipment_id UUID REFERENCES customer_equipment(id) ON DELETE SET NULL,

  -- Expiration tracking
  expires_at DATE,
  expiration_reminder_sent BOOLEAN DEFAULT false,

  -- Access control
  visibility TEXT DEFAULT 'internal' CHECK (visibility IN ('internal', 'customer_visible')),

  -- Who uploaded
  uploaded_by UUID NOT NULL REFERENCES users(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_documents_business ON documents(business_id);
CREATE INDEX IF NOT EXISTS idx_documents_customer ON documents(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_expiring ON documents(expires_at) WHERE expires_at IS NOT NULL;

-- RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage documents for their business" ON documents
  FOR ALL USING (business_id = get_user_business_id());

-- =====================================================
-- 12. WARRANTY TRACKING
-- =====================================================
CREATE TABLE IF NOT EXISTS warranties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

  -- What's covered
  warranty_type TEXT NOT NULL CHECK (warranty_type IN ('equipment', 'parts', 'labor')),

  -- Related entities
  equipment_id UUID REFERENCES customer_equipment(id) ON DELETE SET NULL,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,

  -- Warranty details
  name TEXT NOT NULL,
  description TEXT,

  -- Coverage
  coverage_details TEXT,
  exclusions TEXT,

  -- Provider
  provider_name TEXT,
  provider_phone TEXT,
  provider_email TEXT,
  warranty_number TEXT,

  -- Dates
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  -- Document
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'claimed', 'voided')),

  -- Reminders
  reminder_days INTEGER DEFAULT 30,
  reminder_sent BOOLEAN DEFAULT false,

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Warranty claims
CREATE TABLE IF NOT EXISTS warranty_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warranty_id UUID NOT NULL REFERENCES warranties(id) ON DELETE CASCADE,

  -- Claim details
  claim_date DATE NOT NULL,
  claim_reason TEXT NOT NULL,
  claim_description TEXT,

  -- Status
  status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'approved', 'denied', 'completed')),

  -- Resolution
  resolution TEXT,
  resolution_date DATE,

  -- Related job (for repair)
  repair_job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_warranties_customer ON warranties(customer_id);
CREATE INDEX IF NOT EXISTS idx_warranties_expiring ON warranties(end_date) WHERE status = 'active';

-- RLS
ALTER TABLE warranties ENABLE ROW LEVEL SECURITY;
ALTER TABLE warranty_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage warranties for their business" ON warranties
  FOR ALL USING (business_id = get_user_business_id());

CREATE POLICY "Users can manage warranty claims for their business" ON warranty_claims
  FOR ALL USING (
    warranty_id IN (SELECT id FROM warranties WHERE business_id = get_user_business_id())
  );

-- =====================================================
-- 13. CUSTOM FIELDS
-- =====================================================
-- Field definitions
CREATE TABLE IF NOT EXISTS custom_field_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  -- Which entity type
  entity_type TEXT NOT NULL CHECK (entity_type IN ('customer', 'job', 'lead')),

  -- Field details
  field_key TEXT NOT NULL,
  field_label TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN ('text', 'number', 'boolean', 'date', 'dropdown', 'multiselect', 'textarea')),

  -- For dropdown/multiselect
  options JSONB,

  -- Validation
  is_required BOOLEAN DEFAULT false,
  default_value TEXT,
  placeholder TEXT,
  help_text TEXT,

  -- Display
  display_order INTEGER DEFAULT 0,
  show_in_list BOOLEAN DEFAULT false,
  show_in_card BOOLEAN DEFAULT true,

  -- Status
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(business_id, entity_type, field_key)
);

-- Field values
CREATE TABLE IF NOT EXISTS custom_field_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  field_definition_id UUID NOT NULL REFERENCES custom_field_definitions(id) ON DELETE CASCADE,

  -- Which entity
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,

  -- Value (stored as JSONB for flexibility)
  value JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(field_definition_id, entity_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_custom_field_definitions_business ON custom_field_definitions(business_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_custom_field_values_entity ON custom_field_values(entity_type, entity_id);

-- RLS
ALTER TABLE custom_field_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_field_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage custom field definitions for their business" ON custom_field_definitions
  FOR ALL USING (business_id = get_user_business_id());

CREATE POLICY "Users can manage custom field values for their business" ON custom_field_values
  FOR ALL USING (business_id = get_user_business_id());

-- =====================================================
-- 14. TECHNICIAN PERFORMANCE METRICS
-- =====================================================
-- Aggregated daily metrics per technician
CREATE TABLE IF NOT EXISTS technician_daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  metric_date DATE NOT NULL,

  -- Job metrics
  jobs_completed INTEGER DEFAULT 0,
  jobs_scheduled INTEGER DEFAULT 0,

  -- Revenue
  revenue_generated DECIMAL(10,2) DEFAULT 0,

  -- Time metrics
  total_job_time_minutes INTEGER DEFAULT 0,
  total_drive_time_minutes INTEGER DEFAULT 0,
  avg_response_time_minutes INTEGER,

  -- Quality metrics
  callbacks INTEGER DEFAULT 0,

  -- Mileage
  total_miles DECIMAL(10,2) DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, metric_date)
);

-- Job ratings (from surveys)
CREATE TABLE IF NOT EXISTS job_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Ratings (from surveys)
  overall_rating INTEGER CHECK (overall_rating BETWEEN 1 AND 5),
  service_quality INTEGER CHECK (service_quality BETWEEN 1 AND 5),
  professionalism INTEGER CHECK (professionalism BETWEEN 1 AND 5),
  punctuality INTEGER CHECK (punctuality BETWEEN 1 AND 5),

  -- Comments
  customer_comment TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_tech_metrics_user_date ON technician_daily_metrics(user_id, metric_date);
CREATE INDEX IF NOT EXISTS idx_job_ratings_user ON job_ratings(user_id);

-- RLS
ALTER TABLE technician_daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own metrics or admin view all" ON technician_daily_metrics
  FOR SELECT USING (
    user_id = get_user_id() OR get_user_role() IN ('owner', 'admin')
  );

CREATE POLICY "System can manage metrics" ON technician_daily_metrics
  FOR ALL USING (business_id = get_user_business_id());

CREATE POLICY "Users can view job ratings for their business" ON job_ratings
  FOR SELECT USING (
    job_id IN (SELECT id FROM jobs WHERE business_id = get_user_business_id())
  );

-- =====================================================
-- TRIGGERS FOR CRITICAL FEATURES
-- =====================================================
CREATE TRIGGER update_customer_equipment_updated_at
  BEFORE UPDATE ON customer_equipment
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_checklist_templates_updated_at
  BEFORE UPDATE ON checklist_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_checklists_updated_at
  BEFORE UPDATE ON job_checklists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_service_agreements_updated_at
  BEFORE UPDATE ON service_agreements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_warranties_updated_at
  BEFORE UPDATE ON warranties
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_custom_field_definitions_updated_at
  BEFORE UPDATE ON custom_field_definitions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_technician_daily_metrics_updated_at
  BEFORE UPDATE ON technician_daily_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT NOT NULL,
  owner_email TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  phone TEXT,
  plan_type TEXT NOT NULL,
  plan_status TEXT NOT NULL,
  is_trial BOOLEAN DEFAULT FALSE,
  trial_start_date DATE,
  trial_end_date DATE,
  trial_converted BOOLEAN DEFAULT FALSE,
  is_founders BOOLEAN DEFAULT FALSE,
  founders_start_date DATE,
  founders_end_date DATE,
  founders_slot_number INTEGER,
  web_invoice_number TEXT,
  web_plan_type TEXT,
  web_plan_status TEXT,
  web_plan_start_date DATE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  payment_method_added BOOLEAN DEFAULT FALSE,
  next_billing_date DATE,
  monthly_price DECIMAL(10, 2),
  created_by_agent_id UUID REFERENCES admin_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS agent_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES admin_users(id) NOT NULL,
  agent_name TEXT NOT NULL,
  submission_type TEXT NOT NULL,
  client_company_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  client_phone TEXT,
  web_invoice_number TEXT NOT NULL,
  web_plan_type TEXT NOT NULL,
  crm_plan_selected TEXT NOT NULL,
  invoice_validated BOOLEAN DEFAULT FALSE,
  validation_error TEXT,
  status TEXT DEFAULT 'pending',
  rejection_reason TEXT,
  invite_email_sent_at TIMESTAMPTZ,
  invite_token TEXT UNIQUE,
  invite_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS founders_program (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  total_slots INTEGER DEFAULT 100,
  slots_used INTEGER DEFAULT 0,
  is_open BOOLEAN DEFAULT TRUE,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm_email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crm_account_id UUID REFERENCES crm_accounts(id),
  email_type TEXT NOT NULL,
  sent_to TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'sent',
  metadata JSONB
);

CREATE TABLE IF NOT EXISTS admin_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES admin_users(id),
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_accounts_trial_end ON crm_accounts(trial_end_date) WHERE is_trial = TRUE;
CREATE INDEX IF NOT EXISTS idx_crm_accounts_founders_end ON crm_accounts(founders_end_date) WHERE is_founders = TRUE;
CREATE INDEX IF NOT EXISTS idx_crm_accounts_web_invoice ON crm_accounts(web_invoice_number);
CREATE INDEX IF NOT EXISTS idx_agent_submissions_agent ON agent_submissions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_submissions_status ON agent_submissions(status);
CREATE INDEX IF NOT EXISTS idx_admin_activity_admin ON admin_activity_log(admin_user_id, created_at);

CREATE TABLE IF NOT EXISTS processed_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT UNIQUE NOT NULL,
  stripe_event_id TEXT UNIQUE,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_event ON processed_webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_stripe ON processed_webhook_events(stripe_event_id);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE founders_program ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_email_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE processed_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_admin_users_updated_at
  BEFORE UPDATE ON admin_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crm_accounts_updated_at
  BEFORE UPDATE ON crm_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_submissions_updated_at
  BEFORE UPDATE ON agent_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
