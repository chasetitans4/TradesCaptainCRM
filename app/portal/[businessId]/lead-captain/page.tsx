'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

// This page is a business management feature - redirect customers to home
// Business owners should use the business dashboard (/dashboard/settings) instead
export default function LeadCaptainSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const businessId = params.businessId as string;

  useEffect(() => {
    // Redirect to customer home - this feature is for business owners only
    router.replace(`/portal/${businessId}/home`);
  }, [businessId, router]);

  return null;
}
