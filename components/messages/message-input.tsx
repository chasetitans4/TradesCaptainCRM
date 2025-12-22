'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, FileText, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageInputProps {
  onSend: (message: string) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
  templates?: Array<{ id: string; name: string; content: string }>;
}

export function MessageInput({
  onSend,
  disabled = false,
  placeholder = 'Type a message...',
  templates = [],
}: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const templatesRef = useRef<HTMLDivElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [message]);

  // Close templates dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (templatesRef.current && !templatesRef.current.contains(e.target as Node)) {
        setShowTemplates(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSend = async () => {
    if (!message.trim() || sending || disabled) return;

    setSending(true);
    try {
      await onSend(message.trim());
      setMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const insertTemplate = (content: string) => {
    setMessage(content);
    setShowTemplates(false);
    textareaRef.current?.focus();
  };

  // Calculate SMS segments
  const charCount = message.length;
  const segmentCount = charCount > 0 ? Math.ceil(charCount / 160) : 0;

  return (
    <div className="border-t border-border bg-card p-3">
      {/* Templates dropdown */}
      {showTemplates && templates.length > 0 && (
        <div
          ref={templatesRef}
          className="mb-2 bg-background border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto"
        >
          <div className="flex items-center justify-between p-2 border-b border-border">
            <span className="text-sm font-medium">Templates</span>
            <button
              onClick={() => setShowTemplates(false)}
              className="p-1 hover:bg-muted rounded"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {templates.map((template) => (
            <button
              key={template.id}
              onClick={() => insertTemplate(template.content)}
              className="w-full text-left p-3 hover:bg-muted border-b border-border last:border-b-0 transition-colors"
            >
              <p className="text-sm font-medium">{template.name}</p>
              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                {template.content}
              </p>
            </button>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* Templates button */}
        {templates.length > 0 && (
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            disabled={disabled}
            className={cn(
              'p-2 rounded-lg transition-colors',
              showTemplates
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted text-muted-foreground'
            )}
            title="Insert template"
          >
            <FileText className="h-5 w-5" />
          </button>
        )}

        {/* Message input */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || sending}
            rows={1}
            className="w-full px-4 py-2 bg-muted rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 text-sm"
            style={{ minHeight: '40px' }}
          />

          {/* Character count */}
          {charCount > 0 && (
            <div className="absolute right-3 bottom-1 text-xs text-muted-foreground">
              {charCount}
              {segmentCount > 1 && (
                <span className="text-amber-500 ml-1">({segmentCount} SMS)</span>
              )}
            </div>
          )}
        </div>

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!message.trim() || sending || disabled}
          className={cn(
            'p-2 rounded-full transition-colors',
            message.trim() && !disabled
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'bg-muted text-muted-foreground'
          )}
        >
          {sending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </button>
      </div>
    </div>
  );
}

export default MessageInput;
