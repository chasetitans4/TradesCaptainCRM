'use client';

/**
 * Nudge Card Component
 *
 * Per CIL Spec Section 1.3 - Visual Styling (EXACT):
 * - Font weight: 400 (Regular) — NOT bold
 * - Color: text-secondary / text-muted
 * - Icon size: 16px, inline
 * - Tap target: Min 44px height
 * - Background: Transparent or bg-muted
 * - Border: None or 1px border-muted
 * - Border radius: 4px
 * - Padding: 8px 12px
 *
 * Nudges must NOT:
 * - Use button styling
 * - Use primary brand color
 * - Use bold or uppercase text
 * - Animate, pulse, or demand attention
 * - Overlay or obscure content
 */

import { X } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { Nudge, NudgeType } from '@/lib/nudges/types';
import { NUDGE_ICONS } from '@/lib/nudges/types';

interface NudgeCardProps {
  /** The nudge to display */
  nudge: Nudge;
  /** Callback when nudge is dismissed */
  onDismiss?: (nudge: Nudge) => void;
  /** Callback when action is clicked */
  onAction?: (nudge: Nudge) => void;
  /** Custom class name */
  className?: string;
}

/**
 * Get the icon for a nudge type
 */
function getNudgeIcon(type: NudgeType): string {
  return NUDGE_ICONS[type] || '📋';
}

/**
 * Nudge Card - Inline contextual information
 */
export function NudgeCard({
  nudge,
  onDismiss,
  onAction,
  className,
}: NudgeCardProps) {
  const icon = getNudgeIcon(nudge.type);
  const hasAction = nudge.actionLabel && (nudge.actionRoute || nudge.actionHandler);

  const handleDismiss = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDismiss?.(nudge);
  };

  const handleAction = () => {
    onAction?.(nudge);
  };

  // Content component
  const NudgeContent = () => (
    <div className="flex items-start gap-2 flex-1 min-w-0">
      {/* Icon - 16px per spec */}
      <span className="text-base leading-none shrink-0 mt-0.5" aria-hidden="true">
        {icon}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Message - font-weight 400 per spec */}
        <p className="text-sm font-normal text-text-muted leading-snug">
          {nudge.message}
        </p>

        {/* Description if present */}
        {nudge.description && (
          <p className="text-xs font-normal text-text-muted/70 mt-0.5">
            {nudge.description}
          </p>
        )}
      </div>
    </div>
  );

  // Base styles per spec
  const baseStyles = cn(
    // Layout
    'flex items-start gap-2',
    // Sizing - min 44px tap target
    'min-h-[44px] py-2 px-3',
    // Background - transparent or bg-muted
    'bg-transparent',
    // Border - none or 1px border-muted
    'border border-border/50',
    // Border radius - 4px
    'rounded',
    // No animation
    'transition-none',
    className
  );

  // If nudge has a route action, wrap in Link
  if (nudge.actionRoute && !nudge.actionHandler) {
    return (
      <div className={baseStyles}>
        <Link
          href={nudge.actionRoute}
          className={cn(
            'flex items-start gap-2 flex-1 min-w-0',
            'hover:text-text transition-colors'
          )}
        >
          <NudgeContent />

          {/* Action label - link-weight styling */}
          {nudge.actionLabel && (
            <span className="text-sm font-normal text-text-muted hover:text-text shrink-0">
              {nudge.actionLabel}
            </span>
          )}
        </Link>

        {/* Dismiss button */}
        {onDismiss && (
          <button
            onClick={handleDismiss}
            className={cn(
              'p-1.5 -mr-1.5 min-h-[44px] min-w-[44px]',
              'flex items-center justify-center',
              'text-text-muted/50 hover:text-text-muted',
              'transition-colors'
            )}
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }

  // If nudge has a handler action, use button
  if (nudge.actionHandler) {
    return (
      <div className={baseStyles}>
        <button
          onClick={handleAction}
          className={cn(
            'flex items-start gap-2 flex-1 min-w-0 text-left',
            'hover:text-text transition-colors'
          )}
        >
          <NudgeContent />

          {/* Action label - link-weight styling */}
          {nudge.actionLabel && (
            <span className="text-sm font-normal text-text-muted hover:text-text shrink-0">
              {nudge.actionLabel}
            </span>
          )}
        </button>

        {/* Dismiss button */}
        {onDismiss && (
          <button
            onClick={handleDismiss}
            className={cn(
              'p-1.5 -mr-1.5 min-h-[44px] min-w-[44px]',
              'flex items-center justify-center',
              'text-text-muted/50 hover:text-text-muted',
              'transition-colors'
            )}
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }

  // No action - just display
  return (
    <div className={baseStyles}>
      <NudgeContent />

      {/* Dismiss button */}
      {onDismiss && (
        <button
          onClick={handleDismiss}
          className={cn(
            'p-1.5 -mr-1.5 min-h-[44px] min-w-[44px]',
            'flex items-center justify-center',
            'text-text-muted/50 hover:text-text-muted',
            'transition-colors'
          )}
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

/**
 * Compact nudge for tight spaces
 */
export function CompactNudgeCard({
  nudge,
  onDismiss,
  onAction,
  className,
}: NudgeCardProps) {
  const icon = getNudgeIcon(nudge.type);

  const handleClick = () => {
    if (nudge.actionHandler) {
      onAction?.(nudge);
    }
  };

  const commonClasses = cn(
    'inline-flex items-center gap-1.5',
    'min-h-[44px] py-1.5 px-2',
    'text-sm font-normal text-text-muted',
    'hover:text-text transition-colors',
    'cursor-pointer',
    className
  );

  const content = (
    <>
      <span className="text-sm" aria-hidden="true">
        {icon}
      </span>
      <span>{nudge.message}</span>
      {nudge.actionLabel && (
        <span className="text-primary hover:underline ml-1">
          {nudge.actionLabel}
        </span>
      )}
      {onDismiss && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDismiss(nudge);
          }}
          className="ml-1 p-1 -mr-1 text-text-muted/50 hover:text-text-muted"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </>
  );

  if (nudge.actionRoute) {
    return (
      <Link href={nudge.actionRoute} className={commonClasses}>
        {content}
      </Link>
    );
  }

  return (
    <div
      onClick={nudge.actionHandler ? handleClick : undefined}
      className={commonClasses}
    >
      {content}
    </div>
  );
}
