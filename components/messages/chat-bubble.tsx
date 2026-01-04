'use client';

import { cn, formatRelativeDate } from '@/lib/utils';
import { Bot, Check, CheckCheck, AlertCircle, Clock } from 'lucide-react';

interface ChatBubbleProps {
  content: string;
  direction: 'inbound' | 'outbound';
  isAI?: boolean;
  status?: 'sending' | 'sent' | 'delivered' | 'failed' | 'received';
  timestamp: string;
  senderName?: string;
}

export function ChatBubble({
  content,
  direction,
  isAI = false,
  status = 'sent',
  timestamp,
  senderName,
}: ChatBubbleProps) {
  const isOutbound = direction === 'outbound';

  return (
    <div
      className={cn(
        'flex w-full mb-3',
        isOutbound ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-4 py-2',
          isOutbound
            ? 'bg-primary text-primary-foreground rounded-br-md'
            : 'bg-muted text-foreground rounded-bl-md'
        )}
      >
        {/* AI indicator - Per Section 8.1: "AI sent this message" → "Suggested response (you approved)" */}
        {isAI && isOutbound && (
          <div className="flex items-center gap-1 mb-1 opacity-80">
            <Bot className="h-3 w-3" />
            <span className="text-xs">Suggested Response</span>
          </div>
        )}

        {/* Sender name for inbound */}
        {senderName && !isOutbound && (
          <p className="text-xs font-medium mb-1 opacity-70">{senderName}</p>
        )}

        {/* Message content */}
        <p className="text-sm whitespace-pre-wrap break-words">{content}</p>

        {/* Footer with time and status */}
        <div
          className={cn(
            'flex items-center gap-1 mt-1',
            isOutbound ? 'justify-end' : 'justify-start'
          )}
        >
          <span className="text-xs opacity-60">
            {formatRelativeDate(timestamp)}
          </span>

          {/* Status indicator for outbound messages */}
          {isOutbound && (
            <span className="ml-1">
              {status === 'sending' && (
                <Clock className="h-3 w-3 opacity-60" />
              )}
              {status === 'sent' && (
                <Check className="h-3 w-3 opacity-60" />
              )}
              {status === 'delivered' && (
                <CheckCheck className="h-3 w-3 opacity-80" />
              )}
              {status === 'failed' && (
                <AlertCircle className="h-3 w-3 text-red-300" />
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default ChatBubble;
