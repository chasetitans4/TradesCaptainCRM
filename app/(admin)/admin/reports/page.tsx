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
import { AdminPageHeader } from '@/components/admin/page-header';

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
    <div className="space-y-6 p-6">
      <AdminPageHeader
        title="Performance Reports"
        description="Comprehensive sales and revenue analytics."
        icon={BarChart3}
        breadcrumb={[{ label: 'Reports' }]}
        actions={
          <div className="flex gap-2">
            {periods.map((p) => (
              <Button
                key={p.value}
                variant={period === p.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriod(p.value)}
              >
                {p.label}
              </Button>
            ))}
          </div>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : report ? (
        <>
          <PerformanceSummaryCards summary={report.summary} loading={loading} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SalesByTrack sales={report.sales_by_track} loading={loading} />
            <PipelineHealth stages={report.pipeline_health} loading={loading} />
          </div>

          <TrendChart data={report.trend_data} loading={loading} />
        </>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          Failed to load report data
        </div>
      )}
    </div>
  );
}
