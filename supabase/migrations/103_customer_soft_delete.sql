-- Migration: Add soft-delete support to customers table
-- This allows customers to be deleted with a 14-day recovery window

-- Add deleted_at column for soft delete
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Create partial index for faster queries on non-deleted customers
-- This optimizes the common case where we filter by business_id and exclude deleted
CREATE INDEX IF NOT EXISTS idx_customers_not_deleted
ON customers(business_id, created_at DESC)
WHERE deleted_at IS NULL;

-- Create index for trash view (finding deleted customers within recovery window)
CREATE INDEX IF NOT EXISTS idx_customers_deleted_recovery
ON customers(business_id, deleted_at DESC)
WHERE deleted_at IS NOT NULL;

-- Add a comment explaining the soft-delete pattern
COMMENT ON COLUMN customers.deleted_at IS 'Soft delete timestamp. Customers with non-null deleted_at are hidden from normal queries and permanently deleted after 14 days.';
