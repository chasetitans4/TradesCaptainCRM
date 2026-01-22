'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/**
 * Admin Messages Route
 *
 * This page doesn't exist in the Admin Portal.
 * Messages functionality is available in the Business Dashboard.
 * Redirects to Support Tickets for admin message handling.
 */
export default function AdminMessagesPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to support tickets - the admin equivalent of messages
    router.replace('/admin/tickets');
  }, [router]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Redirecting to Support Tickets...</p>
      </div>
    </div>
  );
}
