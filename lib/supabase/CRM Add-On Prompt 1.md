# TradesCaptain CRM/Admin Portal Update Prompt — v5

## Overview

Update the TradesCaptain CRM (BlueHQ) and Admin Portal to reflect the v5 pricing structure, new Local SEO plans, updated Gold plan pricing, and removal of link building services. This update affects billing, invoicing, client management, sales rep commissions, and plan configurations.

---

## CRITICAL CHANGES SUMMARY

### 1. Gold Plans — Price Increase (+$50) + Local SEO Included
All Gold plans now include the corresponding Local SEO tier. GBP management is included (not an add-on).

### 2. New Product Track: Local SEO Plans
Standalone SEO services for businesses with existing websites.

### 3. Link Building Services — REMOVED
We do NOT offer link building. Remove all references.

### 4. GBP Add-On — Web Plans Only
$99 one-time GBP setup is only available for Web plans. It's included FREE in Gold and Local SEO plans.

### 5. Discount/Offer System — Pre-Defined Offers Only
Agents CANNOT modify prices. They can only apply pre-defined offers that managers control:
- **FIRST50** — First month 50% off (any plan, no approval)
- **ANNUAL25** — Annual 25% off (standard, no approval)
- **WAIVE99** — Waive $99 GBP fee (Web plans only, no approval)
- **FREETRIAL14** — 14-day free trial (Blue & Gold plans, no approval)
- **VIP20** — 20% off monthly ongoing (any plan, MANAGER APPROVAL REQUIRED)

Managers can turn offers on/off at any time.

---

## DATABASE / PLAN CONFIGURATION UPDATES

### Update Existing Gold Plans

```
GOLD PLANS - UPDATE PRICING AND FEATURES

| Plan ID | Plan Name | OLD Price | NEW Price | OLD Annual | NEW Annual |
|---------|-----------|-----------|-----------|------------|------------|
| gold_starter | Gold Starter | $199/mo | $249/mo | $1,791/yr | $2,241/yr |
| gold_pro | Gold Pro | $349/mo | $399/mo | $3,141/yr | $3,591/yr |
| gold_enterprise | Gold Enterprise | $499/mo | $549/mo | $4,491/yr | $4,941/yr |
| gold_starter_teams | Gold Starter Teams | $299/mo | $349/mo | $2,691/yr | $3,141/yr |
| gold_pro_teams | Gold Pro Teams | $449/mo | $499/mo | $4,041/yr | $4,491/yr |
| gold_enterprise_teams | Gold Enterprise Teams | $749/mo | $799/mo | $6,741/yr | $7,191/yr |

ADD NEW FIELD TO GOLD PLANS:
- includes_local_seo: true
- local_seo_tier: "starter" | "pro" | "enterprise" (match to plan tier)
- includes_gbp: true
- gbp_addon_available: false (already included)
```

### Add New Local SEO Plans

```
CREATE NEW PLANS - LOCAL SEO TRACK

| Plan ID | Plan Name | Monthly | Annual | Website Pages | Features |
|---------|-----------|---------|--------|---------------|----------|
| seo_starter | Local SEO Starter | $99 | $891 | 1-5 pages | GBP setup/mgmt, 20 citations, basic on-site optimization |
| seo_pro | Local SEO Pro | $149 | $1,341 | 5-10 pages | GBP mgmt, 50 citations, review templates, competitor tracking |
| seo_enterprise | Local SEO Enterprise | $199 | $1,791 | 10-15 pages | Full GBP, 100+ citations, review management, weekly reports |

PLAN ATTRIBUTES:
- track: "seo"
- includes_gbp: true
- includes_website: false
- includes_crm: false
- gbp_addon_available: false (already included)
- requires_existing_website: true
```

### Update Web Plans — GBP Add-On Only

```
WEB PLANS - UPDATE ATTRIBUTES

| Plan ID | gbp_addon_available | includes_gbp |
|---------|---------------------|--------------|
| web_starter | true | false |
| web_pro | true | false |
| web_enterprise | true | false |
| web_custom | true | false |

GBP Add-On Configuration:
- addon_id: "gbp_setup"
- price: $99 (one-time)
- billing_type: "one_time"
- available_for: ["web_starter", "web_pro", "web_enterprise", "web_custom"]
- NOT available_for: ["gold_*", "seo_*", "blue_*"]
```

### Update Blue Plans — No Changes to Pricing

```
BLUE PLANS - FULL REFERENCE

| Plan ID | Plan Name | Monthly | Annual | Users | Type |
|---------|-----------|---------|--------|-------|------|
| blue_starter | Blue Starter | $49 | $441 | 1 | Individual |
| blue_pro | Blue Pro | $99 | $891 | 1 | Individual |
| blue_enterprise | Blue Enterprise | $199 | $1,791 | 1 | Individual |
| blue_starter_teams | Blue Starter Teams | $149 | $1,341 | 5 | Teams |
| blue_pro_teams | Blue Pro Teams | $199 | $1,791 | 10 | Teams |
| blue_enterprise_teams | Blue Enterprise Teams | $399 | $3,591 | 20 | Teams |

BLUE PLAN ATTRIBUTES:
| Plan ID | includes_gbp | gbp_addon_available | includes_website | includes_seo |
|---------|--------------|---------------------|------------------|--------------|
| blue_starter | false | false | false | false |
| blue_pro | false | false | false | false |
| blue_enterprise | false | false | false | false |
| blue_starter_teams | false | false | false | false |
| blue_pro_teams | false | false | false | false |
| blue_enterprise_teams | false | false | false | false |

Blue plans are CRM ONLY. No GBP, no website, no SEO.
```

### Update Web Plans — No Changes to Pricing

```
WEB PLANS - FULL REFERENCE

| Plan ID | Plan Name | Monthly | Annual | Pages | Type |
|---------|-----------|---------|--------|-------|------|
| web_starter | Web Starter | $149 | $1,341 | 1-5 | Semi-Custom |
| web_pro | Web Pro | $249 | $2,241 | 5-10 | Semi-Custom |
| web_enterprise | Web Enterprise | $349 | $3,141 | 10-15 | Semi-Custom |
| web_custom | Web Full Custom | Quote | Quote | 15+ | Full Custom |

WEB PLAN ATTRIBUTES:
| Plan ID | includes_gbp | gbp_addon_available | includes_crm | includes_seo |
|---------|--------------|---------------------|--------------|--------------|
| web_starter | false | true | false | false |
| web_pro | false | true | false | false |
| web_enterprise | false | true | false | false |
| web_custom | false | true | false | false |

Web plans include ON-PAGE SEO only (meta tags, schema, etc).
Web plans do NOT include GBP management, citations, or Local SEO.
GBP Setup ($99 one-time) is available as an add-on for Web plans only.
```

---

## BILLING / INVOICING UPDATES

### Invoice Line Items — Update Descriptions

```
GOLD PLAN INVOICE DESCRIPTIONS:

Gold Starter ($249/mo):
- "Gold Starter — Website + CRM + Local SEO Starter"
- "Includes: 1-5 page website, BlueHQ CRM (1 user), AI SMS, GBP management, 20 citations"

Gold Pro ($399/mo):
- "Gold Pro — Website + CRM + Local SEO Pro"
- "Includes: 5-10 page website, BlueHQ CRM (1 user), AI SMS, GBP management, 50 citations, competitor tracking"

Gold Enterprise ($549/mo):
- "Gold Enterprise — Website + CRM + Local SEO Enterprise"
- "Includes: 10-15 page website, BlueHQ CRM (1 user), AI SMS, full GBP management, 100+ citations, review management"

Gold Starter Teams ($349/mo):
- "Gold Starter Teams — Website + CRM (5 users) + Local SEO Starter"

Gold Pro Teams ($499/mo):
- "Gold Pro Teams — Website + CRM (10 users) + Local SEO Pro"

Gold Enterprise Teams ($799/mo):
- "Gold Enterprise Teams — Website + CRM (20 users) + Local SEO Enterprise"
```

```
LOCAL SEO PLAN INVOICE DESCRIPTIONS:

Local SEO Starter ($99/mo):
- "Local SEO Starter — For websites with 1-5 pages"
- "Includes: GBP setup & management, 20 citations, on-site optimization, monthly ranking report"

Local SEO Pro ($149/mo):
- "Local SEO Pro — For websites with 5-10 pages"
- "Includes: GBP management, 50 citations, review response templates, bi-weekly ranking updates, competitor tracking"

Local SEO Enterprise ($199/mo):
- "Local SEO Enterprise — For websites with 10-15 pages"
- "Includes: Full GBP management, 100+ citations, review management, weekly ranking updates"
```

```
GBP ADD-ON INVOICE DESCRIPTION:

GBP Setup/Optimization ($99 one-time):
- "Google Business Profile Setup & Optimization"
- "One-time setup: GBP creation/claim, profile optimization, description, categories, initial photos, first 2 posts"
- Billing: One-time, charged with first month's payment
```

### Subscription Management Updates

```
WHEN CREATING NEW SUBSCRIPTION:

1. If plan is Gold tier:
   - Automatically include Local SEO services at matching tier
   - Set includes_gbp = true
   - Do NOT show GBP add-on option
   - Display: "GBP Management: Included ✓"

2. If plan is Local SEO tier:
   - Set includes_gbp = true
   - Do NOT show GBP add-on option
   - Require client to provide existing website URL
   - Display: "GBP Management: Included ✓"

3. If plan is Web tier:
   - Set includes_gbp = false (unless add-on purchased)
   - Show GBP add-on option ($99 one-time)
   - If add-on selected, add to first invoice

4. If plan is Blue tier:
   - Set includes_gbp = false
   - Do NOT show GBP add-on option (not available)
```

### Proration Logic for Existing Customers

```
EXISTING GOLD CUSTOMERS - PRICE INCREASE HANDLING:

Option A: Grandfather existing customers at old price
- Flag: is_grandfathered = true
- Keep existing monthly rate until renewal
- Apply new rate on next annual renewal or after notice period

Option B: Apply new pricing with notice
- Send 30-day notice email
- Update price effective [date + 30 days]
- Log price change in customer history

RECOMMENDATION: Grandfather existing customers, apply new pricing to new sign-ups only.
```

---

## COMMISSION TRACKING UPDATES

### Update Commission Rates — Gold Plans

```
GOLD PLAN COMMISSIONS (Monthly):

| Plan | Price | Upfront (after M2) | Recurring (M3-14) | Max Recurring | Max + Retention |
|------|-------|--------------------|--------------------|---------------|-----------------|
| Gold Starter | $249 | $125 | $24.90/mo | $298.80 | $613.80 |
| Gold Pro | $399 | $200 | $39.90/mo | $478.80 | $868.80 |
| Gold Enterprise | $549 | $275 | $54.90/mo | $658.80 | $1,123.80 |
| Gold Starter Teams | $349 | $175 | $34.90/mo | $418.80 | $783.80 |
| Gold Pro Teams | $499 | $250 | $49.90/mo | $598.80 | $1,038.80 |
| Gold Enterprise Teams | $799 | $400 | $79.90/mo | $958.80 | $1,548.80 |

GOLD PLAN COMMISSIONS (Annual - 35% one-time):

| Plan | Annual Price | Commission (35%) |
|------|--------------|------------------|
| Gold Starter | $2,241 | $784 |
| Gold Pro | $3,591 | $1,257 |
| Gold Enterprise | $4,941 | $1,729 |
| Gold Starter Teams | $3,141 | $1,099 |
| Gold Pro Teams | $4,491 | $1,572 |
| Gold Enterprise Teams | $7,191 | $2,517 |
```

### Commission Rates — Blue Plans

```
BLUE PLAN COMMISSIONS (Monthly):

| Plan | Price | Upfront (after M2) | Recurring (M3-14) | Max Recurring | Max + Retention |
|------|-------|--------------------|--------------------|---------------|-----------------|
| Blue Starter | $49 | $25 | $4.90/mo | $58.80 | $273.80 |
| Blue Pro | $99 | $50 | $9.90/mo | $118.80 | $358.80 |
| Blue Enterprise | $199 | $100 | $19.90/mo | $238.80 | $528.80 |
| Blue Starter Teams | $149 | $75 | $14.90/mo | $178.80 | $443.80 |
| Blue Pro Teams | $199 | $100 | $19.90/mo | $238.80 | $528.80 |
| Blue Enterprise Teams | $399 | $200 | $39.90/mo | $478.80 | $868.80 |

BLUE PLAN COMMISSIONS (Annual - 35% one-time):

| Plan | Annual Price | Commission (35%) |
|------|--------------|------------------|
| Blue Starter | $441 | $154 |
| Blue Pro | $891 | $312 |
| Blue Enterprise | $1,791 | $627 |
| Blue Starter Teams | $1,341 | $469 |
| Blue Pro Teams | $1,791 | $627 |
| Blue Enterprise Teams | $3,591 | $1,257 |
```

### Commission Rates — Web Plans

```
WEB PLAN COMMISSIONS (Monthly):

| Plan | Price | Upfront (after M2) | Recurring (M3-14) | Max Recurring | Max + Retention |
|------|-------|--------------------|--------------------|---------------|-----------------|
| Web Starter | $149 | $75 | $14.90/mo | $178.80 | $443.80 |
| Web Pro | $249 | $125 | $24.90/mo | $298.80 | $613.80 |
| Web Enterprise | $349 | $175 | $34.90/mo | $418.80 | $783.80 |

WEB PLAN COMMISSIONS (Annual - 35% one-time):

| Plan | Annual Price | Commission (35%) |
|------|--------------|------------------|
| Web Starter | $1,341 | $469 |
| Web Pro | $2,241 | $784 |
| Web Enterprise | $3,141 | $1,099 |
```

### Add Commission Rates — Local SEO Plans

```
LOCAL SEO PLAN COMMISSIONS (Monthly):

| Plan | Price | Upfront (after M2) | Recurring (M3-14) | Max Recurring | Max + Retention |
|------|-------|--------------------|--------------------|---------------|-----------------|
| Local SEO Starter | $99 | $50 | $9.90/mo | $118.80 | $358.80 |
| Local SEO Pro | $149 | $75 | $14.90/mo | $178.80 | $443.80 |
| Local SEO Enterprise | $199 | $100 | $19.90/mo | $238.80 | $528.80 |

LOCAL SEO PLAN COMMISSIONS (Annual - 35% one-time):

| Plan | Annual Price | Commission (35%) |
|------|--------------|------------------|
| Local SEO Starter | $891 | $312 |
| Local SEO Pro | $1,341 | $469 |
| Local SEO Enterprise | $1,791 | $627 |
```

### Add Commission — GBP Add-On

```
GBP ADD-ON COMMISSION:

| Add-On | Price | Commission |
|--------|-------|------------|
| GBP Setup/Optimization | $99 one-time | $35 flat |

- Paid when customer's payment clears
- One-time only (no recurring)
- Only available with Web plans
```

### Commission — Extra Location Add-On

```
EXTRA LOCATION COMMISSION:

| Billing | Price | Upfront | Recurring | Max + Retention |
|---------|-------|---------|-----------|-----------------|
| Monthly | $199/mo | $100 | $19.90/mo × 12 = $238.80 | $528.80 |
| Annual | $1,791/yr | $627 (35%) | — | $627 |

- Add-ons sold at initial sale or within 12 months credited to original agent
- Extra Location follows same commission structure as plans
```

### Commission — Upgrades and Downgrades

```
UPGRADE COMMISSION (within 12 months of original sale):

When customer upgrades to higher-priced plan:
- Agent receives commission on PRICE DIFFERENCE only
- Upfront: 50% of monthly price difference
- Recurring: 10% of price difference for remaining months (up to original Month 14 cap)

Example: Customer upgrades Gold Pro ($399) to Gold Pro Teams ($499) in Month 4:
- Price difference: $100/mo
- Upfront on difference: $50
- Recurring on difference: $10/mo for Months 5-14 (10 months) = $100
- Total upgrade commission: $150


DOWNGRADE HANDLING:

When customer downgrades to lower-priced plan:
- NO clawback of previously paid commissions
- Future recurring based on NEW (lower) price
- Retention bonuses still apply at original milestones


CUSTOMER REACTIVATION:

If customer cancels and returns:
- Within 60 days: Original agent retains customer, recurring resumes
- After 60 days: Treated as new sale (customer data is deleted after 60 days)
```

### Commission — Custom/Quote Plans

```
CUSTOM PLAN COMMISSION:

For Gold Custom or Web Custom with quoted pricing:
- Upfront: 50% of first month's quoted price
- Recurring: 10% of monthly quoted price for Months 3-14
- Annual: 35% of annual quoted price (one-time)

Custom quotes require manager approval before presenting to customer.
```

### Commission — Referral Bonus

```
REFERRAL BONUS:

When an existing customer refers a new customer who signs up:
- Agent receives $50 one-time referral bonus
- Bonus is IN ADDITION to normal commission on the new sale
- Requirements:
  - Referring customer must be active (not cancelled)
  - New customer must complete their 2nd payment
  - Referral must be documented in CRM at time of sale

Example: Agent closes a Gold Pro ($399/mo) from a referral
- Normal commission: $200 upfront + recurring + retention = up to $868.80
- Referral bonus: $50
- Total potential: $918.80
```

### Data Retention Policy

```
CUSTOMER DATA RETENTION:

Active customers: All data retained indefinitely
Cancelled customers: Data retained for 60 days, then PERMANENTLY DELETED

AUTOMATED DELETION PROCESS:
- Day 0: Customer cancels → status set to "cancelled"
- Day 30: Reminder email sent to customer about pending deletion
- Day 53: Final warning email sent (7 days before deletion)
- Day 60: All customer data permanently deleted
  - CRM records
  - Lead/contact information
  - Communication history
  - Website files
  - Analytics data

REACTIVATION:
- Within 60 days: Data restored, treated as returning customer
- After 60 days: Must start fresh as new customer (new sale)

This policy must be clearly stated in the Client Services Agreement.
```

### Lead Sources

```
LEAD SOURCE TRACKING:

Agents can acquire customers through:

COMPANY-PROVIDED LEADS:
- Leads provided at Company's discretion
- Remain Company property
- Must follow up within 24 hours
- Same commission as self-sourced

SELF-SOURCED LEADS:
- Personal networking
- Referrals from existing customers
- Cold outreach (calls, emails)
- Social media prospecting
- NOT ALLOWED: Purchased lead lists, spam, unsolicited bulk messaging

REFERRAL TRACKING:
- If lead came from existing customer referral, mark in CRM
- Triggers $50 referral bonus when sale closes
- Referring customer must be active
```

---

## ADMIN PORTAL UI UPDATES

### Plan Selection Dropdown — Add Local SEO Track

```
PLAN SELECTION UI:

Track Tabs or Dropdown:
[ Blue (CRM) ] [ Web (Website) ] [ Local SEO ] [ Gold (All-in-One) ]

When "Local SEO" selected, show:
- Local SEO Starter — $99/mo
- Local SEO Pro — $149/mo (Recommended)
- Local SEO Enterprise — $199/mo

Required field when Local SEO selected:
- "Client's Existing Website URL" (required, validated)
```

### Client Profile — Service Summary Display

```
CLIENT PROFILE - SERVICE SUMMARY SECTION:

For Gold Plans, display:
┌─────────────────────────────────────────────┐
│ Active Plan: Gold Pro                       │
│ Monthly Rate: $399/mo                       │
│ Billing: Monthly / Annual                   │
│                                             │
│ INCLUDED SERVICES:                          │
│ ✓ Website (5-10 pages)                      │
│ ✓ BlueHQ CRM (1 user)                       │
│ ✓ AI SMS Lead Capture                       │
│ ✓ Local SEO Pro                             │
│ ✓ GBP Management                            │
│ ✓ 50 Citations                              │
│ ✓ Competitor Tracking                       │
└─────────────────────────────────────────────┘

For Local SEO Plans, display:
┌─────────────────────────────────────────────┐
│ Active Plan: Local SEO Pro                  │
│ Monthly Rate: $149/mo                       │
│ Client Website: www.clientsite.com          │
│                                             │
│ INCLUDED SERVICES:                          │
│ ✓ GBP Management                            │
│ ✓ 50 Citations                              │
│ ✓ On-Site Optimization                      │
│ ✓ Review Response Templates                 │
│ ✓ Bi-Weekly Ranking Reports                 │
│ ✓ Competitor Tracking (3)                   │
│                                             │
│ NOT INCLUDED:                               │
│ ✗ Website (client provides)                 │
│ ✗ CRM Access                                │
└─────────────────────────────────────────────┘

For Web Plans WITH GBP Add-On:
┌─────────────────────────────────────────────┐
│ Active Plan: Web Pro                        │
│ Monthly Rate: $249/mo                       │
│                                             │
│ INCLUDED SERVICES:                          │
│ ✓ Website (5-10 pages)                      │
│ ✓ On-Page SEO                               │
│ ✓ Hosting & SSL                             │
│                                             │
│ ADD-ONS:                                    │
│ ✓ GBP Setup ($99 one-time) — COMPLETED      │
│                                             │
│ NOT INCLUDED:                               │
│ ✗ CRM Access                                │
│ ✗ Local Citations                           │
│ ✗ Ongoing GBP Management                    │
└─────────────────────────────────────────────┘
```

### New Client Form — Update Plan Options

```
NEW CLIENT FORM FIELDS:

1. Client Information (unchanged)
   - Business Name
   - Contact Name
   - Email
   - Phone
   - Address

2. Plan Selection (UPDATED)
   - Track: [ Blue | Web | Local SEO | Gold ]
   - Tier: [ Starter | Pro | Enterprise ]
   - Type: [ Individual | Teams ]
   - Billing: [ Monthly | Annual (25% off) ]

3. IF Track = "Local SEO":
   - Show: "Client's Existing Website URL" (required)
   - Validate: Must be valid URL format
   - Note: "Local SEO plans require an existing website"

4. IF Track = "Web":
   - Show: "Add GBP Setup? ($99 one-time)" [ ] checkbox
   - If checked, add $99 to first invoice

5. IF Track = "Gold":
   - Show: "GBP Management: Included ✓" (display only, not editable)
   - Show: "Local SEO: [Starter/Pro/Enterprise] Included ✓"

6. Add-Ons Section
   - Extra Location ($199/mo) — available for Web, Gold, SEO plans
   - GBP Setup ($99) — available for Web plans only (show/hide based on track)

7. Calculated Total
   - Monthly: $XXX
   - Annual: $XXX (if annual selected)
   - One-Time Fees: $XXX (GBP add-on if applicable)
   - Due Today: $XXX
```

---

## REPORTS & ANALYTICS UPDATES

### Revenue Reports — Add Local SEO Category

```
REVENUE REPORT CATEGORIES:

1. By Track:
   - Blue Revenue
   - Web Revenue
   - Local SEO Revenue (NEW)
   - Gold Revenue
   - Add-On Revenue

2. By Plan Tier:
   - Starter Tier (all tracks)
   - Pro Tier (all tracks)
   - Enterprise Tier (all tracks)
   - Teams Tier (all tracks)

3. New Report: Local SEO Performance
   - Total Local SEO subscribers
   - MRR from Local SEO plans
   - Churn rate for Local SEO
   - Average revenue per Local SEO customer
```

### Commission Reports — Add Local SEO

```
COMMISSION REPORT UPDATES:

1. Add "Local SEO" as commission category
2. Track GBP add-on commissions separately
3. Update Gold plan commission calculations to new rates

Sales Rep Dashboard should show:
- Deals by Track (Blue / Web / SEO / Gold)
- Commission earned by Track
- Pending commissions (upfront awaiting M2)
- Recurring commissions (active M3-14 customers)
- Retention bonuses earned
```

---

## SERVICE DELIVERY / TASK MANAGEMENT UPDATES

### Onboarding Checklists — Add Local SEO

```
LOCAL SEO ONBOARDING CHECKLIST:

□ Verify client's existing website URL
□ Request GBP access (if existing) or create new
□ Complete GBP optimization
   □ Business info verified
   □ Categories selected
   □ Service area configured
   □ Description written
   □ Photos uploaded (10)
   □ First 2 posts created
□ Submit citations (per plan tier: 20/50/100+)
□ Perform on-site SEO audit
□ Implement on-site optimizations
□ Set up ranking tracking
□ Set up competitor tracking (Pro/Enterprise)
□ Schedule first monthly report
□ Send welcome email with deliverables summary
```

```
GOLD PLAN ONBOARDING CHECKLIST (UPDATED):

□ Website Build
   □ [existing checklist items]
□ CRM Setup
   □ [existing checklist items]
□ Local SEO Setup (NEW - per matching tier)
   □ GBP setup/optimization
   □ Citation submissions
   □ On-site SEO implementation
   □ Ranking tracking configured
   □ Competitor tracking (Pro/Enterprise)
□ AI SMS Configuration
   □ [existing checklist items]
```

### Task Templates — Remove Link Building

```
REMOVE FROM ALL TASK TEMPLATES:

❌ "Submit backlinks"
❌ "Link building outreach"
❌ "Guest post submissions"
❌ "Local sponsorship outreach"
❌ "Industry association link requests"
❌ Any task containing "backlink" or "link building"

These services are NOT offered.
```

---

## EMAIL TEMPLATES UPDATES

### Welcome Emails — Add Local SEO Version

```
NEW EMAIL TEMPLATE: Local SEO Welcome

Subject: Welcome to Trades Captain Local SEO! 🎉

Hi [Client Name],

Welcome to Trades Captain! Your Local SEO [Starter/Pro/Enterprise] plan is now active.

Here's what we're doing for you:

✓ Google Business Profile
   We're optimizing your GBP for maximum visibility. You'll receive [2/4/8] posts per month.

✓ Local Citations
   We're submitting your business to [20/50/100+] directories to build your local presence.

✓ On-Site SEO
   We're optimizing your existing website ([website URL]) for local search.

✓ Reporting
   You'll receive [monthly/bi-weekly/weekly] ranking reports showing your progress.

Your dedicated SEO specialist will reach out within 24 hours to gather any additional information needed.

Questions? Reply to this email or call (623) 260-2200.

— The Trades Captain Team
```

### Plan Upgrade Emails — Update Gold Pricing

```
UPDATE EMAIL TEMPLATE: Upgrade to Gold

Subject: Upgrade to Gold Pro — Everything in One Subscription

Hi [Client Name],

Ready to simplify? Gold Pro gives you everything:

✓ Professional Website (5-10 pages)
✓ BlueHQ CRM with AI SMS
✓ Local SEO Pro (GBP, 50 citations, competitor tracking)
✓ All included for $399/month

That's website + CRM + AI + SEO — no add-ons, no surprises.

[Upgrade Now Button]

Current plan: [Current Plan] at $[Current Price]/mo
Gold Pro: $399/mo (everything included)

Questions? Reply or call (623) 260-2200.
```

---

## API / INTEGRATION UPDATES

### Webhook Payloads — Add Local SEO Data

```
SUBSCRIPTION WEBHOOK PAYLOAD (UPDATED):

{
  "event": "subscription.created",
  "data": {
    "subscription_id": "sub_xxx",
    "customer_id": "cus_xxx",
    "plan": {
      "id": "gold_pro",
      "name": "Gold Pro",
      "track": "gold",
      "tier": "pro",
      "type": "individual",
      "monthly_price": 399,
      "annual_price": 3591,
      "billing_frequency": "monthly",
      "includes_website": true,
      "includes_crm": true,
      "includes_local_seo": true,        // NEW
      "local_seo_tier": "pro",           // NEW
      "includes_gbp": true,              // NEW
      "user_limit": 1
    },
    "addons": [],
    "start_date": "2025-12-21",
    "status": "active"
  }
}
```

### Plan Lookup API — Add Local SEO Plans

```
GET /api/plans

Response should now include:

{
  "plans": [
    // Blue plans (unchanged)
    { "id": "blue_starter", "track": "blue", ... },
    
    // Web plans (unchanged)
    { "id": "web_starter", "track": "web", ... },
    
    // Local SEO plans (NEW)
    {
      "id": "seo_starter",
      "name": "Local SEO Starter",
      "track": "seo",
      "tier": "starter",
      "monthly_price": 99,
      "annual_price": 891,
      "includes_website": false,
      "includes_crm": false,
      "includes_gbp": true,
      "requires_existing_website": true,
      "website_pages": "1-5",
      "citations": 20,
      "features": ["GBP setup/management", "20 citations", "On-site optimization", "Monthly ranking report"]
    },
    {
      "id": "seo_pro",
      "name": "Local SEO Pro",
      "track": "seo",
      "tier": "pro",
      "monthly_price": 149,
      "annual_price": 1341,
      "includes_website": false,
      "includes_crm": false,
      "includes_gbp": true,
      "requires_existing_website": true,
      "website_pages": "5-10",
      "citations": 50,
      "features": ["GBP management", "50 citations", "Review templates", "Competitor tracking", "Bi-weekly reports"]
    },
    {
      "id": "seo_enterprise",
      "name": "Local SEO Enterprise",
      "track": "seo",
      "tier": "enterprise",
      "monthly_price": 199,
      "annual_price": 1791,
      "includes_website": false,
      "includes_crm": false,
      "includes_gbp": true,
      "requires_existing_website": true,
      "website_pages": "10-15",
      "citations": 100,
      "features": ["Full GBP management", "100+ citations", "Review management", "Weekly reports"]
    },
    
    // Gold plans (UPDATED PRICING)
    {
      "id": "gold_starter",
      "name": "Gold Starter",
      "track": "gold",
      "tier": "starter",
      "monthly_price": 249,  // WAS 199
      "annual_price": 2241,  // WAS 1791
      "includes_website": true,
      "includes_crm": true,
      "includes_local_seo": true,  // NEW
      "local_seo_tier": "starter", // NEW
      "includes_gbp": true,        // NEW
      ...
    },
    // ... etc for all Gold plans
  ]
}
```

---

## MIGRATION / DATA UPDATES

### Existing Customer Migration Script

```
MIGRATION TASKS:

1. Update Gold plan price references in database
   - gold_starter: 199 → 249
   - gold_pro: 349 → 399
   - gold_enterprise: 499 → 549
   - gold_starter_teams: 299 → 349
   - gold_pro_teams: 449 → 499
   - gold_enterprise_teams: 749 → 799

2. Add Local SEO plans to plans table
   - seo_starter, seo_pro, seo_enterprise

3. Add new fields to subscriptions table
   - includes_local_seo (boolean)
   - local_seo_tier (string: starter/pro/enterprise/null)
   - client_website_url (string, for SEO plans)

4. Update Gold subscriptions
   - Set includes_local_seo = true
   - Set local_seo_tier = matching tier
   - Set includes_gbp = true

5. Add GBP add-on to addons table
   - gbp_setup: $99 one-time, web plans only

6. Remove any "link_building" references
   - Remove from features arrays
   - Remove from task templates
   - Remove from service descriptions

7. Grandfather existing Gold customers
   - Add is_grandfathered = true flag
   - Keep current price until renewal
   - OR send 30-day notice for price increase
```

---

## TESTING CHECKLIST

```
BEFORE DEPLOYMENT - VERIFY:

PRICING & PLANS:
□ New Gold prices display correctly ($249/$399/$549)
□ Local SEO plans appear in plan selection
□ Local SEO requires website URL field
□ GBP add-on only shows for Web plans
□ GBP shows as "Included" for Gold and SEO plans
□ Invoices generate with correct amounts
□ Commission calculations use new rates
□ No "link building" references anywhere
□ Existing customer subscriptions unchanged (grandfathered)
□ New sign-ups charged new rates

OFFER SYSTEM:
□ All 5 offers appear in agent UI when active
□ Manager can turn offers on/off
□ FIRST50 applies 50% discount to first month only
□ FIRST50 commission calculated at 50% of normal upfront
□ ANNUAL25 works with annual billing toggle
□ WAIVE99 only shows for Web plans
□ WAIVE99 removes $99 from first invoice
□ WAIVE99 removes $35 GBP commission from agent
□ FREETRIAL14 only shows for Blue and Gold plans
□ FREETRIAL14 sets first charge to Day 15
□ FREETRIAL14 commission calculated at 75% of normal upfront
□ VIP20 requires approval before subscription created
□ VIP20 approval queue shows in manager dashboard
□ VIP20 applies 20% to ALL invoices (ongoing)
□ VIP20 commission calculated on discounted price
□ Offer stacking rules enforced (FIRST50 + FREETRIAL14 blocked)
□ Offer codes appear on invoices
□ Offer usage tracked in reports
□ Inactive offers hidden from agent UI

AGENT PERFORMANCE TRACKING:
□ Agent start date tracked for 30-day ramp-up exemption
□ Quarterly sales count tracked per agent
□ Warning flag tracked per agent (resets Jan 1)
□ Pro-rated quota calculated for mid-quarter starts
□ Performance report shows agents below quota
□ Warning email template configured
□ Termination workflow for 2nd violation

EMAILS & NOTIFICATIONS:
□ Welcome emails send correctly for Local SEO
□ VIP20 approval request notifies manager
□ VIP20 approval/denial notifies agent
□ Trial ending reminder sent on Day 12
□ Quarterly performance warning email works
□ 30-day data deletion warning email works
□ 7-day final data deletion warning email works

DATA RETENTION:
□ Cancelled customer data retained for 60 days
□ Automated deletion runs at day 60
□ Reactivation within 60 days restores data
□ Reactivation after 60 days creates fresh account
□ Data export available on request

REFERRAL TRACKING:
□ Referral source field in subscription creation
□ $50 referral bonus calculated when 2nd payment clears
□ Referral bonus shows in agent commission report
□ Referring customer must be active for bonus

REPORTS:
□ Reports include Local SEO category
□ Offer usage report shows all metrics
□ Commission reports account for offer impacts
□ Agent performance report shows quarterly sales
```

---

## AGENT PERFORMANCE TRACKING

### Minimum Performance Requirement

```
REQUIREMENT: 6 sales per calendar quarter (after 30-day ramp-up)

QUARTERS:
- Q1: January 1 – March 31
- Q2: April 1 – June 30
- Q3: July 1 – September 30
- Q4: October 1 – December 31

ENFORCEMENT:
- First 30 days: Exempt (ramp-up period)
- 1st violation: Written warning (email)
- 2nd violation (same calendar year): Contract termination
- Warning resets: January 1 each year

PRO-RATED QUARTERS:
If agent starts mid-quarter (after 30-day ramp-up), minimum is pro-rated:
- 3 months remaining in quarter: 6 sales required
- 2 months remaining in quarter: 4 sales required
- 1 month remaining in quarter: 2 sales required
```

### Agent Performance Database Schema

```
ADD TO agents TABLE:

- start_date DATE  -- Date contract signed
- ramp_up_end_date DATE  -- start_date + 30 days
- warning_count INT DEFAULT 0  -- Resets Jan 1
- last_warning_date DATE
- last_warning_quarter VARCHAR  -- e.g., "2025-Q3"
- status ENUM('active', 'warned', 'terminated') DEFAULT 'active'
- termination_date DATE
- termination_reason VARCHAR

CREATE TABLE agent_quarterly_performance (
  id INT PRIMARY KEY AUTO_INCREMENT,
  agent_id VARCHAR,
  year INT,
  quarter INT,  -- 1, 2, 3, or 4
  sales_count INT DEFAULT 0,
  quota INT DEFAULT 6,  -- May be pro-rated
  met_quota BOOLEAN,
  warning_issued BOOLEAN DEFAULT false,
  warning_date DATE,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Performance Check Logic

```
RUN QUARTERLY (within 7 days of quarter end):

1. Get all active agents where ramp_up_end_date < quarter_end_date
2. For each agent:
   a. Count sales closed in quarter
   b. Calculate pro-rated quota if started mid-quarter
   c. If sales_count < quota:
      - If warning_count = 0 this year:
        → Issue warning, set warning_count = 1
        → Send warning email
        → Log in agent_quarterly_performance
      - If warning_count >= 1 this year:
        → Flag for termination review
        → Notify manager
        → Do NOT auto-terminate (manager reviews)

3. Reset warning_count to 0 for all agents on January 1
```

### Manager Performance Dashboard

```
AGENT PERFORMANCE DASHBOARD (Manager View):

┌─────────────────────────────────────────────────────────────────┐
│ AGENT PERFORMANCE - Q4 2025                    [Export] [Email] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ SUMMARY:                                                        │
│ Total Active Agents: 24                                         │
│ Meeting Quota: 21 (88%)                                         │
│ Below Quota: 3 (12%)                                            │
│ In Ramp-Up Period: 2                                            │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ AGENTS BELOW QUOTA:                                             │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ John Smith                                    ⚠️ WARNING    │ │
│ │ Sales: 3 / 6 required                                       │ │
│ │ Warning Status: 1st violation (warned Oct 5)                │ │
│ │ [View Details] [Contact Agent]                              │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Sarah Johnson                                 🔴 2ND STRIKE │ │
│ │ Sales: 4 / 6 required                                       │ │
│ │ Warning Status: 2nd violation - REVIEW REQUIRED             │ │
│ │ Previous Warning: Q2 2025                                   │ │
│ │ [View Details] [Contact Agent] [Terminate Contract]         │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Mike Chen                                     📋 PRO-RATED  │ │
│ │ Sales: 1 / 2 required (started Nov 15)                      │ │
│ │ Warning Status: 1st violation                               │ │
│ │ [View Details] [Contact Agent]                              │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ AGENTS IN RAMP-UP PERIOD (exempt from quota):                   │
│                                                                 │
│ • Alex Williams - Started Dec 10, 2025 (11 days remaining)     │
│ • Lisa Brown - Started Dec 18, 2025 (27 days remaining)        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Warning Email Template

```
EMAIL TEMPLATE: Quarterly Performance Warning

Subject: Performance Notice - Q[X] 2025 Sales Quota

Hi [Agent Name],

This is a formal notice regarding your sales performance for Q[X] 2025.

YOUR RESULTS:
- Sales Closed: [X]
- Quarterly Quota: 6
- Status: Below Minimum

Per your Independent Contractor Agreement (Section 10), a minimum of 6 sales per calendar quarter is required after your initial 30-day ramp-up period.

This is your [FIRST/SECOND] performance notice this calendar year.

[IF FIRST WARNING:]
This serves as your written warning. A second violation within this calendar year may result in contract termination.

[IF SECOND WARNING:]
This is your second performance notice this calendar year. Per your agreement, this is grounds for contract termination. A manager will be in contact with you shortly to discuss next steps.

If you have questions or circumstances you'd like to discuss, please contact your manager.

— Trades Captain Team
```

---

## SUMMARY OF ALL PRICE CHANGES

### Gold Plans (All +$50)

| Plan | OLD Monthly | NEW Monthly | OLD Annual | NEW Annual |
|------|-------------|-------------|------------|------------|
| Gold Starter | $199 | $249 | $1,791 | $2,241 |
| Gold Pro | $349 | $399 | $3,141 | $3,591 |
| Gold Enterprise | $499 | $549 | $4,491 | $4,941 |
| Gold Starter Teams | $299 | $349 | $2,691 | $3,141 |
| Gold Pro Teams | $449 | $499 | $4,041 | $4,491 |
| Gold Enterprise Teams | $749 | $799 | $6,741 | $7,191 |

### New Local SEO Plans

| Plan | Monthly | Annual |
|------|---------|--------|
| Local SEO Starter | $99 | $891 |
| Local SEO Pro | $149 | $1,341 |
| Local SEO Enterprise | $199 | $1,791 |

### Add-Ons (No Change)

| Add-On | Price | Available For |
|--------|-------|---------------|
| Extra Location | $199/mo | Web, Gold, SEO |
| GBP Setup | $99 one-time | Web plans ONLY |

### Blue Plans — NO CHANGES
### Web Plans — NO CHANGES (pricing unchanged, just clarified GBP add-on availability)

---

---

## DISCOUNT / OFFER SYSTEM

### Overview

Agents CANNOT modify prices directly. Instead, they can apply pre-defined offers that managers control. All offers can be turned on/off by managers at any time.

### Offer Configuration Table

```
CREATE TABLE offers (
  offer_id VARCHAR PRIMARY KEY,
  offer_code VARCHAR UNIQUE,
  offer_name VARCHAR,
  description TEXT,
  discount_type ENUM('percent_first_month', 'percent_ongoing', 'waive_fee', 'free_trial_days', 'percent_annual'),
  discount_value DECIMAL,  -- percent or dollar amount or days
  applies_to TEXT[],  -- plan IDs or "all" or "gold_*" wildcard
  requires_approval BOOLEAN DEFAULT false,
  approval_role VARCHAR,  -- 'manager', 'admin', null
  is_active BOOLEAN DEFAULT true,
  start_date DATE,
  end_date DATE,  -- null = no expiration
  max_uses INT,  -- null = unlimited
  current_uses INT DEFAULT 0,
  created_by VARCHAR,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Pre-Defined Offers

```
INSERT INTO offers:

| offer_id | offer_code | offer_name | discount_type | discount_value | applies_to | requires_approval | is_active |
|----------|------------|------------|---------------|----------------|------------|-------------------|-----------|
| offer_001 | FIRST50 | First Month 50% Off | percent_first_month | 50 | all | false | true |
| offer_002 | ANNUAL25 | Annual 25% Off | percent_annual | 25 | all | false | true |
| offer_003 | WAIVE99 | Waive GBP Setup Fee | waive_fee | 99 | web_* | false | true |
| offer_004 | FREETRIAL14 | 14-Day Free Trial | free_trial_days | 14 | blue_*, gold_* | false | true |
| offer_005 | VIP20 | VIP 20% Off Monthly | percent_ongoing | 20 | all | true | true |
```

### Offer Details

```
OFFER: FIRST50
─────────────────────────────────
Name: First Month 50% Off
Code: FIRST50
Type: percent_first_month
Value: 50%
Applies To: All plans
Requires Approval: No
─────────────────────────────────
How it works:
- First month billed at 50% of normal rate
- Month 2+ billed at full rate
- Commission calculated on FULL price (agent doesn't lose out)

Example - Gold Pro ($399/mo):
- Month 1: $199.50
- Month 2+: $399.00
- Agent upfront commission: $200 (based on $399)


OFFER: ANNUAL25
─────────────────────────────────
Name: Annual 25% Off
Code: ANNUAL25
Type: percent_annual
Value: 25%
Applies To: All plans
Requires Approval: No
─────────────────────────────────
How it works:
- This is the STANDARD annual discount (already built in)
- Displayed as offer for transparency
- Cannot be combined with other offers

Example - Gold Pro:
- Monthly: $399/mo × 12 = $4,788/yr
- Annual: $3,591/yr (25% off)
- Agent commission: 35% of $3,591 = $1,257


OFFER: WAIVE99
─────────────────────────────────
Name: Waive GBP Setup Fee
Code: WAIVE99
Type: waive_fee
Value: $99
Applies To: Web plans only (web_starter, web_pro, web_enterprise, web_custom)
Requires Approval: No
─────────────────────────────────
How it works:
- Waives the $99 one-time GBP setup fee
- Agent loses GBP commission ($35) when this is applied
- Good for closing deals where customer balks at extra fee

Example - Web Pro ($249/mo) + GBP:
- Normal: $249 + $99 = $348 due today
- With WAIVE99: $249 due today
- Agent GBP commission: $0 (waived)


OFFER: FREETRIAL14
─────────────────────────────────
Name: 14-Day Free Trial
Code: FREETRIAL14
Type: free_trial_days
Value: 14 days
Applies To: Blue plans, Gold plans (CRM-inclusive plans only)
Requires Approval: No
─────────────────────────────────
How it works:
- Customer gets 14 days free before first charge
- First charge occurs on Day 15
- If customer cancels during trial, no charge and no commission
- Commission clock starts after trial converts

Example - Gold Pro ($399/mo):
- Day 1-14: Free trial (CRM access only, website build starts)
- Day 15: First charge $399
- Day 45: Second charge $399 → Agent upfront commission unlocked

NOT available for:
- Web-only plans (website build requires payment)
- Local SEO plans (work begins immediately)


OFFER: VIP20
─────────────────────────────────
Name: VIP 20% Off Monthly (Ongoing)
Code: VIP20
Type: percent_ongoing
Value: 20%
Applies To: All plans
Requires Approval: YES (Manager or Admin only)
─────────────────────────────────
How it works:
- 20% discount applied to ALL monthly payments (ongoing)
- Agent must request approval from manager
- Manager approves/denies in admin portal
- Commission calculated on DISCOUNTED price

Example - Gold Pro ($399/mo):
- Normal: $399/mo
- With VIP20: $319.20/mo (ongoing)
- Agent upfront commission: $160 (based on $319.20)
- Agent recurring commission: $31.92/mo

USE SPARINGLY - This is for:
- High-value referral sources
- Multi-location deals
- Competitive rescue situations
- Strategic accounts
```

### Offer Stacking Rules

```
OFFER COMBINATION RULES:

| Offer 1 | Offer 2 | Can Combine? |
|---------|---------|--------------|
| FIRST50 | ANNUAL25 | ❌ No (annual has own discount) |
| FIRST50 | WAIVE99 | ✅ Yes |
| FIRST50 | FREETRIAL14 | ❌ No (both affect first payment) |
| FIRST50 | VIP20 | ❌ No (conflicting discount types) |
| WAIVE99 | FREETRIAL14 | ✅ Yes |
| WAIVE99 | VIP20 | ✅ Yes |
| FREETRIAL14 | VIP20 | ✅ Yes |
| ANNUAL25 | any other | ❌ No (annual is standalone) |

MAX OFFERS PER SUBSCRIPTION: 2 (unless one is ANNUAL25, then just 1)
```

---

## SUBSCRIPTION RECORD UPDATES (For Offers)

### Updated Subscription Schema

```
subscriptions table - ADD FIELDS:

- offer_codes_applied TEXT[]  -- e.g., ["FIRST50", "WAIVE99"]
- discount_percent_ongoing DECIMAL DEFAULT 0  -- for VIP20 type offers
- trial_days INT DEFAULT 0  -- for FREETRIAL14
- trial_end_date DATE  -- calculated from start_date + trial_days
- first_month_discount_percent DECIMAL DEFAULT 0  -- for FIRST50
- fees_waived TEXT[]  -- e.g., ["gbp_setup"]
- offer_approved_by VARCHAR  -- for offers requiring approval
- offer_approval_date TIMESTAMP
- offer_notes TEXT  -- agent's reason for applying offer

CALCULATED FIELDS:
- base_monthly_rate: Plan's standard price
- effective_monthly_rate: After ongoing discounts (VIP20)
- first_month_rate: After first-month discounts (FIRST50)
```

### Example Subscription Records

```
EXAMPLE 1: Gold Pro with FIRST50

subscription_id: sub_abc123
customer_id: cus_xyz
plan_id: gold_pro
base_monthly_rate: 399.00
offer_codes_applied: ["FIRST50"]
first_month_discount_percent: 50
effective_monthly_rate: 399.00
first_month_rate: 199.50
trial_days: 0
discount_percent_ongoing: 0
fees_waived: []
─────────────────────────────────
Billing:
- Month 1: $199.50
- Month 2+: $399.00


EXAMPLE 2: Web Pro with WAIVE99 + FREETRIAL14

subscription_id: sub_def456
customer_id: cus_abc
plan_id: web_pro
base_monthly_rate: 249.00
offer_codes_applied: ["WAIVE99", "FREETRIAL14"]
first_month_discount_percent: 0
effective_monthly_rate: 249.00
first_month_rate: 249.00
trial_days: 14
trial_end_date: 2026-01-04
discount_percent_ongoing: 0
fees_waived: ["gbp_setup"]
─────────────────────────────────
Billing:
- Day 1-14: $0 (trial)
- Day 15: $249.00 (GBP fee waived)
- Month 2+: $249.00


EXAMPLE 3: Gold Pro Teams with VIP20 (Manager Approved)

subscription_id: sub_ghi789
customer_id: cus_def
plan_id: gold_pro_teams
base_monthly_rate: 499.00
offer_codes_applied: ["VIP20"]
first_month_discount_percent: 0
effective_monthly_rate: 399.20
first_month_rate: 399.20
trial_days: 0
discount_percent_ongoing: 20
fees_waived: []
offer_approved_by: manager_001
offer_approval_date: 2025-12-21
offer_notes: "Competitive rescue - customer was leaving for Jobber"
─────────────────────────────────
Billing:
- All months: $399.20
- Commission based on $399.20
```

---

## INVOICE UPDATES (For Offers)

### Invoice Line Items with Discounts

```
INVOICE WITH FIRST50:

Invoice #INV-2025-001234
Customer: ABC Plumbing
Date: December 21, 2025

─────────────────────────────────────────────────────
| Description                        | Amount       |
─────────────────────────────────────────────────────
| Gold Pro (Monthly)                 | $399.00      |
| Discount: First Month 50% Off      | -$199.50     |
| (Promo Code: FIRST50)              |              |
─────────────────────────────────────────────────────
| TOTAL DUE                          | $199.50      |
─────────────────────────────────────────────────────


INVOICE WITH WAIVE99:

Invoice #INV-2025-001235
Customer: XYZ Electric
Date: December 21, 2025

─────────────────────────────────────────────────────
| Description                        | Amount       |
─────────────────────────────────────────────────────
| Web Pro (Monthly)                  | $249.00      |
| GBP Setup/Optimization             | $99.00       |
| Discount: GBP Fee Waived           | -$99.00      |
| (Promo Code: WAIVE99)              |              |
─────────────────────────────────────────────────────
| TOTAL DUE                          | $249.00      |
─────────────────────────────────────────────────────


INVOICE WITH VIP20 (Ongoing):

Invoice #INV-2025-001236
Customer: Premier Plumbing Co
Date: December 21, 2025

─────────────────────────────────────────────────────
| Description                        | Amount       |
─────────────────────────────────────────────────────
| Gold Pro Teams (Monthly)           | $499.00      |
| VIP Discount (20% Off)             | -$99.80      |
| (Promo Code: VIP20)                |              |
─────────────────────────────────────────────────────
| TOTAL DUE                          | $399.20      |
─────────────────────────────────────────────────────

Note: VIP20 appears on EVERY invoice for this customer.


INVOICE WITH FREE TRIAL (First Invoice After Trial):

Invoice #INV-2025-001237
Customer: Quick Fix HVAC
Date: January 4, 2026 (Trial ended)

─────────────────────────────────────────────────────
| Description                        | Amount       |
─────────────────────────────────────────────────────
| Gold Pro (Monthly)                 | $399.00      |
| Note: 14-day free trial ended      |              |
─────────────────────────────────────────────────────
| TOTAL DUE                          | $399.00      |
─────────────────────────────────────────────────────
```

---

## COMMISSION CALCULATIONS (With Offers)

### Commission Rules by Offer Type

```
COMMISSION RULES:

| Offer | Upfront Commission | Recurring Commission | Retention Bonuses |
|-------|--------------------|-----------------------|-------------------|
| FIRST50 | 50% of normal | Full (M3+ are full price) | Full |
| ANNUAL25 | 35% of discounted annual | N/A (annual) | N/A (annual) |
| WAIVE99 | Lose $35 GBP commission | N/A | N/A |
| FREETRIAL14 | 75% of normal (risk adjustment) | Full | Full |
| VIP20 | Based on discounted price | Based on discounted price | Full |

RATIONALE:
- FIRST50: Agent earns less upfront because company collects less in Month 1
- FREETRIAL14: 25% reduction because ~20% of trials don't convert (risk sharing)
- VIP20: Ongoing discount = ongoing commission reduction
- Retention bonuses always full (reward for keeping customer)
```

### Commission Examples

```
FIRST50 - Reduced Upfront, Full Recurring:
---------------------------------------------------
Gold Pro ($399/mo) with FIRST50

Customer pays:
- Month 1: $199.50 (50% off)
- Month 2+: $399.00 (full price)

Agent commission:
- Upfront: $100 (50% of normal $200)
- Recurring (M3-14): $39.90/mo (full - based on $399)
- Retention bonuses: Up to $190 (full)
- MAX TOTAL: $100 + $478.80 + $190 = $768.80

Compare to no offer:
- Normal MAX: $200 + $478.80 + $190 = $868.80
- Agent loses: $100 upfront


WAIVE99 - Lose GBP Commission Only:
---------------------------------------------------
Web Pro ($249/mo) + GBP with WAIVE99

Customer pays:
- First invoice: $249 (GBP $99 waived)
- Month 2+: $249

Agent commission:
- GBP commission: $0 (normally $35)
- Plan upfront: $125 (full)
- Plan recurring: $24.90/mo (full)

Agent loses: $35 (GBP commission only)


FREETRIAL14 - Reduced Upfront, Delayed Timeline:
---------------------------------------------------
Gold Pro ($399/mo) with FREETRIAL14

Customer timeline:
- Day 1-14: Free trial (no charge)
- Day 15: First charge $399 ("Month 1")
- Day 45: Second charge $399 ("Month 2")
- Day 75: Third charge $399 ("Month 3")

Agent commission:
- Upfront: $150 (75% of normal $200 - risk adjustment)
- Upfront paid: ~Day 52 (after M2 clears)
- Recurring (M3-14): $39.90/mo (full)
- Retention bonuses: Up to $190 (full)
- MAX TOTAL: $150 + $478.80 + $190 = $818.80

Compare to no offer:
- Normal MAX: $868.80
- Agent loses: $50 upfront (risk sharing for trial non-conversion)

If trial doesn't convert:
- Agent commission: $0 (no payment = no commission)


VIP20 - All Commission Reduced (Manager Approval Required):
---------------------------------------------------
Gold Pro ($399/mo) with VIP20

Customer pays:
- All months: $319.20 (20% off $399)

Agent commission (all based on $319.20):
- Upfront: $160 (50% of $319.20)
- Recurring (M3-14): $31.92/mo
- Retention bonuses: Up to $190 (full - not reduced)
- MAX TOTAL: $160 + $383.04 + $190 = $733.04

Compare to no offer:
- Normal MAX: $868.80
- Agent loses: $135.76

This is significant - manager approval required for good reason.


ANNUAL25 - Standard Annual Commission:
---------------------------------------------------
Gold Pro Annual with ANNUAL25

Customer pays:
- $3,591/year (25% off $4,788)

Agent commission:
- One-time: $1,257 (35% of $3,591)
- No recurring (annual)
- No retention bonuses (annual)

This is the standard annual structure - not a special discount.
```

### Commission Summary Table (With Offers)

```
GOLD PRO COMMISSION COMPARISON:

| Scenario | Upfront | 12mo Recurring | Retention | MAX TOTAL |
|----------|---------|----------------|-----------|-----------|
| No offer (monthly) | $200 | $478.80 | $190 | $868.80 |
| FIRST50 | $100 | $478.80 | $190 | $768.80 |
| FREETRIAL14 | $150 | $478.80 | $190 | $818.80 |
| VIP20 | $160 | $383.04 | $190 | $733.04 |
| Annual (ANNUAL25) | $1,257 | — | — | $1,257 |

AGENT IMPACT SUMMARY:
- FIRST50: Lose $100 upfront (11.5% total reduction)
- FREETRIAL14: Lose $50 upfront (5.7% total reduction)
- VIP20: Lose $135.76 (15.6% total reduction)
- WAIVE99: Lose $35 (GBP commission only)
```

---

## ADMIN PORTAL - OFFER MANAGEMENT

### Manager Offer Control Panel

```
OFFER MANAGEMENT UI (Manager/Admin Only):

┌─────────────────────────────────────────────────────────────────┐
│ OFFER MANAGEMENT                                    [+ Add New] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ FIRST50 - First Month 50% Off                    [ON] 🟢    │ │
│ │ All plans • No approval needed • Used: 47 times             │ │
│ │ [Edit] [View Usage] [Turn Off]                              │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ ANNUAL25 - Annual 25% Off                        [ON] 🟢    │ │
│ │ All plans • No approval needed • Used: 23 times             │ │
│ │ [Edit] [View Usage] [Turn Off]                              │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ WAIVE99 - Waive GBP Setup Fee                    [ON] 🟢    │ │
│ │ Web plans only • No approval needed • Used: 12 times        │ │
│ │ [Edit] [View Usage] [Turn Off]                              │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ FREETRIAL14 - 14-Day Free Trial                  [ON] 🟢    │ │
│ │ Blue & Gold plans • No approval needed • Used: 31 times     │ │
│ │ [Edit] [View Usage] [Turn Off]                              │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ VIP20 - VIP 20% Off Monthly                      [ON] 🟢    │ │
│ │ All plans • MANAGER APPROVAL REQUIRED • Used: 3 times       │ │
│ │ Pending Approvals: 2                                        │ │
│ │ [Edit] [View Usage] [Review Pending] [Turn Off]             │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Offer Edit Screen

```
EDIT OFFER: FIRST50

┌─────────────────────────────────────────────────────────────────┐
│ Offer Code: FIRST50                              [Cannot Edit]  │
│                                                                 │
│ Offer Name: [First Month 50% Off_____________]                  │
│                                                                 │
│ Status: (●) Active  ( ) Inactive                                │
│                                                                 │
│ Discount Type: [First Month Percentage ▼]                       │
│                                                                 │
│ Discount Value: [50] %                                          │
│                                                                 │
│ Applies To:                                                     │
│ [✓] All Plans                                                   │
│ [ ] Blue Plans Only                                             │
│ [ ] Web Plans Only                                              │
│ [ ] Gold Plans Only                                             │
│ [ ] Local SEO Plans Only                                        │
│ [ ] Specific Plans: [________________________]                  │
│                                                                 │
│ Requires Approval: ( ) No  (●) Yes → By: [Manager ▼]            │
│                                                                 │
│ Date Range (optional):                                          │
│ Start: [__________]  End: [__________]                          │
│                                                                 │
│ Max Uses (optional): [________] (leave blank for unlimited)     │
│                                                                 │
│                              [Cancel]  [Save Changes]           │
└─────────────────────────────────────────────────────────────────┘
```

### VIP20 Approval Queue

```
PENDING APPROVALS: VIP20

┌─────────────────────────────────────────────────────────────────┐
│ APPROVAL REQUEST #1                                             │
├─────────────────────────────────────────────────────────────────┤
│ Agent: John Smith                                               │
│ Customer: Premier Plumbing Co                                   │
│ Plan: Gold Pro Teams ($499/mo)                                  │
│ With VIP20: $399.20/mo                                          │
│ Discount Amount: $99.80/mo ($1,197.60/yr)                       │
│                                                                 │
│ Agent's Reason:                                                 │
│ "Customer is currently with Jobber paying $249/mo. They have    │
│ 3 locations and are willing to sign all 3 if we can match       │
│ closer to their current spend. This is a $1,200/mo deal."       │
│                                                                 │
│ Requested: Dec 21, 2025 at 2:34 PM                              │
│                                                                 │
│                    [Deny]  [Approve]                            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ APPROVAL REQUEST #2                                             │
├─────────────────────────────────────────────────────────────────┤
│ Agent: Sarah Johnson                                            │
│ Customer: Mike's Electric                                       │
│ Plan: Gold Pro ($399/mo)                                        │
│ With VIP20: $319.20/mo                                          │
│ Discount Amount: $79.80/mo ($957.60/yr)                         │
│                                                                 │
│ Agent's Reason:                                                 │
│ "Price sensitive customer. Good referral potential."            │
│                                                                 │
│ Requested: Dec 21, 2025 at 3:15 PM                              │
│                                                                 │
│                    [Deny]  [Approve]                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## AGENT UI - APPLYING OFFERS

### New Subscription Form - Offer Section

```
NEW SUBSCRIPTION FORM:

[Customer Info Section]
[Plan Selection Section]

─────────────────────────────────────────────────────────────────

AVAILABLE OFFERS:                                    [Optional]

┌─────────────────────────────────────────────────────────────────┐
│ [ ] FIRST50 - First Month 50% Off                               │
│     Customer pays $199.50 first month, $399 after               │
│                                                                 │
│ [ ] FREETRIAL14 - 14-Day Free Trial                             │
│     Customer tries free for 14 days, first charge on Day 15     │
│                                                                 │
│ [ ] VIP20 - VIP 20% Off Monthly ⚠️ REQUIRES APPROVAL            │
│     Customer pays $319.20/mo ongoing (20% off)                  │
│     Reason for request: [_________________________________]     │
│                         [_________________________________]     │
│                                                                 │
│ ─────────────────────────────────────────────────────────────── │
│ Note: FIRST50 and FREETRIAL14 cannot be combined.               │
│ Select one or neither.                                          │
└─────────────────────────────────────────────────────────────────┘

─────────────────────────────────────────────────────────────────

BILLING SUMMARY:

  Plan: Gold Pro                              $399.00/mo
  Offers Applied: FIRST50                    -$199.50 (Month 1 only)
  ─────────────────────────────────────────────────────
  Due Today:                                  $199.50
  Month 2+:                                   $399.00/mo

                                    [Cancel]  [Create Subscription]
```

### Offer Validation Messages

```
VALIDATION ERRORS:

If agent selects FIRST50 + FREETRIAL14:
❌ "Cannot combine First Month 50% Off with 14-Day Free Trial. Please select one or neither."

If agent selects VIP20 without reason:
❌ "VIP20 requires manager approval. Please provide a reason for the discount request."

If agent selects WAIVE99 on Blue plan:
❌ "Waive GBP Setup Fee is only available for Web plans."

If offer is inactive:
❌ "This offer is currently not available. Contact your manager."

If offer has reached max uses:
❌ "This offer has reached its maximum usage limit."
```

---

## REPORTING - OFFER ANALYTICS

### Offer Usage Report

```
OFFER USAGE REPORT
Period: December 2025

┌────────────────────────────────────────────────────────────────────────────┐
│ Offer        │ Times Used │ Revenue Impact │ Avg Deal Size │ Conversion   │
├────────────────────────────────────────────────────────────────────────────┤
│ FIRST50      │ 47         │ -$9,352*       │ $342/mo       │ 68% → 74%    │
│ ANNUAL25     │ 23         │ -$4,140*       │ $2,847/yr     │ Standard     │
│ WAIVE99      │ 12         │ -$1,188        │ $249/mo       │ 71% → 78%    │
│ FREETRIAL14  │ 31         │ -$0**          │ $287/mo       │ Trial: 82%   │
│ VIP20        │ 3          │ -$2,874/yr     │ $412/mo       │ Strategic    │
├────────────────────────────────────────────────────────────────────────────┤
│ * First month only - recovers in Month 2                                   │
│ ** No revenue loss - just delayed billing                                  │
└────────────────────────────────────────────────────────────────────────────┘

TOP AGENTS BY OFFER USAGE:
1. John Smith - 18 offers applied (12 FIRST50, 4 FREETRIAL14, 2 WAIVE99)
2. Sarah Johnson - 14 offers applied
3. Mike Chen - 11 offers applied

OFFERS BY PLAN:
- Gold Pro: 34 offers (22 FIRST50, 8 FREETRIAL14, 4 VIP20)
- Blue Pro: 19 offers (11 FIRST50, 8 FREETRIAL14)
- Web Pro: 15 offers (8 FIRST50, 7 WAIVE99)
```

---

## NOTES FOR DEVELOPMENT TEAM

1. **Grandfather existing Gold customers** — Do not auto-upgrade their pricing. Flag them and handle separately.

2. **Local SEO requires website URL** — This is a required field. Validate format. Store for reference.

3. **GBP add-on logic is important** — Only Web plans can purchase it. Gold and SEO include it. Blue cannot add it.

4. **Remove ALL link building references** — Search entire codebase, database, and content for "link building", "backlink", "guest post" and remove.

5. **Commission system needs testing** — The new rates affect rep payouts. Test thoroughly.

6. **30-day notice clause** — If changing prices for existing customers, system should support sending notice emails and scheduling price change for 30 days out.

7. **Offer system is PRE-DEFINED ONLY** — Agents cannot create custom discounts. They can only apply offers that managers have enabled.

8. **VIP20 requires approval workflow** — Build a queue system for managers to approve/deny requests.

9. **Offer stacking validation** — Enforce rules about which offers can combine.

10. **Commission calculation varies by offer type** — FIRST50 = 50% upfront, FREETRIAL14 = 75% upfront, VIP20 = based on discounted price. Test all scenarios.

11. **Trial customers need special handling** — Don't count them as "active" until trial converts. Don't pay commission until after trial.

12. **Offers must be auditable** — Log who applied what offer, when, and why. This is important for financial reporting.

13. **Agent performance tracking is required** — Track quarterly sales per agent. System must:
    - Store agent start date and calculate 30-day ramp-up exemption
    - Count sales per quarter per agent
    - Track warning count (resets January 1)
    - Calculate pro-rated quotas for mid-quarter starts
    - Send automated warning emails at quarter end
    - Flag 2nd violations for manager review (do NOT auto-terminate)

14. **Quarterly performance check automation** — Run within 7 days of each quarter end to identify agents below quota and trigger warnings.