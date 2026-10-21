# NeverMiss Support & Troubleshooting Guide

**Version:** 1.5  
**Date:** December 2025  
**Audience:** Support Team, Sales Reps, Internal Staff  
**CRM Spec Version:** v6.4.2

---

## Table of Contents

1. [Common Issues & Quick Fixes](#1-common-issues--quick-fixes)
2. [Setup Problems](#2-setup-problems)
3. [Call & SMS Issues](#3-call--sms-issues)
4. [AI Conversation Issues](#4-ai-conversation-issues)
5. [Notification Issues](#5-notification-issues)
6. [Billing & Account Issues](#6-billing--account-issues)
7. [Escalation Paths](#7-escalation-paths)
8. [Customer FAQ Scripts](#8-customer-faq-scripts)

---

## 1. Common Issues & Quick Fixes

### Quick Reference Table

| Issue | First Thing to Check | Quick Fix |
|-------|---------------------|-----------|
| "Texts not sending" | Twilio status | Check status.twilio.com |
| "Calls not forwarding" | Forward-to number | Verify number in settings |
| "Didn't get notification" | Notification settings | Check email spam, verify phone |
| "AI said something wrong" | Conversation log | Flag for prompt review |
| "Can't log in" | Email/password | Send password reset |
| "Number not working" | Account status | Check billing status |

### Status Page

Always check first: **status.twilio.com** and **status.anthropic.com**

If either shows an incident, that's likely the cause. Note the incident ID for the customer.

---

## 2. Setup Problems

### 2.1 Number Not Provisioned

**Symptom:** Customer signed up but no phone number assigned

**Check:**
1. Payment successful? (Stripe dashboard)
2. Provisioning job ran? (Admin → Provisioning Logs)
3. Area code available? (Twilio console)

**Fix:**
```sql
-- Check provisioning status
SELECT * FROM nevermiss_settings WHERE organization_id = 'xxx';

-- If phone_number is NULL, manually trigger:
SELECT provision_nevermiss_number('org_id', 'preferred_area_code');
```

**If No Numbers Available:**
1. Try adjacent area codes
2. Contact customer with options:
   > "We couldn't find a number in your area code (XXX). Would you prefer (YYY) which is nearby, or a different area code?"

---

### 2.2 Forwarding Not Working

**Symptom:** Calls to NeverMiss number don't ring customer's phone

**Check:**
1. Is `forward_to` number correct?
2. Is customer's phone on and has service?
3. Is carrier blocking forwarded calls?

**Debug Steps:**
1. Look up call in Twilio Console → Calls → [Call SID]
2. Check call status: `completed`, `no-answer`, `busy`, `failed`
3. If `failed`, check error code

**Common Error Codes:**

| Code | Meaning | Fix |
|------|---------|-----|
| 21211 | Invalid phone number | Verify forward_to number format |
| 21214 | Cannot route to number | Carrier issue, try different number |
| 21610 | Recipient blocked sender | Customer needs to unblock |
| 30003 | Unreachable | Phone off or no service |

**Fix:**
```sql
-- Update forward-to number
UPDATE nevermiss_settings 
SET forward_to = '+1XXXXXXXXXX' 
WHERE organization_id = 'xxx';
```

---

### 2.3 Customer Stuck on Setup Wizard

**Symptom:** Customer can't get past a setup step

**Check:**
1. Which step are they on? (Admin → Onboarding Progress)
2. Any error messages in browser console?

**Force Complete Setup:**
```sql
-- Mark setup complete (use sparingly)
UPDATE onboarding_progress 
SET setup_complete = true, 
    current_step = 7 
WHERE organization_id = 'xxx';
```

---

## 3. Call & SMS Issues

### 3.1 Missed Call Not Triggering Text

**Symptom:** Customer missed a call but no text was sent

**Check:**
1. Did call actually go to NeverMiss number? (Twilio logs)
2. Was call duration long enough? (must ring 15+ seconds)
3. Did owner answer the forwarded call?

**Debug:**
```sql
-- Find the call record
SELECT * FROM call_logs 
WHERE to_number = '+1NEVERMISSNUMBER' 
ORDER BY created_at DESC 
LIMIT 10;

-- Check if conversation was created
SELECT * FROM nevermiss_conversations 
WHERE organization_id = 'xxx' 
ORDER BY created_at DESC 
LIMIT 10;
```

**Common Causes:**
- Owner answered → No text sent (correct behavior)
- Call < 15 seconds → Treated as hangup, no text
- Voicemail picked up on owner's phone → Check ring duration setting
- Twilio webhook failed → Check webhook logs

---

### 3.2 SMS Not Delivering

**Symptom:** AI sent text but customer didn't receive

**Check:**
1. SMS status in Twilio Console: `delivered`, `undelivered`, `failed`
2. Error code if failed

**Common SMS Errors:**

| Code | Meaning | Fix |
|------|---------|-----|
| 30003 | Unreachable | Customer phone off or no service |
| 30004 | Blocked | Customer blocked the number |
| 30005 | Unknown destination | Invalid phone number |
| 30006 | Landline | Can't send SMS to landline |
| 30007 | Carrier violation | Content filtered (rare) |
| 21610 | Opt-out | Customer texted STOP |

**If Opted Out:**
```sql
-- Check suppression list (replaces old opt-out check)
SELECT * FROM sms_suppression_list 
WHERE phone = '+1XXXXXXXXXX' AND is_active = true;

-- Customer must text START to re-enable
-- If they want to re-enable via support:
UPDATE sms_suppression_list 
SET is_active = false, unsuppressed_at = NOW()
WHERE phone = '+1XXXXXXXXXX' AND organization_id = 'xxx';
```

**Compliance Keywords (handled automatically by system):**
- **STOP/UNSUBSCRIBE/CANCEL** → Adds to suppression list, sends confirmation
- **HELP/INFO** → Sends compliance message with business name and opt-out instructions  
- **START/YES/UNSTOP** → Removes from suppression list, sends confirmation

---

### 3.3 Wrong Number Showing on Caller ID

**Symptom:** When NeverMiss texts customer, wrong number appears

**Check:**
1. Is the organization's NeverMiss number correct?
2. Are there multiple numbers on the account?

**Fix:**
- Verify `phone_number` in `nevermiss_settings` table
- If multi-user, check which user's number is sending

---

### 3.4 Duplicate Messages Being Sent

**Symptom:** Customer receives the same text multiple times

**Check:**
1. Twilio webhook retrying due to error?
2. Idempotency check failing?

**Debug:**
```sql
-- Check for duplicate events with same MessageSid
SELECT twilio_sid, COUNT(*) 
FROM nevermiss_events 
WHERE conversation_id = 'xxx' 
GROUP BY twilio_sid 
HAVING COUNT(*) > 1;

-- Check if events are being processed multiple times
SELECT twilio_sid, processed, processed_at 
FROM nevermiss_events 
WHERE conversation_id = 'xxx'
ORDER BY created_at;
```

**Common Causes:**
- Webhook handler timing out (Twilio retries)
- Database transaction not committing before response
- Missing unique constraint on twilio_sid

---

### 3.5 Webhook Signature Validation Failing

**Symptom:** All Twilio requests returning 403 Forbidden

**Check:**
1. Is TWILIO_AUTH_TOKEN correct in environment?
2. Is webhook URL exactly matching what's configured in Twilio?
3. Is there a proxy/load balancer modifying the request?

**Fix:**
- Verify auth token in Twilio console
- Check WEBHOOK_BASE_URL matches exactly (including https vs http)
- If behind proxy, ensure original headers are preserved
- Ensure raw body is captured before JSON parsing (v6.3 requirement)

---

### 3.6 SMS Delivery Failures

**Symptom:** Messages showing as `failed` or `undelivered` in logs

**Check:**
```sql
-- Check message delivery status
SELECT twilio_sid, status, error_code, created_at, delivered_at
FROM nevermiss_messages
WHERE conversation_id = 'xxx'
ORDER BY created_at;

-- Check recent delivery failures (org-wide)
SELECT * FROM sms_delivery_failures
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

**Common Error Codes:**
| Code | Meaning | Fix |
|------|---------|-----|
| 30003 | Unreachable | Customer phone off or no service |
| 30004 | Blocked | Customer blocked the number |
| 30005 | Unknown destination | Invalid phone number |
| 30006 | Landline | Can't SMS landlines |
| 30007 | Carrier violation | Content filtered (spam) |
| 21610 | Unsubscribed | Customer texted STOP |

**If seeing high failure rate (10+ in 1 hour):**
- Check Twilio status page
- Check 10DLC campaign status
- Review recent message content for spam triggers

**Note on Status Priority (v6.4.2):**
Status updates follow priority: queued (1) → sent (2) → failed/undelivered (3) → delivered (4). 
Once a message reaches `delivered`, it cannot be overwritten by later `failed` callbacks.

---

## 4. AI Conversation Issues

### 4.1 AI Not Responding

**Symptom:** Customer texts back but AI doesn't reply

**Check:**
1. Anthropic API status (status.anthropic.com)
2. Conversation state (is it in a terminal state like `completed`, `opted_out`, `blocked_spam`?)
3. SMS usage limit hit?
4. Is customer on suppression list?

**Debug:**
```sql
-- Check conversation state
SELECT state, lead_status FROM nevermiss_conversations 
WHERE caller_phone = '+1CUSTOMERPHONE' 
ORDER BY created_at DESC;

-- Check if customer is suppressed
SELECT * FROM sms_suppression_list
WHERE phone = '+1CUSTOMERPHONE' AND is_active = true;

-- Check for API errors
SELECT * FROM ai_api_logs 
WHERE conversation_id = 'xxx' 
ORDER BY created_at DESC;

-- Check message events
SELECT * FROM nevermiss_events
WHERE conversation_id = 'xxx'
ORDER BY created_at DESC;
```

**Common Causes:**
- Conversation in terminal state (completed, opted_out, blocked_spam)
- Customer previously texted STOP (check suppression list)
- Conversation timed out (30 min since last message)
- Max messages reached (10)
- AI API rate limit or error
- Invalid JSON response from AI (check ai_api_logs)

---

### 4.2 AI Said Something Wrong/Weird

**Symptom:** AI gave incorrect, confusing, or inappropriate response

**Immediate Action:**
1. Screenshot or copy the conversation
2. Flag in admin: Admin → AI Issues → Report

**Common Issues:**

| Issue | Likely Cause | Fix |
|-------|--------------|-----|
| Wrong business name | Settings not loaded | Check nevermiss_settings |
| Offered wrong services | Services list outdated | Update services_offered |
| Wrong tone | Tone setting mismatch | Check tone setting |
| Hallucinated info | Prompt issue | Flag for prompt review |
| Gave a price | Prompt violation | Flag for prompt review |

**To Review Full Conversation:**
```sql
SELECT conversation_json FROM nevermiss_conversations 
WHERE id = 'xxx';
```

---

### 4.3 AI Stuck in Loop

**Symptom:** AI keeps asking the same question

**Fix:**
```sql
-- Force end the conversation
UPDATE nevermiss_conversations 
SET state = 'completed', 
    lead_status = 'incomplete' 
WHERE id = 'xxx';
```

Then manually notify owner about the lead.

---

### 4.4 Emergency Not Detected

**Symptom:** Customer said "flooding" but wasn't flagged as emergency

**Check:**
1. Were emergency keywords configured?
2. Was the keyword spelled correctly in message?
3. Was notification actually sent?

```sql
-- Check emergency keywords for org
SELECT emergency_keywords FROM nevermiss_settings 
WHERE organization_id = 'xxx';

-- Check if flagged
SELECT urgency FROM nevermiss_conversations 
WHERE id = 'xxx';
```

---

### 4.5 Conversation Blocked Due to Abuse

**Symptom:** Conversation shows `blocked_spam` state, customer getting no responses

**This happens when:**
- More than 20 messages in 1 hour (rate limit)
- More than 5 messages in 1 minute (burst)
- Harassment keywords detected (threats, profanity)
- Repeated empty or emoji-only messages
- Spam patterns (repeated characters, URLs)

**Check:**
```sql
-- See why conversation was blocked
SELECT state, blocked_reason, blocked_at FROM nevermiss_conversations 
WHERE id = 'xxx';

-- Check if number is on suppression list
SELECT * FROM sms_suppression_list
WHERE phone = '+1CUSTOMERPHONE' AND is_active = true;
```

**To Unblock (if false positive):**
1. Verify it was a false positive by reviewing conversation
2. Remove from suppression list:
```sql
UPDATE sms_suppression_list 
SET is_active = false, unsuppressed_at = NOW()
WHERE phone = '+1CUSTOMERPHONE' AND organization_id = 'xxx';
```
3. Reset conversation state if needed:
```sql
UPDATE nevermiss_conversations 
SET state = 'awaiting_owner', blocked_reason = NULL, blocked_at = NULL
WHERE id = 'xxx';
```

---

### 4.6 AI Handoff Due to Failures

**Symptom:** Conversation ended early with `handoff_reason = 'ai_failure'`

**This happens when:** AI JSON parsing fails twice in a row

**Check:**
```sql
-- Check failure count and handoff reason
SELECT ai_failure_count, handoff_reason, state FROM nevermiss_conversations 
WHERE id = 'xxx';

-- Check AI logs for errors
SELECT * FROM ai_api_logs 
WHERE conversation_id = 'xxx' 
ORDER BY created_at DESC;
```

**Action:** Owner was already notified with "Manual follow-up required." Review AI logs to identify if this is a recurring issue that needs engineering attention.

---

## 5. Notification Issues

### 5.1 Owner Not Getting Notifications

**Symptom:** Lead captured but owner didn't get SMS/email/push

**Check:**
1. Correct contact info in settings?
2. Is it quiet hours?
3. Check spam folder (email)
4. Check blocked numbers (SMS)

```sql
-- Check notification settings
SELECT * FROM owner_notification_settings 
WHERE organization_id = 'xxx';

-- Check notification log
SELECT * FROM notification_logs 
WHERE organization_id = 'xxx' 
ORDER BY created_at DESC;
```

**Common Causes:**
- Wrong email/phone in settings
- Quiet hours active (check timezone!)
- Email in spam/promotions folder
- SMS marked as spam by carrier
- Push notifications disabled on phone

---

### 5.2 Too Many Notifications

**Symptom:** Owner getting duplicate or excessive notifications

**Check:**
1. Are multiple channels enabled?
2. Is there a bug causing duplicates?

```sql
-- Check for duplicate notifications
SELECT * FROM notification_logs 
WHERE conversation_id = 'xxx' 
ORDER BY created_at;
```

---

### 5.3 Notifications Delayed

**Symptom:** Notification arrived minutes after the text conversation

**Check:**
1. Notification queue backed up?
2. Email service delays? (check Resend dashboard)
3. Push service delays? (check Firebase)

**Normal Latency:**
- SMS: < 5 seconds
- Email: < 30 seconds
- Push: < 10 seconds

If consistently slower, check queue depth and worker health.

---

## 6. Billing & Account Issues

### 6.1 Can't Access Account

**Symptom:** Customer can't log in

**Check:**
1. Correct email?
2. Password reset?
3. Account suspended for non-payment?

```sql
-- Check account status
SELECT status, billing_status FROM organizations 
WHERE id = 'xxx';
```

**Fix:**
- Send password reset: Admin → Users → [Email] → Reset Password
- If suspended, check Stripe for failed payments

---

### 6.2 SMS Limit Reached

**Symptom:** Customer hit 80/100/150% SMS limit

**What Happens:**
- 80%: Email sent, service continues
- 100%: Email sent, service continues
- 150%: Flagged for outreach, service continues
- We NEVER cut off service

**Action:**
- Check usage: Admin → [Customer] → SMS Usage
- If consistently over, suggest upgrade or +User add-on

---

### 6.3 Billing Failed

**Symptom:** Payment didn't go through

**Check Stripe Dashboard:**
1. Find customer
2. Check latest invoice status
3. Check payment method status

**Common Fixes:**
- Update card on file
- Retry payment after card update
- If persistent, switch to annual (one payment)

---

### 6.4 Customer Wants to Cancel

**Before Processing:**
1. Ask why they're canceling
2. Offer solutions:
   - "Not using it?" → Offer setup help
   - "Too expensive?" → Offer FIRST50 for next month
   - "Not working?" → Troubleshoot the issue
   - "Switching to competitor?" → Ask which one, note feedback

**To Cancel:**
1. Admin → [Customer] → Cancel Subscription
2. Number retained for 60 days in case they return
3. Data deleted after 60 days

---

## 7. Escalation Paths

### Tier 1: Support Rep

**Handles:**
- Password resets
- Basic settings changes
- FAQ questions
- Simple troubleshooting

**Escalates When:**
- Issue requires database changes
- Customer is frustrated/angry
- Technical issue not in this guide
- Billing disputes

---

### Tier 2: Senior Support

**Handles:**
- Database queries and fixes
- Complex troubleshooting
- Billing adjustments
- Customer retention calls

**Escalates When:**
- System-wide outage suspected
- AI prompt changes needed
- Refund > $100 requested
- Legal/compliance issue

---

### Tier 3: Engineering

**Handles:**
- System outages
- Bug fixes
- AI prompt updates
- Infrastructure issues

**Contact:**
- Slack: #eng-support
- PagerDuty: For P0/P1 outages only

---

### Escalation Contacts

| Role | Name | Contact | When to Use |
|------|------|---------|-------------|
| Support Lead | [Name] | [email] | Customer escalations |
| Engineering On-Call | Rotation | PagerDuty | Outages only |
| Product | [Name] | [email] | Feature requests, AI issues |
| Billing | [Name] | [email] | Refunds > $100 |

---

## 8. Customer FAQ Scripts

### "How does NeverMiss work?"

> "When someone calls your NeverMiss number and you can't answer, we text them back within 3 seconds. Our AI has a conversation to find out what they need, their address, and when they're available. Then you get a notification with all the details so you can call them back."

---

### "Will customers know it's AI?"

> "The AI speaks as your business — it says things like 'Sorry I missed your call, I'm with a customer.' Most people just think it's you texting them back. And you can customize the greeting and tone to match your style."

---

### "What if someone sends something inappropriate?"

> "The AI is trained to stay professional and end conversations that become inappropriate. You can also block specific numbers from your dashboard."

---

### "Can I see the conversations?"

> "Yes! Every conversation is saved in your dashboard. You can see exactly what was said, and you get the full transcript in your notification."

---

### "What happens when I run out of SMS?"

> "We never cut you off. If you go over your limit, the AI keeps working and we'll reach out about adding more SMS or upgrading. Your leads are too important to lose."

---

### "Can I change my number?"

> "We can provision a new number, but you'd need to update anywhere you've listed the old one (truck, cards, Google listing, etc.). Is there an issue with your current number?"

---

### "I want to cancel"

> "I'm sorry to hear that. Can I ask what's not working? We might be able to fix it. [Listen, then offer solutions or process cancellation]"

---

### "How do I get help?"

> "You can reply to any email from us, use the chat in your dashboard, or call us at [support number]. We're here to help!"

---

## Appendix: Admin Dashboard Reference

### Key Admin Screens

| Screen | Path | Purpose |
|--------|------|---------|
| Customer Lookup | Admin → Customers | Find customer by name/email/phone |
| Conversation Logs | Admin → Conversations | View all AI conversations |
| Call Logs | Admin → Calls | View Twilio call records |
| SMS Logs | Admin → SMS | View sent/received messages |
| Notification Logs | Admin → Notifications | View sent notifications |
| Provisioning Logs | Admin → Provisioning | View number provisioning |
| AI Issues | Admin → AI Issues | Flagged conversation problems |
| Billing | Admin → Billing | Stripe integration status |

### Quick Queries

```sql
-- Find customer by phone
SELECT o.*, ns.phone_number, ns.forward_to 
FROM organizations o
JOIN nevermiss_settings ns ON o.id = ns.organization_id
WHERE ns.phone_number LIKE '%5551234%' 
   OR ns.forward_to LIKE '%5551234%';

-- Recent conversations for customer
SELECT id, state, lead_status, service_needed, urgency, 
       ai_failure_count, handoff_reason, blocked_reason,
       address_raw, caller_address, address_confidence,
       created_at
FROM nevermiss_conversations 
WHERE organization_id = 'xxx' 
ORDER BY created_at DESC 
LIMIT 20;

-- View conversation messages (v6.2+)
SELECT direction, content, status, error_code, 
       from_number, to_number, 
       created_at, delivered_at, status_updated_at
FROM nevermiss_messages
WHERE conversation_id = 'xxx'
ORDER BY created_at;

-- Check SMS usage
SELECT * FROM sms_usage 
WHERE organization_id = 'xxx' 
ORDER BY period_start DESC;

-- Check suppression list
SELECT * FROM sms_suppression_list
WHERE organization_id = 'xxx' AND is_active = true;

-- View webhook events (v6.2+)
SELECT event_type, twilio_sid, status, processed, created_at
FROM nevermiss_events 
WHERE organization_id = 'xxx' 
ORDER BY created_at DESC 
LIMIT 20;

-- View AI errors
SELECT * FROM ai_api_logs 
WHERE status = 'error' 
ORDER BY created_at DESC 
LIMIT 20;

-- Check calendar holds (Blue Pro+ only)
SELECT * FROM calendar_slot_holds
WHERE organization_id = 'xxx' AND status = 'held'
ORDER BY slot_start;

-- Daily metrics
SELECT date, missed_calls, leads_captured, estimated_revenue_saved
FROM nevermiss_daily_metrics
WHERE organization_id = 'xxx'
ORDER BY date DESC
LIMIT 30;

-- Check SMS delivery failures (v6.3+)
SELECT * FROM sms_delivery_failures
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- Find conversation by session key (v6.3+)
SELECT * FROM nevermiss_conversations
WHERE session_key = 'abc123...';

-- Check 10DLC registration status (v6.3+)
SELECT * FROM org_10dlc_registration
WHERE organization_id = 'xxx';

-- Check notification queue (v6.4+)
SELECT * FROM notification_queue
WHERE organization_id = 'xxx' AND status = 'pending'
ORDER BY scheduled_for;

-- Check for orphaned status events (v6.4+)
SELECT * FROM nevermiss_events
WHERE event_type = 'sms_status' 
  AND processed = false
  AND created_at < NOW() - INTERVAL '5 minutes';
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Dec 2025 | Initial guide |
| 1.1 | Dec 2025 | Added v6.2 tables, webhook debugging |
| 1.2 | Dec 2025 | Added v6.3 abuse detection, AI handoff |
| 1.3 | Dec 2025 | Added v6.4 queries: notification queue, address_raw, orphaned events |
| 1.4 | Dec 2025 | v6.4.1: Fixed address column names (caller_address not renamed) |
| 1.5 | Dec 2025 | v6.4.2: Added to_number column, TIMESTAMPTZ notes, status priority |