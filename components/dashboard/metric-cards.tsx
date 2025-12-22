'use client';

import Link from 'next/link';
import {
  DollarSign,
  Briefcase,
  UserPlus,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string;
  change: number;
  changeLabel: string;
  icon: React.ElementType;
  href: string;
  color: 'primary' | 'secondary' | 'success' | 'warning';
}

const colorMap = {
  primary: 'bg-primary/10 text-primary',
  secondary: 'bg-secondary/10 text-secondary',
  success: 'bg-green-500/10 text-green-600',
  warning: 'bg-amber-500/10 text-amber-600',
};

function MetricCard({
  title,
  value,
  change,
  changeLabel,
  icon: Icon,
  href,
  color,
}: MetricCardProps) {
  const isPositive = change >= 0;

  return (
    <Link
      href={href}
      className="group relative p-5 bg-card rounded-xl border shadow-soft hover:shadow-medium transition-all duration-200"
    >
      <div className="flex items-start justify-between">
        <div className={cn('p-2.5 rounded-lg', colorMap[color])}>
          <Icon className="w-5 h-5" />
        </div>

        {change !== 0 && (
          <div
            className={cn(
              'flex items-center gap-1 text-sm font-medium',
              isPositive ? 'text-green-600' : 'text-red-500'
            )}
          >
            {isPositive ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            {Math.abs(change)}%
          </div>
        )}
      </div>

      <div className="mt-4">
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-muted-foreground mt-1">{title}</p>
      </div>

      <p className="text-xs text-muted-foreground mt-2">{changeLabel}</p>

      {/* Hover arrow */}
      <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <ArrowRight className="w-4 h-4 text-muted-foreground" />
      </div>
    </Link>
  );
}

export interface MetricData {
  revenue: number;
  revenueChange: number;
  activeJobs: number;
  jobsChange: number;
  newLeads: number;
  leadsChange: number;
  unreadMessages: number;
}

interface MetricCardsProps {
  data?: MetricData;
  loading?: boolean;
}

export function MetricCards({ data, loading }: MetricCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  const metrics = data || {
    revenue: 0,
    revenueChange: 0,
    activeJobs: 0,
    jobsChange: 0,
    newLeads: 0,
    leadsChange: 0,
    unreadMessages: 0,
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        title="Revenue (MTD)"
        value={`$${metrics.revenue.toLocaleString()}`}
        change={metrics.revenueChange}
        changeLabel="vs last month"
        icon={DollarSign}
        href="/reports/revenue"
        color="success"
      />

      <MetricCard
        title="Active Jobs"
        value={metrics.activeJobs.toString()}
        change={metrics.jobsChange}
        changeLabel="vs last week"
        icon={Briefcase}
        href="/jobs?status=active"
        color="primary"
      />

      <MetricCard
        title="New Leads"
        value={metrics.newLeads.toString()}
        change={metrics.leadsChange}
        changeLabel="vs last week"
        icon={UserPlus}
        href="/leads?status=new"
        color="secondary"
      />

      <MetricCard
        title="Unread Messages"
        value={metrics.unreadMessages.toString()}
        change={0}
        changeLabel="needs attention"
        icon={MessageSquare}
        href="/messages?filter=unread"
        color="warning"
      />
    </div>
  );
}
