'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { cn, formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertTriangle,
  Clock,
  DollarSign,
  ChevronRight,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';

interface AgingSummary {
  totalOutstanding: number;
  totalInvoices: number;
  current: number;
  overdue30: number;
  overdue60: number;
  overdue90: number;
  overdue90Plus: number;
}

interface AgingReportData {
  summary: AgingSummary;
  generatedAt: string;
}

interface AgingReportWidgetProps {
  className?: string;
  compact?: boolean;
}

const AGING_BUCKETS = [
  { key: 'current', label: 'Current', color: 'bg-green-500', textColor: 'text-green-600' },
  { key: 'overdue30', label: '1-30 Days', color: 'bg-yellow-500', textColor: 'text-yellow-600' },
  { key: 'overdue60', label: '31-60 Days', color: 'bg-orange-500', textColor: 'text-orange-600' },
  { key: 'overdue90', label: '61-90 Days', color: 'bg-red-400', textColor: 'text-red-500' },
  { key: 'overdue90Plus', label: '90+ Days', color: 'bg-red-600', textColor: 'text-red-700' },
] as const;

export function AgingReportWidget({ className, compact = false }: AgingReportWidgetProps) {
  const [data, setData] = useState<AgingReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAging() {
      try {
        const response = await fetch('/api/reports/aging');
        if (!response.ok) {
          throw new Error('Failed to fetch aging data');
        }
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load aging report');
      } finally {
        setLoading(false);
      }
    }

    fetchAging();
  }, []);

  if (loading) {
    return <AgingReportSkeleton compact={compact} />;
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="py-6">
          <div className="flex items-center gap-2 text-red-500">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  const { summary } = data;
  const totalOverdue = summary.overdue30 + summary.overdue60 + summary.overdue90 + summary.overdue90Plus;
  const overduePercentage = summary.totalOutstanding > 0
    ? Math.round((totalOverdue / summary.totalOutstanding) * 100)
    : 0;

  if (compact) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Outstanding A/R</p>
                <p className="text-2xl font-bold">{formatCurrency(summary.totalOutstanding)}</p>
              </div>
            </div>
            {totalOverdue > 0 && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {formatCurrency(totalOverdue)} overdue
              </Badge>
            )}
          </div>

          {/* Mini bar chart */}
          <div className="h-2 rounded-full bg-muted overflow-hidden flex">
            {AGING_BUCKETS.map((bucket) => {
              const value = summary[bucket.key as keyof AgingSummary] as number;
              const percentage = summary.totalOutstanding > 0
                ? (value / summary.totalOutstanding) * 100
                : 0;
              return percentage > 0 ? (
                <div
                  key={bucket.key}
                  className={cn('h-full', bucket.color)}
                  style={{ width: `${percentage}%` }}
                />
              ) : null;
            })}
          </div>

          <div className="flex justify-between mt-3 text-xs text-muted-foreground">
            <span>{summary.totalInvoices} invoices</span>
            <Link href="/invoices?filter=overdue" className="text-primary hover:underline">
              View details
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            Invoice Aging Report
          </CardTitle>
          <Link href="/invoices?filter=overdue">
            <Button variant="ghost" size="sm" className="gap-1">
              View All
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Outstanding</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(summary.totalOutstanding)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {summary.totalInvoices} invoice{summary.totalInvoices !== 1 ? 's' : ''}
            </p>
          </div>
          <div className={cn(
            'p-4 rounded-lg',
            totalOverdue > 0 ? 'bg-red-50' : 'bg-green-50'
          )}>
            <div className="flex items-center gap-2 mb-1">
              {totalOverdue > 0 ? (
                <AlertTriangle className="h-4 w-4 text-red-500" />
              ) : (
                <TrendingUp className="h-4 w-4 text-green-500" />
              )}
              <span className={cn(
                'text-sm',
                totalOverdue > 0 ? 'text-red-600' : 'text-green-600'
              )}>
                {totalOverdue > 0 ? 'Total Overdue' : 'All Current'}
              </span>
            </div>
            <p className={cn(
              'text-2xl font-bold',
              totalOverdue > 0 ? 'text-red-600' : 'text-green-600'
            )}>
              {totalOverdue > 0 ? formatCurrency(totalOverdue) : formatCurrency(summary.current)}
            </p>
            <p className={cn(
              'text-xs mt-1',
              totalOverdue > 0 ? 'text-red-500' : 'text-green-500'
            )}>
              {overduePercentage}% of total
            </p>
          </div>
        </div>

        {/* Aging Buckets */}
        <div className="space-y-3">
          {AGING_BUCKETS.map((bucket) => {
            const value = summary[bucket.key as keyof AgingSummary] as number;
            const percentage = summary.totalOutstanding > 0
              ? (value / summary.totalOutstanding) * 100
              : 0;

            return (
              <div key={bucket.key} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{bucket.label}</span>
                  <span className={cn('font-medium', value > 0 && bucket.key !== 'current' && bucket.textColor)}>
                    {formatCurrency(value)}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all', bucket.color)}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Critical Alert */}
        {summary.overdue90Plus > 0 && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-700">
                  Critical: {formatCurrency(summary.overdue90Plus)} over 90 days
                </p>
                <p className="text-xs text-red-600 mt-1">
                  Consider sending to collections or offering payment plans
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AgingReportSkeleton({ compact }: { compact?: boolean }) {
  if (compact) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div>
                <Skeleton className="h-4 w-24 mb-1" />
                <Skeleton className="h-8 w-32" />
              </div>
            </div>
            <Skeleton className="h-6 w-24" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
          <div className="flex justify-between mt-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-8 w-20" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="space-y-1">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default AgingReportWidget;
