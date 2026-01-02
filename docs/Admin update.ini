# TradesCaptain CRM/Admin Portal Update Prompt — v5.8

**Date:** December 2025  
**Version:** 5.8  
**Change Type:** NeverMiss Integration + Prior v5.7 Features  
**NeverMiss Tech Spec:** See TradesCaptain_NeverMiss_COMPLETE_v6_4_2.md for full technical implementation

---

## VERSION 5.8 CHANGES SUMMARY

### NEW: NeverMiss Product Track (v5.8)
AI-powered missed call text-back service. Entry-level wedge product into Blue CRM ecosystem.

- **NeverMiss Standalone:** $29/mo (700 SMS)
- **+User Add-On:** $19/mo (+250 SMS)
- **Included in:** Blue Pro, Blue Enterprise, All Gold plans
- **NOT included in:** Blue Starter, Web, Silver, Local SEO plans

### Retained from v5.7:
- 15% Retention Rate Bump at Month 6 (locked-in)
- Relationship Management Requirements (Section 5.4)
- Silver Plans (Website + SEO Bundle)
- All prior features

---

## CRITICAL: PLAN FEATURE MATRIX

This is the **single source of truth** for what each plan includes:

| Plan | NeverMiss AI SMS | SMS Included | Calendar | CRM | Price |
|------|------------------|--------------|----------|-----|-------|
| **NeverMiss** | ✅ | 700 | ❌ | ❌ | $29/mo |
| **Blue Starter** | ❌ | — | ✅ | ✅ | $49/mo |
| **Blue Pro** | ✅ | 1,000 | ✅ | ✅ | $99/mo |
| **Blue Enterprise** | ✅ | 1,500 | ✅ | ✅ | $199/mo |
| **Gold Starter** | ✅ | 700 | ✅ | ✅ | $249/mo |
| **Gold Pro** | ✅ | 1,000 | ✅ | ✅ | $399/mo |
| **Gold Enterprise** | ✅ | 1,500 | ✅ | ✅ | $549/mo |
| **Web Plans** | ❌ | — | ❌ | ❌ | $149-349/mo |
| **Silver Plans** | ❌ | — | ❌ | ❌ | $199-449/mo |
| **Local SEO** | ❌ | — | ❌ | ❌ | $99-199/mo |

**IMPORTANT:** Blue Starter does NOT include NeverMiss AI SMS. It's CRM + Calendar only.

---

## DATABASE UPDATES (v5.8)

### Add NeverMiss Plans to Plans Table

```sql
-- NeverMiss standalone plans
INSERT INTO plans (slug, name, price_cents, billing_period, track) VALUES
('nevermiss', 'NeverMiss', 2900, 'monthly', 'nevermiss'),
('nevermiss_annual', 'NeverMiss Annual', 26100, 'annual', 'nevermiss'),
('nevermiss_user', 'NeverMiss +User', 1900, 'monthly', 'nevermiss_addon');
```

### Create plan_nevermiss_features Table (Single Source of Truth)

```sql
CREATE TABLE plan_nevermiss_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES plans(id),
  includes_nevermiss BOOLEAN NOT NULL DEFAULT false,
  sms_included INTEGER NOT NULL DEFAULT 0,
  can_book_calendar BOOLEAN NOT NULL DEFAULT false,
  
  UNIQUE(plan_id)
);

-- Seed data
INSERT INTO plan_nevermiss_features (plan_id, includes_nevermiss, sms_included, can_book_calendar) VALUES
  ((SELECT id FROM plans WHERE slug = 'nevermiss'), true, 700, false),
  ((SELECT id FROM plans WHERE slug = 'blue_starter'), false, 0, false),  -- NO NeverMiss!
  ((SELECT id FROM plans WHERE slug = 'blue_pro'), true, 1000, true),
  ((SELECT id FROM plans WHERE slug = 'blue_enterprise'), true, 1500, true),
  ((SELECT id FROM plans WHERE slug = 'gold_starter'), true, 700, true),
  ((SELECT id FROM plans WHERE slug = 'gold_pro'), true, 1000, true),
  ((SELECT id FROM plans WHERE slug = 'gold_enterprise'), true, 1500, true);
```

### Add NeverMiss Settings Table

```sql
CREATE TABLE nevermiss_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) UNIQUE,
  
  -- Phone configuration
  phone_number VARCHAR(20) NOT NULL,
  phone_number_sid VARCHAR(50),  -- Twilio SID
  forward_to VARCHAR(20) NOT NULL,
  
  -- Business info (used in AI prompts)
  business_name VARCHAR(255),
  services_offered TEXT[],
  service_area VARCHAR(255),
  
  -- AI settings
  greeting_message TEXT DEFAULT 'Hey! Sorry I missed your call — I''m with a customer right now. What can I help you with?',
  ai_tone VARCHAR(20) DEFAULT 'friendly',  -- professional, friendly, casual
  
  -- Hours
  business_hours_start TIME DEFAULT '07:00',
  business_hours_end TIME DEFAULT '19:00',
  quiet_hours_start TIME DEFAULT '21:00',
  quiet_hours_end TIME DEFAULT '07:00',
  
  -- Notifications
  notify_sms BOOLEAN DEFAULT true,
  notify_email BOOLEAN DEFAULT true,
  emergency_always_notify BOOLEAN DEFAULT true,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Add SMS Usage Tracking

```sql
CREATE TABLE sms_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  sms_sent INTEGER DEFAULT 0,
  sms_received INTEGER DEFAULT 0,
  sms_limit INTEGER NOT NULL,
  
  -- Soft cap tracking
  alert_80_sent BOOLEAN DEFAULT false,
  alert_100_sent BOOLEAN DEFAULT false,
  alert_150_sent BOOLEAN DEFAULT false,
  
  UNIQUE(organization_id, period_start)
);
```

---

## COMMISSION STRUCTURE (v5.8)

### NeverMiss Commission

```
NEVERMISS PLAN COMMISSIONS:

| Plan | Price | Upfront (50%) | Recurring | Max + Retention |
|------|-------|---------------|-----------|-----------------|
| NeverMiss | $29/mo | $15 | $2.90-$4.35/mo | $243.85 |
| NeverMiss +User | $19/mo | $10 | $1.90-$2.85/mo | $160.35 |
| NeverMiss Annual | $261 | $91 (35%) | — | $91 |

RECURRING RATES:
- Months 3-5: 10% ($2.90/mo for NeverMiss)
- Months 6-14: 15% ($4.35/mo for NeverMiss) — LOCKED IN at Month 6

RETENTION BONUSES: Same as all plans
- Month 3 Check-In: $15
- Month 4 Retained: $25
- Month 6 Retained: $50 + RATE BUMPS TO 15%
- Month 12 Retained: $100
- TOTAL: $190
```

### NeverMiss Upgrade Commission

```
UPGRADE PATHS:

| From | To | Price Diff | Your Commission |
|------|-----|------------|-----------------|
| NeverMiss ($29) | Blue Pro ($99) | $70/mo | $35 upfront + $7-10.50/mo recurring |
| NeverMiss ($29) | + Blue Starter ($49) | $78/mo stacked | Commission on each separately |
| Blue Starter ($49) | Blue Pro ($99) | $50/mo | $25 upfront + $5-7.50/mo recurring |

IMPORTANT: 
- NeverMiss → Blue Pro is a REPLACEMENT (single subscription)
- NeverMiss + Blue Starter is STACKED (two subscriptions)
```

---

## SMS SOFT CAP POLICY

We NEVER hard-cap SMS and stop responding. That defeats the entire purpose.

```
SMS SOFT CAP THRESHOLDS:

| Threshold | Trigger | Action |
|-----------|---------|--------|
| 80% (560 SMS) | sms_used >= sms_limit * 0.8 | Email: "You're busy this month!" |
| 100% (700 SMS) | sms_used >= sms_limit | Email: "You hit your limit — leads keep flowing." |
| 150% (1,050 SMS) | sms_used >= sms_limit * 1.5 | Personal outreach about adding users |
| 200%+ (1,400 SMS) | sms_used >= sms_limit * 2 | Manager notification for upgrade conversation |

CRITICAL: AI continues responding at ALL thresholds. Never stop responding.
```

---

## ADMIN PORTAL UI UPDATES (v5.8)

### Plan Selection — Add NeverMiss Track

```
PLAN SELECTION UI:

Track Tabs or Dropdown:
[ NeverMiss ] [ Blue (CRM) ] [ Web ] [ Silver ] [ Gold ] [ Local SEO ]

When "NeverMiss" selected, show:
- NeverMiss — $29/mo (700 SMS)
- +User Add-On — $19/mo (+250 SMS each)

IMPORTANT: Show clear note that Blue Starter does NOT include NeverMiss
```

### Client Profile — NeverMiss Section

```
CLIENT PROFILE - NEVERMISS SECTION:

For NeverMiss or Blue Pro+/Gold customers:

┌─────────────────────────────────────────────┐
│ NEVERMISS STATUS                            │
├─────────────────────────────────────────────┤
│ Phone Number: (602) 555-1234                │
│ Forward To: (602) 555-9876                  │
│                                             │
│ SMS Usage This Period:                      │
│ ████████████░░░░ 584 / 700 (83%)           │
│                                             │
│ Leads Captured: 47 this month               │
│ Response Rate: 94%                          │
│                                             │
│ [View Conversations] [Edit Settings]        │
└─────────────────────────────────────────────┘

For Blue Starter customers (NO NeverMiss):
Show upsell banner: "Add AI missed call text-back with NeverMiss ($29/mo)"
```

---

## OFFER SYSTEM UPDATES (v5.8)

### Offers Available for NeverMiss

```
| Offer | NeverMiss Eligible? | Notes |
|-------|---------------------|-------|
| FIRST50 | Yes | 50% off first month ($14.50) |
| FREETRIAL14 | Yes | 14-day free trial |
| ANNUAL25 | Yes | Annual pricing is $261 (already 25% off) |
| WAIVE99 | No | GBP not available for NeverMiss |
| VIP20 | Yes (approval required) | 20% off = $23.20/mo |
```

---

## 15% RETENTION RATE BUMP (from v5.7)

### Rate Schedule

```
| Period | Rate | Gold Pro Example | NeverMiss Example |
|--------|------|------------------|-------------------|
| Months 3-5 | 10% | $39.90/mo | $2.90/mo |
| Months 6-14 | 15% (LOCKED IN) | $59.85/mo | $4.35/mo |
```

### Locked-In Rules

```
| Scenario | What Happens |
|----------|--------------|
| Upgrade AFTER Month 6 | Keep 15% on FULL new price |
| Downgrade AFTER Month 6 | Keep 15% on lower price |
| Upgrade BEFORE Month 6 | Timeline resets to Month 1 |
| Downgrade BEFORE Month 6 | Timeline resets to Month 1 |
```

### Database Fields for Rate Tracking

```javascript
// Fields on customer/subscription record
rate_locked_at_15: boolean  // True once they hit Month 6
rate_lock_date: timestamp   // When they locked in

// Commission calculation
function calculateRecurring(customer, plan) {
  const monthsActive = customer.months_since_plan_start;
  const isLocked = customer.rate_locked_at_15;
  
  if (isLocked || monthsActive >= 6) {
    return plan.monthly_price * 0.15;
  } else if (monthsActive >= 3) {
    return plan.monthly_price * 0.10;
  } else {
    return 0; // No recurring for months 1-2
  }
}
```

---

## RELATIONSHIP MANAGEMENT (from v5.6)

### Required Touchpoints

```
| Milestone | Activity | Purpose | Bonus |
|-----------|----------|---------|-------|
| Month 3 | Check-In Call | Satisfaction check | $15 |
| Month 6 | Business Review | Results + Upsell | $50 + 15% RATE |
| Month 9 | Growth Check | Upgrade conversation | — |
| Month 11 | Renewal Prep | Secure renewal | $100 (M12) |
```

### Touchpoint Impact on Recurring

- Missed touchpoint = recurring PAUSES until completed
- 14-day grace period per touchpoint
- No backpay for paused months
- Retention bonuses NOT affected

---

## TESTING CHECKLIST (v5.8)

```
NEVERMISS TESTING:

PLAN CONFIGURATION:
□ NeverMiss plan appears in plan selection
□ NeverMiss +User add-on available
□ NeverMiss shows as included for Blue Pro/Enterprise
□ NeverMiss shows as included for Gold plans
□ NeverMiss does NOT appear for Blue Starter
□ NeverMiss does NOT appear for Web/Silver/SEO plans
□ Correct SMS allocations per plan

SMS TRACKING:
□ SMS usage increments correctly
□ 80% alert triggers at 560 SMS
□ 100% alert triggers at 700 SMS
□ 150% flag triggers at 1050 SMS
□ AI continues responding past 100%
□ SMS counter resets at billing period

COMMISSION:
□ NeverMiss upfront commission = $15
□ NeverMiss recurring = $2.90/mo (10%) or $4.35/mo (15%)
□ Annual commission = $91 (35%)
□ Upgrade commission calculated on difference only
□ 15% rate bump applies at Month 6

15% RATE BUMP:
□ Rate shows 10% for Months 3-5
□ Rate shows 15% for Months 6+
□ rate_locked_at_15 flag set at Month 6
□ Upgrade AFTER M6 keeps 15% rate
□ Upgrade BEFORE M6 resets timeline

OFFERS:
□ FIRST50 works with NeverMiss
□ FREETRIAL14 works with NeverMiss
□ ANNUAL25 applies to NeverMiss annual
□ VIP20 requires approval for NeverMiss

UPGRADE PATH:
□ NeverMiss → Blue Pro upgrade works
□ NeverMiss → Blue Starter stack works
□ NeverMiss settings migrate to Blue CRM
□ Conversation history preserved
□ Phone number retained
```

---

## DEVELOPMENT NOTES (v5.8)

1. **NeverMiss is a wedge product** — Goal is to get customers in at $29, then upsell to Blue Pro ($99) for full CRM + calendar booking.

2. **Blue Starter does NOT include NeverMiss** — This is intentional product differentiation. Customers wanting AI SMS + CRM should go to Blue Pro.

3. **Never hard-cap SMS** — Use soft caps and personal outreach instead. Hard caps defeat the purpose.

4. **15% rate bump is LOCKED IN** — Once customer hits Month 6, they keep 15% even if they upgrade/downgrade later.

5. **NeverMiss settings migrate seamlessly** — When NeverMiss customer upgrades to Blue Pro, their phone number, templates, and conversation history should appear in the CRM.

6. **Shared backend** — NeverMiss and Blue CRM share the same database. The only difference is the frontend (standalone portal vs full CRM).

7. **For full NeverMiss technical spec** — See TradesCaptain_NeverMiss_COMPLETE_v6_4_2.md which includes database schemas, Twilio webhook handlers, AI conversation system, compliance, and more.

---

## RELATED DOCUMENTS

| Document | Purpose |
|----------|---------|
| TradesCaptain_NeverMiss_COMPLETE_v6_4_2.md | Full technical specification |
| NEVERMISS_ONBOARDING_SPEC.md | Customer onboarding flow |
| NEVERMISS_DEMO_SCRIPT_SALES.md | Sales rep demo script |
| NEVERMISS_ROI_CALCULATOR_SPEC.md | Website ROI calculator |
| TradesCaptain_1099_Sales_Rep_Agreement_v5.8.docx | Agent contract |
| TradesCaptain_Sales_CheatSheet_v5.8.docx | Quick reference |
| TradesCaptain_Commission_Calculator_v5.8.xlsx | Commission calculations |

---

**Version 5.8 — December 2025**