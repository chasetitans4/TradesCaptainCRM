'use client';

import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

/**
 * Quick Action Item for the Constitution-compliant Quick Action Bar
 *
 * Per Design Constitution Section 3.7.4:
 * - Button size: 50x50px minimum (gloved use)
 * - Spacing: 8-12px between buttons
 * - Icons: Simple, 2D, single-color
 * - Labels: 12-14px, below icon
 */
export interface QuickActionItem {
  /** Lucide icon component */
  icon: LucideIcon;
  /** Short label (1-2 words) displayed below icon */
  label: string;
  /** Action handler - should be one-tap (no confirmation modals) */
  onClick: () => void;
  /** Optional: disable the action */
  disabled?: boolean;
  /** Optional: show badge count */
  badge?: number;
  /** Optional: highlight as active/selected */
  active?: boolean;
}

/**
 * Primary CTA for the action bar
 * Full-width button at bottom of bar
 */
export interface PrimaryCTAProps {
  /** CTA label (e.g., "Mark Complete", "Start Job") */
  label: string;
  /** Action handler */
  onClick: () => void;
  /** Optional icon */
  icon?: LucideIcon;
  /** Loading state */
  loading?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Variant for visual styling */
  variant?: 'default' | 'success' | 'warning' | 'destructive';
}

interface QuickActionBarProps {
  /** Array of quick action items (max 5 recommended) */
  actions: QuickActionItem[];
  /** Optional primary CTA below quick actions */
  primaryCTA?: PrimaryCTAProps;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Constitution-Compliant Quick Action Bar
 *
 * Per Design Constitution Section 3.7:
 * - Context-aware actions surface within the context where they're needed
 * - One-tap principle: most common actions require exactly 1 tap
 * - No global action grids - actions appear where and when needed
 *
 * Specifications (Section 3.7.4):
 * - Bar height: 70px total (button + label)
 * - Button size: 50x50px minimum
 * - Spacing: 8-12px between buttons
 * - Position: Below header, above scrollable content (or fixed at bottom)
 * - Always visible when in relevant context
 *
 * Visual Treatment:
 * - Icons: Simple, 2D, single-color (follows HPHMI)
 * - Labels: 10-12px, below icon
 * - Background: Subtle differentiation from content area
 * - No decorative styling (no shadows, gradients, or colored backgrounds)
 */
export function QuickActionBar({
  actions,
  primaryCTA,
  className,
}: QuickActionBarProps) {
  if (actions.length === 0 && !primaryCTA) {
    return null;
  }

  // Haptic feedback for touch interactions
  const triggerHaptic = () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(10); // Short 10ms vibration
    }
  };

  const handleActionClick = (action: QuickActionItem) => {
    if (action.disabled) return;
    triggerHaptic();
    action.onClick();
  };

  const handlePrimaryCTAClick = () => {
    if (primaryCTA?.disabled || primaryCTA?.loading) return;
    triggerHaptic();
    primaryCTA?.onClick();
  };

  return (
    <div
      className={cn(
        // Fixed positioning at bottom, above bottom nav
        'fixed bottom-16 inset-x-0 z-40',
        // Safe area padding for notched devices
        'safe-area-pb',
        // Background with subtle border
        'bg-background border-t border-border',
        // Mobile only (hide on desktop where sidebar provides navigation)
        'md:hidden',
        className
      )}
    >
      {/* Quick Actions Row - 70px height per Constitution */}
      {actions.length > 0 && (
        <div className="h-[70px] px-3 flex items-center justify-around gap-2">
          {actions.map((action, index) => {
            const Icon = action.icon;
            return (
              <button
                key={index}
                onClick={() => handleActionClick(action)}
                disabled={action.disabled}
                className={cn(
                  // 50x50px minimum touch target per Constitution Section 2.2
                  'min-w-[50px] min-h-[50px]',
                  // Flex column for icon + label layout
                  'flex flex-col items-center justify-center gap-0.5',
                  // Touch feedback
                  'active:scale-95 active:bg-muted/50 transition-transform',
                  // Rounded for visual consistency
                  'rounded-lg',
                  // Disabled state
                  action.disabled && 'opacity-50 pointer-events-none',
                  // Active/selected state
                  action.active && 'bg-primary/10 text-primary'
                )}
                aria-label={action.label}
              >
                {/* Icon Container with optional badge */}
                <div className="relative">
                  <Icon
                    className={cn(
                      'h-6 w-6',
                      action.active ? 'text-primary' : 'text-text-secondary'
                    )}
                    strokeWidth={1.5}
                  />
                  {/* Badge for counts (e.g., pending photos) */}
                  {action.badge !== undefined && action.badge > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-primary text-white text-[10px] font-medium rounded-full">
                      {action.badge > 99 ? '99+' : action.badge}
                    </span>
                  )}
                </div>
                {/* Label - 10-12px per Constitution */}
                <span className="text-[10px] font-medium text-text-muted leading-tight">
                  {action.label}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Primary CTA - Full width, 50px height per Constitution */}
      {primaryCTA && (
        <div className="px-3 pb-2">
          <button
            onClick={handlePrimaryCTAClick}
            disabled={primaryCTA.disabled || primaryCTA.loading}
            className={cn(
              // Full width, 50px height per Constitution
              'w-full h-[50px]',
              // Flex for icon + label
              'flex items-center justify-center gap-2',
              // Typography
              'text-base font-semibold',
              // Rounded corners
              'rounded-xl',
              // Touch feedback
              'active:scale-[0.98] transition-transform',
              // Variant styling
              primaryCTA.variant === 'success' && 'bg-success text-white',
              primaryCTA.variant === 'warning' && 'bg-warning text-white',
              primaryCTA.variant === 'destructive' && 'bg-danger text-white',
              (!primaryCTA.variant || primaryCTA.variant === 'default') && 'bg-primary text-white',
              // Disabled/loading state
              (primaryCTA.disabled || primaryCTA.loading) && 'opacity-50 pointer-events-none'
            )}
          >
            {primaryCTA.loading ? (
              <span className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                {primaryCTA.icon && <primaryCTA.icon className="h-5 w-5" />}
                <span>{primaryCTA.label}</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Spacer component to prevent content from being hidden behind the Quick Action Bar
 * Use this at the bottom of scrollable content
 */
export function QuickActionBarSpacer({ hasPrimaryCTA = false }: { hasPrimaryCTA?: boolean }) {
  // 70px for actions + 58px for primary CTA (50px + padding) + 64px bottom nav
  const height = hasPrimaryCTA ? 192 : 134;
  return <div style={{ height: `${height}px` }} className="md:h-0" />;
}

/**
 * Hook to get context-aware actions based on job status
 * Per Design Constitution Section 3.7.3 - Context-Action Mapping
 */
export type JobContext =
  | 'not_started'
  | 'in_progress'
  | 'complete'
  | 'customer_detail'
  | 'equipment_detail';

export interface JobContextActions {
  context: JobContext;
  actions: QuickActionItem[];
  primaryCTA?: PrimaryCTAProps;
}
