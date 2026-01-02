'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Users,
  MessageSquare,
  UserCheck,
  PhoneCall,
  Calendar,
  CheckCircle,
  Clock,
  Zap,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import type { OutreachDashboardStats } from '@/types/outreach';

interface MetricsDashboardProps {
  stats: OutreachDashboardStats;
  isLoading?: boolean;
}

interface MetricCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: number;
  color?: string;
}

function MetricCard({ title, value, subtitle, icon, trend, color = 'text-primary' }: MetricCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className={`p-3 rounded-lg bg-muted ${color}`}>
            {icon}
          </div>
        </div>
        {trend !== undefined && (
          <div className="mt-4 flex items-center gap-1 text-sm">
            {trend >= 0 ? (
              <TrendingUp className="w-4 h-4 text-green-500" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-500" />
            )}
            <span className={trend >= 0 ? 'text-green-500' : 'text-red-500'}>
              {Math.abs(trend)}%
            </span>
            <span className="text-muted-foreground">vs last period</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function formatSeconds(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

export function MetricsDashboard({ stats, isLoading }: MetricsDashboardProps) {
  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="h-20 animate-pulse bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const { today, week, speed_metrics, conversion_funnel } = stats;

  return (
    <div className="space-y-6">
      {/* Today's Stats */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Today</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <MetricCard
            title="New Leads"
            value={today.new_leads}
            icon={<Users className="w-5 h-5" />}
          />
          <MetricCard
            title="Replies"
            value={today.replies}
            icon={<MessageSquare className="w-5 h-5" />}
            color="text-blue-500"
          />
          <MetricCard
            title="Qualified"
            value={today.qualified}
            icon={<UserCheck className="w-5 h-5" />}
            color="text-green-500"
          />
          <MetricCard
            title="Calls Scheduled"
            value={today.calls_scheduled}
            icon={<Calendar className="w-5 h-5" />}
            color="text-amber-500"
          />
          <MetricCard
            title="Calls Completed"
            value={today.calls_completed}
            icon={<PhoneCall className="w-5 h-5" />}
            color="text-purple-500"
          />
        </div>
      </div>

      {/* Week Stats */}
      <div>
        <h3 className="text-lg font-semibold mb-4">This Week</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total Leads"
            value={week.new_leads}
            subtitle={`${week.replies} replies (${week.new_leads > 0 ? Math.round((week.replies / week.new_leads) * 100) : 0}% reply rate)`}
            icon={<Users className="w-5 h-5" />}
          />
          <MetricCard
            title="Qualified Leads"
            value={week.qualified}
            subtitle={`${week.replies > 0 ? Math.round((week.qualified / week.replies) * 100) : 0}% qualification rate`}
            icon={<UserCheck className="w-5 h-5" />}
            color="text-green-500"
          />
          <MetricCard
            title="Calls"
            value={`${week.calls_completed} / ${week.calls_scheduled}`}
            subtitle="Completed / Scheduled"
            icon={<PhoneCall className="w-5 h-5" />}
            color="text-purple-500"
          />
          <MetricCard
            title="Conversions"
            value={week.conversions || 0}
            subtitle={`${week.calls_completed > 0 ? Math.round(((week.conversions || 0) / week.calls_completed) * 100) : 0}% close rate`}
            icon={<CheckCircle className="w-5 h-5" />}
            color="text-emerald-500"
          />
        </div>
      </div>

      {/* Speed Metrics */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              Speed to Lead
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Avg. First Text</span>
                <span className="font-medium">
                  {formatSeconds(speed_metrics.avg_first_text_seconds)}
                </span>
              </div>
              <Progress
                value={Math.min(100, 100 - (speed_metrics.avg_first_text_seconds / 60) * 100)}
                className="h-2"
              />
              <p className="text-xs text-muted-foreground">
                Target: Under 60 seconds
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Avg. Reply to Booked</span>
                <span className="font-medium">
                  {formatSeconds(speed_metrics.avg_reply_to_booked_seconds)}
                </span>
              </div>
              <Progress
                value={Math.min(100, 100 - (speed_metrics.avg_reply_to_booked_seconds / 1800) * 100)}
                className="h-2"
              />
              <p className="text-xs text-muted-foreground">
                Target: Under 30 minutes
              </p>
            </div>

            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <p className="text-sm font-medium">Under 60 Seconds</p>
                <p className="text-xs text-muted-foreground">
                  Leads contacted within target
                </p>
              </div>
              <div className="text-2xl font-bold text-green-500">
                {speed_metrics.percent_under_60_seconds}%
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Conversion Funnel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              Conversion Funnel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { label: 'Contacted', value: conversion_funnel.contacted, color: 'bg-blue-500' },
                { label: 'Replied', value: conversion_funnel.replied, color: 'bg-indigo-500' },
                { label: 'Qualified', value: conversion_funnel.qualified, color: 'bg-purple-500' },
                { label: 'Scheduled', value: conversion_funnel.scheduled, color: 'bg-amber-500' },
                { label: 'Converted', value: conversion_funnel.converted, color: 'bg-green-500' },
              ].map((stage, index, arr) => {
                const prevValue = index > 0 ? arr[index - 1].value : conversion_funnel.contacted;
                const conversionRate = prevValue > 0 ? Math.round((stage.value / prevValue) * 100) : 0;
                const widthPercent = conversion_funnel.contacted > 0
                  ? Math.max(10, (stage.value / conversion_funnel.contacted) * 100)
                  : 10;

                return (
                  <div key={stage.label} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{stage.label}</span>
                      <span className="font-medium">
                        {stage.value}
                        {index > 0 && (
                          <span className="text-muted-foreground ml-1">
                            ({conversionRate}%)
                          </span>
                        )}
                      </span>
                    </div>
                    <div
                      className={`h-8 ${stage.color} rounded flex items-center justify-center text-white text-xs font-medium transition-all`}
                      style={{ width: `${widthPercent}%` }}
                    >
                      {stage.value}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
