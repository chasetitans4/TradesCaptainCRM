'use client';

// =====================================================
// PIPELINE HEALTH COMPONENT
// Shows leads by stage with metrics
// Version: 5.8
// =====================================================

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, Clock } from 'lucide-react';

interface PipelineStage {
  stage: string;
  leads: number;
  value_cents: number;
  avg_days: number;
  conversion_rate: number;
}

interface PipelineHealthProps {
  stages: PipelineStage[];
  loading: boolean;
}

export function PipelineHealth({ stages, loading }: PipelineHealthProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Pipeline Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  const getStageColor = (stage: string) => {
    const colors: Record<string, string> = {
      new: 'bg-blue-100 text-blue-800',
      contacted: 'bg-purple-100 text-purple-800',
      qualified: 'bg-yellow-100 text-yellow-800',
      proposal: 'bg-orange-100 text-orange-800',
      won: 'bg-green-100 text-green-800',
      lost: 'bg-red-100 text-red-800',
    };
    return colors[stage] || 'bg-gray-100 text-gray-800';
  };

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toLocaleString()}`;
  };

  // Filter out won/lost for active pipeline view
  const activeStages = stages.filter(
    (s) => s.stage !== 'won' && s.stage !== 'lost'
  );
  const totalValue = activeStages.reduce((sum, s) => sum + s.value_cents, 0);
  const totalLeads = activeStages.reduce((sum, s) => sum + s.leads, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Pipeline Health
          </CardTitle>
          <div className="text-sm text-muted-foreground">
            {totalLeads} leads • {formatCurrency(totalValue)} potential
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {activeStages.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No active leads in pipeline
          </div>
        ) : (
          <div className="space-y-3">
            {activeStages.map((stage) => (
              <div
                key={stage.stage}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className={getStageColor(stage.stage)}>
                    {stage.stage.charAt(0).toUpperCase() + stage.stage.slice(1)}
                  </Badge>
                  <span className="font-medium">{stage.leads} leads</span>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div className="text-right">
                    <div className="font-medium">
                      {formatCurrency(stage.value_cents)}
                    </div>
                    <div className="text-muted-foreground">potential</div>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{stage.avg_days}d avg</span>
                  </div>
                </div>
              </div>
            ))}

            {/* Won/Lost Summary */}
            <div className="pt-3 border-t grid grid-cols-2 gap-4">
              {stages
                .filter((s) => s.stage === 'won' || s.stage === 'lost')
                .map((stage) => (
                  <div
                    key={stage.stage}
                    className={`p-3 rounded-lg ${
                      stage.stage === 'won' ? 'bg-green-50' : 'bg-red-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        variant="outline"
                        className={getStageColor(stage.stage)}
                      >
                        {stage.stage.charAt(0).toUpperCase() +
                          stage.stage.slice(1)}
                      </Badge>
                      <span className="font-medium">{stage.leads}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatCurrency(stage.value_cents)}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
