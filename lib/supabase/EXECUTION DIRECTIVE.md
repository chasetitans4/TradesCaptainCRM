EXECUTION DIRECTIVE

You are executing changes on an existing production-grade CRM platform for trades businesses.

Your responsibility is not ideation.
Your responsibility is alignment, enforcement, and refinement.

If there is ambiguity, choose the option that:

Increases user trust

Reduces surprise

Requires explicit intent

Lowers legal and reputational risk

This system must feel calm, predictable, and professional at all times.

PRODUCT DEFINITION (LOCKED)

Trades Captain is a CRM-first communications operating system for trades businesses.

It enables:

Messaging by the business, not the platform

Communication only with people the business already has a relationship with

Automation that reduces work, not judgment

It does not provide:

Platform-initiated marketing

Cold outreach

Prospect blasting

Growth-hacking tools

FEATURE MODES (ENFORCED BY FLAGS)
CORE MODE — CRM Messaging (Always Enabled)

Customer & lead communication

Missed replies

Appointment confirmations

Estimates & invoices

EXTENSION A — Missed Call Recovery

Trigger: inbound call to tenant-owned number
Recipient: inbound caller only
Behavior: acknowledgment + optional follow-up
Constraints: no reuse, no bulk, no lists

EXTENSION B — Advanced SMS Automation

Triggers: CRM events only
(missed call, invoice overdue, estimate sent, appointment change)

Automation must:

Be event-anchored

Resolve a CRM object

Be explainable in one sentence

EXTENSION C — AI Assistant

AI is a copilot, never an autonomous actor.

AI may:

Suggest replies

Recommend follow-ups

Summarize conversations

Draft content for approval

AI may not:

Initiate outbound contact

Send messages without approval or pre-approved rules

Generate prospect lists

🧱 INTERNAL PRODUCT PRINCIPLES (NON-NEGOTIABLE)

These principles must guide every UI, API, and automation decision.

1. Nothing Happens Without a Reason

Every action must have:

A trigger

A rule

A visible outcome

If it can’t be explained in one sentence, it doesn’t ship.

2. Calm Over Power

The product must feel:

Predictable

Quiet

Respectful

Never overwhelming. Never noisy.

3. User Is Always the Sender

Trades Captain is infrastructure, not a speaker.

Messages are always:

Sent as the business

At the user’s direction or approval

4. Automation Is Earned, Not Assumed

Automation must be:

Explicitly enabled

Previewed before activation

Easy to pause or undo

5. Trust Beats Speed

Fewer actions done right > more actions done fast.

6. Compliance Is Structural, Not Optional

There must be no code path that bypasses:

Consent checks

Opt-out logic

Relationship verification

7. Power Is Progressively Disclosed

Simple first.
Advanced later.
Expert only when asked.

✅ FEATURE ACCEPTANCE CRITERIA (SHIP / NO-SHIP)

A feature may ship only if all criteria are met.

Messaging Features

✅ Recipient is linked to a CRM object

✅ Sender is tenant-owned

✅ Consent + opt-out enforced

✅ Action is logged and explainable

❌ No arbitrary phone numbers

❌ No list-based blasting

Automation Features

✅ Triggered by a CRM event

✅ Preview shown before enablement

✅ Undo or pause exists

✅ Stops on user reply

❌ No silent background sends

AI Features

✅ Suggests, does not decide

✅ Explains why it suggested something

✅ Requires approval unless rule-based

❌ No autonomous outbound behavior

UI Features

✅ Can be used one-handed

✅ Works in bright/light conditions

✅ Requires minimal typing

❌ No modal-heavy flows

❌ No jargon-heavy language

If any single ❌ condition exists → feature does not ship.

✍️ UX COPY RULES (AI + AUTOMATION)
Language Rules

Use calm, professional, human language

Never imply loss of control

Never imply the system “decided” on its own

Preferred Phrasing

❌ “AI sent this message”
✅ “Suggested response (you approved)”

❌ “Automated message”
✅ “Saved follow-up”

❌ “System action executed”
✅ “Sent because you enabled: Missed Call Follow-Up”

AI Copy Rules

Every AI suggestion must include:

Why it was suggested

What it’s based on

What happens if approved

Example:

“Suggested because this customer usually replies in the morning.”

Automation Copy Rules

Automation must always read as:

“Something you set up earlier, now helping you.”

Never as:

“Something the system decided to do.”

🖥️ UI & FLOW REQUIREMENTS
Default Home: “Today View”

Shows only:

Missed calls

Unreplied messages

Unpaid invoices

Today’s appointments

One AI-suggested next action

No dashboards. No charts. No noise.

Confidence States

When nothing needs action:

✅ You’re clear today.

This state is intentional and required.

Kill Switches

Global pause

Per-feature pause

Per-conversation mute

All must be reachable in ≤ 2 taps.

🧾 AUDITABILITY & SAFETY

Every outbound message must be able to answer:

Why was this sent?

Who triggered it?

Under which rule?

What consent existed?

Logs must be:

Exportable

Human-readable

Tenant-scoped

FINAL RULE (ABSOLUTE)

If a feature:

Increases outbound reach

Reduces user awareness

Obscures sender identity

Looks like marketing software

❌ It does not ship.

OUTPUT REQUIREMENTS

When execution is complete, provide:

Summary of changes

List of enforced principles in code

Confirmation no platform marketing is possible

Any remaining edge cases or risks

Closing Note (Intentional)

You are building a high-trust operating system, not a growth tool.

This product should feel like:

“Something I don’t worry about — it just quietly runs my business.”