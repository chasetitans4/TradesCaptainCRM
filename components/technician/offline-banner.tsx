'use client';

import { WifiOff, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OfflineBannerProps {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  onTriggerSync: () => void;
}

/**
 * Thin banner shown at the top of My Day when offline or when pending mutations exist.
 * Stays out of the way — only shows when there's something to communicate.
 */
export function OfflineBanner({
  isOnline,
  pendingCount,
  isSyncing,
  onTriggerSync,
}: OfflineBannerProps) {
  // Nothing to show when online with no pending changes
  if (isOnline && pendingCount === 0) return null;

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg text-sm animate-slide-down',
        !isOnline
          ? 'bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300'
          : 'bg-primary/5 border border-primary/10 text-primary'
      )}
    >
      <div className="flex items-center gap-2">
        {!isOnline ? (
          <WifiOff className="h-4 w-4 shrink-0" />
        ) : (
          <RefreshCw className={cn('h-4 w-4 shrink-0', isSyncing && 'animate-spin')} />
        )}
        <span className="font-medium">
          {!isOnline
            ? 'You\'re offline — changes will sync when reconnected'
            : isSyncing
              ? 'Syncing changes...'
              : `${pendingCount} change${pendingCount !== 1 ? 's' : ''} waiting to sync`}
        </span>
      </div>

      {isOnline && pendingCount > 0 && !isSyncing && (
        <button
          onClick={onTriggerSync}
          className="text-xs font-semibold px-3 py-1 rounded-md bg-primary/10 hover:bg-primary/20 transition-colors shrink-0"
        >
          Sync now
        </button>
      )}
    </div>
  );
}
