# 🔒 LEADS CAPTAIN

## AI SMS — TRANSACTIONAL RESPONSE & LEAD QUALIFICATION SYSTEM

### MASTER BUILD PROMPT (LOCKED v1.1)

**Audience:** Claude / Trae AI  
**Purpose:** Implement AI SMS inside the Trades Captain CRM as a transactional response and lead qualification system  
**Status:** LOCKED — No scope expansion, no inference, no feature invention  
**Core Philosophy:**

> *AI SMS is a response-continuity tool, not a marketing system, not a chatbot, and not an advice engine.*

---

## 0. NON-NEGOTIABLE CONSTRAINTS

* AI SMS operates **only on inbound-initiated conversations**
* SMS is the **persistence layer** for all conversation continuity
* Human responses **always override AI**
* AI SMS is **transactional**, not promotional
* Opt-out requests are **honored immediately**
* AI behavior is **bounded and deterministic**

DO NOT:

* Send cold outreach or bulk campaigns
* Use SMS for marketing or promotions
* Allow AI to quote prices or diagnose problems
* Let AI continue indefinitely without human involvement
* Ignore opt-out requests
* Store data for behavioral profiling

---

## 1. SYSTEM PURPOSE (LOCKED)

The AI SMS system exists to:

1. Continue conversations initiated by customers
2. Qualify leads with minimal friction
3. Capture job details and urgency
4. Route conversations to appropriate team members
5. Maintain engagement until human handoff
6. Disengage immediately when humans respond or customers opt out

**Default promise:** Responsive, helpful follow-up to inbound contact  
**Boundary:** Never initiates, never markets, never advises

---

## 2. INITIATION MODEL — INBOUND ONLY (CRITICAL)

AI SMS may **only** message a number if one of the following is true:

### Allowed Initiation Sources

| Source | Description | AI SMS Allowed |
|--------|-------------|----------------|
| Missed call | Caller rang but no answer | ✅ Yes |
| Incoming SMS | Customer texted first | ✅ Yes |
| Voicemail received | Customer left message | ✅ Yes |
| AI Voice handoff | Conversation transferred from voice | ✅ Yes |
| Web form submission | Customer provided number + consent | ✅ Yes (with explicit consent) |
| Appointment confirmation | Customer booked via system | ✅ Yes (transactional) |

### Web Form Consent Requirement (LOCKED)

Web forms that collect phone numbers for AI SMS follow-up MUST include:

```
☐ I agree to receive text messages related to my request. 
  Message frequency varies. Reply STOP to opt out.
```

* Checkbox must be unchecked by default
* Checkbox must be separate from other consent (e.g., email)
* Form cannot submit without explicit check
* Consent text cannot be hidden or pre-selected

This is transactional consent, not marketing consent.

### Prohibited Initiation Sources

| Source | AI SMS Allowed |
|--------|----------------|
| Purchased lead lists | ❌ No |
| Cold outreach | ❌ No |
| Marketing campaigns | ❌ No |
| Re-engagement of dormant contacts | ❌ No (without new inbound action) |
| Third-party referrals without consent | ❌ No |

**This is the single most important compliance rule.** Violations create TCPA exposure.

---

## 3. CONVERSATION LIFECYCLE (LOCKED)

Every AI SMS conversation follows a defined lifecycle:

```
INITIATED → QUALIFYING → QUALIFIED → ROUTED → HUMAN_ACTIVE → CLOSED
                ↓              ↓
            UNRESPONSIVE    OPTED_OUT
```

### 3.1 State Definitions

| State | Description | AI Active? |
|-------|-------------|------------|
| INITIATED | First AI message sent | ✅ Yes |
| QUALIFYING | AI gathering job details | ✅ Yes |
| QUALIFIED | Lead info captured, ready for routing | ✅ Yes |
| ROUTED | Assigned to team member | ✅ Yes (limited) |
| HUMAN_ACTIVE | Human has replied | ❌ No |
| UNRESPONSIVE | No reply after follow-up sequence | ❌ No |
| OPTED_OUT | Customer sent STOP | ❌ No |
| CLOSED | Conversation completed | ❌ No |

### 3.2 State Transitions

```
INITIATED
  → QUALIFYING (customer replies)
  → UNRESPONSIVE (no reply after max follow-ups)
  → OPTED_OUT (customer sends STOP)

QUALIFYING
  → QUALIFIED (required info captured)
  → UNRESPONSIVE (no reply after max follow-ups)
  → HUMAN_ACTIVE (human replies)
  → OPTED_OUT (customer sends STOP)

QUALIFIED
  → ROUTED (assigned to team member)
  → HUMAN_ACTIVE (human replies)
  → OPTED_OUT (customer sends STOP)

ROUTED
  → HUMAN_ACTIVE (human replies)
  → CLOSED (job completed or declined)
  → OPTED_OUT (customer sends STOP)

HUMAN_ACTIVE
  → CLOSED (conversation ends)
  → (AI cannot re-engage in this state)
```

---

## 4. AI BEHAVIOR BOUNDARIES (STRICT)

### 4.1 AI SMS MAY

* Send initial follow-up after missed call
* Ask clarifying questions about the job
* Request photos, addresses, or availability
* Confirm receipt of information
* Provide status updates ("Your message has been received")
* Introduce the assigned team member
* Send appointment confirmations (transactional)

### 4.2 AI SMS MUST NOT

* Quote prices or estimates
* Diagnose problems
* Provide safety instructions
* Promise dispatch or arrival times
* Guarantee outcomes
* Continue after human responds
* Send messages after opt-out
* Sound like a specific human employee (unless disclosed)
* Exceed message limits

### 4.3 AI Personality (LOCKED)

AI SMS should be:
* Helpful but brief
* Professional but warm
* Responsive but not pushy
* Clear about being automated (first message only)

AI SMS should NOT be:
* Overly casual or emoji-heavy
* Aggressive or sales-y
* Vague or evasive
* Pretending to be human

---

## 5. LEAD QUALIFICATION FLOW (LOCKED)

### 5.1 Qualification Goals

AI SMS gathers **minimum viable information** to route the lead:

| Field | Required? | Example Question |
|-------|-----------|------------------|
| Name | ✅ Required | "Who should we ask for?" |
| Service needed | ✅ Required | "What can we help you with today?" |
| Address/Location | ⚠️ If applicable | "What's the service address?" |
| Urgency | ✅ Required | "Is this urgent or can it wait?" |
| Availability | ⚠️ Optional | "When works best for a callback?" |
| Photos | ⚠️ Optional | "Can you send a photo of the issue?" |

### 5.2 Qualification Logic

```
IF service_needed = EMPTY
  → Ask: "What can we help you with today?"

IF urgency = EMPTY AND service_needed != EMPTY
  → Ask: "Is this something that needs immediate attention?"

IF urgency = EMERGENCY
  → Flag conversation as emergency
  → Send emergency template
  → Escalate immediately

IF name = EMPTY AND service_needed != EMPTY
  → Ask: "Who should we ask for when we follow up?"

IF all required fields captured
  → Transition to QUALIFIED
  → Route to appropriate team member
```

### 5.3 Qualification Timeout

If customer stops responding during qualification:

* **After 1 hour:** Send follow-up #1
* **After 4 hours:** Send follow-up #2
* **After 24 hours:** Send final follow-up
* **After 48 hours:** Transition to UNRESPONSIVE

Max follow-ups without reply: **3**

---

## 6. MESSAGE TEMPLATES (LOCKED)

### 6.1 First Message (MANDATORY DISCLOSURE)

**After missed call:**

> "Hi! This is an automated message from [Business Name]. We missed your call and want to help. What can we assist you with today? Reply STOP to opt out."

**After incoming SMS:**

> "Thanks for reaching out to [Business Name]! This is an automated assistant to help get you connected. What can we help you with? Reply STOP to opt out."

**After voicemail:**

> "Hi! This is an automated message from [Business Name]. We received your voicemail and want to follow up. [If transcription available: You mentioned [summary].] How can we help? Reply STOP to opt out."

### 6.2 Qualification Messages

**Service clarification:**

> "Got it! Can you tell me a bit more about the issue? Any details help us get you to the right person."

**Urgency check:**

> "Is this something that needs immediate attention, or can it wait for a scheduled appointment?"

**Address request:**

> "What's the address where you need service?"

**Photo request:**

> "If you can, send a photo of the issue. It helps us understand what you're dealing with."

**Availability request:**

> "When would be a good time for someone to call you back?"

### 6.3 Emergency Template (LOCKED)

> "🚨 We've flagged this as urgent and alerted our on-call team. Someone will reach out shortly. If this is a life-threatening emergency, please contact 911."

### 6.4 Handoff Template

> "Great, I've got what I need! [Team Member Name] will follow up with you shortly. They can answer any questions about pricing and scheduling."

### 6.5 Human Active Notification (Internal)

When human takes over, send internal notification:

> "[Conversation ID] - Human reply detected. AI has disengaged. [Link to conversation]"

### 6.6 Opt-Out Confirmation (LOCKED)

> "You've been unsubscribed from automated messages from [Business Name]. Reply anytime to reconnect."

### 6.7 Follow-Up Sequence

**Follow-up #1 (1 hour):**

> "Just checking in! Let us know if you still need help with [service_needed or 'your request']."

**Follow-up #2 (4 hours):**

> "Hi again! We're here when you're ready. Feel free to reply anytime."

**Follow-up #3 / Final (24 hours):**

> "We'll leave you be for now, but don't hesitate to reach out if you need us. Have a great day!"

---

## 7. ROUTING LOGIC (LOCKED)

### 7.1 Routing Triggers

Conversation is routed when:

* Lead reaches QUALIFIED state
* Emergency is detected
* Customer explicitly requests human
* AI cannot answer a question

### 7.2 Routing Rules

```
routing_rules:
  - condition: is_emergency = true
    action: route_to_on_call_immediately
    
  - condition: service_type IN configured_services
    action: route_to_assigned_team_member
    
  - condition: urgency = HIGH AND business_hours = true
    action: route_to_available_dispatcher
    
  - condition: urgency = HIGH AND business_hours = false
    action: route_to_on_call
    
  - condition: DEFAULT
    action: route_to_general_queue
```

### 7.3 Routing Notification Methods

| Method | When Used |
|--------|-----------|
| In-app notification | Always |
| SMS to team member | If configured |
| Email digest | If configured |
| Push notification | If mobile app installed |

### 7.4 Routing Timeout

If no team member responds within configured time:

* **Standard lead:** Escalate to manager after 30 minutes
* **Urgent lead:** Escalate to manager after 10 minutes
* **Emergency:** Escalate immediately + voice call to on-call

---

## 8. HUMAN OVERRIDE (ABSOLUTE)

### 8.1 Override Rule

**If ANY human from the business replies to a conversation:**

1. AI disengages immediately
2. No further AI messages in that conversation
3. Conversation state → HUMAN_ACTIVE
4. AI cannot re-engage (even if human stops responding)

### 8.2 Override Detection

Human reply detected by:

* Message sent from business phone number
* Message sent from team member's number
* Message sent via CRM interface
* Message sent via mobile app

### 8.3 Re-Engagement Rules

AI may only re-engage if:

* Customer sends NEW inbound message (creates new conversation)
* Business explicitly resets conversation (admin action)
* 30+ days have passed AND customer initiates new contact

---

## 9. OPT-OUT HANDLING (NON-NEGOTIABLE)

### 9.1 Recognized Keywords

System MUST recognize and honor immediately:

```
STOP
UNSUBSCRIBE
CANCEL
END
QUIT
OPTOUT
OPT OUT
OPT-OUT
```

Case-insensitive. Partial message match (e.g., "Please stop texting me").

### 9.2 Opt-Out Behavior

When opt-out detected:

1. **Immediately** stop all AI messages
2. Send **one** confirmation message (see 6.6)
3. Update conversation state → OPTED_OUT
4. Update contact record with opt-out flag
5. Block ALL future AI SMS to that number
6. Log opt-out event with timestamp

### 9.3 Opt-Out Scope

Opt-out applies to:

* All AI-initiated messages
* All automated follow-ups
* All transactional messages from AI

Opt-out does NOT prevent:

* Human-initiated messages (if legally compliant)
* Customer re-initiating contact

### 9.4 Opt-Back-In

Customer may opt back in by:

* Sending any new message to the business
* Explicitly texting "START" or "SUBSCRIBE"

On opt-back-in:

* Clear opt-out flag
* Log opt-in event with timestamp
* **AI messaging resumes on the NEXT inbound message, not immediately**

**Safety Rule (IMPORTANT):**

If customer sends "START" or similar opt-in keyword:

1. Send confirmation: "You've been resubscribed. We're here when you need us!"
2. Do NOT immediately send AI qualification messages
3. Wait for customer's next message describing their need
4. Then resume normal AI behavior

This prevents carrier flags and ensures genuine re-engagement.

---

## 10. EMERGENCY HANDLING (LOCKED)

### 10.1 Emergency Detection

Emergency is flagged if:

* Inherited from AI Voice conversation
* Customer explicitly states emergency
* Trigger phrase detected (business-defined)
* Customer confirms urgency = "immediate/emergency"

### 10.2 Emergency Trigger Phrases

Default phrases (business can customize):

```
REQUIRED (immediate flag):
- "emergency"
- "flooding"
- "gas leak"
- "no heat" (winter)
- "no AC" (summer)
- "burst pipe"
- "electrical fire"
- "sewage"

OPTIONAL (confirmation required):
- "urgent"
- "ASAP"
- "right away"
- "immediately"
```

### 10.3 Emergency Response Flow

```
IF emergency_phrase_required DETECTED
  → is_emergency = true
  → Send emergency template
  → Route to on-call immediately
  → Send SMS + voice call to on-call contact

IF emergency_phrase_optional DETECTED
  → Ask: "This sounds urgent. Is this an emergency that needs immediate attention?"
  → IF yes → is_emergency = true
  → IF no → Continue normal qualification
```

### 10.4 Emergency Escalation

If on-call doesn't respond within 3 minutes:

1. SMS to backup contact
2. Voice call to backup contact
3. SMS to business owner
4. Log escalation failure

---

## 11. RATE LIMITING & ABUSE PREVENTION (LOCKED)

### 11.1 Message Limits

| Limit Type | Value | Purpose |
|------------|-------|---------|
| Max AI messages per conversation per hour | 4 | Prevent spam |
| Max follow-ups without reply | 3 | Prevent nagging |
| Max total AI messages per conversation | 15 | Prevent runaway conversations |
| Cool-down after final follow-up | 48 hours | Respect non-response |
| Min time between AI messages | 30 seconds | Prevent rapid-fire |

### 11.2 Quiet Hours (TCPA-REQUIRED)

AI SMS MUST respect quiet hours:

* **No messages before 8:00 AM** local time
* **No messages after 9:00 PM** local time

**Exceptions (messages allowed during quiet hours):**

* Ongoing customer-initiated conversations (customer texted within last 4 hours)
* Confirmed emergencies
* Customer explicitly requested contact at specific time

**Behavior during quiet hours:**

* Queue messages for delivery at 8:00 AM local time
* Log queued messages with reason
* Display "Queued for morning delivery" in conversation view

**Timezone determination (priority order):**

1. Customer-provided timezone
2. Service address timezone
3. Area code inference (weak signal, use with caution)
4. Business default timezone

### 11.3 Carrier Compliance

* Respect carrier rate limits
* Monitor for carrier feedback loops
* Implement exponential backoff on delivery failures
* Track delivery rates by carrier

### 11.4 Abuse Detection

Flag for review if:

* Same number opts out and back in repeatedly
* Conversation has 10+ messages with no qualification
* Customer sends hostile or abusive content
* Unusual message volume from single number

---

## 12. 10DLC COMPLIANCE (REQUIRED)

### 12.1 Registration Requirements

For A2P (Application-to-Person) SMS:

* Register brand with The Campaign Registry
* Register campaign (use case: "Customer Service / Notifications")
* Obtain approved 10DLC number
* Maintain throughput within tier limits

### 12.2 Campaign Description (For Registration)

> "Transactional messaging to respond to customer inquiries initiated via phone calls, SMS, or web forms. Messages include appointment confirmations, service follow-ups, and customer service communications. No marketing or promotional content."

### 12.3 Required Disclosures (For Registration)

* Opt-out language in first message
* Clear identification of business
* Transactional use only
* No shared short codes

---

## 13. CONVERSATION THREADING (ARCHITECTURE)

### 13.1 Thread Definition

A conversation thread is defined by:

```
conversation_thread:
  id: uuid
  business_id: uuid
  customer_phone: string (E.164)
  source: MISSED_CALL | INBOUND_SMS | VOICEMAIL | VOICE_HANDOFF | WEB_FORM
  state: ConversationState
  is_emergency: boolean
  created_at: timestamp
  updated_at: timestamp
  qualification_data: QualificationData
  assigned_to: uuid | null
  opted_out: boolean
  ai_message_count: integer
  human_responded: boolean
```

### 13.2 Thread Continuity Rules

**Same thread** if:

* Same customer phone
* Within 48 hours of last message
* No explicit close/resolution

**New thread** if:

* 48+ hours since last message
* Previous thread explicitly closed
* Customer opted back in after opt-out

### 13.3 Thread Merging

If customer contacts via multiple channels (call + SMS):

* Merge into single thread
* Preserve all history
* Use most recent context for AI responses

---

## 14. DATA MODEL (ABSTRACT — LOCKED)

### conversation_threads

```
id: uuid (primary key)
business_id: uuid (foreign key)
customer_phone: string (E.164 format)
customer_name: string | null
source: enum (MISSED_CALL, INBOUND_SMS, VOICEMAIL, VOICE_HANDOFF, WEB_FORM)
state: enum (INITIATED, QUALIFYING, QUALIFIED, ROUTED, HUMAN_ACTIVE, UNRESPONSIVE, OPTED_OUT, CLOSED)
is_emergency: boolean
emergency_source: string | null
qualification_data: jsonb
assigned_to: uuid | null
assigned_at: timestamp | null
created_at: timestamp
updated_at: timestamp
closed_at: timestamp | null
close_reason: string | null
```

### messages

```
id: uuid (primary key)
conversation_id: uuid (foreign key)
direction: enum (INBOUND, OUTBOUND)
sender_type: enum (CUSTOMER, AI, HUMAN)
sender_id: uuid | null (for human messages)
content: text
media_urls: string[] | null
template_used: string | null
sent_at: timestamp
delivered_at: timestamp | null
read_at: timestamp | null
delivery_status: enum (PENDING, SENT, DELIVERED, FAILED, UNDELIVERED)
failure_reason: string | null
```

### opt_out_log

```
id: uuid (primary key)
business_id: uuid (foreign key)
phone_number: string (E.164)
action: enum (OPT_OUT, OPT_IN)
source_message_id: uuid | null
timestamp: timestamp
```

### ai_sms_settings

```
business_id: uuid (primary key)
enabled: boolean (default: true)
first_message_template: enum (MISSED_CALL, INBOUND_SMS, VOICEMAIL)
qualification_fields: string[] (default: ['name', 'service_needed', 'urgency'])
max_follow_ups: integer (default: 3)
follow_up_intervals: integer[] (default: [60, 240, 1440]) // minutes
emergency_phrases_required: string[]
emergency_phrases_optional: string[]
business_hours_start: time
business_hours_end: time
timezone: string
on_call_contact_id: uuid | null
backup_contact_id: uuid | null
```

### qualification_data (JSONB structure)

```
{
  "name": string | null,
  "service_needed": string | null,
  "service_category": string | null,
  "urgency": enum ("LOW", "MEDIUM", "HIGH", "EMERGENCY") | null,
  "address": string | null,
  "availability": string | null,
  "photos": string[] | null,
  "notes": string | null,
  "captured_at": {
    "name": timestamp,
    "service_needed": timestamp,
    ...
  }
}
```

---

## 15. INTEGRATION POINTS (ARCHITECTURE)

### 15.1 AI Voice Integration

```
ON voice_call_ended:
  IF ai_answered = true AND sms_handoff_enabled = true:
    → Create conversation_thread (source: VOICE_HANDOFF)
    → Copy emergency_flag from voice call
    → Copy qualification_data from voice summary
    → Send handoff SMS to customer
```

### 15.2 CRM Integration

```
ON lead_qualified:
  → Create/update CRM contact
  → Create CRM opportunity/job
  → Attach conversation transcript
  → Set lead source = "AI SMS"

ON conversation_closed:
  → Update CRM opportunity status
  → Log outcome
```

### 15.3 Calendar Integration

```
ON appointment_requested:
  → Check team availability
  → Offer available slots via SMS
  → On confirmation → Create calendar event
  → Send confirmation SMS (transactional)
```

### 15.4 Webhook Events

Emit webhooks for:

```
conversation.created
conversation.qualified
conversation.routed
conversation.human_active
conversation.opted_out
conversation.closed
message.sent
message.delivered
message.failed
emergency.detected
```

---

## 16. ANALYTICS & REPORTING (LOCKED)

### 16.1 Key Metrics

| Metric | Definition |
|--------|------------|
| Response Rate | % of initiated conversations with customer reply |
| Qualification Rate | % of conversations reaching QUALIFIED state |
| Conversion Rate | % of qualified leads becoming jobs |
| Time to Qualification | Avg time from INITIATED to QUALIFIED |
| Time to Human Response | Avg time from ROUTED to HUMAN_ACTIVE |
| Opt-Out Rate | % of conversations ending in opt-out |
| AI Message Efficiency | Avg AI messages per qualified lead |

### 16.2 Required Reports

* Daily conversation summary
* Weekly qualification funnel
* Monthly opt-out report
* Emergency response audit
* Carrier delivery report

### 16.3 Audit Trail

Log all:

* State transitions
* AI message sends
* Human overrides
* Opt-out events
* Emergency escalations
* Routing decisions

Retention: 90 days minimum, 2 years for compliance-critical events.

---

## 17. MULTI-LOCATION SUPPORT (ENTERPRISE)

### 17.1 Location Routing

```
IF business.multi_location = true:
  → Attempt to determine location from:
    1. Customer-provided address (authoritative)
    2. Previous interaction history (strong signal)
    3. Phone number area code (WEAK SIGNAL — hint only)
  → Route to appropriate location team
  → If location unclear → Ask customer
```

**Area Code Warning (IMPORTANT):**

Area code may be used **only as a hint** and must **never** be treated as definitive location. Customers frequently:

* Keep numbers when moving
* Use VoIP numbers from different regions
* Have work phones in different areas

When area code is the only signal:

* Do NOT auto-assign to location
* Ask customer: "Which location is closest to you?" or "What's your service address?"

### 17.2 Location-Specific Settings

Each location may configure:

* Business hours
* On-call contacts
* Emergency phrases
* Service categories
* Team assignments

### 17.3 Cross-Location Visibility

Admins can view all location conversations.
Location managers see only their location.
Team members see only assigned conversations.

---

## 18. FAIL-SAFE RULES (ABSOLUTE)

* AI never sends after opt-out
* AI never sends after human responds
* AI never exceeds rate limits
* AI never initiates without valid source
* AI never provides prices or diagnoses
* AI never promises outcomes
* AI stops after max follow-ups
* AI escalates all emergencies

If conflict exists → AI goes silent.

Silence is safer than sending the wrong message.

---

## 19. LEGAL DISCLOSURES & TERMS (LOCKED)

### 19.1 First Message Disclosure (MANDATORY)

Every first AI SMS MUST include:

1. Business name identification
2. "Automated message" language
3. Opt-out instruction

Template (locked):

> "[Business Name]: This is an automated message to follow up on your [call/message]. [Question]. Reply STOP to opt out."

### 19.2 In-Product Disclosure (BUSINESS PORTAL)

**Location:** Business Portal → Settings → AI SMS  
**Visibility:** Always visible, non-dismissible

```
AI SMS Notice

AI SMS replies only to people who contact you first.
Messages are transactional and stop immediately if the recipient opts out.
AI SMS is not used for marketing, promotions, or cold outreach.
```

### 19.3 Terms of Service — AI SMS Section

#### 19.3.1 Transactional Messaging Only

AI SMS is limited to transactional, customer-initiated communications. AI SMS is not a marketing tool and must not be used for promotional purposes.

#### 19.3.2 Customer Consent

By using AI SMS, customers consent to reasonable, limited transactional responses directly related to their request by initiating contact. This consent is implied by the customer's action (calling, texting, or submitting a form with explicit SMS consent checkbox).

#### 19.3.3 Opt-Out Rights

Recipients may opt out at any time by replying STOP. Businesses must honor opt-outs immediately.

#### 19.3.4 Customer Responsibility

Businesses are responsible for:

* Ensuring AI SMS is used only for transactional purposes
* Maintaining accurate opt-out records
* Complying with TCPA and carrier requirements
* Responding to leads in a timely manner

#### 19.3.5 No Guarantees

AI SMS does not guarantee lead conversion, response rates, or message delivery. Carrier policies and recipient actions may affect deliverability.

---

## 20. PRIVACY POLICY — AI SMS (LOCKED)

### 20.1 Data Collected

* Phone number (required)
* Message content (required for conversation)
* Name, address, service details (if provided)
* Timestamps and delivery status
* Opt-out status

### 20.2 Data NOT Collected

* Location data (beyond customer-provided address)
* Device information
* Behavioral profiles
* Cross-business data sharing

### 20.3 Data Usage

Data is used to:

* Respond to customer inquiries
* Route conversations to appropriate team members
* Provide conversation history to business
* Generate aggregate analytics

Data is NOT used to:

* Train AI models on individual conversations
* Sell to third parties
* Build advertising profiles
* Target marketing campaigns

### 20.4 Data Retention

| Data Type | Retention |
|-----------|-----------|
| Conversation content | 90 days |
| Opt-out records | 3 years |
| Aggregate analytics | Indefinite (anonymized) |

### 20.5 Data Sharing

Shared only with:

* Business customer (conversation owner)
* Telephony provider (for delivery)
* As required by law

---

## 21. SYSTEM DEFINITION (FINAL)

> Leads Captain AI SMS is a transactional response system that continues conversations initiated by customers, qualifies leads with minimal friction, and yields immediately to human control. It operates transparently (disclosure on first message), compliantly (TCPA-safe, opt-out honored), and deterministically (bounded AI behavior). AI SMS is designed for lead qualification and routing, not marketing, advice, or sales.

---

## 22. STOP CONDITIONS

STOP implementation if:

* AI sends after opt-out
* AI sends without valid initiation source
* AI continues after human responds
* AI exceeds rate limits
* AI provides prices or diagnoses
* Opt-out is not honored immediately
* Emergency escalation fails
* Disclosure is missing from first message

Resolve before proceeding.

---

## CHANGELOG

### v1.1 (Current)

* Added explicit web form consent checkbox requirement (Section 2)
* Added quiet hours enforcement to Section 11.2 (8am-9pm local time)
* Tightened implied consent language: "reasonable, limited... directly related to their request"
* Made area code "weak signal" warning explicit and prominent (Section 17.1)
* Added opt-back-in safety delay: AI resumes on NEXT message, not immediately (Section 9.4)
* Reordered location determination priority (address > history > area code)

### v1.0

* Initial locked specification
* Transactional-only model established
* Inbound initiation rules defined
* Conversation lifecycle documented
* Lead qualification flow specified
* Message templates locked
* Routing logic defined
* Human override rules established
* Opt-out handling specified (TCPA-aligned)
* Emergency handling integrated
* Rate limiting defined
* 10DLC compliance requirements included
* Data model specified
* Integration points documented
* Analytics requirements defined
* Multi-location support included
* Legal disclosures and privacy policy added

---

### 🔐 END OF MASTER BUILD PROMPT

**Version:** v1.1  
**Status:** LOCKED

---

---

# APPENDIX A: AI SMS SETTINGS UX SPECIFICATION

## Transactional AI Messaging (LOCKED)

**Location:** Business Portal → Settings → Communications → **AI SMS**  
**Audience:** Business Owner / Admin  
**Design Goal:** *Make AI SMS powerful, compliant, and impossible to misuse.*

---

## A.1 PAGE FRAMING (CRITICAL)

### Page Title

**AI SMS — Automated Follow-Ups**

### Subheader (always visible)

> AI SMS replies only to people who contact you first.  
> Messages are transactional and stop immediately if the recipient opts out.

This framing prevents the "marketing tool" misconception.

---

## A.2 STATUS CARD (READ-ONLY SUMMARY)

Top of page, always visible:

| Setting | Status |
|---------|--------|
| AI SMS | ✅ Enabled |
| Initiation Rule | Inbound only |
| Opt-Out Handling | ✅ Enforced |
| Emergency Handling | ✅ Enabled |
| Human Override | ✅ Active |

Microcopy:

> AI SMS never sends outbound marketing or promotional messages.

---

## A.3 INITIATION RULES (NON-EDITABLE)

### Section Title

**Who Can Receive AI SMS?**

This section is **read-only** to prevent misuse.

**Allowed (shown as enabled checkmarks):**

* ☑ Missed inbound phone calls
* ☑ Incoming SMS messages
* ☑ Voicemail received
* ☑ AI Voice handoffs
* ☑ Web form submissions (with consent)

**Disallowed (shown with prohibition icons):**

* ⛔ Cold outreach
* ⛔ Bulk campaigns
* ⛔ Promotions or marketing
* ⛔ Purchased lead lists

Tooltip:

> These rules protect you from TCPA violations and carrier penalties.

---

## A.4 FIRST MESSAGE DISCLOSURE (LOCKED)

### Section Title

**Automated Disclosure**

Show **read-only preview** of first AI SMS:

> "Hi! This is an automated message from [Business Name]. We missed your call and want to help. What can we assist you with today? Reply STOP to opt out."

Notes displayed:

* Cannot be edited
* Includes required opt-out language
* Business name auto-inserted

---

## A.5 QUALIFICATION SETTINGS (CONFIGURABLE)

### Section Title

**Lead Qualification**

**Required Information (checkboxes):**

* ☑ Name (default: on)
* ☑ Service needed (default: on, locked)
* ☑ Urgency level (default: on)
* ☐ Service address (default: off)
* ☐ Availability for callback (default: off)
* ☐ Photos (default: off)

**Follow-Up Timing:**

* First follow-up: [ 1 ] hour after no reply
* Second follow-up: [ 4 ] hours after first
* Final follow-up: [ 24 ] hours after second
* Max follow-ups: 3 (locked)

---

## A.6 AI BEHAVIOR DISPLAY (READ-ONLY)

### Section Title

**What AI Can Do**

**Allowed (green checkmarks):**

* ✅ Ask clarifying questions
* ✅ Request photos or addresses
* ✅ Confirm availability windows
* ✅ Provide status updates
* ✅ Hand off to team members

**Not Allowed (red X marks):**

* ❌ Quote prices or estimates
* ❌ Diagnose problems
* ❌ Provide safety instructions
* ❌ Promise dispatch or arrival times

---

## A.7 HUMAN OVERRIDE (ALWAYS ON, NON-EDITABLE)

### Section Title

**Human Takes Control**

Display:

> ✅ **When anyone from your team replies, AI stops immediately.**

Description:

> Any reply from you or your team disables AI messages for that conversation.

This cannot be turned off. It's a trust feature.

---

## A.8 EMERGENCY HANDLING (CONFIGURABLE)

### Section Title

**Emergency Detection**

**Emergency Trigger Phrases (editable):**

Required phrases (immediate flag):
```
[Text input with defaults: emergency, flooding, gas leak, no heat, burst pipe]
```

Optional phrases (confirmation required):
```
[Text input with defaults: urgent, ASAP, right away]
```

**Emergency Message Preview (read-only):**

> "🚨 We've flagged this as urgent and alerted our on-call team. Someone will reach out shortly. If this is a life-threatening emergency, please contact 911."

**Emergency Routing:**

* Primary on-call: [Dropdown: team members]
* Backup contact: [Dropdown: team members]
* Escalation timeout: [ 3 ] minutes

---

## A.9 OPT-OUT HANDLING (NON-EDITABLE)

### Section Title

**Opt-Out Compliance**

**Recognized Keywords (read-only):**

```
STOP, UNSUBSCRIBE, CANCEL, END, QUIT
```

**Behavior (read-only):**

> When a customer sends any opt-out keyword:
> 1. All AI messages stop immediately
> 2. One confirmation is sent
> 3. No further messages unless customer texts first

**Confirmation Message Preview:**

> "You've been unsubscribed from automated messages from [Business Name]. Reply anytime to reconnect."

---

## A.10 ROUTING CONFIGURATION (CONFIGURABLE)

### Section Title

**Lead Routing**

**Default Assignment:**

* [ ] Round-robin to all team members
* [ ] Assign to specific person: [Dropdown]
* [ ] Route to queue for manual assignment

**By Service Type (optional):**

| Service Category | Assign To |
|------------------|-----------|
| Plumbing | [Dropdown] |
| HVAC | [Dropdown] |
| Electrical | [Dropdown] |

**Notification Method:**

* ☑ In-app notification
* ☐ SMS to team member
* ☐ Email notification

---

## A.11 RATE LIMITS (READ-ONLY)

### Section Title

**Built-In Safeguards**

| Limit | Value |
|-------|-------|
| Max AI messages per hour | 4 |
| Max follow-ups without reply | 3 |
| Max total AI messages | 15 |
| Cool-down after final follow-up | 48 hours |

Microcopy:

> These limits prevent spam-like behavior and protect deliverability.

---

## A.12 PREVIEW & SIMULATION

### Section Title

**Test AI SMS**

Buttons:

* 🧪 **Simulate Missed Call Follow-Up**
* 🧪 **Simulate Lead Qualification**
* 🧪 **Simulate Emergency Detection**
* 🧪 **Simulate Opt-Out**

Output shows:

* Message sequence
* Where AI stops
* Routing decision
* Final state

No live texts. No billing impact.

---

## A.13 ANALYTICS SNAPSHOT

### Section Title

**Performance (Last 30 Days)**

| Metric | Value |
|--------|-------|
| Conversations Started | 127 |
| Response Rate | 68% |
| Leads Qualified | 84 |
| Qualification Rate | 66% |
| Avg Time to Qualification | 4.2 min |
| Opt-Out Rate | 2.3% |

Link: **View Full Analytics →**

---

## A.14 DISABLE OPTION

### Button

**Disable AI SMS**

Confirmation modal:

> This will stop all automated SMS follow-ups.  
> Manual texting remains available.  
> Existing conversations will not be affected.

---

## A.15 UX PRINCIPLES (LOCKED)

* No marketing language anywhere
* No bulk messaging controls
* No editable compliance copy
* No hidden automation
* Fail-safe defaults
* Compliance elements non-editable

---

### 🔐 END OF APPENDIX A

---

---

# APPENDIX B: CONVERSATION VIEWER UX SPECIFICATION

## SMS Conversation Interface (LOCKED)

**Location:** Business Portal → Conversations → [Conversation]  
**Audience:** All team members  
**Design Goal:** *Clear visibility, easy handoff, no confusion about who said what.*

---

## B.1 CONVERSATION LIST VIEW

### Columns

| Column | Description |
|--------|-------------|
| Status | State indicator (badge) |
| Customer | Name + phone number |
| Preview | Last message snippet |
| Urgency | 🚨 if emergency |
| Assigned | Team member or "Unassigned" |
| Updated | Time since last message |

### Filters

* State: All, Qualifying, Qualified, Needs Response, Closed
* Assigned: All, Mine, Unassigned
* Urgency: All, Emergency Only
* Date Range: Today, This Week, Custom

### Sort

* Most Recent (default)
* Oldest First
* Urgency (emergencies first)

---

## B.2 CONVERSATION DETAIL VIEW

### Header

```
┌─────────────────────────────────────────────────────────────┐
│ John Smith                                    [Qualified]   │
│ (555) 123-4567                               🚨 Emergency   │
│ Service: Burst pipe | Urgency: HIGH                         │
│ Assigned to: Mike Johnson                                   │
└─────────────────────────────────────────────────────────────┘
```

### Message Thread

Each message shows:

* **Sender indicator:**
  * 🤖 = AI message
  * 👤 = Customer message
  * 👷 = Human team member
* **Timestamp**
* **Delivery status** (for outbound)
* **Message content**
* **Media attachments** (if any)

Visual distinction:

* AI messages: Light gray background, "AI" badge
* Customer messages: White background, left-aligned
* Human messages: Blue background, right-aligned

### Message Input

```
┌─────────────────────────────────────────────────────────────┐
│ [Text input: Type a message...]              [Send Button]  │
│                                                             │
│ ⚠️ Sending will disable AI for this conversation           │
└─────────────────────────────────────────────────────────────┘
```

Warning appears before first human message.

---

## B.3 SIDEBAR: LEAD DETAILS

### Qualification Data

```
Name: John Smith
Phone: (555) 123-4567
Service: Burst pipe
Address: 123 Main St, Austin TX
Urgency: HIGH 🔴
Photos: [2 attachments]
Availability: "Anytime today"
```

### Conversation Metadata

```
Source: Missed Call
Started: Today, 2:34 PM
State: Qualified
AI Messages: 4
Customer Messages: 3
Human Responded: No
```

### Actions

* **Assign to...** [Dropdown]
* **Mark as Emergency** [Toggle]
* **Close Conversation** [Button]
* **View in CRM** [Link]

---

## B.4 STATE INDICATORS (BADGES)

| State | Badge | Color |
|-------|-------|-------|
| Qualifying | 🔵 Qualifying | Blue |
| Qualified | 🟢 Qualified | Green |
| Routed | 🟡 Assigned | Yellow |
| Human Active | 👷 Human Active | Purple |
| Unresponsive | ⚪ No Reply | Gray |
| Opted Out | 🔴 Opted Out | Red |
| Closed | ⚫ Closed | Black |

---

## B.5 NOTIFICATIONS

### In-App

* New message badge on conversation
* Toast notification for new leads
* Persistent banner for emergencies

### Sound

* Optional notification sound for new messages
* Distinct sound for emergencies

---

## B.6 KEYBOARD SHORTCUTS

| Shortcut | Action |
|----------|--------|
| ↑/↓ | Navigate conversation list |
| Enter | Open selected conversation |
| Esc | Close conversation detail |
| Cmd+Enter | Send message |
| Cmd+E | Mark as emergency |
| Cmd+C | Close conversation |

---

### 🔐 END OF APPENDIX B

---

---

# APPENDIX C: TCPA COMPLIANCE REFERENCE

## REGULATORY ALIGNMENT (LOCKED)

**Purpose:** Ensure AI SMS operates within TCPA and carrier guidelines  
**Scope:** All AI SMS functionality

---

## C.1 TCPA APPLICABILITY

### Why TCPA Matters

The Telephone Consumer Protection Act (TCPA) restricts:

* Automated/prerecorded calls and texts
* Calls/texts to cell phones without consent
* Marketing messages without express written consent

Violations can result in:

* $500 per violation (negligent)
* $1,500 per violation (willful)
* Class action exposure

### How Leads Captain AI SMS Complies

| TCPA Requirement | Our Approach |
|------------------|--------------|
| Prior consent for marketing | We don't do marketing |
| Consent for automated texts | Inbound initiation = implied consent for transactional response |
| Honor opt-out requests | Immediate, automatic, logged |
| Identify sender | Business name in every first message |
| Time restrictions | Respect quiet hours (configurable) |

---

## C.2 CONSENT MODEL

### Transactional vs. Marketing

| Message Type | Consent Required | Our Messages |
|--------------|------------------|--------------|
| Marketing/Promotional | Express written | ❌ We don't send |
| Transactional | Implied by relationship | ✅ All our messages |

### What Constitutes Valid Initiation

Valid implied consent exists when:

* Customer calls business (answered or not)
* Customer texts business first
* Customer submits web form with phone number
* Customer leaves voicemail
* Customer is transferred from live conversation

### What Does NOT Constitute Valid Initiation

* Purchased lead list
* Referral without direct contact
* Old customer re-engagement
* Cross-business data sharing

---

## C.3 OPT-OUT REQUIREMENTS

### TCPA Requirements

* Must provide opt-out mechanism
* Must honor opt-out "promptly"
* Cannot charge for opt-out
* Must confirm opt-out

### Our Implementation

* Recognize all standard opt-out keywords
* Honor within seconds (not minutes)
* Send single confirmation
* Block all future AI messages
* Log for compliance audit
* Allow opt-back-in via new initiation

---

## C.4 TIME RESTRICTIONS

### TCPA Quiet Hours

* No calls/texts before 8 AM local time
* No calls/texts after 9 PM local time

### Our Implementation

* Respect customer timezone (inferred from area code or explicit)
* Queue messages for delivery during allowed hours
* Exception: Customer-initiated conversations (ongoing)
* Exception: True emergencies

---

## C.5 CARRIER COMPLIANCE

### 10DLC Requirements

* Register brand and campaign
* Use approved phone numbers
* Stay within throughput limits
* Monitor for feedback signals

### Carrier-Specific Rules

| Carrier | Key Requirement |
|---------|-----------------|
| All | Opt-out honored immediately |
| AT&T | Clear sender identification |
| Verizon | No shared short codes |
| T-Mobile | Campaign registration |

### Deliverability Protection

* Monitor delivery rates
* Respond to carrier feedback
* Implement exponential backoff
* Flag suspicious patterns

---

## C.6 DOCUMENTATION REQUIREMENTS

### What We Log

* Initiation source for every conversation
* Opt-out events with timestamps
* Message content and delivery status
* Consent basis (call, SMS, form, etc.)

### Retention

* Opt-out records: 3 years minimum
* Conversation logs: 90 days minimum
* Consent evidence: Duration of relationship + 3 years

---

## C.7 RISK MITIGATION

### What We Don't Do

* ❌ Marketing or promotional messages
* ❌ Cold outreach
* ❌ Purchased list messaging
* ❌ Cross-business sharing
* ❌ Ignore opt-outs
* ❌ Exceed rate limits

### What We Do

* ✅ Transactional only
* ✅ Inbound initiation only
* ✅ Immediate opt-out
* ✅ Clear identification
* ✅ Respect quiet hours
* ✅ Full audit trail

---

### 🔐 END OF APPENDIX C

---

---

# APPENDIX D: CUSTOMER-FACING FAQ (SMS)

## PUBLIC-SAFE, SUPPORT-SAFE (LOCKED)

**Audience:** End customers, help center, support team  
**Purpose:** Consistent, defensible answers

---

### Why did I receive a text after calling?

When you call a business and they can't answer, they may send an automated follow-up text to help with your request. You initiated the contact, and this is a response to that.

---

### Is this a real person texting me?

The first few messages may be automated to help gather information about your request. A team member will follow up once we have what we need. If a real person replies, the automated messages stop.

---

### How do I stop receiving texts?

Reply **STOP** at any time. You'll receive one confirmation, and no further automated messages will be sent.

---

### Will I receive marketing texts?

No. These messages are only to respond to your specific request. We don't send marketing, promotions, or unrelated messages.

---

### Is my information shared?

Your information is shared only with the business you contacted to help fulfill your request. We don't sell data or use it for advertising.

---

### What if I have an emergency?

If you have an urgent issue, let us know and we'll alert the on-call team. For life-threatening emergencies, always contact 911.

---

### Can I text back anytime?

Yes! You can reply to continue the conversation. If you previously opted out, texting again will reconnect you.

---

### Why do I need to provide my address/photos?

This helps the business understand your situation and prepare to help you. You can skip any question if you prefer.

---

## QUICK REFERENCE (FOR SUPPORT)

| Question | Short Answer |
|----------|--------------|
| Why the text? | Follow-up to their call/message |
| How to stop? | Reply STOP |
| Is it marketing? | No, transactional only |
| Is it a bot? | Starts automated, human follows up |
| Data shared? | Only with business they contacted |

---

### 🔐 END OF APPENDIX D

---

---

# APPENDIX E: SALES SCRIPTS (SMS)

## VERBATIM LANGUAGE FOR REPS (LOCKED)

**Audience:** Sales team, customer success  
**Purpose:** Consistent, compliant positioning

---

### "Is this like a marketing automation tool?"

> "No, AI SMS only replies to people who contact you first. It's for follow-up and qualification, not marketing. You can't use it to text cold leads or send promotions."

---

### "Can I text all my old customers?"

> "Only if they reach out to you first. AI SMS is for responding to inbound contact, not re-engaging old lists. That would require separate consent and a different tool."

---

### "What if someone doesn't want texts?"

> "They can reply STOP anytime and we immediately stop all automated messages. We take opt-outs seriously — it's required by law and it's the right thing to do."

---

### "How is this different from other SMS tools?"

> "Most SMS tools are built for marketing campaigns. Ours is built for service businesses responding to inbound leads. It qualifies the lead, hands off to your team, and gets out of the way."

---

### "Will this replace my receptionist?"

> "It handles the initial response when you can't answer, but a human always follows up. Think of it as a bridge, not a replacement."

---

### "Can the AI quote prices?"

> "No. The AI gathers information about what the customer needs, then hands off to your team for pricing and scheduling. That keeps you in control of the sales conversation."

---

### "Is this legal?"

> "Yes. Since customers are contacting you first, you have implied consent to respond. We also include opt-out instructions and honor them immediately. It's built to be TCPA-compliant."

---

## WHAT REPS MUST NOT SAY

| ❌ Never Say | Why |
|-------------|-----|
| "You can text all your leads" | Implies cold outreach is allowed |
| "It's like a drip campaign" | Implies marketing use |
| "Unlimited texting" | There are rate limits |
| "The AI handles everything" | Humans must follow up |
| "Don't worry about compliance" | Compliance is serious |

---

### 🔐 END OF APPENDIX E

---

---

### 🔐 END OF DOCUMENT

**Version:** v1.1  
**Status:** LOCKED

---

## DOCUMENT STRUCTURE SUMMARY

| Section | Content |
|---------|---------|
| **Sections 0-22** | Core AI SMS specification |
| **Appendix A** | Settings UX Specification |
| **Appendix B** | Conversation Viewer UX |
| **Appendix C** | TCPA Compliance Reference |
| **Appendix D** | Customer-Facing FAQ |
| **Appendix E** | Sales Scripts |