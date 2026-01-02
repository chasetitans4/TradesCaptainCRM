# TradesCaptain CRM/Admin Portal Update Prompt — v6.4.2

**Date:** December 2025  
**Version:** 6.4.2 (PRODUCTION READY)  
**Change Type:** Final Production Fixes  
**Based On:** v6.4.1 FINAL

---

## VERSION 6.4.2 OVERVIEW

Final production fixes — 3 gotchas + 2 nice-to-haves:

1. **IMPORTANT: Remove `twilio_sid UNIQUE`** — Conflicts with multi-status event approach
2. **Calendar hold race condition** — Use `ON CONFLICT DO NOTHING` pattern
3. **Status priority fix** — `delivered` must be highest, use `>` not `>=`
4. **Track actual from-number** — Store Twilio's response `from`, not placeholder
5. **Use TIMESTAMPTZ** — Prevent daylight savings issues

---

## FIX 1: REMOVE twilio_sid UNIQUE CONSTRAINT (CRITICAL)

### 1.1 Problem

In v6.2, we defined:
```sql
twilio_sid VARCHAR(50) UNIQUE
```

This column-level unique constraint blocks the v6.4.1 multi-status approach. The second status event for the same `MessageSid` will fail.

### 1.2 Migration

```sql
-- Step 1: Find and drop the unique constraint
-- (Postgres auto-names it as tablename_columnname_key)
ALTER TABLE nevermiss_events
  DROP CONSTRAINT IF EXISTS nevermiss_events_twilio_sid_key;

-- Step 2: Add a regular index for lookup performance
CREATE INDEX IF NOT EXISTS idx_nevermiss_events_twilio_sid
ON nevermiss_events(twilio_sid);

-- Step 3: Keep the partial unique indexes from v6.4.1
-- These are the ONLY uniqueness constraints now:

CREATE UNIQUE INDEX IF NOT EXISTS uniq_sms_status_event
ON nevermiss_events(twilio_sid, event_type, status)
WHERE event_type = 'sms_status';

CREATE UNIQUE INDEX IF NOT EXISTS uniq_other_events
ON nevermiss_events(twilio_sid, event_type)
WHERE event_type != 'sms_status';
```

### 1.3 Verification Query

```sql
-- Verify no column-level unique constraint remains
SELECT conname, contype 
FROM pg_constraint 
WHERE conrelid = 'nevermiss_events'::regclass 
  AND contype = 'u';

-- Should only show constraints from partial unique indexes
```

---

## FIX 2: CALENDAR HOLD RACE CONDITION

### 2.1 Problem

Two concurrent requests can both:
1. Expire stale holds
2. See "nothing exists"
3. Try INSERT
4. Second one hits `uniq_active_slot_hold` constraint

### 2.2 Fixed: ON CONFLICT DO NOTHING

```javascript
async function createSlotHold(organizationId, conversationId, slotStart, slotEnd) {
  return db.transaction(async (tx) => {
    // Step 1: Expire any stale holds for this slot
    await tx.query(`
      UPDATE calendar_slot_holds
      SET status = 'expired', released_at = NOW()
      WHERE organization_id = $1 
        AND slot_start = $2
        AND status = 'held' 
        AND expires_at < NOW()
    `, [organizationId, slotStart]);
    
    // Step 2: Try to insert — gracefully handle race condition
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    
    const result = await tx.query(`
      INSERT INTO calendar_slot_holds 
        (organization_id, conversation_id, slot_start, slot_end, status, expires_at)
      VALUES ($1, $2, $3, $4, 'held', $5)
      ON CONFLICT ON CONSTRAINT uniq_active_slot_hold DO NOTHING
      RETURNING *
    `, [organizationId, conversationId, slotStart, slotEnd, expiresAt]);
    
    // Step 3: Check if insert succeeded
    if (result.rows.length === 0) {
      // Another request got there first — slot unavailable
      return { success: false, reason: 'slot_unavailable' };
    }
    
    return { success: true, hold: result.rows[0] };
  });
}
```

### 2.3 Named Constraint for ON CONFLICT

The partial unique index needs to be a named constraint for `ON CONFLICT` to reference it:

```sql
-- Drop the index and recreate as a constraint
DROP INDEX IF EXISTS uniq_active_slot_hold;

-- Create as a named constraint using EXCLUDE or partial unique
-- Option A: Use a partial unique index (Postgres will still work with ON CONFLICT)
CREATE UNIQUE INDEX uniq_active_slot_hold
ON calendar_slot_holds(organization_id, slot_start)
WHERE status = 'held';

-- For ON CONFLICT, reference by index name:
-- ON CONFLICT (organization_id, slot_start) WHERE status = 'held' DO NOTHING
```

### 2.4 Updated Insert with Index Reference

```sql
INSERT INTO calendar_slot_holds 
  (organization_id, conversation_id, slot_start, slot_end, status, expires_at)
VALUES ($1, $2, $3, $4, 'held', $5)
ON CONFLICT (organization_id, slot_start) WHERE status = 'held' DO NOTHING
RETURNING *;
```

---

## FIX 3: STATUS PRIORITY — DELIVERED WINS

### 3.1 Problem

Current priority has `delivered`, `undelivered`, and `failed` all at 3:
```javascript
delivered: 3,
undelivered: 3,
failed: 3
```

With `>=` comparison, a late `failed` callback could overwrite `delivered`.

### 3.2 Fixed: Delivered is Highest, Use Strict `>`

```javascript
const STATUS_PRIORITY = {
  'queued': 1,
  'sent': 2,
  'undelivered': 3,
  'failed': 3,
  'delivered': 4  // Highest — delivered is the best terminal state
};

async function applyStatusToMessage(messageSid, newStatus, errorCode) {
  const message = await db.nevermiss_messages.findOne({ twilio_sid: messageSid });
  
  if (!message) {
    return { applied: false, reason: 'message_not_found' };
  }
  
  const currentPriority = STATUS_PRIORITY[message.status] || 0;
  const newPriority = STATUS_PRIORITY[newStatus] || 0;
  
  // Only update if new status is STRICTLY higher priority
  // This ensures: delivered can never be overwritten
  if (newPriority > currentPriority) {
    await db.nevermiss_messages.updateOne(
      { twilio_sid: messageSid },
      { 
        status: newStatus,
        error_code: errorCode || message.error_code,
        delivered_at: newStatus === 'delivered' ? new Date() : message.delivered_at,
        status_updated_at: new Date()
      }
    );
    
    await db.nevermiss_events.updateOne(
      { twilio_sid: messageSid, event_type: 'sms_status', status: newStatus },
      { processed: true, processed_at: new Date() }
    );
    
    return { applied: true };
  }
  
  // Mark event as processed but don't update message
  await db.nevermiss_events.updateOne(
    { twilio_sid: messageSid, event_type: 'sms_status', status: newStatus },
    { processed: true, processed_at: new Date(), notes: 'status_not_higher_priority' }
  );
  
  return { applied: false, reason: 'not_higher_priority' };
}
```

### 3.3 Status Transition Examples

| Current | Incoming | Priority Check | Result |
|---------|----------|----------------|--------|
| queued (1) | sent (2) | 2 > 1 ✓ | Update to sent |
| sent (2) | delivered (4) | 4 > 2 ✓ | Update to delivered |
| sent (2) | failed (3) | 3 > 2 ✓ | Update to failed |
| delivered (4) | failed (3) | 3 > 4 ✗ | Keep delivered |
| delivered (4) | undelivered (3) | 3 > 4 ✗ | Keep delivered |
| failed (3) | delivered (4) | 4 > 3 ✓ | Update to delivered |

---

## IMPROVEMENT 4: TRACK ACTUAL FROM-NUMBER

### 4.1 Problem

Currently storing placeholder when using messaging service:
```javascript
from_number: sendParams.from || 'via_messaging_service'
```

### 4.2 Fixed: Use Twilio Response

```javascript
async function sendSMS(organizationId, to, body, conversationId) {
  // ... send params logic ...
  
  const message = await twilioClient.messages.create({
    body,
    to,
    ...sendParams,
    statusCallback: `${process.env.TWILIO_WEBHOOK_BASE_URL}/api/twilio/sms/status`
  });
  
  // Record outbound message with ACTUAL from number from Twilio response
  await db.nevermiss_messages.create({
    conversation_id: conversationId,
    direction: 'outbound',
    content: body,
    twilio_sid: message.sid,
    status: 'queued',
    from_number: message.from,  // Twilio tells us which number was used
    to_number: to,
    created_at: new Date()
  });
  
  return { success: true, sid: message.sid, from: message.from };
}
```

---

## IMPROVEMENT 5: USE TIMESTAMPTZ

### 5.1 Problem

`TIMESTAMP` without timezone can cause issues with daylight savings.

### 5.2 Fixed: Use TIMESTAMPTZ for All Time Fields

```sql
-- Calendar holds
ALTER TABLE calendar_slot_holds
  ALTER COLUMN slot_start TYPE TIMESTAMPTZ,
  ALTER COLUMN slot_end TYPE TIMESTAMPTZ,
  ALTER COLUMN held_at TYPE TIMESTAMPTZ,
  ALTER COLUMN expires_at TYPE TIMESTAMPTZ,
  ALTER COLUMN confirmed_at TYPE TIMESTAMPTZ,
  ALTER COLUMN released_at TYPE TIMESTAMPTZ,
  ALTER COLUMN created_at TYPE TIMESTAMPTZ;

-- Messages
ALTER TABLE nevermiss_messages
  ALTER COLUMN created_at TYPE TIMESTAMPTZ,
  ALTER COLUMN delivered_at TYPE TIMESTAMPTZ,
  ALTER COLUMN status_updated_at TYPE TIMESTAMPTZ;

-- Events
ALTER TABLE nevermiss_events
  ALTER COLUMN created_at TYPE TIMESTAMPTZ,
  ALTER COLUMN processed_at TYPE TIMESTAMPTZ;

-- Conversations
ALTER TABLE nevermiss_conversations
  ALTER COLUMN created_at TYPE TIMESTAMPTZ,
  ALTER COLUMN last_customer_message_at TYPE TIMESTAMPTZ,
  ALTER COLUMN abandoned_at TYPE TIMESTAMPTZ,
  ALTER COLUMN blocked_at TYPE TIMESTAMPTZ;

-- Notification queue
ALTER TABLE notification_queue
  ALTER COLUMN scheduled_for TYPE TIMESTAMPTZ,
  ALTER COLUMN sent_at TYPE TIMESTAMPTZ,
  ALTER COLUMN created_at TYPE TIMESTAMPTZ;
```

### 5.3 For New Tables

Always use `TIMESTAMPTZ`:
```sql
created_at TIMESTAMPTZ DEFAULT NOW()
```

---

## COMPLETE MIGRATION SCRIPT (v6.4.2)

```sql
-- ============================================
-- v6.4.2 Migration
-- Run this after v6.4.1 is deployed
-- ============================================

-- 1. Remove twilio_sid column-level unique constraint
ALTER TABLE nevermiss_events
  DROP CONSTRAINT IF EXISTS nevermiss_events_twilio_sid_key;

-- Add regular index for lookup
CREATE INDEX IF NOT EXISTS idx_nevermiss_events_twilio_sid
ON nevermiss_events(twilio_sid);

-- 2. Ensure partial unique indexes exist (from v6.4.1)
DROP INDEX IF EXISTS uniq_sms_status_event;
CREATE UNIQUE INDEX uniq_sms_status_event
ON nevermiss_events(twilio_sid, event_type, status)
WHERE event_type = 'sms_status';

DROP INDEX IF EXISTS uniq_other_events;
CREATE UNIQUE INDEX uniq_other_events
ON nevermiss_events(twilio_sid, event_type)
WHERE event_type != 'sms_status';

-- 3. Calendar hold index (already correct from v6.4.1)
DROP INDEX IF EXISTS uniq_active_slot_hold;
CREATE UNIQUE INDEX uniq_active_slot_hold
ON calendar_slot_holds(organization_id, slot_start)
WHERE status = 'held';

-- 4. Add to_number column to messages (for completeness)
ALTER TABLE nevermiss_messages
  ADD COLUMN IF NOT EXISTS to_number VARCHAR(50);

-- 5. Convert to TIMESTAMPTZ (safe — Postgres handles conversion)
ALTER TABLE calendar_slot_holds
  ALTER COLUMN slot_start TYPE TIMESTAMPTZ,
  ALTER COLUMN slot_end TYPE TIMESTAMPTZ,
  ALTER COLUMN held_at TYPE TIMESTAMPTZ,
  ALTER COLUMN expires_at TYPE TIMESTAMPTZ,
  ALTER COLUMN confirmed_at TYPE TIMESTAMPTZ,
  ALTER COLUMN released_at TYPE TIMESTAMPTZ,
  ALTER COLUMN created_at TYPE TIMESTAMPTZ;

ALTER TABLE nevermiss_messages
  ALTER COLUMN created_at TYPE TIMESTAMPTZ,
  ALTER COLUMN delivered_at TYPE TIMESTAMPTZ,
  ALTER COLUMN status_updated_at TYPE TIMESTAMPTZ;

ALTER TABLE nevermiss_events
  ALTER COLUMN created_at TYPE TIMESTAMPTZ,
  ALTER COLUMN processed_at TYPE TIMESTAMPTZ;

ALTER TABLE notification_queue
  ALTER COLUMN scheduled_for TYPE TIMESTAMPTZ,
  ALTER COLUMN sent_at TYPE TIMESTAMPTZ,
  ALTER COLUMN created_at TYPE TIMESTAMPTZ;

-- ============================================
-- Verification queries
-- ============================================

-- Verify no column-level unique on twilio_sid
SELECT conname FROM pg_constraint 
WHERE conrelid = 'nevermiss_events'::regclass 
  AND conname LIKE '%twilio_sid%';
-- Should return empty

-- Verify partial unique indexes exist
SELECT indexname FROM pg_indexes 
WHERE tablename = 'nevermiss_events' 
  AND indexname LIKE 'uniq_%';
-- Should show: uniq_sms_status_event, uniq_other_events

-- Verify TIMESTAMPTZ conversion
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'calendar_slot_holds' 
  AND column_name IN ('slot_start', 'expires_at');
-- Should show: timestamp with time zone
```

---

## UPDATED TESTING CHECKLIST (v6.4.2)

```
EVENTS TABLE CONSTRAINTS:
□ Column-level UNIQUE on twilio_sid REMOVED
□ Regular index on twilio_sid EXISTS (for lookups)
□ Partial unique index uniq_sms_status_event EXISTS
□ Partial unique index uniq_other_events EXISTS
□ Multiple status events per MessageSid can be inserted

CALENDAR HOLDS:
□ ON CONFLICT DO NOTHING handles race condition
□ Empty RETURNING = slot_unavailable
□ Concurrent requests don't crash
□ Stale holds expired before insert attempt

STATUS PRIORITY:
□ delivered has priority 4 (highest)
□ failed/undelivered have priority 3
□ Comparison uses > (strict), not >=
□ delivered cannot be overwritten by failed
□ failed CAN be overwritten by delivered

FROM-NUMBER TRACKING:
□ message.from from Twilio response stored
□ No more 'via_messaging_service' placeholder
□ to_number also stored

TIMESTAMPTZ:
□ All time columns are TIMESTAMPTZ
□ Daylight savings transitions handled correctly
□ UTC storage, local display works
```

---

## VERSION HISTORY

| Version | Date | Focus |
|---------|------|-------|
| 6.0 | Dec 2025 | NeverMiss basic integration |
| 6.1 | Dec 2025 | Full AI spec, onboarding |
| 6.2 | Dec 2025 | Webhook reliability, compliance |
| 6.3 | Dec 2025 | Production hardening |
| 6.4 | Dec 2025 | Ship checklist fixes |
| 6.4.1 | Dec 2025 | 6 critical micro-fixes |
| **6.4.2** | **Dec 2025** | **FINAL: Production gotchas resolved** |

---

## SHIP READINESS CONFIRMATION (v6.4.2)

✅ `twilio_sid UNIQUE` constraint removed from nevermiss_events  
✅ Calendar hold race condition handled with `ON CONFLICT DO NOTHING`  
✅ Status priority: delivered (4) > failed/undelivered (3), strict `>` comparison  
✅ Actual from-number tracked from Twilio response  
✅ All time columns use `TIMESTAMPTZ`  
✅ All previous v6.x fixes included  

---

## COMPLETE DOCUMENT SUITE

| Document | Version | Status |
|----------|---------|--------|
| **TradesCaptain_CRM_Update_Prompt_v6_4_2_FINAL.md** | 6.4.2 | ✅ SHIP |
| NEVERMISS_AI_CONVERSATION_SPEC.md | Updated | ✅ |
| NEVERMISS_ONBOARDING_SPEC.md | 1.1 | ✅ |
| NEVERMISS_SUPPORT_TROUBLESHOOTING_GUIDE.md | 1.4 | ✅ |
| NEVERMISS_DEMO_SCRIPT_SALES.md | 1.0 | ✅ |
| NEVERMISS_ROI_CALCULATOR_SPEC.md | 1.0 | ✅ |
| TradesCaptain_Website_Addon_NeverMiss.md | Updated | ✅ |

---

**This spec is production-ready.** 🚀