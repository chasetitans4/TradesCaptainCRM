# SPOKE — Voice-First CRM Updates

## Master Implementation Spec for Claude/Trae

**Version:** 1.0  
**Status:** Ready for Implementation  
**Parent Product:** Leads Captain  
**Pricing:** Bundled (no separate SKU)

---

## PREAMBLE

You are implementing Spoke, a voice-first data entry feature for TradesCaptain's Leads Captain product. This document is the single source of truth. Do not cross-reference other documents. All decisions have been made.

### Core Principle

**Speak once, structured data appears.** No transcription dumps. No voice assistant back-and-forth. No second step.

### What Spoke Is

- A parsing engine that converts natural contractor speech into structured CRM field updates
- Real-time processing (not batch)
- Phone-number-based identity (no logins for crew)
- Bundled into Leads Captain (not a separate product)

### What Spoke Is Not

- Not a transcription service (no audio files to review)
- Not a conversational voice assistant (no "Did you mean...?" dialogs)
- Not dependent on perfect speech (fuzzy matching + confirmation safety net)

---

## SECTION 1: CONSTITUTIONAL GATES

Before any implementation decision, apply these four tests. A single ❌ kills the feature or approach.

### 1.1 Marketing Test

> Can this be explained in one sentence on a landing page?

**Spoke:** "Call in your job updates—they appear in your CRM instantly."

✅ Pass

### 1.2 Explanation Test

> If a contractor asks "why did that happen?", can the system answer in plain English?

Every Spoke action must trace back to:
- What the contractor said
- What field was updated
- Why it was matched to that job/customer

✅ Required for all implementations

### 1.3 Trust Test

> Does this increase or decrease contractor trust in the system?

Spoke must:
- Never silently write to wrong fields
- Always confirm what was logged
- Allow easy correction

✅ Confirmation SMS is non-negotiable

### 1.4 Deletion Test

> If a contractor deletes their account, can we purge all Spoke data?

Voice recordings: Deleted after parsing (not stored)
Parsed data: Lives in CRM records (standard deletion flow)
Phone-to-identity mappings: Deleted with account

✅ Pass

---

## SECTION 2: ENTRY POINTS

Spoke accepts voice input through three channels. All three feed the same parsing engine.

### 2.1 Dedicated Phone Number (Primary)

```
TRIGGER: Contractor calls Spoke number
BEHAVIOR:
  1. System answers: "Spoke. Go ahead."
  2. Contractor speaks naturally (no prompts)
  3. System detects 2+ seconds silence → ends capture
  4. Hang up (or contractor hangs up first)
  5. Process immediately
  6. Send confirmation SMS within 30 seconds
```

**Phone number allocation:**
- Same Twilio subaccount as Leads Captain
- Dedicated number per business (not shared)
- Format: Local area code matching business

### 2.2 SMS Trigger (Secondary)

```
TRIGGER: Contractor texts "update" to Leads Captain number
BEHAVIOR:
  1. System calls contractor back immediately
  2. Same flow as 2.1 from step 1
  
ALTERNATIVE (if callback fails):
  1. Reply: "Reply with your update or call [Spoke number]"
  2. Parse text reply using same engine (text mode)
```

### 2.3 In-App Button (Tertiary)

```
TRIGGER: Contractor taps "Spoke" button in mobile app
BEHAVIOR:
  1. Native audio capture begins (no Twilio)
  2. On stop → send audio to parsing API
  3. Same processing flow
  4. Confirmation appears in-app (no SMS needed)
```

**UI Requirements:**
- Single tap to start
- Visual recording indicator (red dot, waveform)
- Tap again to stop (or 2s silence auto-stop)
- Touch target: 56x56dp minimum

---

## SECTION 3: PARSING ENGINE

### 3.1 Parsing Architecture Overview

Spoke uses a three-stage parsing pipeline:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  STAGE 1        │     │  STAGE 2        │     │  STAGE 3        │
│  Tokenization   │ ──▶ │  Extraction     │ ──▶ │  Resolution     │
│  & Normalization│     │  & Scoring      │     │  & Validation   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
      │                       │                       │
      ▼                       ▼                       ▼
 Clean transcript       Candidate fields        Final structured
 with markers           with confidence         output + actions
```

### 3.2 Token Grammar

#### 3.2.1 Token Categories

```
TOKEN_CATEGORIES = {
  
  # Status signals (highest priority - sets context for everything else)
  STATUS_COMPLETE: [
    "finished", "done", "wrapped up", "completed", "all done",
    "knocked out", "taken care of", "good to go", "buttoned up"
  ],
  STATUS_ARRIVAL: [
    "arrived", "got here", "just got here", "on site", "at the house",
    "pulled up", "I'm here", "walking up"
  ],
  STATUS_ENROUTE: [
    "on my way", "heading to", "heading over", "driving to",
    "en route", "about to head", "leaving for", "heading out to"
  ],
  STATUS_DELAYED: [
    "running late", "gonna be late", "delayed", "stuck in traffic",
    "running behind", "few minutes late"
  ],
  
  # Customer reference patterns
  CUSTOMER_DIRECT: [
    "{Name}", "the {Name} job", "{Name}'s place", "{Name}'s house",
    "at {Name}", "for {Name}", "the {Name}s"
  ],
  CUSTOMER_POSSESSIVE: [
    "his place", "her place", "their house", "the customer"
  ],
  
  # Temporal markers
  TIME_DURATION: [
    "{N} hours", "{N} hour", "{N} minutes", "{N} mins",
    "hour and a half", "half hour", "couple hours", "few hours",
    "about {N}", "around {N}", "maybe {N}", "like {N}"
  ],
  TIME_ARRIVAL: [
    "got here at {TIME}", "arrived at {TIME}", "showed up at {TIME}",
    "got there around {TIME}"
  ],
  TIME_DEPARTURE: [
    "left at {TIME}", "headed out at {TIME}", "finished at {TIME}",
    "wrapped up around {TIME}"
  ],
  TIME_SPAN: [
    "from {TIME} to {TIME}", "{TIME} to {TIME}", 
    "got here at {TIME} left at {TIME}"
  ],
  
  # Payment patterns
  PAYMENT_AMOUNT: [
    "${N}", "{N} dollars", "{N} bucks", "{N} cash",
    "{N} hundred", "{N} fifty", "{SPOKEN_NUMBER}"
  ],
  PAYMENT_METHOD: [
    "cash", "card", "credit card", "debit", "check", "cheque",
    "card on file", "the card we have", "ran the card",
    "charged it", "swiped", "Venmo", "Zelle", "PayPal"
  ],
  PAYMENT_DEFERRED: [
    "sending invoice", "gonna invoice", "bill them", "invoicing",
    "sending a bill", "I'll invoice", "they'll pay later",
    "net 30", "on account"
  ],
  PAYMENT_STATUS: [
    "paid", "collected", "got paid", "payment received",
    "owes", "still owes", "hasn't paid", "waiting on payment"
  ],
  
  # Work description triggers
  WORK_ACTION: [
    "replaced", "fixed", "repaired", "installed", "removed",
    "cleared", "unclogged", "patched", "sealed", "adjusted",
    "tightened", "rebuilt", "rewired", "replumbed"
  ],
  WORK_COMPONENT: [
    "water heater", "garbage disposal", "faucet", "toilet",
    "drain", "pipe", "p-trap", "supply line", "valve",
    "thermostat", "element", "flapper", "wax ring", "cartridge",
    "aerator", "shut-off", "hose bib", "PRV", "expansion tank"
  ],
  
  # Materials triggers
  MATERIAL_INTRO: [
    "used", "installed", "put in", "replaced with", "needed"
  ],
  MATERIAL_QUANTITY: [
    "{N} feet", "{N} ft", "{N} inches", "{N} gallons",
    "{N} of them", "a couple", "a few", "some"
  ],
  
  # Follow-up / referral triggers
  FOLLOWUP_INTRO: [
    "she mentioned", "he mentioned", "they said", "told me",
    "asked about", "wants", "needs", "might need", "should probably"
  ],
  REFERRAL_RELATION: [
    "daughter", "son", "neighbor", "friend", "mother", "father",
    "sister", "brother", "boss", "coworker", "tenant", "landlord"
  ],
  REFERRAL_HANDOFF: [
    "gave them my card", "told them to call", "recommended",
    "referred", "passed along", "I'll have someone reach out"
  ],
  
  # Scheduling triggers  
  SCHEDULE_FUTURE: [
    "coming back", "going back", "returning", "follow-up",
    "next appointment", "scheduled for", "booked for"
  ],
  SCHEDULE_DAY: [
    "Monday", "Tuesday", "Wednesday", "Thursday", "Friday",
    "Saturday", "Sunday", "tomorrow", "next week", "this week",
    "the {Nth}", "end of the week"
  ],
  
  # Negation / correction
  NEGATION: [
    "not", "didn't", "don't", "wasn't", "weren't", "no",
    "actually", "wait", "sorry", "I mean", "correction"
  ],
  
  # Filler (to strip)
  FILLER: [
    "uh", "um", "like", "you know", "basically", "so yeah",
    "anyway", "let's see", "hmm"
  ]
}
```

#### 3.2.2 Compound Pattern Recognition

Many updates contain multiple related pieces. The parser must recognize compound structures:

```
COMPOUND_PATTERNS = {
  
  # Status + Duration
  PATTERN: "{STATUS_COMPLETE} ... {TIME_DURATION}"
  EXAMPLE: "Just finished, took about two hours"
  EXTRACT: { status: completed, duration: 120 }
  
  # Status + Customer
  PATTERN: "{STATUS_COMPLETE} at {CUSTOMER_DIRECT}"
  EXAMPLE: "Done at the Martinez place"
  EXTRACT: { status: completed, customer: "Martinez" }
  
  # Status + Duration + Payment
  PATTERN: "{STATUS_COMPLETE} ... {TIME_DURATION} ... {PAYMENT_AMOUNT} {PAYMENT_METHOD}"
  EXAMPLE: "Wrapped up, two hours, she paid 450 cash"
  EXTRACT: { status: completed, duration: 120, payment: { amount: 450, method: cash, status: paid }}
  
  # Work + Materials
  PATTERN: "{WORK_ACTION} the {WORK_COMPONENT} ... {MATERIAL_INTRO} {MATERIAL_QUANTITY}"
  EXAMPLE: "Replaced the p-trap, used about 3 feet of PVC"
  EXTRACT: { work: "Replaced p-trap", materials: [{ item: "PVC", quantity: "3 feet" }]}
  
  # Referral chain
  PATTERN: "{REFERRAL_RELATION} {FOLLOWUP_INTRO} {WORK_COMPONENT}"
  EXAMPLE: "Her daughter needs someone to look at her water heater"
  EXTRACT: { referral: { relation: "daughter", service: "water heater inspection" }}
  
  # Time span calculation
  PATTERN: "{TIME_ARRIVAL} ... {TIME_DEPARTURE}"
  EXAMPLE: "Got here at 10, left around 12:30"
  EXTRACT: { arrival: "10:00", departure: "12:30", duration: 150 }
}
```

#### 3.2.3 Number Normalization

```
NUMBER_NORMALIZATIONS = {
  
  # Spoken numbers → digits
  "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
  "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
  "eleven": 11, "twelve": 12, "fifteen": 15, "twenty": 20,
  "thirty": 30, "forty": 40, "fifty": 50, "hundred": 100,
  
  # Compound spoken numbers
  "four fifty" → 450 (context: payment) OR 4.5 (context: hours)
  "two and a half" → 2.5
  "one twenty" → 120 (context: payment) OR 1:20 (context: time)
  "a couple" → 2
  "a few" → 3
  "several" → 4
  
  # Duration idioms
  "couple hours" → 120 minutes
  "few hours" → 180 minutes  
  "half hour" → 30 minutes
  "hour and a half" → 90 minutes
  "quarter hour" → 15 minutes
  
  # Payment idioms
  "two fifty" → 250 (in payment context)
  "four and a quarter" → 425 (payment) OR 4.25 hours (duration)
  "a hundred" → 100
  "a grand" → 1000
  "buck fifty" → 150
}

DISAMBIGUATION RULES:
- "four fifty" after STATUS_COMPLETE + no duration yet → likely duration (4.5 hours)
- "four fifty" after PAYMENT_METHOD or "paid" → likely payment ($450)
- "four fifty" with "cash/card/check" in same breath → definitely payment
- When ambiguous → extract both interpretations, let confidence scoring decide
```

### 3.3 Contextual Intelligence

#### 3.3.1 Pronoun Resolution

```
PRONOUN_RESOLUTION = {
  
  RULE: Resolve pronouns to most recent valid referent
  
  PATTERNS:
    "she/her" → most recent female customer OR customer.contact if female
    "he/him" → most recent male customer OR customer.contact if male  
    "they/them" → most recent customer (gender-neutral fallback)
    "it" → most recent WORK_COMPONENT or job
    "the place/house" → most recent customer address
  
  EXAMPLE:
    INPUT: "Finished at Martinez. She paid cash. Her daughter needs a plumber too."
    RESOLUTION:
      - "She" → Martinez (customer)
      - "Her daughter" → Martinez's daughter (new referral)
  
  IMPLEMENTATION:
    - Maintain referent stack during parsing
    - Push customer names when extracted
    - Resolve pronouns against stack
    - Confidence = 0.85 if single valid referent, 0.65 if multiple
}
```

#### 3.3.2 Implicit Field Inference

```
IMPLICIT_INFERENCE = {
  
  # If status = completed, infer payment expectation
  RULE: STATUS_COMPLETE + no payment mentioned
  INFER: payment.status = "pending_confirmation"
  ACTION: Add to confirmation SMS: "Payment collected?"
  
  # If GPS at job site + "done", infer customer
  RULE: STATUS_COMPLETE + GPS within 500ft of job.address + no customer mentioned
  INFER: customer = matched job's customer
  CONFIDENCE: 0.90 (GPS is strong signal)
  
  # If duration mentioned but no status, infer completion
  RULE: TIME_DURATION + no STATUS token
  INFER: status = "completed"
  CONFIDENCE: 0.80 (talking about duration usually means done)
  
  # If payment mentioned but no status, infer completion  
  RULE: PAYMENT_AMOUNT + PAYMENT_METHOD + no STATUS token
  INFER: status = "completed"
  CONFIDENCE: 0.95 (payment means job is done)
  
  # If work description but no status, infer completion
  RULE: WORK_ACTION + WORK_COMPONENT + past tense verb
  INFER: status = "completed"
  CONFIDENCE: 0.85
}
```

#### 3.3.3 Negation Handling

```
NEGATION_HANDLING = {
  
  RULE: NEGATION token inverts or nullifies the following extraction
  
  PATTERNS:
    "didn't collect payment" → payment.status = "unpaid"
    "not done yet" → status = "in_progress" (not completed)
    "wasn't there long" → duration modifier (reduce estimate)
    "no parts needed" → materials = []
    "wait, not Martinez" → customer.confidence = 0 (retry extraction)
    "actually, it was 350 not 450" → payment.amount = 350, ignore 450
  
  CORRECTION_DETECTION:
    TRIGGERS: "actually", "wait", "sorry", "I mean", "correction", "no wait"
    BEHAVIOR: 
      1. Mark previous extraction as superseded
      2. Increase confidence on corrected value
      3. Log correction for learning
  
  EXAMPLE:
    INPUT: "Took about two hours... actually no, more like three"
    PARSE:
      - First pass: duration = 120
      - Correction detected: "actually no"
      - Second pass: duration = 180
      - Final: duration = 180, confidence = 0.92 (correction = certainty)
}
```

#### 3.3.4 Multi-Job Detection

```
MULTI_JOB_DETECTION = {
  
  RULE: Detect when contractor is reporting on multiple jobs in one call
  
  TRIGGERS:
    - Multiple customer names mentioned
    - "first job... second job..."
    - "also" + new customer/location reference
    - Distinct time references that don't overlap
  
  BEHAVIOR:
    1. Segment transcript into job-chunks
    2. Parse each chunk independently
    3. Match each chunk to different jobs
    4. Confirmation SMS lists all updates
  
  EXAMPLE:
    INPUT: "Martinez job is done, two hours, 450 cash. Also finished at Johnson, 
            that was quick, maybe 45 minutes, she's gonna mail a check."
    PARSE:
      JOB_1: { customer: Martinez, status: completed, duration: 120, 
               payment: { amount: 450, method: cash, status: paid }}
      JOB_2: { customer: Johnson, status: completed, duration: 45,
               payment: { method: check, status: pending }}
  
  CONFIRMATION:
    "✓ Martinez: complete, 2hr, $450 cash
     ✓ Johnson: complete, 45min, check pending
     → Reply EDIT to fix"
}
```

### 3.4 Confidence Scoring System

#### 3.4.1 Base Confidence Matrix

| Signal Type | Base Confidence | Notes |
|-------------|-----------------|-------|
| Explicit statement | 0.95 | "She paid 450 cash" |
| Clear implication | 0.85 | "Done here" (status = completed) |
| Contextual inference | 0.75 | GPS + "done" → customer match |
| Ambiguous | 0.60 | Could be duration or payment |
| Weak signal | 0.45 | Pronoun with multiple referents |

#### 3.4.2 Confidence Modifiers

```
CONFIDENCE_MODIFIERS = {
  
  # Positive modifiers (increase confidence)
  +0.10: Explicit number stated ("four hundred fifty dollars")
  +0.08: Method + amount together ("450 cash")
  +0.05: Correction made ("actually, 350")
  +0.05: Repeated/confirmed ("450, yeah 450")
  +0.03: Clear enunciation (low background noise in audio)
  
  # Negative modifiers (decrease confidence)
  -0.10: Hedging language ("I think", "maybe", "probably")
  -0.08: Background noise detected
  -0.05: Filler words around value ("like, um, 450 or something")
  -0.05: Fast speech rate (>180 wpm)
  -0.03: Multiple similar values mentioned (450 vs 350)
  
  # Contextual modifiers
  +0.10: Value matches expected range for service type
  +0.05: Duration matches scheduled time slot
  -0.10: Value is statistical outlier (e.g., $5000 for drain clearing)
  -0.08: Contradicts known job details
}

FINAL_CONFIDENCE = BASE + SUM(MODIFIERS)
CLAMP(0.0, 1.0)
```

#### 3.4.3 Threshold Actions

| Confidence | Field Type | Action |
|------------|------------|--------|
| ≥ 0.90 | Payment amount | Write directly |
| ≥ 0.85 | Status, duration | Write directly |
| ≥ 0.80 | Customer match | Write directly |
| 0.70 - 0.89 | Payment amount | Write + highlight in confirmation |
| 0.60 - 0.79 | Any field | Write + flag for review |
| < 0.60 | Any field | Do NOT write, ask clarification |
| < 0.50 | Payment amount | Never write, explicit ask required |

### 3.5 Learning & Adaptation

#### 3.5.1 Correction Feedback Loop

```
LEARNING_LOOP = {
  
  TRIGGER: Contractor uses EDIT flow
  
  DATA_CAPTURE:
    - Original transcript
    - Original parsed output
    - Correction type (which field)
    - Corrected value
    - Time to correction (immediacy = confidence)
  
  AGGREGATION (per business):
    - Common correction patterns
    - Contractor-specific speech patterns
    - Frequently confused values
  
  ADAPTATION:
    - Adjust confidence thresholds per contractor
    - Learn contractor's vocabulary ("buttoned up" = completed)
    - Learn customer name pronunciations
    - Learn common job types and typical durations
}
```

#### 3.5.2 Contractor Speech Profile

```
CONTRACTOR_PROFILE = {
  
  STORED PER CONTRACTOR_PHONE:
    - vocabulary_overrides: { "buttoned up": STATUS_COMPLETE }
    - typical_duration_by_service: { "drain_clearing": 45-90 }
    - payment_amount_range: { min: 100, max: 800, median: 350 }
    - speech_rate: "fast" | "normal" | "slow"
    - filler_frequency: "high" | "normal" | "low"
    - correction_rate: 0.0 - 1.0
  
  USAGE:
    - Adjust confidence based on historical accuracy
    - Flag outliers relative to contractor's typical range
    - Pre-weight vocabulary matches
  
  EXAMPLE:
    Contractor A always says "knocked it out" for completion
    → Add "knocked it out" to their STATUS_COMPLETE with confidence 0.95
    
    Contractor B's jobs average $400, they say "two hundred"
    → Flag as potential error, lower confidence
}
```

#### 3.5.3 Business-Level Learning

```
BUSINESS_PROFILE = {
  
  STORED PER BUSINESS:
    - service_catalog: [{ name, typical_duration, typical_price_range }]
    - customer_pronunciation_map: { "Martinez": ["mar-TEE-nez", "MAR-tin-ez"] }
    - common_materials: ["PVC", "PEX", "copper", "SharkBite"]
    - peak_hours: [8, 9, 10, 14, 15, 16]
  
  USAGE:
    - Improve customer name matching with pronunciation variants
    - Validate duration against service type norms
    - Validate payment against service type pricing
    - Prioritize job matching during peak hours (more GPS checks)
}
```

### 3.6 Technical Implementation

#### 3.6.1 Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     SPOKE PARSING PIPELINE                       │
└─────────────────────────────────────────────────────────────────┘

STAGE 1: AUDIO PROCESSING
├── Input: Raw audio (Twilio recording URL)
├── Process: 
│   ├── Noise reduction (optional, based on SNR)
│   ├── Whisper transcription (model: whisper-1)
│   └── Timestamp alignment for segments
└── Output: Transcript with word-level timestamps

⚠️ WHISPER TIMESTAMP CAVEAT:
Whisper timestamps are good, not perfect. Confidence scores can drift.
RULES:
- Treat timestamps as SUPPORTING signals, not primary
- If timestamp-based duration conflicts with spoken duration, prefer spoken
- Log "model disagreement events" when conflicts occur for tuning
- Never use timestamp confidence alone to gate writes

STAGE 2: TOKENIZATION (AUTHORITATIVE)
├── Input: Raw transcript
├── Process:
│   ├── Strip filler words (preserve positions for confidence)
│   ├── Normalize numbers (spoken → digits)
│   ├── Tag tokens with TOKEN_CATEGORIES
│   └── Identify compound patterns
└── Output: Tagged token stream

⚠️ TOKENIZATION IS SOURCE OF TRUTH:
Stage 2 output is authoritative. Claude (Stage 3) is a semantic refiner,
not the source of truth. If Claude output conflicts with Stage 2 tokens,
Stage 2 wins unless Claude provides explicit reasoning.
Enforce this in code review.

STAGE 3: EXTRACTION
├── Input: Tagged tokens + contractor context
├── Process:
│   ├── Claude API call with structured output schema
│   ├── Multi-job segmentation if detected
│   ├── Pronoun resolution
│   └── Implicit inference application
└── Output: Candidate extractions with raw confidence

STAGE 4: RESOLUTION
├── Input: Candidates + business context + contractor profile
├── Process:
│   ├── Customer name fuzzy matching (pg_trgm + Soundex)
│   ├── Job matching (see Section 4)
│   ├── Confidence modifier application
│   └── Threshold evaluation
└── Output: Final structured output + action plan

STAGE 5: EXECUTION
├── Input: Validated extractions
├── Process:
│   ├── CRM writes (transactional)
│   ├── Confirmation SMS generation
│   ├── Draft creation (if needed)
│   └── Webhook emission
└── Output: Confirmation sent, data persisted
```

#### 3.6.2 Latency Budget

```
LATENCY_BUDGET (p95 targets):

Audio fetch:          500ms
Transcription:      2,500ms (Whisper API)
Tokenization:         100ms (local)
Extraction:         1,500ms (Claude API)
Resolution:           300ms (DB queries)
CRM writes:           200ms
SMS send:             400ms
─────────────────────────────
TOTAL:              5,500ms

BUFFER:             4,500ms
─────────────────────────────
TARGET:            10,000ms (10 seconds, well under 30s requirement)
```

#### 3.6.3 Claude Extraction Prompt (Full)

```
SYSTEM:
You are a parser for contractor job updates. Extract structured data from transcribed voice input.

Your job is to understand natural, messy contractor speech and convert it to clean structured data.

CONTEXT PROVIDED:
- Contractor's active jobs today (customer names, addresses, service types, scheduled times)
- Contractor's speech profile (vocabulary patterns, typical ranges)
- Current GPS coordinates (if available)
- Business's service catalog

EXTRACTION RULES:

1. CUSTOMER MATCHING
   - Match spoken names to provided active jobs list
   - Account for nicknames (Jim/James, Bob/Robert)
   - Account for pronunciation variants
   - If no match found, extract raw spoken name for fuzzy matching

2. STATUS EXTRACTION
   - Map completion phrases to "completed"
   - Map arrival phrases to "in_progress"  
   - Map travel phrases to "en_route"
   - Map delay phrases to "delayed"
   - If ambiguous, prefer "completed" when duration/payment present

3. DURATION HANDLING
   - Normalize all durations to minutes
   - "couple hours" = 120, "hour and a half" = 90
   - If time span given (arrived at X, left at Y), calculate difference
   - Flag if duration seems unrealistic for service type

4. PAYMENT EXTRACTION
   - Only extract if explicitly stated
   - Require both amount AND (method OR status) for high confidence
   - "four fifty" in payment context = 450, not 4.5
   - Never infer payment amount from service type

5. NEGATION/CORRECTION
   - "actually", "wait", "I mean" signals correction
   - Use corrected value, discard original
   - Increase confidence for corrected values (speaker is being precise)

6. MULTI-JOB HANDLING
   - If multiple distinct customer references, segment by job
   - Each segment gets independent extraction
   - Return array of job updates

OUTPUT SCHEMA:
{
  "updates": [
    {
      "customer": { "spoken": string, "matched_id": string|null, "confidence": float },
      "status": { "value": string|null, "confidence": float },
      "duration": { "minutes": int|null, "confidence": float },
      "arrival_time": { "value": string|null, "confidence": float },
      "payment": {
        "amount": { "value": float|null, "confidence": float },
        "method": { "value": string|null, "confidence": float },
        "status": { "value": string|null, "confidence": float }
      },
      "work_description": { "value": string|null, "confidence": float },
      "materials": [{ "item": string, "quantity": string|null, "confidence": float }],
      "follow_up": { "description": string|null, "urgency": string|null, "confidence": float },
      "referral": {
        "relation": string|null,
        "name": string|null,
        "service_needed": string|null,
        "confidence": float
      },
      "scheduling": {
        "raw_text": string|null,
        "parsed_date": string|null,
        "confidence": float
      },
      "corrections_detected": boolean,
      "ambiguities": [string]
    }
  ],
  "parse_metadata": {
    "transcript_quality": "clear"|"noisy"|"poor",
    "speech_rate": "slow"|"normal"|"fast",
    "multi_job_detected": boolean,
    "filler_word_count": int
  }
}

USER:
TRANSCRIPT: {{transcript}}

ACTIVE JOBS TODAY:
{{jobs_list}}

CONTRACTOR PROFILE:
{{contractor_profile}}

GPS LOCATION: {{gps_coords}}
```

### 3.7 Edge Case Handling

#### 3.7.1 Ambiguous Inputs

```
AMBIGUITY_HANDLERS = {
  
  # Payment vs Duration ambiguity
  CASE: "four fifty" with no clear context
  HANDLER:
    1. Check what's already extracted
    2. If duration present → interpret as payment
    3. If payment present → interpret as duration
    4. If neither → check contractor's typical range
    5. If still ambiguous → ask: "Was that $450 or 4.5 hours?"
  
  # Multiple customers mentioned
  CASE: "Finished at Martinez, heading to Johnson"
  HANDLER:
    1. First customer + status = job update
    2. Second customer + travel = informational (no status change)
    3. Don't mark Johnson job as anything
  
  # Partial information
  CASE: "Done here"
  HANDLER:
    1. Status = completed (confidence 0.90)
    2. Customer = GPS match (if available)
    3. If no GPS → use schedule-based match
    4. If no match → "Which job are you finishing?"
  
  # Contradictory information
  CASE: "Took about two hours... well, got there at 10 and it's 1:30 now"
  HANDLER:
    1. Spoken duration (2 hours) conflicts with calculated (3.5 hours)
    2. Prefer calculated from timestamps (more precise)
    3. Confidence = 0.85 (reconciled contradiction)
  
  # Future tense
  CASE: "Gonna head to Martinez next"
  HANDLER:
    1. This is informational, not a job update
    2. Do not change Martinez job status
    3. Optionally: update contractor's current_destination field
}
```

#### 3.7.2 Audio Quality Issues

```
AUDIO_QUALITY_HANDLERS = {
  
  # High background noise
  DETECTION: SNR < 10dB
  HANDLER:
    1. Reduce confidence scores by 0.15 across all fields
    2. Increase transcription temperature for alternatives
    3. If critical fields (payment) below threshold → ask for repeat
  
  # Call drops mid-sentence
  DETECTION: Transcript ends abruptly, call duration < 5 seconds
  HANDLER:
    1. Do not process
    2. SMS: "Got cut off. Call back when you have a sec."
  
  # Multiple speakers detected
  DETECTION: Whisper returns multiple speaker labels
  HANDLER:
    1. Focus on primary speaker (longest total duration)
    2. Ignore secondary speaker content
    3. Flag in metadata for review
  
  # Unintelligible segments
  DETECTION: Whisper confidence < 0.5 for segment
  HANDLER:
    1. Mark segment as [unintelligible]
    2. Do not extract from that segment
    3. If segment contains number → ask for repeat
}
```

---

## SECTION 4: MULTI-JOB CONTEXT MATCHING

When a contractor has multiple jobs scheduled, Spoke must determine which job the update applies to.

### 4.1 Signal Stack (Priority Order)

| Signal | Weight | Implementation |
|--------|--------|----------------|
| Customer name spoken | 1.0 (override) | Direct match to job.customer_name |
| GPS proximity | 0.8 | Phone location within 500ft of job.address |
| Schedule window | 0.6 | Job.scheduled_time within ±2 hours of now |
| Last job viewed | 0.3 | job.last_viewed_at within 30 minutes |
| Route prediction | 0.4 | Based on job sequence and travel time |
| Historical pattern | 0.2 | Contractor's typical job-to-job timing |

### 4.2 Matching Logic

```
FUNCTION match_job(parsed_input, contractor_context):
  
  # Direct match always wins
  IF parsed_input.customer_name EXISTS:
    match = fuzzy_search(parsed_input.customer_name, contractor.active_jobs)
    IF match.confidence >= 0.85:
      RETURN match.job
  
  # Calculate composite scores for remaining jobs
  candidates = []
  FOR job IN contractor.active_jobs:
    score = 0
    signals = {}
    
    # GPS signal
    IF gps_available:
      distance = gps_distance(contractor.location, job.address)
      IF distance <= 500ft:
        score += 0.8
        signals.gps = { distance, weight: 0.8 }
      ELIF distance <= 0.5 miles:
        score += 0.4
        signals.gps = { distance, weight: 0.4 }
    
    # Schedule signal
    IF job.scheduled_time within ±2hr of NOW:
      time_delta = abs(NOW - job.scheduled_time)
      schedule_weight = 0.6 * (1 - time_delta / 2hr)  # Closer = higher
      score += schedule_weight
      signals.schedule = { time_delta, weight: schedule_weight }
    
    # Last viewed signal
    IF job.last_viewed_at within 30min:
      recency = (30min - (NOW - job.last_viewed_at)) / 30min
      view_weight = 0.3 * recency
      score += view_weight
      signals.last_viewed = { recency, weight: view_weight }
    
    # Route prediction signal
    IF contractor.previous_job_id EXISTS:
      expected_next = predict_next_job(contractor.previous_job_id, contractor.active_jobs)
      IF job.id == expected_next.id:
        score += 0.4
        signals.route_prediction = { weight: 0.4 }
    
    # Historical pattern signal
    IF contractor.job_completion_pattern EXISTS:
      typical_time = contractor.avg_time_between_jobs
      IF time_since_last_job within typical_time ± 30%:
        score += 0.2
        signals.historical = { weight: 0.2 }
    
    candidates.append({ job, score, signals })
  
  # Evaluate candidates
  candidates.sort(by: score, descending)
  
  # Clear winner
  IF candidates[0].score >= 0.85:
    RETURN { job: candidates[0].job, confidence: candidates[0].score, signals: candidates[0].signals }
  
  # Strong winner with weak second
  IF candidates[0].score >= 0.6 AND candidates[1].score < 0.4:
    RETURN { job: candidates[0].job, confidence: candidates[0].score, signals: candidates[0].signals }
  
  # Ambiguous - ask
  RETURN ASK_CLARIFICATION(candidates[:3])
```

### 4.3 Predictive Job Routing

```
ROUTE_PREDICTION = {
  
  PURPOSE: Anticipate which job the contractor is at/heading to
  
  INPUTS:
    - Previous job completed (location, time)
    - Remaining jobs for today (locations, scheduled times)
    - Travel time estimates (Google Maps API or haversine approximation)
    - Contractor's historical route patterns
  
  ALGORITHM:
    1. Calculate travel time from previous job to each remaining job
    2. Calculate "expected arrival" = previous_completion + travel_time
    3. Compare expected arrival to scheduled time
    4. Score: jobs where expected_arrival ≈ scheduled_time get higher weight
    5. Return ranked list of likely next jobs
  
  EXAMPLE:
    Previous: Martinez (completed 10:30am)
    Remaining: Johnson (11:00am), Smith (2:00pm), Davis (4:00pm)
    Travel times: Johnson (15min), Smith (25min), Davis (40min)
    
    Expected arrivals:
      Johnson: 10:45am (scheduled 11:00am) → LIKELY ✓
      Smith: 10:55am (scheduled 2:00pm) → UNLIKELY (too early)
      Davis: 11:10am (scheduled 4:00pm) → UNLIKELY (way too early)
    
    Prediction: Johnson is most likely current/next job
  
  USAGE:
    When contractor says "done here" with no customer name:
    - GPS says they're at 123 Main St
    - Route prediction says Johnson is expected
    - If 123 Main St = Johnson's address → high confidence match
    - If 123 Main St ≠ Johnson's address → check against all jobs
}
```

#### 4.3.1 Route Prediction Accuracy Tracking

```
ROUTE_ACCURACY_TRACKING = {
  
  PURPOSE: Auto-downgrade route prediction for chaotic schedulers
  
  TRACKED_PER_CONTRACTOR:
    - route_predictions_made: int
    - route_predictions_correct: int
    - accuracy_rate: float (correct / made)
    - last_30_day_accuracy: float
  
  WEIGHT_ADJUSTMENT:
    base_weight: 0.4
    
    IF accuracy_rate >= 0.80:
      weight = 0.4 (full weight)
    ELIF accuracy_rate >= 0.60:
      weight = 0.25 (reduced)
    ELIF accuracy_rate >= 0.40:
      weight = 0.1 (minimal)
    ELSE:
      weight = 0 (disabled for this contractor)
  
  CHAOTIC_SCHEDULER_DETECTION:
    Indicators:
      - Jobs completed out of schedule order > 50% of time
      - Emergency jobs inserted frequently
      - Large variance in time-between-jobs
    
    IF chaotic_scheduler_score > 0.6:
      → Auto-downgrade route_prediction_weight to 0.1
      → Log: "Contractor {id} flagged as chaotic scheduler"
      → Rely more heavily on GPS + customer name
  
  RECOVERY:
    IF last_30_day_accuracy improves > 20%:
      → Gradually restore weight (+0.05 per week, max 0.4)
}
```

### 4.4 Clarification UX

When job matching is ambiguous, send SMS:

```
TEMPLATE (2 options):
Which job?
1 → [Customer] ([service_type])
2 → [Customer] ([service_type])
Reply 1 or 2

TEMPLATE (3 options):
Which job?
1 → [Customer] ([service])
2 → [Customer] ([service])
3 → [Customer] ([service])
Reply 1, 2, or 3

BEHAVIOR:
- Wait up to 5 minutes for reply
- Single digit reply only (no parsing needed)
- On reply → process original update against selected job
- On timeout → save as draft, notify in app

SMART ORDERING:
- Order options by match score (most likely first)
- If GPS available, put GPS-matched job first
- Include brief service type to disambiguate same-name customers

CONSTRAINTS:
- Maximum 3 options shown
- No retries (don't spam)
- If reply is invalid → "Reply just the number (1, 2, or 3)"
```

### 4.5 No Job Found

```
TEMPLATE:
Couldn't match to a job. Saved as draft.
Reply with customer name or open app to assign.

BEHAVIOR:
- Create draft_update record
- Show in app with "Assign to Job" action
- If reply contains customer name → attempt match

SMART SUGGESTIONS (in app):
When viewing draft, show:
- "Possible matches:" with jobs that had partial signals
- "Create new job for [customer_name]?" if name was extracted
- "Jobs completed recently:" in case it's a correction
```

### 4.6 Continuous Match Improvement

```
MATCH_LEARNING = {
  
  TRIGGER: Manual job assignment (from clarification or draft)
  
  DATA_CAPTURE:
    - Original signals and scores
    - Which job was actually correct
    - What signals were missing or wrong
  
  ANALYSIS:
    - GPS accuracy by area (some addresses geocode poorly)
    - Schedule reliability (does this contractor run late/early?)
    - Route prediction accuracy
  
  ADAPTATION:
    - Adjust signal weights per contractor
    - Flag addresses with poor GPS accuracy
    - Learn contractor's typical schedule drift
  
  EXAMPLE:
    Contractor B always runs 30 minutes late.
    After 10 manual corrections, system learns:
    → Shift schedule_window signal by +30 minutes for this contractor
}
```

---

## SECTION 5: CREW ATTRIBUTION

### 5.1 Identity Model

**Phone number = identity.** No app installs, logins, or accounts required for crew members.

```
DATA MODEL:

contractor_phones {
  id: uuid
  business_id: uuid (FK → businesses)
  phone_number: string (E.164 format)
  display_name: string
  role: enum [OWNER, ADMIN, TECH]
  created_at: timestamp
  last_used_at: timestamp
}
```

### 5.2 Phone Number Registration

**Owner/Admin Flow:**
```
1. Owner adds crew member in CRM
2. Required fields: name, phone number
3. Optional: role assignment
4. System sends welcome SMS to crew member:
   "You're set up on [Business] Spoke. 
   Call [Spoke number] to log job updates."
```

**First-Time Caller Flow (Unknown Number):**
```
1. Unknown number calls Spoke
2. After update captured, system asks: "What's your name?"
3. Create provisional contractor_phone record:
   - role: TECH (default)
   - display_name: spoken name
   - flagged_for_review: true
4. Owner sees notification: "New crew member detected: [name] ([phone])"
5. Owner can confirm, edit, or reject
```

### 5.3 Visibility Rules

| Viewer | Can See |
|--------|---------|
| Tech | Own updates only (if using app) |
| Admin | All updates, all crew |
| Owner | All updates, all crew, phone registry |

### 5.4 Attribution in CRM

```
job_updates {
  id: uuid
  job_id: uuid
  contractor_phone_id: uuid (FK)
  source: enum [SPOKE_CALL, SPOKE_SMS, SPOKE_APP, MANUAL]
  raw_transcript: text (encrypted, TTL: 24 hours)
  parsed_data: jsonb
  created_at: timestamp
}

# Display in job timeline:
"[Tech Name] via Spoke: Marked complete, logged 2hr, $450 cash"
```

### 5.5 Inactive Number Detection

```
INACTIVE_NUMBER_HANDLING = {
  
  PURPOSE: Alert owners when removed/inactive crew members call
  
  TRIGGER: 
    - Phone number exists in contractor_phones
    - BUT is_active = false OR role = 'REMOVED'
  
  BEHAVIOR:
    1. Do NOT process the update
    2. Send owner alert:
       "Inactive number used: [Name] ([phone]) tried to log an update.
        [Review] [Reactivate] [Ignore]"
    3. Log attempt for audit
  
  DATA MODEL ADDITION:
    ALTER TABLE contractor_phones 
    ADD COLUMN is_active BOOLEAN DEFAULT true;
    ADD COLUMN deactivated_at TIMESTAMPTZ;
    ADD COLUMN deactivation_reason TEXT;
  
  DEACTIVATION FLOW:
    Owner removes crew member → 
      is_active = false
      deactivated_at = now()
      deactivation_reason = 'removed_by_owner'
  
  WHY THIS MATTERS:
    - Fired tech continuing to log updates = data integrity risk
    - Owners may forget to clean up numbers
    - Audit trail shows attempted access
  
  FUTURE:
    - Auto-deactivate after 30 days of no use (with warning)
    - Bulk deactivation for crew cleanup
}
```

---

## SECTION 6: CONFIRMATION UX

### 6.1 Confirmation SMS (Required)

Every Spoke update triggers a confirmation SMS within 30 seconds.

#### 6.1.1 Adaptive Message Templates

```
TEMPLATE SELECTION based on extraction completeness:

FULL_SUCCESS (all expected fields extracted):
✓ [Customer] complete
✓ [duration] · $[amount] [method]
→ EDIT to fix

PARTIAL_SUCCESS (some fields missing):
✓ [Customer] complete
✓ [duration]
⚠ Payment? Reply: $[amount] cash/card
→ or EDIT

CLARIFICATION_NEEDED (low confidence on critical field):
[Customer] job update saved.
Did you say $[amount]?
Reply YES, or the correct amount.

MULTI_JOB_SUCCESS:
✓ [Customer1]: complete, [dur], $[amt]
✓ [Customer2]: complete, [dur], [payment_status]
→ EDIT to fix any

DRAFT_CREATED (no job match):
Saved your update.
Which customer?
1 → [Best guess]
2 → [Second guess]
3 → Other (reply name)
```

#### 6.1.2 Message Compression Rules

SMS has 160 character limit per segment. Optimize for single-segment delivery:

```
COMPRESSION_RULES:
- Use symbols: ✓ ✗ ⚠ → · 
- Abbreviate durations: "2 hours" → "2hr"
- Abbreviate methods: "cash" → stays, "credit card" → "card"
- Drop "job" and "marked" - context is clear
- Use line breaks sparingly (count as 2 chars)

PRIORITY (if over 160 chars, drop in order):
1. Keep: customer name, status, payment amount
2. Drop first: duration (can be viewed in app)
3. Drop second: payment method (if amount present)
4. Never drop: edit instructions, clarification requests

EXAMPLES:
LONG (185 chars):
"✓ Martinez job marked complete
✓ 2 hours logged
✓ $450 cash payment recorded
→ Reply EDIT to fix anything"

COMPRESSED (142 chars):
"✓ Martinez complete
✓ 2hr · $450 cash
→ EDIT to fix"
```

#### 6.1.3 Contextual Follow-ups

```
SMART_FOLLOWUPS based on what's missing:

IF status = completed AND payment NOT extracted:
  DELAY 2 minutes, THEN:
  "Payment for [Customer]? Reply amount (e.g., 450 cash)"

IF referral detected but low confidence:
  IMMEDIATELY:
  "[Customer]'s [relation] needs [service]?
   Reply YES to create lead, or NO"

IF scheduling mentioned but not parsed:
  IMMEDIATELY:
  "Going back to [Customer]?
   Reply with day/time to add to calendar"

IF materials mentioned but vague:
  DO NOT follow up (low value, high friction)
```

### 6.2 EDIT Flow

```
TRIGGER: Contractor replies "EDIT" (case-insensitive)

FLOW:
1. Retrieve most recent update (within 30 min)
2. Send current state summary
3. Parse reply for corrections
4. Apply corrections
5. Send updated confirmation

STEP 2 - SUMMARY MESSAGE:
"[Customer]: complete, 2hr, $450 cash
What's wrong? Reply with correction."

STEP 3 - CORRECTION PARSING:
The same parsing engine processes the reply.
Context: We know which fields exist, so corrections are easier to parse.

EXAMPLES:
  "3 hours not 2" → duration = 180
  "350" → payment.amount = 350
  "card not cash" → payment.method = card
  "actually Johnson not Martinez" → re-match to Johnson job

STEP 4 - SMART CORRECTION:
IF correction changes customer → move entire update to new job
IF correction changes amount → update payment record
IF correction is additive → append to existing data

STEP 5 - CONFIRMATION:
"Updated:
✓ [Customer]: complete, 3hr, $450 cash
→ EDIT again or you're set"

CONSTRAINTS:
- EDIT window: 30 minutes from original confirmation
- After window: "That update is locked. Make changes in the app."
- Max 3 EDIT rounds per update (prevent infinite loops)
- Each EDIT resets the 30-minute window
```

### 6.3 Smart Retry Logic

```
RETRY_INTELLIGENCE:

IF transcription failed:
  "Didn't catch that—try again?"
  WAIT for new call or reply

IF parsing found nothing:
  "Got your call but couldn't understand the update.
   Reply with what you wanted to log."
  PARSE text reply with same engine

IF all fields low confidence:
  "Having trouble understanding. For [Customer], what's the:
   - Status (done/in progress)
   - Time spent
   - Payment"
  PARSE structured reply
  
IF confirmation SMS fails to deliver:
  RETRY once after 60 seconds
  IF still fails → push notification in app (if available)
  LOG delivery failure for carrier analysis
```

### 6.4 In-App Confirmation (When Entry Point = App)

```
UI SPEC:

IMMEDIATE FEEDBACK (while processing):
- Button changes to spinner
- Text: "Processing..."
- Duration: ≤10 seconds

SUCCESS STATE:
- Toast notification slides up
- "✓ [Customer] updated"
- Tap toast → expand to full update card

EXPANDED CARD:
┌────────────────────────────────┐
│ Martinez Job                    │
│ ────────────────────────────── │
│ Status: Completed ✓            │
│ Duration: 2 hours              │
│ Payment: $450 cash             │
│ ────────────────────────────── │
│ [Edit]              [Dismiss]  │
└────────────────────────────────┘

EDIT IN-APP:
- Tap Edit → fields become editable
- Inline validation on change
- Save → update CRM → show confirmation

DRAFT STATE (no job match):
- Card shows amber warning state
- "Tap to assign to a job"
- Shows suggested job matches
- Can create new job from here
```

### 6.5 Confirmation Analytics

```
TRACK:
- Confirmation delivery rate (SMS)
- Confirmation open rate (app push)
- EDIT rate (% of confirmations that trigger EDIT)
- Edit types (which fields get corrected most)
- Time to EDIT (how quickly contractors correct)
- Clarification response rate
- Draft resolution rate

USE FOR:
- Parser improvement (high EDIT rates = parsing problems)
- UX improvement (low clarification response = bad prompts)
- Carrier health (delivery rate drops = carrier issues)
```

---

## SECTION 7: DATA ROUTING

### 7.1 Field Mapping

| Parsed Intent | Target Table | Target Field | Behavior |
|---------------|--------------|--------------|----------|
| Job complete | jobs | status | Set to 'completed' |
| Job en route | jobs | status | Set to 'en_route' |
| Job arrived | jobs | status | Set to 'in_progress', log arrival_time |
| Duration | jobs | actual_duration_minutes | Overwrite |
| Payment amount | job_payments | amount | Create record |
| Payment method | job_payments | method | Create record |
| Payment status | job_payments | status | Set to 'paid' |
| Work performed | jobs | work_description | Append |
| Materials | job_materials | (multiple fields) | Create records |
| Follow-up needed | tasks | (create new) | Assign to owner |
| New referral | leads | (create new) | Tag source = referral |
| Schedule mention | (no auto-write) | — | Suggest calendar entry |

### 7.2 Informational-Only Classification

```
INFORMATIONAL_ONLY = {
  
  PURPOSE: Recognize updates that provide context but require no CRM write
  
  TRIGGERS:
    - "Heading to lunch"
    - "Taking a break"
    - "On my way to the next one" (no specific job)
    - "Just checking in"
    - "Running errands"
    - "At the supply house"
  
  BEHAVIOR:
    - NO job update created
    - NO draft created
    - Log as telemetry only (spoke_telemetry table)
    - Optional: Update contractor.current_status for owner visibility
  
  RESPONSE:
    SMS: "👍" (single emoji, minimal friction)
    OR: No response (configurable per business)
  
  DATA MODEL:
    spoke_telemetry {
      id: uuid
      contractor_phone_id: uuid
      message_type: 'INFORMATIONAL'
      raw_content: text
      parsed_intent: text  -- e.g., "break", "travel", "supply_run"
      created_at: timestamp
    }
  
  WHY THIS MATTERS:
    - Reduces false drafts
    - Prevents "unmatched update" noise
    - Still captures useful location/availability data
    - Owner can see team activity without CRM pollution
}
```

### 7.3 Scheduling Suggestions (Never Auto-Book)

```
RULE: Scheduling intent creates suggestion, not appointment

BEHAVIOR:
1. Detect scheduling language: "told him Thursday," "coming back next week"
2. Parse date/time if possible
3. Send follow-up SMS:
   "Sounds like you're going back [parsed_time].
   Reply YES to add to calendar, or ignore."
4. On YES → create calendar entry with job context
5. On ignore → no action

RATIONALE:
Contractors mention dates loosely. Auto-booking would create phantom appointments.
Trust > automation.
```

### 7.4 Customer Notification Rules (Delay Status)

```
CUSTOMER_NOTIFICATIONS = {
  
  PURPOSE: Optionally notify customers when contractor reports delay
  
  TRIGGER: status = 'delayed' parsed from Spoke update
  
  SETTINGS (per business):
    ┌────────────────────────────────────────────────────────┐
    │ Customer Notifications                                  │
    │ ────────────────────────────────────────────────────── │
    │ [Toggle] Notify customers when technician is delayed   │
    │                                                        │
    │ Notification method:                                   │
    │ ○ SMS only                                            │
    │ ○ Email only                                          │
    │ ● Both (default)                                      │
    │                                                        │
    │ Delay threshold: [15] minutes                         │
    │ (Only notify if delay exceeds this)                   │
    └────────────────────────────────────────────────────────┘
  
  MESSAGE TEMPLATE:
    "Hi [Customer], your technician from [Business] is running 
    about [X] minutes late. New estimated arrival: [time]. 
    Questions? Reply to this text."
  
  RULES:
    - Only send if job.customer.phone exists
    - Only send if delay >= threshold
    - Only send once per job (no repeated delay notifications)
    - Log notification in job timeline
    - Owner can override/disable per job
  
  DATA:
    customer_notifications {
      id: uuid
      job_id: uuid
      notification_type: 'DELAY' | 'ARRIVAL' | 'COMPLETION'
      channel: 'SMS' | 'EMAIL' | 'BOTH'
      sent_at: timestamp
      triggered_by_spoke_update_id: uuid
    }
  
  FUTURE EXPANSION:
    - Arrival notification ("Your technician has arrived")
    - Completion notification ("Job complete! Here's your receipt")
    - These are NOT in V1 scope
}
```

---

## SECTION 8: DATA MODEL

### 8.1 New Tables

```sql
-- Phone number to identity mapping
CREATE TABLE contractor_phones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'TECH' CHECK (role IN ('OWNER', 'ADMIN', 'TECH')),
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  flagged_for_review BOOLEAN DEFAULT false,
  deactivated_at TIMESTAMPTZ,
  deactivation_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  UNIQUE(business_id, phone_number)
);

-- Spoke update records (audit trail)
CREATE TABLE spoke_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  contractor_phone_id UUID REFERENCES contractor_phones(id),
  job_id UUID REFERENCES jobs(id),
  source TEXT NOT NULL CHECK (source IN ('CALL', 'SMS', 'APP')),
  raw_transcript TEXT, -- encrypted, auto-delete after 24hr
  parsed_data JSONB NOT NULL,
  confidence_scores JSONB,
  match_signals JSONB, -- GPS, schedule, etc.
  quality_score FLOAT, -- Composite quality score (0-100)
  status TEXT NOT NULL DEFAULT 'PROCESSED' CHECK (status IN ('PROCESSED', 'DRAFT', 'EDITED', 'FAILED')),
  confirmation_sent_at TIMESTAMPTZ,
  edited_at TIMESTAMPTZ,
  edit_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Draft updates awaiting job assignment
CREATE TABLE spoke_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spoke_update_id UUID NOT NULL REFERENCES spoke_updates(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  assigned_to_job_id UUID REFERENCES jobs(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Contractor-specific adaptive thresholds
CREATE TABLE contractor_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_phone_id UUID NOT NULL REFERENCES contractor_phones(id) ON DELETE CASCADE,
  payment_threshold FLOAT NOT NULL DEFAULT 0.90,
  status_threshold FLOAT NOT NULL DEFAULT 0.85,
  match_threshold FLOAT NOT NULL DEFAULT 0.85,
  last_adjusted TIMESTAMPTZ DEFAULT now(),
  adjustment_reason TEXT,
  UNIQUE(contractor_phone_id)
);

-- Contractor speech patterns (learned over time)
CREATE TABLE contractor_speech_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_phone_id UUID NOT NULL REFERENCES contractor_phones(id) ON DELETE CASCADE,
  avg_duration_by_service JSONB DEFAULT '{}',  -- {"drain_clearing": {"min": 30, "max": 90, "avg": 55}}
  payment_range JSONB DEFAULT '{}',  -- {"min": 100, "max": 800, "median": 350, "stddev": 150}
  speech_rate TEXT DEFAULT 'normal' CHECK (speech_rate IN ('slow', 'normal', 'fast')),
  filler_frequency TEXT DEFAULT 'normal' CHECK (filler_frequency IN ('low', 'normal', 'high')),
  correction_rate FLOAT DEFAULT 0.10,
  total_updates INT DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT now(),
  UNIQUE(contractor_phone_id)
);

-- Contractor vocabulary extensions (learned phrases)
CREATE TABLE contractor_vocabulary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_phone_id UUID NOT NULL REFERENCES contractor_phones(id) ON DELETE CASCADE,
  phrase TEXT NOT NULL,
  token_category TEXT NOT NULL,
  mapped_value TEXT NOT NULL,
  confidence FLOAT NOT NULL DEFAULT 0.85,
  occurrence_count INT NOT NULL DEFAULT 1,
  last_used_at TIMESTAMPTZ DEFAULT now(),
  learned_from_update_id UUID REFERENCES spoke_updates(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(contractor_phone_id, phrase, token_category)
);

-- Correction log (for learning)
CREATE TABLE spoke_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spoke_update_id UUID NOT NULL REFERENCES spoke_updates(id) ON DELETE CASCADE,
  contractor_phone_id UUID NOT NULL REFERENCES contractor_phones(id),
  field_name TEXT NOT NULL,
  original_value JSONB,
  corrected_value JSONB,
  correction_method TEXT NOT NULL CHECK (correction_method IN ('SMS_EDIT', 'APP_EDIT', 'CLARIFICATION_REPLY')),
  time_to_correction INTERVAL,  -- How quickly they corrected
  transcript_context TEXT,  -- The relevant portion of transcript
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Business-level patterns
CREATE TABLE business_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  service_catalog JSONB DEFAULT '[]',  -- [{"name": "Drain Clearing", "typical_duration": 60, "typical_price": [150, 300]}]
  customer_pronunciations JSONB DEFAULT '{}',  -- {"Martinez": ["mar-TEE-nez", "MAR-tin-ez"]}
  common_materials JSONB DEFAULT '[]',  -- ["PVC", "PEX", "copper", "SharkBite"]
  peak_hours JSONB DEFAULT '[8,9,10,14,15,16]',
  last_updated TIMESTAMPTZ DEFAULT now(),
  UNIQUE(business_id)
);

-- Informational-only telemetry (not job updates)
CREATE TABLE spoke_telemetry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  contractor_phone_id UUID NOT NULL REFERENCES contractor_phones(id),
  message_type TEXT NOT NULL DEFAULT 'INFORMATIONAL',
  raw_content TEXT,
  parsed_intent TEXT,  -- 'break', 'travel', 'supply_run', 'off_topic'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Customer notifications triggered by Spoke updates
CREATE TABLE customer_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('DELAY', 'ARRIVAL', 'COMPLETION')),
  channel TEXT NOT NULL CHECK (channel IN ('SMS', 'EMAIL', 'BOTH')),
  sent_at TIMESTAMPTZ DEFAULT now(),
  triggered_by_spoke_update_id UUID REFERENCES spoke_updates(id),
  delivery_status TEXT DEFAULT 'SENT' CHECK (delivery_status IN ('SENT', 'DELIVERED', 'FAILED'))
);

-- Indexes
CREATE INDEX idx_contractor_phones_business ON contractor_phones(business_id);
CREATE INDEX idx_contractor_phones_number ON contractor_phones(phone_number);
CREATE INDEX idx_contractor_phones_active ON contractor_phones(business_id) WHERE is_active = true;
CREATE INDEX idx_spoke_updates_business ON spoke_updates(business_id);
CREATE INDEX idx_spoke_updates_job ON spoke_updates(job_id);
CREATE INDEX idx_spoke_updates_created ON spoke_updates(created_at DESC);
CREATE INDEX idx_spoke_updates_quality ON spoke_updates(quality_score) WHERE quality_score IS NOT NULL;
CREATE INDEX idx_spoke_drafts_business ON spoke_drafts(business_id) WHERE resolved_at IS NULL;
CREATE INDEX idx_contractor_vocabulary_lookup ON contractor_vocabulary(contractor_phone_id, phrase);
CREATE INDEX idx_spoke_corrections_contractor ON spoke_corrections(contractor_phone_id, created_at DESC);
CREATE INDEX idx_spoke_telemetry_contractor ON spoke_telemetry(contractor_phone_id, created_at DESC);
CREATE INDEX idx_customer_notifications_job ON customer_notifications(job_id);
```

### 8.2 Existing Table Modifications

```sql
-- Add to jobs table
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS last_spoke_update_at TIMESTAMPTZ;

-- Add to job_timeline or activity_log
-- Spoke updates should appear in job timeline with attribution
```

### 8.3 Parsed Data Schema

```typescript
interface SpokeParsedData {
  customer?: {
    value: string;
    matched_customer_id?: string;
    confidence: number;
  };
  status?: {
    value: 'completed' | 'en_route' | 'in_progress' | 'scheduled';
    confidence: number;
  };
  duration?: {
    value: number;
    unit: 'minutes';
    confidence: number;
  };
  arrival_time?: {
    value: string; // ISO timestamp
    confidence: number;
  };
  payment?: {
    amount?: { value: number; confidence: number };
    method?: { value: 'cash' | 'card' | 'check' | 'invoice' | 'card_on_file'; confidence: number };
    status?: { value: 'paid' | 'pending' | 'invoiced'; confidence: number };
  };
  work_description?: {
    value: string;
    confidence: number;
  };
  materials?: Array<{
    item: string;
    quantity?: number;
    confidence: number;
  }>;
  follow_up?: {
    description: string;
    urgency?: 'low' | 'normal' | 'high';
    confidence: number;
  };
  referral?: {
    name?: string;
    relation?: string;
    service_needed?: string;
    contact_method?: string;
    confidence: number;
  };
  scheduling?: {
    raw_text: string;
    parsed_date?: string;
    confidence: number;
  };
}
```

---

## SECTION 9: INTEGRATION WITH LEADS CAPTAIN

### 9.1 Shared Infrastructure

| Component | Reuse Strategy |
|-----------|----------------|
| Twilio subaccount | Same account, new phone number |
| SMS sending | Existing send_sms() function |
| Phone number lookup | Existing Twilio lookup service |
| AI conversation engine | Same Claude/GPT integration, new prompts |
| Database | Same Supabase instance |
| Audit logging | Extend existing audit_log table |

### 9.2 Phone Number Architecture

```
LEADS CAPTAIN NUMBER: Inbound calls, AI receptionist, SMS conversations
SPOKE NUMBER: Outbound-from-contractor updates only

RATIONALE:
- Separate numbers = clear mental model for contractors
- "Call [number] to talk to customers" vs "Call [number] to log updates"
- Prevents confusion if contractor accidentally calls wrong number
```

### 9.3 Webhook Events (Extend Existing)

```javascript
// Add to existing webhook event system:

WEBHOOK_EVENTS = {
  // ... existing Leads Captain events ...
  
  // Spoke events
  'spoke.update.received': {
    business_id,
    contractor_phone_id,
    job_id,           // null if unmatched
    parsed_data,
    confidence_scores,
    source            // 'CALL' | 'SMS' | 'APP'
  },
  'spoke.update.matched': {
    spoke_update_id,
    job_id,
    match_method      // 'customer_name' | 'gps' | 'schedule' | 'manual'
  },
  'spoke.update.edited': {
    spoke_update_id,
    changes,
    edited_by         // contractor_phone_id or user_id
  },
  'spoke.draft.created': {
    spoke_draft_id,
    business_id,
    awaiting_job_assignment: true
  },
  'spoke.crew.detected': {
    business_id,
    phone_number,
    display_name,
    flagged_for_review: true
  }
}
```

### 9.4 Settings Integration

Add to Leads Captain settings page:

```
SECTION: Spoke — Voice Updates

[Toggle] Enable Spoke
  └─ "Let your team call in job updates"

Spoke phone number: (xxx) xxx-xxxx [Copy]

[Toggle] Auto-create unknown callers
  └─ "Add new crew members automatically when they call"
  └─ Default: ON
  └─ If OFF: Unknown callers hear "This number isn't registered. Ask your admin to add you."

Crew Members [Manage →]
  └─ Links to crew phone registry
```

---

## SECTION 10: SYSTEM INTELLIGENCE

### 10.1 Quality Scoring System

Every Spoke update receives a quality score that informs system behavior and learning.

```
QUALITY_DIMENSIONS:

1. TRANSCRIPTION_QUALITY (0-100)
   - Whisper confidence score (avg across segments)
   - Background noise level (SNR)
   - Speech clarity indicators
   THRESHOLD: < 60 triggers "noisy" handling

2. PARSE_COMPLETENESS (0-100)
   - % of expected fields extracted
   - Expected fields based on update type:
     - Job completion: status, duration, payment (3 fields)
     - Quick status: status only (1 field)
     - Payment only: payment amount + method (2 fields)
   CALCULATION: (extracted / expected) * 100

3. CONFIDENCE_AVERAGE (0-100)
   - Mean confidence across all extracted fields
   - Weighted by field importance:
     - Payment amount: 1.5x weight
     - Customer match: 1.3x weight
     - Status: 1.0x weight
     - Duration: 0.8x weight
   THRESHOLD: < 70 triggers review flag

4. MATCH_CONFIDENCE (0-100)
   - Job matching score from Section 4
   - 100 = direct customer name match
   - 85+ = high confidence signal stack
   - 60-84 = moderate confidence
   - < 60 = clarification required

COMPOSITE_QUALITY_SCORE:
  = (TRANSCRIPTION * 0.2) 
  + (PARSE_COMPLETENESS * 0.3) 
  + (CONFIDENCE_AVERAGE * 0.3) 
  + (MATCH_CONFIDENCE * 0.2)

QUALITY TIERS:
  90-100: Excellent (auto-process, minimal confirmation)
  75-89:  Good (standard confirmation)
  60-74:  Fair (highlighted confirmation, review flag)
  40-59:  Poor (draft status, manual review)
  < 40:   Failed (do not write, request retry)
```

### 10.2 Adaptive Thresholds

```
THRESHOLD_ADAPTATION:

Per-contractor thresholds adjust based on historical accuracy:

BASE_THRESHOLDS:
  payment_write_threshold: 0.90
  status_write_threshold: 0.85
  customer_match_threshold: 0.85

ADJUSTMENT_RULES:
  IF contractor.edit_rate > 20%:
    → Increase all thresholds by 0.05
    → More confirmations, fewer silent writes
  
  IF contractor.edit_rate < 5% over 50+ updates:
    → Decrease thresholds by 0.03
    → Faster processing, fewer interruptions
  
  IF contractor.payment_edit_rate > 30%:
    → Increase payment_write_threshold by 0.10
    → Always confirm payments for this contractor

CEILING/FLOOR:
  Max threshold: 0.98 (always some auto-processing)
  Min threshold: 0.75 (always some verification)

STORAGE:
  contractor_thresholds {
    contractor_phone_id: uuid
    payment_threshold: float
    status_threshold: float
    match_threshold: float
    last_adjusted: timestamp
    adjustment_reason: text
  }
```

### 10.3 Pattern Learning

```
PATTERN_TYPES:

1. VOCABULARY PATTERNS
   Learn contractor-specific phrases:
   
   DETECTION:
     - Phrase consistently followed by same outcome
     - Minimum 5 occurrences with same result
   
   EXAMPLES:
     "knocked it out" → STATUS_COMPLETE (confidence: 0.95)
     "squared away" → STATUS_COMPLETE (confidence: 0.93)
     "road money" → PAYMENT_METHOD: cash (regional slang)
   
   STORAGE:
     vocabulary_patterns {
       contractor_phone_id: uuid
       phrase: text
       maps_to: { category, value }
       confidence: float
       occurrence_count: int
     }

2. TIMING PATTERNS
   Learn contractor's typical schedule behavior:
   
   TRACKED:
     - Average job duration by service type
     - Typical time between jobs
     - Schedule adherence (early/on-time/late tendency)
   
   USAGE:
     - Improve route prediction
     - Adjust schedule window signal weight
     - Flag unusual durations for review
   
   STORAGE:
     timing_patterns {
       contractor_phone_id: uuid
       avg_duration_by_service: jsonb
       avg_time_between_jobs: interval
       schedule_drift_minutes: int (positive = runs late)
     }

3. PAYMENT PATTERNS
   Learn typical payment ranges:
   
   TRACKED:
     - Payment amount range (min, max, median, stddev)
     - Payment method frequency
     - Typical payment by service type
   
   USAGE:
     - Flag statistical outliers
     - Adjust confidence for in-range vs out-of-range amounts
   
   EXAMPLE:
     Contractor typically charges $200-600
     Parsed amount: $2500
     → Flag as potential error, reduce confidence by 0.15

4. CUSTOMER NAME PATTERNS
   Learn pronunciation variants and nicknames:
   
   TRACKED:
     - How contractor pronounces each customer name
     - Consistent shortenings ("the Martinez job" vs "Martinez")
   
   USAGE:
     - Improve fuzzy matching
     - Build contractor-specific name index
```

### 10.4 Feedback Integration

```
FEEDBACK_SOURCES:

1. EXPLICIT FEEDBACK
   - EDIT corrections (strongest signal)
   - Clarification responses
   - Draft assignments
   - App-based corrections

2. IMPLICIT FEEDBACK
   - No EDIT after confirmation (positive signal)
   - Quick EDIT (< 30 seconds = obvious error)
   - Repeated calls (previous call may have failed)
   - App opens after Spoke update (checking accuracy?)

FEEDBACK_PROCESSING:

ON EDIT RECEIVED:
  1. Log correction details:
     - Original transcript
     - Original parse
     - Corrected field + value
     - Time to correction
  
  2. Analyze correction type:
     - Transcription error → improve audio handling
     - Parse error → refine parsing rules
     - Match error → improve matching signals
  
  3. Update patterns:
     - If vocabulary-related → add to vocabulary_patterns
     - If amount-related → adjust payment range stats
     - If timing-related → update timing patterns
  
  4. Adjust thresholds:
     - Increment contractor's error count
     - Recalculate threshold adjustments

ON CONFIRMATION WITH NO EDIT (after 30 min):
  1. Mark update as "verified by silence"
  2. Use as positive training example
  3. Reinforce patterns that led to this parse
```

### 10.5 Anomaly Detection

```
ANOMALY_TYPES:

1. STATISTICAL ANOMALIES
   - Payment amount > 2 std deviations from contractor mean
   - Duration > 2 std deviations from service type mean
   - Unusually high number of updates in short period
   
   ACTION: Flag for review, increase confirmation verbosity

2. BEHAVIORAL ANOMALIES
   - Call from unusual location (not near any scheduled job)
   - Call outside normal working hours
   - Sudden change in speech patterns (different speaker?)
   
   ACTION: Require explicit confirmation, log for security review

3. CONTENT ANOMALIES
   - Customer name doesn't match any in system
   - Service description doesn't match job type
   - Conflicting information within single update
   
   ACTION: Create draft instead of writing, request clarification

ANOMALY_SCORING:
  anomaly_score = sum(detected_anomalies * severity_weight)
  
  IF anomaly_score > 0.5:
    → Force draft status
    → Notify owner/admin
  
  IF anomaly_score > 0.8:
    → Reject update entirely
    → "Something seems off. Please use the app for this update."
```

### 10.6 System Health Monitoring

```
HEALTH_METRICS (real-time dashboard):

PROCESSING_HEALTH:
  - Updates/hour (trending)
  - Average processing latency
  - p95 latency
  - Error rate (transcription failures, parse failures)

QUALITY_HEALTH:
  - Average quality score (rolling 24hr)
  - Edit rate (rolling 24hr)
  - Draft rate (% of updates requiring manual assignment)
  - Clarification response rate

INFRASTRUCTURE_HEALTH:
  - Twilio API latency
  - Whisper API latency
  - Claude API latency
  - SMS delivery rate
  - Database query latency

ALERTS:
  - Latency spike > 20 seconds: WARN
  - Error rate > 5%: WARN
  - Error rate > 15%: CRITICAL
  - Edit rate > 30%: INVESTIGATE (parsing degradation?)
  - SMS delivery rate < 90%: CRITICAL (carrier issue)

WEEKLY_REPORTS:
  - Per-business quality trends
  - Per-contractor accuracy stats
  - Most common correction types
  - Pattern learning progress
```

### 10.7 Owner Activity Digest

```
OWNER_DIGEST = {
  
  PURPOSE: Help owners trust Spoke faster with visibility into activity
  
  DELIVERY:
    - Weekly email (Monday 8am local)
    - Optional: In-app dashboard widget
  
  CONTENT:
    ┌────────────────────────────────────────────────────────┐
    │ 📊 Spoke Weekly Digest                                 │
    │ Week of Jan 15-21, 2026                               │
    │ ────────────────────────────────────────────────────── │
    │                                                        │
    │ ACTIVITY SUMMARY                                       │
    │ • 47 updates logged via Spoke                         │
    │ • 12 hours saved vs manual entry (est.)               │
    │ • $18,450 in payments recorded                        │
    │                                                        │
    │ TEAM USAGE                                            │
    │ • Mike: 28 updates (60%)                              │
    │ • Jake: 15 updates (32%)                              │
    │ • New: Sara: 4 updates (8%)                           │
    │                                                        │
    │ ACCURACY                                               │
    │ • 94% processed without edits ✓                       │
    │ • 3 corrections made (all payment amounts)            │
    │ • 0 drafts unresolved                                 │
    │                                                        │
    │ TOP CORRECTION                                         │
    │ • Payment amounts (3x) — consider confirming verbally │
    │                                                        │
    │ LEARNED THIS WEEK                                      │
    │ • "squared away" → job complete (Jake, 5 uses)        │
    │ ────────────────────────────────────────────────────── │
    │ [View Full Report] [Adjust Digest Settings]           │
    └────────────────────────────────────────────────────────┘
  
  SETTINGS:
    - Frequency: Weekly (default) | Daily | Monthly | Off
    - Include: Activity ✓ | Accuracy ✓ | Team breakdown ✓ | Learned phrases ✓
  
  DATA SOURCE:
    - spoke_updates (count, amounts)
    - spoke_corrections (edit rate, correction types)
    - contractor_phones (team breakdown)
    - contractor_vocabulary (learned phrases)
  
  WHY THIS MATTERS:
    - Owners see ROI without digging
    - Early warning if accuracy drops
    - Visibility into crew adoption
    - Reinforces trust in the system
}
```

---

## SECTION 11: ERROR HANDLING & FAIL-SAFES

### 11.1 Fail-Safe Rules

```
RULE: Fail open on transcription errors
IF transcription fails → retry once
IF retry fails → "Sorry, didn't catch that. Try again or use the app."
NEVER write garbage data

RULE: Fail closed on low confidence
IF all parsed fields < 60% confidence → save as draft
NEVER guess

RULE: Fail safe on payment
IF payment amount parsed but confidence < 90% → do not write
INSTEAD → flag for confirmation: "Did you say $450?"

RULE: Never delete existing data
Spoke appends/updates, never deletes
IF contractor says "cancel the job" → flag for human review, do not auto-cancel
```

### 11.2 Error States

| Error | User Message | System Behavior |
|-------|--------------|-----------------|
| Transcription failed | "Didn't catch that—try again or use the app." | Log error, no record created |
| No jobs found | "You don't have any active jobs. Add one in the app first." | Log attempt |
| Unknown caller (auto-create OFF) | "This number isn't registered. Ask your admin." | Log attempt, notify admin |
| All fields low confidence | "Couldn't understand the update. Saved as draft—check the app." | Create draft |
| Twilio outage | SMS fallback: "Call failed—reply here with your update." | Switch to SMS mode |
| GPS unavailable | Rely on schedule/last-viewed signals | Log gap in match_signals |

### 11.3 Rate Limits

```
PER CONTRACTOR:
- Max 20 Spoke calls per hour (prevent abuse/butt-dials)
- Max 5 EDIT requests per hour

PER BUSINESS:
- Follows Leads Captain rate limits

ON LIMIT HIT:
- "You've logged a lot of updates. Take a break or use the app."
- Do not process, do not charge

SOFT THROTTLE (before hard limit):
- After 5 rapid calls within 10 minutes:
  "You're on a roll! Tip: grouping updates saves time.
   Call once per job, include everything."
- This is advisory, not blocking
- Helps speed demons optimize without frustration
```

---

## SECTION 12: COST MODEL

### 12.1 Per-Update Costs

| Component | Est. Cost | Notes |
|-----------|-----------|-------|
| Twilio inbound voice | $0.0085/min | Avg call: 30 sec = $0.004 |
| Twilio SMS (confirmation) | $0.0079 | Per confirmation |
| Whisper transcription | $0.006/min | Avg: $0.003 |
| Claude parsing | ~$0.001 | Short prompt, structured output |
| **Total per update** | **~$0.02** | |

### 12.2 Projected Usage

| Business Size | Updates/month | Monthly Cost |
|---------------|---------------|--------------|
| Solo contractor | 50 | $1.00 |
| Small team (3) | 150 | $3.00 |
| Larger team (10) | 500 | $10.00 |

**Verdict:** Marginal cost. Bundle into Leads Captain, don't meter.

---

## SECTION 13: ACCEPTANCE CRITERIA

Every criterion is binary. A single ❌ blocks release.

### 13.1 Core Functionality

| # | Criterion | Pass/Fail |
|---|-----------|-----------|
| 1 | Contractor calls Spoke number, speaks update, receives confirmation SMS within 30 seconds | |
| 2 | Job status correctly updates in CRM from voice input | |
| 3 | Payment amount + method correctly logged from voice input | |
| 4 | Duration correctly logged (tested with "2 hours," "hour and a half," "45 minutes") | |
| 5 | Customer name fuzzy-matches to existing record (≥85% similarity) | |
| 6 | Multi-job matching correctly uses GPS when customer name not spoken | |
| 7 | Ambiguous job triggers clarification SMS, processes on reply | |
| 8 | Unknown caller auto-creates crew record (when setting enabled) | |
| 9 | Unknown caller rejected gracefully (when setting disabled) | |
| 10 | EDIT reply flow allows correction within 30 minutes | |

### 13.2 Parsing Intelligence

| # | Criterion | Pass/Fail |
|---|-----------|-----------|
| 11 | "Four fifty" correctly interpreted as $450 in payment context | |
| 12 | "Four fifty" correctly interpreted as 4.5 hours in duration context | |
| 13 | Self-corrections ("actually no, 350") use corrected value | |
| 14 | Multi-job updates in single call segmented correctly | |
| 15 | Pronoun resolution links "she paid" to correct customer | |
| 16 | Filler words stripped without affecting confidence | |
| 17 | Time span calculation (arrived at X, left at Y) computes duration | |
| 18 | Regional slang ("knocked it out") recognized as completion | |

### 13.3 Data Integrity

| # | Criterion | Pass/Fail |
|---|-----------|-----------|
| 19 | Low-confidence fields never auto-write to CRM | |
| 20 | Confidence < 60% creates draft, not record | |
| 21 | Payment amounts never written below 90% confidence | |
| 22 | Raw transcripts encrypted and auto-deleted after 24 hours | |
| 23 | All Spoke updates appear in job timeline with attribution | |
| 24 | Account deletion removes all Spoke data (including learning data) | |

### 13.4 Learning Systems

| # | Criterion | Pass/Fail |
|---|-----------|-----------|
| 25 | EDIT correction logged to spoke_corrections table | |
| 26 | Vocabulary patterns learned after 5+ consistent corrections | |
| 27 | Contractor thresholds adjust after high correction rate | |
| 28 | Quality scores computed for all updates | |
| 29 | Anomaly detection flags statistical outliers | |

### 13.5 Integration

| # | Criterion | Pass/Fail |
|---|-----------|-----------|
| 30 | Spoke toggle appears in Leads Captain settings | |
| 31 | Spoke number displays in settings when enabled | |
| 32 | Webhook events fire correctly for spoke.update.received | |
| 33 | Crew phone registry accessible from settings | |
| 34 | Spoke updates sync to existing CRM integrations (if configured) | |

### 13.6 Performance

| # | Criterion | Pass/Fail |
|---|-----------|-----------|
| 35 | Total processing time (hang-up to SMS) ≤ 30 seconds at p95 | |
| 36 | Transcription latency ≤ 3 seconds at p95 | |
| 37 | System handles 10 concurrent calls without degradation | |
| 38 | Database queries complete in < 100ms at p95 | |

---

## SECTION 14: OUT OF SCOPE (V1)

Explicitly not building in V1:

| Feature | Reason | Future Consideration |
|---------|--------|---------------------|
| Voice playback | Complexity, storage cost | V2 if requested |
| Real-time streaming | Latency requirements | V2 with dedicated infra |
| Multi-language | English-first market | V2 for expansion |
| Inventory sync | Depends on inventory module | After inventory ships |
| Photo capture via voice prompt | Scope creep | Separate feature |
| Custom parsing rules per business | Complexity | V2 if demand |

---

## SECTION 15: IMPLEMENTATION SEQUENCE

### Phase 1: Foundation (Week 1-2)
- [ ] Database schema deployment (including learning tables)
- [ ] Twilio Spoke number provisioning
- [ ] Basic call handling (answer, record, hang up)
- [ ] Transcription integration (Whisper)
- [ ] Audio quality detection

### Phase 2: Core Parsing Engine (Week 2-3)
- [ ] Token grammar implementation
- [ ] Claude prompt engineering for structured extraction
- [ ] Number normalization (spoken → digits)
- [ ] Confidence scoring system
- [ ] Filler word stripping

### Phase 3: Advanced Parsing (Week 3-4)
- [ ] Customer name fuzzy matching (pg_trgm + Soundex)
- [ ] Pronoun resolution
- [ ] Negation/correction detection
- [ ] Multi-job segmentation
- [ ] Ambiguity detection and handling

### Phase 4: Job Matching Intelligence (Week 4-5)
- [ ] GPS signal integration
- [ ] Schedule window matching
- [ ] Route prediction algorithm
- [ ] Composite score calculation
- [ ] Clarification SMS flow

### Phase 5: Crew Attribution (Week 5)
- [ ] Phone number registry
- [ ] Unknown caller handling
- [ ] First-time setup flow
- [ ] Visibility rules

### Phase 6: Confirmation & Edit (Week 5-6)
- [ ] Adaptive confirmation SMS templates
- [ ] Message compression logic
- [ ] EDIT reply flow parsing
- [ ] Draft management
- [ ] Smart follow-up messages

### Phase 7: Learning Systems (Week 6-7)
- [ ] Feedback loop (EDIT → learning)
- [ ] Contractor speech profiles
- [ ] Business vocabulary learning
- [ ] Threshold adaptation
- [ ] Pattern storage and retrieval

### Phase 8: Quality & Monitoring (Week 7-8)
- [ ] Quality scoring implementation
- [ ] Anomaly detection
- [ ] Health monitoring dashboard
- [ ] Weekly report generation
- [ ] Alert system

### Phase 9: Integration & Polish (Week 8-9)
- [ ] Settings UI integration
- [ ] Webhook events
- [ ] In-app entry point
- [ ] Error handling audit
- [ ] Load testing
- [ ] End-to-end test suite execution

### Phase 10: Beta & Iteration (Week 9-10)
- [ ] Internal dogfooding
- [ ] Beta contractor rollout (10 businesses)
- [ ] Gather correction data for learning
- [ ] Tune confidence thresholds
- [ ] Performance optimization

---

## SECTION 16: PROMPTS

### 16.1 Transcription → Parsing Prompt

```
You are a parser for contractor job updates. Extract structured data from transcribed voice input.

INPUT: A transcription of a contractor calling in a job update. May include background noise, false starts, filler words.

OUTPUT: JSON matching this schema exactly:
{
  "customer": { "value": string | null, "confidence": 0.0-1.0 },
  "status": { "value": "completed" | "en_route" | "in_progress" | null, "confidence": 0.0-1.0 },
  "duration": { "value": number (minutes) | null, "confidence": 0.0-1.0 },
  "payment": {
    "amount": { "value": number | null, "confidence": 0.0-1.0 },
    "method": { "value": "cash" | "card" | "check" | "invoice" | "card_on_file" | null, "confidence": 0.0-1.0 },
    "status": { "value": "paid" | "pending" | "invoiced" | null, "confidence": 0.0-1.0 }
  },
  "work_description": { "value": string | null, "confidence": 0.0-1.0 },
  "materials": [{ "item": string, "quantity": number | null, "confidence": 0.0-1.0 }],
  "follow_up": { "description": string | null, "confidence": 0.0-1.0 },
  "referral": { "name": string | null, "service_needed": string | null, "confidence": 0.0-1.0 },
  "scheduling": { "raw_text": string | null, "parsed_date": string (ISO) | null, "confidence": 0.0-1.0 }
}

RULES:
- Set confidence based on clarity: clear statement = 0.95+, implied = 0.7-0.85, ambiguous = 0.5-0.7
- For durations: normalize to minutes ("2 hours" = 120, "hour and a half" = 90)
- For payment: only extract if explicitly stated, never infer
- For names: extract exactly as spoken, do not correct spelling
- For work/materials: extract key items, ignore filler
- If a field is not mentioned, set value to null and confidence to 0

TRANSCRIPT:
{{transcript}}
```

### 16.2 Customer Name Matching Prompt

```
Match the spoken customer name to existing customers.

SPOKEN NAME: "{{spoken_name}}"

ACTIVE CUSTOMERS (id, name):
{{customer_list}}

RULES:
- Match on phonetic similarity (Martinez ~ Martínez ~ Martinz)
- Match on partial names (Jim ~ James, Bob ~ Robert)
- Match on common nicknames and shortenings
- Account for possessives ("Johnson's" matches "Johnson")
- Account for "the X job" patterns
- If multiple matches within 10% similarity, return all
- If no match above 70% similarity, return empty

PHONETIC_CONSIDERATIONS:
- Spanish names: silent H, ñ ≈ ny, ll ≈ y
- Common mishearings: th/f, d/t, b/v, s/z
- Dropped syllables: "Martinez" heard as "Martez"

OUTPUT JSON:
{
  "matches": [
    { "customer_id": string, "customer_name": string, "similarity": 0.0-1.0, "match_type": "exact"|"phonetic"|"nickname"|"partial" }
  ]
}
```

### 16.3 Ambiguity Resolution Prompt

```
The following transcript contains an ambiguous element that needs clarification.

TRANSCRIPT: "{{transcript}}"
AMBIGUOUS_ELEMENT: "{{element}}" (e.g., "four fifty")
POSSIBLE_INTERPRETATIONS:
{{interpretations}}

CONTEXT AVAILABLE:
- Previous extractions in this update: {{previous_extractions}}
- Contractor's typical payment range: {{payment_range}}
- Contractor's typical job duration: {{duration_range}}
- Words immediately before: {{before_context}}
- Words immediately after: {{after_context}}

DETERMINE:
1. Most likely interpretation based on context
2. Confidence level (0.0-1.0)
3. Whether clarification is needed (confidence < 0.75)

OUTPUT JSON:
{
  "interpretation": string,
  "field_type": "payment_amount"|"duration"|"other",
  "value": number,
  "confidence": float,
  "reasoning": string,
  "needs_clarification": boolean
}
```

### 16.4 Multi-Job Segmentation Prompt

```
The following transcript appears to contain updates for multiple jobs.
Segment the transcript and extract updates for each job separately.

TRANSCRIPT: "{{transcript}}"

SEGMENTATION_SIGNALS:
- New customer name mentioned
- Transition words: "also", "then", "next", "second job"
- Distinct time references
- "first...second...third" patterns

FOR EACH SEGMENT:
1. Identify the boundaries (start/end word indices)
2. Extract all fields independently
3. Flag any cross-segment references (pronouns referring to previous segment)

OUTPUT JSON:
{
  "segments": [
    {
      "segment_index": int,
      "start_word": int,
      "end_word": int,
      "transcript_slice": string,
      "extractions": { ...standard extraction schema... },
      "cross_references": [{ "pronoun": string, "likely_referent": string, "from_segment": int }]
    }
  ],
  "segmentation_confidence": float
}
```

### 16.5 Correction Detection Prompt

```
Analyze the transcript for self-corrections and determine the final intended values.

TRANSCRIPT: "{{transcript}}"

CORRECTION_SIGNALS:
- "actually", "wait", "no", "I mean", "correction", "sorry"
- Repeated values with different numbers
- Negation followed by new value
- "not X, Y" patterns

FOR EACH CORRECTION:
1. Identify the original (incorrect) value
2. Identify the corrected (intended) value
3. Determine which field is being corrected
4. Increase confidence for corrected values (speaker is being deliberate)

OUTPUT JSON:
{
  "corrections_found": boolean,
  "corrections": [
    {
      "field": string,
      "original_value": any,
      "corrected_value": any,
      "correction_signal": string,
      "confidence_boost": float  // Add to base confidence
    }
  ],
  "final_values": {
    // Only include fields that were corrected
  }
}
```

---

## SECTION 17: STOP CONDITIONS

**STOP IMPLEMENTATION IF:**

1. Transcription accuracy falls below 85% on test corpus
2. End-to-end latency exceeds 45 seconds at p50
3. Confirmation SMS delivery rate falls below 95%
4. Parsing incorrectly writes data in >5% of test cases
5. Any payment amount is written incorrectly (zero tolerance)

**FIX BEFORE PROCEEDING.**

---

## APPENDIX A: Test Corpus

Minimum test coverage before release. Each test includes expected parse output.

### A.1 Standard Updates (Happy Path)

```
TEST_001: Clear complete update
INPUT: "Just finished at the Martinez place. Replaced the garbage disposal, 
        took about two hours. She paid $450 cash."
EXPECTED:
  customer: { spoken: "Martinez", confidence: 0.95 }
  status: { value: "completed", confidence: 0.98 }
  duration: { minutes: 120, confidence: 0.90 }
  payment: { amount: 450, method: "cash", status: "paid", confidence: 0.97 }
  work_description: { value: "Replaced garbage disposal", confidence: 0.92 }

TEST_002: Minimal complete update
INPUT: "Done at Johnson's. About an hour."
EXPECTED:
  customer: { spoken: "Johnson", confidence: 0.93 }
  status: { value: "completed", confidence: 0.95 }
  duration: { minutes: 60, confidence: 0.85 }

TEST_003: Rich multi-element update
INPUT: "Finished the Smith job. Fixed the leak under the sink, replaced the 
        p-trap and supply lines. Used about $45 in parts. He paid 280 cash 
        and mentioned his neighbor might need a plumber."
EXPECTED:
  customer: { spoken: "Smith", confidence: 0.94 }
  status: { value: "completed", confidence: 0.96 }
  payment: { amount: 280, method: "cash", status: "paid", confidence: 0.95 }
  work_description: { value: "Fixed leak under sink, replaced p-trap and supply lines", confidence: 0.90 }
  materials: [{ item: "parts", quantity: "$45 worth", confidence: 0.85 }]
  referral: { relation: "neighbor", service_needed: "plumber", confidence: 0.88 }
```

### A.2 Duration Variants

```
TEST_010: Time span calculation
INPUT: "Got there at 10, left around 12:30"
EXPECTED:
  arrival_time: { value: "10:00", confidence: 0.90 }
  duration: { minutes: 150, confidence: 0.92 }  # Calculated

TEST_011: Approximate duration
INPUT: "Couple hours, maybe two and a half"
EXPECTED:
  duration: { minutes: 150, confidence: 0.80 }  # Uses "two and a half"

TEST_012: Quick job
INPUT: "Quick one, just 20 minutes"
EXPECTED:
  duration: { minutes: 20, confidence: 0.92 }

TEST_013: Hedged duration
INPUT: "I think it was like, I don't know, maybe 3 hours?"
EXPECTED:
  duration: { minutes: 180, confidence: 0.65 }  # Lower due to hedging

TEST_014: Duration idiom
INPUT: "Took me the better part of the morning"
EXPECTED:
  duration: { minutes: 180, confidence: 0.60 }  # Approximate, low confidence
```

### A.3 Payment Variants

```
TEST_020: Card on file
INPUT: "Charged it to the card on file"
EXPECTED:
  payment: { method: "card_on_file", status: "paid", confidence: 0.94 }

TEST_021: Deferred payment
INPUT: "She's gonna mail a check"
EXPECTED:
  payment: { method: "check", status: "pending", confidence: 0.92 }

TEST_022: Invoice
INPUT: "I'll send the invoice tonight"
EXPECTED:
  payment: { status: "invoiced", confidence: 0.90 }

TEST_023: Spoken number
INPUT: "Four fifty cash"
EXPECTED:
  payment: { amount: 450, method: "cash", status: "paid", confidence: 0.93 }

TEST_024: Ambiguous number (payment context)
INPUT: "She paid four fifty"
EXPECTED:
  payment: { amount: 450, status: "paid", confidence: 0.90 }

TEST_025: Ambiguous number (no context)
INPUT: "Four fifty"
EXPECTED:
  # Ambiguous - could be $450 or 4.5 hours
  ambiguities: ["four fifty could be payment ($450) or duration (4.5 hours)"]
  # System should ask clarification

TEST_026: Digital payment
INPUT: "He Venmo'd me 200"
EXPECTED:
  payment: { amount: 200, method: "venmo", status: "paid", confidence: 0.92 }
```

### A.4 Status Variants

```
TEST_030: En route
INPUT: "On my way to the next one"
EXPECTED:
  status: { value: "en_route", confidence: 0.95 }
  # Note: This is informational, may not trigger job update

TEST_031: Arrival
INPUT: "Just got here at the Davis house"
EXPECTED:
  customer: { spoken: "Davis", confidence: 0.93 }
  status: { value: "in_progress", confidence: 0.95 }
  arrival_time: { value: "now", confidence: 0.90 }

TEST_032: Completion idiom
INPUT: "All buttoned up here"
EXPECTED:
  status: { value: "completed", confidence: 0.85 }  # Idiom recognition

TEST_033: Delayed
INPUT: "Running about 20 minutes late to the Wilson job"
EXPECTED:
  customer: { spoken: "Wilson", confidence: 0.92 }
  status: { value: "delayed", confidence: 0.95 }
  # System should notify customer if enabled
```

### A.5 Correction & Negation

```
TEST_040: Self-correction amount
INPUT: "Took about two hours... actually no, more like three"
EXPECTED:
  duration: { minutes: 180, confidence: 0.95 }  # Higher confidence due to correction

TEST_041: Self-correction customer
INPUT: "Done at Martinez... wait, no, Johnson"
EXPECTED:
  customer: { spoken: "Johnson", confidence: 0.92 }
  # Martinez should be ignored

TEST_042: Negated payment
INPUT: "Didn't collect payment, she'll mail a check"
EXPECTED:
  payment: { method: "check", status: "pending", confidence: 0.93 }

TEST_043: Mid-sentence correction
INPUT: "It was 350, no wait, 450 cash"
EXPECTED:
  payment: { amount: 450, method: "cash", status: "paid", confidence: 0.95 }
```

### A.6 Multi-Job Updates

```
TEST_050: Two jobs same call
INPUT: "Martinez job is done, two hours, 450 cash. Also finished at Johnson, 
        that was quick, maybe 45 minutes, she's gonna mail a check."
EXPECTED:
  updates: [
    {
      customer: { spoken: "Martinez", confidence: 0.94 }
      status: { value: "completed", confidence: 0.96 }
      duration: { minutes: 120, confidence: 0.90 }
      payment: { amount: 450, method: "cash", status: "paid", confidence: 0.95 }
    },
    {
      customer: { spoken: "Johnson", confidence: 0.93 }
      status: { value: "completed", confidence: 0.95 }
      duration: { minutes: 45, confidence: 0.88 }
      payment: { method: "check", status: "pending", confidence: 0.90 }
    }
  ]

TEST_051: Three jobs numbered
INPUT: "OK so first job at Martinez, done, 2 hours, 400 cash. Second one at 
        Smith was quick, 45 minutes, card on file. Third at Davis took forever, 
        like 4 hours, I'll invoice him."
EXPECTED:
  updates: [
    { customer: "Martinez", duration: 120, payment: { amount: 400, method: "cash" }},
    { customer: "Smith", duration: 45, payment: { method: "card_on_file" }},
    { customer: "Davis", duration: 240, payment: { status: "invoiced" }}
  ]
```

### A.7 Referrals & Follow-ups

```
TEST_060: Explicit referral
INPUT: "Her daughter needs someone to look at her water heater"
EXPECTED:
  referral: {
    relation: "daughter",
    service_needed: "water heater inspection",
    confidence: 0.92
  }

TEST_061: Neighbor referral
INPUT: "He said his neighbor's been looking for a good plumber, gave him my card"
EXPECTED:
  referral: {
    relation: "neighbor",
    service_needed: "plumbing (general)",
    handoff: "gave card",
    confidence: 0.88
  }

TEST_062: Follow-up needed
INPUT: "She mentioned the upstairs bathroom is making a weird noise too, 
        might need to come back"
EXPECTED:
  follow_up: {
    description: "upstairs bathroom making noise",
    urgency: "normal",
    confidence: 0.85
  }
  scheduling: {
    raw_text: "might need to come back",
    confidence: 0.70
  }
```

### A.8 Edge Cases & Noise

```
TEST_070: Heavy filler
INPUT: "Uh, yeah, so, I just finished up at, uh, Martinez. It was like, 
        two hours I guess. She paid cash, um, 450 I think."
EXPECTED:
  customer: { spoken: "Martinez", confidence: 0.90 }
  status: { value: "completed", confidence: 0.92 }
  duration: { minutes: 120, confidence: 0.78 }  # Lower due to "I guess"
  payment: { amount: 450, method: "cash", confidence: 0.75 }  # Lower due to "I think"

TEST_071: Background noise markers
INPUT: "[car horn] Done at Martinez [wind noise] two hours [unintelligible] cash"
EXPECTED:
  customer: { spoken: "Martinez", confidence: 0.85 }
  status: { value: "completed", confidence: 0.88 }
  duration: { minutes: 120, confidence: 0.82 }
  payment: { method: "cash", confidence: 0.75 }
  # Amount not extracted due to unintelligible segment

TEST_072: Minimal viable input
INPUT: "Done"
EXPECTED:
  status: { value: "completed", confidence: 0.90 }
  # Job matching via GPS/schedule signals

TEST_073: Information only (no update)
INPUT: "Hey just wanted to let you know I'm heading to lunch, be back in an hour"
EXPECTED:
  # No job update extracted
  parse_metadata: { informational_only: true }

TEST_074: Wrong number scenario
INPUT: "Hi is this the pizza place?"
EXPECTED:
  # No extraction
  parse_metadata: { off_topic: true }
  # System responds appropriately
```

### A.9 Pronoun Resolution

```
TEST_080: She/her resolution
INPUT: "Finished at Martinez. She paid cash. Her daughter needs a plumber too."
EXPECTED:
  customer: { spoken: "Martinez", confidence: 0.94 }
  payment: { method: "cash", status: "paid", confidence: 0.92 }  # "She" = Martinez
  referral: { relation: "daughter of Martinez", confidence: 0.90 }  # "Her" = Martinez

TEST_081: Possessive resolution
INPUT: "Done at Johnson's. His wife wants a quote on the kitchen sink."
EXPECTED:
  customer: { spoken: "Johnson", confidence: 0.93 }
  referral: { relation: "wife", service_needed: "kitchen sink quote", confidence: 0.88 }

TEST_082: It resolution
INPUT: "Fixed the water heater at Smith's. It was the thermostat."
EXPECTED:
  customer: { spoken: "Smith", confidence: 0.93 }
  work_description: { value: "Fixed water heater - thermostat issue", confidence: 0.90 }
```

### A.10 Grammar Stress Tests

```
TEST_090: Run-on sentence
INPUT: "so I got to Martinez around 9 fixed the disposal it took about 2 hours 
        she paid 450 cash then headed to Johnson that was quick maybe 45 minutes 
        he's gonna mail a check and his neighbor needs a plumber too"
EXPECTED:
  # Should correctly segment into two jobs + referral
  updates: [
    { customer: "Martinez", arrival: "9:00", duration: 120, payment: { amount: 450, method: "cash" }},
    { customer: "Johnson", duration: 45, payment: { method: "check", status: "pending" }}
  ]
  referral: { relation: "neighbor of Johnson", service_needed: "plumbing" }

TEST_091: Contradictory signals
INPUT: "All done at Martinez... well actually still working on it, almost done"
EXPECTED:
  customer: { spoken: "Martinez", confidence: 0.94 }
  status: { value: "in_progress", confidence: 0.85 }  # Correction wins

TEST_092: Compound amounts
INPUT: "Parts were 45, labor was 200, so 245 total, paid card on file"
EXPECTED:
  payment: { amount: 245, method: "card_on_file", status: "paid", confidence: 0.93 }
  materials: [{ item: "parts", quantity: "$45", confidence: 0.85 }]

TEST_093: Regional slang
INPUT: "Knocked it out at Martinez, got road money, four and a quarter"
EXPECTED:
  customer: { spoken: "Martinez", confidence: 0.92 }
  status: { value: "completed", confidence: 0.88 }  # "knocked it out" = done
  payment: { amount: 425, method: "cash", confidence: 0.85 }  # "road money" = cash
```

---

## APPENDIX B: Vocabulary Extension System

### B.1 Base Vocabulary Loading

On system startup, load the base vocabulary defined in Section 3.2. This covers common contractor speech patterns.

### B.2 Per-Contractor Extensions

```sql
-- Contractor-specific vocabulary learned from corrections
CREATE TABLE contractor_vocabulary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_phone_id UUID NOT NULL REFERENCES contractor_phones(id) ON DELETE CASCADE,
  phrase TEXT NOT NULL,
  token_category TEXT NOT NULL,  -- e.g., 'STATUS_COMPLETE', 'PAYMENT_METHOD'
  mapped_value TEXT NOT NULL,    -- e.g., 'completed', 'cash'
  confidence FLOAT NOT NULL DEFAULT 0.85,
  occurrence_count INT NOT NULL DEFAULT 1,
  last_used_at TIMESTAMPTZ DEFAULT now(),
  learned_from_update_id UUID REFERENCES spoke_updates(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(contractor_phone_id, phrase, token_category)
);

-- Index for fast lookup during parsing
CREATE INDEX idx_contractor_vocab_lookup 
  ON contractor_vocabulary(contractor_phone_id, phrase);
```

### B.3 Learning Algorithm

```
FUNCTION learn_vocabulary(correction_event):
  
  # Extract the phrase that was misinterpreted
  original_transcript = correction_event.transcript
  corrected_field = correction_event.field
  corrected_value = correction_event.new_value
  
  # Find the phrase window around the error
  error_context = extract_context_window(
    original_transcript, 
    correction_event.original_parse_position,
    window_size=5_words
  )
  
  # Check if this phrase is already known
  existing = lookup_vocabulary(
    contractor_id, 
    error_context.key_phrase
  )
  
  IF existing:
    # Reinforce existing pattern
    existing.occurrence_count += 1
    existing.confidence = min(0.98, existing.confidence + 0.02)
    existing.last_used_at = now()
  ELSE:
    # Create new vocabulary entry
    INSERT contractor_vocabulary {
      contractor_phone_id: contractor_id,
      phrase: error_context.key_phrase,
      token_category: field_to_category(corrected_field),
      mapped_value: corrected_value,
      confidence: 0.85,
      occurrence_count: 1,
      learned_from_update_id: correction_event.update_id
    }
  
  # Log for analysis
  log_vocabulary_learning(contractor_id, error_context, corrected_field)
```

### B.4 Vocabulary Application

```
FUNCTION apply_contractor_vocabulary(transcript, contractor_id):
  
  # Load contractor's custom vocabulary
  custom_vocab = SELECT * FROM contractor_vocabulary 
    WHERE contractor_phone_id = contractor_id
    ORDER BY occurrence_count DESC
  
  # Build augmented token set
  augmented_tokens = BASE_TOKENS.copy()
  
  FOR entry IN custom_vocab:
    IF entry.confidence >= 0.80:
      augmented_tokens[entry.token_category].append({
        phrase: entry.phrase,
        value: entry.mapped_value,
        confidence: entry.confidence,
        source: 'learned'
      })
  
  # Use augmented tokens for parsing
  RETURN parse_with_tokens(transcript, augmented_tokens)
```

### B.5 Vocabulary Decay

```
-- Decay unused vocabulary entries
-- Run weekly via cron

UPDATE contractor_vocabulary
SET confidence = confidence * 0.95
WHERE last_used_at < now() - interval '30 days'
  AND occurrence_count < 5;

-- Remove very low confidence entries
DELETE FROM contractor_vocabulary
WHERE confidence < 0.50
  AND occurrence_count < 3
  AND created_at < now() - interval '90 days';
```

### B.6 Vocabulary Review (Owner Visibility)

```
OWNER_VOCABULARY_VIEW = {
  
  PURPOSE: Build trust by showing what Spoke has learned
  
  LOCATION: Settings → Spoke → Learned Phrases (read-only)
  
  DISPLAY:
    ┌────────────────────────────────────────────────────────┐
    │ Learned Phrases                                        │
    │ ────────────────────────────────────────────────────── │
    │ Spoke learns how your team talks. Here's what it knows.│
    │                                                        │
    │ PHRASE              MEANS           LEARNED FROM       │
    │ "knocked it out"    Job complete    Mike (15 uses)     │
    │ "squared away"      Job complete    Jake (8 uses)      │
    │ "road money"        Cash payment    Mike (6 uses)      │
    │ ────────────────────────────────────────────────────── │
    │ Total learned phrases: 12                              │
    └────────────────────────────────────────────────────────┘
  
  RULES:
    - Read-only (no editing in V1)
    - Shows phrase, meaning, who taught it, use count
    - Sorted by occurrence_count DESC
    - Only shows entries with confidence >= 0.80
  
  WHY READ-ONLY:
    - Prevents owner from breaking working mappings
    - Editing requires understanding parsing internals
    - Future: allow "disable" toggle per phrase
  
  TRUST VALUE:
    - Owner sees Spoke isn't a black box
    - Can explain to crew why Spoke "understands" them
    - Early warning if weird phrases appear
}
```

---

## APPENDIX C: Glossary

| Term | Definition |
|------|------------|
| Spoke | The voice-first CRM update feature |
| Spoke number | Dedicated Twilio phone number for receiving updates |
| Draft | An update that couldn't be matched to a job |
| Confidence score | 0.0-1.0 measure of parsing certainty |
| Match signals | GPS, schedule, last-viewed data used for job matching |
| EDIT flow | The correction process triggered by replying EDIT |
| Token | A categorized word or phrase in the parsing grammar |
| Token category | Grouping of related tokens (e.g., STATUS_COMPLETE) |
| Signal stack | Ordered list of signals used for job matching |
| Quality score | Composite measure of update processing quality |
| Vocabulary extension | Contractor-specific learned phrase mappings |
| Filler words | Non-semantic words (uh, um, like) stripped during parsing |
| Compound pattern | Multi-token sequence with combined meaning |
| Pronoun resolution | Mapping pronouns to their referent entities |
| Ambiguity detection | Identifying elements with multiple valid interpretations |

---

## APPENDIX D: Regional Slang Reference

Common regional/trade slang that may not be in standard vocabulary:

| Slang | Meaning | Region/Trade | Token Category |
|-------|---------|--------------|----------------|
| "Road money" | Cash payment | Southern US | PAYMENT_METHOD: cash |
| "Knocked it out" | Completed | General | STATUS_COMPLETE |
| "Buttoned up" | Completed | Northeast | STATUS_COMPLETE |
| "Squared away" | Completed | Military/General | STATUS_COMPLETE |
| "COD" | Cash on delivery | General | PAYMENT_METHOD: cash |
| "Net 30" | Invoice, due in 30 days | Business | PAYMENT_STATUS: invoiced |
| "T&M" | Time and materials | Trades | BILLING_TYPE |
| "Callback" | Return visit | General | FOLLOW_UP |
| "Punch list" | Remaining small tasks | Construction | FOLLOW_UP |
| "Change order" | Scope modification | Construction | WORK_MODIFICATION |

These are pre-loaded but can be augmented per-contractor.

---

## APPENDIX E: Beta Scope Definition

### E.1 Beta Goal (Crystal Clear)

> "I called. My job updated correctly. I got a text confirming it."

That's it. Everything else is nice, not required.

### E.2 Beta: Non-Negotiable (Must Ship Together)

#### Core Flow
- [x] Dedicated Spoke number
- [x] Call → speak → hang up
- [x] Whisper transcription
- [x] Claude extraction (**single job only**)
- [x] Confirmation SMS
- [x] EDIT flow (30 min window)

#### Fields Supported
- [x] Status (completed / arrived / en_route)
- [x] Duration
- [x] Payment (amount + method + status)
- [x] Customer match (name OR GPS/schedule)

#### Safety Systems
- [x] Confidence thresholds
- [x] Draft fallback
- [x] No payment auto-write < 90%
- [x] No job auto-match < threshold
- [x] Raw transcript TTL deletion

### E.3 Beta: Deferred (Safe to Cut)

#### Parsing & Intelligence
- [ ] Multi-job in one call
- [ ] Route prediction
- [ ] Contractor speech profiles
- [ ] Vocabulary learning
- [ ] Statistical anomaly detection
- [ ] Adaptive thresholds

#### UX & Ops
- [ ] In-app Spoke button
- [ ] Webhook events
- [ ] Advanced analytics dashboards
- [ ] Weekly owner digest
- [ ] Customer delay notifications

### E.4 Beta: Conditional (Include If Easy)

These are "if it's cheap, keep it" items:

- [~] Pronoun resolution (low risk, helps accuracy)
- [~] Negation handling (worth keeping, prevents bad writes)
- [~] Simple correction detection ("actually", "wait")
- [~] Informational-only detection (reduces false drafts)

### E.5 Beta Architecture (Simplified Pipeline)

```
┌─────────────────────────────────────────────────────────────────┐
│                    BETA PIPELINE (SIMPLIFIED)                    │
└─────────────────────────────────────────────────────────────────┘

Call → Transcribe → Extract (1 job) → Match → Confirm → Edit/Draft

REMOVED FROM BETA:
  ✗ Multi-job segmentation
  ✗ Learning loops
  ✗ Adaptive thresholds  
  ✗ Route prediction
  ✗ Advanced analytics

INTACT IN BETA:
  ✓ Trust
  ✓ Explainability
  ✓ Auditability
  ✓ Payment safety
  ✓ Draft-first ambiguity handling
```

### E.6 What Beta Still Demonstrates

Even with cuts, beta users experience:
- Voice-first CRM updates
- No app friction
- Accurate payment logging
- Immediate confirmation
- Easy correction

That's enough to:
- Sell it
- Validate behavior
- Collect real correction data
- Tune models safely

### E.7 Post-Beta Expansion Order

Ship features in this sequence based on value/complexity:

| Phase | Feature | Why This Order |
|-------|---------|----------------|
| 1 | Multi-job segmentation | High value, moderate complexity |
| 2 | Contractor speech profiles | Enables learning, uses beta data |
| 3 | Vocabulary learning | Requires correction data from beta |
| 4 | Route prediction | Nice-to-have, not critical |
| 5 | Advanced analytics | Owner visibility, not core function |
| 6 | Customer notifications | Expansion feature |

### E.8 Beta Success Criteria

Beta is successful when:

| Metric | Target |
|--------|--------|
| Updates processed without error | > 95% |
| Correct job match (no clarification needed) | > 80% |
| Payment accuracy (no edit needed) | > 95% |
| Confirmation SMS delivery | > 98% |
| Time from hang-up to SMS | < 30 seconds (p95) |
| Contractor adoption (of those offered) | > 60% use it weekly |

### E.9 Beta Rollout Plan

```
WEEK 1-2: Internal dogfooding
  - Anthropic team tests with real calls
  - Identify parsing gaps
  - Tune confidence thresholds

WEEK 3-4: Alpha (5 businesses)
  - Hand-selected trusted customers
  - Daily monitoring
  - Direct feedback channel

WEEK 5-6: Beta (20 businesses)
  - Broader rollout
  - Collect correction data
  - Begin learning system population

WEEK 7+: General availability
  - All Leads Captain customers
  - Learning systems enabled
  - Full feature set phased in
```

---

*End of specification. This document is the single source of truth for Spoke implementation.*


# Spoke — Safeguards & Mitigations Patch

**Version:** 1.0  
**Status:** Approved for Implementation  
**Parent Document:** Spoke Master Spec v1.0  
**Classification:** Constitutional Amendment (does not supersede, only augments)

---

## Purpose

This document augments the Spoke Master Spec with defensive mitigations discovered during adversarial ("red team") review. It does not change product intent, only failure behavior.

**What this patch does:**
- Codifies failure handling for worst-case contractor behaviors
- Adds minimal schema extensions for safety tracking
- Clarifies ambiguous rules discovered during review
- Documents what the system explicitly does NOT do

**What this patch does NOT do:**
- Change the core parsing pipeline
- Add new features or capabilities
- Modify the beta scope
- Alter the trust-first philosophy

---

## Conceptual Framing

> **Spoke is not an AI assistant.**
>
> It is a **contextual policy engine** that decides:
> - What deserves system attention
> - What deserves confirmation
> - What must defer to humans
>
> This framing governs all mitigations in this document. When in doubt, the system defers rather than guesses, confirms rather than assumes, and logs rather than ignores.

This insight—that Spoke is infrastructure for attention, not intelligence for action—should inform all implementation decisions. The system's job is to route information correctly, not to be clever.

---

## Section 1: Worst-Case Behavioral Classes

### 1.1 The Chaos Caller

**Profile:**
- Calls while driving
- Half sentences, changes mind mid-sentence
- Heavy filler + slang + hedging
- Doesn't read confirmations

**Example Input:**
> "Uh yeah so I'm uh done here… well almost done… took like maybe two? No, three. Whatever. She paid… no she didn't, she's mailing it."

**System Response:**

| Mechanism | Outcome |
|-----------|---------|
| Negation handling | Catches "no she didn't" reversal |
| Correction detection | Boosts confidence on corrected value ("three") |
| Hedging detection | Lowers confidence on "maybe" |
| Payment threshold | Will NOT auto-write ambiguous payment |
| Draft fallback | Creates draft OR sends clarification |

**Verdict:** ✅ System survives. This is exactly who the confirmation + EDIT flow is built for.

---

### 1.2 The Speed Demon

**Profile:**
- Calls 8-15 times per hour
- Uses Spoke like a walkie-talkie
- "Done. Next. Done. Next."

**Risks:**
- Cost spikes
- Parsing noise accumulation
- Job timeline spam

**Existing Controls:**

| Control | Specification |
|---------|---------------|
| Rate limit | 20 calls/hour per contractor |
| Informational-only detection | "Heading to next one" doesn't create update |

**Added Mitigation (Patch):**

```
SOFT_THROTTLE_MESSAGE:
  Trigger: 5 calls within 10 minutes
  Message: "You're on a roll! Tip: grouping updates saves time."
  Behavior: Advisory only, does not block
  Purpose: Optimize without punishing
```

**Verdict:** ✅ Contained. Minor UX polish added.

---

### 1.3 The Wrong-Job Assassin

**Profile:**
- Says "done here" with no name
- GPS slightly off or unavailable
- Schedule inaccurate or ignored
- Multiple similar jobs same day

**This is the #1 real CRM data corruption risk.**

**Existing Controls:**

| Control | Specification |
|---------|---------------|
| Signal stack | GPS + schedule + last-viewed, weighted |
| Confidence threshold | < 0.85 triggers clarification |
| Clarification SMS | Single-digit reply, max 3 options |
| Draft fallback | No match = no write |
| Never delete | Spoke appends, never overwrites |

**Critical Design Decision (Preserved):**

> **Spoke does not force a match.**
>
> If the system cannot confidently identify the job, it asks or drafts. This single rule prevents catastrophe.

**Verdict:** ✅ Strongest area of the spec. No additional mitigation needed.

---

### 1.4 The Payment Landmine

**Profile:**
- Mumbles numbers
- Uses slang ("four and a quarter")
- Changes amount mid-sentence
- Mixes labor + parts verbally

**Existing Controls:**

| Control | Specification |
|---------|---------------|
| 90% confidence floor | Payment amounts below this NEVER auto-write |
| Explicit confirmation | Low-confidence amounts get clarification SMS |
| Zero-tolerance policy | Wrong payment = STOP condition |
| EDIT logging | All corrections tracked for learning |

**Design Principle (Preserved):**

> **Wrong payment is STOP-SHIP, not "acceptable error."**
>
> Most competitors treat payment errors as minor. We treat them as existential.

**Verdict:** ✅ Survives strongly. This is a competitive moat.

---

### 1.5 The Non-Responder

**Profile:**
- Doesn't reply to clarification SMS
- Doesn't open app
- Moves on to next job

**Existing Controls:**

| Control | Specification |
|---------|---------------|
| Draft creation | Ambiguous update saved, not written |
| No auto-write | Silence ≠ consent for risky fields |
| App backlog | Drafts visible in app for later resolution |
| 5-minute timeout | Clarification expires gracefully |

**Design Principle (Preserved):**

> **Silence does not grant permission.**
>
> If we ask a question and get no answer, we save, we don't guess.

**Verdict:** ✅ Correctly degrades. No additional mitigation needed.

---

### 1.6 The Ghost Caller

**Profile:**
- New tech calls before being registered
- Fired tech calls after removal
- Owner forgets to clean up numbers

**Existing Controls:**

| Control | Specification |
|---------|---------------|
| Auto-create toggle | Unknown callers can be auto-added (optional) |
| Provisional identity | Flagged for owner review |
| Rejection flow | "This number isn't registered" |

**Added Mitigation (Patch):**

```
INACTIVE_NUMBER_ALERT:
  Trigger: is_active = false AND call received
  Behavior: 
    1. Do NOT process update
    2. Alert owner: "[Name] ([phone]) tried to log an update"
    3. Log attempt for audit
  Purpose: Detect fired techs still calling
```

**Schema Addition:**
```sql
ALTER TABLE contractor_phones ADD COLUMN is_active BOOLEAN DEFAULT true;
ALTER TABLE contractor_phones ADD COLUMN deactivated_at TIMESTAMPTZ;
ALTER TABLE contractor_phones ADD COLUMN deactivation_reason TEXT;
```

**Verdict:** ⚠️ Mostly covered. Patch closes the gap for fired employee detection.

---

### 1.7 The Intentional Bullshitter

**Profile:**
- Logs jobs not done
- Logs fake payments
- Inflates hours

**Reality:** No AI system fully prevents intentional fraud.

**System Response:**

| Mechanism | Outcome |
|-----------|---------|
| Attribution | Every update tied to phone number |
| Audit trail | Full history preserved |
| Confirmation trail | SMS receipts exist |
| Correction visibility | Edits are logged, not hidden |

**Design Principle:**

> **Fraud is an HR problem, not a data problem.**
>
> Spoke provides the audit trail. Owners decide what to do with it.

**Verdict:** ✅ Out of scope, handled correctly via transparency.

---

## Section 2: Mitigation Mapping

| Risk Class | Primary Control | Secondary Control | Patch Addition |
|------------|-----------------|-------------------|----------------|
| Chaos caller | Correction detection | Confidence gating | None needed |
| Speed demon | Rate limiting | Informational detection | Soft throttle message |
| Wrong-job | Signal stack + clarification | Draft fallback | None needed |
| Payment error | 90% threshold | Zero-tolerance stop | None needed |
| Non-responder | Draft creation | Timeout handling | None needed |
| Ghost caller | Registration flow | Rejection message | Inactive number alert |
| Fraud | Attribution | Audit trail | None needed |

---

## Section 3: Schema Additions

All additions are **non-breaking** and **additive only**.

### 3.1 Contractor Phone Extensions

```sql
-- Already in Master Spec, confirmed here for completeness
ALTER TABLE contractor_phones ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE contractor_phones ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ;
ALTER TABLE contractor_phones ADD COLUMN IF NOT EXISTS deactivation_reason TEXT;

-- New index for active lookups
CREATE INDEX IF NOT EXISTS idx_contractor_phones_active 
  ON contractor_phones(business_id) WHERE is_active = true;
```

### 3.2 Soft Throttle Tracking

```sql
-- Track rapid call patterns for soft throttle
ALTER TABLE contractor_phones ADD COLUMN IF NOT EXISTS rapid_call_count INT DEFAULT 0;
ALTER TABLE contractor_phones ADD COLUMN IF NOT EXISTS rapid_call_window_start TIMESTAMPTZ;

-- Reset logic: if window_start > 10 minutes ago, reset count to 0
```

### 3.3 Route Prediction Accuracy

```sql
-- Track per-contractor route prediction accuracy
ALTER TABLE contractor_speech_profiles ADD COLUMN IF NOT EXISTS route_predictions_made INT DEFAULT 0;
ALTER TABLE contractor_speech_profiles ADD COLUMN IF NOT EXISTS route_predictions_correct INT DEFAULT 0;
ALTER TABLE contractor_speech_profiles ADD COLUMN IF NOT EXISTS route_prediction_weight FLOAT DEFAULT 0.4;
```

---

## Section 4: Rule Clarifications

### 4.1 When to Downgrade Confidence

| Condition | Confidence Modifier |
|-----------|---------------------|
| Hedging language ("maybe", "I think", "probably") | -0.10 |
| High background noise (SNR < 10dB) | -0.15 |
| Fast speech (> 180 wpm) | -0.05 |
| Multiple similar values mentioned | -0.05 |
| Value is statistical outlier for contractor | -0.10 |
| Whisper segment confidence < 0.7 | -0.08 |

### 4.2 When to Force Draft

A draft MUST be created (no CRM write) when:

1. All extracted fields have confidence < 0.60
2. No job match exceeds 0.60 composite score
3. Payment amount confidence < 0.90 AND no clarification response
4. Contractor is flagged as `is_active = false`
5. Multi-job detected but segmentation confidence < 0.70
6. Anomaly score > 0.5 (see Section 10.5 of Master Spec)

### 4.3 When NOT to Learn Vocabulary

The vocabulary learning system MUST NOT create entries when:

1. Correction rate for this contractor > 40% in last 30 days
   - *Reason: High correction rate = unreliable signal*

2. Phrase contains profanity or obvious jokes
   - *Reason: Garbage in, garbage out*

3. Phrase occurred during anomaly-flagged update
   - *Reason: Anomalous context = unreliable pattern*

4. Same phrase maps to different values across contractors
   - *Reason: Regional variation requires per-contractor learning only*

5. Owner has disabled learning for this business
   - *Reason: Some businesses prefer deterministic behavior*

### 4.4 Whisper Timestamp Authority

**Clarification from review:**

> Whisper timestamps are supporting signals, not primary truth.

Rules:
- If spoken duration conflicts with timestamp-calculated duration, prefer spoken
- Log conflict as "model_disagreement" event for tuning
- Never use timestamp confidence alone to gate a write
- Tokenization (Stage 2) is authoritative; Claude (Stage 3) is a refiner

### 4.5 Route Prediction Decay

**Clarification from review:**

Route prediction weight auto-adjusts based on accuracy:

| Accuracy Rate | Weight |
|---------------|--------|
| ≥ 80% | 0.4 (full) |
| 60-79% | 0.25 (reduced) |
| 40-59% | 0.1 (minimal) |
| < 40% | 0.0 (disabled) |

Chaotic scheduler detection:
- Jobs completed out of order > 50% → auto-flag
- Route prediction weight drops to 0.1 for flagged contractors
- Recovery: +0.05 per week if accuracy improves > 20%

---

## Section 5: Non-Goals

This patch explicitly does NOT:

### 5.1 Add New Features

- No new entry points
- No new extraction fields
- No new notification types
- No new integrations

### 5.2 Change Beta Scope

- Beta remains single-job only
- Learning systems remain deferred
- Advanced analytics remain deferred
- All beta success criteria unchanged

### 5.3 Introduce Blocking Behaviors

- No mitigation blocks the user
- No mitigation requires mandatory action
- All safeguards degrade gracefully

### 5.4 Create Office-Facing UI

- All mitigations are tech-facing or system-internal
- Office dashboard is future scope
- Owner alerts are SMS/email only

### 5.5 Prevent All Fraud

- Intentional misuse is an HR problem
- Spoke provides audit trail, not judgment
- Attribution ≠ accusation

---

## Section 6: Implementation Checklist

### 6.1 Required Before Beta

| Item | Owner | Status |
|------|-------|--------|
| Add `is_active` column to contractor_phones | Backend | ☐ |
| Implement inactive number alert | Backend | ☐ |
| Add soft throttle message (5 calls / 10 min) | Backend | ☐ |
| Log model_disagreement events | Backend | ☐ |
| Implement route prediction accuracy tracking | Backend | ☐ |

### 6.2 Required Before GA

| Item | Owner | Status |
|------|-------|--------|
| Route prediction weight auto-adjustment | Backend | ☐ |
| Vocabulary learning guardrails | Backend | ☐ |
| Chaotic scheduler detection | Backend | ☐ |
| Owner vocabulary review UI (read-only) | Frontend | ☐ |

### 6.3 Monitoring Additions

| Metric | Alert Threshold |
|--------|-----------------|
| Inactive number attempts | > 3/day per business |
| Soft throttle triggers | > 10/day per contractor |
| Model disagreement rate | > 15% of updates |
| Route prediction accuracy (system-wide) | < 60% |
| Vocabulary learning rejections | > 30% of candidates |

---

## Section 7: Audit Trail

This section documents why decisions were made.

### 7.1 Why Soft Throttle Instead of Hard Block?

**Decision:** Advisory message, not blocking.

**Rationale:**
- Speed demons are often the most engaged users
- Blocking punishes efficiency
- Advisory respects user intelligence
- Hard limit (20/hour) remains as backstop

### 7.2 Why Inactive Number Alert Instead of Silent Rejection?

**Decision:** Alert owner, not just reject.

**Rationale:**
- Silent rejection hides potential security issue
- Fired employee access is owner's concern
- Alert creates actionable visibility
- Audit log captures pattern over time

### 7.3 Why Route Prediction Decay Instead of Removal?

**Decision:** Gradual weight reduction, not binary disable.

**Rationale:**
- Some contractors are partially predictable
- Complete removal loses useful signal
- Gradual decay allows recovery
- Per-contractor tuning respects individual patterns

### 7.4 Why Vocabulary Learning Guardrails?

**Decision:** Five explicit exclusion conditions.

**Rationale:**
- Learning from garbage creates garbage
- High-correction contractors are unreliable teachers
- Anomalous contexts produce anomalous patterns
- Owner override respects business preferences

---

## Section 8: Future Considerations

These items are **not in scope** but should be considered for future patches:

### 8.1 Nudge System Integration

When Contextual Intelligence ships, Spoke updates should feed:
- Quiet customer detection (last service date)
- Promise keeper (commitments mentioned in calls)
- Maintenance agreement tracking (service intervals)

### 8.2 Multi-User Promise Attribution

When Promise Keeper ships, add:
```sql
ALTER TABLE promises ADD COLUMN assigned_to UUID;
ALTER TABLE promises ADD COLUMN completed_by UUID;
```

### 8.3 Customer Consent Memory

When maintenance reminders ship, add:
```sql
ALTER TABLE maintenance_schedules ADD COLUMN last_customer_response TEXT;
ALTER TABLE maintenance_schedules ADD COLUMN response_at TIMESTAMPTZ;
ALTER TABLE maintenance_schedules ADD COLUMN suppress_until TIMESTAMPTZ;
```

### 8.4 Nudge Audience Tagging

When office dashboard ships, add:
```sql
ALTER TABLE nudges ADD COLUMN audience TEXT DEFAULT 'any';
-- Values: 'technician' | 'office' | 'any'
```

---

## Appendix A: Red Team Summary

| Risk Class | System Outcome |
|------------|----------------|
| Accidental corruption | ❌ Prevented |
| Silent wrong writes | ❌ Prevented |
| Payment mistakes | ❌ Prevented |
| Abuse | ✅ Contained |
| Human chaos | ✅ Absorbed |
| Malice | 🟨 Outside scope (audit trail provided) |

**Bottom Line:**

> The system fails safely, which is the only acceptable failure mode for CRM writes.

---

## Appendix B: Reviewer Insights (Preserved)

These insights should inform future documentation, not be buried in code:

### B.1 On System Identity

> "Spoke is not an AI assistant. It is a contextual policy engine that decides what deserves system attention, what deserves confirmation, and what must defer to humans."

**Future use:** Investor deck, sales doctrine, architecture overview.

### B.2 On Competitive Position

> "If implemented faithfully, this becomes a defining moat vs Jobber/Housecall Pro—not because it's flashy, but because it quietly makes techs better at their jobs."

**Future use:** Positioning statements, competitive analysis.

### B.3 On Trust Architecture

> "The distinction between contextual intelligence and artificial intelligence matters because: it's explainable, it's testable, it's trusted. Ironically, this will feel smarter than many AI-first competitors."

**Future use:** Technical blog post, customer education.

### B.4 On Failure Design

> "Your system fails safely, which is the only acceptable failure mode for CRM writes."

**Future use:** Security documentation, compliance narratives.

---

*End of Patch Document. This document augments but does not supersede the Spoke Master Spec.*