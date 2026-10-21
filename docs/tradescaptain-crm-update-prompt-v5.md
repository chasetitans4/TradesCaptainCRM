# TRADESCAPTAIN CRM UPDATE PROMPT — v5.9

**Task:** Update TradesCaptain CRM for v5.9 pricing and commission logic
**Priority:** High
**Type:** Backend + Database + UI Updates

---

## OVERVIEW

This prompt covers all CRM updates needed for v5.9:
1. **Pricing Updates** — Update plan prices in the system
2. **Tier Renaming** — "Growth" → "Enterprise"
3. **Commission Logic** — New payment timing rules
4. **Payout System** — 1st/15th payout schedule with same-day rule

---

## PART 1: PRICING UPDATES

### Database: Plans Table

Update the `plans` table (or equivalent) with new prices:

```sql
-- Leads Captain
UPDATE plans SET price = 39.00 WHERE slug = 'leads-captain' OR name = 'Leads Captain';

-- Web Plans
UPDATE plans SET price = 199.00 WHERE slug = 'web-starter' OR name = 'Web Starter';
UPDATE plans SET price = 299.00 WHERE slug = 'web-pro' OR name = 'Web Pro';
UPDATE plans SET price = 499.00, name = 'Web Enterprise' WHERE slug = 'web-growth' OR name = 'Web Growth';
UPDATE plans SET slug = 'web-enterprise' WHERE slug = 'web-growth';

-- Silver Plans
UPDATE plans SET price = 249.00 WHERE slug = 'silver-starter' OR name = 'Silver Starter';
UPDATE plans SET price = 349.00 WHERE slug = 'silver-pro' OR name = 'Silver Pro';
UPDATE plans SET price = 499.00, name = 'Silver Enterprise' WHERE slug = 'silver-growth' OR name = 'Silver Growth';
UPDATE plans SET slug = 'silver-enterprise' WHERE slug = 'silver-growth';

-- Gold Plans
UPDATE plans SET price = 299.00 WHERE slug = 'gold-starter' OR name = 'Gold Starter';
-- Gold Pro stays at $399 (no change)
UPDATE plans SET price = 598.00, name = 'Gold Enterprise' WHERE slug = 'gold-growth' OR name = 'Gold Growth';
UPDATE plans SET slug = 'gold-enterprise' WHERE slug = 'gold-growth';

-- Local SEO Plans
UPDATE plans SET price = 199.00 WHERE slug = 'local-seo-pro' OR name = 'Local SEO Pro';
UPDATE plans SET price = 249.00, name = 'Local SEO Enterprise' WHERE slug = 'local-seo-growth' OR name = 'Local SEO Growth';
UPDATE plans SET slug = 'local-seo-enterprise' WHERE slug = 'local-seo-growth';

-- Blue CRM Enterprise rename (price unchanged at $199)
UPDATE plans SET name = 'Blue Enterprise' WHERE slug = 'blue-growth' OR name = 'Blue Growth';
UPDATE plans SET slug = 'blue-enterprise' WHERE slug = 'blue-growth';
```

### Tier Enum Update

If using enums for tier names:

```sql
-- If using PostgreSQL enum
ALTER TYPE plan_tier RENAME VALUE 'growth' TO 'enterprise';

-- Or if using a tiers table
UPDATE tiers SET name = 'Enterprise', slug = 'enterprise' WHERE slug = 'growth' OR name = 'Growth';
```

### TypeScript/JavaScript Constants

```typescript
// lib/pricing.ts or constants/plans.ts

export const PLAN_PRICING_V59 = {
  version: '5.9',
  effectiveDate: new Date('2024-12-01'),
  
  'leads-captain': 39,
  
  'blue-starter': 49,
  'blue-pro': 99,
  'blue-enterprise': 199,
  
  'web-starter': 199,
  'web-pro': 299,
  'web-enterprise': 499,
  
  'silver-starter': 249,
  'silver-pro': 349,
  'silver-enterprise': 499,
  
  'gold-starter': 299,
  'gold-pro': 399,
  'gold-enterprise': 598,
  
  'local-seo-starter': 99,
  'local-seo-pro': 199,
  'local-seo-enterprise': 249,
} as const;

export type PlanSlug = keyof typeof PLAN_PRICING_V59;
```

---

## PART 2: COMMISSION LOGIC UPDATES

### New Commission Timing Rules

**Key Changes:**
1. Agents paid on **1st and 15th** of every month only
2. **Same-day rule:** Commission cannot be paid on the same day as the triggering client payment
3. **Upfront:** Paid after client's **2nd payment** clears
4. **Recurring:** Starts after client's **3rd payment** clears

### Database Schema Updates

Add new columns if not present:

```sql
-- Add payment tracking columns
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS payment_count INTEGER DEFAULT 0;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS first_payment_date TIMESTAMP;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMP;

-- Add commission tracking columns
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS trigger_payment_date TIMESTAMP;
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS scheduled_payout_date DATE;
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS payout_status VARCHAR(20) DEFAULT 'pending';

-- Add index for payout queries
CREATE INDEX IF NOT EXISTS idx_commissions_payout_date ON commissions(scheduled_payout_date, payout_status);
```

### Payout Date Calculation Function

```typescript
// lib/commissions/payoutDate.ts

/**
 * Calculate the next payout date that is NOT the same day as the payment
 * Payout dates are 1st and 15th of every month
 */
export function getNextPayoutDate(paymentDate: Date): Date {
  const day = paymentDate.getDate();
  const month = paymentDate.getMonth();
  const year = paymentDate.getFullYear();
  
  let payoutDate: Date;
  
  if (day < 1) {
    // Edge case: shouldn't happen
    payoutDate = new Date(year, month, 1);
  } else if (day === 1) {
    // Payment on 1st → payout on 15th (same-day rule)
    payoutDate = new Date(year, month, 15);
  } else if (day < 15) {
    // Payment between 2nd-14th → payout on 15th
    payoutDate = new Date(year, month, 15);
  } else if (day === 15) {
    // Payment on 15th → payout on 1st of next month (same-day rule)
    payoutDate = new Date(year, month + 1, 1);
  } else {
    // Payment between 16th-31st → payout on 1st of next month
    payoutDate = new Date(year, month + 1, 1);
  }
  
  return payoutDate;
}

/**
 * Check if a date is a valid payout date (1st or 15th)
 */
export function isPayoutDate(date: Date): boolean {
  const day = date.getDate();
  return day === 1 || day === 15;
}
```

### Commission Eligibility Logic

```typescript
// lib/commissions/eligibility.ts

interface Subscription {
  id: string;
  agentId: string;
  planPrice: number;
  paymentCount: number;
  firstPaymentDate: Date;
  lastPaymentDate: Date;
  monthNumber: number; // Current month of subscription
}

interface CommissionResult {
  eligible: boolean;
  type: 'upfront' | 'recurring' | null;
  amount: number;
  rate: number;
  scheduledPayoutDate: Date | null;
  reason?: string;
}

/**
 * Calculate commission eligibility after a payment
 */
export function calculateCommission(
  subscription: Subscription,
  paymentDate: Date
): CommissionResult {
  const { paymentCount, planPrice, monthNumber } = subscription;
  
  // UPFRONT COMMISSION: After 2nd payment, paid once
  if (paymentCount === 2) {
    return {
      eligible: true,
      type: 'upfront',
      amount: planPrice * 0.50,
      rate: 0.50,
      scheduledPayoutDate: getNextPayoutDate(paymentDate),
    };
  }
  
  // RECURRING COMMISSION: After 3rd payment, ongoing
  if (paymentCount >= 3 && paymentCount <= 14) {
    // Determine rate based on month
    const rate = monthNumber >= 6 ? 0.15 : 0.10;
    
    return {
      eligible: true,
      type: 'recurring',
      amount: planPrice * rate,
      rate,
      scheduledPayoutDate: getNextPayoutDate(paymentDate),
    };
  }
  
  // After month 14, no more recurring commission
  if (paymentCount > 14) {
    return {
      eligible: false,
      type: null,
      amount: 0,
      rate: 0,
      scheduledPayoutDate: null,
      reason: 'Recurring commission ends after month 14',
    };
  }
  
  // Payment 1: No commission yet
  return {
    eligible: false,
    type: null,
    amount: 0,
    rate: 0,
    scheduledPayoutDate: null,
    reason: 'Upfront commission requires 2 payments',
  };
}
```

### Payment Webhook Handler

```typescript
// api/webhooks/payment.ts

import { calculateCommission, getNextPayoutDate } from '@/lib/commissions';

export async function handlePaymentSuccess(payment: PaymentEvent) {
  const { subscriptionId, amount, paymentDate } = payment;
  
  // 1. Update subscription payment count
  const subscription = await db.subscriptions.update({
    where: { id: subscriptionId },
    data: {
      paymentCount: { increment: 1 },
      lastPaymentDate: paymentDate,
    },
  });
  
  // 2. Calculate commission
  const commission = calculateCommission(subscription, new Date(paymentDate));
  
  // 3. Create commission record if eligible
  if (commission.eligible) {
    await db.commissions.create({
      data: {
        subscriptionId,
        agentId: subscription.agentId,
        type: commission.type,
        amount: commission.amount,
        rate: commission.rate,
        triggerPaymentDate: paymentDate,
        scheduledPayoutDate: commission.scheduledPayoutDate,
        payoutStatus: 'pending',
      },
    });
    
    // 4. Log for audit
    await logCommissionCreated({
      subscriptionId,
      agentId: subscription.agentId,
      commissionType: commission.type,
      amount: commission.amount,
      paymentDate,
      payoutDate: commission.scheduledPayoutDate,
    });
  }
}
```

### Payout Job (Runs on 1st and 15th)

```typescript
// jobs/processPayouts.ts

/**
 * Cron job that runs on 1st and 15th of every month
 * Processes all pending commissions scheduled for today
 */
export async function processPayouts() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Verify it's a payout day
  if (!isPayoutDate(today)) {
    console.log('Not a payout date, skipping');
    return;
  }
  
  // Get all pending commissions scheduled for today
  const pendingCommissions = await db.commissions.findMany({
    where: {
      scheduledPayoutDate: today,
      payoutStatus: 'pending',
    },
    include: {
      agent: true,
      subscription: true,
    },
  });
  
  // Group by agent
  const byAgent = groupBy(pendingCommissions, 'agentId');
  
  for (const [agentId, commissions] of Object.entries(byAgent)) {
    const totalAmount = commissions.reduce((sum, c) => sum + c.amount, 0);
    
    // Create payout record
    const payout = await db.payouts.create({
      data: {
        agentId,
        amount: totalAmount,
        commissionIds: commissions.map(c => c.id),
        payoutDate: today,
        status: 'processing',
      },
    });
    
    // Process payment (Stripe, PayPal, etc.)
    try {
      await processAgentPayout(agentId, totalAmount, payout.id);
      
      // Update commission statuses
      await db.commissions.updateMany({
        where: { id: { in: commissions.map(c => c.id) } },
        data: { payoutStatus: 'paid', paidAt: new Date() },
      });
      
      await db.payouts.update({
        where: { id: payout.id },
        data: { status: 'completed' },
      });
    } catch (error) {
      await db.payouts.update({
        where: { id: payout.id },
        data: { status: 'failed', error: error.message },
      });
    }
  }
}
```

---

## PART 3: RETENTION BONUS LOGIC

```typescript
// lib/commissions/retentionBonuses.ts

const RETENTION_BONUSES = {
  month3CheckIn: 15,
  month4Retained: 25,
  month6Retained: 50,
  month12Retained: 100,
};

export async function processRetentionBonus(
  subscription: Subscription,
  paymentDate: Date
): Promise<void> {
  const { monthNumber, agentId, id: subscriptionId } = subscription;
  
  let bonusAmount = 0;
  let bonusType = '';
  
  switch (monthNumber) {
    case 3:
      // Check if agent logged check-in call
      const checkInLogged = await hasCheckInCall(subscriptionId);
      if (checkInLogged) {
        bonusAmount = RETENTION_BONUSES.month3CheckIn;
        bonusType = 'month3_checkin';
      }
      break;
      
    case 4:
      bonusAmount = RETENTION_BONUSES.month4Retained;
      bonusType = 'month4_retained';
      break;
      
    case 6:
      bonusAmount = RETENTION_BONUSES.month6Retained;
      bonusType = 'month6_retained';
      // Also lock in 15% rate
      await lockInFifteenPercentRate(subscriptionId);
      break;
      
    case 12:
      bonusAmount = RETENTION_BONUSES.month12Retained;
      bonusType = 'month12_retained';
      break;
  }
  
  if (bonusAmount > 0) {
    // Retention bonuses paid on 15th of following month
    const payoutDate = new Date(paymentDate);
    payoutDate.setMonth(payoutDate.getMonth() + 1);
    payoutDate.setDate(15);
    
    await db.commissions.create({
      data: {
        subscriptionId,
        agentId,
        type: 'retention_bonus',
        subType: bonusType,
        amount: bonusAmount,
        rate: 0, // Flat bonus, not percentage
        triggerPaymentDate: paymentDate,
        scheduledPayoutDate: payoutDate,
        payoutStatus: 'pending',
      },
    });
  }
}
```

---

## PART 4: 15% RATE LOCK LOGIC

```typescript
// lib/commissions/rateLock.ts

/**
 * Once a customer reaches Month 6, the agent's rate is locked at 15%
 * This rate persists even if the customer upgrades or downgrades
 */

export async function lockInFifteenPercentRate(subscriptionId: string): Promise<void> {
  await db.subscriptions.update({
    where: { id: subscriptionId },
    data: {
      commissionRateLocked: true,
      lockedCommissionRate: 0.15,
      rateLockDate: new Date(),
    },
  });
}

export function getCommissionRate(subscription: Subscription): number {
  // If rate is locked, always use 15%
  if (subscription.commissionRateLocked) {
    return 0.15;
  }
  
  // Otherwise, use month-based rate
  return subscription.monthNumber >= 6 ? 0.15 : 0.10;
}
```

---

## PART 5: UI UPDATES

### Agent Dashboard — Commission View

Update commission display to show:
- Payment schedule (1st and 15th)
- Pending commissions with scheduled payout date
- Commission timeline per customer

```tsx
// components/AgentDashboard/CommissionTimeline.tsx

interface CommissionTimelineProps {
  subscriptionId: string;
}

export function CommissionTimeline({ subscriptionId }: CommissionTimelineProps) {
  const { data: subscription } = useSubscription(subscriptionId);
  const { paymentCount, monthNumber, planPrice } = subscription;
  
  return (
    <div className="commission-timeline">
      <h3>Commission Timeline</h3>
      
      <div className="timeline-item">
        <span className={paymentCount >= 1 ? 'complete' : 'pending'}>
          Payment 1: No commission
        </span>
      </div>
      
      <div className="timeline-item">
        <span className={paymentCount >= 2 ? 'complete' : 'pending'}>
          Payment 2: Upfront commission unlocked (${(planPrice * 0.5).toFixed(2)})
        </span>
      </div>
      
      <div className="timeline-item">
        <span className={paymentCount >= 3 ? 'complete' : 'pending'}>
          Payment 3+: Recurring commission starts (10%)
        </span>
      </div>
      
      <div className="timeline-item">
        <span className={monthNumber >= 6 ? 'complete' : 'pending'}>
          Month 6: Rate increases to 15% (locked in)
        </span>
      </div>
      
      <div className="payout-schedule">
        <p>Payouts processed on the <strong>1st</strong> and <strong>15th</strong> of each month</p>
      </div>
    </div>
  );
}
```

### Admin Panel — Payout Management

```tsx
// components/Admin/PayoutQueue.tsx

export function PayoutQueue() {
  const { data: pendingPayouts } = usePendingPayouts();
  const nextPayoutDate = getNextPayoutDate(new Date());
  
  return (
    <div className="payout-queue">
      <h2>Pending Payouts</h2>
      <p>Next payout date: {format(nextPayoutDate, 'MMMM d, yyyy')}</p>
      
      <table>
        <thead>
          <tr>
            <th>Agent</th>
            <th>Commission Type</th>
            <th>Amount</th>
            <th>Trigger Date</th>
            <th>Scheduled Payout</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {pendingPayouts.map(payout => (
            <tr key={payout.id}>
              <td>{payout.agent.name}</td>
              <td>{payout.type}</td>
              <td>${payout.amount.toFixed(2)}</td>
              <td>{format(payout.triggerPaymentDate, 'MM/dd/yyyy')}</td>
              <td>{format(payout.scheduledPayoutDate, 'MM/dd/yyyy')}</td>
              <td>{payout.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## PART 6: DATABASE MIGRATION

Complete migration script:

```sql
-- Migration: v5.8 to v5.9
-- Run in a transaction

BEGIN;

-- 1. Update plan prices
UPDATE plans SET price = 39.00 WHERE slug = 'leads-captain';
UPDATE plans SET price = 199.00 WHERE slug = 'web-starter';
UPDATE plans SET price = 299.00 WHERE slug = 'web-pro';
UPDATE plans SET price = 499.00 WHERE slug = 'web-growth';
UPDATE plans SET price = 249.00 WHERE slug = 'silver-starter';
UPDATE plans SET price = 349.00 WHERE slug = 'silver-pro';
UPDATE plans SET price = 499.00 WHERE slug = 'silver-growth';
UPDATE plans SET price = 299.00 WHERE slug = 'gold-starter';
UPDATE plans SET price = 598.00 WHERE slug = 'gold-growth';
UPDATE plans SET price = 199.00 WHERE slug = 'local-seo-pro';
UPDATE plans SET price = 249.00 WHERE slug = 'local-seo-growth';

-- 2. Rename Growth to Enterprise
UPDATE plans SET 
  name = REPLACE(name, 'Growth', 'Enterprise'),
  slug = REPLACE(slug, 'growth', 'enterprise')
WHERE name LIKE '%Growth%' OR slug LIKE '%growth%';

-- 3. Add commission tracking columns
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS payment_count INTEGER DEFAULT 0;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS commission_rate_locked BOOLEAN DEFAULT FALSE;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS locked_commission_rate DECIMAL(4,2);
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS rate_lock_date TIMESTAMP;

-- 4. Add payout scheduling columns
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS trigger_payment_date TIMESTAMP;
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS scheduled_payout_date DATE;
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS payout_status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP;

-- 5. Create payouts table if not exists
CREATE TABLE IF NOT EXISTS payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id),
  amount DECIMAL(10,2) NOT NULL,
  commission_ids UUID[] NOT NULL,
  payout_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  error TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 6. Create indexes
CREATE INDEX IF NOT EXISTS idx_commissions_scheduled_payout ON commissions(scheduled_payout_date, payout_status);
CREATE INDEX IF NOT EXISTS idx_payouts_date ON payouts(payout_date, status);

-- 7. Update version
UPDATE system_settings SET value = '5.9' WHERE key = 'pricing_version';
INSERT INTO system_settings (key, value) 
VALUES ('pricing_version', '5.9')
ON CONFLICT (key) DO UPDATE SET value = '5.9';

COMMIT;
```

---

## VERIFICATION CHECKLIST

After implementation:

- [ ] All plan prices updated correctly
- [ ] "Growth" renamed to "Enterprise" everywhere
- [ ] Upfront commission triggers after 2nd payment
- [ ] Recurring commission triggers after 3rd payment
- [ ] Same-day rule prevents payout on payment day
- [ ] Payouts only on 1st and 15th
- [ ] 15% rate lock works at Month 6
- [ ] Retention bonuses trigger correctly
- [ ] Agent dashboard shows correct timeline
- [ ] Admin can view payout queue
- [ ] Existing subscriptions not affected by price changes

---

## ROLLBACK PLAN

If issues arise:

```sql
-- Revert prices to v5.8
UPDATE plans SET price = 29.00 WHERE slug = 'leads-captain';
UPDATE plans SET price = 149.00 WHERE slug = 'web-starter';
-- ... etc

-- Revert tier names
UPDATE plans SET 
  name = REPLACE(name, 'Enterprise', 'Growth'),
  slug = REPLACE(slug, 'enterprise', 'growth')
WHERE name LIKE '%Enterprise%' OR slug LIKE '%enterprise%';

UPDATE system_settings SET value = '5.8' WHERE key = 'pricing_version';
```

---

**Document Version:** 5.9
**Created:** December 2024

---

**End of CRM Update Prompt**