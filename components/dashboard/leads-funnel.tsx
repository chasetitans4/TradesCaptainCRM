'use client';

import Link from 'next/link';
import { ChevronRight, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface FunnelStage {
  name: string;
  count: number;
  color: string;
  href: string;
}

interface LeadsFunnelProps {
  stages?: FunnelStage[];
  loading?: boolean;
  conversionRate?: number;
}

const defaultStages: FunnelStage[] = [
  { name: 'New', count: 0, color: 'bg-blue-500', href: '/leads?status=new' },
  { name: 'Contacted', count: 0, color: 'bg-amber-500', href: '/leads?status=contacted' },
  { name: 'Quoted', count: 0, color: 'bg-purple-500', href: '/leads?status=quoted' },
  { name: 'Won', count: 0, color: 'bg-green-500', href: '/leads?status=won' },
];

export function LeadsFunnel({
  stages = defaultStages,
  loading,
  conversionRate = 0,
}: LeadsFunnelProps) {
  const totalLeads = stages.reduce((acc, stage) => acc + stage.count, 0);
  const maxCount = Math.max(...stages.map((s) => s.count), 1);

  if (loading) {
    return (
      <div className="bg-card rounded-xl border shadow-soft">
        <div className="p-5 border-b">
          <div className="h-6 w-32 bg-muted rounded animate-pulse" />
        </div>
        <div className="p-5 space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i}>
              <div className="h-4 w-20 bg-muted rounded animate-pulse mb-2" />
              <div className="h-8 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border shadow-soft">
      {/* Header */}
      <div className="p-5 border-b flex items-center justify-between">
        <h2 className="font-semibold">Leads Pipeline</h2>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/leads" className="gap-1">
            View All
            <ChevronRight className="w-4 h-4" />
          </Link>
        </Button>
      </div>

      {/* Funnel */}
      <div className="p-5 space-y-4">
        {stages.map((stage, index) => {
          const width = totalLeads > 0 ? (stage.count / maxCount) * 100 : 0;

          return (
            <Link key={stage.name} href={stage.href} className="block group">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium">{stage.name}</span>
                <span className="text-sm text-muted-foreground">{stage.count}</span>
              </div>
              <div className="h-8 bg-muted rounded-lg overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-lg transition-all duration-500 group-hover:opacity-80',
                    stage.color
                  )}
                  style={{ width: `${Math.max(width, 5)}%` }}
                />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Conversion Rate */}
      <div className="p-4 bg-muted/30 border-t">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Conversion Rate</span>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span className="text-sm font-semibold">{conversionRate}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
