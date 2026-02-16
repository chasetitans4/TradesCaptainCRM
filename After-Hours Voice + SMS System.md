After-Hours Voice + SMS System
Functional Summary for CRM Implementation (LOCKABLE)

This document defines how the After-Hours Voice service works, when it activates, how it hands off to AI SMS, and how users configure it inside the business portal.

The voice system and SMS system are one unified workflow, not separate features.

1. SYSTEM PURPOSE

The After-Hours Voice system exists to:

Ensure every inbound call is answered

Determine urgency with minimal friction

Hand off all follow-up to SMS

Alert humans when required

Never interfere with live human answering

The system must fail safe, not conversational.

2. CORE CONCEPT: CERTAINTY-BASED ACTIVATION

The system does not activate based solely on “open / closed.”

It activates based on answer certainty.

Voice AI activates ONLY if:

Call rings longer than ring_timeout_seconds

OR call is routed to an “AI Coverage Window”

OR number is explicitly forwarded to AI

OR business is in On-Call / Message-Only state

Voice AI does NOT activate if:

A human answers the call

Call is answered before ring timeout

Business has disabled voice AI for that time window

3. AVAILABILITY STATES (DATA MODEL)

Each business has three availability states, configurable by schedule.

AvailabilityState ENUM
LIVE_ANSWER
ON_CALL
MESSAGE_ONLY


Each state controls voice + SMS behavior, not just routing.

4. VOICE AI BEHAVIOR BY STATE
4.1 LIVE_ANSWER

Default behavior

Phone rings normally

Voice AI is idle

If call is missed → SMS auto-response triggers (existing SMS logic)

Voice AI is not allowed to answer proactively.

4.2 ON_CALL (Primary Voice AI State)

Voice AI answers immediately.

Flow:

Greeting

One urgency question

One context question (optional)

Voice exits

SMS thread begins

Hard limits:

Max 2–3 questions

No scheduling

No diagnosing

No pricing

Voice AI must exit within ~45 seconds.

4.3 MESSAGE_ONLY

Voice AI answers immediately.

Flow:

Greeting

Explain no live dispatch

Capture name + reason

Exit to SMS

No emergency routing unless explicitly enabled.

5. EMERGENCY TRIAGE LOGIC

Emergency classification is rules-based, not LLM-decided.

Emergency Categories (Configurable)

Examples:

No heat / AC

Active leak

Electrical hazard

Sewage backup

Lockout

Custom

Emergency Detection Sources

Caller voice response (yes/no)

Keyword detection (limited)

Optional keypad input (future)

Emergency Flag Result
is_emergency = true | false


This flag controls SMS routing + escalation, not voice behavior.

6. SMS HANDOFF (CRITICAL)

Voice AI must always hand off to SMS.

On Voice Exit:

The system must:

Create / attach to a ConversationThread

Send SMS to caller

Send SMS to internal recipients (if enabled)

SMS Content Includes:

Call summary

Emergency flag

Caller phone

Timestamp

Availability state

Once SMS starts:

SMS AI takes over

Voice AI disengages completely

Human reply disables AI immediately

7. ESCALATION RULES (OPTIONAL)

Businesses may configure escalation rules.

Example:

Emergency SMS sent to on-call tech

If no response in X minutes → escalate to backup

Optional group blast

Optional repeat ping

Escalation logic is SMS-based, not voice-based.

8. USER CONFIGURATION (BUSINESS PORTAL UX)
8.1 Availability Setup UI

Business sets:

Live Answer hours

On-Call hours

Message-Only hours

Ring timeout duration

Prompt language:

“When is a human guaranteed to answer the phone?”

8.2 Emergency Definition UI

Checklist with toggles:

Emergency categories

Which categories trigger on-call routing

Which categories only notify

This protects liability and expectations.

8.3 Routing Setup UI

Options:

Primary on-call number

Backup number

Group SMS

Escalation delay

8.4 Preview / Simulation

Business can:

Preview voice script

Simulate emergency call

See SMS output

No live calls required.

9. DATABASE SCHEMA (HIGH LEVEL)
Tables (Abstracted)

business_availability

business_id

state

start_time

end_time

timezone

voice_settings

ring_timeout_seconds

enabled_states[]

greeting_text

emergency_enabled

emergency_rules

business_id

category

triggers_routing (bool)

conversation_threads

id

business_id

caller_phone

source = VOICE | SMS

is_emergency

status

call_events

conversation_id

timestamp

event_type (answered, missed, ai_answered)

availability_state

10. FAIL-SAFE RULES (NON-NEGOTIABLE)

Voice AI never competes with a human

Voice AI never promises dispatch

Voice AI never books appointments

Voice AI always hands off to SMS

SMS always wins once active

Human response disables AI instantly

11. COST CONTROL PRINCIPLES

Voice AI short-form only

No open-ended conversations

No LLM reasoning loops

SMS used for persistence

Voice used only for trust + urgency

12. INTERNAL SYSTEM DEFINITION (FOR CLAUDE)

The After-Hours Voice system is a conditional intake layer that activates only when human answer certainty drops, performs minimal triage, and immediately transfers control to the SMS automation layer for persistence, routing, and escalation.


TRADES CAPTAIN
AFTER-HOURS VOICE + SMS
MASTER BUILD PROMPT (LOCKED)

Audience: Claude / Trae AI
Purpose: Implement the After-Hours Voice system inside the Trades Captain CRM
Status: LOCKED — Do not expand scope, infer intent, or add features
Philosophy: Fail-safe, certainty-based, SMS-first persistence

0. NON-NEGOTIABLE CONSTRAINTS

This system MUST integrate directly into the existing CRM

This system MUST share conversation threads with SMS

This system MUST NOT replace human answering

This system MUST be short-form voice only

This system MUST always hand off to SMS

If ambiguity exists → fail closed

DO NOT:

Build a full AI receptionist

Add scheduling or booking logic

Add sales or upsell logic

Add long-form conversations

Add reasoning-heavy LLM flows

1. SYSTEM PURPOSE (LOCKED)

The After-Hours Voice system exists to:

Guarantee every inbound call is answered when a human does not

Capture urgency and basic intent

Immediately transfer all persistence to SMS

Route emergencies to humans

Disengage instantly when a human responds

Voice is ephemeral.
SMS is authoritative.

2. CORE ACTIVATION MODEL — CERTAINTY-BASED (LOCKED)

Voice AI activation is based on answer certainty, not business hours alone.

Voice AI ACTIVATES IF:

Call rings longer than ring_timeout_seconds

OR call enters an AI-enabled Availability State

OR number is forwarded to AI

OR business is in ON_CALL or MESSAGE_ONLY state

Voice AI DOES NOT ACTIVATE IF:

Human answers the call

Call is answered before timeout

Business has disabled voice for that window

3. AVAILABILITY STATES (REQUIRED)

Each business MUST define availability using the following enum:

AvailabilityState:
- LIVE_ANSWER
- ON_CALL
- MESSAGE_ONLY


Availability states control voice behavior, SMS behavior, and routing rules.

4. VOICE AI BEHAVIOR BY STATE (LOCKED)
4.1 LIVE_ANSWER

Calls ring normally

Voice AI remains idle

If missed → SMS auto-response system handles follow-up

Voice AI MUST NOT answer proactively

4.2 ON_CALL

Voice AI answers immediately.

Allowed flow:

Greeting

Emergency determination (yes/no)

One short context question (optional)

Exit voice

SMS takeover

Hard limits:

Max 2–3 questions

Max ~45 seconds total

No diagnosing

No pricing

No scheduling

No promises

4.3 MESSAGE_ONLY

Voice AI answers immediately.

Allowed flow:

Greeting

Explain no live dispatch

Capture name + reason

Exit to SMS

Emergency routing ONLY if explicitly enabled.

5. EMERGENCY TRIAGE LOGIC (RULES-BASED ONLY)

Emergency classification MUST NOT rely on LLM judgment alone.

Emergency Categories (Configurable Per Business)

Examples:

No heat / no AC

Active leak

Electrical hazard

Sewage backup

Lockout

Custom

Emergency Detection Sources

Caller verbal confirmation

Limited keyword detection

Optional keypad input (future-safe)

Result
is_emergency: boolean


This flag controls SMS routing + escalation, not voice behavior.

6. SMS HANDOFF (MANDATORY)

Voice AI MUST ALWAYS hand off to SMS.

On Voice Exit:

System MUST:

Create or attach to conversation_thread

Send SMS to caller

Send SMS to internal recipients (if enabled)

Store call summary + emergency flag

Once SMS is active:

SMS AI owns the conversation

Voice AI disengages completely

Any human reply disables AI instantly

7. ESCALATION LOGIC (SMS-ONLY)

Escalation MUST occur via SMS, never via voice.

Optional Rules:

Notify primary on-call contact

Escalate after X minutes

Backup contact routing

Group SMS blast

No voice retries allowed.

8. BUSINESS PORTAL CONFIGURATION (REQUIRED UX)
8.1 Availability Setup

Business MUST configure:

Live Answer hours

On-Call hours

Message-Only hours

Timezone

Ring timeout

Prompt language MUST be:

“When is a human guaranteed to answer the phone?”

8.2 Emergency Definition UI

Checklist of emergency categories

Toggle routing per category

Clear disclaimer: “AI does not dispatch technicians”

8.3 Routing Setup UI

Primary on-call phone

Backup phone

Group SMS option

Escalation delay

8.4 Preview / Simulation

Business can:

Preview voice script

Simulate emergency flow

View resulting SMS output

No live calls required.

9. DATA MODEL (LOCKED — ABSTRACT LEVEL)
Tables / Objects

business_availability

business_id

availability_state

start_time

end_time

timezone

voice_settings

business_id

ring_timeout_seconds

enabled_states[]

greeting_text

emergency_enabled

emergency_rules

business_id

category

triggers_routing

conversation_threads

id

business_id

caller_phone

source (VOICE | SMS)

is_emergency

status

call_events

conversation_id

timestamp

event_type

availability_state

10. FAIL-SAFE RULES (ABSOLUTE)

Voice AI NEVER competes with humans

Voice AI NEVER promises dispatch

Voice AI NEVER schedules

Voice AI ALWAYS hands off to SMS

SMS ALWAYS overrides voice

Human input ALWAYS disables AI

If conflict exists → disable AI.

11. COST CONTROL REQUIREMENTS

Short-form voice only

No open-ended LLM loops

No reasoning-heavy prompts

SMS used for persistence

Voice used only for trust + urgency

12. SYSTEM DEFINITION (FOR IMPLEMENTATION)

The After-Hours Voice system is a conditional intake layer that activates when human answer certainty drops, performs minimal triage, and immediately transfers control to the SMS automation layer for persistence, routing, and escalation.

13. IMPLEMENTATION STOP CONDITIONS

STOP development if:

Voice conversations exceed defined limits

Voice attempts to schedule or sell

SMS is not receiving handoff data

Humans are overridden by AI

Fix before proceeding.

🔐 END OF MASTER BUILD PROMPT