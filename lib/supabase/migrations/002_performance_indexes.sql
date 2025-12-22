-- =============================================
-- PERFORMANCE OPTIMIZATION INDEXES
-- Run this migration to improve query performance
-- =============================================

-- Enable trigram extension for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =============================================
-- CUSTOMERS TABLE
-- =============================================
CREATE INDEX IF NOT EXISTS idx_customers_business_active
  ON customers(business_id) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_customers_phone
  ON customers(business_id, phone);

CREATE INDEX IF NOT EXISTS idx_customers_email
  ON customers(business_id, email);

-- Trigram index for fuzzy name search
CREATE INDEX IF NOT EXISTS idx_customers_name_trgm
  ON customers USING GIN (name gin_trgm_ops);

-- =============================================
-- JOBS TABLE
-- =============================================
CREATE INDEX IF NOT EXISTS idx_jobs_scheduled_date
  ON jobs(business_id, scheduled_date)
  WHERE status IN ('scheduled', 'in_progress');

CREATE INDEX IF NOT EXISTS idx_jobs_assigned_user_date
  ON jobs(assigned_to, scheduled_date, status);

CREATE INDEX IF NOT EXISTS idx_jobs_customer
  ON jobs(customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_jobs_status
  ON jobs(business_id, status);

CREATE INDEX IF NOT EXISTS idx_jobs_unassigned
  ON jobs(business_id, scheduled_date)
  WHERE assigned_to IS NULL AND status = 'scheduled';

-- =============================================
-- LEADS TABLE
-- =============================================
CREATE INDEX IF NOT EXISTS idx_leads_new
  ON leads(business_id, created_at DESC) WHERE status = 'new';

CREATE INDEX IF NOT EXISTS idx_leads_follow_up
  ON leads(business_id, follow_up_date)
  WHERE status IN ('new', 'contacted', 'qualified');

-- =============================================
-- QUOTES TABLE
-- =============================================
CREATE INDEX IF NOT EXISTS idx_quotes_customer
  ON quotes(customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_quotes_status
  ON quotes(business_id, status);

CREATE INDEX IF NOT EXISTS idx_quotes_pending
  ON quotes(business_id, created_at DESC)
  WHERE status IN ('draft', 'sent');

-- =============================================
-- INVOICES TABLE
-- =============================================
CREATE INDEX IF NOT EXISTS idx_invoices_unpaid
  ON invoices(business_id, due_date)
  WHERE status IN ('sent', 'overdue');

CREATE INDEX IF NOT EXISTS idx_invoices_customer
  ON invoices(customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_invoices_overdue
  ON invoices(business_id, due_date)
  WHERE status = 'overdue';

-- =============================================
-- MESSAGES TABLE
-- =============================================
CREATE INDEX IF NOT EXISTS idx_messages_conversation
  ON messages(business_id, customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_unread
  ON messages(business_id, customer_id)
  WHERE direction = 'inbound' AND read_at IS NULL;

-- =============================================
-- ACTIVITY / AUDIT
-- =============================================
CREATE INDEX IF NOT EXISTS idx_customer_activity_timeline
  ON customer_activity(customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_customer_activity_business
  ON customer_activity(business_id, created_at DESC);

-- =============================================
-- NOTIFICATIONS
-- =============================================
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications(user_id, created_at DESC)
  WHERE is_read = false;

-- =============================================
-- SERVICE AGREEMENTS
-- =============================================
CREATE INDEX IF NOT EXISTS idx_agreements_active
  ON service_agreements(business_id, next_service_date)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_agreements_customer
  ON service_agreements(customer_id, status);

-- =============================================
-- SURVEYS
-- =============================================
CREATE INDEX IF NOT EXISTS idx_surveys_pending
  ON survey_responses(business_id, sent_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_surveys_token
  ON survey_responses(access_token);

-- =============================================
-- WARRANTIES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_warranties_expiring
  ON warranties(business_id, end_date)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_warranties_customer
  ON warranties(customer_id, status);

-- =============================================
-- EQUIPMENT
-- =============================================
CREATE INDEX IF NOT EXISTS idx_equipment_customer
  ON customer_equipment(customer_id, status);

CREATE INDEX IF NOT EXISTS idx_equipment_warranty_expiring
  ON customer_equipment(business_id, warranty_expiration)
  WHERE status = 'active';

-- =============================================
-- DOCUMENTS
-- =============================================
CREATE INDEX IF NOT EXISTS idx_documents_entity
  ON documents(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_documents_expiring
  ON documents(business_id, expiration_date)
  WHERE expiration_date IS NOT NULL;

-- =============================================
-- TECHNICIAN METRICS
-- =============================================
CREATE INDEX IF NOT EXISTS idx_tech_metrics_date
  ON technician_daily_metrics(technician_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_tech_metrics_business
  ON technician_daily_metrics(business_id, date DESC);

-- =============================================
-- CUSTOM FIELDS
-- =============================================
CREATE INDEX IF NOT EXISTS idx_custom_field_values_entity
  ON custom_field_values(entity_type, entity_id);

-- =============================================
-- ANALYZE TABLES
-- Run ANALYZE to update query planner statistics
-- =============================================
ANALYZE customers;
ANALYZE jobs;
ANALYZE leads;
ANALYZE quotes;
ANALYZE invoices;
ANALYZE messages;
ANALYZE customer_activity;
ANALYZE notifications;
ANALYZE service_agreements;
ANALYZE survey_responses;
ANALYZE warranties;
ANALYZE customer_equipment;
ANALYZE documents;
ANALYZE technician_daily_metrics;
ANALYZE custom_field_values;
