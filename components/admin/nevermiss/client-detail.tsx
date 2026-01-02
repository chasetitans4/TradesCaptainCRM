'use client';

// =====================================================
// NEVERMISS CLIENT DETAIL
// Detailed view for a single client's Leads Captain performance
// Version: 5.8
// =====================================================

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Phone,
  MessageSquare,
  Calendar,
  Clock,
  TrendingUp,
  ArrowLeft,
  ArrowUpRight,
  Mail,
} from 'lucide-react';

interface ClientDetailData {
  client: {
    id: string;
    name: string;
    plan_type: string;
    phone_number?: string;
  };
  usage: {
    sms_used: number;
    sms_cap: number;
    leads_captured: number;
    appointments_booked: number;
    percentage: number;
  };
  stats: {
    missed_calls: number;
    capture_rate: number;
    booking_rate: number;
    avg_response_time_seconds: number;
  };
  quality_breakdown: {
    booked: number;
    needs_callback: number;
    no_response: number;
  };
  trend_data: {
    month: string;
    sms_used: number;
  }[];
}

interface ClientDetailProps {
  data?: ClientDetailData | null;
  loading?: boolean;
  onBack?: () => void;
  onContactClient?: () => void;
  onSuggestUpgrade?: () => void;
}

export function NevermissClientDetail({
  data,
  loading,
  onBack,
  onContactClient,
  onSuggestUpgrade,
}: ClientDetailProps) {
  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground text-center">Client not found</p>
        </CardContent>
      </Card>
    );
  }

  const { client, usage, stats, quality_breakdown, trend_data } = data;

  const formatPlanName = (planType: string) => {
    return planType
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const usageStatus =
    usage.percentage > 100
      ? 'over_cap'
      : usage.percentage >= 80
      ? 'near_cap'
      : 'healthy';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <MessageSquare className="h-6 w-6 text-primary" />
              Leads Captain: {client.name}
            </h2>
            <p className="text-muted-foreground">
              Plan: {formatPlanName(client.plan_type)} — {usage.sms_cap.toLocaleString()}{' '}
              SMS/mo
              {client.phone_number && (
                <>
                  {' '}
                  | Number:{' '}
                  <span className="font-mono">{client.phone_number}</span>
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onContactClient}>
            <Mail className="h-4 w-4 mr-2" />
            Contact Client
          </Button>
          {usageStatus !== 'healthy' && (
            <Button onClick={onSuggestUpgrade}>
              <ArrowUpRight className="h-4 w-4 mr-2" />
              Suggest Upgrade
            </Button>
          )}
        </div>
      </div>

      {/* SMS Usage Bar */}
      <Card
        className={
          usageStatus === 'over_cap'
            ? 'border-destructive'
            : usageStatus === 'near_cap'
            ? 'border-warning'
            : ''
        }
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">This Month SMS Usage</span>
            <Badge
              variant={
                usageStatus === 'over_cap'
                  ? 'destructive'
                  : usageStatus === 'near_cap'
                  ? 'outline'
                  : 'default'
              }
              className={
                usageStatus === 'near_cap' ? 'border-warning text-warning' : ''
              }
            >
              {usage.sms_used.toLocaleString()} / {usage.sms_cap.toLocaleString()} (
              {usage.percentage}%)
            </Badge>
          </div>
          <Progress
            value={Math.min(usage.percentage, 100)}
            className={`h-3 ${
              usageStatus === 'over_cap'
                ? '[&>div]:bg-destructive'
                : usageStatus === 'near_cap'
                ? '[&>div]:bg-warning'
                : ''
            }`}
          />
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Missed Calls</span>
              <Phone className="h-5 w-5 text-primary" />
            </div>
            <div className="mt-2">
              <span className="text-3xl font-bold">{stats.missed_calls}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Captured</span>
              <MessageSquare className="h-5 w-5 text-success" />
            </div>
            <div className="mt-2">
              <span className="text-3xl font-bold">{usage.leads_captured}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {stats.capture_rate}% rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Booked</span>
              <Calendar className="h-5 w-5 text-warning" />
            </div>
            <div className="mt-2">
              <span className="text-3xl font-bold">{usage.appointments_booked}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {stats.booking_rate}% of leads
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Avg Response</span>
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div className="mt-2">
              <span className="text-3xl font-bold">
                {stats.avg_response_time_seconds < 60
                  ? `${stats.avg_response_time_seconds}s`
                  : `${Math.round(stats.avg_response_time_seconds / 60)}m`}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">response time</p>
          </CardContent>
        </Card>
      </div>

      {/* Quality Breakdown & Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quality Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Lead Quality Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-success" />
                  Booked Appointments
                </span>
                <span className="font-medium">{quality_breakdown.booked}</span>
              </div>
              <Progress
                value={
                  stats.missed_calls > 0
                    ? (quality_breakdown.booked / stats.missed_calls) * 100
                    : 0
                }
                className="h-2 [&>div]:bg-success"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-warning" />
                  Needs Callback
                </span>
                <span className="font-medium">{quality_breakdown.needs_callback}</span>
              </div>
              <Progress
                value={
                  stats.missed_calls > 0
                    ? (quality_breakdown.needs_callback / stats.missed_calls) * 100
                    : 0
                }
                className="h-2 [&>div]:bg-warning"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  No Response
                </span>
                <span className="font-medium">{quality_breakdown.no_response}</span>
              </div>
              <Progress
                value={
                  stats.missed_calls > 0
                    ? (quality_breakdown.no_response / stats.missed_calls) * 100
                    : 0
                }
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>

        {/* SMS Usage Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              SMS Usage Trend (Last 6 Months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 flex items-end justify-between gap-2">
              {trend_data.map((month, idx) => {
                const heightPercent =
                  usage.sms_cap > 0
                    ? Math.min((month.sms_used / usage.sms_cap) * 100, 100)
                    : 0;
                return (
                  <div
                    key={idx}
                    className="flex-1 flex flex-col items-center gap-2"
                  >
                    <div className="w-full flex flex-col items-center">
                      <span className="text-xs text-muted-foreground mb-1">
                        {month.sms_used}
                      </span>
                      <div
                        className={`w-full rounded-t transition-all ${
                          heightPercent >= 100
                            ? 'bg-destructive'
                            : heightPercent >= 80
                            ? 'bg-warning'
                            : 'bg-primary'
                        }`}
                        style={{ height: `${Math.max(heightPercent * 1.5, 8)}px` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {month.month}
                    </span>
                  </div>
                );
              })}
            </div>
            {/* Cap line indicator */}
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-4 h-0.5 bg-border" />
              Cap: {usage.sms_cap.toLocaleString()}
            </div>
            {/* Trend insight */}
            {trend_data.length >= 2 && (
              <p className="mt-2 text-sm text-muted-foreground">
                {(() => {
                  const lastTwo = trend_data.slice(-2);
                  const change =
                    lastTwo[0].sms_used > 0
                      ? Math.round(
                          ((lastTwo[1].sms_used - lastTwo[0].sms_used) /
                            lastTwo[0].sms_used) *
                            100
                        )
                      : 0;
                  if (change > 10) {
                    return `📈 Trending up ${change}% — Consider upgrade to higher tier`;
                  } else if (change < -10) {
                    return `📉 Trending down ${Math.abs(change)}% — May need check-in`;
                  } else {
                    return '📊 Usage is stable month over month';
                  }
                })()}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default NevermissClientDetail;
