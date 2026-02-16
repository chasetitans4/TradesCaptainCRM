'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  Plus,
  Target,
  DollarSign,
  Clock,
  type LucideIcon,
} from 'lucide-react';

/**
 * Shortcuts Grid - 4-icon quick action grid
 * Per Product Constitution v2.0 Section 6.1:
 * - New Job, New Lead, Collect Payment, Clock In/Out
 * - Fixed 4-icon layout
 * - Always visible at bottom of Today screen
 */

interface Shortcut {
  id: string;
  label: string;
  icon: LucideIcon;
  href?: string;
  onClick?: () => void;
  variant?: 'default' | 'primary' | 'success';
}

interface ShortcutsGridProps {
  shortcuts?: Shortcut[];
  onClockToggle?: () => void;
  isClockedIn?: boolean;
  className?: string;
}

const DEFAULT_SHORTCUTS: Shortcut[] = [
  {
    id: 'new-job',
    label: 'New Job',
    icon: Plus,
    href: '/jobs/new',
    variant: 'primary',
  },
  {
    id: 'new-lead',
    label: 'New Lead',
    icon: Target,
    href: '/leads/new',
  },
  {
    id: 'collect-payment',
    label: 'Collect Payment',
    icon: DollarSign,
    href: '/payments/collect',
    variant: 'success',
  },
  {
    id: 'clock',
    label: 'Clock In',
    icon: Clock,
    onClick: undefined, // Will be overridden
  },
];

const variantStyles = {
  default: 'bg-surface border-tc-border hover:bg-surface-muted',
  primary: 'bg-tc-accent-muted border-tc-accent/20 text-tc-accent hover:bg-tc-accent/20',
  success: 'bg-tc-success-muted border-tc-success/20 text-tc-success hover:bg-tc-success/20',
};

export function ShortcutsGrid({
  shortcuts = DEFAULT_SHORTCUTS,
  onClockToggle,
  isClockedIn = false,
  className,
}: ShortcutsGridProps) {
  // Update clock shortcut with toggle handler and state
  const displayShortcuts = shortcuts.map((shortcut) => {
    if (shortcut.id === 'clock') {
      return {
        ...shortcut,
        label: isClockedIn ? 'Clock Out' : 'Clock In',
        onClick: onClockToggle,
        variant: isClockedIn ? 'success' as const : 'default' as const,
      };
    }
    return shortcut;
  });

  return (
    <div className={cn('', className)}>
      <h2 className="text-sm font-semibold text-text-primary mb-3 px-1">
        Quick Actions
      </h2>
      <div className="grid grid-cols-2 gap-4">
        {displayShortcuts.map((shortcut) => {
          const Icon = shortcut.icon;
          const variant = shortcut.variant || 'default';
          const styles = variantStyles[variant];

          const content = (
            <div className="p-4 flex flex-col items-center justify-center gap-4 h-full">
              <Icon className="h-10 w-10" />
              <span className="text-base font-bold text-center leading-tight">
                {shortcut.label}
              </span>
            </div>
          );

          if (shortcut.href) {
            return (
              <Link
                key={shortcut.id}
                href={shortcut.href}
                className={cn(
                  'rounded-xl border transition-all active:scale-95 shadow-sm aspect-square',
                  styles
                )}
              >
                {content}
              </Link>
            );
          }

          return (
            <button
              key={shortcut.id}
              onClick={shortcut.onClick}
              className={cn(
                'rounded-xl border transition-all active:scale-95 shadow-sm aspect-square w-full',
                styles
              )}
            >
              {content}
            </button>
          );
        })}
      </div>
    </div>
  );
}
