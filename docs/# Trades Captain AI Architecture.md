# Trades Captain AI Architecture
## Claude Orchestration Plan — AI SMS + Leads Captain

---

## A. Prompt Map

### Prompt 1: Realtime Conversation Agent
| Attribute | Definition |
|-----------|------------|
| **Purpose** | Handle live SMS conversations with leads/customers. Gather info, answer questions, follow checklist, detect emergencies, maintain natural conversation flow. |
| **When it runs** | Every inbound/outbound message in an active conversation |
| **Inputs** | Current message, conversation history (last 10-15 messages), customer profile (if exists), business profile, active checklist, active situational rules (condensed), business hours |
| **Outputs** | Response message, flags (emergency_detected, handoff_requested, profile_data_captured), extracted fields (name, phone, address, etc.) |
| **NOT responsible for** | Deep analysis, note extraction, suggestion generation, analytics, follow-up scheduling, compliance enforcement (handled by system layer) |
| **Token cost** | LOW (runs frequently, must be fast) |

---

### Prompt 2: Emergency Classifier
| Attribute | Definition |
|-----------|------------|
| **Purpose** | Confirm emergency detection and classify severity. Runs when Prompt 1 flags potential emergency. |
| **When it runs** | Event-triggered: when `emergency_detected` flag is raised |
| **Inputs** | Triggering message, last 5 messages of context, emergency keywords list, situational rules marked as emergency |
| **Outputs** | `{ is_emergency: boolean, severity: 'critical' | 'high', category: string, summary: string, recommended_questions: string[] }` |
| **NOT responsible for** | Sending alerts (system handles), response generation, escalation workflow |
| **Token cost** | LOW (short context, binary decision) |

---

### Prompt 3: Conversation End Analyzer
| Attribute | Definition |
|-----------|------------|
| **Purpose** | Post-conversation analysis: extract profile data, identify note-worthy details, assess checklist coverage, evaluate rule triggers. |
| **When it runs** | Async, after conversation ends or times out (30+ min no response) |
| **Inputs** | Full conversation transcript, customer profile (current state), checklist items, situational rules, business profile |
| **Outputs** | `{ profile_updates: {}, suggested_notes: [], checklist_coverage: [], rules_triggered: [], detected_language: string, conversation_quality_score: number }` |
| **NOT responsible for** | Realtime responses, emergency handling, sending follow-ups |
| **Token cost** | MEDIUM (full transcript, but runs once per conversation) |

---

### Prompt 4: Note Extractor
| Attribute | Definition |
|-----------|------------|
| **Purpose** | Extract specific note-worthy details from flagged messages or conversation segments. |
| **When it runs** | Called by Prompt 3, or on-demand when user manually selects a message |
| **Inputs** | Message text (or segment), note category hint (optional), existing notes for deduplication |
| **Outputs** | `{ content: string, category: string, confidence: 'high' | 'medium', source_quote: string }` |
| **NOT responsible for** | Full conversation analysis, profile creation |
| **Token cost** | LOW (single message focus) |

---

### Prompt 5: AI Insights Generator
| Attribute | Definition |
|-----------|------------|
| **Purpose** | Generate actionable suggestions for customer profiles based on conversation history, schedule, and activity. |
| **When it runs** | Async: after Prompt 3 completes, on profile view (if stale >24h), daily batch job |
| **Inputs** | Customer profile, recent conversations summary, open quotes, schedule data (simplified), last contact date |
| **Outputs** | `{ suggestions: [{ type, title, description, priority, actions }] }` |
| **NOT responsible for** | Realtime conversation, emergency handling, executing actions |
| **Token cost** | MEDIUM (analytical, but bounded input) |

---

### Prompt 6: Rule Matcher (Lightweight)
| Attribute | Definition |
|-----------|------------|
| **Purpose** | Determine which situational rules apply to current message context. Feeds into Prompt 1. |
| **When it runs** | Pre-processing step before Prompt 1, or as embedded logic |
| **Inputs** | Current message, last 3 messages, list of rule triggers (keywords/conditions) |
| **Outputs** | `{ matched_rules: [rule_id, rule_id], priority_rule: rule_id }` |
| **NOT responsible for** | Executing rule actions (Prompt 1 does that), creating rules |
| **Token cost** | LOW (pattern matching, minimal reasoning) |

---

### Prompt 7: Human Handoff Summarizer
| Attribute | Definition |
|-----------|------------|
| **Purpose** | Generate concise summary when conversation hands off to human. |
| **When it runs** | Event-triggered: customer requests human OR AI flags uncertainty |
| **Inputs** | Conversation transcript, customer profile, reason for handoff |
| **Outputs** | `{ summary: string, key_issues: [], customer_sentiment: string, recommended_actions: [] }` |
| **NOT responsible for** | Continuing conversation, sending notifications |
| **Token cost** | LOW-MEDIUM (summarization task) |

---

### Prompt 8: Photo Analyzer (Optional/Deferred)
| Attribute | Definition |
|-----------|------------|
| **Purpose** | Describe customer-sent photos to provide context. |
| **When it runs** | Event-triggered: when MMS/photo received |
| **Inputs** | Image, conversation context (last 3 messages) |
| **Outputs** | `{ description: string, issue_identified: string, severity_hint: string }` |
| **NOT responsible for** | Diagnosis, quoting, emergency classification |
| **Token cost** | MEDIUM-HIGH (vision model) |

---

### Prompt 9: Sandbox Test Agent
| Attribute | Definition |
|-----------|------------|
| **Purpose** | Simulated conversation for testing AI behavior. Isolated from production data. |
| **When it runs** | On-demand: owner initiates test mode |
| **Inputs** | Same as Prompt 1, but with test flag and synthetic customer |
| **Outputs** | Same as Prompt 1, but writes to test database |
| **NOT responsible for** | Production conversations, real alerts, real profile creation |
| **Token cost** | LOW (same as Prompt 1) |

---

## B. Feature-to-Prompt Allocation

| Feature | Handled By | Notes |
|---------|------------|-------|
| **Live SMS conversation** | Prompt 1 | Core realtime agent |
| **Customer profile creation** | Prompt 1 (extraction) + System (storage) | Prompt 1 extracts fields, system creates record |
| **Profile matching (duplicate detection)** | System (database lookup) | NOT LLM — fuzzy match algorithm |
| **Conversation checklist** | Prompt 1 (execution) + System (injection) | System injects checklist, Prompt 1 follows it |
| **Checklist coverage tracking** | Prompt 3 | Post-conversation analysis |
| **Situational rules (triggers)** | Prompt 6 (matching) + Prompt 1 (execution) | Prompt 6 identifies, Prompt 1 acts |
| **Situational rules (creation/parsing)** | Prompt 3 OR dedicated parser | One-time parse when rule created |
| **Emergency detection** | Prompt 1 (flag) + Prompt 2 (confirm) | Two-stage for reliability |
| **Emergency alerts** | System | NOT LLM — push/SMS/in-app via system |
| **Emergency response workflow** | System + Prompt 1 (follow-up messages) | Workflow is system-driven |
| **Business hours awareness** | System | NOT LLM — time comparison logic |
| **After-hours permission** | System (storage) + Prompt 1 (awareness) | System stores, injects into Prompt 1 context |
| **Auto note capture** | Prompt 3 + Prompt 4 | Prompt 3 identifies candidates, Prompt 4 extracts |
| **Manual note selection** | Prompt 4 | On-demand extraction |
| **AI suggestions** | Prompt 5 | Async generation |
| **Follow-up due detection** | System (scheduled job) + Prompt 5 | System triggers, Prompt 5 generates suggestion |
| **Conversation end summary** | Prompt 3 | Post-conversation |
| **Human handoff** | Prompt 1 (trigger) + Prompt 7 (summary) | Prompt 1 detects, Prompt 7 summarizes |
| **TCPA opt-in/out** | System | NOT LLM — deterministic compliance rules |
| **Customer photo handling** | Prompt 8 (optional) + System (storage) | Vision optional, storage required |
| **Technician note visibility** | System (read-only view) | NOT LLM — data retrieval |
| **Technician note creation** | Prompt 4 | Same extraction prompt |
| **Follow-up automation** | System (scheduler) | NOT LLM — scheduled messages with templates |
| **Review request** | System | NOT LLM — templated message |
| **Multi-language detection** | Prompt 1 (implicit) + Prompt 3 (explicit) | Prompt 1 responds in detected language, Prompt 3 logs it |
| **AI business profile** | System (config) + Prompt 1 (context) | Stored as config, injected into Prompt 1 |
| **Analytics** | System | NOT LLM — database aggregation |
| **Sandbox/test mode** | Prompt 9 | Isolated agent |
| **Spam/abuse protection** | System | NOT LLM — rate limiting, block lists |

---

## C. Phased Delivery Plan

### Phase 1: Must Ship (v1 Core)

| Feature | Justification |
|---------|---------------|
| Realtime Conversation Agent (Prompt 1) | Core product functionality |
| Emergency Classifier (Prompt 2) | Safety-critical, liability reducer |
| Emergency alerts (System) | Paired with classifier |
| Customer profile creation | Essential for CRM value |
| Conversation checklist | Key differentiator for trades |
| Conversation End Analyzer (Prompt 3) | Enables notes + insights |
| Note Extractor (Prompt 4) | High-value feature |
| Manual note selection UI | User control |
| TCPA opt-in/out (System) | Legal requirement |
| Business hours (System) | Operational necessity |
| AI Business Profile (config) | Required for quality responses |
| Basic analytics (conversations, emergencies) | Owner visibility |

**v1 Prompt Stack:** Prompts 1, 2, 3, 4, 6 (lightweight rule matcher)

---

### Phase 2: Expansion (Pro Tier)

| Feature | Justification |
|---------|---------------|
| Situational rules (full) | Advanced customization, upsell opportunity |
| AI Insights Generator (Prompt 5) | Proactive suggestions |
| Human handoff summarizer (Prompt 7) | Better owner experience |
| Follow-up automation (System) | Revenue driver (quote follow-ups) |
| Review request automation | Reputation building |
| Technician view (notes visible) | Crew efficiency |
| Multi-language support | Market expansion |
| Sandbox/test mode (Prompt 9) | Reduces onboarding friction |

**Phase 2 Prompt Stack:** Add Prompts 5, 7, 9

---

### Phase 3: Advanced (Power Users)

| Feature | Justification |
|---------|---------------|
| Photo analyzer (Prompt 8) | Nice-to-have, high cost |
| Technician note creation | Extended crew features |
| Advanced analytics dashboard | Power user retention |
| Seasonal maintenance reminders | Long-term automation |
| AI-generated quote follow-up sequences | Sophisticated automation |
| Conversation quality scoring | QA features |

**Phase 3 Prompt Stack:** Add Prompt 8, enhanced Prompt 3

---

## D. Orchestration Rules

### Execution Timing

| Prompt | Timing | Trigger |
|--------|--------|---------|
| Prompt 1 (Conversation Agent) | Realtime | Every inbound message |
| Prompt 2 (Emergency Classifier) | Realtime (fast-follow) | `emergency_detected` flag from Prompt 1 |
| Prompt 3 (Conversation End Analyzer) | Async | Conversation closed OR 30+ min timeout |
| Prompt 4 (Note Extractor) | Async or On-demand | Called by Prompt 3 OR user action |
| Prompt 5 (Insights Generator) | Async | Post-Prompt 3 OR daily batch OR profile view |
| Prompt 6 (Rule Matcher) | Realtime (pre-Prompt 1) | Every inbound message |
| Prompt 7 (Handoff Summarizer) | Realtime (fast-follow) | `handoff_requested` flag |
| Prompt 8 (Photo Analyzer) | Async | MMS received |
| Prompt 9 (Sandbox Agent) | On-demand | User initiates test |

### Priority Overrides

```
RULE 1: Emergency handling overrides all other processing
  - If Prompt 2 confirms emergency → immediate system alert
  - Prompt 1 continues with emergency-context response
  - No delays for analysis or insights

RULE 2: Human handoff suspends AI autonomy
  - Once handoff triggered → AI stops sending customer-facing messages
  - Prompt 7 generates summary
  - Owner/team takes over
  - AI can resume only when explicitly re-enabled

RULE 3: TCPA compliance is system-enforced, non-bypassable
  - Opt-out ("STOP") → immediate unsubscribe at system layer
  - AI never sees opted-out customers
  - First-contact messages include required disclosures (system template)

RULE 4: Technician views are read-only
  - Techs see notes, profile, job details
  - Techs cannot edit customer profiles (v1)
  - Tech note creation is separate explicit action (Phase 2+)

RULE 5: Sandbox mode is fully isolated
  - Prompt 9 writes to test database only
  - No real alerts, no real profiles
  - Clearly labeled in UI
```

### Failure Handling

```
IF Prompt 1 fails/times out (>5s):
  → System sends fallback: "Thanks for your message! We'll get back to you shortly."
  → Flag conversation for human review
  → Log error

IF Prompt 2 fails during emergency classification:
  → Default to emergency = TRUE (fail safe)
  → Alert owner with raw message
  → Log error

IF Prompt 3/4/5 fail (async):
  → Retry up to 3x with exponential backoff
  → If still failing → mark for manual review
  → Do not block user experience

IF customer sends message during Prompt 1 processing:
  → Queue message
  → Process sequentially
  → Do not skip messages
```

---

## E. Token & Cost Awareness

| Prompt | Cost | Frequency | Optimization Notes |
|--------|------|-----------|-------------------|
| Prompt 1 | LOW | Every message | Keep context window small (10-15 messages). Inject only active checklist items, matched rules. No full history. |
| Prompt 2 | LOW | ~5% of messages | Short context, binary output. Could be rule-based for common keywords. |
| Prompt 3 | MEDIUM | Once per conversation | Full transcript but bounded. Run async, non-blocking. |
| Prompt 4 | LOW | 2-5x per conversation | Single message focus. Batch if multiple notes. |
| Prompt 5 | MEDIUM | Once per conversation + daily | Summarized inputs only. Cache results for 24h. |
| Prompt 6 | LOW | Every message | Could be non-LLM (regex/keyword match) for v1. |
| Prompt 7 | LOW-MEDIUM | ~2% of conversations | Summarization task, moderate context. |
| Prompt 8 | HIGH | ~10% of conversations (if photos) | Defer to Phase 3. Consider cheaper vision model. |
| Prompt 9 | LOW | On-demand | Same as Prompt 1, minimal usage. |

### Cost Reduction Strategies

1. **Prompt 6 (Rule Matcher):** Implement as keyword/regex matching first. Only escalate to LLM for complex rules.

2. **Prompt 1 Context Window:**
   - Last 10 messages max (not full history)
   - Condensed customer profile (name, address, key notes only)
   - Only matched rules (not all rules)
   - Checklist items as bullet list (not full objects)

3. **Prompt 3 Batching:** If conversation is very long (50+ messages), summarize older segments before feeding to Prompt 3.

4. **Prompt 5 Caching:** Cache suggestions for 24h. Only regenerate on new conversation or explicit refresh.

5. **Emergency Keywords:** Use system-level keyword matching first. Only invoke Prompt 2 for edge cases or high-stakes confirmation.

---

## F. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           INBOUND MESSAGE                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SYSTEM LAYER (Non-LLM)                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ TCPA Check  │  │ Spam Check  │  │ Rate Limit  │  │ Customer Lookup     │ │
│  │ (opted out?)│  │ (blocked?)  │  │ (throttle?) │  │ (existing profile?) │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                    ▼                               ▼
        ┌───────────────────┐           ┌───────────────────────┐
        │ PROMPT 6          │           │ CONTEXT BUILDER       │
        │ Rule Matcher      │           │ (System)              │
        │ (which rules?)    │           │ - Last 10 messages    │
        └───────────────────┘           │ - Customer profile    │
                    │                   │ - Matched rules       │
                    │                   │ - Checklist items     │
                    │                   │ - Business profile    │
                    └─────────┬─────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │         PROMPT 1              │
              │   Realtime Conversation Agent │
              │                               │
              │   Outputs:                    │
              │   - Response message          │
              │   - emergency_detected flag   │
              │   - handoff_requested flag    │
              │   - extracted_fields {}       │
              └───────────────────────────────┘
                              │
           ┌──────────────────┼──────────────────┐
           │                  │                  │
           ▼                  ▼                  ▼
   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
   │ EMERGENCY?   │   │ HANDOFF?     │   │ NORMAL       │
   │              │   │              │   │              │
   │ → Prompt 2   │   │ → Prompt 7   │   │ → Send       │
   │   Classifier │   │   Summarizer │   │   Response   │
   └──────────────┘   └──────────────┘   └──────────────┘
           │                  │
           ▼                  ▼
   ┌──────────────┐   ┌──────────────┐
   │ SYSTEM:      │   │ SYSTEM:      │
   │ Send Alerts  │   │ Notify Owner │
   │ (Push/SMS)   │   │ Suspend AI   │
   └──────────────┘   └──────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                    ASYNC LAYER (Post-Conversation)                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
            Trigger: Conversation ends OR 30+ min timeout
                                    │
                                    ▼
              ┌───────────────────────────────┐
              │         PROMPT 3              │
              │   Conversation End Analyzer   │
              │                               │
              │   Outputs:                    │
              │   - profile_updates           │
              │   - note_candidates           │
              │   - checklist_coverage        │
              │   - rules_triggered           │
              │   - detected_language         │
              └───────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │         PROMPT 4              │
              │   Note Extractor              │
              │   (for each candidate)        │
              └───────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │         PROMPT 5              │
              │   AI Insights Generator       │
              │   (suggestions for profile)   │
              └───────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │         SYSTEM                │
              │   - Update customer profile   │
              │   - Store suggested notes     │
              │   - Store suggestions         │
              │   - Display summary to user   │
              └───────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                    SCHEDULED JOBS (System)                                  │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
  │ Daily 6 AM      │   │ Quote Follow-up │   │ Review Request  │
  │ - Refresh       │   │ - Day 3, 7, 14  │   │ - 3 days post   │
  │   insights      │   │ - Send template │   │   job complete  │
  │ - Follow-up due │   │   messages      │   │                 │
  │   detection     │   │                 │   │                 │
  └─────────────────┘   └─────────────────┘   └─────────────────┘
```

---

## G. Prompt Specifications (Condensed)

### Prompt 1: Realtime Conversation Agent

```
CONTEXT INJECTED BY SYSTEM:
- Current message
- Last 10 messages
- Customer profile (condensed): { name, phone, address, key_notes[], after_hours_permission }
- Business profile: { name, services[], service_area, pricing_guidance, tone }
- Active checklist items (max 10)
- Matched rules from Prompt 6 (max 3)
- Current time, business hours status

INSTRUCTIONS:
You are the AI assistant for {business_name}. Respond to the customer naturally.

OBJECTIVES:
1. Be helpful, friendly, professional
2. Gather customer info naturally if missing (name, address when relevant)
3. Cover checklist topics conversationally (don't interrogate)
4. Execute matched rule actions
5. Detect emergencies (flag, don't diagnose)
6. Detect handoff requests (flag, acknowledge)

OUTPUT FORMAT (JSON):
{
  "response": "Your message to customer",
  "flags": {
    "emergency_detected": false,
    "emergency_keywords": [],
    "handoff_requested": false,
    "handoff_reason": null
  },
  "extracted": {
    "name": null,
    "address": null,
    "email": null,
    "scheduling_preference": null,
    "other": {}
  },
  "checklist_covered": ["item_id_1"],
  "internal_notes": "Any observations for async processing"
}

CONSTRAINTS:
- Response must be under 320 characters (SMS limit)
- One question at a time
- Never diagnose, never quote prices directly (use ranges)
- If uncertain, ask clarifying question
- If customer asks for human, acknowledge and flag handoff
```

---

### Prompt 2: Emergency Classifier

```
CONTEXT:
- Triggering message: "{message}"
- Last 5 messages: [...]
- Emergency keywords (system + custom): [...]

TASK:
Determine if this is a genuine emergency requiring immediate owner notification.

OUTPUT FORMAT (JSON):
{
  "is_emergency": true,
  "severity": "critical" | "high",
  "category": "water_damage" | "no_heat" | "no_ac" | "gas_leak" | "electrical" | "other",
  "summary": "Burst pipe, water actively spreading, customer hasn't shut off water",
  "confidence": 0.95
}

GUIDELINES:
- "critical": immediate safety risk (gas, fire, electrical, flooding actively spreading)
- "high": urgent but not immediate danger (no heat, no hot water, contained leak)
- When in doubt, classify as emergency (fail safe)
- Summary should be actionable for owner (what's happening, what's needed)
```

---

### Prompt 3: Conversation End Analyzer

```
CONTEXT:
- Full transcript: [...]
- Customer profile (current): {...}
- Checklist items: [...]
- Situational rules: [...]
- Business context: {...}

TASK:
Analyze completed conversation. Extract structured data.

OUTPUT FORMAT (JSON):
{
  "profile_updates": {
    "first_name": "John",
    "last_name": "Smith",
    "address": { "street": "123 Main St", ... },
    "email": "john@email.com"
  },
  "note_candidates": [
    {
      "source_message_index": 7,
      "source_quote": "we have a German Shepherd",
      "suggested_category": "access_info",
      "confidence": "high"
    }
  ],
  "checklist_coverage": [
    { "item_id": "1", "covered": true, "answer_summary": "Has German Shepherd" },
    { "item_id": "2", "covered": false, "reason": "not_asked" }
  ],
  "rules_triggered": [
    { "rule_id": "emergency_burst_pipe", "actions_executed": ["ask_shutoff", "reassure", "escalate"] }
  ],
  "detected_language": "en",
  "conversation_summary": "New lead with burst pipe emergency. John Smith, 123 Main St. Has dog. Prefers mornings.",
  "sentiment": "anxious_but_cooperative"
}

CONSTRAINTS:
- Only extract facts explicitly stated
- Do not infer unstated information
- Note candidates must have clear source quote
```

---

### Prompt 4: Note Extractor

```
CONTEXT:
- Source message: "{message}"
- Suggested category: "{category}" (optional)
- Existing notes: [...] (for deduplication)

TASK:
Extract a concise, actionable note from this message.

OUTPUT FORMAT (JSON):
{
  "content": "German Shepherd (Max) in backyard - friendly but will run if gate left open. Keep gate closed.",
  "category": "access_info",
  "confidence": "high",
  "source_quote": "we have a German Shepherd named Max, he's friendly but likes to run out if the gate is left open"
}

GUIDELINES:
- Content should be actionable for a technician
- Remove conversational fluff
- Preserve critical details (names, codes, locations)
- Max 200 characters
- If duplicate of existing note, return { "duplicate": true, "existing_note_id": "..." }
```

---

### Prompt 5: AI Insights Generator

```
CONTEXT:
- Customer profile: {...}
- Recent conversations summary: "..."
- Open quotes: [{ sent_date, amount, status }]
- Last contact: "2025-01-10"
- Today's schedule (same area): [{ time, address, zip }]
- Customer stated preferences: { preferred_time: "mornings", ... }

TASK:
Generate actionable suggestions for this customer.

OUTPUT FORMAT (JSON):
{
  "suggestions": [
    {
      "type": "follow_up_due",
      "title": "Quote sent 5 days ago",
      "description": "No response to $2,400 water heater quote. Consider follow-up call.",
      "priority": "high",
      "actions": [
        { "label": "Call", "action_type": "call", "is_primary": true },
        { "label": "Text", "action_type": "text", "is_primary": false }
      ]
    },
    {
      "type": "same_area_jobs",
      "title": "2 jobs nearby Thursday",
      "description": "You have 2 jobs in 78701 on Thursday. This customer is flexible.",
      "priority": "medium",
      "actions": [
        { "label": "Schedule Thursday", "action_type": "schedule", "is_primary": true }
      ]
    }
  ]
}

CONSTRAINTS:
- Max 5 suggestions
- Prioritize by actionability
- Only suggest what's supported by data (no speculation)
- Follow-up suggestions require open quote or recent conversation
```

---

### Prompt 7: Human Handoff Summarizer

```
CONTEXT:
- Conversation transcript: [...]
- Customer profile: {...}
- Handoff reason: "customer_requested" | "ai_uncertain" | "complex_request" | "complaint"

TASK:
Summarize conversation for human takeover.

OUTPUT FORMAT (JSON):
{
  "summary": "John Smith has a burst pipe at 123 Main St. Water is spreading. He's anxious and wants someone there ASAP. Hasn't been able to find shutoff valve.",
  "key_issues": [
    "Burst pipe, actively leaking",
    "Can't locate shutoff valve",
    "Wants immediate service"
  ],
  "customer_sentiment": "anxious, frustrated but polite",
  "info_gathered": {
    "name": "John Smith",
    "address": "123 Main St, Austin TX",
    "issue": "Burst pipe",
    "urgency": "Emergency"
  },
  "recommended_actions": [
    "Call customer immediately",
    "Walk through shutoff valve location",
    "Dispatch technician if available"
  ]
}
```

---

## H. What Is NOT an LLM Task

| Function | Implementation |
|----------|----------------|
| TCPA opt-in/opt-out | System rule: "STOP" → immediate unsubscribe, no LLM |
| Phone number matching | Database lookup with fuzzy match algorithm |
| Rate limiting / spam | System counters and block lists |
| Emergency alert delivery | Push notification service (FCM/APNs), SMS gateway |
| Business hours calculation | Time comparison logic |
| Scheduling integration | Calendar API, availability lookup |
| Analytics aggregation | SQL queries on conversation/job data |
| Follow-up message sending | Scheduled job + template system |
| Review request sending | Scheduled job + template system |
| Technician view rendering | Read-only database query |
| File/photo storage | Object storage (S3/equivalent) |

---

## I. Risk Callouts

| Risk | Mitigation |
|------|------------|
| **Prompt 1 latency** | Keep context small, use fast model (Claude Haiku for v1 if needed), 5s timeout with fallback |
| **Emergency false negatives** | Fail safe: if Prompt 2 fails, default to emergency=true |
| **Emergency false positives** | Acceptable in v1, owner can dismiss. Track dismissal rate for tuning. |
| **Token costs scaling** | Monitor per-conversation cost, set alerts, implement caching |
| **LLM hallucination in notes** | Require source quote, user confirmation before saving |
| **Multi-language quality** | v1: English + Spanish only, test thoroughly before expanding |
| **Photo analyzer cost** | Defer to Phase 3, use cheaper vision model, make optional |
| **Situational rules complexity** | Cap at 15 rules, validate on creation, show preview |
| **Conversation history size** | Truncate to last 10 messages for Prompt 1, summarize for Prompt 3 if >50 messages |

---


---

This architecture is designed to ship v1 confidently, scale without rewriting, and be maintainable at 2 AM. Each prompt has a single responsibility, clear inputs/outputs, and explicit boundaries.