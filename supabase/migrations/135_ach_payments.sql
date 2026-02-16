-- =====================================================
-- ACH PAYMENTS SUPPORT
-- Migration 135: Add ACH payment columns to invoices
--
-- Purpose: Support bank transfer payments via Stripe ACH
-- Part of Sales Unblocker Add-On
-- =====================================================

-- Add ACH-specific columns to invoices table
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS ach_payment_intent_id TEXT,
ADD COLUMN IF NOT EXISTS ach_payment_status TEXT,
ADD COLUMN IF NOT EXISTS amount DECIMAL(10,2);

-- Update status CHECK constraint to include new ACH statuses
-- First drop the old constraint if it exists
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;

-- Add updated constraint with ACH processing status
ALTER TABLE invoices ADD CONSTRAINT invoices_status_check
CHECK (status IN (
  'draft',
  'sent',
  'viewed',
  'paid',
  'overdue',
  'cancelled',
  'processing',  -- ACH payment processing
  'failed'       -- Payment failed
));

-- Add index for ACH payment lookups
CREATE INDEX IF NOT EXISTS idx_invoices_ach_payment_intent
ON invoices(ach_payment_intent_id)
WHERE ach_payment_intent_id IS NOT NULL;

-- Add column comment
COMMENT ON COLUMN invoices.ach_payment_intent_id IS 'Stripe PaymentIntent ID for ACH bank transfer payments';
COMMENT ON COLUMN invoices.ach_payment_status IS 'ACH payment status: processing, succeeded, failed';

-- =====================================================
-- Add payment_method options documentation
-- Valid values:
-- - 'card' - Credit/debit card via Stripe
-- - 'ACH' - Bank transfer via Stripe ACH
-- - 'cash' - Cash payment
-- - 'check' - Check payment
-- =====================================================
