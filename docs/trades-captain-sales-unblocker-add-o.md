# TRADES CAPTAIN – SALES UNBLOCKER ADD-ON
## MASTER BUILD PROMPT (LOCKED v1.0 — AUTHORITATIVE)

**Status:** IMPLEMENTATION CONTRACT  
**Audience:** Trae AI / Claude  
**Interpretation:** Literal. No inference. No scope reduction.  
**Parent Platform:** Trades Captain CRM  
**Timeline:** 2–3 weeks

---

## PURPOSE

This add-on clears the minimum expectation barriers required to begin sales conversations with SMB trades contractors.

This is not competitive parity.  
This is **permission to demo**.

Every item below answers a binary yes/no question that prospects ask before agreeing to see the product.

---

## GUIDING PRINCIPLES

1. **Expectation Closure > Feature Depth**  
   Ship the thinnest version that lets Sales answer "yes" honestly.

2. **No Speculative Scope**  
   Nothing ships unless it directly unblocks a first-call objection.

3. **Preserve the Moat**  
   Leads Captain, Voice AI, attribution, and automation are untouched. They are the reason to buy — not this add-on.

4. **Fast Completion Over Perfect Completion**  
   Two weeks of focused shipping beats two months of comprehensive building.

---

## SCOPE (COMPLETE LIST — NO ADDITIONS)

### 1. NATIVE MOBILE PRESENCE (EXPECTATION CLOSURE)

**Objective:**  
Allow Sales to state: *"Yes — we have iOS and Android apps."*

**Implementation:**  
Capacitor wrapper around existing PWA.

**Required Screens (Minimum Viable):**
- Schedule/calendar view
- Job detail view
- Check-in / check-out
- Photo capture and upload
- Push notification receipt

**Required Device Access:**
- Camera
- GPS (event-based)
- Push notifications

**Explicit Non-Scope:**
- Offline sync beyond existing PWA cache
- Signature capture (Phase 2)
- Full feature parity with web
- React Native rewrite
- UI divergence from web

**Deliverables:**
- TestFlight build (iOS)
- Internal testing APK (Android)
- App Store metadata, icons, splash screens
- Deployment pipeline documentation

**Success Criteria:**  
A contractor can view their schedule, tap into a job, check in, take a photo, and receive a push notification — all from a native app install.

---

### 2. CLIENT BOOKING WIDGET (CONVERSION ENABLEMENT)

**Objective:**  
Give contractors something to embed on their website on day one.

**Deliverables:**

**Primary:** `<script>` embed that renders booking flow  
**Fallback:** iFrame embed for restricted environments  
**Snippets:** Copy-paste ready for WordPress and Webflow

**Required Features:**
- Service selection (pulls from contractor's service list)
- Date/time selection (respects availability rules)
- Customer info capture (name, phone, email, address)
- Lead attribution tag passthrough (UTM, source)
- Confirmation screen with booking details

**Configuration Options:**
- Trades Captain branding (default ON, toggleable)
- Primary color theming
- Service subset filtering

**Explicit Non-Scope:**
- Technician assignment logic (use default rules)
- Payment collection at booking
- Multi-location selection
- Custom field builder

**Technical Constraints:**
- No external runtime dependencies
- Sandboxed execution (no global namespace pollution)
- < 50kb initial payload

**Success Criteria:**  
A contractor can copy one script tag, paste it into their website, and have working online booking within 10 minutes.

---

### 3. ACH PAYMENT OPTION (PAYMENT OPTIONALITY)

**Objective:**  
Offer lower-fee payment method alongside existing Stripe card processing.

**Implementation:**  
Stripe ACH (bank transfer) via existing Stripe Connect integration.

**Required Capabilities:**
- Customer bank account collection (Stripe-hosted)
- ACH payment initiation from invoice
- Payment status tracking (pending, completed, failed)
- Handling for ACH-specific delays (3-5 business day settlement)

**UX Requirements:**
- Payment method selection on invoice pay screen
- Clear messaging about settlement timing
- Payout visibility in existing dashboard

**Explicit Non-Scope:**
- Instant payouts
- Non-Stripe payment processors
- Agency revenue sharing
- Custom payout scheduling
- Rate optimization

**Success Criteria:**  
A contractor's customer can pay an invoice via bank transfer. The contractor sees the payment status and eventual payout.

---

### 4. TECHNICAL DEBT (BLOCKING ITEMS ONLY)

These issues cause runtime errors or type failures. Resolve before shipping.

**Required:**

1. **`profiles` table resolution**  
   Code references this table but it doesn't exist.  
   Create as a table OR a view over `users` — either is acceptable.  
   Document the chosen approach.

2. **Regenerate `supabase/types/database.types.ts`**  
   Current file is empty or outdated.  
   Run Supabase type generation and commit.

**Deferred to Phase 2:**
- DNC/Datazapp compliance completion
- Perceptual hashing for Proof-of-Work photos

---

## EXPLICIT NON-SCOPE (DO NOT BUILD)

The following are valuable but not sales-blocking at the SMB stage:

- QuickBooks Desktop integration
- Franchise / multi-location controls
- Zapier integration
- Industry template packs
- Bulk operations
- CSV import with field mapping
- Public API documentation
- Full data export
- Marketing automation
- Client financing integration
- Chemical tracking
- GPS breadcrumb tracking

These are deferred to the **Competitive Closure Add-On**, which ships after initial revenue validation.

---

## DELIVERY SEQUENCE

| Week | Focus | Deliverable |
|------|-------|-------------|
| 1 | Mobile foundation | Capacitor project setup, core screens, TestFlight build |
| 1 | Technical debt | `profiles` resolution, type regeneration |
| 2 | Booking widget | Script embed, WordPress/Webflow snippets |
| 2 | ACH payments | Stripe ACH integration, invoice pay flow |
| 3 | Polish + QA | App Store submission prep, widget documentation |

---

## SUCCESS CRITERIA (ALL MUST BE TRUE)

The add-on is complete when:

- [ ] Sales can answer "Do you have an app?" with "Yes — iOS and Android"
- [ ] Sales can answer "Can I put booking on my website?" with "Yes — here's the embed code"
- [ ] Sales can answer "Do you support bank transfers?" with "Yes — ACH is available"
- [ ] No TypeScript errors related to missing types or tables
- [ ] Leads Captain, Voice AI, and attribution remain fully functional

---

## FINAL DIRECTIVE

This is a **scoped sprint**, not a platform release.

Do not expand scope.  
Do not add "while we're here" improvements.  
Do not optimize for features you haven't sold yet.

Ship this. Start conversations. Let customers tell you what's actually missing.


# TRADES CAPTAIN – COMPETITIVE CLOSURE ADD-ON
## MASTER BUILD PROMPT (LOCKED v1.0 — DEFERRED)

**Status:** DEFERRED — DO NOT IMPLEMENT UNTIL TRIGGER CONDITIONS MET  
**Audience:** Trae AI / Claude  
**Interpretation:** Literal. No inference. No scope reduction.  
**Parent Platform:** Trades Captain CRM  
**Prerequisite:** Sales Unblocker Add-On complete + trigger conditions satisfied

---

## TRIGGER CONDITIONS (ALL MUST BE TRUE)

Do not begin this add-on until:

- [ ] Trades Captain has ≥10 paying SMB customers
- [ ] ≥3 prospects have explicitly cited one of these features as a blocker
- [ ] Sales Unblocker add-on is stable in production (≥30 days)

This add-on exists because customers told you it was missing — not because Jobber has it.

---

## PURPOSE

This add-on eliminates remaining competitive gaps for mid-market and enterprise sales while preserving Trades Captain's AI-first differentiation.

This is **earned scope** — validated by real sales friction, not speculative parity.

---

## GUIDING PRINCIPLES

1. **Sales Evidence > Competitive Checklists**  
   Every feature here should trace to a lost deal or repeated objection.

2. **No Architectural Rewrites**  
   Layer onto existing systems. No re-platforming.

3. **AI & Revenue Capture Remain Sacred**  
   Leads Captain, Voice AI, attribution, and Proof-of-Work must not be weakened.

4. **Enterprise Features Require Enterprise Customers**  
   Franchise controls ship when a franchise is in the pipeline.

---

## SCOPE

### 1. QUICKBOOKS DESKTOP INTEGRATION

**Trigger:** ≥3 prospects blocked by "we use QuickBooks Desktop, not Online"

**Objective:**  
Support QuickBooks Desktop (Pro, Premier, Enterprise) alongside existing QBO.

**Implementation Path:**  
Intuit Web Connector SDK (preferred) OR approved middleware (MyWorks Sync equivalent)

**Required Sync Objects:**
- Customers ↔ Clients
- Jobs / Work Orders
- Invoices
- Payments received
- Tax rates
- Chart of Accounts mappings

**Required Behaviors:**
- Bi-directional sync
- Conflict resolution (CRM wins by default, configurable)
- Manual sync trigger + scheduled sync
- Sync status dashboard with error reporting

**UX Requirements:**
- Connection wizard (Desktop vs Online selection)
- Guided QB Web Connector setup
- Human-readable error states

**Explicit Non-Scope:**
- QuickBooks Payroll sync
- Time tracking sync
- Inventory sync

---

### 2. INTEGRATED PAYMENTS EXPANSION

**Trigger:** Prospects comparing rates to Jobber Payments, or agencies requesting revenue share

**Objective:**  
Full payment platform control and optionality.

**Required Enhancements (beyond ACH from Sales Unblocker):**
- Manual payout scheduling
- Per-business payment method controls (enable/disable card, ACH)
- Stripe Connect Express for faster contractor onboarding
- Payment method on file for recurring services

**Architecture Hooks (implement but don't expose until needed):**
- Agency revenue share percentage configuration
- Franchise consolidated billing flag
- Volume-based rate tier tracking

**Explicit Non-Scope:**
- Non-Stripe processors
- Instant payout (evaluate Stripe Treasury later)
- Invoice financing

---

### 3. FRANCHISE & MULTI-LOCATION CONTROLS

**Trigger:** Active franchise or multi-location prospect in pipeline

**Objective:**  
Support parent/child account structures without fragmenting data or billing.

**Required Capabilities:**
- Parent → child account hierarchy (up to 2 levels)
- Template inheritance (services, pricing, workflows)
- Centralized cross-location reporting dashboard
- Per-location permissions and admin assignment

**Deferred Until Explicit Request:**
- Franchise royalty tracking
- Consolidated billing across locations
- White-label per location

**Admin Controls:**
- Bulk settings push from parent to children
- Location-level feature toggles
- Agency/franchisor analytics views

---

### 4. ECOSYSTEM INTEGRATIONS

**Trigger:** ≥5 prospects asking about specific integrations

**Zapier Integration:**
- Triggers: New lead, job completed, invoice paid, new customer
- Actions: Create lead, create job, create customer, send SMS

**Public API:**
- Read endpoints: Customers, jobs, invoices, leads
- Write endpoints: Create lead, update job status
- Authentication: API key + OAuth2
- Rate limiting: Documented and enforced
- OpenAPI spec published

---

### 5. OPERATIONAL QUICK WINS

**Ship as capacity allows, prioritized by support ticket frequency:**

| Feature | Trigger |
|---------|---------|
| Industry templates (HVAC, Plumbing, Electrical) | Onboarding friction feedback |
| Bulk invoice operations | ≥3 support requests |
| Bulk job status updates | ≥3 support requests |
| CSV import with field mapping | ≥3 support requests |
| Excel/CSV export (all modules) | ≥3 support requests |

---

### 6. TECHNICAL DEBT (REMAINING)

**DNC Compliance Completion:**
- Finalize Datazapp API integration
- Enforce SMS compliance checks before send
- DNC list sync on configurable schedule

**Proof-of-Work Verification:**
- Perceptual hashing for photo duplicate detection
- Metadata tamper detection
- Verification badge on qualifying photos

---

## EXPLICIT NON-SCOPE (REVISIT POST-SERIES A)

- Native React Native rewrite
- Client financing (Wisetack)
- Marketing automation / campaign builder
- Chemical tracking
- Continuous GPS tracking
- AI appointment confirmations (outbound voice)
- Predictive job duration
- Churn prediction

---

## DELIVERY PHASES (SEQUENCE BY TRIGGER)

This is not a linear roadmap. Sequence by which triggers fire first.

| Trigger Fires | Build |
|---------------|-------|
| QB Desktop objections | QuickBooks Desktop Integration |
| Agency/rate objections | Payments Expansion |
| Franchise in pipeline | Multi-Location Controls |
| Integration requests | Zapier + API |
| Support tickets | Operational Quick Wins |

---

## SUCCESS CRITERIA

The add-on is complete when:

- [ ] No qualified mid-market deal lost to "Jobber has X and you don't"
- [ ] Sales can compete head-to-head without deflection
- [ ] AI-first differentiation (Leads Captain, Voice, Attribution) remains primary selling point
- [ ] Features shipped trace to documented customer feedback

---

## FINAL DIRECTIVE

This add-on is **earned, not assumed**.

Do not build until triggers are met.  
Do not expand scope beyond validated gaps.  
Do not let competitive anxiety override customer evidence.

Trades Captain wins on revenue capture, not feature checklists.