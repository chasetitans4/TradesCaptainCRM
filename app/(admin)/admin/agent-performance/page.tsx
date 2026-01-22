'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Users,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  Mail,
  XCircle,
} from 'lucide-react';
import {
  getCurrentQuarter,
  getPerformanceDashboard,
  type PerformanceDashboardData,
  QUARTERLY_SALES_QUOTA,
} from '@/lib/agents/performance';
import { AdminPageHeader } from '@/components/admin/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function AgentPerformancePage() {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<PerformanceDashboardData | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedQuarter, setSelectedQuarter] = useState<1 | 2 | 3 | 4>(
    getCurrentQuarter().quarter as 1 | 2 | 3 | 4
  );

  useEffect(() => {
    fetchData();
  }, [selectedYear, selectedQuarter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // In production, this would be an API call
      const data = await getPerformanceDashboard(selectedYear, selectedQuarter);
      setDashboardData(data);
    } catch (error) {
      console.error('Error fetching performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getQuarterLabel = (q: number) => `Q${q}`;
  const meetingQuotaPercent = dashboardData
    ? Math.round((dashboardData.meeting_quota / Math.max(1, dashboardData.total_active_agents - dashboardData.in_ramp_up)) * 100)
    : 0;

  return (
    <div className="p-6 space-y-6">
      <AdminPageHeader
        title="Agent Performance"
        description={`${getQuarterLabel(selectedQuarter)} ${selectedYear} • Minimum ${QUARTERLY_SALES_QUOTA} sales/quarter`}
        icon={TrendingUp}
        actions={
          <div className="flex items-center gap-3">
            {/* Quarter Selector */}
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              {([1, 2, 3, 4] as const).map(q => (
                <button
                  key={q}
                  onClick={() => setSelectedQuarter(q)}
                  className={cn(
                    'px-3 py-1.5 rounded text-sm font-medium transition-colors',
                    selectedQuarter === q
                      ? 'bg-background shadow-sm text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Q{q}
                </button>
              ))}
            </div>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3 py-2 border border-input bg-background text-foreground rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            >
              {[2025, 2024, 2023].map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <Button variant="outline" onClick={fetchData}>
              <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        }
      />

      {loading ? (
        <Card>
          <CardContent className="p-8 text-center">
            <RefreshCw className="h-8 w-8 text-primary mx-auto mb-3 animate-spin" />
            <p className="text-muted-foreground">Loading performance data...</p>
          </CardContent>
        </Card>
      ) : dashboardData ? (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-foreground">{dashboardData.total_active_agents}</p>
                <p className="text-sm text-muted-foreground">Total Active Agents</p>
              </CardContent>
            </Card>
            <Card className="bg-green-500/10 border-green-500/20">
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-green-700 dark:text-green-400">{dashboardData.meeting_quota}</p>
                <p className="text-sm text-green-600 dark:text-green-500">Meeting Quota ({meetingQuotaPercent}%)</p>
              </CardContent>
            </Card>
            <Card className="bg-red-500/10 border-red-500/20">
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-red-700 dark:text-red-400">{dashboardData.below_quota}</p>
                <p className="text-sm text-red-600 dark:text-red-500">Below Quota</p>
              </CardContent>
            </Card>
            <Card className="bg-blue-500/10 border-blue-500/20">
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-blue-700 dark:text-blue-400">{dashboardData.in_ramp_up}</p>
                <p className="text-sm text-blue-600 dark:text-blue-500">In Ramp-Up Period</p>
              </CardContent>
            </Card>
          </div>

          {/* Agents Below Quota */}
          {dashboardData.agents_below_quota.length > 0 && (
            <Card className="border-red-200 dark:border-red-900/50">
              <div className="px-6 py-4 bg-red-500/10 border-b border-red-200 dark:border-red-900/50 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                <h2 className="font-semibold text-red-900 dark:text-red-100">
                  Agents Below Quota ({dashboardData.agents_below_quota.length})
                </h2>
              </div>
              <div className="divide-y divide-border">
                {dashboardData.agents_below_quota.map(({ agent, performance, warning_status }) => (
                  <div key={agent.id} className="p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          'w-10 h-10 rounded-full flex items-center justify-center',
                          warning_status === 'second_strike' ? 'bg-red-100 dark:bg-red-900/30' :
                          warning_status === 'first_warning' ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-muted'
                        )}>
                          {warning_status === 'second_strike' ? (
                            <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                          ) : warning_status === 'first_warning' ? (
                            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                          ) : (
                            <Users className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-foreground">{agent.name}</h3>
                            {warning_status === 'second_strike' && (
                              <Badge variant="destructive">
                                2ND STRIKE
                              </Badge>
                            )}
                            {warning_status === 'first_warning' && (
                              <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-900/50">
                                WARNING
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{agent.email}</p>
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            <span className="text-red-600 dark:text-red-400 font-medium">
                              Sales: {performance?.sales_count || 0} / {performance?.quota || QUARTERLY_SALES_QUOTA}
                            </span>
                            {performance?.is_prorated && (
                              <span className="text-muted-foreground">
                                (Pro-rated: {performance.prorated_reason})
                              </span>
                            )}
                          </div>
                          {agent.last_warning_quarter && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Previous warning: {agent.last_warning_quarter}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          <Mail className="h-4 w-4 mr-1" />
                          Contact
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      ) : null}
    </div>
  );
}
