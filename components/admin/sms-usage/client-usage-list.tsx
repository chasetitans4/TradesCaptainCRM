'use client';

// =====================================================
// CLIENT SMS USAGE LIST COMPONENT
// Shows SMS usage for each client
// Version: 5.8
// =====================================================

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { MessageSquare, TrendingUp, AlertTriangle, ChevronRight } from 'lucide-react';

interface ClientSmsUsage {
  client_id: string;
  client_name: string;
  plan_type: string;
  soft_cap: number;
  messages_used: number;
  usage_percent: number;
  overage_count: number;
  overage_cost: number;
  recommended_upgrade: string | null;
}

interface ClientUsageListProps {
  clients: ClientSmsUsage[];
  loading: boolean;
  onClientClick: (clientId: string) => void;
}

export function ClientUsageList({
  clients,
  loading,
  onClientClick,
}: ClientUsageListProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Client Usage
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const getUsageBadge = (percent: number) => {
    if (percent >= 100) {
      return <Badge variant="destructive">Over Cap</Badge>;
    }
    if (percent >= 80) {
      return <Badge className="bg-yellow-500">Near Cap</Badge>;
    }
    return <Badge className="bg-green-500">Normal</Badge>;
  };

  const getProgressColor = (percent: number) => {
    if (percent >= 100) return 'bg-red-500';
    if (percent >= 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Client SMS Usage
        </CardTitle>
      </CardHeader>
      <CardContent>
        {clients.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No clients to display
          </div>
        ) : (
          <div className="space-y-4">
            {clients.map((client) => (
              <div
                key={client.client_id}
                className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => onClientClick(client.client_id)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{client.client_name}</span>
                      <Badge variant="outline">{client.plan_type}</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span>
                        {client.messages_used.toLocaleString()} /{' '}
                        {client.soft_cap.toLocaleString()} messages
                      </span>
                      {client.overage_count > 0 && (
                        <span className="text-destructive">
                          +{client.overage_count} overage ($
                          {client.overage_cost.toFixed(2)})
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getUsageBadge(client.usage_percent)}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>

                <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`absolute inset-y-0 left-0 ${getProgressColor(
                      client.usage_percent
                    )}`}
                    style={{ width: `${Math.min(client.usage_percent, 100)}%` }}
                  />
                  {client.usage_percent > 100 && (
                    <div
                      className="absolute inset-y-0 bg-red-300 opacity-50"
                      style={{
                        left: '100%',
                        width: `${Math.min(client.usage_percent - 100, 50)}%`,
                      }}
                    />
                  )}
                </div>

                <div className="flex items-center justify-between mt-2 text-sm">
                  <span
                    className={
                      client.usage_percent >= 100
                        ? 'text-destructive font-medium'
                        : 'text-muted-foreground'
                    }
                  >
                    {client.usage_percent}%
                  </span>
                  {client.recommended_upgrade && (
                    <span className="flex items-center gap-1 text-primary">
                      <TrendingUp className="h-3 w-3" />
                      Suggest: {client.recommended_upgrade}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
