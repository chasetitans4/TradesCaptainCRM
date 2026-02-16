# TradesCaptain CRM v6.1 - Stripe Products Setup Guide

This document lists all Stripe products and prices that need to be created for the v6.1 pricing update.

## Overview

v6.1 introduces:
- **Setup fees** for Web, SEO, and Gold Bundle products
- **New pricing** structure across all product lines
- **Extra location add-ons** for Enterprise plans
- **Updated Leads Captain** pricing ($79/mo)

## Products to Create in Stripe Dashboard

### 1. Gold Bundles (NEW)

Create 3 products with setup (one-time) + recurring prices:

| Product | Setup Price | Monthly Price | Annual Price |
|---------|-------------|---------------|--------------|
| Gold Starter Bundle | $1,999 | $399 | $4,070 |
| Gold Pro Bundle | $3,999 | $649 | $6,620 |
| Gold Enterprise Bundle | $7,999 | $1,499 | $15,290 |

**Stripe Configuration for each:**
- Product Name: `Gold Starter Bundle` (etc.)
- Create 2 prices per product:
  1. One-time price for setup fee
  2. Recurring monthly price
  3. (Optional) Recurring annual price

### 2. Website Plans (UPDATED)

Update existing or create new products:

| Product | Setup Price | Monthly Price | Annual Price |
|---------|-------------|---------------|--------------|
| Web Starter | $2,500 | $49 | $500 |
| Web Pro | $5,000 | $79 | $806 |
| Web Enterprise | $10,000 | $99 | $1,010 |
| Web Extra Location | $5,000 | $99 | - |

### 3. SEO/AEO Plans (UPDATED)

| Product | Setup Price | Monthly Price | Annual Price |
|---------|-------------|---------------|--------------|
| SEO Starter | $100 | $300 | $3,060 |
| SEO Pro | $250 | $500 | $5,100 |
| SEO Enterprise | $500 | $1,500 | $15,300 |
| SEO Extra Location | $0 | $750 | - |

### 4. Leads Captain (UPDATED)

| Product | Setup Price | Monthly Price | Annual Price |
|---------|-------------|---------------|--------------|
| Leads Captain | $0 | $79 | $806 |

### 5. CRM Plans (NO CHANGES)

Existing Blue/CRM prices can remain as-is:

| Product | Monthly Price | Annual Price |
|---------|---------------|--------------|
| CRM Starter | $39 | $398 |
| CRM Pro | $99 | $1,010 |
| CRM Enterprise | $199 | $2,030 |

## Environment Variables

After creating products in Stripe, update `.env` with the new price IDs:

```env
# Gold Bundles
STRIPE_PRICE_GOLD_STARTER_SETUP=price_xxx
STRIPE_PRICE_GOLD_STARTER_MONTHLY=price_xxx
STRIPE_PRICE_GOLD_PRO_SETUP=price_xxx
STRIPE_PRICE_GOLD_PRO_MONTHLY=price_xxx
STRIPE_PRICE_GOLD_ENTERPRISE_SETUP=price_xxx
STRIPE_PRICE_GOLD_ENTERPRISE_MONTHLY=price_xxx

# Web Plans
STRIPE_PRICE_WEB_STARTER_SETUP=price_xxx
STRIPE_PRICE_WEB_STARTER_MONTHLY=price_xxx
STRIPE_PRICE_WEB_PRO_SETUP=price_xxx
STRIPE_PRICE_WEB_PRO_MONTHLY=price_xxx
STRIPE_PRICE_WEB_ENTERPRISE_SETUP=price_xxx
STRIPE_PRICE_WEB_ENTERPRISE_MONTHLY=price_xxx
STRIPE_PRICE_WEB_EXTRA_LOCATION_SETUP=price_xxx
STRIPE_PRICE_WEB_EXTRA_LOCATION_MONTHLY=price_xxx

# SEO Plans
STRIPE_PRICE_SEO_STARTER_SETUP=price_xxx
STRIPE_PRICE_SEO_STARTER_MONTHLY=price_xxx
STRIPE_PRICE_SEO_PRO_SETUP=price_xxx
STRIPE_PRICE_SEO_PRO_MONTHLY=price_xxx
STRIPE_PRICE_SEO_ENTERPRISE_SETUP=price_xxx
STRIPE_PRICE_SEO_ENTERPRISE_MONTHLY=price_xxx
STRIPE_PRICE_SEO_EXTRA_LOCATION_MONTHLY=price_xxx

# Leads Captain
STRIPE_PRICE_LEADSCAPTAIN_MONTHLY=price_xxx
```

## Checkout Flow Changes

For products with setup fees, the checkout should:

1. **Create a Stripe Checkout Session** with multiple line items:
   - Setup fee (one-time price)
   - Monthly subscription (recurring price)

2. **Example code:**
```typescript
const session = await stripe.checkout.sessions.create({
  mode: 'subscription',
  line_items: [
    {
      price: STRIPE_PRICE_GOLD_STARTER_SETUP, // one-time
      quantity: 1,
    },
    {
      price: STRIPE_PRICE_GOLD_STARTER_MONTHLY, // recurring
      quantity: 1,
    },
  ],
  // ... other options
});
```

## Commission Rates Reference

| Product Type | Upfront Rate | Recurring Rate |
|--------------|--------------|----------------|
| CRM Products | 50% | 15% |
| All Other Products | 40% | 15% |

**Upfront Commission** = (Setup Fee + First Month) * Rate
**Recurring Commission** = Monthly Price * 15%

## Database Migration

Run the migration to add bundle tracking:

```bash
supabase db push
# or
psql -f supabase/migrations/121_v61_pricing_update.sql
```

## Testing Checklist

- [ ] Create all Stripe products/prices in test mode
- [ ] Update .env with test price IDs
- [ ] Test Gold Bundle checkout flow
- [ ] Test Web plan with setup fee checkout
- [ ] Test SEO plan with setup fee checkout
- [ ] Verify commission calculations
- [ ] Test extra location add-ons
- [ ] Run database migration
- [ ] Verify webhook handling for setup + recurring payments

## Notes

- Existing customers on legacy plans (Silver, old Gold) will continue on their current pricing
- New signups will use v6.1 pricing structure
- CRM plans have no setup fees (unchanged from v6.0)
- Extra locations require Enterprise tier (Web or Gold Enterprise)
