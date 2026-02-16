UI POLISH PASS v2.2 — FINAL (STRICT)
Product: Trades Captain
Applies To: Mobile-first web app (Technician + Dashboard)
Status: FINAL — STRICT EXECUTION REQUIRED
Scope: UI/UX polish only

Explicitly Not Allowed: New features, new tables, new backend logic, new gestures, decorative animation, brand flair, guessing or "helpful" data correction.

Philosophy: Calm, predictable, physically reassuring, intentionally restrained. If a user notices the polish — it's too much. If they feel it without noticing — it's correct.

TIER 1 — INSTANT FEEL IMPROVEMENTS
1.1 Skeleton Loaders (Mandatory Everywhere)
Rule: No blank screens. Ever.

app/(dashboard)/my-day/page.tsx — Replace the basic TechModeSkeleton with a proper skeleton composing existing primitives from components/ui/skeleton-loaders.tsx (TodaysJobsListSkeleton, QuickActionBarSkeleton, PageHeaderSkeleton)
components/technician/customer-history.tsx — Add skeleton during loading state (currently returns null)
Any technician screen with async load — audit and replace return null with matching skeleton
1.2 Replace window.confirm() with AlertDialog
Rule: Browser UI must never appear.

app/(dashboard)/my-day/page.tsx — Replace window.confirm() in handleMakeCurrent with state-driven AlertDialog from existing components/ui/alert-dialog.tsx
Add state: confirmSwitchJob (TechJob | null), render AlertDialog with confirm/cancel
1.3 Entrance Animations (Meaningful Only)
Allowed: animate-fade-in, animate-slide-up (existing in tailwind.config.ts)
Rules: One entrance animation per surface. No looping. No bounce. No stagger beyond subtle list entry.

components/technician/active-job-card.tsx — Add animate-slide-up to root div
components/technician/job-queue-list.tsx — Subtle staggered animate-slide-up on list items (inline style={{ animationDelay }}, max 50ms * index)
components/technician/tech-mode-header.tsx — Add animate-fade-in
app/globals.css — Add stagger utility: .stagger-item { animation-fill-mode: both; } Do Not: Animate every element. Animate repeatedly on re-render.
1.4 Haptic Feedback (High-Confidence Actions Only)
Vibrate (10ms) for: Primary job state transitions, checklist completion, confirmed actions.

components/technician/active-job-card.tsx — Add navigator.vibrate?.(10) to I'M ON MY WAY, START JOB, COMPLETE JOB onClick handlers
components/technician/job-checklist.tsx — Add vibrate on toggle Do Not: Vibrate on errors, navigation, or passive taps.
1.5 Status Color Transitions
Rule: State changes must feel earned, not abrupt.

components/technician/active-job-card.tsx — Add transition-all duration-300 ease-out to root card div, header gradient div, and status Badge
TIER 2 — WORKFLOW & CONTEXT POLISH
2.1 Workflow Progress Stepper
Purpose: Answer "Where am I?" instantly.

New: components/technician/workflow-stepper.tsx (~50 lines) — Horizontal, thin, non-interactive dots/line. Shows steps: Enroute → On Site → Working → Notes → Done. Color fill only, no animation beyond subtle transition. No labels unless space allows.
components/technician/active-job-card.tsx — Render above header when job is active (not completed/cancelled)
2.2 Completion Confirmation (NOT Celebration)
Rule: Simple acknowledgement, no confetti, no particles, no playful animation.

app/(dashboard)/my-day/page.tsx — When all jobs complete, show a simple card: "All jobs complete" with summary count/value. Allowed: subtle animate-scale-in or animate-fade-in. No PartyPopper icon — use CheckCircle2 or similar neutral icon.
2.3 Arrival Prompt Enhancement
app/(dashboard)/my-day/page.tsx — When showArrivalPrompt becomes true, call navigator.vibrate?.([200, 100, 200]) (double pulse). Add animate-slide-down to the arrival banner. Banner must be dismissible. Do Not: Add sound. Add flashing indicators.
2.4 Smooth Expand / Collapse
app/globals.css — Add grid-based height animation:

.expandable { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 200ms ease-out; }
.expandable.open { grid-template-rows: 1fr; }
.expandable > * { overflow: hidden; }
components/technician/active-job-card.tsx — Replace {showDetails && (...)} with expandable wrapper
components/technician/job-checklist.tsx — Same for expanded state
components/technician/customer-history.tsx — Same Rule: Content readable during transition. No opacity fade during expansion.
2.5 Contextual Return Link (NEW)
Problem: Users lose place when navigating between job sub-views.

Inline text row at top of sub-pages: ← Back to [context]
Appears only when user navigated away from checklist/job context
Text-only (no pill, no floating). No animation beyond opacity fade. No blur, no shadow.
Sticky within scroll container only.
TIER 3 — FORM & INPUT POLISH
3.1 Input Focus Feedback
app/globals.css — Add:

input:focus, select:focus, textarea:focus {
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
  transition: box-shadow 150ms ease-out, border-color 150ms ease-out;
}
No scale.
3.2 Button Press States
components/ui/button.tsx — Add active:scale-[0.97] transition-transform duration-100 to base variant classes
Exclude: ghost buttons, text links
3.3 Inline Form Entrance
components/technician/inline-invoice-form.tsx — Add animate-slide-up on mount only. No exit animation.
3.4 Voice Recorder Feedback
components/technician/voice-note-recorder.tsx — Simple amplitude bars (max 5) using AnalyserNode from Web Audio API. Fallback to animate-pulse-subtle at staggered delays if AudioContext unavailable. No waveform history.
TIER 4 — DASHBOARD & DESKTOP POLISH
4.1 Desktop Hover Elevation
Dashboard stat cards — Add lg:hover:-translate-y-0.5 lg:transition-all lg:duration-200. Desktop only. No shadow stacking.
4.2 Table Row Hover
components/ui/data-table.tsx or equivalent — Add hover:bg-muted/50 to <tr> elements. No border changes.
4.3 Page Transition
app/(dashboard)/layout.tsx — Add animate-fade-in to <main> content wrapper. No crossfade. No slide transitions between routes.
4.4 Empty State Consistency
Audit: jobs, invoices, quotes, customers, messages pages — verify each uses components/ui/empty-state.tsx. Replace any raw text-only empty pages.
TIER 5 — ACCESSIBILITY & SYSTEM REFINEMENT
5.1 Dark Mode Border Clarity
app/globals.css — .dark .card { border-color: hsl(var(--border-strong)); }. No shadows in dark mode (already handled by existing CSS).
5.2 Focus Visible Ring
app/globals.css — :focus-visible { outline: 2px solid hsl(var(--ring)); outline-offset: 2px; }
5.3 Reduced Motion Compliance (Mandatory)
app/globals.css —

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
5.4 Background Dimming for Focused Overlays
Applies to: AlertDialog, Bottom Sheet

Verify existing AlertDialog and BottomSheet use bg-black/20 overlay. Add backdrop-blur-sm only if opacity alone is insufficient.
Disable blur under prefers-reduced-motion. Explicitly Forbidden: Blur on inline expansions, standard navigation, or for aesthetic reasons.
TIER 5.5 — MOBILE SCROLL VISUAL SUPPRESSION (FINAL AMENDMENT)
Status: MANDATORY
Applies To: Mobile viewports only (max-width: 768px)
Type: Visual polish / OS-feel correction
Scope: CSS + minimal overflow enforcement
Risk: Low
Feature Impact: None

Purpose: Eliminate all visible scroll indicators on mobile to remove the "web page inside a web page" effect.

Global Scrollbar Suppression (Mobile Only)
app/globals.css — Add:

@media (max-width: 768px) {
  * { scrollbar-width: none; }           /* Firefox */
  * { -ms-overflow-style: none; }        /* IE / Edge Legacy */
  *::-webkit-scrollbar { display: none; } /* WebKit (Chrome, Safari, iOS) */
}
Applies to all scrollable surfaces: <main>, sidebars, navigation dropdowns, bottom sheets, dialogs, nested lists/panels.
Non-Negotiable Rules
Zero visible scrollbars on mobile (no vertical, horizontal, overlay, or mini-scrollbar)
Scrolling must still work: touch scroll, momentum/inertia, native browser behavior only
No JavaScript scroll interception
Desktop behavior unchanged (scrollbars remain visible)
Scroll Ownership
One scroll owner per screen: either the page scrolls or a foreground surface scrolls — never both
When a Sheet, modal, or nav dropdown is open: background content must be overflow: hidden, only the foreground surface may scroll (silently)
Mobile Navigation & Dropdowns
Navigation dropdowns may scroll with zero visible scroll indicators
When a dropdown is open: background content overflow: hidden, only the dropdown scrolls
Dropdowns rely on global suppression — no special-case CSS that reintroduces indicators
Navigation must feel like a native app menu, not a web container
Layout Enforcement
Audit all containers using overflow-y-auto, overflow-scroll, or fixed heights with overflow
Sidebars may scroll but must never show scrollbars on mobile
Nested scroll containers removed unless strictly necessary
Cards, lists, sections default to overflow: visible
Exception: Virtualized lists may scroll internally but indicators remain hidden on mobile
Explicitly Forbidden
Custom scrollbars
Gradient scroll hints
"Scroll to top" affordances
Fake scroll indicators
Gesture replacements for scrolling
JavaScript-based scroll listeners for visual effects
Desktop scrollbar suppression
Doctrine: Scroll is allowed. Scrollbars are not. On mobile, visibility implies complexity. Silence implies control.

EXPLICITLY REJECTED (DO NOT IMPLEMENT)
Custom pull-to-refresh spinners
Decorative icons or brand motion
Floating pills or persistent overlays
Slide-to-complete gestures
Auto-filling or guessing time entries
Camera overlays or photo previews
Confetti, celebration, or delight effects
FILES SUMMARY
New files (1):

File	Lines	Purpose
components/technician/workflow-stepper.tsx	~50	Horizontal progress dots for job workflow
Modified files (~14):

File	Changes
app/globals.css	Expandable sections, focus ring, input focus glow, reduced motion, dark mode borders, stagger utility, backdrop dim rules, mobile scrollbar suppression
app/(dashboard)/my-day/page.tsx	Better skeleton, AlertDialog for confirms, GPS vibration, completion confirmation (calm), entrance animations, arrival banner
app/(dashboard)/layout.tsx	Fade-in on main content
components/technician/active-job-card.tsx	Entrance animation, haptic on CTAs, status transition, expandable details, workflow stepper
components/technician/job-queue-list.tsx	Staggered entrance animations
components/technician/job-checklist.tsx	Expandable animation, haptic on toggle
components/technician/customer-history.tsx	Skeleton loader, expandable animation
components/technician/tech-mode-header.tsx	Fade-in animation
components/technician/inline-invoice-form.tsx	Slide-up entrance
components/technician/voice-note-recorder.tsx	Amplitude bars visualization
components/ui/button.tsx	Active press scale transform
components/ui/data-table.tsx	Row hover highlight
Dashboard stat card component	Desktop hover elevation
Existing utilities to reuse:

components/ui/skeleton-loaders.tsx — TodaysJobsListSkeleton, QuickActionBarSkeleton, PageHeaderSkeleton, Skeleton base
components/ui/alert-dialog.tsx — Full AlertDialog with overlay
components/mobile/bottom-sheet.tsx — Vaul-based drawer (already has overlay)
tailwind.config.ts — animate-fade-in, animate-slide-up, animate-slide-down, animate-scale-in, animate-pulse-subtle
app/globals.css — Existing touch optimization, safe area, OLED dark mode, shadow removal
VERIFICATION
npm run test — all existing tests pass (no logic changes)
node scripts/comprehensive-test-suite.js — all green
Manual mobile:
Load My Day → skeleton appears → content fades in
Tap primary CTA → phone vibrates subtly, status color transitions smoothly
Tap "Show Details" → section smoothly expands (no snap)
Complete all jobs → calm confirmation card (no confetti)
Switch jobs → AlertDialog (no browser confirm)
Record voice note → amplitude bars animate
Manual desktop:
Hover stat cards → slight lift
Hover table rows → subtle highlight
Navigate pages → fade-in
Dark mode: borders visible, no stale shadows, OLED black maintained
Reduced motion: Enable in OS → all animations suppressed
Overlay focus: AlertDialog + BottomSheet have dim backdrop
Mobile scrollbar: No scrollbar visible anywhere on mobile — main content, sheets, dropdowns, sidebars all scroll silently. Background locked when overlay is open.
EXECUTION ORDER
Tier 1 (parallel, independent): Skeletons, AlertDialog, entrance animations, haptics, status transitions
Tier 2 (sequential): Workflow stepper → completion confirmation → GPS vibration → expandable sections → contextual return link
Tier 3 (parallel): Input focus, button press, invoice entrance, voice waveform
Tier 4 (parallel): Hover elevation, table rows, page transitions, empty states
Tier 5 (parallel): Dark mode borders, focus ring, reduced motion, backdrop dimming
Tier 5.5 (parallel with Tier 5): Mobile scrollbar suppression, scroll ownership audit