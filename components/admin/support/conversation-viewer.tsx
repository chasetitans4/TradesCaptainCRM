'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  MessageSquare,
  Phone,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Flag,
  Unlock,
  StopCircle,
} from 'lucide-react';
import { CONVERSATION_STATES } from '@/lib/admin/leads-captain-support';

interface ConversationMessage {
  id: string;
  direction: 'inbound' | 'outbound';
  content: string;
  status: string | null;
  error_code: string | null;
  created_at: string;
}

interface Conversation {
  id: string;
  caller_phone: string;
  state: string;
  lead_status: string;
  service_needed: string | null;
  urgency: string | null;
  ai_failure_count: number;
  handoff_reason: string | null;
  blocked_reason: string | null;
  address_raw: string | null;
  caller_address: string | null;
  created_at: string;
  messages?: ConversationMessage[];
}

interface ConversationViewerProps {
  organizationId: string;
  onReportIssue?: (conversationId: string) => void;
}

export function ConversationViewer({
  organizationId,
  onReportIssue,
}: ConversationViewerProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loadingMessages, setLoadingMessages] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchConversations();
  }, [organizationId, page]);

  const fetchConversations = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/support/conversations?organization_id=${organizationId}&page=${page}&limit=10`
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch conversations');
      }

      const data = await response.json();
      setConversations(data.conversations);
      setTotalPages(data.pagination.totalPages);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    if (expandedId === conversationId) {
      setExpandedId(null);
      return;
    }

    setLoadingMessages(conversationId);

    try {
      const response = await fetch(
        `/api/admin/support/conversations/${conversationId}`
      );

      if (!response.ok) {
        throw new Error('Failed to load messages');
      }

      const data = await response.json();

      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? { ...c, messages: data.conversation.messages }
            : c
        )
      );
      setExpandedId(conversationId);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingMessages(null);
    }
  };

  const handleAction = async (
    conversationId: string,
    action: 'force_end' | 'unblock'
  ) => {
    setActionLoading(conversationId);

    try {
      const response = await fetch(
        `/api/admin/support/conversations/${conversationId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Action failed');
      }

      // Refresh conversations
      fetchConversations();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const getStateBadge = (state: string) => {
    const terminalStates = ['lead_captured', 'booking_confirmed', 'completed'];
    const errorStates = ['abandoned', 'opted_out', 'blocked_spam'];

    if (terminalStates.includes(state)) {
      return <Badge variant="success">{state.replace('_', ' ')}</Badge>;
    }
    if (errorStates.includes(state)) {
      return <Badge variant="danger">{state.replace('_', ' ')}</Badge>;
    }
    return <Badge variant="warning">{state.replace('_', ' ')}</Badge>;
  };

  const getUrgencyBadge = (urgency: string | null) => {
    if (!urgency) return null;

    const variants: Record<string, 'danger' | 'warning' | 'default'> = {
      emergency: 'danger',
      high: 'warning',
      medium: 'default',
      low: 'default',
    };

    return <Badge variant={variants[urgency] || 'default'}>{urgency}</Badge>;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  if (loading && conversations.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Conversation Logs
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="p-3 mb-4 bg-red-50 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}

        {conversations.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No conversations found
          </div>
        ) : (
          <div className="space-y-3">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                className="border rounded-lg overflow-hidden"
              >
                {/* Conversation Header */}
                <div
                  className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => loadMessages(conversation.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {conversation.caller_phone}
                        </span>
                        {getStateBadge(conversation.state)}
                        {getUrgencyBadge(conversation.urgency)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {conversation.service_needed || 'Service not captured'}
                      </div>
                      {conversation.blocked_reason && (
                        <div className="flex items-center gap-1 text-sm text-red-600">
                          <AlertTriangle className="h-3 w-3" />
                          Blocked: {conversation.blocked_reason}
                        </div>
                      )}
                      {conversation.ai_failure_count > 0 && (
                        <div className="flex items-center gap-1 text-sm text-orange-600">
                          <AlertTriangle className="h-3 w-3" />
                          AI failures: {conversation.ai_failure_count}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDate(conversation.created_at)}
                      </div>
                      {loadingMessages === conversation.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : expandedId === conversation.id ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Messages */}
                {expandedId === conversation.id && conversation.messages && (
                  <div className="border-t bg-muted/20">
                    {/* State explanation */}
                    <div className="px-4 py-2 bg-muted/30 text-xs text-muted-foreground">
                      State: {CONVERSATION_STATES[conversation.state] || conversation.state}
                    </div>

                    {/* Messages */}
                    <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
                      {conversation.messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${
                            message.direction === 'outbound'
                              ? 'justify-end'
                              : 'justify-start'
                          }`}
                        >
                          <div
                            className={`max-w-[80%] p-3 rounded-lg ${
                              message.direction === 'outbound'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            <div className="text-sm">{message.content}</div>
                            <div
                              className={`flex items-center gap-2 mt-1 text-xs ${
                                message.direction === 'outbound'
                                  ? 'text-primary-foreground/70'
                                  : 'text-muted-foreground'
                              }`}
                            >
                              <span>
                                {new Date(message.created_at).toLocaleTimeString()}
                              </span>
                              {message.status && (
                                <span className="flex items-center gap-1">
                                  {message.status === 'delivered' ? (
                                    <CheckCircle className="h-3 w-3" />
                                  ) : message.status === 'failed' ? (
                                    <XCircle className="h-3 w-3 text-red-400" />
                                  ) : null}
                                  {message.status}
                                </span>
                              )}
                              {message.error_code && (
                                <span className="text-red-400">
                                  Error: {message.error_code}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="p-3 border-t bg-muted/30 flex items-center gap-2">
                      {conversation.state === 'blocked_spam' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAction(conversation.id, 'unblock')}
                          disabled={actionLoading === conversation.id}
                        >
                          {actionLoading === conversation.id ? (
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          ) : (
                            <Unlock className="h-3 w-3 mr-1" />
                          )}
                          Unblock
                        </Button>
                      )}
                      {!['completed', 'abandoned', 'opted_out', 'blocked_spam'].includes(
                        conversation.state
                      ) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAction(conversation.id, 'force_end')}
                          disabled={actionLoading === conversation.id}
                        >
                          {actionLoading === conversation.id ? (
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          ) : (
                            <StopCircle className="h-3 w-3 mr-1" />
                          )}
                          Force End
                        </Button>
                      )}
                      {onReportIssue && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onReportIssue(conversation.id)}
                        >
                          <Flag className="h-3 w-3 mr-1" />
                          Report AI Issue
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || loading}
            >
              Next
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
