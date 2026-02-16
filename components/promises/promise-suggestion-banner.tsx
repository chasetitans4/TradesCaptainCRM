'use client';

/**
 * Promise Suggestion Banner
 *
 * Per CIL Spec Section 2.2:
 * - Appears when follow-up keywords detected in notes
 * - "⏰ Remind you to follow up?"
 * - Link-weight styling, dismissible
 */

import { useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Clock, X, Plus } from 'lucide-react';
import { detectFollowupKeywords } from '@/lib/nudges/evaluators/promise-due';

interface PromiseSuggestionBannerProps {
  /** Text to analyze for follow-up keywords */
  noteText: string;
  /** Called when user wants to create a reminder */
  onCreateReminder: () => void;
  /** Called when banner is dismissed */
  onDismiss?: () => void;
  /** Whether to always show (manual mode) */
  alwaysShow?: boolean;
  /** Custom class name */
  className?: string;
}

/**
 * Banner that suggests creating a follow-up reminder
 */
export function PromiseSuggestionBanner({
  noteText,
  onCreateReminder,
  onDismiss,
  alwaysShow = false,
  className,
}: PromiseSuggestionBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [detectedKeyword, setDetectedKeyword] = useState<string | null>(null);

  // Detect keywords when text changes
  useEffect(() => {
    if (alwaysShow) {
      setDetectedKeyword(null);
      return;
    }

    const keyword = detectFollowupKeywords(noteText);
    setDetectedKeyword(keyword);

    // Reset dismissed state when keyword changes
    if (keyword !== detectedKeyword) {
      setIsDismissed(false);
    }
  }, [noteText, alwaysShow, detectedKeyword]);

  const handleDismiss = useCallback(() => {
    setIsDismissed(true);
    onDismiss?.();
  }, [onDismiss]);

  const handleCreate = useCallback(() => {
    onCreateReminder();
  }, [onCreateReminder]);

  // Don't show if dismissed or no keyword detected (unless alwaysShow)
  if (isDismissed) return null;
  if (!alwaysShow && !detectedKeyword) return null;

  return (
    <div
      className={cn(
        // Per spec: link-weight styling, not aggressive
        'flex items-center justify-between gap-2',
        'px-3 py-2 min-h-[44px]',
        'bg-transparent border border-border/50 rounded',
        'transition-none', // No animation per spec
        className
      )}
    >
      <button
        onClick={handleCreate}
        className={cn(
          'flex items-center gap-2 flex-1',
          'text-sm font-normal text-text-muted hover:text-text',
          'transition-colors text-left'
        )}
      >
        <Clock className="h-4 w-4 shrink-0" />
        <span>
          {detectedKeyword
            ? 'Remind you to follow up?'
            : '+ Add follow-up reminder'}
        </span>
      </button>

      {detectedKeyword && onDismiss && (
        <button
          onClick={handleDismiss}
          className={cn(
            'p-1.5 min-h-[44px] min-w-[44px]',
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
 * Compact inline link for adding reminders
 */
export function AddReminderLink({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5',
        'text-sm font-normal text-text-muted hover:text-text',
        'min-h-[44px] px-2',
        'transition-colors',
        className
      )}
    >
      <Plus className="h-4 w-4" />
      <span>Add follow-up reminder</span>
    </button>
  );
}
