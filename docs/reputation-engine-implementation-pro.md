# REPUTATION ENGINE — IMPLEMENTATION PROMPT
**Audience:** Trae AI  
**Type:** Minimal patch (DO NOT refactor existing systems)  
**Status:** LOCKED  
**Version:** 1.0  

---

## 0. PATCH INTENT (READ FIRST)

You are adding a **Reputation Engine** as a bundled, Tier-2 add-on.

**You are NOT:**
- Rebuilding Proof of Work™
- Modifying existing PoW behavior
- Creating a standalone product
- Adding third-party review APIs
- Introducing new SKUs or checkout flows
- Adding any pricing UI

This patch consumes existing data, adds minimal tables, and introduces one new public feedback flow.

---

## 1. PRODUCT RULES (NON-NEGOTIABLE)

### 1.1 Bundling

Reputation Engine is **NOT standalone**.

It is active ONLY when:
```
business.has_leads_captain === true
OR
business.website_status === 'LIVE'
```

Otherwise → dormant. Show only:
```
"Reputation is managed automatically when Leads Captain or your website is active."
```

No CTA. No upsell. No pricing.

### 1.2 Proof of Work™ Relationship

- Reputation Engine may **READ** Proof of Work
- Reputation Engine must **NEVER WRITE, MODIFY, OR FINALIZE** Proof of Work
- `proof_of_work_id` is optional
- If present and `status = FINALIZED` → display preview only
- Reference by `proof_of_work_id` only

**PoW Public URL Format:**
```
https://app.tradescaptain.com/v/{proof_of_work.public_token}
```

---

## 2. TRIGGER LOGIC

**Event:** `job.status` → `COMPLETED`

**Conditions (ALL must be true):**
- Reputation Engine is active (per Section 1.1)
- No existing `reputation_request` for this `job_id`
- Daily limit not exceeded
- Customer has valid phone number
- Customer has SMS consent (via Leads Captain)

**Action:** Queue one feedback request (SMS only)

### 2.1 Send Timing

| Scenario | Send Time |
|----------|-----------|
| Job completed 8am–6pm | 2 hours after completion |
| Job completed after 6pm | Next day at 9am local |
| Weekend completion | Next business day at 9am |

All times are **business local time**.

### 2.2 Daily Limits

| Plan | Max Requests / Day |
|------|-------------------|
| Starter | 5 |
| Pro | 20 |
| Enterprise | Unlimited |

Hard stop when exceeded. Queue overflow for next day. No rollover.

---

## 3. SMS TEMPLATES

### With Proof of Work
```
Hi {{customer_name}} — thanks again for choosing {{business_name}}.

Here's a record of the work we completed:
{{proof_of_work_url}}

If you have a moment, we'd appreciate your feedback.
{{feedback_url}}
```

### Without Proof of Work
```
Hi {{customer_name}} — thanks for working with {{business_name}}.

If you have a moment, we'd love your feedback on the job we completed.
{{feedback_url}}
```

No incentives. No pressure language.

---

## 4. CUSTOMER FEEDBACK FLOW (PUBLIC)

### URL Structure
```
https://app.tradescaptain.com/feedback/{reputation_request.public_token}
```

- Token: cryptographically random, 32 chars
- Expires: 30 days after creation
- One-time submission only

---

### Step 1: Rating Page

```
{{business_name}} would like your feedback

How would you rate your experience?

[1] [2] [3] [4] [5]
```

**If `proof_of_work_id` exists AND `proof_of_work.status = FINALIZED`:**

Display embedded preview:
```
┌─────────────────────────────────────┐
│ ✓ Verified Work Record              │
│                                     │
│ Service: {{job.service_type}}       │
│ Completed: {{job.completed_at}}     │
│ Tech: {{technician.first_name}}     │
│                                     │
│ [View Full Details →]               │
└─────────────────────────────────────┘
```

Link opens `/v/{proof_of_work.public_token}` in new tab.

---

### Step 2A: Positive Path (Rating 4–5)

```
Thank you! We're glad you had a great experience.

If you have a moment, a public review helps other customers find us:

[Leave a Google Review]     ← Primary CTA (required)
[Leave a Facebook Review]   ← Secondary (if configured)

(Optional) Any additional comments?
[_________________________________]

[Submit]
```

- Set `sentiment = 'positive'`
- Set `is_public = true` if they click a review link

---

### Step 2B: Neutral Path (Rating 3)

```
Thank you for your feedback.

Is there anything we could have done better?

[_________________________________]

[Submit Feedback]
```

- Set `sentiment = 'neutral'`
- **DO NOT show public review links**
- Set `is_public = false`

---

### Step 2C: Negative Path (Rating 1–2)

```
Thank you for your honesty.

We'd like to understand what happened so we can make it right.

[_________________________________]

[Submit Feedback]
```

- Set `sentiment = 'negative'`
- Set `escalated = true`
- **DO NOT show public review links**
- Set `is_public = false`
- Trigger internal notification (Section 7)

---

### Step 3: Confirmation (All Paths)

```
Your feedback has been submitted.

Thank you for helping {{business_name}} improve.
```

No upsells. No app prompts. No redirects. No surveys.

---

### Expired Token Handling

**If `expires_at < NOW()`:**
- Block feedback submission
- Show: `"This feedback link has expired. Contact {{business_name}} directly if needed."`
- **If `proof_of_work_id` exists AND `status = FINALIZED`:**
  - Still display "View completed work details" link
- Do not queue reminders
- Do not create notifications

---

## 5. DATABASE SCHEMA

### 5.1 reputation_requests

```sql
CREATE TABLE reputation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  job_id UUID NOT NULL REFERENCES jobs(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  proof_of_work_id UUID REFERENCES proof_of_work(id),
  
  channel VARCHAR(10) NOT NULL DEFAULT 'SMS' 
    CHECK (channel IN ('SMS', 'EMAIL')),
  public_token VARCHAR(32) UNIQUE NOT NULL 
    DEFAULT encode(gen_random_bytes(16), 'hex'),
  
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','QUEUED','SENT','FAILED','CANCELED',
                      'OPTED_OUT','RESPONDED','COMPLETED','EXPIRED')),
  
  sent_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days',
  reminder_sent_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_reputation_requests_job ON reputation_requests(job_id);
CREATE INDEX idx_reputation_requests_business ON reputation_requests(business_id);
CREATE INDEX idx_reputation_requests_status ON reputation_requests(status);
```

### 5.2 reputation_feedback

```sql
CREATE TABLE reputation_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reputation_request_id UUID NOT NULL 
    REFERENCES reputation_requests(id) ON DELETE CASCADE,
  
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  sentiment VARCHAR(10) NOT NULL 
    CHECK (sentiment IN ('positive','neutral','negative')),
  is_public BOOLEAN DEFAULT FALSE,
  escalated BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_reputation_feedback_request 
  ON reputation_feedback(reputation_request_id);
```

### 5.3 reputation_platform_links

```sql
CREATE TABLE reputation_platform_links (
  business_id UUID PRIMARY KEY REFERENCES businesses(id),
  google_url TEXT,
  facebook_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

No API integrations. Just stored URLs.

### 5.4 reputation_settings

```sql
CREATE TABLE reputation_settings (
  business_id UUID PRIMARY KEY REFERENCES businesses(id),
  
  enabled BOOLEAN DEFAULT TRUE,
  reminder_enabled BOOLEAN DEFAULT FALSE,
  daily_limit_override INTEGER,  -- internal admin only, max 100
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 6. REMINDERS (HARD RULES)

**Only send if ALL conditions met:**
- Rating = 4 or 5
- `is_public = false` (customer did NOT click review link)
- `reminder_enabled = true` (business setting, off by default)
- `reminder_sent_at IS NULL`

**Timing:** 48 hours after feedback submission

**Template:**
```
Hi {{customer_name}} — thanks again for the kind rating!

If you have a moment, a quick Google review would mean a lot:
{{google_url}}

No pressure — we appreciate you either way.
```

**Rules:**
- ONE reminder maximum per request
- Never retry after send failure
- Set `reminder_sent_at` immediately when sent

---

## 7. INTERNAL NOTIFICATIONS

### Trigger Conditions

Fire notification if:
- `rating <= 2`
- OR `escalated = true`

### In-CRM Notification

```
🚨 Customer Feedback Requires Attention

Job: {{job.reference_number}}
Customer: {{customer.name}}
Rating: {{rating}} / 5
Comment: "{{comment_excerpt_100_chars}}"

Recommended Action: Follow up within 24 hours.

[View Full Feedback] [View Job Details]
```

### Email Notification (Optional)

Only if `business.notification_email` is configured.

**Subject:** `Feedback Alert: {{customer.name}} — {{rating}}/5`

Body mirrors in-CRM format. No reply-to customer address.

---

## 8. ERROR HANDLING

| Scenario | Action |
|----------|--------|
| Customer phone invalid | Skip request, log reason, no retry |
| SMS delivery fails | Set `status = 'FAILED'`, no retry |
| Customer opts out | Set `status = 'OPTED_OUT'` immediately |
| Feedback link expired | Show message, preserve PoW link if exists |
| Daily limit hit | Queue for next day, do not drop |
| Job canceled after queued | Set `status = 'CANCELED'` before send |
| Duplicate submission | Ignore silently, show confirmation page |

---

## 9. ADMIN CONTROLS

### Internal Staff Only

| Control | Notes |
|---------|-------|
| Override daily limit | Max 100/day hard ceiling |
| Disable for business | Emergency shutoff |
| View all feedback | Support access |

### Business Owner Settings

| Control | Default | Notes |
|---------|---------|-------|
| Google review URL | — | Required for positive routing |
| Facebook review URL | — | Optional |
| Enable reminders | OFF | Single reminder for positive ratings |
| Pause requests | OFF | Temporary hold |

**Business owners have NO access to:** sentiment thresholds, timing windows, daily limits, message templates.

---

## 10. COMPLIANCE

- TCPA consent inherited from Leads Captain
- Opt-out honored immediately
- One request per job (enforced by unique index)
- No incentives for reviews
- No fake review submissions
- Feedback retained 2 years → anonymize

---

## 11. STOP CONDITIONS (CRITICAL)

**STOP implementation immediately if:**

- [ ] Reputation Engine modifies Proof of Work data
- [ ] Public review links appear before rating captured
- [ ] Public review links shown for rating ≤ 3
- [ ] Reminder sent more than once per request
- [ ] Feedback request sent for canceled job
- [ ] Multiple requests exist for same job
- [ ] Any pricing appears in UI
- [ ] Any third-party review API added
- [ ] Standalone toggle or checkout created
- [ ] Customer PII in webhook payloads
- [ ] Admin override exceeds 100/day

---

## 12. IMPLEMENTATION CHECKLIST

This is a **patch**, not a refactor.

**Reuse existing:**
- SMS infrastructure (Leads Captain)
- Job event system
- Proof of Work public pages
- Customer consent records

**Add only:**
- 4 database tables (Section 5)
- 1 public route: `/feedback/{token}`
- 1 SMS template set
- 1 notification type
- Settings UI in Leads Captain / Website sections

**Do not add:**
- Top-level nav item
- Standalone product page
- Pricing comparison
- Review platform APIs
- Chart dashboards

---

## 13. SYSTEM DEFINITION

> The Reputation Engine is a bundled trust amplification layer that safely converts completed jobs into verified reputation signals. It consumes Proof of Work™ artifacts when available, routes feedback responsibly, protects businesses from public damage, and increases lifetime value — without ever being sold, marketed, or activated on its own.

---

🔐 **END OF IMPLEMENTATION PROMPT**

**Version:** 1.0  
**Status:** LOCKED  
**Source:** Unified Technical Specification v1.2.1