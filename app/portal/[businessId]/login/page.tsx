'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PortalLogin } from '@/components/portal/portal-login';

interface BusinessInfo {
  id: string;
  name: string;
  logo_url?: string;
  primary_color?: string;
}

export default function PortalLoginPage() {
  const params = useParams();
  const router = useRouter();
  const businessId = params.businessId as string;

  const [business, setBusiness] = useState<BusinessInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadBusiness() {
      try {
        const response = await fetch(`/api/portal/business?id=${businessId}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || 'Business not found');
          return;
        }

        setBusiness(data);
      } catch (_err) {
        setError('Unable to load business information');
      } finally {
        setLoading(false);
      }
    }

    loadBusiness();
  }, [businessId]);

  const handleSuccess = () => {
    router.push(`/portal/${businessId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 bg-gray-200 rounded-lg mb-4" />
          <div className="h-4 w-32 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (error || !business) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Portal Unavailable</h1>
          <p className="text-gray-500">{error || 'This portal is not available'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="w-full max-w-md">
        <PortalLogin
          businessId={businessId}
          businessName={business.name}
          primaryColor={business.primary_color}
          logoUrl={business.logo_url}
          onSuccess={handleSuccess}
        />
      </div>
    </div>
  );
}
