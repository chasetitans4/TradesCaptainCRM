'use client';

// =====================================================
// RECURRING COMMISSIONS VIEW
// Shows recurring commission data and rate bumps
// Version: 5.8.1
// =====================================================

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { RefreshCw, Star, TrendingUp, Lightbulb } from 'lucide-react';
import { useRecurringCommissions } from '@/hooks/useCommissionDashboard';

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function RecurringView() {
  const { data, loading, error } = useRecurringCommissions();

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
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

  return (
    <div className="space-y-6">
      {/* This Month's Recurring */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <RefreshCw className="h-5 w-5 text-primary" />
            This Month&apos;s Recurring
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.thisMonth.customers.length === 0 ? (
            <p className="text-text-muted text-sm">
              No recurring commissions this month yet.
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead className="text-center">Month</TableHead>
                    <TableHead className="text-center">Rate</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.thisMonth.customers.slice(0, 10).map((item, idx) => (
                    <TableRow key={`${item.customerId}-${idx}`}>
                      <TableCell className="font-medium">
                        {item.customerName}
                      </TableCell>
                      <TableCell>{item.planName}</TableCell>
                      <TableCell className="text-center">M{item.month}</TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={item.rate === 15 ? 'default' : 'secondary'}
                          className="gap-1"
                        >
                          {item.rate}%
                          {item.rate === 15 && <Star className="h-3 w-3" />}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={item.status === 'paid' ? 'default' : 'outline'}
                        >
                          {item.status === 'paid' ? 'Paid' : 'Pending'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {data.thisMonth.customers.length > 10 && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-text-muted text-sm"
                      >
                        ... {data.thisMonth.customers.length - 10} more customers
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              <div className="mt-4 pt-4 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">10% Rate Total</span>
                  <span>{formatCurrency(data.thisMonth.rate10Total)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted flex items-center gap-1">
                    15% Rate Total <Star className="h-3 w-3 text-warning" />
                  </span>
                  <span>{formatCurrency(data.thisMonth.rate15Total)}</span>
                </div>
                <div className="flex justify-between font-semibold pt-2 border-t">
                  <span>Total Recurring</span>
                  <span>{formatCurrency(data.thisMonth.total)}</span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Approaching 15% Rate Bump */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-5 w-5 text-success" />
            <Star className="h-4 w-4 text-warning" />
            Approaching 15% Rate Bump (Month 5 → Month 6)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.approachingRateBump.length === 0 ? (
            <p className="text-text-muted text-sm">
              No customers approaching Month 6 this month.
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead className="text-center">Current</TableHead>
                    <TableHead>M6 Date</TableHead>
                    <TableHead className="text-right">New Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.approachingRateBump.map((item) => (
                    <TableRow key={item.customerId}>
                      <TableCell className="font-medium">
                        {item.customerName}
                      </TableCell>
                      <TableCell>{item.planName}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">M{item.currentMonth}</Badge>
                      </TableCell>
                      <TableCell>{formatDate(item.month6Date)}</TableCell>
                      <TableCell className="text-right font-medium text-success">
                        {formatCurrency(item.newMonthlyAmount)}/mo
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-4 pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-text-muted">
                    {data.approachingRateBump.length} customers hitting 15% this
                    month
                  </span>
                  <span className="font-semibold text-success">
                    +{formatCurrency(data.totalRecurringBoost)}/mo recurring boost
                  </span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Tip */}
      {data.approachingRateBump.length > 0 && (
        <Alert>
          <Lightbulb className="h-4 w-4" />
          <AlertDescription>
            Do your Month 6 Business Review calls to secure these customers and
            unlock the retention bonus + 15% rate!
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

export default RecurringView;
