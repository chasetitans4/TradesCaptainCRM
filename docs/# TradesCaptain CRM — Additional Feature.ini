# TradesCaptain CRM — Additional Features Prompt

**Version:** 5.8  
**Date:** December 2025  
**Scope:** NeverMiss Dashboard, Sales Pipeline, Offer Codes, Onboarding, Documents, SMS Monitor, Multi-Location, Reporting

---

## TABLE OF CONTENTS

1. [NeverMiss Dashboard](#1-nevermiss-dashboard)
2. [Sales Pipeline & Leads](#2-sales-pipeline--leads)
3. [Offer Code System](#3-offer-code-system)
4. [Client Onboarding Checklist](#4-client-onboarding-checklist)
5. [Document Storage](#5-document-storage)
6. [SMS Usage Monitor](#6-sms-usage-monitor)
7. [Multi-Location Management](#7-multi-location-management)
8. [Reporting Dashboard](#8-reporting-dashboard)
9. [Database Schema (All Features)](#9-database-schema)
10. [API Endpoints (All Features)](#10-api-endpoints)

---

# 1. NEVERMISS DASHBOARD

## Overview

Central hub for agents to monitor AI SMS performance across all their clients. Shows lead capture activity, conversation quality, SMS usage, and identifies clients who need attention.

## Location

```
┌─────────────────────────────────────────────────────────────────────────┐
│ CRM TOP NAVIGATION                                                      │
├─────────────────────────────────────────────────────────────────────────┤
│ [Dashboard] [Leads] [Clients] [💬 NeverMiss] [💰 Commissions] [Settings]│
│                                 ^^^^^^^^^^^^                            │
│                                 Primary location                        │
└─────────────────────────────────────────────────────────────────────────┘
```

## Main Dashboard View

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 💬 NEVERMISS DASHBOARD                              [This Month ▼]      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ PORTFOLIO SUMMARY                                                       │
│ ┌─────────────────┬─────────────────┬─────────────────┬───────────────┐ │
│ │  📞 MISSED CALLS │  💬 LEADS       │  📅 BOOKED      │  📊 RESPONSE  │ │
│ │                 │  CAPTURED       │  APPOINTMENTS   │  RATE         │ │
│ │     847         │     683         │     412         │     81%       │ │
│ │   +12% vs last  │   80% capture   │   60% of leads  │   Excellent   │ │
│ └─────────────────┴─────────────────┴─────────────────┴───────────────┘ │
│                                                                         │
│ ═══════════════════════════════════════════════════════════════════════ │
│                                                                         │
│ CLIENTS BY SMS USAGE                                          [Filter ▼]│
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Client           │ Plan        │ SMS Used  │ Leads    │ Status      │ │
│ ├──────────────────┼─────────────┼───────────┼──────────┼─────────────┤ │
│ │ ⚠️ ACME Plumbing  │ Gold Pro    │ 892/1000  │ 47       │ Near Cap    │ │
│ │ Premier Electric │ Blue Pro    │ 654/1000  │ 38       │ ✓ Healthy   │ │
│ │ Smith HVAC       │ NeverMiss   │ 423/700   │ 22       │ ✓ Healthy   │ │
│ │ ⚠️ Quick Rooter   │ Gold Starter│ 680/700   │ 31       │ Near Cap    │ │
│ │ 🔴 Joe's Electric │ NeverMiss   │ 12/700    │ 1        │ Low Usage   │ │
│ │ Best Plumbing    │ Blue Pro    │ 445/1000  │ 26       │ ✓ Healthy   │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ [View All Clients] [Export Report]                                      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Client NeverMiss Detail View

Click on any client to see their NeverMiss activity:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 💬 NEVERMISS: ACME Plumbing                              [← Back]       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ PLAN: Gold Pro — 1,000 SMS/mo                                          │
│ NUMBER: (555) 123-4567                                                  │
│ THIS MONTH: 892/1,000 SMS used (89%) ⚠️                                 │
│                                                                         │
│ ┌─────────────────┬─────────────────┬─────────────────┬───────────────┐ │
│ │  📞 MISSED      │  💬 CAPTURED    │  📅 BOOKED      │  ⏱️ AVG TIME   │ │
│ │                 │                 │                 │               │ │
│ │     58          │     47          │     31          │     4.2s      │ │
│ │   this month    │   81% rate      │   66% of leads  │   response    │ │
│ └─────────────────┴─────────────────┴─────────────────┴───────────────┘ │
│                                                                         │
│ ═══════════════════════════════════════════════════════════════════════ │
│                                                                         │
│ RECENT CONVERSATIONS                                        [View All]  │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Today 2:34 PM — (555) 987-6543                          [📅 Booked] │ │
│ │ ├─ AI: Hi! Thanks for calling ACME Plumbing...                      │ │
│ │ ├─ Customer: I have a leak under my kitchen sink                    │ │
│ │ ├─ AI: I can help! Is this an emergency or can it wait?             │ │
│ │ ├─ Customer: Not emergency but pretty bad                           │ │
│ │ ├─ AI: Got it. I have tomorrow at 9am or 2pm available...           │ │
│ │ └─ Customer: 2pm works                                              │ │
│ │     → Lead captured: Kitchen sink leak, 123 Main St, Tomorrow 2pm   │ │
│ ├─────────────────────────────────────────────────────────────────────┤ │
│ │ Today 11:15 AM — (555) 234-5678                        [💬 Captured]│ │
│ │ ├─ AI: Hi! Thanks for calling ACME Plumbing...                      │ │
│ │ ├─ Customer: Do you do water heater installs?                       │ │
│ │ ├─ AI: Yes! What type are you looking for?                          │ │
│ │ └─ Customer: Tankless, my current one is 15 years old               │ │
│ │     → Lead captured: Water heater replacement, needs callback       │ │
│ ├─────────────────────────────────────────────────────────────────────┤ │
│ │ Yesterday 6:45 PM — (555) 345-6789                     [❌ No Reply]│ │
│ │ ├─ AI: Hi! Thanks for calling ACME Plumbing...                      │ │
│ │ └─ (No response after 24 hours)                                     │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ ═══════════════════════════════════════════════════════════════════════ │
│                                                                         │
│ LEAD QUALITY BREAKDOWN                                                  │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ 📅 Booked Appointments    31  ████████████████████░░░░░░░  66%     │ │
│ │ 💬 Needs Callback         12  ████████░░░░░░░░░░░░░░░░░░░  26%     │ │
│ │ ❌ No Response             4  ██░░░░░░░░░░░░░░░░░░░░░░░░░   8%     │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ SMS USAGE TREND (Last 6 Months)                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ 1000 ┤─────────────────────────────────────────────────── Cap      │ │
│ │  800 ┤                                          ╭────╮  ←You are   │ │
│ │  600 ┤                    ╭────╮  ╭────╮  ╭────╯    │    here      │ │
│ │  400 ┤          ╭────╮  ╭╯    ╰──╯    ╰──╯         │              │ │
│ │  200 ┤    ╭────╯    ╰──╯                           │              │ │
│ │    0 ┼────┴────┬────┬────┬────┬────┬────┬────      │              │ │
│ │      Jul  Aug  Sep  Oct  Nov  Dec                                  │ │
│ │                                                                     │ │
│ │ 📈 Trending up 23% — Consider upgrade to Gold Enterprise (1,500)   │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ [Contact Client] [Suggest Upgrade] [View All Conversations]             │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Alerts & Notifications Panel

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 🔔 NEVERMISS ALERTS                                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ ⚠️ NEAR SMS CAP (2 clients)                                             │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ • ACME Plumbing — 892/1,000 (89%) — [Suggest Upgrade]               │ │
│ │ • Quick Rooter — 680/700 (97%) — [Suggest Upgrade]                  │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ 🔴 LOW USAGE (Possible issue — 1 client)                                │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ • Joe's Electric — 12/700 (2%) — Started 3 weeks ago                │ │
│ │   Possible issues: Number not promoted, forwarding broken           │ │
│ │   [Schedule Check-In Call]                                          │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ 📉 DECLINING CAPTURE RATE (1 client)                                    │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ • Best Plumbing — Capture rate dropped 65% → 48%                    │ │
│ │   AI responses may need tuning                                      │ │
│ │   [Review Conversations] [Flag for Support]                         │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

# 2. SALES PIPELINE & LEADS

## Overview

Track prospects from first contact through close. Manage follow-ups, see conversion rates, and never let a lead slip through.

## Location

```
┌─────────────────────────────────────────────────────────────────────────┐
│ CRM TOP NAVIGATION                                                      │
├─────────────────────────────────────────────────────────────────────────┤
│ [Dashboard] [📊 Pipeline] [Clients] [NeverMiss] [Commissions] [Settings]│
│              ^^^^^^^^^^^^                                               │
│              Primary location                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

## Pipeline Kanban View

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 📊 SALES PIPELINE                                    [+ New Lead] [⚙️]  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ ┌─────────────┬─────────────┬─────────────┬─────────────┬─────────────┐ │
│ │   NEW       │  CONTACTED  │  QUALIFIED  │  PROPOSAL   │    WON      │ │
│ │   (12)      │    (8)      │    (5)      │    (3)      │    (24)     │ │
│ │   $4,788    │   $3,192    │   $2,495    │   $1,197    │   $9,576    │ │
│ ├─────────────┼─────────────┼─────────────┼─────────────┼─────────────┤ │
│ │             │             │             │             │             │ │
│ │ ┌─────────┐ │ ┌─────────┐ │ ┌─────────┐ │ ┌─────────┐ │ ┌─────────┐ │ │
│ │ │ABC HVAC │ │ │Premier  │ │ │Smith    │ │ │Quick    │ │ │ACME     │ │ │
│ │ │$399/mo  │ │ │Plumbing │ │ │Electric │ │ │Rooter   │ │ │Plumbing │ │ │
│ │ │Gold Pro │ │ │$249/mo  │ │ │$99/mo   │ │ │$399/mo  │ │ │$399/mo  │ │ │
│ │ │         │ │ │Gold St. │ │ │Blue Pro │ │ │Gold Pro │ │ │Gold Pro │ │ │
│ │ │🔴 2 days│ │ │         │ │ │         │ │ │         │ │ │✓ Dec 15 │ │ │
│ │ └─────────┘ │ │📞 Today │ │ │📅 Demo  │ │ │📝 Sent  │ │ └─────────┘ │ │
│ │             │ │ 2pm     │ │ │ Tomorrow│ │ │ Dec 20  │ │             │ │
│ │ ┌─────────┐ │ └─────────┘ │ └─────────┘ │ └─────────┘ │ ┌─────────┐ │ │
│ │ │Joe's    │ │             │             │             │ │Best     │ │ │
│ │ │Electric │ │ ┌─────────┐ │ ┌─────────┐ │             │ │Plumbing │ │ │
│ │ │$29/mo   │ │ │City HVAC│ │ │AAA Roof │ │             │ │$299/mo  │ │ │
│ │ │NeverMiss│ │ │$549/mo  │ │ │$199/mo  │ │             │ │Silver Pr│ │ │
│ │ │         │ │ │Gold Ent.│ │ │Silver St│ │             │ │✓ Dec 12 │ │ │
│ │ │🟡 5 days│ │ │         │ │ │         │ │             │ └─────────┘ │ │
│ │ └─────────┘ │ │📞 Today │ │ │Callback │ │             │             │ │
│ │             │ │ 4pm     │ │ │requested│ │             │  ... +22    │ │
│ │  ... +10    │ └─────────┘ │ └─────────┘ │             │             │ │
│ │             │             │             │             │             │ │
│ │             │  ... +5     │  ... +2     │             │             │ │
│ └─────────────┴─────────────┴─────────────┴─────────────┴─────────────┘ │
│                                                                         │
│ LOST (4) — [View Lost Leads]                                            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Lead Detail View

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 📋 LEAD: ABC HVAC                                        [← Back]       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ CONTACT INFO                           LEAD STATUS                      │
│ ──────────────                         ───────────                      │
│ John Smith                             Stage: NEW                       │
│ ABC HVAC Services                      Created: Dec 25, 2025            │
│ (555) 123-4567                         Last Contact: Never              │
│ john@abchvac.com                       Days in Stage: 2 🔴              │
│ Dallas, TX                             Source: Website Form             │
│                                                                         │
│ INTERESTED IN                          POTENTIAL VALUE                  │
│ ──────────────                         ───────────────                  │
│ Gold Pro — $399/mo                     Upfront: $200                    │
│ "Needs website + SEO + CRM"            Recurring: $59.85/mo             │
│ Multi-location possible (3 trucks)     Max Commission: $1,048           │
│                                                                         │
│ ═══════════════════════════════════════════════════════════════════════ │
│                                                                         │
│ ACTIVITY TIMELINE                                                       │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Dec 25, 3:42 PM — Lead created from website form                    │ │
│ │   "Looking for website and help getting more calls"                 │ │
│ │                                                                     │ │
│ │ Dec 25, 3:42 PM — Auto-email sent: "Thanks for your interest"       │ │
│ │                                                                     │ │
│ │ ⚠️ No follow-up activity in 2 days                                   │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ FOLLOW-UP TASKS                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ 🔴 OVERDUE: Initial call — Due Dec 26                               │ │
│ │    [Mark Complete] [Reschedule] [Log Call]                          │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ ACTIONS                                                                 │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ [📞 Log Call] [📧 Send Email] [📅 Schedule Demo] [📝 Create Proposal]│ │
│ │ [Move to Contacted] [Mark as Lost]                                  │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ NOTES                                                                   │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ [+ Add Note]                                                        │ │
│ │                                                                     │ │
│ │ (No notes yet)                                                      │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Pipeline Stages & Rules

```
STAGE DEFINITIONS:

┌─────────────┬────────────────────────────────────────────────────────────┐
│ Stage       │ Definition & Auto-Actions                                  │
├─────────────┼────────────────────────────────────────────────────────────┤
│ NEW         │ Lead just came in, no contact attempted                    │
│             │ • Auto-task: Call within 24 hours                          │
│             │ • Alert if no activity in 2 days                           │
├─────────────┼────────────────────────────────────────────────────────────┤
│ CONTACTED   │ First contact made, conversation started                   │
│             │ • Requires: Logged call, email, or meeting                 │
│             │ • Auto-task: Follow up within 3 days                       │
├─────────────┼────────────────────────────────────────────────────────────┤
│ QUALIFIED   │ Confirmed interest, budget, and timeline                   │
│             │ • Requires: Interest level set, plan selected              │
│             │ • Auto-task: Schedule demo or send proposal                │
├─────────────┼────────────────────────────────────────────────────────────┤
│ PROPOSAL    │ Proposal/quote sent, awaiting decision                     │
│             │ • Requires: Proposal document attached                     │
│             │ • Auto-task: Follow up in 5 days                           │
│             │ • Alert if no response in 7 days                           │
├─────────────┼────────────────────────────────────────────────────────────┤
│ WON         │ Deal closed, customer onboarding                           │
│             │ • Triggers: Create client record, start onboarding         │
│             │ • Triggers: Commission calculation                         │
├─────────────┼────────────────────────────────────────────────────────────┤
│ LOST        │ Deal did not close                                         │
│             │ • Requires: Lost reason selected                           │
│             │ • Optional: Schedule re-engagement in 90 days              │
└─────────────┴────────────────────────────────────────────────────────────┘
```

## Follow-Up Task System

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 📋 TODAY'S TASKS                                          Dec 27, 2025  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ 🔴 OVERDUE (3)                                                          │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ □ Initial call — ABC HVAC — Due Dec 26 — Gold Pro $399              │ │
│ │ □ Follow-up email — Joe's Electric — Due Dec 25 — NeverMiss $29     │ │
│ │ □ Send proposal — City HVAC — Due Dec 24 — Gold Ent. $549           │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ 📅 TODAY (5)                                                            │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ □ 2:00 PM — Call Premier Plumbing — Gold Starter $249               │ │
│ │ □ 4:00 PM — Call City HVAC — Gold Enterprise $549                   │ │
│ │ □ Demo with Smith Electric — Blue Pro $99                           │ │
│ │ □ Send contract — Quick Rooter — Gold Pro $399                      │ │
│ │ □ Check-in call — Best Plumbing (existing client)                   │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ 📆 UPCOMING (8)                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Tomorrow: 3 tasks                                                   │ │
│ │ This week: 5 tasks                                                  │ │
│ │ [View All Tasks]                                                    │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

# 3. OFFER CODE SYSTEM

## Overview

Manage promotional offers and apply them during checkout. Track usage, set limits, and see commission impact.

## Location

```
Sales Tools → Offer Codes
New Sale Flow → "Apply Offer" dropdown
Client Profile → Applied Offers
```

## Offer Code Management (Admin)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 🏷️ OFFER CODES                                         [+ Create Offer] │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ ACTIVE OFFERS                                                           │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Code        │ Offer              │ Used   │ Limit  │ Expires │ Status│
│ ├─────────────┼────────────────────┼────────┼────────┼─────────┼───────┤ │
│ │ FIRST50     │ 50% off first mo   │ 47     │ None   │ None    │ ✓ On  │ │
│ │ FREETRIAL14 │ 14-day free trial  │ 23     │ None   │ None    │ ✓ On  │ │
│ │ ANNUAL25    │ 25% off annual     │ Auto   │ N/A    │ N/A     │ ✓ On  │ │
│ │ WAIVE99     │ Waive $99 GBP fee  │ 12     │ 50     │ Dec 31  │ ✓ On  │ │
│ │ HOLIDAY30   │ 30% off 3 months   │ 8      │ 25     │ Jan 5   │ ✓ On  │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ RESTRICTED OFFERS (Requires Approval)                                   │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Code        │ Offer              │ Used   │ Commission Impact        │
│ ├─────────────┼────────────────────┼────────┼──────────────────────────┤ │
│ │ VIP20       │ 20% off forever    │ 3      │ All commission -20%      │ │
│ │ PARTNER50   │ 50% off first year │ 1      │ Upfront on 50% price     │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│ ⚠️ Request approval before using restricted offers                      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Apply Offer During Sale

```
┌─────────────────────────────────────────────────────────────────────────┐
│ NEW SALE: ABC HVAC                                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ SELECTED PLAN                                                           │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Gold Pro — $399/mo                                                  │ │
│ │ Annual: $3,591/yr (save $1,197)                                     │ │
│ │                                                                     │ │
│ │ Billing: ● Monthly  ○ Annual                                        │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ APPLY OFFER                                                             │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ [Enter code or select ▼]                                            │ │
│ │                                                                     │ │
│ │ Available offers:                                                   │ │
│ │ ○ None                                                              │ │
│ │ ○ FIRST50 — 50% off first month ($199.50 first mo)                 │ │
│ │ ○ FREETRIAL14 — 14-day free trial                                  │ │
│ │ ○ HOLIDAY30 — 30% off first 3 months (limited time)                │ │
│ │ ○ WAIVE99 — Waive $99 GBP setup (38 remaining)                     │ │
│ │                                                                     │ │
│ │ 🔒 VIP20, PARTNER50 — [Request Approval]                            │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ ═══════════════════════════════════════════════════════════════════════ │
│                                                                         │
│ PRICE SUMMARY                          YOUR COMMISSION                  │
│ ─────────────                          ───────────────                  │
│ Monthly: $399.00                       Upfront: $200.00                 │
│ First month: $399.00                   Recurring: $658.35               │
│ Offer: None applied                    Bonuses: $190.00                 │
│                                        ─────────────────                │
│ TOTAL: $399.00/mo                      MAX: $1,048.35                   │
│                                                                         │
│ ───────────────────────────────────── WITH FIRST50 ─────────────────── │
│                                                                         │
│ PRICE SUMMARY                          YOUR COMMISSION                  │
│ ─────────────                          ───────────────                  │
│ Monthly: $399.00                       Upfront: $199.50 ⚠️              │
│ First month: $199.50 ✓                 (based on M1 price)              │
│ Offer: FIRST50 applied                 Recurring: $658.35               │
│                                        Bonuses: $190.00                 │
│ TOTAL: $199.50 first, then $399/mo     MAX: $1,047.85                   │
│                                                                         │
│ [Apply FIRST50] [Continue Without Offer]                                │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Offer Code Reference

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 📋 OFFER CODE QUICK REFERENCE                                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ STANDARD OFFERS (Use anytime)                                           │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ FIRST50      │ 50% off first month                                  │ │
│ │              │ • Customer pays half price Month 1                   │ │
│ │              │ • Your upfront = 50% of discounted M1                │ │
│ │              │ • Recurring unaffected                               │ │
│ ├──────────────┼──────────────────────────────────────────────────────┤ │
│ │ FREETRIAL14  │ 14-day free trial                                    │ │
│ │              │ • Customer pays $0 for 14 days                       │ │
│ │              │ • Your upfront delayed to after M2 of paid service   │ │
│ │              │ • Recurring unaffected                               │ │
│ ├──────────────┼──────────────────────────────────────────────────────┤ │
│ │ ANNUAL25     │ 25% off annual (auto-applied)                        │ │
│ │              │ • Applied automatically for annual billing           │ │
│ │              │ • Your commission = 35% of discounted annual         │ │
│ ├──────────────┼──────────────────────────────────────────────────────┤ │
│ │ WAIVE99      │ Waive $99 GBP setup fee                              │ │
│ │              │ • For Web, Silver, Gold plans                        │ │
│ │              │ • No commission impact (setup fee not commissioned)  │ │
│ └──────────────┴──────────────────────────────────────────────────────┘ │
│                                                                         │
│ RESTRICTED OFFERS (Requires approval)                                   │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ VIP20        │ 20% off forever                                      │ │
│ │              │ ⚠️ ALL commission reduced by 20%                      │ │
│ │              │ • For strategic accounts only                        │ │
│ │              │ • Requires manager approval                          │ │
│ ├──────────────┼──────────────────────────────────────────────────────┤ │
│ │ PARTNER50    │ 50% off first year                                   │ │
│ │              │ ⚠️ Upfront based on 50% price                         │ │
│ │              │ • For referral partners only                         │ │
│ │              │ • Requires director approval                         │ │
│ └──────────────┴──────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

# 4. CLIENT ONBOARDING CHECKLIST

## Overview

After a sale closes, guide the agent and customer through setup. Track progress, assign tasks, and ensure nothing falls through the cracks.

## Location

```
Client Profile → Onboarding Tab (visible until complete)
Dashboard → "Onboarding in Progress" widget
```

## Onboarding Dashboard

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 📋 ONBOARDING IN PROGRESS                                    [View All] │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ ACME Plumbing — Gold Pro — Started Dec 20                          │ │
│ │ ████████████████████░░░░░░░░░░░░░░░░░░░░░░░░  45%                  │ │
│ │ Next: Waiting for GBP access                                        │ │
│ │ ⚠️ Stuck 3 days — [Send Reminder] [Call Client]                     │ │
│ ├─────────────────────────────────────────────────────────────────────┤ │
│ │ Quick Rooter — Blue Pro — Started Dec 22                           │ │
│ │ ████████████████████████████████░░░░░░░░░░░░  70%                  │ │
│ │ Next: Website content review                                        │ │
│ │ On track                                                            │ │
│ ├─────────────────────────────────────────────────────────────────────┤ │
│ │ Smith HVAC — NeverMiss — Started Dec 24                            │ │
│ │ ████████████████████████████████████████████  100% ✓               │ │
│ │ Completed! AI SMS active and tested.                                │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Client Onboarding View (Gold Pro Example)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 📋 ONBOARDING: ACME Plumbing                                            │
│ Plan: Gold Pro — CRM + Website + SEO + NeverMiss                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ PROGRESS: 45% Complete                                                  │
│ ████████████████████░░░░░░░░░░░░░░░░░░░░░░░░                           │
│                                                                         │
│ ═══════════════════════════════════════════════════════════════════════ │
│                                                                         │
│ PHASE 1: ACCOUNT SETUP                                        ✓ DONE   │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ ✓ Welcome email sent                           Dec 20, auto        │ │
│ │ ✓ Client portal access created                 Dec 20, auto        │ │
│ │ ✓ Payment method on file                       Dec 20, Stripe      │ │
│ │ ✓ Signed agreement uploaded                    Dec 20, DocuSign    │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ PHASE 2: CRM SETUP                                            ✓ DONE   │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ ✓ Blue HQ account provisioned                  Dec 20, auto        │ │
│ │ ✓ Business info configured                     Dec 21, agent       │ │
│ │ ✓ Service types added                          Dec 21, agent       │ │
│ │ ✓ Calendar availability set                    Dec 22, client      │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ PHASE 3: NEVERMISS SETUP                                      ✓ DONE   │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ ✓ Phone number provisioned                     Dec 20, auto        │ │
│ │ ✓ Call forwarding configured                   Dec 21, agent       │ │
│ │ ✓ AI responses customized                      Dec 21, agent       │ │
│ │ ✓ Test call completed                          Dec 22, agent       │ │
│ │ ✓ Client trained on dashboard                  Dec 22, call        │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ PHASE 4: WEBSITE                                          ⏳ IN PROGRESS│
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ ✓ Website intake form sent                     Dec 20, auto        │ │
│ │ ✓ Intake form completed                        Dec 23, client      │ │
│ │ ⏳ Content writing                              In progress         │ │
│ │ ○ Design mockup review                         Waiting              │ │
│ │ ○ Client approval                              Waiting              │ │
│ │ ○ Website live                                 Waiting              │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ PHASE 5: LOCAL SEO                                            ○ WAITING│
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ ⚠️ GBP access request sent                      Dec 21 — 3 days ago │ │
│ │   [Resend Request] [Mark as Received]                               │ │
│ │ ○ GBP optimized                                Waiting              │ │
│ │ ○ Citations submitted (0/25)                   Waiting              │ │
│ │ ○ Initial SEO report sent                      Waiting              │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ PHASE 6: GO LIVE                                              ○ WAITING│
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ ○ All systems verified                         Waiting              │ │
│ │ ○ Client training call completed               Waiting              │ │
│ │ ○ Go-live confirmation                         Waiting              │ │
│ │ ○ 7-day check-in scheduled                     Waiting              │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ [Send Reminder to Client] [Log Note] [Mark Complete]                    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Onboarding Templates by Plan

```
ONBOARDING PHASES BY PLAN:

┌─────────────────────────────────────────────────────────────────────────┐
│ NEVERMISS ONLY ($29)                                   Est. 1-2 days    │
├─────────────────────────────────────────────────────────────────────────┤
│ □ Account setup (auto)                                                  │
│ □ Phone number provisioned (auto)                                       │
│ □ Call forwarding configured                                            │
│ □ AI responses customized                                               │
│ □ Test call completed                                                   │
│ □ Client trained                                                        │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ BLUE CRM ($49-199)                                     Est. 3-5 days    │
├─────────────────────────────────────────────────────────────────────────┤
│ □ Account setup                                                         │
│ □ CRM provisioned                                                       │
│ □ Business info + services configured                                   │
│ □ Calendar setup                                                        │
│ □ NeverMiss setup (if Pro/Enterprise)                                   │
│ □ Client training                                                       │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ WEB PLANS ($149-349)                                   Est. 2-3 weeks   │
├─────────────────────────────────────────────────────────────────────────┤
│ □ Account setup                                                         │
│ □ Website intake form                                                   │
│ □ Content writing                                                       │
│ □ Design mockup                                                         │
│ □ Client review & revisions                                             │
│ □ GBP setup/verification                                                │
│ □ Website live                                                          │
│ □ Client training                                                       │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ GOLD PLANS ($249-549)                                  Est. 3-4 weeks   │
├─────────────────────────────────────────────────────────────────────────┤
│ □ Account setup                                                         │
│ □ CRM setup                                                             │
│ □ NeverMiss setup                                                       │
│ □ Website intake + build                                                │
│ □ GBP access + optimization                                             │
│ □ Citations submitted                                                   │
│ □ All systems verified                                                  │
│ □ Full training call                                                    │
│ □ Go-live + 7-day check-in                                              │
└─────────────────────────────────────────────────────────────────────────┘
```

---

# 5. DOCUMENT STORAGE

## Overview

Centralized document management for each client. Store signed agreements, feature sheets, intake forms, proposals, and any other files.

## Location

```
Client Profile → Documents Tab
Sales Tools → Document Templates
```

## Client Documents View

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 📁 DOCUMENTS: ACME Plumbing                              [+ Upload]     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ AGREEMENTS & CONTRACTS                                                  │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ 📄 Gold_Service_Agreement_ACME_v5.8.pdf          Dec 20  [View][⬇️] │ │
│ │    Signed via DocuSign • Gold Pro Monthly                           │ │
│ │                                                                     │ │
│ │ 📄 Gold_FeatureSheet_v5.8.pdf                    Dec 20  [View][⬇️] │ │
│ │    Sales reference document                                         │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ INTAKE & ONBOARDING                                                     │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ 📄 Website_Intake_Form_ACME.pdf                  Dec 23  [View][⬇️] │ │
│ │    Completed by client                                              │ │
│ │                                                                     │ │
│ │ 📁 Logo_and_Photos.zip                           Dec 23  [⬇️]       │ │
│ │    Client-provided assets                                           │ │
│ │                                                                     │ │
│ │ 📄 GBP_Access_Request.pdf                        Dec 21  [View][⬇️] │ │
│ │    Sent to client, pending response                                 │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ PROPOSALS & QUOTES                                                      │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ 📄 Proposal_ACME_GoldPro.pdf                     Dec 18  [View][⬇️] │ │
│ │    Initial proposal sent during sales                               │ │
│ │                                                                     │ │
│ │ 📄 Proposal_ACME_MultiLocation_Addon.pdf         Dec 19  [View][⬇️] │ │
│ │    Add-on proposal for 2nd location (not accepted)                  │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ REPORTS                                                                 │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ (No reports yet — first report due after 30 days)                   │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ OTHER                                                                   │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ 📄 Meeting_Notes_Dec22.pdf                       Dec 22  [View][⬇️] │ │
│ │    Training call notes                                              │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Document Templates Library

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 📁 DOCUMENT TEMPLATES                                    [Sales Tools]  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ SERVICE AGREEMENTS (v5.8)                                               │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ 📄 NeverMiss_Service_Agreement_v5.8.docx                   [⬇️]     │ │
│ │ 📄 Blue_Service_Agreement_v5.8.docx                        [⬇️]     │ │
│ │ 📄 Web_Service_Agreement_v5.8.docx                         [⬇️]     │ │
│ │ 📄 Silver_Service_Agreement_v5.8.docx                      [⬇️]     │ │
│ │ 📄 Gold_Service_Agreement_v5.8.docx                        [⬇️]     │ │
│ │ 📄 LocalSEO_Service_Agreement_v5.8.docx                    [⬇️]     │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ FEATURE SHEETS (v5.8)                                                   │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ 📄 NeverMiss_FeatureSheet_v5.8.pdf                         [⬇️]     │ │
│ │ 📄 Blue_FeatureSheet_v5.8.pdf                              [⬇️]     │ │
│ │ 📄 Web_FeatureSheet_v5.8.pdf                               [⬇️]     │ │
│ │ 📄 Silver_FeatureSheet_v5.8.pdf                            [⬇️]     │ │
│ │ 📄 Gold_FeatureSheet_v5.8.pdf                              [⬇️]     │ │
│ │ 📄 LocalSEO_FeatureSheet_v5.8.pdf                          [⬇️]     │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ SALES TOOLS                                                             │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ 📄 TradesCaptain_PriceSheet_v5.8.xlsx                      [⬇️]     │ │
│ │ 📄 Commission_QuickReference_v5.8.pdf                      [⬇️]     │ │
│ │ 📄 NeverMiss_Demo_Script.pdf                               [⬇️]     │ │
│ │ 📄 Objection_Handling_Guide.pdf                            [⬇️]     │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ INTAKE FORMS                                                            │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ 📄 Website_Intake_Form.pdf                                 [⬇️]     │ │
│ │ 📄 GBP_Access_Request_Form.pdf                             [⬇️]     │ │
│ │ 📄 SEO_Questionnaire.pdf                                   [⬇️]     │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Auto-Generated Documents

```
AUTOMATIC DOCUMENT GENERATION:

When a sale closes:
✓ Agreement pre-filled with client info → Sent for signature
✓ Feature sheet attached to client record
✓ Intake forms queued based on plan type

When onboarding progresses:
✓ GBP access request generated when SEO phase starts
✓ Training summary generated after training call

Monthly:
✓ SEO reports auto-generated and uploaded
✓ SMS usage reports for NeverMiss clients
```

---

# 6. SMS USAGE MONITOR

## Overview

Track SMS usage across all clients with NeverMiss. Identify clients approaching soft caps, flag upgrade opportunities, and ensure no one runs out of coverage.

## Location

```
NeverMiss Dashboard → SMS Usage Tab
Client Profile → NeverMiss section
Alerts → SMS Cap Warnings
```

## SMS Usage Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 📊 SMS USAGE MONITOR                                    December 2025   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ PORTFOLIO SUMMARY                                                       │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Total Clients with NeverMiss: 47                                    │ │
│ │ Total SMS Sent This Month: 28,450                                   │ │
│ │ Total SMS Capacity: 41,200                                          │ │
│ │ Overall Usage: 69%                                                  │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ ═══════════════════════════════════════════════════════════════════════ │
│                                                                         │
│ 🔴 OVER SOFT CAP (2)                                                    │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Client           │ Plan        │ Used     │ Cap    │ Over By │ Act  │ │
│ ├──────────────────┼─────────────┼──────────┼────────┼─────────┼──────┤ │
│ │ Premier Plumbing │ NeverMiss   │ 823      │ 700    │ +123    │ [📞] │ │
│ │ City Electric    │ Gold Starter│ 756      │ 700    │ +56     │ [📞] │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│ 💡 These clients are great upgrade candidates!                          │
│                                                                         │
│ ⚠️ NEAR CAP — 80%+ (5)                                                  │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Client           │ Plan        │ Used     │ Cap    │ %    │ Trend  │ │
│ ├──────────────────┼─────────────┼──────────┼────────┼──────┼────────┤ │
│ │ ACME Plumbing    │ Gold Pro    │ 892      │ 1000   │ 89%  │ ↑      │ │
│ │ Quick Rooter     │ Gold Starter│ 680      │ 700    │ 97%  │ ↑      │ │
│ │ Smith HVAC       │ Blue Pro    │ 845      │ 1000   │ 85%  │ →      │ │
│ │ AAA Roofing      │ NeverMiss   │ 612      │ 700    │ 87%  │ ↑      │ │
│ │ Best Electric    │ Blue Pro    │ 820      │ 1000   │ 82%  │ →      │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ ✓ HEALTHY — Under 80% (32)                                [View All]    │
│                                                                         │
│ 🔵 LOW USAGE — Under 20% (8)                              [View All]    │
│ ⚠️ May indicate setup issues or unused service                          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## SMS Soft Cap Policy Reminder

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 📋 SMS SOFT CAP POLICY                                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ WE NEVER CUT CUSTOMERS OFF.                                             │
│                                                                         │
│ SMS allocations are SOFT CAPS:                                          │
│ • NeverMiss: 700 SMS soft cap                                           │
│ • Blue Pro: 1,000 SMS soft cap                                          │
│ • Blue Enterprise: 1,500 SMS soft cap                                   │
│ • Gold Starter: 700 SMS soft cap                                        │
│ • Gold Pro: 1,000 SMS soft cap                                          │
│ • Gold Enterprise: 1,500 SMS soft cap                                   │
│                                                                         │
│ WHAT HAPPENS WHEN THEY GO OVER:                                         │
│ 1. Service continues uninterrupted                                      │
│ 2. Agent gets notified (that's you!)                                    │
│ 3. Reach out to discuss upgrade options                                 │
│ 4. If consistently over, we may require upgrade                         │
│                                                                         │
│ UPGRADE TALKING POINTS:                                                 │
│ "You're getting great results — 47 leads captured! Your plan includes   │
│ 700 texts and you've used 823. For just $19 more, you can add another  │
│ user seat and get 250 more texts per month."                            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

# 7. MULTI-LOCATION MANAGEMENT

## Overview

Handle clients with multiple business locations. Track add-ons, manage per-location services, and calculate combined billing.

## Location

```
Client Profile → Locations Tab
New Sale Flow → "Add Location" option
Billing → Multi-location invoices
```

## Multi-Location Client View

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 🏢 LOCATIONS: Premier Plumbing                                          │
│ Base Plan: Gold Pro — $399/mo                                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ TOTAL MONTHLY: $797/mo ($399 base + $199 × 2 locations)                │
│                                                                         │
│ ═══════════════════════════════════════════════════════════════════════ │
│                                                                         │
│ LOCATION 1: MAIN (Included in base plan)                                │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Premier Plumbing — Dallas                                           │ │
│ │ 123 Main St, Dallas, TX 75201                                       │ │
│ │ (555) 123-4567                                                      │ │
│ │                                                                     │ │
│ │ Services:                                                           │ │
│ │ ✓ Website (main domain: premierplumbingdallas.com)                  │ │
│ │ ✓ Google Business Profile                                           │ │
│ │ ✓ Local SEO (25 citations)                                          │ │
│ │ ✓ NeverMiss AI SMS                                                  │ │
│ │                                                                     │ │
│ │ Status: ✓ Active                                                    │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ LOCATION 2: ADD-ON (+$199/mo)                                           │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Premier Plumbing — Fort Worth                                       │ │
│ │ 456 Oak Ave, Fort Worth, TX 76102                                   │ │
│ │ (555) 234-5678                                                      │ │
│ │                                                                     │ │
│ │ Services:                                                           │ │
│ │ ✓ Location page on main website                                     │ │
│ │ ✓ Google Business Profile                                           │ │
│ │ ✓ Local SEO (25 citations)                                          │ │
│ │ ✓ NeverMiss AI SMS (shared allocation)                              │ │
│ │                                                                     │ │
│ │ Status: ✓ Active — Added Oct 15, 2025                               │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ LOCATION 3: ADD-ON (+$199/mo)                                           │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Premier Plumbing — Arlington                                        │ │
│ │ 789 Elm St, Arlington, TX 76010                                     │ │
│ │ (555) 345-6789                                                      │ │
│ │                                                                     │ │
│ │ Services:                                                           │ │
│ │ ✓ Location page on main website                                     │ │
│ │ ✓ Google Business Profile                                           │ │
│ │ ✓ Local SEO (25 citations)                                          │ │
│ │ ✓ NeverMiss AI SMS (shared allocation)                              │ │
│ │                                                                     │ │
│ │ Status: ✓ Active — Added Nov 20, 2025                               │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ [+ Add Location] [View Combined Billing]                                │
│                                                                         │
│ ═══════════════════════════════════════════════════════════════════════ │
│                                                                         │
│ YOUR COMMISSION ON THIS CLIENT                                          │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Base Plan (Gold Pro):      $200 upfront + $59.85/mo recurring       │ │
│ │ Location 2 Add-On:         $100 upfront + $29.85/mo recurring       │ │
│ │ Location 3 Add-On:         $100 upfront + $29.85/mo recurring       │ │
│ │ ─────────────────────────────────────────────────────────────────── │ │
│ │ Total from this client:    $400 upfront + $119.55/mo recurring      │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Add Location Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│ + ADD LOCATION: Premier Plumbing                                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ CURRENT PLAN: Gold Pro — $399/mo                                       │
│ EXISTING LOCATIONS: 2 (Dallas, Fort Worth)                              │
│                                                                         │
│ ═══════════════════════════════════════════════════════════════════════ │
│                                                                         │
│ NEW LOCATION DETAILS                                                    │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Business Name:    [Premier Plumbing — Arlington        ]            │ │
│ │ Address:          [789 Elm St                          ]            │ │
│ │ City:             [Arlington    ] State: [TX] Zip: [76010]          │ │
│ │ Phone:            [(555) 345-6789                      ]            │ │
│ │                                                                     │ │
│ │ □ Use separate NeverMiss number (+$29/mo)                           │ │
│ │ ● Share NeverMiss with main location (included)                     │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ PRICING                                                                 │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Extra Location Add-On:              $199/mo                         │ │
│ │ Includes:                                                           │ │
│ │   • Location page on website                                        │ │
│ │   • Google Business Profile setup                                   │ │
│ │   • 25 local citations                                              │ │
│ │   • Shared NeverMiss coverage                                       │ │
│ │                                                                     │ │
│ │ New Monthly Total:                  $797/mo                         │ │
│ │ ($399 base + $199 × 2 add-ons)                                      │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ YOUR COMMISSION                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Upfront (50%):                      $100                            │ │
│ │ Recurring (10% → 15%):              $19.90 → $29.85/mo              │ │
│ │ Max potential:                      $459.15                         │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ [Cancel] [Add Location — $199/mo]                                       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

# 8. REPORTING DASHBOARD

## Overview

Comprehensive reporting for agents and managers. Track sales performance, pipeline health, team rankings, and revenue metrics.

## Location

```
CRM Top Nav → 📈 Reports
Dashboard → Quick Stats widget
```

## Agent Performance Dashboard

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 📈 PERFORMANCE REPORT                              [This Month ▼] [⬇️]  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ SALES SUMMARY                                                           │
│ ┌─────────────────┬─────────────────┬─────────────────┬───────────────┐ │
│ │   DEALS WON     │   REVENUE       │   AVG DEAL      │   WIN RATE    │ │
│ │                 │   (Monthly)     │   SIZE          │               │ │
│ │      24         │   $7,176        │   $299          │   67%         │ │
│ │   +20% vs last  │   +15% vs last  │   +8% vs last   │   +5% vs last │ │
│ └─────────────────┴─────────────────┴─────────────────┴───────────────┘ │
│                                                                         │
│ ═══════════════════════════════════════════════════════════════════════ │
│                                                                         │
│ SALES BY PLAN TRACK                                                     │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Track        │ Deals │ Revenue/mo │ % of Total │ Avg Commission    │ │
│ ├──────────────┼───────┼────────────┼────────────┼───────────────────┤ │
│ │ Gold         │ 6     │ $2,394     │ 33%        │ $200 upfront      │ │
│ │ Blue         │ 8     │ $792       │ 11%        │ $50 upfront       │ │
│ │ Silver       │ 3     │ $897       │ 12%        │ $150 upfront      │ │
│ │ Web          │ 2     │ $498       │ 7%         │ $125 upfront      │ │
│ │ NeverMiss    │ 4     │ $116       │ 2%         │ $15 upfront       │ │
│ │ Local SEO    │ 1     │ $149       │ 2%         │ $75 upfront       │ │
│ │──────────────┼───────┼────────────┼────────────┼───────────────────│ │
│ │ TOTAL        │ 24    │ $7,176     │ 100%       │ $86 avg           │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ SALES TREND (Last 6 Months)                                             │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ 30 ┤                                                    ╭──╮       │ │
│ │ 25 ┤                               ╭──╮          ╭──╮ │  │       │ │
│ │ 20 ┤                    ╭──╮  ╭──╮│  │    ╭──╮│  │ │  │       │ │
│ │ 15 ┤          ╭──╮ ╭──╮│  │╭╯  ╰╯  ╰──╯│  │ │  │ │  │       │ │
│ │ 10 ┤     ╭──╮│  ╰╯  ╰╯  ╰╯            ╰──╯ ╰──╯ ╰──╯       │ │
│ │  5 ┤╭───╯                                                        │ │
│ │  0 ┼────┬────┬────┬────┬────┬────┬────                           │ │
│ │    Jul  Aug  Sep  Oct  Nov  Dec                                   │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ ═══════════════════════════════════════════════════════════════════════ │
│                                                                         │
│ PIPELINE HEALTH                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Stage       │ Leads │ Value      │ Avg Age  │ Conversion          │ │
│ ├─────────────┼───────┼────────────┼──────────┼─────────────────────┤ │
│ │ New         │ 12    │ $4,788     │ 1.5 days │ → Contacted: 85%    │ │
│ │ Contacted   │ 8     │ $3,192     │ 3.2 days │ → Qualified: 62%    │ │
│ │ Qualified   │ 5     │ $2,495     │ 4.1 days │ → Proposal: 80%     │ │
│ │ Proposal    │ 3     │ $1,197     │ 5.8 days │ → Won: 67%          │ │
│ │─────────────┼───────┼────────────┼──────────┼─────────────────────│ │
│ │ Total       │ 28    │ $11,672    │ 3.1 days │ Overall: 67%        │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Lead Source Report

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 📊 LEAD SOURCE ANALYSIS                                   December 2025 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ WHERE DO YOUR LEADS COME FROM?                                          │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Source          │ Leads │ Won  │ Win Rate │ Revenue   │ Cost/Lead  │ │
│ ├─────────────────┼───────┼──────┼──────────┼───────────┼────────────┤ │
│ │ Website Form    │ 18    │ 10   │ 56%      │ $2,990    │ $0         │ │
│ │ Referral        │ 8     │ 7    │ 88%      │ $2,793    │ $0         │ │
│ │ Cold Outreach   │ 12    │ 4    │ 33%      │ $996      │ $15        │ │
│ │ Google Ads      │ 6     │ 2    │ 33%      │ $598      │ $45        │ │
│ │ Social Media    │ 4     │ 1    │ 25%      │ $399      │ $20        │ │
│ │─────────────────┼───────┼──────┼──────────┼───────────┼────────────│ │
│ │ TOTAL           │ 48    │ 24   │ 50%      │ $7,776    │ $12 avg    │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ 💡 INSIGHT: Referrals have 88% win rate — ask happy clients for refs!  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Client Retention Report

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 📊 CLIENT RETENTION                                       December 2025 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ RETENTION OVERVIEW                                                      │
│ ┌─────────────────┬─────────────────┬─────────────────┬───────────────┐ │
│ │   ACTIVE        │   CHURNED       │   RETENTION     │   AVG TENURE  │ │
│ │   CLIENTS       │   THIS MONTH    │   RATE          │               │ │
│ │      68         │       2         │      97%        │   8.4 months  │ │
│ └─────────────────┴─────────────────┴─────────────────┴───────────────┘ │
│                                                                         │
│ CHURN DETAILS                                                           │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Client           │ Plan       │ Tenure  │ Reason        │ Lost Rev  │ │
│ ├──────────────────┼────────────┼─────────┼───────────────┼───────────┤ │
│ │ ABC Contractors  │ Blue Pro   │ 4 mo    │ Went out of   │ $99/mo    │ │
│ │                  │            │         │ business      │           │ │
│ │ Joe's Painting   │ NeverMiss  │ 2 mo    │ Not using     │ $29/mo    │ │
│ │                  │            │         │ the service   │           │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ AT-RISK CLIENTS (No login 14+ days)                                     │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Client           │ Plan       │ Last Login │ Action                 │ │
│ ├──────────────────┼────────────┼────────────┼────────────────────────┤ │
│ │ Smith Electric   │ Blue Pro   │ 18 days    │ [Schedule Check-In]    │ │
│ │ Quick Rooter     │ Gold Start │ 16 days    │ [Schedule Check-In]    │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Team Leaderboard (Manager View)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 🏆 TEAM LEADERBOARD                                      December 2025  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ SALES RANKINGS                                                          │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Rank │ Agent          │ Deals │ Revenue   │ Commission │ vs Goal   │ │
│ ├──────┼────────────────┼───────┼───────────┼────────────┼───────────┤ │
│ │ 🥇 1 │ Sarah Johnson  │ 32    │ $9,568    │ $12,450    │ 124% ✓    │ │
│ │ 🥈 2 │ Mike Chen      │ 28    │ $8,372    │ $10,890    │ 109% ✓    │ │
│ │ 🥉 3 │ Alex Rodriguez │ 24    │ $7,176    │ $9,340     │ 93%       │ │
│ │    4 │ Jordan Lee     │ 22    │ $6,578    │ $8,550     │ 86%       │ │
│ │    5 │ Taylor Kim     │ 18    │ $5,382    │ $7,000     │ 70%       │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ TEAM TOTALS                                                             │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Total Deals: 124    Total Revenue: $37,076/mo    Total Comm: $48,230│ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

# 9. DATABASE SCHEMA

```sql
-- =====================================================
-- NEVERMISS / SMS
-- =====================================================

CREATE TABLE nevermiss_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  caller_phone VARCHAR(20) NOT NULL,
  
  status VARCHAR(20) NOT NULL,  -- 'captured', 'booked', 'no_response', 'in_progress'
  
  lead_name VARCHAR(100),
  lead_service_needed TEXT,
  lead_address TEXT,
  lead_urgency VARCHAR(20),  -- 'emergency', 'soon', 'flexible'
  
  appointment_date TIMESTAMPTZ,
  appointment_notes TEXT,
  
  sms_count INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL,
  last_message_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE nevermiss_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES nevermiss_conversations(id) NOT NULL,
  direction VARCHAR(10) NOT NULL,  -- 'inbound', 'outbound'
  message_text TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE client_sms_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  sms_sent INTEGER DEFAULT 0,
  sms_cap INTEGER NOT NULL,
  leads_captured INTEGER DEFAULT 0,
  appointments_booked INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, period_start)
);

-- =====================================================
-- SALES PIPELINE
-- =====================================================

CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) NOT NULL,
  
  -- Contact info
  company_name VARCHAR(200),
  contact_name VARCHAR(100),
  email VARCHAR(200),
  phone VARCHAR(20),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(50),
  zip VARCHAR(20),
  
  -- Lead details
  source VARCHAR(50),  -- 'website', 'referral', 'cold_outreach', 'google_ads', 'social'
  interested_plan VARCHAR(50),
  interested_track VARCHAR(20),
  estimated_value_cents INTEGER,
  notes TEXT,
  
  -- Pipeline
  stage VARCHAR(20) NOT NULL DEFAULT 'new',  -- 'new', 'contacted', 'qualified', 'proposal', 'won', 'lost'
  stage_changed_at TIMESTAMPTZ DEFAULT NOW(),
  lost_reason VARCHAR(100),
  
  -- Conversion
  converted_client_id UUID REFERENCES clients(id),
  converted_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) NOT NULL,
  agent_id UUID REFERENCES agents(id) NOT NULL,
  
  activity_type VARCHAR(50) NOT NULL,  -- 'call', 'email', 'meeting', 'note', 'stage_change', 'task_completed'
  description TEXT,
  
  -- For calls/meetings
  duration_minutes INTEGER,
  outcome VARCHAR(50),  -- 'connected', 'voicemail', 'no_answer', 'scheduled_followup'
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE lead_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) NOT NULL,
  agent_id UUID REFERENCES agents(id) NOT NULL,
  
  task_type VARCHAR(50) NOT NULL,  -- 'call', 'email', 'demo', 'proposal', 'followup', 'other'
  description TEXT,
  due_date DATE NOT NULL,
  
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- OFFER CODES
-- =====================================================

CREATE TABLE offer_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100),
  description TEXT,
  
  -- Discount details
  discount_type VARCHAR(20) NOT NULL,  -- 'percent_first_month', 'free_trial', 'percent_forever', 'flat_waive'
  discount_value DECIMAL(5,2),
  discount_duration_months INTEGER,  -- For limited-time discounts
  
  -- Restrictions
  applicable_plans TEXT[],  -- NULL = all plans
  requires_approval BOOLEAN DEFAULT false,
  
  -- Limits
  usage_limit INTEGER,  -- NULL = unlimited
  usage_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  
  -- Commission impact
  commission_impact_type VARCHAR(20),  -- 'reduce_upfront', 'reduce_all', 'delay_upfront', 'none'
  commission_impact_value DECIMAL(5,2),
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE offer_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_code_id UUID REFERENCES offer_codes(id) NOT NULL,
  client_id UUID REFERENCES clients(id) NOT NULL,
  agent_id UUID REFERENCES agents(id) NOT NULL,
  subscription_id UUID REFERENCES subscriptions(id),
  
  applied_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ONBOARDING
-- =====================================================

CREATE TABLE onboarding_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_track VARCHAR(20) NOT NULL,  -- 'nevermiss', 'blue', 'web', 'silver', 'gold', 'localseo'
  phase_number INTEGER NOT NULL,
  phase_name VARCHAR(100) NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE onboarding_template_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES onboarding_templates(id) NOT NULL,
  
  task_name VARCHAR(200) NOT NULL,
  task_description TEXT,
  assigned_to VARCHAR(20),  -- 'auto', 'agent', 'client', 'team'
  
  depends_on_task_id UUID REFERENCES onboarding_template_tasks(id),
  estimated_days INTEGER,
  
  display_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE client_onboarding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) NOT NULL,
  
  status VARCHAR(20) NOT NULL DEFAULT 'in_progress',  -- 'in_progress', 'completed', 'stalled'
  progress_percent INTEGER DEFAULT 0,
  
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE client_onboarding_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  onboarding_id UUID REFERENCES client_onboarding(id) NOT NULL,
  template_task_id UUID REFERENCES onboarding_template_tasks(id),
  
  task_name VARCHAR(200) NOT NULL,
  phase_name VARCHAR(100),
  assigned_to VARCHAR(20),
  
  status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- 'pending', 'in_progress', 'completed', 'blocked'
  blocked_reason TEXT,
  
  due_date DATE,
  completed_at TIMESTAMPTZ,
  completed_by VARCHAR(100),
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- DOCUMENTS
-- =====================================================

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id),  -- NULL for templates
  
  document_type VARCHAR(50) NOT NULL,  -- 'agreement', 'feature_sheet', 'proposal', 'intake_form', 'report', 'other'
  category VARCHAR(50),  -- 'agreements', 'onboarding', 'proposals', 'reports', 'other'
  
  name VARCHAR(200) NOT NULL,
  description TEXT,
  
  file_path TEXT NOT NULL,
  file_type VARCHAR(20),  -- 'pdf', 'docx', 'xlsx', 'zip'
  file_size_bytes INTEGER,
  
  is_template BOOLEAN DEFAULT false,
  version VARCHAR(20),
  
  uploaded_by UUID REFERENCES agents(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- MULTI-LOCATION
-- =====================================================

CREATE TABLE client_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) NOT NULL,
  
  is_primary BOOLEAN DEFAULT false,
  
  location_name VARCHAR(200),
  address_line1 VARCHAR(200),
  address_line2 VARCHAR(200),
  city VARCHAR(100),
  state VARCHAR(50),
  zip VARCHAR(20),
  phone VARCHAR(20),
  
  -- NeverMiss
  nevermiss_phone VARCHAR(20),
  shares_nevermiss_with UUID REFERENCES client_locations(id),  -- NULL = own allocation
  
  -- GBP
  gbp_listing_url TEXT,
  gbp_verified BOOLEAN DEFAULT false,
  
  -- Pricing
  is_addon BOOLEAN DEFAULT false,  -- Primary location = false
  addon_price_cents INTEGER,  -- NULL for primary
  
  status VARCHAR(20) DEFAULT 'active',  -- 'active', 'pending', 'inactive'
  added_at TIMESTAMPTZ DEFAULT NOW(),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- REPORTING
-- =====================================================

CREATE TABLE agent_daily_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) NOT NULL,
  stat_date DATE NOT NULL,
  
  leads_created INTEGER DEFAULT 0,
  leads_contacted INTEGER DEFAULT 0,
  leads_qualified INTEGER DEFAULT 0,
  proposals_sent INTEGER DEFAULT 0,
  deals_won INTEGER DEFAULT 0,
  deals_lost INTEGER DEFAULT 0,
  
  revenue_won_cents INTEGER DEFAULT 0,
  commission_earned_cents INTEGER DEFAULT 0,
  
  calls_made INTEGER DEFAULT 0,
  emails_sent INTEGER DEFAULT 0,
  meetings_held INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agent_id, stat_date)
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_conversations_client ON nevermiss_conversations(client_id);
CREATE INDEX idx_conversations_status ON nevermiss_conversations(status);
CREATE INDEX idx_sms_usage_client_period ON client_sms_usage(client_id, period_start);
CREATE INDEX idx_leads_agent ON leads(agent_id);
CREATE INDEX idx_leads_stage ON leads(stage);
CREATE INDEX idx_lead_tasks_due ON lead_tasks(due_date) WHERE NOT is_completed;
CREATE INDEX idx_onboarding_client ON client_onboarding(client_id);
CREATE INDEX idx_onboarding_status ON client_onboarding(status);
CREATE INDEX idx_documents_client ON documents(client_id);
CREATE INDEX idx_locations_client ON client_locations(client_id);
CREATE INDEX idx_daily_stats_agent_date ON agent_daily_stats(agent_id, stat_date);
```

---

# 10. API ENDPOINTS

```typescript
// =====================================================
// NEVERMISS
// =====================================================

GET    /api/nevermiss/dashboard
GET    /api/nevermiss/clients
GET    /api/nevermiss/clients/:clientId
GET    /api/nevermiss/clients/:clientId/conversations
GET    /api/nevermiss/conversations/:conversationId
GET    /api/nevermiss/alerts

// =====================================================
// PIPELINE
// =====================================================

GET    /api/pipeline
GET    /api/pipeline/stats
GET    /api/leads
POST   /api/leads
GET    /api/leads/:leadId
PATCH  /api/leads/:leadId
DELETE /api/leads/:leadId
POST   /api/leads/:leadId/activities
GET    /api/leads/:leadId/activities
POST   /api/leads/:leadId/tasks
PATCH  /api/leads/:leadId/tasks/:taskId
GET    /api/tasks/today
GET    /api/tasks/overdue

// =====================================================
// OFFER CODES
// =====================================================

GET    /api/offers
GET    /api/offers/:code
POST   /api/offers/:code/validate
POST   /api/offers/:code/apply
GET    /api/offers/available?planSlug=gold_pro
POST   /api/offers/request-approval  // For restricted offers

// =====================================================
// ONBOARDING
// =====================================================

GET    /api/onboarding/in-progress
GET    /api/onboarding/clients/:clientId
PATCH  /api/onboarding/clients/:clientId/tasks/:taskId
POST   /api/onboarding/clients/:clientId/notes
GET    /api/onboarding/templates/:track

// =====================================================
// DOCUMENTS
// =====================================================

GET    /api/documents/templates
GET    /api/documents/templates/:category
GET    /api/clients/:clientId/documents
POST   /api/clients/:clientId/documents
DELETE /api/documents/:documentId
GET    /api/documents/:documentId/download

// =====================================================
// SMS USAGE
// =====================================================

GET    /api/sms-usage/overview
GET    /api/sms-usage/clients
GET    /api/sms-usage/clients/:clientId
GET    /api/sms-usage/alerts

// =====================================================
// MULTI-LOCATION
// =====================================================

GET    /api/clients/:clientId/locations
POST   /api/clients/:clientId/locations
PATCH  /api/clients/:clientId/locations/:locationId
DELETE /api/clients/:clientId/locations/:locationId

// =====================================================
// REPORTING
// =====================================================

GET    /api/reports/performance?period=this_month
GET    /api/reports/pipeline-health
GET    /api/reports/lead-sources
GET    /api/reports/retention
GET    /api/reports/team-leaderboard  // Manager only
GET    /api/reports/export?type=performance&format=pdf
```

---

# TESTING CHECKLIST

```
NEVERMISS DASHBOARD:
□ Portfolio summary shows correct totals
□ Client list sorts by SMS usage
□ Conversation detail shows full thread
□ Lead quality breakdown accurate
□ Alerts trigger correctly (near cap, low usage, declining rate)

SALES PIPELINE:
□ Kanban view renders all stages
□ Drag-and-drop moves leads
□ Stage change logs activity
□ Task creation and completion works
□ Overdue tasks highlighted
□ Won leads create client records

OFFER CODES:
□ Available offers show correctly
□ Restricted offers require approval
□ Commission impact calculated correctly
□ Usage limits enforced
□ Expired offers not shown

ONBOARDING:
□ Templates load by plan track
□ Progress percentage calculates
□ Task completion updates progress
□ Blocked tasks show reason
□ Stuck onboarding triggers alerts

DOCUMENTS:
□ Templates downloadable
□ Client documents upload
□ Categories organize correctly
□ Search works

SMS USAGE:
□ Usage totals accurate
□ Soft cap alerts trigger at 80%
□ Over-cap clients highlighted
□ Trend charts render

MULTI-LOCATION:
□ Add location flow works
□ Pricing calculates correctly
□ Shared vs separate NeverMiss works
□ Commission on add-ons correct

REPORTING:
□ All date filters work
□ Sales by track accurate
□ Pipeline health metrics correct
□ Lead source attribution works
□ Export generates valid files
```

---

**Version 5.8 — December 2025**