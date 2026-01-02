# TradesCaptain CRM Update Prompt — Plan Details Panel

**Version:** 5.8.1  
**Date:** December 2025  
**Feature:** Plan Details Panel for Sales Agents  
**Priority:** HIGH — Agents need instant feature access during calls

---

## OVERVIEW

Add a Plan Details Panel to the CRM that gives agents instant access to:
- What's included in each plan
- What's NOT included (with upgrade suggestions)
- SMS allocations
- Tier comparisons
- Quick upgrade paths

**Goal:** Agents never have to say "let me check on that" — everything is at their fingertips.

---

## IMPLEMENTATION LOCATIONS

### 1. Plan Selection Screen (New Sale Flow)

When agent is creating a new sale, show plan cards with expandable details.

```
┌─────────────────────────────────────────────────────────────────────────┐
│ SELECT A PLAN                                                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │  NEVERMISS  │  │    BLUE     │  │    WEB      │  │   SILVER    │    │
│  │   $29/mo    │  │  $49-199    │  │  $149-349   │  │  $199-449   │    │
│  │  [Details]  │  │  [Details]  │  │  [Details]  │  │  [Details]  │    │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │
│                                                                         │
│  ┌─────────────┐  ┌─────────────┐                                      │
│  │    GOLD     │  │  LOCAL SEO  │                                      │
│  │  $249-549   │  │   $99-199   │                                      │
│  │  [Details]  │  │  [Details]  │                                      │
│  └─────────────┘  └─────────────┘                                      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**On [Details] Click — Expand Panel:**

```
┌─────────────────────────────────────────────────────────────────────────┐
│ GOLD PLANS — Complete Business Solution                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ BEST FOR: Contractors who want everything in one place                  │
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ PRICING                                                             │ │
│ ├──────────────────┬────────────┬────────────┬───────────────────────┤ │
│ │ Plan             │ Monthly    │ Annual     │ SMS Included          │ │
│ ├──────────────────┼────────────┼────────────┼───────────────────────┤ │
│ │ Gold Starter     │ $249       │ $2,241     │ 700/mo                │ │
│ │ Gold Pro ⭐      │ $399       │ $3,591     │ 1,000/mo              │ │
│ │ Gold Enterprise  │ $549       │ $4,941     │ 1,500/mo              │ │
│ └──────────────────┴────────────┴────────────┴───────────────────────┘ │
│                                                                         │
│ ✓ INCLUDED                        ✗ NOT INCLUDED                       │
│ ─────────────────────────────     ─────────────────────────────        │
│ ✓ Full CRM & Database             ✗ Paid Ads Management                │
│ ✓ Calendar & Scheduling           ✗ Social Media Management            │
│ ✓ Quotes & Invoicing              ✗ Extra Content Writing              │
│ ✓ Custom Website (5-15 pages)                                          │
│ ✓ Local SEO & Citations                                                │
│ ✓ NeverMiss AI SMS                                                     │
│ ✓ Google Business Profile                                              │
│ ✓ Monthly SEO Reports                                                  │
│ ✓ Mobile App Access                                                    │
│                                                                         │
│ [Select Gold Starter] [Select Gold Pro] [Select Gold Enterprise]       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### 2. Client Profile — Plan Details Tab

Add a "Plan Details" tab to every client profile showing what their current plan includes.

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ACME PLUMBING — Client Profile                                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ [Overview] [Plan Details] [Billing] [Activity] [Support]                │
│            ^^^^^^^^^^^^                                                 │
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ CURRENT PLAN: Blue Pro — $99/mo                                     │ │
│ │ Since: October 15, 2025 | Next Billing: January 15, 2026            │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ ✓ WHAT'S INCLUDED IN BLUE PRO                                          │
│ ─────────────────────────────────────────────────────────────────────  │
│ ✓ Full CRM & Customer Database                                         │
│ ✓ Calendar & Scheduling                                                │
│ ✓ Job Tracking & Work Orders                                           │
│ ✓ Quotes & Invoicing                                                   │
│ ✓ NeverMiss AI SMS — 1,000 messages/month                              │
│   └─ Current Usage: 456 / 1,000 (46%)                                  │
│ ✓ Mobile App Access                                                    │
│ ✓ Email & Phone Support                                                │
│                                                                         │
│ ✗ NOT INCLUDED — UPGRADE OPTIONS                                       │
│ ─────────────────────────────────────────────────────────────────────  │
│ ✗ Professional Website      → [Upgrade to Gold Pro - $399/mo]          │
│ ✗ Local SEO & Citations     → [Upgrade to Gold Pro - $399/mo]          │
│ ✗ Priority Support          → [Upgrade to Blue Enterprise - $199/mo]   │
│                                                                         │
│ ─────────────────────────────────────────────────────────────────────  │
│ 💡 UPGRADE OPPORTUNITY                                                  │
│ This customer has been on Blue Pro for 3 months.                       │
│ Suggested: Gold Pro ($399) — adds Website + SEO for $300 more.         │
│ [Start Upgrade Conversation]                                           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### 3. Sales Tools Section — Downloadable Resources

Add a "Sales Tools" section in the CRM sidebar with downloadable feature sheets.

```
┌──────────────────────┐
│ 📊 SALES TOOLS       │
├──────────────────────┤
│                      │
│ FEATURE SHEETS       │
│ ├─ NeverMiss [PDF]   │
│ ├─ Blue CRM [PDF]    │
│ ├─ Web [PDF]         │
│ ├─ Silver [PDF]      │
│ ├─ Gold [PDF]        │
│ └─ Local SEO [PDF]   │
│                      │
│ QUICK REFERENCES     │
│ ├─ Price Sheet [PDF] │
│ ├─ Commission Calc   │
│ └─ Demo Script       │
│                      │
│ COMPARISON TOOLS     │
│ └─ [Plan Comparator] │
│                      │
└──────────────────────┘
```

---

### 4. Plan Comparator Tool

Interactive tool for agents to compare plans side-by-side during calls.

```
┌─────────────────────────────────────────────────────────────────────────┐
│ PLAN COMPARATOR                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ Compare: [Blue Pro ▼]  vs  [Gold Pro ▼]                                │
│                                                                         │
│ ┌────────────────────────┬─────────────────┬─────────────────┐         │
│ │ Feature                │ Blue Pro        │ Gold Pro        │         │
│ ├────────────────────────┼─────────────────┼─────────────────┤         │
│ │ Price                  │ $99/mo          │ $399/mo         │         │
│ │ CRM & Database         │ ✓               │ ✓               │         │
│ │ Calendar               │ ✓               │ ✓               │         │
│ │ Quotes & Invoicing     │ ✓               │ ✓               │         │
│ │ NeverMiss AI SMS       │ ✓ 1,000         │ ✓ 1,000         │         │
│ │ Professional Website   │ ✗               │ ✓ 10 pages      │         │
│ │ Local SEO              │ ✗               │ ✓ 25 citations  │         │
│ │ GBP Management         │ ✗               │ ✓               │         │
│ │ Monthly SEO Reports    │ ✗               │ ✓               │         │
│ └────────────────────────┴─────────────────┴─────────────────┘         │
│                                                                         │
│ 💡 TALKING POINT:                                                       │
│ "For $300 more per month, you get a professional website AND           │
│  local SEO that helps customers find you on Google. That's             │
│  usually $500+ separately. Gold Pro is the best value."                │
│                                                                         │
│ [Copy Comparison] [Email to Customer] [Print]                          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### 5. Upgrade Flow Modal

When agent clicks "Upgrade" on a client, show clear comparison.

```
┌─────────────────────────────────────────────────────────────────────────┐
│ UPGRADE: ACME PLUMBING                                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ Current: Blue Pro ($99/mo)                                              │
│                                                                         │
│ UPGRADE OPTIONS:                                                        │
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ 🔷 Blue Enterprise — $199/mo (+$100)                                │ │
│ │    Adds: Priority Support, 1,500 SMS (vs 1,000), Dedicated Manager  │ │
│ │    [Select]                                                         │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ 🥇 Gold Pro — $399/mo (+$300) ⭐ RECOMMENDED                        │ │
│ │    Adds: Professional Website, Local SEO, GBP Management            │ │
│ │    Keeps: Everything in Blue Pro                                    │ │
│ │    [Select]                                                         │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ 🥇 Gold Enterprise — $549/mo (+$450)                                │ │
│ │    Adds: Everything in Gold Pro + Priority Support + 1,500 SMS      │ │
│ │    [Select]                                                         │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ YOUR COMMISSION ON UPGRADE:                                             │
│ Blue Pro → Gold Pro: $150 upfront + $30/mo recurring                   │
│                                                                         │
│ [Cancel] [Proceed with Selected Upgrade]                                │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## DATABASE REQUIREMENTS

### plan_features Table

```sql
CREATE TABLE plan_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES plans(id),
  feature_name VARCHAR(100) NOT NULL,
  feature_description TEXT,
  feature_category VARCHAR(50),  -- 'core', 'sms', 'website', 'seo', 'support'
  is_included BOOLEAN NOT NULL DEFAULT false,
  display_value VARCHAR(100),  -- e.g., "1,000/mo" for SMS
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX idx_plan_features_plan_id ON plan_features(plan_id);
```

### Seed Data Example

```sql
-- Gold Pro Features
INSERT INTO plan_features (plan_id, feature_name, feature_description, feature_category, is_included, display_value, display_order) VALUES
((SELECT id FROM plans WHERE slug = 'gold_pro'), 'Full CRM & Database', 'Store all customer info', 'core', true, '✓', 1),
((SELECT id FROM plans WHERE slug = 'gold_pro'), 'Calendar & Scheduling', 'Book and manage jobs', 'core', true, '✓', 2),
((SELECT id FROM plans WHERE slug = 'gold_pro'), 'Quotes & Invoicing', 'Create quotes, send invoices', 'core', true, '✓', 3),
((SELECT id FROM plans WHERE slug = 'gold_pro'), 'NeverMiss AI SMS', 'Missed call text-back', 'sms', true, '1,000/mo', 4),
((SELECT id FROM plans WHERE slug = 'gold_pro'), 'Professional Website', 'Custom designed site', 'website', true, '10 pages', 5),
((SELECT id FROM plans WHERE slug = 'gold_pro'), 'Local SEO', 'Citation building', 'seo', true, '25 citations', 6),
((SELECT id FROM plans WHERE slug = 'gold_pro'), 'GBP Management', 'Google Business Profile', 'seo', true, '✓', 7),
((SELECT id FROM plans WHERE slug = 'gold_pro'), 'Priority Support', 'Skip the queue', 'support', false, '✗', 8);
```

### plan_upgrade_paths Table

```sql
CREATE TABLE plan_upgrade_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_plan_id UUID REFERENCES plans(id),
  to_plan_id UUID REFERENCES plans(id),
  price_difference_cents INTEGER,
  is_recommended BOOLEAN DEFAULT false,
  benefits_summary TEXT,
  talking_point TEXT,
  display_order INTEGER DEFAULT 0
);
```

---

## API ENDPOINTS

### GET /api/plans/:planId/features

Returns all features for a plan.

```json
{
  "plan": {
    "id": "uuid",
    "name": "Gold Pro",
    "slug": "gold_pro",
    "price_cents": 39900,
    "billing_period": "monthly"
  },
  "features": {
    "included": [
      { "name": "Full CRM & Database", "description": "...", "value": "✓" },
      { "name": "NeverMiss AI SMS", "description": "...", "value": "1,000/mo" }
    ],
    "not_included": [
      { "name": "Priority Support", "upgrade_to": "Gold Enterprise" }
    ]
  },
  "sms": {
    "included": 1000,
    "has_nevermiss": true,
    "has_calendar_booking": true
  }
}
```

### GET /api/plans/compare?plans=blue_pro,gold_pro

Returns side-by-side comparison.

```json
{
  "plans": [
    { "slug": "blue_pro", "name": "Blue Pro", "price": 9900 },
    { "slug": "gold_pro", "name": "Gold Pro", "price": 39900 }
  ],
  "features": [
    { "name": "CRM & Database", "blue_pro": "✓", "gold_pro": "✓" },
    { "name": "Professional Website", "blue_pro": "✗", "gold_pro": "10 pages" }
  ],
  "price_difference": 30000,
  "talking_point": "For $300 more per month..."
}
```

### GET /api/clients/:clientId/upgrade-options

Returns available upgrades for a client's current plan.

---

## UI COMPONENTS (React)

### PlanDetailsPanel.jsx

```jsx
// Key component for showing plan features
function PlanDetailsPanel({ planSlug }) {
  const { plan, features, loading } = usePlanFeatures(planSlug);
  
  if (loading) return <Skeleton />;
  
  return (
    <div className="plan-details-panel">
      <PlanHeader plan={plan} />
      <PricingTable tiers={plan.tiers} />
      <FeatureList 
        included={features.included} 
        notIncluded={features.not_included} 
      />
      <UpgradePaths fromPlan={planSlug} />
    </div>
  );
}
```

### PlanComparator.jsx

```jsx
function PlanComparator() {
  const [plan1, setPlan1] = useState('blue_pro');
  const [plan2, setPlan2] = useState('gold_pro');
  const { comparison } = useCompare(plan1, plan2);
  
  return (
    <div className="plan-comparator">
      <div className="selectors">
        <PlanSelect value={plan1} onChange={setPlan1} />
        <span>vs</span>
        <PlanSelect value={plan2} onChange={setPlan2} />
      </div>
      <ComparisonTable data={comparison} />
      <TalkingPoint text={comparison.talking_point} />
    </div>
  );
}
```

---

## TESTING CHECKLIST

```
PLAN DETAILS PANEL:
□ All 6 plan tracks show correct features
□ SMS allocations match v5.8 spec
□ Blue Starter correctly shows NO NeverMiss
□ "Not Included" shows correct upgrade paths
□ Pricing matches current rates

PLAN COMPARATOR:
□ All plan combinations work
□ Price difference calculates correctly
□ Talking points display
□ Copy/Email/Print functions work

CLIENT PROFILE:
□ Current plan features display correctly
□ SMS usage shows (if applicable)
□ Upgrade suggestions are contextual
□ Upgrade modal shows commission

SALES TOOLS:
□ All PDFs download correctly
□ Feature sheets match v5.8 versions
□ Price sheet is current
```

---

## RELATED DOCUMENTS

| Document | Purpose |
|----------|---------|
| TradesCaptain_NeverMiss_Features_v5.8.docx | PDF source for NeverMiss |
| TradesCaptain_Blue_CRM_Features_v5.8.docx | PDF source for Blue |
| TradesCaptain_Gold_Features_v5.8.docx | PDF source for Gold |
| TradesCaptain_Price_Sheet_v5.8.xlsx | Master pricing reference |

---

**Version 5.8.1 — December 2025**