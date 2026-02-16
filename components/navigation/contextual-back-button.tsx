'use client';

/**
 * Contextual Back Button
 *
 * Per CIL Spec Section 1.1:
 * - Shows "← Back to [Context]" with dynamic label
 * - Min 44px touch target
 * - Returns exactly where user came from
 * - Preserves scroll position
 */

import { ChevronLeft, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useContextualBack } from '@/lib/navigation/use-navigation';

interface ContextualBackButtonProps {
  /** Override the back label */
  label?: string;
  /** Fallback path if no history */
  fallback?: string;
  /** Show full "Back to X" or just icon */
  variant?: 'full' | 'icon' | 'compact';
  /** Custom class name */
  className?: string;
  /** Custom onClick handler (overrides default goBack) */
  onClick?: () => void;
}

/**
 * Contextual Back Button Component
 *
 * Displays "← Back to [Previous Context]" with dynamic labels
 * based on navigation stack history.
 */
export function ContextualBackButton({
  label: customLabel,
  fallback = '/dashboard',
  variant = 'full',
  className,
  onClick,
}: ContextualBackButtonProps) {
  const { goBack, canGoBack, backLabel, previousRoute } = useContextualBack();

  const displayLabel = customLabel || backLabel || 'Back';

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      goBack();
    }
  };

  // Icon-only variant
  if (variant === 'icon') {
    return (
      <button
        onClick={handleClick}
        className={cn(
          'flex items-center justify-center',
          'min-h-[44px] min-w-[44px] h-11 w-11',
          'rounded-lg text-text-muted hover:text-text hover:bg-muted/50',
          'transition-colors',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          className
        )}
        aria-label={`Back to ${displayLabel}`}
      >
        <ChevronLeft className="h-6 w-6" />
      </button>
    );
  }

  // Compact variant - just arrow and text, no "Back to"
  if (variant === 'compact') {
    return (
      <button
        onClick={handleClick}
        className={cn(
          'flex items-center gap-1',
          'min-h-[44px] px-2 -ml-2',
          'text-text-muted hover:text-text',
          'transition-colors',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:rounded-lg',
          className
        )}
        aria-label={`Back to ${displayLabel}`}
      >
        <ChevronLeft className="h-5 w-5" />
        <span className="text-sm font-medium">{displayLabel}</span>
      </button>
    );
  }

  // Full variant - "← Back to [Context]"
  return (
    <button
      onClick={handleClick}
      className={cn(
        'flex items-center gap-1.5',
        'min-h-[44px] px-3 -ml-3',
        'text-text-muted hover:text-text',
        'transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:rounded-lg',
        className
      )}
      aria-label={`Back to ${displayLabel}`}
    >
      <ArrowLeft className="h-4 w-4" />
      <span className="text-sm">
        Back to <span className="font-medium">{displayLabel}</span>
      </span>
    </button>
  );
}

/**
 * Simple back button for page headers
 */
export function BackButton({
  onClick,
  className,
}: {
  onClick?: () => void;
  className?: string;
}) {
  const { goBack } = useContextualBack();

  return (
    <button
      onClick={onClick || goBack}
      className={cn(
        'flex items-center justify-center',
        'min-h-[44px] min-w-[44px] h-11 w-11',
        'rounded-lg text-text-muted hover:text-text hover:bg-muted/50',
        'transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        className
      )}
      aria-label="Go back"
    >
      <ChevronLeft className="h-6 w-6" />
    </button>
  );
}

/**
 * Breadcrumb-style back navigation
 * Shows: Schedule > Johnson Job
 */
interface BreadcrumbBackProps {
  className?: string;
  maxItems?: number;
}

export function BreadcrumbBack({ className, maxItems = 3 }: BreadcrumbBackProps) {
  const { goBack, canGoBack, backLabel, previousRoute } = useContextualBack();

  if (!canGoBack) {
    return null;
  }

  return (
    <nav
      className={cn('flex items-center gap-1 text-sm text-text-muted', className)}
      aria-label="Breadcrumb"
    >
      <button
        onClick={goBack}
        className={cn(
          'flex items-center gap-1 min-h-[44px] px-1',
          'hover:text-primary transition-colors',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:rounded'
        )}
      >
        <ChevronLeft className="h-4 w-4" />
        <span>{backLabel}</span>
      </button>
    </nav>
  );
}

/**
 * Page header with contextual back button
 */
interface PageHeaderWithBackProps {
  title: string;
  subtitle?: string;
  backLabel?: string;
  onBack?: () => void;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeaderWithBack({
  title,
  subtitle,
  backLabel,
  onBack,
  actions,
  className,
}: PageHeaderWithBackProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <ContextualBackButton label={backLabel} onClick={onBack} variant="compact" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">{title}</h1>
          {subtitle && <p className="text-sm text-text-muted mt-1">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </div>
  );
}
