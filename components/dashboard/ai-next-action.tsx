'use client';

// =====================================================
// AI NEXT ACTION COMPONENT
// LLM-powered contextual suggestion widget (Section 7.1, 8.2)
// Provides ONE actionable suggestion with What/Why/Effect format
// Respects 60-second suggestion cadence (Section 3.4)
// =====================================================

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Phone,
  MessageSquare,
  FileText,
  Clock,
  ArrowRight,
  RefreshCw,
  Loader2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Suggestion types that the AI can recommend
type SuggestionType =
  | 'callback'
  | 'reply_message'
  | 'send_invoice_reminder'
  | 'follow_up_estimate'
  | 'hot_lead_action'
  | 'schedule_job';

interface AINextActionSuggestion {
  type: SuggestionType;
  what: string;      // What to do
  why: string;       // Why it matters
  effect: string;    // Expected outcome
  priority: 'high' | 'medium' | 'low';
  actionUrl?: string;
  actionLabel?: string;
  entityId?: string;
  entityType?: 'call' | 'message' | 'invoice' | 'estimate' | 'lead';
  customerName?: string;
}

interface AINextActionProps {
  /** Refresh interval in seconds (default 60 per Section 3.4) */
  refreshInterval?: number;
  /** Additional CSS classes */
  className?: string;
  /** Callback when user takes action */
  onAction?: (suggestion: AINextActionSuggestion) => void;
  /** Allow user to dismiss suggestion */
  dismissable?: boolean;
}

// Minimum time between suggestions (Section 3.4)
const MIN_REFRESH_INTERVAL = 60;

export function AINextAction({
  refreshInterval = MIN_REFRESH_INTERVAL,
  className,
  onAction,
  dismissable = true,
}: AINextActionProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [suggestion, setSuggestion] = useState<AINextActionSuggestion | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchSuggestion = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/ai/next-action');

      if (!res.ok) {
        throw new Error('Failed to fetch suggestion');
      }

      const data = await res.json();

      if (data.suggestion) {
        setSuggestion(data.suggestion);
        setDismissed(false);
      } else {
        setSuggestion(null);
      }

      setLastRefresh(new Date());
    } catch (err) {
      console.error('Error fetching AI suggestion:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuggestion();

    // Respect minimum 60-second cadence (Section 3.4)
    const interval = Math.max(refreshInterval, MIN_REFRESH_INTERVAL) * 1000;
    const timer = setInterval(fetchSuggestion, interval);

    return () => clearInterval(timer);
  }, [fetchSuggestion, refreshInterval]);

  const handleAction = () => {
    if (!suggestion) return;

    onAction?.(suggestion);

    if (suggestion.actionUrl) {
      router.push(suggestion.actionUrl);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    // Track dismissal to improve future suggestions
    fetch('/api/ai/next-action/dismiss', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ suggestion_type: suggestion?.type }),
    }).catch(() => {
      // Ignore errors for dismissal tracking
    });
  };

  const handleRefresh = () => {
    if (loading) return;
    fetchSuggestion();
  };

  // Icon based on suggestion type
  const getIcon = () => {
    if (!suggestion) return <Sparkles className="h-5 w-5" />;

    switch (suggestion.type) {
      case 'callback':
        return <Phone className="h-5 w-5" />;
      case 'reply_message':
        return <MessageSquare className="h-5 w-5" />;
      case 'send_invoice_reminder':
        return <FileText className="h-5 w-5" />;
      case 'follow_up_estimate':
        return <FileText className="h-5 w-5" />;
      case 'hot_lead_action':
        return <Sparkles className="h-5 w-5" />;
      case 'schedule_job':
        return <Clock className="h-5 w-5" />;
      default:
        return <Sparkles className="h-5 w-5" />;
    }
  };

  // Priority-based styling
  const getPriorityStyles = () => {
    if (!suggestion) return 'border-primary/20 bg-primary/5';

    switch (suggestion.priority) {
      case 'high':
        return 'border-orange-500/50 bg-orange-500/10 dark:border-orange-400/50 dark:bg-orange-400/10';
      case 'medium':
        return 'border-blue-500/50 bg-blue-500/10 dark:border-blue-400/50 dark:bg-blue-400/10';
      case 'low':
        return 'border-muted-foreground/20 bg-muted/50';
      default:
        return 'border-primary/20 bg-primary/5';
    }
  };

  // Loading state
  if (loading && !suggestion) {
    return (
      <div className={cn('rounded-lg border p-4', className)}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Loader2 className="h-5 w-5 text-primary animate-spin" />
          </div>
          <div>
            <p className="text-sm font-medium">Analyzing your tasks...</p>
            <p className="text-xs text-muted-foreground">Finding the best next action</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !suggestion) {
    return (
      <div className={cn('rounded-lg border p-4', className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">AI suggestions unavailable</p>
              <p className="text-xs text-muted-foreground">Will retry automatically</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // No suggestion state
  if (!suggestion || dismissed) {
    return (
      <div className={cn('rounded-lg border p-4', className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm font-medium">All caught up!</p>
              <p className="text-xs text-muted-foreground">No urgent actions needed right now</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
        </div>
      </div>
    );
  }

  // Suggestion display
  return (
    <div className={cn('rounded-lg border p-4', getPriorityStyles(), className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          <div className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
            suggestion.priority === 'high' ? 'bg-orange-500/20 text-orange-600 dark:text-orange-400' :
            suggestion.priority === 'medium' ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400' :
            'bg-muted text-muted-foreground'
          )}>
            {getIcon()}
          </div>
          <div className="min-w-0 flex-1">
            {/* What to do */}
            <p className="font-medium text-sm">{suggestion.what}</p>

            {/* Customer name if available */}
            {suggestion.customerName && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {suggestion.customerName}
              </p>
            )}

            {/* Why it matters */}
            <p className="text-xs text-muted-foreground mt-1">{suggestion.why}</p>

            {/* Expected effect */}
            <p className="text-xs mt-1">
              <span className="text-muted-foreground">Result: </span>
              <span className="text-foreground">{suggestion.effect}</span>
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {dismissable && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDismiss}
              className="h-8 w-8"
              title="Dismiss suggestion"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={loading}
            className="h-8 w-8"
            title="Get new suggestion"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Action button */}
      {suggestion.actionUrl && (
        <Button
          onClick={handleAction}
          size="sm"
          className="mt-3 w-full min-h-[44px]"
        >
          {suggestion.actionLabel || 'Take Action'}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

/**
 * Compact version for smaller spaces
 */
export function AINextActionCompact({ className }: { className?: string }) {
  const [suggestion, setSuggestion] = useState<AINextActionSuggestion | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchSuggestion() {
      try {
        const res = await globalThis.fetch('/api/ai/next-action');
        if (res.ok) {
          const data = await res.json();
          setSuggestion(data.suggestion || null);
        }
      } catch {
        // Ignore errors for compact version
      } finally {
        setLoading(false);
      }
    }

    fetchSuggestion();
    const interval = setInterval(fetchSuggestion, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !suggestion) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => suggestion.actionUrl && router.push(suggestion.actionUrl)}
      className={cn('gap-2', className)}
    >
      <Sparkles className="h-4 w-4 text-primary" />
      <span className="truncate max-w-[200px]">{suggestion.what}</span>
    </Button>
  );
}
