# TradesCaptain CRM — Complete Implementation Prompt

**Version:** 5.8  
**Date:** December 2025  
**Scope:** Plan Details, Commission Calculator, Commission Tracker  
**Priority:** HIGH — Core sales agent functionality

---

## TABLE OF CONTENTS

1. [Overview](#overview)
2. [Database Schema](#database-schema)
3. [Plan Details Panel](#plan-details-panel)
4. [Commission Calculator](#commission-calculator)
5. [Commission Tracker](#commission-tracker)
6. [API Endpoints](#api-endpoints)
7. [UI Components](#ui-components)
8. [Testing Checklist](#testing-checklist)

---

## OVERVIEW

Build three interconnected features for sales agents:

| Feature | Purpose | Location |
|---------|---------|----------|
| **Plan Details Panel** | Show plan features during sales + in client profiles | Plan Selection, Client Profile, Sales Tools |
| **Commission Calculator** | Calculate earnings before closing any deal | Sales Tools sidebar |
| **Commission Tracker** | Track all earnings, pending, bonuses, goals | Main nav: 💰 Commissions |

**Goal:** Agents always know what they're selling and what they'll earn.

---

## DATABASE SCHEMA

### Core Tables

```sql
-- =====================================================
-- PLANS & FEATURES
-- =====================================================

CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track VARCHAR(20) NOT NULL,  -- 'nevermiss', 'blue', 'web', 'silver', 'gold', 'localseo'
  tier VARCHAR(20) NOT NULL,   -- 'starter', 'pro', 'enterprise'
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  monthly_price_cents INTEGER NOT NULL,
  annual_price_cents INTEGER NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE plan_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES plans(id) NOT NULL,
  feature_name VARCHAR(100) NOT NULL,
  feature_description TEXT,
  feature_category VARCHAR(50),  -- 'core', 'sms', 'seo', 'support'
  is_included BOOLEAN NOT NULL,
  display_value VARCHAR(50),     -- e.g., "1,000/mo", "5 pages"
  display_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE plan_upgrade_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_plan_id UUID REFERENCES plans(id) NOT NULL,
  to_plan_id UUID REFERENCES plans(id) NOT NULL,
  price_difference_cents INTEGER NOT NULL,
  is_recommended BOOLEAN DEFAULT false,
  benefits_summary TEXT,
  talking_point TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- COMMISSION RATES & BONUSES
-- =====================================================

CREATE TABLE commission_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_type VARCHAR(50) NOT NULL,  -- 'upfront', 'recurring_10', 'recurring_15', 'annual'
  rate_percentage DECIMAL(5,2) NOT NULL,
  effective_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Current rates (v5.8)
INSERT INTO commission_rates (rate_type, rate_percentage, effective_date, notes) VALUES
('upfront', 50.00, '2025-01-01', 'Standard upfront on monthly plans'),
('recurring_10', 10.00, '2025-01-01', 'Months 3-5 recurring rate'),
('recurring_15', 15.00, '2025-01-01', 'Months 6-14 recurring rate (locked in)'),
('annual', 35.00, '2025-01-01', 'Annual plan one-time commission');

CREATE TABLE retention_bonuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone VARCHAR(50) NOT NULL,  -- 'month_3', 'month_4', 'month_6', 'month_12'
  bonus_amount_cents INTEGER NOT NULL,
  requirement TEXT,
  applies_to VARCHAR(20) DEFAULT 'monthly',
  effective_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Current bonuses (v5.8)
INSERT INTO retention_bonuses (milestone, bonus_amount_cents, requirement, applies_to, effective_date) VALUES
('month_3', 1500, 'Check-in call logged', 'monthly', '2025-01-01'),
('month_4', 2500, 'Customer 4th payment processed', 'monthly', '2025-01-01'),
('month_6', 5000, 'Customer still active + rate bumps to 15%', 'monthly', '2025-01-01'),
('month_12', 10000, 'Customer still active at Month 12', 'monthly', '2025-01-01');

CREATE TABLE offer_commission_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_code VARCHAR(20) NOT NULL,
  offer_name VARCHAR(100),
  upfront_adjustment_type VARCHAR(20),  -- 'none', 'reduce_base', 'delay'
  upfront_adjustment_value DECIMAL(5,2),
  recurring_adjustment_type VARCHAR(20),
  recurring_adjustment_value DECIMAL(5,2),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Current offers (v5.8)
INSERT INTO offer_commission_adjustments (offer_code, offer_name, upfront_adjustment_type, upfront_adjustment_value, notes) VALUES
('FIRST50', '50% Off First Month', 'reduce_base', 50.00, 'Upfront based on discounted M1'),
('FREETRIAL14', '14-Day Free Trial', 'delay', 14, 'Upfront delayed 14 days'),
('ANNUAL25', '25% Off Annual', 'none', NULL, 'Commission on discounted annual price'),
('WAIVE99', 'Waive $99 GBP Setup', 'none', NULL, 'No commission impact'),
('VIP20', '20% Off Forever', 'reduce_base', 20.00, 'All commission based on discounted price');

-- =====================================================
-- COMMISSION TRACKING
-- =====================================================

CREATE TABLE agent_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) NOT NULL,
  customer_id UUID REFERENCES customers(id) NOT NULL,
  subscription_id UUID REFERENCES subscriptions(id),
  
  commission_type VARCHAR(50) NOT NULL,  -- 'upfront', 'recurring', 'bonus_m3', 'bonus_m4', 'bonus_m6', 'bonus_m12', 'annual', 'upgrade_upfront', 'upgrade_recurring'
  amount_cents INTEGER NOT NULL,
  rate_applied DECIMAL(5,2),
  plan_price_cents INTEGER,
  
  status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- 'pending', 'approved', 'paid', 'clawed_back', 'paused'
  
  earned_date DATE NOT NULL,
  eligible_date DATE,
  paid_date DATE,
  clawback_eligible_until DATE,
  clawback_reason TEXT,
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE agent_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) NOT NULL,
  period_type VARCHAR(20) NOT NULL,  -- 'monthly', 'quarterly', 'annual'
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  goal_amount_cents INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE customer_commission_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) UNIQUE NOT NULL,
  agent_id UUID REFERENCES agents(id) NOT NULL,
  subscription_id UUID REFERENCES subscriptions(id),
  
  current_month INTEGER NOT NULL DEFAULT 1,
  rate_locked_at_15 BOOLEAN DEFAULT false,
  rate_lock_date DATE,
  
  m3_checkin_completed BOOLEAN DEFAULT false,
  m3_checkin_date DATE,
  m6_review_completed BOOLEAN DEFAULT false,
  m6_review_date DATE,
  
  recurring_paused BOOLEAN DEFAULT false,
  paused_reason TEXT,
  paused_since DATE,
  
  risk_score INTEGER DEFAULT 0,  -- 0-100
  last_login DATE,
  has_open_support_ticket BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_plan_features_plan ON plan_features(plan_id);
CREATE INDEX idx_agent_commissions_agent ON agent_commissions(agent_id);
CREATE INDEX idx_agent_commissions_customer ON agent_commissions(customer_id);
CREATE INDEX idx_agent_commissions_status ON agent_commissions(status);
CREATE INDEX idx_agent_commissions_earned ON agent_commissions(earned_date);
CREATE INDEX idx_customer_status_agent ON customer_commission_status(agent_id);
```

---

## PLAN DETAILS PANEL

### Implementation Locations

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 1. PLAN SELECTION SCREEN                                                │
│    • Expandable plan cards with [Details] button                        │
│    • Shows: pricing, included/not included features, SMS allocations    │
├─────────────────────────────────────────────────────────────────────────┤
│ 2. CLIENT PROFILE → "Plan Details" TAB                                  │
│    • Current plan features                                              │
│    • SMS usage (456/1,000)                                              │
│    • Upgrade opportunities with commission preview                      │
├─────────────────────────────────────────────────────────────────────────┤
│ 3. SALES TOOLS SECTION                                                  │
│    • Downloadable PDFs (all 6 feature sheets)                           │
│    • Price sheet, commission calc, demo script                          │
├─────────────────────────────────────────────────────────────────────────┤
│ 4. PLAN COMPARATOR TOOL                                                 │
│    • Side-by-side comparison                                            │
│    • Talking points ("For $100 more, you get...")                       │
├─────────────────────────────────────────────────────────────────────────┤
│ 5. UPGRADE FLOW MODAL                                                   │
│    • Current plan vs upgrade option                                     │
│    • Features added                                                     │
│    • Agent commission calculation                                       │
└─────────────────────────────────────────────────────────────────────────┘
```

### Plan Details Panel UI

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 📋 GOLD PRO — $399/mo                                     [Close]       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ INCLUDED                              NOT INCLUDED                      │
│ ────────────────────                  ─────────────────                 │
│ ✓ Full CRM & Database                 ✗ Multi-location (add $199/mo)   │
│ ✓ Calendar & Scheduling               ✗ Priority Support (Enterprise)  │
│ ✓ Quotes & Invoicing                  ✗ 3 Users (Enterprise)           │
│ ✓ Professional Website (10 pages)                                      │
│ ✓ Local SEO (25 citations)                                             │
│ ✓ Google Business Profile                                              │
│ ✓ NeverMiss AI SMS (1,000/mo)                                          │
│ ✓ Monthly SEO Reports                                                  │
│                                                                         │
│ ═══════════════════════════════════════════════════════════════════════ │
│                                                                         │
│ UPGRADE PATH                                                            │
│ Gold Pro → Gold Enterprise: +$150/mo                                   │
│ Adds: Priority Support, 3 Users, 1,500 SMS, 50 Citations               │
│ Your commission: $75 upfront + $15/mo recurring                        │
│                                                                         │
│ [Compare Plans] [Download Feature Sheet] [Select This Plan]            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## COMMISSION CALCULATOR

### Location

```
┌─────────────────────────────────────────────────────────────────────────┐
│ CRM SIDEBAR                                                             │
├─────────────────────────────────────────────────────────────────────────┤
│ 📊 SALES TOOLS                                                          │
│ ├─ Commission Calculator  ← Primary location                           │
│ ├─ Plan Comparator                                                      │
│ ├─ Feature Sheets                                                       │
│ └─ Demo Scripts                                                         │
└─────────────────────────────────────────────────────────────────────────┘

ALSO ACCESSIBLE FROM:
• New Sale Flow: "Calculate Commission" button
• Client Profile: "Commission on Upgrade" in upgrade modal
• Quick Action: Cmd/Ctrl + K → "calc"
```

### Calculator UI

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 💰 COMMISSION CALCULATOR                                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ PLAN SELECTION                                                          │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Track: [Gold ▼]                                                     │ │
│ │                                                                     │ │
│ │ Plan:  ○ Gold Starter — $249/mo                                    │ │
│ │        ● Gold Pro — $399/mo                                        │ │
│ │        ○ Gold Enterprise — $549/mo                                 │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ BILLING                                                                 │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ ● Monthly    ○ Annual                                               │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ OFFER (Optional)                                                        │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ [None ▼]                                                            │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ ═══════════════════════════════════════════════════════════════════════ │
│                                                                         │
│ YOUR COMMISSION                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │                                                                     │ │
│ │   UPFRONT (after Month 2)           $200.00                        │ │
│ │   ─────────────────────────────────────────                        │ │
│ │   Recurring M3-M5 (10%)             $39.90/mo × 3 = $119.70        │ │
│ │   Recurring M6-M14 (15%)            $59.85/mo × 9 = $538.65        │ │
│ │   ─────────────────────────────────────────────────────            │ │
│ │   TOTAL RECURRING                   $658.35                        │ │
│ │   ─────────────────────────────────────────────────────            │ │
│ │   Retention Bonuses                                                │ │
│ │     Month 3 Check-In                $15.00                         │ │
│ │     Month 4 Retained                $25.00                         │ │
│ │     Month 6 Retained                $50.00                         │ │
│ │     Month 12 Retained               $100.00                        │ │
│ │   ─────────────────────────────────────────────────────            │ │
│ │   TOTAL BONUSES                     $190.00                        │ │
│ │                                                                     │ │
│ │   ═══════════════════════════════════════════════════════          │ │
│ │                                                                     │ │
│ │   💰 MAX POTENTIAL COMMISSION        $1,048.35                     │ │
│ │                                                                     │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ [Copy Summary] [Add to Sale] [Calculate Another]                        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Commission Quick Reference (Sidebar)

```
┌──────────────────────────────────────┐
│ 📋 QUICK REFERENCE                   │
├──────────────────────────────────────┤
│                                      │
│ RATES                                │
│ • Upfront: 50% (after M2)            │
│ • Recurring M3-5: 10%                │
│ • Recurring M6-14: 15% ⭐            │
│ • Annual: 35% one-time               │
│                                      │
│ RETENTION BONUSES                    │
│ • Month 3: $15                       │
│ • Month 4: $25                       │
│ • Month 6: $50 + 15% rate            │
│ • Month 12: $100                     │
│ • Total: $190                        │
│                                      │
│ 15% RATE BUMP                        │
│ • Unlocks at Month 6                 │
│ • LOCKED IN forever                  │
│ • Upgrade after M6 = 15%             │
│ • Upgrade before M6 = reset          │
│                                      │
└──────────────────────────────────────┘
```

### Commission by Plan Table

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ COMMISSION BY PLAN — v5.8                                                      │
├───────────────────┬─────────┬─────────┬──────────┬──────────┬─────────────────┤
│ Plan              │ Price   │ Upfront │ 10% Rate │ 15% Rate │ Max + Bonuses   │
├───────────────────┼─────────┼─────────┼──────────┼──────────┼─────────────────┤
│ NeverMiss         │ $29     │ $15     │ $2.90    │ $4.35    │ $252.85         │
│ NeverMiss +User   │ $19     │ $10     │ $1.90    │ $2.85    │ $167.35         │
├───────────────────┼─────────┼─────────┼──────────┼──────────┼─────────────────┤
│ Blue Starter      │ $49     │ $25     │ $4.90    │ $7.35    │ $296.45         │
│ Blue Pro          │ $99     │ $50     │ $9.90    │ $14.85   │ $453.35         │
│ Blue Enterprise   │ $199    │ $100    │ $19.90   │ $29.85   │ $766.55         │
├───────────────────┼─────────┼─────────┼──────────┼──────────┼─────────────────┤
│ Web Starter       │ $149    │ $75     │ $14.90   │ $22.35   │ $609.95         │
│ Web Pro           │ $249    │ $125    │ $24.90   │ $37.35   │ $923.15         │
│ Web Enterprise    │ $349    │ $175    │ $34.90   │ $52.35   │ $1,236.35       │
├───────────────────┼─────────┼─────────┼──────────┼──────────┼─────────────────┤
│ Silver Starter    │ $199    │ $100    │ $19.90   │ $29.85   │ $766.55         │
│ Silver Pro        │ $299    │ $150    │ $29.90   │ $44.85   │ $1,079.75       │
│ Silver Enterprise │ $449    │ $225    │ $44.90   │ $67.35   │ $1,549.55       │
├───────────────────┼─────────┼─────────┼──────────┼──────────┼─────────────────┤
│ Gold Starter      │ $249    │ $125    │ $24.90   │ $37.35   │ $923.15         │
│ Gold Pro          │ $399    │ $200    │ $39.90   │ $59.85   │ $1,392.95       │
│ Gold Enterprise   │ $549    │ $275    │ $54.90   │ $82.35   │ $1,862.75       │
├───────────────────┼─────────┼─────────┼──────────┼──────────┼─────────────────┤
│ Local SEO Starter │ $99     │ $50     │ $9.90    │ $14.85   │ $453.35         │
│ Local SEO Pro     │ $149    │ $75     │ $14.90   │ $22.35   │ $609.95         │
│ Local SEO Ent.    │ $199    │ $100    │ $19.90   │ $29.85   │ $766.55         │
└───────────────────┴─────────┴─────────┴──────────┴──────────┴─────────────────┘

Max = Upfront + (10% × 3 months) + (15% × 9 months) + $190 retention bonuses
```

---

## COMMISSION TRACKER

### Dashboard Location

```
┌─────────────────────────────────────────────────────────────────────────┐
│ CRM TOP NAVIGATION                                                      │
├─────────────────────────────────────────────────────────────────────────┤
│ [Dashboard] [Leads] [Clients] [💰 Commissions] [Support] [Settings]     │
│                                  ^^^^^^^^^^^^^                          │
│                                  Primary location                       │
└─────────────────────────────────────────────────────────────────────────┘
```

### Main Dashboard View

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 💰 COMMISSION TRACKER                                           [Export]│
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ PERIOD: [This Month ▼]  December 2025                                  │
│                                                                         │
│ ┌─────────────────┬─────────────────┬─────────────────┬───────────────┐ │
│ │   💵 PAID       │  ⏳ PENDING      │  📈 PROJECTED   │  🎯 GOAL      │ │
│ │                 │                 │                 │               │ │
│ │   $4,250.00     │   $1,890.00     │   $8,400.00     │   $10,000     │ │
│ │                 │                 │                 │               │ │
│ │   ✓ Deposited   │   Awaiting      │   If all close  │   84% ████░░  │ │
│ └─────────────────┴─────────────────┴─────────────────┴───────────────┘ │
│                                                                         │
│ ═══════════════════════════════════════════════════════════════════════ │
│                                                                         │
│ EARNINGS BREAKDOWN                                                      │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │   Upfront Commissions           $2,450.00    ████████████░░░░ 58%  │ │
│ │   Recurring (10% rate)          $890.00      ████░░░░░░░░░░░░ 21%  │ │
│ │   Recurring (15% rate)          $560.00      ███░░░░░░░░░░░░░ 13%  │ │
│ │   Retention Bonuses             $350.00      ██░░░░░░░░░░░░░░  8%  │ │
│ │   ─────────────────────────────────────────────────────────────    │ │
│ │   TOTAL EARNED                  $4,250.00                          │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ ═══════════════════════════════════════════════════════════════════════ │
│                                                                         │
│ TABS: [Overview] [Pending] [Recurring] [Bonuses] [Performance]          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Pending Commissions Tab

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ⏳ PENDING COMMISSIONS                                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ AWAITING PAYMENT (Customer Month 1-2)                                   │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Customer         │ Plan        │ Upfront   │ Unlocks    │ Status   │ │
│ ├──────────────────┼─────────────┼───────────┼────────────┼──────────┤ │
│ │ ACME Plumbing    │ Gold Pro    │ $200.00   │ Jan 15     │ M1 ✓     │ │
│ │ Smith HVAC       │ Blue Pro    │ $50.00    │ Jan 20     │ M1 ✓     │ │
│ │ Joe's Electric   │ NeverMiss   │ $15.00    │ Jan 22     │ M1 ✓     │ │
│ ├──────────────────┼─────────────┼───────────┼────────────┼──────────┤ │
│ │ SUBTOTAL         │             │ $265.00   │            │          │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ ⚠️ CLAWBACK RISK                                                        │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Customer         │ Plan        │ At Risk   │ Reason     │ Action   │ │
│ ├──────────────────┼─────────────┼───────────┼────────────┼──────────┤ │
│ │ ABC Contractors  │ Silver Pro  │ $150.00   │ No login   │ [Call]   │ │
│ │                  │             │           │ 14 days    │          │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Recurring Tab

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 🔄 RECURRING COMMISSIONS                                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ THIS MONTH'S RECURRING: $890.00                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Customer         │ Plan        │ Month │ Rate  │ Amount  │ Status  │ │
│ ├──────────────────┼─────────────┼───────┼───────┼─────────┼─────────┤ │
│ │ Premier Plumbing │ Gold Pro    │ M8    │ 15%   │ $59.85  │ ✓ Paid  │ │
│ │ Ace HVAC         │ Gold Pro    │ M6    │ 15% ⭐│ $59.85  │ ✓ Paid  │ │
│ │ Best Electric    │ Blue Pro    │ M5    │ 10%   │ $9.90   │ ✓ Paid  │ │
│ │ Quick Fix        │ NeverMiss   │ M4    │ 10%   │ $2.90   │ ✓ Paid  │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ ⭐ APPROACHING 15% RATE BUMP (Month 5 → Month 6)                        │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Customer         │ Plan        │ Current │ M6 Date   │ New Rate   │ │
│ ├──────────────────┼─────────────┼─────────┼───────────┼────────────┤ │
│ │ Johnson Plumbing │ Gold Pro    │ M5      │ Jan 15    │ $59.85/mo  │ │
│ │ City Electric    │ Blue Pro    │ M5      │ Jan 18    │ $14.85/mo  │ │
│ ├──────────────────┼─────────────┼─────────┼───────────┼────────────┤ │
│ │ 2 customers hitting 15% = +$74.70/mo recurring boost               │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Bonuses Tab

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 🎁 RETENTION BONUSES                                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ UPCOMING BONUSES (Next 30 Days)                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Customer         │ Milestone   │ Bonus   │ Due Date   │ Required   │ │
│ ├──────────────────┼─────────────┼─────────┼────────────┼────────────┤ │
│ │ Premier Plumbing │ Month 12 🏆 │ $100    │ Dec 28     │ Stay active│ │
│ │ ACME Electric    │ Month 6 ⭐  │ $50     │ Jan 3      │ Review call│ │
│ │ Smith HVAC       │ Month 4     │ $25     │ Jan 8      │ Payment    │ │
│ │ Quick Rooter     │ Month 3     │ $15     │ Jan 12     │ Check-in   │ │
│ ├──────────────────┼─────────────┼─────────┼────────────┼────────────┤ │
│ │ POTENTIAL        │             │ $190    │            │            │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ EARNED THIS MONTH: $335                                                 │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Month 3 Check-Ins    │ 4 × $15  │ $60     │ ✓ Complete            │ │
│ │ Month 4 Retained     │ 3 × $25  │ $75     │ ✓ Complete            │ │
│ │ Month 6 Retained     │ 2 × $50  │ $100    │ ✓ Complete            │ │
│ │ Month 12 Retained    │ 1 × $100 │ $100    │ ✓ Complete            │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Performance Tab

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 📊 PERFORMANCE & GOALS                                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ MONTHLY GOAL PROGRESS                                                   │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │   Goal: $10,000          Current: $8,400         Gap: $1,600       │ │
│ │                                                                     │ │
│ │   ████████████████████████████████████░░░░░░░░  84%                │ │
│ │                                                                     │ │
│ │   🎯 ON TRACK — You'll likely hit $10,200 this month!              │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ QUARTERLY PERFORMANCE (Q4 2025)                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │         │ October   │ November  │ December  │ Q4 Total  │          │ │
│ ├─────────┼───────────┼───────────┼───────────┼───────────┼──────────┤ │
│ │ Sales   │ 22        │ 26        │ 24        │ 72        │          │ │
│ │ Commiss.│ $8,200    │ $9,400    │ $8,400*   │ $26,000   │          │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ 12-MONTH TREND                                                          │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │  $12K ┤                                           ╭──╮             │ │
│ │  $10K ┤                               ╭──╮   ╭──╮│  │ ╭──╮        │ │
│ │   $8K ┤                    ╭──╮  ╭──╮│  │╭─╯  ╰╯  ╰─╯  │        │ │
│ │   $6K ┤          ╭──╮ ╭──╮│  │╭╯  ╰╯                   │        │ │
│ │   $4K ┤     ╭──╮│  ╰╯  ╰╯                                        │ │
│ │   $2K ┤╭───╯                                                       │ │
│ │    $0 ┼────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────│ │
│ │       Jan  Feb  Mar  Apr  May  Jun  Jul  Aug  Sep  Oct  Nov  Dec  │ │
│ │                                                                     │ │
│ │   Total YTD: $89,400    Average: $8,127/mo    Best: Oct $10,200   │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Customer Commission Detail (Click on any customer)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 💰 COMMISSION DETAIL: Premier Plumbing                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ PLAN: Gold Pro — $399/mo                                               │
│ Started: January 28, 2025 (Month 11)                                   │
│ Rate Status: 15% LOCKED ⭐ (since Month 6)                              │
│                                                                         │
│ ═══════════════════════════════════════════════════════════════════════ │
│                                                                         │
│ COMMISSION TIMELINE                                                     │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Date       │ Type           │ Amount   │ Status    │ Notes         │ │
│ ├────────────┼────────────────┼──────────┼───────────┼───────────────┤ │
│ │ Mar 28     │ Upfront        │ $200.00  │ ✓ Paid    │ After M2      │ │
│ │ Apr 28     │ Month 3 Bonus  │ $15.00   │ ✓ Paid    │ Check-in done │ │
│ │ Apr 28     │ Recurring      │ $39.90   │ ✓ Paid    │ 10% rate      │ │
│ │ May 28     │ Month 4 Bonus  │ $25.00   │ ✓ Paid    │ Retained      │ │
│ │ Jul 28     │ Month 6 Bonus  │ $50.00   │ ✓ Paid    │ Review done   │ │
│ │ Jul 28     │ Recurring      │ $59.85   │ ✓ Paid    │ 15% rate ⭐   │ │
│ │ Dec 28     │ Month 12 Bonus │ $100.00  │ ⏳ Pending│ If retained   │ │
│ ├────────────┼────────────────┼──────────┼───────────┼───────────────┤ │
│ │ TOTAL EARNED                │ $808.90  │           │               │ │
│ │ TOTAL PENDING               │ $159.85  │           │               │ │
│ │ LIFETIME FROM THIS CUSTOMER │ $1,088.45│           │               │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## API ENDPOINTS

### Plan Details

```typescript
// GET /api/plans/:planId/features
// Returns all features for a plan
{
  "plan": {
    "id": "uuid",
    "name": "Gold Pro",
    "slug": "gold_pro",
    "monthlyPrice": 399,
    "annualPrice": 3591
  },
  "features": {
    "included": [
      { "name": "Full CRM & Database", "value": true },
      { "name": "Professional Website", "value": "10 pages" },
      { "name": "NeverMiss AI SMS", "value": "1,000/mo" }
    ],
    "notIncluded": [
      { "name": "Priority Support", "upgradeTo": "Gold Enterprise" },
      { "name": "Multi-Location", "addOn": "$199/mo" }
    ]
  }
}

// GET /api/plans/compare?plans=blue_pro,gold_pro
// Side-by-side comparison
{
  "plans": ["blue_pro", "gold_pro"],
  "comparison": [
    { "feature": "CRM", "blue_pro": true, "gold_pro": true },
    { "feature": "Website", "blue_pro": false, "gold_pro": "10 pages" },
    { "feature": "Local SEO", "blue_pro": false, "gold_pro": "25 citations" }
  ],
  "priceDifference": 300,
  "talkingPoint": "For $300 more, you get a professional website and Local SEO"
}

// GET /api/clients/:clientId/upgrade-options
// Available upgrades for client's current plan
{
  "currentPlan": "blue_pro",
  "upgrades": [
    {
      "plan": "blue_enterprise",
      "priceDiff": 100,
      "agentUpfront": 50,
      "agentRecurring": 10
    },
    {
      "plan": "gold_pro",
      "priceDiff": 300,
      "agentUpfront": 150,
      "agentRecurring": 30
    }
  ]
}
```

### Commission Calculator

```typescript
// POST /api/commission/calculate
{
  "planSlug": "gold_pro",
  "billingPeriod": "monthly",
  "offerCode": null
}
// Response
{
  "planName": "Gold Pro",
  "planPrice": 399,
  "upfront": 200,
  "recurring": {
    "rate10": 39.90,
    "rate15": 59.85,
    "total": 658.35
  },
  "bonuses": {
    "month3": 15, "month4": 25, "month6": 50, "month12": 100,
    "total": 190
  },
  "maxCommission": 1048.35
}

// POST /api/commission/calculate-upgrade
{
  "currentPlanSlug": "nevermiss",
  "newPlanSlug": "blue_pro",
  "customerMonth": 3
}
// Response
{
  "priceDifference": 70,
  "upgradeUpfront": 35,
  "newRecurring": { "total": 115.50 },
  "notes": ["⚠️ Upgrade BEFORE Month 6: Timeline resets"]
}
```

### Commission Tracker

```typescript
// GET /api/commissions/dashboard?period=this_month
{
  "summary": {
    "paid": 425000,
    "pending": 189000,
    "projected": 840000,
    "goal": 1000000,
    "goalProgress": 84
  },
  "breakdown": {
    "upfront": 245000,
    "recurring_10": 89000,
    "recurring_15": 56000,
    "bonuses": 35000
  }
}

// GET /api/commissions/pending
{
  "awaitingPayment": [...],
  "clawbackRisk": [...]
}

// GET /api/commissions/recurring
{
  "thisMonth": { "total": 89000, "customers": [...] },
  "approachingRateBump": [...]
}

// GET /api/commissions/customer/:customerId
{
  "customer": { ... },
  "timeline": [...],
  "totals": { "earned": 80890, "pending": 15985, "lifetime": 108845 }
}

// GET /api/commissions/performance
{
  "goal": { "amount": 1000000, "current": 840000, "progress": 84 },
  "quarterly": { ... },
  "yearTrend": [...]
}
```

---

## UI COMPONENTS

### Shared Components

```typescript
// components/commission/CommissionQuickRef.tsx
// Sidebar with rate reference

// components/commission/CommissionCalculator.tsx
// Full calculator with plan/billing/offer selectors

// components/commission/CommissionTracker.tsx
// Main dashboard with tabs

// components/commission/PendingCommissions.tsx
// Pending + clawback risk view

// components/commission/RecurringView.tsx
// Monthly recurring + rate bump countdown

// components/commission/BonusesView.tsx
// Upcoming + earned bonuses

// components/commission/PerformanceView.tsx
// Goals, quarterly, trend chart

// components/commission/CustomerDetail.tsx
// Per-customer commission timeline

// components/plans/PlanDetailsPanel.tsx
// Feature list + upgrade path

// components/plans/PlanComparator.tsx
// Side-by-side comparison tool
```

### React Hooks

```typescript
// hooks/usePlanFeatures.ts
// hooks/useCompare.ts
// hooks/useCommissionCalculation.ts
// hooks/useCommissionDashboard.ts
// hooks/useCustomerCommission.ts
```

---

## TESTING CHECKLIST

```
PLAN DETAILS:
□ All 6 plan tracks show correct features
□ SMS allocations match v5.8 spec
□ Blue Starter correctly shows NO NeverMiss
□ "Not Included" shows correct upgrade paths
□ Commission displays in upgrade modal
□ Feature sheets downloadable

COMMISSION CALCULATOR:
□ NeverMiss $29 → $252.85 max
□ Gold Pro $399 → $1,048.35 max
□ Annual Gold Pro → $1,256.85 (35%)
□ FIRST50 reduces upfront calculation
□ FREETRIAL14 shows delayed note
□ Upgrade calculations correct
□ Before/after M6 handled correctly

COMMISSION TRACKER:
□ Summary cards show correct totals
□ Period selector works (MTD, QTD, YTD)
□ Earnings breakdown adds up
□ Pending shows correct unlock dates
□ Clawback risk calculates correctly
□ Recurring shows correct rates (10% vs 15%)
□ Rate bump countdown accurate
□ Bonuses: upcoming, earned, paused
□ Goals + performance display correctly
□ Customer detail timeline accurate
□ Export to PDF/CSV works

UI/UX:
□ Mobile responsive
□ Loading states
□ Empty states
□ Error handling
□ Keyboard shortcuts work
```

---

## NOTIFICATIONS

```
DAILY:
• "$X pending commission unlocking this week"
• "3 customers approaching Month 6 — schedule reviews"

WEEKLY:
• "Weekly earnings: $X earned, $X pending"
• "Clawback risk: 2 customers need attention"

MONTHLY:
• "Month-end: $X earned vs $X goal"
• "Upcoming bonuses: $X potential"

TRIGGERS:
• "Upfront unlocked: $X from [Customer]"
• "Bonus earned: $X for [Customer] Month 6"
• "⚠️ [Customer] may cancel — call now"
• "🎉 You hit your monthly goal!"
```

---

**Version 5.8 — December 2025**