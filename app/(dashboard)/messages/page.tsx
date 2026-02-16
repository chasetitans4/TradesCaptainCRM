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
import type { UserWithBusiness, Customer, SMSConversation, SMSMessage } from '@/types';
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
  Mail,
  PhoneCall,
  Inbox,
  Sparkles,
  Info,
  Briefcase,
} from 'lucide-react';
import { ContextDrawer } from '@/components/inbox';

interface ConversationWithDetails extends SMSConversation {
  customer?: Pick<Customer, 'id' | 'name' | 'phone' | 'email'> | null;
  last_message?: Pick<SMSMessage, 'id' | 'body' | 'direction' | 'created_at'> | null;
  last_message_at?: string | null;
  unread_count?: number;
  phone_number?: string;
  is_ai_enabled?: boolean;
}

interface LinkedEntity {
  type: 'job' | 'lead' | 'customer' | 'invoice' | 'quote';
  id: string;
  title: string;
  status?: string;
  statusType?: 'active' | 'success' | 'warning' | 'danger' | 'muted' | 'info' | 'default';
  amount?: number;
  date?: string;
}

/**
 * Channel filter tabs per Product Constitution - Converged Inbox
 * All | SMS | Email | Calls | AI
 */
type ChannelFilter = 'all' | 'sms' | 'email' | 'calls' | 'ai';

const CHANNEL_FILTERS: { value: ChannelFilter; label: string; icon: React.ElementType }[] = [
  { value: 'all', label: 'All', icon: Inbox },
  { value: 'sms', label: 'SMS', icon: MessageSquare },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'calls', label: 'Calls', icon: PhoneCall },
  { value: 'ai', label: 'AI', icon: Sparkles },
];

export default function MessagesPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserWithBusiness | null>(null);
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isConnected, setIsConnected] = useState(true);
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('all');
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Context drawer state
  const [contextDrawerOpen, setContextDrawerOpen] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<ConversationWithDetails | null>(null);
  const [linkedEntities, setLinkedEntities] = useState<LinkedEntity[]>([]);
  const [loadingContext, setLoadingContext] = useState(false);

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
          customer:customers (id, name, phone, email)
        `)
        .eq('business_id', user.business_id)
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      // Get all conversation IDs
      const conversationIds = (convos || []).map(c => c.id);

      // Batch fetch last messages for all conversations in a single query
      // Using a subquery pattern to get the most recent message per conversation
      const { data: lastMessages } = conversationIds.length > 0
        ? await supabase
            .from('sms_messages')
            .select('id, body, direction, created_at, conversation_id')
            .in('conversation_id', conversationIds)
            .order('created_at', { ascending: false })
        : { data: [] as { id: string; body: string; direction: string; created_at: string; conversation_id: string }[] };

      // Group messages by conversation and take the first (most recent) for each
      type MessageType = { id: string; body: string; direction: string; created_at: string; conversation_id: string };
      const messagesByConvo = new Map<string, MessageType>();
      for (const msg of lastMessages || []) {
        if (!messagesByConvo.has(msg.conversation_id)) {
          messagesByConvo.set(msg.conversation_id, msg);
        }
      }

      // Merge conversations with their last messages
      const conversationsWithMessages = (convos || []).map((convo) => ({
        ...convo,
        last_message: messagesByConvo.get(convo.id) || null,
      } as ConversationWithDetails));

      setConversations(conversationsWithMessages);
    } catch (error) {
      console.error('Error loading conversations:', error instanceof Error ? error.message : 'Unknown error');
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
                    body: payload.new.body,
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

  // Fetch linked entities for context drawer
  const fetchLinkedEntities = useCallback(async (customerId: string) => {
    if (!user) return;

    setLoadingContext(true);
    const supabase = createClient();
    const entities: LinkedEntity[] = [];

    try {
      // Fetch recent jobs for this customer
      const { data: jobs } = await supabase
        .from('jobs')
        .select('id, title, status, scheduled_start')
        .eq('customer_id', customerId)
        .eq('business_id', user.business_id)
        .order('scheduled_start', { ascending: false })
        .limit(3);

      if (jobs) {
        for (const job of jobs) {
          entities.push({
            type: 'job',
            id: job.id,
            title: job.title || 'Untitled Job',
            status: job.status?.replace('_', ' ') || 'scheduled',
            statusType: job.status === 'completed' ? 'success' :
                       job.status === 'in_progress' ? 'warning' :
                       job.status === 'cancelled' ? 'danger' : 'muted',
            date: job.scheduled_start ? new Date(job.scheduled_start).toLocaleDateString() : undefined,
          });
        }
      }

      // Fetch leads for this customer
      const { data: leads } = await supabase
        .from('leads')
        .select('id, title, stage')
        .eq('customer_id', customerId)
        .eq('business_id', user.business_id)
        .order('created_at', { ascending: false })
        .limit(2);

      if (leads) {
        for (const lead of leads) {
          entities.push({
            type: 'lead',
            id: lead.id,
            title: lead.title || 'Untitled Lead',
            status: lead.stage?.replace('_', ' ') || 'new',
            statusType: lead.stage === 'won' ? 'success' :
                       lead.stage === 'lost' ? 'danger' :
                       lead.stage === 'quoted' ? 'warning' : 'info',
          });
        }
      }

      // Fetch unpaid invoices for this customer
      const { data: invoices } = await supabase
        .from('invoices')
        .select('id, invoice_number, total, status')
        .eq('customer_id', customerId)
        .eq('business_id', user.business_id)
        .in('status', ['sent', 'viewed', 'overdue'])
        .order('created_at', { ascending: false })
        .limit(2);

      if (invoices) {
        for (const invoice of invoices) {
          entities.push({
            type: 'invoice',
            id: invoice.id,
            title: `Invoice #${invoice.invoice_number || invoice.id.slice(0, 8)}`,
            status: invoice.status || 'sent',
            statusType: invoice.status === 'overdue' ? 'danger' :
                       invoice.status === 'paid' ? 'success' : 'warning',
            amount: invoice.total,
          });
        }
      }

      setLinkedEntities(entities);
    } catch (error) {
      console.error('Error fetching linked entities:', error);
      setLinkedEntities([]);
    } finally {
      setLoadingContext(false);
    }
  }, [user]);

  // Handle opening context drawer
  const handleOpenContext = useCallback((conversation: ConversationWithDetails) => {
    setSelectedConversation(conversation);
    setContextDrawerOpen(true);
    if (conversation.customer?.id) {
      fetchLinkedEntities(conversation.customer.id);
    } else {
      setLinkedEntities([]);
    }
  }, [fetchLinkedEntities]);

  // Filter conversations by search and channel
  const filteredConversations = conversations.filter((convo) => {
    // Apply channel filter
    // Currently all conversations are SMS, so 'all' and 'sms' show everything
    // 'email', 'calls' will show empty for now (future implementation)
    // 'ai' shows only AI-enabled conversations
    if (channelFilter === 'email' || channelFilter === 'calls') {
      return false; // No email/calls yet - future implementation
    }
    if (channelFilter === 'ai' && !convo.is_ai_enabled) {
      return false;
    }

    // Apply search filter
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    const name = (convo.customer?.name || '').toLowerCase();
    const phone = convo.phone_number || '';
    const body = (convo.last_message?.body || '').toLowerCase();

    return name.includes(query) || phone.includes(query) || body.includes(query);
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
              <h1 className="text-xl font-bold text-text">Inbox</h1>
              {unreadCount > 0 && (
                <Badge className="bg-danger text-white">{unreadCount}</Badge>
              )}
              {/* Real-time connection status */}
              <div className="flex items-center gap-1">
                {isConnected ? (
                  <Wifi className="h-4 w-4 text-tc-success" />
                ) : (
                  <WifiOff className="h-4 w-4 text-tc-danger" />
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

          {/* Channel Filter Tabs - Converged Inbox per Product Constitution */}
          <div className="flex gap-1 mb-3 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
            {CHANNEL_FILTERS.map((filter) => {
              const Icon = filter.icon;
              const isActive = channelFilter === filter.value;
              return (
                <button
                  key={filter.value}
                  onClick={() => setChannelFilter(filter.value)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                    isActive
                      ? 'bg-primary text-white'
                      : 'bg-surface-muted text-text-secondary hover:bg-muted'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {filter.label}
                </button>
              );
            })}
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
            <ConversationItem
              key={convo.id}
              conversation={convo}
              onOpenContext={() => handleOpenContext(convo)}
            />
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

      {/* Context Drawer - Per Product Constitution Section 6.3 */}
      <ContextDrawer
        open={contextDrawerOpen}
        onOpenChange={setContextDrawerOpen}
        customer={selectedConversation?.customer ? {
          id: selectedConversation.customer.id,
          name: selectedConversation.customer.name,
          phone: selectedConversation.customer.phone || undefined,
          email: selectedConversation.customer.email || undefined,
        } : null}
        linkedEntities={linkedEntities}
        nextAction={selectedConversation?.customer ? {
          label: 'View Customer',
          href: `/customers/${selectedConversation.customer.id}`,
          icon: User,
        } : undefined}
      />
    </div>
  );
}

function ConversationItem({
  conversation,
  onOpenContext,
}: {
  conversation: ConversationWithDetails;
  onOpenContext: () => void;
}) {
  const name = conversation.customer?.name || formatPhoneNumber(conversation.phone_number || '');
  const hasUnread = conversation.unread_count && conversation.unread_count > 0;
  const lastMessage = conversation.last_message;

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors',
        hasUnread && 'bg-primary/5'
      )}
    >
      {/* Avatar */}
      <Link href={`/messages/${conversation.id}`} className="relative shrink-0">
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
      </Link>

      {/* Content - taps to open message thread */}
      <Link href={`/messages/${conversation.id}`} className="flex-1 min-w-0">
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
              {lastMessage.body}
            </p>
          </div>
        )}

        {/* Customer phone if different from conversation phone */}
        {conversation.customer?.phone &&
          conversation.customer.phone !== conversation.phone_number && (
            <div className="flex items-center gap-1 mt-1 text-xs text-text-muted">
              <Phone className="h-3 w-3" />
              {formatPhoneNumber(conversation.phone_number || '')}
            </div>
          )}
      </Link>

      {/* Unread badge */}
      {hasUnread && (
        <Badge className="bg-primary text-white shrink-0">
          {conversation.unread_count}
        </Badge>
      )}

      {/* Context button - opens drawer with linked jobs/invoices */}
      {conversation.customer && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onOpenContext();
          }}
          className="p-2 rounded-lg hover:bg-muted active:bg-muted/80 transition-colors shrink-0"
          aria-label="View context"
        >
          <Info className="h-5 w-5 text-text-muted" />
        </button>
      )}

      <Link href={`/messages/${conversation.id}`} className="shrink-0">
        <ChevronRight className="h-5 w-5 text-text-muted" />
      </Link>
    </div>
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
