'use client';

// =====================================================
// EARNINGS BREAKDOWN COMPONENT
// Shows breakdown of commission by type
// Version: 5.8.1
// =====================================================

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import type { EarningsBreakdown as EarningsBreakdownType } from '@/lib/admin/commission-tracker';

interface EarningsBreakdownProps {
  data?: EarningsBreakdownType | null;
  loading?: boolean;
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

export function EarningsBreakdown({ data, loading }: EarningsBreakdownProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-2 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const total = data.total || 1; // Prevent division by zero
  const items = [
    {
      label: 'Upfront Commissions',
      value: data.upfront,
      percentage: Math.round((data.upfront / total) * 100),
      color: 'bg-primary',
    },
    {
      label: 'Recurring (10% rate)',
      value: data.recurring_10,
      percentage: Math.round((data.recurring_10 / total) * 100),
      color: 'bg-blue-500',
    },
    {
      label: 'Recurring (15% rate)',
      value: data.recurring_15,
      percentage: Math.round((data.recurring_15 / total) * 100),
      color: 'bg-purple-500',
    },
    {
      label: 'Retention Bonuses',
      value: data.bonuses,
      percentage: Math.round((data.bonuses / total) * 100),
      color: 'bg-success',
    },
  ];

  // Filter out zero values
  const filteredItems = items.filter((item) => item.value > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Earnings Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {filteredItems.map((item) => (
          <div key={item.label} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-muted">{item.label}</span>
              <div className="flex items-center gap-2">
                <span className="font-medium">{formatCurrency(item.value)}</span>
                <span className="text-text-muted text-xs">{item.percentage}%</span>
              </div>
            </div>
            <Progress value={item.percentage} className={`h-2 [&>div]:${item.color}`} />
          </div>
        ))}

        <div className="pt-4 border-t">
          <div className="flex items-center justify-between">
            <span className="font-semibold">Total Earned</span>
            <span className="font-bold text-lg">{formatCurrency(data.total)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default EarningsBreakdown;
