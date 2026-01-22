# TradesCaptain CRM Update — v6.3

**Date:** January 2025
**Version:** 6.3
**Changes:** Blue Starter $39, Blue Pro 5 users, Leads Captain $49 add-on, Extra Users $10/mo

---

## OVERVIEW

This update implements:
1. Blue Starter price reduced to $39/mo
2. Blue Pro users increased to 5 included
3. Leads Captain as $49/mo add-on (not included in any plan)
4. Extra User add-on at $10/mo for Pro and Enterprise
5. SMS allocation based on CRM tier when LC is added

---

## FINAL PRODUCT STRUCTURE

### Blue CRM

| Plan | Monthly | Annual | Users | Extra Users | SMS w/LC |
|------|---------|--------|-------|-------------|----------|
| Blue Starter | $39 | $398 | 1 | — | 1,000 |
| Blue Pro | $99 | $1,010 | 5 | +$10/mo | 2,000 |
| Blue Enterprise | $199 | $2,030 | 10 | +$10/mo | 3,000 |

### Add-Ons

| Add-On | Price | Annual | Requires |
|--------|-------|--------|----------|
| Leads Captain | $49/mo | $500/yr | Any Blue CRM |
| Extra User | $10/mo | $102/yr | Blue Pro or Enterprise |

---

## PART 1: DATABASE CHANGES

### 1.1 Update Blue CRM Products
```sql
-- Update Blue Starter
UPDATE products SET 
  price = 39,
  annual_price = 398,
  included_users = 1,
  allows_extra_users = false
WHERE slug = 'blue-starter';

-- Update Blue Pro
UPDATE products SET 
  price = 99,
  annual_price = 1010,
  included_users = 5,
  allows_extra_users = true,
  extra_user_price = 10
WHERE slug = 'blue-pro';

-- Update Blue Enterprise
UPDATE products SET 
  price = 199,
  annual_price = 2030,
  included_users = 10,
  allows_extra_users = true,
  extra_user_price = 10
WHERE slug = 'blue-enterprise';

-- Remove any "includes Leads Captain" flags
UPDATE products SET 
  includes_leads_captain = false
WHERE slug IN ('blue-pro', 'blue-enterprise');
```

### 1.2 Create Add-On Products
```sql
-- Create Leads Captain add-on
INSERT INTO products (slug, name, price, annual_price, product_type, requires_product_category)
VALUES ('leads-captain', 'Leads Captain', 49, 500, 'addon', 'blue-crm')
ON CONFLICT (slug) DO UPDATE SET 
  price = 49, 
  annual_price = 500,
  product_type = 'addon';

-- Create Extra User add-on
INSERT INTO products (slug, name, price, annual_price, product_type, available_for)
VALUES ('extra-user', 'Additional User', 10, 102, 'addon', ARRAY['blue-pro', 'blue-enterprise'])
ON CONFLICT (slug) DO UPDATE SET 
  price = 10,
  annual_price = 102;
```

### 1.3 SMS Allocation Table
```sql
-- SMS limits based on CRM tier (only applies when LC is active)
CREATE TABLE IF NOT EXISTS leads_captain_sms_limits (
  crm_tier VARCHAR(50) PRIMARY KEY,
  sms_monthly_limit INT NOT NULL
);

INSERT INTO leads_captain_sms_limits (crm_tier, sms_monthly_limit) VALUES
  ('blue-starter', 1000),
  ('blue-pro', 2000),
  ('blue-enterprise', 3000)
ON CONFLICT (crm_tier) DO UPDATE SET 
  sms_monthly_limit = EXCLUDED.sms_monthly_limit;
```

---

## PART 2: BACKEND CODE CHANGES

### 2.1 Product Constants
```typescript
// constants/products.ts
export const PRODUCTS = {
  BLUE_STARTER: { 
    slug: 'blue-starter', 
    price: 39, 
    annual: 398, 
    includedUsers: 1,
    allowsExtraUsers: false 
  },
  BLUE_PRO: { 
    slug: 'blue-pro', 
    price: 99, 
    annual: 1010, 
    includedUsers: 5,
    allowsExtraUsers: true,
    extraUserPrice: 10 
  },
  BLUE_ENTERPRISE: { 
    slug: 'blue-enterprise', 
    price: 199, 
    annual: 2030, 
    includedUsers: 10,
    allowsExtraUsers: true,
    extraUserPrice: 10 
  },
  LEADS_CAPTAIN: { 
    slug: 'leads-captain', 
    price: 49, 
    annual: 500, 
    type: 'addon',
    requires: 'blue-crm' 
  },
  EXTRA_USER: {
    slug: 'extra-user',
    price: 10,
    annual: 102,
    type: 'addon',
    availableFor: ['blue-pro', 'blue-enterprise']
  },
  // Web and SEO products unchanged...
};

export const SMS_LIMITS = {
  'blue-starter': 1000,
  'blue-pro': 2000,
  'blue-enterprise': 3000,
};
```

### 2.2 Checkout Validation
```typescript
// services/checkout.service.ts
function validateCart(cart: CartItem[]): ValidationResult {
  const hasLeadsCaptain = cart.some(i => i.slug === 'leads-captain');
  const hasBlueCRM = cart.some(i => i.slug.startsWith('blue-'));
  const hasExtraUsers = cart.some(i => i.slug === 'extra-user');
  const crmPlan = cart.find(i => i.slug.startsWith('blue-'))?.slug;
  
  // Leads Captain requires CRM
  if (hasLeadsCaptain && !hasBlueCRM) {
    return { valid: false, error: 'Leads Captain requires a Blue CRM plan' };
  }
  
  // Extra users only for Pro/Enterprise
  if (hasExtraUsers && crmPlan === 'blue-starter') {
    return { valid: false, error: 'Additional users require Blue Pro or Enterprise' };
  }
  
  return { valid: true };
}
```

### 2.3 User Management
```typescript
// services/user.service.ts
function getUserLimit(subscription: Subscription): number {
  const included = {
    'blue-starter': 1,
    'blue-pro': 5,
    'blue-enterprise': 10
  };
  const base = included[subscription.plan] || 1;
  const extra = subscription.extraUsers || 0;
  return base + extra;
}

function canAddUsers(plan: string): boolean {
  return ['blue-pro', 'blue-enterprise'].includes(plan);
}

function getExtraUserCost(plan: string, count: number): number {
  if (!canAddUsers(plan)) return 0;
  return count * 10;
}
```

### 2.4 SMS Allocation
```typescript
// services/sms.service.ts
function getSmsLimit(subscription: Subscription): number {
  // No LC = no SMS
  if (!subscription.addons?.includes('leads-captain')) {
    return 0;
  }
  
  const limits = {
    'blue-starter': 1000,
    'blue-pro': 2000,
    'blue-enterprise': 3000
  };
  
  return limits[subscription.crmPlan] || 0;
}
```

### 2.5 Commission Calculation
```typescript
// services/commission.service.ts
function calculateCommission(sale: Sale): CommissionResult {
  const UPFRONT_RATE = 0.50;
  const RECURRING_RATE = 0.10;
  const ANNUAL_RATE = 0.35;
  
  let totalMonthly = 0;
  
  // Base CRM
  totalMonthly += sale.crmPrice;
  
  // Leads Captain add-on
  if (sale.hasLeadsCaptain) {
    totalMonthly += 49;
  }
  
  // Extra users
  if (sale.extraUsers > 0) {
    totalMonthly += sale.extraUsers * 10;
  }
  
  // Other products (Web, SEO)
  totalMonthly += sale.otherProducts.reduce((sum, p) => sum + p.price, 0);
  
  if (sale.isAnnual) {
    const annualTotal = totalMonthly * 12 * 0.85; // 15% discount
    return {
      upfront: annualTotal * ANNUAL_RATE,
      recurring: 0,
      type: 'annual'
    };
  }
  
  return {
    upfront: totalMonthly * UPFRONT_RATE,
    recurring: totalMonthly * RECURRING_RATE,
    type: 'monthly'
  };
}
```

---

## PART 3: UI/FRONTEND CHANGES

### 3.1 Pricing Page Structure
```
┌─────────────────────────────────────────────────────────┐
│                      BLUE CRM                           │
├─────────────┬─────────────────┬─────────────────────────┤
│   Starter   │      Pro        │    Enterprise           │
│   $39/mo    │    $99/mo       │    $199/mo              │
│   1 user    │    5 users      │    10 users             │
│             │   +$10/mo extra │    +$10/mo extra        │
└─────────────┴─────────────────┴─────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│              LEADS CAPTAIN ADD-ON                       │
│                    $49/mo                               │
│         AI-powered missed call text-back                │
│                                                         │
│  SMS Allocation:                                        │
│  • With Starter: 1,000/mo                               │
│  • With Pro: 2,000/mo                                   │
│  • With Enterprise: 3,000/mo                            │
│                                                         │
│  ⚠️ Requires Blue CRM subscription                      │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                        WEB                              │
├─────────────┬─────────────────┬─────────────────────────┤
│   $199/mo   │    $299/mo      │    $499/mo              │
└─────────────┴─────────────────┴─────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                      SEO/AEO                            │
├─────────────┬─────────────────┬─────────────────────────┤
│   $99/mo    │    $199/mo      │    $299/mo              │
└─────────────┴─────────────────┴─────────────────────────┘
```

### 3.2 CRM Plan Features Update
```typescript
// Blue Starter features
const STARTER_FEATURES = [
  'Contact & Lead Management',
  'Calendar & Booking',
  'Job Tracking',
  'Quotes & Invoicing',
  '1 User',
];

// Blue Pro features
const PRO_FEATURES = [
  'Everything in Starter',
  '5 Users Included',
  '+$10/mo per additional user',
  'Review Requests',
  'Workflow Automations',
];

// Blue Enterprise features
const ENTERPRISE_FEATURES = [
  'Everything in Pro',
  '10 Users Included',
  '+$10/mo per additional user',
  'Team Management',
  'Priority Support',
];
```

### 3.3 Checkout Flow Updates
```typescript
// Add user selector for Pro/Enterprise
interface CheckoutState {
  selectedPlan: string;
  extraUsers: number;
  hasLeadsCaptain: boolean;
  // ...
}

// Calculate total
function calculateTotal(state: CheckoutState): number {
  let total = PRODUCTS[state.selectedPlan].price;
  
  if (state.extraUsers > 0 && canAddUsers(state.selectedPlan)) {
    total += state.extraUsers * 10;
  }
  
  if (state.hasLeadsCaptain) {
    total += 49;
  }
  
  return total;
}
```

---

## PART 4: STRIPE CONFIGURATION

### 4.1 Create/Update Stripe Prices
```javascript
// Blue Starter
stripe.prices.create({
  product: 'prod_blue_starter',
  unit_amount: 3900, // $39.00
  currency: 'usd',
  recurring: { interval: 'month' },
  lookup_key: 'blue_starter_monthly'
});

// Leads Captain
stripe.prices.create({
  product: 'prod_leads_captain',
  unit_amount: 4900, // $49.00
  currency: 'usd',
  recurring: { interval: 'month' },
  lookup_key: 'leads_captain_monthly'
});

// Extra User
stripe.prices.create({
  product: 'prod_extra_user',
  unit_amount: 1000, // $10.00
  currency: 'usd',
  recurring: { interval: 'month' },
  lookup_key: 'extra_user_monthly'
});
```

### 4.2 Subscription Items

For customers with add-ons, create subscription with multiple items:
```javascript
stripe.subscriptions.create({
  customer: customerId,
  items: [
    { price: 'price_blue_pro_monthly' },
    { price: 'price_leads_captain_monthly' },
    { price: 'price_extra_user_monthly', quantity: 3 }, // 3 extra users
  ],
});
```

---

## PART 5: TESTING CHECKLIST

### Pricing
- [ ] Blue Starter shows $39/mo
- [ ] Blue Pro shows $99/mo with 5 users
- [ ] Blue Enterprise shows $199/mo with 10 users
- [ ] Leads Captain shows $49/mo as add-on
- [ ] Extra User shows $10/mo

### Checkout
- [ ] Cannot purchase LC without CRM
- [ ] Cannot add extra users to Starter
- [ ] Can add extra users to Pro/Enterprise
- [ ] Total calculates correctly with add-ons

### Users
- [ ] Starter limited to 1 user
- [ ] Pro allows 5 + unlimited extra
- [ ] Enterprise allows 10 + unlimited extra

### SMS
- [ ] No SMS without LC
- [ ] Starter + LC = 1,000 SMS
- [ ] Pro + LC = 2,000 SMS
- [ ] Enterprise + LC = 3,000 SMS

### Commission
- [ ] Blue Starter: $19.50 upfront, $3.90 recurring
- [ ] Leads Captain: $24.50 upfront, $4.90 recurring
- [ ] Extra User: $5.00 upfront, $1.00 recurring

---

**Document Version:** 6.3
**Last Updated:** January 2025