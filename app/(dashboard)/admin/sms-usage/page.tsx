'use client';

// =====================================================
// SMS USAGE MONITOR PAGE
// Track client SMS usage and soft caps
// Version: 5.8
// =====================================================

import { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Loader2 } from 'lucide-react';
import { UsageOverview, ClientUsageList } from '@/components/admin/sms-usage';
import { useAgentOrHigher } from '@/hooks/useAdminAuth';

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <MessageSquare className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">SMS Usage Monitor</h1>
          <p className="text-muted-foreground">
            Track client SMS usage and soft caps
          </p>
        </div>
      </div>

      {/* Overview Cards */}
      <UsageOverview summary={summary} loading={loading} />

      {/* Filters */}
      <div className="flex gap-2">
        <button
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'all'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted hover:bg-muted/80'
          }`}
          onClick={() => setFilter('all')}
        >
          All ({clients.length})
        </button>
        <button
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'over'
              ? 'bg-destructive text-destructive-foreground'
              : 'bg-muted hover:bg-muted/80'
          }`}
          onClick={() => setFilter('over')}
        >
          Over Cap ({summary?.over_cap || 0})
        </button>
        <button
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'near'
              ? 'bg-yellow-500 text-white'
              : 'bg-muted hover:bg-muted/80'
          }`}
          onClick={() => setFilter('near')}
        >
          Near Cap ({summary?.near_cap || 0})
        </button>
        <button
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'under'
              ? 'bg-green-500 text-white'
              : 'bg-muted hover:bg-muted/80'
          }`}
          onClick={() => setFilter('under')}
        >
          Under Cap ({summary?.under_cap || 0})
        </button>
      </div>

      {/* Client List */}
      <ClientUsageList
        clients={filteredClients}
        loading={loading}
        onClientClick={handleClientClick}
      />

      {/* Important Note */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">
          📱 SMS Soft Cap Policy
        </h3>
        <p className="text-sm text-blue-800">
          We <strong>never</strong> cut customers off when they exceed their SMS
          cap. Instead, we alert you (the agent) to proactively discuss upgrade
          options with them. Overage messages are billed at tiered rates, which
          can be a great upsell opportunity!
        </p>
      </div>
    </div>
  );
}
