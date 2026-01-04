Section 1: Product Identity
1.1 Definition
Trades Captain is a CRM-first communications operating system for trades businesses. It enables messaging by the business, not the platform—communication only with people the business already has a relationship with, and automation that reduces work, not judgment.
1.2 What This Product Is
A CRM with messaging infrastructure
A tool that sends messages as the business, at the user's direction
A system where automation is earned, previewed, and reversible
A calm interface that surfaces only what needs attention
1.3 What This Product Is Not
✗ A marketing platform
✗ A cold outreach tool
✗ A prospect blasting service
✗ A growth-hacking engine
✗ An autonomous AI agent

If a feature makes Trades Captain feel like marketing software, it does not ship.

Section 2: Core Principles
These seven principles are non-negotiable. Every UI element, API endpoint, and automation rule must satisfy all of them.

Principle 1: Nothing Happens Without a Reason
Every action in the system must have a trigger (what caused it), a rule (what logic was applied), and a visible outcome (what happened as a result). If an action cannot be explained in one sentence, it does not ship.

Principle 2: Calm Over Power
The product must feel predictable, quiet, and respectful. Features that create noise, anxiety, or overwhelm are rejected regardless of their utility. Silence is a feature.

Principle 3: User Is Always the Sender
Trades Captain is infrastructure, not a speaker. Every message is sent as the business and at the user's direction or pre-approved automation. The platform never speaks on its own behalf.

Principle 4: Automation Is Earned, Not Assumed
Automation must be explicitly enabled by the user, previewed before activation, easy to pause or undo, and stopped when a human reply is detected. No automation activates by default.

Principle 5: Trust Beats Speed
Fewer actions done right always beats more actions done fast. When choosing between velocity and accuracy, accuracy wins.

Principle 6: Compliance Is Structural
There must be no code path that bypasses consent checks, opt-out logic, or relationship verification. Compliance is not a feature—it is architecture.

Principle 7: Power Is Progressively Disclosed
Simple first. Advanced later. Expert only when asked. The default experience is minimal. Complexity is unlocked, never imposed.

Section 3: Feature Architecture
Features are organized into a Core mode and three Extensions. Each Extension inherits all constraints from Core and layers additional capabilities.

3.1 Core Mode: CRM Messaging (Always Enabled)
The foundation of all communication. Every message flows through Core.

Capabilities
Customer and lead communication
Missed reply detection and surfacing
Appointment confirmations
Estimate and invoice messaging

Constraints
Recipient must resolve to a CRM object (contact, lead, customer, or job)
Sender must be a tenant-owned phone number
Consent and opt-out status must be verified before send
Every message must be logged with full audit trail

3.2 Extension A: Missed Call Recovery
Automatically acknowledges inbound calls that were not answered.

Trigger
Inbound call to a tenant-owned number that goes unanswered.

Recipient
The inbound caller only. The phone number is not stored for future use.

Behavior
Acknowledgment message with optional follow-up prompt.

Constraints
No reuse of caller data for marketing
No bulk messaging from collected numbers
No list-building from inbound callers
Message content must be pre-approved by user

3.3 Extension B: Advanced SMS Automation
Event-driven messaging triggered by CRM state changes.

Allowed Triggers
Missed call (via Extension A)
Invoice overdue
Estimate sent
Appointment change or reminder
Custom CRM event (user-defined, CRM-anchored)

Automation Requirements
Every automation must be event-anchored (triggered by a CRM event, not a schedule or batch)
Every automation must resolve to a CRM object (the recipient exists in the CRM)
Every automation must be explainable in one sentence
Every automation must stop when a human reply is detected

Chaining Rules
Automations may trigger other automations with a maximum chain depth of 2. Any chain deeper than 2 requires explicit user configuration and warning. Circular chains are blocked at the schema level.

3.4 Extension C: AI Assistant
AI is a copilot. It suggests. It drafts. It never decides or acts autonomously.

AI May
Suggest replies based on conversation context
Recommend follow-ups with explanation
Summarize conversations
Draft content for user approval

AI May Not
Initiate outbound contact
Send messages without approval or pre-approved rules
Generate prospect lists
Make decisions that bypass user judgment

Suggestion Cadence
AI suggestions appear once per conversation view, refreshing only when conversation state changes. No suggestion appears more than once every 60 seconds on the same conversation.

Section 4: Consent and Relationship Model
This section defines how consent is acquired, maintained, and revoked.

4.1 Relationship States
State
Definition
Unknown
Contact exists but has no message history and no explicit consent
Inbound
Contact initiated conversation (consent implied for response)
Established
Bi-directional message history exists
Explicit
User has marked contact as consented (manual override)
Opted-Out
Contact has opted out; no messaging permitted


4.2 Default Consent State
When a contact is created (manually or via import), the default state is Unknown. Unknown contacts cannot receive automated messages. They can receive manual messages only if the user explicitly confirms intent.

4.3 Consent Inheritance
When a lead is converted to a customer, consent state is preserved. If a lead was Inbound, the customer is Inbound. Consent does not upgrade automatically—only user action or recipient behavior changes state.

4.4 Opt-Out Mechanics
Trigger
Recipient replies with STOP, UNSUBSCRIBE, CANCEL, END, or QUIT (case-insensitive).

Immediate Effect
Contact state changes to Opted-Out
All pending automations for this contact are cancelled
No future messages (automated or manual) are permitted
User is notified that contact has opted out

Reversal
Opt-out is permanent unless the contact explicitly re-initiates conversation (inbound message). User cannot manually override opt-out status.

Section 5: Multi-User Operations
This section defines behavior when multiple team members interact with the same data.

5.1 Conversation Ownership
Every conversation has an owner, which is the last user to send a message in that conversation. Ownership is visible in the UI. Ownership transfers automatically on send.

5.2 Collision Prevention
When User A is composing a message and User B sends a message on the same conversation, User A sees an inline notification that the conversation has been updated, their draft is preserved but not sent, and they must acknowledge the new message before sending.

5.3 Shared Inbox Behavior
In shared inbox mode, ownership follows the same rules. Additionally, a "claimed" state exists where a user can claim a conversation, signaling to others that they are handling it. Claimed status expires after 30 minutes of inactivity.

Section 6: Auditability and Logging
Every outbound message must be able to answer four questions. These are non-negotiable requirements for the audit log.

6.1 Required Audit Fields
Question
Logged As
Why was this sent?
trigger_event (e.g., missed_call, user_manual, automation_invoice_overdue)
Who triggered it?
actor_id (user ID or system identifier)
Under which rule?
rule_id (automation rule ID or 'manual')
What consent existed?
consent_state at time of send


6.2 Log Requirements
All logs are tenant-scoped (no cross-tenant access)
Logs are exportable in CSV and JSON formats
Logs are human-readable without technical translation
Logs are retained for 7 years minimum
Deletion requests are logged before execution

Section 7: Interface Requirements
7.1 Default Home: Today View
The home screen shows only what needs attention. Nothing else.

Visible Elements
Missed calls (last 24 hours)
Unreplied messages (>4 hours old)
Unpaid invoices (past due)
Today's appointments
One AI-suggested next action (if relevant)

Explicitly Excluded
✗ Dashboards
✗ Charts or graphs
✗ Activity feeds
✗ Notification badges for non-actionable items

7.2 Confidence State
When nothing needs attention, the UI displays: "You're clear today." This is an intentional, designed state. Empty is not broken—empty is good.

7.3 Kill Switches
Users must be able to stop any automation instantly.

Required Controls (Reachable in ≤2 Taps)
Global pause: stops all automations tenant-wide
Per-feature pause: stops a specific automation type
Per-conversation mute: stops all automation for one contact

7.4 Physical Usability
Every primary action must be operable one-handed. The UI must be readable in bright outdoor conditions. Typing requirements are minimized; tap and voice preferred.

Section 8: Copy and Language Standards
Language in Trades Captain is calm, professional, and human. It never implies loss of control or autonomous system behavior.

8.1 Automation Language
Never Say
Always Say
Automated message
Saved follow-up
System action executed
Sent because you enabled: [Rule Name]
AI sent this message
Suggested response (you approved)
Bot reply
Draft sent after your approval


8.2 AI Suggestion Format
Every AI suggestion must include three elements:

What: The suggested action or content
Why: The reason for the suggestion
Effect: What happens if approved

Example: "Suggested: Follow up on estimate. Reason: Customer opened estimate 3 times but hasn't responded. Effect: Sends your saved follow-up template."

Section 9: Feature Acceptance Criteria
A feature ships only if it passes all applicable criteria. A single failure blocks release.

9.1 Messaging Features
Must Pass
✓ Recipient is linked to a CRM object
✓ Sender is tenant-owned
✓ Consent and opt-out enforced
✓ Action is logged with full audit trail

Must Not Exist
✗ Arbitrary phone number input
✗ List-based or bulk sending
✗ Send without CRM resolution

9.2 Automation Features
Must Pass
✓ Triggered by a CRM event
✓ Preview shown before enablement
✓ Undo or pause mechanism exists
✓ Stops on human reply
✓ Chain depth ≤2 or explicitly configured

Must Not Exist
✗ Silent background sends
✗ Activation without preview
✗ Unlimited chaining

9.3 AI Features
Must Pass
✓ Suggests, does not decide
✓ Explains why it suggested something
✓ Requires approval unless rule-based
✓ Respects suggestion cadence limits

Must Not Exist
✗ Autonomous outbound behavior
✗ Suggestions that bypass user review
✗ Prospect or lead generation

9.4 UI Features
Must Pass
✓ Operable one-handed
✓ Readable in bright/outdoor conditions
✓ Minimal typing required
✓ Kill switches within 2 taps

Must Not Exist
✗ Modal-heavy flows
✗ Jargon-heavy language
✗ Hidden settings for critical functions

Section 10: Absolute Rules
These rules have no exceptions. They override all other considerations.

10.1 The Marketing Test
If a feature increases outbound reach, reduces user awareness, obscures sender identity, or makes Trades Captain look like marketing software—it does not ship.

10.2 The Explanation Test
If a feature cannot be explained in one sentence, it does not ship.

10.3 The Trust Test
If a feature would cause a reasonable user to wonder "wait, did I do that?"—it does not ship.

10.4 The Deletion Test
If a feature cannot be paused, undone, or deleted by the user, it does not ship.

Appendix A: State Diagrams
A.1 Consent State Machine
Unknown → (inbound message) → Inbound
Unknown → (user marks explicit) → Explicit
Inbound → (outbound reply) → Established
Any State → (opt-out received) → Opted-Out
Opted-Out → (inbound message) → Inbound

A.2 Automation Permission Matrix
Consent State
Manual Send
Auto (User Set)
Auto (System)
Unknown
Confirm required
Blocked
Blocked
Inbound
Allowed
Allowed
Blocked
Established
Allowed
Allowed
Allowed
Explicit
Allowed
Allowed
Allowed
Opted-Out
Blocked
Blocked
Blocked


Appendix B: Execution Checklist
Use this checklist when implementing any new feature.

Pre-Development
Can the feature be explained in one sentence?
Does it satisfy all 7 Core Principles?
Does it pass the Marketing Test?
Is there a kill switch?

Development
Does the code path enforce consent checks?
Does the code path respect opt-out status?
Does every outbound action log the 4 audit fields?
Is automation chain depth limited?

Pre-Release
Does the UI copy follow Section 8 standards?
Is the feature operable one-handed?
Does all acceptance criteria in Section 9 pass?
Has Legal reviewed if messaging behavior changed?
