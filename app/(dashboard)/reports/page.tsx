'use client';

import { useState, useEffect } from 'react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Briefcase,
  Users,
  Target,
  FileText,
  Loader2,
  BarChart3,
  ArrowRight,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import {
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  subMonths,
  format,
} from 'date-fns';

interface DashboardMetrics {
  revenue: number;
  revenueChange: number;
  jobsCompleted: number;
  jobsChange: number;
  newLeads: number;
  leadsChange: number;
  leadsWon: number;
  conversionRate: number;
  conversionChange: number;
  avgJobValue: number;
  outstandingAmount: number;
  outstandingCount: number;
}

interface ReportData {
  metrics: DashboardMetrics;
  charts: {
    revenue: Array<{ month: string; revenue: number }>;
    leadSources: Array<{ source: string; count: number }>;
    jobStatuses: Array<{ status: string; count: number }>;
  };
  ytd: {
    revenue: number;
    jobs: number;
    leads: number;
  };
}

const DATE_PRESETS = [
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'this_quarter', label: 'This Quarter' },
  { value: 'ytd', label: 'Year to Date' },
  { value: 'last_6_months', label: 'Last 6 Months' },
];

function getDateRange(preset: string): { start: Date; end: Date } {
  const now = new Date();
  switch (preset) {
    case 'last_month':
      return {
        start: startOfMonth(subMonths(now, 1)),
        end: endOfMonth(subMonths(now, 1)),
      };
    case 'this_quarter':
      return {
        start: startOfQuarter(now),
        end: endOfQuarter(now),
      };
    case 'ytd':
      return {
        start: startOfYear(now),
        end: now,
      };
    case 'last_6_months':
      return {
        start: startOfMonth(subMonths(now, 5)),
        end: now,
      };
    case 'this_month':
    default:
      return {
        start: startOfMonth(now),
        end: endOfMonth(now),
      };
  }
}

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ReportData | null>(null);
  const [datePreset, setDatePreset] = useState('this_month');

  useEffect(() => {
    fetchReports();
  }, [datePreset]);

  async function fetchReports() {
    setLoading(true);
    try {
      const { start, end } = getDateRange(datePreset);
      const params = new URLSearchParams({
        start: start.toISOString(),
        end: end.toISOString(),
      });

      const res = await fetch(`/api/reports?${params}`);
      if (!res.ok) throw new Error('Failed to fetch reports');
      const result = await res.json();
      setData(result);
    } catch (err) {
      console.error('Error fetching reports:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const metrics = data?.metrics;
  const maxRevenue = Math.max(...(data?.charts.revenue.map((d) => d.revenue) || [0]));
  const totalLeads = data?.charts.leadSources.reduce((sum, s) => sum + s.count, 0) || 1;
  const totalJobs = data?.charts.jobStatuses.reduce((sum, s) => sum + s.count, 0) || 1;

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold text-text">Reports</h1>
        </div>
        <Select value={datePreset} onValueChange={setDatePreset}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DATE_PRESETS.map((preset) => (
              <SelectItem key={preset.value} value={preset.value}>
                {preset.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          <MetricCard
            label="Revenue"
            value={formatCurrency(metrics?.revenue || 0)}
            change={metrics?.revenueChange || 0}
            icon={DollarSign}
          />
          <MetricCard
            label="Jobs"
            value={String(metrics?.jobsCompleted || 0)}
            change={metrics?.jobsChange || 0}
            icon={Briefcase}
          />
          <MetricCard
            label="Leads"
            value={String(metrics?.newLeads || 0)}
            change={metrics?.leadsChange || 0}
            icon={Users}
          />
          <MetricCard
            label="Conversion"
            value={`${metrics?.conversionRate || 0}%`}
            change={metrics?.conversionChange || 0}
            icon={Target}
          />
        </div>

        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.charts.revenue && data.charts.revenue.length > 0 ? (
              <div className="space-y-3">
                {data.charts.revenue.map((point, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-10 text-xs text-text-muted">{point.month}</span>
                    <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all rounded-full"
                        style={{
                          width: `${maxRevenue > 0 ? (point.revenue / maxRevenue) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <span className="w-20 text-sm text-text text-right">
                      {formatCurrency(point.revenue)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-text-muted py-8">No revenue data available</p>
            )}
          </CardContent>
        </Card>

        {/* Lead Sources & Job Status */}
        <div className="grid grid-cols-2 gap-3">
          {/* Lead Sources */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lead Sources</CardTitle>
            </CardHeader>
            <CardContent>
              {data?.charts.leadSources && data.charts.leadSources.length > 0 ? (
                <div className="space-y-2">
                  {data.charts.leadSources.slice(0, 5).map((source, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-text-muted">{source.source}</span>
                        <span className="text-text">{source.count}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${(source.count / totalLeads) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-text-muted py-4 text-sm">No data</p>
              )}
            </CardContent>
          </Card>

          {/* Job Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Job Status</CardTitle>
            </CardHeader>
            <CardContent>
              {data?.charts.jobStatuses && data.charts.jobStatuses.length > 0 ? (
                <div className="space-y-2">
                  {data.charts.jobStatuses.map((status, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-text-muted">{status.status}</span>
                        <span className="text-text">{status.count}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${getStatusColor(status.status)}`}
                          style={{ width: `${(status.count / totalJobs) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-text-muted py-4 text-sm">No data</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Outstanding Invoices */}
        {metrics && metrics.outstandingCount > 0 && (
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-warning/10 rounded-full flex items-center justify-center">
                    <FileText className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <p className="font-medium text-text">Outstanding Invoices</p>
                    <p className="text-sm text-text-muted">
                      {metrics.outstandingCount} invoice{metrics.outstandingCount !== 1 ? 's' : ''}{' '}
                      unpaid
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-text text-lg">
                    {formatCurrency(metrics.outstandingAmount)}
                  </p>
                  <Link href="/invoices?status=unpaid">
                    <Button variant="ghost" size="sm" className="text-primary">
                      View All <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* YTD Summary */}
        {data?.ytd && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Year to Date</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-text">{formatCurrency(data.ytd.revenue)}</p>
                  <p className="text-xs text-text-muted">Revenue</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-text">{data.ytd.jobs}</p>
                  <p className="text-xs text-text-muted">Jobs</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-text">{data.ytd.leads}</p>
                  <p className="text-xs text-text-muted">Leads</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Average Job Value */}
        {metrics && metrics.avgJobValue > 0 && (
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-muted">Average Job Value</p>
                  <p className="text-2xl font-bold text-text">
                    {formatCurrency(metrics.avgJobValue)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// Metric Card Component
function MetricCard({
  label,
  value,
  change,
  icon: Icon,
}: {
  label: string;
  value: string;
  change: number;
  icon: React.ElementType;
}) {
  const isPositive = change >= 0;

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-text-muted mb-1">{label}</p>
            <p className="text-xl font-bold text-text">{value}</p>
            {change !== 0 && (
              <div
                className={`flex items-center gap-1 text-xs mt-1 ${
                  isPositive ? 'text-success' : 'text-danger'
                }`}
              >
                {isPositive ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                <span>
                  {isPositive ? '+' : ''}
                  {change.toFixed(1)}%
                </span>
              </div>
            )}
          </div>
          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    Completed: 'bg-success',
    'In Progress': 'bg-primary',
    Scheduled: 'bg-warning',
    Cancelled: 'bg-danger',
    'No Show': 'bg-text-muted',
  };
  return colors[status] || 'bg-primary';
}
