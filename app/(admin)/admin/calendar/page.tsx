'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/**
 * Admin Calendar Route
 *
 * This page doesn't exist in the Admin Portal.
 * Calendar functionality is available in the Business Dashboard.
 * Redirects to the Admin Dashboard.
 */
export default function AdminCalendarPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to admin dashboard
    router.replace('/admin');
  }, [router]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Redirecting to Dashboard...</p>
      </div>
    </div>
  );
}
