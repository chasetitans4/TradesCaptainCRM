'use client';

// =====================================================
// MISSED CALLS CARD COMPONENT
// Shows missed calls from the last 24 hours (Section 7.1)
// =====================================================

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Phone, PhoneOff, PhoneMissed, Clock, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn, formatRelativeDate } from '@/lib/utils';

interface MissedCall {
  id: string;
  phone_number: string;
  customer_name: string | null;
  customer_id: string | null;
  missed_at: string;
  duration_seconds: number;
  has_voicemail: boolean;
}

interface MissedCallsCardProps {
  /** Max number of calls to show */
  limit?: number;
  /** Additional CSS classes */
  className?: string;
}

export function MissedCallsCard({ limit = 5, className }: MissedCallsCardProps) {
  const [loading, setLoading] = useState(true);
  const [missedCalls, setMissedCalls] = useState<MissedCall[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchMissedCalls = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch missed calls (no_answer) from the last 24 hours
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const params = new URLSearchParams({
        outcome: 'no_answer',
        start_date: yesterday.toISOString(),
        limit: String(limit),
      });

      const res = await fetch(`/api/calls?${params}`);

      if (!res.ok) {
        throw new Error('Failed to fetch missed calls');
      }

      const data = await res.json();
      // Map to our interface
      interface CallRecord {
        id: string;
        phone: string;
        customer?: { name?: string; id?: string } | null;
        created_at: string;
        duration_seconds?: number;
        has_voicemail?: boolean;
      }
      const calls: MissedCall[] = (data.calls || []).map((call: CallRecord) => ({
        id: call.id,
        phone_number: call.phone,
        customer_name: call.customer?.name || null,
        customer_id: call.customer?.id || null,
        missed_at: call.created_at,
        duration_seconds: call.duration_seconds || 0,
        has_voicemail: call.has_voicemail || false,
      }));

      setMissedCalls(calls);
    } catch (err) {
      console.error('Error fetching missed calls:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchMissedCalls();
    // Refresh every 2 minutes
    const interval = setInterval(fetchMissedCalls, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchMissedCalls]);

  const handleCallback = async (call: MissedCall) => {
    // Initiate callback - this would integrate with Twilio
    try {
      const res = await fetch('/api/calls/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: call.phone_number }),
      });

      if (!res.ok) {
        throw new Error('Failed to initiate callback');
      }

      // Remove from list after callback initiated
      setMissedCalls((prev) => prev.filter((c) => c.id !== call.id));
    } catch (err) {
      console.error('Error initiating callback:', err);
    }
  };

  if (loading) {
    return (
      <div className={cn('card p-4', className)}>
        <div className="flex items-center gap-2 mb-3">
          <PhoneMissed className="h-5 w-5 text-red-500" />
          <span className="font-medium">Missed Calls (24h)</span>
        </div>
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('card p-4', className)}>
        <div className="flex items-center gap-2 mb-3">
          <PhoneMissed className="h-5 w-5 text-red-500" />
          <span className="font-medium">Missed Calls (24h)</span>
        </div>
        <p className="text-sm text-muted-foreground">Unable to load missed calls</p>
      </div>
    );
  }

  if (missedCalls.length === 0) {
    return (
      <div className={cn('card p-4', className)}>
        <div className="flex items-center gap-2 mb-3">
          <Phone className="h-5 w-5 text-green-500" />
          <span className="font-medium">All Calls Answered</span>
        </div>
        <p className="text-sm text-muted-foreground">No missed calls in the last 24 hours</p>
      </div>
    );
  }

  return (
    <div className={cn('card', className)}>
      <div className="flex items-center justify-between p-4 pb-2">
        <div className="flex items-center gap-2">
          <PhoneMissed className="h-5 w-5 text-red-500" />
          <span className="font-medium">Missed Calls (24h)</span>
          <span className="text-xs bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-1.5 py-0.5 rounded-full">
            {missedCalls.length}
          </span>
        </div>
        <Link href="/calls?filter=missed" className="text-xs text-primary hover:underline">
          View all
        </Link>
      </div>

      <div className="divide-y divide-border">
        {missedCalls.map((call) => (
          <div key={call.id} className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                <PhoneOff className="h-4 w-4 text-red-500" />
              </div>
              <div className="min-w-0">
                <p className="font-medium truncate">
                  {call.customer_name || call.phone_number}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{formatRelativeDate(call.missed_at)}</span>
                  {call.has_voicemail && (
                    <span className="text-primary">• Voicemail</span>
                  )}
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCallback(call)}
              className="shrink-0 gap-1 min-h-[44px]"
            >
              <Phone className="h-4 w-4" />
              Call Back
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Compact version for sidebar or smaller spaces
 */
export function MissedCallsBadge({ className }: { className?: string }) {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCount() {
      try {
        // Use the calls API with stats to get count
        const now = new Date();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        const params = new URLSearchParams({
          outcome: 'no_answer',
          start_date: yesterday.toISOString(),
          limit: '1', // Just need count
        });

        const res = await fetch(`/api/calls?${params}`);
        if (res.ok) {
          const data = await res.json();
          setCount(data.total || data.calls?.length || 0);
        }
      } catch {
        // Ignore errors for badge
      } finally {
        setLoading(false);
      }
    }

    fetchCount();
    const interval = setInterval(fetchCount, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading || count === 0) return null;

  return (
    <Link
      href="/calls?filter=missed"
      className={cn(
        'flex items-center gap-1.5 px-2 py-1 rounded-full',
        'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
        'text-xs font-medium hover:bg-red-200 dark:hover:bg-red-900/50',
        'transition-colors',
        className
      )}
    >
      <PhoneMissed className="h-3.5 w-3.5" />
      <span>{count} missed</span>
    </Link>
  );
}
