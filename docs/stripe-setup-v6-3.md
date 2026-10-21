# Stripe Setup Guide for v6.3 Pricing Update

This guide outlines the steps to configure your Stripe account for the v6.3 pricing changes.

## 1. Create New Products & Prices in Stripe Dashboard

Go to your [Stripe Dashboard > Products](https://dashboard.stripe.com/products) and create the following:

### A. Blue Starter Plan (Updated)
*   **Product Name:** Blue Starter
*   **Description:** CRM for solo contractors (1 user)
*   **Price 1 (Monthly):** $39.00 USD / month
    *   *Copy this Price ID (e.g., price_1Os...)* -> `STRIPE_PRICE_BLUE_STARTER_MONTHLY`
*   **Price 2 (Annual):** $398.00 USD / year
    *   *Copy this Price ID* -> `STRIPE_PRICE_BLUE_STARTER_ANNUAL`

### B. Blue Pro Plan (Updated)
*   **Product Name:** Blue Pro
*   **Description:** CRM for growing teams (5 users)
*   **Price 1 (Monthly):** $99.00 USD / month
    *   *Copy this Price ID* -> `STRIPE_PRICE_BLUE_PRO_MONTHLY`
*   **Price 2 (Annual):** $1,010.00 USD / year
    *   *Copy this Price ID* -> `STRIPE_PRICE_BLUE_PRO_ANNUAL`

### C. Blue Enterprise Plan (Updated)
*   **Product Name:** Blue Enterprise
*   **Description:** Full CRM for large teams (10 users)
*   **Price 1 (Monthly):** $199.00 USD / month
    *   *Copy this Price ID* -> `STRIPE_PRICE_BLUE_ENTERPRISE_MONTHLY`
*   **Price 2 (Annual):** $2,030.00 USD / year
    *   *Copy this Price ID* -> `STRIPE_PRICE_BLUE_ENTERPRISE_ANNUAL`

### D. Leads Captain Add-on (New)
*   **Product Name:** Leads Captain Add-on
*   **Description:** AI-powered missed call text-back with SMS automation
*   **Price 1 (Monthly):** $49.00 USD / month
    *   *Copy this Price ID* -> `STRIPE_PRICE_LEADS_CAPTAIN_ADDON_MONTHLY`
*   **Price 2 (Annual):** $490.00 USD / year (Optional)
    *   *Copy this Price ID* -> `STRIPE_PRICE_LEADS_CAPTAIN_ADDON_ANNUAL`

### E. Extra User Seat (New)
*   **Product Name:** Extra User Seat
*   **Description:** Additional user license
*   **Pricing Model:** Graduated pricing or Standard pricing
*   **Price:** $10.00 USD / user / month
*   **Usage Type:** Metered (if you want auto-billing) or Licensed (recurring quantity)
    *   *Recommended:* Recurring quantity ($10/mo)
    *   *Copy this Price ID* -> `STRIPE_PRICE_EXTRA_USER_MONTHLY`

---

## 2. Update Environment Variables

Add the following block to your `.env.local` file, replacing the values with the Price IDs you just created:

```bash
# ==========================================
# v6.3 PRICING CONFIGURATION (Jan 2025)
# ==========================================

# Blue Starter ($39/mo)
STRIPE_PRICE_BLUE_STARTER_MONTHLY=price_REPLACE_WITH_YOUR_ID
STRIPE_PRICE_BLUE_STARTER_ANNUAL=price_REPLACE_WITH_YOUR_ID

# Blue Pro ($99/mo)
STRIPE_PRICE_BLUE_PRO_MONTHLY=price_REPLACE_WITH_YOUR_ID
STRIPE_PRICE_BLUE_PRO_ANNUAL=price_REPLACE_WITH_YOUR_ID

# Blue Enterprise ($199/mo)
STRIPE_PRICE_BLUE_ENTERPRISE_MONTHLY=price_REPLACE_WITH_YOUR_ID
STRIPE_PRICE_BLUE_ENTERPRISE_ANNUAL=price_REPLACE_WITH_YOUR_ID

# Leads Captain Add-on ($49/mo)
STRIPE_PRICE_LEADS_CAPTAIN_ADDON_MONTHLY=price_REPLACE_WITH_YOUR_ID
STRIPE_PRICE_LEADS_CAPTAIN_ADDON_ANNUAL=price_REPLACE_WITH_YOUR_ID

# Extra User Seat ($10/mo)
STRIPE_PRICE_EXTRA_USER_MONTHLY=price_REPLACE_WITH_YOUR_ID
```

## 3. Database Migration

Ensure you have run the `112_v63_pricing_update.sql` migration in your Supabase SQL Editor. This sets up the `addon_subscriptions` table required for the add-on logic to work.
