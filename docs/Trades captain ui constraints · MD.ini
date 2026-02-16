# TRADES CAPTAIN

## UI & IMPLEMENTATION CONSTRAINTS

### v2.0 — LOCKED / VERSIONABLE

---

**This document defines HOW Trades Captain must be built and verified.**

**It can version forward without philosophical drift.**

For product philosophy, core screens, and state matrix, see: `TRADES-CAPTAIN-PRODUCT-CONSTITUTION.md`

For feature specifications (Leads, Quotes, Invoices, Portal), see: `TRADES-CAPTAIN-V1.5-SPECS.md`

---

## PRECEDENCE RULE (INHERITED FROM CONSTITUTION)

**If a visual conflict arises, state logic and primary action clarity take precedence over aesthetics.**

Implementation implication: When a design token or spacing rule conflicts with state clarity or CTA behavior, defer to the Product Constitution. Outcomes over appearances.

---

# SECTION 1: DESIGN SYSTEM

**Section 1 defines the canonical token values. Section 10 (CSS variables) must match exactly. If a discrepancy is found, Section 1 is authoritative.**

## 1.1 Color System

### Light Mode

**Backgrounds**
| Token | Value |
|-------|-------|
| bg-primary | #F7F8FA |
| bg-surface | #FFFFFF |
| bg-muted | #EFF1F4 |

**Text**
| Token | Value |
|-------|-------|
| text-primary | #0F172A |
| text-secondary | #475569 |
| text-muted | #94A3B8 |

**Accent (Trades Captain Signature)**
| Token | Value |
|-------|-------|
| accent-primary | #2563EB |
| accent-soft | #DBEAFE |

**Status**
| Token | Value | Background |
|-------|-------|------------|
| success | #16A34A | #DCFCE7 |
| warning | #D97706 | #FEF3C7 |
| danger | #DC2626 | #FEE2E2 |
| info | #0284C7 | #DBEAFE |

**Borders**
| Token | Value |
|-------|-------|
| border-default | #E2E8F0 |
| border-muted | #EFF1F4 |

🚫 No additional colors allowed.

### Dark Mode

Dark mode is NOT simple inversion. It requires intentional surface hierarchy.

**Backgrounds**
| Token | Value |
|-------|-------|
| bg-primary-dark | #0B1220 |
| bg-surface-dark | #1A2332 |
| bg-elevated-dark | #243044 |
| bg-muted-dark | #1F2933 |

**Text**
| Token | Value |
|-------|-------|
| text-primary-dark | #E5E7EB |
| text-secondary-dark | #9CA3AF |
| text-muted-dark | #6B7280 |

**Accent**
| Token | Value |
|-------|-------|
| accent-primary-dark | #3B82F6 |
| accent-soft-dark | #1E3A5F |

**Status (Dark Mode)**
| Status | Background | Text |
|--------|------------|------|
| success | #166534 | #86EFAC |
| warning | #92400E | #FCD34D |
| danger | #991B1B | #FCA5A5 |
| info | #1E40AF | #93C5FD |
| neutral | #334155 | #94A3B8 |

**Borders (Dark Mode)**
| Token | Value |
|-------|-------|
| border-default-dark | #3D4A5C |
| border-muted-dark | #2A3441 |

🚫 No pure black
🚫 No glow
🚫 No neon

Dark mode must feel luxurious and calm, not edgy.

### Dark Mode Elevation Rules

In light mode, shadows create depth. In dark mode, lighter surfaces create depth.

| Elevation Level | Light Mode | Dark Mode |
|-----------------|------------|-----------|
| Level 0 (Page) | #F7F8FA | #0B1220 |
| Level 1 (Cards) | #FFFFFF + shadow | #1A2332 (no shadow) |
| Level 2 (Floating) | #FFFFFF + deeper shadow | #243044 (no shadow) |
| Level 3 (Popovers) | #FFFFFF + deepest shadow | #2D3A4F (no shadow) |

**Border Behavior by Mode**
| Context | Light Mode | Dark Mode |
|---------|------------|-----------|
| Card edges | No border (shadow defines) | 1px border, #2A3441 |
| Input fields | 1px border, #E2E8F0 | 1px border, #3D4A5C |
| Dividers | 1px, #EFF1F4 | 1px, #1F2933 |

---

## 1.2 Typography

Use Inter or SF-style system font. Single family only.

| Level | Size | Weight | Line Height |
|-------|------|--------|-------------|
| H1 | 22px | Semibold (600) | 1.4 |
| H2 | 18px | Semibold (600) | 1.4 |
| H3 | 16px | Medium (500) | 1.5 |
| Body | 15px | Regular (400) | 1.5 |
| Caption | 13px | Regular (400) | 1.5 |
| Micro | 12px | Regular (400) | 1.4 |

---

## 1.3 Spacing System

Allowed spacing units ONLY: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64

**Touch Targets**
| Element | Minimum Size |
|---------|--------------|
| All interactive | 48px |
| Primary CTAs | 56px |

---

## 1.4 Elevation

| Level | Light Mode Shadow | Dark Mode |
|-------|-------------------|-----------|
| Level 0 | None (background) | None |
| Level 1 | 0 1px 2px rgba(0,0,0,0.04) | None (use surface color) |
| Level 2 | 0 6px 16px rgba(0,0,0,0.08) | None (use elevated color) |

No heavy shadows. Ever.

---

## 1.5 Border Radius

| Token | Value |
|-------|-------|
| small | 4px |
| medium | 8px |
| large | 12px |
| full | 9999px |

---

## 1.6 Motion System

| Property | Value |
|----------|-------|
| Duration (fast) | 150ms |
| Duration (normal) | 200ms |
| Duration (slow) | 220ms |
| Easing | ease-out only |

**Motion allowed ONLY for:**
- Status transitions
- Checklist completion
- Payment confirmation
- Accepting suggestions
- Swipe gesture feedback

🚫 No decorative motion
🚫 No idle animations

Motion must always mean something.

---

# SECTION 2: SCHEDULE/CALENDAR SCREEN

## 2.1 Overview

The Schedule screen is the primary time-based view for planning and managing work. It answers: "What's happening when, and where?"

### View Options

| View | Purpose | Complexity |
|------|---------|------------|
| Day | Detailed single-day timeline | Full spec |
| Week | 7-day overview | Full spec |
| List | Chronological job cards | Full spec |
| Month | Calendar grid with indicators | Lighter spec |
| Map | Geographic job view with routes | Lighter spec (requires mapping API) |

---

## 2.2 Schedule Screen Structure

```
┌───────────────────────────────────────────────────────┐
│ ← March 2024                           [Today] [+]    │
├───────────────────────────────────────────────────────┤
│                                                       │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐            │
│  │ Day │ │Week │ │List │ │Month│ │ Map │            │
│  └──┬──┘ └─────┘ └─────┘ └─────┘ └─────┘            │
│     │                                                 │
│ ┌───────────────────────────────────────────────────┐ │
│ │ Filter: All Technicians ▼    All Job Types ▼     │ │
│ └───────────────────────────────────────────────────┘ │
│                                                       │
│ (View content below)                                  │
│                                                       │
└───────────────────────────────────────────────────────┘
```

### Header Elements

- **Month/Year**: Tappable to open date picker
- **Today button**: Jump to current date
- **Add button**: Quick create job with selected date pre-filled
- **View toggle**: Switch between Day/Week/List/Month/Map
- **Filters**: Technician, Job Type (collapsible)

---

## 2.3 Day View (Full Spec)

### Purpose

Detailed view of a single day with time slots.

### Layout

```
┌───────────────────────────────────────────────────────┐
│ ◄  Tuesday, March 12  ►                               │
├───────────────────────────────────────────────────────┤
│                                                       │
│ 8:00 AM ─────────────────────────────────────────     │
│         ┌───────────────────────────────────────────┐ │
│         │ ● Spring Cleaning                         │ │
│  8:30   │   Casey Young                             │ │
│         │   289 NW 198th St              8:30-10:30 │ │
│  9:00   │   Lewis                          $350.00  │ │
│         └───────────────────────────────────────────┘ │
│ 9:30                                                  │
│                                                       │
│ 10:00 ──────────────────────────────────────────      │
│         ┌───────────────────────────────────────────┐ │
│ 10:30   │ ● HVAC Maintenance                        │ │
│         │   Robin Schneider                         │ │
│ 11:00   │   16078 25th Ave              10:30-12:00 │ │
│         │   Lewis, Sofia                   $450.00  │ │
│ 11:30   └───────────────────────────────────────────┘ │
│                                                       │
│ 12:00 ─────────────────────────────────────────       │
│         ┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┐ │
│ 12:30   │  Lunch Break                              │ │
│         └─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┘ │
│ 1:00                                                  │
│                                                       │
│ 1:30 ───────────────────────────────────────────      │
│         ┌───────────────────────────────────────────┐ │
│         │ ○ Bathroom Remodel (Quote)                │ │
│  2:00   │   Sarah Chen                              │ │
│         │   123 Oak Street               1:30-2:30  │ │
│         └───────────────────────────────────────────┘ │
│                                                       │
└───────────────────────────────────────────────────────┘
```

### Job Block Design

| Element | Treatment |
|---------|-----------|
| Left edge | 4px status color (same as job cards) |
| Status indicator | ● Filled for jobs, ○ Outline for quotes/requests |
| Title | H3, semibold |
| Customer | Body, regular |
| Address | Caption, muted |
| Time window | Caption, right-aligned |
| Assigned tech(s) | Caption, muted |
| Value | Body, semibold, right-aligned |

### Job Block Height

Block height proportional to duration:
- 30 min = 48px minimum
- 1 hour = 80px
- 2 hours = 144px

### Interactions

| Action | Behavior |
|--------|----------|
| Tap job block | Open Job Detail |
| Tap empty time slot | Create new job at that time |
| Swipe left/right on header | Navigate prev/next day |
| Long press job block | Show context menu (Reschedule, Reassign, Cancel) |

### Rescheduling (Tap-to-Move)

Instead of drag-drop:

1. Long press job block → "Reschedule" option
2. Bottom sheet opens with time picker
3. Select new date/time
4. Confirm → Job moves

```
┌───────────────────────────────────────────────────────┐
│ Reschedule Job                                   [X]  │
├───────────────────────────────────────────────────────┤
│                                                       │
│ Spring Cleaning — Casey Young                         │
│                                                       │
│ Current: Tue, Mar 12 · 8:30 AM - 10:30 AM            │
│                                                       │
│ New Date                                              │
│ ┌───────────────────────────────────────────────────┐ │
│ │ Wednesday, March 13                             ▼ │ │
│ └───────────────────────────────────────────────────┘ │
│                                                       │
│ New Time                                              │
│ ┌───────────────────────────────────────────────────┐ │
│ │ 9:00 AM - 11:00 AM                              ▼ │ │
│ └───────────────────────────────────────────────────┘ │
│                                                       │
│ [ ] Notify customer of change                         │
│                                                       │
│              [Cancel]        [Reschedule]             │
└───────────────────────────────────────────────────────┘
```

---

## 2.4 Week View (Full Spec)

### Purpose

7-day overview showing job distribution across the week.

### Layout

```
┌───────────────────────────────────────────────────────┐
│ ◄  Mar 10 - 16, 2024  ►                              │
├───────────────────────────────────────────────────────┤
│                                                       │
│  Sun    Mon    Tue    Wed    Thu    Fri    Sat       │
│   10     11     12     13     14     15     16       │
│ ┌─────┬─────┬─────┬─────┬─────┬─────┬─────┐         │
│ │     │     │█████│█████│█████│█████│     │  8 AM   │
│ │     │█████│█████│     │█████│█████│     │  9 AM   │
│ │     │█████│█████│█████│     │█████│     │ 10 AM   │
│ │     │     │     │█████│█████│     │     │ 11 AM   │
│ │     │     │░░░░░│░░░░░│░░░░░│░░░░░│     │ 12 PM   │
│ │     │█████│█████│     │█████│     │     │  1 PM   │
│ │     │█████│     │█████│█████│     │     │  2 PM   │
│ │     │     │█████│█████│     │     │     │  3 PM   │
│ │     │     │     │     │     │     │     │  4 PM   │
│ └─────┴─────┴─────┴─────┴─────┴─────┴─────┘         │
│                                                       │
│ Legend: █ Job  ░ Break/Blocked                        │
│                                                       │
│ Tue 12: 4 jobs · $1,550                              │
│ Wed 13: 3 jobs · $980                                │
│                                                       │
└───────────────────────────────────────────────────────┘
```

### Column Design

- Each day is a column
- Jobs shown as colored blocks (status color)
- Current day highlighted with accent background
- Today indicator (dot under date)

### Interactions

| Action | Behavior |
|--------|----------|
| Tap day column | Switch to Day View for that date |
| Tap job block | Open Job Detail |
| Swipe left/right | Navigate prev/next week |

### Summary Row

Below the grid, show selected day's summary:
- Number of jobs
- Total value
- Tap → Day View

---

## 2.5 List View (Full Spec)

### Purpose

Chronological list of upcoming jobs, similar to Today screen but extended.

### Layout

```
┌───────────────────────────────────────────────────────┐
│ Schedule                                              │
├───────────────────────────────────────────────────────┤
│                                                       │
│ TODAY — Tuesday, March 12                             │
│                                                       │
│ ┌─[Green]─────────────────────────────────────────┐   │
│ │ Spring Cleaning                     8:30 AM     │   │
│ │ Casey Young · 289 NW 198th St                   │   │
│ │ Lewis                                  $350.00  │   │
│ └─────────────────────────────────────────────────┘   │
│                                                       │
│ ┌─[Blue]──────────────────────────────────────────┐   │
│ │ HVAC Maintenance                   10:30 AM     │   │
│ │ Robin Schneider · 16078 25th Ave                │   │
│ │ Lewis, Sofia                           $450.00  │   │
│ └─────────────────────────────────────────────────┘   │
│                                                       │
│ TOMORROW — Wednesday, March 13                        │
│                                                       │
│ ┌─[Gray]──────────────────────────────────────────┐   │
│ │ Plumbing Inspection                  9:00 AM    │   │
│ │ Mike Torres · 445 Elm Street                    │   │
│ │ Sofia                                  $125.00  │   │
│ └─────────────────────────────────────────────────┘   │
│                                                       │
│ THURSDAY, MARCH 14                                    │
│ ...                                                   │
│                                                       │
└───────────────────────────────────────────────────────┘
```

### Date Headers

- Sticky headers as you scroll
- "TODAY" and "TOMORROW" for relative dates
- Full date format for other days

### Job Cards

Same card format as Jobs List (left-edge status, tap to open detail).

---

## 2.6 Month View (Lighter Spec)

### Purpose

High-level overview of the month for planning.

### Layout

```
┌───────────────────────────────────────────────────────┐
│ ◄        March 2024        ►                          │
├───────────────────────────────────────────────────────┤
│                                                       │
│  Sun   Mon   Tue   Wed   Thu   Fri   Sat             │
│ ┌─────┬─────┬─────┬─────┬─────┬─────┬─────┐          │
│ │     │     │     │     │     │  1  │  2  │          │
│ │     │     │     │     │     │ ●●  │     │          │
│ ├─────┼─────┼─────┼─────┼─────┼─────┼─────┤          │
│ │  3  │  4  │  5  │  6  │  7  │  8  │  9  │          │
│ │     │ ●●● │ ●●  │ ●●●●│ ●●  │ ●●● │     │          │
│ ├─────┼─────┼─────┼─────┼─────┼─────┼─────┤          │
│ │ 10  │ 11  │ 12  │ 13  │ 14  │ 15  │ 16  │          │
│ │     │ ●●● │●●●● │ ●●● │ ●●●●│ ●●  │     │          │
│ │     │     │[TD] │     │     │     │     │          │
│ ├─────┼─────┼─────┼─────┼─────┼─────┼─────┤          │
│ │ 17  │ 18  │ 19  │ 20  │ 21  │ 22  │ 23  │          │
│ │     │ ●●  │ ●●● │ ●●  │ ●●●●│ ●●● │     │          │
│ └─────┴─────┴─────┴─────┴─────┴─────┴─────┘          │
│                                                       │
│ ● = 1 job    [TD] = Today                            │
│                                                       │
│ Selected: Tue, Mar 12 — 4 jobs · $1,550              │
│           ┌────────────────────────────────┐          │
│           │ View Day →                     │          │
│           └────────────────────────────────┘          │
│                                                       │
└───────────────────────────────────────────────────────┘
```

### Indicators

- Dots represent job count (max 4 visible, then "4+")
- Dot color = most urgent status that day
- Today highlighted with accent background
- Selected day shows summary + "View Day" action

### Interactions

| Action | Behavior |
|--------|----------|
| Tap date | Select date, show summary |
| Double-tap date | Open Day View |
| Swipe left/right | Navigate prev/next month |

### Implementation Note

Month view is complex to implement well on mobile. Consider launching with Day/Week/List only, adding Month in fast-follow.

---

## 2.7 Map View (Lighter Spec — Requires Mapping API)

### Purpose

Geographic view of job locations with route visualization.

### Layout

```
┌───────────────────────────────────────────────────────┐
│ ◄  Tuesday, March 12  ►              [Optimize Route] │
├───────────────────────────────────────────────────────┤
│                                                       │
│  ┌─────────────────────────────────────────────────┐  │
│  │                                                 │  │
│  │           🏠                                    │  │
│  │            ╲                                    │  │
│  │             ╲_____ 📍1                          │  │
│  │                    │                            │  │
│  │                    │  8 min                     │  │
│  │                    │                            │  │
│  │                   📍2                           │  │
│  │                    │                            │  │
│  │                    │  12 min                    │  │
│  │                    │                            │  │
│  │                   📍3 ─── 📍4                   │  │
│  │                              5 min              │  │
│  │                                                 │  │
│  └─────────────────────────────────────────────────┘  │
│                                                       │
│  Route: 4 stops · 45 min driving · 62 miles          │
│                                                       │
│  ┌─────────────────────────────────────────────────┐  │
│  │ 1. Spring Cleaning        8:30 AM     8 min →  │  │
│  │ 2. HVAC Maintenance      10:30 AM    12 min →  │  │
│  │ 3. Quote: Bathroom        1:30 PM     5 min →  │  │
│  │ 4. Electrical Repair      3:00 PM       —      │  │
│  └─────────────────────────────────────────────────┘  │
│                                                       │
└───────────────────────────────────────────────────────┘
```

### Elements

- Map with job pins (numbered by order)
- Route line connecting stops
- Home/office starting point
- Drive time between stops
- Job list below map (scrollable)

### Route Optimization

See Section 2.9 for "Optimize Route" feature.

### Implementation Note

Requires mapping API integration (Google Maps, Mapbox, or Apple Maps). Flag as separate backend workstream.

---

## 2.8 Technician Filter (Multi-Tech Businesses)

When business has multiple technicians:

```
┌───────────────────────────────────────────────────────┐
│ Filter by Technician                             [X]  │
├───────────────────────────────────────────────────────┤
│                                                       │
│ ┌───────────────────────────────────────────────────┐ │
│ │ [✓] All Technicians                               │ │
│ └───────────────────────────────────────────────────┘ │
│                                                       │
│ ┌───────────────────────────────────────────────────┐ │
│ │ [✓] Lewis Martinez                    ████ Blue   │ │
│ └───────────────────────────────────────────────────┘ │
│                                                       │
│ ┌───────────────────────────────────────────────────┐ │
│ │ [✓] Sofia Chen                        ████ Green  │ │
│ └───────────────────────────────────────────────────┘ │
│                                                       │
│ ┌───────────────────────────────────────────────────┐ │
│ │ [ ] Marcus Johnson                    ████ Orange │ │
│ └───────────────────────────────────────────────────┘ │
│                                                       │
│                                    [Apply]            │
└───────────────────────────────────────────────────────┘
```

- Each technician has assigned color
- Color shows on job blocks in calendar
- Filter persists until changed

---

## 2.9 Route Optimization

### Purpose

Reorder day's jobs for minimum travel time.

### Trigger

"Optimize Route" button in Map View or Day View header.

### Flow

```
┌───────────────────────────────────────────────────────┐
│ Optimize Route                                   [X]  │
├───────────────────────────────────────────────────────┤
│                                                       │
│ Current route: 4 stops · 62 miles · 1h 15m driving   │
│                                                       │
│ Optimized route: 4 stops · 41 miles · 52m driving    │
│                                                       │
│ ┌───────────────────────────────────────────────────┐ │
│ │ Savings: 21 miles · 23 minutes                    │ │
│ └───────────────────────────────────────────────────┘ │
│                                                       │
│ NEW ORDER:                                            │
│                                                       │
│  1. HVAC Maintenance (was #2)           10:30 AM     │
│     Robin Schneider                                   │
│                                                       │
│  2. Quote: Bathroom (was #3)            11:45 AM     │
│     Sarah Chen                          (adjusted)    │
│                                                       │
│  3. Spring Cleaning (was #1)             1:00 PM     │
│     Casey Young                         (adjusted)    │
│                                                       │
│  4. Electrical Repair (unchanged)        3:00 PM     │
│     Mike Torres                                       │
│                                                       │
│ ⚠️ 2 appointments will be adjusted. Notify customers? │
│                                                       │
│    [ ] Send reschedule notifications                  │
│                                                       │
│              [Cancel]        [Apply New Route]        │
└───────────────────────────────────────────────────────┘
```

### Implementation Note

Route optimization requires:
- Mapping/directions API for travel time calculation
- Optimization algorithm (traveling salesman variant)
- Constraint handling (fixed-time appointments can't move)

Spec the UI, flag backend as separate workstream.

---

## 2.10 Schedule Empty States

### No Jobs Today (Day View)

```
Primary: "No jobs scheduled for today"
Secondary: "Add a job or check another date."

CTA: [+ Add Job] (primary)
```

### No Jobs This Week (Week View)

```
Primary: "No jobs this week"
Secondary: "Your schedule is clear. Time to book some work!"

CTA: [+ Add Job] (primary)
```

### No Jobs Match Filter

```
Primary: "No jobs match this filter"
Secondary: "Try selecting different technicians or job types."

CTA: [Clear Filters] (text link)
```

---

# SECTION 3: BUSINESS HEALTH SCREEN

**Note: Internally called "Business Health" — never "Dashboard" (prevents feature creep).**

## 3.1 Overview

The Business Health screen provides at-a-glance business metrics. Accessible from "More" menu.

### Purpose

Answer: "How is my business doing?"

### Design Philosophy

- **No complex charts** — Numbers with trend indicators only
- **Glanceable** — Answer "how am I doing?" in 3 seconds
- **Actionable** — Attention items link directly to filtered lists
- **Consistent** — Same time period applies to all metrics
- **Calm** — Green for positive trends, not celebratory

---

## 3.2 Business Health Layout

```
┌───────────────────────────────────────────────────────┐
│ ← Business Health                        This Week ▼  │
├───────────────────────────────────────────────────────┤
│                                                       │
│ REVENUE                                               │
│ ┌───────────────────────────────────────────────────┐ │
│ │                                                   │ │
│ │  $12,450                                         │ │
│ │  This week                        ↑ 12% vs last  │ │
│ │                                                   │ │
│ └───────────────────────────────────────────────────┘ │
│                                                       │
│ ┌─────────────────────┐  ┌─────────────────────┐     │
│ │ Collected           │  │ Outstanding         │     │
│ │ $8,200              │  │ $4,250              │     │
│ │ 66%                 │  │ 34%                 │     │
│ └─────────────────────┘  └─────────────────────┘     │
│                                                       │
│ JOBS                                                  │
│ ┌─────────────────────┐  ┌─────────────────────┐     │
│ │ Completed           │  │ Scheduled           │     │
│ │ 18                  │  │ 12                  │     │
│ │ ↑ 3 vs last week    │  │ Next 7 days         │     │
│ └─────────────────────┘  └─────────────────────┘     │
│                                                       │
│ PIPELINE                                              │
│ ┌─────────────────────┐  ┌─────────────────────┐     │
│ │ Active Leads        │  │ Pending Quotes      │     │
│ │ 8                   │  │ 5                   │     │
│ │ $24,500 potential   │  │ $18,200 value       │     │
│ └─────────────────────┘  └─────────────────────┘     │
│                                                       │
│ CONVERSION                                            │
│ ┌───────────────────────────────────────────────────┐ │
│ │ Lead → Quote        Quote → Job                   │ │
│ │ 62%                 78%                           │ │
│ │ ████████░░          ██████████░░                  │ │
│ └───────────────────────────────────────────────────┘ │
│                                                       │
│ ATTENTION NEEDED                                      │
│ ┌───────────────────────────────────────────────────┐ │
│ │ ⚠️ 3 invoices overdue              $2,860    →   │ │
│ │ ⚠️ 2 quotes expiring soon          $4,200    →   │ │
│ │ ⚠️ 5 leads not contacted           48+ hrs   →   │ │
│ └───────────────────────────────────────────────────┘ │
│                                                       │
└───────────────────────────────────────────────────────┘
```

---

## 3.3 Metric Cards

### Primary Metric Card (Revenue)

```
┌───────────────────────────────────────────────────────┐
│                                                       │
│  $12,450                                             │
│  This week                        ↑ 12% vs last      │
│                                                       │
└───────────────────────────────────────────────────────┘
```

- Amount: H1, semibold
- Label: Caption, muted
- Trend: Caption + trend indicator (↑ green, ↓ red, — gray)

### Secondary Metric Cards (2-Up Grid)

```
┌─────────────────────┐  ┌─────────────────────┐
│ Completed           │  │ Scheduled           │
│ 18                  │  │ 12                  │
│ ↑ 3 vs last week    │  │ Next 7 days         │
└─────────────────────┘  └─────────────────────┘
```

- Label: Caption, muted (top)
- Value: H2, semibold
- Context: Caption, muted (bottom)

### Conversion Bars

Simple progress bars, no complex charts:
- Percentage + label
- Filled bar proportional to percentage
- Keep it glanceable, not analytical

---

## 3.4 Time Period Selector

```
┌───────────────────────────────────────────────────────┐
│ This Week ▼                                           │
├───────────────────────────────────────────────────────┤
│ ● Today                                               │
│ ● This Week                                           │
│ ○ This Month                                          │
│ ○ This Quarter                                        │
│ ○ This Year                                           │
│ ○ Custom Range...                                     │
└───────────────────────────────────────────────────────┘
```

All metrics recalculate based on selected period.

---

## 3.5 Attention Needed Section

Actionable items that need follow-up:

| Item | Tap Action |
|------|------------|
| Overdue invoices | Open filtered invoice list |
| Expiring quotes | Open filtered quote list |
| Uncontacted leads | Open filtered lead list |
| Jobs missing payment | Open filtered job list |

This section may be empty (success state):

```
┌───────────────────────────────────────────────────────┐
│ ✓ All caught up — nothing needs attention            │
└───────────────────────────────────────────────────────┘
```

---

# SECTION 4: TIME TRACKING

## 4.1 Overview

Time tracking captures work hours for payroll, job costing, and accountability.

### Tracking Modes

| Mode | Trigger | What's Captured |
|------|---------|-----------------|
| Manual | Clock In/Out buttons | Total work time |
| Job-based | Job status transitions | Travel + on-site per job |
| Automatic | GPS (future) | Location-verified time |

---

## 4.2 Clock In/Out (Basic)

Available from Today screen shortcuts and persistent in header when clocked in.

### Clocked Out State

```
┌───────────────────────────────────────────────────────┐
│ [Clock In]                                            │
└───────────────────────────────────────────────────────┘
```

### Clocked In State (Persistent Header)

```
┌───────────────────────────────────────────────────────┐
│ ● Clocked in                    3:45:22    [Clock Out]│
└───────────────────────────────────────────────────────┘
```

- Green dot indicates active
- Running timer
- Tap "Clock Out" to end shift

---

## 4.3 Job-Based Time Tracking

Automatic time capture based on job status transitions:

| Transition | Timer Started | Timer Stopped |
|------------|---------------|---------------|
| → On My Way | Travel timer starts | — |
| → On Site | Travel timer stops, On-site timer starts | — |
| → Completed | — | On-site timer stops |

### Job Detail Time Display

```
┌───────────────────────────────────────────────────────┐
│ Time Tracked                                          │
│                                                       │
│ Travel          On Site           Total               │
│ 0:23            1:45              2:08                │
│                                                       │
│                              [Edit Time]              │
└───────────────────────────────────────────────────────┘
```

### Edit Time Entry

```
┌───────────────────────────────────────────────────────┐
│ Edit Time Entry                                  [X]  │
├───────────────────────────────────────────────────────┤
│                                                       │
│ Travel Time                                           │
│ ┌─────────┐  :  ┌─────────┐                          │
│ │   0     │     │   23    │                          │
│ │  hours  │     │  mins   │                          │
│ └─────────┘     └─────────┘                          │
│                                                       │
│ On Site Time                                          │
│ ┌─────────┐  :  ┌─────────┐                          │
│ │   1     │     │   45    │                          │
│ │  hours  │     │  mins   │                          │
│ └─────────┘     └─────────┘                          │
│                                                       │
│ Note                                                  │
│ ┌───────────────────────────────────────────────────┐ │
│ │ Took extra time to train new tech                 │ │
│ └───────────────────────────────────────────────────┘ │
│                                                       │
│                        [Cancel]  [Save]               │
└───────────────────────────────────────────────────────┘
```

---

## 4.4 Timesheet View

Accessible from More → Team → [Technician] → Timesheet, or More → Reports → Timesheets.

### Weekly Timesheet

```
┌───────────────────────────────────────────────────────┐
│ ← Lewis Martinez                       Mar 10-16 ▼   │
├───────────────────────────────────────────────────────┤
│                                                       │
│ WEEK SUMMARY                                          │
│ ┌───────────────────────────────────────────────────┐ │
│ │ Total Hours          Travel          On Site      │ │
│ │ 42:30               6:15            36:15         │ │
│ └───────────────────────────────────────────────────┘ │
│                                                       │
│ MONDAY, MAR 11                           8:30 total  │
│ ┌───────────────────────────────────────────────────┐ │
│ │ Clock in                              7:45 AM     │ │
│ │ Spring Cleaning — Casey Young                     │ │
│ │   Travel: 0:20 · On site: 1:45        8:05-10:10  │ │
│ │ HVAC Maintenance — Robin Schneider                │ │
│ │   Travel: 0:25 · On site: 2:30       10:35-1:30   │ │
│ │ Lunch break                           1:30-2:00   │ │
│ │ Electrical Repair — Mike Torres                   │ │
│ │   Travel: 0:15 · On site: 2:45        2:15-5:15   │ │
│ │ Clock out                              5:30 PM    │ │
│ └───────────────────────────────────────────────────┘ │
│                                                       │
│ TUESDAY, MAR 12                          7:45 total  │
│ ...                                                   │
│                                                       │
│                              [Export CSV]             │
└───────────────────────────────────────────────────────┘
```

### Export

- CSV format for payroll systems
- Includes: Date, Clock in, Clock out, Total hours, Jobs, Travel, On-site

---

# SECTION 5: EMPTY STATES INVENTORY

## Design Principles

1. Calm over clever — No jokes or excessive enthusiasm
2. Guidance over explanation — Tell them what to do
3. Sparse visuals — Simple icon, never busy graphics
4. Single CTA max — One clear action, or none
5. Context-aware — Different copy for "nothing exists" vs "filter returns nothing"

---

## Today Screen

### No Jobs Scheduled

```
Icon: Calendar with checkmark (subtle)

Primary: "No jobs scheduled for today"
Secondary: "Enjoy the break, or add something to your calendar."

CTA: [+ Add Job] (secondary style)
```

### All Jobs Complete

```
Icon: Checkmark

Primary: "All done for today"
Secondary: "You completed X jobs worth $X,XXX"

CTA: None (or subtle "View completed" link)
```

### Today Offline

```
Banner (top):
"Working offline · Changes will sync when connected"

Content: Show cached data normally
```

---

## Jobs List

### No Jobs Exist

```
Icon: Briefcase or clipboard

Primary: "No jobs yet"
Secondary: "Jobs you create will appear here. Start by adding your first one."

CTA: [+ Create Job] (primary style)
```

### No Jobs Match Filter

```
Icon: Search with empty indicator

Primary: "No jobs match this filter"
Secondary: "Try adjusting your search or filters."

CTA: [Clear Filters] (text link)
```

---

## Job Detail Tabs

### Timeline — No Entries

```
Primary: "No activity yet"
Secondary: "Events and updates will appear here as work progresses."

CTA: None
```

### Notes — No Notes

```
Primary: "No notes yet"
Secondary: "Add notes to keep track of details, instructions, or follow-ups."

CTA: [+ Add Note] (secondary)
```

### Files — No Attachments

```
Primary: "No files attached"
Secondary: "Photos and documents you add will appear here."

CTA: [+ Add Photo] [+ Add File]
```

### Checklist — No Items

```
Primary: "No checklist items"
Secondary: "Add items to track what needs to be done."

CTA: [+ Add Item] (secondary)
```

---

## Inbox

### No Conversations

```
Icon: Message bubble

Primary: "No conversations yet"
Secondary: "Messages, missed calls, and AI responses will appear here."

CTA: None
```

### All Caught Up

```
Primary: "All caught up"
Secondary: "No new messages"

CTA: None
```

---

## Customer Detail

### No Linked Jobs

```
Primary: "No jobs yet"
Secondary: "When you create a job for this customer, it will appear here."

CTA: [+ Create Job] (secondary)
```

### No Invoices

```
Primary: "No invoices"
Secondary: "Invoice history will appear here after jobs are completed."

CTA: None
```

### No Notes

```
Primary: "No notes"
Secondary: "Add notes about preferences, access codes, or special instructions."

CTA: [+ Add Note] (secondary)
```

### No Properties

```
Primary: "No properties"
Secondary: "Add addresses where you do work for this customer."

CTA: [+ Add Property] (secondary)
```

---

## Leads

### No Leads

```
Icon: Funnel or person

Primary: "No leads yet"
Secondary: "New inquiries and potential customers will appear here."

CTA: [+ Add Lead] (primary style)
```

### No Leads Match Filter

```
Primary: "No leads match this filter"
Secondary: "Try adjusting your search or filter settings."

CTA: [Clear Filters] (text link)
```

---

## Payments

### No Pending Payments

```
Icon: Checkmark or wallet

Primary: "No payments pending"
Secondary: "Outstanding invoices will appear here."

CTA: None
```

### No Invoices Exist

```
Primary: "No invoices yet"
Secondary: "Invoices are created when jobs are completed."

CTA: None
```

---

## Team / Schedule

### No Team Members

```
Primary: "Just you for now"
Secondary: "Add team members when you're ready to delegate."

CTA: [+ Add Team Member] (secondary)
```

### No Jobs on Selected Date

```
Primary: "Nothing scheduled"
Secondary: [Show date, e.g., "Wednesday, March 8"]

CTA: [+ Add Job] (secondary)
```

---

## Search

### No Search Results

```
Primary: "No results for "[query]""
Secondary: "Try different keywords or check your spelling."

CTA: None
```

---

## Loading States

- Use skeleton loaders, not spinners
- Preserve layout to avoid jumps
- Show cached data immediately if available
- No "Loading..." text

---

## Error States

### Failed to Load

```
Primary: "Couldn't load this page"
Secondary: "Check your connection and try again."

CTA: [Try Again] (primary)
```

### Action Failed

```
Toast (bottom, temporary):
"Couldn't save changes · Will retry automatically"

OR if manual retry needed:
"Couldn't send invoice · [Retry]"
```

---

## Illustration Style Guide

- Style: Simple line art or minimal flat
- Colors: Muted brand palette only
- Size: Max 120x120px, centered
- Animation: None (static only)
- Mood: Calm, professional, slightly warm

**Avoid:**
- Cartoon characters
- Emojis
- Confetti/celebration graphics
- Sad/negative imagery

---

# SECTION 6: GESTURE VOCABULARY

## Global Gestures

| Gesture | Action |
|---------|--------|
| Swipe right | Primary quick action (Call / Start) |
| Swipe left | Secondary action (Archive / More) |
| Long press | Context menu |
| Pull down | Refresh / Sync |

🚫 Never overload a swipe with more than one meaning
🚫 Never introduce gestures without visual affordance

---

## Gesture Affordances

### Edge Peek (Primary Method)

On swipeable rows, show 4-8px colored edge hinting the action:

- Right edge = primary action color (green for call)
- Left edge = secondary action color (gray for archive)
- Visible at rest, disappears during interaction

### First-Time Tooltip (Supplemental)

On first use of a list screen:

```
"Swipe right on any row to call"
[Got it]
```

- Shows once per screen type
- Dismisses on tap or after 4 seconds
- Never shows again

### Long-Press Preview (Fallback)

Long-press shows context menu with all available actions:

```
📞 Call
💬 Message
📍 Get Directions
··· More
```

---

## Gesture Feedback

| Gesture | Visual | Haptic |
|---------|--------|--------|
| Swipe right | Row slides, reveals action label | Light tap |
| Swipe left | Row slides, reveals action label | Light tap |
| Swipe completes | Row snaps back or animates away | Medium pulse |
| Swipe cancelled | Row returns to position | None |

---

# SECTION 7: OFFLINE & SYNC RULES

## Offline Readable

- Job details
- Customer info
- Checklist
- Notes
- Timeline history

## Offline Editable

- Checklist
- Notes
- Status changes (queued)

## Sync Behavior

- Changes queue silently
- Conflicts surface as "Needs review"
- Never auto-overwrite without confirmation

## Conflict Prevention

1. Sync every 30 seconds when online
2. Lock fields during active edit
3. Show "last synced" timestamp subtly
4. Queue writes immediately with timestamps

---

## Sync Conflict UI

### Detection Banner

```
┌─────────────────────────────────────────────────────┐
│ ⚠️  Some changes need review                        │
│     Edits made offline may differ from recent       │
│     updates.                              [Review]  │
└─────────────────────────────────────────────────────┘
```

- Background: Warning tint (amber)
- Persists until resolved

### Resolution Screen

```
┌─────────────────────────────────────────────────────┐
│ ← Review Changes                                    │
├─────────────────────────────────────────────────────┤
│ Job #1234 — Spring Gardening                        │
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Status                                          │ │
│ │ Your change:     "Completed"                    │ │
│ │ Server change:   "Paused - Waiting on customer" │ │
│ │ [Keep Mine]              [Use Server]           │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│                            [Keep All Mine]          │
│                            [Use All Server]         │
└─────────────────────────────────────────────────────┘
```

### Resolution Rules

| Scenario | Behavior |
|----------|----------|
| User edited, server unchanged | Auto-apply user (no conflict) |
| Server edited, user unchanged | Auto-apply server (no conflict) |
| Both edited same field | Surface for review |
| User deleted, server edited | Surface for review |
| Timestamps identical | Prefer server (tie-breaker) |

---

# SECTION 8: NOTIFICATIONS & HAPTICS

## Push Notifications (Only These)

- New message from customer
- Job reassigned
- Payment received
- Action blocking payment

🚫 No marketing pushes
🚫 No noise notifications

## Haptic Feedback

| Event | Haptic |
|-------|--------|
| Checklist item completion | Light tap |
| Job status change | Medium pulse |
| Payment received | Confirmation pulse |
| Errors | None (never vibrate for errors) |

---

# SECTION 9: ACCESSIBILITY

Non-negotiable requirements:

- WCAG AA contrast minimum
- Dynamic text scaling support
- Color-independent status indicators
- Screen reader labels on all interactive elements
- One-hand usability
- Sunlight readability

Accessibility is a first-class feature, not an afterthought.

---

# SECTION 10: UI IMPLEMENTATION CONSTRAINTS (LOCKED)

This section bridges spec and implementation. It defines **constraints**, not designs — eliminating interpretation without adding JSX.

**Rule: No raw hex values, px measurements, or custom spacing outside these tokens.**

---

## 10.1 Tailwind Config Extension

Extend `tailwind.config.js` with these semantic tokens:

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        // Semantic colors only — no raw hex in components
        background: 'var(--color-background)',
        surface: {
          DEFAULT: 'var(--color-surface)',
          muted: 'var(--color-surface-muted)',
          elevated: 'var(--color-surface-elevated)',
        },
        border: 'var(--color-border)',
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          muted: 'var(--color-text-muted)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          muted: 'var(--color-accent-muted)',
        },
        success: {
          DEFAULT: 'var(--color-success)',
          muted: 'var(--color-success-muted)',
        },
        warning: {
          DEFAULT: 'var(--color-warning)',
          muted: 'var(--color-warning-muted)',
        },
        danger: {
          DEFAULT: 'var(--color-danger)',
          muted: 'var(--color-danger-muted)',
        },
      },
      spacing: {
        // Only these values allowed (must match Section 1.3)
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '6': '24px',
        '8': '32px',
      },
      borderRadius: {
        'sm': '4px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
      },
      fontSize: {
        'caption': ['12px', { lineHeight: '1.5' }],
        'body': ['14px', { lineHeight: '1.5' }],
        'h3': ['16px', { lineHeight: '1.25' }],
        'h2': ['20px', { lineHeight: '1.25' }],
        'h1': ['24px', { lineHeight: '1.25' }],
      },
      boxShadow: {
        'sm': '0 1px 2px rgba(0,0,0,0.05)',
        'md': '0 2px 4px rgba(0,0,0,0.1)',
        'lg': '0 4px 12px rgba(0,0,0,0.15)',
        'none': 'none', // Dark mode uses this
      },
      transitionDuration: {
        'fast': '100ms',
        'normal': '200ms',
        'slow': '300ms',
      },
    },
  },
}
```

### CSS Variables (root)

```css
:root {
  --color-background: #F7F8FA;
  --color-surface: #FFFFFF;
  --color-surface-muted: #F1F5F9;
  --color-surface-elevated: #FFFFFF;
  --color-border: #E2E8F0;
  --color-text-primary: #0F172A;
  --color-text-secondary: #64748B;
  --color-text-muted: #94A3B8;
  --color-accent: #2563EB;
  --color-accent-muted: #DBEAFE;
  --color-success: #16A34A;
  --color-success-muted: #DCFCE7;
  --color-warning: #D97706;
  --color-warning-muted: #FEF3C7;
  --color-danger: #DC2626;
  --color-danger-muted: #FEE2E2;
}

.dark {
  --color-background: #0B1220;
  --color-surface: #1A2332;
  --color-surface-muted: #1A2332;
  --color-surface-elevated: #243044;
  --color-border: #2A3441;
  --color-text-primary: #F8FAFC;
  --color-text-secondary: #94A3B8;
  --color-text-muted: #64748B;
  --color-accent: #3B82F6;
  --color-accent-muted: #1E3A5F;
  --color-success: #22C55E;
  --color-success-muted: #14532D;
  --color-warning: #F59E0B;
  --color-warning-muted: #78350F;
  --color-danger: #EF4444;
  --color-danger-muted: #7F1D1D;
}
```

---

## 10.2 shadcn Component Mapping

For each UI pattern, use the specified shadcn component and variant. **No custom components unless listed in 10.3.**

| UI Pattern | shadcn Component | Variant / Config | Notes |
|------------|------------------|------------------|-------|
| Primary CTA | `Button` | `default` | Full-width on mobile, `size="lg"` |
| Secondary CTA | `Button` | `outline` | |
| Destructive action | `Button` | `destructive` | Confirmation required |
| Ghost/text action | `Button` | `ghost` | For inline actions |
| Text input | `Input` | Default | 48px min height for touch |
| Text area | `Textarea` | Default | |
| Select/dropdown | `Select` | Default | |
| Checkbox | `Checkbox` | Default | |
| Toggle/switch | `Switch` | Default | |
| List row (tappable) | `Card` + flex | No border, full-width tap | Custom onClick |
| Detail sections | `Tabs` | Default | Sticky header on scroll |
| Confirmation dialog | `AlertDialog` | Default | Never custom modals |
| Bottom sheet | `Sheet` | `side="bottom"` | Mobile actions/forms |
| Dropdown menu | `DropdownMenu` | Default | Overflow actions |
| Toast feedback | `Sonner` | Success/error only | Auto-dismiss 3s |
| Tooltip | `Tooltip` | Default | Desktop only |
| Avatar | `Avatar` | Default | Technician/customer photos |
| Badge | `Badge` | `default`, `secondary`, `outline` | Counts only, not status |
| Skeleton loader | `Skeleton` | Default | Match content layout |
| Separator | `Separator` | Default | Between sections |
| Progress bar | `Progress` | Default | Payment progress only |

### What NOT to use from shadcn

| Component | Why Not |
|-----------|---------|
| `Dialog` | Use `AlertDialog` or `Sheet` instead |
| `Popover` | Use `DropdownMenu` for actions |
| `Accordion` | Use `Tabs` for section navigation |
| `Carousel` | Not needed in this product |
| `Calendar` (shadcn) | Build custom per Section 2 spec |
| `Command` | V2 feature (Cmd+K palette) |

---

## 10.3 Custom Components (STRICTLY LIMITED)

Only these three custom components are approved. Everything else uses shadcn.

### 10.3.1 Status Pill

**Purpose:** Indicate entity status (job, lead, quote, invoice).

**Anatomy:**
```
┌──────────────────┐
│ [dot] Label      │
└──────────────────┘
```

**Token Usage:**

| Status Type | Background | Text | Dot |
|-------------|------------|------|-----|
| Active (blue) | `accent-muted` | `accent` | `accent` |
| Success (green) | `success-muted` | `success` | `success` |
| Warning (amber) | `warning-muted` | `warning` | `warning` |
| Danger (red) | `danger-muted` | `danger` | `danger` |
| Neutral (gray) | `surface-muted` | `text-secondary` | `text-muted` |

**Rules:**
- Always top-left of card, before title
- Caption size text
- Dot is 6px, filled circle
- Padding: `px-2 py-1`
- Border radius: `rounded-full`

### 10.3.2 Progress Stepper

**Purpose:** Show job lifecycle progress.

**Anatomy:**
```
●────●────●────○────○
1    2    3    4    5
```

**Token Usage:**

| State | Circle | Line |
|-------|--------|------|
| Completed | `success` filled | `success` |
| Current | `accent` filled + pulse | `border` |
| Upcoming | `border` outline | `border` |
| Paused | `warning` dashed outline | `warning` dashed |

**Rules:**
- Horizontal only
- 3-5 steps maximum
- Step labels optional (below circles)
- Circle size: 12px
- Line thickness: 2px
- Gap between circle and line: 0 (connected)

### 10.3.3 Swipe Action Row

**Purpose:** Quick actions on list items via horizontal swipe.

**Anatomy:**
```
┌─[Edge Peek]─────────────────────────────────────────┐
│ 4px │  Row Content                                  │
└─────────────────────────────────────────────────────┘
```

**Token Usage:**

| Edge | Color | Swipe Direction | Action |
|------|-------|-----------------|--------|
| Left edge | `success` | Swipe right | Positive action (call, complete) |
| Right edge | `danger` | Swipe left | Destructive action (delete, archive) |

**Rules:**
- Edge peek: 4px visible at rest
- Swipe threshold: 80px to trigger
- Haptic: light tap at threshold, medium on complete
- Cancel: return to rest if released before threshold
- Action label appears during swipe (centered in revealed area)
- Long-press fallback: opens context menu with same actions

---

## 10.4 Animation Utilities (LOCKED)

Only these Tailwind animation classes are approved. **No Framer Motion. No custom keyframes. No gesture libraries.**

### Approved Classes

```css
/* Transitions (use for all interactive state changes) */
transition-colors      /* Color changes (hover, active) */
transition-transform   /* Scale, translate */
transition-opacity     /* Fade in/out */
transition-all         /* When multiple properties change */

/* Durations */
duration-100          /* Fast (button press feedback) */
duration-200          /* Normal (most transitions) */
duration-300          /* Slow (page transitions, sheets) */

/* Easing */
ease-out              /* Default for all animations */

/* Transforms */
hover:scale-[1.01]    /* Subtle lift on hover (cards only) */
active:scale-[0.98]   /* Press feedback (buttons) */
translate-y-px        /* 1px down on press (buttons) */

/* Opacity */
opacity-50            /* Disabled state */
opacity-0 / opacity-100  /* Fade transitions */
```

### Approved Patterns

**Button press:**
```html
<Button className="transition-transform duration-100 active:translate-y-px active:scale-[0.98]">
```

**Card hover (desktop only):**
```html
<Card className="transition-transform duration-200 hover:scale-[1.01]">
```

**Fade in:**
```html
<div className="transition-opacity duration-200 opacity-0 data-[visible=true]:opacity-100">
```

**Sheet/modal entry:**
```html
<!-- Use shadcn Sheet — it handles animation internally -->
```

### Forbidden

| Don't Use | Why |
|-----------|-----|
| `framer-motion` | Overkill, bundle size |
| `@keyframes` | Custom animations drift from system |
| `react-spring` | Unnecessary complexity |
| `animate-bounce`, `animate-spin` | Too playful for "calm" brand |
| `animate-pulse` | Only exception: current step in Progress Stepper |
| Custom durations | Stick to 100/200/300ms |

---

## 10.5 Implementation Rules

### Color Rules
- ✅ `bg-surface` `text-primary` `border-border`
- ❌ `bg-white` `text-gray-900` `border-gray-200`
- ❌ `bg-[#FFFFFF]` `text-[#0F172A]`

### Spacing Rules
- ✅ `p-4` `gap-3` `space-y-2`
- ❌ `p-[15px]` `gap-[10px]`
- ❌ `p-7` `p-9` `p-10` (not in token set)

### Typography Rules
- ✅ `text-body` `text-h2` `text-caption`
- ❌ `text-sm` `text-lg` `text-xl` (use semantic names)

### Shadow Rules (Light Mode)
- ✅ `shadow-sm` `shadow-md` `shadow-lg`
- ❌ `shadow` `shadow-xl` `shadow-2xl`

### Shadow Rules (Dark Mode)
- ✅ `dark:shadow-none` (elevation via surface color)
- ❌ Shadows in dark mode

### Border Radius Rules
- ✅ `rounded-md` `rounded-lg`
- ❌ `rounded` `rounded-xl` `rounded-2xl` `rounded-[20px]`

---

## 10.6 Quality Gate

Before any component ships:

1. **Token compliance:** Zero raw values (hex, px outside tokens)
2. **Component compliance:** Using shadcn or approved custom only
3. **Animation compliance:** Only approved Tailwind classes
4. **Dark mode:** Works without shadows, uses elevation colors
5. **Touch targets:** All interactive elements ≥48px

**If it doesn't pass all five, it doesn't ship.**

---

## 10.7 Explicit Bans

🚫 **No "compact mode" or "power user" density optimizations on mobile.**

This includes:
- Reducing touch targets below 48px
- Reducing spacing below token minimums
- Smaller typography variants
- "Dense" list options
- Any feature request that starts with "for power users who want to see more..."

These requests destroy the calm system and will be rejected.

---

# SECTION 11: VISUAL FINISH RULES

This section defines the polish layer that separates "functional" from "premium." These rules create the Linear/Stripe/Superhuman feel without adding complexity.

---

## 11.1 Typography Emphasis

Numbers that represent value get visual weight.

| Content Type | Weight | Example |
|--------------|--------|---------|
| Money amounts | Semibold (600) | **$2,450** outstanding |
| Counts that matter | Semibold (600) | **3** jobs today |
| Time durations | Semibold (600) | **2h 15m** tracked |
| Dates/timestamps | Regular (400) | Mar 8, 2:00 PM |
| Labels | Regular (400) | Client balance |
| Body text | Regular (400) | Standard content |

**Rule:** If a number answers "how much?" or "how many?", it's semibold.

---

## 11.2 Card Composition Pattern

Every card follows this internal structure with increasing vertical spacing:

```
┌────────────────────────────────────────┐
│ [Status pill]              [Timestamp] │  ← 12px padding top
│                                        │
│ Primary Content (H3, semibold)         │  ← 8px gap
│                                        │
│ Secondary content (body, muted)        │  ← 12px gap
│ Secondary line 2 if needed             │
│                                        │
│ [Action link]         [Affordance →]   │  ← 16px gap, 16px padding bottom
└────────────────────────────────────────┘
```

**Spacing rhythm:** 12 → 8 → 12 → 16

This creates visual flow—tighter at top (status + title relationship), looser at bottom (breathing room before action).

---

## 11.3 Status as Primary Visual Element

Status is not metadata tucked in a corner. Status is the first thing the eye sees.

**Status pill placement:** Always top-left of card or row, before title.

**Progress indicators:** Always in the top third of the screen on detail views.

**Visual scan order (enforce this):**
1. Status/state (where am I?)
2. Primary content (what is this?)
3. Secondary content (details)
4. Action (what can I do?)

**Status pill specs:**

| Status | Background | Text | Border |
|--------|------------|------|--------|
| Active states | Filled background | Dark text on light bg | None |
| Pending states | Light background | Medium text | 1px border, same color family |
| Terminal states | Subtle background | Muted text | None |

Example:
- "On Site" → Filled blue background, white text
- "Scheduled" → Light gray background, dark text, subtle border
- "Paid" → Light green background, dark green text

---

## 11.4 Left-Edge Status Indicator (Job Cards Only)

Job cards in lists get a 4px left border indicating job state:

| State | Left Border Color |
|-------|-------------------|
| Scheduled | #94A3B8 (muted gray) |
| On My Way | #2563EB (accent blue) |
| On Site | #2563EB (accent blue) |
| Completed | #16A34A (success green) |
| Paid | #16A34A (success green) |
| Paused | #D97706 (warning amber) |
| Attention Required | #DC2626 (danger red) |

This creates instant visual scanning in job lists without reading text.

---

## 11.5 Depth Allocation

Depth (shadows in light mode, elevated surfaces in dark mode) is used sparingly.

**Depth allowed:**
- Sticky action bar (always)
- Active/focused cards
- Bottom sheets and drawers
- Modals and dialogs
- Floating action buttons

**No depth:**
- List items at rest
- Passive content cards
- Background sections
- Inline metrics

**Rule:** If it doesn't respond to interaction, it doesn't get depth.

---

## 11.6 Accent Color Budget

Accent blue (#2563EB) appears in maximum 3 places per screen:

1. Primary CTA button
2. Active progress indicator
3. One interactive link OR active tab

If you're using accent in more than 3 places, something is wrong.

**What uses accent:**
- Primary buttons
- Progress fills (active)
- Active navigation item
- Active tab underline
- Links (sparingly)

**What never uses accent:**
- Status pills (they use status colors)
- Secondary buttons
- Icons (unless interactive)
- Borders
- Backgrounds

---

## 11.7 Interactive States

Every interactive element has four states:

| State | Visual Change |
|-------|---------------|
| Default | Base appearance |
| Hover (desktop) | Subtle background tint (#F7F8FA → #EFF1F4) |
| Pressed | Slight darkening + 1px downward shift (transform) |
| Disabled | 50% opacity, no hover/press response |

**Buttons specifically:**
- Pressed state: `transform: translateY(1px)` + slightly darker background
- Transition: 100ms ease-out (faster than content transitions)

**List rows:**
- Pressed state: Background shifts to muted (#EFF1F4)
- No transform (rows don't "press down")

---

## 11.8 Screenshot Test (Quality Gate)

Before any screen ships, it must pass this test:

**Take a screenshot. Show it to someone unfamiliar with the product. Ask:**

1. "What's the most important thing on this screen?" → They should identify the primary content or action.
2. "What state is this in?" → They should be able to describe status without reading labels.
3. "Does this look premium or generic?" → Gut reaction should be "premium" or "clean" or "intentional."

If any answer is wrong or hesitant, the screen needs revision.

**Specific checks:**
- [ ] Is there clear visual hierarchy? (One thing dominates)
- [ ] Can you identify status in <1 second?
- [ ] Is accent color used in ≤3 places?
- [ ] Is there breathing room? (Nothing feels cramped)
- [ ] Does it look intentional, not default?

---

## 11.9 Whitespace Protection

**Whitespace is a feature. If a layout feels "slightly too spacious," it is probably correct.**

This rule exists because:
- Engineers naturally compress layouts to fit more
- Product pressure adds "just one more thing"
- Calm erodes gradually, not suddenly

When in doubt, add space, don't remove it.

---

## 11.10 Anti-Patterns (Never Do These)

| Anti-Pattern | Why It Fails | What To Do Instead |
|--------------|--------------|-------------------|
| Rainbow status colors | Looks like a toy | Use defined status palette only |
| Bold everywhere | Nothing stands out | Bold only for key numbers/titles |
| Cards with no internal hierarchy | Feels flat | Follow card composition pattern |
| Accent color on passive elements | Cheapens the accent | Reserve for interactive only |
| Same spacing everywhere | Monotonous | Use spacing rhythm (tighter relationships, looser sections) |
| Icons next to every label | Visual noise | Icons only where they clarify meaning |
| Shadows on everything | Looks dated | Depth only for interactive layers |

---

# SECTION 12: EXECUTION ORDER

## Phase 1 (V1 Launch)

1. Design system components
2. Today screen
3. Schedule/Calendar (Day, Week, List views)
4. Job Detail v2
5. Jobs list with Leads/Quotes/Invoices tabs
6. Inbox convergence
7. Customer Detail
8. Business Health (basic metrics)
9. Customer Portal (booking + payments)
10. Dark mode
11. Accessibility polish

## Phase 2 (V1.5 — Fast Follow)

12. Calendar Month view
13. Calendar Map view
14. Route optimization
15. Time tracking expansion
16. Technician scorecards
17. Marketing features (reviews, referrals)

## Phase 3 (V2)

18. AI scheduling suggestions
19. Predictive analytics
20. Bulk operations
21. Custom reports
22. Email campaigns
23. Multi-location support

Do not skip phases. Each phase builds on the previous.

---

# SECTION 13: IMPLEMENTATION CHECKLIST

## Design System
- [ ] All color tokens implemented (light + dark)
- [ ] Typography scale applied consistently
- [ ] Spacing uses only allowed values
- [ ] Touch targets meet minimums
- [ ] Border radius uses only defined values

## Navigation
- [ ] Bottom nav with 5 tabs (Today, Schedule, Jobs, Inbox, More)
- [ ] Jobs screen has sub-tabs (All, Leads, Quotes, Invoices)
- [ ] More menu grid implemented

## Schedule/Calendar
- [ ] Day view with time slots and job blocks
- [ ] Week view with 7-column grid
- [ ] List view with date headers
- [ ] Month view with job indicators (can be Phase 2)
- [ ] Map view with job pins (can be Phase 2)
- [ ] View toggle works correctly
- [ ] Technician filter (multi-tech businesses)
- [ ] Tap-to-reschedule flow
- [ ] Route optimization UI (backend separate)
- [ ] Schedule empty states

## Business Health
- [ ] Revenue metrics with trends
- [ ] Jobs completed/scheduled counts
- [ ] Pipeline metrics (leads, quotes)
- [ ] Conversion rate bars
- [ ] Attention needed section
- [ ] Time period selector
- [ ] Metrics recalculate on period change

## Time Tracking
- [ ] Clock in/out from Today shortcuts
- [ ] Persistent clocked-in header
- [ ] Job-based auto-tracking (status transitions)
- [ ] Time display on Job Detail
- [ ] Edit time entry modal
- [ ] Timesheet view (weekly)
- [ ] CSV export for payroll

## Empty States
- [ ] All 25+ empty states have approved copy
- [ ] Illustrations match style guide
- [ ] CTAs use correct hierarchy
- [ ] Loading states use skeletons
- [ ] Offline states show cached data with banner

## Gestures
- [ ] Edge peek visible on swipeable rows
- [ ] First-time tooltips appear once per screen type
- [ ] Long-press context menus work everywhere
- [ ] Haptic feedback on all defined events

## Offline/Sync
- [ ] Offline read access works for all defined data
- [ ] Offline edits queue correctly
- [ ] Sync conflict banner appears when needed
- [ ] Resolution screen handles all conflict types

## Accessibility
- [ ] All colors pass WCAG AA
- [ ] Dynamic text scaling works
- [ ] Screen reader labels complete
- [ ] One-hand usability verified

## Visual Finish
- [ ] Numbers/money use semibold weight
- [ ] Cards follow composition pattern (12→8→12→16 spacing)
- [ ] Status pills are top-left, scannable in <1 second
- [ ] Job cards have left-edge status indicator
- [ ] Depth only on interactive elements
- [ ] Accent color used ≤3 places per screen
- [ ] All interactive elements have 4 states (default/hover/pressed/disabled)
- [ ] Screenshot test passed for all screens

## UI Implementation Constraints
- [ ] Tailwind config extended with semantic tokens
- [ ] CSS variables set for light and dark modes
- [ ] Zero raw hex values in components
- [ ] Zero arbitrary spacing values (only token scale)
- [ ] All components use shadcn or approved custom only
- [ ] Status Pill component built per spec
- [ ] Progress Stepper component built per spec
- [ ] Swipe Action Row component built per spec
- [ ] Only approved animation classes used
- [ ] No Framer Motion or custom keyframes
- [ ] Dark mode uses surface elevation (no shadows)
- [ ] All touch targets ≥48px
- [ ] Quality gate passed for all components
- [ ] No compact mode or density optimizations on mobile

---

## CHANGELOG

- v1.0 — Initial design system (ChatGPT)
- v1.1 — Added empty states, gestures, offline/sync, component tokens (Claude)
- v1.2 — Added Visual Finish Rules, shadcn mapping, custom components (Claude)
- v1.3 — Added Schedule, Business Health, Time Tracking screens (Claude)
- v1.4 — Added Tailwind config, animation utilities, quality gates (Claude)
- v2.0 — Split into Product Constitution + UI Constraints. Renamed Dashboard to Business Health. Added compact mode ban. (Claude)

---

# 🔒 END OF UI & IMPLEMENTATION CONSTRAINTS 🔒