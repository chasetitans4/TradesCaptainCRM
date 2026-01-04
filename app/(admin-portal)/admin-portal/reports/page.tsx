'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Calendar, Loader2, Download, TrendingUp, TrendingDown, DollarSign, Target, Percent, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface PerformanceReport {
  period: {
    start: string;
    end: string;
    label: string;
  };
  summary: {
    deals_won: number;
    deals_won_change: number;
    revenue_monthly: number;
    revenue_change: number;
    avg_deal_size: number;
    avg_deal_change: number;
    win_rate: number;
    win_rate_change: number;
  };
  sales_by_track: {
    track: string;
    deals: number;
    revenue_monthly: number;
    percentage: number;
    avg_commission: number;
  }[];
  pipeline_health: {
    stage: string;
    leads: number;
    value_cents: number;
    avg_days: number;
    conversion_rate: number;
  }[];
  trend_data: {
    date: string;
    deals: number;
    revenue: number;
  }[];
}

type Period = 'this_month' | 'last_month' | 'this_quarter' | 'this_year';

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function ChangeIndicator({ change }: { change: number }) {
  if (change === 0) {
    return <span className="text-sm text-muted-foreground">No change</span>;
  }
  const isPositive = change > 0;
  return (
    <span className={`flex items-center text-sm ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
      {isPositive ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
      {isPositive ? '+' : ''}{change}%
    </span>
  );
}

export default function AdminReportsPage() {
  const [report, setReport] = useState<PerformanceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('this_month');

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/reports/performance?period=${period}`);
      if (res.ok) {
        const data = await res.json();
        setReport(data);
      }
    } catch (error) {
      console.error('Failed to fetch report:', error);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const periods: { value: Period; label: string }[] = [
    { value: 'this_month', label: 'This Month' },
    { value: 'last_month', label: 'Last Month' },
    { value: 'this_quarter', label: 'This Quarter' },
    { value: 'this_year', label: 'This Year' },
  ];

  const handleExportCSV = () => {
    if (!report) return;
    const csv = [
      ['Metric', 'Value', 'Change'],
      ['Deals Won', report.summary.deals_won, `${report.summary.deals_won_change}%`],
      ['Revenue', `$${report.summary.revenue_monthly}`, `${report.summary.revenue_change}%`],
      ['Avg Deal', `$${report.summary.avg_deal_size}`, `${report.summary.avg_deal_change}%`],
      ['Win Rate', `${report.summary.win_rate}%`, `${report.summary.win_rate_change}%`],
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-report-${period}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Performance Reports</h1>
            <p className="text-muted-foreground">
              {report?.period.label || 'Analytics and insights'}
            </p>
          </div>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <div className="flex rounded-lg border border-border overflow-hidden">
            {periods.map((p) => (
              <button
                key={p.value}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  period === p.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card text-foreground hover:bg-muted'
                }`}
                onClick={() => setPeriod(p.value)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-20 mb-2" />
                  <Skeleton className="h-4 w-16" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Deals Won</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{report?.summary.deals_won || 0}</div>
                <ChangeIndicator change={report?.summary.deals_won_change || 0} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  ${(report?.summary.revenue_monthly || 0).toLocaleString()}
                </div>
                <ChangeIndicator change={report?.summary.revenue_change || 0} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Avg Deal Size</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  ${(report?.summary.avg_deal_size || 0).toLocaleString()}
                </div>
                <ChangeIndicator change={report?.summary.avg_deal_change || 0} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Win Rate</CardTitle>
                <Percent className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{report?.summary.win_rate || 0}%</div>
                <ChangeIndicator change={report?.summary.win_rate_change || 0} />
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales by Track */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Sales by Track
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : report?.sales_by_track?.length ? (
              <div className="space-y-4">
                {report.sales_by_track.map((track) => (
                  <div key={track.track} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground capitalize">{track.track}</span>
                      <span className="text-sm text-muted-foreground">{track.deals} deals</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${track.percentage}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-foreground min-w-[60px] text-right">
                        ${track.revenue_monthly.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No sales data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pipeline Health */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Pipeline Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : report?.pipeline_health?.length ? (
              <div className="space-y-3">
                {report.pipeline_health.map((stage) => (
                  <div
                    key={stage.stage}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div>
                      <div className="font-medium text-foreground capitalize">{stage.stage}</div>
                      <div className="text-sm text-muted-foreground">
                        {stage.leads} leads • Avg {stage.avg_days} days
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-foreground">{formatCurrency(stage.value_cents)}</div>
                      <div className="text-sm text-muted-foreground">{stage.conversion_rate}% conv.</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No pipeline data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Revenue Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : report?.trend_data?.length ? (
            <div className="h-48 flex items-end gap-1">
              {report.trend_data.map((point, i) => {
                const maxRevenue = Math.max(...report.trend_data.map((d) => d.revenue));
                const height = maxRevenue > 0 ? (point.revenue / maxRevenue) * 100 : 0;
                return (
                  <div
                    key={i}
                    className="flex-1 bg-primary/80 hover:bg-primary rounded-t transition-colors cursor-pointer group relative"
                    style={{ height: `${Math.max(height, 2)}%` }}
                    title={`${point.date}: $${point.revenue.toLocaleString()}`}
                  >
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover border border-border rounded px-2 py-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                      ${point.revenue.toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No trend data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-4 pt-4 border-t border-border">
        <Button variant="outline" onClick={() => window.print()}>
          <Download className="h-4 w-4 mr-2" />
          Export PDF
        </Button>
        <Button variant="outline" onClick={handleExportCSV} disabled={!report}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
        {loading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading report...
          </div>
        )}
      </div>
    </div>
  );
}
