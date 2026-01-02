'use client';

// =====================================================
// NEVERMISS ALERTS PANEL
// Alert notifications for agent dashboard
// Version: 5.8
// =====================================================

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Bell, AlertTriangle, AlertCircle, TrendingDown, Phone, ArrowUpRight, Flag } from 'lucide-react';

interface NevermissAlert {
  type: 'near_cap' | 'over_cap' | 'low_usage' | 'declining_rate';
  client_id: string;
  client_name: string;
  message: string;
  details?: string;
}

interface AlertsPanelProps {
  alerts?: NevermissAlert[];
  loading?: boolean;
  onSuggestUpgrade?: (clientId: string) => void;
  onScheduleCheckIn?: (clientId: string) => void;
  onReviewConversations?: (clientId: string) => void;
  onFlagForSupport?: (clientId: string) => void;
}

export function NevermissAlertsPanel({
  alerts,
  loading,
  onSuggestUpgrade,
  onScheduleCheckIn,
  onReviewConversations,
  onFlagForSupport,
}: AlertsPanelProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!alerts || alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Leads Captain Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            No alerts at this time. All clients are healthy!
          </p>
        </CardContent>
      </Card>
    );
  }

  const nearCapAlerts = alerts.filter((a) => a.type === 'near_cap');
  const overCapAlerts = alerts.filter((a) => a.type === 'over_cap');
  const lowUsageAlerts = alerts.filter((a) => a.type === 'low_usage');
  const decliningRateAlerts = alerts.filter((a) => a.type === 'declining_rate');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Leads Captain Alerts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Over Cap Alerts */}
        {overCapAlerts.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Over SMS Cap ({overCapAlerts.length})
            </h4>
            <div className="space-y-2">
              {overCapAlerts.map((alert) => (
                <div
                  key={alert.client_id}
                  className="flex items-center justify-between p-3 rounded-lg border border-destructive/20 bg-destructive/5"
                >
                  <div>
                    <span className="font-medium">{alert.client_name}</span>
                    <span className="text-sm text-muted-foreground ml-2">— {alert.message}</span>
                    {alert.details && (
                      <p className="text-sm text-success">{alert.details}</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => onSuggestUpgrade?.(alert.client_id)}
                  >
                    <ArrowUpRight className="h-4 w-4 mr-1" />
                    Suggest Upgrade
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Near Cap Alerts */}
        {nearCapAlerts.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2 text-warning">
              <AlertCircle className="h-4 w-4" />
              Near SMS Cap ({nearCapAlerts.length})
            </h4>
            <div className="space-y-2">
              {nearCapAlerts.map((alert) => (
                <div
                  key={alert.client_id}
                  className="flex items-center justify-between p-3 rounded-lg border border-warning/20 bg-warning/5"
                >
                  <div>
                    <span className="font-medium">{alert.client_name}</span>
                    <span className="text-sm text-muted-foreground ml-2">— {alert.message}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onSuggestUpgrade?.(alert.client_id)}
                  >
                    <ArrowUpRight className="h-4 w-4 mr-1" />
                    Suggest Upgrade
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Low Usage Alerts */}
        {lowUsageAlerts.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2 text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              Low Usage — Possible Issue ({lowUsageAlerts.length})
            </h4>
            <div className="space-y-2">
              {lowUsageAlerts.map((alert) => (
                <div
                  key={alert.client_id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div>
                    <span className="font-medium">{alert.client_name}</span>
                    <span className="text-sm text-muted-foreground ml-2">— {alert.message}</span>
                    {alert.details && (
                      <p className="text-sm text-muted-foreground">{alert.details}</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onScheduleCheckIn?.(alert.client_id)}
                  >
                    <Phone className="h-4 w-4 mr-1" />
                    Schedule Check-In
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Declining Rate Alerts */}
        {decliningRateAlerts.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2 text-warning">
              <TrendingDown className="h-4 w-4" />
              Declining Capture Rate ({decliningRateAlerts.length})
            </h4>
            <div className="space-y-2">
              {decliningRateAlerts.map((alert) => (
                <div
                  key={alert.client_id}
                  className="flex items-center justify-between p-3 rounded-lg border border-warning/20 bg-warning/5"
                >
                  <div>
                    <span className="font-medium">{alert.client_name}</span>
                    <span className="text-sm text-muted-foreground ml-2">— {alert.message}</span>
                    {alert.details && (
                      <p className="text-sm text-muted-foreground">{alert.details}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onReviewConversations?.(alert.client_id)}
                    >
                      Review Conversations
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onFlagForSupport?.(alert.client_id)}
                    >
                      <Flag className="h-4 w-4 mr-1" />
                      Flag
                    </Button>
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

export default NevermissAlertsPanel;
