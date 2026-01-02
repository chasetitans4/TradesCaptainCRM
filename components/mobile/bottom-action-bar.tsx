'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { LucideIcon } from 'lucide-react';

interface ActionItem {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'ghost' | 'outline';
  disabled?: boolean;
}

interface PrimaryAction {
  icon?: LucideIcon;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'destructive';
  disabled?: boolean;
  loading?: boolean;
}

interface BottomActionBarProps {
  actions?: ActionItem[];
  primaryAction?: PrimaryAction;
  className?: string;
}

/**
 * Sticky bottom action bar for detail pages
 *
 * Shows secondary actions on the left and a primary action on the right.
 * Useful for job/customer/invoice detail pages.
 *
 * @example
 * ```tsx
 * <BottomActionBar
 *   actions={[
 *     { icon: Phone, label: 'Call', onClick: () => call(phone) },
 *     { icon: MapPin, label: 'Navigate', onClick: () => openMaps(address) },
 *   ]}
 *   primaryAction={{
 *     icon: PlayCircle,
 *     label: 'Start Job',
 *     onClick: () => updateStatus('in_progress')
 *   }}
 * />
 * ```
 */
export function BottomActionBar({
  actions = [],
  primaryAction,
  className,
}: BottomActionBarProps) {
  if (actions.length === 0 && !primaryAction) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed bottom-0 inset-x-0 z-40',
        'bg-background border-t',
        'px-4 py-3 safe-area-pb',
        'md:hidden', // Only show on mobile
        className
      )}
    >
      <div className="flex items-center justify-between gap-3">
        {/* Secondary Actions */}
        <div className="flex items-center gap-2">
          {actions.map((action, index) => (
            <Button
              key={index}
              variant={action.variant || 'ghost'}
              size="sm"
              onClick={action.onClick}
              disabled={action.disabled}
              className="h-10 px-3"
            >
              <action.icon className="h-4 w-4 mr-1.5" />
              <span className="text-sm">{action.label}</span>
            </Button>
          ))}
        </div>

        {/* Primary Action */}
        {primaryAction && (
          <Button
            variant={primaryAction.variant || 'default'}
            onClick={primaryAction.onClick}
            disabled={primaryAction.disabled || primaryAction.loading}
            className="h-10 px-4"
          >
            {primaryAction.loading ? (
              <span className="animate-spin mr-2">...</span>
            ) : (
              primaryAction.icon && (
                <primaryAction.icon className="h-4 w-4 mr-2" />
              )
            )}
            <span>{primaryAction.label}</span>
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Spacer component to prevent content from being hidden behind the action bar
 */
export function BottomActionBarSpacer() {
  return <div className="h-20 md:h-0" />;
}

/**
 * Full-width action bar with equal-sized buttons
 * Use when all actions are of equal importance
 */
interface EqualActionsBarProps {
  actions: ActionItem[];
  className?: string;
}

export function EqualActionsBar({ actions, className }: EqualActionsBarProps) {
  if (actions.length === 0) return null;

  return (
    <div
      className={cn(
        'fixed bottom-0 inset-x-0 z-40',
        'bg-background border-t',
        'px-4 py-3 safe-area-pb',
        'md:hidden',
        className
      )}
    >
      <div className="flex items-center gap-2">
        {actions.map((action, index) => (
          <Button
            key={index}
            variant={action.variant || 'outline'}
            onClick={action.onClick}
            disabled={action.disabled}
            className="flex-1 h-11"
          >
            <action.icon className="h-4 w-4 mr-2" />
            <span>{action.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
