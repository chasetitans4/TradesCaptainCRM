'use client';

// =====================================================
// LEADS CAPTAIN FOLLOW-UP SCHEDULING PAGE
// Manage and monitor follow-up messages
// =====================================================

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Loader2,
  ArrowLeft,
  Clock,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  Flame,
  ExternalLink,
  RefreshCw,
  Calendar,
  User,
  Send,
} from 'lucide-react';
import { toast } from 'sonner';

interface FollowUp {
  id: string;
  conversation_id: string;
  customer_phone: string;
  customer_name: string | null;
  status: string;
  current_intent: string | null;
  is_hot_lead: boolean;
  message_count: number;
  last_customer_message_at: string | null;
  last_message_at: string | null;
  follow_up_number: number;
  scheduled_at: string | null;
  is_overdue: boolean;
  hours_since_last_message: number;
}

const FOLLOW_UP_LABELS: Record<number, { label: string; timing: string; color: string }> = {
  1: { label: '1st Follow-up', timing: '1 hour', color: 'bg-blue-100 text-blue-700' },
  2: { label: '2nd Follow-up', timing: '4 hours', color: 'bg-amber-100 text-amber-700' },
  3: { label: '3rd Follow-up', timing: '24 hours', color: 'bg-orange-100 text-orange-700' },
};

export default function FollowUpSchedulingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [statusFilter, setStatusFilter] = useState('pending');

  const fetchFollowUps = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        status: statusFilter,
        page: page.toString(),
        page_size: '50',
      });

      const res = await fetch(`/api/leads-captain/v2/follow-ups?${params}`);
      const data = await res.json();

      if (res.ok) {
        setFollowUps(data.follow_ups || []);
        setTotal(data.total || 0);
        setHasMore(data.has_more || false);
      } else {
        toast.error(data.error || 'Failed to load follow-ups');
      }
    } catch (error) {
      toast.error('Failed to load follow-ups');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => {
    fetchFollowUps();
  }, [fetchFollowUps]);

  const formatTime = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours < 1) {
      return `${minutes}m ago`;
    } else if (hours < 24) {
      return `${hours}h ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const formatScheduledTime = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const now = new Date();

    if (date < now) {
      return 'Overdue';
    }

    const diff = date.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours < 1) {
      return `in ${minutes}m`;
    } else if (hours < 24) {
      return `in ${hours}h ${minutes}m`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric' });
    }
  };

  const goToConversation = (conversationId: string) => {
    router.push(`/leads-captain/conversations?id=${conversationId}`);
  };

  // Stats
  const overdueCount = followUps.filter((f) => f.is_overdue).length;
  const hotLeadCount = followUps.filter((f) => f.is_hot_lead).length;
  const pendingCount = followUps.filter((f) => f.follow_up_number > 0).length;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/leads-captain')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Follow-Up Queue</h1>
            <p className="text-sm text-muted-foreground">Scheduled and pending follow-up messages</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => fetchFollowUps()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Follow-ups</p>
                <p className="text-2xl font-bold">{pendingCount}</p>
              </div>
              <Clock className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className={overdueCount > 0 ? 'border-warning' : ''}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold text-warning">{overdueCount}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-warning opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Hot Leads</p>
                <p className="text-2xl font-bold text-orange-500">{hotLeadCount}</p>
              </div>
              <Flame className="h-8 w-8 text-orange-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Follow-up Timing Info */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span>1st: 1 hour after last message</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span>2nd: 4 hours after</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500" />
              <span>3rd: 24 hours after</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filter */}
      <div className="flex items-center gap-4 mb-4">
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending Follow-ups</SelectItem>
            <SelectItem value="sent">Recently Sent</SelectItem>
            <SelectItem value="all">All Conversations</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {total} conversations
        </span>
      </div>

      {/* Follow-ups Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : followUps.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No follow-ups {statusFilter === 'pending' ? 'pending' : 'found'}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Last Message</TableHead>
                  <TableHead>Follow-up</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Messages</TableHead>
                  <TableHead>Intent</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {followUps.map((followUp) => {
                  const followUpConfig = FOLLOW_UP_LABELS[followUp.follow_up_number];

                  return (
                    <TableRow
                      key={followUp.id}
                      className={followUp.is_overdue ? 'bg-warning/5' : ''}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div>
                            <p className="font-medium">
                              {followUp.customer_name || followUp.customer_phone}
                            </p>
                            {followUp.customer_name && (
                              <p className="text-xs text-muted-foreground font-mono">
                                {followUp.customer_phone}
                              </p>
                            )}
                          </div>
                          {followUp.is_hot_lead && (
                            <Flame className="h-4 w-4 text-orange-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatTime(followUp.last_customer_message_at)}
                      </TableCell>
                      <TableCell>
                        {followUp.follow_up_number > 0 && followUpConfig ? (
                          <Badge className={`${followUpConfig.color} border-0`}>
                            {followUpConfig.label}
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {followUp.is_overdue ? (
                            <Badge variant="destructive" className="gap-1">
                              <AlertCircle className="h-3 w-3" />
                              Overdue
                            </Badge>
                          ) : followUp.scheduled_at ? (
                            <span className="text-sm">
                              {formatScheduledTime(followUp.scheduled_at)}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {followUp.message_count}
                      </TableCell>
                      <TableCell>
                        {followUp.current_intent ? (
                          <Badge variant="outline" className="text-xs">
                            {followUp.current_intent}
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => goToConversation(followUp.conversation_id)}
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {(hasMore || page > 1) && (
            <div className="flex items-center justify-between p-4 border-t">
              <p className="text-sm text-muted-foreground">
                Page {page} of {Math.ceil(total / 50)}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!hasMore}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
