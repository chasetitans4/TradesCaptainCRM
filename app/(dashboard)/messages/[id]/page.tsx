'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUserProfile, createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { UserWithBusiness, SMSMessage } from '@/types';
import {
  ArrowLeft,
  Send,
  Phone,
  User,
  Bot,
  Check,
  CheckCheck,
  AlertCircle,
  Clock,
  Loader2,
  MoreVertical,
} from 'lucide-react';

interface ConversationData {
  id: string;
  phone: string;
  status: string;
  needs_human_attention: boolean;
  human_attention_reason: string | null;
  ai_response_count: number;
  customer: {
    id: string;
    name: string;
    phone: string;
  } | null;
}

interface MessageWithUser extends SMSMessage {
  sender_user?: {
    id: string;
    name: string;
  } | null;
  is_ai_response?: boolean;
  twilio_sid?: string;
  error_message?: string;
}

export default function ConversationPage() {
  const router = useRouter();
  const params = useParams();
  const conversationId = params.id as string;

  const [user, setUser] = useState<UserWithBusiness | null>(null);
  const [conversation, setConversation] = useState<ConversationData | null>(null);
  const [messages, setMessages] = useState<MessageWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  // Load conversation and messages
  const loadMessages = useCallback(async () => {
    if (!conversationId) return;

    try {
      const response = await fetch(`/api/sms/conversations/${conversationId}/messages`);
      const data = await response.json();

      if (response.ok) {
        setConversation(data.conversation);
        setMessages(data.messages);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    if (user) {
      loadMessages();
    }
  }, [user, loadMessages]);

  // Real-time subscription for new messages
  useEffect(() => {
    if (!conversationId || !user) return;

    const supabase = createClient();

    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sms_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMessage = payload.new as MessageWithUser;
          setMessages((prev) => [...prev, newMessage]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sms_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const updatedMessage = payload.new as MessageWithUser;
          setMessages((prev) =>
            prev.map((msg) => (msg.id === updatedMessage.id ? updatedMessage : msg))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message
  const handleSend = async () => {
    if (!inputMessage.trim() || sending) return;

    setSending(true);
    const messageText = inputMessage.trim();
    setInputMessage('');

    try {
      const response = await fetch(`/api/sms/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageText }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send message');
      }

      // Message will be added via real-time subscription
      // Focus back on input
      inputRef.current?.focus();
    } catch (error) {
      console.error('Error sending message:', error);
      // Restore the message on error
      setInputMessage(messageText);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
      });
    }
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const dateKey = new Date(message.created_at).toDateString();
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(message);
    return groups;
  }, {} as Record<string, MessageWithUser[]>);

  if (loading || !user) {
    return <ConversationSkeleton />;
  }

  const customerName = conversation?.customer?.name || 'Unknown';
  const customerPhone = conversation?.phone || '';

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => router.back()} className="p-2 -ml-2">
            <ArrowLeft className="h-5 w-5 text-text" />
          </button>
          <Avatar
            fallback={customerName.charAt(0)}
            size="md"
          />
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-text truncate">{customerName}</h1>
            <p className="text-sm text-text-muted">{formatPhoneDisplay(customerPhone)}</p>
          </div>
          <div className="flex items-center gap-2">
            <a href={`tel:${customerPhone}`} className="p-2">
              <Phone className="h-5 w-5 text-primary" />
            </a>
            {conversation?.customer && (
              <Link href={`/customers/${conversation.customer.id}`} className="p-2">
                <User className="h-5 w-5 text-text-muted" />
              </Link>
            )}
          </div>
        </div>

        {/* Attention needed banner */}
        {conversation?.needs_human_attention && (
          <div className="px-4 py-2 bg-warning/10 border-t border-warning/20 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-warning shrink-0" />
            <span className="text-sm text-warning">
              {conversation.human_attention_reason === 'customer_requested'
                ? 'Customer requested to speak with a human'
                : conversation.human_attention_reason === 'ai_limit_reached'
                ? 'AI response limit reached'
                : 'Needs attention'}
            </span>
          </div>
        )}
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {Object.entries(groupedMessages).map(([dateKey, dayMessages]) => (
          <div key={dateKey}>
            {/* Date divider */}
            <div className="flex items-center justify-center my-4">
              <span className="text-xs text-text-muted bg-muted px-3 py-1 rounded-full">
                {formatDate(dayMessages[0].created_at)}
              </span>
            </div>

            {/* Messages for this day */}
            {dayMessages.map((message) => (
              <ChatBubble
                key={message.id}
                message={message}
                formatTime={formatTime}
              />
            ))}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="sticky bottom-0 bg-background border-t border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Input
            ref={inputRef}
            type="text"
            placeholder="Type a message..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={sending}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={!inputMessage.trim() || sending}
            size="icon"
          >
            {sending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
        <p className="text-xs text-text-muted mt-1 text-center">
          {inputMessage.length} / 160 characters
          {inputMessage.length > 160 && (
            <span className="text-warning"> ({Math.ceil(inputMessage.length / 160)} segments)</span>
          )}
        </p>
      </div>
    </div>
  );
}

function ChatBubble({
  message,
  formatTime,
}: {
  message: MessageWithUser;
  formatTime: (date: string) => string;
}) {
  const isOutbound = message.direction === 'outbound';
  const isAI = message.is_ai_response || message.sender === 'ai';

  return (
    <div
      className={cn(
        'flex mb-3',
        isOutbound ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-4 py-2',
          isOutbound
            ? 'bg-primary text-white rounded-br-sm'
            : 'bg-muted text-text rounded-bl-sm'
        )}
      >
        {/* AI indicator */}
        {isAI && isOutbound && (
          <div className="flex items-center gap-1 mb-1 opacity-70">
            <Bot className="h-3 w-3" />
            <span className="text-xs">AI Response</span>
          </div>
        )}

        {/* Message body */}
        <p className="text-sm whitespace-pre-wrap break-words">{message.body}</p>

        {/* Footer */}
        <div
          className={cn(
            'flex items-center gap-1 mt-1',
            isOutbound ? 'justify-end' : 'justify-start'
          )}
        >
          <span className={cn('text-xs', isOutbound ? 'opacity-70' : 'text-text-muted')}>
            {formatTime(message.created_at)}
          </span>

          {/* Status indicator for outbound messages */}
          {isOutbound && (
            <span className="opacity-70">
              {message.status === 'delivered' ? (
                <CheckCheck className="h-3.5 w-3.5" />
              ) : message.status === 'sent' ? (
                <Check className="h-3.5 w-3.5" />
              ) : message.status === 'failed' ? (
                <AlertCircle className="h-3.5 w-3.5 text-danger" />
              ) : (
                <Clock className="h-3.5 w-3.5" />
              )}
            </span>
          )}
        </div>

        {/* Error message */}
        {message.error_message && (
          <p className="text-xs text-danger mt-1">{message.error_message}</p>
        )}
      </div>
    </div>
  );
}

function formatPhoneDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  const local = digits.startsWith('1') && digits.length === 11
    ? digits.substring(1)
    : digits;

  if (local.length === 10) {
    return `(${local.substring(0, 3)}) ${local.substring(3, 6)}-${local.substring(6)}`;
  }
  return phone;
}

function ConversationSkeleton() {
  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="h-10 w-10 skeleton rounded-full" />
          <div className="flex-1">
            <div className="h-5 w-32 skeleton rounded mb-1" />
            <div className="h-4 w-24 skeleton rounded" />
          </div>
        </div>
      </header>
      <div className="flex-1 px-4 py-4 space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={cn(
              'flex',
              i % 2 === 0 ? 'justify-end' : 'justify-start'
            )}
          >
            <div
              className={cn(
                'skeleton rounded-2xl',
                i % 2 === 0 ? 'w-3/4 h-16' : 'w-2/3 h-12'
              )}
            />
          </div>
        ))}
      </div>
      <div className="sticky bottom-0 bg-background border-t border-border px-4 py-3">
        <div className="h-12 skeleton rounded-lg" />
      </div>
    </div>
  );
}
