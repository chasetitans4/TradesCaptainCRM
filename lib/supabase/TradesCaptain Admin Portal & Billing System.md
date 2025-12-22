# TradesCaptain Admin Portal & Billing System

## Overview

Build a comprehensive Admin Portal integrated into the existing TradesCaptain CRM application. The Admin Portal manages:
- Customer accounts (CRM and Web plan customers)
- Sales agent management and commission tracking
- Stripe billing integration (monthly and annual subscriptions)
- Trial and promotional offer management
- Invoice generation and tracking
- Retention milestone tracking

The Admin Portal lives within the same Next.js 14 codebase as the CRM at `/admin/*` routes.

---

## Architecture

```
app.tradescaptain.com/
├── /login                    → Shared login (detects user type)
├── /register                 → Self-serve CRM signup
├── /dashboard                → Customer CRM dashboard
├── /customers                → Customer's customer management
├── /jobs                     → Customer's job management
├── /...                      → Other CRM routes
│
├── /admin/login              → Admin-specific login (optional)
├── /admin/dashboard          → Admin dashboard
├── /admin/accounts           → All CRM accounts
├── /admin/web-customers      → Web-only customers
├── /admin/agents             → Agent management
├── /admin/commissions        → Commission tracking
├── /admin/invoices           → Invoice management
├── /admin/trials             → Trial management
├── /admin/reports            → Reports & analytics
└── /admin/settings           → Admin settings
```

---

## Complete Pricing Structure

### Blue Plans (CRM Only)

#### For Individuals (1 user each)

| Plan | Monthly | Annual (25% off) |
|------|---------|------------------|
| Blue Starter | $49/mo | $441/yr |
| Blue Pro | $99/mo | $891/yr |
| Blue Enterprise | $199/mo | $1,791/yr |

#### For Teams

| Plan | Monthly | Annual (25% off) | Users |
|------|---------|------------------|-------|
| Blue Starter Teams | $149/mo | $1,341/yr | 5 |
| Blue Pro Teams | $199/mo | $1,791/yr | 10 |
| Blue Enterprise Teams | $399/mo | $3,591/yr | 20 |

### Web Plans (Website Only)

| Plan | Monthly | Annual (25% off) | Type |
|------|---------|------------------|------|
| Starter | $149/mo | $1,341/yr | Semi-Custom, 1-5 pages |
| Pro | $249/mo | $2,241/yr | Semi-Custom, 5-10 pages |
| Enterprise | $349/mo | $3,141/yr | Semi-Custom, 10-15 pages |
| Full Custom | Quote | Quote | 100% Custom design |

### Gold Plans (CRM + Website Bundle)

#### For Individuals

| Plan | Monthly | Annual (25% off) | Users |
|------|---------|------------------|-------|
| Gold Starter | $199/mo | $1,791/yr | 1 |
| Gold Pro | $349/mo | $3,141/yr | 1 |
| Gold Enterprise | $499/mo | $4,491/yr | 1 |

#### For Teams

| Plan | Monthly | Annual (25% off) | Users |
|------|---------|------------------|-------|
| Gold Starter Teams | $299/mo | $2,691/yr | 5 |
| Gold Pro Teams | $449/mo | $4,041/yr | 10 |
| Gold Enterprise Teams | $749/mo | $6,741/yr | 20 |

#### Custom

| Plan | Price |
|------|-------|
| Gold Custom | Quote (Full Custom Website + Any CRM tier) |

### Add-On

| Add-On | Monthly | Annual (25% off) |
|--------|---------|------------------|
| Extra Location | $199/mo | $1,791/yr |

---

## Commission Structure

### Monthly Plans

**Payment Timing:**
- Customer pays Month 1 UPFRONT at time of sale
- Upfront commission paid after Month 2 payment processes (~30 days after sale)
- Recurring commission starts at Month 3 payment (~60 days after sale)
- Recurring runs for 12 months (payments 3-14), then STOPS

#### Individuals - Monthly Commission

| Plan | Monthly | Upfront | Recurring (M3-14) |
|------|---------|---------|-------------------|
| Blue Starter | $49 | $20 | $4.90/mo |
| Blue Pro | $99 | $50 | $9.90/mo |
| Blue Enterprise | $199 | $100 | $19.90/mo |
| Web Starter | $149 | $50 | $14.90/mo |
| Web Pro | $249 | $100 | $24.90/mo |
| Web Enterprise | $349 | $150 | $34.90/mo |
| Gold Starter | $199 | $100 | $19.90/mo |
| Gold Pro | $349 | $200 | $34.90/mo |
| Gold Enterprise | $499 | $300 | $49.90/mo |

#### Teams - Monthly Commission

| Plan | Monthly | Upfront | Recurring (M3-14) |
|------|---------|---------|-------------------|
| Blue Starter Teams | $149 | $75 | $14.90/mo |
| Blue Pro Teams | $199 | $100 | $19.90/mo |
| Blue Enterprise Teams | $399 | $200 | $39.90/mo |
| Gold Starter Teams | $299 | $150 | $29.90/mo |
| Gold Pro Teams | $449 | $225 | $44.90/mo |
| Gold Enterprise Teams | $749 | $375 | $74.90/mo |

#### Add-On - Monthly Commission

| Add-On | Monthly | Upfront | Recurring (M3-14) |
|--------|---------|---------|-------------------|
| Extra Location | $199 | $75 | $19.90/mo |

### Annual Plans

**35% one-time commission, NO recurring, NO renewal commission**

Paid after payment clears (~7 days)

#### Individuals - Annual Commission

| Plan | Annual | Commission (35%) |
|------|--------|------------------|
| Blue Starter | $441 | $154.35 |
| Blue Pro | $891 | $311.85 |
| Blue Enterprise | $1,791 | $627.15 |
| Web Starter | $1,341 | $469.35 |
| Web Pro | $2,241 | $784.35 |
| Web Enterprise | $3,141 | $1,099.35 |
| Gold Starter | $1,791 | $627.15 |
| Gold Pro | $3,141 | $1,099.35 |
| Gold Enterprise | $4,491 | $1,571.85 |

#### Teams - Annual Commission

| Plan | Annual | Commission (35%) |
|------|--------|------------------|
| Blue Starter Teams | $1,341 | $469.35 |
| Blue Pro Teams | $1,791 | $627.15 |
| Blue Enterprise Teams | $3,591 | $1,256.85 |
| Gold Starter Teams | $2,691 | $941.85 |
| Gold Pro Teams | $4,041 | $1,414.35 |
| Gold Enterprise Teams | $6,741 | $2,359.35 |

#### Add-On - Annual Commission

| Add-On | Annual | Commission (35%) |
|--------|--------|------------------|
| Extra Location | $1,791 | $626.85 |

### Custom Quotes

**35% one-time commission of first year quoted value**
- Web Full Custom: 35% of quoted first year value
- Gold Custom: 35% of quoted first year value
- NO recurring, NO renewal, NO retention bonuses

### Retention Bonuses (Monthly Plans Only)

Paid for each client that hits these milestones:

| Milestone | Bonus | Requirement |
|-----------|-------|-------------|
| Month 3 Check-In Call | $15 | Call logged + Audit sent |
| Client Retains Month 4 | $25 | Month 4 payment processed |
| Client Retains Month 6 | $50 | Client still active |
| Client Retains Month 12 | $100 | Client still active |
| **Maximum Per Client** | **$190** | All milestones achieved |

**Note:** Retention bonuses do NOT apply to annual plans (customer already committed for the year).

### Performance Bonus

Close 10+ deals in any calendar month = 10% bonus on that month's total revenue generated

### Forfeiture / Clawback Rules

- Monthly: Cancel before M2 → upfront forfeited
- Monthly: Cancel before M3 → no recurring earned
- Monthly: 90-day clawback on upfront if client cancels
- Annual: Refund within 30 days → commission forfeited
- Chargeback on any payment → related commission forfeited
- Retention bonus forfeited if client cancels before milestone

---

## CRM Promotional Offers

### Offer 1: Self-Serve 14-Day Free Trial

- Available to anyone signing up directly at `/register` (no agent)
- Full Blue Starter access for 14 days
- Payment info required at signup
- Auto-charges $49/mo after trial ends
- No agent commission (self-serve)

### Offer 2: 1 Year Free CRM with Web Plan

- Available to customers who purchase any Web plan (Starter, Pro, Enterprise, Full Custom)
- Blue Starter CRM FREE for 12 months
- Agent provides coupon code on invoice
- Customer registers with code at `/register?code=XXXXX`
- No payment info required for CRM registration
- After 12 months: Must add payment info, $49/mo auto-charges
- **Contingent on active web plan** — if web plan cancels, free CRM ends
- Agent earns commission on web plan, NOT on free CRM
- If customer later upgrades CRM, agent earns on that upgrade

### Invoice Display for Web + Free CRM

```
Web Design - Pro Plan (Semi-Custom)              $249.00
────────────────────────────────────────────────────────
INCLUDED BONUS
Blue Starter CRM - FREE for 1 Year                 $0.00
(Regularly $49/mo - $588 annual value)
Access Code: WEBPRO-SMITH-2024-X7K2
Register at: app.tradescaptain.com/register

* Free CRM contingent on active web plan
────────────────────────────────────────────────────────
Total:                                           $249.00
```

---

## Lead Management

### Lead Privacy Rules

- **Agents can ONLY see their own leads** - enforced at database level via RLS
- **Agents cannot see other agents' names or leads**
- **Management (admin, super_admin) can see all leads**
- **Management can reassign leads between agents**
- **Support can view leads for troubleshooting but cannot reassign**

### Lead Sources

| Source | Description | Assignment |
|--------|-------------|------------|
| Manual Entry | Agent creates lead in portal | Auto-assigned to creating agent |
| Batch Upload | Excel/CSV upload by management | Assigned to selected agent |
| Website Form | Lead capture from tradescaptain.com | Round-robin or manual assignment |
| Referral | Referred by existing customer | Assigned to original agent |
| Transfer | Reassigned from another agent | Manually assigned by management |

### Lead Statuses

| Status | Description |
|--------|-------------|
| `new` | Fresh lead, not contacted |
| `contacted` | Initial outreach made |
| `qualified` | Confirmed interest, budget, timeline |
| `proposal_sent` | Quote/proposal delivered |
| `negotiating` | In discussions |
| `won` | Converted to customer |
| `lost` | Did not convert |
| `unqualified` | Not a fit |
| `dormant` | No response, may revisit |

---

## Database Schema

### Leads

```sql
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Assignment
  agent_id UUID REFERENCES admin_users(id) NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES admin_users(id),
  
  -- Contact info
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  
  -- Business info
  trade_type TEXT,
  -- 'plumber', 'electrician', 'hvac', 'general_contractor', 'roofer', 'landscaper', 'other'
  employee_count TEXT,
  -- '1', '2-5', '6-10', '11-20', '20+'
  current_website TEXT,
  current_crm TEXT,
  
  -- Lead info
  source TEXT DEFAULT 'manual',
  -- 'manual', 'batch_upload', 'website_form', 'referral', 'transfer'
  source_details TEXT,
  -- e.g., "Uploaded from December_Leads.xlsx" or "Referred by Smith Plumbing"
  
  status TEXT DEFAULT 'new',
  -- 'new', 'contacted', 'qualified', 'proposal_sent', 'negotiating', 'won', 'lost', 'unqualified', 'dormant'
  
  -- Interest
  interested_in TEXT[],
  -- ['crm', 'website', 'bundle']
  preferred_plan TEXT,
  estimated_value DECIMAL(10,2),
  
  -- Tracking
  last_contact_at TIMESTAMPTZ,
  next_followup_at TIMESTAMPTZ,
  contact_count INTEGER DEFAULT 0,
  
  -- Conversion
  converted_at TIMESTAMPTZ,
  crm_account_id UUID REFERENCES crm_accounts(id),
  web_customer_id UUID REFERENCES web_customers(id),
  
  -- Notes
  notes TEXT,
  
  -- Batch upload tracking
  batch_upload_id UUID REFERENCES lead_batch_uploads(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Soft delete (NEVER hard delete lead data)
  deleted_at TIMESTAMPTZ
);

-- ROW LEVEL SECURITY: Agents can only see their own leads
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Policy for agents: only see own leads (exclude soft-deleted)
CREATE POLICY leads_agent_policy ON leads
  FOR ALL
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      agent_id = auth.uid() 
      OR 
      EXISTS (
        SELECT 1 FROM admin_users 
        WHERE id = auth.uid() 
        AND role IN ('super_admin', 'admin', 'support', 'finance')
      )
    )
  );

CREATE INDEX idx_leads_agent ON leads(agent_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_status ON leads(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_created ON leads(created_at);
CREATE INDEX idx_leads_batch ON leads(batch_upload_id);
```

### Lead Activity Log

```sql
CREATE TABLE lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) NOT NULL,
  agent_id UUID REFERENCES admin_users(id) NOT NULL,
  
  activity_type TEXT NOT NULL,
  -- 'created', 'called', 'emailed', 'texted', 'met', 'proposal_sent', 
  -- 'status_changed', 'note_added', 'reassigned', 'converted'
  
  description TEXT,
  
  -- For status changes
  old_status TEXT,
  new_status TEXT,
  
  -- For reassignments
  old_agent_id UUID REFERENCES admin_users(id),
  new_agent_id UUID REFERENCES admin_users(id),
  reassigned_by UUID REFERENCES admin_users(id),
  reassignment_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: Same as leads
ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY lead_activities_policy ON lead_activities
  FOR ALL
  TO authenticated
  USING (
    agent_id = auth.uid() 
    OR 
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'support', 'finance')
    )
  );

CREATE INDEX idx_lead_activities_lead ON lead_activities(lead_id);
```

### Lead Reassignment History

```sql
CREATE TABLE lead_reassignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) NOT NULL,
  
  from_agent_id UUID REFERENCES admin_users(id),
  to_agent_id UUID REFERENCES admin_users(id) NOT NULL,
  reassigned_by UUID REFERENCES admin_users(id) NOT NULL,
  
  reason TEXT,
  -- 'agent_left', 'territory_change', 'workload_balance', 'customer_request', 'performance', 'other'
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reassignments_lead ON lead_reassignments(lead_id);
CREATE INDEX idx_reassignments_from ON lead_reassignments(from_agent_id);
CREATE INDEX idx_reassignments_to ON lead_reassignments(to_agent_id);
```

### Batch Upload Tracking

```sql
CREATE TABLE lead_batch_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Who uploaded
  uploaded_by UUID REFERENCES admin_users(id) NOT NULL,
  
  -- File info
  original_filename TEXT NOT NULL,
  file_size INTEGER,
  
  -- Assignment
  assigned_to_agent_id UUID REFERENCES admin_users(id) NOT NULL,
  
  -- Stats
  total_rows INTEGER,
  successful_imports INTEGER DEFAULT 0,
  failed_imports INTEGER DEFAULT 0,
  duplicate_skipped INTEGER DEFAULT 0,
  
  -- Errors
  errors JSONB,
  -- [{ row: 5, error: "Invalid email format" }, ...]
  
  -- Status
  status TEXT DEFAULT 'processing',
  -- 'processing', 'completed', 'completed_with_errors', 'failed'
  
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_batch_uploads_agent ON lead_batch_uploads(assigned_to_agent_id);
CREATE INDEX idx_batch_uploads_uploader ON lead_batch_uploads(uploaded_by);
```

### Admin Users

```sql
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'agent',
  -- Roles: 'super_admin', 'admin', 'agent', 'support', 'finance'
  
  status TEXT DEFAULT 'active',
  -- Status: 'active', 'inactive', 'suspended'
  
  -- For agents
  hire_date DATE,
  commission_rate DECIMAL(5,4) DEFAULT 0.10,
  
  -- Auth
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  two_factor_secret TEXT,
  last_login_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admin_users_email ON admin_users(email);
CREATE INDEX idx_admin_users_role ON admin_users(role);
```

### CRM Accounts

```sql
CREATE TABLE crm_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Business info
  business_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  
  -- Plan info
  plan_type TEXT NOT NULL,
  -- 'blue_starter', 'blue_pro', 'blue_enterprise',
  -- 'blue_starter_teams', 'blue_pro_teams', 'blue_enterprise_teams',
  -- 'gold_starter', 'gold_pro', 'gold_enterprise',
  -- 'gold_starter_teams', 'gold_pro_teams', 'gold_enterprise_teams',
  -- 'gold_custom'
  
  plan_tier TEXT NOT NULL,
  -- 'individual', 'teams'
  
  billing_interval TEXT NOT NULL DEFAULT 'month',
  -- 'month', 'year'
  
  monthly_amount DECIMAL(10,2) NOT NULL,
  user_limit INTEGER DEFAULT 1,
  
  -- Plan versioning (for audits and disputes)
  plan_version TEXT DEFAULT '2024-12',
  
  -- Status
  status TEXT DEFAULT 'active',
  -- 'trial', 'active', 'past_due', 'cancelled', 'suspended'
  
  -- Trial tracking
  is_trial BOOLEAN DEFAULT FALSE,
  trial_ends_at TIMESTAMPTZ,
  
  -- Promo tracking
  promo_type TEXT,
  -- 'self_serve_trial', 'free_with_web', NULL
  promo_ends_at TIMESTAMPTZ,
  web_customer_id UUID REFERENCES web_customers(id),
  coupon_id UUID REFERENCES crm_coupons(id),
  
  -- Stripe
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  
  -- Attribution
  agent_id UUID REFERENCES admin_users(id),
  signup_source TEXT,
  -- 'self_serve', 'agent', 'referral'
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,
  
  -- Soft delete (NEVER hard delete revenue data)
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_crm_accounts_email ON crm_accounts(email);
CREATE INDEX idx_crm_accounts_status ON crm_accounts(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_crm_accounts_agent ON crm_accounts(agent_id);
CREATE INDEX idx_crm_accounts_stripe ON crm_accounts(stripe_customer_id);
```

### Web Customers

```sql
CREATE TABLE web_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Business info
  business_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  
  -- Plan info
  plan_type TEXT NOT NULL,
  -- 'web_starter', 'web_pro', 'web_enterprise', 'web_full_custom'
  
  billing_interval TEXT NOT NULL DEFAULT 'month',
  monthly_amount DECIMAL(10,2) NOT NULL,
  
  -- Plan versioning (for audits and disputes)
  plan_version TEXT DEFAULT '2024-12',
  
  -- For Full Custom
  custom_quote_amount DECIMAL(10,2),
  custom_quote_notes TEXT,
  
  -- Status
  status TEXT DEFAULT 'active',
  -- 'active', 'past_due', 'cancelled', 'suspended'
  
  -- Stripe
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  
  -- Attribution
  agent_id UUID REFERENCES admin_users(id),
  
  -- CRM promo issued
  crm_coupon_issued BOOLEAN DEFAULT FALSE,
  crm_coupon_id UUID REFERENCES crm_coupons(id),
  
  -- Extra locations
  extra_locations INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,
  
  -- Soft delete (NEVER hard delete revenue data)
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_web_customers_email ON web_customers(email);
CREATE INDEX idx_web_customers_status ON web_customers(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_web_customers_agent ON web_customers(agent_id);
```

### CRM Coupons

```sql
CREATE TABLE crm_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  -- Format: WEBPRO-SMITHP-2024-X7K2
  
  -- Web plan link
  web_customer_id UUID REFERENCES web_customers(id) NOT NULL,
  web_plan_type TEXT NOT NULL,
  
  -- Coupon details
  crm_plan TEXT DEFAULT 'blue_starter',
  free_months INTEGER DEFAULT 12,
  
  -- Status
  status TEXT DEFAULT 'active',
  -- 'active', 'redeemed', 'expired', 'revoked'
  
  redeemed_at TIMESTAMPTZ,
  redeemed_by_account_id UUID REFERENCES crm_accounts(id),
  
  -- Expiration (for code usage, not free period)
  expires_at TIMESTAMPTZ,
  
  -- Tracking
  created_by_agent_id UUID REFERENCES admin_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_crm_coupons_code ON crm_coupons(code);
CREATE INDEX idx_crm_coupons_status ON crm_coupons(status);
CREATE INDEX idx_crm_coupons_web_customer ON crm_coupons(web_customer_id);
```

### Payment Tracking (for commission eligibility)

```sql
CREATE TABLE payment_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Links
  crm_account_id UUID REFERENCES crm_accounts(id),
  web_customer_id UUID REFERENCES web_customers(id),
  stripe_subscription_id TEXT NOT NULL,
  
  agent_id UUID REFERENCES admin_users(id),
  
  -- Payment count
  successful_payments INTEGER DEFAULT 0,
  
  -- Commission eligibility
  upfront_eligible BOOLEAN DEFAULT FALSE,
  upfront_paid BOOLEAN DEFAULT FALSE,
  recurring_eligible BOOLEAN DEFAULT FALSE,
  recurring_end_payment INTEGER,
  -- recurring_end_payment = first_payment + 14 (payments 3-14 = 12 months)
  
  -- Timestamps
  first_payment_at TIMESTAMPTZ,
  second_payment_at TIMESTAMPTZ,
  third_payment_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(stripe_subscription_id)
);

CREATE INDEX idx_payment_tracking_agent ON payment_tracking(agent_id);
CREATE INDEX idx_payment_tracking_subscription ON payment_tracking(stripe_subscription_id);
```

### Commissions

```sql
CREATE TABLE commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES admin_users(id) NOT NULL,
  
  -- Source
  crm_account_id UUID REFERENCES crm_accounts(id),
  web_customer_id UUID REFERENCES web_customers(id),
  stripe_subscription_id TEXT,
  
  -- Sale details
  sale_type TEXT NOT NULL,
  -- 'blue', 'web', 'gold', 'addon', 'custom'
  
  plan_type TEXT NOT NULL,
  plan_tier TEXT,
  -- 'individual', 'teams'
  
  billing_interval TEXT NOT NULL,
  -- 'month', 'year', 'custom'
  
  sale_amount DECIMAL(10,2) NOT NULL,
  
  -- Commission details
  commission_type TEXT NOT NULL,
  -- 'upfront', 'recurring', 'annual_onetime', 'custom_onetime', 'retention', 'performance_bonus'
  
  commission_rate DECIMAL(5,4),
  commission_amount DECIMAL(10,2) NOT NULL,
  
  -- For recurring/retention
  payment_number INTEGER,
  retention_milestone TEXT,
  -- 'month_3_call', 'month_4', 'month_6', 'month_12'
  
  -- Status
  status TEXT DEFAULT 'pending',
  -- 'pending', 'eligible', 'approved', 'paid', 'forfeited'
  
  -- Eligibility
  eligible_at TIMESTAMPTZ,
  
  -- Approval
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES admin_users(id),
  
  -- Payment
  paid_at TIMESTAMPTZ,
  paid_via TEXT,
  -- 'direct_deposit', 'check', 'paypal'
  payment_reference TEXT,
  
  -- Forfeiture
  forfeited_at TIMESTAMPTZ,
  forfeiture_reason TEXT,
  -- 'customer_cancelled', 'refunded', 'chargeback', 'clawback'
  
  -- Timestamps
  sale_date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_commissions_agent ON commissions(agent_id, status);
CREATE INDEX idx_commissions_status ON commissions(status);
CREATE INDEX idx_commissions_type ON commissions(commission_type);
CREATE INDEX idx_commissions_eligible ON commissions(status, eligible_at);
```

### Commission Rules (Single Source of Truth)

```sql
-- IMPORTANT: All commission logic should reference this table, NOT hardcoded values
-- This allows Finance to adjust rates without code deployments

CREATE TABLE commission_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Plan identification
  plan_type TEXT NOT NULL,
  -- 'blue_starter', 'blue_pro', 'blue_enterprise', 
  -- 'blue_starter_teams', 'blue_pro_teams', 'blue_enterprise_teams',
  -- 'web_starter', 'web_pro', 'web_enterprise', 'web_full_custom',
  -- 'gold_starter', 'gold_pro', 'gold_enterprise',
  -- 'gold_starter_teams', 'gold_pro_teams', 'gold_enterprise_teams', 'gold_custom',
  -- 'extra_location'
  
  plan_tier TEXT NOT NULL,
  -- 'individual', 'teams', 'addon', 'custom'
  
  billing_interval TEXT NOT NULL,
  -- 'month', 'year', 'custom'
  
  -- Monthly plan commission
  upfront_amount DECIMAL(10,2),
  upfront_delay_payments INTEGER DEFAULT 2, -- Pay after this many payments
  
  recurring_rate DECIMAL(5,4) DEFAULT 0.10, -- 10%
  recurring_start_payment INTEGER DEFAULT 3, -- Start at payment 3
  recurring_end_payment INTEGER DEFAULT 14, -- End at payment 14 (12 months)
  
  -- Annual plan commission
  annual_rate DECIMAL(5,4) DEFAULT 0.35, -- 35%
  annual_renewal_commission BOOLEAN DEFAULT FALSE,
  
  -- Custom quote commission
  custom_rate DECIMAL(5,4) DEFAULT 0.35, -- 35% of first year
  
  -- Retention bonuses
  retention_enabled BOOLEAN DEFAULT TRUE,
  month_3_call_bonus DECIMAL(10,2) DEFAULT 15,
  month_4_bonus DECIMAL(10,2) DEFAULT 25,
  month_6_bonus DECIMAL(10,2) DEFAULT 50,
  month_12_bonus DECIMAL(10,2) DEFAULT 100,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Versioning
  version TEXT DEFAULT '2024-12',
  effective_from DATE DEFAULT CURRENT_DATE,
  effective_until DATE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(plan_type, billing_interval, version)
);

-- Seed initial commission rules
INSERT INTO commission_rules (plan_type, plan_tier, billing_interval, upfront_amount, retention_enabled) VALUES
-- Blue Individuals
('blue_starter', 'individual', 'month', 20, TRUE),
('blue_pro', 'individual', 'month', 50, TRUE),
('blue_enterprise', 'individual', 'month', 100, TRUE),
('blue_starter', 'individual', 'year', NULL, FALSE),
('blue_pro', 'individual', 'year', NULL, FALSE),
('blue_enterprise', 'individual', 'year', NULL, FALSE),
-- Blue Teams
('blue_starter_teams', 'teams', 'month', 75, TRUE),
('blue_pro_teams', 'teams', 'month', 100, TRUE),
('blue_enterprise_teams', 'teams', 'month', 200, TRUE),
('blue_starter_teams', 'teams', 'year', NULL, FALSE),
('blue_pro_teams', 'teams', 'year', NULL, FALSE),
('blue_enterprise_teams', 'teams', 'year', NULL, FALSE),
-- Web
('web_starter', 'individual', 'month', 50, TRUE),
('web_pro', 'individual', 'month', 100, TRUE),
('web_enterprise', 'individual', 'month', 150, TRUE),
('web_starter', 'individual', 'year', NULL, FALSE),
('web_pro', 'individual', 'year', NULL, FALSE),
('web_enterprise', 'individual', 'year', NULL, FALSE),
('web_full_custom', 'custom', 'custom', NULL, FALSE),
-- Gold Individuals
('gold_starter', 'individual', 'month', 100, TRUE),
('gold_pro', 'individual', 'month', 200, TRUE),
('gold_enterprise', 'individual', 'month', 300, TRUE),
('gold_starter', 'individual', 'year', NULL, FALSE),
('gold_pro', 'individual', 'year', NULL, FALSE),
('gold_enterprise', 'individual', 'year', NULL, FALSE),
-- Gold Teams
('gold_starter_teams', 'teams', 'month', 150, TRUE),
('gold_pro_teams', 'teams', 'month', 225, TRUE),
('gold_enterprise_teams', 'teams', 'month', 375, TRUE),
('gold_starter_teams', 'teams', 'year', NULL, FALSE),
('gold_pro_teams', 'teams', 'year', NULL, FALSE),
('gold_enterprise_teams', 'teams', 'year', NULL, FALSE),
('gold_custom', 'custom', 'custom', NULL, FALSE),
-- Add-on
('extra_location', 'addon', 'month', 75, FALSE),
('extra_location', 'addon', 'year', NULL, FALSE);

CREATE INDEX idx_commission_rules_lookup ON commission_rules(plan_type, billing_interval, is_active);
```

### Retention Tracking

```sql
CREATE TABLE retention_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  crm_account_id UUID REFERENCES crm_accounts(id),
  web_customer_id UUID REFERENCES web_customers(id),
  agent_id UUID REFERENCES admin_users(id) NOT NULL,
  
  -- Milestones
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
  
  -- Total bonuses
  total_retention_bonus DECIMAL(10,2) DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_retention_agent ON retention_tracking(agent_id);
CREATE INDEX idx_retention_crm ON retention_tracking(crm_account_id);
```

### Admin Activity Log

```sql
CREATE TABLE admin_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  admin_user_id UUID REFERENCES admin_users(id) NOT NULL,
  action TEXT NOT NULL,
  -- 'login', 'logout', 'create_account', 'update_account', 'cancel_account',
  -- 'impersonate', 'create_invoice', 'approve_commission', 'pay_commission', etc.
  
  resource_type TEXT,
  -- 'crm_account', 'web_customer', 'commission', 'admin_user', etc.
  
  resource_id UUID,
  
  details JSONB,
  -- Store relevant details as JSON
  
  ip_address TEXT,
  user_agent TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_admin ON admin_activity_log(admin_user_id);
CREATE INDEX idx_activity_resource ON admin_activity_log(resource_type, resource_id);
CREATE INDEX idx_activity_created ON admin_activity_log(created_at);
```

### Invoices (for tracking, actual invoices in Stripe)

```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Customer
  web_customer_id UUID REFERENCES web_customers(id),
  crm_account_id UUID REFERENCES crm_accounts(id),
  
  -- Stripe
  stripe_invoice_id TEXT UNIQUE,
  stripe_invoice_number TEXT,
  stripe_invoice_url TEXT,
  stripe_invoice_pdf TEXT,
  
  -- Details
  amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'draft',
  -- 'draft', 'open', 'paid', 'void', 'uncollectible'
  
  billing_interval TEXT,
  
  -- CRM coupon included
  crm_coupon_included BOOLEAN DEFAULT FALSE,
  crm_coupon_code TEXT,
  
  -- Attribution
  agent_id UUID REFERENCES admin_users(id),
  
  -- Dates
  due_date DATE,
  paid_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invoices_stripe ON invoices(stripe_invoice_id);
CREATE INDEX idx_invoices_status ON invoices(status);
```

---

## Stripe Integration

### Products to Create in Stripe (32 products)

```javascript
// ═══════════════════════════════════════════════════════════════
// BLUE PLANS - INDIVIDUALS
// ═══════════════════════════════════════════════════════════════

// Monthly
{ name: 'Blue Starter', price: 4900, interval: 'month', metadata: { tier: 'individual', category: 'crm' } }
{ name: 'Blue Pro', price: 9900, interval: 'month', metadata: { tier: 'individual', category: 'crm' } }
{ name: 'Blue Enterprise', price: 19900, interval: 'month', metadata: { tier: 'individual', category: 'crm' } }

// Annual
{ name: 'Blue Starter (Annual)', price: 44100, interval: 'year', metadata: { tier: 'individual', category: 'crm' } }
{ name: 'Blue Pro (Annual)', price: 89100, interval: 'year', metadata: { tier: 'individual', category: 'crm' } }
{ name: 'Blue Enterprise (Annual)', price: 179100, interval: 'year', metadata: { tier: 'individual', category: 'crm' } }

// ═══════════════════════════════════════════════════════════════
// BLUE PLANS - TEAMS
// ═══════════════════════════════════════════════════════════════

// Monthly
{ name: 'Blue Starter Teams', price: 14900, interval: 'month', metadata: { tier: 'teams', users: 5, category: 'crm' } }
{ name: 'Blue Pro Teams', price: 19900, interval: 'month', metadata: { tier: 'teams', users: 10, category: 'crm' } }
{ name: 'Blue Enterprise Teams', price: 39900, interval: 'month', metadata: { tier: 'teams', users: 20, category: 'crm' } }

// Annual
{ name: 'Blue Starter Teams (Annual)', price: 134100, interval: 'year', metadata: { tier: 'teams', users: 5, category: 'crm' } }
{ name: 'Blue Pro Teams (Annual)', price: 179100, interval: 'year', metadata: { tier: 'teams', users: 10, category: 'crm' } }
{ name: 'Blue Enterprise Teams (Annual)', price: 359100, interval: 'year', metadata: { tier: 'teams', users: 20, category: 'crm' } }

// ═══════════════════════════════════════════════════════════════
// WEB PLANS
// ═══════════════════════════════════════════════════════════════

// Monthly
{ name: 'Web Starter', price: 14900, interval: 'month', metadata: { type: 'semi-custom', category: 'web' } }
{ name: 'Web Pro', price: 24900, interval: 'month', metadata: { type: 'semi-custom', category: 'web' } }
{ name: 'Web Enterprise', price: 34900, interval: 'month', metadata: { type: 'semi-custom', category: 'web' } }

// Annual
{ name: 'Web Starter (Annual)', price: 134100, interval: 'year', metadata: { type: 'semi-custom', category: 'web' } }
{ name: 'Web Pro (Annual)', price: 224100, interval: 'year', metadata: { type: 'semi-custom', category: 'web' } }
{ name: 'Web Enterprise (Annual)', price: 314100, interval: 'year', metadata: { type: 'semi-custom', category: 'web' } }

// ═══════════════════════════════════════════════════════════════
// GOLD PLANS - INDIVIDUALS
// ═══════════════════════════════════════════════════════════════

// Monthly
{ name: 'Gold Starter', price: 19900, interval: 'month', metadata: { tier: 'individual', category: 'gold' } }
{ name: 'Gold Pro', price: 34900, interval: 'month', metadata: { tier: 'individual', category: 'gold' } }
{ name: 'Gold Enterprise', price: 49900, interval: 'month', metadata: { tier: 'individual', category: 'gold' } }

// Annual
{ name: 'Gold Starter (Annual)', price: 179100, interval: 'year', metadata: { tier: 'individual', category: 'gold' } }
{ name: 'Gold Pro (Annual)', price: 314100, interval: 'year', metadata: { tier: 'individual', category: 'gold' } }
{ name: 'Gold Enterprise (Annual)', price: 449100, interval: 'year', metadata: { tier: 'individual', category: 'gold' } }

// ═══════════════════════════════════════════════════════════════
// GOLD PLANS - TEAMS
// ═══════════════════════════════════════════════════════════════

// Monthly
{ name: 'Gold Starter Teams', price: 29900, interval: 'month', metadata: { tier: 'teams', users: 5, category: 'gold' } }
{ name: 'Gold Pro Teams', price: 44900, interval: 'month', metadata: { tier: 'teams', users: 10, category: 'gold' } }
{ name: 'Gold Enterprise Teams', price: 74900, interval: 'month', metadata: { tier: 'teams', users: 20, category: 'gold' } }

// Annual
{ name: 'Gold Starter Teams (Annual)', price: 269100, interval: 'year', metadata: { tier: 'teams', users: 5, category: 'gold' } }
{ name: 'Gold Pro Teams (Annual)', price: 404100, interval: 'year', metadata: { tier: 'teams', users: 10, category: 'gold' } }
{ name: 'Gold Enterprise Teams (Annual)', price: 674100, interval: 'year', metadata: { tier: 'teams', users: 20, category: 'gold' } }

// ═══════════════════════════════════════════════════════════════
// ADD-ON
// ═══════════════════════════════════════════════════════════════

{ name: 'Extra Location', price: 19900, interval: 'month', metadata: { category: 'addon' } }
{ name: 'Extra Location (Annual)', price: 179100, interval: 'year', metadata: { category: 'addon' } }
```

### Webhook Handlers

```typescript
// /api/webhooks/stripe/route.ts

import Stripe from 'stripe';
import { headers } from 'next/headers';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: Request) {
  const body = await request.text();
  const signature = headers().get('stripe-signature')!;
  
  let event: Stripe.Event;
  
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    return new Response('Webhook signature verification failed', { status: 400 });
  }
  
  // IDEMPOTENCY CHECK: Prevent duplicate processing
  const eventId = event.id;
  const existingEvent = await db.processed_webhook_events.findUnique({
    where: { stripe_event_id: eventId }
  });
  
  if (existingEvent) {
    console.log(`Event ${eventId} already processed, skipping`);
    return new Response('OK', { status: 200 });
  }
  
  // Mark event as being processed (with transaction)
  await db.$transaction(async (tx) => {
    await tx.processed_webhook_events.create({
      data: {
        stripe_event_id: eventId,
        event_type: event.type,
        processed_at: new Date(),
      }
    });
    
    switch (event.type) {
      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice, tx);
        break;
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice, tx);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionCancelled(event.data.object as Stripe.Subscription, tx);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event, tx);
        break;
      case 'charge.refunded':
        await handleRefund(event.data.object as Stripe.Charge, tx);
        break;
      case 'charge.dispute.created':
        await handleChargeback(event.data.object as Stripe.Dispute, tx);
        break;
    }
  });
  
  return new Response('OK', { status: 200 });
}

// Get commission rules from database (not hardcoded)
async function getCommissionRules(planType: string, billingInterval: string) {
  const rules = await db.commission_rules.findFirst({
    where: {
      plan_type: planType,
      billing_interval: billingInterval,
      is_active: true,
    },
    orderBy: { effective_from: 'desc' }
  });
  
  if (!rules) {
    console.error(`No commission rules found for ${planType} / ${billingInterval}`);
    return null;
  }
  
  return rules;
}

// Handle successful payment
async function handleInvoicePaid(invoice: Stripe.Invoice, tx: any) {
  const subscriptionId = invoice.subscription as string;
  if (!subscriptionId) return;
  
  // IDEMPOTENCY: Check if this specific invoice was already processed
  const existingInvoice = await tx.invoices.findUnique({
    where: { stripe_invoice_id: invoice.id }
  });
  
  if (existingInvoice?.status === 'paid') {
    console.log(`Invoice ${invoice.id} already marked paid, skipping`);
    return;
  }
  
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const isAnnual = subscription.items.data[0].price.recurring?.interval === 'year';
  const isRenewal = invoice.billing_reason === 'subscription_cycle';
  
  // Get plan info from Stripe metadata
  const planType = subscription.metadata.plan_type;
  const billingInterval = isAnnual ? 'year' : 'month';
  
  // Get commission rules from database
  const rules = await getCommissionRules(planType, billingInterval);
  if (!rules) return;
  
  // Get or create payment tracking
  let tracking = await tx.payment_tracking.findUnique({
    where: { stripe_subscription_id: subscriptionId }
  });
  
  if (!tracking) {
    // First payment
    tracking = await tx.payment_tracking.create({
      data: {
        stripe_subscription_id: subscriptionId,
        crm_account_id: await getAccountBySubscription(subscriptionId),
        agent_id: await getAgentForSubscription(subscriptionId),
        successful_payments: 1,
        first_payment_at: new Date(),
        recurring_end_payment: rules.recurring_end_payment,
      }
    });
    
    if (isAnnual) {
      // Annual: Pay commission immediately (if not renewal)
      if (!isRenewal && rules.annual_rate) {
        await createAnnualCommission(tracking, invoice, rules, tx);
      }
      // Annual renewals get NO commission (rules.annual_renewal_commission = false)
    } else {
      // Monthly: Create pending upfront commission
      if (rules.upfront_amount) {
        await createPendingUpfrontCommission(tracking, invoice, rules, tx);
      }
    }
    
    return;
  }
  
  // Increment payment count
  const newPaymentCount = tracking.successful_payments + 1;
  
  // For annual subscriptions
  if (isAnnual) {
    // Annual renewals get NO commission
    if (isRenewal) {
      console.log('Annual renewal - no commission per rules');
    }
    await tx.payment_tracking.update({
      where: { id: tracking.id },
      data: { successful_payments: newPaymentCount }
    });
    return;
  }
  
  // For monthly subscriptions
  const updateData: any = { successful_payments: newPaymentCount };
  
  // PAYMENT 2: Upfront commission becomes eligible (based on rules.upfront_delay_payments)
  if (newPaymentCount === rules.upfront_delay_payments) {
    updateData.second_payment_at = new Date();
    updateData.upfront_eligible = true;
    
    await tx.commissions.updateMany({
      where: {
        stripe_subscription_id: subscriptionId,
        commission_type: 'upfront',
        status: 'pending',
      },
      data: {
        status: 'eligible',
        eligible_at: new Date(),
        payment_number: newPaymentCount,
      }
    });
  }
  
  // PAYMENT 3+: Recurring commission (based on rules.recurring_start/end_payment)
  if (newPaymentCount >= rules.recurring_start_payment && 
      newPaymentCount <= rules.recurring_end_payment) {
    if (newPaymentCount === rules.recurring_start_payment) {
      updateData.third_payment_at = new Date();
      updateData.recurring_eligible = true;
    }
    
    // Create recurring commission using rules.recurring_rate
    await createRecurringCommission(tracking, invoice, newPaymentCount, rules, tx);
  }
  
  // Check retention milestones (if enabled in rules)
  if (rules.retention_enabled) {
    if (newPaymentCount === 4 && rules.month_4_bonus) {
      await processRetentionMilestone(tracking, 'month_4', rules.month_4_bonus, tx);
    } else if (newPaymentCount === 6 && rules.month_6_bonus) {
      await processRetentionMilestone(tracking, 'month_6', rules.month_6_bonus, tx);
    } else if (newPaymentCount === 12 && rules.month_12_bonus) {
      await processRetentionMilestone(tracking, 'month_12', rules.month_12_bonus, tx);
    }
  }
  
  await tx.payment_tracking.update({
    where: { id: tracking.id },
    data: updateData,
  });
}

// Create annual commission (using rules.annual_rate)
async function createAnnualCommission(tracking: any, invoice: Stripe.Invoice, rules: any, tx: any) {
  if (!tracking.agent_id) return;
  
  const amount = invoice.amount_paid / 100;
  const commission = amount * Number(rules.annual_rate);
  
  await tx.commissions.create({
    data: {
      agent_id: tracking.agent_id,
      crm_account_id: tracking.crm_account_id,
      web_customer_id: tracking.web_customer_id,
      stripe_subscription_id: tracking.stripe_subscription_id,
      sale_type: rules.plan_type.split('_')[0], // 'blue', 'web', 'gold'
      plan_type: rules.plan_type,
      plan_tier: rules.plan_tier,
      billing_interval: 'year',
      sale_amount: amount,
      commission_type: 'annual_onetime',
      commission_rate: Number(rules.annual_rate),
      commission_amount: commission,
      status: 'eligible',
      eligible_at: new Date(),
      sale_date: new Date(),
    }
  });
}

// Create pending upfront commission (using rules.upfront_amount)
async function createPendingUpfrontCommission(tracking: any, invoice: Stripe.Invoice, rules: any, tx: any) {
  if (!tracking.agent_id) return;
  
  await tx.commissions.create({
    data: {
      agent_id: tracking.agent_id,
      crm_account_id: tracking.crm_account_id,
      web_customer_id: tracking.web_customer_id,
      stripe_subscription_id: tracking.stripe_subscription_id,
      sale_type: rules.plan_type.split('_')[0],
      plan_type: rules.plan_type,
      plan_tier: rules.plan_tier,
      billing_interval: 'month',
      sale_amount: invoice.amount_paid / 100,
      commission_type: 'upfront',
      commission_amount: Number(rules.upfront_amount),
      status: 'pending',
      sale_date: new Date(),
    }
  });
}

// Create recurring commission (using rules.recurring_rate)
async function createRecurringCommission(tracking: any, invoice: Stripe.Invoice, paymentNumber: number, rules: any, tx: any) {
  if (!tracking.agent_id) return;
  
  const amount = invoice.amount_paid / 100;
  const commission = amount * Number(rules.recurring_rate);
  
  await tx.commissions.create({
    data: {
      agent_id: tracking.agent_id,
      crm_account_id: tracking.crm_account_id,
      web_customer_id: tracking.web_customer_id,
      stripe_subscription_id: tracking.stripe_subscription_id,
      sale_type: rules.plan_type.split('_')[0],
      plan_type: rules.plan_type,
      plan_tier: rules.plan_tier,
      billing_interval: 'month',
      sale_amount: amount,
      commission_type: 'recurring',
      commission_rate: Number(rules.recurring_rate),
      commission_amount: commission,
      payment_number: paymentNumber,
      status: 'eligible',
      eligible_at: new Date(),
      sale_date: tracking.first_payment_at,
    }
  });
}

// Process retention milestone (using bonus amount from rules)
async function processRetentionMilestone(tracking: any, milestone: string, bonusAmount: number, tx: any) {
  if (!tracking.agent_id) return;
  
  // Update retention tracking
  await tx.retention_tracking.upsert({
    where: { crm_account_id: tracking.crm_account_id },
    create: {
      crm_account_id: tracking.crm_account_id,
      agent_id: tracking.agent_id,
      [`${milestone}_retained`]: true,
      [`${milestone}_payment_date`]: new Date(),
    },
    update: {
      [`${milestone}_retained`]: true,
      [`${milestone}_payment_date`]: new Date(),
    }
  });
  
  // Create retention bonus commission
  await tx.commissions.create({
    data: {
      agent_id: tracking.agent_id,
      crm_account_id: tracking.crm_account_id,
      stripe_subscription_id: tracking.stripe_subscription_id,
      sale_type: 'retention',
      plan_type: tracking.plan_type,
      billing_interval: 'month',
      sale_amount: 0,
      commission_type: 'retention',
      commission_amount: bonusAmount,
      retention_milestone: milestone,
      status: 'eligible',
      eligible_at: new Date(),
      sale_date: tracking.first_payment_at,
    }
  });
}

// Handle subscription cancelled
async function handleSubscriptionCancelled(subscription: Stripe.Subscription, tx: any) {
  const tracking = await tx.payment_tracking.findUnique({
    where: { stripe_subscription_id: subscription.id }
  });
  
  if (!tracking) return;
  
  // Forfeit any pending/eligible but unpaid commissions
  await tx.commissions.updateMany({
    where: {
      stripe_subscription_id: subscription.id,
      status: { in: ['pending', 'eligible'] },
    },
    data: {
      status: 'forfeited',
      forfeited_at: new Date(),
      forfeiture_reason: 'customer_cancelled',
    }
  });
  
  // Update account status (soft update, not delete)
  await tx.crm_accounts.updateMany({
    where: { stripe_subscription_id: subscription.id },
    data: {
      status: 'cancelled',
      cancelled_at: new Date(),
    }
  });
}

// Handle refunds - forfeit related commissions
async function handleRefund(charge: Stripe.Charge, tx: any) {
  const invoiceId = charge.invoice as string;
  if (!invoiceId) return;
  
  const invoice = await stripe.invoices.retrieve(invoiceId);
  const subscriptionId = invoice.subscription as string;
  
  // Forfeit commissions related to this payment
  await tx.commissions.updateMany({
    where: {
      stripe_subscription_id: subscriptionId,
      status: { in: ['pending', 'eligible'] },
    },
    data: {
      status: 'forfeited',
      forfeited_at: new Date(),
      forfeiture_reason: 'refunded',
    }
  });
}

// Handle chargebacks - forfeit related commissions
async function handleChargeback(dispute: Stripe.Dispute, tx: any) {
  const charge = await stripe.charges.retrieve(dispute.charge as string);
  const invoiceId = charge.invoice as string;
  if (!invoiceId) return;
  
  const invoice = await stripe.invoices.retrieve(invoiceId);
  const subscriptionId = invoice.subscription as string;
  
  // Forfeit commissions related to this payment
  await tx.commissions.updateMany({
    where: {
      stripe_subscription_id: subscriptionId,
      status: { in: ['pending', 'eligible', 'approved'] },
    },
    data: {
      status: 'forfeited',
      forfeited_at: new Date(),
      forfeiture_reason: 'chargeback',
    }
  });
}
```

### Processed Webhook Events (Idempotency)

```sql
-- Track processed webhook events to prevent duplicate processing
CREATE TABLE processed_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_webhook_events_stripe ON processed_webhook_events(stripe_event_id);

-- Auto-cleanup old events (keep 90 days)
-- Run via cron: DELETE FROM processed_webhook_events WHERE created_at < NOW() - INTERVAL '90 days';
```

---

## Admin Portal UI

### Dashboard

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  TradesCaptain Admin                                          John Smith ▼  │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ├── Dashboard                                                              │
│  ├── Accounts                                                               │
│  │   ├── CRM Accounts                                                       │
│  │   └── Web Customers                                                      │
│  ├── Agents                                                                 │
│  ├── Commissions                                                            │
│  ├── Invoices                                                               │
│  ├── Trials & Promos                                                        │
│  ├── Reports                                                                │
│  └── Settings                                                               │
│                                                                              │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  DASHBOARD                                              December 2024       │
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ Total MRR    │  │ Active CRM   │  │ Active Web   │  │ Trial Conv.  │    │
│  │ $47,850      │  │ Accounts     │  │ Customers    │  │ Rate         │    │
│  │ ↑ 12%        │  │ 156          │  │ 89           │  │ 34%          │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ New This Mo  │  │ Churned      │  │ Pending      │  │ Agent        │    │
│  │ 24           │  │ This Month   │  │ Commissions  │  │ Count        │    │
│  │              │  │ 3            │  │ $4,280       │  │ 8            │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  RECENT ACTIVITY                                                            │
│  ┌────────────────────────────────────────────────────────────────────────┐│
│  │ • Mike A. closed Gold Pro Teams ($449/mo) - Smith HVAC       2 hrs ago ││
│  │ • Sarah L. closed Web Enterprise ($349/mo) - ABC Plumbing    4 hrs ago ││
│  │ • Payment received: Jones Electric - $199               Yesterday      ││
│  │ • Trial converted: Metro Plumbing - Blue Pro                Yesterday  ││
│  │ • Mike A. logged Month 3 call - Quick Fix Plumbing          Yesterday  ││
│  └────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  ACTION REQUIRED                                                            │
│  ┌────────────────────────────────────────────────────────────────────────┐│
│  │ ⚠️ 3 trials expiring in 7 days                          [View]        ││
│  │ ⚠️ 2 payments failed - retry needed                     [View]        ││
│  │ ⚠️ $4,280 in commissions ready for payout               [Review]      ││
│  │ ⚠️ 5 Month 3 calls due this week                        [View]        ││
│  └────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Agent Dashboard (Agent Role View)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  TradesCaptain                                             Mike Anderson ▼  │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ├── My Dashboard                                                           │
│  ├── My Customers                                                           │
│  ├── New Customer                                                           │
│  ├── My Commissions                                                         │
│  ├── Retention Tasks                                                        │
│  └── Support                                                                │
│                                                                              │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  MY DASHBOARD                                           December 2024       │
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ Deals This   │  │ Revenue This │  │ Commissions  │  │ Commissions  │    │
│  │ Month        │  │ Month        │  │ Eligible     │  │ Paid YTD     │    │
│  │ 7            │  │ $2,845       │  │ $1,247       │  │ $18,420      │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  10+ DEAL BONUS PROGRESS                                                    │
│  ┌────────────────────────────────────────────────────────────────────────┐│
│  │ ████████████████████░░░░░░░░░░  7/10 deals                            ││
│  │ Close 3 more deals this month for 10% revenue bonus!                   ││
│  │ Potential bonus: $284.50                                               ││
│  └────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  RETENTION TASKS DUE                                                        │
│  ┌────────────────┬──────────────┬───────────────┬────────────────────────┐│
│  │ Customer       │ Task         │ Due Date      │ Action                 ││
│  ├────────────────┼──────────────┼───────────────┼────────────────────────┤│
│  │ Smith Plumbing │ Month 3 Call │ Dec 15        │ [Complete] [Schedule]  ││
│  │ ABC Electric   │ Month 3 Call │ Dec 18        │ [Complete] [Schedule]  ││
│  │ Quick HVAC     │ Month 6 Check│ Dec 20        │ [Mark Retained]        ││
│  └────────────────┴──────────────┴───────────────┴────────────────────────┘│
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  RECENT DEALS                                                               │
│  ┌────────────────┬──────────────┬───────────┬───────────┬────────────────┐│
│  │ Customer       │ Plan         │ Amount    │ Status    │ Commission     ││
│  ├────────────────┼──────────────┼───────────┼───────────┼────────────────┤│
│  │ Jones HVAC     │ Gold Pro     │ $349/mo   │ ✓ Active  │ $200 eligible  ││
│  │ Metro Plumbing │ Blue Pro Tm  │ $199/mo   │ ✓ Active  │ $100 pending   ││
│  │ City Electric  │ Web Pro      │ $249/mo   │ ✓ Active  │ $100 eligible  ││
│  └────────────────┴──────────────┴───────────┴───────────┴────────────────┘│
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Agent Commission Detail

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  My Commissions - Mike Anderson                              December 2024  │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  COMMISSION RULES                                                           │
│  ┌────────────────────────────────────────────────────────────────────────┐│
│  │ 💰 Monthly Plans:                                                      ││
│  │    • Upfront: Paid after customer's 2nd payment (~30 days)            ││
│  │    • Recurring: 10% monthly for months 3-14, then stops               ││
│  │                                                                        ││
│  │ 📅 Annual Plans:                                                       ││
│  │    • 35% one-time, paid ~7 days after payment                         ││
│  │    • No recurring, no renewal commission                              ││
│  │                                                                        ││
│  │ 🎯 Retention Bonuses (Monthly only):                                   ││
│  │    • Month 3 Call: $15  |  Month 4: $25  |  Month 6: $50  |  M12: $100││
│  └────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  SUMMARY                                                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ Pending      │  │ Eligible     │  │ Paid This    │  │ Paid         │    │
│  │ (Waiting)    │  │ (Ready)      │  │ Month        │  │ YTD          │    │
│  │ $425         │  │ $1,247       │  │ $2,180       │  │ $18,420      │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  UPFRONT COMMISSIONS                                                        │
│  ┌────────────────┬──────────────┬──────────┬────────────┬────────────────┐│
│  │ Customer       │ Plan         │ Amount   │ Status     │ Details        ││
│  ├────────────────┼──────────────┼──────────┼────────────┼────────────────┤│
│  │ Smith Plumbing │ Gold Pro     │ $200     │ ⏳ Pending │ Payment 1 of 2 ││
│  │ ABC Electric   │ Gold Enterp. │ $300     │ ✓ Eligible │ Pays Dec 15    ││
│  │ Quick HVAC     │ Web Pro      │ $100     │ ✓ Paid     │ Paid Dec 1     ││
│  └────────────────┴──────────────┴──────────┴────────────┴────────────────┘│
│                                                                              │
│  RECURRING COMMISSIONS (This Month)                                         │
│  ┌────────────────┬──────────────┬──────────┬────────────┬────────────────┐│
│  │ Customer       │ Plan         │ Payment #│ 10% Comm   │ Status         ││
│  ├────────────────┼──────────────┼──────────┼────────────┼────────────────┤│
│  │ Jones HVAC     │ Gold Pro     │ #5       │ $34.90     │ ✓ Eligible     ││
│  │ Metro Plumbing │ Blue Pro Tm  │ #4       │ $19.90     │ ✓ Eligible     ││
│  │ City Electric  │ Blue Enterp  │ #14      │ $19.90     │ ✓ LAST MONTH   ││
│  └────────────────┴──────────────┴──────────┴────────────┴────────────────┘│
│                                                                              │
│  RETENTION BONUSES                                                          │
│  ┌────────────────┬──────────────┬──────────┬────────────┬────────────────┐│
│  │ Customer       │ Milestone    │ Bonus    │ Status     │ Date           ││
│  ├────────────────┼──────────────┼──────────┼────────────┼────────────────┤│
│  │ Jones HVAC     │ Month 3 Call │ $15      │ ✓ Paid     │ Nov 15         ││
│  │ Jones HVAC     │ Month 4      │ $25      │ ✓ Eligible │ Dec 15         ││
│  │ Metro Plumbing │ Month 6      │ $50      │ ✓ Eligible │ Dec 20         ││
│  │ City Electric  │ Month 12     │ $100     │ ✓ Eligible │ Dec 22         ││
│  └────────────────┴──────────────┴──────────┴────────────┴────────────────┘│
│                                                                              │
│  ANNUAL COMMISSIONS                                                         │
│  ┌────────────────┬──────────────┬──────────┬────────────┬────────────────┐│
│  │ Customer       │ Plan         │ Annual   │ 35% Comm   │ Status         ││
│  ├────────────────┼──────────────┼──────────┼────────────┼────────────────┤│
│  │ Big Corp HVAC  │ Gold Teams   │ $6,741   │ $2,359.35  │ ✓ Paid Dec 5   ││
│  └────────────────┴──────────────┴──────────┴────────────┴────────────────┘│
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Create Customer Flow (Agent)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  New Customer                                                                │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  CUSTOMER TYPE                                                               │
│  ┌────────────────────────────────────────────────────────────────────────┐│
│  │ ○ CRM Only (Blue Plan)                                                 ││
│  │ ● Web Only (Web Plan)                                                  ││
│  │ ○ CRM + Website (Gold Plan)                                            ││
│  └────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  CUSTOMER INFORMATION                                                        │
│                                                                              │
│  Company Name *                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐│
│  │ Smith Plumbing LLC                                                     ││
│  └────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  Contact Name *                          Email *                             │
│  ┌─────────────────────────────────┐    ┌─────────────────────────────────┐│
│  │ John Smith                      │    │ john@smithplumbing.com          ││
│  └─────────────────────────────────┘    └─────────────────────────────────┘│
│                                                                              │
│  Phone                                   Address                             │
│  ┌─────────────────────────────────┐    ┌─────────────────────────────────┐│
│  │ (602) 555-1234                  │    │ 456 Main St, Phoenix AZ 85004   ││
│  └─────────────────────────────────┘    └─────────────────────────────────┘│
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  SELECT PLAN                                                                 │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐│
│  │  ○ Starter ($149/mo)    ● Pro ($249/mo)    ○ Enterprise ($349/mo)     ││
│  │  ○ Full Custom (Quote)                                                 ││
│  └────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  BILLING                                                                     │
│  ┌────────────────────────────────────────────────────────────────────────┐│
│  │  ● Monthly ($249/mo)    ○ Annual ($2,241/yr - Save 25%)               ││
│  └────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  EXTRA LOCATIONS                                                             │
│  ┌────────┐                                                                 │
│  │   0    │  × $199/mo = $0.00                                             │
│  └────────┘                                                                 │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  CRM BONUS                                                                   │
│  ┌────────────────────────────────────────────────────────────────────────┐│
│  │ ☑ Include FREE Blue Starter CRM (1 Year)                              ││
│  │   Customer will receive access code on invoice                         ││
│  │   Code: WEBPRO-SMITH-2024-X7K2 (auto-generated)                       ││
│  └────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  INVOICE PREVIEW                                                             │
│  ┌────────────────────────────────────────────────────────────────────────┐│
│  │ Web Design - Pro Plan (Semi-Custom)                         $249.00   ││
│  │ CRM - Blue Starter (1 Year FREE)                              $0.00   ││
│  │                                                           ──────────  ││
│  │                                              Monthly Total: $249.00   ││
│  │                                                                        ││
│  │ Your Commission: $100.00 upfront + $24.90/mo recurring (12 months)    ││
│  │                + $190 max retention bonuses                            ││
│  │                = Up to $588.80 total                                   ││
│  └────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│                          [Cancel]    [Create & Send Invoice]                 │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Lead Management UI

### Agent Lead View (Own Leads Only)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  My Leads                                                    Mike Anderson  │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [+ New Lead]                                     🔍 Search leads...        │
│                                                                              │
│  Filter: [All Statuses ▼]  [All Sources ▼]  [All Trades ▼]                 │
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ Total Leads  │  │ New          │  │ Qualified    │  │ Won          │    │
│  │     47       │  │    12        │  │     8        │  │    18        │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐│
│  │ Company          │ Contact    │ Status      │ Interest   │ Next Action ││
│  ├──────────────────┼────────────┼─────────────┼────────────┼─────────────┤│
│  │ ABC Plumbing     │ John Smith │ 🟢 Qualified│ Gold Pro   │ Call Dec 15 ││
│  │ Quick Electric   │ Jane Doe   │ 🟡 Contacted│ Web Pro    │ Email Dec 14││
│  │ Metro HVAC       │ Bob Wilson │ 🔵 New      │ Blue Pro   │ Call today  ││
│  │ City Roofing     │ Tom Brown  │ 🟡 Proposal │ Gold Enterp│ Follow up   ││
│  │ Pro Landscaping  │ Sue Green  │ 🔴 Lost     │ Web Starter│ --          ││
│  └──────────────────┴────────────┴─────────────┴────────────┴─────────────┘│
│                                                                              │
│  ⚠️ Note: You can only view leads assigned to you.                         │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Management Lead View (All Leads)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  All Leads                                                   Admin Portal   │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [+ New Lead]  [⬆️ Batch Upload]  [⬇️ Export]          🔍 Search leads...   │
│                                                                              │
│  Filter: [All Agents ▼]  [All Statuses ▼]  [All Sources ▼]  [Date Range]   │
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ Total Leads  │  │ Unassigned   │  │ Conversion   │  │ Avg Response │    │
│  │    312       │  │     5        │  │   Rate 34%   │  │   2.4 hours  │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  ☐ Select All                                     [Reassign Selected ▼]    │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐│
│  │ ☐│ Company        │ Contact    │ Agent       │ Status    │ Actions    ││
│  ├──┼────────────────┼────────────┼─────────────┼───────────┼────────────┤│
│  │ ☐│ ABC Plumbing   │ John Smith │ Mike A.     │ Qualified │ [Reassign] ││
│  │ ☐│ Quick Electric │ Jane Doe   │ Sarah L.    │ Contacted │ [Reassign] ││
│  │ ☐│ Metro HVAC     │ Bob Wilson │ Mike A.     │ New       │ [Reassign] ││
│  │ ☐│ City Roofing   │ Tom Brown  │ John D.     │ Proposal  │ [Reassign] ││
│  │ ☐│ Pro Landscaping│ Sue Green  │ --          │ New       │ [Assign]   ││
│  └──┴────────────────┴────────────┴─────────────┴───────────┴────────────┘│
│                                                                              │
│  Showing 1-20 of 312                              [< Prev] [1] [2] [Next >] │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Lead Reassignment Modal

```
┌────────────────────────────────────────────────────────────────┐
│  Reassign Lead                                           [X]  │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Lead: ABC Plumbing (John Smith)                              │
│  Current Agent: Mike Anderson                                  │
│                                                                │
│  ─────────────────────────────────────────────────────────────│
│                                                                │
│  Reassign To *                                                 │
│  ┌────────────────────────────────────────────────────────────┐│
│  │ Sarah Lee                                              ▼  ││
│  ├────────────────────────────────────────────────────────────┤│
│  │ ○ Sarah Lee (28 active leads)                             ││
│  │ ○ John Davis (32 active leads)                            ││
│  │ ○ Emily Chen (25 active leads)                            ││
│  │ ○ Tom Wilson (18 active leads)                            ││
│  └────────────────────────────────────────────────────────────┘│
│                                                                │
│  Reason *                                                      │
│  ┌────────────────────────────────────────────────────────────┐│
│  │ Workload Balance                                       ▼  ││
│  ├────────────────────────────────────────────────────────────┤│
│  │ ○ Agent Left Company                                      ││
│  │ ○ Territory Change                                        ││
│  │ ● Workload Balance                                        ││
│  │ ○ Customer Request                                        ││
│  │ ○ Performance Issue                                       ││
│  │ ○ Other                                                   ││
│  └────────────────────────────────────────────────────────────┘│
│                                                                │
│  Notes (optional)                                              │
│  ┌────────────────────────────────────────────────────────────┐│
│  │ Mike is overloaded this month, redistributing leads.      ││
│  └────────────────────────────────────────────────────────────┘│
│                                                                │
│  ☐ Notify new agent via email                                 │
│  ☐ Notify previous agent via email                            │
│                                                                │
│  ─────────────────────────────────────────────────────────────│
│                                                                │
│                        [Cancel]    [Reassign Lead]             │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### Bulk Reassignment Modal

```
┌────────────────────────────────────────────────────────────────┐
│  Bulk Reassign Leads                                     [X]  │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Selected: 8 leads                                             │
│                                                                │
│  ┌────────────────────────────────────────────────────────────┐│
│  │ • ABC Plumbing (from Mike A.)                             ││
│  │ • Quick Electric (from Mike A.)                           ││
│  │ • Metro HVAC (from Mike A.)                               ││
│  │ • City Roofing (from Mike A.)                             ││
│  │ • Pro Landscaping (unassigned)                            ││
│  │ • Best Plumbers (from John D.)                            ││
│  │ • Top Electric (from John D.)                             ││
│  │ • Prime HVAC (unassigned)                                 ││
│  └────────────────────────────────────────────────────────────┘│
│                                                                │
│  Reassign All To *                                             │
│  ┌────────────────────────────────────────────────────────────┐│
│  │ Emily Chen (25 active leads)                           ▼  ││
│  └────────────────────────────────────────────────────────────┘│
│                                                                │
│  Reason *                                                      │
│  ┌────────────────────────────────────────────────────────────┐│
│  │ Agent Left Company                                     ▼  ││
│  └────────────────────────────────────────────────────────────┘│
│                                                                │
│  ─────────────────────────────────────────────────────────────│
│                                                                │
│                       [Cancel]    [Reassign 8 Leads]           │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### Batch Upload Flow

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Batch Upload Leads                                                    [X]  │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  STEP 1: Download Template                                                   │
│  ┌────────────────────────────────────────────────────────────────────────┐│
│  │                                                                        ││
│  │  📄 Download our Excel template to ensure proper formatting.           ││
│  │                                                                        ││
│  │     [⬇️ Download Template (.xlsx)]                                     ││
│  │                                                                        ││
│  └────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  STEP 2: Assign To Agent *                                                   │
│  ┌────────────────────────────────────────────────────────────────────────┐│
│  │ Select agent to receive these leads...                              ▼ ││
│  ├────────────────────────────────────────────────────────────────────────┤│
│  │ ○ Mike Anderson (47 active leads)                                     ││
│  │ ○ Sarah Lee (28 active leads)                                         ││
│  │ ○ John Davis (32 active leads)                                        ││
│  │ ○ Emily Chen (25 active leads)                                        ││
│  │ ○ Tom Wilson (18 active leads)                                        ││
│  │ ─────────────────────────────────────────────────────────────────────  ││
│  │ ○ Round-Robin (distribute evenly among all agents)                    ││
│  └────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  STEP 3: Upload File                                                         │
│  ┌────────────────────────────────────────────────────────────────────────┐│
│  │                                                                        ││
│  │     ┌──────────────────────────────────────────────────────────────┐  ││
│  │     │                                                              │  ││
│  │     │           📁 Drag & drop your Excel file here               │  ││
│  │     │                                                              │  ││
│  │     │                   or click to browse                        │  ││
│  │     │                                                              │  ││
│  │     │           Accepts: .xlsx, .xls, .csv                        │  ││
│  │     │                                                              │  ││
│  │     └──────────────────────────────────────────────────────────────┘  ││
│  │                                                                        ││
│  └────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│                                 [Cancel]    [Upload & Preview]               │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Batch Upload Preview

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Preview Import: December_Leads.xlsx                                   [X]  │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Assigning to: Emily Chen                                                    │
│  File: December_Leads.xlsx (24 KB)                                          │
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ Total Rows   │  │ Valid        │  │ Errors       │  │ Duplicates   │    │
│  │     50       │  │    46        │  │     2        │  │     2        │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  ⚠️ ISSUES FOUND (4)                                                        │
│  ┌────────────────────────────────────────────────────────────────────────┐│
│  │ Row 12: Invalid email format "john@"                         [Skip]   ││
│  │ Row 23: Missing required field "Company Name"                [Skip]   ││
│  │ Row 31: Duplicate - "ABC Plumbing" already exists (Mike A.)  [Skip]   ││
│  │ Row 45: Duplicate - "Metro HVAC" already exists (Sarah L.)   [Skip]   ││
│  └────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  ✓ VALID LEADS PREVIEW (46)                                                 │
│  ┌────────────────────────────────────────────────────────────────────────┐│
│  │ Row│ Company           │ Contact      │ Phone        │ Email          ││
│  ├────┼───────────────────┼──────────────┼──────────────┼────────────────┤│
│  │  1 │ Quick Fix Plumbing│ Tom Johnson  │ 602-555-1111 │ tom@quick...   ││
│  │  2 │ Premier Electric  │ Jane Wilson  │ 602-555-2222 │ jane@prem...   ││
│  │  3 │ Comfort HVAC      │ Bob Smith    │ 602-555-3333 │ bob@comfo...   ││
│  │  4 │ Reliable Roofing  │ Sue Brown    │ 602-555-4444 │ sue@relia...   ││
│  │ ...│ ...               │ ...          │ ...          │ ...            ││
│  └────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  Showing 1-10 of 46 valid leads                        [< Prev] [Next >]    │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  ☑ Skip rows with errors (2 rows)                                           │
│  ☑ Skip duplicate leads (2 rows)                                            │
│  ☐ Notify Emily Chen via email about new leads                              │
│                                                                              │
│                          [Cancel]    [Import 46 Leads]                       │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Upload Success

```
┌────────────────────────────────────────────────────────────────┐
│  ✓ Import Complete                                       [X]  │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│                          ✅                                    │
│                                                                │
│            46 leads imported successfully!                     │
│                                                                │
│  ┌────────────────────────────────────────────────────────────┐│
│  │ Assigned to:    Emily Chen                                ││
│  │ Imported:       46 leads                                  ││
│  │ Skipped:        4 rows (2 errors, 2 duplicates)          ││
│  │ Source:         December_Leads.xlsx                       ││
│  └────────────────────────────────────────────────────────────┘│
│                                                                │
│  ─────────────────────────────────────────────────────────────│
│                                                                │
│      [View Leads]    [Download Error Report]    [Close]        │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### Batch Upload History (Management)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Batch Upload History                                                        │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐│
│  │ Date       │ File                  │ Uploaded By│ Agent    │ Status    ││
│  ├────────────┼───────────────────────┼────────────┼──────────┼───────────┤│
│  │ Dec 14     │ December_Leads.xlsx   │ Admin      │ Emily C. │ ✓ 46/50   ││
│  │ Dec 10     │ November_Leads.xlsx   │ Admin      │ Mike A.  │ ✓ 38/40   ││
│  │ Dec 5      │ Referral_List.csv     │ Admin      │ Sarah L. │ ✓ 12/12   ││
│  │ Nov 28     │ Trade_Show_Leads.xlsx │ Admin      │ Round-R. │ ✓ 85/92   ││
│  └────────────┴───────────────────────┴────────────┴──────────┴───────────┘│
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Excel Template Format

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  TradesCaptain_Lead_Upload_Template.xlsx                                     │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Required Columns (highlighted in yellow):                                   │
│  ┌────────────────────────────────────────────────────────────────────────┐│
│  │ company_name*│contact_name*│ email      │ phone      │ trade_type    ││
│  ├──────────────┼─────────────┼────────────┼────────────┼───────────────┤│
│  │ ABC Plumbing │ John Smith  │ john@...   │ 602-555... │ plumber       ││
│  └──────────────┴─────────────┴────────────┴────────────┴───────────────┘│
│                                                                              │
│  Optional Columns:                                                           │
│  ┌────────────────────────────────────────────────────────────────────────┐│
│  │ address    │ city     │ state │ zip   │ employee_count │ notes        ││
│  ├────────────┼──────────┼───────┼───────┼────────────────┼──────────────┤│
│  │ 123 Main St│ Phoenix  │ AZ    │ 85001 │ 2-5            │ Met at show  ││
│  └────────────┴──────────┴───────┴───────┴────────────────┴──────────────┘│
│                                                                              │
│  Trade Types: plumber, electrician, hvac, general_contractor, roofer,       │
│               landscaper, painter, cleaner, other                            │
│                                                                              │
│  Employee Count: 1, 2-5, 6-10, 11-20, 20+                                   │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## KPIs & Analytics

### Agent KPIs (Visible to Agent for Their Own Performance)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  My Performance                                              December 2024  │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  SALES METRICS                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ Deals Closed │  │ Revenue      │  │ Avg Deal     │  │ Close Rate   │    │
│  │ This Month   │  │ Generated    │  │ Size         │  │              │    │
│  │     7        │  │  $2,845      │  │   $406       │  │    32%       │    │
│  │ ↑ 2 vs last  │  │ ↑ $580       │  │ ↑ $45        │  │ ↓ 3%         │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                                              │
│  LEAD METRICS                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ Active Leads │  │ New Leads    │  │ Leads        │  │ Avg Days to  │    │
│  │              │  │ This Month   │  │ Contacted    │  │ First Contact│    │
│  │     47       │  │     12       │  │   42 (89%)   │  │   1.2 days   │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                                              │
│  COMMISSION METRICS                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ Pending      │  │ Eligible     │  │ Paid This    │  │ Total        │    │
│  │ Commission   │  │ For Payout   │  │ Month        │  │ YTD          │    │
│  │   $425       │  │  $1,247      │  │  $2,180      │  │  $18,420     │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                                              │
│  RETENTION METRICS                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ My Customer  │  │ Month 3 Call │  │ Retention    │  │ Retention    │    │
│  │ Retention    │  │ Completion   │  │ Bonuses      │  │ Bonuses      │    │
│  │    87%       │  │    94%       │  │ This Month   │  │ YTD          │    │
│  │              │  │              │  │   $240       │  │  $1,890      │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  10+ DEAL BONUS PROGRESS                                                    │
│  ┌────────────────────────────────────────────────────────────────────────┐│
│  │ ████████████████████░░░░░░░░░░  7/10 deals                            ││
│  │ Close 3 more deals this month for 10% revenue bonus!                   ││
│  │ Potential bonus: $284.50                                               ││
│  └────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  MONTHLY TREND (Last 6 Months)                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐│
│  │ Month │ Deals│ Revenue │ Commission │ Retention │ Bonus              ││
│  ├───────┼──────┼─────────┼────────────┼───────────┼────────────────────┤│
│  │ Jul   │   5  │ $1,995  │   $847     │   82%     │ --                 ││
│  │ Aug   │   8  │ $3,192  │  $1,356    │   85%     │ $319 (10+ deals)   ││
│  │ Sep   │   6  │ $2,394  │  $1,017    │   88%     │ --                 ││
│  │ Oct   │  10  │ $3,990  │  $1,695    │   86%     │ $399 (10+ deals)   ││
│  │ Nov   │   5  │ $1,995  │   $847     │   89%     │ --                 ││
│  │ Dec*  │   7  │ $2,845  │  $1,247    │   87%     │ TBD                ││
│  └───────┴──────┴─────────┴────────────┴───────────┴────────────────────┘│
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  PLAN MIX (YTD)                                                             │
│  ┌────────────────────────────────────────────────────────────────────────┐│
│  │ Blue Plans:  ███████████░░░░░░░░░  35% (12 deals)                     ││
│  │ Web Plans:   █████░░░░░░░░░░░░░░░  18% (6 deals)                      ││
│  │ Gold Plans:  ███████████████░░░░░  47% (16 deals)                     ││
│  │                                                                        ││
│  │ Monthly:     ████████████████░░░░  72% (24 deals)                     ││
│  │ Annual:      ███████░░░░░░░░░░░░░  28% (10 deals)                     ││
│  └────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  MY GOALS (This Month)                                                       │
│  ┌────────────────────────────────────────────────────────────────────────┐│
│  │ Monthly Deals:    ██████████████░░░░░░  7/10    70%                   ││
│  │ Monthly Revenue:  █████████████████░░░  $2,845/$3,500  81%            ││
│  │ Retention Rate:   █████████████████░░░  87%/90%  97%                  ││
│  │ Lead Response:    ████████████████████  <2 hrs ✓                      ││
│  └────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Management KPIs (Visible to Admin/Super Admin Only)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Management Dashboard                                        December 2024  │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  REVENUE METRICS                                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ MRR          │  │ ARR          │  │ MRR Growth   │  │ Avg Revenue  │    │
│  │              │  │              │  │ (MoM)        │  │ Per Account  │    │
│  │  $47,850     │  │  $574,200    │  │   +8.2%      │  │   $195       │    │
│  │ ↑ $3,620     │  │              │  │              │  │ ↑ $12        │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                                              │
│  CUSTOMER METRICS                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ Total Active │  │ New This     │  │ Churned This │  │ Net New      │    │
│  │ Customers    │  │ Month        │  │ Month        │  │              │    │
│  │    245       │  │     24       │  │      3       │  │    +21       │    │
│  │              │  │ ↑ 4 vs last  │  │ ↓ 2 vs last  │  │              │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ Churn Rate   │  │ Trial Conv.  │  │ Avg Customer │  │ LTV          │    │
│  │ (Monthly)    │  │ Rate         │  │ Lifespan     │  │              │    │
│  │    1.2%      │  │    34%       │  │  14 months   │  │   $2,730     │    │
│  │ ↓ 0.3%       │  │ ↑ 5%         │  │ ↑ 2 months   │  │              │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                                              │
│  LEAD METRICS                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ Total Leads  │  │ Unassigned   │  │ Lead → Deal  │  │ Avg Response │    │
│  │              │  │ Leads        │  │ Conversion   │  │ Time         │    │
│  │    312       │  │     5        │  │    34%       │  │   2.4 hours  │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  AGENT LEADERBOARD (This Month)                                             │
│  ┌────────────────────────────────────────────────────────────────────────┐│
│  │ Rank│ Agent           │ Leads│ Deals │ Revenue  │ Close % │ Retention ││
│  ├─────┼─────────────────┼──────┼───────┼──────────┼─────────┼───────────┤│
│  │ 🥇  │ Mike Anderson   │  47  │   7   │ $2,845   │   32%   │   87%     ││
│  │ 🥈  │ Sarah Lee       │  28  │   6   │ $2,394   │   38%   │   92%     ││
│  │ 🥉  │ John Davis      │  32  │   5   │ $1,995   │   28%   │   85%     ││
│  │ 4   │ Emily Chen      │  25  │   4   │ $1,596   │   35%   │   88%     ││
│  │ 5   │ Tom Wilson      │  18  │   3   │ $1,047   │   25%   │   79%     ││
│  ├─────┼─────────────────┼──────┼───────┼──────────┼─────────┼───────────┤│
│  │     │ TEAM TOTAL      │ 150  │  25   │ $9,877   │   32%   │   86%     ││
│  └─────┴─────────────────┴──────┴───────┴──────────┴─────────┴───────────┘│
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  REVENUE BY PLAN TYPE                                                       │
│  ┌────────────────────────────────────────────────────────────────────────┐│
│  │ Plan Type         │ Customers │ MRR       │ % of Total │ Churn Rate  ││
│  ├───────────────────┼───────────┼───────────┼────────────┼─────────────┤│
│  │ Blue (Individuals)│ 95        │ $8,955    │ 18.7%      │ 1.8%        ││
│  │ Blue (Teams)      │ 24        │ $5,976    │ 12.5%      │ 0.8%        ││
│  │ Web               │ 62        │ $14,438   │ 30.2%      │ 1.2%        ││
│  │ Gold (Individuals)│ 54        │ $18,246   │ 38.1%      │ 0.9%        ││
│  │ Gold (Teams)      │ 10        │ $5,235    │ 10.9%      │ 0.5%        ││
│  ├───────────────────┼───────────┼───────────┼────────────┼─────────────┤│
│  │ TOTAL             │ 245       │ $47,850   │ 100%       │ 1.2%        ││
│  └───────────────────┴───────────┴───────────┴────────────┴─────────────┘│
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  COMMISSION LIABILITY                                                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ Pending      │  │ Eligible     │  │ Paid This    │  │ Paid         │    │
│  │ (All Agents) │  │ For Payout   │  │ Month        │  │ YTD          │    │
│  │  $3,420      │  │  $4,280      │  │  $8,750      │  │  $94,200     │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  COHORT RETENTION ANALYSIS                                                   │
│  ┌────────────────────────────────────────────────────────────────────────┐│
│  │ Cohort   │ Start │ Mo 3  │ Mo 6  │ Mo 12 │ Current │ LTV/Customer   ││
│  ├──────────┼───────┼───────┼───────┼───────┼─────────┼────────────────┤│
│  │ Jan 2024 │  18   │ 89%   │ 78%   │ 67%   │ 61%     │ $2,450         ││
│  │ Feb 2024 │  22   │ 91%   │ 82%   │ 73%   │ 68%     │ $2,680         ││
│  │ Mar 2024 │  20   │ 90%   │ 80%   │ 70%   │ 70%     │ $2,590         ││
│  │ Apr 2024 │  24   │ 92%   │ 83%   │ --    │ 79%     │ $2,840*        ││
│  │ May 2024 │  19   │ 89%   │ 79%   │ --    │ 74%     │ $2,320*        ││
│  │ Jun 2024 │  21   │ 90%   │ 81%   │ --    │ 81%     │ $2,510*        ││
│  │ ...      │       │       │       │       │         │                ││
│  │ Nov 2024 │  20   │ 90%   │ --    │ --    │ 90%     │ $780*          ││
│  │ Dec 2024 │  24   │ --    │ --    │ --    │ 100%    │ $390*          ││
│  └──────────┴───────┴───────┴───────┴───────┴─────────┴────────────────┘│
│  * Projected based on current trajectory                                    │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  MRR TREND (12 Months)                                                       │
│  ┌────────────────────────────────────────────────────────────────────────┐│
│  │ $50k │                                              ╭───               ││
│  │ $45k │                                    ╭─────────╯                  ││
│  │ $40k │                          ╭─────────╯                            ││
│  │ $35k │              ╭───────────╯                                      ││
│  │ $30k │    ╭─────────╯                                                  ││
│  │ $25k │────╯                                                            ││
│  │      └─────────────────────────────────────────────────────────────    ││
│  │        Jan   Feb   Mar   Apr   May   Jun   Jul   Aug   Sep   Oct   Nov ││
│  └────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Agent Performance Comparison (Management Only)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Agent Performance Comparison                                December 2024  │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐│
│  │ Agent           │Leads│Deals│Revenue │Close %│Avg Deal│Retention│Comm ││
│  ├─────────────────┼─────┼─────┼────────┼───────┼────────┼─────────┼──────┤│
│  │ Mike Anderson   │  47 │  34 │$12,845 │ 32%   │ $378   │ 87%     │$5,420││
│  │ Sarah Lee       │  28 │  28 │$10,892 │ 38%   │ $389   │ 92%     │$4,580││
│  │ John Davis      │  32 │  25 │ $9,125 │ 28%   │ $365   │ 85%     │$3,890││
│  │ Emily Chen      │  25 │  22 │ $8,756 │ 35%   │ $398   │ 88%     │$3,420││
│  │ Tom Wilson      │  18 │  18 │ $6,534 │ 25%   │ $363   │ 79%     │$2,780││
│  ├─────────────────┼─────┼─────┼────────┼───────┼────────┼─────────┼──────┤│
│  │ TEAM AVERAGE    │  30 │  25 │ $9,630 │ 32%   │ $385   │ 86%     │$4,018││
│  │ TEAM TOTAL      │ 150 │ 127 │$48,152 │       │        │         │$20,090│
│  └─────────────────┴─────┴─────┴────────┴───────┴────────┴─────────┴──────┘│
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  PERFORMANCE BARS                                                           │
│                                                                              │
│  Close Rate                                                                  │
│  Sarah L. █████████████████████████████████████████████  38%   ⭐ Best     │
│  Emily C. ████████████████████████████████████  35%                        │
│  Mike A.  ███████████████████████████████  32%                             │
│  John D.  ██████████████████████████  28%                                  │
│  Tom W.   █████████████████████  25%                                       │
│                                                                              │
│  Customer Retention                                                         │
│  Sarah L. █████████████████████████████████████████████  92%   ⭐ Best     │
│  Emily C. ████████████████████████████████████████  88%                    │
│  Mike A.  ███████████████████████████████████████  87%                     │
│  John D.  █████████████████████████████████████  85%                       │
│  Tom W.   ██████████████████████████████████  79%                          │
│                                                                              │
│  Response Time (Avg hours to first contact)                                 │
│  Emily C. █████  1.8 hrs   ⭐ Best                                         │
│  Mike A.  ██████  2.1 hrs                                                  │
│  Sarah L. ███████  2.4 hrs                                                 │
│  John D.  █████████  3.2 hrs                                               │
│  Tom W.   ████████████  4.5 hrs                                            │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Goal Management (Management Only)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Agent Goals                                                 December 2024  │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [+ Set Goals for All]   [Copy from Last Month]                             │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐│
│  │ Agent           │ Deal Goal │ Actual │ Rev Goal   │ Actual │ Status   ││
│  ├─────────────────┼───────────┼────────┼────────────┼────────┼──────────┤│
│  │ Mike Anderson   │ 10        │ 7      │ $3,500     │ $2,845 │ 🟡 70%   ││
│  │ Sarah Lee       │ 8         │ 6      │ $3,000     │ $2,394 │ 🟡 75%   ││
│  │ John Davis      │ 8         │ 5      │ $2,500     │ $1,995 │ 🟡 63%   ││
│  │ Emily Chen      │ 6         │ 4      │ $2,000     │ $1,596 │ 🟡 67%   ││
│  │ Tom Wilson      │ 5         │ 3      │ $1,500     │ $1,047 │ 🟡 60%   ││
│  └─────────────────┴───────────┴────────┴────────────┴────────┴──────────┘│
│                                                                              │
│  🟢 On track (≥90%)   🟡 Behind (50-89%)   🔴 At risk (<50%)               │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  EDIT GOALS: Mike Anderson                                                  │
│  ┌────────────────────────────────────────────────────────────────────────┐│
│  │ Monthly Deal Goal:     [  10  ]                                        ││
│  │ Monthly Revenue Goal:  [ $3,500 ]                                      ││
│  │ Retention Target:      [  90% ]                                        ││
│  │ Response Time Target:  [ <2 hrs ]                                      ││
│  │                                                                        ││
│  │                            [Cancel]  [Save Goals]                      ││
│  └────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Database Tables for KPIs

```sql
-- Agent goals
CREATE TABLE agent_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES admin_users(id) NOT NULL,
  period_type TEXT NOT NULL, -- 'monthly', 'quarterly', 'yearly'
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Goals
  deal_goal INTEGER,
  revenue_goal DECIMAL(10,2),
  retention_goal DECIMAL(5,2), -- percentage
  response_time_goal INTEGER, -- minutes
  
  -- Actuals (updated via cron)
  deal_actual INTEGER DEFAULT 0,
  revenue_actual DECIMAL(10,2) DEFAULT 0,
  retention_actual DECIMAL(5,2),
  response_time_actual INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(agent_id, period_type, period_start)
);

-- Daily snapshots for trend charts
CREATE TABLE daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  
  -- Revenue
  mrr DECIMAL(10,2),
  arr DECIMAL(10,2),
  
  -- Customers
  total_crm_accounts INTEGER,
  total_web_customers INTEGER,
  total_gold_customers INTEGER,
  active_trials INTEGER,
  
  -- Changes
  new_customers INTEGER,
  churned_customers INTEGER,
  upgrades INTEGER,
  downgrades INTEGER,
  
  -- Leads
  total_leads INTEGER,
  new_leads INTEGER,
  converted_leads INTEGER,
  
  -- Commissions
  commissions_pending DECIMAL(10,2),
  commissions_eligible DECIMAL(10,2),
  commissions_paid DECIMAL(10,2),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cohort tracking
CREATE TABLE cohorts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_month DATE NOT NULL UNIQUE, -- First of month
  
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

-- Agent performance snapshots (daily)
CREATE TABLE agent_daily_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES admin_users(id) NOT NULL,
  date DATE NOT NULL,
  
  -- Leads
  total_leads INTEGER,
  new_leads INTEGER,
  contacted_leads INTEGER,
  
  -- Sales
  deals_closed INTEGER,
  revenue_generated DECIMAL(10,2),
  avg_deal_size DECIMAL(10,2),
  
  -- Conversion
  close_rate DECIMAL(5,2),
  avg_response_time_minutes INTEGER,
  
  -- Retention
  active_customers INTEGER,
  churned_customers INTEGER,
  retention_rate DECIMAL(5,2),
  
  -- Commissions
  commission_earned DECIMAL(10,2),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(agent_id, date)
);

CREATE INDEX idx_agent_performance_date ON agent_daily_performance(date);
CREATE INDEX idx_agent_performance_agent ON agent_daily_performance(agent_id);
```

| Permission | Super Admin | Admin | Agent | Support | Finance |
|------------|-------------|-------|-------|---------|---------|
| **Accounts** |
| View all accounts | ✓ | ✓ | Own only | ✓ | ✓ |
| Create accounts | ✓ | ✓ | ✓ | ✗ | ✗ |
| Edit accounts | ✓ | ✓ | Own only | Limited | ✗ |
| Cancel accounts | ✓ | ✓ | ✗ | ✗ | ✗ |
| Impersonate | ✓ | ✓ | ✗ | ✓ | ✗ |
| **Leads** |
| View all leads | ✓ | ✓ | **Own only** | ✓ | ✗ |
| View other agents' leads | ✓ | ✓ | **✗ NEVER** | ✓ | ✗ |
| Create leads | ✓ | ✓ | ✓ | ✗ | ✗ |
| Edit leads | ✓ | ✓ | Own only | ✗ | ✗ |
| Reassign leads | ✓ | ✓ | **✗ NEVER** | ✗ | ✗ |
| Batch upload leads | ✓ | ✓ | ✗ | ✗ | ✗ |
| Export leads | ✓ | ✓ | Own only | ✗ | ✗ |
| Delete leads | ✓ | ✗ | ✗ | ✗ | ✗ |
| **Agents** |
| View all agents | ✓ | ✓ | ✗ | ✗ | ✗ |
| View agent names | ✓ | ✓ | **✗ NEVER** | ✗ | ✓ |
| Manage agents | ✓ | ✓ | ✗ | ✗ | ✗ |
| View agent performance | ✓ | ✓ | Own only | ✗ | ✓ |
| **Commissions** |
| View all commissions | ✓ | ✓ | Own only | ✗ | ✓ |
| Approve commissions | ✓ | ✓ | ✗ | ✗ | ✓ |
| Pay commissions | ✓ | ✗ | ✗ | ✗ | ✓ |
| **Other** |
| View reports | ✓ | ✓ | Limited | ✗ | ✓ |
| Manage settings | ✓ | ✗ | ✗ | ✗ | ✗ |
| Create invoices | ✓ | ✓ | ✓ | ✗ | ✗ |
| Issue refunds | ✓ | ✓ | ✗ | ✗ | ✓ |

### Critical Privacy Rules

1. **Agents CANNOT see other agents' leads** - This is enforced at the database level via Row Level Security
2. **Agents CANNOT see other agents' names** - Dropdown selectors and lists are hidden from agent role
3. **Agents CANNOT reassign leads** - Only management can transfer leads between agents
4. **Agents CANNOT access bulk upload** - Prevents them from seeing the agent selection dropdown

---

## API Endpoints

### Authentication
- `POST /api/admin/auth/login` - Admin login
- `POST /api/admin/auth/logout` - Admin logout
- `POST /api/admin/auth/2fa/setup` - Setup 2FA
- `POST /api/admin/auth/2fa/verify` - Verify 2FA

### Leads
- `GET /api/admin/leads` - List leads (agents see own only, management sees all)
- `GET /api/admin/leads/:id` - Get lead details
- `POST /api/admin/leads` - Create lead (auto-assigns to creating agent)
- `PATCH /api/admin/leads/:id` - Update lead (agents can only update own)
- `DELETE /api/admin/leads/:id` - Delete lead (super_admin only)
- `POST /api/admin/leads/:id/reassign` - Reassign lead (management only)
- `POST /api/admin/leads/batch-reassign` - Bulk reassign (management only)
- `POST /api/admin/leads/:id/activity` - Log activity on lead
- `GET /api/admin/leads/:id/activities` - Get lead activity history
- `GET /api/admin/leads/export` - Export leads to CSV (agents export own, management exports all)

### Lead Batch Upload
- `GET /api/admin/leads/template` - Download Excel template
- `POST /api/admin/leads/upload` - Upload Excel/CSV file (management only)
- `POST /api/admin/leads/upload/preview` - Preview import with validation
- `POST /api/admin/leads/upload/confirm` - Confirm and execute import
- `GET /api/admin/leads/uploads` - List batch upload history
- `GET /api/admin/leads/uploads/:id` - Get upload details with errors

### Accounts
- `GET /api/admin/accounts` - List all CRM accounts
- `GET /api/admin/accounts/:id` - Get account details
- `POST /api/admin/accounts` - Create account
- `PATCH /api/admin/accounts/:id` - Update account
- `DELETE /api/admin/accounts/:id` - Cancel account
- `POST /api/admin/accounts/:id/impersonate` - Start impersonation

### Web Customers
- `GET /api/admin/web-customers` - List web customers
- `GET /api/admin/web-customers/:id` - Get customer details
- `POST /api/admin/web-customers` - Create web customer
- `PATCH /api/admin/web-customers/:id` - Update customer

### Agents
- `GET /api/admin/agents` - List agents
- `GET /api/admin/agents/:id` - Get agent details
- `POST /api/admin/agents` - Create agent
- `PATCH /api/admin/agents/:id` - Update agent
- `GET /api/admin/agents/:id/performance` - Agent performance

### Commissions
- `GET /api/admin/commissions` - List commissions
- `GET /api/admin/commissions/pending` - Pending commissions
- `GET /api/admin/commissions/eligible` - Eligible for payout
- `POST /api/admin/commissions/:id/approve` - Approve commission
- `POST /api/admin/commissions/batch-approve` - Batch approve
- `POST /api/admin/commissions/:id/pay` - Mark as paid
- `POST /api/admin/commissions/batch-pay` - Batch pay

### Invoices
- `GET /api/admin/invoices` - List invoices
- `POST /api/admin/invoices` - Create invoice
- `POST /api/admin/invoices/:id/send` - Send invoice

### Coupons
- `GET /api/admin/coupons` - List coupons
- `POST /api/admin/coupons` - Create coupon
- `GET /api/admin/coupons/:code/validate` - Validate coupon

### Retention
- `GET /api/admin/retention/tasks` - Get retention tasks
- `POST /api/admin/retention/:id/call-completed` - Mark call complete
- `POST /api/admin/retention/:id/audit-sent` - Mark audit sent

### Reports
- `GET /api/admin/reports/revenue` - Revenue report
- `GET /api/admin/reports/commissions` - Commission report
- `GET /api/admin/reports/churn` - Churn report
- `GET /api/admin/reports/agent-performance` - Agent performance

### Webhooks
- `POST /api/webhooks/stripe` - Stripe webhook handler

### Client Registration (Public)
- `POST /api/register` - Self-serve registration
- `POST /api/register/validate-coupon` - Validate coupon code

---

## Cron Jobs

### Daily (2:00 AM)

```typescript
// Process trial expirations
async function processTrialExpirations() {
  const expiredTrials = await db.crm_accounts.findMany({
    where: {
      is_trial: true,
      trial_ends_at: { lte: new Date() },
      status: 'trial',
    }
  });
  
  for (const account of expiredTrials) {
    if (account.stripe_subscription_id) {
      // Has payment method - convert to paid
      await convertTrialToPaid(account);
    } else {
      // No payment method - suspend
      await suspendAccount(account);
      await sendEmail(account.email, 'trial_expired');
    }
  }
}

// Process promo expirations (1 year free CRM)
async function processPromoExpirations() {
  const expiredPromos = await db.crm_accounts.findMany({
    where: {
      promo_type: 'free_with_web',
      promo_ends_at: { lte: new Date() },
      status: 'active',
    }
  });
  
  for (const account of expiredPromos) {
    // Check if they added payment method
    if (account.stripe_subscription_id) {
      // Start billing
      await startBilling(account);
      await sendEmail(account.email, 'promo_ended_billing_started');
    } else {
      // Suspend access
      await suspendAccount(account);
      await sendEmail(account.email, 'promo_ended_payment_required');
    }
  }
}

// Send reminder emails
async function sendReminders() {
  // Trial ending in 7 days
  const trials7Days = await db.crm_accounts.findMany({
    where: {
      is_trial: true,
      trial_ends_at: {
        gte: addDays(new Date(), 6),
        lte: addDays(new Date(), 7),
      }
    }
  });
  
  for (const account of trials7Days) {
    await sendEmail(account.email, 'trial_ending_7_days');
  }
  
  // Promo ending in 30 days
  const promos30Days = await db.crm_accounts.findMany({
    where: {
      promo_type: 'free_with_web',
      promo_ends_at: {
        gte: addDays(new Date(), 29),
        lte: addDays(new Date(), 30),
      }
    }
  });
  
  for (const account of promos30Days) {
    await sendEmail(account.email, 'promo_ending_30_days');
  }
}

// Generate retention tasks
async function generateRetentionTasks() {
  // Find accounts hitting month 3 this week
  const month3Accounts = await db.crm_accounts.findMany({
    where: {
      created_at: {
        gte: subMonths(new Date(), 3),
        lte: subMonths(addDays(new Date(), 7), 3),
      },
      status: 'active',
      billing_interval: 'month',
    }
  });
  
  for (const account of month3Accounts) {
    // Create retention task if not exists
    await db.retention_tracking.upsert({
      where: { crm_account_id: account.id },
      create: {
        crm_account_id: account.id,
        agent_id: account.agent_id,
      },
      update: {}
    });
  }
}
```

### Hourly

```typescript
// Retry failed payments (Stripe handles this, but we track)
async function syncPaymentStatus() {
  const pastDueAccounts = await db.crm_accounts.findMany({
    where: { status: 'past_due' }
  });
  
  for (const account of pastDueAccounts) {
    const subscription = await stripe.subscriptions.retrieve(
      account.stripe_subscription_id
    );
    
    if (subscription.status === 'active') {
      await db.crm_accounts.update({
        where: { id: account.id },
        data: { status: 'active' }
      });
    }
  }
}
```

---

## Email Templates

| Email | Trigger | Content |
|-------|---------|---------|
| `trial_started` | Self-serve signup | Welcome, 14 days free, what's included |
| `trial_ending_7_days` | 7 days before trial end | Add payment to continue |
| `trial_ending_1_day` | 1 day before trial end | Last chance |
| `trial_converted` | Trial → Paid | Thanks, receipt |
| `trial_expired` | Trial ended, no payment | Access suspended, add payment to restore |
| `crm_coupon_welcome` | Web customer gets CRM coupon | Code, registration link, what's included |
| `crm_activated` | Customer registers with coupon | Welcome, login, getting started |
| `promo_ending_30_days` | 30 days before 1yr free ends | Add payment to continue |
| `promo_ending_7_days` | 7 days before 1yr free ends | Last chance |
| `promo_ended_billing_started` | 1yr ended, billing started | Now billing $49/mo |
| `promo_ended_payment_required` | 1yr ended, no payment | Access suspended |
| `web_cancelled_crm_ends` | Web plan cancelled | CRM access ending (promo users only) |
| `payment_failed` | Stripe payment failed | Update payment method |
| `payment_succeeded` | Payment processed | Receipt |
| `month_3_call_reminder` | Agent task due | Call this customer |

---

## Retention Call Scripts & Checklists

### Month 3 Check-In Call

**Purpose:** Confirm satisfaction, deliver competitor audit, prevent early churn

**Agent Script:**
```
"Hey [Name], this is [Agent] from TradesCaptain. 

Your site's been live for a few months now, and I wanted to check in before we 
kick into the next phase of SEO work.

A few quick questions:
1. Are leads coming through the website form?
2. Any issues with the CRM or calendar sync?
3. Anything you wish worked differently?

I also put together a competitor breakdown for you — I looked at your top 3 
competitors on Google Maps and identified exactly where we're going to beat them. 
I'll send that over right after this call.

Any questions before we get into the next phase?"
```

**Checklist:**
- [ ] Confirm website is live and functioning
- [ ] Verify leads are flowing through forms
- [ ] Check CRM adoption (are they using it?)
- [ ] Address any support issues
- [ ] Send Competitor Audit PDF
- [ ] Log call in system

### Month 6 Check-In

**Purpose:** Feature gap analysis, upsell opportunity

**Agent Script:**
```
"Hey [Name], quick 6-month check-in.

Looking at your account, you've [had X leads / booked Y jobs] since we started. 

A few things I wanted to cover:
1. Any features you feel are missing?
2. Are you using the [AI SMS / scheduling / quotes]?
3. Have you thought about adding team members?

Also wanted to let you know about [relevant upgrade/add-on if applicable]."
```

**Checklist:**
- [ ] Review customer metrics before call
- [ ] Identify unused features
- [ ] Check for upgrade opportunities
- [ ] Address any pain points
- [ ] Log call notes

### Month 12 Anniversary

**Purpose:** Renewal confirmation, upgrade/expansion discussion

**Agent Script:**
```
"Hey [Name], congratulations on a full year with TradesCaptain!

I wanted to personally thank you for sticking with us. Looking back:
- You've received [X] leads through your website
- Booked [Y] jobs through the CRM
- [Other relevant metrics]

As you go into year 2, I wanted to discuss:
1. Any expansion plans? Additional locations?
2. Ready to add team members?
3. Interest in upgrading to [higher tier]?

We also have [annual pricing / loyalty offer] if you're interested."
```

**Checklist:**
- [ ] Pull 12-month performance summary
- [ ] Identify upgrade/expansion opportunities
- [ ] Discuss annual billing option
- [ ] Confirm satisfaction
- [ ] Thank customer for loyalty
- [ ] Log call and outcome

### Competitor Audit Template (Delivered at Month 3)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                    LOCAL SEO COMPETITOR ANALYSIS                            │
│                    Prepared for: [Client Name]                              │
│                    Date: [Date]                                             │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  YOUR BUSINESS                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│  Google Reviews: [X] reviews, [X.X] avg rating                             │
│  Google Maps Ranking: #[X] for "[primary keyword]"                         │
│  Website Speed: [X]s load time                                             │
│                                                                              │
│  TOP 3 COMPETITORS                                                          │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  1. [Competitor Name]                                                       │
│     Reviews: [X] | Rating: [X.X] | Ranking: #[X]                           │
│     Strengths: [e.g., More reviews, faster site]                           │
│     Weaknesses: [e.g., Outdated design, no online booking]                 │
│                                                                              │
│  2. [Competitor Name]                                                       │
│     Reviews: [X] | Rating: [X.X] | Ranking: #[X]                           │
│     Strengths: [...]                                                       │
│     Weaknesses: [...]                                                      │
│                                                                              │
│  3. [Competitor Name]                                                       │
│     Reviews: [X] | Rating: [X.X] | Ranking: #[X]                           │
│     Strengths: [...]                                                       │
│     Weaknesses: [...]                                                      │
│                                                                              │
│  OUR STRATEGY TO BEAT THEM                                                  │
│  ─────────────────────────────────────────────────────────────────────────  │
│  1. Review velocity: Target [X] new reviews/month                          │
│  2. Content gaps: Create pages for [keywords they rank for]                │
│  3. Technical edge: Your site loads [X]s faster                            │
│  4. Conversion advantage: Online booking = more leads                       │
│                                                                              │
│  NEXT 90 DAYS ACTION PLAN                                                   │
│  ─────────────────────────────────────────────────────────────────────────  │
│  Month 4: [Specific actions]                                               │
│  Month 5: [Specific actions]                                               │
│  Month 6: [Specific actions]                                               │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Priority

### Week 1: Core Admin
- Admin authentication (login, roles)
- Admin dashboard
- Basic account listing (CRM + Web)
- Activity logging

### Week 2: Agent Portal
- Agent dashboard
- New customer form
- Commission tracking (view only)
- My customers list

### Week 3: Billing Integration
- Stripe product/price setup
- Invoice creation flow
- Webhook handlers
- Payment tracking

### Week 4: Commission System
- Commission calculation logic
- Eligibility tracking
- Approval workflow
- Payout tracking

### Week 5: Retention & Promos
- Coupon system
- Trial management
- Retention task tracking
- Retention bonus processing

### Week 6: Polish & Reports
- Reports dashboard
- Email automations
- Cron jobs
- Testing & bug fixes

---

## Security Considerations

1. **Authentication**
   - JWT tokens with short expiry (15 min access, 7 day refresh)
   - 2FA required for super_admin role
   - Session invalidation on password change

2. **Authorization**
   - Role-based access control (RBAC)
   - Row-level security in Supabase
   - Agents can only see their own data

3. **Audit Trail**
   - All admin actions logged
   - IP address and user agent recorded
   - Impersonation logged with audit trail

4. **Data Protection**
   - Stripe handles all payment data (PCI compliant)
   - Passwords hashed with bcrypt
   - Sensitive data encrypted at rest

5. **Rate Limiting**
   - Login: 5 attempts per 15 minutes
   - API: 100 requests per minute
   - Webhooks: Signature verification required

---

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email (Resend)
RESEND_API_KEY=re_...
EMAIL_FROM=invoices@tradescaptain.com

# Auth
JWT_SECRET=...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://app.tradescaptain.com

# App
NEXT_PUBLIC_APP_URL=https://app.tradescaptain.com
ADMIN_PORTAL_URL=https://app.tradescaptain.com/admin
```

---

## Notes

- This prompt covers the complete Admin Portal with all pricing, commission, and billing logic
- The CRM customer-facing features are handled by separate prompts
- Stripe Connect for customer invoicing (their customers) is separate from this billing system
- Annual plans get 35% commission with no recurring - this is intentional to encourage monthly sales for recurring income
- Retention bonuses only apply to monthly plans since annual customers are already committed
- The 12-month recurring cap (payments 3-14) prevents indefinite commission liability