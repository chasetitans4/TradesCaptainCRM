# Twilio SMS & Phone Integration - Implementation Guide

## Overview

Add complete Twilio SMS and phone number integration to Trades Captain CRM. Each business gets a dedicated local phone number. The system supports two-way SMS with customers, AI auto-responses, and call tracking.

---

## Business Requirements

### Phone Numbers
- Each business gets ONE dedicated local phone number (included in Pro plan)
- Number is provisioned automatically during onboarding OR from settings
- Multi-location add-on ($249/mo) includes additional numbers per location
- Numbers should match business area code when possible

### SMS Features
- **Two-way messaging**: Send and receive SMS with customers
- **AI Auto-responses**: GPT-powered responses during business hours (Pro feature)
- **Quiet hours**: AI only responds 8 AM - 8 PM local time
- **2-hour exception**: If customer initiates, AI can respond within 2 hours even in quiet hours
- **Appointment reminders**: Automated SMS before scheduled jobs
- **Templates**: Pre-saved message templates for common responses

### Call Tracking
- Log inbound/outbound calls with duration
- Link calls to customers automatically by phone number
- Optional: Call recording (future feature)

---

## Tech Stack for Integration

```
Twilio SMS API - Programmable Messaging
Twilio Phone Numbers API - Number provisioning
OpenAI GPT-4 - AI auto-responses
Next.js API Routes - Webhook handlers
Supabase - Message storage, conversation tracking
```

---

## Environment Variables Needed

Add these to `.env.local`:

```env
# Twilio
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_MESSAGING_SERVICE_SID=your_messaging_service_sid

# OpenAI (for AI SMS)
OPENAI_API_KEY=your_openai_key

# Webhook URL (your deployed domain)
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

---

## Database Schema Updates

Add these tables/columns to the existing schema:

```sql
-- Add phone number to businesses table
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS twilio_phone_number TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS twilio_phone_sid TEXT;

-- AI SMS Settings (already partially exists, ensure these columns)
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS ai_sms_enabled BOOLEAN DEFAULT false;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS ai_sms_quiet_start TIME DEFAULT '20:00';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS ai_sms_quiet_end TIME DEFAULT '08:00';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS ai_sms_knowledge_base TEXT; -- Custom business info for AI
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS ai_sms_tone TEXT DEFAULT 'professional'; -- professional, friendly, casual

-- SMS Templates
CREATE TABLE IF NOT EXISTS sms_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT, -- 'appointment', 'follow_up', 'quote', 'invoice', 'general'
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update sms_messages table
ALTER TABLE sms_messages ADD COLUMN IF NOT EXISTS twilio_sid TEXT;
ALTER TABLE sms_messages ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'sent'; -- sent, delivered, failed, received
ALTER TABLE sms_messages ADD COLUMN IF NOT EXISTS is_ai_response BOOLEAN DEFAULT false;
ALTER TABLE sms_messages ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Scheduled Messages (for appointment reminders)
CREATE TABLE IF NOT EXISTS scheduled_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  content TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, sent, cancelled, failed
  sent_at TIMESTAMPTZ,
  twilio_sid TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE sms_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own business templates" ON sms_templates
  FOR ALL USING (business_id IN (SELECT business_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can view own business scheduled messages" ON scheduled_messages
  FOR ALL USING (business_id IN (SELECT business_id FROM users WHERE id = auth.uid()));
```

---

## Files to Create

### 1. Twilio Service Library

**`/lib/twilio/client.ts`**
```typescript
import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;

export const twilioClient = twilio(accountSid, authToken);

export const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID!;
```

**`/lib/twilio/sms.ts`**
- `sendSMS(to: string, body: string, businessId: string)` - Send SMS and log to database
- `getConversation(phoneNumber: string, businessId: string)` - Get or create conversation
- `formatPhoneE164(phone: string)` - Format to E.164 (+1XXXXXXXXXX)

**`/lib/twilio/phone-numbers.ts`**
- `provisionPhoneNumber(areaCode: string, businessId: string)` - Buy and assign number
- `releasePhoneNumber(phoneSid: string)` - Release number
- `listAvailableNumbers(areaCode: string)` - Search available numbers

**`/lib/twilio/ai-responder.ts`**
- `generateAIResponse(message: string, businessContext: object)` - GPT-4 response
- `shouldAutoRespond(businessId: string)` - Check quiet hours
- `getBusinessContext(businessId: string)` - Get AI knowledge base

---

### 2. API Routes (Webhooks)

**`/app/api/webhooks/twilio/sms/route.ts`**
Handles incoming SMS from Twilio:
```typescript
// POST handler for incoming SMS
// 1. Verify Twilio signature
// 2. Find or create customer by phone
// 3. Find or create conversation
// 4. Save incoming message
// 5. Check if AI should respond
// 6. If yes, generate and send AI response
// 7. Return TwiML response
```

**`/app/api/webhooks/twilio/status/route.ts`**
Handles message status callbacks:
```typescript
// POST handler for delivery status
// Update message status (delivered, failed, etc.)
```

**`/app/api/webhooks/twilio/voice/route.ts`** (optional, for call tracking)
```typescript
// POST handler for incoming calls
// Log call, return TwiML (voicemail or forward)
```

---

### 3. Server Actions / API Routes

**`/app/api/sms/send/route.ts`**
```typescript
// POST: Send SMS from the app
// Body: { to: string, message: string, customerId?: string, jobId?: string }
// - Validate user has permission
// - Send via Twilio
// - Log to database
// - Return message ID
```

**`/app/api/sms/conversations/route.ts`**
```typescript
// GET: List conversations for business
// Returns conversations with last message, unread count
```

**`/app/api/sms/conversations/[id]/messages/route.ts`**
```typescript
// GET: Get messages for a conversation
// POST: Send new message in conversation
```

**`/app/api/phone/provision/route.ts`**
```typescript
// POST: Provision new phone number for business
// Body: { areaCode: string }
// - Check business doesn't already have number
// - Search available numbers
// - Purchase number
// - Configure webhooks
// - Save to business record
```

**`/app/api/phone/available/route.ts`**
```typescript
// GET: Search available phone numbers
// Query: ?areaCode=512
// Returns list of available numbers
```

---

### 4. UI Pages to Create

**`/app/(dashboard)/messages/[id]/page.tsx`** - Conversation Detail
- Chat-style message UI (bubbles)
- Incoming messages on left (gray), outgoing on right (blue)
- AI responses marked with bot icon
- Input field with send button at bottom
- Quick actions: Call customer, View customer profile
- Message status indicators (sent, delivered, failed)
- Load more / infinite scroll for history

**`/app/(dashboard)/settings/phone/page.tsx`** - Phone Number Settings
- Show current business phone number
- If no number: Button to provision one
- Area code selector before provisioning
- Option to release/change number (with warning)

**`/app/(dashboard)/settings/ai-sms/page.tsx`** - AI SMS Settings
- Toggle AI auto-responses on/off
- Set quiet hours (start/end time pickers)
- Set AI tone (professional, friendly, casual)
- Knowledge base textarea (business info for AI)
- Test AI response button
- View AI response history/stats

**`/app/(dashboard)/settings/sms-templates/page.tsx`** - Message Templates
- List of saved templates
- Create/edit/delete templates
- Categories: appointment, follow_up, quote, invoice, general
- Variable placeholders: {{customer_name}}, {{job_date}}, {{business_name}}

**Update `/app/(dashboard)/messages/page.tsx`**
- Add "New Message" FAB
- Show business phone number in header
- Real-time updates via Supabase subscription

---

### 5. Components to Create

**`/components/messages/chat-bubble.tsx`**
```typescript
// Props: message, direction ('inbound' | 'outbound'), isAI, status, timestamp
// Renders chat bubble with appropriate styling
```

**`/components/messages/message-input.tsx`**
```typescript
// Text input with send button
// Template picker dropdown
// Character count (SMS limit: 160 chars per segment)
```

**`/components/messages/template-picker.tsx`**
```typescript
// Dropdown/sheet to select message template
// Inserts template text into input
```

**`/components/messages/ai-indicator.tsx`**
```typescript
// Shows when AI is typing/responding
// "AI is composing a response..."
```

---

## AI SMS Response Logic

### System Prompt Template

```typescript
const systemPrompt = `You are an AI assistant for ${businessName}, a ${businessType} company.

Your role is to:
- Answer customer questions about services and availability
- Collect information for service requests (name, address, issue description)
- Schedule callbacks with the business owner
- Be helpful but never make promises about pricing or specific appointments

Business Information:
${knowledgeBase}

Business Hours: ${businessHours}

Guidelines:
- Keep responses concise (under 160 characters when possible for single SMS)
- Be ${tone} in tone
- If you can't help, offer to have someone call them back
- Never pretend to be human - if asked, acknowledge you're an AI assistant
- For emergencies, provide the business phone number for direct call

Current time: ${currentTime}
Customer name (if known): ${customerName}
`;
```

### Response Decision Flow

```
1. Incoming message received
2. Check if AI SMS is enabled for business
3. Check quiet hours:
   - If in quiet hours AND customer didn't initiate in last 2 hours → Don't respond
   - If in quiet hours BUT customer initiated recently → Respond with "limited hours" note
   - If not in quiet hours → Normal response
4. Get conversation history (last 10 messages for context)
5. Generate AI response via GPT-4
6. Send response
7. Mark message as AI-generated in database
```

---

## Appointment Reminder System

### Cron Job / Scheduled Function

Create a scheduled function that runs every 15 minutes:

**`/app/api/cron/send-reminders/route.ts`**
```typescript
// 1. Query scheduled_messages where scheduled_for <= NOW and status = 'pending'
// 2. For each message:
//    - Send via Twilio
//    - Update status to 'sent'
//    - Log any failures
```

### Auto-Schedule Reminders

When a job is created/updated, automatically schedule reminders:

```typescript
// In job creation/update logic:
// 1. Cancel any existing reminders for this job
// 2. If job has scheduled_date and customer has phone:
//    - Schedule reminder for 24 hours before
//    - Schedule reminder for 2 hours before (optional setting)
```

### Reminder Template

```
Hi {{customer_name}}! This is a reminder that {{business_name}} has you scheduled for {{service}} tomorrow at {{time}}. 

Reply CONFIRM to confirm or RESCHEDULE if you need to change. Questions? Call us at {{business_phone}}.
```

---

## Permissions Updates

Add to `/lib/permissions.ts`:

```typescript
// Add these permissions
'send_sms',              // Can send SMS messages
'view_sms_conversations', // Can view all SMS conversations
'manage_ai_sms',         // Can configure AI SMS settings
'manage_phone_number',   // Can provision/release phone numbers
'manage_sms_templates',  // Can create/edit templates

// Role assignments:
// owner: all of the above
// admin: all except manage_phone_number
// technician: send_sms (only to their assigned job customers), view own conversations
```

---

## Package Dependencies

Add to `package.json`:

```json
{
  "dependencies": {
    "twilio": "^4.23.0",
    "openai": "^4.52.0"
  }
}
```

---

## Testing Checklist

- [ ] Provision phone number for test business
- [ ] Send outbound SMS and verify delivery
- [ ] Receive inbound SMS via webhook
- [ ] AI auto-response generates and sends
- [ ] Quiet hours blocks AI responses appropriately
- [ ] Conversation UI loads and displays correctly
- [ ] Message status updates via webhook
- [ ] Templates can be created and used
- [ ] Appointment reminders schedule and send
- [ ] Technician can only message their job customers
- [ ] Phone number displays in conversation header

---

## Implementation Order

1. **Set up Twilio account and get credentials**
2. **Create Twilio client library** (`/lib/twilio/client.ts`)
3. **Build webhook handlers** (incoming SMS, status callbacks)
4. **Create send SMS API route**
5. **Build conversation detail page** (chat UI)
6. **Add AI responder** with OpenAI integration
7. **Build settings pages** (phone, AI SMS, templates)
8. **Implement appointment reminders**
9. **Add real-time updates** via Supabase subscriptions
10. **Test end-to-end flow**

---

## Notes

- Twilio requires webhook URLs to be HTTPS. Use ngrok for local development.
- Test with Twilio test credentials first to avoid charges.
- SMS segments: Messages over 160 chars are split into multiple segments (charged separately).
- E.164 format required: All phone numbers must be +1XXXXXXXXXX format.
- Verify Twilio webhook signatures in production to prevent spoofing.

---

## Design Decisions (Confirmed)

### 1. AI Response Mode: Fully Automatic
- AI responses send immediately without human review
- No approval queue needed
- Business owner can view AI conversation history in the app

### 2. AI Conversation Limit: 10 Messages
- After 10 AI responses in a single conversation, auto-handoff to human
- **Why 10?** Balances helpfulness vs. cost. Most conversations resolve in 3-5 messages. GPT-4 costs ~$0.01-0.03 per response, so max ~$0.30/conversation.
- When limit reached, AI sends: "I've shared your info with [Owner Name] and they'll reach out shortly. For immediate assistance, call us at [number]."
- Counter resets when human responds manually

### 3. Human Handoff (No Opt-Out)
- Customers cannot opt-out of AI entirely
- But they CAN request a human at any time
- Trigger phrases: "talk to a person", "speak to someone", "real person", "human", "representative", "manager"
- AI response: "Absolutely! I'm connecting you with [Owner/Admin Name]. They'll respond shortly. If urgent, call us directly at [number]."
- Conversation is flagged for human attention with push notification to owner/admin

### 4. Call Forwarding: User-Configurable Setting
Add these settings to the business phone configuration:

```typescript
type CallForwardingOption = 
  | 'voicemail'           // Go straight to voicemail
  | 'forward_owner'       // Forward to owner's cell
  | 'forward_custom'      // Forward to custom number
  | 'forward_sequential'  // Try numbers in order, then voicemail
  | 'forward_simultaneous'; // Ring all numbers at once

interface CallForwardingSettings {
  mode: CallForwardingOption;
  forward_numbers: string[];        // Up to 3 numbers
  voicemail_greeting: 'default' | 'custom';
  custom_greeting_url?: string;     // Twilio recording URL
  ring_timeout: number;             // Seconds before going to next/voicemail (default: 20)
  business_hours_only: boolean;     // Only forward during business hours
  after_hours_mode: CallForwardingOption; // What to do outside business hours
}
```

**Database additions:**
```sql
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS call_forwarding_mode TEXT DEFAULT 'voicemail';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS call_forward_numbers TEXT[]; -- Array of phone numbers
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS call_ring_timeout INTEGER DEFAULT 20;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS call_business_hours_only BOOLEAN DEFAULT false;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS call_after_hours_mode TEXT DEFAULT 'voicemail';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS voicemail_greeting_url TEXT;
```

**Settings UI needed:** `/app/(dashboard)/settings/phone/page.tsx` should include:
- Call forwarding mode dropdown
- Phone number inputs (up to 3)
- Ring timeout slider (15-45 seconds)
- Business hours toggle
- After-hours behavior dropdown
- Voicemail greeting: Default or record custom

### 5. Phone Numbers: User-Configurable (Single or Multi)
Add setting for phone number strategy:

```typescript
type PhoneNumberStrategy = 
  | 'single'    // One number for entire business
  | 'per_location'; // Separate number per location (Multi-location add-on only)

interface PhoneNumberSettings {
  strategy: PhoneNumberStrategy;
  primary_number: string;           // Main business number
  location_numbers: {               // Only if strategy = 'per_location'
    location_id: string;
    phone_number: string;
    phone_sid: string;
  }[];
}
```

**Database additions:**
```sql
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS phone_number_strategy TEXT DEFAULT 'single';

-- For multi-location (if locations table exists)
ALTER TABLE locations ADD COLUMN IF NOT EXISTS twilio_phone_number TEXT;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS twilio_phone_sid TEXT;
```

**Settings UI:**
- If business has multi-location add-on, show toggle: "Use one number for all locations" vs "Separate number per location"
- If per-location, show number assignment UI for each location
- Warn about additional costs ($1/mo per number)

---

## Updated AI Response Logic

```typescript
async function handleIncomingMessage(message: IncomingMessage) {
  const conversation = await getOrCreateConversation(message.from, message.businessId);
  
  // Save incoming message
  await saveMessage({
    conversation_id: conversation.id,
    content: message.body,
    direction: 'inbound',
  });

  // Check if AI is enabled
  const business = await getBusiness(message.businessId);
  if (!business.ai_sms_enabled) {
    await notifyHumanNewMessage(conversation);
    return;
  }

  // Check for human handoff request
  if (isHumanHandoffRequest(message.body)) {
    await handleHumanHandoff(conversation, business);
    return;
  }

  // Check AI response limit
  const aiResponseCount = await getAIResponseCount(conversation.id);
  if (aiResponseCount >= 10) {
    await handleConversationLimitReached(conversation, business);
    return;
  }

  // Check quiet hours
  const canRespond = await checkQuietHours(business, conversation);
  if (!canRespond) {
    // Don't respond, but don't notify human either (they're sleeping)
    // Message will be there in the morning
    return;
  }

  // Generate and send AI response
  const response = await generateAIResponse(message.body, conversation, business);
  await sendSMS(message.from, response, business);
  
  // Save AI response
  await saveMessage({
    conversation_id: conversation.id,
    content: response,
    direction: 'outbound',
    is_ai_response: true,
  });
}

function isHumanHandoffRequest(message: string): boolean {
  const triggers = [
    'talk to a person',
    'speak to someone',
    'real person',
    'human',
    'representative',
    'manager',
    'owner',
    'speak with',
    'talk with',
    'actual person',
    'not a bot',
    'real human',
  ];
  const lower = message.toLowerCase();
  return triggers.some(trigger => lower.includes(trigger));
}

async function handleHumanHandoff(conversation: Conversation, business: Business) {
  // Get owner/admin name
  const owner = await getBusinessOwner(business.id);
  
  // Send handoff message
  const response = `Absolutely! I'm connecting you with ${owner.name}. They'll respond shortly. If it's urgent, you can call us directly at ${formatPhone(business.twilio_phone_number)}.`;
  
  await sendSMS(conversation.phone_number, response, business);
  
  // Flag conversation for human attention
  await flagForHumanAttention(conversation.id);
  
  // Send push notification to owner/admins
  await sendPushNotification({
    user_ids: await getOwnerAndAdminIds(business.id),
    title: 'Customer requested human',
    body: `${conversation.customer?.name || 'A customer'} wants to speak with you`,
    data: { conversation_id: conversation.id },
  });
}

async function handleConversationLimitReached(conversation: Conversation, business: Business) {
  const owner = await getBusinessOwner(business.id);
  
  const response = `I've shared your information with ${owner.name} and they'll reach out to you shortly. For immediate assistance, call us at ${formatPhone(business.twilio_phone_number)}.`;
  
  await sendSMS(conversation.phone_number, response, business);
  
  // Flag and notify
  await flagForHumanAttention(conversation.id, 'ai_limit_reached');
  await sendPushNotification({
    user_ids: await getOwnerAndAdminIds(business.id),
    title: 'AI conversation limit reached',
    body: `Conversation with ${conversation.customer?.name || conversation.phone_number} needs your attention`,
    data: { conversation_id: conversation.id },
  });
}
```

---

## Updated Settings Pages Needed

### `/app/(dashboard)/settings/phone/page.tsx`
Full phone settings page with:
1. **Your Business Number** - Display current number or provision new one
2. **Call Forwarding** section:
   - Mode selector (voicemail, forward, sequential, simultaneous)
   - Forward-to number inputs
   - Ring timeout
   - Business hours toggle
   - After-hours behavior
3. **Voicemail** section:
   - Default vs custom greeting
   - Record custom greeting button
4. **Multi-Location** section (if add-on active):
   - Strategy toggle (single vs per-location)
   - Per-location number assignment

### `/app/(dashboard)/settings/ai-sms/page.tsx`
AI SMS settings with:
1. **Enable/Disable** toggle
2. **AI Personality** - Tone selector (professional, friendly, casual)
3. **Business Knowledge** - Textarea for custom info
4. **Quiet Hours** - Time pickers
5. **Handoff Settings**:
   - Show current limit (10 messages)
   - Who gets notified on handoff
6. **Test AI** - Send test message to see AI response
7. **AI Stats** - Messages handled, handoffs triggered, avg conversation length

---

## Cost Estimation for Customers

Include this in help docs or settings:

| Item | Cost |
|------|------|
| Phone number | $1/month |
| Outbound SMS | ~$0.0079/message |
| Inbound SMS | ~$0.0079/message |
| AI response (GPT-4) | ~$0.01-0.03/response |
| **Typical month (100 conversations)** | **~$15-25** |

This is included in the $399/mo Pro plan - no extra charges to the customer.

---

Good luck! Start with the basic send/receive flow, then layer on AI features and settings.