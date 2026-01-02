'use client';

// =====================================================
// PENDING COMMISSIONS COMPONENT
// Shows awaiting payment and clawback risk
// Version: 5.8.1
// =====================================================

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { Clock, AlertTriangle, Phone, CheckCircle, Lightbulb } from 'lucide-react';
import { usePendingCommissions } from '@/hooks/useCommissionDashboard';

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

export function PendingCommissions() {
  const { data, loading, error } = usePendingCommissions();

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
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
      {/* Awaiting Payment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-5 w-5 text-warning" />
            Awaiting Payment (Customer Month 1-2)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.awaitingPayment.length === 0 ? (
            <p className="text-text-muted text-sm">
              No commissions awaiting unlock.
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead className="text-right">Upfront</TableHead>
                    <TableHead>Unlocks</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.awaitingPayment.map((item) => (
                    <TableRow key={item.customerId}>
                      <TableCell className="font-medium">
                        {item.customerName}
                      </TableCell>
                      <TableCell>{item.planName}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.upfront)}
                      </TableCell>
                      <TableCell>{formatDate(item.unlocksDate)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={item.monthStatus === 'paid' ? 'default' : 'secondary'}
                        >
                          M{item.currentMonth}{' '}
                          {item.monthStatus === 'paid' ? (
                            <CheckCircle className="h-3 w-3 ml-1" />
                          ) : (
                            <Clock className="h-3 w-3 ml-1" />
                          )}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-4 pt-4 border-t flex justify-between items-center">
                <span className="text-sm text-text-muted">Subtotal</span>
                <span className="font-semibold">
                  {formatCurrency(data.totalAwaiting)}
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Clawback Risk */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Clawback Risk (Customers at risk of canceling)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.clawbackRisk.length === 0 ? (
            <p className="text-text-muted text-sm">
              No customers at risk. Great retention!
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead className="text-right">At Risk</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.clawbackRisk.map((item) => (
                    <TableRow key={item.customerId}>
                      <TableCell className="font-medium">
                        {item.customerName}
                      </TableCell>
                      <TableCell>{item.planName}</TableCell>
                      <TableCell className="text-right font-medium text-destructive">
                        {formatCurrency(item.atRiskAmount)}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-text-muted">
                          {item.riskReason}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline">
                          <Phone className="h-3 w-3 mr-1" />
                          Call
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-4 pt-4 border-t flex justify-between items-center">
                <span className="text-sm text-destructive font-medium">
                  Total At Risk
                </span>
                <span className="font-semibold text-destructive">
                  {formatCurrency(data.totalAtRisk)}
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Tip */}
      {data.clawbackRisk.length > 0 && (
        <Alert>
          <Lightbulb className="h-4 w-4" />
          <AlertDescription>
            <strong>Tip:</strong> Customers without login in 14+ days are 3x more
            likely to cancel. A quick check-in call can save your commission!
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

export default PendingCommissions;
