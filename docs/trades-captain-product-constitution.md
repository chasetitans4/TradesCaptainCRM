# TRADES CAPTAIN

## PRODUCT CONSTITUTION

### v2.0 — LOCKED / AUTHORITATIVE / NON-NEGOTIABLE

---

**This document defines WHAT Trades Captain is and HOW it behaves.**

**It almost never changes.**

For implementation details, design tokens, and build constraints, see: `TRADES-CAPTAIN-UI-CONSTRAINTS.md`

For feature specifications (Leads, Quotes, Invoices, Portal), see: `TRADES-CAPTAIN-V1.5-SPECS.md`

---

## PRECEDENCE RULE (GLOBAL)

**This specification defines behavior and structure. It does not guarantee pixel parity.**

**If a visual conflict arises, state logic and primary action clarity take precedence over aesthetics.**

This means:
- A button in the "wrong" place that preserves state clarity > A button in the "right" place that obscures state
- Correct CTA behavior > Pixel-perfect spacing
- User can complete the intended action > Screen looks exactly like mockup

When in doubt, optimize for outcomes, not appearances.

---

# SECTION 1: ROLE DEFINITION

You are acting simultaneously as:

- Principal Product Designer
- Senior Mobile UX Architect
- Frontend Systems Lead
- Human-Centered Design Reviewer

Your mandate is to design and build a reference-class, award-worthy mobile CRM UI for a trades business platform called Trades Captain.

**You are not allowed to:**

- Improvise visual language
- Introduce new UX metaphors
- Add "nice-to-have" UI
- Chase trends
- Copy competitors verbatim

If anything is not explicitly specified, you must choose the simplest, calmest, least visually aggressive option.

**If a conflict arises between visual polish and state clarity, state clarity always wins.**

---

# SECTION 2: PRODUCT NORTH STAR

**Trades Captain is the calmest, smartest command center in the trades — software that reduces stress, guides action, and helps teams get paid faster without ever feeling complex.**

Every screen must:

- Reduce cognitive load
- Guide the next best action
- Respect real-world field conditions (sunlight, gloves, fatigue, interruptions)

If a design choice violates this, it must be rejected.

---

# SECTION 3: CORE PRODUCT PRINCIPLES

1. Calm beats clever
2. Guidance is subtle, never commanding
3. Action is always closer than information
4. Status is visual, not textual
5. Every screen answers "what should I do next?"
6. Intelligence is earned, never advertised
7. Designed for real work, not demos

If a feature violates any principle, it does not ship.

---

# SECTION 4: TECH STACK

- Next.js 16 (App Router)
- TypeScript (strict)
- TailwindCSS
- shadcn/ui (customized to system tokens)
- Mobile-first layouts
- Accessibility built-in (WCAG AA minimum)

---

# SECTION 5: NAVIGATION

## 5.1 Bottom Navigation

Maximum 5 items:

1. **Today** — Daily command center (flagship)
2. **Schedule** — Calendar and scheduling views
3. **Jobs** — Job list with Leads as secondary tab
4. **Inbox** — Converged communications
5. **More** — Settings, Team, Reports, Help

### Navigation Behavior

| Tab | Primary Content | Secondary Access |
|-----|-----------------|------------------|
| Today | Today screen | — |
| Schedule | Calendar views (Day/Week/List/Month/Map) | Quick add job |
| Jobs | Jobs list | Leads tab, Quotes tab, Invoices tab |
| Inbox | Message threads | — |
| More | Menu grid | Business Health, Team, Settings, Help |

### "More" Menu Contents

```
┌───────────────────────────────────────────────────────┐
│ More                                                  │
├───────────────────────────────────────────────────────┤
│                                                       │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  │
│  │Business │  │  Team   │  │Customers│  │ Reports │  │
│  │ Health  │  │   👥    │  │   👤    │  │   📈    │  │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘  │
│                                                       │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  │
│  │Settings │  │  Help   │  │ Refer & │  │         │  │
│  │   ⚙️    │  │   ❓    │  │  Earn   │  │         │  │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘  │
│                                                       │
└───────────────────────────────────────────────────────┘
```

### Jobs Screen Tab Structure

The Jobs tab contains sub-navigation for related entities:

```
┌───────────────────────────────────────────────────────┐
│ Jobs                                    [+] [Filter]  │
├───────────────────────────────────────────────────────┤
│                                                       │
│   ┌─────┐  ┌─────┐  ┌──────┐  ┌────────┐             │
│   │ All │  │Leads│  │Quotes│  │Invoices│             │
│   └──┬──┘  └─────┘  └──────┘  └────────┘             │
│      │                                                │
│ (Active tab content below)                            │
│                                                       │
└───────────────────────────────────────────────────────┘
```

This keeps related commercial entities accessible without cluttering bottom nav.

---

# SECTION 6: CORE SCREEN SPECIFICATIONS

## 6.1 Today Screen (Flagship)

### Purpose

Instantly answer: "What matters right now?"

### Information Order (Non-Negotiable)

1. Command Strip
2. Attention Required
3. In Progress
4. Up Next
5. Completed Today
6. Shortcuts

### Command Strip

- Swipeable horizontal ribbon
- Max 3 cards (collapses to 1 if Attention Required has items)
- Dismissible
- Rule-based insights only
- No AI branding

Example cards:
- "2 jobs blocking payment"
- "Invoice ready to send"
- "You're ahead of schedule today"

### Attention Required

- Max 3 items
- Only blockers to progress or payment
- Entire section disappears if empty

### Shortcuts

- New Job
- New Lead
- Collect Payment
- Clock In / Out

---

## 6.2 Job Detail v2 (Most Important Screen)

### Vertical Structure

1. App Bar
2. Job Header Card
3. Progress System
4. Sticky Primary Action Bar
5. Content Tabs

### Job Header Card

- Job title
- Address (tap → maps)
- Status pill
- Scheduled window
- Assigned tech(s)

### Progress System

Stages:
1. Scheduled
2. On My Way
3. On Site
4. Completed
5. Paid

Exception states:
- Paused (Waiting on Customer)
- Revisit Required

Visual: Progress bar or timeline with subtle fill animation only.

### Sticky Primary Action

One action only, contextual to current state. Always visible. Never hidden.

See Section 7 (State Matrix) for exact CTA behavior per state.

### Tabs

- Overview
- Timeline
- Checklist
- Notes
- Files

### AI Insight Card (Overview Tab)

- Max 2 lines
- Collapsed by default
- Deterministic rules first
- No chatbot
- No "AI" branding

---

## 6.3 Inbox (Converged Control Plane)

### Philosophy

Inbox = workflow control, not chat.

### Thread List Row

- Contact name
- Channel indicator (SMS / Call / AI)
- Last message preview
- Context badge (Job / Lead / Invoice)
- Timestamp
- Unread state

### Thread Detail

- Clear human vs AI message distinction
- Suggested replies collapsed by default
- Editable before send
- No auto-send without explicit opt-in

### Context Drawer (Slide-Up)

- Linked job / lead
- Status
- Balance due
- Next action
- Tap → Job Detail

### Missed Call Flow

- Missed call becomes thread automatically
- AI reply clearly labeled
- Human takeover is seamless

---

## 6.4 Customer Detail

- Contact info with tap-to-call/message
- Client balance (prominent if owed)
- Linked properties/addresses
- Job history
- Invoice history
- Notes
- Quick create actions

---

## 6.5 Payments

- Outstanding invoices (primary focus)
- Recent payments
- Quick "Collect Payment" action
- Payment method management

---

# SECTION 7: JOB STATE MATRIX

## How to Read This Matrix

Each row = valid real-world state combination.

Columns:
- **Job Status** — Where job is in lifecycle
- **Checklist Status** — State of required items
- **Payment Status** — Invoicing and payment state
- **Sticky CTA Label** — Exact button text
- **CTA State** — Enabled or Disabled
- **Subtext** — Helper text below disabled CTAs
- **Tap Behavior** — What happens on tap

---

## Pre-Arrival States

| Job Status | Checklist | Payment | CTA Label | State | Subtext | Tap Behavior |
|------------|-----------|---------|-----------|-------|---------|--------------|
| Scheduled | Any | Not Invoiced | "On My Way" | Enabled | — | Transitions to On My Way, starts travel timer |
| On My Way | Any | Not Invoiced | "Arrived" | Enabled | — | Transitions to On Site, stops travel timer |

---

## On Site States

| Job Status | Checklist | Payment | CTA Label | State | Subtext | Tap Behavior |
|------------|-----------|---------|-----------|-------|---------|--------------|
| On Site | Not Started | Not Invoiced | "Complete Job" | Disabled | "Start checklist to continue" | Opens Checklist tab |
| On Site | In Progress | Not Invoiced | "Complete Job" | Disabled | "Finish checklist to continue" | Opens Checklist, scrolls to first incomplete |
| On Site | Blocked | Not Invoiced | "Complete Job" | Disabled | "Required items need attention" | Opens Checklist, highlights blocked items |
| On Site | Complete | Not Invoiced | "Complete Job" | Enabled | — | Transitions to Completed, prompts invoice |

---

## Completed States (Payment Flow)

| Job Status | Checklist | Payment | CTA Label | State | Subtext | Tap Behavior |
|------------|-----------|---------|-----------|-------|---------|--------------|
| Completed | Complete | Not Invoiced | "Send Invoice" | Enabled | — | Opens invoice preview |
| Completed | Complete | Invoiced | "Collect Payment" | Enabled | "$X outstanding" | Opens payment collection |
| Completed | Complete | Partially Paid | "Collect Remaining" | Enabled | "$X remaining" | Opens payment with balance |
| Completed | Complete | Payment Failed | "Retry Payment" | Enabled | "Payment couldn't be processed" | Opens payment with retry |
| Completed | Complete | Paid | "View Receipt" | Enabled | — | Opens receipt/summary |

---

## Terminal State

| Job Status | Checklist | Payment | CTA Label | State | Subtext | Tap Behavior |
|------------|-----------|---------|-----------|-------|---------|--------------|
| Paid | Complete | Paid | "Done" | Disabled | "Job complete" | No action (or show summary) |

Consider hiding sticky bar entirely and showing completion banner instead.

---

## Exception States

| Job Status | Checklist | Payment | CTA Label | State | Subtext | Tap Behavior |
|------------|-----------|---------|-----------|-------|---------|--------------|
| Paused | Any | Any | "Resume Job" | Enabled | "Waiting on [reason]" | Clears pause, returns to previous state |
| Revisit Required | Not Started | Not Invoiced | "Start Revisit" | Enabled | "Previous: [date]" | Transitions to On Site |
| Revisit Required | Not Started | Partially Paid | "Start Revisit" | Enabled | "$X paid · $Y pending" | Transitions to On Site |

---

## Invalid Combinations (Data Integrity Check)

These should never occur. Log error if detected.

| Combination | Why Invalid |
|-------------|-------------|
| Scheduled + Paid | Can't be paid before work |
| On My Way + Invoiced | Can't invoice before arrival |
| On Site + Paid | Can't be paid while working |
| Completed + Checklist Not Started | Completion requires checklist |
| Paid + Not Invoiced | Can't pay without invoice |
| Paused + Paid | Should be Completed not Paused |

---

## Secondary Actions (Always Available)

| Action | Availability | Location |
|--------|--------------|----------|
| Call Customer | Always | Header icon |
| Get Directions | Pre-arrival + On Site | Header icon |
| Add Note | Always | Tab or quick action |
| Take Photo | On Site + Completed | Quick action |
| View History | Always | Timeline tab |
| Reassign Job | Scheduled, On My Way, Paused | Overflow menu |
| Cancel Job | Scheduled, On My Way | Overflow (requires confirm) |
| Mark as Revisit | Completed (not Paid) | Overflow menu |

---

## Progress Visual States

| State | Visual | Color |
|-------|--------|-------|
| Scheduled | Step 1 filled | Neutral (gray) |
| On My Way | Step 1-2 filled, step 2 pulsing | Accent (blue) |
| On Site | Step 1-3 filled, step 3 active | Accent (blue) |
| Completed | Step 1-4 filled | Success (green) |
| Paid | All steps filled | Success (green) |
| Paused | Current step outlined/dashed | Warning (amber) |
| Revisit Required | Reset to step 3, badge | Warning (amber) |

---

# SECTION 8: PRIORITY & ATTENTION ARBITRATION

### Global Rule

Only one "attention-demanding" surface may dominate the screen at a time.

### Today Screen Arbitration

| Condition | Command Strip | Attention Required |
|-----------|---------------|-------------------|
| Attention Required ≥1 items | 1 card max OR hidden | Visually dominant |
| Attention Required empty | 2-3 cards | Hidden |
| Both empty | Hidden | Hidden, show "All caught up" |

🚫 Never allow more than 3 total high-priority items above the fold.

---

# SECTION 9: LANGUAGE & TONE

## Allowed Tone

- Calm
- Direct
- Professional
- Supportive

## Banned Words

| Don't Say | Say Instead |
|-----------|-------------|
| Error | "Needs attention" |
| Failed | "Couldn't complete" |
| Invalid | "Something's missing" |
| Problem | "Let's fix this" |

No jokes. No snark. No excessive enthusiasm.

---

# SECTION 10: COMPONENT TOKENS (JSON)

```json
{
  "colors": {
    "light": {
      "background": {
        "primary": "#F7F8FA",
        "surface": "#FFFFFF",
        "muted": "#EFF1F4"
      },
      "text": {
        "primary": "#0F172A",
        "secondary": "#475569",
        "muted": "#94A3B8"
      },
      "accent": {
        "primary": "#2563EB",
        "soft": "#DBEAFE"
      },
      "status": {
        "success": "#16A34A",
        "successBackground": "#DCFCE7",
        "warning": "#D97706",
        "warningBackground": "#FEF3C7",
        "danger": "#DC2626",
        "dangerBackground": "#FEE2E2",
        "info": "#0284C7",
        "infoBackground": "#DBEAFE"
      },
      "border": {
        "default": "#E2E8F0",
        "muted": "#EFF1F4"
      }
    },
    "dark": {
      "background": {
        "primary": "#0B1220",
        "surface": "#1A2332",
        "elevated": "#243044",
        "muted": "#1F2933"
      },
      "text": {
        "primary": "#E5E7EB",
        "secondary": "#9CA3AF",
        "muted": "#6B7280"
      },
      "accent": {
        "primary": "#3B82F6",
        "soft": "#1E3A5F"
      },
      "status": {
        "success": "#86EFAC",
        "successBackground": "#166534",
        "warning": "#FCD34D",
        "warningBackground": "#92400E",
        "danger": "#FCA5A5",
        "dangerBackground": "#991B1B",
        "info": "#93C5FD",
        "infoBackground": "#1E40AF"
      },
      "border": {
        "default": "#3D4A5C",
        "muted": "#2A3441"
      }
    }
  },
  "spacing": {
    "unit": 4,
    "scale": [4, 8, 12, 16, 24, 32, 48, 64]
  },
  "typography": {
    "fontFamily": "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
    "sizes": {
      "h1": { "size": 22, "weight": 600, "lineHeight": 1.4 },
      "h2": { "size": 18, "weight": 600, "lineHeight": 1.4 },
      "h3": { "size": 16, "weight": 500, "lineHeight": 1.5 },
      "body": { "size": 15, "weight": 400, "lineHeight": 1.5 },
      "caption": { "size": 13, "weight": 400, "lineHeight": 1.5 },
      "micro": { "size": 12, "weight": 400, "lineHeight": 1.4 }
    }
  },
  "elevation": {
    "light": {
      "level1": "0 1px 2px rgba(0,0,0,0.04)",
      "level2": "0 6px 16px rgba(0,0,0,0.08)"
    },
    "dark": {
      "level1": "none",
      "level2": "none"
    }
  },
  "motion": {
    "duration": {
      "fast": "150ms",
      "normal": "200ms",
      "slow": "220ms"
    },
    "easing": "ease-out"
  },
  "touch": {
    "minTarget": 48,
    "primaryCta": 56
  },
  "borderRadius": {
    "small": 4,
    "medium": 8,
    "large": 12,
    "full": 9999
  }
}
```

---

# SECTION 11: STOP CONDITIONS

If any UI element:

- Adds visual noise
- Breaks hierarchy
- Increases cognitive load
- Feels decorative
- Obscures the next action

**It must not ship.**

---

# SECTION 12: FINAL DIRECTIVE

Build Trades Captain as a reference-quality, award-ready mobile CRM.

It should feel inevitable, calm, intelligent, and deeply respectful of the user's time and stress.

---

## CHANGELOG

- v1.0 — Initial master prompt (ChatGPT)
- v1.1 — Added state matrix, language/tone (Claude)
- v2.0 — Split into Product Constitution + UI Constraints. This document now contains only product philosophy, navigation, core screens, state matrix, and stop conditions. (Claude)

---

# 🔒 END OF PRODUCT CONSTITUTION 🔒