# TradesCaptain CRM — Outreach Module

**Version:** 5.8  
**Date:** December 2025  
**Scope:** Outbound SMS Marketing, Lead Qualification, Call Scheduling, Agent Distribution  
**Priority:** HIGH — Revenue generation engine

---

## TABLE OF CONTENTS

1. [Module Overview](#1-module-overview)
2. [Lead Capture & Consent](#2-lead-capture--consent)
3. [Website "Text Us" Widget](#3-website-text-us-widget)
4. [AI Conversation Engine](#4-ai-conversation-engine)
5. [Lead Scoring](#5-lead-scoring)
6. [Call Scheduling & Distribution](#6-call-scheduling--distribution)
7. [Agent Call Interface](#7-agent-call-interface)
8. [Post-Call Automation](#8-post-call-automation)
9. [Lead Nurture Sequences](#9-lead-nurture-sequences)
10. [Referral Program Integration](#10-referral-program-integration)
11. [A/B Testing](#11-ab-testing)
12. [Compliance & Audit Trail](#12-compliance--audit-trail)
13. [Campaign Management](#13-campaign-management)
14. [Reporting & Analytics](#14-reporting--analytics)
15. [Additional Features](#15-additional-features)
    - 15.1 No-Show Escalation Rules
    - 15.2 Speed-to-Lead Dashboard
    - 15.3 Lead Reassignment
    - 15.4 Slack Notifications
    - 15.5 DNC List Checking (Datazapp)
    - 15.6 Lead Import (CSV)
    - 15.7 Self-Scheduling Link
    - 15.8 Email Notifications
    - 15.9 Team Leaderboard
    - 15.10 Decision Maker Check
    - 15.11 Competitor Mention Detection
    - 15.12 Lead Enrichment
    - 15.13 Revenue Forecasting
    - 15.14 Multi-Touch Attribution
    - 15.15 Zapier Integration
    - 15.16 Mobile Agent App (Planned)
16. [Database Schema](#16-database-schema)
17. [API Endpoints](#17-api-endpoints)
18. [AI Prompts](#18-ai-prompts)
19. [Call Recording & Transcription](#19-call-recording--transcription)
20. [Proposal Generator](#20-proposal-generator)
21. [E-Signature Integration](#21-e-signature-integration)
22. [Testing Checklist](#22-testing-checklist)

---

# 1. MODULE OVERVIEW

## Website "Text Us" Widget

In addition to form-based lead capture, TradesCaptain's public website features a "Text Us" button that triggers the same AI SMS flow. Visitors text a number, AI qualifies them, and books calls on agent calendars — 24/7, no human required.

```
┌─────────────────────────────────────────────────────────────────────────┐
│ "TEXT US" vs "CLICK TO CALL" — WHY IT'S BETTER                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ CLICK TO CALL (Old Way)              TEXT US (New Way)                  │
│ ────────────────────────             ────────────────────               │
│ • Requires staff to answer           • AI handles 24/7                  │
│ • Missed call = lost lead            • Every text captured              │
│ • No pre-qualification               • AI qualifies first               │
│ • Business hours only                • Works at 2am on a Sunday         │
│ • One chance to connect              • Persistent conversation          │
│ • Higher friction                    • Casual, low pressure             │
│ • No data if missed                  • Full conversation logged         │
│                                                                         │
│ RESULT: More leads, better qualified, less agent time wasted            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## What This Module Does

```
┌─────────────────────────────────────────────────────────────────────────┐
│ TRADESCAPTAIN OUTREACH — COMPLETE FLOW                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  LEAD SOURCES                                                           │
│  ────────────                                                           │
│  • Website forms (with SMS consent)                                     │
│  • Partial form abandonment                                             │
│  • Referrals from existing clients                                      │
│  • Old leads (re-engagement)                                            │
│                                                                         │
│       ↓                                                                 │
│                                                                         │
│  AI QUALIFICATION (Via SMS)                                             │
│  ──────────────────────────                                             │
│  • Instant text within 60 seconds                                       │
│  • Conversational qualification                                         │
│  • Extracts: pain points, timeline, budget signals                      │
│  • Scores lead (Hot / Warm / Cold)                                      │
│                                                                         │
│       ↓                                                                 │
│                                                                         │
│  CALL SCHEDULING                                                        │
│  ───────────────                                                        │
│  • AI books call with qualified leads                                   │
│  • Distributed to agents (round robin / weighted)                       │
│  • Calendar blocks created                                              │
│  • Lead + agent both get reminders                                      │
│                                                                         │
│       ↓                                                                 │
│                                                                         │
│  AGENT CALL                                                             │
│  ──────────                                                             │
│  • Agent sees full context + AI summary                                 │
│  • Dynamic call script based on qualification                           │
│  • Click-to-call from CRM                                               │
│  • Log outcome when done                                                │
│                                                                         │
│       ↓                                                                 │
│                                                                         │
│  POST-CALL AUTOMATION                                                   │
│  ────────────────────                                                   │
│  • AI sends follow-up text based on outcome                             │
│  • Demo booked → Confirmation + calendar invite                         │
│  • No answer → Reschedule offer                                         │
│  • Not ready → Add to nurture sequence                                  │
│                                                                         │
│       ↓                                                                 │
│                                                                         │
│  CONVERSION                                                             │
│  ──────────                                                             │
│  • Lead → Client                                                        │
│  • Commission calculated                                                │
│  • Referrer credited (if applicable)                                    │
│  • Onboarding triggered                                                 │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Module Location in CRM

```
┌─────────────────────────────────────────────────────────────────────────┐
│ CRM TOP NAVIGATION                                                      │
├─────────────────────────────────────────────────────────────────────────┤
│ [Dashboard] [📣 Outreach] [Pipeline] [Clients] [NeverMiss] [Commissions]│
│              ^^^^^^^^^^^                                                │
│              NEW MODULE                                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ OUTREACH SUB-NAV:                                                       │
│ [Conversations] [Scheduled Calls] [Campaigns] [Nurture] [Analytics]     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

# 2. LEAD CAPTURE & CONSENT

## Consent Collection Points

### Website Form Integration

```html
<!-- REQUIRED: Add to all TradesCaptain website forms -->

<form id="contact-form" action="/api/leads/website" method="POST">
  <input type="text" name="name" placeholder="Your Name" required>
  <input type="text" name="company" placeholder="Business Name" required>
  <input type="tel" name="phone" placeholder="Phone Number" required>
  <input type="email" name="email" placeholder="Email" required>
  
  <select name="trade" required>
    <option value="">Select Your Trade</option>
    <option value="plumber">Plumbing</option>
    <option value="electrician">Electrical</option>
    <option value="hvac">HVAC</option>
    <option value="roofing">Roofing</option>
    <option value="general">General Contractor</option>
    <option value="other">Other</option>
  </select>
  
  <textarea name="message" placeholder="How can we help?"></textarea>
  
  <!-- SMS CONSENT - REQUIRED -->
  <label class="consent-checkbox">
    <input type="checkbox" name="sms_consent" required>
    <span>I agree to receive text messages from Trades Captain about my 
    inquiry and services. Message frequency varies. Reply STOP to opt out. 
    Message & data rates may apply. 
    <a href="/privacy">Privacy Policy</a> | <a href="/terms">Terms</a></span>
  </label>
  
  <button type="submit">Get Started</button>
</form>

<script>
// Capture partial form data (phone) for abandonment recovery
document.getElementById('phone').addEventListener('blur', function(e) {
  if (isValidPhone(e.target.value)) {
    fetch('/api/leads/partial', {
      method: 'POST',
      body: JSON.stringify({
        phone: e.target.value,
        page: window.location.pathname,
        timestamp: Date.now()
      })
    });
  }
});
</script>
```

### Consent Tracking

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 📋 CONSENT RECORD                                                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ Phone: (555) 123-4567                                                   │
│ Consent Type: Express Written                                           │
│ Source: Website Form                                                    │
│ Collected: Dec 28, 2025 at 2:34 PM                                     │
│                                                                         │
│ IP Address: 192.168.1.1                                                 │
│ Form URL: tradescaptain.com/contact                                     │
│                                                                         │
│ Consent Language Shown:                                                 │
│ "I agree to receive text messages from Trades Captain about my          │
│ inquiry and services. Message frequency varies. Reply STOP to           │
│ opt out. Message & data rates may apply."                               │
│                                                                         │
│ Status: ✓ VALID                                                         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

# 3. WEBSITE "TEXT US" WIDGET

## Overview

Replace "Click to Call" buttons on tradescaptain.com with "Text Us" buttons. When visitors tap, it opens their native SMS app with a pre-filled message. AI takes over from there.

## Widget Design

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 💬 "TEXT US" BUTTON DESIGNS                                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ OPTION A: Floating Button (Bottom Right)                                │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │                                                                     │ │
│ │                                              ┌─────────────────────┐│ │
│ │                                              │ 💬 Text Us          ││ │
│ │                                              │    (555) 123-TEXT   ││ │
│ │                                              └─────────────────────┘│ │
│ │                                                                     │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ OPTION B: Header CTA                                                    │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ [Logo]  Features  Pricing  About    [📱 Text Us]  [Get Started]     │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ OPTION C: Hero Section CTA                                              │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │                                                                     │ │
│ │        Get More Calls for Your Trade Business                       │ │
│ │                                                                     │ │
│ │   Websites that rank. AI that texts back. Leads that convert.       │ │
│ │                                                                     │ │
│ │       [Get Started]        [💬 Text Us Now]                         │ │
│ │                                                                     │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ OPTION D: Sticky Mobile Bar                                             │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │  📱 Questions? Text us: (555) 123-TEXT            [Tap to Text]     │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ RECOMMENDED: Use ALL of them. Multiple touchpoints = more conversions.  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## How It Works

```
┌─────────────────────────────────────────────────────────────────────────┐
│ "TEXT US" FLOW                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ STEP 1: Visitor taps "Text Us" button                                   │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Button opens native SMS app with pre-filled message:                │ │
│ │                                                                     │ │
│ │ To: (555) 123-TEXT                                                  │ │
│ │ Body: "Hi, I'm interested in TradesCaptain!"                        │ │
│ │                                                                     │ │
│ │ Visitor just taps SEND.                                             │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│       │                                                                 │
│       ▼                                                                 │
│ STEP 2: AI receives text and responds instantly                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ AI: "Hey! Thanks for reaching out 👋 I'm Alex from Trades Captain.  │ │
│ │ What kind of trade business do you have? (Plumbing, HVAC,           │ │
│ │ electrical, etc.)"                                                  │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│       │                                                                 │
│       ▼                                                                 │
│ STEP 3: AI qualifies through conversation                               │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ • What trade?                                                       │ │
│ │ • What's their biggest challenge?                                   │ │
│ │ • Do they have a website?                                           │ │
│ │ • Timeline / urgency?                                               │ │
│ │                                                                     │ │
│ │ Same qualification flow as form-based leads.                        │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│       │                                                                 │
│       ▼                                                                 │
│ STEP 4: AI books call on agent calendar                                 │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ AI: "Sounds like we can definitely help! Want to hop on a quick     │ │
│ │ call? I have Tuesday at 2pm or Wednesday at 10am."                  │ │
│ │                                                                     │ │
│ │ → Same scheduling + distribution logic                              │ │
│ │ → 30-min buffer enforced                                            │ │
│ │ → Overflow to Admin if no availability                              │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│       │                                                                 │
│       ▼                                                                 │
│ STEP 5: Lead created with source = "SMS_WIDGET"                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ source: "SMS_WIDGET"                                                │ │
│ │ source_campaign: "website_text_button"                              │ │
│ │ source_details: { page: "/pricing", button: "hero_cta" }            │ │
│ │                                                                     │ │
│ │ Distinguishes from form-based SMS leads.                            │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Implementation Code

### SMS Link (Mobile)

```html
<!-- Basic SMS Link -->
<a href="sms:+15551238398?body=Hi%2C%20I%27m%20interested%20in%20TradesCaptain!" 
   class="text-us-button">
  💬 Text Us
</a>

<!-- With tracking (recommended) -->
<a href="sms:+15551238398?body=Hi%20from%20TC%20website%20-%20HERO" 
   class="text-us-button"
   onclick="trackTextUsClick('hero')">
  💬 Text Us Now
</a>

<script>
function trackTextUsClick(location) {
  // Track which button was clicked
  fetch('/api/track/text-us-click', {
    method: 'POST',
    body: JSON.stringify({ 
      location: location,
      page: window.location.pathname,
      timestamp: Date.now()
    })
  });
}
</script>
```

### Floating Widget Component (React)

```jsx
// TextUsWidget.jsx
import { useState } from 'react';

export default function TextUsWidget() {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const phoneNumber = '+15551238398';
  const prefilledMessage = encodeURIComponent('Hi, I\'m interested in TradesCaptain!');
  const smsLink = `sms:${phoneNumber}?body=${prefilledMessage}`;
  
  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isExpanded && (
        <div className="bg-white rounded-lg shadow-xl p-4 mb-3 w-72 animate-fade-in">
          <h3 className="font-bold text-lg mb-2">Questions? Text us!</h3>
          <p className="text-gray-600 text-sm mb-3">
            Our AI assistant responds instantly, 24/7. 
            Get answers and book a call in minutes.
          </p>
          <a 
            href={smsLink}
            className="block w-full bg-blue-600 text-white text-center py-3 rounded-lg font-semibold hover:bg-blue-700"
            onClick={() => trackTextUsClick('floating_widget')}
          >
            📱 Open Text Message
          </a>
          <p className="text-xs text-gray-400 mt-2 text-center">
            (555) 123-TEXT • Available 24/7
          </p>
        </div>
      )}
      
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg flex items-center gap-2"
      >
        {isExpanded ? (
          <span>✕</span>
        ) : (
          <>
            <span>💬</span>
            <span className="font-semibold">Text Us</span>
          </>
        )}
      </button>
    </div>
  );
}
```

### Sticky Mobile Bar Component

```jsx
// StickyTextBar.jsx
export default function StickyTextBar() {
  const smsLink = 'sms:+15551238398?body=Hi%20from%20TC%20website';
  
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-blue-600 text-white py-3 px-4 flex justify-between items-center md:hidden z-50">
      <span className="text-sm">
        📱 Questions? Text us anytime
      </span>
      <a 
        href={smsLink}
        className="bg-white text-blue-600 px-4 py-2 rounded-lg font-semibold text-sm"
      >
        Tap to Text
      </a>
    </div>
  );
}
```

## AI First Response (Text Widget)

When someone texts from the website widget, AI uses a slightly different opener since they're not from a form:

```
FIRST MESSAGE (Website Text Widget):

"Hey! Thanks for reaching out 👋 I'm Alex from Trades Captain. What kind 
of trade business do you have? (Plumbing, HVAC, electrical, roofing, etc.)"

vs.

FIRST MESSAGE (Form Submission):

"Hey [Name]! Just saw you checked out Trades Captain. I help [trade] 
businesses get more calls..."

KEY DIFFERENCE:
• Widget leads haven't told us anything yet — need to start fresh
• Form leads gave us name + trade — we can personalize immediately
```

## AI System Prompt Addition

```
WEBSITE TEXT WIDGET LEADS:
─────────────────────────────────────────────────────────────────────────

When the lead source is "SMS_WIDGET" (texted from website button):

1. They haven't given you ANY info yet — not even their name
2. Start by asking their trade type
3. Then ask their name naturally in conversation
4. Then proceed with normal qualification

OPENER FOR WIDGET LEADS:
"Hey! Thanks for reaching out 👋 I'm Alex from Trades Captain. What kind 
of trade business do you have?"

THEN:
"Nice! And what's your name? I like to know who I'm chatting with."

THEN:
"Good to meet you, [Name]! So what's the biggest thing holding your 
[trade] business back right now — getting found on Google, staying 
organized, or something else?"

THEN → Standard qualification flow
```

## Source Labels (Updated)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 🏷️ LEAD SOURCE LABELS                                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ All leads are automatically labeled by source:                          │
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Label          │ Icon │ Description                                 │ │
│ ├────────────────┼──────┼─────────────────────────────────────────────┤ │
│ │ SMS            │ 📱   │ AI SMS outreach (form → AI text follow-up)  │ │
│ │ SMS_WIDGET     │ 💬   │ Website "Text Us" button (visitor initiated)│ │
│ │ REFERRAL       │ 🎁   │ Referred by existing client                 │ │
│ │ WEBSITE        │ 🌐   │ Direct website form (no SMS follow-up)      │ │
│ │ INBOUND_CALL   │ 📞   │ Called TradesCaptain directly               │ │
│ │ COLD_EMAIL     │ 📧   │ Email outreach                              │ │
│ │ MANUAL         │ ✏️   │ Manually entered by agent                   │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ SMS vs SMS_WIDGET:                                                      │
│ • SMS = They filled out a form, AI texted them (outbound)               │
│ • SMS_WIDGET = They clicked "Text Us" button (inbound)                  │
│                                                                         │
│ SMS_WIDGET leads are higher intent — they reached out first!            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Tracking & Analytics

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 📊 TEXT WIDGET ANALYTICS                                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ THIS MONTH                                                              │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Button Clicks:                 234                                  │ │
│ │ Texts Received:                187 (80% send rate)                  │ │
│ │ Conversations Started:         187                                  │ │
│ │ Qualified:                     89 (48%)                             │ │
│ │ Calls Booked:                  67 (36%)                             │ │
│ │ Closed:                        24 (13%)                             │ │
│ │                                                                     │ │
│ │ Revenue from Text Widget:      $7,176 MRR                           │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ BY BUTTON LOCATION                                                      │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Location             │ Clicks │ Texts │ Qualified │ Closed          │ │
│ ├──────────────────────┼────────┼───────┼───────────┼─────────────────┤ │
│ │ Floating widget      │ 98     │ 82    │ 41        │ 11              │ │
│ │ Hero CTA             │ 67     │ 54    │ 28        │ 8               │ │
│ │ Pricing page         │ 45     │ 38    │ 15        │ 4               │ │
│ │ Sticky mobile bar    │ 24     │ 13    │ 5         │ 1               │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ 💡 INSIGHT: Floating widget converts best. Hero CTA has highest         │
│    close rate (12%). Consider making sticky bar more prominent.         │
│                                                                         │
│ COMPARISON: SMS_WIDGET vs SMS (Form)                                    │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Metric              │ SMS_WIDGET │ SMS (Form) │ Difference          │ │
│ ├─────────────────────┼────────────┼────────────┼─────────────────────┤ │
│ │ Qualification rate  │ 48%        │ 42%        │ +14% 🟢             │ │
│ │ Call book rate      │ 36%        │ 28%        │ +29% 🟢             │ │
│ │ Close rate          │ 13%        │ 10%        │ +30% 🟢             │ │
│ │ Avg score           │ 74         │ 68         │ +9% 🟢              │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ SMS_WIDGET leads convert better because they initiated contact!         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Consent Handling

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ⚖️ CONSENT FOR TEXT WIDGET                                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ When someone texts YOUR number first, they've given implied consent     │
│ to receive a response. This is similar to calling a business.           │
│                                                                         │
│ HOWEVER, to be safe:                                                    │
│                                                                         │
│ 1. First AI response includes opt-out:                                  │
│    "Reply STOP anytime to opt out"                                      │
│                                                                         │
│ 2. Log the "consent" as type: "implied_inbound"                         │
│    consent_source: "sms_widget_inbound"                                 │
│    consent_timestamp: [when they first texted]                          │
│                                                                         │
│ 3. If conversation continues, they've confirmed engagement              │
│                                                                         │
│ 4. Still honor STOP immediately if they send it                         │
│                                                                         │
│ WIDGET DISCLAIMER (on website, near button):                            │
│ "By texting us, you agree to receive SMS replies from Trades Captain.   │
│ Reply STOP to opt out. Msg & data rates may apply."                     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Database Updates

```sql
-- Source values now include:
-- 'SMS'         = Form submission → AI outbound text
-- 'SMS_WIDGET'  = Website text button → Visitor inbound text
-- 'REFERRAL'    = Referral from client
-- 'WEBSITE'     = Form only (no SMS)
-- 'INBOUND_CALL'= Called directly
-- 'COLD_EMAIL'  = Email outreach
-- 'MANUAL'      = Agent entered

-- Track widget clicks for analytics
CREATE TABLE text_widget_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  session_id VARCHAR(100),
  page_url TEXT,
  button_location VARCHAR(50),      -- 'floating', 'hero', 'pricing', 'sticky_bar'
  
  -- Did they actually send a text?
  text_received BOOLEAN DEFAULT false,
  contact_id UUID REFERENCES outreach_contacts(id),
  
  -- Device info
  device_type VARCHAR(20),          -- 'mobile', 'desktop', 'tablet'
  user_agent TEXT,
  
  clicked_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_widget_clicks_location ON text_widget_clicks(button_location);
CREATE INDEX idx_widget_clicks_page ON text_widget_clicks(page_url);
```

---

# 4. AI CONVERSATION ENGINE

## Conversation Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│ AI CONVERSATION ENGINE                                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ TRIGGER: Form submitted with SMS consent                                │
│                                                                         │
│ [0-60 seconds]                                                          │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ AI SENDS INITIAL MESSAGE                                            │ │
│ │                                                                     │ │
│ │ "Hey [Name]! Just saw you checked out Trades Captain. I help        │ │
│ │ [trade] businesses get more calls with websites that actually       │ │
│ │ rank on Google. What's your biggest challenge right now —           │ │
│ │ getting found online or staying organized? - Alex"                  │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ [Lead Replies]                                                          │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ INTENT DETECTION                                                    │ │
│ │                                                                     │ │
│ │ • "STOP" / "unsubscribe" → Immediate opt-out, end conversation     │ │
│ │ • "Who is this?" → Explain, reference form, offer opt-out          │ │
│ │ • Interested response → Begin qualification                        │ │
│ │ • Question about pricing → Answer briefly, pivot to qualification  │ │
│ │ • Objection → Address, continue qualification                      │ │
│ │ • Off-topic → Gently redirect                                      │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ [Qualification Questions - Asked Naturally in Conversation]             │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ 1. CURRENT SITUATION                                                │ │
│ │    "Do you have a website currently, or starting fresh?"            │ │
│ │                                                                     │ │
│ │ 2. PAIN POINT                                                       │ │
│ │    "What's the biggest thing holding your business back right       │ │
│ │    now — leads, organization, or something else?"                   │ │
│ │                                                                     │ │
│ │ 3. TIMELINE                                                         │ │
│ │    "Are you looking to get something set up soon, or just           │ │
│ │    exploring options for later?"                                    │ │
│ │                                                                     │ │
│ │ 4. BUDGET SIGNAL (Soft)                                             │ │
│ │    "Most of our [trade] clients invest $200-500/mo. Does that       │ │
│ │    sound like the right ballpark for you?"                          │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ [Qualification Complete]                                                │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ IF QUALIFIED (Score ≥ 70):                                          │ │
│ │ → Schedule call                                                     │ │
│ │ "Sounds like we can definitely help. Want to hop on a quick         │ │
│ │ 15-min call? I have Tuesday at 2pm or Thursday at 10am —            │ │
│ │ which works better?"                                                │ │
│ │                                                                     │ │
│ │ IF NOT READY (Score 40-69):                                         │ │
│ │ → Add to nurture sequence                                           │ │
│ │ "Totally get it — sounds like timing isn't right yet. Mind if I     │ │
│ │ check back in a month or so?"                                       │ │
│ │                                                                     │ │
│ │ IF NOT A FIT (Score < 40):                                          │ │
│ │ → Close gracefully                                                  │ │
│ │ "Appreciate the chat! Doesn't sound like we're the right fit        │ │
│ │ right now, but feel free to reach out if things change."            │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Live Conversation View

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 💬 CONVERSATION: Mike's Plumbing                          [Take Over]   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ STATUS: Qualifying                    SCORE: 75 (Hot)                   │
│ STARTED: 3 minutes ago                MESSAGES: 6                       │
│                                                                         │
│ ═══════════════════════════════════════════════════════════════════════ │
│                                                                         │
│ 2:34 PM — AI (Outbound)                                                │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Hey Mike! Just saw you checked out Trades Captain. I help plumbers  │ │
│ │ get more calls with websites that actually rank on Google. What's   │ │
│ │ your biggest challenge right now — getting found online or staying  │ │
│ │ organized? - Alex                                                   │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ 2:36 PM — Mike (Inbound)                                               │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Getting found. I barely show up on Google and my competitor is      │ │
│ │ always at the top                                                   │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│ │ Intent: INTERESTED • Pain Point Detected: SEO/Google ranking        │
│                                                                         │
│ 2:36 PM — AI (Outbound)                                                │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Ugh, that's frustrating. Do you have a website currently, or are    │ │
│ │ you working off Facebook/Google Business only?                      │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ 2:37 PM — Mike (Inbound)                                               │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ I have a website but it's old. My nephew made it like 5 years ago   │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│ │ Intent: INTERESTED • Current Solution: Outdated website             │
│                                                                         │
│ 2:37 PM — AI (Outbound)                                                │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Ha, we hear that a lot! Those sites usually aren't set up for       │ │
│ │ Google rankings. Are you looking to get something new ASAP, or      │ │
│ │ just exploring options?                                             │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ 2:38 PM — Mike (Inbound)                                               │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Sooner the better honestly. Slow season is coming and I need more   │ │
│ │ calls                                                               │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│ │ Intent: READY TO BUY • Timeline: Immediate • Urgency: High          │
│                                                                         │
│ ● AI is typing...                                                       │
│                                                                         │
│ ═══════════════════════════════════════════════════════════════════════ │
│                                                                         │
│ EXTRACTED DATA:                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Pain Points: [SEO/Rankings, Competitor beating them]                │ │
│ │ Current Solution: Outdated DIY website (5 years old)                │ │
│ │ Timeline: Immediate ("sooner the better")                           │ │
│ │ Urgency Trigger: Slow season coming                                 │ │
│ │ Budget Signal: Not discussed yet                                    │ │
│ │ Recommended Plan: Gold Pro (Website + SEO + NeverMiss)              │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

# 4. LEAD SCORING

## Scoring Algorithm

```
┌─────────────────────────────────────────────────────────────────────────┐
│ LEAD SCORING MODEL                                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ BASE SCORE: 0                                                           │
│ MAX SCORE: 100                                                          │
│                                                                         │
│ ═══════════════════════════════════════════════════════════════════════ │
│                                                                         │
│ ENGAGEMENT SIGNALS (+)                                                  │
│ ─────────────────────                                                   │
│ • Replied to first message                           +15                │
│ • Replied within 5 minutes                           +10                │
│ • Multiple replies (engaged conversation)            +5 per reply (max 15)
│ • Asked questions about services                     +10                │
│ • Clicked link in message                            +5                 │
│                                                                         │
│ QUALIFICATION SIGNALS (+)                                               │
│ ─────────────────────────                                               │
│ • Has clear pain point                               +15                │
│ • Timeline: Immediate / ASAP                         +20                │
│ • Timeline: Within 30 days                           +10                │
│ • Timeline: Exploring / Eventually                   +0                 │
│ • Budget confirmed in range                          +15                │
│ • Mentioned competitor                               +5                 │
│ • Mentioned specific service need                    +10                │
│                                                                         │
│ SOURCE SIGNALS (+)                                                      │
│ ─────────────────                                                       │
│ • Referral from existing client                      +20                │
│ • Completed full website form                        +10                │
│ • Partial form (abandonment recovery)                +5                 │
│ • Re-engagement (previously interested)              +10                │
│                                                                         │
│ NEGATIVE SIGNALS (-)                                                    │
│ ────────────────────                                                    │
│ • No reply after 24 hours                            -10                │
│ • "Just looking" / "Not sure"                        -10                │
│ • Price objection without resolution                 -15                │
│ • Competitor mentioned as preferred                  -10                │
│ • Delayed timeline (6+ months)                       -10                │
│                                                                         │
│ ═══════════════════════════════════════════════════════════════════════ │
│                                                                         │
│ SCORE THRESHOLDS                                                        │
│ ────────────────                                                        │
│ 70-100: 🔥 HOT    → Schedule call immediately                           │
│ 40-69:  🟡 WARM   → Continue nurturing or soft schedule                 │
│ 0-39:   🔵 COLD   → Add to long-term nurture                            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Score Display

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 📊 LEAD SCORE: Mike's Plumbing                                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ SCORE: 85 / 100                                        🔥 HOT LEAD      │
│ ████████████████████████████████████████████░░░░░░░░                   │
│                                                                         │
│ SCORE BREAKDOWN:                                                        │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ + Replied to first message                               +15       │ │
│ │ + Replied within 5 minutes                               +10       │ │
│ │ + Multiple engaged replies (3)                           +15       │ │
│ │ + Clear pain point (SEO/rankings)                        +15       │ │
│ │ + Timeline: Immediate                                    +20       │ │
│ │ + Completed full website form                            +10       │ │
│ │ ─────────────────────────────────────────────────────────────────  │ │
│ │ = TOTAL                                                  85        │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ RECOMMENDATION: Schedule call immediately — high intent buyer           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

# 5. CALL SCHEDULING & DISTRIBUTION

## Scheduling Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│ CALL SCHEDULING FLOW                                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ [Lead Qualified — Score ≥ 70]                                           │
│       │                                                                 │
│       ▼                                                                 │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ SYSTEM: Calculate available slots                                   │ │
│ │                                                                     │ │
│ │ RULES APPLIED:                                                      │ │
│ │ ✓ Only next 3 BUSINESS DAYS (skip weekends + holidays)              │ │
│ │ ✓ 30-minute buffer between all calls                                │ │
│ │ ✓ Skip agent blackout days (recurring + specific)                   │ │
│ │ ✓ Skip globally blacked out days (Sat, Sun, holidays)               │ │
│ │ ✓ Respect agent daily capacity limits                               │ │
│ │                                                                     │ │
│ │ Example (Today = Friday Dec 27):                                    │ │
│ │ • Fri Dec 27 — TODAY (if slots available)                           │ │
│ │ • Sat Dec 28 — ⬛ WEEKEND (blocked)                                  │ │
│ │ • Sun Dec 29 — ⬛ WEEKEND (blocked)                                  │ │
│ │ • Mon Dec 30 — Business Day 1 ✓                                     │ │
│ │ • Tue Dec 31 — Business Day 2 ✓                                     │ │
│ │ • Wed Jan 1  — ⬛ HOLIDAY (blocked)                                  │ │
│ │ • Thu Jan 2  — Business Day 3 ✓                                     │ │
│ │ • Fri Jan 3+ — ⬛ BEYOND 3-DAY WINDOW                                │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│       │                                                                 │
│       ├──────── IF SLOTS AVAILABLE ────────────────────┐                │
│       │                                                │                │
│       ▼                                                │                │
│ ┌─────────────────────────────────────┐                │                │
│ │ AI: "Want to hop on a call? I have  │                │                │
│ │ Monday at 2pm or Tuesday at 10am."  │                │                │
│ └─────────────────────────────────────┘                │                │
│       │                                                │                │
│       ├──── Lead picks a time ────┐                    │                │
│       │                           │                    │                │
│       ▼                           │                    │                │
│ ┌───────────────────────────────┐ │                    │                │
│ │ SYSTEM:                       │ │                    │                │
│ │ ✓ Create scheduled_call       │ │                    │                │
│ │ ✓ Assign to agent (round      │ │                    │                │
│ │   robin/weighted)             │ │                    │                │
│ │ ✓ Block agent calendar        │ │                    │                │
│ │ ✓ Set source = "SMS"          │ │                    │                │
│ │ ✓ Notify agent                │ │                    │                │
│ │ ✓ Queue lead reminder         │ │                    │                │
│ └───────────────────────────────┘ │                    │                │
│       │                           │                    │                │
│       ▼                           │                    │                │
│ ┌───────────────────────────────┐ │                    │                │
│ │ AI: "Perfect! Sarah will call │ │                    │                │
│ │ you Monday at 2pm."           │ │                    │                │
│ └───────────────────────────────┘ │                    │                │
│                                   │                    │                │
│       ├──── Lead asks for WEEKEND ┘                    │                │
│       │     "Can we do Sunday instead?"                │                │
│       ▼                                                │                │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ ⚠️ WEEKEND REQUEST HANDLING                                          │ │
│ │                                                                     │ │
│ │ SYSTEM:                                                             │ │
│ │ ✓ Create scheduled_call with status = "pending_admin_approval"      │ │
│ │ ✓ Set weekend_request = TRUE                                        │ │
│ │ ✓ Add to Admin Lead List under "Weekend Requests"                   │ │
│ │ ✓ Notify Admin immediately                                          │ │
│ │                                                                     │ │
│ │ AI: "I've put you down for Sunday at 2pm. Someone from our team     │ │
│ │ will confirm within 24 hours. Sound good?"                          │ │
│ │                                                                     │ │
│ │ ADMIN OPTIONS:                                                      │ │
│ │ • Confirm — Assign agent willing to work weekend                    │ │
│ │ • Reschedule — AI texts lead with weekday alternatives              │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│       ├──────── IF NO SLOTS IN 3-DAY WINDOW ───────────┘                │
│       │         (All agents booked/blocked)                             │
│       ▼                                                                 │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ ⚠️ OVERFLOW TO ADMIN                                                 │ │
│ │                                                                     │ │
│ │ SYSTEM:                                                             │ │
│ │ ✓ Set lead status → "pending_admin"                                 │ │
│ │ ✓ Set overflow_reason = "no_availability_3day_window"               │ │
│ │ ✓ Add to Admin Lead List under "Pending Assignment"                 │ │
│ │ ✓ Notify Admin immediately                                          │ │
│ │                                                                     │ │
│ │ IF distribution_mode = "auto":                                      │ │
│ │ → Auto-assign when agent availability opens                         │ │
│ │ → Or batch assign daily at 8am                                      │ │
│ │                                                                     │ │
│ │ IF distribution_mode = "manual":                                    │ │
│ │ → Wait for Admin to manually assign                                 │ │
│ │                                                                     │ │
│ │ IF distribution_mode = "hybrid":                                    │ │
│ │ → Auto-assign "no availability" leads                               │ │
│ │ → Manual review for "weekend request" leads                         │ │
│ │                                                                     │ │
│ │ AI: "Our calendar is packed this week! Someone will reach out       │ │
│ │ within 24 hours to find a time that works."                         │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Distribution Methods

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ⚙️ CALL DISTRIBUTION SETTINGS                                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ DISTRIBUTION METHOD                                                     │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ ● Round Robin — Equal distribution, rotate through agents           │ │
│ │ ○ Weighted — Distribute based on performance/capacity               │ │
│ │ ○ Availability-First — Whoever has the soonest open slot            │ │
│ │ ○ Territory — Match lead location to agent territory                │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ AGENT SETTINGS                                                          │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Agent           │ Weight │ Max/Day │ Status    │ Next Available     │ │
│ ├─────────────────┼────────┼─────────┼───────────┼────────────────────┤ │
│ │ Sarah Johnson   │ 40%    │ 10      │ ✓ Active  │ Mon 2pm            │ │
│ │ Mike Chen       │ 35%    │ 8       │ ✓ Active  │ Mon 2:30pm         │ │
│ │ Alex Rodriguez  │ 25%    │ 6       │ ✓ Active  │ Tue 10am           │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ SCHEDULING RULES                                                        │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Default call duration:        [15] minutes                          │ │
│ │ Buffer between calls:         [30] minutes  ⚠️ MINIMUM 30 MIN       │ │
│ │ Max advance booking:          [3] business days ⚠️ STRICT LIMIT     │ │
│ │ Min notice for scheduling:    [2] hours                             │ │
│ │                                                                     │ │
│ │ ☑ Skip agents at daily capacity                                     │ │
│ │ ☑ Prioritize hot leads (score ≥ 85) for soonest slots               │ │
│ │ ☑ Send agent notification on new booking                            │ │
│ │ ☑ Send lead reminder morning of call                                │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ ⚠️ 30-MINUTE BUFFER RULE:                                               │
│ Calls are ALWAYS booked at least 30 minutes apart. This gives agents   │
│ time to wrap up notes, take a break, and prepare for the next call.    │
│                                                                         │
│ ⚠️ 3 BUSINESS DAY LIMIT:                                                │
│ AI only schedules within the next 3 business days. If no slots are     │
│ available within that window, lead is pushed to Admin for handling.    │
│ This keeps momentum — leads go cold if you schedule too far out.       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Blackout Days (Default + Custom)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 📅 BLACKOUT DAYS                                                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ GLOBAL BLACKOUTS (All Agents)                                           │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ WEEKENDS — Blacked out by default                                   │ │
│ │ ┌─────────────────────────────────────────────────────────────────┐ │ │
│ │ │ ☑ Saturday — No scheduling (default ON)                         │ │ │
│ │ │ ☑ Sunday — No scheduling (default ON)                           │ │ │
│ │ │                                                                 │ │ │
│ │ │ Note: If lead specifically requests weekend, we'll schedule     │ │ │
│ │ │ them but flag for Admin review (see Weekend Request Handling)   │ │ │
│ │ └─────────────────────────────────────────────────────────────────┘ │ │
│ │                                                                     │ │
│ │ HOLIDAYS — Auto-blocked                                             │ │
│ │ ┌─────────────────────────────────────────────────────────────────┐ │ │
│ │ │ Dec 25 — Christmas Day                                          │ │ │
│ │ │ Jan 1 — New Year's Day                                          │ │ │
│ │ │ [+ Add Holiday]                                                 │ │ │
│ │ └─────────────────────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ PER-AGENT BLACKOUTS                                                     │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Agents can black out specific days where AI won't schedule for them │ │
│ │                                                                     │ │
│ │ Sarah Johnson:                                                      │ │
│ │ • Fridays (recurring) — "Training day"                              │ │
│ │ • Dec 30 - Jan 2 — "Holiday vacation"                               │ │
│ │                                                                     │ │
│ │ Mike Chen:                                                          │ │
│ │ • Wednesdays (recurring) — "Team meetings"                          │ │
│ │ • Jan 15 — "Dentist"                                                │ │
│ │                                                                     │ │
│ │ Alex Rodriguez:                                                     │ │
│ │ • No custom blackouts                                               │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ BLACKOUT BEHAVIOR:                                                      │
│ • AI will NOT offer times on blacked-out days                           │
│ • If ALL agents are blacked out for a day, that day is skipped          │
│ • Blackouts are checked before offering any time slots                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Agent Blackout Settings

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 📅 MY BLACKOUT DAYS — Sarah Johnson                       [Save]        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ RECURRING BLACKOUTS (Weekly)                                            │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ ☑ Monday      □ Tuesday      □ Wednesday                            │ │
│ │ □ Thursday    ☑ Friday       ■ Saturday (locked)  ■ Sunday (locked) │ │
│ │                                                                     │ │
│ │ Note: Saturday & Sunday are globally blacked out by Admin           │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ SPECIFIC DATE BLACKOUTS                                                 │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Date(s)              │ Reason (optional)           │ Action         │ │
│ ├──────────────────────┼─────────────────────────────┼────────────────┤ │
│ │ Dec 30 - Jan 2       │ Holiday vacation            │ [Remove]       │ │
│ │ Jan 15               │ Dentist appointment         │ [Remove]       │ │
│ │ Feb 14               │ Anniversary                 │ [Remove]       │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ [+ Add Blackout Date]                                                   │
│                                                                         │
│ ─────────────────────────────────────────────────────────────────────── │
│                                                                         │
│ PREVIEW: Next 2 Weeks                                                   │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Mon 12/30  │ Tue 12/31  │ Wed 1/1   │ Thu 1/2   │ Fri 1/3          │ │
│ │ ⬛ BLOCKED │ ⬛ BLOCKED │ ⬛ HOLIDAY│ ⬛ BLOCKED│ ⬛ BLOCKED        │ │
│ │ (vacation) │ (vacation) │ (NY Day)  │ (vacation)│ (recurring)      │ │
│ ├────────────┼────────────┼───────────┼───────────┼──────────────────┤ │
│ │ Mon 1/6    │ Tue 1/7    │ Wed 1/8   │ Thu 1/9   │ Fri 1/10         │ │
│ │ ✓ OPEN     │ ✓ OPEN     │ ✓ OPEN    │ ✓ OPEN    │ ⬛ BLOCKED       │ │
│ │ 8 slots    │ 8 slots    │ 8 slots   │ 8 slots   │ (recurring)      │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Agent Weekly Hours & Timezone

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ⏰ MY WEEKLY HOURS — Sarah Johnson                         [Save]       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ MY TIMEZONE                                                             │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Timezone: [America/Chicago (CST) ▼]                                 │ │
│ │                                                                     │ │
│ │ Current time in your timezone: 2:34 PM CST                          │ │
│ │                                                                     │ │
│ │ ⚠️ All times below are in YOUR local time. The system will          │ │
│ │ automatically convert for leads in other timezones.                 │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ WEEKLY AVAILABILITY                                                     │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Set the hours you're available for calls each day.                  │ │
│ │ Leave blank or toggle OFF for days you don't take calls.            │ │
│ │                                                                     │ │
│ │ Day        │ Available │ Start    │ End      │ Break               │ │
│ ├────────────┼───────────┼──────────┼──────────┼─────────────────────┤ │
│ │ Monday     │ [✓]       │ [9:00 AM]│ [5:00 PM]│ [12:00-1:00 PM]     │ │
│ │ Tuesday    │ [✓]       │ [9:00 AM]│ [5:00 PM]│ [12:00-1:00 PM]     │ │
│ │ Wednesday  │ [✓]       │ [9:00 AM]│ [5:00 PM]│ [12:00-1:00 PM]     │ │
│ │ Thursday   │ [✓]       │ [9:00 AM]│ [5:00 PM]│ [12:00-1:00 PM]     │ │
│ │ Friday     │ [✓]       │ [9:00 AM]│ [3:00 PM]│ [12:00-1:00 PM]     │ │
│ │ Saturday   │ [ ] ■     │ -------- │ -------- │ (globally blocked)  │ │
│ │ Sunday     │ [ ] ■     │ -------- │ -------- │ (globally blocked)  │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ MULTIPLE SHIFTS (Optional)                                              │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Need split shifts? Add multiple time blocks per day.                │ │
│ │                                                                     │ │
│ │ Example: Monday                                                     │ │
│ │ • Shift 1: 9:00 AM - 12:00 PM                                       │ │
│ │ • Shift 2: 2:00 PM - 6:00 PM                                        │ │
│ │                                                                     │ │
│ │ [+ Add Shift]                                                       │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ ─────────────────────────────────────────────────────────────────────── │
│                                                                         │
│ CALCULATED SLOTS (Based on 15-min calls + 30-min buffer)                │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Monday:    9:00, 9:30, 10:00, 10:30, 11:00, 11:30,                   │ │
│ │            1:00, 1:30, 2:00, 2:30, 3:00, 3:30, 4:00, 4:30            │ │
│ │            = 14 slots                                               │ │
│ │                                                                     │ │
│ │ Friday:    9:00, 9:30, 10:00, 10:30, 11:00, 11:30,                   │ │
│ │            1:00, 1:30, 2:00, 2:30                                    │ │
│ │            = 10 slots                                               │ │
│ │                                                                     │ │
│ │ TOTAL WEEKLY CAPACITY: 66 slots                                     │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Timezone Conversion Logic

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 🌍 TIMEZONE HANDLING                                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ THE PROBLEM:                                                            │
│ • Agent Sarah is in Chicago (CST)                                       │
│ • Lead Mike is in Los Angeles (PST)                                     │
│ • Sarah's 2:00 PM is Mike's 12:00 PM                                    │
│ • We need to show the RIGHT time to each person                         │
│                                                                         │
│ THE SOLUTION:                                                           │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ 1. STORE EVERYTHING IN UTC                                          │ │
│ │    scheduled_at = "2025-01-06T20:00:00Z" (UTC)                       │ │
│ │                                                                     │ │
│ │ 2. KNOW EVERYONE'S TIMEZONE                                         │ │
│ │    • Agent timezone: Stored in agent profile                        │ │
│ │    • Lead timezone: Detected from phone area code OR asked          │ │
│ │                                                                     │ │
│ │ 3. CONVERT FOR DISPLAY                                              │ │
│ │    • CRM shows agent's local time: "2:00 PM CST"                    │ │
│ │    • AI tells lead their local time: "12:00 PM your time"           │ │
│ │    • Calendar invites use recipient's timezone                      │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ TIMEZONE DETECTION (for leads):                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ METHOD 1: Phone Area Code (Default)                                 │ │
│ │ • (213) = Los Angeles = America/Los_Angeles                         │ │
│ │ • (312) = Chicago = America/Chicago                                 │ │
│ │ • (212) = New York = America/New_York                               │ │
│ │ • ~80% accurate (people keep numbers when they move)                │ │
│ │                                                                     │ │
│ │ METHOD 2: AI Asks (If unsure)                                       │ │
│ │ "Quick question — what timezone are you in? Want to make sure       │ │
│ │ I give you the right time for the call."                            │ │
│ │                                                                     │ │
│ │ METHOD 3: City/State from Qualification                             │ │
│ │ If lead mentioned "I'm in Dallas" → America/Chicago                 │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ EXAMPLE FLOW:                                                           │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Sarah (Chicago/CST) has slot at 2:00 PM her time                    │ │
│ │ Mike (LA/PST) is being scheduled                                    │ │
│ │                                                                     │ │
│ │ SCHEDULER LOGIC:                                                    │ │
│ │ 1. Sarah's 2:00 PM CST = 8:00 PM UTC                                │ │
│ │ 2. 8:00 PM UTC = 12:00 PM PST (Mike's time)                         │ │
│ │ 3. Check: Is 12:00 PM within allowed hours? (8am-9pm) ✓             │ │
│ │                                                                     │ │
│ │ AI TO MIKE:                                                         │ │
│ │ "I have Monday at 12pm your time — does that work?"                 │ │
│ │                                                                     │ │
│ │ CRM SHOWS SARAH:                                                    │ │
│ │ "Monday 2:00 PM CST — Mike's Plumbing (Lead is in PST)"             │ │
│ │                                                                     │ │
│ │ STORED IN DATABASE:                                                 │ │
│ │ scheduled_at: "2025-01-06T20:00:00Z"                                │ │
│ │ agent_timezone: "America/Chicago"                                   │ │
│ │ lead_timezone: "America/Los_Angeles"                                │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ EDGE CASES:                                                             │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ ⚠️ Agent in EST, Lead in PST — 5pm EST = 2pm PST                     │ │
│ │    Agent's last slot might be too late for lead's business hours    │ │
│ │    → Only offer slots that work for BOTH timezones                  │ │
│ │                                                                     │ │
│ │ ⚠️ Agent in PST, Lead in EST — 9am PST = 12pm EST                    │ │
│ │    Agent's first slot might already be midday for lead              │ │
│ │    → Early bird leads might need different agent                    │ │
│ │                                                                     │ │
│ │ ⚠️ International leads (rare for contractors)                        │ │
│ │    → Flag for Admin, manual scheduling                              │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Lead Timezone Display

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 📞 SCHEDULED CALL: Mike's Plumbing                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ CALL TIME                                                           │ │
│ │                                                                     │ │
│ │ YOUR TIME (Agent - CST):     Monday, Jan 6 at 2:00 PM               │ │
│ │ LEAD'S TIME (PST):           Monday, Jan 6 at 12:00 PM              │ │
│ │                                                                     │ │
│ │ ⏰ IN 2 HOURS 15 MINUTES                                            │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ LEAD INFO                                                               │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Mike Johnson — Mike's Plumbing                                      │ │
│ │ (213) 555-1234                                                      │ │
│ │ Los Angeles, CA (America/Los_Angeles)                               │ │
│ │ 🔥 Score: 85                                                        │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ AI CONFIRMATION SENT TO LEAD:                                           │
│ "Perfect! Sarah will call you Monday at 12pm your time.                │
│ She'll call from (555) 987-6543."                                       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## AI Scheduling with Timezone

```
AI CONVERSATION EXAMPLE:

Lead: "Tuesday works for me"

AI (internal logic):
1. Lead's phone: (213) → Los Angeles → America/Los_Angeles
2. Available agent: Sarah (America/Chicago)
3. Sarah's Tuesday slots (her time): 9am, 9:30am, 10am... 4:30pm CST
4. Convert to lead's time: 7am, 7:30am, 8am... 2:30pm PST
5. Filter to reasonable hours (9am-6pm lead's time): 10am-2:30pm PST
6. Offer 2 options in LEAD'S timezone

AI: "Tuesday works! I have 10am or 2pm your time — which is better?"

Lead: "2pm"

AI (internal logic):
1. Lead wants 2pm PST
2. 2pm PST = 4pm CST (Sarah's time)
3. Confirm Sarah has 4pm CST available ✓
4. Book: scheduled_at = 2025-01-07T22:00:00Z (UTC)

AI: "You're all set for Tuesday at 2pm! Sarah will call you from 
(555) 987-6543. Talk soon!"

SYSTEM:
• Stores scheduled_at in UTC
• Stores lead_timezone = "America/Los_Angeles"
• Stores agent_timezone = "America/Chicago"
• Sends Sarah notification: "New call: Tuesday 4pm CST"
• Sends lead reminder: "Reminder: Call tomorrow at 2pm"
```

## 3 Business Day Scheduling Window

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ⏰ 3 BUSINESS DAY SCHEDULING LIMIT                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ WHY 3 DAYS?                                                             │
│ • Leads go cold quickly — momentum matters                              │
│ • Scheduling 2 weeks out = 50%+ no-show rate                            │
│ • Forces urgency and faster follow-up                                   │
│ • If you can't fit them in 3 days, Admin should prioritize              │
│                                                                         │
│ HOW IT WORKS:                                                           │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Today: Friday, Dec 27                                               │ │
│ │                                                                     │ │
│ │ AI can schedule for:                                                │ │
│ │ • Friday Dec 27 (today, if slots available)                         │ │
│ │ • Monday Dec 30 (business day 1)                                    │ │
│ │ • Tuesday Dec 31 (business day 2)                                   │ │
│ │ • Thursday Jan 2 (business day 3 — Wed is holiday)                  │ │
│ │                                                                     │ │
│ │ AI will NOT schedule for:                                           │ │
│ │ • Saturday Dec 28 (weekend - blacked out)                           │ │
│ │ • Sunday Dec 29 (weekend - blacked out)                             │ │
│ │ • Wednesday Jan 1 (holiday - blacked out)                           │ │
│ │ • Friday Jan 3+ (beyond 3 business days)                            │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ IF NO SLOTS IN 3-DAY WINDOW:                                            │
│ → Push lead to Admin List                                               │
│ → Label: source = "SMS" (or SMS_WIDGET)                                 │
│ → Status: "pending_admin"                                               │
│ → Reason: "no_availability_3day_window"                                 │
│ → AI tells lead: "Our calendar is packed! Someone will reach out        │
│   within 24 hours to find a time."                                      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Weekend Request Handling

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 📅 WEEKEND REQUEST HANDLING                                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ SCENARIO: Lead specifically asks for Saturday or Sunday                 │
│                                                                         │
│ Example conversation:                                                   │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ AI: "Want to hop on a call? I have Monday at 2pm or Tuesday at 10am"│ │
│ │                                                                     │ │
│ │ Lead: "I'm slammed during the week. Can we do Sunday?"              │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ BEHAVIOR:                                                               │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ 1. AI acknowledges the request                                      │ │
│ │    "Sunday works! Let me see what I can do."                        │ │
│ │                                                                     │ │
│ │ 2. AI "schedules" the call for Sunday                               │ │
│ │    • Creates scheduled_call record                                  │ │
│ │    • Status: "pending_admin_approval"                               │ │
│ │    • weekend_request: TRUE                                          │ │
│ │                                                                     │ │
│ │ 3. Lead is ALSO added to Admin List                                 │ │
│ │    • Flagged: "Weekend Request"                                     │ │
│ │    • Admin must approve or reschedule                               │ │
│ │                                                                     │ │
│ │ 4. AI confirms tentatively                                          │ │
│ │    "I've put you down for Sunday at [time]. Someone from our        │ │
│ │    team will confirm within 24 hours. Sound good?"                  │ │
│ │                                                                     │ │
│ │ 5. Admin reviews and either:                                        │ │
│ │    • Confirms (assigns agent willing to work Sunday)                │ │
│ │    • Reschedules (reaches out to lead with alternatives)            │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ WHY NOT JUST REJECT WEEKENDS?                                           │
│ • Some leads genuinely can only do weekends                             │
│ • Rejecting feels bad — "tentatively scheduled" feels accommodating     │
│ • Admin can decide if it's worth having someone take the call           │
│ • Hot leads (score 85+) might be worth a weekend call                   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Admin Distribution Settings

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ⚙️ ADMIN OVERFLOW SETTINGS                                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ When leads overflow to Admin (no availability, weekend request, etc.):  │
│                                                                         │
│ DISTRIBUTION MODE                                                       │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ ● Manual Distribution                                               │ │
│ │   Admin reviews each lead and assigns manually                      │ │
│ │   Best for: Small teams, high-touch sales                           │ │
│ │                                                                     │ │
│ │ ○ Auto-Distribution                                                 │ │
│ │   System automatically assigns to next available agent              │ │
│ │   Uses same round-robin/weighted rules as normal scheduling         │ │
│ │   Best for: High volume, agents have flexible availability          │ │
│ │                                                                     │ │
│ │ ○ Hybrid                                                            │ │
│ │   Auto-distribute "no availability" leads                           │ │
│ │   Manual review for "weekend request" leads                         │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ AUTO-DISTRIBUTION SETTINGS (if enabled)                                 │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ When to auto-assign:                                                │ │
│ │ ☑ When agent availability opens up                                  │ │
│ │ ☑ Daily at [8:00 AM] — batch assign overnight leads                 │ │
│ │ □ Immediately (assign even if no slots, agent calls manually)       │ │
│ │                                                                     │ │
│ │ Priority order:                                                     │ │
│ │ 1. Hot leads (score ≥ 85) first                                     │ │
│ │ 2. Oldest waiting leads                                             │ │
│ │ 3. Weekend requests last                                            │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ NOTIFICATION SETTINGS                                                   │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ ☑ Notify Admin immediately on overflow                              │ │
│ │ ☑ Daily summary email of pending leads                              │ │
│ │ ☑ Alert if lead waiting > 24 hours                                  │ │
│ │ ☑ Alert if hot lead (≥85) waiting > 4 hours                         │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ AI MESSAGE SETTINGS                                                     │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ When pushed to Admin (no availability):                             │ │
│ │ "Our calendar is packed this week! Someone will reach out within    │ │
│ │ 24 hours to find a time that works. Thanks for your patience!"      │ │
│ │                                                                     │ │
│ │ When weekend requested:                                             │ │
│ │ "I've put you down for [Day] at [Time]. Someone from our team       │ │
│ │ will confirm within 24 hours. Sound good?"                          │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## No Availability → Admin Overflow

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ⚠️ ADMIN OVERFLOW SETTINGS                                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ When NO agent has availability within the booking window:               │
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ ☑ Push lead to Admin Lead List                                      │ │
│ │                                                                     │ │
│ │ Lead Label: [SMS ▼]  ← Identifies source as SMS outreach            │ │
│ │                                                                     │ │
│ │ AI Response to Lead:                                                │ │
│ │ "Our team is slammed this week! Someone will reach out within       │ │
│ │ 24 hours to find a time that works. Thanks for your patience!"      │ │
│ │                                                                     │ │
│ │ Notify Admin: ☑ Immediately  ○ Daily digest                         │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ OVERFLOW LOGIC:                                                         │
│                                                                         │
│ 1. AI qualifies lead → Ready to book                                    │
│ 2. System checks all agent availability (next 7 days)                   │
│ 3. IF no 30-min slots available:                                        │
│    → Lead added to "Admin Lead List"                                    │
│    → Lead tagged: source = "SMS"                                        │
│    → Lead status = "Pending Admin Assignment"                           │
│    → Admin notified immediately                                         │
│    → AI tells lead someone will reach out                               │
│ 4. Admin manually assigns or schedules when capacity opens              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Admin Lead List View

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 📋 ADMIN LEAD LIST                                       [Admin Only]   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ DISTRIBUTION MODE: [Manual ▼]    [Auto] [Manual] [Hybrid]               │
│                                                                         │
│ ═══════════════════════════════════════════════════════════════════════ │
│                                                                         │
│ ⚠️ WEEKEND REQUESTS (2) — Needs Confirmation                            │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Lead             │ Source │ Score │ Requested   │ Actions           │ │
│ ├──────────────────┼────────┼───────┼─────────────┼───────────────────┤ │
│ │ Mike's Plumbing  │ 📱 SMS │ 85 🔥 │ Sun 2pm     │ [Confirm] [Resch] │ │
│ │ City HVAC        │ 💬 SMS │ 78 🔥 │ Sat 10am    │ [Confirm] [Resch] │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ 📥 PENDING ASSIGNMENT (5) — No Availability in 3-Day Window             │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Lead             │ Source │ Score │ Waiting   │ Reason    │ Action  │ │
│ ├──────────────────┼────────┼───────┼───────────┼───────────┼─────────┤ │
│ │ Premier Electric │ 📱 SMS │ 72 🔥 │ 4 hours   │ No avail  │ [Assign]│ │
│ │ Quick Rooter     │ 📱 SMS │ 68 🟡 │ 1 day     │ No avail  │ [Assign]│ │
│ │ Smith HVAC       │ 💬 SMS │ 81 🔥 │ 3 hours   │ No avail  │ [Assign]│ │
│ │ ABC Contractors  │ 📱 SMS │ 75 🔥 │ 5 hours   │ No avail  │ [Assign]│ │
│ │ Best Plumbing    │ 💬 SMS │ 62 🟡 │ 2 hours   │ No avail  │ [Assign]│ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ ⚠️ 5 leads waiting! Consider:                                           │
│ • Opening more agent availability                                       │
│ • Reducing agent blackout days                                          │
│ • Switching to Auto-Distribution mode                                   │
│                                                                         │
│ BULK ACTIONS:                                                           │
│ [Auto-Distribute All] [Assign All to Sarah] [Assign All to Mike]        │
│                                                                         │
│ ═══════════════════════════════════════════════════════════════════════ │
│                                                                         │
│ ✓ RECENTLY ASSIGNED                                                     │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Lead             │ Source │ Assigned To   │ When        │ Status    │ │
│ ├──────────────────┼────────┼───────────────┼─────────────┼───────────┤ │
│ │ Tom's Electric   │ 📱 SMS │ Sarah Johnson │ 2 hours ago │ Called    │ │
│ │ Acme Plumbing    │ 💬 SMS │ Mike Chen     │ Yesterday   │ Closed ✓  │ │
│ │ Pro HVAC (wknd)  │ 📱 SMS │ Alex Rodriguez│ Yesterday   │ Confirmed │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Weekend Request Detail View

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 📅 WEEKEND REQUEST: Mike's Plumbing                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ LEAD DETAILS                                                            │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Name: Mike Johnson                                                  │ │
│ │ Company: Mike's Plumbing                                            │ │
│ │ Phone: (555) 123-4567                                               │ │
│ │ Score: 85 🔥 HOT                                                    │ │
│ │ Source: 📱 SMS (Website Form)                                       │ │
│ │                                                                     │ │
│ │ QUALIFICATION:                                                      │ │
│ │ • Pain: Not ranking on Google, competitor beating them              │ │
│ │ • Timeline: "ASAP" — slow season coming                             │ │
│ │ • Current: Outdated website (nephew built 5 years ago)              │ │
│ │ • Recommended: Gold Pro ($399/mo)                                   │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ REQUESTED TIME                                                          │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ 📅 Sunday, Dec 29 at 2:00 PM                                        │ │
│ │                                                                     │ │
│ │ Lead said: "I'm slammed during the week. Can we do Sunday?"         │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ AI RESPONSE SENT:                                                       │
│ "I've put you down for Sunday at 2pm. Someone from our team will       │
│ confirm within 24 hours. Sound good?"                                   │
│                                                                         │
│ ═══════════════════════════════════════════════════════════════════════ │
│                                                                         │
│ ACTIONS                                                                 │
│                                                                         │
│ OPTION 1: Confirm Weekend Call                                          │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Assign to: [Sarah Johnson ▼]   (willing to work Sundays)            │ │
│ │                                                                     │ │
│ │ [Confirm Call] — AI will text: "You're all set for Sunday at 2pm    │ │
│ │ with Sarah. She'll call from (555) 987-6543!"                       │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ OPTION 2: Reschedule to Weekday                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ AI will text: "Hey Mike, Sunday isn't going to work on our end.     │ │
│ │ Could we do Monday at [time] instead? I'll make sure it's quick!"   │ │
│ │                                                                     │ │
│ │ [Send Reschedule Request]                                           │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ ⚠️ This is a HOT lead (85) — recommend confirming if possible           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Lead Source Labels

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 🏷️ LEAD SOURCE LABELS                                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ All leads are automatically labeled by source:                          │
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Label          │ Icon │ Description                                 │ │
│ ├────────────────┼──────┼─────────────────────────────────────────────┤ │
│ │ SMS            │ 📱   │ AI SMS outreach (website form, referral)    │ │
│ │ REFERRAL       │ 🎁   │ Referred by existing client                 │ │
│ │ WEBSITE        │ 🌐   │ Direct website form (no SMS follow-up)      │ │
│ │ INBOUND_CALL   │ 📞   │ Called TradesCaptain directly               │ │
│ │ COLD_EMAIL     │ 📧   │ Email outreach                              │ │
│ │ MANUAL         │ ✏️   │ Manually entered by agent                   │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ SMS LABEL DETAILS:                                                      │
│ When a lead comes through AI SMS outreach, it gets tagged:              │
│ • source = "SMS"                                                        │
│ • source_campaign = "website_instant" / "referral" / "reengagement"    │
│ • source_details = { form_url, referrer_name, etc. }                   │
│                                                                         │
│ This lets you filter and report on SMS-sourced leads specifically.     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Agent Availability Setup

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 📅 MY AVAILABILITY — Sarah Johnson                        [Save]        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ WEEKLY SCHEDULE                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Day       │ Available        │ Blocked Times                        │ │
│ ├───────────┼──────────────────┼──────────────────────────────────────┤ │
│ │ Monday    │ 9am - 5pm        │ 12pm-1pm (Lunch)                     │ │
│ │ Tuesday   │ 9am - 5pm        │ 12pm-1pm (Lunch)                     │ │
│ │ Wednesday │ 9am - 5pm        │ 12pm-1pm, 3pm-4pm (Team meeting)     │ │
│ │ Thursday  │ 9am - 5pm        │ 12pm-1pm (Lunch)                     │ │
│ │ Friday    │ 9am - 3pm        │ 12pm-1pm (Lunch)                     │ │
│ │ Saturday  │ Not available    │                                      │ │
│ │ Sunday    │ Not available    │                                      │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ TIME-OFF / EXCEPTIONS                                                   │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Dec 30 - Jan 1 — Holiday (no calls)                      [Remove]   │ │
│ │ Jan 15, 2pm-4pm — Dentist appointment                    [Remove]   │ │
│ │                                                                     │ │
│ │ [+ Add Time Off]                                                    │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ CALENDAR SYNC                                                           │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ ☑ Sync with Google Calendar                          [Connected ✓] │ │
│ │   Automatically block times when I have events                      │ │
│ │                                                                     │ │
│ │ □ Sync with Outlook Calendar                         [Connect]      │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Scheduled Calls Dashboard

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 📞 SCHEDULED CALLS                                        Today, Dec 28 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ [Today] [Tomorrow] [This Week] [All Upcoming]              [+ Manual]   │
│                                                                         │
│ ═══════════════════════════════════════════════════════════════════════ │
│                                                                         │
│ TODAY'S CALLS (4)                                                       │
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ 10:00 AM — ✓ Completed                                              │ │
│ │ Premier Electric • Sarah Williams • (555) 111-2222                  │ │
│ │ Outcome: Demo booked for Jan 3                                      │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ 11:30 AM — ✓ Completed                                              │ │
│ │ Quick Rooter • Tom Brown • (555) 222-3333                           │ │
│ │ Outcome: Not interested (has contract with competitor)              │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ 🔵 2:00 PM — IN 45 MINUTES                              [Start Call]│ │
│ │ ─────────────────────────────────────────────────────────────────── │ │
│ │ Mike's Plumbing                                                     │ │
│ │ Mike Johnson • (555) 123-4567                                       │ │
│ │                                                                     │ │
│ │ 🔥 SCORE: 85 (Hot)                                                  │ │
│ │                                                                     │ │
│ │ TRADE: Plumber                                                      │ │
│ │ LOCATION: Dallas, TX                                                │ │
│ │ SOURCE: Website form → AI qualified                                 │ │
│ │                                                                     │ │
│ │ AI SUMMARY:                                                         │ │
│ │ • Has outdated website (nephew built 5 years ago)                   │ │
│ │ • Main pain: Not showing up on Google, competitor ranks higher      │ │
│ │ • Timeline: "Sooner the better" — slow season coming                │ │
│ │ • Seems ready to buy, didn't push back on anything                  │ │
│ │                                                                     │ │
│ │ RECOMMENDED: Gold Pro ($399/mo) — Website + SEO + NeverMiss         │ │
│ │ YOUR COMMISSION: $200 upfront + $59.85/mo                           │ │
│ │                                                                     │ │
│ │ [View Conversation] [Call Script] [Reschedule] [Cancel]             │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ 4:00 PM — Scheduled                                     [Start Call]│ │
│ │ ABC Contractors • John Smith • (555) 333-4444                       │ │
│ │ 🟡 SCORE: 62 (Warm) • Referral from ACME Plumbing                   │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

# 6. AGENT CALL INTERFACE

## Pre-Call View (Expanded)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 📞 CALL: Mike's Plumbing                                  [Start Call] │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ ┌─────────────────────────────────┬─────────────────────────────────────┤
│ │ CONTACT                         │ CALL SCRIPT                         │
│ │ ────────                        │ ───────────                         │
│ │ Mike Johnson                    │                                     │
│ │ Mike's Plumbing                 │ OPENER:                             │
│ │ (555) 123-4567                  │ "Hey Mike! This is [Agent] from     │
│ │ Dallas, TX                      │ Trades Captain. We texted earlier   │
│ │                                 │ about getting your plumbing         │
│ │ 🔥 Score: 85 (Hot)              │ business showing up on Google.      │
│ │ Source: Website → AI           │ Good time for a quick chat?"        │
│ │                                 │                                     │
│ ├─────────────────────────────────┤ PAIN POINT PROBE:                   │
│ │ AI QUALIFICATION SUMMARY        │ "You mentioned your competitor      │
│ │ ──────────────────────────      │ always shows up above you. How      │
│ │                                 │ many calls would you say you're     │
│ │ Pain Points:                    │ losing to them each week?"          │
│ │ • Not ranking on Google         │                                     │
│ │ • Competitor beating them       │ SOLUTION BRIDGE:                    │
│ │                                 │ "That's exactly what we fix. We     │
│ │ Current Situation:              │ build websites that Google loves    │
│ │ • Has website (outdated, DIY)   │ AND we have this AI that texts      │
│ │ • Nephew built 5 years ago      │ your missed calls back instantly.   │
│ │                                 │ Let me show you how it works..."    │
│ │ Timeline:                       │                                     │
│ │ • Immediate ("sooner the        │ OBJECTION HANDLERS:                 │
│ │   better")                      │                                     │
│ │ • Slow season coming = urgent   │ "Too expensive":                    │
│ │                                 │ "What's it costing you to NOT       │
│ │ Budget Signals:                 │ show up? If you're losing 3 jobs    │
│ │ • Not discussed yet             │ a week at $500 each, that's $6k/mo. │
│ │                                 │ We're $399."                        │
│ │ Recommended Plan:               │                                     │
│ │ Gold Pro — $399/mo             │ "Need to think about it":           │
│ │                                 │ "Totally get it. What specifically  │
│ │ Commission:                     │ do you want to think through? I     │
│ │ $200 up + $59.85/mo             │ might be able to help."             │
│ │                                 │                                     │
│ ├─────────────────────────────────┤ "I'm locked into a contract":       │
│ │ QUICK ACTIONS                   │ "When does it end? Let's get you    │
│ │ ──────────────                  │ set up to switch the day it does."  │
│ │                                 │                                     │
│ │ [📞 Click to Call]              │ CLOSE:                              │
│ │ [💬 Send SMS]                   │ "Sound like Gold Pro is the fit —   │
│ │ [📧 Send Email]                 │ website, SEO, and the AI texting.   │
│ │                                 │ Want to get started today? I can    │
│ │ [View Full Conversation]        │ have the team begin this week."     │
│ │ [Open Plan Details]             │                                     │
│ │                                 │                                     │
│ └─────────────────────────────────┴─────────────────────────────────────┘
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Click-to-Call Integration

```
┌─────────────────────────────────────────────────────────────────────────┐
│ CLICK-TO-CALL OPTIONS                                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ OPTION A: Browser-Based (Twilio)                                        │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ • Call directly from browser                                        │ │
│ │ • Uses agent's TradesCaptain number                                 │ │
│ │ • Caller ID shows company number                                    │ │
│ │ • Auto-logs call in CRM                                             │ │
│ │ • Optional: Record calls (with consent)                             │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ OPTION B: Phone Link (Mobile)                                           │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ • Opens native phone app                                            │ │
│ │ • Agent manually logs outcome after                                 │ │
│ │ • Simpler but less tracking                                         │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ RECOMMENDED: Option A for desktop agents, Option B for mobile           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Post-Call Logging

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 📝 LOG CALL OUTCOME                                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ CALL: Mike's Plumbing — Mike Johnson                                   │
│ DURATION: 12 minutes                                                    │
│                                                                         │
│ OUTCOME                                                                 │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ ● Sale Closed                                                       │ │
│ │ ○ Demo/Follow-up Scheduled                                          │ │
│ │ ○ Callback Requested                                                │ │
│ │ ○ Not Interested                                                    │ │
│ │ ○ No Answer                                                         │ │
│ │ ○ Wrong Number                                                      │ │
│ │ ○ Not Qualified                                                     │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ ─── IF SALE CLOSED ─────────────────────────────────────────────────── │
│                                                                         │
│ Plan Sold: [Gold Pro ▼]                                                │
│ Billing: ● Monthly  ○ Annual                                           │
│ Offer Applied: [None ▼]                                                │
│ Start Date: [Dec 30, 2025]                                             │
│                                                                         │
│ ─── IF DEMO SCHEDULED ──────────────────────────────────────────────── │
│                                                                         │
│ Demo Date: [Jan 3, 2025]  Time: [2:00 PM ▼]                            │
│ Demo Type: ● Phone  ○ Video (Zoom)                                     │
│                                                                         │
│ ─── IF NOT INTERESTED ──────────────────────────────────────────────── │
│                                                                         │
│ Reason: [Has competitor contract ▼]                                    │
│ Re-engage in: [90 days ▼]                                              │
│                                                                         │
│ ─────────────────────────────────────────────────────────────────────── │
│                                                                         │
│ NOTES                                                                   │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Great call! Mike was ready to go. Signed up for Gold Pro. Starting  │ │
│ │ Dec 30. Mentioned he might have a buddy who needs help too —        │ │
│ │ asked for referral info.                                            │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ [Save & Close]                                                          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

# 7. POST-CALL AUTOMATION

## Automated Follow-Up by Outcome

```
┌─────────────────────────────────────────────────────────────────────────┐
│ POST-CALL AUTOMATION RULES                                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ OUTCOME: SALE CLOSED                                                    │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Immediately:                                                        │ │
│ │ • Convert lead → client record                                      │ │
│ │ • Calculate commission                                              │ │
│ │ • Credit referrer (if applicable)                                   │ │
│ │ • Send welcome email with next steps                                │ │
│ │ • Trigger onboarding checklist                                      │ │
│ │                                                                     │ │
│ │ AI Text (within 5 min):                                             │ │
│ │ "Hey [Name]! Great chatting with [Agent]. Welcome to Trades         │ │
│ │ Captain! You'll get an email shortly with next steps. Excited       │ │
│ │ to help you crush it on Google 🚀"                                  │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ OUTCOME: DEMO SCHEDULED                                                 │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Immediately:                                                        │ │
│ │ • Create calendar event                                             │ │
│ │ • Send calendar invite to lead                                      │ │
│ │                                                                     │ │
│ │ AI Text (within 5 min):                                             │ │
│ │ "Awesome! You're booked for [Date] at [Time]. [Agent] will          │ │
│ │ [call/send Zoom link]. Talk soon!"                                  │ │
│ │                                                                     │ │
│ │ Reminder (morning of):                                              │ │
│ │ "Hey [Name], just a reminder — [Agent] will call you today at       │ │
│ │ [Time]. Looking forward to it!"                                     │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ OUTCOME: CALLBACK REQUESTED                                             │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ AI Text (within 5 min):                                             │ │
│ │ "No problem! When's a better time to chat? I can have [Agent]       │ │
│ │ call you back."                                                     │ │
│ │                                                                     │ │
│ │ → AI handles rescheduling via text                                  │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ OUTCOME: NO ANSWER                                                      │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ AI Text (within 5 min):                                             │ │
│ │ "Hey [Name], tried calling but missed you! Want to reschedule?      │ │
│ │ I have [Day] at [Time] or [Day] at [Time]."                         │ │
│ │                                                                     │ │
│ │ If no reply in 24 hours:                                            │ │
│ │ "Hey, just following up — still want to chat about getting more     │ │
│ │ calls for your [trade] business?"                                   │ │
│ │                                                                     │ │
│ │ If no reply in 72 hours:                                            │ │
│ │ → Move to nurture sequence                                          │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ OUTCOME: NOT INTERESTED                                                 │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ AI Text (within 5 min):                                             │ │
│ │ "No worries at all! If anything changes, feel free to text back.    │ │
│ │ Good luck with the business!"                                       │ │
│ │                                                                     │ │
│ │ If re-engage date set:                                              │ │
│ │ → Add to re-engagement campaign for that date                       │ │
│ │                                                                     │ │
│ │ Otherwise:                                                          │ │
│ │ → Mark as closed-lost, no further contact                           │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Voicemail Drop

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 📢 VOICEMAIL DROP                                                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ When agent's call goes to voicemail, option to drop pre-recorded VM:    │
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ [Drop Voicemail ▼]                                                  │ │
│ │                                                                     │ │
│ │ Available Voicemails:                                               │ │
│ │ • Standard Intro (15 sec)                                           │ │
│ │ • Following Up on Form (12 sec)                                     │ │
│ │ • Referral Intro (18 sec)                                           │ │
│ │ • Re-engagement (14 sec)                                            │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ STANDARD INTRO SCRIPT:                                                  │
│ "Hey [Name], this is [Agent] from Trades Captain. You reached out       │
│ about getting more calls for your [trade] business — just wanted to     │
│ connect and see how I can help. Give me a call back at [number] or      │
│ just reply to my text. Talk soon!"                                      │
│                                                                         │
│ BENEFITS:                                                               │
│ • Saves agent 30+ seconds per voicemail                                 │ │
│ • Consistent, professional message                                      │ │
│ • Higher callback rate than live rambling                               │ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

# 8. LEAD NURTURE SEQUENCES

## Nurture Campaign Setup

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 🌱 NURTURE SEQUENCES                                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ SEQUENCE: Not Ready — Check Back Later                                  │
│ ───────────────────────────────────                                     │
│ Trigger: Lead says "not ready now" or score 40-69                       │
│ Goal: Stay top of mind, re-engage when timing is right                  │
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Day 0 (Immediate)                                                   │ │
│ │ "Totally get it — timing is everything. Mind if I check back in     │ │
│ │ a few weeks?"                                                       │ │
│ │                                                                     │ │
│ │ Day 14                                                              │ │
│ │ "Hey [Name], just checking in. Any updates on the website/          │ │
│ │ marketing front? Here if you need anything."                        │ │
│ │                                                                     │ │
│ │ Day 30                                                              │ │
│ │ "Quick thought — busy season for [trade] is coming up. Might be     │ │
│ │ worth getting your online presence dialed before it hits. Want      │ │
│ │ to chat?"                                                           │ │
│ │                                                                     │ │
│ │ Day 60                                                              │ │
│ │ "Hey [Name], it's been a couple months. Still thinking about        │ │
│ │ getting more [trade] calls? Happy to help whenever you're ready."   │ │
│ │                                                                     │ │
│ │ Day 90 — FINAL                                                      │ │
│ │ "Last check-in for now — if you ever need help with your website    │ │
│ │ or getting more calls, just text back. Good luck out there!"        │ │
│ │                                                                     │ │
│ │ [End Sequence]                                                      │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ EXIT CONDITIONS:                                                        │
│ • Lead replies → Route to AI for live conversation                      │
│ • Lead says STOP → Immediate opt-out                                    │
│ • Lead books call → Exit sequence                                       │
│ • Lead converts → Exit sequence                                         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ SEQUENCE: No-Show Recovery                                              │
│ ─────────────────────────                                               │
│ Trigger: Lead doesn't answer scheduled call                             │
│ Goal: Reschedule or re-qualify                                          │
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Immediately after no-show                                           │ │
│ │ "Hey [Name], tried calling but missed you. Want to reschedule?      │ │
│ │ I have [times]."                                                    │ │
│ │                                                                     │ │
│ │ 24 hours later (if no reply)                                        │ │
│ │ "Just following up — still interested in chatting about getting     │ │
│ │ more calls for your [trade] business?"                              │ │
│ │                                                                     │ │
│ │ 72 hours later (if no reply)                                        │ │
│ │ "I'll take the hint 😄 If timing changes, just text back. Good      │ │
│ │ luck with the business!"                                            │ │
│ │                                                                     │ │
│ │ [Move to long-term nurture]                                         │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ SEQUENCE: Competitor Contract Expiring                                  │
│ ───────────────────────────────────────                                 │
│ Trigger: Lead has competitor contract, gave expiration date             │
│ Goal: Re-engage right before contract ends                              │
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ 30 days before expiration                                           │ │
│ │ "Hey [Name], your contract with [Competitor] should be ending       │ │
│ │ soon. Ready to make the switch? We can have everything ready to     │ │
│ │ go the day it ends."                                                │ │
│ │                                                                     │ │
│ │ 14 days before                                                      │ │
│ │ "Just 2 weeks until you're free! Want to hop on a quick call and    │ │
│ │ get the ball rolling?"                                              │ │
│ │                                                                     │ │
│ │ Day of expiration                                                   │ │
│ │ "Happy freedom day! 🎉 Ready to switch to something that actually   │ │
│ │ works? Let me know."                                                │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Nurture Dashboard

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 🌱 NURTURE OVERVIEW                                        December 2025│
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ LEADS IN NURTURE SEQUENCES                                              │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Sequence                    │ Active │ Reactivated │ Converted      │ │
│ ├─────────────────────────────┼────────┼─────────────┼────────────────┤ │
│ │ Not Ready — Check Back      │ 47     │ 8 (17%)     │ 3 (6%)         │ │
│ │ No-Show Recovery            │ 12     │ 5 (42%)     │ 2 (17%)        │ │
│ │ Competitor Contract         │ 8      │ 4 (50%)     │ 2 (25%)        │ │
│ │ Seasonal Re-engagement      │ 23     │ 6 (26%)     │ 1 (4%)         │ │
│ ├─────────────────────────────┼────────┼─────────────┼────────────────┤ │
│ │ TOTAL                       │ 90     │ 23 (26%)    │ 8 (9%)         │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ MESSAGES GOING OUT TODAY: 14                                            │
│ MESSAGES THIS WEEK: 67                                                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

# 9. REFERRAL PROGRAM INTEGRATION

## Referral Submission Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 🎁 SUBMIT REFERRAL                                      [Client Portal] │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ Know a contractor who could use our help?                               │
│ Refer them and get $100 when they sign up!                              │
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Their Name:        [Mike Johnson                    ]               │ │
│ │ Their Phone:       [(555) 123-4567                  ]               │ │
│ │ Their Trade:       [Plumber ▼                       ]               │ │
│ │ Their Company:     [Mike's Plumbing (optional)      ]               │ │
│ │                                                                     │ │
│ │ Anything we should know?                                            │ │
│ │ [He's been complaining about not getting calls. Think he'd love    ]│ │
│ │ [the AI texting thing.                                             ]│ │
│ │                                                                     │ │
│ │ [Submit Referral]                                                   │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ HOW IT WORKS:                                                           │
│ 1. We'll text your referral with a friendly intro (mentioning you)     │
│ 2. Our AI qualifies them and books a call                              │
│ 3. When they sign up, you get $100!                                    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Referral Outreach Message

```
AI INITIAL MESSAGE (Referral):

"Hey [Referral Name]! [Referrer Name] from [Referrer Company] mentioned 
you might be looking for help getting more calls for your [trade] 
business. I'm with Trades Captain — we set them up with a website and 
this AI that texts back missed calls automatically. Mind if I ask what 
you're working with currently?"
```

## Referral Tracking

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 🎁 REFERRAL TRACKING                                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ REFERRER: John Smith (ACME Plumbing) — Gold Pro Client                 │
│                                                                         │
│ REFERRALS SUBMITTED: 4                                                  │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Referral          │ Status        │ Submitted  │ Reward             │ │
│ ├────────────────────┼───────────────┼────────────┼────────────────────┤ │
│ │ Mike's Plumbing    │ ✓ Converted   │ Dec 15     │ $100 ✓ Paid        │ │
│ │ Premier Electric   │ In Nurture    │ Dec 20     │ Pending            │ │
│ │ Quick Rooter       │ Call Scheduled│ Dec 26     │ Pending            │ │
│ │ City HVAC          │ AI Qualifying │ Dec 28     │ Pending            │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ TOTAL EARNED: $100                                                      │
│ PENDING: $300 (if all convert)                                          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

# 10. A/B TESTING

## Message Testing

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 🧪 A/B TESTS                                                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ ACTIVE TEST: Initial Message — Website Leads                            │
│ ───────────────────────────────────────────                             │
│ Started: Dec 15 • Sample: 200 leads • Status: Running                   │
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ VARIANT A (Control) — 50%                                           │ │
│ │ "Hey [Name]! Just saw you checked out Trades Captain. I help        │ │
│ │ [trade] businesses get more calls with websites that actually       │ │
│ │ rank on Google. What's your biggest challenge right now?"           │ │
│ │                                                                     │ │
│ │ Sent: 100 • Replies: 38 (38%) • Qualified: 14 • Booked: 9           │ │
│ ├─────────────────────────────────────────────────────────────────────┤ │
│ │ VARIANT B — 50%                                                     │ │
│ │ "Hey [Name]! Quick question — are you losing calls to competitors   │ │
│ │ because they show up on Google and you don't? We fix that for       │ │
│ │ [trade] businesses. Worth a chat?"                                  │ │
│ │                                                                     │ │
│ │ Sent: 100 • Replies: 45 (45%) • Qualified: 18 • Booked: 12          │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ 📊 CURRENT WINNER: Variant B (+18% reply rate, +33% bookings)           │
│ Statistical Significance: 87% (need 95% to declare winner)              │
│                                                                         │
│ [End Test & Use Winner] [Continue Testing] [Add Variant C]              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## What to Test

```
TEST OPPORTUNITIES:
─────────────────────

INITIAL MESSAGE:
• Question vs. statement opener
• Mention pain point vs. solution first
• Include emoji vs. no emoji
• Sign off with name vs. no name

TIMING:
• Instant (60 sec) vs. delayed (5 min) first message
• Morning vs. afternoon sends
• Weekday vs. weekend

QUALIFICATION:
• 3 questions vs. 5 questions
• Ask budget early vs. late
• Direct close vs. soft schedule

SCHEDULING:
• Offer 2 times vs. 3 times
• Specific times vs. "morning or afternoon?"
• Call vs. Zoom default
```

---

# 11. COMPLIANCE & AUDIT TRAIL

## Consent Audit Log

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 📋 COMPLIANCE AUDIT — (555) 123-4567                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ CONSENT RECORD                                                          │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Type: Express Written Consent                                       │ │
│ │ Source: Website Form (tradescaptain.com/contact)                    │ │
│ │ Collected: Dec 26, 2025 at 2:34:18 PM CST                           │ │
│ │ IP Address: 192.168.1.45                                            │ │
│ │ User Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 16_0...)             │ │
│ │                                                                     │ │
│ │ Consent Language Displayed:                                         │ │
│ │ "I agree to receive text messages from Trades Captain about my      │ │
│ │ inquiry and services. Message frequency varies. Reply STOP to       │ │
│ │ opt out. Message & data rates may apply."                           │ │
│ │                                                                     │ │
│ │ Status: ✓ VALID                                                     │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ MESSAGE LOG                                                             │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ #  │ Time              │ Dir │ Content (truncated)        │ Status │ │
│ ├────┼───────────────────┼─────┼────────────────────────────┼────────┤ │
│ │ 1  │ Dec 26 2:34:45 PM │ OUT │ "Hey Mike! Just saw..."    │ Sent   │ │
│ │ 2  │ Dec 26 2:36:12 PM │ IN  │ "Getting found. I..."      │ Recv'd │ │
│ │ 3  │ Dec 26 2:36:30 PM │ OUT │ "Ugh, that's frustrating..." │ Sent │ │
│ │ 4  │ Dec 26 2:37:45 PM │ IN  │ "I have a website but..."  │ Recv'd │ │
│ │ 5  │ Dec 26 2:38:01 PM │ OUT │ "Ha, we hear that a lot!"  │ Sent   │ │
│ │ 6  │ Dec 26 2:38:55 PM │ IN  │ "Sooner the better..."     │ Recv'd │ │
│ │ 7  │ Dec 26 2:39:15 PM │ OUT │ "Sounds like we can help!" │ Sent   │ │
│ │ 8  │ Dec 26 2:40:30 PM │ IN  │ "Tuesday works"            │ Recv'd │ │
│ │ 9  │ Dec 26 2:40:45 PM │ OUT │ "Perfect! Sarah will..."   │ Sent   │ │
│ │ 10 │ Dec 28 9:00:00 AM │ OUT │ "Reminder: call today..."  │ Sent   │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ OPT-OUT HISTORY: None                                                   │
│                                                                         │
│ SENDING WINDOW COMPLIANCE: ✓ All messages sent 8am-9pm recipient TZ     │
│                                                                         │
│ [Export Full Audit Log]                                                 │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Opt-Out Handling

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 🚫 OPT-OUT MANAGEMENT                                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ OPT-OUT KEYWORDS (Automatically Detected):                              │
│ STOP, UNSUBSCRIBE, CANCEL, END, QUIT, REMOVE, OPTOUT, OPT OUT           │
│                                                                         │
│ AUTOMATIC RESPONSE:                                                     │
│ "You've been removed from our messages. If you ever want to             │
│ reconnect, just text us back. Take care!"                               │
│                                                                         │
│ ═══════════════════════════════════════════════════════════════════════ │
│                                                                         │
│ RECENT OPT-OUTS                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Phone          │ Date       │ Keyword │ Campaign    │ Msg Count    │ │
│ ├────────────────┼────────────┼─────────┼─────────────┼──────────────┤ │
│ │ (555) 111-2222 │ Dec 27     │ STOP    │ Website     │ 2            │ │
│ │ (555) 333-4444 │ Dec 25     │ Remove  │ Re-engage   │ 4            │ │
│ │ (555) 555-6666 │ Dec 22     │ STOP    │ Referral    │ 1            │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ OPT-OUT RATE: 2.3% (industry avg: 3-5%)                                 │
│                                                                         │
│ ⚠️ IMPORTANT: Opted-out numbers are blocked from ALL future campaigns   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

# 12. CAMPAIGN MANAGEMENT

## Campaign List

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 📢 OUTREACH CAMPAIGNS                                    [+ New Campaign]│
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ ACTIVE CAMPAIGNS                                                        │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Campaign              │ Type        │ Contacts │ Reply % │ Status   │ │
│ ├───────────────────────┼─────────────┼──────────┼─────────┼──────────┤ │
│ │ Website Form Instant  │ Auto        │ 847      │ 42%     │ ✓ Active │ │
│ │ Referral Outreach     │ Auto        │ 124      │ 51%     │ ✓ Active │ │
│ │ 30-Day Re-engagement  │ Auto        │ 203      │ 18%     │ ✓ Active │ │
│ │ Holiday Promo 2025    │ Scheduled   │ 156      │ 24%     │ ✓ Active │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ PAUSED CAMPAIGNS                                                        │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Campaign              │ Type        │ Contacts │ Reply % │ Status   │ │
│ ├───────────────────────┼─────────────┼──────────┼─────────┼──────────┤ │
│ │ Q3 Promo              │ Scheduled   │ 89       │ 21%     │ ⏸ Paused │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Campaign Builder

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 📝 CREATE CAMPAIGN                                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ BASICS                                                                  │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Campaign Name:  [January Re-engagement                    ]         │ │
│ │ Campaign Type:  ● Scheduled  ○ Auto-trigger                         │ │
│ │ Description:    [Re-engage leads from November who went cold]       │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ AUDIENCE                                                                │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Source: ● Existing leads  ○ Import CSV                              │ │
│ │                                                                     │ │
│ │ Filters:                                                            │ │
│ │ • Lead status: [Unresponsive ▼]                                     │ │
│ │ • Created: [Nov 1] to [Nov 30]                                      │ │
│ │ • Has consent: ☑ Required                                          │ │
│ │ • Not opted out: ☑ Required                                        │ │
│ │                                                                     │ │
│ │ Matching Leads: 67                                                  │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ INITIAL MESSAGE                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Hey [Name]! We chatted back in November about getting more calls    │ │
│ │ for your [trade] business. Still looking for help? We just          │ │
│ │ launched some new features I think you'd love.                      │ │
│ │                                                                     │ │
│ │ Variables: [Name], [Trade], [Company]                               │ │
│ │ Character count: 187 (1 segment)                                    │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ AI BEHAVIOR                                                             │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ When lead replies:  ● Use AI to continue conversation               │ │
│ │                     ○ Notify agent immediately                      │ │
│ │                     ○ Send auto-reply                               │ │
│ │                                                                     │ │
│ │ AI Goal:           [Qualify and book demo call ▼]                   │ │
│ │ Max AI messages:   [5] before escalating to agent                   │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ SCHEDULING                                                              │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Send window:       [9:00 AM] to [6:00 PM]                           │ │
│ │ Send days:         ☑ Mon ☑ Tue ☑ Wed ☑ Thu ☑ Fri □ Sat □ Sun       │ │
│ │ Start date:        [Jan 6, 2025]                                    │ │
│ │ Daily send limit:  [20] per day                                     │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ [Save Draft] [Start Campaign]                                           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

# 13. REPORTING & ANALYTICS

## Outreach Dashboard

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 📊 OUTREACH ANALYTICS                                   December 2025   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ FUNNEL PERFORMANCE                                                      │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │                                                                     │ │
│ │   Leads In        Contacted        Replied        Qualified         │ │
│ │     324              324             142             58             │ │
│ │   ████████        ████████         ██████          ████            │ │
│ │    100%             100%            44%             18%             │ │
│ │                                                                     │ │
│ │   Demo Booked     Demo Done        Closed                          │ │
│ │       38              31              12                            │ │
│ │      ███             ██               █                             │ │
│ │      12%             10%             4%                             │ │
│ │                                                                     │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ KEY METRICS                                                             │
│ ┌─────────────────┬─────────────────┬─────────────────┬───────────────┐ │
│ │  REPLY RATE     │  QUALIFICATION  │  SHOW RATE      │  CLOSE RATE   │ │
│ │                 │  RATE           │                 │               │ │
│ │     44%         │     41%         │     82%         │     39%       │ │
│ │  +8% vs last mo │  +3% vs last mo │  +5% vs last mo │  +2% vs last  │ │
│ └─────────────────┴─────────────────┴─────────────────┴───────────────┘ │
│                                                                         │
│ ═══════════════════════════════════════════════════════════════════════ │
│                                                                         │
│ REVENUE ATTRIBUTION                                                     │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ New MRR from AI Outreach:               $3,588                      │ │
│ │ (12 deals × $299 avg)                                               │ │
│ │                                                                     │ │
│ │ Cost of Outreach:                       $45                         │ │
│ │ (324 leads × $0.10 + AI costs)                                      │ │
│ │                                                                     │ │
│ │ ROI:                                    7,873%                      │ │
│ │ Cost per Acquisition:                   $3.75                       │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ CAMPAIGN BREAKDOWN                                                      │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Campaign              │ Leads │ Replied │ Booked │ Closed │ Revenue │ │
│ ├───────────────────────┼───────┼─────────┼────────┼────────┼─────────┤ │
│ │ Website Form Instant  │ 187   │ 82 (44%)│ 24     │ 8      │ $2,392  │ │
│ │ Referral Outreach     │ 34    │ 19 (56%)│ 10     │ 3      │ $897    │ │
│ │ 30-Day Re-engagement  │ 89    │ 31 (35%)│ 3      │ 1      │ $299    │ │
│ │ Holiday Promo         │ 14    │ 10 (71%)│ 1      │ 0      │ $0      │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ AGENT PERFORMANCE (Call Outcomes)                                       │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Agent           │ Calls │ Connected │ Closed │ Close Rate │ Revenue │ │
│ ├─────────────────┼───────┼───────────┼────────┼────────────┼─────────┤ │
│ │ Sarah Johnson   │ 15    │ 13        │ 6      │ 46%        │ $1,794  │ │
│ │ Mike Chen       │ 14    │ 11        │ 4      │ 36%        │ $1,196  │ │
│ │ Alex Rodriguez  │ 9     │ 7         │ 2      │ 29%        │ $598    │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ [Export Report] [Schedule Weekly Email]                                 │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## AI Performance Metrics

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 🤖 AI CONVERSATION ANALYTICS                                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ CONVERSATION QUALITY                                                    │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Avg messages to qualify:                4.2                         │ │
│ │ Avg time to qualify:                    8 minutes                   │ │
│ │ Qualification accuracy:                 89%                         │ │
│ │ (Leads AI marked "hot" that actually closed)                        │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ INTENT DETECTION ACCURACY                                               │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Correctly detected interest:            94%                         │ │
│ │ Correctly detected objections:          87%                         │ │
│ │ Correctly detected STOP/opt-out:        100%                        │ │
│ │ False positives (thought interested):   6%                          │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ RESPONSE TIME                                                           │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Avg first message:                      47 seconds after form       │ │
│ │ Avg reply to lead message:              12 seconds                  │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ ESCALATIONS                                                             │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Conversations escalated to human:       8%                          │ │
│ │ Top escalation reasons:                                             │ │
│ │ • Complex pricing questions (42%)                                   │ │
│ │ • Confused/frustrated lead (31%)                                    │ │
│ │ • Off-topic conversation (27%)                                      │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

# 14. ADDITIONAL FEATURES

## 14.1 No-Show Escalation Rules

Escalation tiers for serial no-shows:
- **No-Show #1**: AI texts "Hey, missed you! Want to reschedule?" → Retry 24hrs, 72hrs
- **No-Show #2**: Flag "At Risk", notify agent, reduce score -15, consider reassignment  
- **No-Show #3**: AI texts "Last try — should I close your file?" → Long-term nurture, score -25
- **No-Show #4+**: Archive, no automation, eligible for re-engagement after 90 days

Exceptions: Hot leads (≥85) get 1 extra attempt. Referral leads notify referrer at 2nd no-show.

## 14.2 Speed-to-Lead Dashboard

Track response times at every stage:
- **First Text**: Target <60 seconds (form submit → AI text)
- **First Reply**: Target <5 minutes (AI text → lead replies)
- **Call Booked**: Target <30 minutes (reply → call scheduled)

Breakdowns: By source, by agent, by hour of day. Speed alerts when targets missed.

## 14.3 Lead Reassignment

Bulk reassign leads when agents leave, go on vacation, or need load balancing:
- Select source agent → Select leads → Assign to specific agent OR distribute evenly OR round robin
- Options: Notify new agent, update calendar, send lead SMS about new contact
- Tracks reassignment history with reason (leaving, vacation, load balance, performance)

## 14.4 Slack Notifications

Real-time notifications to Slack channels:
- **#sales-leads**: New leads, qualifications, hot lead alerts, bookings
- **#sales-wins**: Closed deals with agent, plan, MRR, commission
- **#sales-alerts**: No-shows, speed alerts, escalations, overflow
- **Agent DMs**: Their assigned leads, call reminders, replies

## 14.5 DNC List Checking (Datazapp)

Check numbers before outreach using Datazapp API:
- Federal DNC Registry
- State DNC Registries (all 50)
- Known Litigator List (TCPA lawsuit filers)

Flow: Lead created → Check internal suppression → Check Datazapp → Block if flagged.
Cache results 30 days. Re-check leads older than 90 days before re-engagement.

## 14.6 Lead Import (CSV)

Bulk import leads from CSV/XLSX:
- Upload file → Map columns → Set source label → Preview (valid/invalid/duplicates/DNC)
- Options: Check DNC before import, skip duplicates, normalize phones
- Assign to agent or auto-distribute, start outreach immediately or add to campaign

## 14.7 Self-Scheduling Link

Built-in Calendly-like booking:
- Agent link: `book.tradescaptain.com/sarah-johnson`
- Team link: `book.tradescaptain.com/team` (round robin)
- Lead selects date → available times → enters info → books
- Respects agent hours, blackouts, 3-day window, 30-min buffer
- AI can share link: "Here's a link to grab a time: [link]"

## 14.8 Email Notifications

Backup channel via SendGrid/Postmark:
- Agent emails: New lead assigned, hot alerts, call reminders, daily summary
- Admin emails: Daily speed report, weekly performance, no-show escalations, DNC digest

## 14.9 Team Leaderboard

Gamification dashboard:
- Rankings by deals, MRR, commission, close rate
- Achievements: Closing streak, speed demon, big game hunter, rising star
- Quick stats comparison: Leads, calls, close rate, response time, no-show rate
- Monthly goal progress bar

## 14.10 Decision Maker Check

AI asks early: "Are you the one who handles marketing decisions?"
- If not: Get decision maker's name, offer to send info to share
- Flag: `decision_maker = false`, add note, adjust score -10
- Don't be rude — gatekeepers can become champions

## 14.11 Competitor Mention Detection

AI detects competitor mentions:
- Known competitors: Scorpion, ServiceTitan, Housecall Pro, Jobber, "my nephew"
- When detected: Don't bash, ask what they like/dislike, focus on differentiation
- Flag: `competitor_mentioned = true`, alert agent
- Dashboard: Competitor mentions, win rate vs each, common objections

## 14.12 Lead Enrichment

Auto-lookup company info via Clearbit/Apollo:
- Company website, size, estimated revenue, years in business
- Google reviews count + rating
- Social profiles
- AI insights: "Website is 5+ years old — likely needs refresh"

## 14.13 Revenue Forecasting

Predict next month's revenue:
- Pipeline breakdown by stage with conversion rates
- Weighted projection based on stage probability
- Scenario analysis: Pessimistic, expected, optimistic
- Confidence percentage based on historical accuracy

## 14.14 Multi-Touch Attribution

Track touchpoints that lead to conversion:
- Models: First touch, last touch, linear, time decay, position-based
- Touchpoint value: Form, AI text, qualification, scheduled call, agent call, proposal
- Journey visualization per deal
- Insights: Which touchpoints are undervalued

## 14.15 Zapier Integration

Send events via webhooks:
- Events: New lead, qualified, call scheduled, call completed, deal closed
- Payload includes lead info, deal info, agent
- Popular zaps: Google Sheets, QuickBooks invoice, Mailchimp, HubSpot

## 14.16 Mobile Agent App (Planned - Phase 2)

React Native app for iOS + Android:
- View assigned leads, push notifications, tap-to-call
- Log call outcomes, view schedule, quick reply
- Offline mode, biometric auth
- Effort: 80-120 hours

---

# 15. DATABASE SCHEMA

```sql
-- =====================================================
-- OUTREACH CORE TABLES
-- =====================================================

-- Consent tracking (TCPA compliance)
CREATE TABLE sms_consent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) NOT NULL,
  
  consent_type VARCHAR(50) NOT NULL,        -- 'express_written', 'express', 'implied'
  consent_source VARCHAR(100) NOT NULL,     -- 'website_form', 'referral_submit', 'inbound_inquiry'
  
  consent_timestamp TIMESTAMPTZ NOT NULL,
  consent_ip VARCHAR(50),
  consent_user_agent TEXT,
  consent_form_url TEXT,
  consent_language TEXT,                    -- Exact text shown to user
  
  is_valid BOOLEAN DEFAULT true,
  revoked_at TIMESTAMPTZ,
  revoke_method VARCHAR(50),                -- 'STOP_reply', 'manual', 'complaint'
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Global opt-out list
CREATE TABLE sms_opt_outs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) UNIQUE NOT NULL,
  
  opted_out_at TIMESTAMPTZ NOT NULL,
  opt_out_method VARCHAR(50),               -- 'STOP_reply', 'manual_request', 'complaint'
  opt_out_keyword VARCHAR(20),              -- 'STOP', 'UNSUBSCRIBE', etc.
  original_campaign_id UUID,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Outreach campaigns
CREATE TABLE outreach_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  name VARCHAR(200) NOT NULL,
  description TEXT,
  campaign_type VARCHAR(50) NOT NULL,       -- 'website_instant', 'referral', 'reengagement', 'scheduled'
  
  status VARCHAR(20) DEFAULT 'draft',       -- 'draft', 'active', 'paused', 'completed'
  
  -- Messaging
  initial_message_template TEXT NOT NULL,
  ai_system_prompt TEXT,
  ai_goal VARCHAR(50),                      -- 'qualify_and_book', 'qualify_only', 'book_only'
  max_ai_messages INTEGER DEFAULT 5,
  
  -- Timing
  trigger_type VARCHAR(50),                 -- 'immediate', 'delayed', 'scheduled'
  trigger_delay_minutes INTEGER DEFAULT 0,
  sending_window_start TIME DEFAULT '09:00',
  sending_window_end TIME DEFAULT '18:00',
  sending_days INTEGER[] DEFAULT '{1,2,3,4,5}',  -- 1=Mon, 7=Sun
  daily_send_limit INTEGER,
  
  -- Auto-trigger settings (for auto campaigns)
  trigger_source VARCHAR(50),               -- 'website_form', 'referral', 'lead_status_change'
  trigger_conditions JSONB,
  
  -- Stats (denormalized for performance)
  contacts_total INTEGER DEFAULT 0,
  contacts_messaged INTEGER DEFAULT 0,
  contacts_replied INTEGER DEFAULT 0,
  contacts_qualified INTEGER DEFAULT 0,
  demos_booked INTEGER DEFAULT 0,
  deals_closed INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Outreach contacts (leads in campaigns)
CREATE TABLE outreach_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES outreach_campaigns(id),
  
  -- Contact info
  phone VARCHAR(20) NOT NULL,
  name VARCHAR(100),
  company_name VARCHAR(200),
  email VARCHAR(200),
  trade VARCHAR(50),
  city VARCHAR(100),
  state VARCHAR(50),
  
  -- Timezone (for scheduling)
  timezone VARCHAR(50),                     -- 'America/Los_Angeles', detected from area code or asked
  timezone_source VARCHAR(20),              -- 'area_code', 'user_provided', 'city_state', 'default'
  
  -- Source tracking (IMPORTANT: Always labeled)
  source VARCHAR(50) NOT NULL,              -- 'SMS', 'REFERRAL', 'WEBSITE', 'INBOUND_CALL', 'COLD_EMAIL', 'MANUAL'
  source_campaign VARCHAR(50),              -- 'website_instant', 'referral', 'reengagement', etc.
  source_details JSONB,                     -- Form URL, referrer info, etc.
  referrer_client_id UUID REFERENCES clients(id),
  
  -- Consent
  consent_id UUID REFERENCES sms_consent(id) NOT NULL,
  
  -- Status
  status VARCHAR(30) DEFAULT 'pending',     -- 'pending', 'contacted', 'replied', 'qualifying', 
                                            -- 'qualified', 'call_scheduled', 'call_completed',
                                            -- 'pending_admin', 'converted', 'nurture', 'opted_out', 'unresponsive'
  
  -- Admin overflow
  overflow_to_admin BOOLEAN DEFAULT false,  -- TRUE if no agent availability
  overflow_reason VARCHAR(100),             -- 'no_availability', 'all_agents_at_capacity', etc.
  overflow_at TIMESTAMPTZ,                  -- When pushed to admin
  admin_notified BOOLEAN DEFAULT false,
  admin_assigned_by UUID REFERENCES agents(id),  -- Admin who picked it up
  admin_assigned_at TIMESTAMPTZ,
  
  -- Lead scoring
  score INTEGER DEFAULT 0,
  score_breakdown JSONB,
  interest_level VARCHAR(20),               -- 'hot', 'warm', 'cold'
  
  -- AI qualification data
  pain_points TEXT[],
  current_solution TEXT,
  timeline VARCHAR(50),
  budget_signal VARCHAR(50),
  recommended_plan VARCHAR(50),
  qualification_summary TEXT,
  
  -- Call scheduling
  scheduled_call_id UUID,
  assigned_agent_id UUID REFERENCES agents(id),
  
  -- Conversion
  converted_at TIMESTAMPTZ,
  converted_client_id UUID REFERENCES clients(id),
  converted_plan VARCHAR(50),
  
  -- Messaging stats
  messages_sent INTEGER DEFAULT 0,
  messages_received INTEGER DEFAULT 0,
  first_message_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ,
  first_reply_at TIMESTAMPTZ,
  last_reply_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Outreach conversations
CREATE TABLE outreach_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES outreach_contacts(id) NOT NULL,
  campaign_id UUID REFERENCES outreach_campaigns(id) NOT NULL,
  
  status VARCHAR(20) DEFAULT 'active',      -- 'active', 'qualified', 'scheduled', 'closed', 'opted_out'
  
  -- AI context
  ai_context JSONB,                         -- For maintaining conversation state
  ai_extracted_data JSONB,                  -- Qualification data extracted
  
  messages_count INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Outreach messages
CREATE TABLE outreach_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES outreach_conversations(id) NOT NULL,
  contact_id UUID REFERENCES outreach_contacts(id) NOT NULL,
  
  direction VARCHAR(10) NOT NULL,           -- 'outbound', 'inbound'
  message_text TEXT NOT NULL,
  
  -- AI analysis
  ai_intent VARCHAR(50),                    -- 'interested', 'question', 'objection', 'stop', etc.
  ai_confidence DECIMAL(3,2),
  ai_extracted JSONB,                       -- Data points extracted from this message
  
  -- Delivery
  twilio_sid VARCHAR(50),
  status VARCHAR(20),                       -- 'queued', 'sent', 'delivered', 'failed', 'received'
  error_message TEXT,
  
  -- Compliance
  consent_verified BOOLEAN DEFAULT true,
  opt_out_checked BOOLEAN DEFAULT true,
  within_send_window BOOLEAN DEFAULT true,
  
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- CALL SCHEDULING
-- =====================================================

-- Agent availability (weekly hours)
CREATE TABLE agent_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) NOT NULL,
  
  day_of_week INTEGER NOT NULL,             -- 0=Sunday, 6=Saturday
  start_time TIME NOT NULL,                 -- In agent's LOCAL timezone
  end_time TIME NOT NULL,                   -- In agent's LOCAL timezone
  
  -- For multiple shifts per day
  shift_number INTEGER DEFAULT 1,           -- 1 = primary, 2 = secondary shift
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent break times (lunch, meetings, etc.)
CREATE TABLE agent_break_times (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) NOT NULL,
  
  day_of_week INTEGER NOT NULL,             -- 0=Sunday, 6=Saturday
  start_time TIME NOT NULL,                 -- In agent's LOCAL timezone
  end_time TIME NOT NULL,                   -- In agent's LOCAL timezone
  
  reason VARCHAR(100),                      -- 'Lunch', 'Team meeting', etc.
  recurring BOOLEAN DEFAULT true,           -- TRUE = every week
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent profile timezone (add to existing agents table)
-- ALTER TABLE agents ADD COLUMN timezone VARCHAR(50) DEFAULT 'America/New_York';
-- ALTER TABLE agents ADD COLUMN timezone_offset_minutes INTEGER;

-- For reference, agent timezone fields:
-- agents.timezone = 'America/Chicago'
-- agents.timezone_offset_minutes = -360 (CST = UTC-6)

-- Agent time off / blocks
CREATE TABLE agent_time_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) NOT NULL,
  
  block_type VARCHAR(20) NOT NULL,          -- 'time_off', 'meeting', 'busy'
  start_datetime TIMESTAMPTZ NOT NULL,
  end_datetime TIMESTAMPTZ NOT NULL,
  reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scheduled calls
CREATE TABLE scheduled_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  contact_id UUID REFERENCES outreach_contacts(id) NOT NULL,
  agent_id UUID REFERENCES agents(id),      -- NULL if pending admin assignment
  campaign_id UUID REFERENCES outreach_campaigns(id),
  
  -- Time (ALWAYS STORED IN UTC)
  scheduled_at TIMESTAMPTZ NOT NULL,        -- UTC timestamp
  duration_minutes INTEGER DEFAULT 15,
  
  -- Timezone context (for display)
  agent_timezone VARCHAR(50),               -- 'America/Chicago' — copied from agent at booking
  lead_timezone VARCHAR(50),                -- 'America/Los_Angeles' — copied from contact at booking
  
  call_type VARCHAR(20) DEFAULT 'phone',    -- 'phone', 'zoom', 'google_meet'
  meeting_link TEXT,
  
  status VARCHAR(30) DEFAULT 'scheduled',   -- 'scheduled', 'pending_admin_approval', 'confirmed', 
                                            -- 'in_progress', 'completed', 'no_show', 'cancelled', 'rescheduled'
  
  -- Weekend/overflow handling
  weekend_request BOOLEAN DEFAULT false,    -- Lead specifically asked for weekend
  overflow_reason VARCHAR(50),              -- 'no_availability_3day', 'weekend_request', 'all_agents_blocked'
  admin_approved BOOLEAN,                   -- NULL = pending, TRUE = approved, FALSE = rejected/rescheduled
  admin_approved_by UUID REFERENCES agents(id),
  admin_approved_at TIMESTAMPTZ,
  
  -- Reminders
  lead_reminder_sent BOOLEAN DEFAULT false,
  agent_reminder_sent BOOLEAN DEFAULT false,
  
  -- Outcome (after call)
  outcome VARCHAR(50),                      -- 'closed', 'demo_scheduled', 'callback', 
                                            -- 'not_interested', 'no_answer', 'wrong_number'
  outcome_notes TEXT,
  plan_sold VARCHAR(50),
  
  -- Rescheduling
  rescheduled_from_id UUID REFERENCES scheduled_calls(id),
  reschedule_count INTEGER DEFAULT 0,
  
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Call distribution settings
CREATE TABLE call_distribution_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  distribution_method VARCHAR(50) DEFAULT 'round_robin',  -- 'round_robin', 'weighted', 'availability_first'
  
  -- Scheduling rules
  buffer_minutes INTEGER DEFAULT 30,        -- ⚠️ MINIMUM 30 MINUTES between calls
  call_duration_minutes INTEGER DEFAULT 15,
  max_advance_business_days INTEGER DEFAULT 3,  -- ⚠️ ONLY 3 BUSINESS DAYS OUT
  min_notice_hours INTEGER DEFAULT 2,
  
  skip_at_capacity BOOLEAN DEFAULT true,
  prioritize_hot_leads BOOLEAN DEFAULT true,
  
  -- Global blackouts
  blackout_saturday BOOLEAN DEFAULT true,   -- Weekend OFF by default
  blackout_sunday BOOLEAN DEFAULT true,     -- Weekend OFF by default
  
  -- Admin overflow settings
  overflow_to_admin BOOLEAN DEFAULT true,
  overflow_distribution_mode VARCHAR(20) DEFAULT 'manual',  -- 'manual', 'auto', 'hybrid'
  overflow_auto_assign_time TIME DEFAULT '08:00',           -- Daily batch assign time
  overflow_auto_assign_on_availability BOOLEAN DEFAULT true,
  overflow_notification VARCHAR(20) DEFAULT 'immediate',     -- 'immediate', 'daily_digest'
  
  -- AI messages
  overflow_ai_message TEXT DEFAULT 'Our calendar is packed this week! Someone will reach out within 24 hours to find a time that works. Thanks for your patience!',
  weekend_request_ai_message TEXT DEFAULT 'I''ve put you down for [Day] at [Time]. Someone from our team will confirm within 24 hours. Sound good?',
  
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Global holiday blackouts
CREATE TABLE global_blackout_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  blackout_date DATE NOT NULL,
  name VARCHAR(100),                        -- 'Christmas Day', 'New Year', etc.
  recurring_yearly BOOLEAN DEFAULT false,   -- If TRUE, applies every year
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent-specific blackout days
CREATE TABLE agent_blackout_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) NOT NULL,
  
  -- For recurring weekly blackouts
  blackout_type VARCHAR(20) NOT NULL,       -- 'recurring' or 'specific'
  day_of_week INTEGER,                      -- 0=Sunday, 6=Saturday (for recurring)
  
  -- For specific date blackouts
  blackout_date DATE,                       -- Specific date (for specific)
  blackout_end_date DATE,                   -- End date for date ranges
  
  reason VARCHAR(200),                      -- 'Training day', 'Vacation', etc.
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent distribution weights (for weighted distribution)
CREATE TABLE agent_distribution_weights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) NOT NULL,
  
  weight_percent INTEGER DEFAULT 100,       -- Relative weight
  max_daily_calls INTEGER DEFAULT 10,
  current_daily_calls INTEGER DEFAULT 0,
  last_assigned_at TIMESTAMPTZ,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Distribution log (for auditing)
CREATE TABLE call_distribution_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  contact_id UUID REFERENCES outreach_contacts(id) NOT NULL,
  scheduled_call_id UUID REFERENCES scheduled_calls(id) NOT NULL,
  selected_agent_id UUID REFERENCES agents(id) NOT NULL,
  
  distribution_method VARCHAR(50),
  agents_considered JSONB,                  -- Array of agent IDs in pool
  selection_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- NURTURE SEQUENCES
-- =====================================================

CREATE TABLE nurture_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  name VARCHAR(200) NOT NULL,
  description TEXT,
  
  trigger_type VARCHAR(50) NOT NULL,        -- 'manual', 'not_ready', 'no_show', 'competitor_contract'
  trigger_conditions JSONB,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE nurture_sequence_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID REFERENCES nurture_sequences(id) NOT NULL,
  
  step_number INTEGER NOT NULL,
  delay_days INTEGER NOT NULL,
  message_template TEXT NOT NULL,
  
  exit_on_reply BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE nurture_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  contact_id UUID REFERENCES outreach_contacts(id) NOT NULL,
  sequence_id UUID REFERENCES nurture_sequences(id) NOT NULL,
  
  current_step INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active',      -- 'active', 'completed', 'exited', 'converted'
  
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  next_message_at TIMESTAMPTZ,
  exited_at TIMESTAMPTZ,
  exit_reason VARCHAR(50),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- REFERRAL TRACKING
-- =====================================================

CREATE TABLE referral_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  referrer_client_id UUID REFERENCES clients(id) NOT NULL,
  referrer_agent_id UUID REFERENCES agents(id),            -- Original agent who signed referrer
  
  -- Referral info
  referral_name VARCHAR(100) NOT NULL,
  referral_phone VARCHAR(20) NOT NULL,
  referral_company VARCHAR(200),
  referral_trade VARCHAR(50),
  referral_notes TEXT,
  
  -- Tracking
  outreach_contact_id UUID REFERENCES outreach_contacts(id),
  status VARCHAR(30) DEFAULT 'submitted',   -- 'submitted', 'contacted', 'qualified', 'converted', 'lost'
  
  -- Reward
  reward_amount_cents INTEGER DEFAULT 10000,  -- $100 default
  reward_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'earned', 'paid'
  reward_paid_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- A/B TESTING
-- =====================================================

CREATE TABLE ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  name VARCHAR(200) NOT NULL,
  test_type VARCHAR(50) NOT NULL,           -- 'initial_message', 'timing', 'qualification'
  
  campaign_id UUID REFERENCES outreach_campaigns(id),
  
  status VARCHAR(20) DEFAULT 'running',     -- 'draft', 'running', 'completed', 'stopped'
  
  sample_size_target INTEGER,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  
  winner_variant_id UUID,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ab_test_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID REFERENCES ab_tests(id) NOT NULL,
  
  variant_name VARCHAR(50) NOT NULL,        -- 'A', 'B', 'C', etc.
  is_control BOOLEAN DEFAULT false,
  traffic_percent INTEGER DEFAULT 50,
  
  content TEXT NOT NULL,                    -- Message text or config
  
  -- Stats
  impressions INTEGER DEFAULT 0,
  replies INTEGER DEFAULT 0,
  qualified INTEGER DEFAULT 0,
  booked INTEGER DEFAULT 0,
  converted INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_consent_phone ON sms_consent(phone);
CREATE INDEX idx_optouts_phone ON sms_opt_outs(phone);
CREATE INDEX idx_contacts_campaign ON outreach_contacts(campaign_id);
CREATE INDEX idx_contacts_status ON outreach_contacts(status);
CREATE INDEX idx_contacts_phone ON outreach_contacts(phone);
CREATE INDEX idx_contacts_source ON outreach_contacts(source);
CREATE INDEX idx_contacts_overflow ON outreach_contacts(overflow_to_admin) WHERE overflow_to_admin = true;
CREATE INDEX idx_contacts_pending_admin ON outreach_contacts(status) WHERE status = 'pending_admin';
CREATE INDEX idx_blackout_agent ON agent_blackout_days(agent_id);
CREATE INDEX idx_blackout_date ON agent_blackout_days(blackout_date);
CREATE INDEX idx_blackout_recurring ON agent_blackout_days(day_of_week) WHERE blackout_type = 'recurring';
CREATE INDEX idx_global_blackout ON global_blackout_dates(blackout_date);
CREATE INDEX idx_calls_weekend ON scheduled_calls(weekend_request) WHERE weekend_request = true;
CREATE INDEX idx_calls_pending_approval ON scheduled_calls(status) WHERE status = 'pending_admin_approval';
CREATE INDEX idx_agent_breaks ON agent_break_times(agent_id, day_of_week);

-- Phone area code to timezone mapping (for lead timezone detection)
-- Pre-populated with US area codes
CREATE TABLE area_code_timezones (
  area_code VARCHAR(3) PRIMARY KEY,
  timezone VARCHAR(50) NOT NULL,
  state VARCHAR(2),
  region VARCHAR(100)
);

-- Sample data:
-- INSERT INTO area_code_timezones VALUES 
-- ('212', 'America/New_York', 'NY', 'New York City'),
-- ('213', 'America/Los_Angeles', 'CA', 'Los Angeles'),
-- ('312', 'America/Chicago', 'IL', 'Chicago'),
-- ('214', 'America/Chicago', 'TX', 'Dallas'),
-- ('303', 'America/Denver', 'CO', 'Denver'),
-- ('206', 'America/Los_Angeles', 'WA', 'Seattle'),
-- ('305', 'America/New_York', 'FL', 'Miami'),
-- ('404', 'America/New_York', 'GA', 'Atlanta'),
-- ('415', 'America/Los_Angeles', 'CA', 'San Francisco'),
-- ('602', 'America/Phoenix', 'AZ', 'Phoenix');
-- ... (full list of ~300 area codes)
CREATE INDEX idx_messages_conversation ON outreach_messages(conversation_id);
CREATE INDEX idx_messages_contact ON outreach_messages(contact_id);
CREATE INDEX idx_calls_agent ON scheduled_calls(agent_id);
CREATE INDEX idx_calls_scheduled ON scheduled_calls(scheduled_at);
CREATE INDEX idx_calls_status ON scheduled_calls(status);
CREATE INDEX idx_availability_agent ON agent_availability(agent_id);
CREATE INDEX idx_nurture_contact ON nurture_enrollments(contact_id);
CREATE INDEX idx_nurture_next ON nurture_enrollments(next_message_at) WHERE status = 'active';
CREATE INDEX idx_referrals_referrer ON referral_submissions(referrer_client_id);

-- =====================================================
-- ADDITIONAL FEATURE TABLES (Section 14)
-- =====================================================

-- No-show escalation tracking
CREATE TABLE no_show_escalations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES outreach_contacts(id) NOT NULL,
  scheduled_call_id UUID REFERENCES scheduled_calls(id),
  no_show_number INTEGER NOT NULL,
  escalation_action VARCHAR(50),
  score_adjustment INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Speed-to-lead metrics
CREATE TABLE speed_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES outreach_contacts(id) NOT NULL,
  form_submitted_at TIMESTAMPTZ,
  first_text_sent_at TIMESTAMPTZ,
  first_reply_at TIMESTAMPTZ,
  qualified_at TIMESTAMPTZ,
  call_booked_at TIMESTAMPTZ,
  call_completed_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  form_to_first_text_seconds INTEGER,
  first_text_to_reply_seconds INTEGER,
  reply_to_booked_seconds INTEGER
);

-- Lead reassignment history
CREATE TABLE lead_reassignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_agent_id UUID REFERENCES agents(id) NOT NULL,
  to_agent_id UUID REFERENCES agents(id),
  reason VARCHAR(50) NOT NULL,
  leads_count INTEGER NOT NULL,
  lead_ids JSONB,
  distribution_method VARCHAR(20),
  performed_by UUID REFERENCES agents(id),
  performed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Slack integration
CREATE TABLE slack_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id VARCHAR(50),
  workspace_name VARCHAR(100),
  access_token TEXT,
  connected_by UUID REFERENCES agents(id),
  connected_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE slack_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id VARCHAR(50) NOT NULL,
  channel_name VARCHAR(100) NOT NULL,
  channel_type VARCHAR(20),
  agent_id UUID REFERENCES agents(id),
  notify_new_leads BOOLEAN DEFAULT false,
  notify_hot_leads BOOLEAN DEFAULT false,
  notify_closed BOOLEAN DEFAULT false,
  notify_no_shows BOOLEAN DEFAULT false,
  notify_speed_alerts BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true
);

-- DNC checking (Datazapp)
CREATE TABLE dnc_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key TEXT,
  check_federal BOOLEAN DEFAULT true,
  check_state BOOLEAN DEFAULT true,
  check_litigator BOOLEAN DEFAULT true,
  check_on_create BOOLEAN DEFAULT true,
  recheck_after_days INTEGER DEFAULT 90,
  cache_days INTEGER DEFAULT 30
);

CREATE TABLE dnc_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) NOT NULL,
  contact_id UUID REFERENCES outreach_contacts(id),
  dnc_status VARCHAR(30) NOT NULL,
  safe_to_contact BOOLEAN NOT NULL,
  response_data JSONB,
  checked_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE TABLE suppression_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) NOT NULL UNIQUE,
  reason VARCHAR(50) NOT NULL,
  source VARCHAR(50),
  added_by UUID REFERENCES agents(id),
  added_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lead imports
CREATE TABLE lead_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename VARCHAR(200) NOT NULL,
  source_label VARCHAR(50) DEFAULT 'CSV Import',
  source_campaign VARCHAR(100),
  total_rows INTEGER,
  imported_count INTEGER,
  skipped_duplicates INTEGER,
  skipped_invalid INTEGER,
  skipped_dnc INTEGER,
  check_dnc BOOLEAN DEFAULT true,
  column_mapping JSONB,
  status VARCHAR(20) DEFAULT 'pending',
  imported_by UUID REFERENCES agents(id),
  imported_at TIMESTAMPTZ DEFAULT NOW()
);

-- Self-scheduling links
CREATE TABLE scheduling_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id),
  slug VARCHAR(50) NOT NULL UNIQUE,
  link_type VARCHAR(20) DEFAULT 'agent',
  use_agent_hours BOOLEAN DEFAULT true,
  require_name BOOLEAN DEFAULT true,
  require_phone BOOLEAN DEFAULT true,
  require_trade BOOLEAN DEFAULT true,
  logo_url TEXT,
  primary_color VARCHAR(7) DEFAULT '#2563EB',
  header_text TEXT,
  is_active BOOLEAN DEFAULT true
);

-- Email preferences
CREATE TABLE email_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) NOT NULL,
  email VARCHAR(200) NOT NULL,
  new_lead_assigned BOOLEAN DEFAULT true,
  hot_lead_alert BOOLEAN DEFAULT true,
  call_reminder BOOLEAN DEFAULT true,
  daily_summary BOOLEAN DEFAULT true
);

-- Achievements
CREATE TABLE agent_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) NOT NULL,
  achievement_type VARCHAR(50) NOT NULL,
  achievement_name VARCHAR(100),
  value INTEGER,
  earned_at TIMESTAMPTZ DEFAULT NOW()
);

-- Competitor mentions
CREATE TABLE competitor_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES outreach_contacts(id) NOT NULL,
  competitor_name VARCHAR(100),
  mention_type VARCHAR(30),
  likes TEXT,
  dislikes TEXT,
  detected_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lead enrichment
CREATE TABLE lead_enrichment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES outreach_contacts(id) NOT NULL,
  website_url TEXT,
  company_size VARCHAR(20),
  estimated_revenue VARCHAR(30),
  years_in_business INTEGER,
  google_review_count INTEGER,
  google_review_avg DECIMAL(2,1),
  website_platform VARCHAR(50),
  enrichment_provider VARCHAR(20),
  enriched_at TIMESTAMPTZ DEFAULT NOW()
);

-- Revenue forecasts
CREATE TABLE revenue_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  forecast_month DATE NOT NULL,
  predicted_mrr INTEGER,
  predicted_mrr_low INTEGER,
  predicted_mrr_high INTEGER,
  confidence_pct INTEGER,
  actual_mrr INTEGER,
  pipeline_snapshot JSONB,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Attribution touchpoints
CREATE TABLE attribution_touchpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES outreach_contacts(id) NOT NULL,
  touchpoint_type VARCHAR(50) NOT NULL,
  touchpoint_at TIMESTAMPTZ NOT NULL,
  converted BOOLEAN DEFAULT false,
  conversion_value_cents INTEGER,
  first_touch_credit DECIMAL(5,2),
  last_touch_credit DECIMAL(5,2),
  linear_credit DECIMAL(5,2)
);

-- Webhook endpoints (Zapier)
CREATE TABLE webhook_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100),
  url TEXT NOT NULL,
  event_new_lead BOOLEAN DEFAULT false,
  event_qualified BOOLEAN DEFAULT false,
  event_call_scheduled BOOLEAN DEFAULT false,
  event_deal_closed BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true
);

-- Additional indexes
CREATE INDEX idx_dnc_phone ON dnc_checks(phone);
CREATE INDEX idx_suppression_phone ON suppression_list(phone);
CREATE INDEX idx_speed_contact ON speed_metrics(contact_id);
CREATE INDEX idx_competitor_contact ON competitor_mentions(contact_id);
CREATE INDEX idx_enrichment_contact ON lead_enrichment(contact_id);
CREATE INDEX idx_scheduling_slug ON scheduling_links(slug);
CREATE INDEX idx_achievements_agent ON agent_achievements(agent_id);
```

---

# 16. API ENDPOINTS

```typescript
// =====================================================
// CAMPAIGNS
// =====================================================

GET    /api/outreach/campaigns
POST   /api/outreach/campaigns
GET    /api/outreach/campaigns/:id
PATCH  /api/outreach/campaigns/:id
POST   /api/outreach/campaigns/:id/start
POST   /api/outreach/campaigns/:id/pause

// =====================================================
// CONTACTS
// =====================================================

GET    /api/outreach/contacts
GET    /api/outreach/contacts/:id
PATCH  /api/outreach/contacts/:id
POST   /api/outreach/contacts/:id/message      // Manual message
POST   /api/outreach/contacts/:id/take-over    // Human takes over from AI

// =====================================================
// ADMIN LEAD LIST (Overflow)
// =====================================================

GET    /api/outreach/admin/pending             // Get all pending_admin leads
GET    /api/outreach/admin/pending?source=SMS  // Filter by source
GET    /api/outreach/admin/weekend-requests    // Get weekend request leads
POST   /api/outreach/admin/assign              // Assign lead to agent
POST   /api/outreach/admin/assign-bulk         // Bulk assign
POST   /api/outreach/admin/confirm-weekend     // Confirm weekend call
POST   /api/outreach/admin/reschedule-weekend  // Reschedule weekend to weekday
GET    /api/outreach/admin/stats               // Overflow statistics

// =====================================================
// BLACKOUT DAYS
// =====================================================

GET    /api/outreach/blackouts/global          // Get global blackouts (weekends, holidays)
POST   /api/outreach/blackouts/global          // Add global holiday
DELETE /api/outreach/blackouts/global/:id      // Remove global holiday

GET    /api/agents/:id/blackouts               // Get agent's blackout days
POST   /api/agents/:id/blackouts               // Add agent blackout
DELETE /api/agents/:id/blackouts/:blackoutId   // Remove agent blackout
GET    /api/agents/:id/blackouts/preview       // Preview next 2 weeks availability

// =====================================================
// DISTRIBUTION SETTINGS
// =====================================================

GET    /api/outreach/distribution/settings     // Get all distribution settings
PATCH  /api/outreach/distribution/settings     // Update settings
POST   /api/outreach/distribution/auto-assign  // Manually trigger auto-assignment
GET    /api/outreach/distribution/weights
PATCH  /api/outreach/distribution/weights/:agentId

// =====================================================
// CONVERSATIONS
// =====================================================

GET    /api/outreach/conversations
GET    /api/outreach/conversations/:id
GET    /api/outreach/conversations/:id/messages
POST   /api/outreach/conversations/:id/messages

// =====================================================
// CALL SCHEDULING
// =====================================================

GET    /api/outreach/calls
GET    /api/outreach/calls/today
GET    /api/outreach/calls/:id
POST   /api/outreach/calls                     // Manual schedule
PATCH  /api/outreach/calls/:id
POST   /api/outreach/calls/:id/reschedule
POST   /api/outreach/calls/:id/complete        // Log outcome
POST   /api/outreach/calls/:id/cancel

GET    /api/outreach/availability              // Available slots
GET    /api/agents/:id/availability
POST   /api/agents/:id/availability
DELETE /api/agents/:id/availability/:slotId
POST   /api/agents/:id/time-blocks

// =====================================================
// AGENT WEEKLY HOURS & TIMEZONE
// =====================================================

GET    /api/agents/:id/weekly-hours           // Get agent's weekly schedule
PUT    /api/agents/:id/weekly-hours           // Set full weekly schedule
PATCH  /api/agents/:id/weekly-hours/:dayOfWeek // Update single day

GET    /api/agents/:id/breaks                 // Get agent's break times
POST   /api/agents/:id/breaks                 // Add break time
DELETE /api/agents/:id/breaks/:breakId        // Remove break

GET    /api/agents/:id/timezone               // Get agent's timezone
PUT    /api/agents/:id/timezone               // Set agent's timezone

GET    /api/agents/:id/capacity-preview       // Preview slots for next 2 weeks

// =====================================================
// TIMEZONE UTILITIES
// =====================================================

GET    /api/timezone/from-phone/:phone        // Detect timezone from phone number
GET    /api/timezone/from-area-code/:code     // Look up area code timezone
GET    /api/timezone/convert                  // Convert time between timezones
       // ?time=2025-01-06T14:00:00&from=America/Chicago&to=America/Los_Angeles

GET    /api/outreach/distribution/settings
PATCH  /api/outreach/distribution/settings
GET    /api/outreach/distribution/weights
PATCH  /api/outreach/distribution/weights/:agentId

// =====================================================
// NURTURE
// =====================================================

GET    /api/outreach/nurture/sequences
POST   /api/outreach/nurture/sequences
GET    /api/outreach/nurture/sequences/:id
PATCH  /api/outreach/nurture/sequences/:id

GET    /api/outreach/nurture/enrollments
POST   /api/outreach/nurture/enrollments       // Manually enroll
DELETE /api/outreach/nurture/enrollments/:id   // Remove from sequence

// =====================================================
// REFERRALS
// =====================================================

GET    /api/outreach/referrals
POST   /api/outreach/referrals                 // Submit referral
GET    /api/outreach/referrals/:id
GET    /api/clients/:id/referrals              // Referrals by client

// =====================================================
// A/B TESTING
// =====================================================

GET    /api/outreach/ab-tests
POST   /api/outreach/ab-tests
GET    /api/outreach/ab-tests/:id
PATCH  /api/outreach/ab-tests/:id
POST   /api/outreach/ab-tests/:id/stop
POST   /api/outreach/ab-tests/:id/declare-winner

// =====================================================
// COMPLIANCE
// =====================================================

GET    /api/outreach/consent/:phone            // Check consent
GET    /api/outreach/audit/:phone              // Full audit trail
GET    /api/outreach/opt-outs
POST   /api/outreach/opt-outs                  // Manual opt-out

// =====================================================
// ANALYTICS
// =====================================================

GET    /api/outreach/analytics/overview
GET    /api/outreach/analytics/funnel
GET    /api/outreach/analytics/campaigns
GET    /api/outreach/analytics/agents
GET    /api/outreach/analytics/ai-performance
GET    /api/outreach/analytics/export

// =====================================================
// WEBHOOKS (From Twilio)
// =====================================================

POST   /api/webhooks/sms/inbound               // Incoming SMS
POST   /api/webhooks/sms/status                // Delivery status
POST   /api/webhooks/voice/status              // Call status (click-to-call)

// =====================================================
// ADDITIONAL FEATURE APIS (Section 14)
// =====================================================

// No-Show Escalation
GET    /api/outreach/no-shows                  // List no-show leads by tier
GET    /api/outreach/no-shows/stats            // No-show statistics
POST   /api/outreach/no-shows/:contactId/archive
POST   /api/outreach/no-shows/:contactId/reactivate

// Speed-to-Lead
GET    /api/outreach/speed-metrics             // Dashboard data
GET    /api/outreach/speed-metrics/by-source
GET    /api/outreach/speed-metrics/by-agent
GET    /api/outreach/speed-metrics/by-hour
GET    /api/outreach/speed-alerts              // Recent alerts

// Lead Reassignment
POST   /api/outreach/reassign                  // Bulk reassign
GET    /api/outreach/reassign/history          // Reassignment log

// Slack Integration
GET    /api/integrations/slack/settings
POST   /api/integrations/slack/connect
DELETE /api/integrations/slack/disconnect
POST   /api/integrations/slack/test
GET    /api/integrations/slack/channels
POST   /api/integrations/slack/channels
PATCH  /api/integrations/slack/channels/:id

// DNC (Datazapp)
GET    /api/outreach/dnc/settings
PATCH  /api/outreach/dnc/settings
POST   /api/outreach/dnc/check/:phone          // Manual check
GET    /api/outreach/dnc/dashboard             // Stats
GET    /api/outreach/dnc/suppression-list
POST   /api/outreach/dnc/suppression-list
DELETE /api/outreach/dnc/suppression-list/:id

// Lead Import
POST   /api/outreach/imports                   // Upload CSV
GET    /api/outreach/imports                   // Import history
GET    /api/outreach/imports/:id               // Import details
GET    /api/outreach/imports/:id/errors        // View errors
GET    /api/outreach/imports/template          // Download template

// Self-Scheduling
GET    /api/scheduling-links
POST   /api/scheduling-links
GET    /api/scheduling-links/:id
PATCH  /api/scheduling-links/:id
GET    /api/scheduling-links/:slug/available   // Public: get available slots
POST   /api/scheduling-links/:slug/book        // Public: book appointment

// Email Notifications
GET    /api/integrations/email/settings
PATCH  /api/integrations/email/settings
GET    /api/agents/:id/email-preferences
PATCH  /api/agents/:id/email-preferences

// Leaderboard
GET    /api/outreach/leaderboard               // Current rankings
GET    /api/outreach/leaderboard/achievements  // Recent achievements
GET    /api/outreach/leaderboard/goals         // Goal progress

// Competitor Tracking
GET    /api/outreach/competitors/mentions      // Recent mentions
GET    /api/outreach/competitors/stats         // Win rates by competitor

// Lead Enrichment
POST   /api/outreach/contacts/:id/enrich       // Trigger enrichment
GET    /api/outreach/contacts/:id/enrichment   // Get enrichment data

// Revenue Forecast
GET    /api/outreach/forecast                  // Current forecast
GET    /api/outreach/forecast/history          // Past forecasts vs actuals

// Attribution
GET    /api/outreach/attribution               // Touchpoint analysis
GET    /api/outreach/attribution/:contactId    // Journey for specific lead

// Webhooks (Zapier)
GET    /api/integrations/webhooks
POST   /api/integrations/webhooks
PATCH  /api/integrations/webhooks/:id
DELETE /api/integrations/webhooks/:id
POST   /api/integrations/webhooks/:id/test
```

---

# 17. AI PROMPTS

## Main Outreach AI Prompt

```
SYSTEM PROMPT: TradesCaptain Outreach AI

You are Alex, a friendly sales assistant for Trades Captain. You're texting 
contractors who expressed interest in our services. Your job is to:

1. Build rapport quickly (contractors are busy, on job sites)
2. Qualify their needs (website, SEO, CRM, missed call handling)
3. Book a demo call with our sales team

═══════════════════════════════════════════════════════════════════════════

PERSONALITY:
- Casual, friendly, NOT salesy or corporate
- Use contractor-friendly language (no jargon)
- Keep messages SHORT — under 160 characters when possible
- Be genuinely helpful, even if they're not a fit
- Never be pushy or aggressive
- Use occasional emoji sparingly (one per conversation max)

═══════════════════════════════════════════════════════════════════════════

QUALIFICATION GOALS (extract naturally, don't interrogate):

1. CURRENT SITUATION
   - Do they have a website? Is it working for them?
   - Are they using any software/CRM?
   - How are they currently getting leads?

2. PAIN POINTS (listen for these)
   - Not showing up on Google
   - Competitors ranking higher
   - Missing calls while on jobs
   - Disorganized (losing quotes, forgetting follow-ups)
   - Not enough leads/calls

3. TIMELINE
   - Ready now / ASAP
   - Within 30 days
   - Just exploring / eventually

4. BUDGET SIGNALS (soft — don't push)
   - Mention "most clients invest $200-500/mo"
   - Listen for pushback or acceptance

═══════════════════════════════════════════════════════════════════════════

TIMEZONE HANDLING:
─────────────────────────────────────────────────────────────────────────

1. DETECT LEAD'S TIMEZONE
   • Phone area code is auto-detected (e.g., 213 = Los Angeles = PST)
   • If unsure, ask: "Quick question — what timezone are you in?"
   • If they mention a city, use that (e.g., "I'm in Dallas" = CST)

2. ALWAYS OFFER TIMES IN LEAD'S LOCAL TIMEZONE
   • Say "I have Tuesday at 2pm your time" — NOT agent's timezone
   • System converts agent availability to lead's timezone before you see it
   • Only offer slots that are reasonable hours for the lead (9am-6pm their time)

3. CONFIRM IN THEIR TIMEZONE
   • "You're all set for Tuesday at 2pm!" (their time)
   • Don't mention the agent's timezone — it's confusing

4. IF TIMEZONE UNCLEAR
   • Ask naturally: "By the way, what timezone are you in? Want to make 
     sure I give you the right time."
   • Common answers: "Pacific", "Central", "Eastern", "Mountain", 
     or city names like "I'm in Chicago"

═══════════════════════════════════════════════════════════════════════════

BOOKING GOAL:

When qualified (clear need + reasonable timeline), offer to schedule a call:

"Sounds like we can definitely help. Want to hop on a quick 15-min call? 
I have [Day] at [Time] or [Day] at [Time] — which works better?"

- Always offer exactly 2 specific time slots
- Confirm with name of agent who will call
- Keep it low-pressure

═══════════════════════════════════════════════════════════════════════════

RULES:

1. OPT-OUT: If they say STOP, unsubscribe, remove, or any variant:
   → Immediately respond: "No problem, you've been removed. Take care!"
   → Do not send any more messages

2. IDENTITY: If they ask "who is this" or "how'd you get my number":
   → Reference the form they filled out
   → Offer to remove them if they prefer
   → Example: "This is Alex from Trades Captain — you filled out our 
     contact form at tradescaptain.com. Want me to tell you more, or 
     would you prefer I remove you from our list?"

3. PRICING: If they ask about pricing:
   → Give a range: "Depends on what you need — most clients are $200-500/mo"
   → Pivot to qualification: "What are you mainly looking for help with?"
   → Save detailed pricing for the sales call

4. COMPETITORS: If they mention a competitor:
   → Don't bash competitors
   → Ask what they like/dislike about current solution
   → Note for agent

5. OFF-TOPIC: If conversation goes off-track:
   → Gently redirect: "Ha! Anyway — what's the biggest thing you need 
     help with for your business?"

6. MAX MESSAGES: After 5 AI messages without clear progress:
   → Offer a call: "I could explain better on a quick call. Want to 
     hop on for 10 min?"
   → Or graceful close: "No worries if now isn't the right time. 
     Text back whenever you're ready."

═══════════════════════════════════════════════════════════════════════════

SERVICES TO MENTION (match to their needs):

- WEBSITES: "Sites that actually rank on Google — not template garbage"
- LOCAL SEO: "Show up in Google Maps when people search '[trade] near me'"
- NEVERMISS: "AI that texts back your missed calls automatically — 
  captures leads while you're on a job"
- BLUE CRM: "Simple CRM to stay organized — quotes, scheduling, follow-ups"
- GOLD BUNDLE: "Everything together — website, SEO, AI texting, CRM"

═══════════════════════════════════════════════════════════════════════════

OUTPUT FORMAT:

Respond with ONLY the message text. No explanations, no "Here's what I'd say".
Keep it casual and natural — like a real text from a real person.
```

---

# 17. CALL RECORDING & TRANSCRIPTION

## Overview

Record sales calls for quality assurance, coaching, and compliance. AI transcribes and analyzes conversations to identify winning patterns and areas for improvement.

## Recording Setup

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ⚙️ CALL RECORDING SETTINGS                                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ RECORDING OPTIONS                                                       │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ ☑ Enable call recording                                             │ │
│ │ ☑ Play consent announcement at start of call                        │ │
│ │   "This call may be recorded for quality assurance."                │ │
│ │                                                                     │ │
│ │ Recording format: [MP3 ▼]                                           │ │
│ │ Storage retention: [90 days ▼]                                      │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ TRANSCRIPTION                                                           │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ ☑ Auto-transcribe all recordings                                    │ │
│ │ ☑ AI analysis (sentiment, talk ratio, objections)                   │ │
│ │ ☑ Extract action items and commitments                              │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ ACCESS CONTROLS                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Who can access recordings:                                          │ │
│ │ ☑ The agent who made the call                                       │ │
│ │ ☑ Sales managers                                                    │ │
│ │ □ All agents (for training)                                         │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Call Recording View

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 🎙️ CALL RECORDING: Mike's Plumbing                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ CALL DETAILS                                                            │
│ Agent: Sarah Johnson                                                    │
│ Lead: Mike Johnson — Mike's Plumbing                                   │
│ Date: Dec 28, 2025 at 2:00 PM                                          │
│ Duration: 12:34                                                         │
│ Outcome: ✓ Closed — Gold Pro                                           │
│                                                                         │
│ ═══════════════════════════════════════════════════════════════════════ │
│                                                                         │
│ RECORDING                                                               │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ ▶ advancement_indicator──────────────○────────────── 12:34         │ │
│ │   0:00                                                              │ │
│ │                                                                     │ │
│ │ [Play] [Pause] [Download] [Share]               Speed: [1x ▼]       │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ AI ANALYSIS                                                             │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Talk Ratio:        Agent 45% / Lead 55% ✓ Good                      │ │
│ │ Sentiment:         Positive throughout                              │ │
│ │ Objections:        1 (pricing — handled well)                       │ │
│ │ Buying Signals:    4 detected                                       │ │
│ │ Filler Words:      Low (3 instances)                                │ │
│ │                                                                     │ │
│ │ STRENGTHS:                                                          │ │
│ │ • Great rapport building in opener                                  │ │
│ │ • Asked good discovery questions                                    │ │
│ │ • Handled price objection with ROI framing                          │ │
│ │                                                                     │ │
│ │ IMPROVEMENTS:                                                       │ │
│ │ • Could have asked for referral at end                              │ │
│ │ • Missed opportunity to mention NeverMiss earlier                   │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ ═══════════════════════════════════════════════════════════════════════ │
│                                                                         │
│ TRANSCRIPT                                          [Copy] [Export]     │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ 0:00 — SYSTEM                                                       │ │
│ │ "This call may be recorded for quality assurance."                  │ │
│ │                                                                     │ │
│ │ 0:05 — SARAH                                                        │ │
│ │ "Hey Mike! This is Sarah from Trades Captain. We texted earlier     │ │
│ │ about getting your plumbing business showing up on Google.          │ │
│ │ Good time for a quick chat?"                                        │ │
│ │                                                                     │ │
│ │ 0:12 — MIKE                                                         │ │
│ │ "Yeah, yeah I got a few minutes. What's this about exactly?"        │ │
│ │                                                                     │ │
│ │ 0:18 — SARAH                                                        │ │
│ │ "So you mentioned your competitor keeps showing up above you on     │ │
│ │ Google. How many calls would you say you're losing to them?"        │ │
│ │                                                                     │ │
│ │ 0:28 — MIKE                                                         │ │
│ │ "Man, probably 5-10 a week at least. It's killing me."              │ │
│ │                                                                     │ │
│ │ [... continued ...]                                                 │ │
│ │                                                                     │ │
│ │ 8:45 — MIKE ⚠️ OBJECTION DETECTED                                   │ │
│ │ "That sounds good but $400 a month is a lot. I'm not sure I can     │ │
│ │ swing that right now."                                              │ │
│ │                                                                     │ │
│ │ 8:52 — SARAH ✓ GOOD RESPONSE                                        │ │
│ │ "I totally get it. Let me ask you this — you said you're losing     │ │
│ │ 5-10 calls a week to your competitor. If even half of those are     │ │
│ │ $500 jobs, that's $1,000-2,500 a week you're missing out on.        │ │
│ │ Compared to that, $400 is kind of a no-brainer, right?"             │ │
│ │                                                                     │ │
│ │ 9:15 — MIKE 🟢 BUYING SIGNAL                                        │ │
│ │ "Huh. Yeah, when you put it that way... okay what do I need to do?" │ │
│ │                                                                     │ │
│ │ [... continued ...]                                                 │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ KEY MOMENTS                                        [Jump to timestamp]  │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ 0:18 — Discovery question (pain point)                              │ │
│ │ 3:42 — Product demo (Gold Pro explanation)                          │ │
│ │ 8:45 — Price objection                                              │ │
│ │ 8:52 — Objection handling (ROI frame)                               │ │
│ │ 9:15 — Buying signal / commitment                                   │ │
│ │ 11:20 — Close (payment details)                                     │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Team Coaching Dashboard (Manager View)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 📊 CALL ANALYTICS — TEAM COACHING                       December 2025   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ TEAM AVERAGES                                                           │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Avg Call Duration:       11:24                                      │ │
│ │ Avg Talk Ratio:          Agent 52% / Lead 48%                       │ │
│ │ Objections per Call:     1.3                                        │ │
│ │ Objection Handle Rate:   78%                                        │ │
│ │ Close Rate:              37%                                        │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ AGENT COMPARISON                                                        │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Agent           │ Calls │ Talk% │ Obj Handle │ Close │ Sentiment   │ │
│ ├─────────────────┼───────┼───────┼────────────┼───────┼─────────────┤ │
│ │ Sarah Johnson   │ 24    │ 45%   │ 92%        │ 46%   │ Very Pos    │ │
│ │ Mike Chen       │ 21    │ 55%   │ 81%        │ 36%   │ Positive    │ │
│ │ Alex Rodriguez  │ 18    │ 58%   │ 67%        │ 29%   │ Neutral     │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ 💡 COACHING INSIGHTS:                                                   │
│ • Alex talks too much (58%) — review active listening training          │
│ • Alex struggles with objection handling — pair with Sarah              │
│ • Mike's calls are longest — may be over-explaining                     │
│                                                                         │
│ TOP PERFORMING CALLS (Share with team)                                  │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ 🏆 Sarah + Mike's Plumbing — Perfect objection handling    [Listen] │ │
│ │ 🏆 Sarah + Premier Electric — Great discovery questions    [Listen] │ │
│ │ 🏆 Mike + Quick Rooter — Excellent rapport building        [Listen] │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ COMMON OBJECTIONS THIS MONTH                                            │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Objection              │ Frequency │ Handle Rate │ Best Response    │ │
│ ├────────────────────────┼───────────┼─────────────┼──────────────────┤ │
│ │ Too expensive          │ 34%       │ 76%         │ ROI framing      │ │
│ │ Need to think about it │ 28%       │ 68%         │ Isolate concern  │ │
│ │ Have a competitor      │ 18%       │ 82%         │ Ask pain points  │ │
│ │ Bad timing             │ 12%       │ 71%         │ Schedule future  │ │
│ │ Other                  │ 8%        │ 65%         │ Varies           │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

# 18. PROPOSAL GENERATOR

## Overview

Auto-generate professional PDF proposals based on lead qualification data and selected plans. Pre-filled with lead info, recommended plan, pricing, and ROI projections.

## Proposal Builder

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 📄 CREATE PROPOSAL                                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ LEAD: Mike's Plumbing — Mike Johnson                                   │
│ Qualified via AI • Score: 85 (Hot)                                      │
│                                                                         │
│ ═══════════════════════════════════════════════════════════════════════ │
│                                                                         │
│ SELECT PLAN                                                             │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ AI RECOMMENDED: Gold Pro ($399/mo)                                  │ │
│ │ Based on: Needs website + SEO + missed call handling                │ │
│ │                                                                     │ │
│ │ ● Gold Pro — $399/mo                                               │ │
│ │   Website (10 pages) + Local SEO (25 citations) + NeverMiss AI      │ │
│ │                                                                     │ │
│ │ ○ Gold Starter — $249/mo                                           │ │
│ │   Website (5 pages) + Local SEO (10 citations) + NeverMiss AI       │ │
│ │                                                                     │ │
│ │ ○ Silver Pro — $299/mo                                             │ │
│ │   Website (10 pages) + Local SEO (25 citations) — No NeverMiss      │ │
│ │                                                                     │ │
│ │ ○ Custom Package                                                    │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ BILLING                                                                 │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ ● Monthly — $399/mo                                                 │ │
│ │ ○ Annual — $3,591/yr (Save $1,197 — 25% off)                        │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ ADD-ONS                                                                 │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ □ Extra location (+$199/mo)                                         │ │
│ │ □ Additional user seat (+$19/mo)                                    │ │
│ │ □ Priority support (+$99/mo)                                        │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ OFFER CODE                                                              │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ [None ▼]                                                            │ │
│ │                                                                     │ │
│ │ Available: FIRST50, FREETRIAL14, WAIVE99                            │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ ROI CALCULATOR (Include in proposal)                                    │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ ☑ Include ROI projection                                            │ │
│ │                                                                     │ │
│ │ Estimated missed calls/week:     [8]                                │ │
│ │ Average job value:               [$650]                             │ │
│ │ Estimated close rate:            [40%]                              │ │
│ │                                                                     │ │
│ │ PROJECTION:                                                         │ │
│ │ Monthly missed revenue:          $8,320                             │ │
│ │ With TradesCaptain:              $3,328 recovered (40%)             │ │
│ │ Monthly investment:              $399                               │ │
│ │ NET MONTHLY ROI:                 $2,929 (+734%)                     │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ CUSTOM NOTES                                                            │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Mike, based on our conversation, I think Gold Pro is perfect for   │ │
│ │ you. You'll finally outrank Thompson Plumbing on Google, and the   │ │
│ │ AI text-back means you won't lose another call while you're under  │ │
│ │ a sink. Let's get this rolling! - Sarah                            │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ PROPOSAL OPTIONS                                                        │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ ☑ Include e-signature (sign directly from proposal)                 │ │
│ │ ☑ Include payment link                                              │ │
│ │ ☑ Set expiration: [7 days ▼]                                        │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ [Preview Proposal] [Generate & Send]                                    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Generated Proposal Preview

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 📄 PROPOSAL PREVIEW                                      [Edit] [Send]  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │                                                                     │ │
│ │                        [TRADES CAPTAIN LOGO]                        │ │
│ │                                                                     │ │
│ │                    SERVICE PROPOSAL                                 │ │
│ │                                                                     │ │
│ │              Prepared for: Mike's Plumbing                          │ │
│ │              Prepared by: Sarah Johnson                             │ │
│ │              Date: December 28, 2025                                │ │
│ │              Valid until: January 4, 2026                           │ │
│ │                                                                     │ │
│ │  ─────────────────────────────────────────────────────────────────  │ │
│ │                                                                     │ │
│ │  Dear Mike,                                                         │ │
│ │                                                                     │ │
│ │  Thanks for taking the time to chat about Mike's Plumbing. Based    │ │
│ │  on our conversation, I've put together a package that addresses    │ │
│ │  your main challenges:                                              │ │
│ │                                                                     │ │
│ │  • Getting outranked by competitors on Google                       │ │
│ │  • Missing calls while you're on job sites                          │ │
│ │  • Outdated website that doesn't generate leads                     │ │
│ │                                                                     │ │
│ │  ─────────────────────────────────────────────────────────────────  │ │
│ │                                                                     │ │
│ │  RECOMMENDED PACKAGE: GOLD PRO                                      │ │
│ │                                                                     │ │
│ │  ┌─────────────────────────────────────────────────────────────┐   │ │
│ │  │ PROFESSIONAL WEBSITE                                        │   │ │
│ │  │ • 10-page custom website (not a template)                   │   │ │
│ │  │ • Mobile-optimized for customers on phones                  │   │ │
│ │  │ • Built to rank on Google                                   │   │ │
│ │  │ • Service pages, about, contact, reviews                    │   │ │
│ │  ├─────────────────────────────────────────────────────────────┤   │ │
│ │  │ LOCAL SEO                                                   │   │ │
│ │  │ • Google Business Profile optimization                      │   │ │
│ │  │ • 25 citation submissions (Yelp, Angi, etc.)                │   │ │
│ │  │ • Monthly ranking reports                                   │   │ │
│ │  │ • Show up in "plumber near me" searches                     │   │ │
│ │  ├─────────────────────────────────────────────────────────────┤   │ │
│ │  │ NEVERMISS AI                                                │   │ │
│ │  │ • Dedicated business phone number                           │   │ │
│ │  │ • AI texts back missed calls in under 5 seconds             │   │ │
│ │  │ • Captures lead info automatically                          │   │ │
│ │  │ • Books appointments while you're on a job                  │   │ │
│ │  │ • 1,000 SMS/month included                                  │   │ │
│ │  └─────────────────────────────────────────────────────────────┘   │ │
│ │                                                                     │ │
│ │  INVESTMENT                                                         │ │
│ │                                                                     │ │
│ │  Monthly: $399/mo                                                   │ │
│ │  Annual:  $3,591/yr (Save $1,197)                                   │ │
│ │                                                                     │ │
│ │  ─────────────────────────────────────────────────────────────────  │ │
│ │                                                                     │ │
│ │  YOUR ROI PROJECTION                                                │ │
│ │                                                                     │ │
│ │  You mentioned losing ~8 calls/week to competitors.                 │ │
│ │  At $650/job average with 40% close rate:                           │ │
│ │                                                                     │ │
│ │  Current missed revenue:      $8,320/month                          │ │
│ │  Recovered with TradesCaptain: $3,328/month                         │ │
│ │  Your investment:             $399/month                            │ │
│ │  ─────────────────────────────────────────────                      │ │
│ │  NET MONTHLY GAIN:            $2,929 (+734% ROI)                    │ │
│ │                                                                     │ │
│ │  ─────────────────────────────────────────────────────────────────  │ │
│ │                                                                     │ │
│ │  PERSONAL NOTE                                                      │ │
│ │                                                                     │ │
│ │  Mike, based on our conversation, I think Gold Pro is perfect for   │ │
│ │  you. You'll finally outrank Thompson Plumbing on Google, and the   │ │
│ │  AI text-back means you won't lose another call while you're under  │ │
│ │  a sink. Let's get this rolling!                                    │ │
│ │                                                                     │ │
│ │  - Sarah                                                            │ │
│ │                                                                     │ │
│ │  ─────────────────────────────────────────────────────────────────  │ │
│ │                                                                     │ │
│ │         [ ACCEPT & SIGN ]        [ SCHEDULE CALL ]                  │ │
│ │                                                                     │ │
│ │  Questions? Reply to this email or text (555) 987-6543              │ │
│ │                                                                     │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Proposal Tracking

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 📄 PROPOSAL TRACKING                                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ RECENT PROPOSALS                                                        │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Lead             │ Plan      │ Value   │ Sent     │ Status          │ │
│ ├──────────────────┼───────────┼─────────┼──────────┼─────────────────┤ │
│ │ Mike's Plumbing  │ Gold Pro  │ $399/mo │ Dec 28   │ ✓ Signed        │ │
│ │ Premier Electric │ Gold Ent. │ $549/mo │ Dec 27   │ 👀 Viewed (3x)  │ │
│ │ Quick Rooter     │ Silver Pro│ $299/mo │ Dec 26   │ 📧 Sent         │ │
│ │ City HVAC        │ Gold Pro  │ $399/mo │ Dec 24   │ ⏰ Expired      │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ PROPOSAL ANALYTICS                                                      │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Sent this month:           24                                       │ │
│ │ View rate:                 83% (20/24)                              │ │
│ │ Avg views per proposal:    2.4                                      │ │
│ │ Sign rate:                 42% (10/24)                              │ │
│ │ Avg time to sign:          1.8 days                                 │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ 💡 INSIGHT: Proposals with ROI section have 67% higher sign rate       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

# 19. E-SIGNATURE INTEGRATION

## Overview

Built-in e-signature flow so leads can sign proposals and service agreements directly. No need to switch to DocuSign for simple agreements.

## Signing Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│ LEAD RECEIVES PROPOSAL                                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ 1. Lead receives email/SMS with proposal link                           │
│    "Your proposal from Trades Captain is ready — tap to view"           │
│                                                                         │
│ 2. Lead opens proposal (no login required)                              │
│                                                                         │
│ 3. Lead clicks "Accept & Sign"                                          │
│    ↓                                                                    │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │                                                                     │ │
│ │  REVIEW & SIGN                                                      │ │
│ │                                                                     │ │
│ │  Gold Pro Monthly — $399/mo                                         │ │
│ │                                                                     │ │
│ │  By signing, you agree to the Service Agreement                     │ │
│ │  and authorize monthly charges of $399.                             │ │
│ │                                                                     │ │
│ │  [View Full Agreement]                                              │ │
│ │                                                                     │ │
│ │  ─────────────────────────────────────────────────────────────────  │ │
│ │                                                                     │ │
│ │  Your Name:                                                         │ │
│ │  [Mike Johnson                                    ]                 │ │
│ │                                                                     │ │
│ │  Your Signature:                                                    │ │
│ │  ┌───────────────────────────────────────────────────────────────┐ │ │
│ │  │                                                               │ │ │
│ │  │     ~~~~Mike Johnson~~~~                                      │ │ │
│ │  │                                                               │ │ │
│ │  └───────────────────────────────────────────────────────────────┘ │ │
│ │  [Type signature] or [Draw signature]                               │ │
│ │                                                                     │ │
│ │  ☑ I agree to the Terms of Service and Privacy Policy              │ │
│ │                                                                     │ │
│ │  [ SIGN & PAY $399 ]                                                │ │
│ │                                                                     │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ 4. Lead enters payment info (Stripe integration)                        │
│                                                                         │
│ 5. Done! Both parties receive signed PDF                                │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## E-Signature Document Management

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ✍️ E-SIGNATURE DOCUMENTS                                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ DOCUMENT TEMPLATES                                                      │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Template              │ Type        │ Version │ Last Updated        │ │
│ ├───────────────────────┼─────────────┼─────────┼─────────────────────┤ │
│ │ NeverMiss Agreement   │ Service     │ v5.8    │ Dec 1, 2025         │ │
│ │ Blue CRM Agreement    │ Service     │ v5.8    │ Dec 1, 2025         │ │
│ │ Web Agreement         │ Service     │ v5.8    │ Dec 1, 2025         │ │
│ │ Silver Agreement      │ Service     │ v5.8    │ Dec 1, 2025         │ │
│ │ Gold Agreement        │ Service     │ v5.8    │ Dec 1, 2025         │ │
│ │ Local SEO Agreement   │ Service     │ v5.8    │ Dec 1, 2025         │ │
│ │ Multi-Location Addendum│ Addendum   │ v5.8    │ Dec 1, 2025         │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ PENDING SIGNATURES                                                      │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Document              │ Lead            │ Sent     │ Status         │ │
│ ├───────────────────────┼─────────────────┼──────────┼────────────────┤ │
│ │ Gold Agreement        │ Premier Electric│ Dec 27   │ ⏳ Awaiting    │ │
│ │ Silver Agreement      │ Quick Rooter    │ Dec 26   │ ⏳ Awaiting    │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ RECENTLY SIGNED                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Document              │ Client          │ Signed   │ Actions        │ │
│ ├───────────────────────┼─────────────────┼──────────┼────────────────┤ │
│ │ Gold Agreement        │ Mike's Plumbing │ Dec 28   │ [View] [⬇️]    │ │
│ │ Blue Agreement        │ Smith Electric  │ Dec 26   │ [View] [⬇️]    │ │
│ │ NeverMiss Agreement   │ ABC Contractors │ Dec 25   │ [View] [⬇️]    │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Signed Document View

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 📄 SIGNED DOCUMENT: Mike's Plumbing — Gold Agreement                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ STATUS: ✓ COMPLETED                                                     │
│                                                                         │
│ SIGNING DETAILS                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Signer:              Mike Johnson                                   │ │
│ │ Email:               mike@mikesplumbing.com                         │ │
│ │ IP Address:          192.168.1.45                                   │ │
│ │ Signed At:           Dec 28, 2025 at 2:45 PM CST                    │ │
│ │ Device:              iPhone 14 Pro / Safari                         │ │
│ │ Location:            Dallas, TX (approximate)                       │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ DOCUMENT                                                                │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │                                                                     │ │
│ │  [PDF Preview of Signed Agreement]                                  │ │
│ │                                                                     │ │
│ │  Page 1 of 3                                                        │ │
│ │                                                                     │ │
│ │  ...                                                                │ │
│ │                                                                     │ │
│ │  Client Signature: ~~~~Mike Johnson~~~~                             │ │
│ │  Date: December 28, 2025                                            │ │
│ │                                                                     │ │
│ │  [SIGNED ELECTRONICALLY - CERTIFICATE ID: 8f3a9c2d...]              │ │
│ │                                                                     │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ [Download PDF] [Send Copy to Client] [View Audit Trail]                 │
│                                                                         │
│ AUDIT TRAIL                                                             │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Dec 28, 2:34 PM — Document created by Sarah Johnson                 │ │
│ │ Dec 28, 2:34 PM — Document sent to mike@mikesplumbing.com           │ │
│ │ Dec 28, 2:38 PM — Document viewed by Mike Johnson (192.168.1.45)    │ │
│ │ Dec 28, 2:40 PM — Document viewed by Mike Johnson (192.168.1.45)    │ │
│ │ Dec 28, 2:45 PM — Document signed by Mike Johnson                   │ │
│ │ Dec 28, 2:45 PM — Payment processed ($399.00)                       │ │
│ │ Dec 28, 2:45 PM — Signed copy sent to mike@mikesplumbing.com        │ │
│ │ Dec 28, 2:45 PM — Signed copy sent to sarah@tradescaptain.com       │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## DocuSign Integration (Alternative)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ⚙️ E-SIGNATURE SETTINGS                                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ SIGNATURE PROVIDER                                                      │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ ● Built-in E-Signature (TradesCaptain)                              │ │
│ │   Free, simple, gets the job done                                   │ │
│ │                                                                     │ │
│ │ ○ DocuSign Integration                                              │ │
│ │   Enterprise-grade, additional compliance features                  │ │
│ │   [Connect DocuSign Account]                                        │ │
│ │                                                                     │ │
│ │ ○ PandaDoc Integration                                              │ │
│ │   Advanced proposal features                                        │ │
│ │   [Connect PandaDoc Account]                                        │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ AUTOMATIC ACTIONS                                                       │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ When document is signed:                                            │ │
│ │ ☑ Convert lead to client automatically                              │ │
│ │ ☑ Trigger payment collection                                        │ │
│ │ ☑ Start onboarding checklist                                        │ │
│ │ ☑ Calculate commission                                              │ │
│ │ ☑ Send welcome email                                                │ │
│ │ ☑ Notify assigned agent                                             │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

# 20. DATABASE ADDITIONS (New Features)

```sql
-- =====================================================
-- CALL RECORDINGS
-- =====================================================

CREATE TABLE call_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_call_id UUID REFERENCES scheduled_calls(id) NOT NULL,
  agent_id UUID REFERENCES agents(id) NOT NULL,
  contact_id UUID REFERENCES outreach_contacts(id) NOT NULL,
  
  -- Recording
  recording_url TEXT NOT NULL,
  recording_duration_seconds INTEGER,
  recording_format VARCHAR(10) DEFAULT 'mp3',
  file_size_bytes INTEGER,
  
  -- Transcription
  transcript TEXT,
  transcript_segments JSONB,              -- Timestamped segments with speaker
  transcription_status VARCHAR(20),       -- 'pending', 'processing', 'completed', 'failed'
  
  -- AI Analysis
  ai_analysis JSONB,                      -- Full analysis object
  talk_ratio_agent DECIMAL(3,2),
  talk_ratio_lead DECIMAL(3,2),
  sentiment VARCHAR(20),                  -- 'positive', 'neutral', 'negative'
  objections_detected INTEGER DEFAULT 0,
  buying_signals_detected INTEGER DEFAULT 0,
  
  -- Key moments (timestamps)
  key_moments JSONB,                      -- Array of {timestamp, type, description}
  
  -- Consent
  consent_played BOOLEAN DEFAULT true,
  
  -- Retention
  expires_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE call_recording_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID REFERENCES call_recordings(id) NOT NULL,
  accessed_by UUID REFERENCES agents(id) NOT NULL,
  access_type VARCHAR(20),                -- 'view', 'download', 'share'
  accessed_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PROPOSALS
-- =====================================================

CREATE TABLE proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  contact_id UUID REFERENCES outreach_contacts(id) NOT NULL,
  agent_id UUID REFERENCES agents(id) NOT NULL,
  
  -- Content
  plan_slug VARCHAR(50) NOT NULL,
  billing_period VARCHAR(20) NOT NULL,    -- 'monthly', 'annual'
  offer_code VARCHAR(20),
  add_ons JSONB,
  
  -- Pricing
  monthly_price_cents INTEGER NOT NULL,
  annual_price_cents INTEGER,
  total_price_cents INTEGER NOT NULL,
  
  -- ROI
  include_roi BOOLEAN DEFAULT true,
  roi_data JSONB,                         -- missed_calls, job_value, close_rate, projection
  
  -- Custom content
  custom_notes TEXT,
  
  -- Document
  proposal_pdf_url TEXT,
  
  -- Status
  status VARCHAR(20) DEFAULT 'draft',     -- 'draft', 'sent', 'viewed', 'signed', 'expired', 'declined'
  
  -- Tracking
  sent_at TIMESTAMPTZ,
  first_viewed_at TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  
  -- Conversion
  converted_client_id UUID REFERENCES clients(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE proposal_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID REFERENCES proposals(id) NOT NULL,
  
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address VARCHAR(50),
  user_agent TEXT,
  time_spent_seconds INTEGER
);

-- =====================================================
-- E-SIGNATURES
-- =====================================================

CREATE TABLE signature_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Related records
  proposal_id UUID REFERENCES proposals(id),
  contact_id UUID REFERENCES outreach_contacts(id),
  client_id UUID REFERENCES clients(id),
  agent_id UUID REFERENCES agents(id) NOT NULL,
  
  -- Document
  document_type VARCHAR(50) NOT NULL,     -- 'service_agreement', 'addendum', 'proposal_acceptance'
  template_id UUID,
  
  document_name VARCHAR(200) NOT NULL,
  document_url TEXT,                      -- Unsigned document
  signed_document_url TEXT,               -- Signed PDF
  
  -- Signer
  signer_name VARCHAR(100),
  signer_email VARCHAR(200),
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending',   -- 'pending', 'sent', 'viewed', 'signed', 'declined', 'expired'
  
  -- Timestamps
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  
  -- Signature data
  signature_data TEXT,                    -- Base64 signature image or typed name
  signature_type VARCHAR(20),             -- 'drawn', 'typed'
  
  -- Audit
  signer_ip VARCHAR(50),
  signer_user_agent TEXT,
  signer_location TEXT,
  certificate_id VARCHAR(100),            -- Unique signature certificate
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE signature_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES signature_documents(id) NOT NULL,
  
  action VARCHAR(50) NOT NULL,            -- 'created', 'sent', 'viewed', 'signed', 'downloaded'
  actor_type VARCHAR(20),                 -- 'agent', 'signer', 'system'
  actor_id UUID,
  
  ip_address VARCHAR(50),
  user_agent TEXT,
  
  details JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE signature_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  name VARCHAR(200) NOT NULL,
  document_type VARCHAR(50) NOT NULL,
  
  template_content TEXT NOT NULL,         -- HTML template with merge fields
  version VARCHAR(20),
  
  -- Merge fields available
  merge_fields JSONB,                     -- ['client_name', 'plan_name', 'price', etc.]
  
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_recordings_call ON call_recordings(scheduled_call_id);
CREATE INDEX idx_recordings_agent ON call_recordings(agent_id);
CREATE INDEX idx_proposals_contact ON proposals(contact_id);
CREATE INDEX idx_proposals_status ON proposals(status);
CREATE INDEX idx_signatures_contact ON signature_documents(contact_id);
CREATE INDEX idx_signatures_status ON signature_documents(status);
CREATE INDEX idx_signature_audit ON signature_audit_log(document_id);
```

---

# 21. API ADDITIONS (New Features)

```typescript
// =====================================================
// CALL RECORDINGS
// =====================================================

GET    /api/outreach/recordings
GET    /api/outreach/recordings/:id
GET    /api/outreach/recordings/:id/transcript
GET    /api/outreach/recordings/:id/analysis
POST   /api/outreach/recordings/:id/analyze    // Re-run AI analysis
GET    /api/outreach/recordings/:id/download

GET    /api/outreach/recordings/analytics      // Team coaching metrics
GET    /api/agents/:id/recordings              // Agent's recordings

// =====================================================
// PROPOSALS
// =====================================================

GET    /api/outreach/proposals
POST   /api/outreach/proposals
GET    /api/outreach/proposals/:id
PATCH  /api/outreach/proposals/:id
DELETE /api/outreach/proposals/:id

POST   /api/outreach/proposals/:id/send
POST   /api/outreach/proposals/:id/preview     // Generate preview PDF
GET    /api/outreach/proposals/:id/analytics   // View tracking

// Public (no auth - accessed by lead)
GET    /api/proposals/:token                   // View proposal
POST   /api/proposals/:token/accept            // Accept & sign

// =====================================================
// E-SIGNATURES
// =====================================================

GET    /api/outreach/signatures
POST   /api/outreach/signatures                // Create signature request
GET    /api/outreach/signatures/:id
POST   /api/outreach/signatures/:id/send
POST   /api/outreach/signatures/:id/remind
POST   /api/outreach/signatures/:id/void

GET    /api/outreach/signatures/:id/audit      // Audit trail
GET    /api/outreach/signatures/:id/download   // Signed PDF

GET    /api/outreach/signature-templates
POST   /api/outreach/signature-templates
PATCH  /api/outreach/signature-templates/:id

// Public (no auth - accessed by signer)
GET    /api/sign/:token                        // View document
POST   /api/sign/:token                        // Submit signature
```

---

# 22. TESTING CHECKLIST (New Features)

```
CALL RECORDING:
□ Recording starts when call connects
□ Consent announcement plays first
□ Recording stops when call ends
□ Recording uploads successfully
□ Transcription completes
□ AI analysis runs and extracts insights
□ Talk ratio calculated correctly
□ Objections and buying signals detected
□ Key moments timestamped
□ Recordings accessible only by authorized users
□ Download works
□ Retention/expiration enforced

PROPOSALS:
□ Proposal generates with correct plan details
□ ROI calculator math is accurate
□ Custom notes save
□ PDF generates correctly
□ Proposal sends via email and SMS
□ View tracking works
□ Multiple views tracked
□ Expiration enforced
□ Accept button leads to signing flow

E-SIGNATURES:
□ Document templates render merge fields
□ Signature request sends successfully
□ Signer can view document without login
□ Typed signature works
□ Drawn signature works
□ Terms checkbox required
□ Signature captured with audit data
□ Signed PDF generates
□ Both parties receive signed copy
□ Audit trail complete
□ Auto-actions trigger (convert lead, start onboarding)
□ Payment integration works (if included)
```

---

# 23. TESTING CHECKLIST

```
CONSENT & COMPLIANCE:
□ Consent checkbox required on all forms
□ Consent record created with full audit trail
□ STOP keyword immediately triggers opt-out
□ Opt-out confirmation sent
□ Opted-out numbers blocked from all campaigns
□ Messages only sent 8am-9pm recipient timezone
□ Full audit log exportable

AI CONVERSATIONS:
□ First message sends within 60 seconds of form submit
□ AI correctly detects interest/objection/STOP
□ Qualification data extracted and saved
□ Score calculated correctly
□ Human takeover works smoothly
□ Max message limit enforced

TEXT WIDGET:
□ SMS link opens native messaging app
□ Pre-filled message includes tracking code
□ Inbound text creates new conversation
□ AI responds with widget-specific opener
□ AI asks for trade type first (widget leads)
□ AI asks for name naturally in conversation
□ Lead created with source = "SMS_WIDGET"
□ Widget click tracking works
□ Consent logged as "implied_inbound"
□ STOP honored immediately
□ Analytics track by button location
□ Comparison reports SMS vs SMS_WIDGET

CALL SCHEDULING:
□ Available slots calculated correctly
□ 30-minute buffer enforced between all calls
□ Cannot book calls less than 30 min apart
□ Round robin distributes evenly
□ Weighted distribution respects weights
□ Calendar blocks prevent double-booking
□ Agent notification sent on new booking
□ Lead reminder sent morning-of
□ Reschedule flow works
□ No-show detection and follow-up

BLACKOUT DAYS:
□ Weekends (Sat/Sun) blocked by default
□ Global holidays blocked for all agents
□ Agent can set recurring weekly blackouts
□ Agent can set specific date blackouts
□ Agent can set date range blackouts
□ AI does not offer times on blacked-out days
□ Blackout preview shows correctly in agent settings

3-DAY BUSINESS WINDOW:
□ AI only offers times within next 3 business days
□ Weekends and holidays skipped when counting business days
□ Day 4+ not offered even if available
□ If no slots in 3-day window → overflow to Admin
□ Overflow reason set to "no_availability_3day_window"

WEEKEND REQUEST HANDLING:
□ When lead asks for Saturday → flag as weekend_request
□ When lead asks for Sunday → flag as weekend_request
□ Call created with status "pending_admin_approval"
□ Lead added to Admin list under "Weekend Requests"
□ AI sends tentative confirmation message
□ Admin can confirm and assign agent
□ Admin can reschedule to weekday
□ Confirmed weekend calls work normally

ADMIN OVERFLOW:
□ When no availability, lead pushed to Admin List
□ Lead status set to "pending_admin"
□ Lead source labeled as "SMS" or "SMS_WIDGET"
□ Admin notified immediately
□ AI sends overflow message to lead
□ Admin can view pending leads list
□ Admin can assign lead to agent
□ Admin can bulk assign leads
□ Assigned leads move out of overflow
□ Overflow stats tracked correctly

ADMIN DISTRIBUTION MODES:
□ Manual mode: Admin must assign each lead
□ Auto mode: System assigns when availability opens
□ Auto mode: Batch assigns daily at configured time
□ Hybrid mode: Auto for no-availability, manual for weekend
□ Distribution mode changeable in Admin settings
□ Hot leads prioritized in auto-distribution

AGENT WEEKLY HOURS:
□ Agent can set their timezone
□ Agent can set weekly availability (start/end per day)
□ Agent can add break times (lunch, meetings)
□ Agent can add multiple shifts per day
□ Unavailable days show as disabled
□ Calculated slots preview shows correctly
□ Changes take effect immediately for new bookings

TIMEZONE HANDLING:
□ All times stored in UTC in database
□ Lead timezone detected from phone area code
□ AI asks timezone if detection fails
□ AI offers times in LEAD'S local timezone
□ CRM shows times in AGENT'S local timezone
□ Scheduled call shows both timezones
□ Reminders sent in recipient's timezone
□ Calendar invites use correct timezone
□ Cross-timezone edge cases handled (early/late slots)
□ Timezone conversion accurate across DST boundaries

NO-SHOW ESCALATION:
□ First no-show triggers standard follow-up
□ Second no-show flags lead as "At Risk"
□ Second no-show reduces score by 15
□ Third no-show moves to long-term nurture
□ Third no-show reduces score by 25
□ Fourth no-show archives lead
□ Archived leads eligible for reactivation after 90 days
□ Hot leads get extra attempt before escalation

SPEED-TO-LEAD:
□ Form-to-first-text time tracked
□ First-text-to-reply time tracked
□ Reply-to-booked time tracked
□ Dashboard shows metrics by source, agent, hour
□ Speed alerts fire when targets missed
□ Insights highlight best/worst performance times

LEAD REASSIGNMENT:
□ Can select leads from specific agent
□ Can reassign to specific agent
□ Can distribute evenly across agents
□ Can use round robin distribution
□ Calendar events updated for new agent
□ Optional SMS sent to leads about new contact
□ Reassignment history logged with reason

SLACK INTEGRATION:
□ Workspace connects via OAuth
□ Channels can be added and configured
□ New lead notifications work
□ Hot lead alerts work
□ Closed deal celebrations work
□ No-show alerts work
□ Agent DMs work for assigned leads
□ Call reminders sent to agent DMs

DNC CHECKING (DATAZAPP):
□ API connects successfully
□ Numbers checked on lead creation
□ Federal DNC flagged correctly
□ State DNC flagged correctly
□ Litigators flagged and highlighted
□ Blocked leads not contacted
□ Results cached for configured days
□ Re-check works for old leads
□ Suppression list manageable

LEAD IMPORT:
□ CSV upload works
□ XLSX upload works
□ Column mapping interface works
□ Preview shows valid/invalid/duplicates
□ DNC check runs if enabled
□ Duplicates skipped if enabled
□ Leads created with correct source
□ Import history tracked

SELF-SCHEDULING:
□ Agent link works (book.tradescaptain.com/agent-name)
□ Team link works (round robin)
□ Available dates respect blackouts
□ Available times respect agent hours
□ 30-min buffer enforced
□ 3-day window enforced
□ Form collects required fields
□ Booking creates scheduled call
□ Confirmation SMS sent
□ Agent notified

EMAIL NOTIFICATIONS:
□ SendGrid/Postmark connects
□ Agent preferences saveable
□ New lead emails work
□ Hot lead alerts work
□ Call reminders work
□ Daily summary works

TEAM LEADERBOARD:
□ Rankings calculate correctly
□ Achievements detected and awarded
□ Stats comparison accurate
□ Goal progress tracked

DECISION MAKER CHECK:
□ AI asks decision maker question
□ Non-decision-makers flagged
□ Score adjusted appropriately
□ Notes capture decision maker info

COMPETITOR DETECTION:
□ Known competitors detected in conversation
□ Competitor flag set on contact
□ Dashboard shows competitor stats
□ Win rates tracked by competitor

LEAD ENRICHMENT:
□ Enrichment API connects
□ Company data populated
□ Google reviews pulled
□ Social profiles found
□ AI insights generated

REVENUE FORECAST:
□ Pipeline breakdown calculates
□ Weighted projection accurate
□ Confidence based on history
□ Scenario analysis works

MULTI-TOUCH ATTRIBUTION:
□ Touchpoints tracked
□ First touch credit calculated
□ Last touch credit calculated
□ Linear credit calculated
□ Journey visualization works

ZAPIER WEBHOOKS:
□ Webhook URLs saveable
□ Events configurable
□ Payloads sent correctly
□ Test webhook works

AGENT INTERFACE:
□ Pre-call view shows all context
□ AI summary accurate and helpful
□ Dynamic call script displays
□ Click-to-call works
□ Outcome logging complete
□ Post-call automation triggers correctly

NURTURE SEQUENCES:
□ Correct sequence assigned based on trigger
□ Messages sent on schedule
□ Reply exits sequence
□ Conversion exits sequence
□ Opt-out exits sequence

REFERRALS:
□ Client can submit referral from portal
□ Referral creates outreach contact
□ AI mentions referrer in first message
□ Referrer credited on conversion
□ Reward tracking accurate

A/B TESTING:
□ Traffic split correctly
□ Stats tracked per variant
□ Winner declaration works
□ Winning variant applied to campaign

ANALYTICS:
□ Funnel metrics accurate
□ Campaign breakdown correct
□ Agent performance calculated
□ AI metrics tracked
□ Export generates valid report
```

---

**Version 5.8 — December 2025**