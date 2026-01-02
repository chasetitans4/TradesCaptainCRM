'use client';

// =====================================================
// LEADS CAPTAIN SUMMARY CARDS
// Portfolio summary metrics for agent dashboard
// Version: 5.8
// =====================================================

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Phone, MessageSquare, Calendar, TrendingUp } from 'lucide-react';

interface SummaryData {
  total_missed_calls: number;
  total_leads_captured: number;
  total_appointments_booked: number;
  response_rate: number;
  missed_calls_change: number;
}

interface SummaryCardsProps {
  data?: SummaryData;
  loading?: boolean;
}

export function LeadsCaptainSummaryCards({ data, loading }: SummaryCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-20 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data) return null;

  const captureRate = data.total_missed_calls > 0
    ? Math.round((data.total_leads_captured / data.total_missed_calls) * 100)
    : 0;

  const bookingRate = data.total_leads_captured > 0
    ? Math.round((data.total_appointments_booked / data.total_leads_captured) * 100)
    : 0;

  const cards = [
    {
      label: 'Missed Calls',
      value: data.total_missed_calls.toLocaleString(),
      subtext: data.missed_calls_change >= 0
        ? `+${data.missed_calls_change}% vs last`
        : `${data.missed_calls_change}% vs last`,
      icon: Phone,
      iconColor: 'text-primary',
    },
    {
      label: 'Leads Captured',
      value: data.total_leads_captured.toLocaleString(),
      subtext: `${captureRate}% capture`,
      icon: MessageSquare,
      iconColor: 'text-success',
    },
    {
      label: 'Booked Appointments',
      value: data.total_appointments_booked.toLocaleString(),
      subtext: `${bookingRate}% of leads`,
      icon: Calendar,
      iconColor: 'text-warning',
    },
    {
      label: 'Response Rate',
      value: `${data.response_rate}%`,
      subtext: data.response_rate >= 80 ? 'Excellent' : data.response_rate >= 60 ? 'Good' : 'Needs attention',
      icon: TrendingUp,
      iconColor: data.response_rate >= 80 ? 'text-success' : data.response_rate >= 60 ? 'text-warning' : 'text-destructive',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => (
        <Card key={idx}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{card.label}</span>
              <card.icon className={`h-5 w-5 ${card.iconColor}`} />
            </div>
            <div className="mt-2">
              <span className="text-3xl font-bold">{card.value}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{card.subtext}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default LeadsCaptainSummaryCards;
