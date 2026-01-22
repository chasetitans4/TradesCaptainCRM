'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/**
 * Admin Jobs Route
 *
 * This page doesn't exist in the Admin Portal.
 * Jobs functionality is available in the Business Dashboard.
 * Redirects to CRM Accounts where you can view business account details.
 */
export default function AdminJobsPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to accounts - where admin can view business details
    router.replace('/admin/accounts');
  }, [router]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Redirecting to CRM Accounts...</p>
      </div>
    </div>
  );
}
