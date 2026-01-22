'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Calendar, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CalendarError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console for debugging
    console.error('Calendar page error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-background">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-6">
          <Calendar className="w-10 h-10 text-amber-500" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Calendar Loading Error</h1>
        <p className="text-muted-foreground mb-4">
          We had trouble loading your calendar. This might be due to a connection issue or missing configuration.
        </p>
        <p className="text-sm text-muted-foreground mb-8">
          Error: {error.message || 'Unknown error'}
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button onClick={reset} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Try Again
          </Button>
          <Button variant="outline" asChild>
            <a href="/dashboard" className="gap-2">
              <Home className="w-4 h-4" />
              Go Home
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
