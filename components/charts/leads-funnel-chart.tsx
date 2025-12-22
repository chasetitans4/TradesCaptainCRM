'use client';

import { cn } from '@/lib/utils';

interface LeadsFunnelProps {
  stages: { name: string; value: number; color: string }[];
  className?: string;
}

export function LeadsFunnelChart({ stages, className }: LeadsFunnelProps) {
  const maxValue = Math.max(...stages.map((s) => s.value));

  return (
    <div className={cn('bg-card border rounded-xl p-6', className)}>
      <h3 className="font-semibold mb-6">Leads Pipeline</h3>
      <div className="space-y-3">
        {stages.map((stage, index) => {
          const width = (stage.value / maxValue) * 100;
          const conversionRate =
            index > 0
              ? ((stage.value / stages[index - 1].value) * 100).toFixed(0)
              : null;

          return (
            <div key={stage.name}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">{stage.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{stage.value}</span>
                  {conversionRate && (
                    <span className="text-xs text-muted-foreground">
                      ({conversionRate}%)
                    </span>
                  )}
                </div>
              </div>
              <div className="h-8 bg-muted rounded-lg overflow-hidden">
                <div
                  className="h-full rounded-lg transition-all duration-500"
                  style={{ width: `${width}%`, backgroundColor: stage.color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
