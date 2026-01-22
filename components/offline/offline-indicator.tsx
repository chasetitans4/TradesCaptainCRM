'use client';

// =====================================================
// OFFLINE INDICATOR COMPONENT
// Shows connection status and pending sync count
// =====================================================

import { useState, useEffect } from 'react';
import { WifiOff, Wifi, Cloud, CloudOff, RefreshCw, AlertCircle } from 'lucide-react';
import { useOffline } from '@/lib/offline/context';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';

interface OfflineIndicatorProps {
  // Position of the indicator
  position?: 'top' | 'bottom';
  // Show detailed sync info
  showDetails?: boolean;
  // Custom className
  className?: string;
}

export function OfflineIndicator({
  position = 'bottom',
  showDetails = false,
  className,
}: OfflineIndicatorProps) {
  const {
    isOnline,
    isSyncing,
    pendingMutations,
    syncError,
    lastSyncAt,
    triggerSync,
    processPendingMutations,
  } = useOffline();

  const [isExpanded, setIsExpanded] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  // Show banner when offline or has pending mutations
  useEffect(() => {
    if (!isOnline || pendingMutations > 0 || syncError) {
      setShowBanner(true);
    } else {
      // Hide after a delay when back online with no pending
      const timer = setTimeout(() => setShowBanner(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, pendingMutations, syncError]);

  if (!showBanner && !showDetails) {
    return null;
  }

  const positionClasses = position === 'top'
    ? 'top-0 left-0 right-0'
    : 'bottom-0 left-0 right-0';

  return (
    <div
      className={cn(
        'fixed z-50 px-4 py-2 transition-all duration-300',
        positionClasses,
        showBanner ? 'translate-y-0' : position === 'top' ? '-translate-y-full' : 'translate-y-full',
        className
      )}
    >
      <div
        className={cn(
          'max-w-md mx-auto rounded-lg shadow-lg border px-4 py-3',
          !isOnline
            ? 'bg-warning/10 border-warning/20 text-warning'
            : syncError
              ? 'bg-danger/10 border-danger/20 text-danger'
              : pendingMutations > 0
                ? 'bg-primary/10 border-primary/20 text-primary'
                : 'bg-success/10 border-success/20 text-success'
        )}
      >
        <div className="flex items-center justify-between gap-3">
          {/* Status icon and message */}
          <div className="flex items-center gap-2">
            {!isOnline ? (
              <>
                <WifiOff className="w-5 h-5" />
                <span className="font-medium">You&apos;re offline</span>
              </>
            ) : isSyncing ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span className="font-medium">Syncing...</span>
              </>
            ) : syncError ? (
              <>
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">Sync error</span>
              </>
            ) : pendingMutations > 0 ? (
              <>
                <Cloud className="w-5 h-5" />
                <span className="font-medium">
                  {pendingMutations} pending {pendingMutations === 1 ? 'change' : 'changes'}
                </span>
              </>
            ) : (
              <>
                <Wifi className="w-5 h-5" />
                <span className="font-medium">Online</span>
              </>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {isOnline && pendingMutations > 0 && !isSyncing && (
              <Button
                size="sm"
                variant="ghost"
                onClick={processPendingMutations}
                className="h-7 px-2"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Sync now
              </Button>
            )}

            {showDetails && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-7 px-2"
              >
                {isExpanded ? 'Hide' : 'Details'}
              </Button>
            )}
          </div>
        </div>

        {/* Expanded details */}
        {isExpanded && showDetails && (
          <div className="mt-3 pt-3 border-t border-current/20 text-sm space-y-1">
            <p>
              <span className="opacity-70">Status:</span>{' '}
              {isOnline ? 'Online' : 'Offline'}
            </p>
            <p>
              <span className="opacity-70">Pending changes:</span>{' '}
              {pendingMutations}
            </p>
            {lastSyncAt && (
              <p>
                <span className="opacity-70">Last sync:</span>{' '}
                {new Date(lastSyncAt).toLocaleTimeString()}
              </p>
            )}
            {syncError && (
              <p className="text-danger">
                <span className="opacity-70">Error:</span>{' '}
                {syncError}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Compact version for header/navbar
export function OfflineStatusBadge({ className }: { className?: string }) {
  const { isOnline, isSyncing, pendingMutations } = useOffline();

  if (isOnline && pendingMutations === 0 && !isSyncing) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
        !isOnline
          ? 'bg-warning/10 text-warning'
          : isSyncing
            ? 'bg-primary/10 text-primary'
            : 'bg-muted text-text-muted',
        className
      )}
    >
      {!isOnline ? (
        <>
          <WifiOff className="w-3 h-3" />
          <span>Offline</span>
        </>
      ) : isSyncing ? (
        <>
          <RefreshCw className="w-3 h-3 animate-spin" />
          <span>Syncing</span>
        </>
      ) : (
        <>
          <Cloud className="w-3 h-3" />
          <span>{pendingMutations}</span>
        </>
      )}
    </div>
  );
}
