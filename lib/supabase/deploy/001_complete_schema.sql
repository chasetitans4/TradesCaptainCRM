-- =====================================================
-- TRADESCAPTAIN DATABASE - COMPLETE DEPLOYMENT SCHEMA
-- Supabase (PostgreSQL) - Fresh Database Deployment
-- Generated for Supabase CLI deployment
-- =====================================================

-- =====================================================
-- EXTENSIONS
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =====================================================
-- CORE FUNCTION: Update Timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PART 1: CORE CRM TABLES (businesses, users, customers)
-- =====================================================

-- BUSINESSES
CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Account
  name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  owner_phone TEXT,

  -- Plan
  plan_tier TEXT NOT NULL DEFAULT 'starter' CHECK (plan_tier IN ('starter', 'growth', 'pro')),
  leads_limit INTEGER,
  leads_used INTEGER DEFAULT 0,
  leads_reset_date DATE,

  -- Settings
  timezone TEXT DEFAULT 'America/Chicago',
  trade_type TEXT,
  service_area JSONB,
  business_hours JSONB,
  tax_rate DECIMAL(5,4) DEFAULT 0.0825,

  -- Branding
  logo_url TEXT,
  primary_color TEXT DEFAULT '#2d5aa0',

  -- Review Links
  review_link_google TEXT,
  review_link_yelp TEXT,
  review_link_facebook TEXT,
  review_link_primary TEXT DEFAULT 'google',

  -- AI SMS Settings
  ai_sms_enabled BOOLEAN DEFAULT TRUE,
  ai_sms_disabled_until TIMESTAMPTZ,
  ai_late_night_acknowledgment BOOLEAN DEFAULT TRUE,

  -- Notification Settings
  settings_notifications JSONB DEFAULT '{
    "customer_reminders": {"enabled": true, "day_before": true, "hour_before": true},
    "push_notifications": {"new_leads": true, "customer_confirms": true, "customer_reschedules": true, "reminders_sent_summary": true, "personal_reminders": true, "lead_limit_warnings": true},
    "quiet_hours": {"enabled": true, "start": "21:00", "end": "07:00"},
    "muted_until": null
  }',

  -- Onboarding
  onboarding_completed BOOLEAN DEFAULT FALSE,
  onboarding_completed_at TIMESTAMPTZ,
  walkthrough_completed BOOLEAN DEFAULT FALSE,
  walkthrough_completed_at TIMESTAMPTZ,
  tips_seen TEXT[] DEFAULT '{}',
  guides_completed TEXT[] DEFAULT '{}',
  questionnaire_completed BOOLEAN DEFAULT FALSE,
  questionnaire_completed_at TIMESTAMPTZ,
  team_size TEXT CHECK (team_size IN ('solo', '2-5', '6-10', '10+')),

  -- Billing
  billable_user_count INTEGER DEFAULT 1,
  google_place_id TEXT,

  -- Twilio
  twilio_phone_number TEXT,
  twilio_phone_sid TEXT,
  phone_number_strategy TEXT DEFAULT 'single',
  ai_sms_quiet_start TIME DEFAULT '20:00',
  ai_sms_quiet_end TIME DEFAULT '08:00',
  ai_sms_knowledge_base TEXT,
  ai_sms_tone TEXT DEFAULT 'professional',
  call_forwarding_mode TEXT DEFAULT 'voicemail',
  call_forward_numbers TEXT[],
  call_ring_timeout INTEGER DEFAULT 20,
  call_business_hours_only BOOLEAN DEFAULT false,
  call_after_hours_mode TEXT DEFAULT 'voicemail',
  voicemail_greeting_url TEXT,

  -- Stripe Connect
  stripe_account_id TEXT,
  stripe_onboarding_complete BOOLEAN DEFAULT false,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_subscription_status TEXT,
  billing_cycle_anchor TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,

  -- Quotes/Invoices settings
  default_tax_rate DECIMAL(5,2) DEFAULT 0,
  quote_validity_days INTEGER DEFAULT 30,
  invoice_due_days INTEGER DEFAULT 30,
  quote_terms TEXT,
  invoice_terms TEXT,
  next_quote_number INTEGER DEFAULT 1,
  next_invoice_number INTEGER DEFAULT 1,

  -- Multi-location
  has_multi_location_addon BOOLEAN DEFAULT false,
  additional_locations_count INTEGER DEFAULT 0,
  leads_this_month INTEGER DEFAULT 0,
  leads_month_reset_at TIMESTAMPTZ,

  -- Calendar/Scheduling
  drive_time_enabled BOOLEAN DEFAULT true,
  drive_time_default_minutes INTEGER DEFAULT 30,

  -- Review settings
  auto_review_request_enabled BOOLEAN DEFAULT false,
  review_request_delay_hours INTEGER DEFAULT 24,
  review_request_message TEXT,

  -- Survey settings
  survey_enabled BOOLEAN DEFAULT true,
  survey_delay_hours INTEGER DEFAULT 2,
  google_review_threshold INTEGER DEFAULT 4,
  auto_send_survey BOOLEAN DEFAULT true,

  -- Email
  reply_to_email TEXT,

  -- Per-user billing
  free_user_limit INTEGER DEFAULT 3,
  per_user_price DECIMAL(10,2) DEFAULT 25.00
);

-- USERS
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  email TEXT NOT NULL UNIQUE,
  auth_user_id UUID,

  name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,

  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'technician' CHECK (role IN ('owner', 'admin', 'technician')),

  invited_by UUID,
  invited_at TIMESTAMPTZ,
  invite_token TEXT,
  accepted_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'deactivated')),

  notification_settings JSONB DEFAULT '{
    "push_enabled": true, "email_enabled": true,
    "push_events": {"assigned_jobs": true, "schedule_changes": true, "new_leads": false, "customer_confirms": true, "customer_reschedules": true, "reminders": true},
    "email_events": {"assigned_jobs": true, "schedule_changes": true, "new_leads": false, "daily_summary": false}
  }',

  -- Security
  password_changed_at TIMESTAMPTZ,
  password_expires_at TIMESTAMPTZ,
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ,
  must_change_password BOOLEAN DEFAULT false,

  -- User type
  user_type TEXT DEFAULT 'technician' CHECK (user_type IN ('technician', 'receptionist', 'office_staff')),
  shared_calendar_user_id UUID,
  home_latitude DECIMAL(10,7),
  home_longitude DECIMAL(10,7),
  home_address TEXT,
  vehicle_type TEXT
);

-- Add self-reference for invited_by
ALTER TABLE users ADD CONSTRAINT fk_users_invited_by FOREIGN KEY (invited_by) REFERENCES users(id);
ALTER TABLE users ADD CONSTRAINT fk_users_shared_calendar FOREIGN KEY (shared_calendar_user_id) REFERENCES users(id);

-- EMAIL RECIPIENTS
CREATE TABLE IF NOT EXISTS email_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  email TEXT NOT NULL,
  name TEXT,
  role_label TEXT,

  notify_new_leads BOOLEAN DEFAULT TRUE,
  notify_customer_confirms BOOLEAN DEFAULT TRUE,
  notify_customer_reschedules BOOLEAN DEFAULT TRUE,
  notify_lead_limit BOOLEAN DEFAULT FALSE,
  notify_daily_summary BOOLEAN DEFAULT TRUE,
  notify_weekly_summary BOOLEAN DEFAULT FALSE,

  is_verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  verification_token TEXT,

  UNIQUE(business_id, email)
);

-- CUSTOMERS
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,

  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,

  timezone TEXT,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  source TEXT,

  total_jobs INTEGER DEFAULT 0,
  total_revenue DECIMAL(10,2) DEFAULT 0,
  last_job_date DATE,

  -- Coordinates
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  geocoded_at TIMESTAMPTZ,

  -- Access info
  gate_code TEXT,
  parking_notes TEXT,
  access_notes TEXT,
  has_dog BOOLEAN DEFAULT false,
  dog_info TEXT,
  preferred_contact_method TEXT,
  best_time_to_contact TEXT,

  UNIQUE(business_id, phone)
);

-- =====================================================
-- PART 2: CRM CORE OPERATIONS
-- =====================================================

-- LEADS
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,

  service_needed TEXT,
  description TEXT,
  urgency TEXT CHECK (urgency IN ('low', 'normal', 'high', 'emergency')),

  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'quoted', 'scheduled', 'won', 'lost')),
  lost_reason TEXT,
  source TEXT NOT NULL,

  assigned_to UUID REFERENCES users(id),
  estimated_value DECIMAL(10,2),
  follow_up_date TIMESTAMPTZ
);

-- JOBS
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id),
  lead_id UUID REFERENCES leads(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  scheduled_date DATE NOT NULL,
  scheduled_time_start TIME,
  scheduled_time_end TIME,

  service_type TEXT NOT NULL,
  description TEXT,

  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'no_show')),

  tech_notes TEXT,

  job_address_line1 TEXT,
  job_address_city TEXT,
  job_address_state TEXT,
  job_address_zip TEXT,

  assigned_to UUID REFERENCES users(id),

  completed_at TIMESTAMPTZ,
  completion_notes TEXT,

  customer_reminders_enabled BOOLEAN DEFAULT TRUE,
  customer_confirmed BOOLEAN DEFAULT FALSE,
  customer_confirmed_at TIMESTAMPTZ,

  google_calendar_event_id TEXT,
  external_calendar_event_id TEXT,

  arrived_at TIMESTAMPTZ,
  departed_at TIMESTAMPTZ,

  -- Service agreements
  service_agreement_id UUID,
  is_recurring BOOLEAN DEFAULT false,

  -- Signature
  signature_id UUID,
  requires_signature BOOLEAN DEFAULT true
);

-- JOB NOTES
CREATE TABLE IF NOT EXISTS job_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  content TEXT NOT NULL
);

-- JOB PHOTOS
CREATE TABLE IF NOT EXISTS job_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  photo_url TEXT NOT NULL,
  storage_path TEXT,
  thumbnail_url TEXT,
  photo_type TEXT DEFAULT 'general',
  photo_type_legacy TEXT,
  caption TEXT,
  notes TEXT,
  taken_at TIMESTAMPTZ DEFAULT NOW(),
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  display_order INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0
);

-- QUOTES
CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id),
  lead_id UUID REFERENCES leads(id),
  job_id UUID REFERENCES jobs(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  quote_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'accepted', 'declined', 'expired')),

  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax_rate DECIMAL(5,4) DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,

  valid_until DATE,
  notes TEXT,
  terms TEXT,

  converted_to_invoice BOOLEAN DEFAULT FALSE,
  converted_at TIMESTAMPTZ,

  access_token TEXT UNIQUE,
  viewed_at TIMESTAMPTZ,
  signature_id UUID
);

-- QUOTE ITEMS
CREATE TABLE IF NOT EXISTS quote_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  sort_order INTEGER DEFAULT 0
);

-- INVOICES
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id),
  quote_id UUID REFERENCES quotes(id),
  job_id UUID REFERENCES jobs(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  invoice_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'paid', 'overdue', 'cancelled')),

  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax_rate DECIMAL(5,4) DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,

  due_date DATE,
  paid_at TIMESTAMPTZ,
  payment_method TEXT,
  stripe_payment_link TEXT,
  stripe_payment_id TEXT,
  stripe_payment_intent_id TEXT,
  stripe_payment_link_url TEXT,

  amount_paid DECIMAL(10,2) DEFAULT 0,
  amount_due DECIMAL(10,2) DEFAULT 0,

  notes TEXT,
  access_token TEXT UNIQUE,
  viewed_at TIMESTAMPTZ,

  service_agreement_id UUID,
  is_recurring BOOLEAN DEFAULT false,
  invoice_date DATE
);

-- INVOICE ITEMS
CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  sort_order INTEGER DEFAULT 0
);

-- SAVED SERVICES
CREATE TABLE IF NOT EXISTS saved_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  default_price DECIMAL(10,2) NOT NULL,
  category TEXT,
  UNIQUE(business_id, name)
);

-- PAYMENTS
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT,
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  notes TEXT,
  paid_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INVOICE REMINDERS
CREATE TABLE IF NOT EXISTS invoice_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  method TEXT NOT NULL CHECK (method IN ('email', 'sms'))
);

-- REMINDERS (Personal)
CREATE TABLE IF NOT EXISTS reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  title TEXT NOT NULL,
  notes TEXT,
  remind_at TIMESTAMPTZ NOT NULL,

  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,

  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  snoozed_until TIMESTAMPTZ,
  retention TEXT DEFAULT 'forever' CHECK (retention IN ('30_days', 'forever'))
);

-- =====================================================
-- PART 3: SMS & COMMUNICATION
-- =====================================================

-- SMS CONVERSATIONS
CREATE TABLE IF NOT EXISTS sms_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id),
  lead_id UUID REFERENCES leads(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  phone TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed', 'opted_out')),
  last_customer_message_at TIMESTAMPTZ,
  is_customer_initiated BOOLEAN DEFAULT FALSE,
  ai_response_count INTEGER DEFAULT 0,
  needs_human_attention BOOLEAN DEFAULT false,
  human_attention_reason TEXT,
  human_attention_at TIMESTAMPTZ
);

-- SMS MESSAGES
CREATE TABLE IF NOT EXISTS sms_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES sms_conversations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  sender TEXT NOT NULL,
  sender_user_id UUID REFERENCES users(id),
  body TEXT NOT NULL,

  status TEXT DEFAULT 'sent' CHECK (status IN ('queued', 'sent', 'delivered', 'failed')),
  forwarded_to TEXT,
  forwarded_at TIMESTAMPTZ,
  metadata JSONB,
  twilio_sid TEXT,
  is_ai_response BOOLEAN DEFAULT false,
  error_message TEXT
);

-- SMS TEMPLATES
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

-- SCHEDULED MESSAGES
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

-- CUSTOMER REMINDER EVENTS
CREATE TABLE IF NOT EXISTS customer_reminder_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,

  type TEXT NOT NULL CHECK (type IN ('day_before', 'hour_before')),
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,

  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'skipped', 'failed')),
  skip_reason TEXT,
  customer_response TEXT,
  customer_response_at TIMESTAMPTZ
);

-- AUTOMATION EVENTS
CREATE TABLE IF NOT EXISTS automation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,

  job_id UUID REFERENCES jobs(id),
  customer_id UUID REFERENCES customers(id),
  lead_id UUID REFERENCES leads(id),
  quote_id UUID REFERENCES quotes(id),

  type TEXT NOT NULL CHECK (type IN ('review_request', 'review_followup', 'lead_followup', 'quote_followup')),
  scheduled_for TIMESTAMPTZ NOT NULL,
  executed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'skipped', 'failed')),
  skip_reason TEXT
);

-- CALL LOGS
CREATE TABLE IF NOT EXISTS call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id),
  lead_id UUID REFERENCES leads(id),
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  phone TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  duration_seconds INTEGER,
  outcome TEXT CHECK (outcome IN ('answered', 'voicemail', 'no_answer', 'scheduled', 'not_interested', 'callback_requested')),
  notes TEXT
);

-- EMAIL LOGS
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  recipient_id UUID REFERENCES email_recipients(id),

  email_type TEXT NOT NULL,
  subject TEXT NOT NULL,

  lead_id UUID REFERENCES leads(id),
  job_id UUID REFERENCES jobs(id),

  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'bounced', 'failed')),
  error_message TEXT
);

-- =====================================================
-- PART 4: CALENDAR & SCHEDULING
-- =====================================================

-- CALENDAR CONNECTIONS
CREATE TABLE IF NOT EXISTS calendar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nylas_grant_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  email TEXT NOT NULL,
  calendar_id TEXT,
  sync_enabled BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- WORKING HOURS
CREATE TABLE IF NOT EXISTS working_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  is_working_day BOOLEAN DEFAULT true,
  start_time TIME DEFAULT '08:00',
  end_time TIME DEFAULT '17:00',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, user_id, day_of_week)
);

-- SCHEDULE BLOCKS
CREATE TABLE IF NOT EXISTS schedule_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
  specific_date DATE,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  label TEXT NOT NULL,
  is_recurring BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (day_of_week IS NOT NULL OR specific_date IS NOT NULL)
);

-- TEAM INVITATIONS
CREATE TABLE IF NOT EXISTS team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'technician')),
  invited_by UUID NOT NULL REFERENCES users(id),
  token TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  UNIQUE(business_id, email)
);

-- =====================================================
-- PART 5: SERVICE AGREEMENTS & RECURRING
-- =====================================================

-- SERVICE AGREEMENTS
CREATE TABLE IF NOT EXISTS service_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,

  frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'monthly', 'quarterly', 'biannual', 'annual')),
  start_date DATE NOT NULL,
  end_date DATE,
  next_service_date DATE,

  price_per_service DECIMAL(10,2),
  annual_price DECIMAL(10,2),

  job_template JSONB,
  auto_generate_jobs BOOLEAN DEFAULT true,
  days_before_to_generate INTEGER DEFAULT 14,
  auto_notify_customer BOOLEAN DEFAULT true,

  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled', 'expired')),
  auto_renew BOOLEAN DEFAULT false,
  renewal_reminder_days INTEGER DEFAULT 30,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key for jobs
ALTER TABLE jobs ADD CONSTRAINT fk_jobs_service_agreement FOREIGN KEY (service_agreement_id) REFERENCES service_agreements(id);
ALTER TABLE invoices ADD CONSTRAINT fk_invoices_service_agreement FOREIGN KEY (service_agreement_id) REFERENCES invoices(id);

-- =====================================================
-- PART 6: CUSTOMER EQUIPMENT & WARRANTIES
-- =====================================================

-- CUSTOMER EQUIPMENT
CREATE TABLE IF NOT EXISTS customer_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

  equipment_type TEXT NOT NULL,
  name TEXT,
  brand TEXT,
  model TEXT,
  serial_number TEXT,
  location_in_property TEXT,

  install_date DATE,
  manufacture_date DATE,
  last_service_date DATE,
  next_service_due DATE,

  warranty_expires DATE,
  warranty_provider TEXT,
  warranty_details TEXT,

  specifications JSONB,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'needs_repair', 'replaced', 'removed')),
  condition TEXT CHECK (condition IN ('excellent', 'good', 'fair', 'poor')),
  photo_urls TEXT[],
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- EQUIPMENT TYPES
CREATE TABLE IF NOT EXISTS equipment_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT,
  default_specs JSONB,
  UNIQUE(business_id, name)
);

-- JOB EQUIPMENT
CREATE TABLE IF NOT EXISTS job_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES customer_equipment(id) ON DELETE CASCADE,
  service_performed TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id, equipment_id)
);

-- AGREEMENT EQUIPMENT
CREATE TABLE IF NOT EXISTS agreement_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_agreement_id UUID NOT NULL REFERENCES service_agreements(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES customer_equipment(id) ON DELETE CASCADE,
  UNIQUE(service_agreement_id, equipment_id)
);

-- WARRANTIES
CREATE TABLE IF NOT EXISTS warranties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

  warranty_type TEXT NOT NULL CHECK (warranty_type IN ('equipment', 'parts', 'labor')),
  equipment_id UUID REFERENCES customer_equipment(id) ON DELETE SET NULL,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,

  name TEXT NOT NULL,
  description TEXT,
  coverage_details TEXT,
  exclusions TEXT,

  provider_name TEXT,
  provider_phone TEXT,
  provider_email TEXT,
  warranty_number TEXT,

  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  document_id UUID,

  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'claimed', 'voided')),
  reminder_days INTEGER DEFAULT 30,
  reminder_sent BOOLEAN DEFAULT false,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- WARRANTY CLAIMS
CREATE TABLE IF NOT EXISTS warranty_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warranty_id UUID NOT NULL REFERENCES warranties(id) ON DELETE CASCADE,

  claim_date DATE NOT NULL,
  claim_reason TEXT NOT NULL,
  claim_description TEXT,

  status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'approved', 'denied', 'completed')),
  resolution TEXT,
  resolution_date DATE,
  repair_job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PART 7: SIGNATURES & DOCUMENTS
-- =====================================================

-- SIGNATURES
CREATE TABLE IF NOT EXISTS signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  entity_type TEXT NOT NULL CHECK (entity_type IN ('job', 'quote', 'invoice', 'document')),
  entity_id UUID NOT NULL,

  signature_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,

  signer_name TEXT NOT NULL,
  signer_email TEXT,
  signer_phone TEXT,

  ip_address TEXT,
  user_agent TEXT,
  signed_at TIMESTAMPTZ DEFAULT NOW(),
  agreement_text TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign keys for signatures
ALTER TABLE jobs ADD CONSTRAINT fk_jobs_signature FOREIGN KEY (signature_id) REFERENCES signatures(id);
ALTER TABLE quotes ADD CONSTRAINT fk_quotes_signature FOREIGN KEY (signature_id) REFERENCES signatures(id);

-- DOCUMENTS
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,

  file_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,

  category TEXT CHECK (category IN ('contract', 'permit', 'license', 'insurance', 'manual', 'other')),
  tags TEXT[],

  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  equipment_id UUID REFERENCES customer_equipment(id) ON DELETE SET NULL,

  expires_at DATE,
  expiration_reminder_sent BOOLEAN DEFAULT false,

  visibility TEXT DEFAULT 'internal' CHECK (visibility IN ('internal', 'customer_visible')),
  uploaded_by UUID NOT NULL REFERENCES users(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key for warranties
ALTER TABLE warranties ADD CONSTRAINT fk_warranties_document FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL;

-- =====================================================
-- PART 8: CHECKLISTS
-- =====================================================

-- CHECKLIST TEMPLATES
CREATE TABLE IF NOT EXISTS checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,
  job_types TEXT[],
  checklist_type TEXT DEFAULT 'service' CHECK (checklist_type IN ('pre_job', 'service', 'post_job', 'safety')),
  items JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- JOB CHECKLISTS
CREATE TABLE IF NOT EXISTS job_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  template_id UUID REFERENCES checklist_templates(id) ON DELETE SET NULL,

  name TEXT NOT NULL,
  checklist_type TEXT,
  items JSONB NOT NULL DEFAULT '[]',

  total_items INTEGER DEFAULT 0,
  completed_items INTEGER DEFAULT 0,

  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CUSTOMER PRE-JOB ITEMS
CREATE TABLE IF NOT EXISTS customer_pre_job_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

  item_type TEXT NOT NULL CHECK (item_type IN ('part', 'material', 'tool', 'reminder', 'access')),
  label TEXT NOT NULL,
  description TEXT,
  quantity INTEGER,
  sku TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- JOB PRE-CHECKLIST ITEMS
CREATE TABLE IF NOT EXISTS job_pre_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,

  item_type TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  quantity INTEGER,

  is_checked BOOLEAN DEFAULT false,
  checked_at TIMESTAMPTZ,
  checked_by UUID REFERENCES users(id),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PART 9: NOTIFICATIONS & ACTIVITY
-- =====================================================

-- CUSTOMER ACTIVITY
CREATE TABLE IF NOT EXISTS customer_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

  activity_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,

  related_entity_type TEXT,
  related_entity_id UUID,
  metadata JSONB,

  created_by UUID REFERENCES users(id),
  created_by_system BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PUSH SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  endpoint TEXT,
  keys_p256dh TEXT,
  keys_auth TEXT,
  fcm_token TEXT,

  device_type TEXT NOT NULL CHECK (device_type IN ('web', 'ios', 'android')),
  device_name TEXT,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, endpoint),
  UNIQUE(user_id, fcm_token)
);

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  title TEXT NOT NULL,
  body TEXT NOT NULL,
  icon TEXT,

  action_type TEXT,
  action_data JSONB,

  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- NOTIFICATION PREFERENCES
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  push_enabled BOOLEAN DEFAULT true,
  email_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT false,

  new_lead_notifications BOOLEAN DEFAULT true,
  job_assignment_notifications BOOLEAN DEFAULT true,
  schedule_change_notifications BOOLEAN DEFAULT true,
  message_notifications BOOLEAN DEFAULT true,
  payment_notifications BOOLEAN DEFAULT true,
  reminder_notifications BOOLEAN DEFAULT true,

  quiet_hours_enabled BOOLEAN DEFAULT false,
  quiet_hours_start TIME,
  quiet_hours_end TIME,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id)
);

-- NOTIFICATION LOGS
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  reference_id UUID,
  channel TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_message TEXT
);

-- =====================================================
-- PART 10: TIME TRACKING & ROUTES
-- =====================================================

-- FEATURE SETTINGS
CREATE TABLE IF NOT EXISTS feature_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  ai_sms_enabled BOOLEAN DEFAULT false,
  auto_appointment_reminders BOOLEAN DEFAULT true,
  auto_review_requests BOOLEAN DEFAULT false,

  online_booking_enabled BOOLEAN DEFAULT false,
  route_optimization_enabled BOOLEAN DEFAULT true,

  timesheets_enabled BOOLEAN DEFAULT true,
  receipts_enabled BOOLEAN DEFAULT true,
  quotes_enabled BOOLEAN DEFAULT true,
  invoices_enabled BOOLEAN DEFAULT true,

  email_notifications BOOLEAN DEFAULT true,
  sms_notifications BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(business_id)
);

-- TIME ENTRIES
CREATE TABLE IF NOT EXISTS time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,

  clock_in_at TIMESTAMPTZ NOT NULL,
  clock_out_at TIMESTAMPTZ,

  clock_in_latitude DECIMAL(10,7),
  clock_in_longitude DECIMAL(10,7),
  clock_out_latitude DECIMAL(10,7),
  clock_out_longitude DECIMAL(10,7),

  duration_minutes INTEGER,
  entry_type TEXT DEFAULT 'work' CHECK (entry_type IN ('work', 'break', 'travel')),
  notes TEXT,

  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TIMESHEET SUMMARIES
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

-- RECEIPTS
CREATE TABLE IF NOT EXISTS receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,

  vendor_name TEXT,
  amount DECIMAL(10,2),
  receipt_date DATE,
  category TEXT CHECK (category IN ('materials', 'fuel', 'tools', 'supplies', 'other')),
  description TEXT,

  image_url TEXT NOT NULL,
  image_path TEXT NOT NULL,
  ocr_data JSONB,

  reimbursement_status TEXT DEFAULT 'pending' CHECK (reimbursement_status IN ('pending', 'approved', 'reimbursed', 'rejected')),
  reimbursed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- REVIEW REQUESTS
CREATE TABLE IF NOT EXISTS review_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,

  sent_at TIMESTAMPTZ,
  sent_via TEXT CHECK (sent_via IN ('sms', 'email')),
  clicked_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- DAILY ROUTES
CREATE TABLE IF NOT EXISTS daily_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  route_date DATE NOT NULL,

  job_order UUID[] NOT NULL,

  total_distance_miles DECIMAL(10,2),
  total_drive_time_minutes INTEGER,
  estimated_start_time TIME,
  estimated_end_time TIME,

  optimized_at TIMESTAMPTZ,
  optimization_score DECIMAL(5,2),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, route_date)
);

-- GEOCODED ADDRESSES
CREATE TABLE IF NOT EXISTS geocoded_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address_hash TEXT NOT NULL UNIQUE,
  original_address TEXT NOT NULL,
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  formatted_address TEXT,
  geocoded_at TIMESTAMPTZ DEFAULT NOW()
);

-- TECHNICIAN DAILY METRICS
CREATE TABLE IF NOT EXISTS technician_daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  metric_date DATE NOT NULL,

  jobs_completed INTEGER DEFAULT 0,
  jobs_scheduled INTEGER DEFAULT 0,
  revenue_generated DECIMAL(10,2) DEFAULT 0,

  total_job_time_minutes INTEGER DEFAULT 0,
  total_drive_time_minutes INTEGER DEFAULT 0,
  avg_response_time_minutes INTEGER,

  callbacks INTEGER DEFAULT 0,
  total_miles DECIMAL(10,2) DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, metric_date)
);

-- JOB RATINGS
CREATE TABLE IF NOT EXISTS job_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  overall_rating INTEGER CHECK (overall_rating BETWEEN 1 AND 5),
  service_quality INTEGER CHECK (service_quality BETWEEN 1 AND 5),
  professionalism INTEGER CHECK (professionalism BETWEEN 1 AND 5),
  punctuality INTEGER CHECK (punctuality BETWEEN 1 AND 5),
  customer_comment TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PART 11: SURVEYS & CUSTOM FIELDS
-- =====================================================

-- SURVEY RESPONSES
CREATE TABLE IF NOT EXISTS survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,

  access_token TEXT NOT NULL UNIQUE,

  overall_rating INTEGER CHECK (overall_rating BETWEEN 1 AND 5),
  service_quality INTEGER CHECK (service_quality BETWEEN 1 AND 5),
  technician_rating INTEGER CHECK (technician_rating BETWEEN 1 AND 5),
  communication_rating INTEGER CHECK (communication_rating BETWEEN 1 AND 5),
  value_rating INTEGER CHECK (value_rating BETWEEN 1 AND 5),

  what_went_well TEXT,
  what_could_improve TEXT,
  additional_comments TEXT,

  nps_score INTEGER CHECK (nps_score BETWEEN 0 AND 10),

  google_review_prompted BOOLEAN DEFAULT false,
  google_review_clicked BOOLEAN DEFAULT false,

  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
  completed_at TIMESTAMPTZ,

  sent_at TIMESTAMPTZ,
  sent_via TEXT CHECK (sent_via IN ('sms', 'email')),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CUSTOM FIELD DEFINITIONS
CREATE TABLE IF NOT EXISTS custom_field_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  entity_type TEXT NOT NULL CHECK (entity_type IN ('customer', 'job', 'lead')),

  field_key TEXT NOT NULL,
  field_label TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN ('text', 'number', 'boolean', 'date', 'dropdown', 'multiselect', 'textarea')),

  options JSONB,
  is_required BOOLEAN DEFAULT false,
  default_value TEXT,
  placeholder TEXT,
  help_text TEXT,

  display_order INTEGER DEFAULT 0,
  show_in_list BOOLEAN DEFAULT false,
  show_in_card BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(business_id, entity_type, field_key)
);

-- CUSTOM FIELD VALUES
CREATE TABLE IF NOT EXISTS custom_field_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  field_definition_id UUID NOT NULL REFERENCES custom_field_definitions(id) ON DELETE CASCADE,

  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,

  value JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(field_definition_id, entity_id)
);

-- =====================================================
-- PART 12: EMAIL & INTEGRATIONS
-- =====================================================

-- EMAILS
CREATE TABLE IF NOT EXISTS emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,

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
  attachments JSONB,

  status TEXT DEFAULT 'sent' CHECK (status IN ('draft', 'queued', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed')),

  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,

  related_entity_type TEXT,
  related_entity_id UUID,

  sent_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- EMAIL TEMPLATES
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,

  template_type TEXT CHECK (template_type IN ('quote', 'invoice', 'appointment_reminder', 'follow_up', 'review_request', 'custom')),
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- QUICKBOOKS CONNECTIONS
CREATE TABLE IF NOT EXISTS quickbooks_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,

  realm_id TEXT NOT NULL,
  company_name TEXT,

  sync_customers BOOLEAN DEFAULT true,
  sync_invoices BOOLEAN DEFAULT true,
  sync_payments BOOLEAN DEFAULT true,
  sync_expenses BOOLEAN DEFAULT true,

  auto_sync_enabled BOOLEAN DEFAULT false,
  last_sync_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(business_id)
);

-- QUICKBOOKS SYNC MAP
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

-- =====================================================
-- PART 13: KNOWLEDGE BASE
-- =====================================================

-- KB ARTICLES
CREATE TABLE IF NOT EXISTS kb_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  excerpt TEXT,
  read_time_minutes INTEGER DEFAULT 3,

  category TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  related_articles TEXT[],

  is_published BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,
  search_keywords TEXT[],
  show_on_screens TEXT[],
  search_vector tsvector
);

-- KB FEEDBACK
CREATE TABLE IF NOT EXISTS kb_article_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES kb_articles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  helpful BOOLEAN NOT NULL,
  comment TEXT
);

-- KB VIEWS
CREATE TABLE IF NOT EXISTS kb_article_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES kb_articles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  viewed_at TIMESTAMPTZ DEFAULT NOW()
);

-- KB SEARCH LOGS
CREATE TABLE IF NOT EXISTS kb_search_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query TEXT NOT NULL,
  results_count INTEGER,
  user_id UUID REFERENCES users(id),
  searched_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PART 14: SECURITY & AUTHENTICATION
-- =====================================================

-- USER TWO FACTOR
CREATE TABLE IF NOT EXISTS user_two_factor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  is_enabled BOOLEAN DEFAULT false,
  preferred_method TEXT,

  totp_secret TEXT,
  totp_verified BOOLEAN DEFAULT false,
  totp_enabled_at TIMESTAMPTZ,

  sms_enabled BOOLEAN DEFAULT false,
  sms_phone TEXT,
  sms_verified BOOLEAN DEFAULT false,
  sms_enabled_at TIMESTAMPTZ,

  email_enabled BOOLEAN DEFAULT false,
  email_verified BOOLEAN DEFAULT false,
  email_enabled_at TIMESTAMPTZ,

  backup_codes JSONB,
  backup_codes_generated_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id)
);

-- TWO FACTOR ATTEMPTS
CREATE TABLE IF NOT EXISTS two_factor_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  method TEXT NOT NULL,
  code_hash TEXT,
  success BOOLEAN,
  ip_address TEXT,
  user_agent TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- USER PINS
CREATE TABLE IF NOT EXISTS user_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  pin_hash TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT false,
  auto_lock_minutes INTEGER DEFAULT 5,
  require_pin_for TEXT[] DEFAULT ARRAY['unlock'],

  failed_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id)
);

-- USER SESSIONS
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  session_token_hash TEXT NOT NULL UNIQUE,

  device_type TEXT,
  device_name TEXT,
  browser TEXT,
  os TEXT,

  ip_address TEXT,
  city TEXT,
  country TEXT,

  is_current BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,

  two_factor_verified BOOLEAN DEFAULT false,
  two_factor_verified_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  ended_reason TEXT
);

-- SECURITY EVENTS
CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,

  event_type TEXT NOT NULL,
  description TEXT,
  metadata JSONB,

  ip_address TEXT,
  user_agent TEXT,
  location TEXT,

  risk_level TEXT DEFAULT 'low',

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PASSWORD HISTORY
CREATE TABLE IF NOT EXISTS password_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TRUSTED DEVICES
CREATE TABLE IF NOT EXISTS trusted_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  device_fingerprint TEXT NOT NULL,
  device_name TEXT,
  device_type TEXT,

  trust_expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, device_fingerprint)
);

-- =====================================================
-- PART 15: ADMIN PORTAL TABLES
-- =====================================================

-- ADMIN USERS
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'agent',
  status TEXT DEFAULT 'active',
  hire_date DATE,
  commission_rate DECIMAL(5,4) DEFAULT 0.10,
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  two_factor_secret TEXT,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CRM ACCOUNTS (TradesCaptain customers)
CREATE TABLE IF NOT EXISTS crm_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id),

  business_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,

  plan_type TEXT NOT NULL,
  plan_tier TEXT NOT NULL DEFAULT 'individual',
  billing_interval TEXT NOT NULL DEFAULT 'month',
  monthly_amount DECIMAL(10,2) NOT NULL,
  user_limit INTEGER DEFAULT 1,
  plan_version TEXT DEFAULT '2024-12',

  status TEXT DEFAULT 'active',
  is_trial BOOLEAN DEFAULT FALSE,
  trial_ends_at TIMESTAMPTZ,

  promo_type TEXT,
  promo_ends_at TIMESTAMPTZ,
  web_customer_id UUID,
  coupon_id UUID,

  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,

  agent_id UUID REFERENCES admin_users(id),
  lead_id UUID,
  signup_source TEXT,

  company_sale BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

-- WEB CUSTOMERS
CREATE TABLE IF NOT EXISTS web_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  business_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,

  plan_type TEXT NOT NULL,
  billing_interval TEXT NOT NULL DEFAULT 'month',
  monthly_amount DECIMAL(10,2) NOT NULL,
  plan_version TEXT DEFAULT '2024-12',

  custom_quote_amount DECIMAL(10,2),
  custom_quote_notes TEXT,

  status TEXT DEFAULT 'active',

  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,

  agent_id UUID REFERENCES admin_users(id),
  lead_id UUID,

  crm_coupon_issued BOOLEAN DEFAULT FALSE,
  crm_coupon_id UUID,
  extra_locations INTEGER DEFAULT 0,
  company_sale BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

-- Add foreign key for web_customer_id
ALTER TABLE crm_accounts ADD CONSTRAINT fk_crm_accounts_web_customer FOREIGN KEY (web_customer_id) REFERENCES web_customers(id);

-- CRM COUPONS
CREATE TABLE IF NOT EXISTS crm_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,

  web_customer_id UUID REFERENCES web_customers(id) NOT NULL,
  web_plan_type TEXT NOT NULL,

  crm_plan TEXT DEFAULT 'blue_starter',
  free_months INTEGER DEFAULT 12,

  status TEXT DEFAULT 'active',
  redeemed_at TIMESTAMPTZ,
  redeemed_by_account_id UUID REFERENCES crm_accounts(id),
  expires_at TIMESTAMPTZ,

  created_by_agent_id UUID REFERENCES admin_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key for coupon_id
ALTER TABLE crm_accounts ADD CONSTRAINT fk_crm_accounts_coupon FOREIGN KEY (coupon_id) REFERENCES crm_coupons(id);

-- TC LEADS (Admin portal leads)
CREATE TABLE IF NOT EXISTS tc_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  agent_id UUID REFERENCES admin_users(id) NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES admin_users(id),

  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,

  trade_type TEXT,
  employee_count TEXT,
  current_website TEXT,
  current_crm TEXT,

  source TEXT DEFAULT 'manual',
  source_details TEXT,

  status TEXT DEFAULT 'new',
  interested_in TEXT[],
  preferred_plan TEXT,
  estimated_value DECIMAL(10,2),

  last_contact_at TIMESTAMPTZ,
  next_followup_at TIMESTAMPTZ,
  contact_count INTEGER DEFAULT 0,

  converted_at TIMESTAMPTZ,
  crm_account_id UUID REFERENCES crm_accounts(id),
  web_customer_id UUID REFERENCES web_customers(id),

  notes TEXT,
  batch_upload_id UUID,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Add foreign keys for lead_id
ALTER TABLE crm_accounts ADD CONSTRAINT fk_crm_accounts_lead FOREIGN KEY (lead_id) REFERENCES tc_leads(id);
ALTER TABLE web_customers ADD CONSTRAINT fk_web_customers_lead FOREIGN KEY (lead_id) REFERENCES tc_leads(id);

-- LEAD ACTIVITIES
CREATE TABLE IF NOT EXISTS lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES tc_leads(id) NOT NULL,
  agent_id UUID REFERENCES admin_users(id) NOT NULL,

  activity_type TEXT NOT NULL,
  description TEXT,

  old_status TEXT,
  new_status TEXT,

  old_agent_id UUID REFERENCES admin_users(id),
  new_agent_id UUID REFERENCES admin_users(id),
  reassigned_by UUID REFERENCES admin_users(id),
  reassignment_reason TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- LEAD REASSIGNMENTS
CREATE TABLE IF NOT EXISTS lead_reassignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES tc_leads(id) NOT NULL,

  from_agent_id UUID REFERENCES admin_users(id),
  to_agent_id UUID REFERENCES admin_users(id) NOT NULL,
  reassigned_by UUID REFERENCES admin_users(id) NOT NULL,

  reason TEXT,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- LEAD BATCH UPLOADS
CREATE TABLE IF NOT EXISTS lead_batch_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  uploaded_by UUID REFERENCES admin_users(id) NOT NULL,
  original_filename TEXT NOT NULL,
  file_size INTEGER,

  assigned_to_agent_id UUID REFERENCES admin_users(id) NOT NULL,

  total_rows INTEGER,
  successful_imports INTEGER DEFAULT 0,
  failed_imports INTEGER DEFAULT 0,
  duplicate_skipped INTEGER DEFAULT 0,

  errors JSONB,
  status TEXT DEFAULT 'processing',

  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key for batch_upload_id
ALTER TABLE tc_leads ADD CONSTRAINT fk_tc_leads_batch FOREIGN KEY (batch_upload_id) REFERENCES lead_batch_uploads(id);

-- PAYMENT TRACKING
CREATE TABLE IF NOT EXISTS payment_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  crm_account_id UUID REFERENCES crm_accounts(id),
  web_customer_id UUID REFERENCES web_customers(id),
  stripe_subscription_id TEXT NOT NULL UNIQUE,

  agent_id UUID REFERENCES admin_users(id),
  plan_type TEXT,

  successful_payments INTEGER DEFAULT 0,

  upfront_eligible BOOLEAN DEFAULT FALSE,
  upfront_paid BOOLEAN DEFAULT FALSE,
  recurring_eligible BOOLEAN DEFAULT FALSE,
  recurring_end_payment INTEGER,

  first_payment_at TIMESTAMPTZ,
  second_payment_at TIMESTAMPTZ,
  third_payment_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- COMMISSIONS
CREATE TABLE IF NOT EXISTS commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES admin_users(id) NOT NULL,

  crm_account_id UUID REFERENCES crm_accounts(id),
  web_customer_id UUID REFERENCES web_customers(id),
  stripe_subscription_id TEXT,

  sale_type TEXT NOT NULL,
  plan_type TEXT NOT NULL,
  plan_tier TEXT,
  billing_interval TEXT NOT NULL,
  sale_amount DECIMAL(10,2) NOT NULL,

  commission_type TEXT NOT NULL,
  commission_rate DECIMAL(5,4),
  commission_amount DECIMAL(10,2) NOT NULL,

  payment_number INTEGER,
  retention_milestone TEXT,

  status TEXT DEFAULT 'pending',
  eligible_at TIMESTAMPTZ,

  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES admin_users(id),

  paid_at TIMESTAMPTZ,
  paid_via TEXT,
  payment_reference TEXT,

  forfeited_at TIMESTAMPTZ,
  forfeiture_reason TEXT,

  company_sale BOOLEAN DEFAULT FALSE,

  sale_date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- COMMISSION RULES
CREATE TABLE IF NOT EXISTS commission_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  plan_type TEXT NOT NULL,
  plan_tier TEXT NOT NULL,
  billing_interval TEXT NOT NULL,

  upfront_amount DECIMAL(10,2),
  upfront_delay_payments INTEGER DEFAULT 2,

  recurring_rate DECIMAL(5,4) DEFAULT 0.10,
  recurring_start_payment INTEGER DEFAULT 3,
  recurring_end_payment INTEGER DEFAULT 14,

  annual_rate DECIMAL(5,4) DEFAULT 0.35,
  annual_renewal_commission BOOLEAN DEFAULT FALSE,

  custom_rate DECIMAL(5,4) DEFAULT 0.35,

  retention_enabled BOOLEAN DEFAULT TRUE,
  month_3_call_bonus DECIMAL(10,2) DEFAULT 15,
  month_4_bonus DECIMAL(10,2) DEFAULT 25,
  month_6_bonus DECIMAL(10,2) DEFAULT 50,
  month_12_bonus DECIMAL(10,2) DEFAULT 100,

  is_active BOOLEAN DEFAULT TRUE,
  version TEXT DEFAULT '2024-12',
  effective_from DATE DEFAULT CURRENT_DATE,
  effective_until DATE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(plan_type, billing_interval, version)
);

-- RETENTION TRACKING
CREATE TABLE IF NOT EXISTS retention_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  crm_account_id UUID REFERENCES crm_accounts(id),
  web_customer_id UUID REFERENCES web_customers(id),
  agent_id UUID REFERENCES admin_users(id) NOT NULL,

  month_3_call_completed BOOLEAN DEFAULT FALSE,
  month_3_call_date TIMESTAMPTZ,
  month_3_call_notes TEXT,
  month_3_audit_sent BOOLEAN DEFAULT FALSE,
  month_3_bonus_paid BOOLEAN DEFAULT FALSE,

  month_4_retained BOOLEAN DEFAULT FALSE,
  month_4_payment_date TIMESTAMPTZ,
  month_4_bonus_paid BOOLEAN DEFAULT FALSE,

  month_6_retained BOOLEAN DEFAULT FALSE,
  month_6_payment_date TIMESTAMPTZ,
  month_6_bonus_paid BOOLEAN DEFAULT FALSE,

  month_12_retained BOOLEAN DEFAULT FALSE,
  month_12_payment_date TIMESTAMPTZ,
  month_12_bonus_paid BOOLEAN DEFAULT FALSE,

  total_retention_bonus DECIMAL(10,2) DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(crm_account_id),
  UNIQUE(web_customer_id)
);

-- ADMIN ACTIVITY LOG
CREATE TABLE IF NOT EXISTS admin_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  admin_user_id UUID REFERENCES admin_users(id) NOT NULL,
  action TEXT NOT NULL,

  resource_type TEXT,
  resource_id UUID,

  details JSONB,
  ip_address TEXT,
  user_agent TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ADMIN INVOICES
CREATE TABLE IF NOT EXISTS admin_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  web_customer_id UUID REFERENCES web_customers(id),
  crm_account_id UUID REFERENCES crm_accounts(id),

  stripe_invoice_id TEXT UNIQUE,
  stripe_invoice_number TEXT,
  stripe_invoice_url TEXT,
  stripe_invoice_pdf TEXT,

  amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'draft',
  billing_interval TEXT,

  crm_coupon_included BOOLEAN DEFAULT FALSE,
  crm_coupon_code TEXT,

  agent_id UUID REFERENCES admin_users(id),

  due_date DATE,
  paid_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PROCESSED WEBHOOK EVENTS
CREATE TABLE IF NOT EXISTS processed_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT UNIQUE NOT NULL,
  stripe_event_id TEXT UNIQUE,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AGENT GOALS
CREATE TABLE IF NOT EXISTS agent_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES admin_users(id) NOT NULL,
  period_type TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  deal_goal INTEGER,
  revenue_goal DECIMAL(10,2),
  retention_goal DECIMAL(5,2),
  response_time_goal INTEGER,

  deal_actual INTEGER DEFAULT 0,
  revenue_actual DECIMAL(10,2) DEFAULT 0,
  retention_actual DECIMAL(5,2),
  response_time_actual INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(agent_id, period_type, period_start)
);

-- DAILY METRICS
CREATE TABLE IF NOT EXISTS daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,

  mrr DECIMAL(10,2),
  arr DECIMAL(10,2),

  total_crm_accounts INTEGER,
  total_web_customers INTEGER,
  total_gold_customers INTEGER,
  active_trials INTEGER,

  new_customers INTEGER,
  churned_customers INTEGER,
  upgrades INTEGER,
  downgrades INTEGER,

  total_leads INTEGER,
  new_leads INTEGER,
  converted_leads INTEGER,

  commissions_pending DECIMAL(10,2),
  commissions_eligible DECIMAL(10,2),
  commissions_paid DECIMAL(10,2),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- COHORTS
CREATE TABLE IF NOT EXISTS cohorts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_month DATE NOT NULL UNIQUE,

  starting_count INTEGER,
  month_1_count INTEGER,
  month_2_count INTEGER,
  month_3_count INTEGER,
  month_6_count INTEGER,
  month_12_count INTEGER,
  current_count INTEGER,

  total_revenue DECIMAL(10,2),
  avg_ltv DECIMAL(10,2),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AGENT DAILY PERFORMANCE
CREATE TABLE IF NOT EXISTS agent_daily_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES admin_users(id) NOT NULL,
  date DATE NOT NULL,

  total_leads INTEGER,
  new_leads INTEGER,
  contacted_leads INTEGER,

  deals_closed INTEGER,
  revenue_generated DECIMAL(10,2),
  avg_deal_size DECIMAL(10,2),

  close_rate DECIMAL(5,2),
  avg_response_time_minutes INTEGER,

  active_customers INTEGER,
  churned_customers INTEGER,
  retention_rate DECIMAL(5,2),

  commission_earned DECIMAL(10,2),

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(agent_id, date)
);

-- PLAN PRICING
CREATE TABLE IF NOT EXISTS plan_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  plan_type TEXT NOT NULL,
  plan_name TEXT NOT NULL,
  plan_tier TEXT NOT NULL,
  category TEXT NOT NULL,

  monthly_price DECIMAL(10,2),
  annual_price DECIMAL(10,2),

  user_limit INTEGER DEFAULT 1,

  stripe_monthly_price_id TEXT,
  stripe_annual_price_id TEXT,

  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(plan_type)
);

-- ADMIN SESSIONS
CREATE TABLE IF NOT EXISTS admin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES admin_users(id) NOT NULL,

  token_hash TEXT NOT NULL,
  refresh_token_hash TEXT,

  ip_address TEXT,
  user_agent TEXT,

  expires_at TIMESTAMPTZ NOT NULL,
  refresh_expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SALES ATTRIBUTION LOG
CREATE TABLE IF NOT EXISTS sales_attribution_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crm_account_id UUID REFERENCES crm_accounts(id),
  web_customer_id UUID REFERENCES web_customers(id),
  attributed_to TEXT NOT NULL,
  agent_id UUID REFERENCES admin_users(id),
  created_by UUID REFERENCES admin_users(id) NOT NULL,
  sale_amount DECIMAL(10,2),
  plan_type TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AGENT SUBMISSIONS
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

-- FOUNDERS PROGRAM
CREATE TABLE IF NOT EXISTS founders_program (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  total_slots INTEGER DEFAULT 100,
  slots_used INTEGER DEFAULT 0,
  is_open BOOLEAN DEFAULT TRUE,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CRM EMAIL LOG
CREATE TABLE IF NOT EXISTS crm_email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crm_account_id UUID REFERENCES crm_accounts(id),
  email_type TEXT NOT NULL,
  sent_to TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'sent',
  metadata JSONB
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Core tables
CREATE INDEX IF NOT EXISTS idx_users_business ON users(business_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_invite_token ON users(invite_token) WHERE invite_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_email_recipients_business ON email_recipients(business_id);
CREATE INDEX IF NOT EXISTS idx_customers_business_phone ON customers(business_id, phone);
CREATE INDEX IF NOT EXISTS idx_customers_name_trgm ON customers USING GIN (name gin_trgm_ops);

-- Leads and jobs
CREATE INDEX IF NOT EXISTS idx_leads_business_status ON leads(business_id, status);
CREATE INDEX IF NOT EXISTS idx_leads_new ON leads(business_id, created_at DESC) WHERE status = 'new';
CREATE INDEX IF NOT EXISTS idx_jobs_business_date ON jobs(business_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_jobs_assigned ON jobs(assigned_to);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(business_id, status);

-- Quotes and invoices
CREATE INDEX IF NOT EXISTS idx_quotes_access_token ON quotes(access_token) WHERE access_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(business_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_access_token ON invoices(access_token) WHERE access_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(business_id, status);
CREATE INDEX IF NOT EXISTS idx_invoice_reminders_invoice ON invoice_reminders(invoice_id);

-- Reminders and automation
CREATE INDEX IF NOT EXISTS idx_reminders_due ON reminders(business_id, remind_at) WHERE completed = FALSE;
CREATE INDEX IF NOT EXISTS idx_reminders_user ON reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_reminders_scheduled ON customer_reminder_events(scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_automation_scheduled ON automation_events(scheduled_for) WHERE status = 'pending';

-- SMS
CREATE INDEX IF NOT EXISTS idx_sms_conversations_phone ON sms_conversations(business_id, phone);
CREATE INDEX IF NOT EXISTS idx_sms_conversations_human_attention ON sms_conversations(business_id, needs_human_attention) WHERE needs_human_attention = true;
CREATE INDEX IF NOT EXISTS idx_sms_templates_business ON sms_templates(business_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_status ON scheduled_messages(status, scheduled_for) WHERE status = 'pending';

-- Calendar
CREATE INDEX IF NOT EXISTS idx_team_invitations_token ON team_invitations(token);
CREATE INDEX IF NOT EXISTS idx_team_invitations_business ON team_invitations(business_id, status);
CREATE INDEX IF NOT EXISTS idx_calendar_connections_user ON calendar_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_working_hours_business ON working_hours(business_id);
CREATE INDEX IF NOT EXISTS idx_schedule_blocks_business ON schedule_blocks(business_id);

-- Service agreements
CREATE INDEX IF NOT EXISTS idx_service_agreements_next_date ON service_agreements(next_service_date) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_service_agreements_customer ON service_agreements(customer_id);

-- Equipment and warranties
CREATE INDEX IF NOT EXISTS idx_customer_equipment_customer ON customer_equipment(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_equipment_warranty ON customer_equipment(warranty_expires) WHERE warranty_expires IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_warranties_customer ON warranties(customer_id);
CREATE INDEX IF NOT EXISTS idx_warranties_expiring ON warranties(end_date) WHERE status = 'active';

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notification_logs_business ON notification_logs(business_id, sent_at DESC);

-- Activity
CREATE INDEX IF NOT EXISTS idx_customer_activity_customer ON customer_activity(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_activity_type ON customer_activity(customer_id, activity_type);

-- Time tracking
CREATE INDEX IF NOT EXISTS idx_time_entries_user ON time_entries(user_id, clock_in_at);
CREATE INDEX IF NOT EXISTS idx_time_entries_business ON time_entries(business_id, clock_in_at);
CREATE INDEX IF NOT EXISTS idx_receipts_business ON receipts(business_id, receipt_date);
CREATE INDEX IF NOT EXISTS idx_daily_routes_user ON daily_routes(user_id, route_date);
CREATE INDEX IF NOT EXISTS idx_tech_metrics_user_date ON technician_daily_metrics(user_id, metric_date);

-- Surveys
CREATE INDEX IF NOT EXISTS idx_survey_responses_customer ON survey_responses(customer_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_token ON survey_responses(access_token);

-- Custom fields
CREATE INDEX IF NOT EXISTS idx_custom_field_definitions_business ON custom_field_definitions(business_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_custom_field_values_entity ON custom_field_values(entity_type, entity_id);

-- Security
CREATE INDEX IF NOT EXISTS idx_2fa_attempts_user ON two_factor_attempts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(session_token_hash);
CREATE INDEX IF NOT EXISTS idx_security_events_user ON security_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_password_history_user ON password_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_user ON trusted_devices(user_id);

-- Admin portal
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);
CREATE INDEX IF NOT EXISTS idx_crm_accounts_email ON crm_accounts(email);
CREATE INDEX IF NOT EXISTS idx_crm_accounts_status ON crm_accounts(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_crm_accounts_agent ON crm_accounts(agent_id);
CREATE INDEX IF NOT EXISTS idx_crm_accounts_stripe ON crm_accounts(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_web_customers_email ON web_customers(email);
CREATE INDEX IF NOT EXISTS idx_web_customers_status ON web_customers(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_web_customers_agent ON web_customers(agent_id);
CREATE INDEX IF NOT EXISTS idx_crm_coupons_code ON crm_coupons(code);
CREATE INDEX IF NOT EXISTS idx_tc_leads_agent ON tc_leads(agent_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tc_leads_status ON tc_leads(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_lead_activities_lead ON lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_payment_tracking_agent ON payment_tracking(agent_id);
CREATE INDEX IF NOT EXISTS idx_payment_tracking_subscription ON payment_tracking(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_commissions_agent ON commissions(agent_id, status);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON commissions(status);
CREATE INDEX IF NOT EXISTS idx_commission_rules_lookup ON commission_rules(plan_type, billing_interval, is_active);
CREATE INDEX IF NOT EXISTS idx_retention_agent ON retention_tracking(agent_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_admin ON admin_activity_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_invoices_stripe ON admin_invoices(stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_stripe ON processed_webhook_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_event ON processed_webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_agent_performance_date ON agent_daily_performance(date);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_user ON admin_sessions(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(token_hash);

-- KB articles
CREATE INDEX IF NOT EXISTS idx_kb_articles_category ON kb_articles(category) WHERE is_published = TRUE;
CREATE INDEX IF NOT EXISTS idx_kb_articles_slug ON kb_articles(slug);
CREATE INDEX IF NOT EXISTS idx_kb_articles_search ON kb_articles USING gin(search_vector);

CREATE OR REPLACE FUNCTION kb_articles_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector(
    'english',
    coalesce(NEW.title, '') || ' ' ||
    coalesce(NEW.body, '') || ' ' ||
    coalesce(array_to_string(NEW.search_keywords, ' '), '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER kb_articles_search_vector_trigger
BEFORE INSERT OR UPDATE ON kb_articles
FOR EACH ROW EXECUTE FUNCTION kb_articles_search_vector_update();

UPDATE kb_articles SET search_vector = to_tsvector(
  'english',
  coalesce(title, '') || ' ' ||
  coalesce(body, '') || ' ' ||
  coalesce(array_to_string(search_keywords, ' '), '')
);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Apply updated_at triggers
CREATE TRIGGER update_businesses_updated_at BEFORE UPDATE ON businesses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_email_recipients_updated_at BEFORE UPDATE ON email_recipients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON quotes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_saved_services_updated_at BEFORE UPDATE ON saved_services FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sms_conversations_updated_at BEFORE UPDATE ON sms_conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sms_templates_updated_at BEFORE UPDATE ON sms_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_calendar_connections_updated_at BEFORE UPDATE ON calendar_connections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_service_agreements_updated_at BEFORE UPDATE ON service_agreements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customer_equipment_updated_at BEFORE UPDATE ON customer_equipment FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_warranties_updated_at BEFORE UPDATE ON warranties FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_checklist_templates_updated_at BEFORE UPDATE ON checklist_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_job_checklists_updated_at BEFORE UPDATE ON job_checklists FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_feature_settings_updated_at BEFORE UPDATE ON feature_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_time_entries_updated_at BEFORE UPDATE ON time_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_receipts_updated_at BEFORE UPDATE ON receipts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_daily_routes_updated_at BEFORE UPDATE ON daily_routes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_technician_daily_metrics_updated_at BEFORE UPDATE ON technician_daily_metrics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_custom_field_definitions_updated_at BEFORE UPDATE ON custom_field_definitions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON email_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_kb_articles_updated_at BEFORE UPDATE ON kb_articles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_admin_users_updated_at BEFORE UPDATE ON admin_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_crm_accounts_updated_at BEFORE UPDATE ON crm_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_web_customers_updated_at BEFORE UPDATE ON web_customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payment_tracking_updated_at BEFORE UPDATE ON payment_tracking FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_commissions_updated_at BEFORE UPDATE ON commissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_commission_rules_updated_at BEFORE UPDATE ON commission_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_retention_tracking_updated_at BEFORE UPDATE ON retention_tracking FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_admin_invoices_updated_at BEFORE UPDATE ON admin_invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_agent_goals_updated_at BEFORE UPDATE ON agent_goals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cohorts_updated_at BEFORE UPDATE ON cohorts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_plan_pricing_updated_at BEFORE UPDATE ON plan_pricing FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_agent_submissions_updated_at BEFORE UPDATE ON agent_submissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- CUSTOM FUNCTIONS
-- =====================================================

-- Update conversation activity
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

-- Update customer stats
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

-- Calculate time entry duration
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

-- Increment AI response count
CREATE OR REPLACE FUNCTION increment_ai_response_count(conv_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE sms_conversations
  SET ai_response_count = COALESCE(ai_response_count, 0) + 1,
      updated_at = NOW()
  WHERE id = conv_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper functions for RLS
CREATE OR REPLACE FUNCTION get_user_business_id()
RETURNS UUID AS $$
  SELECT business_id FROM users WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM users WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_id()
RETURNS UUID AS $$
  SELECT id FROM users WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Cleanup functions
CREATE OR REPLACE FUNCTION cleanup_expired_2fa_attempts()
RETURNS void AS $$
BEGIN
  DELETE FROM two_factor_attempts
  WHERE expires_at < NOW() - INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  UPDATE user_sessions
  SET is_active = false, ended_reason = 'expired'
  WHERE is_active = true
  AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SEED DATA
-- =====================================================

-- Equipment types
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

-- Commission rules
INSERT INTO commission_rules (plan_type, plan_tier, billing_interval, upfront_amount, retention_enabled) VALUES
('blue_starter', 'individual', 'month', 20, TRUE),
('blue_pro', 'individual', 'month', 50, TRUE),
('blue_enterprise', 'individual', 'month', 100, TRUE),
('blue_starter', 'individual', 'year', NULL, FALSE),
('blue_pro', 'individual', 'year', NULL, FALSE),
('blue_enterprise', 'individual', 'year', NULL, FALSE),
('blue_starter_teams', 'teams', 'month', 75, TRUE),
('blue_pro_teams', 'teams', 'month', 100, TRUE),
('blue_enterprise_teams', 'teams', 'month', 200, TRUE),
('blue_starter_teams', 'teams', 'year', NULL, FALSE),
('blue_pro_teams', 'teams', 'year', NULL, FALSE),
('blue_enterprise_teams', 'teams', 'year', NULL, FALSE),
('web_starter', 'individual', 'month', 50, TRUE),
('web_pro', 'individual', 'month', 100, TRUE),
('web_enterprise', 'individual', 'month', 150, TRUE),
('web_starter', 'individual', 'year', NULL, FALSE),
('web_pro', 'individual', 'year', NULL, FALSE),
('web_enterprise', 'individual', 'year', NULL, FALSE),
('web_full_custom', 'custom', 'custom', NULL, FALSE),
('gold_starter', 'individual', 'month', 100, TRUE),
('gold_pro', 'individual', 'month', 200, TRUE),
('gold_enterprise', 'individual', 'month', 300, TRUE),
('gold_starter', 'individual', 'year', NULL, FALSE),
('gold_pro', 'individual', 'year', NULL, FALSE),
('gold_enterprise', 'individual', 'year', NULL, FALSE),
('gold_starter_teams', 'teams', 'month', 150, TRUE),
('gold_pro_teams', 'teams', 'month', 225, TRUE),
('gold_enterprise_teams', 'teams', 'month', 375, TRUE),
('gold_starter_teams', 'teams', 'year', NULL, FALSE),
('gold_pro_teams', 'teams', 'year', NULL, FALSE),
('gold_enterprise_teams', 'teams', 'year', NULL, FALSE),
('gold_custom', 'custom', 'custom', NULL, FALSE),
('extra_location', 'addon', 'month', 75, FALSE),
('extra_location', 'addon', 'year', NULL, FALSE)
ON CONFLICT (plan_type, billing_interval, version) DO NOTHING;

-- Plan pricing
INSERT INTO plan_pricing (plan_type, plan_name, plan_tier, category, monthly_price, annual_price, user_limit) VALUES
('blue_starter', 'Blue Starter', 'individual', 'crm', 49, 441, 1),
('blue_pro', 'Blue Pro', 'individual', 'crm', 99, 891, 1),
('blue_enterprise', 'Blue Enterprise', 'individual', 'crm', 199, 1791, 1),
('blue_starter_teams', 'Blue Starter Teams', 'teams', 'crm', 149, 1341, 5),
('blue_pro_teams', 'Blue Pro Teams', 'teams', 'crm', 199, 1791, 10),
('blue_enterprise_teams', 'Blue Enterprise Teams', 'teams', 'crm', 399, 3591, 20),
('web_starter', 'Web Starter', 'individual', 'web', 149, 1341, 1),
('web_pro', 'Web Pro', 'individual', 'web', 249, 2241, 1),
('web_enterprise', 'Web Enterprise', 'individual', 'web', 349, 3141, 1),
('web_full_custom', 'Web Full Custom', 'custom', 'web', NULL, NULL, 1),
('gold_starter', 'Gold Starter', 'individual', 'gold', 199, 1791, 1),
('gold_pro', 'Gold Pro', 'individual', 'gold', 349, 3141, 1),
('gold_enterprise', 'Gold Enterprise', 'individual', 'gold', 499, 4491, 1),
('gold_starter_teams', 'Gold Starter Teams', 'teams', 'gold', 299, 2691, 5),
('gold_pro_teams', 'Gold Pro Teams', 'teams', 'gold', 449, 4041, 10),
('gold_enterprise_teams', 'Gold Enterprise Teams', 'teams', 'gold', 749, 6741, 20),
('gold_custom', 'Gold Custom', 'custom', 'gold', NULL, NULL, 1),
('extra_location', 'Extra Location', 'addon', 'addon', 199, 1791, 0)
ON CONFLICT (plan_type) DO NOTHING;

-- =====================================================
-- SCHEMA COMPLETE
-- Total: 100+ tables, comprehensive CRM + Admin Portal
-- =====================================================
