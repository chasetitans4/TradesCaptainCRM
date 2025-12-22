'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient, getCurrentUserProfile } from '@/lib/supabase/client';
import { hasPermission } from '@/lib/permissions';
import { cn, formatRelativeDate, formatPhoneNumber } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import type { UserWithBusiness, Customer, SmsConversation, SmsMessage } from '@/types';
import type { RealtimeChannel } from '@supabase/supabase-js';
import {
  MessageSquare,
  Search,
  X,
  ChevronRight,
  RefreshCw,
  Bot,
  User,
  Phone,
  Wifi,
  WifiOff,
  Plus,
} from 'lucide-react';

interface ConversationWithDetails extends SmsConversation {
  customer?: Pick<Customer, 'id' | 'name' | 'phone'> | null;
  last_message?: Pick<SmsMessage, 'id' | 'content' | 'direction' | 'created_at'> | null;
}

export default function MessagesPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserWithBusiness | null>(null);
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isConnected, setIsConnected] = useState(true);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Load user
  useEffect(() => {
    async function loadUser() {
      const profile = await getCurrentUserProfile();
      if (!profile) {
        router.push('/login');
        return;
      }
      setUser(profile as UserWithBusiness);
    }
    loadUser();
  }, [router]);

  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!user) return;

    const supabase = createClient();

    try {
      // Load conversations with customer info
      const { data: convos, error } = await supabase
        .from('sms_conversations')
        .select(`
          *,
          customer:customers (id, name, phone)
        `)
        .eq('business_id', user.business_id)
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      // Load last message for each conversation
      const conversationsWithMessages = await Promise.all(
        (convos || []).map(async (convo) => {
          const { data: messages } = await supabase
            .from('sms_messages')
            .select('id, content, direction, created_at')
            .eq('conversation_id', convo.id)
            .order('created_at', { ascending: false })
            .limit(1);

          return {
            ...convo,
            last_message: messages?.[0] || null,
          } as ConversationWithDetails;
        })
      );

      setConversations(conversationsWithMessages);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user, loadConversations]);

  // Real-time subscription for new messages and conversation updates
  useEffect(() => {
    if (!user) return;

    const supabase = createClient();

    // Subscribe to conversation changes
    const channel = supabase
      .channel(`messages-${user.business_id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sms_conversations',
          filter: `business_id=eq.${user.business_id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            // New conversation - reload to get full data
            loadConversations();
          } else if (payload.eventType === 'UPDATE') {
            // Update existing conversation in state
            setConversations((prev) =>
              prev.map((convo) =>
                convo.id === payload.new.id
                  ? { ...convo, ...payload.new }
                  : convo
              ).sort((a, b) =>
                new Date(b.last_message_at || 0).getTime() -
                new Date(a.last_message_at || 0).getTime()
              )
            );
          } else if (payload.eventType === 'DELETE') {
            // Remove deleted conversation
            setConversations((prev) =>
              prev.filter((convo) => convo.id !== payload.old.id)
            );
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sms_messages',
        },
        async (payload) => {
          // When a new message arrives, update the conversation's last message
          const conversationId = payload.new.conversation_id;

          // Update the last message for this conversation
          setConversations((prev) =>
            prev.map((convo) => {
              if (convo.id === conversationId) {
                return {
                  ...convo,
                  last_message: {
                    id: payload.new.id,
                    content: payload.new.content,
                    direction: payload.new.direction,
                    created_at: payload.new.created_at,
                  },
                  last_message_at: payload.new.created_at,
                  unread_count: payload.new.direction === 'inbound'
                    ? (convo.unread_count || 0) + 1
                    : convo.unread_count,
                };
              }
              return convo;
            }).sort((a, b) =>
              new Date(b.last_message_at || 0).getTime() -
              new Date(a.last_message_at || 0).getTime()
            )
          );
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [user, loadConversations]);

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadConversations();
  };

  // Filter conversations by search
  const filteredConversations = conversations.filter((convo) => {
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    const name = (convo.customer?.name || '').toLowerCase();
    const phone = convo.phone_number || '';
    const content = (convo.last_message?.content || '').toLowerCase();

    return name.includes(query) || phone.includes(query) || content.includes(query);
  });

  // Count unread
  const unreadCount = conversations.filter((c) => c.unread_count && c.unread_count > 0).length;

  if (loading || !user) {
    return <MessagesSkeleton />;
  }

  // Check if user has permission to view messages
  const canViewMessages = hasPermission(user.role, 'view_messages');
  const canSendSms = user.role === 'technician' 
    ? hasPermission(user.role, 'send_sms_to_job_customer')
    : hasPermission(user.role, 'manage_messages');

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky-header bg-background border-b border-border">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-text">Messages</h1>
              {unreadCount > 0 && (
                <Badge className="bg-danger text-white">{unreadCount}</Badge>
              )}
              {/* Real-time connection status */}
              <div className="flex items-center gap-1">
                {isConnected ? (
                  <Wifi className="h-4 w-4 text-green-500" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-500" />
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={cn('h-5 w-5', refreshing && 'animate-spin')} />
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <Input
              type="search"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Conversations List */}
      <div className="divide-y divide-border">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <MessageSquare className="h-12 w-12 text-text-muted mb-4" />
            <h3 className="text-lg font-medium text-text mb-1">
              {searchQuery ? 'No conversations found' : 'No messages yet'}
            </h3>
            <p className="text-sm text-text-muted">
              {searchQuery
                ? 'Try adjusting your search'
                : 'SMS conversations with customers will appear here'}
            </p>
          </div>
        ) : (
          filteredConversations.map((convo) => (
            <ConversationItem key={convo.id} conversation={convo} />
          ))
        )}
      </div>

      {/* New Message FAB */}
      {canSendSms && (
        <Link
          href="/messages/new"
          className="fixed bottom-24 right-4 bg-primary text-white rounded-full p-4 shadow-lg active:scale-95 transition-transform z-10"
        >
          <Plus className="h-6 w-6" />
        </Link>
      )}

      {/* AI SMS indicator - only show if FAB not visible or move it up */}
      {hasPermission(user.role, 'manage_ai_sms') && (
        <Link
          href="/settings/ai-sms"
          className={cn(
            'fixed right-4 bg-primary/90 text-white rounded-full px-3 py-1.5 shadow-lg flex items-center gap-2 active:scale-95 transition-transform text-xs',
            canSendSms ? 'bottom-40' : 'bottom-24'
          )}
        >
          <Bot className="h-4 w-4" />
          <span className="font-medium">AI Active</span>
        </Link>
      )}
    </div>
  );
}

function ConversationItem({ conversation }: { conversation: ConversationWithDetails }) {
  const name = conversation.customer?.name || formatPhoneNumber(conversation.phone_number);
  const hasUnread = conversation.unread_count && conversation.unread_count > 0;
  const lastMessage = conversation.last_message;

  return (
    <Link
      href={`/messages/${conversation.id}`}
      className={cn(
        'flex items-center gap-3 p-4 hover:bg-muted/50 active:bg-muted transition-colors',
        hasUnread && 'bg-primary/5'
      )}
    >
      {/* Avatar */}
      <div className="relative">
        <Avatar
          fallback={
            conversation.customer?.name?.charAt(0) ||
            conversation.phone_number?.slice(-2) ||
            '?'
          }
          size="md"
        />
        {conversation.is_ai_enabled && (
          <div className="absolute -bottom-1 -right-1 bg-primary text-white rounded-full p-0.5">
            <Bot className="h-3 w-3" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className={cn('font-medium text-text truncate', hasUnread && 'font-semibold')}>
            {name}
          </p>
          <span className="text-xs text-text-muted shrink-0">
            {lastMessage ? formatRelativeDate(lastMessage.created_at) : ''}
          </span>
        </div>

        {lastMessage && (
          <div className="flex items-center gap-1 mt-0.5">
            {lastMessage.direction === 'outbound' && (
              <span className="text-xs text-text-muted">You: </span>
            )}
            <p
              className={cn(
                'text-sm truncate',
                hasUnread ? 'text-text font-medium' : 'text-text-muted'
              )}
            >
              {lastMessage.content}
            </p>
          </div>
        )}

        {/* Customer phone if different from conversation phone */}
        {conversation.customer?.phone &&
          conversation.customer.phone !== conversation.phone_number && (
            <div className="flex items-center gap-1 mt-1 text-xs text-text-muted">
              <Phone className="h-3 w-3" />
              {formatPhoneNumber(conversation.phone_number)}
            </div>
          )}
      </div>

      {/* Unread badge */}
      {hasUnread && (
        <Badge className="bg-primary text-white shrink-0">
          {conversation.unread_count}
        </Badge>
      )}

      <ChevronRight className="h-5 w-5 text-text-muted shrink-0" />
    </Link>
  );
}

function MessagesSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky-header bg-background border-b border-border">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="h-7 w-28 skeleton rounded" />
            <div className="h-10 w-10 skeleton rounded-lg" />
          </div>
          <div className="h-12 skeleton rounded-lg" />
        </div>
      </header>
      <div className="divide-y divide-border">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="p-4 flex items-center gap-3">
            <div className="h-12 w-12 skeleton rounded-full" />
            <div className="flex-1">
              <div className="h-4 w-32 skeleton rounded mb-1" />
              <div className="h-3 w-48 skeleton rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
