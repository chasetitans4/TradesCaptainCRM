-- =====================================================
-- CUSTOMER-FACING FEATURES SCHEMA
-- Migration: 004_customer_facing_features.sql
-- Features: Customer Portal, Online Booking, Follow-ups
-- =====================================================

-- =============================================
-- CUSTOMER PORTAL ACCESS
-- =============================================

CREATE TABLE IF NOT EXISTS customer_portal_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  -- Authentication
  email TEXT NOT NULL,
  password_hash TEXT, -- Optional, can use magic links instead

  -- Magic link tokens
  magic_link_token TEXT,
  magic_link_expires_at TIMESTAMPTZ,

  -- Status
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,

  -- Settings
  notification_preferences JSONB DEFAULT '{"email": true, "sms": true}',

  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(customer_id),
  UNIQUE(business_id, email)
);

CREATE INDEX IF NOT EXISTS idx_portal_access_email ON customer_portal_access(business_id, email);
CREATE INDEX IF NOT EXISTS idx_portal_access_token ON customer_portal_access(magic_link_token) WHERE magic_link_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_portal_access_customer ON customer_portal_access(customer_id);

-- =============================================
-- ONLINE BOOKING SETTINGS
-- =============================================

CREATE TABLE IF NOT EXISTS booking_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  -- General settings
  is_enabled BOOLEAN DEFAULT true,
  booking_url_slug TEXT UNIQUE, -- e.g., "smith-plumbing" for /book/smith-plumbing

  -- Availability
  lead_time_hours INTEGER DEFAULT 24, -- Minimum hours before appointment
  max_days_ahead INTEGER DEFAULT 30, -- How far ahead can book
  buffer_minutes INTEGER DEFAULT 30, -- Buffer between appointments

  -- Time slots
  slot_duration_minutes INTEGER DEFAULT 60,
  available_days INTEGER[] DEFAULT ARRAY[1,2,3,4,5], -- Mon-Fri (0=Sunday)
  day_start_time TIME DEFAULT '08:00',
  day_end_time TIME DEFAULT '17:00',

  -- Services offered for online booking
  enabled_services TEXT[], -- Job types available

  -- Customization
  welcome_message TEXT,
  confirmation_message TEXT,
  primary_color TEXT DEFAULT '#2563eb',
  logo_url TEXT,

  -- Notifications
  notify_email TEXT, -- Where to send new booking notifications
  auto_confirm BOOLEAN DEFAULT false, -- Auto-confirm or require approval

  -- Integration
  calendar_integration BOOLEAN DEFAULT true, -- Sync with calendar

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(business_id)
);

CREATE INDEX IF NOT EXISTS idx_booking_settings_slug ON booking_settings(booking_url_slug);

-- =============================================
-- BOOKING REQUESTS
-- =============================================

CREATE TABLE IF NOT EXISTS booking_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  -- Customer info (may or may not be existing customer)
  customer_id UUID REFERENCES customers(id),
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,

  -- Service details
  service_type TEXT NOT NULL,
  description TEXT,
  urgency TEXT DEFAULT 'normal', -- 'normal', 'urgent', 'emergency'

  -- Preferred times
  preferred_date DATE NOT NULL,
  preferred_time_slot TEXT, -- 'morning', 'afternoon', 'evening', or specific time like '09:00'
  alternate_date DATE,
  alternate_time_slot TEXT,

  -- Address
  address TEXT NOT NULL,
  city TEXT,
  state TEXT,
  zip TEXT,

  -- Status
  status TEXT DEFAULT 'pending', -- 'pending', 'confirmed', 'declined', 'converted', 'cancelled'

  -- Confirmation
  confirmed_date DATE,
  confirmed_time TIME,
  confirmed_by UUID REFERENCES users(id),
  decline_reason TEXT,

  -- Converted to job
  job_id UUID REFERENCES jobs(id),

  -- Tracking
  source TEXT DEFAULT 'website', -- 'website', 'widget', 'portal', 'google'
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,

  -- Notes
  internal_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_requests_business ON booking_requests(business_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_booking_requests_date ON booking_requests(business_id, preferred_date);
CREATE INDEX IF NOT EXISTS idx_booking_requests_customer ON booking_requests(customer_id);

-- =============================================
-- AUTOMATED FOLLOW-UPS
-- =============================================

-- Follow-up rules/sequences
CREATE TABLE IF NOT EXISTS follow_up_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,

  -- Trigger
  trigger_type TEXT NOT NULL,
  -- 'quote_sent', 'quote_no_response', 'job_completed', 'lead_created',
  -- 'lead_no_response', 'invoice_overdue', 'maintenance_due', 'review_request',
  -- 'booking_confirmed', 'appointment_reminder'

  -- Timing
  delay_hours INTEGER NOT NULL, -- Hours after trigger

  -- Action
  action_type TEXT NOT NULL, -- 'sms', 'email', 'task', 'notification'

  -- Message content
  message_template TEXT, -- For SMS
  email_subject TEXT, -- For email
  email_template TEXT, -- For email HTML

  -- Task details (if action_type = 'task')
  task_title TEXT,
  task_assigned_to UUID REFERENCES users(id),

  -- Conditions
  conditions JSONB, -- Additional conditions like { "quote_amount_min": 500 }

  -- Limits
  max_attempts INTEGER DEFAULT 3,
  stop_on_response BOOLEAN DEFAULT true,

  -- Status
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_follow_up_rules_business ON follow_up_rules(business_id, trigger_type, is_active);

-- Follow-up instances (scheduled/sent follow-ups)
CREATE TABLE IF NOT EXISTS follow_up_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  rule_id UUID NOT NULL REFERENCES follow_up_rules(id) ON DELETE CASCADE,

  -- Target
  entity_type TEXT NOT NULL, -- 'quote', 'lead', 'job', 'invoice', 'customer', 'booking'
  entity_id UUID NOT NULL,
  customer_id UUID REFERENCES customers(id),

  -- Scheduling
  scheduled_at TIMESTAMPTZ NOT NULL,

  -- Status
  status TEXT DEFAULT 'scheduled', -- 'scheduled', 'sent', 'cancelled', 'failed', 'stopped'

  -- Execution
  sent_at TIMESTAMPTZ,
  attempt_number INTEGER DEFAULT 1,

  -- Result
  result_message TEXT,
  stopped_reason TEXT, -- 'customer_responded', 'converted', 'manual', 'unsubscribed'

  -- Tracking
  message_sid TEXT, -- SMS message ID
  email_id TEXT, -- Email message ID

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_follow_up_instances_scheduled ON follow_up_instances(scheduled_at, status)
  WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_follow_up_instances_entity ON follow_up_instances(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_instances_customer ON follow_up_instances(customer_id);

-- =============================================
-- CUSTOMER SERVICE REQUESTS
-- =============================================

CREATE TABLE IF NOT EXISTS service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

  -- Request details
  service_type TEXT NOT NULL,
  description TEXT NOT NULL,
  urgency TEXT DEFAULT 'normal', -- 'normal', 'urgent', 'emergency'

  -- Preferred scheduling
  preferred_date DATE,
  preferred_time_slot TEXT,
  flexible_scheduling BOOLEAN DEFAULT true,

  -- Equipment (optional)
  equipment_id UUID REFERENCES customer_equipment(id),

  -- Status
  status TEXT DEFAULT 'pending', -- 'pending', 'scheduled', 'completed', 'cancelled'

  -- Linked job
  job_id UUID REFERENCES jobs(id),

  -- Notes
  customer_notes TEXT,
  internal_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_requests_business ON service_requests(business_id, status);
CREATE INDEX IF NOT EXISTS idx_service_requests_customer ON service_requests(customer_id);

-- =============================================
-- RLS POLICIES
-- =============================================

ALTER TABLE customer_portal_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_up_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_up_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;

-- Business users can manage their settings
CREATE POLICY "Business users manage portal access" ON customer_portal_access
  FOR ALL USING (business_id IN (SELECT business_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Business users manage booking settings" ON booking_settings
  FOR ALL USING (business_id IN (SELECT business_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Business users manage booking requests" ON booking_requests
  FOR ALL USING (business_id IN (SELECT business_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Business users manage follow-up rules" ON follow_up_rules
  FOR ALL USING (business_id IN (SELECT business_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Business users manage follow-up instances" ON follow_up_instances
  FOR ALL USING (business_id IN (SELECT business_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Business users manage service requests" ON service_requests
  FOR ALL USING (business_id IN (SELECT business_id FROM users WHERE id = auth.uid()));

-- Public access for booking (anonymous users can create bookings)
CREATE POLICY "Public can view booking settings by slug" ON booking_settings
  FOR SELECT USING (is_enabled = true AND booking_url_slug IS NOT NULL);

CREATE POLICY "Public can create booking requests" ON booking_requests
  FOR INSERT WITH CHECK (true);

-- Service role full access
CREATE POLICY "Service role full access portal" ON customer_portal_access
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access booking settings" ON booking_settings
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access booking requests" ON booking_requests
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access follow up rules" ON follow_up_rules
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access follow up instances" ON follow_up_instances
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access service requests" ON service_requests
  FOR ALL USING (auth.role() = 'service_role');

-- =============================================
-- TRIGGERS
-- =============================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_customer_facing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_portal_access_updated_at
  BEFORE UPDATE ON customer_portal_access
  FOR EACH ROW EXECUTE FUNCTION update_customer_facing_updated_at();

CREATE TRIGGER trigger_booking_settings_updated_at
  BEFORE UPDATE ON booking_settings
  FOR EACH ROW EXECUTE FUNCTION update_customer_facing_updated_at();

CREATE TRIGGER trigger_booking_requests_updated_at
  BEFORE UPDATE ON booking_requests
  FOR EACH ROW EXECUTE FUNCTION update_customer_facing_updated_at();

CREATE TRIGGER trigger_follow_up_rules_updated_at
  BEFORE UPDATE ON follow_up_rules
  FOR EACH ROW EXECUTE FUNCTION update_customer_facing_updated_at();

CREATE TRIGGER trigger_service_requests_updated_at
  BEFORE UPDATE ON service_requests
  FOR EACH ROW EXECUTE FUNCTION update_customer_facing_updated_at();

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to generate unique booking slug
CREATE OR REPLACE FUNCTION generate_booking_slug(business_name TEXT)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Convert to lowercase and replace spaces with hyphens
  base_slug := lower(regexp_replace(business_name, '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);

  final_slug := base_slug;

  -- Check for uniqueness and add number if needed
  WHILE EXISTS (SELECT 1 FROM booking_settings WHERE booking_url_slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;

  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Function to cancel pending follow-ups for an entity
CREATE OR REPLACE FUNCTION cancel_pending_followups(p_entity_type TEXT, p_entity_id UUID, p_reason TEXT)
RETURNS void AS $$
BEGIN
  UPDATE follow_up_instances
  SET status = 'cancelled',
      stopped_reason = p_reason
  WHERE entity_type = p_entity_type
    AND entity_id = p_entity_id
    AND status = 'scheduled';
END;
$$ LANGUAGE plpgsql;
