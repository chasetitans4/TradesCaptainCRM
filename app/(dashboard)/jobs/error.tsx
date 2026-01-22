'use client';

import { useEffect } from 'react';
import { Briefcase, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function JobsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Jobs page error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-background">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
          <Briefcase className="w-10 h-10 text-green-500" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Jobs Loading Error</h1>
        <p className="text-muted-foreground mb-4">
          We had trouble loading your jobs. Please try again.
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
