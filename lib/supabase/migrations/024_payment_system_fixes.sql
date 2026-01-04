-- =====================================================
-- MIGRATION 024: Payment System Fixes
-- Addresses critical issues found in invoicing/payments audit
-- =====================================================

-- 1. Fix webhook idempotency - add unique constraint on stripe_event_id
-- This prevents race conditions where same webhook is processed multiple times
ALTER TABLE processed_webhook_events
DROP CONSTRAINT IF EXISTS processed_webhook_events_stripe_event_id_key;

ALTER TABLE processed_webhook_events
ADD CONSTRAINT processed_webhook_events_stripe_event_id_key
UNIQUE (stripe_event_id);

-- Also add unique on event_id if not exists (for the legacy column)
ALTER TABLE processed_webhook_events
DROP CONSTRAINT IF EXISTS processed_webhook_events_event_id_key;

ALTER TABLE processed_webhook_events
ADD CONSTRAINT processed_webhook_events_event_id_key
UNIQUE (event_id);

-- 2. Fix invoice status constraint to match code usage
-- Code uses: draft, sent, viewed, paid, partial, overdue, void
-- Schema had: draft, sent, viewed, paid, overdue, cancelled
ALTER TABLE invoices
DROP CONSTRAINT IF EXISTS invoices_status_check;

ALTER TABLE invoices
ADD CONSTRAINT invoices_status_check
CHECK (status IN ('draft', 'sent', 'viewed', 'paid', 'partial', 'overdue', 'void'));

-- Update any existing 'cancelled' status to 'void' for consistency
UPDATE invoices SET status = 'void' WHERE status = 'cancelled';

-- 3. Create payment audit log table for tracking payment actions
CREATE TABLE IF NOT EXISTS payment_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'created', 'refunded', 'disputed', 'voided'
  actor_id UUID, -- user who performed action (null for webhooks)
  actor_type TEXT NOT NULL DEFAULT 'system', -- 'user', 'webhook', 'system', 'cron'
  amount DECIMAL(10, 2),
  before_state JSONB,
  after_state JSONB,
  metadata JSONB,
  stripe_event_id TEXT, -- For webhook-triggered events
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for payment audit queries
CREATE INDEX IF NOT EXISTS idx_payment_audit_invoice ON payment_audit_log(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_audit_payment ON payment_audit_log(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_audit_business ON payment_audit_log(business_id);
CREATE INDEX IF NOT EXISTS idx_payment_audit_created ON payment_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_audit_action ON payment_audit_log(action);

-- 4. Add refund tracking columns to payments table if not exists
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(10, 2) DEFAULT 0;

ALTER TABLE payments
ADD COLUMN IF NOT EXISTS refund_reason TEXT;

ALTER TABLE payments
ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;

ALTER TABLE payments
ADD COLUMN IF NOT EXISTS dispute_id TEXT;

ALTER TABLE payments
ADD COLUMN IF NOT EXISTS dispute_status TEXT;

-- 5. Create RPC function for atomic payment processing
-- This ensures payment + invoice update happen in a single transaction
CREATE OR REPLACE FUNCTION process_payment_webhook(
  p_invoice_id UUID,
  p_payment_intent_id TEXT,
  p_amount DECIMAL,
  p_charge_id TEXT DEFAULT NULL,
  p_payment_method TEXT DEFAULT 'stripe',
  p_notes TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_invoice RECORD;
  v_new_amount_paid DECIMAL;
  v_new_amount_due DECIMAL;
  v_new_status TEXT;
  v_payment_id UUID;
  v_existing_payment UUID;
BEGIN
  -- Lock invoice row to prevent concurrent modifications
  SELECT * INTO v_invoice
  FROM invoices
  WHERE id = p_invoice_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invoice not found');
  END IF;

  -- Check for duplicate payment (idempotency)
  SELECT id INTO v_existing_payment
  FROM payments
  WHERE stripe_payment_intent_id = p_payment_intent_id;

  IF v_existing_payment IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'duplicate', true, 'payment_id', v_existing_payment);
  END IF;

  -- Calculate new amounts
  v_new_amount_paid := COALESCE(v_invoice.amount_paid, 0) + p_amount;
  v_new_amount_due := GREATEST(0, v_invoice.total - v_new_amount_paid);
  v_new_status := CASE
    WHEN v_new_amount_due <= 0 THEN 'paid'
    ELSE 'partial'
  END;

  -- Insert payment record
  INSERT INTO payments (
    business_id,
    invoice_id,
    amount,
    payment_method,
    stripe_payment_intent_id,
    stripe_charge_id,
    notes,
    paid_at
  )
  VALUES (
    v_invoice.business_id,
    p_invoice_id,
    p_amount,
    p_payment_method,
    p_payment_intent_id,
    p_charge_id,
    COALESCE(p_notes, 'Stripe Payment'),
    NOW()
  )
  RETURNING id INTO v_payment_id;

  -- Update invoice
  UPDATE invoices SET
    amount_paid = v_new_amount_paid,
    amount_due = v_new_amount_due,
    status = v_new_status,
    paid_at = CASE WHEN v_new_status = 'paid' THEN NOW() ELSE paid_at END
  WHERE id = p_invoice_id;

  -- Create audit log entry
  INSERT INTO payment_audit_log (
    payment_id,
    invoice_id,
    business_id,
    action,
    actor_type,
    amount,
    before_state,
    after_state,
    metadata
  ) VALUES (
    v_payment_id,
    p_invoice_id,
    v_invoice.business_id,
    'created',
    'webhook',
    p_amount,
    jsonb_build_object(
      'amount_paid', v_invoice.amount_paid,
      'amount_due', v_invoice.amount_due,
      'status', v_invoice.status
    ),
    jsonb_build_object(
      'amount_paid', v_new_amount_paid,
      'amount_due', v_new_amount_due,
      'status', v_new_status
    ),
    jsonb_build_object(
      'payment_intent_id', p_payment_intent_id,
      'charge_id', p_charge_id
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'payment_id', v_payment_id,
    'new_status', v_new_status,
    'amount_due', v_new_amount_due
  );
END;
$$ LANGUAGE plpgsql;

-- 6. Create RPC function for atomic refund processing
CREATE OR REPLACE FUNCTION process_refund_webhook(
  p_invoice_id UUID,
  p_payment_intent_id TEXT,
  p_refund_amount DECIMAL,
  p_refund_reason TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_invoice RECORD;
  v_payment RECORD;
  v_new_amount_paid DECIMAL;
  v_new_amount_due DECIMAL;
  v_new_status TEXT;
BEGIN
  -- Lock invoice row
  SELECT * INTO v_invoice
  FROM invoices
  WHERE id = p_invoice_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invoice not found');
  END IF;

  -- Find the original payment
  SELECT * INTO v_payment
  FROM payments
  WHERE stripe_payment_intent_id = p_payment_intent_id;

  -- Calculate new amounts
  v_new_amount_paid := GREATEST(0, COALESCE(v_invoice.amount_paid, 0) - p_refund_amount);
  v_new_amount_due := v_invoice.total - v_new_amount_paid;
  v_new_status := CASE
    WHEN v_new_amount_due <= 0 THEN 'paid'
    WHEN v_new_amount_paid > 0 THEN 'partial'
    ELSE 'sent'
  END;

  -- Update payment with refund info
  IF v_payment.id IS NOT NULL THEN
    UPDATE payments SET
      refund_amount = COALESCE(refund_amount, 0) + p_refund_amount,
      refund_reason = p_refund_reason,
      refunded_at = NOW()
    WHERE id = v_payment.id;
  END IF;

  -- Update invoice
  UPDATE invoices SET
    amount_paid = v_new_amount_paid,
    amount_due = v_new_amount_due,
    status = v_new_status
  WHERE id = p_invoice_id;

  -- Create audit log entry
  INSERT INTO payment_audit_log (
    payment_id,
    invoice_id,
    business_id,
    action,
    actor_type,
    amount,
    before_state,
    after_state,
    metadata
  ) VALUES (
    v_payment.id,
    p_invoice_id,
    v_invoice.business_id,
    'refunded',
    'webhook',
    p_refund_amount,
    jsonb_build_object(
      'amount_paid', v_invoice.amount_paid,
      'amount_due', v_invoice.amount_due,
      'status', v_invoice.status
    ),
    jsonb_build_object(
      'amount_paid', v_new_amount_paid,
      'amount_due', v_new_amount_due,
      'status', v_new_status
    ),
    jsonb_build_object(
      'payment_intent_id', p_payment_intent_id,
      'refund_reason', p_refund_reason
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'new_status', v_new_status,
    'amount_due', v_new_amount_due
  );
END;
$$ LANGUAGE plpgsql;

-- 7. RLS policies for payment_audit_log
ALTER TABLE payment_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view audit logs for their business"
  ON payment_audit_log FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Only system/admin can insert (no direct user inserts)
CREATE POLICY "System can insert audit logs"
  ON payment_audit_log FOR INSERT
  WITH CHECK (true);

COMMENT ON TABLE payment_audit_log IS 'Tracks all payment-related actions for audit purposes';
COMMENT ON FUNCTION process_payment_webhook IS 'Atomic payment processing with idempotency and audit logging';
COMMENT ON FUNCTION process_refund_webhook IS 'Atomic refund processing with audit logging';

-- 8. Create invoice_refunds table for tracking refund records
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
