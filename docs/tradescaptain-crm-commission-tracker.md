# TradesCaptain CRM — Commission Tracker Prompt

**Version:** 5.8.1  
**Date:** December 2025  
**Feature:** Real-Time Commission Tracking Dashboard for Sales Agents  
**Priority:** HIGH — Agents need visibility into earnings, pipeline, and goals

---

## OVERVIEW

Build a Commission Tracker dashboard that shows agents:
- Real-time earnings (pending, paid, projected)
- Customer-by-customer commission breakdown
- Upcoming bonuses and rate bumps
- Clawback risk alerts
- Goal progress and performance metrics
- Historical trends

**Goal:** Agent always knows exactly where they stand financially.

---

## DASHBOARD LOCATION

### Primary Access

```
┌─────────────────────────────────────────────────────────────────────────┐
│ CRM TOP NAVIGATION                                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ [Dashboard] [Leads] [Clients] [💰 Commissions] [Support] [Settings]     │
│                                  ^^^^^^^^^^^^^                          │
│                                  Primary location                       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Quick Access Widget

Show mini summary on main dashboard:

```
┌────────────────────────────────────┐
│ 💰 THIS MONTH                      │
├────────────────────────────────────┤
│ Earned:     $4,250.00              │
│ Pending:    $1,890.00              │
│ Projected:  $8,400.00              │
│                                    │
│ [View Full Dashboard →]            │
└────────────────────────────────────┘
```

---

## MAIN DASHBOARD VIEW

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
│ │                                                                     │ │
│ │   Upfront Commissions           $2,450.00    ████████████░░░░ 58%  │ │
│ │   Recurring (10% rate)          $890.00      ████░░░░░░░░░░░░ 21%  │ │
│ │   Recurring (15% rate)          $560.00      ███░░░░░░░░░░░░░ 13%  │ │
│ │   Retention Bonuses             $350.00      ██░░░░░░░░░░░░░░  8%  │ │
│ │   ─────────────────────────────────────────────────────────────    │ │
│ │   TOTAL EARNED                  $4,250.00                          │ │
│ │                                                                     │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ ═══════════════════════════════════════════════════════════════════════ │
│                                                                         │
│ 📊 SALES THIS PERIOD                                                    │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Plan Track      │ Sales │ Revenue    │ Your Commission │ Avg/Sale  │ │
│ ├─────────────────┼───────┼────────────┼─────────────────┼───────────┤ │
│ │ Gold            │ 4     │ $1,596/mo  │ $800 upfront    │ $200      │ │
│ │ Blue            │ 6     │ $594/mo    │ $297 upfront    │ $49.50    │ │
│ │ NeverMiss       │ 8     │ $232/mo    │ $116 upfront    │ $14.50    │ │
│ │ Silver          │ 2     │ $598/mo    │ $299 upfront    │ $149.50   │ │
│ │ Web             │ 1     │ $249/mo    │ $125 upfront    │ $125      │ │
│ │ Local SEO       │ 3     │ $447/mo    │ $224 upfront    │ $74.67    │ │
│ ├─────────────────┼───────┼────────────┼─────────────────┼───────────┤ │
│ │ TOTAL           │ 24    │ $3,716/mo  │ $1,861 upfront  │ $77.54    │ │
│ └─────────────────┴───────┴────────────┴─────────────────┴───────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## PENDING COMMISSIONS VIEW

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ⏳ PENDING COMMISSIONS                                      [Filter ▼]  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ AWAITING PAYMENT (Customer Month 1-2)                                   │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Customer         │ Plan        │ Upfront   │ Unlocks    │ Status   │ │
│ ├──────────────────┼─────────────┼───────────┼────────────┼──────────┤ │
│ │ ACME Plumbing    │ Gold Pro    │ $200.00   │ Jan 15     │ M1 ✓     │ │
│ │ Smith HVAC       │ Blue Pro    │ $50.00    │ Jan 20     │ M1 ✓     │ │
│ │ Joe's Electric   │ NeverMiss   │ $15.00    │ Jan 22     │ M1 ✓     │ │
│ │ Quick Rooter     │ Gold Starter│ $125.00   │ Jan 25     │ M1 ⏳     │ │
│ ├──────────────────┼─────────────┼───────────┼────────────┼──────────┤ │
│ │ SUBTOTAL         │             │ $390.00   │            │          │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ ⚠️ CLAWBACK RISK (Customer at risk of canceling)                        │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Customer         │ Plan        │ At Risk   │ Reason     │ Action   │ │
│ ├──────────────────┼─────────────┼───────────┼────────────┼──────────┤ │
│ │ ABC Contractors  │ Silver Pro  │ $150.00   │ No login   │ [Call]   │ │
│ │                  │             │           │ 14 days    │          │ │
│ │ Mike's Plumbing  │ Blue Pro    │ $50.00    │ Support    │ [Call]   │ │
│ │                  │             │           │ ticket     │          │ │
│ ├──────────────────┼─────────────┼───────────┼────────────┼──────────┤ │
│ │ TOTAL AT RISK    │             │ $200.00   │            │          │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ 💡 Tip: Customers without login in 14+ days are 3x more likely to      │
│    cancel. A quick check-in call can save your commission!              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## RECURRING COMMISSION VIEW

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 🔄 RECURRING COMMISSIONS                                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ THIS MONTH'S RECURRING                                                  │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Customer         │ Plan        │ Month │ Rate  │ Amount  │ Status  │ │
│ ├──────────────────┼─────────────┼───────┼───────┼─────────┼─────────┤ │
│ │ Premier Plumbing │ Gold Pro    │ M8    │ 15%   │ $59.85  │ ✓ Paid  │ │
│ │ Ace HVAC         │ Gold Pro    │ M6    │ 15% ⭐│ $59.85  │ ✓ Paid  │ │
│ │ Best Electric    │ Blue Pro    │ M5    │ 10%   │ $9.90   │ ✓ Paid  │ │
│ │ Quick Fix        │ NeverMiss   │ M4    │ 10%   │ $2.90   │ ✓ Paid  │ │
│ │ ... 42 more                                                         │ │
│ ├──────────────────┼─────────────┼───────┼───────┼─────────┼─────────┤ │
│ │ TOTAL            │             │       │       │ $890.00 │         │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ ═══════════════════════════════════════════════════════════════════════ │
│                                                                         │
│ ⭐ APPROACHING 15% RATE BUMP (Month 5 → Month 6)                        │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Customer         │ Plan        │ Current │ M6 Date   │ New Rate   │ │
│ ├──────────────────┼─────────────┼─────────┼───────────┼────────────┤ │
│ │ Johnson Plumbing │ Gold Pro    │ M5      │ Jan 15    │ $59.85/mo  │ │
│ │ City Electric    │ Blue Pro    │ M5      │ Jan 18    │ $14.85/mo  │ │
│ │ ABC Roofing      │ Silver Pro  │ M5      │ Jan 22    │ $44.85/mo  │ │
│ ├──────────────────┼─────────────┼─────────┼───────────┼────────────┤ │
│ │ 3 customers hitting 15% this month = +$59.70/mo recurring boost    │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ 💡 Do your Month 6 Business Review calls to secure these customers      │
│    and unlock the retention bonus + 15% rate!                           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## RETENTION BONUSES VIEW

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
│ │ Joe's Plumbing   │ Month 6 ⭐  │ $50     │ Jan 15     │ Review call│ │
│ ├──────────────────┼─────────────┼─────────┼────────────┼────────────┤ │
│ │ POTENTIAL        │             │ $240    │            │            │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ EARNED THIS MONTH                                                       │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Month 3 Check-Ins    │ 4 × $15  │ $60     │ ✓ Complete            │ │
│ │ Month 4 Retained     │ 3 × $25  │ $75     │ ✓ Complete            │ │
│ │ Month 6 Retained     │ 2 × $50  │ $100    │ ✓ Complete            │ │
│ │ Month 12 Retained    │ 1 × $100 │ $100    │ ✓ Complete            │ │
│ ├──────────────────────┼──────────┼─────────┼───────────────────────┤ │
│ │ TOTAL EARNED         │          │ $335    │                       │ │
│ └──────────────────────┴──────────┴─────────┴───────────────────────┘ │
│                                                                         │
│ MISSED/PAUSED                                                           │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Customer         │ Milestone   │ Status  │ Grace Period │ Action   │ │
│ ├──────────────────┼─────────────┼─────────┼──────────────┼──────────┤ │
│ │ ABC Contractors  │ Month 3     │ PAUSED  │ 8 days left  │ [Call]   │ │
│ │                  │ Check-In    │         │              │ [Log]    │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ ⚠️ Missed touchpoints pause recurring until completed. Complete within  │
│    14 days to avoid losing that month's commission.                     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## CUSTOMER COMMISSION DETAIL

Click on any customer to see full commission history:

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
│ │ May 28     │ Recurring      │ $39.90   │ ✓ Paid    │ 10% rate      │ │
│ │ Jun 28     │ Recurring      │ $39.90   │ ✓ Paid    │ 10% rate      │ │
│ │ Jul 28     │ Month 6 Bonus  │ $50.00   │ ✓ Paid    │ Review done   │ │
│ │ Jul 28     │ Recurring      │ $59.85   │ ✓ Paid    │ 15% rate ⭐   │ │
│ │ Aug 28     │ Recurring      │ $59.85   │ ✓ Paid    │ 15% rate      │ │
│ │ Sep 28     │ Recurring      │ $59.85   │ ✓ Paid    │ 15% rate      │ │
│ │ Oct 28     │ Recurring      │ $59.85   │ ✓ Paid    │ 15% rate      │ │
│ │ Nov 28     │ Recurring      │ $59.85   │ ✓ Paid    │ 15% rate      │ │
│ │ Dec 28     │ Recurring      │ $59.85   │ ⏳ Pending│ 15% rate      │ │
│ │ Dec 28     │ Month 12 Bonus │ $100.00  │ ⏳ Pending│ If retained   │ │
│ │ Jan 28     │ Recurring      │ $59.85   │ 📅 Future │ 15% rate      │ │
│ │ Feb 28     │ Recurring      │ $59.85   │ 📅 Future │ Last month    │ │
│ ├────────────┼────────────────┼──────────┼───────────┼───────────────┤ │
│ │ TOTAL EARNED                │ $808.90  │           │               │ │
│ │ TOTAL PENDING               │ $159.85  │           │               │ │
│ │ TOTAL REMAINING             │ $119.70  │           │               │ │
│ │ ─────────────────────────────────────────────────────────────────  │ │
│ │ LIFETIME FROM THIS CUSTOMER │ $1,088.45│           │               │ │
│ └─────────────────────────────┴──────────┴───────────┴───────────────┘ │
│                                                                         │
│ MAX POSSIBLE: $1,048.35 (Upfront + 12mo recurring + bonuses)           │
│ You've earned: 103.8% of max (due to 15% rate on full 9 months)        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## PERFORMANCE & GOALS VIEW

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 📊 PERFORMANCE & GOALS                                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ MONTHLY GOAL PROGRESS                                                   │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │                                                                     │ │
│ │   Goal: $10,000          Current: $8,400         Gap: $1,600       │ │
│ │                                                                     │ │
│ │   ████████████████████████████████████░░░░░░░░  84%                │ │
│ │                                                                     │ │
│ │   To hit goal: Close 2 more Gold Pro ($200 × 2 = $400 upfront)     │ │
│ │                + Month 6 bonuses coming: $150                       │ │
│ │                + Recurring this month: ~$1,050                      │ │
│ │                                                                     │ │
│ │   🎯 ON TRACK — You'll likely hit $10,200 this month!              │ │
│ │                                                                     │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ QUARTERLY PERFORMANCE (Q4 2025)                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │         │ October   │ November  │ December  │ Q4 Total  │ Avg      │ │
│ ├─────────┼───────────┼───────────┼───────────┼───────────┼──────────┤ │
│ │ Sales   │ 22        │ 26        │ 24        │ 72        │ 24/mo    │ │
│ │ Revenue │ $3,200/mo │ $4,100/mo │ $3,700/mo │ $11,000   │ $3,667   │ │
│ │ Commiss.│ $8,200    │ $9,400    │ $8,400*   │ $26,000   │ $8,667   │ │
│ ├─────────┴───────────┴───────────┴───────────┴───────────┴──────────┤ │
│ │ * December in progress                                              │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ QUOTA STATUS                                                            │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │                                                                     │ │
│ │   Quarterly Minimum: 6 sales                                       │ │
│ │   Your Q4 Sales: 72                                                │ │
│ │   Status: ✅ EXCEEDS QUOTA (12x minimum)                           │ │
│ │                                                                     │ │
│ │   Retention Rate: 94%                                              │ │
│ │   Customers Lost: 4 of 68                                          │ │
│ │   Status: ✅ EXCELLENT                                             │ │
│ │                                                                     │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ 12-MONTH TREND                                                          │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │                                                                     │ │
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
│ │                                                                     │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## DATABASE SCHEMA

### agent_commissions Table

```sql
CREATE TABLE agent_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) NOT NULL,
  customer_id UUID REFERENCES customers(id) NOT NULL,
  subscription_id UUID REFERENCES subscriptions(id),
  
  -- Commission details
  commission_type VARCHAR(50) NOT NULL,  -- 'upfront', 'recurring', 'bonus_m3', 'bonus_m4', 'bonus_m6', 'bonus_m12', 'annual', 'upgrade_upfront', 'upgrade_recurring'
  amount_cents INTEGER NOT NULL,
  
  -- Rate tracking
  rate_applied DECIMAL(5,2),  -- 10.00 or 15.00 for recurring
  plan_price_cents INTEGER,
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- 'pending', 'approved', 'paid', 'clawed_back', 'paused'
  
  -- Dates
  earned_date DATE NOT NULL,  -- When commission was earned
  eligible_date DATE,  -- When commission becomes payable
  paid_date DATE,  -- When actually paid
  
  -- Clawback tracking
  clawback_eligible_until DATE,  -- Date clawback protection expires
  clawback_reason TEXT,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_agent_commissions_agent ON agent_commissions(agent_id);
CREATE INDEX idx_agent_commissions_customer ON agent_commissions(customer_id);
CREATE INDEX idx_agent_commissions_status ON agent_commissions(status);
CREATE INDEX idx_agent_commissions_earned ON agent_commissions(earned_date);
CREATE INDEX idx_agent_commissions_type ON agent_commissions(commission_type);
```

### agent_goals Table

```sql
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
```

### customer_commission_status Table

```sql
CREATE TABLE customer_commission_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) UNIQUE NOT NULL,
  agent_id UUID REFERENCES agents(id) NOT NULL,
  subscription_id UUID REFERENCES subscriptions(id),
  
  -- Current status
  current_month INTEGER NOT NULL DEFAULT 1,
  rate_locked_at_15 BOOLEAN DEFAULT false,
  rate_lock_date DATE,
  
  -- Touchpoint tracking
  m3_checkin_completed BOOLEAN DEFAULT false,
  m3_checkin_date DATE,
  m6_review_completed BOOLEAN DEFAULT false,
  m6_review_date DATE,
  m9_growth_completed BOOLEAN DEFAULT false,
  m9_growth_date DATE,
  m11_renewal_completed BOOLEAN DEFAULT false,
  m11_renewal_date DATE,
  
  -- Pause tracking
  recurring_paused BOOLEAN DEFAULT false,
  paused_reason TEXT,
  paused_since DATE,
  
  -- Clawback risk
  risk_score INTEGER DEFAULT 0,  -- 0-100
  last_login DATE,
  has_open_support_ticket BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## API ENDPOINTS

### GET /api/commissions/dashboard

```typescript
// Response
{
  "period": {
    "start": "2025-12-01",
    "end": "2025-12-31",
    "label": "December 2025"
  },
  "summary": {
    "paid": 425000,  // cents
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
  },
  "salesByTrack": [
    { "track": "Gold", "sales": 4, "revenue": 159600, "commission": 80000 },
    { "track": "Blue", "sales": 6, "revenue": 59400, "commission": 29700 }
  ]
}
```

### GET /api/commissions/pending

```typescript
// Response
{
  "awaitingPayment": [
    {
      "customerId": "uuid",
      "customerName": "ACME Plumbing",
      "planName": "Gold Pro",
      "upfront": 20000,
      "unlocksDate": "2025-01-15",
      "currentMonth": 1,
      "monthStatus": "paid"
    }
  ],
  "clawbackRisk": [
    {
      "customerId": "uuid",
      "customerName": "ABC Contractors",
      "planName": "Silver Pro",
      "atRiskAmount": 15000,
      "riskReason": "no_login_14_days",
      "riskScore": 75
    }
  ]
}
```

### GET /api/commissions/recurring

```typescript
// Response
{
  "thisMonth": {
    "total": 89000,
    "customers": [
      {
        "customerId": "uuid",
        "customerName": "Premier Plumbing",
        "planName": "Gold Pro",
        "month": 8,
        "rate": 15,
        "amount": 5985,
        "status": "paid"
      }
    ]
  },
  "approachingRateBump": [
    {
      "customerId": "uuid",
      "customerName": "Johnson Plumbing",
      "planName": "Gold Pro",
      "currentMonth": 5,
      "month6Date": "2025-01-15",
      "newMonthlyAmount": 5985
    }
  ]
}
```

### GET /api/commissions/customer/:customerId

```typescript
// Response
{
  "customer": {
    "id": "uuid",
    "name": "Premier Plumbing",
    "plan": "Gold Pro",
    "monthlyPrice": 39900,
    "startDate": "2025-01-28",
    "currentMonth": 11,
    "rateLocked": true,
    "rateLockDate": "2025-06-28"
  },
  "timeline": [
    {
      "date": "2025-03-28",
      "type": "upfront",
      "amount": 20000,
      "status": "paid",
      "notes": "After M2"
    }
  ],
  "totals": {
    "earned": 80890,
    "pending": 15985,
    "remaining": 11970,
    "lifetime": 108845,
    "maxPossible": 104835
  }
}
```

### GET /api/commissions/performance

```typescript
// Response
{
  "goal": {
    "amount": 1000000,
    "current": 840000,
    "progress": 84,
    "status": "on_track",
    "projectedFinal": 1020000
  },
  "quarterly": {
    "q4_2025": {
      "months": [
        { "month": "October", "sales": 22, "revenue": 320000, "commission": 820000 },
        { "month": "November", "sales": 26, "revenue": 410000, "commission": 940000 },
        { "month": "December", "sales": 24, "revenue": 370000, "commission": 840000 }
      ],
      "totals": { "sales": 72, "revenue": 1100000, "commission": 2600000 }
    }
  },
  "quota": {
    "minimum": 6,
    "actual": 72,
    "status": "exceeds",
    "retentionRate": 94
  },
  "yearTrend": [
    { "month": "Jan", "commission": 420000 },
    { "month": "Feb", "commission": 510000 }
  ]
}
```

---

## UI COMPONENTS (React)

### CommissionTracker.tsx

```tsx
'use client';

import { useState } from 'react';
import { useCommissionDashboard } from '@/hooks/useCommissionDashboard';
import { PeriodSelector } from './PeriodSelector';
import { SummaryCards } from './SummaryCards';
import { EarningsBreakdown } from './EarningsBreakdown';
import { SalesByTrack } from './SalesByTrack';
import { PendingCommissions } from './PendingCommissions';
import { RecurringView } from './RecurringView';
import { BonusesView } from './BonusesView';
import { PerformanceView } from './PerformanceView';

export function CommissionTracker() {
  const [period, setPeriod] = useState('this_month');
  const [activeTab, setActiveTab] = useState('overview');
  
  const { data, loading } = useCommissionDashboard(period);
  
  return (
    <div className="commission-tracker">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">💰 Commission Tracker</h1>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>
      
      <SummaryCards data={data?.summary} loading={loading} />
      
      <div className="mt-8">
        <div className="border-b">
          <nav className="flex gap-4">
            {['overview', 'pending', 'recurring', 'bonuses', 'performance'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-2 px-4 ${activeTab === tab ? 'border-b-2 border-blue-600 font-medium' : ''}`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>
        
        <div className="mt-6">
          {activeTab === 'overview' && (
            <>
              <EarningsBreakdown data={data?.breakdown} />
              <SalesByTrack data={data?.salesByTrack} />
            </>
          )}
          {activeTab === 'pending' && <PendingCommissions />}
          {activeTab === 'recurring' && <RecurringView />}
          {activeTab === 'bonuses' && <BonusesView />}
          {activeTab === 'performance' && <PerformanceView />}
        </div>
      </div>
    </div>
  );
}
```

---

## NOTIFICATIONS & ALERTS

### Automated Notifications

```
COMMISSION NOTIFICATIONS:

Daily:
□ "You have $X pending commission unlocking this week"
□ "3 customers approaching Month 6 — schedule reviews"

Weekly:
□ "Weekly earnings summary: $X earned, $X pending"
□ "Clawback risk alert: 2 customers at risk"

Monthly:
□ "Month-end summary: $X earned vs $X goal"
□ "Upcoming bonuses next month: $X potential"

Trigger-based:
□ "Upfront commission unlocked: $X from [Customer]"
□ "Retention bonus earned: $X for [Customer] Month 6"
□ "⚠️ Customer [Name] may cancel — call now to save $X"
□ "🎉 You hit your monthly goal!"
```

---

## TESTING CHECKLIST

```
DASHBOARD:
□ Summary cards show correct totals
□ Period selector works (MTD, QTD, YTD, custom)
□ Earnings breakdown adds up correctly
□ Sales by track matches actual sales

PENDING:
□ Awaiting payment shows correct unlock dates
□ Clawback risk calculates correctly
□ Risk reasons display properly

RECURRING:
□ Monthly recurring total is accurate
□ Rate (10% vs 15%) shows correctly
□ Approaching rate bump list is accurate
□ Month calculation is correct

BONUSES:
□ Upcoming bonuses show correct dates
□ Earned bonuses tracked properly
□ Paused bonuses show grace period
□ Touchpoint requirements displayed

PERFORMANCE:
□ Goal progress calculates correctly
□ Quarterly breakdown accurate
□ Quota status correct
□ Year trend chart renders

CUSTOMER DETAIL:
□ Timeline shows all commission events
□ Totals calculate correctly
□ Rate lock status accurate
□ Remaining commission correct
```

---

## EXPORT OPTIONS

```
EXPORT FORMATS:

PDF Report:
- Monthly commission statement
- Customer-by-customer breakdown
- Suitable for records/taxes

CSV Export:
- All commission transactions
- Filterable by date, type, status
- Import into spreadsheet

Summary Email:
- Weekly/monthly summary
- Sent to agent email
- Include goal progress
```

---

**Version 5.8.1 — December 2025**