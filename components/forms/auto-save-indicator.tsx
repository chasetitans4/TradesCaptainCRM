'use client';

import { cn } from '@/lib/utils';
import { Check, Loader2, AlertCircle, Cloud } from 'lucide-react';
import type { AutoSaveStatus } from '@/hooks/useAutoSave';
import { formatLastSaved } from '@/hooks/useAutoSave';

interface AutoSaveIndicatorProps {
  /** Current save status */
  status: AutoSaveStatus;
  /** Last saved timestamp */
  lastSaved: Date | null;
  /** Error message if any */
  error?: string | null;
  /** Whether there are unsaved changes */
  isDirty?: boolean;
  /** Additional class names */
  className?: string;
  /** Show as compact badge */
  compact?: boolean;
}

/**
 * Auto-Save Status Indicator
 *
 * Per Design Constitution Section 3.9.3:
 * - Show "Saving..." indicator
 * - Show "Saved ✓" confirmation
 * - Never lose work. Ever.
 */
export function AutoSaveIndicator({
  status,
  lastSaved,
  error,
  isDirty,
  className,
  compact = false,
}: AutoSaveIndicatorProps) {
  // Don't show anything when idle and not dirty and never saved
  if (status === 'idle' && !isDirty && !lastSaved) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 text-sm transition-opacity duration-200',
        compact ? 'px-2 py-1' : 'px-3 py-1.5',
        className
      )}
    >
      {/* Saving */}
      {status === 'saving' && (
        <>
          <Loader2 className="h-4 w-4 animate-spin text-text-muted" />
          {!compact && <span className="text-text-muted">Saving...</span>}
        </>
      )}

      {/* Saved */}
      {status === 'saved' && (
        <>
          <Check className="h-4 w-4 text-success" />
          {!compact && (
            <span className="text-success">
              Saved {lastSaved && formatLastSaved(lastSaved)}
            </span>
          )}
        </>
      )}

      {/* Error */}
      {status === 'error' && (
        <>
          <AlertCircle className="h-4 w-4 text-danger" />
          {!compact && (
            <span className="text-danger">{error || 'Save failed'}</span>
          )}
        </>
      )}

      {/* Idle with unsaved changes */}
      {status === 'idle' && isDirty && (
        <>
          <Cloud className="h-4 w-4 text-warning" />
          {!compact && <span className="text-warning">Unsaved changes</span>}
        </>
      )}

      {/* Idle, saved, showing last saved time */}
      {status === 'idle' && !isDirty && lastSaved && (
        <>
          <Check className="h-4 w-4 text-text-muted" />
          {!compact && (
            <span className="text-text-muted">
              Saved {formatLastSaved(lastSaved)}
            </span>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Compact badge version for tight spaces
 */
export function AutoSaveBadge({
  status,
  lastSaved,
  isDirty,
}: Pick<AutoSaveIndicatorProps, 'status' | 'lastSaved' | 'isDirty'>) {
  // Don't show when idle and clean
  if (status === 'idle' && !isDirty) {
    return null;
  }

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center',
        'w-6 h-6 rounded-full',
        'transition-all duration-200',
        status === 'saving' && 'bg-muted',
        status === 'saved' && 'bg-success/10',
        status === 'error' && 'bg-danger/10',
        status === 'idle' && isDirty && 'bg-warning/10'
      )}
    >
      {status === 'saving' && (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-text-muted" />
      )}
      {status === 'saved' && <Check className="h-3.5 w-3.5 text-success" />}
      {status === 'error' && <AlertCircle className="h-3.5 w-3.5 text-danger" />}
      {status === 'idle' && isDirty && (
        <Cloud className="h-3.5 w-3.5 text-warning" />
      )}
    </div>
  );
}
