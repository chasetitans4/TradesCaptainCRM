'use client';

// =====================================================
// CLIENT ONBOARDING PAGE
// Track and manage client onboarding progress
// Version: 5.8
// =====================================================

import { useState, useEffect, useCallback } from 'react';
import { ClipboardCheck, Loader2 } from 'lucide-react';
import { OnboardingList, OnboardingDetail } from '@/components/admin/onboarding';
import { useAgentOrHigher } from '@/hooks/useAdminAuth';
import { AdminPageHeader } from '@/components/admin/page-header';
import { logger } from '@/lib/logger';
const adminOnboardingLogger = logger.child({ context: 'admin.onboarding' });

interface OnboardingTask {
  id: string;
  phase: number;
  title: string;
  description: string | null;
  assigned_to: 'agent' | 'client' | 'support';
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  completed_at: string | null;
  notes: string | null;
}

interface ClientOnboarding {
  id: string;
  client_id: string;
  client_name: string;
  plan_track: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'stalled';
  started_at: string | null;
  completed_at: string | null;
  tasks: OnboardingTask[];
  progress_percent: number;
  days_in_onboarding: number;
}

export default function OnboardingPage() {
  const { loading: authLoading, isAuthorized } = useAgentOrHigher();
  const [onboardings, setOnboardings] = useState<ClientOnboarding[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedOnboarding, setSelectedOnboarding] =
    useState<ClientOnboarding | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  // Fetch all active onboardings
  const fetchOnboardings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/onboarding/in-progress');
      if (res.ok) {
        const data = await res.json();
        setOnboardings(data.onboardings || []);
      }
    } catch (error) {
      adminOnboardingLogger.error({
        msg: 'Failed to fetch onboardings',
        error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) },
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch specific client onboarding
  const fetchClientOnboarding = useCallback(async (clientId: string) => {
    try {
      setDetailLoading(true);
      const res = await fetch(`/api/onboarding/clients/${clientId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedOnboarding(data);
      }
    } catch (error) {
      adminOnboardingLogger.error({
        msg: 'Failed to fetch client onboarding',
        clientId,
        error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) },
      });
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOnboardings();
  }, [fetchOnboardings]);

  useEffect(() => {
    if (selectedClientId) {
      fetchClientOnboarding(selectedClientId);
    }
  }, [selectedClientId, fetchClientOnboarding]);

  if (authLoading || !isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const handleClientClick = (clientId: string) => {
    setSelectedClientId(clientId);
  };

  const handleBack = () => {
    setSelectedClientId(null);
    setSelectedOnboarding(null);
    fetchOnboardings(); // Refresh list
  };

  const handleTaskUpdate = async (
    taskId: string,
    status: 'pending' | 'in_progress' | 'completed' | 'blocked',
    notes?: string
  ) => {
    if (!selectedClientId) return;

    try {
      const res = await fetch(
        `/api/onboarding/clients/${selectedClientId}/tasks/${taskId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status, notes }),
        }
      );

      if (res.ok) {
        fetchClientOnboarding(selectedClientId);
      }
    } catch (error) {
      adminOnboardingLogger.error({
        msg: 'Failed to update onboarding task',
        clientId: selectedClientId,
        taskId,
        status,
        error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) },
      });
    }
  };

  // Show detail view
  if (selectedClientId && selectedOnboarding) {
    return (
      <OnboardingDetail
        onboarding={selectedOnboarding}
        loading={detailLoading}
        onBack={handleBack}
        onTaskUpdate={handleTaskUpdate}
      />
    );
  }

  // Main list view
  return (
    <div className="space-y-6 p-6">
      <AdminPageHeader
        title="Client Onboarding"
        description="Track and manage new client implementation progress."
        icon={ClipboardCheck}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Active</div>
          <div className="text-2xl font-bold">
            {onboardings.filter((o) => o.status === 'in_progress').length}
          </div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Stalled (&gt;14d)</div>
          <div className="text-2xl font-bold text-destructive">
            {onboardings.filter((o) => o.days_in_onboarding > 14).length}
          </div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Avg Days</div>
          <div className="text-2xl font-bold">
            {onboardings.length > 0
              ? Math.round(
                  onboardings.reduce((sum, o) => sum + o.days_in_onboarding, 0) /
                    onboardings.length
                )
              : 0}
          </div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Avg Progress</div>
          <div className="text-2xl font-bold">
            {onboardings.length > 0
              ? Math.round(
                  onboardings.reduce((sum, o) => sum + o.progress_percent, 0) /
                    onboardings.length
                )
              : 0}
            %
          </div>
        </div>
      </div>

      {/* Onboarding List */}
      <OnboardingList
        onboardings={onboardings}
        loading={loading}
        onClientClick={handleClientClick}
      />
    </div>
  );
}
