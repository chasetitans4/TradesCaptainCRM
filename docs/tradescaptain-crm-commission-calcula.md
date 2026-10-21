# TradesCaptain CRM — Commission Calculator Prompt

**Version:** 5.8.1  
**Date:** December 2025  
**Feature:** Interactive Commission Calculator for Sales Agents  
**Priority:** HIGH — Agents need real-time commission visibility during sales

---

## OVERVIEW

Build an interactive Commission Calculator within the CRM that allows agents to:
- Calculate commission on any plan/offer combination in real-time
- See upfront, recurring, and max potential earnings
- Model upgrade scenarios
- Factor in the 15% rate bump at Month 6
- Apply offers and see adjusted commissions

**Goal:** Agent knows exactly what they'll earn before closing, every time.

---

## CALCULATOR LOCATION

### Primary Access Points

```
┌─────────────────────────────────────────────────────────────────────────┐
│ CRM SIDEBAR                                                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ 📊 SALES TOOLS                                                          │
│ ├─ Commission Calculator  ← Primary location                           │
│ ├─ Plan Comparator                                                      │
│ ├─ Feature Sheets                                                       │
│ └─ Demo Scripts                                                         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Secondary Access

- **New Sale Flow:** "Calculate Commission" button on plan selection
- **Client Profile:** "Commission on Upgrade" in upgrade modal
- **Quick Action:** Keyboard shortcut (Cmd/Ctrl + K → "calc")

---

## CALCULATOR INTERFACE

### Main Calculator View

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 💰 COMMISSION CALCULATOR                                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ PLAN SELECTION                                                          │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Track: [NeverMiss ▼]                                                │ │
│ │                                                                     │ │
│ │ Plan:  ○ NeverMiss — $29/mo                                        │ │
│ │        ○ NeverMiss +1 User — $48/mo                                │ │
│ │        ○ NeverMiss +2 Users — $67/mo                               │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ BILLING                                                                 │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ ○ Monthly    ○ Annual                                               │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ OFFER (Optional)                                                        │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ [None ▼]                                                            │ │
│ │  • None                                                             │ │
│ │  • FIRST50 — 50% off first month                                   │ │
│ │  • FREETRIAL14 — 14-day free trial                                 │ │
│ │  • ANNUAL25 — 25% off annual (auto-applied)                        │ │
│ │  • VIP20 — 20% off forever (requires approval)                     │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ ═══════════════════════════════════════════════════════════════════════ │
│                                                                         │
│ YOUR COMMISSION                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │                                                                     │ │
│ │   UPFRONT (after Month 2)           $15.00                         │ │
│ │   ─────────────────────────────────────────                        │ │
│ │   Recurring M3-M5 (10%)             $2.90/mo × 3 = $8.70           │ │
│ │   Recurring M6-M14 (15%)            $4.35/mo × 9 = $39.15          │ │
│ │   ─────────────────────────────────────────────────────            │ │
│ │   TOTAL RECURRING                   $47.85                         │ │
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
│ │   💰 MAX POTENTIAL COMMISSION        $252.85                       │ │
│ │                                                                     │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ [Copy Summary] [Add to Sale] [Calculate Another]                        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### Annual Plan Calculator View

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 💰 COMMISSION CALCULATOR                                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ PLAN: Gold Pro Annual — $3,591/year                                    │
│ OFFER: None                                                             │
│                                                                         │
│ ═══════════════════════════════════════════════════════════════════════ │
│                                                                         │
│ YOUR COMMISSION                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │                                                                     │ │
│ │   ANNUAL COMMISSION (35%)           $1,256.85                      │ │
│ │   ─────────────────────────────────────────────────────            │ │
│ │   Recurring                         $0.00                          │ │
│ │   Retention Bonuses                 $0.00                          │ │
│ │                                                                     │ │
│ │   ═══════════════════════════════════════════════════════          │ │
│ │                                                                     │ │
│ │   💰 TOTAL COMMISSION                $1,256.85                     │ │
│ │                                                                     │ │
│ │   ⚠️ Annual plans: One-time commission, no recurring or bonuses    │ │
│ │                                                                     │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### Upgrade Calculator View

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 💰 UPGRADE COMMISSION CALCULATOR                                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ CURRENT PLAN                                                            │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ NeverMiss — $29/mo                                                  │ │
│ │ Customer since: October 15, 2025 (Month 3)                          │ │
│ │ Rate status: 10% (15% unlocks at Month 6)                          │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ UPGRADE TO                                                              │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ [Blue Pro — $99/mo ▼]                                               │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ ═══════════════════════════════════════════════════════════════════════ │
│                                                                         │
│ UPGRADE COMMISSION                                                      │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │                                                                     │ │
│ │   Price Difference                  $70/mo ($99 - $29)             │ │
│ │   ─────────────────────────────────────────────────────            │ │
│ │   Upfront (50% of diff)             $35.00                         │ │
│ │   ─────────────────────────────────────────────────────            │ │
│ │   NEW Recurring Timeline (resets to M1):                           │ │
│ │     M3-M5 on difference (10%)       $7.00/mo × 3 = $21.00          │ │
│ │     M6-M14 on difference (15%)      $10.50/mo × 9 = $94.50         │ │
│ │   ─────────────────────────────────────────────────────            │ │
│ │   ORIGINAL NeverMiss recurring continues:                          │ │
│ │     Remaining at current rate       $2.90/mo × 9 = $26.10          │ │
│ │   ─────────────────────────────────────────────────────            │ │
│ │                                                                     │ │
│ │   ⚠️ Note: Upgrade BEFORE Month 6 resets recurring timeline        │ │
│ │                                                                     │ │
│ │   ═══════════════════════════════════════════════════════          │ │
│ │                                                                     │ │
│ │   💰 UPGRADE COMMISSION              $176.60                       │ │
│ │      (plus continued original recurring)                           │ │
│ │                                                                     │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## COMMISSION FORMULAS

### Database: commission_rates Table

```sql
CREATE TABLE commission_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_type VARCHAR(50) NOT NULL,  -- 'upfront', 'recurring_10', 'recurring_15', 'annual', 'custom_upfront', 'custom_recurring', 'custom_annual'
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
('annual', 35.00, '2025-01-01', 'Annual plan one-time commission'),
('custom_upfront', 50.00, '2025-01-01', 'Custom plan upfront'),
('custom_recurring', 10.00, '2025-01-01', 'Custom plan recurring'),
('custom_annual', 35.00, '2025-01-01', 'Custom plan annual');
```

### Database: retention_bonuses Table

```sql
CREATE TABLE retention_bonuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone VARCHAR(50) NOT NULL,  -- 'month_3', 'month_4', 'month_6', 'month_12'
  bonus_amount_cents INTEGER NOT NULL,
  requirement TEXT,
  applies_to VARCHAR(20) DEFAULT 'monthly',  -- 'monthly', 'annual', 'both'
  effective_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Current bonuses (v5.8)
INSERT INTO retention_bonuses (milestone, bonus_amount_cents, requirement, applies_to, effective_date) VALUES
('month_3', 1500, 'Check-in call logged + satisfaction audit sent', 'monthly', '2025-01-01'),
('month_4', 2500, 'Customer 4th payment processed', 'monthly', '2025-01-01'),
('month_6', 5000, 'Customer still active at Month 6 + rate bumps to 15%', 'monthly', '2025-01-01'),
('month_12', 10000, 'Customer still active at Month 12', 'monthly', '2025-01-01');
```

### Database: offer_commission_adjustments Table

```sql
CREATE TABLE offer_commission_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_code VARCHAR(20) NOT NULL,
  offer_name VARCHAR(100),
  upfront_adjustment_type VARCHAR(20),  -- 'none', 'reduce_base', 'delay'
  upfront_adjustment_value DECIMAL(5,2),
  recurring_adjustment_type VARCHAR(20),  -- 'none', 'reduce_rate', 'reduce_base'
  recurring_adjustment_value DECIMAL(5,2),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Current offers (v5.8)
INSERT INTO offer_commission_adjustments (offer_code, offer_name, upfront_adjustment_type, upfront_adjustment_value, recurring_adjustment_type, notes) VALUES
('FIRST50', '50% Off First Month', 'reduce_base', 50.00, 'none', 'Upfront based on discounted M1, M2 at full price'),
('FREETRIAL14', '14-Day Free Trial', 'delay', 14, 'none', 'Upfront delayed 14 days, based on M2+M3'),
('ANNUAL25', '25% Off Annual', 'none', NULL, 'none', 'Commission on discounted annual price'),
('WAIVE99', 'Waive $99 GBP Setup', 'none', NULL, 'none', 'No commission impact'),
('VIP20', '20% Off Forever', 'reduce_base', 20.00, 'reduce_base', 'All commission based on discounted price');
```

---

## CALCULATION LOGIC

### calculateCommission() Function

```typescript
interface CommissionInput {
  planSlug: string;
  billingPeriod: 'monthly' | 'annual';
  offerCode?: string;
  isUpgrade?: boolean;
  currentPlanSlug?: string;
  currentMonth?: number;  // For upgrades: which month is customer in
}

interface CommissionResult {
  planName: string;
  planPrice: number;
  effectivePrice: number;  // After offer applied
  
  upfront: number;
  upfrontDate: string;  // "After Month 2" or specific date
  
  recurring: {
    rate10: number;      // Per month at 10%
    rate15: number;      // Per month at 15%
    months10: number;    // How many months at 10%
    months15: number;    // How many months at 15%
    total10: number;     // Total at 10%
    total15: number;     // Total at 15%
    totalRecurring: number;
  };
  
  bonuses: {
    month3: number;
    month4: number;
    month6: number;
    month12: number;
    total: number;
  };
  
  maxCommission: number;
  
  notes: string[];  // Warnings, special conditions
}

function calculateCommission(input: CommissionInput): CommissionResult {
  const plan = getPlan(input.planSlug);
  const offer = input.offerCode ? getOffer(input.offerCode) : null;
  
  // Calculate effective price
  let effectivePrice = plan.monthlyPrice;
  if (offer?.upfront_adjustment_type === 'reduce_base') {
    effectivePrice = plan.monthlyPrice * (1 - offer.upfront_adjustment_value / 100);
  }
  
  const notes: string[] = [];
  
  // ANNUAL PLANS
  if (input.billingPeriod === 'annual') {
    const annualPrice = plan.annualPrice;
    const commission = annualPrice * 0.35;
    
    return {
      planName: plan.name,
      planPrice: annualPrice,
      effectivePrice: annualPrice,
      upfront: commission,
      upfrontDate: 'Upon payment',
      recurring: { rate10: 0, rate15: 0, months10: 0, months15: 0, total10: 0, total15: 0, totalRecurring: 0 },
      bonuses: { month3: 0, month4: 0, month6: 0, month12: 0, total: 0 },
      maxCommission: commission,
      notes: ['Annual plans: One-time 35% commission, no recurring or bonuses']
    };
  }
  
  // MONTHLY PLANS
  const upfront = effectivePrice * 0.50;
  
  // Recurring calculation
  const rate10 = plan.monthlyPrice * 0.10;
  const rate15 = plan.monthlyPrice * 0.15;
  const months10 = 3;  // Months 3, 4, 5
  const months15 = 9;  // Months 6-14
  const total10 = rate10 * months10;
  const total15 = rate15 * months15;
  const totalRecurring = total10 + total15;
  
  // Bonuses
  const bonuses = {
    month3: 15,
    month4: 25,
    month6: 50,
    month12: 100,
    total: 190
  };
  
  // VIP20 reduces recurring base
  if (offer?.offer_code === 'VIP20') {
    const discountedPrice = plan.monthlyPrice * 0.80;
    const adjustedRate10 = discountedPrice * 0.10;
    const adjustedRate15 = discountedPrice * 0.15;
    notes.push('VIP20: Recurring based on discounted price');
  }
  
  // FREETRIAL14 delays upfront
  if (offer?.offer_code === 'FREETRIAL14') {
    notes.push('Trial: Upfront paid after Month 2 of paid service');
  }
  
  const maxCommission = upfront + totalRecurring + bonuses.total;
  
  return {
    planName: plan.name,
    planPrice: plan.monthlyPrice,
    effectivePrice,
    upfront,
    upfrontDate: 'After Month 2 payment',
    recurring: { rate10, rate15, months10, months15, total10, total15, totalRecurring },
    bonuses,
    maxCommission,
    notes
  };
}
```

### calculateUpgradeCommission() Function

```typescript
interface UpgradeCommissionInput {
  currentPlanSlug: string;
  newPlanSlug: string;
  customerMonth: number;  // What month is customer currently in
  isRateLocked: boolean;  // Have they hit Month 6 on current plan
}

interface UpgradeCommissionResult {
  priceDifference: number;
  
  upgradeUpfront: number;
  
  newRecurring: {
    rate10: number;
    rate15: number;
    months10: number;
    months15: number;
    total: number;
  };
  
  continuedOriginalRecurring: {
    rate: number;
    monthsRemaining: number;
    total: number;
  };
  
  totalUpgradeCommission: number;
  
  notes: string[];
}

function calculateUpgradeCommission(input: UpgradeCommissionInput): UpgradeCommissionResult {
  const currentPlan = getPlan(input.currentPlanSlug);
  const newPlan = getPlan(input.newPlanSlug);
  
  const priceDifference = newPlan.monthlyPrice - currentPlan.monthlyPrice;
  const notes: string[] = [];
  
  // Upfront on difference (50%)
  const upgradeUpfront = priceDifference * 0.50;
  
  // New recurring timeline RESETS on the difference
  const newRate10 = priceDifference * 0.10;
  const newRate15 = priceDifference * 0.15;
  
  // Determine if upgrade is before or after Month 6
  if (input.customerMonth < 6) {
    notes.push('⚠️ Upgrade BEFORE Month 6: New recurring timeline starts at Month 1');
  } else if (input.isRateLocked) {
    notes.push('✓ Upgrade AFTER Month 6: 15% rate applies to full new price immediately');
  }
  
  // Original plan recurring continues
  const originalRate = input.isRateLocked ? currentPlan.monthlyPrice * 0.15 : currentPlan.monthlyPrice * 0.10;
  const originalMonthsRemaining = Math.max(0, 14 - input.customerMonth);
  
  return {
    priceDifference,
    upgradeUpfront,
    newRecurring: {
      rate10: newRate10,
      rate15: newRate15,
      months10: 3,
      months15: 9,
      total: (newRate10 * 3) + (newRate15 * 9)
    },
    continuedOriginalRecurring: {
      rate: originalRate,
      monthsRemaining: originalMonthsRemaining,
      total: originalRate * originalMonthsRemaining
    },
    totalUpgradeCommission: upgradeUpfront + (newRate10 * 3) + (newRate15 * 9),
    notes
  };
}
```

---

## COMMISSION REFERENCE TABLES

### Quick Reference Panel

Show in sidebar when calculator is open:

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

### Full Plan Commission Table (Printable)

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

## API ENDPOINTS

### POST /api/commission/calculate

```typescript
// Request
{
  "planSlug": "gold_pro",
  "billingPeriod": "monthly",
  "offerCode": "FIRST50"
}

// Response
{
  "success": true,
  "calculation": {
    "planName": "Gold Pro",
    "planPrice": 399,
    "effectivePrice": 399,
    "upfront": 200,
    "upfrontDate": "After Month 2 payment",
    "recurring": {
      "rate10": 39.90,
      "rate15": 59.85,
      "months10": 3,
      "months15": 9,
      "total10": 119.70,
      "total15": 538.65,
      "totalRecurring": 658.35
    },
    "bonuses": {
      "month3": 15,
      "month4": 25,
      "month6": 50,
      "month12": 100,
      "total": 190
    },
    "maxCommission": 1048.35,
    "notes": []
  }
}
```

### POST /api/commission/calculate-upgrade

```typescript
// Request
{
  "currentPlanSlug": "nevermiss",
  "newPlanSlug": "blue_pro",
  "customerMonth": 3,
  "isRateLocked": false
}

// Response
{
  "success": true,
  "calculation": {
    "priceDifference": 70,
    "upgradeUpfront": 35,
    "newRecurring": {
      "rate10": 7.00,
      "rate15": 10.50,
      "months10": 3,
      "months15": 9,
      "total": 115.50
    },
    "continuedOriginalRecurring": {
      "rate": 2.90,
      "monthsRemaining": 11,
      "total": 31.90
    },
    "totalUpgradeCommission": 150.50,
    "notes": ["⚠️ Upgrade BEFORE Month 6: New recurring timeline starts at Month 1"]
  }
}
```

---

## UI COMPONENTS (React)

### CommissionCalculator.tsx

```tsx
'use client';

import { useState } from 'react';
import { useCommissionCalculation } from '@/hooks/useCommissionCalculation';
import { PlanSelector } from './PlanSelector';
import { BillingToggle } from './BillingToggle';
import { OfferSelector } from './OfferSelector';
import { CommissionBreakdown } from './CommissionBreakdown';

export function CommissionCalculator() {
  const [planSlug, setPlanSlug] = useState('gold_pro');
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');
  const [offerCode, setOfferCode] = useState<string | null>(null);
  
  const { calculation, loading } = useCommissionCalculation({
    planSlug,
    billingPeriod: billing,
    offerCode
  });
  
  return (
    <div className="commission-calculator">
      <h2 className="text-2xl font-bold mb-6">💰 Commission Calculator</h2>
      
      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <PlanSelector value={planSlug} onChange={setPlanSlug} />
          <BillingToggle value={billing} onChange={setBilling} />
          <OfferSelector value={offerCode} onChange={setOfferCode} planSlug={planSlug} />
        </div>
        
        <div>
          {loading ? (
            <Skeleton />
          ) : calculation ? (
            <CommissionBreakdown calculation={calculation} />
          ) : null}
        </div>
      </div>
    </div>
  );
}
```

---

## TESTING CHECKLIST

```
BASIC CALCULATIONS:
□ NeverMiss $29 → $252.85 max
□ Gold Pro $399 → $1,392.95 max
□ Annual Gold Pro → $1,256.85 (35%)
□ Blue Starter shows correct (no SMS note)

OFFERS:
□ FIRST50 reduces upfront calculation base
□ FREETRIAL14 shows delayed upfront note
□ VIP20 reduces all calculations by 20%
□ WAIVE99 shows no commission impact

UPGRADES:
□ NeverMiss → Blue Pro shows $70 difference
□ Before M6 shows timeline reset warning
□ After M6 shows 15% rate applies
□ Original recurring continues correctly

15% RATE BUMP:
□ M3-5 shows 10% rate
□ M6-14 shows 15% rate
□ Locked-in status displays correctly

UI:
□ Plan selector shows all tracks
□ Billing toggle works
□ Offer dropdown filters by plan
□ Copy summary works
□ Mobile responsive
```

---

**Version 5.8.1 — December 2025**