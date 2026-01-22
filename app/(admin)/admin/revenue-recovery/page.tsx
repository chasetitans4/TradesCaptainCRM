'use client';

import { useState, useEffect } from 'react';
import {
  Building2,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  RefreshCcw,
  Settings,
  TrendingUp,
  Users,
  Activity,
  X,
} from 'lucide-react';
import { format } from 'date-fns';
import { useAgentOrHigher } from '@/hooks/useAdminAuth';
import { AdminPageHeader } from '@/components/admin/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface PlatformStats {
  totalInfluencedRevenue: number;
  activeClientsCount: number;
  avgRecoveryRate: number;
  avgLatencyHours: number;
  periodComparison: {
    revenueChange: number;
    rateChange: number;
  };
}

interface ClientRecoveryData {
  id: string;
  businessName: string;
  recoveryEnabled: boolean;
  recoveryLocked: boolean;
  clientCanDisable: boolean;
  attributionWindowHours: number;
  totalInfluenced: number;
  recoveryRate: number;
  lastActivity: string | null;
}

interface ClientSettings {
  recoveryEnabled: boolean;
  recoveryLocked: boolean;
  clientCanDisable: boolean;
  attributionWindowHours: number;
}

export default function RevenueRecoveryPage() {
  const { loading: authLoading, isAuthorized } = useAgentOrHigher();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [clients, setClients] = useState<ClientRecoveryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<ClientRecoveryData | null>(null);
  const [clientSettings, setClientSettings] = useState<ClientSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isAuthorized) {
      fetchData();
    }
  }, [isAuthorized]);

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, clientsRes] = await Promise.all([
        fetch('/api/admin/revenue-recovery/overview'),
        fetch('/api/admin/revenue-recovery/clients'),
      ]);

      if (!statsRes.ok || !clientsRes.ok) {
        throw new Error('Failed to fetch revenue recovery data');
      }

      const [statsData, clientsData] = await Promise.all([
        statsRes.json(),
        clientsRes.json(),
      ]);

      setStats(statsData);
      setClients(clientsData.clients || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }

  function openClientSettings(client: ClientRecoveryData) {
    setSelectedClient(client);
    setClientSettings({
      recoveryEnabled: client.recoveryEnabled,
      recoveryLocked: client.recoveryLocked,
      clientCanDisable: client.clientCanDisable,
      attributionWindowHours: client.attributionWindowHours,
    });
  }

  async function saveClientSettings() {
    if (!selectedClient || !clientSettings) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/revenue-recovery/clients/${selectedClient.id}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientSettings),
      });

      if (!res.ok) throw new Error('Failed to update settings');

      setSelectedClient(null);
      setClientSettings(null);
      fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  }

  if (authLoading) return null;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="p-6 border-b border-border bg-background">
        <AdminPageHeader
          title="Revenue Recovery"
          description="Platform-wide recovery automation and attribution tracking"
          icon={TrendingUp}
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              className="gap-2"
            >
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </Button>
          }
        />
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {error && (
          <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            {error}
          </div>
        )}

        {/* Platform Stats */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-6 animate-pulse">
                <div className="h-4 bg-muted rounded w-1/2 mb-4" />
                <div className="h-8 bg-muted rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-6">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <DollarSign className="h-4 w-4" />
                <span className="text-sm">Total Influenced Revenue</span>
              </div>
              <div className="text-2xl font-bold text-foreground">
                ${stats.totalInfluencedRevenue.toLocaleString()}
              </div>
              {stats.periodComparison.revenueChange !== 0 && (
                <div className={`text-sm mt-1 ${stats.periodComparison.revenueChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stats.periodComparison.revenueChange > 0 ? '+' : ''}{stats.periodComparison.revenueChange}% vs last month
                </div>
              )}
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Users className="h-4 w-4" />
                <span className="text-sm">Active Clients</span>
              </div>
              <div className="text-2xl font-bold text-foreground">
                {stats.activeClientsCount}
              </div>
              <div className="text-sm mt-1 text-muted-foreground">
                with recovery enabled
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm">Avg Recovery Rate</span>
              </div>
              <div className="text-2xl font-bold text-foreground">
                {stats.avgRecoveryRate.toFixed(1)}%
              </div>
              {stats.periodComparison.rateChange !== 0 && (
                <div className={`text-sm mt-1 ${stats.periodComparison.rateChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stats.periodComparison.rateChange > 0 ? '+' : ''}{stats.periodComparison.rateChange}% vs last month
                </div>
              )}
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Clock className="h-4 w-4" />
                <span className="text-sm">Avg Response Latency</span>
              </div>
              <div className="text-2xl font-bold text-foreground">
                {stats.avgLatencyHours < 1
                  ? `${Math.round(stats.avgLatencyHours * 60)}m`
                  : `${stats.avgLatencyHours.toFixed(1)}h`}
              </div>
              <div className="text-sm mt-1 text-muted-foreground">
                from trigger to action
              </div>
            </Card>
          </div>
        ) : null}

        {/* How It Works */}
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900 dark:text-blue-100">How Revenue Recovery Works</h3>
              <div className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                <p>The system automatically responds to missed calls, after-hours contacts, and estimate follow-ups with AI-powered SMS. When a customer books within the attribution window (default 72h), we track the influenced revenue.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Clients Table */}
        <Card className="overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground">Client Recovery Settings</h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : clients.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p>No clients with recovery data found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Client
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Influenced Revenue
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Recovery Rate
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Last Activity
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {clients.map((client) => (
                    <tr key={client.id} className="hover:bg-muted/30">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-muted rounded-lg">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <span className="font-medium text-foreground">{client.businessName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {client.recoveryEnabled ? (
                            <Badge variant="outline" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Enabled
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400">
                              Disabled
                            </Badge>
                          )}
                          {client.recoveryLocked && (
                            <Badge variant="outline" className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                              Locked
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-foreground">
                        ${client.totalInfluenced.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={client.recoveryRate >= 20 ? 'text-green-600 dark:text-green-400' : 'text-foreground'}>
                          {client.recoveryRate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground text-sm">
                        {client.lastActivity
                          ? format(new Date(client.lastActivity), 'MMM d, yyyy')
                          : 'No activity'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openClientSettings(client)}
                          title="Settings"
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <Dialog open={!!selectedClient} onOpenChange={(open) => !open && setSelectedClient(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recovery Settings: {selectedClient?.businessName}</DialogTitle>
          </DialogHeader>

          {clientSettings && (
            <div className="space-y-4">
              {/* Recovery Enabled */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-foreground">Recovery Enabled</div>
                  <div className="text-sm text-muted-foreground">Enable automatic recovery responses</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={clientSettings.recoveryEnabled}
                    onChange={(e) => setClientSettings({ ...clientSettings, recoveryEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              {/* Recovery Locked */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-foreground">Lock Settings</div>
                  <div className="text-sm text-muted-foreground">Prevent client from changing settings</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={clientSettings.recoveryLocked}
                    onChange={(e) => setClientSettings({ ...clientSettings, recoveryLocked: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              {/* Client Can Disable */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-foreground">Client Can Disable</div>
                  <div className="text-sm text-muted-foreground">Allow client to turn off recovery</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={clientSettings.clientCanDisable}
                    onChange={(e) => setClientSettings({ ...clientSettings, clientCanDisable: e.target.checked })}
                    className="sr-only peer"
                    disabled={clientSettings.recoveryLocked}
                  />
                  <div className={`w-11 h-6 bg-muted rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary ${clientSettings.recoveryLocked ? 'opacity-50' : ''}`}></div>
                </label>
              </div>

              {/* Attribution Window */}
              <div>
                <div className="font-medium text-foreground mb-2">Attribution Window</div>
                <div className="text-sm text-muted-foreground mb-2">
                  How long to credit conversions after recovery attempt
                </div>
                <select
                  value={clientSettings.attributionWindowHours}
                  onChange={(e) => setClientSettings({ ...clientSettings, attributionWindowHours: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                >
                  <option value={24}>24 hours</option>
                  <option value={48}>48 hours</option>
                  <option value={72}>72 hours (default)</option>
                  <option value={96}>96 hours</option>
                  <option value={168}>7 days</option>
                </select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setSelectedClient(null); setClientSettings(null); }}
            >
              Cancel
            </Button>
            <Button
              onClick={saveClientSettings}
              disabled={saving}
              className="gap-2"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
