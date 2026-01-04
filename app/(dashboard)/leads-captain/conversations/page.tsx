'use client';

// =====================================================
// LEADS CAPTAIN v2 CONVERSATIONS PAGE
// View and manage SMS conversations
// =====================================================

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Loader2,
  ArrowLeft,
  MessageSquare,
  Search,
  Flame,
  AlertTriangle,
  User,
  Bot,
  Send,
  UserCheck,
  UserX,
  Ban,
  X,
  VolumeX,
  Volume2,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';
import type { LeadsCaptainConversation, LeadsCaptainMessage, ConversationDetailResponse } from '@/types/leads-captain';
import { logger } from '@/lib/logger';

export default function LeadsCaptainConversationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get('id');
  const lcConversationsLogger = logger.child({ context: 'leads-captain.conversations' });

  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<LeadsCaptainConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationDetailResponse | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [expandedAudit, setExpandedAudit] = useState<Set<string>>(new Set());

  const toggleAudit = (messageId: string) => {
    setExpandedAudit((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  };

  useEffect(() => {
    fetchConversations();
  }, [statusFilter]);

  useEffect(() => {
    if (selectedId) {
      fetchConversationDetail(selectedId);
    } else {
      setSelectedConversation(null);
    }
  }, [selectedId]);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page_size: '50' });
      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }
      if (search) {
        params.set('search', search);
      }

      const res = await fetch(`/api/leads-captain/v2/conversations?${params}`);
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch (error) {
      lcConversationsLogger.error({
        msg: 'Error fetching conversations',
        error: error instanceof Error ? error.message : String(error),
        statusFilter,
        search,
      });
      toast.error('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const fetchConversationDetail = async (id: string) => {
    try {
      setLoadingDetail(true);
      const res = await fetch(`/api/leads-captain/v2/conversations/${id}`);
      const data = await res.json();
      setSelectedConversation(data);
    } catch (error) {
      lcConversationsLogger.error({
        msg: 'Error fetching conversation detail',
        error: error instanceof Error ? error.message : String(error),
        id,
      });
      toast.error('Failed to load conversation');
    } finally {
      setLoadingDetail(false);
    }
  };

  const selectConversation = (conv: LeadsCaptainConversation) => {
    router.push(`/leads-captain/conversations?id=${conv.id}`);
  };

  const closeDetail = () => {
    router.push('/leads-captain/conversations');
  };

  const performAction = async (action: string) => {
    if (!selectedConversation) return;

    try {
      const res = await fetch(`/api/leads-captain/v2/conversations/${selectedConversation.conversation.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      toast.success(`Action "${action}" completed`);
      fetchConversationDetail(selectedConversation.conversation.id);
      fetchConversations();
    } catch (error) {
      lcConversationsLogger.error({
        msg: 'Error performing action',
        error: error instanceof Error ? error.message : String(error),
        action,
        conversationId: selectedConversation.conversation.id,
      });
      toast.error(error instanceof Error ? error.message : 'Failed to perform action');
    }
  };

  // Per-conversation mute with duration (Section 7.3 - Kill Switches)
  const performMuteAction = async (action: 'mute' | 'unmute', duration?: number) => {
    if (!selectedConversation) return;

    try {
      const res = await fetch(`/api/leads-captain/v2/conversations/${selectedConversation.conversation.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, duration }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      toast.success(action === 'mute' ? `Muted for ${duration} hours` : 'Unmuted - AI responses enabled');
      fetchConversationDetail(selectedConversation.conversation.id);
      fetchConversations();
    } catch (error) {
      lcConversationsLogger.error({
        msg: 'Error performing mute action',
        error: error instanceof Error ? error.message : String(error),
        action,
        duration,
        conversationId: selectedConversation.conversation.id,
      });
      toast.error(error instanceof Error ? error.message : 'Failed to update mute status');
    }
  };

  const sendMessage = async () => {
    if (!selectedConversation || !newMessage.trim()) return;

    try {
      setSending(true);
      const res = await fetch(`/api/leads-captain/v2/conversations/${selectedConversation.conversation.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newMessage }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      toast.success('Message sent');
      setNewMessage('');
      fetchConversationDetail(selectedConversation.conversation.id);
    } catch (error) {
      lcConversationsLogger.error({
        msg: 'Error sending message',
        error: error instanceof Error ? error.message : String(error),
        conversationId: selectedConversation.conversation.id,
      });
      toast.error(error instanceof Error ? error.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/leads-captain')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Conversations</h1>
        </div>
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        {/* Conversation List */}
        <Card className="w-96 flex flex-col">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchConversations()}
                  className="pl-8"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="human_takeover">Human</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0">
            <ScrollArea className="h-full">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No conversations</p>
                </div>
              ) : (
                <div className="divide-y">
                  {conversations.map((conv) => (
                    <div
                      key={conv.id}
                      className={`p-3 cursor-pointer hover:bg-muted/50 transition-colors ${
                        selectedId === conv.id ? 'bg-muted' : ''
                      }`}
                      onClick={() => selectConversation(conv)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium truncate">
                          {conv.customer_name || conv.customer_phone}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {conv.last_message_at ? formatTime(conv.last_message_at) : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            conv.status === 'active'
                              ? 'default'
                              : conv.status === 'human_takeover'
                              ? 'secondary'
                              : 'outline'
                          }
                          className="text-xs"
                        >
                          {conv.status === 'human_takeover' ? 'Human' : conv.status}
                        </Badge>
                        {conv.is_hot_lead && (
                          <Flame className="h-3 w-3 text-orange-500" />
                        )}
                        {conv.is_emergency && (
                          <AlertTriangle className="h-3 w-3 text-red-500" />
                        )}
                        <span className="text-xs text-muted-foreground">
                          {conv.message_count} msg
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Conversation Detail */}
        <Card className="flex-1 flex flex-col">
          {!selectedConversation ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a conversation to view details</p>
              </div>
            </div>
          ) : loadingDetail ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Detail Header */}
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {selectedConversation.conversation.customer_name ||
                        selectedConversation.conversation.customer_phone}
                      {selectedConversation.conversation.is_hot_lead && (
                        <Badge variant="danger" className="gap-1">
                          <Flame className="h-3 w-3" />
                          Hot Lead
                        </Badge>
                      )}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {selectedConversation.conversation.customer_phone}
                      {selectedConversation.conversation.current_intent && (
                        <> • Intent: {selectedConversation.conversation.current_intent}</>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Muted Until Badge */}
                    {selectedConversation.conversation.muted_until && (
                      <Badge variant="secondary" className="gap-1">
                        <VolumeX className="h-3 w-3" />
                        Muted until {new Date(selectedConversation.conversation.muted_until).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                      </Badge>
                    )}
                    {/* Mute/Unmute - Quick toggle for AI responses (Section 7.3) */}
                    {selectedConversation.conversation.status === 'active' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => performMuteAction('mute', 24)}
                        title="Mute AI for 24 hours - Stop automated responses for this conversation"
                      >
                        <VolumeX className="mr-2 h-4 w-4" />
                        Mute 24h
                      </Button>
                    )}
                    {selectedConversation.conversation.status === 'human_takeover' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => performMuteAction('unmute')}
                        title="Unmute AI - Allow automated responses again"
                      >
                        <Volume2 className="mr-2 h-4 w-4" />
                        Unmute AI
                      </Button>
                    )}
                    {/* Block - Permanently stop messages */}
                    {selectedConversation.conversation.status !== 'blocked' &&
                     selectedConversation.conversation.status !== 'closed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => performAction('block')}
                        className="text-destructive hover:text-destructive"
                        title="Block this number - No messages will be sent"
                      >
                        <Ban className="mr-2 h-4 w-4" />
                        Block
                      </Button>
                    )}
                    {selectedConversation.conversation.status === 'blocked' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => performAction('unblock')}
                        title="Unblock this number"
                      >
                        <Ban className="mr-2 h-4 w-4" />
                        Unblock
                      </Button>
                    )}
                    {selectedConversation.conversation.status !== 'closed' &&
                     selectedConversation.conversation.status !== 'blocked' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => performAction('close')}
                      >
                        Close
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={closeDetail}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {selectedConversation.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${
                        msg.direction === 'outbound' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-3 ${
                          msg.direction === 'outbound'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <p className="text-sm">{msg.content}</p>
                        <div
                          className={`flex items-center gap-2 mt-1 text-xs ${
                            msg.direction === 'outbound'
                              ? 'text-primary-foreground/70'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {msg.direction === 'outbound' && (
                            <>
                              {msg.ai_used ? (
                                <Bot className="h-3 w-3" />
                              ) : (
                                <User className="h-3 w-3" />
                              )}
                            </>
                          )}
                          <span>
                            {new Date(msg.created_at).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </span>
                          {msg.detected_intent && (
                            <Badge variant="outline" className="text-xs">
                              {msg.detected_intent}
                            </Badge>
                          )}
                          {/* Audit Info Toggle - Show for outbound messages with decision info */}
                          {msg.direction === 'outbound' && msg.decision_explanation && (
                            <button
                              onClick={() => toggleAudit(msg.id)}
                              className="flex items-center gap-1 hover:opacity-80"
                              title="Why was this sent?"
                            >
                              <Info className="h-3 w-3" />
                              {expandedAudit.has(msg.id) ? (
                                <ChevronUp className="h-3 w-3" />
                              ) : (
                                <ChevronDown className="h-3 w-3" />
                              )}
                            </button>
                          )}
                        </div>
                        {/* Audit Details Expandable */}
                        {msg.direction === 'outbound' &&
                          msg.decision_explanation &&
                          expandedAudit.has(msg.id) && (
                            <div
                              className={`mt-2 pt-2 border-t text-xs ${
                                msg.direction === 'outbound'
                                  ? 'border-primary-foreground/20 text-primary-foreground/80'
                                  : 'border-muted-foreground/20'
                              }`}
                            >
                              <p className="font-medium mb-1">Why was this sent?</p>
                              <p className="opacity-90">{msg.decision_explanation}</p>
                              {msg.rule_matched && (
                                <p className="mt-1 opacity-70">
                                  Rule: {msg.rule_matched.slice(0, 8)}...
                                </p>
                              )}
                              {msg.ai_used && msg.ai_confidence != null && (
                                <p className="mt-1 opacity-70">
                                  AI Confidence: {msg.ai_confidence}%
                                </p>
                              )}
                              {msg.approval_status && (
                                <p className="mt-1 opacity-70">
                                  Approval: {msg.approval_status}
                                  {msg.approved_by && ` by ${msg.approved_by}`}
                                </p>
                              )}
                            </div>
                          )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Reply Box */}
              {selectedConversation.conversation.status !== 'blocked' && (
                <div className="p-4 border-t">
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      rows={2}
                      className="resize-none"
                    />
                    <Button onClick={sendMessage} disabled={sending || !newMessage.trim()}>
                      {sending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
