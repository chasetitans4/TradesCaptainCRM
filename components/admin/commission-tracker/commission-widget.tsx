'use client';

// =====================================================
// COMMISSION WIDGET
// Mini summary widget for main dashboard
// Version: 5.8.1
// =====================================================

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useCommissionDashboard } from '@/hooks/useCommissionDashboard';

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

export function CommissionWidget() {
  const { data, loading } = useCommissionDashboard('this_month');

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="h-4 w-4 text-success" />
            This Month
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-8 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <DollarSign className="h-4 w-4 text-success" />
          This Month
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-sm text-text-muted">Earned:</span>
            <span className="font-semibold text-success">
              {formatCurrency(data.summary.paid)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-text-muted">Pending:</span>
            <span className="font-medium text-warning">
              {formatCurrency(data.summary.pending)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-text-muted">Projected:</span>
            <span className="font-medium">
              {formatCurrency(data.summary.projected)}
            </span>
          </div>
        </div>

        <Button variant="outline" size="sm" className="w-full" asChild>
          <Link href="/admin/commissions">
            View Full Dashboard
            <ArrowRight className="h-4 w-4 ml-2" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export default CommissionWidget;
