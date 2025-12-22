'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUserProfile } from '@/lib/supabase/client';
import { hasPermission } from '@/lib/permissions';
import type { UserWithBusiness } from '@/types';
import { DispatchBoard } from '@/components/dispatch';

export default function DispatchPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserWithBusiness | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const profile = await getCurrentUserProfile();
      if (!profile) {
        router.push('/login');
        return;
      }

      // Only admins and managers can access dispatch board
      if (!hasPermission(profile.role, 'manage_team')) {
        router.push('/jobs');
        return;
      }

      setUser(profile as UserWithBusiness);
      setLoading(false);
    }
    loadUser();
  }, [router]);

  if (loading || !user) {
    return <DispatchSkeleton />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky-header bg-background border-b border-border">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-text">Dispatch Board</h1>
              <p className="text-sm text-text-muted">
                Schedule and assign jobs to technicians
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Dispatch Board */}
      <div className="p-4 h-[calc(100vh-80px)]">
        <DispatchBoard />
      </div>
    </div>
  );
}

function DispatchSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky-header bg-background border-b border-border">
        <div className="px-4 py-3">
          <div className="h-7 w-40 skeleton rounded mb-1" />
          <div className="h-4 w-60 skeleton rounded" />
        </div>
      </header>
      <div className="p-4">
        <div className="flex gap-4">
          <div className="w-72 h-[500px] skeleton rounded-lg" />
          <div className="flex-1 flex gap-4 overflow-hidden">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-72 h-[500px] skeleton rounded-lg flex-shrink-0" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
