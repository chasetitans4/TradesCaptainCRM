'use client';

// =====================================================
// PERFORMANCE VIEW COMPONENT
// Shows goals, quotas, and trends
// Version: 5.8.1
// =====================================================

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Target,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  Users,
} from 'lucide-react';
import { usePerformance } from '@/hooks/useCommissionDashboard';

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(cents / 100);
}

export function PerformanceView() {
  const { data, loading, error } = usePerformance();

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!data) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on_track':
      case 'exceeds':
        return 'text-success';
      case 'at_risk':
      case 'meets':
        return 'text-warning';
      case 'behind':
      case 'below':
        return 'text-destructive';
      default:
        return 'text-text-muted';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'on_track':
        return (
          <Badge variant="default" className="gap-1">
            <CheckCircle2 className="h-3 w-3" />
            ON TRACK
          </Badge>
        );
      case 'exceeds':
        return (
          <Badge variant="default" className="gap-1 bg-success">
            <CheckCircle2 className="h-3 w-3" />
            EXCEEDS
          </Badge>
        );
      case 'at_risk':
        return (
          <Badge variant="secondary" className="gap-1 bg-warning text-warning-foreground">
            <AlertCircle className="h-3 w-3" />
            AT RISK
          </Badge>
        );
      case 'meets':
        return (
          <Badge variant="secondary" className="gap-1">
            <CheckCircle2 className="h-3 w-3" />
            MEETS
          </Badge>
        );
      case 'behind':
      case 'below':
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            {status === 'behind' ? 'BEHIND' : 'BELOW'}
          </Badge>
        );
      default:
        return null;
    }
  };

  // Calculate max for chart
  const maxCommission = Math.max(...data.yearTrend.map((m) => m.commission), 1);

  return (
    <div className="space-y-6">
      {/* Monthly Goal Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-5 w-5 text-primary" />
            Monthly Goal Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-text-muted">Goal</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(data.goal.amount)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-text-muted">Current</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(data.goal.current)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-text-muted">Gap</p>
                <p className={`text-2xl font-bold ${data.goal.gapToGoal > 0 ? 'text-warning' : 'text-success'}`}>
                  {formatCurrency(data.goal.gapToGoal)}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Progress value={data.goal.progress} className="h-3" />
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">{data.goal.progress}%</span>
                {getStatusBadge(data.goal.status)}
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="text-sm">
                <span className="text-text-muted">Projected final:</span>{' '}
                <span className="font-semibold">
                  {formatCurrency(data.goal.projectedFinal)}
                </span>
              </p>
              {data.goal.status === 'on_track' && (
                <p className="text-sm text-success flex items-center gap-1">
                  <TrendingUp className="h-4 w-4" />
                  You&apos;ll likely hit your goal this month!
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quarterly Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-5 w-5 text-primary" />
            Quarterly Performance ({data.quarterly.period})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead className="text-center">Sales</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Commission</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.quarterly.months.map((month) => (
                <TableRow key={month.month}>
                  <TableCell className="font-medium">{month.month}</TableCell>
                  <TableCell className="text-center">{month.sales}</TableCell>
                  <TableCell className="text-right text-text-muted">
                    {formatCurrency(month.revenue)}/mo
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(month.commission)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="font-semibold bg-muted/50">
                <TableCell>Q{data.quarterly.period.charAt(1)} Total</TableCell>
                <TableCell className="text-center">
                  {data.quarterly.totals.sales}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(data.quarterly.totals.revenue)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(data.quarterly.totals.commission)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Quota Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-5 w-5 text-primary" />
            Quota Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <p className="text-sm text-text-muted">Quarterly Minimum</p>
              <p className="text-xl font-bold">{data.quota.minimum} sales</p>
              <p className="text-sm text-text-muted">
                Your Q Sales: <span className="font-medium">{data.quota.actual}</span>
              </p>
              <div className="flex items-center gap-2">
                <span className="text-sm">Status:</span>
                {getStatusBadge(data.quota.status)}
                {data.quota.status === 'exceeds' && (
                  <span className="text-xs text-text-muted">
                    ({Math.round(data.quota.actual / data.quota.minimum)}x minimum)
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-text-muted">Retention Rate</p>
              <p className={`text-xl font-bold ${data.quota.retentionRate >= 90 ? 'text-success' : data.quota.retentionRate >= 80 ? 'text-warning' : 'text-destructive'}`}>
                {data.quota.retentionRate}%
              </p>
              <p className="text-sm text-text-muted">
                Customers Lost:{' '}
                <span className="font-medium">
                  {data.quota.customersLost} of {data.quota.totalCustomers}
                </span>
              </p>
              <Badge
                variant={data.quota.retentionRate >= 90 ? 'default' : 'secondary'}
                className={data.quota.retentionRate >= 90 ? 'bg-success' : ''}
              >
                {data.quota.retentionRate >= 90
                  ? 'EXCELLENT'
                  : data.quota.retentionRate >= 80
                  ? 'GOOD'
                  : 'NEEDS ATTENTION'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 12-Month Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-5 w-5 text-primary" />
            12-Month Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.yearTrend.length === 0 ? (
            <p className="text-text-muted text-sm">
              No historical data available yet.
            </p>
          ) : (
            <>
              {/* Simple bar chart */}
              <div className="flex items-end gap-1 h-40 mb-2">
                {data.yearTrend.map((month) => {
                  const height = Math.max(
                    5,
                    Math.round((month.commission / maxCommission) * 100)
                  );
                  return (
                    <div
                      key={month.month}
                      className="flex-1 flex flex-col items-center"
                    >
                      <div
                        className="w-full bg-primary rounded-t transition-all hover:bg-primary/80"
                        style={{ height: `${height}%` }}
                        title={`${month.month}: ${formatCurrency(month.commission)}`}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-1">
                {data.yearTrend.map((month) => (
                  <div
                    key={month.month}
                    className="flex-1 text-center text-xs text-text-muted"
                  >
                    {month.month}
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm text-text-muted">Total YTD</p>
                  <p className="font-bold">
                    {formatCurrency(
                      data.yearTrend.reduce((sum, m) => sum + m.commission, 0)
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-text-muted">Average</p>
                  <p className="font-bold">
                    {formatCurrency(
                      data.yearTrend.reduce((sum, m) => sum + m.commission, 0) /
                        data.yearTrend.length
                    )}
                    /mo
                  </p>
                </div>
                <div>
                  <p className="text-sm text-text-muted">Best Month</p>
                  <p className="font-bold">
                    {formatCurrency(Math.max(...data.yearTrend.map((m) => m.commission)))}
                  </p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default PerformanceView;
