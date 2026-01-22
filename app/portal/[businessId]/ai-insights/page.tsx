'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

// This page shows AI/communication analytics - redirect customers to messages
// where they can communicate directly with the business
export default function AIInsightsPage() {
  const params = useParams();
  const router = useRouter();
  const businessId = params.businessId as string;

  useEffect(() => {
    // Redirect to messages - customers should communicate through messages
    router.replace(`/portal/${businessId}/messages`);
  }, [businessId, router]);

  return null;
}
