'use client';

// =====================================================
// CUSTOMER COMMISSION DETAIL COMPONENT
// Shows detailed commission history for a customer
// Version: 5.8.1
// =====================================================

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  DollarSign,
  User,
  Calendar,
  Star,
  CheckCircle2,
  Clock,
  CalendarDays,
  Lock,
} from 'lucide-react';
import { useCustomerCommission } from '@/hooks/useCommissionDashboard';

interface CustomerCommissionDetailProps {
  customerId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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
    year: 'numeric',
  });
}

function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    upfront: 'Upfront',
    recurring: 'Recurring',
    bonus_m3: 'Month 3 Bonus',
    bonus_m4: 'Month 4 Bonus',
    bonus_m6: 'Month 6 Bonus',
    bonus_m12: 'Month 12 Bonus',
    annual: 'Annual Commission',
    upgrade_upfront: 'Upgrade Upfront',
    upgrade_recurring: 'Upgrade Recurring',
  };
  return labels[type] || type;
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'paid':
      return <CheckCircle2 className="h-4 w-4 text-success" />;
    case 'pending':
      return <Clock className="h-4 w-4 text-warning" />;
    case 'future':
      return <CalendarDays className="h-4 w-4 text-text-muted" />;
    default:
      return null;
  }
}

export function CustomerCommissionDetail({
  customerId,
  open,
  onOpenChange,
}: CustomerCommissionDetailProps) {
  const { data, loading, error } = useCustomerCommission(customerId);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-success" />
            Commission Detail
          </SheetTitle>
          <SheetDescription>
            View complete commission history for this customer.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : !data ? (
            <p className="text-text-muted">Customer not found.</p>
          ) : (
            <div className="space-y-6">
              {/* Customer Info */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <User className="h-4 w-4 text-text-muted" />
                        <span className="font-semibold text-lg">
                          {data.customer.name}
                        </span>
                      </div>
                      <p className="text-sm text-text-muted">
                        {data.customer.plan} — {formatCurrency(data.customer.monthlyPrice)}/mo
                      </p>
                      <p className="text-sm text-text-muted flex items-center gap-1 mt-1">
                        <Calendar className="h-3 w-3" />
                        Started: {formatDate(data.customer.startDate)} (Month{' '}
                        {data.customer.currentMonth})
                      </p>
                    </div>
                    <div className="text-right">
                      {data.customer.rateLocked ? (
                        <Badge variant="default" className="gap-1 bg-success">
                          <Lock className="h-3 w-3" />
                          <Star className="h-3 w-3" />
                          15% LOCKED
                        </Badge>
                      ) : data.customer.currentMonth >= 6 ? (
                        <Badge variant="default" className="gap-1">
                          <Star className="h-3 w-3" />
                          15% Rate
                        </Badge>
                      ) : (
                        <Badge variant="secondary">10% Rate</Badge>
                      )}
                      {data.customer.rateLockDate && (
                        <p className="text-xs text-text-muted mt-1">
                          Since {formatDate(data.customer.rateLockDate)}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Commission Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Commission Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.timeline.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="text-text-muted">
                            {formatDate(item.date)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {getTypeLabel(item.type)}
                              {item.rate === 15 && (
                                <Star className="h-3 w-3 text-warning" />
                              )}
                            </div>
                            {item.notes && (
                              <p className="text-xs text-text-muted">{item.notes}</p>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(item.amount)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {getStatusIcon(item.status)}
                              <span className="capitalize text-sm">{item.status}</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Totals */}
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-text-muted">Total Earned</span>
                      <span className="font-medium">
                        {formatCurrency(data.totals.earned)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-text-muted">Total Pending</span>
                      <span className="font-medium text-warning">
                        {formatCurrency(data.totals.pending)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-text-muted">Remaining (if retained)</span>
                      <span className="font-medium text-text-muted">
                        {formatCurrency(data.totals.remaining)}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">Lifetime from Customer</span>
                      <span className="font-bold text-lg text-success">
                        {formatCurrency(data.totals.lifetime)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-text-muted">Max Possible</span>
                      <span>{formatCurrency(data.totals.maxPossible)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm mt-1">
                      <span className="text-text-muted">You&apos;ve earned</span>
                      <span className="font-medium">
                        {Math.round((data.totals.lifetime / data.totals.maxPossible) * 100)}%
                        of max
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default CustomerCommissionDetail;
