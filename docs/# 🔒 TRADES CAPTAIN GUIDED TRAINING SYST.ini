# 🔒 TRADES CAPTAIN GUIDED TRAINING SYSTEM

## Interactive Onboarding & Feature Education Platform

### MASTER BUILD PROMPT (LOCKED v1.5 — EMPTY STATE INTEGRATION)

**Product:** Guided Training System (GTS)  
**Parent Platform:** Trades Captain CRM  
**Audience:** Claude / Trae AI  
**Status:** LOCKED — Optimized for minimal footprint  
**Scope:** Business Portal + Admin Portal

**Core Principle:**

> *Training happens inside the product, not outside it. Users learn by seeing real screens, not watching videos about them.*

**Lightweight Principle:**

> *Zero external APIs. Minimal database writes. Maximum browser capabilities.*

---

## 0. NON-NEGOTIABLE CONSTRAINTS

* Training runs **on top of the live UI**, not in a separate environment
* Voice narration uses **browser-only TTS** (no external APIs)
* Content is **bundled with the app** (no runtime fetching)
* Progress is **localStorage-first**, synced to DB on exit
* Analytics are **batched and module-level only**
* Training is **non-blocking** — users can exit anytime

DO NOT:

* Add external TTS APIs (ElevenLabs, Google, Amazon)
* Fetch content from CMS/storage at runtime
* Write to database on every step
* Track per-step analytics
* Build complex branching/conditional logic
* Add A/B testing infrastructure
* Create an admin content editor UI

---

## 1. SYSTEM PURPOSE (LOCKED)

The Guided Training System exists to:

1. Reduce time-to-value for new users
2. Increase feature adoption across all user types
3. Eliminate support tickets caused by "how do I...?"
4. Enable self-serve learning at user's pace
5. Introduce new features without release notes

**Cost:** Zero API calls during training. One DB write on exit.

---

## 2. PORTAL & AUDIENCE MODEL

### 2.1 Supported Portals

| Portal | Audience | Training Focus |
|--------|----------|----------------|
| Business Portal | Contractors, office staff | CRM features, job management, AI Voice/SMS |
| Admin Portal | Sales agents, support, management | Account management, system configuration |

### 2.2 Role-Based Tracks

**Business Portal:**
| Role | Track |
|------|-------|
| Owner/Admin | Full platform onboarding |
| Technician | Mobile-focused, job completion |

**Admin Portal:**
| Role | Track |
|------|-------|
| Sales Agent | Account creation, demos |
| Support | Troubleshooting flows |

---

## 3. CONTENT ARCHITECTURE (SIMPLIFIED)

### 3.1 Hierarchy

```
Course (feature area)
└── Module (specific workflow)
    └── Step (single screen/action)
```

No "Tracks" layer. Role filtering happens at course level.

### 3.2 Content Storage: BUNDLED JSON

Content is **compiled into the app**, not fetched at runtime.

```typescript
// lib/training/content.ts (bundled with app)

export const TRAINING_CONTENT: Record<string, Course> = {
  "ai-voice-sms": {
    id: "ai-voice-sms",
    title: "AI Voice & SMS Setup",
    description: "Configure automatic call handling",
    icon: "phone",
    estimatedMinutes: 15,
    roles: ["owner", "admin"],
    featureFlag: "ai_voice_enabled",
    modules: [
      {
        id: "overview",
        title: "Overview",
        steps: [
          {
            id: "welcome",
            type: "MODAL",
            content: {
              title: "Welcome to AI Voice & SMS",
              body: "AI Voice answers calls when you can't...",
              voice: "Welcome to AI Voice and SMS training..."
            },
            display: { overlay: 0.7 }
          },
          // ... more steps
        ]
      },
      // ... more modules
    ]
  },
  // ... more courses
};
```

**Why bundled:**
- Zero API calls to load content
- Instant availability
- Type-safe with TypeScript
- Updates deploy with features (you're deploying anyway)
- Works offline

### 3.3 Adding New Training Content

When adding a new feature:

1. Add course/modules to `lib/training/content.ts`
2. Add `data-training` attributes to new UI elements
3. Deploy (content ships with code)

No CMS. No admin UI. No separate content pipeline.

---

## 4. STEP SYSTEM (SIMPLIFIED)

### 4.1 Step Types (4 ONLY)

| Type | Purpose | User Action |
|------|---------|-------------|
| **MODAL** | Full explanation overlay | Click Next |
| **SPOTLIGHT** | Highlight element + explain | Click Next or element |
| **ACTION** | User performs real action | Complete the action |
| **CHECKPOINT** | Mark progress milestone | Automatic |

No NAVIGATION, BRANCH, CONFIRMATION, or TOOLTIP types. Keep it simple.

### 4.2 ACTION Step Best Practice: "Why This Matters"

ACTION steps should include a brief business impact line when possible:

**Good:**
```typescript
{
  id: "enable-emergency",
  type: "ACTION",
  target: "emergency-toggle",
  content: {
    body: "Click the toggle to enable emergency detection.\n\nThis prevents missed emergency calls after hours.",
    voice: "Turn on emergency detection. This prevents missed emergency calls when you're closed."
  },
  action: { type: "toggle", value: true }
}
```

This connects clicks to money saved. Owners remember *why*, not just *how*.

### 4.3 Step Schema (MINIMAL)

```typescript
interface Step {
  id: string;
  type: 'MODAL' | 'SPOTLIGHT' | 'ACTION' | 'CHECKPOINT';
  
  // Targeting (for SPOTLIGHT and ACTION only)
  target?: string;  // data-training attribute value
  
  // Content
  content: {
    title?: string;
    body: string;
    voice?: string;  // TTS script (omit to skip voice)
  };
  
  // Display
  display?: {
    overlay?: number;     // 0-0.8, default 0.6
    position?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  };
  
  // For ACTION type
  action?: {
    type: 'click' | 'toggle' | 'input';
    value?: any;  // Expected value for input/toggle
  };
  
  // Future: Soft intelligence (Phase 2)
  fallback?: {
    afterAttempts: number;  // e.g., 2
    alternateBody?: string; // Simpler explanation
    alternateVoice?: string;
  };
}
```

**Note on `fallback` (PHASE 2 — NOT MVP):**
If a user fails an ACTION step twice (clicks wrong element, doesn't complete), show alternate explanation. This is intentionally deferred — only add if activation data shows stalls.

### 4.4 Visual Attention (2 MODES ONLY)

#### Spotlight (Primary)

```
┌─────────────────────────────────────────────────────────────┐
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│░░░░░░░░░░░░░┌─────────────────────────┐░░░░░░░░░░░░░░░░░░░░░│
│░░░░░░░░░░░░░│  🔘 Enable Emergency    │░░░░░░░░░░░░░░░░░░░░░│
│░░░░░░░░░░░░░│     Detection           │░░░░░░░░░░░░░░░░░░░░░│
│░░░░░░░░░░░░░└─────────────────────────┘░░░░░░░░░░░░░░░░░░░░░│
│░░░░░░░░░░░░░░░░░░░░░░░👆░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│░░░░░░░░░░░░░┌───────────────────────────┐░░░░░░░░░░░░░░░░░░░│
│░░░░░░░░░░░░░│  Click the toggle to      │░░░░░░░░░░░░░░░░░░░│
│░░░░░░░░░░░░░│  enable emergency         │░░░░░░░░░░░░░░░░░░░│
│░░░░░░░░░░░░░│  detection.               │░░░░░░░░░░░░░░░░░░░│
│░░░░░░░░░░░░░│  [🔊] [⏮]    [← Back] [→]│░░░░░░░░░░░░░░░░░░░│
│░░░░░░░░░░░░░└───────────────────────────┘░░░░░░░░░░░░░░░░░░░│
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
└─────────────────────────────────────────────────────────────┘

░ = Dark overlay (60% opacity)
👆 = Bouncing hand pointer
```

#### Modal (No spotlight)

```
┌─────────────────────────────────────────────────────────────┐
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│░░░░░░░░░░░┌─────────────────────────────────┐░░░░░░░░░░░░░░░│
│░░░░░░░░░░░│                                 │░░░░░░░░░░░░░░░│
│░░░░░░░░░░░│  Welcome to AI Voice & SMS      │░░░░░░░░░░░░░░░│
│░░░░░░░░░░░│                                 │░░░░░░░░░░░░░░░│
│░░░░░░░░░░░│  AI Voice answers calls when    │░░░░░░░░░░░░░░░│
│░░░░░░░░░░░│  you can't, captures info, and  │░░░░░░░░░░░░░░░│
│░░░░░░░░░░░│  follows up via SMS.            │░░░░░░░░░░░░░░░│
│░░░░░░░░░░░│                                 │░░░░░░░░░░░░░░░│
│░░░░░░░░░░░│  [🔊] [⏮]         [Let's Go →] │░░░░░░░░░░░░░░░│
│░░░░░░░░░░░└─────────────────────────────────┘░░░░░░░░░░░░░░░│
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
└─────────────────────────────────────────────────────────────┘
```

### 4.5 Pointer (ONE STYLE ONLY)

Single animated hand pointer: 👆

```css
.training-pointer {
  position: absolute;
  font-size: 32px;
  animation: bounce 1s ease-in-out infinite;
  pointer-events: none;
  z-index: 10001;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}
```

**No other pointer styles.** Hand is universally understood.

### 4.6 CSS Implementation (COMPLETE — ~30 LINES)

```css
/* Overlay with spotlight hole */
.training-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 10000;
  transition: opacity 0.3s;
}

.training-overlay.with-spotlight {
  mask: radial-gradient(
    ellipse var(--spotlight-w, 200px) var(--spotlight-h, 100px) 
    at var(--spotlight-x, 50%) var(--spotlight-y, 50%),
    transparent 0%,
    black 100%
  );
  -webkit-mask: radial-gradient(
    ellipse var(--spotlight-w, 200px) var(--spotlight-h, 100px) 
    at var(--spotlight-x, 50%) var(--spotlight-y, 50%),
    transparent 0%,
    black 100%
  );
}

/* Content box */
.training-content {
  position: absolute;
  background: white;
  border-radius: 12px;
  padding: 20px;
  max-width: 360px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.2);
  z-index: 10002;
}

/* Pointer */
.training-pointer {
  position: absolute;
  font-size: 32px;
  animation: bounce 1s ease-in-out infinite;
  pointer-events: none;
  z-index: 10001;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}
```

---

## 5. ELEMENT TARGETING (SIMPLIFIED)

### 5.1 Data Attributes Only

**No CSS selectors.** All trainable elements must have `data-training` attributes.

```tsx
// In your UI components
<Button data-training="emergency-toggle">
  Enable Emergency Detection
</Button>

<div data-training="emergency-section">
  {/* Emergency settings */}
</div>
```

```typescript
// In training step
{
  id: "enable-emergency",
  type: "ACTION",
  target: "emergency-toggle",  // Matches data-training="emergency-toggle"
  // ...
}
```

### 5.2 Target Finder (10 LINES)

```typescript
function findTarget(id: string): HTMLElement | null {
  return document.querySelector(`[data-training="${id}"]`);
}

function getTargetRect(id: string): DOMRect | null {
  const el = findTarget(id);
  return el?.getBoundingClientRect() ?? null;
}

function scrollToTarget(id: string): void {
  findTarget(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
```

### 5.3 Missing Element Handling (CRITICAL)

**If a training step references a target element that is not found:**

1. Log a warning to console
2. Automatically skip the step
3. Advance to the next step
4. **Never block the training flow**

```typescript
function handleMissingTarget(stepId: string, targetId: string): void {
  console.warn(`[Training] Target element not found: "${targetId}" (step: ${stepId})`);
  // Auto-advance to next step
  next();
}
```

**This prevents:**
- Deadlocks when elements don't exist
- Feature-flag mismatches breaking training
- Partial deployments blocking onboarding
- Users getting stuck on removed UI elements

**No fallback selectors.** If element doesn't exist, skip step.

---

## 6. VOICE NARRATION (BROWSER-ONLY)

### 6.1 Implementation

```typescript
class TrainingVoice {
  private synth: SpeechSynthesis | null = null;
  private enabled = true;
  private currentText: string | null = null;
  
  constructor() {
    // Graceful degradation if not supported
    this.synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
  }
  
  speak(text: string): void {
    if (!this.enabled || !text || !this.synth) return;
    
    try {
      this.stop();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1;
      utterance.lang = 'en-US';
      
      // Handle errors silently
      utterance.onerror = (e) => {
        console.warn('[Training] TTS error:', e.error);
        // Continue without voice — never block training
      };
      
      this.currentText = text;
      this.synth.speak(utterance);
    } catch (e) {
      console.warn('[Training] TTS failed:', e);
      // Continue without voice — never block training
    }
  }
  
  stop(): void {
    if (!this.synth) return;
    this.synth.cancel();
  }
  
  replay(): void {
    if (this.currentText) {
      this.speak(this.currentText);
    }
  }
  
  mute(): void {
    this.enabled = false;
    this.stop();
  }
  
  unmute(): void {
    this.enabled = true;
  }
  
  get isMuted(): boolean {
    return !this.enabled;
  }
  
  get isSupported(): boolean {
    return this.synth !== null;
  }
}

export const trainingVoice = new TrainingVoice();
```

### 6.2 Voice Graceful Degradation (CRITICAL)

**Voice narration is optional and non-blocking.**

If browser speech synthesis is unavailable or fails:
- Log a warning
- Continue training silently
- Never retry aggressively
- **Never block progression**

This preserves the "lightweight" principle. Users on unsupported browsers or with autoplay restrictions still complete training.

### 6.3 Voice Controls UI

```
┌──────────────────────────────────┐
│  [🔊]  [⏮ Replay]               │
└──────────────────────────────────┘
```

Two buttons. That's it.

| Button | Action |
|--------|--------|
| 🔊 / 🔇 | Toggle mute (persisted to localStorage) |
| ⏮ Replay | Replay current step's voice |

**If TTS not supported:** Hide voice controls entirely. Don't show broken UI.

### 6.4 Voice Script Guidelines

- Keep under 10 seconds per step
- Front-load key information
- Don't read UI labels verbatim
- Conversational, not robotic

**Good:** "This toggle enables emergency detection. Go ahead and turn it on."

**Bad:** "This is the emergency detection toggle button. Click it to enable the emergency detection feature."

---

## 7. NAVIGATION CONTROLS (SIMPLIFIED)

### 7.1 Control Bar

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Emergency Detection                                        │
│                                                             │
│  This toggle enables AI to detect urgent calls and          │
│  route them to your on-call technician.                     │
│                                                             │
│  Click the toggle to turn it ON.                            │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ [🔊] [⏮]              [← Back]  [Next →]           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Step 3 of 8  ●●●○○○○○                [Exit]               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Controls

| Control | Behavior |
|---------|----------|
| **← Back** | Previous step |
| **Next →** | Next step (or complete action) |
| **Exit** | Exit with progress saved |
| **Progress dots** | Visual indicator (not clickable) |

### 7.3 Jump-To (SIMPLIFIED)

Click progress dots area to open simple module picker:

```
┌─────────────────────────────────────────────────────────────┐
│  Jump to Module                                      [✕]    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ✅ Overview (Complete)                                     │
│  ✅ Availability Settings (Complete)                        │
│  🔵 Emergency Detection ← Current                           │
│  ○  Testing Your Setup                                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Module-level only.** No step-level jumping. Users restart module from beginning.

### 7.4 Exit Behavior

On Exit click:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   Exit Training?                                            │
│                                                             │
│   Your progress is saved. Resume anytime from Help menu.    │
│                                                             │
│   [Continue Training]                   [Exit]              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. PROGRESS SYSTEM (LOCALSTORAGE-FIRST)

### 8.1 Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Training   │────▶│ localStorage│────▶│  Database   │
│   Session   │     │  (instant)  │     │ (on exit)   │
└─────────────┘     └─────────────┘     └─────────────┘
                          │
                          ▼
                    Zero latency
                    Works offline
```

### 8.2 LocalStorage Schema

```typescript
interface TrainingState {
  // Current position
  current: {
    courseId: string;
    moduleId: string;
    stepIndex: number;
  } | null;
  
  // Completed modules
  completedModules: string[];  // ["ai-voice/overview", "ai-voice/availability"]
  
  // Preferences
  preferences: {
    voiceMuted: boolean;
  };
  
  // Timestamp
  updatedAt: number;
}

// Storage key
const STORAGE_KEY = 'trades_captain_training';
```

### 8.3 Progress Manager

```typescript
class TrainingProgress {
  private state: TrainingState;
  
  constructor() {
    this.state = this.load();
  }
  
  private load(): TrainingState {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    return {
      current: null,
      completedModules: [],
      preferences: { voiceMuted: false },
      updatedAt: Date.now()
    };
  }
  
  private save(): void {
    this.state.updatedAt = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
  }
  
  // Position
  setPosition(courseId: string, moduleId: string, stepIndex: number): void {
    this.state.current = { courseId, moduleId, stepIndex };
    this.save();
  }
  
  getPosition() {
    return this.state.current;
  }
  
  // Module completion
  completeModule(courseId: string, moduleId: string): void {
    const key = `${courseId}/${moduleId}`;
    if (!this.state.completedModules.includes(key)) {
      this.state.completedModules.push(key);
      this.save();
      this.syncToServer();  // Sync on module complete
    }
  }
  
  isModuleComplete(courseId: string, moduleId: string): boolean {
    return this.state.completedModules.includes(`${courseId}/${moduleId}`);
  }
  
  // Preferences
  setVoiceMuted(muted: boolean): void {
    this.state.preferences.voiceMuted = muted;
    this.save();
  }
  
  // Server sync (called on module complete and exit)
  async syncToServer(): Promise<void> {
    try {
      await fetch('/api/training/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          completedModules: this.state.completedModules,
          lastPosition: this.state.current 
            ? `${this.state.current.courseId}/${this.state.current.moduleId}/${this.state.current.stepIndex}`
            : null
        })
      });
    } catch (e) {
      // Silently fail - localStorage is source of truth
      console.warn('Failed to sync training progress', e);
    }
  }
}

export const trainingProgress = new TrainingProgress();
```

### 8.4 Resume Logic

```typescript
function shouldPromptResume(): boolean {
  const position = trainingProgress.getPosition();
  if (!position) return false;
  
  // Has incomplete training
  const course = TRAINING_CONTENT[position.courseId];
  const totalModules = course.modules.length;
  const completedCount = course.modules.filter(m => 
    trainingProgress.isModuleComplete(position.courseId, m.id)
  ).length;
  
  return completedCount < totalModules;
}
```

---

## 9. TRIGGERS (SIMPLIFIED — 2 TYPES ONLY)

### 9.1 Trigger Types

| Trigger | When | Action |
|---------|------|--------|
| **First Login** | User's first ever login | Show onboarding prompt |
| **Feature First-Use** | User visits feature page first time | Show feature training prompt |

No scheduled triggers. No complex conditions. No A/B testing.

### 9.2 Implementation

```typescript
// Track first-use in localStorage
const SEEN_KEY = 'trades_captain_training_seen';

function hasSeenTraining(courseId: string): boolean {
  const seen = JSON.parse(localStorage.getItem(SEEN_KEY) || '[]');
  return seen.includes(courseId);
}

function markTrainingSeen(courseId: string): void {
  const seen = JSON.parse(localStorage.getItem(SEEN_KEY) || '[]');
  if (!seen.includes(courseId)) {
    seen.push(courseId);
    localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
  }
}

// Feature-specific trigger
function shouldShowFeatureTraining(courseId: string, featureFlag?: string): boolean {
  // Don't show if already seen
  if (hasSeenTraining(courseId)) return false;
  
  // Don't show if feature disabled
  if (featureFlag && !isFeatureEnabled(featureFlag)) return false;
  
  return true;
}
```

### 9.3 Trigger Prompt

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   New to AI Voice?                                          │
│                                                             │
│   Take a quick 5-minute tour to get set up.                 │
│                                                             │
│   [Start Training]              [Maybe Later]               │
│                                                             │
│                    [Don't show this again]                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Dismissal Options:**

| Option | Behavior | Storage |
|--------|----------|---------|
| **Maybe Later** | Snooze 7 days | localStorage |
| **Don't show this again** | Never show for this course | localStorage + DB sync |

"Don't show this again" respects power users and prevents resentment. Store in `training_dismissals` table with `show_again_after = NULL`.

---

## 10. ANALYTICS (BATCHED, MODULE-LEVEL)

### 10.1 What We Track

| Event | When | Data |
|-------|------|------|
| `module_started` | User begins module | courseId, moduleId |
| `module_completed` | User completes module | courseId, moduleId, durationMs |
| `module_exited` | User exits mid-module | courseId, moduleId, stepIndex |
| `training_completed` | User completes course | courseId, durationMs |

**No per-step tracking.** Module-level tells you enough.

### 10.2 Implementation

```typescript
const analyticsBuffer: TrainingEvent[] = [];

function trackTrainingEvent(event: TrainingEvent): void {
  analyticsBuffer.push({
    ...event,
    timestamp: Date.now()
  });
}

function flushAnalytics(): void {
  if (analyticsBuffer.length === 0) return;
  
  // Use sendBeacon for reliability (works even on page close)
  navigator.sendBeacon(
    '/api/training/analytics',
    JSON.stringify(analyticsBuffer)
  );
  
  analyticsBuffer.length = 0;
}

// Flush on module complete and page unload
window.addEventListener('beforeunload', flushAnalytics);
```

### 10.3 Anonymous User Handling

Training may run before authentication (e.g., first-login onboarding). Analytics must support anonymous sessions.

```typescript
function getTrackingUserId(): string {
  // Try authenticated user first
  const userId = getCurrentUserId();
  if (userId) return userId;
  
  // Fall back to anonymous ID (persisted in localStorage)
  let anonId = localStorage.getItem('tc_anon_id');
  if (!anonId) {
    anonId = `anon_${crypto.randomUUID()}`;
    localStorage.setItem('tc_anon_id', anonId);
  }
  return anonId;
}
```

When user later authenticates, anonymous events can optionally be linked via the `tc_anon_id`.

### 10.4 Analytics API (BATCH INSERT)

```typescript
// POST /api/training/analytics
export async function POST(req: Request) {
  const events = await req.json();
  const userId = getCurrentUserId();
  
  // Single batch insert
  await db.training_analytics.createMany({
    data: events.map(e => ({
      user_id: userId,
      event_type: e.type,
      course_id: e.courseId,
      module_id: e.moduleId,
      duration_ms: e.durationMs,
      metadata: e.metadata,
      created_at: new Date(e.timestamp)
    }))
  });
  
  return Response.json({ ok: true });
}
```

---

## 11. DATA MODEL (3 TABLES ONLY)

```sql
-- 1. User progress (one row per user per portal)
CREATE TABLE user_training (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  portal VARCHAR(20) NOT NULL DEFAULT 'business',
  
  -- Progress
  completed_modules TEXT[] DEFAULT '{}',
  last_position VARCHAR(200),  -- "course/module/step"
  
  -- Preferences (synced from localStorage)
  voice_muted BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, portal)
);

-- 2. Analytics (append-only, batch inserts)
CREATE TABLE training_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  business_id UUID,
  
  event_type VARCHAR(30) NOT NULL,
  course_id VARCHAR(100),
  module_id VARCHAR(100),
  duration_ms INTEGER,
  metadata JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Optional: Feature training dismissals
CREATE TABLE training_dismissals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id VARCHAR(100) NOT NULL,
  dismissed_at TIMESTAMPTZ DEFAULT NOW(),
  show_again_after TIMESTAMPTZ,  -- NULL = never show again
  
  UNIQUE(user_id, course_id)
);

-- Indexes
CREATE INDEX idx_training_user ON user_training(user_id);
CREATE INDEX idx_analytics_created ON training_analytics(created_at);
CREATE INDEX idx_analytics_course ON training_analytics(course_id);
CREATE INDEX idx_dismissals_user ON training_dismissals(user_id);
```

**From 7 tables to 3.** Content is bundled, not stored.

---

## 12. IMPLEMENTATION (COMPLETE)

### 12.1 File Structure

```
lib/training/
├── content.ts           # Bundled training content
├── types.ts             # TypeScript interfaces
├── components/
│   ├── TrainingProvider.tsx    # Context + state
│   ├── TrainingOverlay.tsx     # Main overlay
│   ├── TrainingContent.tsx     # Content box
│   ├── TrainingPointer.tsx     # Hand pointer
│   └── TrainingPrompt.tsx      # Trigger prompts
├── hooks/
│   └── useTraining.ts          # Main hook
├── progress.ts          # localStorage + sync
├── voice.ts             # Browser TTS
├── analytics.ts         # Batched tracking
└── styles.css           # ~30 lines CSS
```

### 12.2 Main Hook

```typescript
// hooks/useTraining.ts
import { useState, useCallback } from 'react';
import { TRAINING_CONTENT } from '../content';
import { trainingProgress } from '../progress';
import { trainingVoice } from '../voice';
import { trackTrainingEvent, flushAnalytics } from '../analytics';

export function useTraining() {
  const [isActive, setIsActive] = useState(false);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [moduleIndex, setModuleIndex] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [startTime, setStartTime] = useState(0);
  
  const course = courseId ? TRAINING_CONTENT[courseId] : null;
  const module = course?.modules[moduleIndex];
  const step = module?.steps[stepIndex];
  
  const start = useCallback((id: string, resumeModule?: number) => {
    setCourseId(id);
    setModuleIndex(resumeModule ?? 0);
    setStepIndex(0);
    setStartTime(Date.now());
    setIsActive(true);
    
    trackTrainingEvent({
      type: 'module_started',
      courseId: id,
      moduleId: TRAINING_CONTENT[id].modules[resumeModule ?? 0].id
    });
  }, []);
  
  const next = useCallback(() => {
    if (!course || !module) return;
    
    if (stepIndex < module.steps.length - 1) {
      // Next step
      setStepIndex(s => s + 1);
      trainingProgress.setPosition(courseId!, module.id, stepIndex + 1);
    } else if (moduleIndex < course.modules.length - 1) {
      // Complete module, start next
      trainingProgress.completeModule(courseId!, module.id);
      trackTrainingEvent({
        type: 'module_completed',
        courseId: courseId!,
        moduleId: module.id,
        durationMs: Date.now() - startTime
      });
      
      setModuleIndex(m => m + 1);
      setStepIndex(0);
      setStartTime(Date.now());
    } else {
      // Course complete
      trainingProgress.completeModule(courseId!, module.id);
      trackTrainingEvent({
        type: 'training_completed',
        courseId: courseId!,
        durationMs: Date.now() - startTime
      });
      flushAnalytics();
      exit();
    }
  }, [course, module, stepIndex, moduleIndex, courseId, startTime]);
  
  const back = useCallback(() => {
    if (stepIndex > 0) {
      setStepIndex(s => s - 1);
    } else if (moduleIndex > 0) {
      const prevModule = course!.modules[moduleIndex - 1];
      setModuleIndex(m => m - 1);
      setStepIndex(prevModule.steps.length - 1);
    }
  }, [stepIndex, moduleIndex, course]);
  
  const jumpToModule = useCallback((index: number) => {
    setModuleIndex(index);
    setStepIndex(0);
    setStartTime(Date.now());
  }, []);
  
  const exit = useCallback(() => {
    if (module) {
      trackTrainingEvent({
        type: 'module_exited',
        courseId: courseId!,
        moduleId: module.id,
        metadata: { stepIndex }
      });
    }
    flushAnalytics();
    trainingProgress.syncToServer();
    
    setIsActive(false);
    setCourseId(null);
    setModuleIndex(0);
    setStepIndex(0);
  }, [courseId, module, stepIndex]);
  
  return {
    isActive,
    course,
    module,
    step,
    stepIndex,
    moduleIndex,
    totalSteps: module?.steps.length ?? 0,
    totalModules: course?.modules.length ?? 0,
    start,
    next,
    back,
    jumpToModule,
    exit,
    voice: trainingVoice,
    progress: trainingProgress
  };
}
```

### 12.3 Provider & Overlay

```tsx
// components/TrainingProvider.tsx
import { createContext, useContext, ReactNode } from 'react';
import { useTraining } from '../hooks/useTraining';

const TrainingContext = createContext<ReturnType<typeof useTraining> | null>(null);

export function TrainingProvider({ children }: { children: ReactNode }) {
  const training = useTraining();
  
  return (
    <TrainingContext.Provider value={training}>
      {children}
    </TrainingContext.Provider>
  );
}

export function useTrainingContext() {
  const ctx = useContext(TrainingContext);
  if (!ctx) throw new Error('useTrainingContext must be within TrainingProvider');
  return ctx;
}
```

```tsx
// components/TrainingOverlay.tsx
import { useEffect, useState, useRef } from 'react';
import { useTrainingContext } from './TrainingProvider';
import { TrainingContent } from './TrainingContent';
import { TrainingPointer } from './TrainingPointer';

export function TrainingOverlay() {
  const { isActive, step, next, back, exit } = useTrainingContext();
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Find and track target element (with resize/scroll handling)
  useEffect(() => {
    if (!isActive || !step?.target) {
      setTargetRect(null);
      return;
    }
    
    const updateTarget = () => {
      const el = document.querySelector(`[data-training="${step.target}"]`);
      if (el) {
        setTargetRect(el.getBoundingClientRect());
      }
    };
    
    const el = document.querySelector(`[data-training="${step.target}"]`);
    
    // CRITICAL: Handle missing element
    if (!el) {
      console.warn(`[Training] Target not found: "${step.target}" (step: ${step.id})`);
      // Auto-skip to next step after short delay
      const timeout = setTimeout(() => next(), 100);
      return () => clearTimeout(timeout);
    }
    
    // Scroll into view and update position
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(updateTarget, 300);
    
    // Keep spotlight position updated on resize/scroll
    window.addEventListener('resize', updateTarget);
    window.addEventListener('scroll', updateTarget, true);
    
    return () => {
      window.removeEventListener('resize', updateTarget);
      window.removeEventListener('scroll', updateTarget, true);
    };
  }, [isActive, step, next]);
  
  // Focus management
  useEffect(() => {
    if (!isActive) return;
    
    const previousFocus = document.activeElement as HTMLElement;
    contentRef.current?.focus();
    
    return () => {
      previousFocus?.focus();
    };
  }, [isActive]);
  
  // Keyboard navigation
  useEffect(() => {
    if (!isActive) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          exit();
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          next();
          break;
        case 'ArrowLeft':
        case 'Backspace':
          e.preventDefault();
          back();
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, next, back, exit]);
  
  if (!isActive || !step) return null;
  
  const showSpotlight = step.type === 'SPOTLIGHT' || step.type === 'ACTION';
  const showPointer = showSpotlight && targetRect;
  
  return (
    <>
      {/* Overlay */}
      <div 
        className={`training-overlay ${showSpotlight ? 'with-spotlight' : ''}`}
        style={targetRect ? {
          '--spotlight-x': `${targetRect.left + targetRect.width / 2}px`,
          '--spotlight-y': `${targetRect.top + targetRect.height / 2}px`,
          '--spotlight-w': `${targetRect.width + 40}px`,
          '--spotlight-h': `${targetRect.height + 40}px`,
        } as React.CSSProperties : undefined}
        aria-hidden="true"
      />
      
      {/* Pointer */}
      {showPointer && (
        <TrainingPointer
          x={targetRect.left + targetRect.width / 2}
          y={targetRect.bottom + 10}
        />
      )}
      
      {/* Content */}
      <TrainingContent 
        ref={contentRef}
        targetRect={targetRect} 
      />
    </>
  );
}
```

---

## 13. CONTEXTUAL HELP (SIMPLIFIED)

### 13.1 Help Menu Integration

Add "Training" section to Help menu:

```
┌─────────────────────────────────────────────────────────────┐
│  Help                                                [✕]    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📚 Training                                                │
│  ├── AI Voice & SMS Setup (15 min)                         │
│  ├── Managing Leads (10 min)                               │
│  └── Proof of Work™ (8 min)                                │
│                                                             │
│  📖 Documentation                                           │
│  💬 Contact Support                                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 13.2 Page-Level Training Button (Optional)

On feature pages, show contextual training button:

```tsx
function FeatureTrainingButton({ courseId }: { courseId: string }) {
  const { start } = useTrainingContext();
  const course = TRAINING_CONTENT[courseId];
  
  if (!course) return null;
  
  return (
    <button 
      onClick={() => start(courseId)}
      className="text-sm text-blue-600 hover:underline"
    >
      📚 Learn how this works
    </button>
  );
}
```

### 13.3 Empty State → Training Integration (v1.5)

Empty states are natural discovery points. When a user sees "No jobs yet," they're already asking "what do I do?" Bridge directly to training.

#### Empty State Component Pattern

```tsx
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  courseId?: string;           // Links to training
  primaryAction?: {
    label: string;
    onClick: () => void;
  };
}

function EmptyState({ icon, title, description, courseId, primaryAction }: EmptyStateProps) {
  const { start } = useTrainingContext();
  const course = courseId ? TRAINING_CONTENT[courseId] : null;
  
  return (
    <div className="empty-state">
      {icon && <div className="empty-state-icon">{icon}</div>}
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-description">{description}</p>
      
      <div className="empty-state-actions">
        {course && (
          <button 
            onClick={() => start(courseId!)}
            className="empty-state-learn"
          >
            📚 Learn how
          </button>
        )}
        {primaryAction && (
          <button 
            onClick={primaryAction.onClick}
            className="empty-state-primary"
          >
            {primaryAction.label}
          </button>
        )}
      </div>
    </div>
  );
}
```

#### Empty State → Course Mapping

| Empty State Location | Course ID | Learn Button Text |
|---------------------|-----------|-------------------|
| Jobs list (no jobs) | `jobs-basics` | 📚 Learn how to create jobs |
| Leads inbox (no leads) | `leads-management` | 📚 Learn how leads work |
| Customers list (empty) | `customers-basics` | 📚 Learn how to add customers |
| Schedule (empty) | `scheduling` | 📚 Learn scheduling |
| AI Voice settings (not configured) | `ai-voice-sms` | 📚 Set up AI Voice |
| Proof of Work (no completed jobs) | `proof-of-work` | 📚 Learn about Proof of Work™ |

#### Example Usage

```tsx
// pages/jobs/index.tsx

function JobsPage() {
  const { jobs, isLoading } = useJobs();
  
  if (isLoading) return <Skeleton />;
  
  if (jobs.length === 0) {
    return (
      <EmptyState
        icon={<BriefcaseIcon />}
        title="No jobs yet"
        description="Jobs you create will appear here. Track work from estimate to completion."
        courseId="jobs-basics"
        primaryAction={{
          label: "+ Create Job",
          onClick: () => openCreateJobModal()
        }}
      />
    );
  }
  
  return <JobsList jobs={jobs} />;
}
```

#### Visual Layout

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                         📋                                  │
│                                                             │
│                    No jobs yet                              │
│                                                             │
│     Jobs you create will appear here. Track work from       │
│              estimate to completion.                        │
│                                                             │
│       [📚 Learn how]              [+ Create Job]            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Design Guidelines

| Element | Specification |
|---------|---------------|
| Icon | 48px, muted color (gray-400) |
| Title | 18px semibold, gray-900 |
| Description | 14px regular, gray-600, max 2 lines |
| Learn button | Secondary style, left position |
| Primary action | Primary style, right position |
| Container | Centered, max-width 400px, padding 48px |

#### Why This Matters

Empty states with training links:

1. **Reduce support tickets** — Users find help before asking
2. **Increase feature adoption** — Natural discovery path
3. **Improve time-to-value** — Learning happens at moment of need
4. **Feel helpful, not pushy** — User chooses to learn

**Critical:** The "Learn how" button is always secondary to the primary action. Don't make users feel they *must* take training before using features.

---

## 14. ADDING NEW TRAINING

### 14.1 Checklist

When adding training for a new feature:

1. **Add `data-training` attributes** to key UI elements
2. **Add course to `content.ts`** with modules and steps
3. **Deploy** (content ships with code)

That's it. No database changes. No admin UI. No CMS.

### 14.2 Example: Adding Proof of Work™ Training

```typescript
// In lib/training/content.ts

"proof-of-work": {
  id: "proof-of-work",
  title: "Proof of Work™",
  description: "Build trust with verified job records",
  icon: "badge-check",
  estimatedMinutes: 8,
  roles: ["owner", "admin", "technician"],
  featureFlag: "proof_of_work_enabled",
  modules: [
    {
      id: "overview",
      title: "What is Proof of Work™?",
      steps: [
        {
          id: "intro",
          type: "MODAL",
          content: {
            title: "Build Trust With Every Job",
            body: "Proof of Work™ creates a verified record of every completed job — who did it, when, and what was done.",
            voice: "Proof of Work creates a verified record of every completed job. Let me show you how it works."
          },
          display: { overlay: 0.7 }
        },
        {
          id: "show-example",
          type: "SPOTLIGHT",
          target: "pow-preview",
          content: {
            body: "This is what your customers see — a professional, verified record they can share.",
            voice: "This is what your customers see. A professional, verified record they can share with anyone."
          }
        }
      ]
    },
    {
      id: "sharing",
      title: "Sharing With Customers",
      steps: [
        {
          id: "auto-send",
          type: "SPOTLIGHT",
          target: "pow-auto-send-toggle",
          content: {
            title: "Automatic Delivery",
            body: "When enabled, customers automatically receive their Proof of Work™ via SMS after job completion.",
            voice: "When this is on, customers automatically get their Proof of Work by text after you complete a job."
          }
        },
        {
          id: "complete",
          type: "CHECKPOINT",
          content: {
            title: "🎉 You're All Set!",
            body: "Proof of Work™ will now create verified records for your completed jobs.",
            voice: "You're all set. Proof of Work will now create verified records for every completed job."
          }
        }
      ]
    }
  ]
}
```

---

## 15. PERFORMANCE BUDGET

| Metric | Target | Achieved By |
|--------|--------|-------------|
| JS bundle size | <15KB gzipped | Minimal dependencies |
| CSS size | <2KB | 30 lines of CSS |
| Time to first step | <100ms | No API calls |
| Memory usage | <5MB | No video, minimal state |
| DB writes per session | ≤2 | localStorage-first |
| API calls per session | ≤3 | Batch analytics |

### 15.1 Mobile & Viewport Handling

The Guided Training System MUST function on mobile web.

**Requirements:**
- Minimum touch target size: **44px** (all buttons, controls)
- Training modals must be scroll-safe (content scrollable if exceeds viewport)
- Spotlight overlays must not exceed viewport bounds
- If target element is off-screen, auto-scroll it into view before highlighting
- Content box positioning must respect viewport edges (never clip off-screen)

**Viewport-Safe Positioning:**
```typescript
function getContentPosition(targetRect: DOMRect | null, contentWidth: number, contentHeight: number) {
  const padding = 16;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  let x = targetRect 
    ? targetRect.left + targetRect.width / 2 - contentWidth / 2
    : viewportWidth / 2 - contentWidth / 2;
  let y = targetRect 
    ? targetRect.bottom + 20
    : viewportHeight / 2 - contentHeight / 2;
  
  // Clamp to viewport
  x = Math.max(padding, Math.min(x, viewportWidth - contentWidth - padding));
  y = Math.max(padding, Math.min(y, viewportHeight - contentHeight - padding));
  
  // If content would overlap target, position above instead
  if (targetRect && y < targetRect.bottom + 10 && y + contentHeight > targetRect.top - 10) {
    y = targetRect.top - contentHeight - 20;
    y = Math.max(padding, y);
  }
  
  return { x, y };
}
```

**Native mobile apps are out of scope for v1.x.**

### 15.2 Accessibility & Keyboard Support

The training system MUST support keyboard navigation and screen readers.

**Required Keyboard Behaviors:**

| Key | Action |
|-----|--------|
| `Tab` | Navigate between training controls |
| `Enter` / `Space` | Advance to next step |
| `Escape` | Exit training immediately |
| `←` / `Backspace` | Go to previous step |

**Focus Management:**
- Focus is trapped within the training overlay when active
- Focus moves to content box when step changes
- Focus is restored to previously focused element on exit

**Implementation:**
```typescript
// Focus trap
useEffect(() => {
  if (!isActive) return;
  
  const previousFocus = document.activeElement as HTMLElement;
  contentRef.current?.focus();
  
  return () => {
    previousFocus?.focus();
  };
}, [isActive]);

// Keyboard handler
useEffect(() => {
  if (!isActive) return;
  
  const handleKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'Escape':
        exit();
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        next();
        break;
      case 'ArrowLeft':
      case 'Backspace':
        e.preventDefault();
        back();
        break;
    }
  };
  
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [isActive, next, back, exit]);
```

**CSS Focus Styles:**
```css
.training-content:focus-visible {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

.training-button:focus-visible {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}
```

**Screen Reader Considerations:**
- Content box should have `role="dialog"` and `aria-modal="true"`
- Step title should be announced via `aria-live="polite"`
- Progress should be conveyed via `aria-label` (e.g., "Step 3 of 8")

---

## 16. STOP CONDITIONS

STOP implementation if:

* Training blocks app functionality
* Training cannot be exited
* External APIs added (TTS, content fetch)
* Per-step database writes occur
* Per-step analytics tracked
* Bundle size exceeds 20KB
* Training significantly impacts render performance

---

## 17. TRAINING COMPLETION AS SALES ASSET (STRATEGIC)

Training completion data is commercially valuable. Track and leverage it.

### 17.1 Internal Metrics to Capture

| Metric | Use |
|--------|-----|
| % completing AI Voice training | Correlate with feature activation |
| % completing Proof of Work™ training | Correlate with PoW usage |
| Time from signup to training complete | Measure onboarding velocity |
| Training → feature usage gap | Identify friction points |

### 17.2 Future Sales Leverage

Once you have data:

> "80% of businesses who complete AI Voice training recover missed revenue in the first month."

> "Contractors who complete Proof of Work™ training see 2x more referral shares."

This is not a code change — it's awareness. Capture the data now, use it later for:

- Sales collateral
- Case studies
- Retention arguments
- Upsell justification

### 17.3 Completion Badges (Optional Future)

Consider showing completion badges in account settings:

```
Training Completed:
✅ AI Voice & SMS Setup
✅ Leads Management
○  Proof of Work™
○  Scheduling
```

This creates:
- Subtle gamification
- Progress visibility
- Implicit encouragement to complete

---

## 18. SUCCESS METRICS

| Metric | Target |
|--------|--------|
| Onboarding completion | >70% |
| Feature training completion | >50% |
| Support tickets (how-to) | -40% |
| Time to first feature use | -30% |

---

## 19. SYSTEM DEFINITION (FINAL)

> The Guided Training System is a lightweight, in-product education platform that teaches users through interactive walkthroughs of live UI. It uses bundled content (zero fetch), browser TTS (zero API), localStorage-first progress (minimal DB writes), and batched module-level analytics. The system is optimized for instant response, minimal footprint, and zero external dependencies.

---

## CHANGELOG

### v1.5 (Current) — EMPTY STATE INTEGRATION

* **Added:** Section 13.3 — Empty State → Training Integration
* **Added:** EmptyState component pattern with optional `courseId` prop
* **Added:** Empty state → course mapping table
* **Added:** Design guidelines for empty state training links

### v1.4 — IMPLEMENTATION HARDENING

* **Added:** Section 15.1 — Mobile & Viewport Handling (touch targets, viewport-safe positioning)
* **Added:** Section 15.2 — Accessibility & Keyboard Support (Tab, Enter, Escape, focus trap)
* **Added:** Section 5.3 — Missing Element Handling (auto-skip rule, never block)
* **Added:** Section 6.2 — Voice Graceful Degradation (silent failure, never block)
* **Added:** Section 10.3 — Anonymous User Handling (pre-auth analytics)
* **Updated:** TrainingOverlay with resize/scroll listeners (spotlight stays accurate)
* **Updated:** TrainingOverlay with keyboard navigation and focus management
* **Updated:** TrainingVoice with error handling and browser support check
* **Flagged:** Course prerequisites as FUTURE in type definitions

### v1.3 — LIGHTWEIGHT EDITION + REFINEMENTS

* **Added:** "Why this matters" guidance for ACTION steps (business impact line)
* **Added:** `fallback` field in step schema for Phase 2 soft intelligence
* **Added:** "Don't show this again" option on trigger prompts
* **Added:** Section 17: Training Completion as Sales Asset (strategic leverage)
* **Added:** Completion badges concept for future gamification

### v1.2 — LIGHTWEIGHT EDITION

* **Content:** Replaced CMS/YAML with bundled JSON (zero API calls)
* **Progress:** localStorage-first with periodic DB sync (1 table)
* **Analytics:** Batched, module-level only (reduced 90%)
* **Voice:** Browser TTS only, removed cloud options
* **Visual:** 2 highlight types (spotlight/modal), 1 pointer (hand)
* **Steps:** 4 types only (MODAL, SPOTLIGHT, ACTION, CHECKPOINT)
* **Triggers:** 2 types only (first login, feature first-use)
* **Database:** 7 tables → 3 tables
* **Removed:** A/B testing, branching logic, admin content editor, per-step tracking

### v1.1

* Added visual attention system
* Added pointer animations
* Added step type defaults

### v1.0

* Initial specification

---

### 🔐 END OF MASTER BUILD PROMPT

**Version:** v1.5 — EMPTY STATE INTEGRATION  
**Status:** LOCKED

---

---

# APPENDIX A: COMPLETE TRAINING CONTENT EXAMPLE

```typescript
// lib/training/content.ts

import { Course } from './types';

export const TRAINING_CONTENT: Record<string, Course> = {
  
  "ai-voice-sms": {
    id: "ai-voice-sms",
    title: "AI Voice & SMS Setup",
    description: "Configure automatic call handling and SMS follow-ups",
    icon: "phone",
    estimatedMinutes: 15,
    roles: ["owner", "admin"],
    featureFlag: "ai_voice_enabled",
    modules: [
      {
        id: "overview",
        title: "Overview",
        steps: [
          {
            id: "welcome",
            type: "MODAL",
            content: {
              title: "Welcome to AI Voice & SMS",
              body: "AI Voice answers calls when you can't, captures important information, and follows up via SMS.\n\nIn this training, you'll learn to:\n• Set when AI answers calls\n• Configure emergency detection\n• Test your setup",
              voice: "Welcome to AI Voice and SMS training. This feature answers calls when you can't, captures important information, and follows up via text. Let's get you set up."
            },
            display: { overlay: 0.7 }
          }
        ]
      },
      {
        id: "availability",
        title: "Availability Settings",
        steps: [
          {
            id: "explain",
            type: "SPOTLIGHT",
            target: "availability-section",
            content: {
              title: "When Should AI Answer?",
              body: "These settings control when AI picks up calls. Most businesses use AI only outside business hours.",
              voice: "This section controls when AI answers your calls. Most businesses have AI answer only when they're closed."
            },
            display: { position: "right" }
          },
          {
            id: "set-hours",
            type: "ACTION",
            target: "business-hours-input",
            content: {
              body: "Set your typical business hours. AI will answer outside these times.",
              voice: "Go ahead and enter your business hours."
            },
            action: { type: "input" }
          },
          {
            id: "complete",
            type: "CHECKPOINT",
            content: {
              title: "✓ Availability Set",
              body: "Great! AI will now answer calls outside your business hours."
            }
          }
        ]
      },
      {
        id: "emergency",
        title: "Emergency Detection",
        steps: [
          {
            id: "explain",
            type: "SPOTLIGHT",
            target: "emergency-toggle",
            content: {
              title: "Emergency Detection",
              body: "When enabled, AI can identify urgent calls and immediately alert your on-call technician.",
              voice: "Emergency detection lets AI identify urgent situations and get the right person notified immediately."
            }
          },
          {
            id: "enable",
            type: "ACTION",
            target: "emergency-toggle",
            content: {
              body: "Click the toggle to enable emergency detection.",
              voice: "Go ahead and turn on emergency detection."
            },
            action: { type: "toggle", value: true }
          },
          {
            id: "phrases",
            type: "SPOTLIGHT",
            target: "trigger-phrases",
            content: {
              title: "Trigger Phrases",
              body: "These words automatically flag calls as emergencies. You can customize them for your trade.",
              voice: "These trigger phrases tell AI when something is urgent. You can customize them for your business."
            }
          },
          {
            id: "complete",
            type: "CHECKPOINT",
            content: {
              title: "✓ Emergency Detection Ready",
              body: "AI will now identify and escalate urgent calls."
            }
          }
        ]
      },
      {
        id: "testing",
        title: "Test Your Setup",
        steps: [
          {
            id: "explain",
            type: "SPOTLIGHT",
            target: "simulate-button",
            content: {
              title: "Test Without Real Calls",
              body: "The simulator lets you test your configuration without making actual calls.",
              voice: "Before going live, let's test your setup. This won't make any real calls."
            }
          },
          {
            id: "run",
            type: "ACTION",
            target: "simulate-emergency",
            content: {
              body: "Click to simulate an emergency call.",
              voice: "Click the simulate button to test an emergency call."
            },
            action: { type: "click" }
          },
          {
            id: "complete",
            type: "CHECKPOINT",
            content: {
              title: "🎉 AI Voice Setup Complete!",
              body: "You've configured availability, emergency detection, and tested your setup. Your AI Voice system is ready to go!",
              voice: "Congratulations! Your AI Voice system is set up and ready to handle calls."
            }
          }
        ]
      }
    ]
  },
  
  "leads-management": {
    id: "leads-management",
    title: "Managing Leads",
    description: "Track and convert incoming leads",
    icon: "users",
    estimatedMinutes: 10,
    roles: ["owner", "admin", "office_manager"],
    modules: [
      {
        id: "inbox",
        title: "Your Leads Inbox",
        steps: [
          {
            id: "welcome",
            type: "MODAL",
            content: {
              title: "Your Leads Inbox",
              body: "Every call, text, and form submission lands here. Let's learn how to work through your leads efficiently.",
              voice: "Every lead lands in your inbox. Let me show you how to work through them efficiently."
            },
            display: { overlay: 0.7 }
          },
          {
            id: "list",
            type: "SPOTLIGHT",
            target: "leads-list",
            content: {
              body: "New leads appear here. The most recent are at the top.",
              voice: "New leads appear in this list, with the most recent at the top."
            }
          },
          {
            id: "status",
            type: "SPOTLIGHT",
            target: "lead-status-badge",
            content: {
              title: "Lead Status",
              body: "Each lead shows its status: New, Contacted, Qualified, or Won.",
              voice: "Each lead shows its current status so you know where it stands."
            }
          },
          {
            id: "complete",
            type: "CHECKPOINT",
            content: {
              title: "✓ Inbox Overview Complete",
              body: "You now know how to navigate your leads inbox."
            }
          }
        ]
      }
    ]
  }
  
};
```

---

# APPENDIX B: TYPESCRIPT TYPES

```typescript
// lib/training/types.ts

export interface Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  estimatedMinutes: number;
  roles: string[];
  featureFlag?: string;
  modules: Module[];
  
  // FUTURE: Course prerequisites (NOT IMPLEMENTED in v1.x)
  // prerequisites?: string[];  // Course IDs that must be completed first
}

export interface Module {
  id: string;
  title: string;
  steps: Step[];
}

export interface Step {
  id: string;
  type: 'MODAL' | 'SPOTLIGHT' | 'ACTION' | 'CHECKPOINT';
  target?: string;
  content: {
    title?: string;
    body: string;
    voice?: string;
  };
  display?: {
    overlay?: number;
    position?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  };
  action?: {
    type: 'click' | 'toggle' | 'input';
    value?: any;
  };
  // Phase 2: Soft intelligence
  fallback?: {
    afterAttempts: number;
    alternateBody?: string;
    alternateVoice?: string;
  };
}

export interface TrainingState {
  current: {
    courseId: string;
    moduleId: string;
    stepIndex: number;
  } | null;
  completedModules: string[];
  preferences: {
    voiceMuted: boolean;
  };
  updatedAt: number;
}

export interface TrainingEvent {
  type: 'module_started' | 'module_completed' | 'module_exited' | 'training_completed';
  courseId: string;
  moduleId?: string;
  durationMs?: number;
  metadata?: Record<string, any>;
  timestamp?: number;
}
```

---

### 🔐 END OF DOCUMENT

**Version:** v1.5 — EMPTY STATE INTEGRATION  
**Status:** LOCKED

---

## DOCUMENT STRUCTURE SUMMARY

| Section | Content |
|---------|---------|
| **Sections 0-19** | Core lightweight specification |
| **Section 3** | Bundled JSON content (no API) |
| **Section 4** | Simplified step system (4 types) + "Why this matters" guidance |
| **Section 5** | Data-attribute targeting + missing element auto-skip |
| **Section 6** | Browser-only TTS + graceful degradation |
| **Section 7** | Simplified navigation |
| **Section 8** | localStorage-first progress |
| **Section 9** | 2 trigger types + skip forever option |
| **Section 10** | Batched module-level analytics + anonymous handling |
| **Section 11** | 3-table database schema |
| **Section 12** | Complete implementation code (with accessibility) |
| **Section 13.3** | Empty state → training integration |
| **Section 15.1** | Mobile & viewport handling |
| **Section 15.2** | Accessibility & keyboard support |
| **Section 17** | Training as sales asset (strategic) |
| **Appendix A** | Full content example |
| **Appendix B** | TypeScript types |

---

## COMPARISON: v1.4 vs v1.5

| Aspect | v1.4 | v1.5 |
|--------|------|------|
| Empty state integration | Not specified | EmptyState component + course mapping |
| Discovery paths | Triggers + Help menu | + Empty states as entry points |
| Component library | Core training only | + Reusable EmptyState pattern |