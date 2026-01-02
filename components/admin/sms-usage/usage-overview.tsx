'use client';

// =====================================================
// SMS USAGE OVERVIEW COMPONENT
// Summary cards for SMS usage
// Version: 5.8
// =====================================================

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquare, AlertTriangle, TrendingUp, DollarSign } from 'lucide-react';

interface UsageSummary {
  total_clients: number;
  over_cap: number;
  near_cap: number;
  under_cap: number;
  total_messages: number;
  total_overage_revenue: number;
}

interface UsageOverviewProps {
  summary: UsageSummary | null;
  loading: boolean;
}

export function UsageOverview({ summary, loading }: UsageOverviewProps) {
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

  const cards = [
    {
      label: 'Total Clients',
      value: summary.total_clients,
      icon: MessageSquare,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
    },
    {
      label: 'Over Cap',
      value: summary.over_cap,
      icon: AlertTriangle,
      color: 'text-red-500',
      bgColor: 'bg-red-50',
      alert: summary.over_cap > 0,
    },
    {
      label: 'Near Cap (80%+)',
      value: summary.near_cap,
      icon: TrendingUp,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-50',
      alert: summary.near_cap > 0,
    },
    {
      label: 'Overage Revenue',
      value: `$${summary.total_overage_revenue.toFixed(2)}`,
      icon: DollarSign,
      color: 'text-green-500',
      bgColor: 'bg-green-50',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.label} className={card.alert ? 'border-destructive' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{card.label}</p>
                <p className="text-2xl font-bold">{card.value}</p>
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
