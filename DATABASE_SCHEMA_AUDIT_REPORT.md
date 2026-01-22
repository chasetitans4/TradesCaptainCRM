# Database Schema Audit Report

**Project:** TradesCaptain CRM
**Database:** Supabase (PostgreSQL 15)
**Audit Date:** 2026-01-22
**Auditor:** Claude Code

---

## Executive Summary

This audit identified **2 critical missing tables**, **several column naming inconsistencies**, and **1 unapplied migration** that could cause runtime errors or migration failures. The issues stem from schema drift between the main `supabase/migrations/` directory and the secondary `lib/supabase/migrations/` directory, as well as code expecting tables/columns that don't exist in the database.

### Severity Summary

| Severity | Count | Description |
|----------|-------|-------------|
| **CRITICAL** | 2 | Missing tables referenced in foreign keys and code |
| **HIGH** | 1 | Unapplied migration from lib/supabase/migrations |
| **MEDIUM** | 5 | Column naming inconsistencies (fix scripts exist) |
| **LOW** | 1 | Empty TypeScript types file |

---

## Critical Issues

### 1. Missing `profiles` Table (CRITICAL)

**Impact:** Migration failures, foreign key errors, runtime errors

The `profiles` table is referenced in multiple locations but is **never created** in any migration file:

**Foreign Key References:**
- `supabase/migrations/025_invoice_refunds_table.sql:15` - `REFERENCES profiles(id)`
- `supabase/migrations/024_payment_system_fixes.sql:320` - `REFERENCES profiles(id)`

**RLS Policy References:**
- `025_invoice_refunds_table.sql:45` - `JOIN profiles p ON p.business_id`
- `024_payment_system_fixes.sql:298` - `SELECT business_id FROM profiles WHERE id = auth.uid()`

**Code References:**
- `lib/metrics/technician.ts:180` - `.from('profiles').select('full_name')`
- `lib/cache/strategies.ts:22` - `.from('profiles')`
- `lib/onboarding/prerequisites.ts:162` - `.from('profiles')`
- `lib/stripe/webhooks.ts:199,281` - `.from('profiles')`
- `lib/queue/workers.ts:100` - `.from('profiles')`

**Analysis:** Based on usage patterns, `profiles` appears to be intended as an alias or view for the `users` table, with columns: `id`, `full_name`, `business_id`.

---

### 2. Missing `activity_log` Table (CRITICAL)

**Impact:** Runtime errors when consent state machine or rescheduling features are used

The `activity_log` table is defined in `lib/supabase/migrations/011_quick_wins_phase4.sql` but this migration is **NOT in the main `supabase/migrations/` directory**.

**Code References:**
- `lib/consent/state-machine.ts:394` - `supabase.from('activity_log').insert(...)`
- `app/api/portal/appointments/[id]/reschedule/route.ts:86` - `.from('activity_log')`

**Note:** This is different from `admin_activity_log` and `portal_activity_log` which ARE defined.

---

## High Priority Issues

### 3. Unapplied Migration: `011_quick_wins_phase4.sql`

**Location:** `lib/supabase/migrations/011_quick_wins_phase4.sql`

This migration exists in the secondary migrations directory but has no equivalent in `supabase/migrations/`. It includes:
- `activity_log` table creation
- `jobs` table column additions (`metadata`)
- `quotes` table columns (`discount_amount`, `customer_notes`)
- `invoices` table columns (`discount_amount`, `customer_notes`)
- `quote_items` table columns (`saved_service_id`, `is_taxable`)
- `invoice_items` table columns (`saved_service_id`, `is_taxable`)
- `business_revenue_stats` view

---

## Medium Priority Issues (Fix Scripts Exist)

### 4. Column Naming Inconsistencies

These issues have existing fix scripts in `supabase/scripts/`:

| Table | Old Column | Expected Column | Fix Script |
|-------|-----------|-----------------|------------|
| `jobs` | `assigned_to` | `assigned_user_id` | `complete_schema_sync.sql` |
| `referral_programs` | `terms_conditions` | `terms_and_conditions` | `fix_schema_tables.sql` |
| `referral_programs` | `referrer_reward_value` | `referrer_reward_amount` | `fix_schema_tables.sql` |
| `maintenance_reminders` | `next_due_date` | `due_date` | `complete_schema_sync.sql` |
| `customer_referrals` | - | `referral_code` (may be missing) | `fix_schema_tables.sql` |

---

## Low Priority Issues

### 5. Empty TypeScript Types File

**File:** `lib/supabase/database.types.ts`

The generated TypeScript types file is empty (1 line), meaning there's no type safety for database operations. This should be regenerated using:

```bash
supabase gen types typescript --local > lib/supabase/database.types.ts
```

---

## DDL Statements for Missing Elements

### Fix 1: Create `profiles` View (Recommended Approach)

Since the code expects `profiles` with the same structure as `users`, creating a view is the safest approach:

```sql
-- =====================================================
-- FIX: Create profiles view as alias for users table
-- This resolves foreign key and code compatibility issues
-- =====================================================

-- Create the profiles view
CREATE OR REPLACE VIEW profiles AS
SELECT
  id,
  email,
  name AS full_name,
  phone,
  avatar_url,
  business_id,
  role,
  notification_settings,
  created_at,
  updated_at
FROM users;

-- Grant permissions
GRANT SELECT ON profiles TO authenticated;
GRANT SELECT ON profiles TO service_role;

-- Note: For the foreign key in invoice_refunds, we need to modify it
-- to reference users(id) instead of profiles(id)
```

**Alternative: Create profiles as a table (if view doesn't satisfy FK):**

```sql
-- If foreign keys require an actual table, create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  full_name TEXT,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Populate from existing users data
INSERT INTO profiles (id, full_name, business_id, created_at, updated_at)
SELECT id, name, business_id, created_at, updated_at
FROM users
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  business_id = EXCLUDED.business_id,
  updated_at = NOW();

-- Create trigger to keep in sync
CREATE OR REPLACE FUNCTION sync_profiles_from_users()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, business_id, created_at, updated_at)
  VALUES (NEW.id, NEW.name, NEW.business_id, NEW.created_at, NEW.updated_at)
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    business_id = EXCLUDED.business_id,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_profiles_trigger ON users;
CREATE TRIGGER sync_profiles_trigger
AFTER INSERT OR UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION sync_profiles_from_users();

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view profiles in their business"
  ON profiles FOR SELECT
  USING (business_id IN (SELECT business_id FROM users WHERE id = auth.uid()));
```

---

### Fix 2: Create `activity_log` Table

```sql
-- =====================================================
-- FIX: Create activity_log table
-- From: lib/supabase/migrations/011_quick_wins_phase4.sql
-- =====================================================

CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id), -- Nullable for system/customer actions

  entity_type TEXT NOT NULL, -- 'job', 'quote', 'invoice', etc.
  entity_id UUID NOT NULL,

  action TEXT NOT NULL, -- 'created', 'updated', 'deleted', 'reschedule_requested', etc.
  description TEXT,
  metadata JSONB, -- For storing extra details like reschedule reason, previous values

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_activity_log_business ON activity_log(business_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON activity_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at DESC);

-- RLS
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view activity for their business" ON activity_log;
CREATE POLICY "Users can view activity for their business" ON activity_log
  FOR SELECT USING (
    business_id IN (SELECT business_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "System can insert activity" ON activity_log;
CREATE POLICY "System can insert activity" ON activity_log
  FOR INSERT WITH CHECK (true); -- Allow all inserts (controlled by API logic)

DROP POLICY IF EXISTS "Service role full access" ON activity_log;
CREATE POLICY "Service role full access" ON activity_log
  FOR ALL USING (auth.role() = 'service_role');

-- Grants
GRANT SELECT, INSERT ON activity_log TO authenticated;
GRANT ALL ON activity_log TO service_role;
```

---

### Fix 3: Apply Missing Column Additions

```sql
-- =====================================================
-- FIX: Apply missing columns from 011_quick_wins_phase4.sql
-- =====================================================

-- Jobs table
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Quotes table
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS customer_notes TEXT;

-- Invoices table
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS customer_notes TEXT;

-- Quote items table
ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS saved_service_id UUID REFERENCES saved_services(id) ON DELETE SET NULL;
ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS is_taxable BOOLEAN DEFAULT TRUE;

-- Invoice items table
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS saved_service_id UUID REFERENCES saved_services(id) ON DELETE SET NULL;
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS is_taxable BOOLEAN DEFAULT TRUE;
```

---

### Fix 4: Fix invoice_refunds Foreign Key

```sql
-- =====================================================
-- FIX: Update invoice_refunds foreign key to reference users instead of profiles
-- =====================================================

-- Option A: If using profiles view/table
-- No changes needed if profiles is created

-- Option B: Change FK to reference users directly
ALTER TABLE invoice_refunds
  DROP CONSTRAINT IF EXISTS invoice_refunds_refunded_by_fkey;

ALTER TABLE invoice_refunds
  ADD CONSTRAINT invoice_refunds_refunded_by_fkey
  FOREIGN KEY (refunded_by) REFERENCES users(id) ON DELETE SET NULL;

-- Update RLS policies to use users instead of profiles
DROP POLICY IF EXISTS "Users can view refunds for their business invoices" ON invoice_refunds;
CREATE POLICY "Users can view refunds for their business invoices"
  ON invoice_refunds FOR SELECT
  USING (
    invoice_id IN (
      SELECT i.id FROM invoices i
      JOIN users u ON u.business_id = i.business_id
      WHERE u.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create refunds for their business invoices" ON invoice_refunds;
CREATE POLICY "Users can create refunds for their business invoices"
  ON invoice_refunds FOR INSERT
  WITH CHECK (
    invoice_id IN (
      SELECT i.id FROM invoices i
      JOIN users u ON u.business_id = i.business_id
      WHERE u.id = auth.uid()
    )
  );
```

---

## Complete Migration Script

Save this as `supabase/migrations/119_schema_audit_fixes.sql`:

```sql
-- =====================================================
-- SCHEMA AUDIT FIXES
-- Migration: 119_schema_audit_fixes.sql
-- Purpose: Fix missing tables and columns identified in audit
-- Date: 2026-01-22
-- =====================================================

BEGIN;

-- =====================================================
-- 1. CREATE PROFILES VIEW
-- =====================================================
CREATE OR REPLACE VIEW profiles AS
SELECT
  id,
  email,
  name AS full_name,
  phone,
  avatar_url,
  business_id,
  role,
  notification_settings,
  created_at,
  updated_at
FROM users;

GRANT SELECT ON profiles TO authenticated;
GRANT SELECT ON profiles TO service_role;

-- =====================================================
-- 2. CREATE ACTIVITY_LOG TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_business ON activity_log(business_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON activity_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at DESC);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view activity for their business" ON activity_log;
CREATE POLICY "Users can view activity for their business" ON activity_log
  FOR SELECT USING (
    business_id IN (SELECT business_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "System can insert activity" ON activity_log;
CREATE POLICY "System can insert activity" ON activity_log
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access activity_log" ON activity_log;
CREATE POLICY "Service role full access activity_log" ON activity_log
  FOR ALL USING (auth.role() = 'service_role');

GRANT SELECT, INSERT ON activity_log TO authenticated;
GRANT ALL ON activity_log TO service_role;

-- =====================================================
-- 3. ADD MISSING COLUMNS
-- =====================================================
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS customer_notes TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS customer_notes TEXT;

-- Only add these if saved_services table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'saved_services') THEN
    ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS saved_service_id UUID REFERENCES saved_services(id) ON DELETE SET NULL;
    ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS saved_service_id UUID REFERENCES saved_services(id) ON DELETE SET NULL;
  END IF;
END $$;

ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS is_taxable BOOLEAN DEFAULT TRUE;
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS is_taxable BOOLEAN DEFAULT TRUE;

-- =====================================================
-- 4. FIX INVOICE_REFUNDS FK (if profiles view doesn't work)
-- =====================================================
-- Uncomment if needed:
-- ALTER TABLE invoice_refunds DROP CONSTRAINT IF EXISTS invoice_refunds_refunded_by_fkey;
-- ALTER TABLE invoice_refunds ADD CONSTRAINT invoice_refunds_refunded_by_fkey
--   FOREIGN KEY (refunded_by) REFERENCES users(id) ON DELETE SET NULL;

-- =====================================================
-- 5. FORCE SCHEMA CACHE RELOAD
-- =====================================================
NOTIFY pgrst, 'reload config';

COMMIT;
```

---

## Recommendations

### Immediate Actions

1. **Apply the migration script** (`119_schema_audit_fixes.sql`) to resolve critical issues
2. **Run existing fix scripts** in `supabase/scripts/` to resolve column naming issues
3. **Regenerate TypeScript types** after schema changes

### Long-term Improvements

1. **Consolidate migration directories** - Move all migrations from `lib/supabase/migrations/` to `supabase/migrations/`
2. **Implement migration testing** - Add CI checks that run migrations on a fresh database
3. **Add schema validation** - Use the `scripts/verify_schema.js` in CI/CD pipeline
4. **Generate types automatically** - Add post-migration hook to regenerate `database.types.ts`
5. **Document schema changes** - Maintain a changelog for database modifications

---

## Files Analyzed

### Migration Directories
- `supabase/migrations/` - 62 migration files (primary)
- `lib/supabase/migrations/` - 27 migration files (secondary, may have unapplied)

### Schema Files
- `lib/supabase/schema.sql` - Main schema definition (3,093 lines)
- `lib/supabase/admin-schema.sql` - Admin portal schema (931 lines)
- `supabase/migrations/001_complete_schema.sql` - Complete deployment schema

### Fix Scripts
- `supabase/scripts/fix-missing-tables.sql`
- `supabase/scripts/fix-portal-schema.sql`
- `supabase/scripts/fix-commissions-schema.sql`
- `scripts/complete_schema_sync.sql`
- `scripts/fix_schema_tables.sql`

### Verification Scripts
- `scripts/verify_schema.js`

---

## Appendix: All Tables in Schema

### Core CRM Tables (from 001_complete_schema.sql)
1. businesses
2. users
3. email_recipients
4. customers
5. leads
6. jobs
7. job_notes
8. job_photos
9. quotes
10. quote_items
11. invoices
12. invoice_items
13. saved_services
14. payments
15. invoice_reminders
16. reminders
17. sms_conversations
18. sms_messages
19. sms_templates
20. scheduled_messages
21. customer_reminder_events
22. automation_events
23. call_logs
24. email_logs
25. calendar_connections
26. working_hours
27. schedule_blocks
28. team_invitations
29. service_agreements
30. customer_equipment
31. equipment_types
32. job_equipment
33. agreement_equipment
34. warranties
35. warranty_claims
36. signatures
37. documents
38. checklist_templates
39. job_checklists
40. customer_pre_job_items
41. job_pre_checklist_items
42. customer_activity
43. push_subscriptions
44. notifications
45. notification_preferences
46. notification_logs
47. feature_settings
48. time_entries
49. timesheet_summaries
50. receipts
51. review_requests
52. daily_routes
53. geocoded_addresses
54. technician_daily_metrics
55. job_ratings
56. survey_responses
57. custom_field_definitions
58. custom_field_values
59. emails
60. email_templates
61. quickbooks_connections
62. quickbooks_sync_map
63. kb_articles
64. kb_article_feedback
65. kb_article_views
66. kb_search_logs

### Security Tables
67. user_two_factor
68. two_factor_attempts
69. user_pins
70. user_sessions
71. security_events
72. password_history
73. trusted_devices

### Admin Portal Tables
74. admin_users
75. crm_accounts
76. web_customers
77. crm_coupons
78. tc_leads
79. lead_activities
80. lead_reassignments
81. lead_batch_uploads
82. payment_tracking
83. commissions
84. commission_rules
85. retention_tracking
86. admin_activity_log
87. admin_invoices
88. processed_webhook_events
89. agent_goals
90. daily_metrics
91. cohorts
92. agent_daily_performance
93. plan_pricing
94. admin_sessions
95. sales_attribution_log
96. agent_submissions
97. founders_program
98. crm_email_log

---

*Report generated by Claude Code schema audit tool*
