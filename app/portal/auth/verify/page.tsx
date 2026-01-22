'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

function MagicLinkVerifyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get('token');
    const business = searchParams.get('business');

    if (!token || !business) {
      setStatus('error');
      setError('Invalid or missing link parameters');
      return;
    }

    setBusinessId(business);

    async function verifyToken() {
      try {
        const response = await fetch('/api/portal/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'verify-magic-link',
            businessId: business,
            token,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          setStatus('error');
          setError(data.error || 'Verification failed');
          return;
        }

        setStatus('success');
        // Redirect to portal after short delay
        setTimeout(() => {
          router.push(`/portal/${business}`);
        }, 2000);
      } catch {
        setStatus('error');
        setError('An unexpected error occurred');
      }
    }

    verifyToken();
  }, [searchParams, router]);

  return (
    <Card className="w-full max-w-md">
      <CardContent className="pt-6">
        {status === 'loading' && (
          <div className="text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="h-6 w-6 text-primary animate-spin" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Verifying your link...</h3>
              <p className="text-muted-foreground mt-1">
                Please wait while we sign you in
              </p>
            </div>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Successfully signed in!</h3>
              <p className="text-muted-foreground mt-1">
                Redirecting you to the portal...
              </p>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Verification Failed</h3>
              <p className="text-muted-foreground mt-1">{error}</p>
            </div>
            {businessId && (
              <Button
                onClick={() => router.push(`/portal/${businessId}/login`)}
                className="w-full"
              >
                Return to Login
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LoadingFallback() {
  return (
    <Card className="w-full max-w-md">
      <CardContent className="pt-6">
        <div className="text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Loader2 className="h-6 w-6 text-primary animate-spin" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Loading...</h3>
            <p className="text-muted-foreground mt-1">Please wait</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MagicLinkVerifyPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Suspense fallback={<LoadingFallback />}>
        <MagicLinkVerifyContent />
      </Suspense>
    </div>
  );
}
