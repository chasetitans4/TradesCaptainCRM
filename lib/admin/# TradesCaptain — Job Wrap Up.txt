# TradesCaptain — Job Wrap Up

**Feature Name:** Job Wrap Up
**Version:** 1.0
**Status:** Ready for Implementation
**Date:** February 2026
**Priority:** High — Technician Mode Enhancement
**Dependencies:** Notes & Reminders Add-On (tech_notes, scheduled_reminders), Proof of Work™ (job_photos, proof_of_work), Reputation Engine

---

## TABLE OF CONTENTS

1. [Overview](#1-overview)
2. [Product Context & Constraints](#2-product-context--constraints)
3. [User Stories](#3-user-stories)
4. [System Integration Map](#4-system-integration-map)
5. [Feature Flow](#5-feature-flow)
6. [Database Schema](#6-database-schema)
7. [UI Specifications](#7-ui-specifications)
8. [Backend Automation (Post-Wrap Up)](#8-backend-automation-post-wrap-up)
9. [Contextual Intelligence Nudges](#9-contextual-intelligence-nudges)
10. [Compliance & Guardrails](#10-compliance--guardrails)
11. [API Endpoints](#11-api-endpoints)
12. [Plan Gating](#12-plan-gating)
13. [Edge Cases](#13-edge-cases)
14. [Testing Checklist](#14-testing-checklist)
15. [Sales Positioning](#15-sales-positioning)
16. [Implementation Phases](#16-implementation-phases)
17. [Cost Analysis](#17-cost-analysis)

---

# 0. CRITICAL: NO DUPLICATE SYSTEMS

**Wrap Up does NOT create its own notes, reminders, or photo systems.**

Wrap Up is a **structured entry point** — a thin orchestration layer that creates records in existing systems:

| Data Type | Created In | Table | Spec Reference |
|-----------|-----------|-------|----------------|
| Voice/text notes | Notes & Reminders system | `tech_notes` | Notes & Reminders Spec §6 |
| Follow-up reminders | Notes & Reminders system | `scheduled_reminders` | Notes & Reminders Spec §6 |
| Photos | Proof of Work system | `job_photos` | Proof of Work Spec §4, §11.2 |
| Wrap Up metadata | **NEW** — this spec | `job_wrapups` | This document §6 |

**Before building, verify these tables exist and are functional:**
- `tech_notes` (from Notes & Reminders spec)
- `scheduled_reminders` (from Notes & Reminders spec)
- `job_photos` (from Proof of Work spec — photos table with verification columns)
- `proof_of_work` (from Proof of Work spec)

If any are missing, build them first. Wrap Up depends on all of them.

---

# 1. OVERVIEW

## 1.1 What Is This?

A structured close-out flow that a technician initiates when finishing a job. One screen, 30-45 seconds, captures everything needed to properly close a job and trigger downstream automations.

The tech taps "Wrap Up." The system does the rest.

## 1.2 Core Value Proposition

- **For Technicians:** "Close out the job before you leave the driveway. 30 seconds, done."
- **For Owners:** Job records are complete, invoicing is unblocked, follow-ups are scheduled — without chasing techs.
- **For Customers:** Faster invoices, proactive follow-ups, trust-building artifacts (Proof of Work, review requests) fire automatically.

## 1.3 What Wrap Up Actually Is

Wrap Up is a **job state transition** — the job moves directly from `IN_PROGRESS` to one of three terminal states: `COMPLETED`, `RETURN_NEEDED`, or `CALLBACK`. There is no intermediate `WRAPPING_UP` database state. The Wrap Up modal is purely UI — ephemeral, not persisted. If the tech opens the modal and walks away, nothing changes in the database. Only on "Confirm" does the state transition fire.

That state change becomes the single event hook that triggers all downstream automations. It is NOT a module, NOT a separate feature — it is a moment in the job lifecycle with a dedicated capture screen.

## 1.4 Design Constitution Alignment

| Test | Result |
|------|--------|
| **Marketing Test** | "Your techs close out jobs in 30 seconds. Notes, photos, follow-ups — all captured before they leave the driveway." ✅ Passes |
| **Explanation Test** | "When the job's done, tap Wrap Up. Talk, snap, confirm, go." ✅ Passes |
| **Trust Test** | Complete job records, automatic follow-through on promises, proactive customer communication. ✅ Passes |
| **Deletion Test** | If removed, you lose the entire post-job data capture moment and all downstream automations that depend on it. ✅ Passes |

## 1.5 Technical Stack

| Component | Technology | Notes |
|-----------|------------|-------|
| Database | Supabase (PostgreSQL) | New `job_wrapups` table only |
| Voice Notes | Notes & Reminders system | Existing `tech_notes` + Supabase Storage |
| Photos | Proof of Work system | Existing `job_photos` + verification pipeline |
| SMS Reminders | Notes & Reminders system | Existing `scheduled_reminders` + Twilio |
| Reputation Engine | Existing system | Triggered by job completion event |
| Proof of Work | Existing system | Finalized by job completion event |

**Zero new external APIs. Zero new infrastructure.**

---

# 2. PRODUCT CONTEXT & CONSTRAINTS

## 2.1 User Profile

Same as Notes & Reminders spec — 35-60 year old contractors and technicians in field conditions.

## 2.2 The Critical Constraint

**Wrap Up must be completable while standing in a customer's driveway with one dirty hand.**

| Constraint | Target |
|-----------|--------|
| Total flow completion | ≤ 45 seconds |
| Core flow (status + confirm) | ≤ 10 seconds |
| Touch targets | 48px minimum |
| Font sizes | 16px minimum |
| Voice-first capture | One tap to start recording |
| Required inputs | **Only ONE: job status** |
| Everything else | Optional, contextual, dismissible |

## 2.3 What This Feature Is NOT

- ❌ NOT a form (no required fields beyond job status)
- ❌ NOT an inspection checklist (no mandated steps)
- ❌ NOT a sign-off system (no customer signature in V1)
- ❌ NOT a time-tracking tool (job duration is calculated from existing timestamps, not entered)
- ❌ NOT a new photo system (photos go to Proof of Work's `job_photos`)
- ❌ NOT a new notes system (notes go to Notes & Reminders' `tech_notes`)

A wrap up is a structured close-out. Status, optional context, confirm. That's it.

---

# 3. USER STORIES

## 3.1 Primary Stories

| ID | As a... | I want to... | So that... |
|----|---------|-------------|-----------|
| W-1 | Technician | Tap one button to start closing out a job | I can finish before I leave the site |
| W-2 | Technician | Set the job's completion status (done, needs return, callback) | The office knows what happened |
| W-3 | Technician | Leave a voice note about the job | I capture details while they're fresh |
| W-4 | Technician | Take after-photos during wrap up | Photos attach to the job automatically |
| W-5 | Technician | Flag the job as ready to invoice | Office can bill same-day |
| W-6 | Technician | Set a follow-up reminder in the same flow | I don't forget promises I made |
| W-7 | Owner/Office | See completed wrap ups with notes and status | I know what happened without calling the tech |
| W-8 | Owner/Office | Know which jobs are ready to invoice | I can bill immediately |

## 3.2 Secondary Stories (V1.5)

| ID | As a... | I want to... | So that... |
|----|---------|-------------|-----------|
| W-9 | Technician | Get a "While I'm Here" suggestion during wrap up | I can log upsell opportunities |
| W-10 | Technician | Capture customer signature during wrap up | I have sign-off on completed work |
| W-11 | Owner | See average wrap up completion rates by tech | I know who's using the system |
| W-12 | Technician | Log a maintenance agreement nudge | Customer gets proactive outreach later |

---

# 4. SYSTEM INTEGRATION MAP

Wrap Up is the orchestration point where existing systems converge. It creates records across three existing systems and triggers automations from a fourth.

```
                    ┌─────────────────────────┐
                    │      WRAP UP SCREEN      │
                    │   (Technician taps once)  │
                    └───────────┬─────────────┘
                                │
                    ┌───────────▼─────────────┐
                    │     job_wrapups (NEW)     │
                    │  Status, flags, metadata  │
                    └───────────┬─────────────┘
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                   │
    ┌─────────▼────────┐ ┌─────▼──────┐  ┌────────▼─────────┐
    │   tech_notes      │ │ job_photos │  │scheduled_reminders│
    │   (EXISTING)      │ │ (EXISTING) │  │   (EXISTING)      │
    │ Notes & Reminders │ │ Proof of   │  │ Notes & Reminders │
    │ spec              │ │ Work spec  │  │ spec              │
    └──────────────────┘ └────────────┘  └──────────────────┘
                                │
                    ┌───────────▼─────────────┐
                    │   BACKEND AUTOMATIONS    │
                    │  (Triggered by job       │
                    │   status → COMPLETED)    │
                    └───────────┬─────────────┘
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                   │
    ┌─────────▼────────┐ ┌─────▼──────┐  ┌────────▼─────────┐
    │  Proof of Work    │ │ Reputation │  │  Promise Keeper   │
    │  Finalization     │ │ Engine     │  │  (V1.5)           │
    │  (EXISTING)       │ │ (EXISTING) │  │                   │
    └──────────────────┘ └────────────┘  └──────────────────┘
```

### 4.1 What Wrap Up Creates (Tech-Facing)

| Record | Table | When | Required? |
|--------|-------|------|-----------|
| Wrap up record | `job_wrapups` | Always | Yes — this IS the wrap up |
| Voice/text note | `tech_notes` | If tech records/types one | No |
| After-photos | `job_photos` | If tech takes photos | No |
| Follow-up reminder | `scheduled_reminders` | If tech sets one | No |

### 4.2 What Wrap Up Triggers (Backend, Invisible to Tech)

| Automation | System | Trigger Condition |
|-----------|--------|-------------------|
| Job status → COMPLETED | Jobs system | Wrap up confirmed with status = 'completed' |
| Proof of Work™ finalization | PoW system | Job status → COMPLETED (existing trigger) |
| Reputation Engine review request | Reputation Engine | Job status → COMPLETED + conditions met (existing trigger) |
| Job duration calculation | Jobs system | Departure timestamp - arrival timestamp |
| Promise Keeper check | Contextual Intelligence (V1.5) | Scan wrap up note for follow-up language |

**The tech sees none of this.** They tap Wrap Up, do 30 seconds of work, and walk to the truck. Everything else happens silently.

---

# 5. FEATURE FLOW

## 5.1 Entry Point

Wrap Up is accessible from **two places only**:

### A. Job Detail View — Status Action

When a job is `IN_PROGRESS`, the primary CTA on the job detail screen becomes "Wrap Up":

```
┌─────────────────────────────────────┐
│  ← Job #1234 — Smith Residence     │
│                                     │
│  AC Repair                          │
│  Status: In Progress                │
│                                     │
│  ... job details ...                │
│                                     │
│  ┌─────────────────────────────────┐│
│  │         🏁 WRAP UP             ││  ← Primary CTA (replaces "Complete Job")
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

### B. Technician Mode — Active Job Card

If the tech has an active (in-progress) job, it appears as a card in Technician Mode with a Wrap Up action:

```
┌─────────────────────────────────────┐
│  ACTIVE JOB                         │
│  #1234 — Smith Residence            │
│  AC Repair • Started 2:15 PM        │
│                                     │
│  [View Job]         [🏁 Wrap Up]    │
└─────────────────────────────────────┘
```

**Wrap Up is NOT a tile in the tile grid.** It is a contextual action that only appears when there's an active job. No active job = no Wrap Up button anywhere.

## 5.2 Wrap Up Screen — Core Flow

```
Tech taps "Wrap Up"
        ↓
Full-screen modal opens (not bottom sheet — this is a deliberate transition)
        ↓
┌─────────────────────────────────────┐
│  🏁 Wrap Up                         │
│  Job #1234 — Smith Residence        │
│  AC Repair • 2h 15m on site         │  ← Calculated from arrival time
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  How'd it go?                       │
│                                     │
│  ┌───────────┐ ┌───────────┐        │
│  │    ✅     │ │    🔄     │        │
│  │ Completed │ │  Return   │        │  ← Big status buttons (100×80px)
│  │           │ │  Needed   │        │
│  └───────────┘ └───────────┘        │
│  ┌───────────┐                      │
│  │    📞     │                      │
│  │ Callback  │                      │
│  │           │                      │
│  └───────────┘                      │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  [🎤 Voice Note]    [📷 Photos]    │  ← Optional capture actions
│                                     │
│  [⏰ Set Follow-Up]                 │  ← Optional reminder
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  ☐ Ready to invoice                 │  ← Checkbox, off by default
│                                     │
│  ┌─────────────────────────────────┐│
│  │       ✓ CONFIRM WRAP UP        ││  ← Primary CTA, disabled until
│  └─────────────────────────────────┘│     status is selected
│                                     │
│  [Cancel]                           │  ← Returns to job without changes
│                                     │
└─────────────────────────────────────┘
```

## 5.3 Status Selection Detail

### Completed ✅

- Job moves to `COMPLETED` status
- Triggers all downstream automations (PoW finalization, Reputation Engine, etc.)
- "Ready to invoice" checkbox is visible
- Default path — most jobs end here

### Return Needed 🔄

- Job moves to `RETURN_NEEDED` status (stays open, not completed)
- System prompts: "When should we come back?"
- Quick presets appear: Tomorrow, This Week, Next Week, Custom
- Creates a `scheduled_reminders` record for the tech (self-reminder)
- Does NOT trigger PoW finalization or Reputation Engine
- Does NOT show "Ready to invoice" checkbox

```
┌─────────────────────────────────────┐
│  When should we come back?          │
│                                     │
│  ┌──────────┐  ┌──────────┐        │
│  │ Tomorrow │  │This Week │        │
│  └──────────┘  └──────────┘        │
│  ┌──────────┐  ┌──────────┐        │
│  │Next Week │  │  Custom  │        │
│  └──────────┘  └──────────┘        │
│                                     │
│  Reason (optional):                 │
│  ┌─────────────────────────────────┐│
│  │ Waiting on parts / Need to     ││
│  │ schedule with customer / etc.  ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

### Callback 📞

- Job moves to `CALLBACK` status (stays open)
- Indicates the customer needs to call back or the office needs to follow up
- Prompts for a brief reason (text input, optional)
- Creates a self-reminder for the tech
- Does NOT trigger PoW finalization or Reputation Engine

## 5.4 Voice Note Sub-Flow

When tech taps "🎤 Voice Note":

**This is identical to the Notes & Reminders voice recording flow (Notes & Reminders Spec §8).** The only difference:

- Auto-attachment: Always attached to the current job (no picker)
- `wrapup_id`: Set on the resulting `tech_notes` record
- `note_text` pre-populated context: "[Wrap Up Note]" prefix for office visibility

```
Recording UI → same as Notes & Reminders Spec §8.1
Storage → same as Notes & Reminders Spec §8.2
Constraints → same as Notes & Reminders Spec §8.3
```

**Do NOT build a separate voice recording system.** Reuse the existing Notes & Reminders voice infrastructure entirely.

## 5.5 Photos Sub-Flow

When tech taps "📷 Photos":

**This uses the existing Proof of Work photo capture system.** Photos taken during Wrap Up are:

- Saved to `job_photos` table (Proof of Work spec)
- Auto-labeled as `AFTER` (since Wrap Up = job is ending)
- Verified through the existing photo verification pipeline (EXIF, GPS, timestamp — PoW Spec §4)
- `wrapup_id` stored in photo metadata for traceability
- Subject to existing immutability rules (PoW Spec §4.7)

```
Camera opens → Tech snaps photos → Photos auto-attach to job
        ↓
Photos appear as thumbnails on Wrap Up screen
        ↓
[+ Add More]    [Done]
```

**Do NOT build a separate photo system.** The camera UI opens the same photo capture flow used elsewhere in the job. The only difference is the auto-label of `AFTER`.

## 5.6 Follow-Up Reminder Sub-Flow

When tech taps "⏰ Set Follow-Up":

**This is identical to the Notes & Reminders reminder sub-flow (Notes & Reminders Spec §5.3).** The differences:

- Auto-attachment: Always attached to the current job + customer
- `wrapup_id`: Set on the resulting `scheduled_reminders` record
- Default recipient: Self (most wrap-up follow-ups are self-reminders)
- Suggested message: Pre-filled based on job context ("Follow up on [Job Type] for [Customer Name]")

```
Reminder UI → same as Notes & Reminders Spec §5.3
Recipient selection → same as Notes & Reminders Spec §5.5
Time presets → same as Notes & Reminders Spec §9.2
Compliance → same as Notes & Reminders Spec §10
```

**Do NOT build a separate reminder system.** Reuse the existing Notes & Reminders reminder infrastructure entirely.

## 5.7 Time Budget

```
Total time budget: ≤ 45 seconds (30 seconds typical)

Step 1: Tap "Wrap Up"                       → 1 second
Step 2: Tap job status (Completed)          → 1 second
Step 3: (Optional) Record voice note        → 5-15 seconds
Step 4: (Optional) Take 1-2 photos          → 5-10 seconds
Step 5: (Optional) Tap "Set Follow-Up"      → 3-5 seconds
Step 6: (Optional) Check "Ready to invoice" → 1 second
Step 7: Tap "Confirm Wrap Up"              → 1 second
                                            ─────────────
Minimum (status only):                      3 seconds
Typical (status + voice note):              10-20 seconds
Maximum (everything):                       35-45 seconds ✅
```

---

# 6. DATABASE SCHEMA

## 6.1 New Table: `job_wrapups`

This is the ONLY new table. Everything else writes to existing tables.

```sql
-- =====================================================
-- JOB WRAP UP — ORCHESTRATION RECORD
-- =====================================================

-- One wrap up per job completion attempt
-- If a job is wrapped up, reopened, and wrapped up again, there will be multiple records
CREATE TABLE job_wrapups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,              -- Multi-tenant isolation
  
  -- Job reference
  job_id UUID NOT NULL,                       -- References jobs table
  customer_id UUID,                           -- References customers/contacts table (denormalized from job)
  
  -- Who wrapped up
  technician_id UUID NOT NULL,                -- References team_members/users table
  technician_name VARCHAR(200),               -- Denormalized for display
  
  -- Completion status
  completion_status VARCHAR(20) NOT NULL,     -- 'completed', 'return_needed', 'callback'
  
  -- Return needed details (only if completion_status = 'return_needed')
  return_reason TEXT,                         -- Optional reason text
  return_scheduled_for TIMESTAMPTZ,           -- When the return visit is planned
  
  -- Callback details (only if completion_status = 'callback')
  callback_reason TEXT,                       -- Optional reason text
  
  -- Flags
  invoice_ready BOOLEAN DEFAULT false,        -- Tech flagged as ready to invoice
  
  -- Linked records (populated after creation)
  note_id UUID,                               -- References tech_notes.id (if voice/text note was captured)
  reminder_id UUID,                           -- References scheduled_reminders.id (if follow-up was set)
  photo_count INTEGER DEFAULT 0,              -- Count of photos taken during wrap up
  
  -- Job timing (calculated at wrap up time)
  job_arrival_time TIMESTAMPTZ,               -- Copied from job record for historical reference
  job_departure_time TIMESTAMPTZ,             -- Set to NOW() at wrap up
  job_duration_minutes INTEGER,               -- Calculated: departure - arrival
  
  -- Contextual Intelligence (V1.5 — nullable for now)
  upsell_logged BOOLEAN DEFAULT false,        -- Tech logged a "While I'm Here" opportunity
  upsell_description TEXT,                    -- What the opportunity is
  maintenance_nudge_shown BOOLEAN DEFAULT false, -- Was the maintenance agreement nudge displayed
  maintenance_nudge_acted BOOLEAN DEFAULT false,  -- Did the tech act on it
  
  -- Analytics timestamps
  wrapup_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),  -- When the tech tapped "Wrap Up" (modal opened)
  wrapup_confirmed_at TIMESTAMPTZ,            -- When the tech tapped "Confirm" (modal closed)
  -- These two timestamps enable:
  --   • Wrap up duration (confirmed - started)
  --   • Abandoned wrap up detection (started but never confirmed)
  --   • Tech compliance rates (% of IN_PROGRESS jobs that get wrapped up)
  --   • Average time-to-wrap after arrival (started - job_arrival_time)
  --   • Sales metric: "92% of jobs wrapped up before leaving site"
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_wrapups_org ON job_wrapups(organization_id);
CREATE INDEX idx_wrapups_job ON job_wrapups(job_id);
CREATE INDEX idx_wrapups_tech ON job_wrapups(technician_id);
CREATE INDEX idx_wrapups_status ON job_wrapups(organization_id, completion_status);
CREATE INDEX idx_wrapups_invoice_ready ON job_wrapups(organization_id, invoice_ready)
  WHERE invoice_ready = true;
CREATE INDEX idx_wrapups_created ON job_wrapups(organization_id, created_at DESC);

-- Constraints
ALTER TABLE job_wrapups
ADD CONSTRAINT valid_completion_status CHECK (completion_status IN (
  'completed',
  'return_needed',
  'callback'
));
```

## 6.2 Modifications to Existing Tables

### tech_notes — Add wrapup_id

```sql
-- Add nullable FK to link notes created during wrap up
ALTER TABLE tech_notes
ADD COLUMN wrapup_id UUID REFERENCES job_wrapups(id) ON DELETE SET NULL;

CREATE INDEX idx_notes_wrapup ON tech_notes(wrapup_id) WHERE wrapup_id IS NOT NULL;
```

### scheduled_reminders — Add wrapup_id

```sql
-- Add nullable FK to link reminders created during wrap up
ALTER TABLE scheduled_reminders
ADD COLUMN wrapup_id UUID REFERENCES job_wrapups(id) ON DELETE SET NULL;

CREATE INDEX idx_reminders_wrapup ON scheduled_reminders(wrapup_id) WHERE wrapup_id IS NOT NULL;
```

### job_photos — Add wrapup_id

```sql
-- Add nullable column to link photos taken during wrap up
-- NOTE: If job_photos uses JSONB array on proof_of_work, add wrapup_id to the JSONB schema instead
-- If job_photos is a separate table, add:
ALTER TABLE job_photos
ADD COLUMN wrapup_id UUID;

-- No FK constraint here because job_photos may predate job_wrapups
-- and we don't want to block photo operations if wrapup record is deleted
```

### jobs — Add status values

```sql
-- Ensure the jobs table status enum/constraint includes RETURN_NEEDED and CALLBACK
-- WRAPPING_UP is NOT a database state — it is UI-only (ephemeral modal state)
-- Implementation depends on how job statuses are currently stored:

-- If using CHECK constraint:
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS valid_job_status;
ALTER TABLE jobs ADD CONSTRAINT valid_job_status CHECK (status IN (
  'SCHEDULED',
  'DISPATCHED',
  'EN_ROUTE',
  'IN_PROGRESS',
  'COMPLETED',
  'RETURN_NEEDED',   -- NEW
  'CALLBACK',        -- NEW
  'CANCELLED'
));

-- If using ENUM type, you'll need to add new values:
-- ALTER TYPE job_status ADD VALUE 'RETURN_NEEDED';
-- ALTER TYPE job_status ADD VALUE 'CALLBACK';

-- NOTE: There is NO 'WRAPPING_UP' state in the database.
-- The Wrap Up modal is a UI overlay. If the tech opens it and walks away,
-- the job remains IN_PROGRESS. Only on "Confirm" does the status change
-- directly to COMPLETED, RETURN_NEEDED, or CALLBACK.
```

---

# 7. UI SPECIFICATIONS

## 7.1 Design System Compliance

| Element | Specification |
|---------|--------------|
| Touch targets | 48px minimum |
| Status buttons | 100×80px minimum tappable area |
| Font sizes | 16px minimum for all text |
| Colors | Semantic color tokens from existing design system |
| CTA button | 50px height, full-width, consistent with existing patterns |
| Modal type | Full-screen (deliberate transition, not bottom sheet) |
| Spacing | 16px standard padding |
| Confirm button | Disabled (grayed) until status is selected |

## 7.2 Status Button Visual States

```
UNSELECTED:                    SELECTED:
┌───────────┐                  ┌───────────┐
│    ✅     │                  │    ✅     │  ← Brand primary color
│ Completed │  → tap →         │ Completed │     background
│           │                  │           │     with white text
└───────────┘                  └───────────┘
Border: 1px neutral            Border: 2px primary
Background: white              Background: primary
Text: neutral                  Text: white
```

Only one status can be selected at a time. Tapping a different one deselects the previous.

## 7.3 Wrap Up Confirmation State

After tapping "Confirm Wrap Up":

```
┌─────────────────────────────────────┐
│                                     │
│           ✅                        │
│      Job Wrapped Up                 │
│                                     │
│  Smith Residence — AC Repair        │
│  Duration: 2h 15m                   │
│  Status: Completed                  │
│  Invoice Ready: Yes                 │
│  Note: Voice note attached          │
│  Photos: 2 added                    │
│                                     │
│  ┌─────────────────────────────────┐│
│  │         ← BACK TO JOBS         ││
│  └─────────────────────────────────┘│
│                                     │
└─────────────────────────────────────┘
```

This confirmation screen auto-dismisses after 3 seconds or on tap, returning the tech to the jobs list (not the job detail — the job is done).

## 7.4 Wrap Up on Job Record (Office View)

After a job is wrapped up, the job detail view shows a Wrap Up summary section:

```
┌─────────────────────────────────────┐
│  JOB WRAP UP                        │
│                                     │
│  🏁 Completed by Mike T.           │
│  Feb 14, 2026 at 4:30 PM           │
│  On site: 2h 15m                    │
│  Invoice ready: ✅ Yes              │
│                                     │
│  📝 Voice Note (0:18)      ▶ Play  │
│  📸 2 photos attached              │
│  ⏰ Follow-up: Feb 17, 8:00 AM     │
│     → Send quote for mini-split     │
│                                     │
└─────────────────────────────────────┘
```

## 7.5 Invoice Ready Queue (Office View)

Jobs flagged as `invoice_ready = true` appear in a filtered view accessible from the jobs list or dashboard:

```
┌─────────────────────────────────────┐
│  READY TO INVOICE (3)               │
│                                     │
│  ┌─────────────────────────────────┐│
│  │ #1234 Smith — AC Repair        ││
│  │ Wrapped up 4:30 PM by Mike T.  ││
│  │ [Create Invoice]               ││
│  └─────────────────────────────────┘│
│                                     │
│  ┌─────────────────────────────────┐│
│  │ #1235 Johnson — Drain Clear    ││
│  │ Wrapped up 3:15 PM by Sarah K. ││
│  │ [Create Invoice]               ││
│  └─────────────────────────────────┘│
│                                     │
└─────────────────────────────────────┘
```

---

# 8. BACKEND AUTOMATION (POST-WRAP UP)

These automations fire **after the tech taps "Confirm Wrap Up"** and are completely invisible to the technician.

## 8.1 Automation Sequence (Completed Jobs Only)

```
Tech taps "Confirm Wrap Up" with status = 'completed'
        ↓
1. Create job_wrapups record (set wrapup_confirmed_at = NOW())
2. Create tech_notes record (if note was captured)
3. Link job_photos taken during wrap up (set wrapup_id)
4. Create scheduled_reminders record (if follow-up was set)
5. Update job status: IN_PROGRESS → COMPLETED (direct, no intermediate state)
6. Set job departure_time → NOW()
7. Calculate and store job_duration_minutes
        ↓
8. [EXISTING TRIGGER] Job COMPLETED → Proof of Work finalization
   - PoW status → FINALIZED
   - Photos locked (immutable)
   - Summary generated from template
   - Wait delivery delay (default 15 min)
   - Send PoW notification to customer
        ↓
9. [EXISTING TRIGGER] Job COMPLETED → Reputation Engine
   - Check: Reputation Engine active?
   - Check: Customer has valid phone + SMS consent?
   - Check: Daily limit not exceeded?
   - If all conditions met → Queue feedback/review request (2hr delay)
        ↓
10. [V1.5] Promise Keeper scan
    - Scan wrap up note text for follow-up language
    - If detected and no reminder was set → Surface nudge to tech
```

## 8.2 Automation Sequence (Return Needed / Callback)

```
Tech taps "Confirm Wrap Up" with status = 'return_needed' or 'callback'
        ↓
1. Create job_wrapups record (set wrapup_confirmed_at = NOW())
2. Create tech_notes record (if note was captured)
3. Link job_photos taken during wrap up (set wrapup_id)
4. Create scheduled_reminders record (return date or self-reminder)
5. Update job status: IN_PROGRESS → RETURN_NEEDED or CALLBACK (direct)
6. DO NOT set departure_time (job is not complete)
7. DO NOT trigger PoW finalization
8. DO NOT trigger Reputation Engine
```

---

# 9. CONTEXTUAL INTELLIGENCE NUDGES

These are V1.5 features but the data model supports them from V1 so we're not retrofitting later.

## 9.1 "While I'm Here" Nudge

**When it appears:** Only on the Wrap Up screen, only if the customer has relevant historical notes (from Contextual Intelligence Layer — While I'm Here Suggestions spec).

**How it appears:** A subtle, dismissible section between the optional actions and the Confirm button:

```
  ─────────────────────────────────  
  
  💡 From previous visits:
  "Ductwork in crawlspace deteriorating"
  — Mike T., Jan 3
  
  [Log Opportunity]    [Dismiss]
  
  ─────────────────────────────────  
```

Tapping "Log Opportunity" sets `upsell_logged = true` and `upsell_description` on the `job_wrapups` record. This creates a follow-up task for the office. One tap, no form.

## 9.2 Maintenance Agreement Nudge

**When it appears:** Only if the customer does NOT have an active maintenance agreement AND has 2+ completed jobs (per Contextual Intelligence spec — Maintenance Agreement Tracker).

**How it appears:**

```
  📋 No maintenance agreement on file
  [Mention to customer →]    [Skip]
```

Tapping "Mention to customer" sets `maintenance_nudge_acted = true` and could create a follow-up task. Tapping "Skip" sets `maintenance_nudge_shown = true` (tracking that it was surfaced but declined).

## 9.3 Nudge Rules

- Maximum ONE nudge per wrap up (don't stack them)
- Priority: While I'm Here > Maintenance Agreement
- Nudges are always dismissible with one tap
- Dismissed nudges don't reappear on the same job
- Nudge display time is NOT counted in the 45-second time budget (they're bonus, not required)

---

# 10. COMPLIANCE & GUARDRAILS

## 10.1 Wrap Up Integrity

| Rule | Implementation |
|------|---------------|
| One active wrap up per job | Block if job already has a `job_wrapups` record with same `completion_status` in the last hour (prevents accidental double-taps) |
| Status required | Confirm button is disabled until a status is selected |
| No edits after confirm | Wrap up record is immutable after creation (tech can create a new note or reminder separately, but the wrap up record itself doesn't change) |
| Tech must be assigned to job | Only the assigned technician (or any admin) can initiate Wrap Up |
| Job must be IN_PROGRESS | Wrap Up button only appears when job status = IN_PROGRESS |

## 10.2 Photo Compliance

All photo compliance rules from Proof of Work spec §4 apply. Photos taken during Wrap Up are subject to the same verification pipeline and immutability rules. No exceptions.

## 10.3 Reminder Compliance

All reminder compliance rules from Notes & Reminders spec §10 apply. Customer reminders created during Wrap Up follow the same TCPA, quiet hours, and opt-out rules. No exceptions.

## 10.4 Data Retention

- `job_wrapups` records are retained indefinitely (they're part of the job history)
- Linked `tech_notes` follow the Notes & Reminders retention policy
- Linked `job_photos` follow the Proof of Work retention policy (immutable after finalization)
- `scheduled_reminders` follow the Notes & Reminders cleanup policy

---

# 11. API ENDPOINTS

```
POST   /api/jobs/:id/wrapup          — Create a wrap up (status + flags)
GET    /api/jobs/:id/wrapup          — Get wrap up record for a job
GET    /api/wrapups/invoice-ready     — Get all jobs flagged as invoice ready (office view)
GET    /api/wrapups/recent            — Get recent wrap ups for current user

-- Notes, photos, and reminders use their existing API endpoints:
POST   /api/notes                     — Create note (set wrapup_id in body)
POST   /api/notes/:id/voice           — Upload voice recording (set wrapup_id)
POST   /api/reminders                 — Create reminder (set wrapup_id in body)
-- Photos use existing job photo upload endpoint with wrapup_id parameter
```

### POST /api/jobs/:id/wrapup — Request Body

```json
{
  "completion_status": "completed",
  "invoice_ready": true,
  "return_reason": null,
  "return_scheduled_for": null,
  "callback_reason": null,
  "note_id": "uuid-of-note-created-during-wrapup",
  "reminder_id": "uuid-of-reminder-created-during-wrapup",
  "photo_count": 2,
  "upsell_logged": false,
  "upsell_description": null,
  "maintenance_nudge_shown": true,
  "maintenance_nudge_acted": false
}
```

### POST /api/jobs/:id/wrapup — Response

```json
{
  "id": "wrapup-uuid",
  "job_id": "job-uuid",
  "completion_status": "completed",
  "invoice_ready": true,
  "job_duration_minutes": 135,
  "automations_triggered": [
    "job_status_updated",
    "proof_of_work_finalization_queued",
    "reputation_engine_review_queued"
  ]
}
```

---

# 12. PLAN GATING

Wrap Up is a core CRM feature — it is available on ALL plans that include jobs. No gating on the wrap up itself.

Sub-features within Wrap Up follow their parent system's gating:

| Sub-Feature | Gated By | Rule |
|------------|----------|------|
| Status selection + confirm | None | Always available (it's just a job status change) |
| Text note during wrap up | None | Available on all plans (per Notes & Reminders spec §13) |
| Voice note during wrap up | CRM Pro | Per Notes & Reminders spec §13 |
| Photos during wrap up | None | Available on all plans (uses existing job photo system) |
| Self-reminder during wrap up | Leads Captain | Per Notes & Reminders spec §13 |
| Customer/coworker reminder | Leads Captain + CRM Pro | Per Notes & Reminders spec §13 |
| Invoice ready flag | None | Always available |
| While I'm Here nudge | CRM Pro (V1.5) | Per Contextual Intelligence spec |
| Maintenance agreement nudge | CRM Pro (V1.5) | Per Contextual Intelligence spec |

**Upgrade prompts within Wrap Up follow the same patterns defined in Notes & Reminders spec §13.3.** When a Starter user taps Voice Note in the Wrap Up flow, they see the same upgrade prompt. No new prompts needed.

---

# 13. EDGE CASES

| Scenario | Handling |
|----------|---------|
| Tech wraps up while offline | Save `job_wrapups` record locally (IndexedDB). Sync when online. Backend automations fire upon sync. Show "Pending sync" indicator. |
| Tech starts wrap up, gets interrupted, comes back | Wrap Up modal preserves state if the tech navigates away and returns within the same session. If the app is killed, state is lost — they restart Wrap Up. No database state is persisted until "Confirm" is tapped. |
| Tech opens Wrap Up modal but never confirms (abandoned) | Nothing persists in the database. Job remains IN_PROGRESS. The `wrapup_started_at` timestamp is only written when the record is created on confirm. To track abandoned wrap ups, the frontend can log an analytics event on modal open — but no DB record is created until confirm. |
| Tech taps Wrap Up on a job that's already completed | Block with message: "This job is already completed." Show the existing wrap up summary instead. |
| Two techs assigned to the same job, both try to wrap up | First one wins. Second gets: "This job was wrapped up by [Tech Name] at [Time]." |
| Job has no arrival_time recorded | `job_duration_minutes` is set to NULL. Show "Duration: Unknown" instead of a calculated value. |
| Tech selects "Return Needed" but doesn't pick a date | Allow it — return_scheduled_for is nullable. The wrap up still saves, but no reminder is created. The office can schedule the return manually. |
| Tech takes photos during wrap up, then cancels wrap up | Photos are already saved to `job_photos` (they're created on capture, not on confirm). They remain attached to the job but without a `wrapup_id`. This is acceptable — photos are useful regardless. |
| Voice note upload fails during wrap up | Same as Notes & Reminders spec §14 — retry up to 3 times, then queue for background upload. Wrap up still completes; note is linked when upload succeeds. |
| Job reopened after wrap up (e.g., customer calls back) | Job status can be manually changed back to IN_PROGRESS by office/admin. Previous wrap up record remains (historical). A new Wrap Up can be initiated. |
| Organization has no Leads Captain (no SMS) | Reminder sub-flow shows the upgrade prompt per Notes & Reminders spec §13. All other Wrap Up features work normally. |

---

# 14. TESTING CHECKLIST

```
CORE WRAP UP FLOW:
□ Wrap Up button appears only when job status = IN_PROGRESS
□ Wrap Up button does NOT appear for SCHEDULED, COMPLETED, CANCELLED jobs
□ Full-screen modal opens with correct job details
□ Job context (name, type, time on site) displays correctly
□ Time on site calculates correctly from arrival timestamp
□ "Time on site" shows "—" if no arrival time recorded

STATUS SELECTION:
□ Only one status selectable at a time
□ Tapping "Completed" highlights it, deselects others
□ Tapping "Return Needed" shows return scheduling sub-flow
□ Tapping "Callback" shows callback reason input
□ Confirm button is disabled until a status is selected
□ Confirm button becomes enabled after status selection

COMPLETED STATUS PATH:
□ Job status updates to COMPLETED
□ Job departure_time set to current time
□ Job duration calculated correctly
□ Proof of Work finalization triggered
□ Reputation Engine review request queued (if conditions met)
□ "Invoice ready" checkbox works and saves to wrapup record

RETURN NEEDED STATUS PATH:
□ Return scheduling presets appear (Tomorrow, This Week, Next Week, Custom)
□ Self-reminder created for return date
□ Job status updates to RETURN_NEEDED (not COMPLETED)
□ PoW finalization NOT triggered
□ Reputation Engine NOT triggered
□ "Invoice ready" checkbox is NOT shown

CALLBACK STATUS PATH:
□ Callback reason text input appears
□ Self-reminder created
□ Job status updates to CALLBACK (not COMPLETED)
□ PoW finalization NOT triggered
□ Reputation Engine NOT triggered

VOICE NOTE (DURING WRAP UP):
□ Voice recording UI matches Notes & Reminders spec
□ Voice note saves to tech_notes table with correct wrapup_id
□ Voice note auto-attached to current job
□ Playback works from wrap up confirmation screen
□ Voice note visible on job record after wrap up

PHOTOS (DURING WRAP UP):
□ Camera opens and photos save to job_photos
□ Photos auto-labeled as "AFTER"
□ Photos go through PoW verification pipeline
□ Photo count reflected on wrap up record
□ Photos visible on job record after wrap up
□ wrapup_id set on photo records

FOLLOW-UP REMINDER (DURING WRAP UP):
□ Reminder UI matches Notes & Reminders spec
□ Reminder saves to scheduled_reminders with correct wrapup_id
□ Default recipient is self
□ Suggested message pre-fills with job context
□ Plan gating applies (Leads Captain required for SMS)

INVOICE READY:
□ Checkbox default is off
□ Toggling on sets invoice_ready = true on wrapup record
□ Jobs with invoice_ready = true appear in office "Ready to Invoice" view
□ Creating an invoice clears the job from the ready queue

CONFIRMATION SCREEN:
□ Shows summary of everything captured
□ Auto-dismisses after 3 seconds or on tap
□ Returns to jobs list (not job detail)

OFFICE VIEW:
□ Wrap up summary appears on job detail record
□ Voice notes are playable from job detail
□ Photos are viewable from job detail
□ Follow-up reminders are visible on job timeline
□ "Ready to Invoice" queue shows correct jobs

CONCURRENT ACCESS:
□ Two techs can't wrap up the same job simultaneously
□ Second tech sees error message with first tech's name and time

CANCEL BEHAVIOR:
□ Tapping Cancel returns to job detail without changes
□ Job status remains IN_PROGRESS
□ No records created in any table
□ Photos taken before cancel remain (photos save on capture)

OFFLINE:
□ Wrap up saves locally when offline
□ "Pending sync" indicator shown
□ Syncs when connection restored
□ Backend automations fire after sync
□ Voice note queued for upload if offline
ANALYTICS TIMESTAMPS:
□ wrapup_started_at records when modal opened
□ wrapup_confirmed_at records when Confirm tapped
□ Duration calculation (confirmed - started) is accurate
□ wrapup_started_at is always ≤ wrapup_confirmed_at
□ Both timestamps use tech's local timezone correctly
```

---

# 15. SALES POSITIONING

This section is not for implementation — it's for marketing, sales decks, and demos.

## 15.1 The One-Liner

> "Your techs don't leave the driveway until the job is documented, invoicable, and review-ready."

## 15.2 Competitive Framing

| CRM | "Job Completion" | 
|-----|-------------------|
| Jobber | Status change |
| Housecall Pro | Status change + optional notes |
| ServiceTitan | Status change + checklist |
| **TradesCaptain** | Status change + data capture + revenue acceleration + trust artifact generation + follow-through enforcement + upsell tracking + review timing optimization |

The difference: other CRMs close a job. TradesCaptain operationalizes the last 30 seconds.

## 15.3 Demo Flow (Three Stages)

**Stage 1: Tech View** — Show the simplicity. Big buttons, voice tap, invoice toggle, one-tap confirm. "30 seconds, one dirty hand."

**Stage 2: Office View** — Show the control. Ready-to-invoice queue, wrap-up summary card, voice note playback, follow-up reminders. "Nothing slips through."

**Stage 3: Automation Flow** — Show the intelligence. Completion → Proof of Work → Review Request → Invoice Ready. "One tap from the tech, four systems fire automatically."

## 15.4 Key Metric to Track (Sales Ammo)

Once deployed, track: **Wrap Up completion rate** — the percentage of IN_PROGRESS jobs that get wrapped up before the tech leaves the site. Target: >90%.

This becomes: *"Our customers' techs close out jobs 92% of the time before leaving the site. That means 92% of jobs are documented, invoicable, and review-ready within 30 seconds of completion."*

That's defensible and differentiating.

## 15.5 Strategic Position

This feature moves TradesCaptain from "Scheduling CRM" toward **"Operational Intelligence CRM."** That matters for commercial contractors who care about process compliance, documentation, follow-through, and audit trails. Wrap Up is the anchor event for all of it.

---

# 16. IMPLEMENTATION PHASES

## Phase 1: Core Wrap Up (Week 1-2)

- `job_wrapups` table + schema modifications (`wrapup_id` columns)
- Job status additions (WRAPPING_UP, RETURN_NEEDED, CALLBACK)
- Wrap Up button on job detail view (IN_PROGRESS jobs only)
- Wrap Up full-screen modal with status selection
- "Ready to invoice" checkbox
- Confirm action → creates wrapup record + updates job status
- Confirmation screen with summary
- Job detail wrap up summary section (office view)
- Invoice ready queue view

**Ship this. Get feedback. The core value — structured close-out with status capture — works without any of the optional capture features.**

## Phase 2: Capture Integration (Week 3-4)

- Voice note during wrap up (wires into existing Notes & Reminders voice system)
- Photo capture during wrap up (wires into existing Proof of Work photo system)
- Follow-up reminder during wrap up (wires into existing Notes & Reminders reminder system)
- Return scheduling sub-flow with time presets
- `wrapup_id` linkage across all three systems
- Technician Mode active job card with Wrap Up action

## Phase 3: Automation Wiring + Polish (Week 5-6)

- Verify PoW finalization fires correctly from wrap up-triggered COMPLETED status
- Verify Reputation Engine queues correctly from wrap up-triggered COMPLETED status
- Job duration calculation and display
- Offline support (IndexedDB for wrap up record, queue voice/photos)
- Edge case hardening (concurrent access, double-tap prevention)
- Analytics events for wrap up usage

## Phase 4: Contextual Intelligence (V1.5 — Week 7+)

- "While I'm Here" nudge on Wrap Up screen
- Maintenance agreement nudge on Wrap Up screen
- Promise Keeper scan on wrap up notes
- Nudge engagement tracking

---

# 17. COST ANALYSIS

## 16.1 Per-Client Monthly Costs

| Component | Cost | Notes |
|-----------|------|-------|
| Supabase DB (job_wrapups rows) | ~$0 | One row per completed job, negligible |
| Voice notes during wrap up | ~$0.02-0.10 | Already counted in Notes & Reminders cost |
| Photos during wrap up | ~$0 | Already counted in Proof of Work cost |
| Reminders during wrap up | ~$0.01-0.05 | Already counted in Notes & Reminders cost |
| Total NEW cost | ~$0 | |

## 16.2 Summary

**Total additional cost per client: effectively $0/month.**

Wrap Up is pure orchestration. It creates records in existing systems that already have their costs accounted for. The only new storage is one `job_wrapups` row per job — a few KB per record. At 100 jobs/month, that's less than 1MB of additional database storage per client per month.

The value is entirely in the structured capture and automated trigger chain — not in new infrastructure.

---

# END OF SPECIFICATION

## How to Use This Prompt

Give this entire document to Trae AI with the instruction:

> "Implement the Job Wrap Up feature for TradesCaptain according to this specification. CRITICAL PREREQUISITE: This feature depends on three existing systems — Notes & Reminders (tech_notes, scheduled_reminders tables), Proof of Work (job_photos table with verification columns, proof_of_work table), and the Reputation Engine. Verify all three exist before starting. Wrap Up does NOT create its own notes, photos, or reminder systems — it creates records in the existing tables with a wrapup_id foreign key for traceability. The only new table is job_wrapups. Start with Phase 1 (Core Wrap Up — status selection, invoice ready flag, confirmation). This integrates into the existing Job Detail view as a primary CTA when job status = IN_PROGRESS. No new external dependencies."

This prompt is self-contained and references external specs by section number for implementation clarity.