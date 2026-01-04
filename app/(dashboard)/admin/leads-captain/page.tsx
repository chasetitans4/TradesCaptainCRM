'use client';

// =====================================================
// LEADS CAPTAIN DASHBOARD PAGE
// Central hub for agents to monitor AI SMS performance
// Version: 5.8
// =====================================================

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MessageSquare, Download, Loader2 } from 'lucide-react';
import {
  LeadsCaptainSummaryCards,
  LeadsCaptainClientList,
  LeadsCaptainAlertsPanel,
  LeadsCaptainClientDetail,
  LeadsCaptainConversationViewer,
} from '@/components/admin/leads-captain';
import { useAgentOrHigher } from '@/hooks/useAdminAuth';
import { logger } from '@/lib/logger';

const PERIODS = [
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
];

interface DashboardData {
  summary: {
    total_missed_calls: number;
    total_leads_captured: number;
    total_appointments_booked: number;
    response_rate: number;
    missed_calls_change: number;
  };
  usage_overview: {
    total_clients: number;
    total_sms_sent: number;
    total_sms_capacity: number;
    overall_usage_percent: number;
  };
}

interface ClientSummary {
  client_id: string;
  client_name: string;
  plan_type: string;
  sms_used: number;
  sms_cap: number;
  leads_captured: number;
  status: 'healthy' | 'near_cap' | 'over_cap' | 'low_usage';
  usage_percentage: number;
}

interface Alert {
  type: 'near_cap' | 'over_cap' | 'low_usage' | 'declining_rate';
  client_id: string;
  client_name: string;
  message: string;
  details?: string;
}

export default function LeadsCaptainDashboardPage() {
  const { loading: authLoading, isAuthorized } = useAgentOrHigher();
  const adminLeadsCaptainLogger = logger.child({ context: 'admin.leads-captain' });
  const [period, setPeriod] = useState('this_month');
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [clientDetail, setClientDetail] = useState<any>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  // Fetch dashboard data
  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const [dashRes, clientsRes, alertsRes] = await Promise.all([
        fetch(`/api/leads-captain/dashboard?period=${period}`),
        fetch('/api/leads-captain/clients'),
        fetch('/api/leads-captain/alerts'),
      ]);

      if (dashRes.ok) {
        const data = await dashRes.json();
        setDashboardData(data);
      }

      if (clientsRes.ok) {
        const data = await clientsRes.json();
        setClients(data.clients || []);
      }

      if (alertsRes.ok) {
        const data = await alertsRes.json();
        setAlerts(data.alerts || []);
      }
    } catch (error) {
      adminLeadsCaptainLogger.error({
        msg: 'Failed to fetch admin dashboard',
        error: error instanceof Error ? error.message : String(error),
        period,
      });
    } finally {
      setLoading(false);
    }
  }, [period]);

  // Fetch client detail
  const fetchClientDetail = useCallback(async (clientId: string) => {
    try {
      setDetailLoading(true);
      const [detailRes, convsRes] = await Promise.all([
        fetch(`/api/leads-captain/clients/${clientId}`),
        fetch(`/api/leads-captain/clients/${clientId}/conversations?limit=10`),
      ]);

      if (detailRes.ok) {
        const data = await detailRes.json();
        setClientDetail(data);
      }

      if (convsRes.ok) {
        const data = await convsRes.json();
        setConversations(data.conversations || []);
      }
    } catch (error) {
      adminLeadsCaptainLogger.error({
        msg: 'Failed to fetch client detail',
        error: error instanceof Error ? error.message : String(error),
        clientId,
      });
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    if (selectedClientId) {
      fetchClientDetail(selectedClientId);
    }
  }, [selectedClientId, fetchClientDetail]);

  if (authLoading || !isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(clientId);
  };

  const handleBackToList = () => {
    setSelectedClientId(null);
    setClientDetail(null);
    setConversations([]);
  };

  const handleExport = () => {
    window.open(`/api/leads-captain/export?period=${period}`, '_blank');
  };

  const handleSuggestUpgrade = (clientId: string) => {
    // In production, this would open an upgrade suggestion modal/flow
    adminLeadsCaptainLogger.info({
      msg: 'Suggest upgrade for client',
      clientId,
    });
  };

  const handleScheduleCheckIn = (clientId: string) => {
    // In production, this would open a scheduling modal
    adminLeadsCaptainLogger.info({
      msg: 'Schedule check-in for client',
      clientId,
    });
  };

  // Show client detail view
  if (selectedClientId) {
    return (
      <div className="space-y-6">
        <LeadsCaptainClientDetail
          data={clientDetail}
          loading={detailLoading}
          onBack={handleBackToList}
          onContactClient={() =>
            adminLeadsCaptainLogger.info({
              msg: 'Contact client action',
              clientId: selectedClientId || undefined,
            })
          }
          onSuggestUpgrade={() => handleSuggestUpgrade(selectedClientId)}
        />

        <LeadsCaptainConversationViewer
          conversations={conversations}
          loading={detailLoading}
          onViewAll={() =>
            adminLeadsCaptainLogger.info({
              msg: 'View all conversations action',
              clientId: selectedClientId || undefined,
            })
          }
        />
      </div>
    );
  }

  // Main dashboard view
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">Leads Captain Dashboard</h1>
        </div>

        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              {PERIODS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <LeadsCaptainSummaryCards data={dashboardData?.summary} loading={loading} />

      {/* Alerts Panel */}
      <LeadsCaptainAlertsPanel
        alerts={alerts}
        loading={loading}
        onSuggestUpgrade={handleSuggestUpgrade}
        onScheduleCheckIn={handleScheduleCheckIn}
        onReviewConversations={handleClientSelect}
        onFlagForSupport={(clientId) =>
          adminLeadsCaptainLogger.info({
            msg: 'Flag for support',
            clientId,
          })
        }
      />

      {/* Client List */}
      <LeadsCaptainClientList
        clients={clients}
        loading={loading}
        onClientSelect={handleClientSelect}
        onSuggestUpgrade={handleSuggestUpgrade}
      />
    </div>
  );
}
