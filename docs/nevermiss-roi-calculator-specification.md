# NeverMiss ROI Calculator Specification

**Version:** 1.0  
**Date:** December 2025  
**Type:** Feature Specification  
**Location:** Website landing page + Sales tool  
**CRM Spec Version:** v6.4.2

---

## Overview

The ROI Calculator helps prospects understand the financial impact of missed calls and demonstrates how quickly NeverMiss pays for itself.

**Goal:** Convert "I'm not sure" into "This is a no-brainer" by making the math obvious.

---

## Calculator Inputs

### Required Inputs

| Input | Type | Default | Range | Label |
|-------|------|---------|-------|-------|
| Missed calls per week | Slider | 5 | 1-20 | "How many calls do you miss per week?" |
| Average job value | Slider | $300 | $100-$2,000 | "What's your average job worth?" |
| Close rate | Slider | 40% | 10%-80% | "What % of leads become jobs?" |

### Optional Inputs (Advanced Mode)

| Input | Type | Default | Label |
|-------|------|---------|-------|
| Callback success rate | Slider | 30% | "When you call back later, how often do they still need you?" |
| Competitor capture rate | Slider | 70% | "How often does a missed call go to a competitor?" |

---

## Calculator Outputs

### Primary Outputs

| Output | Formula | Example |
|--------|---------|---------|
| Monthly missed calls | `missed_per_week × 4` | 20 calls/month |
| Potential revenue lost | `monthly_calls × avg_job × close_rate` | $2,400/month |
| With NeverMiss capture rate | 85% (fixed) | 85% |
| Revenue recovered | `potential_lost × 0.85` | $2,040/month |
| NeverMiss cost | $29/month (fixed) | $29/month |
| **Net monthly gain** | `recovered - $29` | **$2,011/month** |
| **ROI multiple** | `recovered / $29` | **70x return** |
| **Payback period** | `$29 / (recovered / 30)` | **< 1 day** |

### Secondary Outputs

| Output | Formula | Label |
|--------|---------|-------|
| Annual revenue saved | `net_monthly × 12` | "Yearly impact" |
| Jobs saved per month | `monthly_calls × 0.85 × close_rate` | "Extra jobs per month" |
| Break-even calls | `$29 / (avg_job × close_rate)` | "Calls needed to pay for NeverMiss" |

---

## UI Design

### Desktop Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│   💰 HOW MUCH ARE MISSED CALLS COSTING YOU?                             │
│                                                                         │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │ How many calls do you miss per week?                            │   │
│   │                                                                 │   │
│   │ ●────────────────○──────────────────────────────────────────    │   │
│   │ 1               5                                         20    │   │
│   │                 ▲                                               │   │
│   │              5 calls                                            │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │ What's your average job worth?                                  │   │
│   │                                                                 │   │
│   │ ────────────────────●────────────────────────────────────────   │   │
│   │ $100             $300                                  $2,000   │   │
│   │                    ▲                                            │   │
│   │                  $300                                           │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │ What % of leads become jobs?                                    │   │
│   │                                                                 │   │
│   │ ──────────────────────●──────────────────────────────────────   │   │
│   │ 10%                  40%                                   80%  │   │
│   │                       ▲                                         │   │
│   │                      40%                                        │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│                        YOUR RESULTS                                     │
│                                                                         │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                                                                 │   │
│   │  WITHOUT NEVERMISS           WITH NEVERMISS                     │   │
│   │                                                                 │   │
│   │  📞 20 missed calls/mo       📞 20 missed calls/mo              │   │
│   │  ❌ 70% go to competitors    ✅ 85% captured by AI              │   │
│   │  💸 $2,400 lost              💰 $2,040 recovered                │   │
│   │                                                                 │   │
│   │                              − $29 NeverMiss                    │   │
│   │                              ─────────────────                  │   │
│   │                              = $2,011/mo SAVED                  │   │
│   │                                                                 │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│   ┌────────────────┐  ┌────────────────┐  ┌────────────────┐           │
│   │    $24,132     │  │      70x       │  │    < 1 DAY     │           │
│   │  saved/year    │  │    return      │  │   to pay off   │           │
│   └────────────────┘  └────────────────┘  └────────────────┘           │
│                                                                         │
│           [ GET STARTED — $29/mo → ]                                    │
│                                                                         │
│   NeverMiss: $29/month • No contract • Cancel anytime                   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Mobile Layout

```
┌─────────────────────────────┐
│                             │
│  💰 MISSED CALL             │
│     CALCULATOR              │
│                             │
│  Missed calls/week          │
│  ●─────○────────────        │
│     5 calls                 │
│                             │
│  Average job value          │
│  ──────●────────────        │
│    $300                     │
│                             │
│  Close rate                 │
│  ─────────●─────────        │
│      40%                    │
│                             │
├─────────────────────────────┤
│                             │
│  YOU'RE LOSING              │
│  $2,400/month               │
│  to missed calls            │
│                             │
│  ─────────────────────────  │
│                             │
│  WITH NEVERMISS             │
│  Save $2,011/mo             │
│                             │
│  ┌───────┐ ┌───────┐       │
│  │  70x  │ │<1 day │       │
│  │return │ │payoff │       │
│  └───────┘ └───────┘       │
│                             │
│  [ GET STARTED $29/mo ]     │
│                             │
│  $29/mo • No contract       │
│                             │
└─────────────────────────────┘
```

---

## Calculation Logic

### JavaScript Implementation

```javascript
function calculateROI(inputs) {
  const {
    missedCallsPerWeek,
    averageJobValue,
    closeRate,
    callbackSuccessRate = 0.30,
    competitorCaptureRate = 0.70
  } = inputs;
  
  // Constants
  const NEVERMISS_COST = 29;
  const NEVERMISS_CAPTURE_RATE = 0.85;
  const WEEKS_PER_MONTH = 4;
  const MONTHS_PER_YEAR = 12;
  
  // Monthly calls
  const monthlyMissedCalls = missedCallsPerWeek * WEEKS_PER_MONTH;
  
  // Without NeverMiss
  const callsLostToCompetitors = monthlyMissedCalls * competitorCaptureRate;
  const potentialRevenueLost = callsLostToCompetitors * averageJobValue * closeRate;
  
  // With NeverMiss
  const callsCaptured = monthlyMissedCalls * NEVERMISS_CAPTURE_RATE;
  const jobsRecovered = callsCaptured * closeRate;
  const revenueRecovered = jobsRecovered * averageJobValue;
  
  // Net impact
  const netMonthlySavings = revenueRecovered - NEVERMISS_COST;
  const netYearlySavings = netMonthlySavings * MONTHS_PER_YEAR;
  
  // ROI metrics
  const roiMultiple = revenueRecovered / NEVERMISS_COST;
  const dailyRevenue = revenueRecovered / 30;
  const paybackDays = dailyRevenue > 0 ? NEVERMISS_COST / dailyRevenue : 999;
  
  // Break-even
  const revenuePerCall = averageJobValue * closeRate;
  const breakEvenCalls = revenuePerCall > 0 ? NEVERMISS_COST / revenuePerCall : 999;
  
  return {
    // Inputs echoed back
    monthlyMissedCalls,
    
    // Without NeverMiss
    callsLostToCompetitors: Math.round(callsLostToCompetitors),
    potentialRevenueLost: Math.round(potentialRevenueLost),
    
    // With NeverMiss
    callsCaptured: Math.round(callsCaptured),
    jobsRecovered: Math.round(jobsRecovered * 10) / 10,
    revenueRecovered: Math.round(revenueRecovered),
    
    // Net impact
    nevermissCost: NEVERMISS_COST,
    netMonthlySavings: Math.round(netMonthlySavings),
    netYearlySavings: Math.round(netYearlySavings),
    
    // ROI metrics
    roiMultiple: Math.round(roiMultiple),
    paybackDays: paybackDays < 1 ? '< 1' : Math.round(paybackDays),
    breakEvenCalls: Math.round(breakEvenCalls * 10) / 10
  };
}
```

### Example Calculations

**Scenario 1: Average Contractor**
- 5 missed calls/week = 20/month
- $300 average job
- 40% close rate
- Result: $2,040 recovered, $2,011/mo saved, 70x ROI

**Scenario 2: High-Value Contractor**
- 10 missed calls/week = 40/month
- $500 average job
- 50% close rate
- Result: $8,500 recovered, $8,471/mo saved, 293x ROI

**Scenario 3: Conservative Estimate**
- 3 missed calls/week = 12/month
- $200 average job
- 30% close rate
- Result: $612 recovered, $583/mo saved, 21x ROI

---

## Industry Presets

Add quick-select buttons for common trades:

| Trade | Missed/Week | Avg Job | Close Rate |
|-------|-------------|---------|------------|
| Plumber | 7 | $350 | 45% |
| Electrician | 6 | $400 | 40% |
| HVAC | 8 | $500 | 35% |
| Roofer | 5 | $1,200 | 25% |
| Handyman | 10 | $150 | 50% |
| Landscaper | 8 | $250 | 45% |
| Cleaning | 12 | $120 | 55% |

```jsx
<IndustryPresets>
  <PresetButton onClick={() => setPreset('plumber')}>🔧 Plumber</PresetButton>
  <PresetButton onClick={() => setPreset('electrician')}>⚡ Electrician</PresetButton>
  <PresetButton onClick={() => setPreset('hvac')}>❄️ HVAC</PresetButton>
  <PresetButton onClick={() => setPreset('roofer')}>🏠 Roofer</PresetButton>
  <PresetButton onClick={() => setPreset('handyman')}>🛠️ Handyman</PresetButton>
  <PresetButton onClick={() => setPreset('landscaper')}>🌳 Landscaper</PresetButton>
</IndustryPresets>
```

---

## Animation & UX

### Slider Interactions

- Values update in real-time as slider moves
- Results section animates/pulses when values change
- Use color coding:
  - Red for "money lost"
  - Green for "money saved"
  - Blue for NeverMiss cost

### Results Reveal

When user first interacts with a slider:
1. Grey out the "lost" column
2. Animate the "saved" column counting up
3. Pop the ROI badges one at a time

### Mobile Considerations

- Stack sliders vertically
- Make touch targets large (48px minimum)
- Sticky CTA button at bottom
- Results section scrolls into view on mobile

---

## Sharing & Attribution

### Shareable Results

Generate a unique URL with encoded inputs:

```
https://tradescaptain.com/nevermiss/roi?c=5&j=300&r=40
```

Where:
- `c` = missed calls per week
- `j` = average job value
- `r` = close rate (percentage)

### For Sales Reps

Button to "Copy Results as Text":

```
📊 NeverMiss ROI for [Prospect Name]

Current situation:
• 20 missed calls/month
• $300 average job
• 40% close rate

Without NeverMiss: Losing ~$2,400/month
With NeverMiss: Save $2,011/month

That's a 70x return on a $29/month investment.
Payback period: Less than 1 day.

[Get NeverMiss — $29/mo →]
```

### Email Results

"Email me these results" → Capture email for follow-up:

```
Subject: Your NeverMiss ROI Calculation

You're currently losing an estimated $2,400/month to missed calls.

With NeverMiss at $29/month, you could recover $2,011/month.

Here's how it works:
[Link to demo video]

Ready to stop losing leads? Get started now:
[CTA Button]
```

---

## A/B Testing Opportunities

| Test | Variant A | Variant B |
|------|-----------|-----------|
| Default values | Industry average | Higher values (more dramatic) |
| Results framing | "Save $X/month" | "Stop losing $X/month" |
| CTA text | "Get Started" | "See It Work" |
| Payback metric | "< 1 day to pay off" | "First call pays for 6 months" |
| Social proof | None | "Join 500+ contractors" |

---

## Analytics Events

Track these interactions:

```javascript
// Calculator loaded
gtag('event', 'roi_calculator_view');

// Slider adjusted
gtag('event', 'roi_calculator_input', {
  input_name: 'missed_calls',
  input_value: 5
});

// Industry preset selected
gtag('event', 'roi_calculator_preset', {
  preset: 'plumber'
});

// Results calculated
gtag('event', 'roi_calculator_result', {
  monthly_savings: 2011,
  roi_multiple: 70
});

// CTA clicked
gtag('event', 'roi_calculator_cta_click');

// Results shared
gtag('event', 'roi_calculator_share', {
  method: 'copy' // or 'email'
});
```

---

## Integration Points

### Website

- Embed on `/nevermiss` landing page
- Standalone page at `/nevermiss/calculator`
- Pop-up version triggered by "Calculate your ROI" CTA

### Sales Tools

- Embed in sales dashboard
- Pre-fill with prospect info if known
- "Send to Prospect" button generates personalized email

### Retargeting

- If user calculates ROI but doesn't convert, add to retargeting list
- Show ads with their specific numbers: "You're losing $2,400/month..."

---

## Technical Requirements

| Requirement | Specification |
|-------------|---------------|
| Load time | < 1 second |
| Framework | React component or vanilla JS |
| Responsive | Works on 320px+ screens |
| Accessibility | WCAG 2.1 AA compliant |
| Browser support | Chrome, Safari, Firefox, Edge (last 2 versions) |
| Analytics | Google Analytics 4 events |

---

## Launch Checklist

```
□ Calculator renders correctly on desktop
□ Calculator renders correctly on mobile
□ Sliders are touch-friendly
□ Real-time calculation works
□ Industry presets work
□ Results animate on change
□ CTA button links to signup
□ Share/copy functionality works
□ Analytics events firing
□ A/B test configured
□ Page speed < 2 seconds
```