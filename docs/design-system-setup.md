# TRADES CAPTAIN — DESIGN SYSTEM SETUP

## CRITICAL: COMPLETE THIS BEFORE BUILDING ANY MORE COMPONENTS

**Stop building features.** The design system foundation is missing. Without it, every component you build will need to be refactored later.

This document walks through exactly what files to create/update.

---

## PHASE 0: AUDIT CURRENT STATE

Before starting, check your current implementation:

```bash
# Check if semantic tokens exist
grep -r "bg-surface\|text-primary\|border-border" ./src

# Check for raw values that shouldn't exist
grep -r "bg-white\|bg-gray-\|text-gray-\|border-gray-" ./src/components
```

If you find raw values (`bg-white`, `text-gray-500`, etc.) in components, they need refactoring.

---

## PHASE 1: TAILWIND CONFIG

Update `tailwind.config.js` (or `tailwind.config.ts`):

```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Semantic colors — use these, not raw values
        background: 'var(--color-background)',
        surface: {
          DEFAULT: 'var(--color-surface)',
          muted: 'var(--color-surface-muted)',
          elevated: 'var(--color-surface-elevated)',
        },
        border: {
          DEFAULT: 'var(--color-border)',
        },
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          muted: 'var(--color-text-muted)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          muted: 'var(--color-accent-muted)',
        },
        success: {
          DEFAULT: 'var(--color-success)',
          muted: 'var(--color-success-muted)',
        },
        warning: {
          DEFAULT: 'var(--color-warning)',
          muted: 'var(--color-warning-muted)',
        },
        danger: {
          DEFAULT: 'var(--color-danger)',
          muted: 'var(--color-danger-muted)',
        },
      },
      spacing: {
        // Only these values allowed — matches UI Constraints Section 1.3
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '6': '24px',
        '8': '32px',
        '12': '48px',
        '16': '64px',
      },
      borderRadius: {
        'sm': '4px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
      },
      fontSize: {
        'micro': ['12px', { lineHeight: '1.4' }],
        'caption': ['13px', { lineHeight: '1.5' }],
        'body': ['15px', { lineHeight: '1.5' }],
        'h3': ['16px', { lineHeight: '1.5', fontWeight: '500' }],
        'h2': ['18px', { lineHeight: '1.4', fontWeight: '600' }],
        'h1': ['22px', { lineHeight: '1.4', fontWeight: '600' }],
      },
      boxShadow: {
        'sm': '0 1px 2px rgba(0,0,0,0.04)',
        'md': '0 6px 16px rgba(0,0,0,0.08)',
        'none': 'none',
      },
      transitionDuration: {
        'fast': '150ms',
        'normal': '200ms',
        'slow': '220ms',
      },
    },
  },
  plugins: [],
}
```

---

## PHASE 2: CSS VARIABLES

Add to `globals.css` (or your main CSS file):

```css
/* ============================================
   TRADES CAPTAIN DESIGN TOKENS
   From UI Constraints Section 10.1
   ============================================ */

:root {
  /* Backgrounds */
  --color-background: #F7F8FA;
  --color-surface: #FFFFFF;
  --color-surface-muted: #EFF1F4;
  --color-surface-elevated: #FFFFFF;
  
  /* Text */
  --color-text-primary: #0F172A;
  --color-text-secondary: #475569;
  --color-text-muted: #94A3B8;
  
  /* Accent */
  --color-accent: #2563EB;
  --color-accent-muted: #DBEAFE;
  
  /* Status */
  --color-success: #16A34A;
  --color-success-muted: #DCFCE7;
  --color-warning: #D97706;
  --color-warning-muted: #FEF3C7;
  --color-danger: #DC2626;
  --color-danger-muted: #FEE2E2;
  --color-info: #0284C7;
  --color-info-muted: #DBEAFE;
  
  /* Border */
  --color-border: #E2E8F0;
  --color-border-muted: #EFF1F4;
}

.dark {
  /* Backgrounds — NOT simple inversion */
  --color-background: #0B1220;
  --color-surface: #1A2332;
  --color-surface-muted: #1F2933;
  --color-surface-elevated: #243044;
  
  /* Text */
  --color-text-primary: #E5E7EB;
  --color-text-secondary: #9CA3AF;
  --color-text-muted: #6B7280;
  
  /* Accent */
  --color-accent: #3B82F6;
  --color-accent-muted: #1E3A5F;
  
  /* Status — backgrounds are darker, text is lighter */
  --color-success: #86EFAC;
  --color-success-muted: #166534;
  --color-warning: #FCD34D;
  --color-warning-muted: #92400E;
  --color-danger: #FCA5A5;
  --color-danger-muted: #991B1B;
  --color-info: #93C5FD;
  --color-info-muted: #1E40AF;
  
  /* Border */
  --color-border: #3D4A5C;
  --color-border-muted: #2A3441;
}

/* ============================================
   DARK MODE: NO SHADOWS
   In dark mode, elevation = surface color, not shadow
   ============================================ */

.dark .shadow-sm,
.dark .shadow-md,
.dark .shadow-lg {
  box-shadow: none !important;
}

/* ============================================
   TOUCH TARGETS
   Minimum 48px for all interactive elements
   ============================================ */

button, 
[role="button"],
input,
select,
textarea {
  min-height: 48px;
}

/* Primary CTAs get 56px */
.btn-primary {
  min-height: 56px;
}
```

---

## PHASE 3: BUILD CUSTOM COMPONENTS

Create these three components. They are the ONLY custom components allowed — everything else uses shadcn.

### 3.1 StatusPill

Create `components/ui/status-pill.tsx`:

```tsx
import { cn } from "@/lib/utils";

type StatusType = 'active' | 'success' | 'warning' | 'danger' | 'neutral';

interface StatusPillProps {
  status: StatusType;
  label: string;
  className?: string;
}

const statusStyles: Record<StatusType, { bg: string; text: string; dot: string }> = {
  active: {
    bg: 'bg-accent-muted',
    text: 'text-accent',
    dot: 'bg-accent',
  },
  success: {
    bg: 'bg-success-muted',
    text: 'text-success',
    dot: 'bg-success',
  },
  warning: {
    bg: 'bg-warning-muted',
    text: 'text-warning',
    dot: 'bg-warning',
  },
  danger: {
    bg: 'bg-danger-muted',
    text: 'text-danger',
    dot: 'bg-danger',
  },
  neutral: {
    bg: 'bg-surface-muted',
    text: 'text-text-secondary',
    dot: 'bg-text-muted',
  },
};

export function StatusPill({ status, label, className }: StatusPillProps) {
  const styles = statusStyles[status];
  
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-caption',
        styles.bg,
        styles.text,
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full', styles.dot)} />
      {label}
    </span>
  );
}
```

**Usage:**
```tsx
<StatusPill status="success" label="Completed" />
<StatusPill status="warning" label="Paused" />
<StatusPill status="active" label="On Site" />
<StatusPill status="danger" label="Overdue" />
<StatusPill status="neutral" label="Scheduled" />
```

---

### 3.2 ProgressStepper

Create `components/ui/progress-stepper.tsx`:

```tsx
import { cn } from "@/lib/utils";

type StepState = 'completed' | 'current' | 'upcoming' | 'paused';

interface Step {
  id: string;
  label?: string;
  state: StepState;
}

interface ProgressStepperProps {
  steps: Step[];
  className?: string;
}

export function ProgressStepper({ steps, className }: ProgressStepperProps) {
  return (
    <div className={cn('flex items-center', className)}>
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center">
          {/* Circle */}
          <div
            className={cn(
              'w-3 h-3 rounded-full border-2 transition-colors',
              step.state === 'completed' && 'bg-success border-success',
              step.state === 'current' && 'bg-accent border-accent animate-pulse',
              step.state === 'upcoming' && 'bg-transparent border-border',
              step.state === 'paused' && 'bg-transparent border-warning border-dashed'
            )}
          />
          
          {/* Line (not after last step) */}
          {index < steps.length - 1 && (
            <div
              className={cn(
                'w-8 h-0.5',
                step.state === 'completed' ? 'bg-success' : 'bg-border',
                step.state === 'paused' && 'border-t border-dashed border-warning bg-transparent'
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}
```

**Usage:**
```tsx
<ProgressStepper
  steps={[
    { id: 'scheduled', state: 'completed' },
    { id: 'on-my-way', state: 'completed' },
    { id: 'on-site', state: 'current' },
    { id: 'completed', state: 'upcoming' },
    { id: 'paid', state: 'upcoming' },
  ]}
/>
```

---

### 3.3 SwipeActionRow

Create `components/ui/swipe-action-row.tsx`:

```tsx
'use client';

import { useState, useRef } from 'react';
import { cn } from "@/lib/utils";

interface SwipeActionRowProps {
  children: React.ReactNode;
  leftAction?: {
    label: string;
    icon?: React.ReactNode;
    onAction: () => void;
    color?: string;
  };
  rightAction?: {
    label: string;
    icon?: React.ReactNode;
    onAction: () => void;
    color?: string;
  };
  leftEdgeColor?: string;
  onLongPress?: () => void;
  className?: string;
}

export function SwipeActionRow({
  children,
  leftAction,
  rightAction,
  leftEdgeColor,
  onLongPress,
  className,
}: SwipeActionRowProps) {
  const [offset, setOffset] = useState(0);
  const [isPressed, setIsPressed] = useState(false);
  const startX = useRef(0);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const threshold = 80;

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    setIsPressed(true);
    
    // Long press detection
    if (onLongPress) {
      longPressTimer.current = setTimeout(() => {
        onLongPress();
        setIsPressed(false);
      }, 500);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    // Cancel long press on move
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
    
    const currentX = e.touches[0].clientX;
    const diff = currentX - startX.current;
    
    const maxOffset = 120;
    const newOffset = Math.max(-maxOffset, Math.min(maxOffset, diff));
    setOffset(newOffset);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
    setIsPressed(false);
    
    if (offset > threshold && leftAction) {
      // Haptic feedback would go here
      leftAction.onAction();
    } else if (offset < -threshold && rightAction) {
      rightAction.onAction();
    }
    setOffset(0);
  };

  return (
    <div className={cn('relative overflow-hidden rounded-lg', className)}>
      {/* Left action reveal (swipe right) */}
      {leftAction && (
        <div 
          className="absolute inset-y-0 left-0 w-24 flex items-center justify-center text-white"
          style={{ backgroundColor: leftAction.color || 'var(--color-success)' }}
        >
          {leftAction.icon}
          <span className="ml-2 text-caption font-medium">{leftAction.label}</span>
        </div>
      )}
      
      {/* Right action reveal (swipe left) */}
      {rightAction && (
        <div 
          className="absolute inset-y-0 right-0 w-24 flex items-center justify-center text-white"
          style={{ backgroundColor: rightAction.color || 'var(--color-danger)' }}
        >
          <span className="mr-2 text-caption font-medium">{rightAction.label}</span>
          {rightAction.icon}
        </div>
      )}
      
      {/* Main content */}
      <div
        className={cn(
          'relative bg-surface transition-transform duration-normal ease-out',
          isPressed && 'scale-[0.99]'
        )}
        style={{
          transform: `translateX(${offset}px)`,
          borderLeft: leftEdgeColor ? `4px solid ${leftEdgeColor}` : undefined,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Edge peek indicators (visible at rest) */}
        {leftAction && offset === 0 && (
          <div 
            className="absolute left-0 top-0 bottom-0 w-1 opacity-50"
            style={{ backgroundColor: leftAction.color || 'var(--color-success)' }}
          />
        )}
        {rightAction && offset === 0 && (
          <div 
            className="absolute right-0 top-0 bottom-0 w-1 opacity-50"
            style={{ backgroundColor: rightAction.color || 'var(--color-danger)' }}
          />
        )}
        
        {children}
      </div>
    </div>
  );
}
```

**Usage:**
```tsx
<SwipeActionRow
  leftAction={{
    label: 'Call',
    icon: <PhoneIcon className="w-4 h-4" />,
    onAction: () => handleCall(),
  }}
  rightAction={{
    label: 'Archive',
    icon: <ArchiveIcon className="w-4 h-4" />,
    onAction: () => handleArchive(),
  }}
  leftEdgeColor="#16A34A"
  onLongPress={() => openContextMenu()}
>
  <div className="p-4">
    {/* Row content */}
  </div>
</SwipeActionRow>
```

---

## PHASE 4: REFACTOR EXISTING COMPONENTS

Go through every component you've built and replace raw values:

### Color Classes Quick Reference

| ❌ Raw Value | ✅ Semantic Token |
|-------------|------------------|
| `bg-white` | `bg-surface` |
| `bg-gray-50` | `bg-background` |
| `bg-gray-100` | `bg-surface-muted` |
| `text-gray-900` | `text-text-primary` |
| `text-gray-700` | `text-text-secondary` |
| `text-gray-600` | `text-text-secondary` |
| `text-gray-500` | `text-text-muted` |
| `text-gray-400` | `text-text-muted` |
| `border-gray-200` | `border-border` |
| `border-gray-300` | `border-border` |
| `bg-blue-600` | `bg-accent` |
| `bg-blue-500` | `bg-accent` |
| `bg-blue-100` | `bg-accent-muted` |
| `bg-blue-50` | `bg-accent-muted` |
| `text-blue-600` | `text-accent` |
| `bg-green-500` | `bg-success` |
| `bg-green-100` | `bg-success-muted` |
| `text-green-600` | `text-success` |
| `bg-yellow-500` | `bg-warning` |
| `bg-yellow-100` | `bg-warning-muted` |
| `text-yellow-600` | `text-warning` |
| `bg-red-500` | `bg-danger` |
| `bg-red-100` | `bg-danger-muted` |
| `text-red-600` | `text-danger` |

### Shadows

| ❌ Raw Value | ✅ Semantic Token |
|-------------|------------------|
| `shadow` | `shadow-sm` |
| `shadow-lg` | `shadow-md` |
| `shadow-xl` | `shadow-md` |
| `shadow-2xl` | `shadow-md` |

### Spacing (Remove Arbitrary Values)

| ❌ Not Allowed | ✅ Use Instead |
|---------------|----------------|
| `p-5` | `p-4` or `p-6` |
| `p-7` | `p-8` |
| `gap-5` | `gap-4` or `gap-6` |
| `m-[15px]` | `m-4` |
| `p-[20px]` | `p-4` or `p-6` |

### Border Radius

| ❌ Not Allowed | ✅ Use Instead |
|---------------|----------------|
| `rounded` | `rounded-md` |
| `rounded-xl` | `rounded-lg` |
| `rounded-2xl` | `rounded-lg` |
| `rounded-3xl` | `rounded-xl` |

---

## PHASE 5: APPLY VISUAL FINISH RULES

### 5.1 Typography Emphasis

Money and counts get `font-semibold`:

```tsx
// ❌ Wrong
<span>${job.value}</span>
<span>{jobs.length} jobs</span>

// ✅ Right
<span className="font-semibold">${job.value}</span>
<span><span className="font-semibold">{jobs.length}</span> jobs</span>
```

### 5.2 Status Pill Placement

Status is ALWAYS first, top-left:

```tsx
// ❌ Wrong
<Card>
  <h3>Job Title</h3>
  <p>Details</p>
  <StatusPill status="active" label="On Site" />
</Card>

// ✅ Right
<Card>
  <div className="flex justify-between items-start mb-2">
    <StatusPill status="active" label="On Site" />
    <span className="text-caption text-text-muted">8:30 AM</span>
  </div>
  <h3 className="text-h3">Job Title</h3>
  <p className="text-text-secondary mt-2">Details</p>
</Card>
```

### 5.3 Job Card Left Edge

Every job card needs a 4px left border showing status:

```tsx
const statusColors: Record<JobStatus, string> = {
  scheduled: '#94A3B8',    // gray
  'on-my-way': '#2563EB',  // blue
  'on-site': '#2563EB',    // blue
  completed: '#16A34A',    // green
  paid: '#16A34A',         // green
  paused: '#D97706',       // amber
  attention: '#DC2626',    // red
};

<div 
  className="bg-surface rounded-lg shadow-sm border-l-4"
  style={{ borderLeftColor: statusColors[job.status] }}
>
  {/* Job card content */}
</div>
```

### 5.4 Accent Color Budget

Each screen should have accent blue in MAX 3 places:
1. Primary CTA button
2. Active progress indicator OR active tab
3. One link OR one icon

Count them. If more than 3, remove some.

### 5.5 Card Spacing Rhythm

```tsx
<div className="p-3 pb-4"> {/* 12px top/sides, 16px bottom */}
  <StatusPill />                    {/* First */}
  <h3 className="mt-2">Title</h3>   {/* 8px gap */}
  <p className="mt-3">Secondary</p> {/* 12px gap */}
  <div className="mt-4">Actions</div> {/* 16px gap */}
</div>
```

---

## PHASE 6: VERIFICATION

Run these checks before continuing:

```bash
# Should return NO results (raw colors gone)
grep -r "bg-white\|bg-gray-\|text-gray-\|border-gray-" components/ --include="*.tsx"

# Should return NO results (wrong shadows)
grep -r "shadow-xl\|shadow-2xl" components/ --include="*.tsx"

# Should return NO results (wrong radii)
grep -r "rounded-xl\|rounded-2xl\|rounded-3xl" components/ --include="*.tsx"

# Should return RESULTS (semantic classes present)
grep -r "bg-surface\|text-text-primary\|border-border" components/ --include="*.tsx"
```

---

## PHASE 7: PROOF OF COMPLETION

Show me:

1. **Your tailwind.config.js** (full file)
2. **Your globals.css** (the CSS variables section)
3. **StatusPill component** (full file)
4. **ProgressStepper component** (full file)
5. **One job card** showing:
   - Left edge color indicator
   - StatusPill top-left
   - Font-semibold on dollar amount
6. **Verification output** from the grep commands

---

## DO NOT CONTINUE UNTIL:

- [ ] Tailwind config has semantic tokens
- [ ] CSS variables exist for light and dark mode
- [ ] StatusPill component exists
- [ ] ProgressStepper component exists
- [ ] SwipeActionRow component exists
- [ ] All existing components refactored (zero raw values)
- [ ] Visual finish rules applied
- [ ] Verification checks pass

**Only after showing proof of completion should you continue with Phases 4+ of feature development.**