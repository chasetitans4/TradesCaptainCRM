'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { AlertTriangle, RefreshCw, Home, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logger } from '@/lib/logger';

const portalErrorLogger = logger.child({ context: 'portal.error' });

export default function PortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const params = useParams();
  const businessId = params.businessId as string;

  useEffect(() => {
    portalErrorLogger.error({
      msg: 'Portal error',
      businessId,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        digest: error.digest,
      },
    });
  }, [error, businessId]);

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-gray-50">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-10 h-10 text-red-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Something went wrong
        </h1>
        <p className="text-gray-600 mb-6">
          We encountered an unexpected error while loading this page. Please try
          again or contact support if the problem persists.
        </p>
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-6 p-4 bg-gray-100 rounded-lg text-left">
            <p className="text-sm font-medium text-gray-700 mb-1">
              Error Details (dev only):
            </p>
            <p className="text-sm text-gray-600 font-mono break-all">
              {error.message}
            </p>
            {error.digest && (
              <p className="text-xs text-gray-500 mt-2">
                Digest: {error.digest}
              </p>
            )}
          </div>
        )}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button onClick={reset} className="w-full sm:w-auto gap-2">
            <RefreshCw className="w-4 h-4" />
            Try Again
          </Button>
          <Button variant="outline" asChild className="w-full sm:w-auto">
            <a href={`/portal/${businessId}`} className="gap-2">
              <Home className="w-4 h-4" />
              Go to Dashboard
            </a>
          </Button>
          <Button variant="ghost" asChild className="w-full sm:w-auto">
            <a href={`/portal/${businessId}/messages`} className="gap-2">
              <MessageCircle className="w-4 h-4" />
              Contact Support
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
