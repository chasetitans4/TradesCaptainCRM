'use client';

// =====================================================
// OFFLINE FALLBACK PAGE
// Shown when user is offline and page is not cached
// =====================================================

import { useState, useEffect } from 'react';
import { WifiOff, RefreshCw, Home, Clock } from 'lucide-react';
import { Button } from '@/components/ui';

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    // Check initial online status
    setIsOnline(navigator.onLine);

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true);
      // Redirect to dashboard when back online
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1000);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check pending mutations count
    checkPendingMutations();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  async function checkPendingMutations() {
    try {
      const { getPendingMutationCount } = await import('@/lib/offline/mutation-queue');
      const count = await getPendingMutationCount();
      setPendingCount(count);
    } catch {
      // IndexedDB not available
    }
  }

  function handleRetry() {
    window.location.reload();
  }

  function handleGoHome() {
    window.location.href = '/dashboard';
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Icon */}
        <div className="w-20 h-20 mx-auto rounded-full bg-muted flex items-center justify-center">
          <WifiOff className="w-10 h-10 text-text-muted" />
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-text">You&apos;re Offline</h1>
          <p className="text-text-muted">
            {isOnline
              ? 'Connection restored! Redirecting...'
              : 'Check your internet connection and try again.'}
          </p>
        </div>

        {/* Pending changes notice */}
        {pendingCount > 0 && (
          <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
            <div className="flex items-center justify-center gap-2 text-warning">
              <Clock className="w-5 h-5" />
              <span className="font-medium">
                {pendingCount} pending {pendingCount === 1 ? 'change' : 'changes'}
              </span>
            </div>
            <p className="text-sm text-text-muted mt-2">
              Your changes will sync automatically when you&apos;re back online.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={handleRetry} disabled={isOnline}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isOnline ? 'animate-spin' : ''}`} />
            {isOnline ? 'Reconnecting...' : 'Try Again'}
          </Button>
          <Button variant="outline" onClick={handleGoHome}>
            <Home className="w-4 h-4 mr-2" />
            Go to Dashboard
          </Button>
        </div>

        {/* Offline tips */}
        <div className="pt-6 border-t border-border">
          <h2 className="text-sm font-medium text-text mb-3">While Offline You Can:</h2>
          <ul className="text-sm text-text-muted space-y-2">
            <li className="flex items-center justify-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-success" />
              View cached customer data
            </li>
            <li className="flex items-center justify-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-success" />
              Create and edit jobs (syncs when online)
            </li>
            <li className="flex items-center justify-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-success" />
              Access previously viewed pages
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
