'use client';

// =====================================================
// PERFORMANCE SUMMARY COMPONENT
// Shows key performance metrics
// Version: 5.8
// =====================================================

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, DollarSign, Target, Percent, Award } from 'lucide-react';

interface PerformanceSummary {
  deals_won: number;
  deals_won_change: number;
  revenue_monthly: number;
  revenue_change: number;
  avg_deal_size: number;
  avg_deal_change: number;
  win_rate: number;
  win_rate_change: number;
}

interface PerformanceSummaryProps {
  summary: PerformanceSummary | null;
  loading: boolean;
}

export function PerformanceSummaryCards({
  summary,
  loading,
}: PerformanceSummaryProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!summary) return null;

  const getChangeIcon = (change: number) => {
    if (change > 0) {
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    }
    if (change < 0) {
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    }
    return null;
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-500';
    if (change < 0) return 'text-red-500';
    return 'text-muted-foreground';
  };

  const cards = [
    {
      label: 'Deals Won',
      value: summary.deals_won,
      change: summary.deals_won_change,
      icon: Award,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50',
    },
    {
      label: 'Revenue',
      value: `$${summary.revenue_monthly.toLocaleString()}`,
      change: summary.revenue_change,
      icon: DollarSign,
      color: 'text-green-500',
      bgColor: 'bg-green-50',
    },
    {
      label: 'Avg Deal Size',
      value: `$${summary.avg_deal_size.toLocaleString()}`,
      change: summary.avg_deal_change,
      icon: Target,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
    },
    {
      label: 'Win Rate',
      value: `${summary.win_rate}%`,
      change: summary.win_rate_change,
      icon: Percent,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-50',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{card.label}</p>
                <p className="text-2xl font-bold">{card.value}</p>
                {card.change !== 0 && (
                  <div
                    className={`flex items-center gap-1 text-sm ${getChangeColor(
                      card.change
                    )}`}
                  >
                    {getChangeIcon(card.change)}
                    <span>{Math.abs(card.change)}% vs prev</span>
                  </div>
                )}
              </div>
              <div className={`p-3 rounded-full ${card.bgColor}`}>
                <card.icon className={`h-6 w-6 ${card.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
