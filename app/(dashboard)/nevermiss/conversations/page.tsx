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
} from 'lucide-react';
import { toast } from 'sonner';
import type { NevermissConversation, NevermissMessage, ConversationDetailResponse } from '@/types/nevermiss';

export default function LeadsCaptainConversationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get('id');

  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<NevermissConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationDetailResponse | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

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

      const res = await fetch(`/api/nevermiss/v2/conversations?${params}`);
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast.error('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const fetchConversationDetail = async (id: string) => {
    try {
      setLoadingDetail(true);
      const res = await fetch(`/api/nevermiss/v2/conversations/${id}`);
      const data = await res.json();
      setSelectedConversation(data);
    } catch (error) {
      console.error('Error fetching conversation:', error);
      toast.error('Failed to load conversation');
    } finally {
      setLoadingDetail(false);
    }
  };

  const selectConversation = (conv: NevermissConversation) => {
    router.push(`/nevermiss/conversations?id=${conv.id}`);
  };

  const closeDetail = () => {
    router.push('/nevermiss/conversations');
  };

  const performAction = async (action: string) => {
    if (!selectedConversation) return;

    try {
      const res = await fetch(`/api/nevermiss/v2/conversations/${selectedConversation.conversation.id}`, {
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
      console.error('Error performing action:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to perform action');
    }
  };

  const sendMessage = async () => {
    if (!selectedConversation || !newMessage.trim()) return;

    try {
      setSending(true);
      const res = await fetch(`/api/nevermiss/v2/conversations/${selectedConversation.conversation.id}`, {
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
      console.error('Error sending message:', error);
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
          <Button variant="ghost" size="icon" onClick={() => router.push('/nevermiss')}>
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
                    {selectedConversation.conversation.status === 'active' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => performAction('takeover')}
                      >
                        <UserCheck className="mr-2 h-4 w-4" />
                        Take Over
                      </Button>
                    )}
                    {selectedConversation.conversation.status === 'human_takeover' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => performAction('release')}
                      >
                        <UserX className="mr-2 h-4 w-4" />
                        Release to AI
                      </Button>
                    )}
                    {selectedConversation.conversation.status !== 'closed' && (
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
                        </div>
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
