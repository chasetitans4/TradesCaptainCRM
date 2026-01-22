-- =====================================================
-- MIGRATION 025: Invoice Refunds Table
-- Creates table for tracking refund records
-- =====================================================

-- Create invoice_refunds table for tracking refund records
CREATE TABLE IF NOT EXISTS invoice_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  stripe_refund_id TEXT,
  amount DECIMAL(10, 2) NOT NULL,
  reason TEXT NOT NULL DEFAULT 'requested_by_customer',
  notes TEXT,
  refunded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for refund queries
CREATE INDEX IF NOT EXISTS idx_invoice_refunds_invoice ON invoice_refunds(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_refunds_payment ON invoice_refunds(payment_id);
CREATE INDEX IF NOT EXISTS idx_invoice_refunds_stripe ON invoice_refunds(stripe_refund_id);
CREATE INDEX IF NOT EXISTS idx_invoice_refunds_created ON invoice_refunds(created_at DESC);

-- Add reason check constraint
ALTER TABLE invoice_refunds
DROP CONSTRAINT IF EXISTS invoice_refunds_reason_check;

ALTER TABLE invoice_refunds
ADD CONSTRAINT invoice_refunds_reason_check
CHECK (reason IN ('duplicate', 'fraudulent', 'requested_by_customer', 'other'));

-- RLS policies for invoice_refunds
ALTER TABLE invoice_refunds ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running migration)
DROP POLICY IF EXISTS "Users can view refunds for their business invoices" ON invoice_refunds;
DROP POLICY IF EXISTS "Users can create refunds for their business invoices" ON invoice_refunds;

CREATE POLICY "Users can view refunds for their business invoices"
  ON invoice_refunds FOR SELECT
  USING (
    invoice_id IN (
      SELECT i.id FROM invoices i
      JOIN profiles p ON p.business_id = i.business_id
      WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "Users can create refunds for their business invoices"
  ON invoice_refunds FOR INSERT
  WITH CHECK (
    invoice_id IN (
      SELECT i.id FROM invoices i
      JOIN profiles p ON p.business_id = i.business_id
      WHERE p.id = auth.uid()
    )
  );

COMMENT ON TABLE invoice_refunds IS 'Tracks refund history for invoices';
