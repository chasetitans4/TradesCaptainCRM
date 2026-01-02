'use client';

// =====================================================
// REPORTING DASHBOARD PAGE
// Comprehensive performance analytics
// Version: 5.8
// =====================================================

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { BarChart3, Calendar, Loader2 } from 'lucide-react';
import {
  PerformanceSummaryCards,
  SalesByTrack,
  PipelineHealth,
  TrendChart,
} from '@/components/admin/reports';
import { useAgentOrHigher } from '@/hooks/useAdminAuth';

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

export default function ReportsPage() {
  const { loading: authLoading, isAuthorized } = useAgentOrHigher();
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

  if (authLoading || !isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const periods: { value: Period; label: string }[] = [
    { value: 'this_month', label: 'This Month' },
    { value: 'last_month', label: 'Last Month' },
    { value: 'this_quarter', label: 'This Quarter' },
    { value: 'this_year', label: 'This Year' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Performance Reports</h1>
            <p className="text-muted-foreground">
              {report?.period.label || 'Loading...'}
            </p>
          </div>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <div className="flex rounded-lg border overflow-hidden">
            {periods.map((p) => (
              <button
                key={p.value}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  period === p.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background hover:bg-muted'
                }`}
                onClick={() => setPeriod(p.value)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Performance Summary Cards */}
      <PerformanceSummaryCards summary={report?.summary || null} loading={loading} />

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales by Track */}
        <SalesByTrack sales={report?.sales_by_track || []} loading={loading} />

        {/* Pipeline Health */}
        <PipelineHealth stages={report?.pipeline_health || []} loading={loading} />
      </div>

      {/* Trend Chart */}
      <TrendChart data={report?.trend_data || []} loading={loading} />

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-4 pt-4 border-t">
        <Button variant="outline" onClick={() => window.print()}>
          Export PDF
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            // Export to CSV logic
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
          }}
        >
          Export CSV
        </Button>
        <Button variant="outline" asChild>
          <a href="/admin/pipeline">View Pipeline</a>
        </Button>
      </div>
    </div>
  );
}
