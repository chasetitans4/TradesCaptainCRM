'use client';

// =====================================================
// COMMISSION SUMMARY CARDS
// Top-level summary cards for commission dashboard
// Version: 5.8.1
// =====================================================

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  DollarSign,
  Clock,
  TrendingUp,
  Target,
  CheckCircle2,
} from 'lucide-react';
import type { CommissionSummary } from '@/lib/admin/commission-tracker';

interface SummaryCardsProps {
  data?: CommissionSummary | null;
  loading?: boolean;
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

export function SummaryCards({ data, loading }: SummaryCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-32 mb-1" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data) return null;

  const cards = [
    {
      label: 'Paid',
      value: data.paid,
      icon: CheckCircle2,
      color: 'text-success',
      bgColor: 'bg-success/10',
      subtitle: 'Deposited',
    },
    {
      label: 'Pending',
      value: data.pending,
      icon: Clock,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      subtitle: 'Awaiting',
    },
    {
      label: 'Projected',
      value: data.projected,
      icon: TrendingUp,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      subtitle: 'If all close',
    },
    {
      label: 'Goal',
      value: data.goal,
      icon: Target,
      color: 'text-secondary',
      bgColor: 'bg-secondary/10',
      subtitle: `${data.goalProgress}%`,
      showProgress: true,
      progress: data.goalProgress,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-text-muted">
                {card.label}
              </span>
              <div className={`p-2 rounded-full ${card.bgColor}`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold">{formatCurrency(card.value)}</p>
              {card.showProgress ? (
                <div className="space-y-1">
                  <Progress value={card.progress} className="h-2" />
                  <p className="text-xs text-text-muted">{card.subtitle}</p>
                </div>
              ) : (
                <p className="text-xs text-text-muted">{card.subtitle}</p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default SummaryCards;
