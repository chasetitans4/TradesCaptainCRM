-- Remove Founders Program related tables and columns

-- 1. Drop the founders_program table if it exists
DROP TABLE IF EXISTS founders_program;

-- 2. Remove columns from crm_accounts
ALTER TABLE crm_accounts 
DROP COLUMN IF EXISTS is_founders,
DROP COLUMN IF EXISTS founders_start_date,
DROP COLUMN IF EXISTS founders_end_date,
DROP COLUMN IF EXISTS founders_slot_number;

-- 3. Drop the index if it exists (dropping the column should handle this, but for safety/cleanup scripts it's fine)
DROP INDEX IF EXISTS idx_crm_accounts_founders_end;
