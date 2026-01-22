-- =====================================================
-- MIGRATION 030: Portal Notifications
-- Adds table for in-app notifications
-- =====================================================

CREATE TABLE IF NOT EXISTS portal_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'invoice', 'quote', 'appointment', 'message', 'system'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  data JSONB, -- For linking to specific resources (invoice_id, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portal_notifications_customer ON portal_notifications(customer_id, business_id);
CREATE INDEX IF NOT EXISTS idx_portal_notifications_unread ON portal_notifications(customer_id, read) WHERE read = false;

COMMENT ON TABLE portal_notifications IS 'In-app notifications for customer portal users';
