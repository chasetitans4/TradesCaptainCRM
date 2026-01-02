'use client';

// =====================================================
// BONUSES VIEW COMPONENT
// Shows retention bonuses and upcoming milestones
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
import {
  Gift,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Phone,
  ClipboardList,
  Trophy,
  Star,
} from 'lucide-react';
import { useBonuses } from '@/hooks/useCommissionDashboard';

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(cents / 100);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function getMilestoneIcon(milestone: string) {
  if (milestone.includes('12')) return <Trophy className="h-4 w-4 text-warning" />;
  if (milestone.includes('6')) return <Star className="h-4 w-4 text-warning" />;
  return null;
}

export function BonusesView() {
  const { data, loading, error } = useBonuses();

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
      {/* Upcoming Bonuses */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-5 w-5 text-primary" />
            Upcoming Bonuses (Next 30 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.upcoming.length === 0 ? (
            <p className="text-text-muted text-sm">
              No upcoming bonuses in the next 30 days.
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Milestone</TableHead>
                    <TableHead className="text-right">Bonus</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Required</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.upcoming.map((item) => (
                    <TableRow key={`${item.customerId}-${item.milestone}`}>
                      <TableCell className="font-medium">
                        {item.customerName}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {getMilestoneIcon(item.milestone)}
                          {item.milestone}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium text-success">
                        {formatCurrency(item.bonus)}
                      </TableCell>
                      <TableCell>{formatDate(item.dueDate)}</TableCell>
                      <TableCell className="text-text-muted text-sm">
                        {item.required}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-4 pt-4 border-t flex justify-between items-center">
                <span className="text-sm text-text-muted">Potential</span>
                <span className="font-semibold text-success">
                  {formatCurrency(data.totalPotential)}
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Earned This Month */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Gift className="h-5 w-5 text-success" />
            Earned This Month
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.earnedThisMonth.length === 0 ? (
            <p className="text-text-muted text-sm">
              No bonuses earned this month yet.
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Milestone</TableHead>
                    <TableHead className="text-center">Count</TableHead>
                    <TableHead className="text-right">Amount Each</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.earnedThisMonth.map((item) => (
                    <TableRow key={item.milestone}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-1">
                          {getMilestoneIcon(item.milestone)}
                          {item.milestone}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {item.count} x
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.amountEach)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.total)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="default" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Complete
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-4 pt-4 border-t flex justify-between items-center">
                <span className="font-semibold">Total Earned</span>
                <span className="font-bold text-lg text-success">
                  {formatCurrency(data.totalEarned)}
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Missed/Paused */}
      {data.missed.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-warning">
              <AlertTriangle className="h-5 w-5" />
              Missed/Paused
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Milestone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Grace Period</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.missed.map((item) => (
                  <TableRow key={`${item.customerId}-${item.milestone}`}>
                    <TableCell className="font-medium">
                      {item.customerName}
                    </TableCell>
                    <TableCell>{item.milestone}</TableCell>
                    <TableCell>
                      <Badge
                        variant={item.status === 'paused' ? 'secondary' : 'warning'}
                      >
                        {item.status === 'paused' ? 'PAUSED' : 'MISSED'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {item.gracePeriodDays !== undefined && item.gracePeriodDays > 0 ? (
                        <span className="text-warning">
                          {item.gracePeriodDays} days left
                        </span>
                      ) : (
                        <span className="text-text-muted">Expired</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Phone className="h-3 w-3 mr-1" />
                          Call
                        </Button>
                        <Button size="sm" variant="outline">
                          <ClipboardList className="h-3 w-3 mr-1" />
                          Log
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Alert className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Missed touchpoints pause recurring until completed. Complete within
                14 days to avoid losing that month&apos;s commission.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default BonusesView;
