# 🔒 TRADES CAPTAIN

## AFTER-HOURS & OPTIONAL DAYTIME AI VOICE + SMS

### MASTER BUILD PROMPT (LOCKED v1.5)

**Audience:** Claude / Trae AI  
**Purpose:** Implement AI Voice + SMS inside the Trades Captain CRM with guardrailed user control  
**Status:** LOCKED — No scope expansion, no inference, no feature invention  
**Core Philosophy:**

> *We restrict assumptions, not capability.*

---

## 0. NON-NEGOTIABLE CONSTRAINTS

* Voice AI and SMS AI are **one unified system**
* Voice is **ephemeral intake only**
* SMS is the **authoritative persistence layer**
* Human responses **always override AI**
* Defaults must protect expectations
* Advanced controls must require explicit user intent
* **No call audio recording or transcripts in MVP**

DO NOT:

* Build a full AI receptionist by default
* Allow silent expansion into staff replacement
* Remove after-hours framing
* Allow voice to book, sell, or promise dispatch
* Record or store call audio
* Store verbatim voice transcripts

---

## 1. SYSTEM PURPOSE (LOCKED)

The AI Voice + SMS system exists to:

1. Ensure every inbound call receives a response
2. Capture urgency with minimal friction
3. Transition all continuity to SMS
4. Route emergencies responsibly
5. Disengage immediately when humans respond

**Default promise:** after-hours and on-call coverage  
**Optional capability:** daytime AI voice, explicitly enabled

---

## 2. CORE ACTIVATION MODEL — DUAL-SIGNAL ANSWER CERTAINTY

Voice AI activation is based on **answer certainty**, not business hours alone.

### Answer Certainty Mode (Required Setting)

```
answer_certainty_mode:
  - RING_TIMEOUT_ONLY
  - RING_TIMEOUT_OR_FORWARD (default)
  - EXPLICIT_FORWARD_ONLY
```

**Default:** `RING_TIMEOUT_OR_FORWARD`

### Signal A — Ring Timeout

* Call rings longer than `ring_timeout_seconds` (default: 20s)
* No human answer detected

### Signal B — Explicit Forward

* Receptionist presses key/button to hand off to AI
* PBX forwards unanswered calls to AI number
* Number is explicitly forwarded to AI line

### Voice AI MAY activate if:

* Signal A is met (timeout exceeded) — if mode allows
* OR Signal B is met (explicit forward) — if mode allows
* OR call enters an AI-enabled Availability State
* OR business is in ON_CALL or MESSAGE_ONLY state
* OR business has explicitly enabled daytime AI voice AND signal conditions met

### Voice AI MUST NOT activate if:

* A human answers the call
* Call is answered before timeout (in timeout modes)
* Daytime AI voice is not explicitly enabled (during LIVE_ANSWER hours)

---

## 3. AVAILABILITY STATES (REQUIRED ENUM)

Each business MUST configure availability using:

```
AvailabilityState:
  - LIVE_ANSWER
  - ON_CALL
  - MESSAGE_ONLY
```

Availability states control **routing behavior**, not assumptions of staffing.

---

## 4. DEFAULT BEHAVIOR (CRITICAL)

### OUT-OF-THE-BOX DEFAULTS (NON-OPTIONAL)

* Voice AI ENABLED:
  * ON_CALL
  * MESSAGE_ONLY
* Voice AI DISABLED:
  * LIVE_ANSWER
* SMS AI ENABLED:
  * All states
* Missed-call SMS ALWAYS active
* Calendar awareness ALWAYS active
* Answer certainty mode: `RING_TIMEOUT_OR_FORWARD`
* Call recording: DISABLED (no opt-in available in MVP)

This default configuration MUST ship without modification.

---

## 5. ADVANCED CONTROL MODEL (EXPLICIT OPT-IN)

Businesses MAY enable additional voice coverage **only via Advanced Settings**.

### Advanced Toggle:

```
enable_daytime_ai_voice: boolean (default = false)
```

When enabled:

* Voice AI may activate during LIVE_ANSWER hours
* Still subject to answer certainty signals
* Still subject to minute limits and overages

---

## 6. REQUIRED WARNING & CONSENT (NON-SKIPPABLE)

Before enabling daytime AI voice, the system MUST present:

> ⚠️ "Enabling AI Voice during business hours may increase call volume, usage costs, and customer expectations. This feature is designed for call screening, not staff replacement."

User MUST explicitly confirm.

No confirmation → no activation.

---

## 7. VOICE AI BEHAVIOR BY STATE (LOCKED)

### 7.1 LIVE_ANSWER (Default)

* Calls ring normally
* Voice AI idle
* If missed → SMS AI handles follow-up
* Voice AI ONLY activates if:
  * enable_daytime_ai_voice = true
  * AND answer certainty signal met (timeout or forward)

---

### 7.2 ON_CALL

Voice AI answers immediately.

**Allowed flow only:**

1. AI disclosure (first 5 seconds) — see Section 7.4
2. Greeting
3. Voicemail escape offer (within first 10 seconds)
4. Emergency yes/no confirmation
5. One short context question (optional)
6. Exit voice
7. SMS takeover

Hard limits:

* Max 2–3 questions
* ~45 seconds total
* No scheduling
* No diagnosing
* No pricing
* No promises

---

### 7.3 MESSAGE_ONLY

Voice AI answers immediately.

**Allowed flow:**

1. AI disclosure (first 5 seconds) — see Section 7.4
2. Greeting
3. Voicemail escape offer (within first 10 seconds)
4. Explain no live dispatch
5. Capture name + reason
6. Exit to SMS

Emergency routing only if enabled.

---

### 7.4 UNIFORM AI DISCLOSURE (MANDATORY)

**Location:** First 5 seconds of every AI Voice interaction  
**Purpose:** Transparency, deception prevention  
**Scope:** All states, all calls, no variation

#### Required Script (LOCKED)

> "This call is answered by an automated assistant to help route your message. Calls are not recorded."

#### Rules

* Must play before any other interaction
* Must be audible and unhurried
* Same script for all states (no per-state variation)
* Do NOT say "AI" repeatedly
* Do NOT say "robot" or "bot"
* Do NOT require caller consent to talk to AI
* Do NOT branch scripts by state
* Do NOT geo-infer location

#### Why This Works Everywhere

This disclosure satisfies:
* CA consumer-protection expectations
* FL deceptive-practice standards
* PA communication transparency requirements
* TX general disclosure norms

One conservative, honest disclosure works nationally.

See **Appendix F: AI Voice Compliance (Non-Recording)** for full rationale.

---

## 8. VOICEMAIL ESCAPE HATCH (MANDATORY)

### Requirement

Within the first 10 seconds of AI Voice interaction, the system MUST offer:

> "If you'd prefer to leave a voicemail instead, press 9 at any time."

### Behavior if Pressed

1. Route caller to voicemail system
2. Store voicemail reference (existence only, not audio)
3. Send SMS to caller: "We received your voicemail and will follow up shortly."
4. Log event: `voicemail_requested = true`

### Rationale

* Respects caller preference
* Reduces frustration with AI
* Mirrors traditional phone expectations
* Does not trap callers in AI flow

---

## 9. EMERGENCY TRIAGE (DETERMINISTIC, BUSINESS-OWNED)

### Core Principle (LOCKED)

> **Trades Captain does not decide what an emergency is.**  
> **The business defines it. The system enforces it.**

Emergency determination MUST be deterministic and multi-path.

---

### Detection Path 1 — Explicit Caller Confirmation (PRIMARY, ALWAYS ACTIVE)

Voice AI MUST ask:

> "Is this an emergency that needs immediate service? Yes or no."

* If **Yes** → `is_emergency = true`
* If **No** → `is_emergency = false`
* If unclear → repeat once, then default to `false`

**This path is ALWAYS active**, regardless of whether trigger phrases are configured.

---

### Detection Path 2 — Business-Defined Trigger Phrases (SECONDARY, ADDITIVE)

Each business MAY define:

#### Required Phrases (high confidence)

Match → `is_emergency = true` (no confirmation needed)

Examples (plumber):
* "flood"
* "burst pipe"
* "gas leak"
* "sewage backup"

#### Optional Phrases (medium confidence)

Match → `is_emergency = pending` → triggers confirmation question

Examples:
* "water problem"
* "backup"
* "no heat"

**Logic:**

* Required phrase detected → emergency = true (immediate)
* Optional phrase detected → ask confirmation question
* No phrase detected → ask confirmation question anyway (Path 1)

---

### Detection Path 3 — Keypad Override (FAILSAFE)

Optional configuration:

> "Press 1 if this is an emergency."

* Exists for panicked callers who struggle with voice
* If pressed → `is_emergency = true`

---

### Fallback Behavior (No Phrases Configured)

If a business skips emergency phrase configuration:

* Path 1 (caller confirmation) remains **always active**
* Path 2 (phrase detection) is inactive
* Path 3 (keypad) available if enabled

**Emergency detection is never fully disabled.**

---

### Emergency Output

```
is_emergency: boolean
emergency_source: CALLER_CONFIRMATION | PHRASE_REQUIRED | PHRASE_OPTIONAL_CONFIRMED | KEYPAD
```

Controls SMS routing and escalation behavior.

---

## 10. SMS HANDOFF (MANDATORY)

Voice AI MUST ALWAYS hand off to SMS.

On voice exit:

1. Create or attach to `conversation_thread`
2. Send SMS to caller
3. Send SMS to internal recipients (if configured)
4. Persist call summary + emergency flag

Once SMS is active:

* SMS AI owns the thread
* Voice AI disengages
* Any human reply disables AI immediately

---

## 11. ESCALATION LOGIC (SMS-PRIMARY, EMERGENCY VOICE PERMITTED)

### Standard Escalation (Non-Emergency)

Escalation operates via **SMS only**.

Rules:

* Primary on-call contact (SMS)
* Backup contact after X minutes (SMS)
* Group SMS option
* No voice retries

---

### Emergency Escalation Ladder (LOCKED)

If `is_emergency = true`:

#### Step 1 — Immediate SMS

* SMS to on-call contact
* SMS to caller confirming receipt

#### Step 2 — Wait Period

* Wait X minutes (default: 3, configurable)
* Check for acknowledgment (reply or app interaction)

#### Step 3 — Outbound Voice Call (Emergency Only)

If no acknowledgment:

* Place **outbound voice call** to on-call contact
* Play short TTS alert: "You have an emergency call from [Business Name]. A customer reported [summary]. Please check your messages."
* Log call attempt

#### Step 4 — Backup Escalation

If still no response after voice attempt:

* SMS to backup contact
* Repeat voice escalation to backup (if configured)

---

### Outbound Voice Rules (STRICT)

* System → internal staff ONLY
* NEVER to customers
* Emergency-only (non-emergency voice retries forbidden)
* Max 2 attempts per contact
* Configurable enable/disable per business

---

## 12. COST & USAGE CONTROL (LOCKED)

### Included Minutes

* Each plan includes X voice minutes/month
* Usage tracked in real-time
* Displayed in portal dashboard

### Usage Warnings

* **70%:** "You're approaching your monthly AI Voice limit."
* **90%:** "High usage detected. Consider upgrading or narrowing voice scope."

### At 100% — Defined Behavior (CRITICAL)

#### Default Behavior (Automatic Overage)

* AI Voice **continues operating**
* Overage billing begins automatically at $0.08/min
* Banner shown in portal: "Overage billing active"
* No service interruption

**Rationale:** Hard stops create missed emergencies → liability.

#### Optional Hard Cap (Explicit Opt-In)

Advanced toggle:

```
enable_usage_hard_cap: boolean (default = false)
```

If enabled:

* AI Voice **disables** when included minutes exhausted
* SMS AI remains active
* UI shows: "AI Voice paused due to usage cap"
* Emergency routing continues via SMS only

**Default:** OFF

---

## 13. CALL RECORDING & PRIVACY (MVP LOCKED)

### Core Position

> Trades Captain is a **response system**, not a surveillance system.

### MVP Behavior (NON-NEGOTIABLE)

* ❌ No raw audio recording
* ❌ No voice transcripts stored
* ❌ No playback UI
* ✅ Structured metadata stored
* ✅ AI-generated summaries stored

---

### What IS Stored

#### Call Event Metadata

```
call_start_time
call_end_time
call_duration_seconds
availability_state
answer_certainty_signal (TIMEOUT | FORWARD | IMMEDIATE)
was_ai_answered: boolean
was_missed: boolean
is_emergency: boolean
emergency_source
voicemail_requested: boolean
routing_action_taken
```

#### AI-Generated Call Summary

Short, non-verbatim summary derived after call.

**Example:**

> "Caller reported active water leak at residential address. Emergency flagged. SMS sent to on-call technician."

This is:

* Operational data
* Not a recording
* Not replayable
* Legally safer

---

### Handling Disputes Without Recordings

Position for support/sales:

> "Trades Captain logs what actions were taken, when, and how the call was routed. It's designed to prove responsiveness, not replay conversations."

Evidence available:

* Call answered timestamp
* Emergency flagged (yes/no + source)
* SMS sent timestamp
* Technician notified
* Follow-up occurred

This resolves 90% of disputes without audio.

---

### Future Recording (Phase 2, Not MVP)

See **Appendix B: Phase 2 Call Recording Addendum**.

---

## 14. DATA MODEL (ABSTRACT — LOCKED)

### business_availability

```
business_id
availability_state
start_time
end_time
timezone
```

### voice_settings

```
business_id
ring_timeout_seconds
answer_certainty_mode
enabled_states[]
enable_daytime_ai_voice
greeting_text
emergency_enabled
voicemail_escape_enabled (default: true)
enable_usage_hard_cap (default: false)
```

### emergency_rules

```
business_id
category
phrase
phrase_type (REQUIRED | OPTIONAL)
triggers_routing
keypad_enabled
```

### escalation_settings

```
business_id
primary_contact_id
backup_contact_id
escalation_wait_minutes
emergency_voice_escalation_enabled
max_voice_attempts
```

### conversation_threads

```
id
business_id
caller_phone
source (VOICE | SMS)
is_emergency
emergency_source
voicemail_requested
status
```

### call_events

```
conversation_id
timestamp
event_type
availability_state
answer_certainty_signal
call_duration_seconds
ai_summary
```

### usage_tracking

```
business_id
billing_period_start
included_minutes
used_minutes
overage_minutes
hard_cap_enabled
hard_cap_triggered_at
```

---

## 15. FAIL-SAFE RULES (ABSOLUTE)

* Voice never competes with humans
* Voice never schedules
* Voice never sells
* Voice never promises dispatch
* SMS always overrides voice
* Humans always override AI
* Callers can always escape to voicemail
* Emergency confirmation is always asked
* No call audio is ever recorded (MVP)
* Overage billing is transparent
* AI disclosure plays on every call

If conflict exists → disable AI.

---

## 16. BUSINESS PORTAL UX (REQUIRED)

### 16.1 Availability Setup

Prompt wording MUST be:

> "When is a human guaranteed to answer the phone?"

User configures:

* Availability states
* Time windows
* Timezone
* Ring timeout
* Answer certainty mode

---

### 16.2 Advanced Voice Controls

* Toggle: Daytime AI Voice (OFF by default)
* Toggle: Usage Hard Cap (OFF by default)
* Per-day time window support
* Emergency-only voice option

Warnings REQUIRED before activation.

---

### 16.3 Emergency Definition UI

See **Appendix A: Emergency Definition UI Specification**.

---

### 16.4 Escalation Configuration

* Primary on-call contact
* Backup contact
* Wait time before escalation
* Toggle: Emergency voice escalation (ON by default)
* Max voice attempts (default: 2)

---

### 16.5 Preview & Simulation

* Voice script preview
* Emergency simulation (test phrase detection + confirmation flow)
* SMS output preview
* Escalation ladder preview

No live calls required.

---

### 16.6 Usage & Cost Dashboard

* Minutes used / included (progress bar)
* Overage rate displayed
* Hard cap toggle
* Billing period indicator

---

## 17. SYSTEM DEFINITION (LOCKED)

> This system provides after-hours and on-call AI voice coverage by default, with optional daytime AI voice enabled only through explicit user intent. Voice AI discloses its automated nature on every call, captures intent through deterministic emergency triage, always offers a voicemail escape, and hands off all continuity to SMS. Emergency escalation may include outbound voice calls to staff. The system yields instantly to human control, never records call audio, and operates within transparent usage limits.

---

## 18. STOP CONDITIONS

STOP implementation if:

* Voice attempts staff replacement behavior
* Daytime voice activates without consent
* SMS handoff fails
* AI overrides human input
* Call audio is recorded or stored
* Emergency confirmation is skipped
* Voicemail escape is unavailable
* Overage billing is hidden or unclear
* AI disclosure fails to play

Resolve before proceeding.

---

## 19. LEGAL DISCLOSURES & TERMS (LOCKED)

### 19.1 Caller-Facing AI Disclosure (VOICE)

**Location:** First 5 seconds of AI Voice greeting  
**Purpose:** Transparency, deception prevention

Required script:

> "This call is answered by an automated assistant to help route your message. Calls are not recorded."

Rules:
* Must play before any other interaction
* Must be audible and unhurried
* Same script for all states
* Do NOT mention consent for talking to AI
* Do NOT mention AI training

---

### 19.2 In-Product Disclosure (BUSINESS PORTAL)

**Location:** Business Portal → Settings → AI Voice & SMS  
**Visibility:** Always visible, non-dismissible

```
AI Voice & SMS Notice

Trades Captain provides AI-assisted voice and SMS tools to help 
respond to inbound customer inquiries when a human is unavailable.

Calls are not recorded or stored.
Trades Captain does not record, retain, or store call audio or 
verbatim transcripts. AI Voice operates in real time only.

AI Voice is designed for intake and message routing, not for 
dispatching technicians, providing professional advice, or 
replacing emergency services.

Message continuity may occur via SMS after a call ends.
```

---

### 19.3 Setup-Time Emergency Disclaimer

**Location:** AI Voice setup flow (before enabling)  
**Action:** User must click **Continue** to proceed

```
Emergency Handling Disclaimer

Trades Captain's AI Voice may assist with identifying and routing 
urgent requests based on information provided by callers.

Trades Captain does not guarantee response times, technician 
availability, or service outcomes.

For life-threatening or immediately dangerous situations, callers 
should contact local emergency services.
```

---

### 19.4 Terms of Service — AI Voice & SMS Section

**Location:** Master Terms of Service

---

#### 19.4.1 No Call Recording or Transcription

Trades Captain does not record, store, or retain call audio or verbatim voice transcripts by default. Any summaries generated by the system are non-verbatim operational descriptions intended solely to document routing actions and system behavior.

Trades Captain is not a call recording or surveillance service.

---

#### 19.4.2 Scope of Service

AI Voice and AI SMS are limited to:

* Answering inbound calls when a human does not answer
* Collecting basic caller information
* Routing messages and alerts
* Supporting follow-up via SMS or internal notifications

AI Voice and AI SMS do NOT:

* Dispatch technicians
* Guarantee service availability
* Provide professional, technical, medical, or safety advice
* Replace human judgment or emergency services

---

#### 19.4.3 Emergency Situations

AI Voice may assist with identifying urgent or emergency requests based on caller input and customer-defined rules.

Trades Captain does NOT:

* Monitor physical conditions
* Verify emergencies
* Guarantee emergency response
* Replace emergency responders

For emergencies, callers should contact appropriate local emergency services.

---

#### 19.4.4 Customer Configuration Responsibility

Customers are solely responsible for:

* Defining availability hours
* Identifying emergency categories and trigger phrases
* Configuring on-call contacts and escalation rules
* Maintaining accurate contact information

Trades Captain is not responsible for service failures resulting from misconfiguration, unreachable contacts, carrier delays, or customer operational decisions.

---

#### 19.4.5 Usage-Based Billing

AI Voice usage is subject to included minute limits and usage-based overage charges, as disclosed at the time of purchase.

Unless explicitly disabled by the customer, AI Voice may continue operating beyond included usage limits, and additional usage will be billed automatically at the applicable rate.

Trades Captain does not guarantee cost ceilings unless a customer explicitly configures usage caps.

---

#### 19.4.6 No Reliance

Customers agree not to rely on AI Voice or AI SMS as the sole method for:

* Emergency response
* Safety-critical communications
* Regulatory compliance
* Business continuity planning

AI Voice and AI SMS are assistive tools, not guaranteed response systems.

---

### 19.5 Support FAQ (Internal Reference)

**Q: Are calls recorded?**
> No. Trades Captain does not record or store call audio.

**Q: Can customers use this for emergencies?**
> AI Voice can help route urgent requests, but it does not replace emergency services or guarantee response times.

**Q: What if someone claims the AI missed something?**
> Trades Captain logs when calls were answered and what actions were taken. It does not store call recordings.

---

## 20. PRIVACY POLICY — AI VOICE & SMS (LOCKED)

### 20.1 Overview

This section describes how Trades Captain collects, processes, and protects data related to AI Voice and SMS services.

---

### 20.2 Data We Collect

#### 20.2.1 Caller Data

* Phone number (required for SMS follow-up)
* Name (if provided by caller)
* Reason for call (if provided by caller)
* Emergency status (yes/no, as determined by system)

#### 20.2.2 Call Metadata

* Call start and end timestamps
* Call duration
* Availability state at time of call
* How call was answered (timeout, forward, immediate)
* Whether caller requested voicemail
* Routing actions taken

#### 20.2.3 AI-Generated Summaries

* Short, non-verbatim descriptions of call purpose
* Emergency classification and source
* Routing decisions made

#### 20.2.4 SMS Content

* Inbound and outbound SMS messages
* Timestamps
* Delivery status

---

### 20.3 Data We Do NOT Collect

* Call audio recordings
* Verbatim voice transcripts
* Voicemail audio content (reference only)
* Caller location data
* Device identifiers beyond phone number

---

### 20.4 How We Use Data

Data collected through AI Voice and SMS is used to:

* Route calls and messages to appropriate contacts
* Identify and escalate emergencies
* Provide conversation continuity via SMS
* Generate usage reports and billing
* Improve service reliability (aggregate, anonymized only)

We do NOT use caller data to:

* Train AI models on individual conversations
* Sell or share with third parties for marketing
* Build caller profiles beyond the immediate business relationship

---

### 20.5 Data Retention

| Data Type | Retention Period | Deletion |
|-----------|------------------|----------|
| Call metadata | 90 days | Automatic |
| AI summaries | 90 days | Automatic |
| SMS content | 90 days | Automatic |
| Conversation threads | 90 days after last activity | Automatic |
| Voicemail references | 30 days | Automatic |

Customers may request earlier deletion of specific conversation threads.

Business account data (settings, contacts, rules) is retained until account termination.

---

### 20.6 Data Sharing

#### 20.6.1 Service Providers (Subprocessors)

Trades Captain uses the following categories of service providers to deliver AI Voice and SMS:

* **Telephony Provider** (e.g., Twilio): Call routing, SMS delivery
* **Cloud Infrastructure** (e.g., AWS, GCP): Data storage, processing
* **AI Model Provider** (e.g., OpenAI, Anthropic): Real-time voice processing (no persistent storage by provider)

All subprocessors are bound by data processing agreements.

#### 20.6.2 Business Customers

Caller data and conversation content is shared with the business customer whose phone number was called. This is the primary purpose of the service.

#### 20.6.3 Legal Requirements

We may disclose data if required by law, court order, or government request.

---

### 20.7 Data Security

* All data encrypted in transit (TLS 1.2+)
* All data encrypted at rest (AES-256)
* Access controls enforced by role
* Audit logs maintained for data access
* No call audio to secure (not collected)

---

### 20.8 Caller Rights

Callers may:

* Request deletion of their conversation data by contacting the business
* Opt out of SMS follow-up by replying STOP
* Choose voicemail instead of AI interaction (press 9)

Trades Captain does not maintain direct relationships with callers. Rights requests should be directed to the business that was called.

---

### 20.9 Business Customer Rights

Business customers may:

* Export conversation data via API or portal
* Delete specific conversation threads
* Request full account data deletion upon termination
* Configure retention preferences (within platform limits)

---

### 20.10 Children's Privacy

AI Voice and SMS services are not directed at children under 13. We do not knowingly collect data from children. If a business becomes aware that a caller is under 13, they should delete the relevant conversation data.

---

### 20.11 California Privacy Rights (CCPA)

California residents have additional rights under CCPA:

* Right to know what personal information is collected
* Right to delete personal information
* Right to opt out of sale (we do not sell personal information)
* Right to non-discrimination

To exercise these rights, contact us at privacy@tradescaptain.com.

---

### 20.12 International Data

Trades Captain processes data in the United States. By using the service, callers and customers consent to data transfer to the US.

For EU/UK customers: We rely on Standard Contractual Clauses for lawful data transfer. Contact us for a Data Processing Addendum.

---

### 20.13 Changes to Privacy Policy

We may update this policy periodically. Material changes will be communicated via email or in-product notice at least 30 days before taking effect.

---

### 20.14 Contact

For privacy questions or requests:

* Email: privacy@tradescaptain.com
* Mail: [Company Address]

---

## 21. SYSTEM DEFINITION (FINAL)

> Trades Captain AI Voice & SMS is a response continuity system that ensures every inbound call receives acknowledgment. It operates transparently (AI disclosure on every call, no call recording), deterministically (business-defined emergency rules), and subordinately (humans always override AI). The system is designed for intake and routing, not advice, dispatch, or surveillance.

---

## CHANGELOG

### v1.5 (Current)

* Added Section 7.4: Uniform AI Disclosure (mandatory on all calls)
* Added Appendix F: AI Voice Compliance (Non-Recording)
* Enhanced Appendix D with PA criminal liability detail
* Added Appendix G: Sales Scripts (Verbatim)
* Updated fail-safe rules to include AI disclosure
* Clarified that no per-state AI voice logic is needed
* Integrated "silence = refusal" rule for recording consent

### v1.4

* Added Appendix B.4: Recording Settings UX Specification
* Added Appendix C: California Compliance Addendum
* Added Appendix D: Multi-State Compliance Matrix
* Added Appendix E: Customer-Facing FAQ (Recording & Privacy)

### v1.3

* Added Section 19: Legal Disclosures & Terms
* Added Section 20: Privacy Policy — AI Voice & SMS
* Added Appendix A: Emergency Definition UI Specification
* Added Appendix B: Phase 2 Call Recording Addendum

### v1.2

* Added dual-signal answer certainty model
* Added business-defined emergency trigger phrases
* Added voicemail escape hatch
* Added emergency-only outbound voice escalation
* Locked no-recording stance

### v1.1

* Initial locked version
* Guardrailed control model established

### v1.0

* Draft specification

---

### 🔐 END OF MASTER BUILD PROMPT

**Version:** v1.5  
**Status:** LOCKED

---

---

# APPENDIX A: EMERGENCY DEFINITION UI SPECIFICATION

## AI Voice & SMS — Emergency Rules Builder (LOCKED)

**Audience:** Business owners / admins  
**Location:** Business Portal → Settings → Communications → AI Voice & SMS → **Emergency Rules**  
**Core Principle:** *The business defines emergencies. The system enforces them.*

---

## A.1 PAGE FRAMING (CRITICAL)

### Page Title

**Emergency Definitions & Routing**

### Subheader (always visible)

> These rules determine when AI treats a call as an emergency and who gets alerted.  
> Trades Captain does not decide what an emergency is — **you do**.

This copy transfers ownership immediately.

---

## A.2 TOP-LEVEL SAFETY NOTICE (NON-DISMISSABLE)

Persistent info bar:

> ⚠️ **Important:** Emergency rules affect after-hours routing and escalation.  
> AI does not dispatch technicians or replace emergency services.

---

## A.3 SECTION A — EMERGENCY MODE TOGGLE

### Master Toggle

**Enable Emergency Detection**

* 🔘 On (default)
* 🔘 Off

Helper text:

> When enabled, AI Voice can identify emergency calls and alert your on-call contacts.

If OFF:

* Emergency UI collapses
* AI Voice behaves as non-emergency intake only
* SMS still works normally
* Caller confirmation question still asked (cannot be disabled)

---

## A.4 SECTION B — EMERGENCY CATEGORIES

Structured checklist, not free text.

### Default Categories (Editable)

| Category | Default State |
|----------|---------------|
| Gas smell / gas leak | ☐ |
| Active water leak / flooding | ☐ |
| No heat (cold weather) | ☐ |
| No AC (hot weather) | ☐ |
| Electrical hazard | ☐ |
| Sewage backup | ☐ |
| Lockout | ☐ |
| Other (custom) | ☐ |

Each enabled category expands to show rule details.

---

## A.5 SECTION C — CATEGORY RULE DETAILS

### C.1 Trigger Methods (At Least One Required)

#### Trigger A — Caller Confirmation (Default ON, Recommended)

☑ Caller answers "Yes" to "Is this an emergency?"

Tooltip: *This is the most reliable trigger.*

---

#### Trigger B — Required Trigger Phrases

Input field for comma-separated phrases.

Example: `gas smell, gas leak, flooding, burst pipe`

Rules:
* Exact or close match only
* Required phrases = immediate emergency (no confirmation)
* No confidence scoring

Helper: *Required phrases immediately mark a call as an emergency.*

---

#### Trigger C — Optional Trigger Phrases

Input field for comma-separated phrases.

Example: `water problem, backup, pressure issue`

Rules:
* Optional phrases trigger confirmation question
* Caller must confirm "Yes" to proceed as emergency

Helper: *Optional phrases ask the caller to confirm urgency.*

---

#### Trigger D — Keypad Override

☐ Allow callers to press **1** to mark as emergency

Helper: *Useful for panicked callers who can't explain clearly.*

---

### Validation Rule

At least **one trigger method must be enabled per category**, or save is blocked.

---

## A.6 SECTION D — ROUTING PER CATEGORY

### D.1 Primary Alert Method

* ☑ SMS to on-call contact (default)
* ☐ SMS to group
* ☐ Internal notification only

---

### D.2 Escalation Ladder

**If not acknowledged within:** [ 3 ] minutes → escalate to:

* ☐ Outbound voice call to on-call contact
* ☐ SMS to backup contact
* ☐ Outbound voice call to backup contact

Microcopy: *Voice escalation is used only for confirmed emergencies.*

---

### D.3 Caller Messaging Preview (Read-Only)

Shows exact SMS caller will receive:

> "🚨 Emergency received. We've alerted the on-call technician. If this is life-threatening, contact emergency services."

---

## A.7 SECTION E — NON-EMERGENCY CLARIFICATIONS (OPTIONAL)

Text area for internal reference:

> "Slow drains, estimate requests, and general questions are not emergencies."

Not used by AI — shown to business only for clarity.

---

## A.8 SECTION F — SIMULATION & TESTING

Buttons:

* 🧪 **Simulate Emergency Call**
* 🧪 **Simulate Ambiguous Phrase**
* 🧪 **Simulate False Positive**

Output shows:
* Which trigger fired
* Emergency = true/false
* Routing steps taken
* SMS preview
* Escalation timeline

No live calls. No billing.

---

## A.9 SECTION G — AUDIT LOG (READ-ONLY)

For each emergency event:

* Timestamp
* Category triggered
* Trigger method
* Routing actions
* Acknowledgment time

**No audio. No transcript.**

---

## A.10 SAVE VALIDATION RULES

Block save if:

* Emergency detection ON but no categories enabled
* Category has zero triggers
* Escalation enabled with no contacts defined

Error example: *"Each emergency category must have at least one trigger."*

---

## A.11 UX PRINCIPLES

* No fuzzy AI language
* No hidden defaults
* No silent behavior
* Every emergency path is explainable
* Every decision is attributable to configuration

---

## A.12 DESIGN INTENT

> The Emergency Definition UI should feel like a checklist for responsibility — clear, deliberate, and impossible to misunderstand later.

---

### 🔐 END OF APPENDIX A

---

---

# APPENDIX B: PHASE 2 CALL RECORDING ADDENDUM

## JURISDICTION-AWARE (LOCKED)

**Status:** Phase 2 — NOT ACTIVE IN MVP  
**Default State:** Disabled for all accounts  
**Philosophy:** *Recording is a legal feature, not a convenience feature.*

---

## B.0 EXPLICIT SCOPE BOUNDARY

Call recording and transcription are:

* ❌ NOT part of MVP
* ❌ NOT enabled by default
* ❌ NOT required for system operation
* ❌ NOT enabled without explicit business action

This addendum defines behavior **if and only if recording is enabled in Phase 2**.

---

## B.1 ACTIVATION REQUIREMENTS (ALL REQUIRED)

Recording may be enabled only if **all** conditions are met:

1. Business explicitly enables recording in settings
2. Business acknowledges legal responsibility
3. Jurisdiction consent model is configured
4. Caller disclosure is enabled
5. Retention policy is set
6. Recording scope is defined

Any missing requirement → recording remains disabled.

---

## B.2 JURISDICTION MODEL

### Consent Models

```
ConsentModel:
  - ONE_PARTY
  - ALL_PARTIES (default)
```

### Configuration Rules

* Default: ALL_PARTIES
* Business must explicitly attest to one-party jurisdiction to change
* No automatic geolocation assumptions

**Trades Captain does not determine consent legality. The business declares it.**

---

## B.3 CALLER DISCLOSURE (MANDATORY)

### Timing

Disclosure MUST occur:
* At beginning of call
* Before recording starts

### Required Script (Locked)

> "This call may be recorded for quality and training purposes."

No variations. No shortened versions. Copy cannot be edited.

---

## B.4 RECORDING SETTINGS UX SPECIFICATION

**Location:** Business Portal → Settings → Communications → AI Voice & SMS → **Call Recording**  
**Audience:** Business Owner / Admin only  
**Design Goal:** *Make accidental recording impossible.*

---

### B.4.1 Entry Framing

#### Page Title

**Call Recording & Transcription**

#### Persistent Warning Banner (Non-Dismissable)

> ⚠️ Call recording laws vary by jurisdiction.  
> Improper configuration may violate consent laws.  
> Trades Captain does not provide legal advice.

This banner **must always be visible** when recording section is accessed.

---

### B.4.2 Status Card (Read-Only First)

Before any configuration:

| Setting | Status |
|---------|--------|
| Recording | ❌ Disabled |
| Consent Model | Not configured |
| Recording Scope | Not configured |
| Retention | Not configured |

Primary CTA: **Enable Call Recording**

No toggles visible until wizard is completed. This prevents half-configured states.

---

### B.4.3 Enable Flow (Wizard, Not Toggles)

Recording can only be enabled via a **guided, step-by-step flow**.

#### Step 1 — Legal Responsibility Acknowledgment

Required checkbox:

> ☐ I understand that call recording laws vary by jurisdiction and that I am solely responsible for complying with all applicable consent and disclosure requirements. Trades Captain does not provide legal advice.

CTA disabled until checked.

---

#### Step 2 — Consent Model Selection

**How do consent laws apply to your calls?**

* ⦿ **All-Parties Consent (Recommended)**  
  Recording requires caller consent on every call.
  
* ⭘ **One-Party Consent**  
  I confirm my business operates only in jurisdictions where one-party consent is lawful.

Helper: *When in doubt, choose All-Parties Consent.*

Default: **All-Parties Consent**

---

#### Step 3 — Caller Disclosure Preview

Read-only display:

> "This call may be recorded for quality and training purposes."

Copy cannot be edited. Prevents accidental non-compliance.

---

#### Step 4 — Recording Scope

**Which calls should be recorded?**

* ☑ After-Hours AI Voice only *(default, recommended)*
* ☐ Daytime AI Voice
* ☐ Human-answered calls *(advanced)*

If "Human-answered calls" selected, show warning modal:

> ⚠️ Recording human-answered calls significantly increases legal risk.  
> Ensure your staff is trained and disclosures are consistent.

---

#### Step 5 — Transcription (Optional)

Toggle: **Enable Transcription**

* 🔘 Off (default)
* 🔘 On

Helper:

> Transcriptions are generated from recordings and stored as text.  
> No sentiment analysis. No AI training.

---

#### Step 6 — Retention Period

Dropdown (required):

* 7 days
* ⦿ 14 days *(default)*
* 30 days
* 90 days

Helper: *Recordings are automatically deleted after this period.*

---

#### Step 7 — Final Review & Enable

Summary card showing all selections:

* Consent model
* Recording scope
* Disclosure text
* Retention period
* Transcription status

Final checkbox:

> ☐ I confirm this configuration is accurate.

CTA: **Enable Recording**

---

### B.4.4 Active Recording State (Post-Enable)

Once enabled, show **locked configuration summary**.

| Setting | Value |
|---------|-------|
| Recording | ✅ Enabled |
| Consent Model | All-Parties |
| Scope | After-Hours AI Voice |
| Retention | 14 days |
| Transcription | Off |

CTA: **Disable Recording**

**No inline edits.** Any change requires Disable → Re-enable Wizard.

This prevents configuration drift.

---

### B.4.5 Access & Audit Controls

#### Access Rules (Enforced)

* Owner / Admin only
* No technician access by default
* Role-based permissions required for any expansion

#### Audit Log

All access events logged:
* Who accessed a recording
* When
* Which call
* Action taken (view, download, delete)

Link to full audit log from settings page.

---

### B.4.6 Fail-Safe UX Rules

* No partial configuration allowed
* No silent enablement
* No editing without re-acknowledgment
* No auto-recording on misconfig
* Any required field missing → recording stays disabled

---

### B.4.7 UX Design Intent

> The Recording Settings page should feel more like a compliance form than a feature toggle.

This is intentional and required.

---

## B.5 CONSENT HANDLING

### ONE-PARTY MODE

* Disclosure plays
* Recording begins automatically
* No caller action required

### ALL-PARTIES MODE (Default)

Recording MUST NOT begin until consent captured.

Script:

> "If you consent to this call being recorded, please say 'yes' or press 1."

Outcomes:
* Yes / Press 1 → recording begins
* No / Silence / Other → recording disabled for that call

**Silence = Refusal.** No retries. No persuasion.

---

## B.6 VOICEMAIL & RECORDING INTERACTION

If caller chooses voicemail:

* Recording applies only if consent was captured before voicemail
* Otherwise voicemail is **not recorded**
* Metadata only stored (timestamp, duration)

---

## B.7 TRANSCRIPTION (OPTIONAL, SEPARATE)

* Off by default
* Optional per business
* Derived from recorded audio only
* No real-time transcription to callers
* No sentiment analysis
* Plain text only

---

## B.8 RETENTION

Business must choose:

```
RetentionPeriod:
  - 7 days
  - 14 days (default)
  - 30 days
  - 90 days
```

Rules:
* Automatic deletion after period
* No indefinite storage
* No manual export without admin role

---

## B.9 ACCESS CONTROL

Allowed roles:
* Business Owner
* Admin

No technician access by default.

All access events logged:
* Who accessed
* When
* Which recording
* Action taken

---

## B.10 LIABILITY POSITIONING

Recordings are provided:
* For internal quality review only
* Not as certified records
* Not guaranteed complete or accurate

Trades Captain does NOT:
* Verify consent legality
* Guarantee admissibility
* Arbitrate disputes

---

## B.11 FAIL-SAFE RULES

* Consent capture fails → no recording
* Disclosure fails → no recording
* Jurisdiction undefined → no recording
* Retention undefined → no recording

**Fail closed. Always.**

---

## B.12 STOP CONDITIONS

STOP if:
* Recording occurs without disclosure
* Recording occurs without consent in ALL-PARTIES mode
* Retention deletion fails
* Unauthorized access occurs

Fix before proceeding.

---

### 🔐 END OF APPENDIX B

---

---

# APPENDIX C: CALIFORNIA COMPLIANCE ADDENDUM

## CIPA-ALIGNED (LOCKED)

**Applies to:** Businesses enabling Call Recording (Phase 2)  
**Jurisdiction:** California  
**Status:** Phase 2 Only — Recording Disabled by Default

---

## C.1 LEGAL FRAMEWORK (REFERENCE)

This appendix aligns with:

* **California Invasion of Privacy Act (CIPA)**  
  California Penal Code §§ 630–638.55
* California case law interpreting:
  * "Confidential communications"
  * Affirmative consent requirements
  * Prohibitions on implied consent

This appendix does **not** constitute legal advice.

---

## C.2 DEFAULT COMPLIANCE POSTURE

For California-impacted calls, Trades Captain enforces:

* **All-Parties Consent** (default)
* **Affirmative consent required** before recording
* **No implied consent**
* **No silent recording**
* **No recording without disclosure**

If any required step fails → **recording does not occur**.

---

## C.3 DISCLOSURE REQUIREMENTS

### Timing

Disclosure MUST occur:
* At the **start of the call**
* **Before** any recording begins

### Language (Locked)

> "This call may be recorded for quality and training purposes."

Cannot be edited. Ensures consistency.

---

## C.4 CONSENT CAPTURE

### Affirmative Consent Only

Recording begins **only after** caller provides affirmative consent:

* Saying "yes", or
* Pressing **1** when prompted

### No Consent = No Recording

If caller:
* Declines
* Remains silent
* Provides ambiguous response

→ **Recording does not occur.** Call continues without recording.

---

## C.5 PROHIBITION ON IMPLIED CONSENT

Under California law, **continued participation ≠ consent**.

Trades Captain does NOT:
* Rely on continued call participation
* Record based solely on disclosure
* Infer consent from silence or ambiguity

---

## C.6 VOICEMAIL EDGE CASE

If caller leaves voicemail **without prior affirmative consent**:

* ❌ Voicemail audio is NOT recorded
* ✅ Metadata only stored (timestamp, duration)
* ❌ No transcription occurs

This avoids common CIPA violations.

---

## C.7 RECORDING SCOPE (CA-SAFE DEFAULTS)

For California exposure, defaults to:

* ☑ **After-Hours AI Voice only** (recommended)
* ☐ Daytime AI Voice
* ☐ Human-answered calls (high risk, additional warnings required)

---

## C.8 DATA RETENTION

### Default: 14 days

Rules:
* Automatic deletion after retention period
* No indefinite storage
* No archival backups accessible to customers

Aligns with California data minimization expectations.

---

## C.9 ACCESS CONTROL & AUDIT

### Access Restrictions

* Business Owner / Admin only
* No technician access by default

### Audit Logs

Trades Captain logs:
* Consent capture event
* Recording start/stop
* Access to recordings
* Deletion events

Audit logs retained separately from audio.

---

## C.10 RESPONSIBILITY ALLOCATION

### Trades Captain Responsibilities

* Provide disclosure + consent mechanisms
* Fail closed when consent missing
* Enforce retention and access controls
* Prevent silent or implied recording

### Customer Responsibilities

* Correctly assess California law applicability
* Configure consent model appropriately
* Train staff if recording human-answered calls
* Use recordings lawfully

Trades Captain does NOT:
* Determine caller jurisdiction
* Provide legal advice
* Guarantee compliance outcomes

---

## C.11 FAILURE MODE

If any of the following occur:
* Disclosure fails
* Consent capture fails
* Configuration incomplete
* Retention undefined

→ **Recording automatically disabled.**

Fail-closed behavior is required for California safety.

---

## C.12 SUMMARY STATEMENT (PUBLIC-FACING)

Optional display for California customers:

> Trades Captain supports California call-recording compliance by requiring explicit caller consent before recording and by disabling recording when consent is not obtained.

---

## C.13 CHANGE CONTROL

Any modification to:
* Disclosure language
* Consent flow
* Recording scope defaults

**Must be reviewed** for California compliance impact before release.

---

### 🔐 END OF APPENDIX C

---

---

# APPENDIX D: MULTI-STATE COMPLIANCE MATRIX

## CALL RECORDING CONSENT REQUIREMENTS (LOCKED)

**Purpose:** Quick reference for state-by-state consent requirements  
**Scope:** Phase 2 Recording Features Only

---

## D.1 CONSENT MODEL BY STATE

| State | Consent Model | Risk Level | Criminal? | Notes |
|-------|---------------|------------|-----------|-------|
| **California** | All-Parties | 🔴 High | No (Civil) | CIPA + class action risk. See Appendix C. |
| **Pennsylvania** | All-Parties | 🔴 High | **Yes** | Criminal penalties. See D.6. |
| **Florida** | All-Parties | 🔴 High | No (Civil) | Ambiguous "reasonable expectation" standard |
| **Illinois** | All-Parties | 🔴 High | No (Civil) | BIPA-adjacent awareness |
| **Maryland** | All-Parties | 🟠 Medium | No | Strict interpretation |
| **Massachusetts** | All-Parties | 🟠 Medium | No | Requires consent from all parties |
| **Washington** | All-Parties | 🟠 Medium | No | Private right of action |
| **Texas** | One-Party | 🟢 Lower | No | Multi-state calls inherit stricter rules |
| **New York** | One-Party | 🟢 Lower | No | Business calls may differ |
| **Most other states** | One-Party | 🟢 Lower | No | Verify before assuming |

---

## D.2 DEFAULT BEHAVIOR (NON-NEGOTIABLE)

Trades Captain defaults to **ALL-PARTIES** consent for all customers.

Rationale:
* Multi-state callers inherit strictest jurisdiction
* Area code ≠ physical location
* Conservative default = maximum protection

---

## D.3 WHY ONE-PARTY CLAIMS ARE RISKY

Even in one-party states:

* Caller may be in a stricter state
* Multi-party calls (conference) may require all-party consent
* Business/personal distinction may apply
* Interstate commerce can trigger federal rules

**Trades Captain does not determine caller jurisdiction.** The business attests to their operating context.

---

## D.4 FAIL-SAFE BEHAVIOR BY SCENARIO

| Scenario | System Behavior | Recording? |
|----------|-----------------|------------|
| Consent model = ALL-PARTIES, caller says "yes" | Record | ✅ |
| Consent model = ALL-PARTIES, caller says "no" | Continue without recording | ❌ |
| Consent model = ALL-PARTIES, caller silent | Continue without recording | ❌ |
| Consent model = ONE-PARTY, disclosure plays | Record automatically | ✅ |
| Consent model undefined | Fail closed | ❌ |
| Disclosure fails to play | Fail closed | ❌ |
| Voicemail without prior consent | Metadata only | ❌ |

---

## D.5 STATE-SPECIFIC PRESSURE TEST SUMMARY

### California

* **Threat:** Class action, statutory damages
* **Protection:** All-parties default, affirmative consent, fail closed
* **Outcome:** Survives scrutiny

### Florida

* **Threat:** "Reasonable expectation" ambiguity
* **Protection:** No implied consent, explicit confirmation
* **Outcome:** No recording = no violation

### Pennsylvania

* **Threat:** Criminal penalties
* **Protection:** No voicemail recording without consent, fail closed
* **Outcome:** No criminal exposure. See D.6.

### Texas (One-Party but Dangerous)

* **Threat:** Multi-state caller from stricter jurisdiction
* **Protection:** Default = ALL-PARTIES, explicit attestation required for one-party
* **Outcome:** Liability shifts to business if misdeclared

---

## D.6 PENNSYLVANIA — CRIMINAL LIABILITY DETAIL

### Legal Framework

**Pennsylvania Wiretapping and Electronic Surveillance Control Act**  
18 Pa.C.S. §5701 et seq.

Pennsylvania is a **strict all-party consent state** with potential **criminal penalties** for unlawful interception.

### Default Compliance Standard (PA-Specific)

For Pennsylvania-impacted calls:

* **All-Parties Consent REQUIRED**
* **Affirmative consent REQUIRED**
* **No implied consent**
* **No recording without explicit approval**
* **Fail-closed if any uncertainty exists**

### Disclosure & Consent (PA-Safe)

Required disclosure:

> "This call may be recorded for quality and training purposes. Recording will begin only with your consent."

Recording begins **only if** caller says "yes" or presses 1.

**Silence, ambiguity, or non-response = refusal.** Recording does not occur.

### Voicemail (PA Critical)

If caller leaves voicemail **without prior affirmative consent**:

* ❌ Voicemail audio is NOT recorded
* ✅ Metadata only stored
* ❌ No transcription

This avoids criminal exposure related to voicemail interception.

### Recording Scope (PA-Safe)

Recommended:
* ☑ After-Hours AI Voice only
* ☐ Daytime AI Voice
* ☐ Human-answered calls (**high risk** — requires external legal review)

### Fail-Closed Requirement

If any required step fails → **Recording disabled automatically.**

This behavior is mandatory to prevent criminal exposure.

---

## D.7 MULTI-STATE EDGE CASE

**Scenario:** Caller traveling, area code ≠ location, business doesn't know state

**Most platforms fail by:** Attempting geo-inference, getting it wrong, recording anyway

**Trades Captain behavior:**
* No inference
* Default to strictest consent
* Require explicit caller agreement
* Silence = refusal

**Outcome:** Jurisdiction uncertainty never causes illegal recording.

---

## D.8 INVARIANTS (MUST NOT CHANGE)

If any of these change, legal risk increases immediately:

* ❌ Do not auto-enable recording
* ❌ Do not infer caller location
* ❌ Do not rely on "continuing the call" as consent
* ❌ Do not record voicemail by default
* ❌ Do not allow partial config
* ❌ Do not soften disclosure language
* ❌ Do not treat silence as consent

---

### 🔐 END OF APPENDIX D

---

---

# APPENDIX E: CUSTOMER-FACING FAQ (RECORDING & PRIVACY)

## PUBLIC-SAFE, SUPPORT-SAFE (LOCKED)

**Audience:** Help Center, Sales, Customer Support  
**Purpose:** Consistent, defensible answers to common questions

---

## E.1 GENERAL QUESTIONS

### Do you record calls?

By default, **no**. Trades Captain does not record or store call audio unless a business explicitly enables call recording in their settings.

---

### Are calls always recorded when recording is enabled?

No. Businesses choose **which types of calls**, if any, are recorded. Most businesses that enable recording only record after-hours AI-answered calls.

---

### How do I know if a call is being recorded?

If recording is enabled and applies to your call, you will hear a disclosure at the beginning:

> "This call may be recorded for quality and training purposes."

---

## E.2 CONSENT QUESTIONS

### When recording is enabled, how does consent work?

Each business chooses how consent is handled based on applicable laws.

* **All-Parties Consent:** Recording only begins after the caller agrees (says "yes" or presses 1)
* **One-Party Consent:** Recording begins after disclosure plays (no response required)

---

### What if I don't consent to recording?

If consent is required and you decline or don't respond:

* The call proceeds **without recording**
* Normal AI Voice or voicemail behavior continues
* Your conversation is not stored as audio

---

## E.3 DATA & STORAGE QUESTIONS

### Are recordings stored forever?

No. All recordings are automatically deleted after a configurable retention period (7, 14, 30, or 90 days depending on business settings).

---

### Are recordings used to train AI models?

No. Recordings and transcripts are not used to train AI systems. They are used solely for the business's internal quality review.

---

### What data is stored if recording is NOT enabled?

When recording is disabled (the default), Trades Captain stores:

* Call metadata (time, duration, how it was answered)
* AI-generated summary (non-verbatim description)
* SMS conversation content

No call audio or verbatim transcripts are stored.

---

## E.4 ACCESS QUESTIONS

### Who can listen to recordings?

By default, only business owners or administrators can access recordings. Technicians and other staff do not have access unless explicitly granted.

---

### Can Trades Captain employees access my recordings?

No. Trades Captain staff do not access customer recordings except when required for technical support at the customer's explicit request, or when legally compelled.

---

## E.5 EMERGENCY QUESTIONS

### What should callers do in emergencies?

AI Voice is not a replacement for emergency services. Callers experiencing life-threatening emergencies should contact local emergency responders (911 in the US).

AI Voice can help route urgent service requests, but does not guarantee response times or technician availability.

---

## E.6 COMPLIANCE QUESTIONS

### Is Trades Captain responsible for consent compliance?

No. Each business is responsible for complying with applicable call-recording laws in their jurisdiction. Trades Captain provides tools to support consent handling but does not provide legal advice.

---

### Why is recording optional?

Because call recording creates legal obligations and is not required for Trades Captain to function. Many businesses choose not to record calls at all.

Recording is a **compliance feature**, not a default feature.

---

## E.7 QUICK REFERENCE (FOR SUPPORT TEAMS)

| Question | Short Answer |
|----------|--------------|
| Are calls recorded? | Not by default. Business must enable. |
| How long are recordings kept? | 7-90 days depending on settings. |
| Can I opt out of recording? | Yes, if all-parties consent is required. |
| Who can access recordings? | Owner/Admin only by default. |
| Is this used for AI training? | No. |
| What about emergencies? | AI routes but does not guarantee response. Call 911 for life-threatening emergencies. |

---

### 🔐 END OF APPENDIX E

---

---

# APPENDIX F: AI VOICE COMPLIANCE (NON-RECORDING)

## UNIFORM DISCLOSURE STANDARD (LOCKED)

**Scope:** All AI Voice interactions (MVP and beyond)  
**Philosophy:** One conservative, honest disclosure works everywhere.

---

## F.1 THE CORE TRUTH

> **AI voice calls create *communications* risk, not *recording* risk.**

Most state liability around AI voice does NOT come from "AI answering a call."

It comes from:
* Deception
* Misrepresentation
* Failure to disclose automation
* Unsafe advice
* Implied guarantees

Trades Captain eliminates these risks through **uniform disclosure + strict scope control**.

---

## F.2 DO YOU NEED STATE-BY-STATE AI VOICE LOGIC?

**No. Absolutely not.**

That would be expensive, brittle, and unnecessary.

What you need is a **nationally conservative baseline** that already satisfies the strictest states.

This is the same philosophy used for recording — and it works here too.

---

## F.3 WHAT STATES ACTUALLY CARE ABOUT

Across CA, FL, PA, TX, and most others, regulators care about **four things**:

| Concern | Resolution |
|---------|------------|
| Is the caller misled into thinking they're talking to a human? | AI disclosure on every call |
| Does the system give advice it shouldn't? | No diagnosing, no instructions, no safety advice |
| Does it promise outcomes or authority it doesn't have? | No scheduling, no dispatch promises |
| Is automation disclosed clearly? | Uniform disclosure script |

Trades Captain addresses all four.

---

## F.4 UNIFORM AI DISCLOSURE (MANDATORY)

### Required Script

Within the first 5–10 seconds, AI Voice must say:

> "This call is answered by an automated assistant to help route your message. Calls are not recorded."

### Why This Works Everywhere

* Satisfies CA consumer-protection expectations
* Avoids deceptive-practice claims
* Neutral (not scary)
* Does not invite consent complexity
* Does not imply recording
* Works in all states

**Do NOT vary this by state.**

---

## F.5 WHAT NOT TO DO

| ❌ Do Not | Reason |
|----------|--------|
| Say "AI" repeatedly | Unnecessary, can confuse callers |
| Say "robot" or "bot" | Sounds unprofessional |
| Require caller consent to talk to AI | Creates friction, not legally required |
| Branch scripts by state | Increases complexity, no benefit |
| Geo-infer location | Unreliable, creates false confidence |

These create more risk than they solve.

---

## F.6 STATE-AWARE GUARDRAILS (ALREADY COVERED)

### A. No Professional Advice (All States)

Already locked in main spec:
* No diagnosing
* No instructions
* No safety advice
* Emergency services disclaimer

Especially important in CA & PA.

### B. No Deceptive Representation

AI must not:
* Pretend to be a person
* Use human names without disclosure
* Say "I'll dispatch someone" unless a human actually is

### C. Emergency Deference

For all states:

> "If this is unsafe or life-threatening, contact emergency services."

Critical for liability insulation.

---

## F.7 NO PER-STATE AI VOICE TOGGLES

**Why not:**

* No clean legal line like recording consent
* Laws are vague and evolving
* Guessing creates liability
* Inconsistent experiences
* Increased support burden

Courts reward **reasonable, conservative disclosure**, not over-engineering.

---

## F.8 PRODUCT POSTURE (LOCKED)

### For MVP and Phase 2:

* ✅ One national AI disclosure
* ✅ No recording by default
* ✅ No advice / no guarantees
* ✅ Emergency disclaimers
* ✅ Deterministic behavior
* ❌ No per-state AI voice logic

This is how large telecom and IVR providers operate.

---

## F.9 FUTURE OPTIONS (NOT REQUIRED NOW)

Phase 3+ ideas:
* Admin toggle: "Use 'automated assistant' vs 'virtual assistant' wording"
* Enterprise policy docs for regulated verticals
* International disclosures (GDPR-style)

None of these are MVP-blocking.

---

## F.10 FINAL POSITION

**Yes**, think about state compliance for AI voice.  
**No**, do not implement state-specific AI voice behavior.

> **One conservative, honest disclosure + strict scope limits everywhere.**

---

### 🔐 END OF APPENDIX F

---

---

# APPENDIX G: SALES SCRIPTS (VERBATIM)

## COMPLIANCE-SAFE LANGUAGE FOR REPS (LOCKED)

**Audience:** Sales team, customer success  
**Purpose:** Consistent, defensible answers to common objections  
**Rule:** Reps MAY read these verbatim. Do not improvise on compliance topics.

---

## G.1 RECORDING QUESTIONS

### "Do you record calls in California?"

> "By default, no. Call recording is completely optional and off unless you enable it. When it is enabled, we require explicit caller consent before any recording starts."

---

### "How do you handle California's consent laws?"

> "We default to the strictest standard. Calls are never recorded unless the caller explicitly agrees after hearing a disclosure."

---

### "What if the caller doesn't respond to the consent prompt?"

> "Then the call continues normally without being recorded. Silence or ambiguity is treated as a refusal."

---

### "What about voicemail?"

> "Voicemail is never recorded unless consent was already given earlier in the call. Otherwise, we store metadata only."

---

### "Are recordings stored forever?"

> "No. Recordings are automatically deleted after a short, configurable retention period."

---

### "Is Trades Captain responsible for legal compliance?"

> "We provide compliance-friendly tools, but each business is responsible for configuring recording appropriately. We don't give legal advice."

---

### "Why is recording so locked down?"

> "Because states like California and Pennsylvania treat recording very seriously. We'd rather protect you from risk than make it easy to do something unsafe."

---

## G.2 AI VOICE QUESTIONS

### "Is it legal to have AI answer my calls?"

> "Yes. AI-assisted call answering is legal in all 50 states. We disclose that the call is answered by an automated assistant, which satisfies transparency requirements."

---

### "Do callers have to consent to talk to the AI?"

> "No. Consent is only required for recording, not for talking to an automated system. We do disclose that it's an automated assistant at the start of every call."

---

### "What if someone in California calls?"

> "Our system uses the same conservative disclosure everywhere. It works in California and every other state without special configuration."

---

### "Can the AI give advice or diagnose problems?"

> "No. The AI is designed for intake and routing only. It doesn't diagnose, give instructions, or make promises. That's intentional — it protects you and your customers."

---

## G.3 GENERAL QUESTIONS

### "What data do you store?"

> "We store call metadata, AI-generated summaries, and SMS content. We do NOT store call audio or verbatim transcripts unless you explicitly enable recording."

---

### "Can your employees listen to my calls?"

> "No. We don't access customer recordings unless you explicitly request technical support, or we're legally required to."

---

### "What happens in an emergency?"

> "The AI can route urgent requests to your on-call team, but it doesn't replace 911. We always remind callers to contact emergency services for life-threatening situations."

---

## G.4 WHAT REPS MUST NOT SAY

| ❌ Never Say | Why |
|-------------|-----|
| "It's legal everywhere" | Overpromises; creates liability |
| "Consent isn't a big deal" | Minimizes real legal requirements |
| "We handle compliance for you" | We provide tools, not legal advice |
| "It's just like voicemail" | Voicemail and AI are legally distinct |
| "Don't worry about California/Pennsylvania" | These states have serious penalties |
| "The AI can help with anything" | AI is limited to intake and routing |

---

## G.5 ESCALATION RULE

If a prospect asks a compliance question not covered here:

> "That's a great question. Let me connect you with someone who can give you the most accurate answer."

Do NOT improvise. Escalate to legal or product.

---

### 🔐 END OF APPENDIX G

---

---

### 🔐 END OF DOCUMENT

**Version:** v1.5  
**Status:** LOCKED

---

## DOCUMENT STRUCTURE SUMMARY

| Section | Content |
|---------|---------|
| **Sections 0-21** | Core MVP specification |
| **Appendix A** | Emergency Definition UI |
| **Appendix B** | Phase 2 Call Recording (incl. Settings UX) |
| **Appendix C** | California Compliance |
| **Appendix D** | Multi-State Compliance Matrix (incl. PA Criminal) |
| **Appendix E** | Customer-Facing FAQ |
| **Appendix F** | AI Voice Compliance (Non-Recording) |
| **Appendix G** | Sales Scripts (Verbatim) |