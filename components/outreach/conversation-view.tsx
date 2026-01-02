'use client';

import { useState, useRef, useEffect } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Send,
  Bot,
  User,
  Loader2,
  CheckCheck,
  Clock,
  AlertCircle,
  UserCog,
} from 'lucide-react';
import type { OutreachMessage, OutreachContact, OutreachConversation } from '@/types/outreach';

interface ConversationViewProps {
  conversation: OutreachConversation;
  messages: OutreachMessage[];
  contact: OutreachContact;
  onSendMessage: (message: string) => Promise<void>;
  onTakeover?: () => void;
  isLoading?: boolean;
  isSending?: boolean;
}

const statusIcons: Record<string, React.ReactNode> = {
  queued: <Clock className="w-3 h-3" />,
  sent: <CheckCheck className="w-3 h-3 text-muted-foreground" />,
  delivered: <CheckCheck className="w-3 h-3 text-blue-500" />,
  read: <CheckCheck className="w-3 h-3 text-green-500" />,
  failed: <AlertCircle className="w-3 h-3 text-red-500" />,
  received: null,
};

export function ConversationView({
  conversation,
  messages,
  contact,
  onSendMessage,
  onTakeover,
  isLoading,
  isSending,
}: ConversationViewProps) {
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || isSending) return;

    const message = newMessage.trim();
    setNewMessage('');
    await onSendMessage(message);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const contactInitials = contact.name
    ? contact.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback>{contactInitials}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold">
              {contact.name || 'Unknown Contact'}
            </h3>
            <p className="text-sm text-muted-foreground">{contact.phone}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {conversation.human_takeover ? (
            <Badge variant="outline" className="gap-1">
              <UserCog className="w-3 h-3" />
              Human Mode
            </Badge>
          ) : (
            <>
              <Badge variant="secondary" className="gap-1">
                <Bot className="w-3 h-3" />
                AI Mode
              </Badge>
              {onTakeover && (
                <Button variant="outline" size="sm" onClick={onTakeover}>
                  Take Over
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            No messages yet
          </div>
        ) : (
          messages.map((message) => {
            const isOutbound = message.direction === 'outbound';
            const isAI = message.sender_type === 'ai';

            return (
              <div
                key={message.id}
                className={cn(
                  'flex gap-2',
                  isOutbound ? 'justify-end' : 'justify-start'
                )}
              >
                {!isOutbound && (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {contactInitials}
                    </AvatarFallback>
                  </Avatar>
                )}

                <div
                  className={cn(
                    'max-w-[70%] space-y-1',
                    isOutbound && 'items-end'
                  )}
                >
                  <div
                    className={cn(
                      'rounded-lg px-4 py-2',
                      isOutbound
                        ? isAI
                          ? 'bg-purple-100 text-purple-900'
                          : 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    )}
                  >
                    <p className="whitespace-pre-wrap">{message.message_text}</p>
                  </div>

                  <div
                    className={cn(
                      'flex items-center gap-1 text-xs text-muted-foreground',
                      isOutbound && 'justify-end'
                    )}
                  >
                    {isOutbound && isAI && (
                      <Bot className="w-3 h-3" />
                    )}
                    {isOutbound && !isAI && (
                      <User className="w-3 h-3" />
                    )}
                    <span>
                      {format(new Date(message.created_at), 'MMM d, h:mm a')}
                    </span>
                    {isOutbound && (message.status ? statusIcons[message.status] : null)}
                  </div>
                </div>

                {isOutbound && (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {isAI ? <Bot className="w-4 h-4" /> : 'You'}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="min-h-[44px] max-h-32 resize-none"
            disabled={isSending || conversation.status === 'opted_out'}
          />
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim() || isSending || conversation.status === 'opted_out'}
            size="icon"
            className="h-[44px] w-[44px]"
          >
            {isSending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>
        {conversation.status === 'opted_out' && (
          <p className="mt-2 text-sm text-destructive">
            This contact has opted out and cannot receive messages.
          </p>
        )}
      </div>
    </div>
  );
}
