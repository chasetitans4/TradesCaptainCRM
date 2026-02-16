# TRADES CAPTAIN

## SCREEN & FLOW SPECIFICATIONS

### v1.6 — SOFT LOCK / VERSIONABLE

---

**This document defines specific screens, flows, and features.**

**It can version forward (v1.6 → v1.7 → v2.0) as features evolve.**

For product philosophy and state matrices, see: `TRADES-CAPTAIN-PRODUCT-CONSTITUTION.md`

For design system and implementation constraints, see: `TRADES-CAPTAIN-UI-CONSTRAINTS.md`

---

## DOCUMENT SCOPE

This specification covers:
- **Section A:** Leads
- **Section B:** Quotes + Change Orders
- **Section C:** Invoices + Deposits
- **Section D:** Cross-Entity Flows
- **Section E:** Customer Portal
- **Section F:** Marketing & Growth Features
- **Section G:** Implementation Checklist

All screens inherit design system rules from UI Constraints. All behaviors conform to Product Constitution principles.

---

# SECTION A: LEADS

## A.1 Lead Overview

Leads are potential customers who haven't yet booked a job. The lead flow is: **Capture → Qualify → Convert** (to customer + job) or **Disqualify**.

Leads inherit all design system rules from the master spec. This section defines lead-specific screens and behaviors.

---

## A.2 Lead Stages

| Stage | Meaning | Color (Left Edge) |
|-------|---------|-------------------|
| New | Just captured, not yet contacted | #2563EB (accent blue) |
| Contacted | First outreach made | #0284C7 (info) |
| Qualified | Confirmed need + budget + timeline | #16A34A (success green) |
| Quoted | Quote sent, awaiting response | #D97706 (warning amber) |
| Won | Converted to customer/job | #16A34A (success green) |
| Lost | Declined or unresponsive | #94A3B8 (muted gray) |

---

## A.3 Lead List Screen

### Purpose

Answer: "Which leads need attention?"

### Layout Options

Two views available via toggle:

**List View (Default)**
- Vertical list of lead cards
- Sorted by: Last activity (default), Created date, Lead score
- Filterable by: Stage, Source, Assigned to

**Pipeline View**
- Horizontal columns by stage
- Cards stack vertically within columns
- Drag-to-move between stages (V2 enhancement)

### Lead Card (List View)

```
┌─[Stage Color]─────────────────────────────────────────┐
│ ┌────┐                                                │
│ │ New│  Sarah Chen                      Lead Score    │
│ └────┘                                      ●●●○○     │
│                                                       │
│ Bathroom remodel                          2 days ago  │
│ 📞 (555) 234-5678                                     │
│                                                       │
└───────────────────────────────────────────────────────┘
```

**Card structure:**
- Left edge: 4px stage color indicator
- Status pill: Top-left, stage name
- Primary: Contact name (H3, semibold)
- Lead score: Visual dots (1-5) or hide if not scored
- Secondary: Service interest (body, muted)
- Tertiary: Phone number + time since last activity
- Tap → Lead Detail

### Lead Card (Pipeline View)

Compressed version for column layout:

```
┌───────────────────────────┐
│ Sarah Chen           ●●●○○│
│ Bathroom remodel          │
│ 2d ago                    │
└───────────────────────────┘
```

- No left edge (column provides stage context)
- Name + score on same line
- Service interest
- Time indicator
- Tap → Lead Detail

### Pipeline View Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ Leads                                    [List] [Pipeline]      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  New (4)        Contacted (3)    Qualified (2)    Quoted (1)   │
│ ┌─────────┐    ┌─────────┐      ┌─────────┐      ┌─────────┐   │
│ │ Card    │    │ Card    │      │ Card    │      │ Card    │   │
│ └─────────┘    └─────────┘      └─────────┘      └─────────┘   │
│ ┌─────────┐    ┌─────────┐      ┌─────────┐                    │
│ │ Card    │    │ Card    │      │ Card    │                    │
│ └─────────┘    └─────────┘      └─────────┘                    │
│ ┌─────────┐    ┌─────────┐                                     │
│ │ Card    │    │ Card    │                                     │
│ └─────────┘    └─────────┘                                     │
│ ┌─────────┐                                                    │
│ │ Card    │                                                    │
│ └─────────┘                                                    │
│                                                                 │
│ Won and Lost stages hidden by default (toggle to show)         │
└─────────────────────────────────────────────────────────────────┘
```

- Horizontal scroll if columns exceed viewport
- Column headers show stage name + count
- Won/Lost hidden by default (declutter active pipeline)

### Empty States

**No Leads (List View)**
```
Icon: Simple funnel

Primary: "No leads yet"
Secondary: "New inquiries will appear here. Add your first lead to get started."

CTA: [+ Add Lead] (primary)
```

**No Leads in Stage (Pipeline View)**
```
Primary: "No [stage] leads"

(No CTA - user adds leads globally, not per-stage)
```

**No Leads Match Filter**
```
Primary: "No leads match this filter"
Secondary: "Try adjusting your filters."

CTA: [Clear Filters] (text link)
```

---

## A.4 Lead Detail Screen

### Purpose

Answer: "Who is this lead, and what should I do next?"

### Vertical Structure

1. App Bar
2. Lead Header Card
3. Lead Score (if enabled)
4. Sticky Primary Action Bar
5. Content Tabs

### Lead Header Card

```
┌───────────────────────────────────────────────────────┐
│ ┌──────────┐                                          │
│ │Contacted │                               [📞] [💬]  │
│ └──────────┘                                          │
│                                                       │
│ Sarah Chen                                            │
│ (555) 234-5678                                        │
│ sarah.chen@email.com                                  │
│                                                       │
│ Service Interest                                      │
│ Bathroom remodel                                      │
│                                                       │
│ Source: Google Ads · Created Mar 5                    │
└───────────────────────────────────────────────────────┘
```

- Status pill: Current stage
- Contact actions: Call and Message icons (top-right)
- Name (H2, semibold)
- Phone (tap to call)
- Email (tap to email)
- Service interest (what they're looking for)
- Source + created date (caption, muted)

### Lead Score Section (Optional)

Only show if lead scoring is enabled for this business.

```
┌───────────────────────────────────────────────────────┐
│ Lead Score                                            │
│                                                       │
│ ●●●●○  4/5 — Hot Lead                                │
│                                                       │
│ Budget: Confirmed · Timeline: This month              │
└───────────────────────────────────────────────────────┘
```

- Visual score (filled/empty dots)
- Score label (Cold/Warm/Hot)
- Key qualifiers if captured

### Sticky Primary Action Bar

Single contextual action based on lead stage:

| Stage | CTA Label | Tap Behavior |
|-------|-----------|--------------|
| New | "Mark Contacted" | Transitions to Contacted |
| Contacted | "Mark Qualified" | Opens qualification modal |
| Qualified | "Create Quote" | Opens quote builder with lead info |
| Quoted | "Follow Up" | Opens message composer |
| Won | "View Customer" | Navigates to customer detail |
| Lost | "Reopen Lead" | Transitions back to New |

**Secondary actions (overflow menu):**
- Convert to Customer (any stage except Won)
- Create Job (Qualified+)
- Mark as Lost
- Delete Lead

### Content Tabs

| Tab | Content |
|-----|---------|
| Overview | Service interest, notes, qualifiers, source details |
| Timeline | All activity (calls, messages, stage changes, quotes) |
| Notes | Internal notes about this lead |
| Messages | Conversation history (SMS/email) |

### Timeline Tab Entries

```
┌───────────────────────────────────────────────────────┐
│ Today                                                 │
│                                                       │
│ ○ Quote #1247 sent                         10:30 AM   │
│   Bathroom remodel — $4,500                           │
│                                                       │
│ ○ Stage changed to Quoted                   10:28 AM  │
│   by Mike (auto)                                      │
│                                                       │
│ Yesterday                                             │
│                                                       │
│ ○ Call logged                               3:45 PM   │
│   Discussed timeline, budget confirmed                │
│                                                       │
│ ○ Stage changed to Qualified                3:50 PM   │
│   by Mike                                             │
│                                                       │
│ Mar 5                                                 │
│                                                       │
│ ○ Lead created                              9:15 AM   │
│   Source: Google Ads                                  │
└───────────────────────────────────────────────────────┘
```

---

## A.5 Lead State Matrix

| Stage | Primary CTA | CTA State | Subtext | Secondary Actions |
|-------|-------------|-----------|---------|-------------------|
| New | "Mark Contacted" | Enabled | — | Convert, Create Job, Mark Lost |
| Contacted | "Mark Qualified" | Enabled | — | Convert, Create Job, Mark Lost |
| Qualified | "Create Quote" | Enabled | — | Convert, Create Job, Mark Lost |
| Quoted | "Follow Up" | Enabled | "Quote sent [date]" | Convert, Create Job, Mark Lost, Resend Quote |
| Won | "View Customer" | Enabled | — | — |
| Lost | "Reopen Lead" | Enabled | "Lost: [reason]" | Delete |

---

## A.6 Lead Conversion Flow

When converting a lead to customer + job:

**Step 1: Confirm Customer Creation**
```
┌───────────────────────────────────────────────────────┐
│ Convert Lead                                     [X]  │
├───────────────────────────────────────────────────────┤
│                                                       │
│ Create customer from this lead?                       │
│                                                       │
│ Name: Sarah Chen                                      │
│ Phone: (555) 234-5678                                 │
│ Email: sarah.chen@email.com                           │
│                                                       │
│ [ ] Also create a job                                 │
│                                                       │
│              [Cancel]  [Create Customer]              │
└───────────────────────────────────────────────────────┘
```

**If "Also create a job" checked → Step 2:**
```
┌───────────────────────────────────────────────────────┐
│ Create Job                                       [X]  │
├───────────────────────────────────────────────────────┤
│                                                       │
│ Job Title                                             │
│ ┌───────────────────────────────────────────────────┐ │
│ │ Bathroom remodel                                  │ │
│ └───────────────────────────────────────────────────┘ │
│                                                       │
│ Service Address                                       │
│ ┌───────────────────────────────────────────────────┐ │
│ │ (Enter address)                                   │ │
│ └───────────────────────────────────────────────────┘ │
│                                                       │
│ Schedule                                              │
│ ┌───────────────────────────────────────────────────┐ │
│ │ Select date and time...                           │ │
│ └───────────────────────────────────────────────────┘ │
│                                                       │
│              [Back]  [Create Job]                     │
└───────────────────────────────────────────────────────┘
```

After conversion:
- Lead stage → Won
- Lead links to new customer + job
- Timeline shows conversion event

---

# SECTION B: QUOTES

## B.1 Quote Overview

Quotes are formal price estimates sent to leads or customers. The quote flow is: **Create → Send → Track → Convert** (to job/invoice) or **Expire**.

---

## B.2 Quote Statuses

| Status | Meaning | Color |
|--------|---------|-------|
| Draft | Not yet sent | #94A3B8 (muted gray) |
| Sent | Delivered to customer | #2563EB (accent blue) |
| Viewed | Customer opened it | #0284C7 (info) |
| Accepted | Customer approved | #16A34A (success green) |
| Declined | Customer rejected | #DC2626 (danger red) |
| Expired | Past expiration date | #94A3B8 (muted gray) |

---

## B.3 Quote List Screen

### Purpose

Answer: "Which quotes need attention?"

### Quote Card

```
┌─[Status Color]────────────────────────────────────────┐
│ ┌────┐                                                │
│ │Sent│  Quote #1247                                  │
│ └────┘                                                │
│                                                       │
│ Sarah Chen                                 $4,500.00  │
│ Bathroom remodel                                      │
│                                                       │
│ Sent Mar 8 · Expires Mar 22                           │
└───────────────────────────────────────────────────────┘
```

**Card structure:**
- Left edge: 4px status color
- Status pill: Top-left
- Quote number (H3, semibold)
- Customer name + amount (body, amount semibold)
- Description (muted)
- Sent date + expiration (caption)

### Filters

- Status: All, Draft, Sent, Viewed, Accepted, Declined, Expired
- Date range
- Customer

### Empty States

**No Quotes**
```
Icon: Document with dollar sign

Primary: "No quotes yet"
Secondary: "Create your first quote to send professional estimates to customers."

CTA: [+ Create Quote] (primary)
```

---

## B.4 Quote Detail Screen

### Purpose

Answer: "What's in this quote and what's its status?"

### Vertical Structure

1. App Bar
2. Quote Header
3. Status Banner (if applicable)
4. Sticky Primary Action Bar
5. Line Items
6. Totals
7. Terms & Notes

### Quote Header

```
┌───────────────────────────────────────────────────────┐
│ ┌────────┐                                            │
│ │ Sent   │                              Quote #1247   │
│ └────────┘                                            │
│                                                       │
│ Sarah Chen                                            │
│ sarah.chen@email.com                                  │
│                                                       │
│ Bathroom remodel                                      │
│ 123 Oak Street, Unit 4B                               │
│                                                       │
│ Created Mar 8 · Expires Mar 22                        │
└───────────────────────────────────────────────────────┘
```

### Status Banner

Contextual banner below header for states that need attention:

| Status | Banner |
|--------|--------|
| Draft | (no banner) |
| Sent | (no banner) |
| Viewed | "Customer viewed this quote on [date/time]" (info) |
| Accepted | "Customer accepted on [date]" (success) |
| Declined | "Customer declined on [date]" (danger) |
| Expired | "This quote expired on [date]" (warning) |

### Sticky Primary Action Bar

| Status | CTA Label | Enabled | Subtext | Tap Behavior |
|--------|-----------|---------|---------|--------------|
| Draft | "Send Quote" | Yes | — | Opens send options (SMS/email) |
| Sent | "Resend" | Yes | "Sent [date]" | Resend options |
| Viewed | "Follow Up" | Yes | "Viewed [date]" | Opens message composer |
| Accepted | "Create Job" | Yes | — | Opens job creation with quote data |
| Accepted (job exists) | "Create Invoice" | Yes | — | Opens invoice builder with quote data |
| Declined | "Revise Quote" | Yes | — | Opens quote editor as copy |
| Expired | "Revise Quote" | Yes | — | Opens quote editor as copy |

### Line Items Section

```
┌───────────────────────────────────────────────────────┐
│ Line Items                                            │
├───────────────────────────────────────────────────────┤
│                                                       │
│ Demolition and removal                                │
│ Remove existing fixtures, tile, vanity      $800.00   │
│ 1 × $800.00                                           │
│                                                       │
│ ─────────────────────────────────────────────────     │
│                                                       │
│ Plumbing rough-in                                     │
│ New supply and drain lines                  $1,200.00 │
│ 1 × $1,200.00                                         │
│                                                       │
│ ─────────────────────────────────────────────────     │
│                                                       │
│ Tile installation                                     │
│ Floor and shower tile                       $1,500.00 │
│ 150 sq ft × $10.00/sq ft                              │
│                                                       │
│ ─────────────────────────────────────────────────     │
│                                                       │
│ Fixtures                                              │
│ Vanity, toilet, shower fixtures             $1,000.00 │
│ Materials                                             │
│                                                       │
└───────────────────────────────────────────────────────┘
```

**Line item structure:**
- Name (body, semibold)
- Description (caption, muted)
- Amount (body, semibold, right-aligned)
- Quantity × unit price (caption, muted)

### Totals Section

```
┌───────────────────────────────────────────────────────┐
│                                                       │
│                              Subtotal      $4,500.00  │
│                              Tax (8%)        $360.00  │
│                              ─────────────────────    │
│                              Total         $4,860.00  │
│                                                       │
└───────────────────────────────────────────────────────┘
```

- Right-aligned
- Total row: H3, semibold

### Terms & Notes

```
┌───────────────────────────────────────────────────────┐
│ Terms                                                 │
│                                                       │
│ 50% deposit required to schedule. Balance due upon    │
│ completion. Quote valid for 14 days.                  │
│                                                       │
│ Notes                                                 │
│                                                       │
│ Price assumes standard materials. Premium fixtures    │
│ available at additional cost.                         │
└───────────────────────────────────────────────────────┘
```

---

## B.5 Quote Builder Screen

### Purpose

Create or edit a quote with line items.

### Structure

```
┌───────────────────────────────────────────────────────┐
│ ← New Quote                                    [Save] │
├───────────────────────────────────────────────────────┤
│                                                       │
│ Customer *                                            │
│ ┌───────────────────────────────────────────────────┐ │
│ │ Search or select customer...                    ▼ │ │
│ └───────────────────────────────────────────────────┘ │
│                                                       │
│ Title *                                               │
│ ┌───────────────────────────────────────────────────┐ │
│ │ Bathroom remodel                                  │ │
│ └───────────────────────────────────────────────────┘ │
│                                                       │
│ Service Address                                       │
│ ┌───────────────────────────────────────────────────┐ │
│ │ 123 Oak Street, Unit 4B                           │ │
│ └───────────────────────────────────────────────────┘ │
│                                                       │
│ ─────────────────────────────────────────────────     │
│                                                       │
│ LINE ITEMS                                            │
│                                                       │
│ ┌───────────────────────────────────────────────────┐ │
│ │ Demolition and removal                            │ │
│ │ Remove existing fixtures...          1 × $800.00  │ │
│ │                                          $800.00  │ │
│ │                                    [Edit] [Delete]│ │
│ └───────────────────────────────────────────────────┘ │
│                                                       │
│ ┌───────────────────────────────────────────────────┐ │
│ │ Plumbing rough-in                                 │ │
│ │ New supply and drain...            1 × $1,200.00  │ │
│ │                                        $1,200.00  │ │
│ │                                    [Edit] [Delete]│ │
│ └───────────────────────────────────────────────────┘ │
│                                                       │
│ [+ Add Line Item]  [+ From Saved Services]            │
│                                                       │
│ ─────────────────────────────────────────────────     │
│                                                       │
│                              Subtotal      $2,000.00  │
│                              Tax (8%)        $160.00  │
│                              Total         $2,160.00  │
│                                                       │
│ ─────────────────────────────────────────────────     │
│                                                       │
│ Expiration                                            │
│ ┌───────────────────────────────────────────────────┐ │
│ │ 14 days from send date                          ▼ │ │
│ └───────────────────────────────────────────────────┘ │
│                                                       │
│ Terms                                                 │
│ ┌───────────────────────────────────────────────────┐ │
│ │ 50% deposit required...                           │ │
│ │                                                   │ │
│ └───────────────────────────────────────────────────┘ │
│                                                       │
│ Notes to Customer                                     │
│ ┌───────────────────────────────────────────────────┐ │
│ │ (Optional notes)                                  │ │
│ │                                                   │ │
│ └───────────────────────────────────────────────────┘ │
│                                                       │
└───────────────────────────────────────────────────────┘
│                                                       │
│         [Save as Draft]        [Send Quote]           │
│                                                       │
└───────────────────────────────────────────────────────┘
```

### Add Line Item Modal

```
┌───────────────────────────────────────────────────────┐
│ Add Line Item                                    [X]  │
├───────────────────────────────────────────────────────┤
│                                                       │
│ Name *                                                │
│ ┌───────────────────────────────────────────────────┐ │
│ │ Tile installation                                 │ │
│ └───────────────────────────────────────────────────┘ │
│                                                       │
│ Description                                           │
│ ┌───────────────────────────────────────────────────┐ │
│ │ Floor and shower tile                             │ │
│ └───────────────────────────────────────────────────┘ │
│                                                       │
│ Pricing Type                                          │
│ ┌─────────────────┐ ┌─────────────────┐              │
│ │ ● Fixed Price   │ │ ○ Per Unit      │              │
│ └─────────────────┘ └─────────────────┘              │
│                                                       │
│ Quantity              Price                           │
│ ┌─────────────┐      ┌─────────────────────────────┐ │
│ │ 1           │      │ $1,500.00                   │ │
│ └─────────────┘      └─────────────────────────────┘ │
│                                                       │
│ [ ] Taxable                                           │
│ [ ] Save to services library                          │
│                                                       │
│                       [Cancel]  [Add Item]            │
└───────────────────────────────────────────────────────┘
```

**Per Unit variant:**
- Shows unit label field (sq ft, hours, each)
- Quantity × Unit Price = Line Total

### Saved Services Sheet

```
┌───────────────────────────────────────────────────────┐
│ Saved Services                                   [X]  │
├───────────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────────────┐ │
│ │ 🔍 Search services...                             │ │
│ └───────────────────────────────────────────────────┘ │
│                                                       │
│ PLUMBING                                              │
│                                                       │
│ ┌───────────────────────────────────────────────────┐ │
│ │ Drain cleaning                          $150.00   │ │
│ │ Standard drain cleaning service                   │ │
│ └───────────────────────────────────────────────────┘ │
│                                                       │
│ ┌───────────────────────────────────────────────────┐ │
│ │ Water heater flush                      $125.00   │ │
│ │ Flush and inspect water heater                    │ │
│ └───────────────────────────────────────────────────┘ │
│                                                       │
│ ELECTRICAL                                            │
│                                                       │
│ ┌───────────────────────────────────────────────────┐ │
│ │ Outlet installation                      $85.00   │ │
│ │ Install standard electrical outlet                │ │
│ └───────────────────────────────────────────────────┘ │
│                                                       │
└───────────────────────────────────────────────────────┘
```

- Tap service → adds to quote with default values
- User can edit after adding

---

## B.6 Send Quote Flow

When user taps "Send Quote":

```
┌───────────────────────────────────────────────────────┐
│ Send Quote                                       [X]  │
├───────────────────────────────────────────────────────┤
│                                                       │
│ Send to Sarah Chen                                    │
│                                                       │
│ ┌───────────────────────────────────────────────────┐ │
│ │ 📱  Send by text message                          │ │
│ │     (555) 234-5678                                │ │
│ └───────────────────────────────────────────────────┘ │
│                                                       │
│ ┌───────────────────────────────────────────────────┐ │
│ │ ✉️  Send by email                                  │ │
│ │     sarah.chen@email.com                          │ │
│ └───────────────────────────────────────────────────┘ │
│                                                       │
│ ┌───────────────────────────────────────────────────┐ │
│ │ 🔗  Copy link                                      │ │
│ │     Share quote link manually                     │ │
│ └───────────────────────────────────────────────────┘ │
│                                                       │
│ Message preview:                                      │
│ ┌───────────────────────────────────────────────────┐ │
│ │ Hi Sarah, here's your quote for Bathroom remodel  │ │
│ │ from [Business Name]: [link]                      │ │
│ │                                              Edit │ │
│ └───────────────────────────────────────────────────┘ │
│                                                       │
└───────────────────────────────────────────────────────┘
```

---

## B.7 Change Orders

Change orders handle scope changes after a quote has been accepted and a job created. This is critical for construction and remodeling trades where scope creep is common.

### When to Use Change Orders

| Scenario | Action |
|----------|--------|
| Customer wants additional work | Create change order |
| Unexpected issues discovered | Create change order |
| Customer removes scope | Create change order (negative amount) |
| Completely different job | Create new quote instead |

### Change Order vs New Quote

- **Change Order**: Linked to existing accepted quote, shows delta
- **New Quote**: Standalone, for unrelated work

### Creating a Change Order

From Job Detail (Overview tab) or from the linked Quote:

```
┌───────────────────────────────────────────────────────┐
│ Create Change Order                              [X]  │
├───────────────────────────────────────────────────────┤
│                                                       │
│ Original Quote #1247                       $4,860.00  │
│ Bathroom remodel — Sarah Chen                         │
│                                                       │
│ ─────────────────────────────────────────────────     │
│                                                       │
│ CHANGE ORDER ITEMS                                    │
│                                                       │
│ ┌───────────────────────────────────────────────────┐ │
│ │ Upgrade to premium fixtures               $650.00 │ │
│ │ Customer requested Kohler instead of standard     │ │
│ │                                    [Edit] [Delete]│ │
│ └───────────────────────────────────────────────────┘ │
│                                                       │
│ ┌───────────────────────────────────────────────────┐ │
│ │ Additional tile work                      $380.00 │ │
│ │ Extend tile to ceiling per customer request       │ │
│ │                                    [Edit] [Delete]│ │
│ └───────────────────────────────────────────────────┘ │
│                                                       │
│ [+ Add Item]                                          │
│                                                       │
│ ─────────────────────────────────────────────────     │
│                                                       │
│ Reason for Change                                     │
│ ┌───────────────────────────────────────────────────┐ │
│ │ Customer upgrades after seeing showroom           │ │
│ └───────────────────────────────────────────────────┘ │
│                                                       │
│ ─────────────────────────────────────────────────     │
│                                                       │
│                     Original Quote         $4,860.00  │
│                     This Change Order     +$1,030.00  │
│                     ─────────────────────────────     │
│                     New Total              $5,890.00  │
│                                                       │
│             [Save as Draft]  [Send for Approval]      │
└───────────────────────────────────────────────────────┘
```

### Change Order Statuses

| Status | Meaning |
|--------|---------|
| Draft | Not yet sent |
| Pending | Sent, awaiting customer approval |
| Approved | Customer accepted |
| Declined | Customer rejected |

### Change Order Approval Flow

Customer receives SMS/email with change order link:

```
┌───────────────────────────────────────────────────────┐
│ Change Order                                          │
│ From: [Business Name]                                 │
├───────────────────────────────────────────────────────┤
│                                                       │
│ Hi Sarah,                                             │
│                                                       │
│ We'd like to make some changes to your project:       │
│                                                       │
│ ORIGINAL QUOTE                             $4,860.00  │
│ Bathroom remodel                                      │
│                                                       │
│ PROPOSED CHANGES                          +$1,030.00  │
│ • Upgrade to premium fixtures               $650.00   │
│ • Additional tile work                      $380.00   │
│                                                       │
│ Reason: Customer upgrades after seeing showroom       │
│                                                       │
│ NEW TOTAL                                  $5,890.00  │
│                                                       │
│ ┌─────────────────┐    ┌─────────────────┐           │
│ │    Decline      │    │    Approve      │           │
│ └─────────────────┘    └─────────────────┘           │
│                                                       │
└───────────────────────────────────────────────────────┘
```

### Impact on Job and Invoice

**When Change Order Approved:**
- Job total updates automatically
- Linked quote shows change order history
- Final invoice includes all approved changes

**Quote Detail with Change Orders:**

```
┌───────────────────────────────────────────────────────┐
│ Quote #1247                                           │
│ Bathroom remodel — Sarah Chen                         │
├───────────────────────────────────────────────────────┤
│                                                       │
│ ORIGINAL QUOTE                             $4,860.00  │
│ (Accepted Mar 10)                                     │
│                                                       │
│ CHANGE ORDER #1                           +$1,030.00  │
│ (Approved Mar 18)                                     │
│ • Upgrade to premium fixtures               $650.00   │
│ • Additional tile work                      $380.00   │
│                                                       │
│ ─────────────────────────────────────────────────     │
│                                                       │
│ CURRENT TOTAL                              $5,890.00  │
│                                                       │
│                              [+ Add Change Order]     │
└───────────────────────────────────────────────────────┘
```

### Negative Change Orders (Scope Reduction)

If customer removes scope:

```
│ CHANGE ORDER #2                            -$500.00   │
│ (Approved Mar 20)                                     │
│ • Remove heated floor (customer budget)    -$500.00   │
```

Total adjusts downward.

---

# SECTION C: INVOICES

## C.1 Invoice Overview

Invoices are payment requests sent to customers. The invoice flow is: **Create → Send → Track → Collect** or **Write Off**.

Invoices can be created:
- From scratch
- From an accepted quote
- From a completed job

---

## C.2 Invoice Statuses

| Status | Meaning | Color |
|--------|---------|-------|
| Draft | Not yet sent | #94A3B8 (muted gray) |
| Sent | Delivered to customer | #2563EB (accent blue) |
| Viewed | Customer opened it | #0284C7 (info) |
| Partial | Partially paid | #D97706 (warning amber) |
| Paid | Fully paid | #16A34A (success green) |
| Overdue | Past due date | #DC2626 (danger red) |
| Void | Cancelled | #94A3B8 (muted gray) |

---

## C.3 Invoice List Screen

### Invoice Card

```
┌─[Status Color]────────────────────────────────────────┐
│ ┌──────┐                                              │
│ │ Sent │  Invoice #10042                             │
│ └──────┘                                              │
│                                                       │
│ Sarah Chen                                 $4,860.00  │
│ Bathroom remodel                                      │
│                                                       │
│ Sent Mar 15 · Due Mar 30                              │
└───────────────────────────────────────────────────────┘
```

**Overdue variant:**
```
┌─[Red]─────────────────────────────────────────────────┐
│ ┌───────┐                                             │
│ │Overdue│  Invoice #10042                            │
│ └───────┘                                             │
│                                                       │
│ Sarah Chen                                 $4,860.00  │
│ Bathroom remodel                                      │
│                                                       │
│ Due Mar 30 · 5 days overdue                           │
└───────────────────────────────────────────────────────┘
```

**Partial payment variant:**
```
┌─[Amber]───────────────────────────────────────────────┐
│ ┌───────┐                                             │
│ │Partial│  Invoice #10042                            │
│ └───────┘                                             │
│                                                       │
│ Sarah Chen                      $2,430.00 of $4,860   │
│ Bathroom remodel                          remaining   │
│                                                       │
│ Sent Mar 15 · Due Mar 30                              │
└───────────────────────────────────────────────────────┘
```

### Filters

- Status: All, Draft, Sent, Overdue, Partial, Paid
- Date range
- Customer

### Summary Bar (Top of List)

```
┌───────────────────────────────────────────────────────┐
│                                                       │
│ Outstanding          Overdue            Paid (30d)    │
│ $12,450.00          $2,860.00           $34,200.00   │
│ 8 invoices          2 invoices          23 invoices   │
│                                                       │
└───────────────────────────────────────────────────────┘
```

- All amounts semibold
- Overdue amount in danger red

---

## C.4 Invoice Detail Screen

### Vertical Structure

1. App Bar
2. Invoice Header
3. Status Banner (if applicable)
4. Payment Progress (if partial)
5. Sticky Primary Action Bar
6. Line Items
7. Totals
8. Payment History
9. Terms

### Invoice Header

```
┌───────────────────────────────────────────────────────┐
│ ┌────────┐                                            │
│ │  Sent  │                            Invoice #10042  │
│ └────────┘                                            │
│                                                       │
│ Sarah Chen                                            │
│ 123 Oak Street, Unit 4B                               │
│                                                       │
│ Bathroom remodel                                      │
│                                                       │
│ Issued Mar 15 · Due Mar 30                            │
└───────────────────────────────────────────────────────┘
```

### Status Banners

| Status | Banner |
|--------|--------|
| Viewed | "Customer viewed on [date]" (info) |
| Partial | "Partially paid — $X remaining" (warning) |
| Paid | "Paid in full on [date]" (success) |
| Overdue | "X days overdue" (danger) |
| Void | "This invoice was voided" (muted) |

### Payment Progress (Partial Only)

```
┌───────────────────────────────────────────────────────┐
│ Payment Progress                                      │
│                                                       │
│ ████████████░░░░░░░░░░░░░  50%                       │
│                                                       │
│ $2,430.00 paid · $2,430.00 remaining                 │
└───────────────────────────────────────────────────────┘
```

### Sticky Primary Action Bar

| Status | CTA Label | Enabled | Subtext | Tap Behavior |
|--------|-----------|---------|---------|--------------|
| Draft | "Send Invoice" | Yes | — | Opens send options |
| Sent | "Collect Payment" | Yes | "$X due" | Opens payment collection |
| Viewed | "Collect Payment" | Yes | "Viewed [date]" | Opens payment collection |
| Partial | "Collect Remaining" | Yes | "$X remaining" | Opens payment with balance |
| Overdue | "Collect Payment" | Yes | "X days overdue" | Opens payment collection |
| Paid | "View Receipt" | Yes | — | Shows receipt view |
| Void | (no CTA) | — | — | — |

**Secondary actions:**
- Resend Invoice
- Send Reminder
- Mark as Paid (manual)
- Record Partial Payment
- Void Invoice
- Download PDF

### Line Items

(Same format as Quote Detail)

### Totals

```
┌───────────────────────────────────────────────────────┐
│                                                       │
│                              Subtotal      $4,500.00  │
│                              Tax (8%)        $360.00  │
│                              ─────────────────────    │
│                              Total         $4,860.00  │
│                              Paid          $2,430.00  │
│                              ─────────────────────    │
│                              Balance Due   $2,430.00  │
│                                                       │
└───────────────────────────────────────────────────────┘
```

- Balance Due in H3, semibold
- If overdue, Balance Due in danger red

### Payment History

```
┌───────────────────────────────────────────────────────┐
│ Payment History                                       │
├───────────────────────────────────────────────────────┤
│                                                       │
│ Mar 20                                                │
│ ● Card payment (Visa •••• 4242)            $2,430.00  │
│   via Stripe                                          │
│                                                       │
│ (No more payments)                                    │
│                                                       │
└───────────────────────────────────────────────────────┘
```

---

## C.5 Invoice Builder Screen

Nearly identical to Quote Builder with these differences:

- Title: "New Invoice" instead of "New Quote"
- Due date instead of Expiration
- Payment terms dropdown (Due on receipt, Net 15, Net 30, Custom)
- Option to create from existing quote (pre-fills line items)
- Option to create from job (pre-fills job details)

### Due Date Section

```
│ Due Date                                              │
│ ┌───────────────────────────────────────────────────┐ │
│ │ Net 30                                          ▼ │ │
│ └───────────────────────────────────────────────────┘ │
│   Due: March 30, 2024                                 │
```

Options: Due on receipt, Net 7, Net 15, Net 30, Net 60, Custom date

---

## C.6 Payment Collection Flow

### Option 1: Send Payment Link (Primary)

Customer pays via Stripe-hosted page.

```
┌───────────────────────────────────────────────────────┐
│ Collect Payment                                  [X]  │
├───────────────────────────────────────────────────────┤
│                                                       │
│ Invoice #10042                                        │
│ Balance due: $2,430.00                               │
│                                                       │
│ ─────────────────────────────────────────────────     │
│                                                       │
│ ┌───────────────────────────────────────────────────┐ │
│ │ 📱  Send payment link by text                     │ │
│ │     Customer pays online via card                 │ │
│ └───────────────────────────────────────────────────┘ │
│                                                       │
│ ┌───────────────────────────────────────────────────┐ │
│ │ ✉️  Send payment link by email                     │ │
│ │     Customer pays online via card                 │ │
│ └───────────────────────────────────────────────────┘ │
│                                                       │
│ ─────────────────────────────────────────────────     │
│                                                       │
│ ┌───────────────────────────────────────────────────┐ │
│ │ 💵  Record manual payment                          │ │
│ │     Cash, check, or other method                  │ │
│ └───────────────────────────────────────────────────┘ │
│                                                       │
└───────────────────────────────────────────────────────┘
```

### Option 2: Record Manual Payment

```
┌───────────────────────────────────────────────────────┐
│ Record Payment                                   [X]  │
├───────────────────────────────────────────────────────┤
│                                                       │
│ Amount                                                │
│ ┌───────────────────────────────────────────────────┐ │
│ │ $2,430.00                                         │ │
│ └───────────────────────────────────────────────────┘ │
│ Balance due: $2,430.00      [Pay in Full]            │
│                                                       │
│ Payment Method                                        │
│ ┌───────────────────────────────────────────────────┐ │
│ │ Cash                                            ▼ │ │
│ └───────────────────────────────────────────────────┘ │
│                                                       │
│ Payment Date                                          │
│ ┌───────────────────────────────────────────────────┐ │
│ │ Today, Mar 20                                   ▼ │ │
│ └───────────────────────────────────────────────────┘ │
│                                                       │
│ Reference / Notes                                     │
│ ┌───────────────────────────────────────────────────┐ │
│ │ Check #1234                                       │ │
│ └───────────────────────────────────────────────────┘ │
│                                                       │
│                        [Cancel]  [Record Payment]     │
└───────────────────────────────────────────────────────┘
```

Payment methods: Cash, Check, Bank Transfer, Card (manual), Other

---

## C.7 Invoice State Matrix

| Status | Primary CTA | Subtext | Secondary Actions |
|--------|-------------|---------|-------------------|
| Draft | "Send Invoice" | — | Preview, Delete |
| Sent | "Collect Payment" | "$X due" | Resend, Remind, Mark Paid, Void |
| Viewed | "Collect Payment" | "Viewed [date]" | Resend, Remind, Mark Paid, Void |
| Partial | "Collect Remaining" | "$X of $Y remaining" | Resend, Remind, Record Payment, Void |
| Overdue | "Collect Payment" | "X days overdue" | Resend, Remind, Mark Paid, Void |
| Paid | "View Receipt" | "Paid [date]" | Download PDF, Send Receipt |
| Void | — | "Voided" | Delete |

---

## C.8 Deposit Invoice Flow

For trades where deposits are standard (construction, large projects), Trades Captain supports a deposit workflow.

### When Deposits Apply

Configurable per business in Settings:
- Enable/disable deposit requests
- Default deposit percentage (e.g., 50%)
- Deposit required before scheduling (toggle)

### Flow

```
Quote Accepted
     │
     ▼
┌─────────────────────────────────────────────┐
│ Quote #1247 accepted!                       │
│                                             │
│ Total: $4,860.00                           │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ [✓] Request deposit before scheduling   │ │
│ │                                         │ │
│ │ Deposit amount                          │ │
│ │ ┌─────────────────────────────────────┐ │ │
│ │ │ 50%                              ▼  │ │ │
│ │ └─────────────────────────────────────┘ │ │
│ │                                         │ │
│ │ Deposit: $2,430.00                      │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│        [Skip Deposit]  [Send Deposit Invoice]│
└─────────────────────────────────────────────┘
```

### Deposit Invoice

A deposit invoice is a special invoice type:

```
┌───────────────────────────────────────────────────────┐
│ ┌───────────┐                                         │
│ │  Deposit  │                       Invoice #10042-D  │
│ └───────────┘                                         │
│                                                       │
│ Sarah Chen                                            │
│ Bathroom remodel (Deposit)                            │
│                                                       │
│ ─────────────────────────────────────────────────     │
│                                                       │
│ Deposit for Quote #1247                    $2,430.00  │
│ 50% of $4,860.00 total                                │
│                                                       │
│ ─────────────────────────────────────────────────     │
│                                                       │
│                              Total Due     $2,430.00  │
│                                                       │
└───────────────────────────────────────────────────────┘
```

- Status pill shows "Deposit" instead of regular status
- Invoice number includes "-D" suffix
- Line item references the quote
- Shows percentage and total context

### Job Gating (Optional)

If "Deposit required before scheduling" is enabled:

**Job cannot transition to "On My Way" until deposit is paid.**

```
┌───────────────────────────────────────────────────────┐
│ ┌──────────┐                                          │
│ │Scheduled │                              Job #148    │
│ └──────────┘                                          │
│                                                       │
│ Bathroom remodel                                      │
│ Sarah Chen                                            │
│                                                       │
│ ⚠️ Deposit required                                   │
│    $2,430 deposit unpaid                              │
│                                                       │
├───────────────────────────────────────────────────────┤
│                                                       │
│            [Collect Deposit]  (disabled: On My Way)   │
│                                                       │
└───────────────────────────────────────────────────────┘
```

- Primary CTA becomes "Collect Deposit"
- "On My Way" button disabled with subtext
- Once deposit paid, normal job flow resumes

### Final Invoice

When job completes, final invoice shows:

```
│ Line Items                                            │
│                                                       │
│ Bathroom remodel (per quote)               $4,860.00  │
│                                                       │
│ ─────────────────────────────────────────────────     │
│                                                       │
│                              Subtotal      $4,860.00  │
│                              Deposit Paid  -$2,430.00 │
│                              ─────────────────────    │
│                              Balance Due   $2,430.00  │
│                                                       │
```

Deposit is shown as credit against total.

---

# SECTION D: CROSS-ENTITY FLOWS

## D.1 Lead → Quote → Job → Invoice

The complete conversion flow:

```
┌─────────┐      ┌─────────┐      ┌─────────┐      ┌─────────┐
│  Lead   │ ───► │  Quote  │ ───► │   Job   │ ───► │ Invoice │
│         │      │         │      │         │      │         │
│ New     │      │ Draft   │      │Scheduled│      │ Draft   │
│    ↓    │      │    ↓    │      │    ↓    │      │    ↓    │
│Contacted│      │ Sent    │      │ On Site │      │ Sent    │
│    ↓    │      │    ↓    │      │    ↓    │      │    ↓    │
│Qualified│      │ Viewed  │      │Completed│      │ Paid    │
│    ↓    │      │    ↓    │      │    ↓    │      │         │
│ Quoted  │◄─────│Accepted │      │  Paid   │◄─────│         │
│    ↓    │      │         │      │         │      │         │
│  Won    │      │         │      │         │      │         │
└─────────┘      └─────────┘      └─────────┘      └─────────┘
```

### Key Transitions

**Lead → Quote**
- "Create Quote" on Qualified lead
- Quote pre-fills: customer name, contact info, service interest
- Lead status → Quoted (auto when quote sent)

**Quote → Job**
- "Create Job" on Accepted quote
- Job pre-fills: customer, title, service address, quote amount
- Quote links to job

**Job → Invoice**
- "Send Invoice" on Completed job (from Job Detail CTA)
- Invoice pre-fills: customer, job details, line items from quote (if linked)
- Job links to invoice

**Invoice → Job Paid**
- When invoice status → Paid
- Linked job status → Paid (auto)

---

## D.2 Linked Entity Indicators

When viewing a lead, quote, job, or invoice that's linked to other entities:

**On Lead Detail:**
```
┌───────────────────────────────────────────────────────┐
│ Linked                                                │
│                                                       │
│ Quote #1247 — Sent                         $4,860.00  │
│                                                    →  │
└───────────────────────────────────────────────────────┘
```

**On Quote Detail:**
```
┌───────────────────────────────────────────────────────┐
│ Linked                                                │
│                                                       │
│ Lead — Sarah Chen (Won)                            →  │
│ Job #148 — Scheduled Mar 22                        →  │
└───────────────────────────────────────────────────────┘
```

**On Job Detail (Overview Tab):**
```
┌───────────────────────────────────────────────────────┐
│ Linked                                                │
│                                                       │
│ Quote #1247 — Accepted                     $4,860.00  │
│                                                    →  │
│ Invoice #10042 — Sent                      $4,860.00  │
│                                                    →  │
└───────────────────────────────────────────────────────┘
```

Tap → navigates to linked entity.

---

# SECTION E: CUSTOMER PORTAL

## E.1 Overview

The Customer Portal is a customer-facing web app that allows customers to self-serve common tasks: book services, view/approve quotes, pay invoices, and track job status.

This reduces phone calls, creates a professional impression, and accelerates payment collection.

### Access Method

Customers access via magic link (no password):
1. Customer receives SMS/email with link
2. Link contains secure token
3. Token validates and logs customer in
4. Session persists for 30 days

No username/password required. This matches customer expectations for service businesses.

---

## E.2 Customer Portal Navigation

```
┌───────────────────────────────────────────────────────┐
│ [Business Logo]                    Hi, Sarah ▼        │
├───────────────────────────────────────────────────────┤
│                                                       │
│   ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐ │
│   │  Home   │  │  Jobs   │  │ Quotes  │  │Invoices │ │
│   └────┬────┘  └─────────┘  └─────────┘  └─────────┘ │
│        │                                              │
│ (Content below)                                       │
│                                                       │
└───────────────────────────────────────────────────────┘
```

Simpler navigation than internal CRM. Four sections only.

---

## E.3 Customer Home Screen

```
┌───────────────────────────────────────────────────────┐
│ Welcome back, Sarah                                   │
├───────────────────────────────────────────────────────┤
│                                                       │
│ UPCOMING                                              │
│ ┌───────────────────────────────────────────────────┐ │
│ │ Bathroom Remodel                                  │ │
│ │ Thursday, Mar 14 · 9:00 AM - 12:00 PM            │ │
│ │ Lewis will be your technician                     │ │
│ │                                                   │ │
│ │              [Get Directions]  [Reschedule]       │ │
│ └───────────────────────────────────────────────────┘ │
│                                                       │
│ ACTION NEEDED                                         │
│ ┌───────────────────────────────────────────────────┐ │
│ │ ⚠️ Quote awaiting approval              $5,890.00 │ │
│ │    HVAC Replacement                               │ │
│ │                                    [View Quote →] │ │
│ └───────────────────────────────────────────────────┘ │
│                                                       │
│ ┌───────────────────────────────────────────────────┐ │
│ │ ⚠️ Invoice due                          $2,430.00 │ │
│ │    Bathroom Remodel (Balance)                     │ │
│ │                                     [Pay Now →]   │ │
│ └───────────────────────────────────────────────────┘ │
│                                                       │
│ NEED SERVICE?                                         │
│ ┌───────────────────────────────────────────────────┐ │
│ │          [Request New Service]                    │ │
│ └───────────────────────────────────────────────────┘ │
│                                                       │
└───────────────────────────────────────────────────────┘
```

Home screen shows:
- Upcoming appointments
- Items needing action (quotes to approve, invoices to pay)
- Quick booking CTA

---

## E.4 Online Booking Widget

### Embeddable Widget

A booking widget that contractors can embed on their website:

```html
<script src="https://app.tradescaptain.com/widget.js" 
        data-business="abc123"></script>
<div id="trades-captain-booking"></div>
```

### Booking Flow (Widget or Portal)

**Step 1: Service Selection**

```
┌───────────────────────────────────────────────────────┐
│ Request Service                                       │
├───────────────────────────────────────────────────────┤
│                                                       │
│ What do you need help with?                           │
│                                                       │
│ ┌───────────────────────────────────────────────────┐ │
│ │ ○ Plumbing                                        │ │
│ │ ○ HVAC                                            │ │
│ │ ○ Electrical                                      │ │
│ │ ○ General Repair                                  │ │
│ │ ○ Other / Not Sure                                │ │
│ └───────────────────────────────────────────────────┘ │
│                                                       │
│ Describe the issue (optional)                         │
│ ┌───────────────────────────────────────────────────┐ │
│ │ Bathroom sink is draining slowly...               │ │
│ │                                                   │ │
│ └───────────────────────────────────────────────────┘ │
│                                                       │
│                                         [Continue →]  │
└───────────────────────────────────────────────────────┘
```

**Step 2: Date/Time Selection**

```
┌───────────────────────────────────────────────────────┐
│ Request Service                              Step 2/4 │
├───────────────────────────────────────────────────────┤
│                                                       │
│ When works for you?                                   │
│                                                       │
│ ◄  March 2024  ►                                     │
│                                                       │
│  Sun   Mon   Tue   Wed   Thu   Fri   Sat             │
│                          [13]  14    15              │
│   16    17   [18]   19   [20]  21    22              │
│                                                       │
│ [13] = Available slots                                │
│                                                       │
│ Available times for Wed, Mar 13:                      │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐                  │
│ │ 9:00 AM │ │11:00 AM │ │ 2:00 PM │                  │
│ └─────────┘ └─────────┘ └─────────┘                  │
│                                                       │
│                              [← Back]  [Continue →]   │
└───────────────────────────────────────────────────────┘
```

- Shows only available days (based on business calendar)
- Time slots based on service duration and technician availability

**Step 3: Contact Information**

```
┌───────────────────────────────────────────────────────┐
│ Request Service                              Step 3/4 │
├───────────────────────────────────────────────────────┤
│                                                       │
│ Your Information                                      │
│                                                       │
│ Name *                                                │
│ ┌───────────────────────────────────────────────────┐ │
│ │ Sarah Chen                                        │ │
│ └───────────────────────────────────────────────────┘ │
│                                                       │
│ Phone *                                               │
│ ┌───────────────────────────────────────────────────┐ │
│ │ (555) 234-5678                                    │ │
│ └───────────────────────────────────────────────────┘ │
│                                                       │
│ Email                                                 │
│ ┌───────────────────────────────────────────────────┐ │
│ │ sarah.chen@email.com                              │ │
│ └───────────────────────────────────────────────────┘ │
│                                                       │
│ Service Address *                                     │
│ ┌───────────────────────────────────────────────────┐ │
│ │ 123 Oak Street, Unit 4B                           │ │
│ │ Portland, OR 97201                                │ │
│ └───────────────────────────────────────────────────┘ │
│                                                       │
│                              [← Back]  [Continue →]   │
└───────────────────────────────────────────────────────┘
```

**Step 4: Confirmation**

```
┌───────────────────────────────────────────────────────┐
│ Request Service                              Step 4/4 │
├───────────────────────────────────────────────────────┤
│                                                       │
│ ✓ Request Submitted!                                  │
│                                                       │
│ ┌───────────────────────────────────────────────────┐ │
│ │ Plumbing Service                                  │ │
│ │ Wednesday, Mar 13 · 9:00 AM                       │ │
│ │ 123 Oak Street, Unit 4B                           │ │
│ │                                                   │ │
│ │ We'll confirm your appointment shortly.           │ │
│ └───────────────────────────────────────────────────┘ │
│                                                       │
│ A confirmation will be sent to:                       │
│ (555) 234-5678                                        │
│ sarah.chen@email.com                                  │
│                                                       │
│                              [Done]                   │
└───────────────────────────────────────────────────────┘
```

### What Happens in CRM

Booking creates a **Lead** (not a Job) with:
- Source: "Online Booking"
- Stage: "New"
- Preferred date/time attached
- Service type noted

Business owner/dispatcher reviews and confirms, creating the actual Job.

---

## E.5 Quote Approval (Customer View)

When customer receives quote link:

```
┌───────────────────────────────────────────────────────┐
│ [Business Logo]                                       │
│ Quote for Sarah Chen                                  │
├───────────────────────────────────────────────────────┤
│                                                       │
│ Bathroom Remodel                                      │
│ 123 Oak Street, Unit 4B                               │
│                                                       │
│ Prepared: March 8, 2024                               │
│ Valid until: March 22, 2024                           │
│                                                       │
│ ─────────────────────────────────────────────────     │
│                                                       │
│ Demolition and removal                      $800.00   │
│ Remove existing fixtures, tile, vanity                │
│                                                       │
│ Plumbing rough-in                         $1,200.00   │
│ New supply and drain lines                            │
│                                                       │
│ Tile installation                         $1,500.00   │
│ Floor and shower tile (150 sq ft)                     │
│                                                       │
│ Fixtures                                  $1,000.00   │
│ Vanity, toilet, shower fixtures                       │
│                                                       │
│ ─────────────────────────────────────────────────     │
│                                                       │
│                              Subtotal      $4,500.00  │
│                              Tax (8%)        $360.00  │
│                              ─────────────────────    │
│                              Total         $4,860.00  │
│                                                       │
│ ─────────────────────────────────────────────────     │
│                                                       │
│ Terms: 50% deposit required to schedule.              │
│ Balance due upon completion.                          │
│                                                       │
│ ┌─────────────────────────────────────────────────┐   │
│ │                                                 │   │
│ │     [Decline]              [Accept Quote]       │   │
│ │                                                 │   │
│ └─────────────────────────────────────────────────┘   │
│                                                       │
│ Questions? Call (555) 123-4567                        │
│                                                       │
└───────────────────────────────────────────────────────┘
```

### Accept Flow

```
┌───────────────────────────────────────────────────────┐
│ Accept Quote                                          │
├───────────────────────────────────────────────────────┤
│                                                       │
│ By accepting, you agree to the terms above.           │
│                                                       │
│ Your signature                                        │
│ ┌───────────────────────────────────────────────────┐ │
│ │                                                   │ │
│ │     [Signature capture area]                      │ │
│ │                                                   │ │
│ └───────────────────────────────────────────────────┘ │
│                                                       │
│ ┌───────────────────────────────────────────────────┐ │
│ │ [✓] I agree to the terms and conditions          │ │
│ └───────────────────────────────────────────────────┘ │
│                                                       │
│                    [Cancel]  [Accept & Sign]          │
└───────────────────────────────────────────────────────┘
```

After acceptance:
- Quote status → Accepted
- Customer sees confirmation with next steps
- If deposit required, immediately shows deposit payment option

---

## E.6 Invoice Payment (Customer View)

```
┌───────────────────────────────────────────────────────┐
│ [Business Logo]                                       │
│ Invoice #10042                                        │
├───────────────────────────────────────────────────────┤
│                                                       │
│ Bathroom Remodel                                      │
│ Completed: March 20, 2024                             │
│                                                       │
│ ─────────────────────────────────────────────────     │
│                                                       │
│ Services rendered per Quote #1247          $4,860.00  │
│                                                       │
│ ─────────────────────────────────────────────────     │
│                                                       │
│                              Total         $4,860.00  │
│                              Deposit Paid  -$2,430.00 │
│                              ─────────────────────    │
│                              Balance Due   $2,430.00  │
│                                                       │
│ Due: March 25, 2024                                   │
│                                                       │
│ ┌─────────────────────────────────────────────────┐   │
│ │                                                 │   │
│ │              [Pay $2,430.00]                    │   │
│ │                                                 │   │
│ └─────────────────────────────────────────────────┘   │
│                                                       │
│ Accepted payment methods:                             │
│ 💳 Credit/Debit Card                                  │
│ 🏦 Bank Transfer (ACH)                                │
│                                                       │
└───────────────────────────────────────────────────────┘
```

"Pay" button opens Stripe Checkout (hosted payment page).

After payment:
- Invoice status → Paid
- Customer sees receipt
- Option to download PDF
- Business notified immediately

---

## E.7 Job Status Tracking (Customer View)

Customers can track their scheduled/in-progress jobs:

```
┌───────────────────────────────────────────────────────┐
│ Bathroom Remodel                                      │
│ 123 Oak Street, Unit 4B                               │
├───────────────────────────────────────────────────────┤
│                                                       │
│ Status: On the way                                    │
│                                                       │
│ ●────────●────────●────────○────────○                │
│ Scheduled  On the way  On site  Completed  Paid      │
│                                                       │
│ ┌───────────────────────────────────────────────────┐ │
│ │ Lewis is heading to you now                       │ │
│ │ Estimated arrival: 9:15 AM (10 minutes)           │ │
│ │                                                   │ │
│ │ 📍 Track technician location                      │ │
│ └───────────────────────────────────────────────────┘ │
│                                                       │
│ Appointment                                           │
│ Today, March 14 · 9:00 AM - 12:00 PM                 │
│                                                       │
│ Your Technician                                       │
│ ┌───────────────────────────────────────────────────┐ │
│ │ 👤 Lewis Martinez                                 │ │
│ │    ⭐ 4.9 rating · 127 jobs completed             │ │
│ │                                     [Call Lewis]  │ │
│ └───────────────────────────────────────────────────┘ │
│                                                       │
│ Need to reschedule?                                   │
│ [Contact Us]                                          │
│                                                       │
└───────────────────────────────────────────────────────┘
```

### Optional: Real-Time Tracking

If location sharing is enabled:
- Customer sees technician location on map
- ETA updates in real-time
- "On the way" notification sent when tech starts traveling

Implementation note: Requires location services permission from technician. Make this opt-in.

---

## E.8 Customer Portal Empty States

### No Upcoming Jobs

```
Primary: "No upcoming appointments"
Secondary: "When you schedule service, your appointments will appear here."

CTA: [Request Service]
```

### No Past Jobs

```
Primary: "No service history yet"
Secondary: "Your completed jobs will appear here."

CTA: None
```

### No Pending Quotes

```
Primary: "No quotes to review"
Secondary: "When we send you a quote, it will appear here for approval."

CTA: None
```

---

# SECTION F: MARKETING & GROWTH FEATURES

## F.1 Overview

Marketing features help trades businesses grow through reviews, referrals, and lead tracking. These are lightweight growth tools, not a full marketing automation platform.

---

## F.2 Review Requests

### Automatic Review Request Flow

After job marked Complete → Paid:

1. Wait 2 hours (configurable)
2. Send SMS with review request
3. Track if customer clicked
4. Track if review was left

### Settings

```
┌───────────────────────────────────────────────────────┐
│ Review Requests                                       │
├───────────────────────────────────────────────────────┤
│                                                       │
│ Automatically request reviews         [====●]        │
│                                                       │
│ Send request                                          │
│ ┌───────────────────────────────────────────────────┐ │
│ │ 2 hours after job completed                     ▼ │ │
│ └───────────────────────────────────────────────────┘ │
│                                                       │
│ Review platform                                       │
│ ┌───────────────────────────────────────────────────┐ │
│ │ Google Business Profile                         ▼ │ │
│ └───────────────────────────────────────────────────┘ │
│                                                       │
│ Your Google review link                               │
│ ┌───────────────────────────────────────────────────┐ │
│ │ https://g.page/r/abc123/review                    │ │
│ └───────────────────────────────────────────────────┘ │
│                                                       │
│ Message template                                      │
│ ┌───────────────────────────────────────────────────┐ │
│ │ Hi {customer_name}, thanks for choosing           │ │
│ │ {business_name}! If you were happy with our       │ │
│ │ service, we'd really appreciate a quick review:   │ │
│ │ {review_link}                                     │ │
│ └───────────────────────────────────────────────────┘ │
│                                                       │
│                                    [Save Changes]     │
└───────────────────────────────────────────────────────┘
```

### Review Request SMS

```
Hi Sarah, thanks for choosing ABC Plumbing! If you were 
happy with our service, we'd really appreciate a quick 
review: https://g.page/r/abc123/review
```

### Review Tracking

On Customer Detail and Dashboard:
- "Review requested" indicator
- "Review left" indicator (manual confirmation)
- Overall review request stats

---

## F.3 Lead Source Tracking

Track where leads come from to measure marketing ROI.

### Lead Source Field

When creating a lead (manual or from booking):

```
Source *
┌───────────────────────────────────────────────────────┐
│ Select source...                                    ▼ │
└───────────────────────────────────────────────────────┘

Options:
• Online Booking (auto-set for widget bookings)
• Google Search
• Google Ads
• Facebook
• Instagram
• Referral
• Repeat Customer
• Yard Sign
• Door Hanger
• Home Show
• Other
```

### Lead Source Reporting

In Dashboard:

```
┌───────────────────────────────────────────────────────┐
│ Leads by Source (This Month)                          │
├───────────────────────────────────────────────────────┤
│                                                       │
│ Google Search        ████████████████   12 leads     │
│ Referral             ██████████         8 leads      │
│ Online Booking       ████████           6 leads      │
│ Google Ads           ██████             4 leads      │
│ Repeat Customer      ████               3 leads      │
│ Other                ██                 2 leads      │
│                                                       │
│ Conversion by Source:                                 │
│ Referral: 87% → Job    (best)                        │
│ Repeat Customer: 100%  (loyal)                       │
│ Google Search: 58%                                   │
│                                                       │
└───────────────────────────────────────────────────────┘
```

---

## F.4 Referral Tracking

Track customer referrals for word-of-mouth marketing.

### Referral Field on Lead

When source = "Referral":

```
Source: Referral

Who referred them?
┌───────────────────────────────────────────────────────┐
│ Search customers...                                   │
└───────────────────────────────────────────────────────┘

Selected: Mike Torres (existing customer)
```

### Customer Referral Stats

On Customer Detail:

```
┌───────────────────────────────────────────────────────┐
│ Referrals                                             │
│                                                       │
│ Mike has referred 3 customers                         │
│                                                       │
│ • Sarah Chen — Bathroom remodel ($4,860)   ✓ Paid    │
│ • John Smith — HVAC repair ($450)          ✓ Paid    │
│ • Lisa Wang — Plumbing inspection          Scheduled │
│                                                       │
│ Total referral value: $5,310                         │
│                                                       │
└───────────────────────────────────────────────────────┘
```

### Referral Program (Optional Enhancement)

If business wants to incentivize referrals:

```
┌───────────────────────────────────────────────────────┐
│ Referral Program                                      │
├───────────────────────────────────────────────────────┤
│                                                       │
│ Enable referral rewards              [====○]         │
│                                                       │
│ Reward type                                           │
│ ┌───────────────────────────────────────────────────┐ │
│ │ Credit toward next service                      ▼ │ │
│ └───────────────────────────────────────────────────┘ │
│                                                       │
│ Reward amount                                         │
│ ┌───────────────────────────────────────────────────┐ │
│ │ $25                                               │ │
│ └───────────────────────────────────────────────────┘ │
│                                                       │
│ When reward is given                                  │
│ ┌───────────────────────────────────────────────────┐ │
│ │ When referred customer pays first invoice       ▼ │ │
│ └───────────────────────────────────────────────────┘ │
│                                                       │
└───────────────────────────────────────────────────────┘
```

Reward appears as credit on referrer's account.

---

## F.5 Marketing Feature Implementation Notes

| Feature | Complexity | Dependencies |
|---------|------------|--------------|
| Review requests | Low | Twilio SMS |
| Lead source tracking | Low | None |
| Referral tracking | Low | None |
| Referral rewards | Medium | Credit/discount system |

Prioritize review requests and lead source tracking for V1. Referral rewards can be V1.5.

---

# SECTION G: IMPLEMENTATION CHECKLIST (V1.5 ADDITIONS)

## Leads
- [ ] Lead list view with cards
- [ ] Lead pipeline view with columns
- [ ] Lead detail with all tabs
- [ ] Lead stage transitions
- [ ] Lead scoring display (if enabled)
- [ ] Lead conversion flow
- [ ] Lead → Quote creation
- [ ] Lead source dropdown
- [ ] Lead empty states

## Quotes
- [ ] Quote list with status filters
- [ ] Quote detail with all sections
- [ ] Quote builder with line items
- [ ] Saved services library
- [ ] Add line item modal
- [ ] Per-unit pricing support
- [ ] Tax calculation
- [ ] Send quote flow (SMS/email/link)
- [ ] Quote status tracking (viewed, accepted, declined)
- [ ] Quote → Job conversion
- [ ] Quote → Invoice conversion
- [ ] Quote empty states

## Change Orders
- [ ] Create change order from Job or Quote
- [ ] Change order line items
- [ ] Change order approval flow (customer-facing)
- [ ] Change order status tracking
- [ ] Quote detail shows change order history
- [ ] Job total updates on approved change order

## Invoices
- [ ] Invoice list with summary bar
- [ ] Invoice detail with all sections
- [ ] Invoice builder
- [ ] Due date / payment terms
- [ ] Create from quote (pre-fill)
- [ ] Create from job (pre-fill)
- [ ] Send invoice flow
- [ ] Payment link generation (Stripe)
- [ ] Record manual payment
- [ ] Partial payment support
- [ ] Payment history display
- [ ] Overdue status handling
- [ ] Invoice → Job Paid sync
- [ ] Invoice empty states

## Deposit Invoices
- [ ] Deposit settings (enable, default %)
- [ ] Deposit invoice creation from accepted quote
- [ ] Deposit invoice status tracking
- [ ] Job gating on deposit (optional)
- [ ] Final invoice shows deposit credit
- [ ] Deposit + balance accounting

## Customer Portal
- [ ] Magic link authentication
- [ ] Customer home screen
- [ ] Upcoming appointments display
- [ ] Action needed items (quotes, invoices)
- [ ] Job list (past and upcoming)
- [ ] Quote approval flow with signature
- [ ] Invoice payment via Stripe
- [ ] Job status tracking
- [ ] Customer portal empty states

## Online Booking
- [ ] Embeddable booking widget
- [ ] Service type selection
- [ ] Date/time picker with availability
- [ ] Contact information form
- [ ] Booking confirmation
- [ ] Lead creation in CRM
- [ ] Booking notifications to business

## Marketing Features
- [ ] Review request settings
- [ ] Automatic review SMS after job completion
- [ ] Review link configuration
- [ ] Message template customization
- [ ] Lead source field on all leads
- [ ] Lead source reporting in dashboard
- [ ] Referral tracking (who referred whom)
- [ ] Referral stats on customer detail
- [ ] Referral rewards (optional, can be V2)

## Cross-Entity
- [ ] Linked entity indicators on all detail screens
- [ ] Auto-status updates on conversions
- [ ] Data pre-fill on create-from flows
- [ ] Quote → Change Orders → Invoice flow

---

# CHANGELOG

- v1.5 — Added Leads, Quotes, Invoice Builder specifications
- v1.6 — Added Deposit Invoice flow, Change Orders, Customer Portal, Online Booking, Marketing features (review requests, lead source, referral tracking)

---

# 🔒 END OF V1.5/V1.6 SPECIFICATIONS 🔒