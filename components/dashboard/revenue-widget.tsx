'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  RefreshCw,
  ChevronRight,
  Wallet,
  Receipt,
  AlertCircle,
} from 'lucide-react';

interface RevenueMetrics {
  mtd: {
    collected: number;
    invoiced: number;
    outstanding: number;
  };
  ytd: {
    collected: number;
    invoiced: number;
  };
  lastMonth: {
    collected: number;
    invoiced: number;
  };
  comparison: {
    mtdVsLastMonth: number;
    ytdVsLastYear: number;
  };
}

interface RevenueWidgetProps {
  className?: string;
  compact?: boolean;
}

export function RevenueWidget({ className, compact = false }: RevenueWidgetProps) {
  const [metrics, setMetrics] = useState<RevenueMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMetrics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/dashboard/revenue');
      if (!response.ok) {
        throw new Error('Failed to load revenue data');
      }
      const data = await response.json();
      setMetrics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  const formatCurrency = (amount: number): string => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}K`;
    }
    return `$${amount.toFixed(0)}`;
  };

  const formatFullCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className={cn('card p-4', className)}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-text">Revenue</h3>
          </div>
          <RefreshCw className="h-4 w-4 text-muted-foreground animate-spin" />
        </div>
        <div className="space-y-3">
          <div className="h-16 skeleton rounded-lg" />
          <div className="grid grid-cols-2 gap-2">
            <div className="h-12 skeleton rounded-lg" />
            <div className="h-12 skeleton rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('card p-4', className)}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-text">Revenue</h3>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={loadMetrics}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="link" size="sm" onClick={loadMetrics} className="mt-2">
            Try again
          </Button>
        </div>
      </div>
    );
  }

  if (!metrics) return null;

  if (compact) {
    return (
      <Link href="/reports/revenue" className={cn('card p-4 active:scale-[0.98]', className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/10">
              <DollarSign className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text">{formatCurrency(metrics.mtd.collected)}</p>
              <p className="text-xs text-muted-foreground">MTD Collected</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <ComparisonBadge value={metrics.comparison.mtdVsLastMonth} />
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      </Link>
    );
  }

  return (
    <div className={cn('card p-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-text">Revenue</h3>
        </div>
        <Link href="/reports/revenue" className="flex items-center gap-1 text-sm text-primary">
          Details
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Main MTD Metric */}
      <div className="bg-gradient-to-br from-success/10 to-success/5 rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Month to Date</p>
            <p className="text-3xl font-bold text-text">{formatFullCurrency(metrics.mtd.collected)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Collected of {formatFullCurrency(metrics.mtd.invoiced)} invoiced
            </p>
          </div>
          <ComparisonBadge value={metrics.comparison.mtdVsLastMonth} size="lg" />
        </div>
      </div>

      {/* Secondary Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* YTD */}
        <div className="bg-muted/50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Year to Date</span>
          </div>
          <p className="text-lg font-semibold text-text">{formatCurrency(metrics.ytd.collected)}</p>
          <div className="flex items-center gap-1 mt-1">
            <ComparisonBadge value={metrics.comparison.ytdVsLastYear} size="sm" />
            <span className="text-xs text-muted-foreground">vs last year</span>
          </div>
        </div>

        {/* Outstanding */}
        <div className="bg-muted/50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Receipt className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Outstanding</span>
          </div>
          <p className="text-lg font-semibold text-text">{formatCurrency(metrics.mtd.outstanding)}</p>
          <Link
            href="/invoices?filter=unpaid"
            className="text-xs text-primary flex items-center gap-1 mt-1"
          >
            View invoices
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Last Month Reference */}
      <div className="pt-3 border-t border-border">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Last month collected</span>
          <span className="font-medium text-text">{formatFullCurrency(metrics.lastMonth.collected)}</span>
        </div>
      </div>
    </div>
  );
}

// Comparison badge component
interface ComparisonBadgeProps {
  value: number;
  size?: 'sm' | 'md' | 'lg';
}

function ComparisonBadge({ value, size = 'md' }: ComparisonBadgeProps) {
  const isPositive = value >= 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  return (
    <div
      className={cn(
        'flex items-center gap-1 rounded-full font-medium',
        sizeClasses[size],
        isPositive ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
      )}
    >
      <Icon className={iconSizes[size]} />
      <span>{isPositive ? '+' : ''}{value}%</span>
    </div>
  );
}

// Export compact version for stats grid
export function RevenueStatCard({ className }: { className?: string }) {
  return <RevenueWidget compact className={className} />;
}
