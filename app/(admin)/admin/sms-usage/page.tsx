'use client';

// =====================================================
// SMS USAGE MONITOR PAGE
// Track client SMS usage and soft caps
// Version: 5.8
// =====================================================

import { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UsageOverview, ClientUsageList } from '@/components/admin/sms-usage';
import { useAgentOrHigher } from '@/hooks/useAdminAuth';
import { AdminPageHeader } from '@/components/admin/page-header';

interface ClientSmsUsage {
  client_id: string;
  client_name: string;
  plan_type: string;
  soft_cap: number;
  messages_used: number;
  usage_percent: number;
  overage_count: number;
  overage_cost: number;
  recommended_upgrade: string | null;
}

interface UsageSummary {
  total_clients: number;
  over_cap: number;
  near_cap: number;
  under_cap: number;
  total_messages: number;
  total_overage_revenue: number;
}

export default function SmsUsagePage() {
  const { loading: authLoading, isAuthorized } = useAgentOrHigher();
  const [clients, setClients] = useState<ClientSmsUsage[]>([]);
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'over' | 'near' | 'under'>('all');

  const fetchUsage = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/sms-usage');
      if (res.ok) {
        const data = await res.json();
        setClients(data.clients || []);
        setSummary(data.summary || null);
      }
    } catch (error) {
      console.error('Failed to fetch SMS usage:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  if (authLoading || !isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const handleClientClick = (clientId: string) => {
    // Navigate to client detail or open modal
    window.location.href = `/admin/clients/${clientId}`;
  };

  // Filter clients based on selection
  const filteredClients = clients.filter((client) => {
    switch (filter) {
      case 'over':
        return client.usage_percent >= 100;
      case 'near':
        return client.usage_percent >= 80 && client.usage_percent < 100;
      case 'under':
        return client.usage_percent < 80;
      default:
        return true;
    }
  });

  return (
    <div className="space-y-6 p-6">
      <AdminPageHeader
        title="SMS Usage Monitor"
        description="Track client SMS usage and soft caps."
        icon={MessageSquare}
        breadcrumb={[{ label: 'SMS Usage' }]}
        actions={
          <div className="flex gap-2">
            {[
              { id: 'all', label: 'All' },
              { id: 'over', label: 'Over Cap' },
              { id: 'near', label: 'Near Cap' },
              { id: 'under', label: 'Safe' },
            ].map((f) => (
              <Button
                key={f.id}
                variant={filter === f.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(f.id as any)}
              >
                {f.label}
              </Button>
            ))}
          </div>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <UsageOverview summary={summary} loading={loading} />

          <ClientUsageList
            clients={filteredClients}
            loading={loading}
            onClientClick={handleClientClick}
          />
        </>
      )}
    </div>
  );
}
