'use client';

import { Bot } from 'lucide-react';

interface AIIndicatorProps {
  isTyping?: boolean;
}

export function AIIndicator({ isTyping = true }: AIIndicatorProps) {
  if (!isTyping) return null;

  return (
    <div className="flex justify-start mb-3">
      <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-2 flex items-center gap-2">
        <Bot className="h-4 w-4 text-primary" />
        <div className="flex items-center gap-1">
          <span className="text-sm text-muted-foreground">AI is composing</span>
          <div className="flex gap-0.5">
            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default AIIndicator;
