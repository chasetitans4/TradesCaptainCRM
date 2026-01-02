'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Bell,
  Mail,
  Phone,
  Smartphone,
  Loader2,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';

interface NotificationLog {
  id: string;
  conversation_id: string;
  type: 'sms' | 'email' | 'push';
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  recipient: string;
  error_message: string | null;
  created_at: string;
  sent_at: string | null;
}

interface NotificationSummary {
  pending: number;
  sent: number;
  delivered: number;
  failed: number;
}

interface NotificationLogsProps {
  organizationId: string;
}

export function NotificationLogs({ organizationId }: NotificationLogsProps) {
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [summary, setSummary] = useState<NotificationSummary | null>(null);
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'logs' | 'queue'>('logs');

  useEffect(() => {
    if (activeTab === 'logs') {
      fetchLogs();
    } else {
      fetchQueue();
    }
  }, [organizationId, activeTab]);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/support/notifications?organization_id=${organizationId}&action=logs`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch notification logs');
      }

      const data = await response.json();
      setLogs(data.logs);
      setSummary(data.summary);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchQueue = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/support/notifications?organization_id=${organizationId}&action=queue`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch notification queue');
      }

      const data = await response.json();
      setQueue(data.queue);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'sms':
        return <Phone className="h-4 w-4" />;
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'push':
        return <Smartphone className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'warning' | 'default' | 'success' | 'danger'> = {
      pending: 'warning',
      sent: 'default',
      delivered: 'success',
      failed: 'danger',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Logs
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <Button
            variant={activeTab === 'logs' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('logs')}
          >
            Recent Notifications
          </Button>
          <Button
            variant={activeTab === 'queue' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('queue')}
          >
            Pending Queue
            {queue.length > 0 && (
              <Badge variant="warning" className="ml-2">
                {queue.length}
              </Badge>
            )}
          </Button>
        </div>

        {error && (
          <div className="p-3 mb-4 bg-red-50 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}

        {/* Summary */}
        {activeTab === 'logs' && summary && (
          <div className="grid grid-cols-4 gap-2 mb-4">
            <div className="p-3 rounded-lg bg-yellow-50 text-center">
              <div className="text-xl font-bold text-yellow-700">{summary.pending}</div>
              <div className="text-xs text-yellow-600">Pending</div>
            </div>
            <div className="p-3 rounded-lg bg-blue-50 text-center">
              <div className="text-xl font-bold text-blue-700">{summary.sent}</div>
              <div className="text-xs text-blue-600">Sent</div>
            </div>
            <div className="p-3 rounded-lg bg-green-50 text-center">
              <div className="text-xl font-bold text-green-700">{summary.delivered}</div>
              <div className="text-xs text-green-600">Delivered</div>
            </div>
            <div className="p-3 rounded-lg bg-red-50 text-center">
              <div className="text-xl font-bold text-red-700">{summary.failed}</div>
              <div className="text-xs text-red-600">Failed</div>
            </div>
          </div>
        )}

        {/* Refresh Button */}
        <div className="flex justify-end mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={activeTab === 'logs' ? fetchLogs : fetchQueue}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : activeTab === 'logs' ? (
          /* Notification Logs */
          logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No notification logs found
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 border rounded-lg flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-full">
                      {getTypeIcon(log.type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium capitalize">{log.type}</span>
                        {getStatusBadge(log.status)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        To: {log.recipient}
                      </div>
                      {log.error_message && (
                        <div className="text-sm text-red-600">
                          Error: {log.error_message}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">
                      Created: {formatDate(log.created_at)}
                    </div>
                    {log.sent_at && (
                      <div className="text-xs text-muted-foreground">
                        Sent: {formatDate(log.sent_at)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          /* Queue */
          queue.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
              No pending notifications in queue
            </div>
          ) : (
            <div className="space-y-2">
              {queue.map((item: any, idx: number) => (
                <div
                  key={idx}
                  className="p-3 border rounded-lg flex items-center justify-between bg-yellow-50"
                >
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-yellow-600" />
                    <div>
                      <div className="font-medium">Scheduled Notification</div>
                      <div className="text-sm text-muted-foreground">
                        Scheduled for: {formatDate(item.scheduled_for)}
                      </div>
                    </div>
                  </div>
                  <Badge variant="warning">Pending</Badge>
                </div>
              ))}
            </div>
          )
        )}

        {/* Expected Latency Info */}
        <div className="mt-4 p-3 bg-muted/30 rounded-lg text-sm">
          <h4 className="font-medium mb-2">Expected Notification Latency</h4>
          <div className="grid grid-cols-3 gap-4 text-muted-foreground">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              <span>SMS: &lt; 5 seconds</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <span>Email: &lt; 30 seconds</span>
            </div>
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              <span>Push: &lt; 10 seconds</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
