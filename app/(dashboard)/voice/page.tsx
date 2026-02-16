'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUserProfile } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { UserWithBusiness } from '@/types';
import type { VoiceCallEvent } from '@/types/voice-receptionist';
import {
  Phone,
  PhoneIncoming,
  PhoneMissed,
  Bot,
  AlertTriangle,
  Clock,
  Settings,
  ChevronRight,
  Loader2,
  Filter,
  Calendar,
} from 'lucide-react';

interface CallSummary {
  totalCalls: number;
  emergencyCalls: number;
  aiHandledCalls: number;
  missedCalls: number;
}

interface UsageData {
  included: number;
  used: number;
  remaining: number;
  percentUsed: number;
  isAtCap: boolean;
  overageApproved: boolean;
}

export default function VoiceDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserWithBusiness | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Data state
  const [calls, setCalls] = useState<VoiceCallEvent[]>([]);
  const [summary, setSummary] = useState<CallSummary | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });

  // Filter state
  const [filter, setFilter] = useState<'all' | 'emergency' | 'ai_answered' | 'missed'>('all');

  const loadData = useCallback(async () => {
    const profile = await getCurrentUserProfile();
    if (!profile) {
      router.push('/login');
      return;
    }
    setUser(profile as UserWithBusiness);

    try {
      // Build query params
      const params = new URLSearchParams({ page: pagination.page.toString(), limit: '20' });
      if (filter === 'emergency') params.set('emergency', 'true');
      if (filter === 'ai_answered') params.set('ai_answered', 'true');
      if (filter === 'missed') params.set('missed', 'true');

      const [callsRes, usageRes] = await Promise.all([
        fetch(`/api/voice/calls?${params}`),
        fetch('/api/voice/usage'),
      ]);

      if (callsRes.ok) {
        const data = await callsRes.json();
        setCalls(data.calls || []);
        setSummary(data.summary || null);
        setPagination({
          page: data.pagination?.page || 1,
          total: data.pagination?.total || 0,
          totalPages: data.pagination?.totalPages || 1,
        });
      }

      if (usageRes.ok) {
        const data = await usageRes.json();
        setUsage(data.usage || null);
      }
    } catch (error) {
      toast({
        title: 'Failed to load voice data',
        description: 'Please try again',
        variant: 'destructive',
      });
    }

    setLoading(false);
  }, [router, toast, filter, pagination.page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function formatPhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    const local = digits.startsWith('1') && digits.length === 11 ? digits.substring(1) : digits;
    if (local.length === 10) {
      return `(${local.substring(0, 3)}) ${local.substring(3, 6)}-${local.substring(6)}`;
    }
    return phone;
  }

  function formatDuration(seconds?: number): string {
    if (!seconds) return '--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  function formatTime(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  }

  if (loading || !user) {
    return <VoiceDashboardSkeleton />;
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky-header bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-lg font-semibold text-text">Voice Dashboard</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/settings/voice')}
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <div className="px-4 py-4 space-y-4">
        {/* Usage Gauge */}
        {usage && (
          <section className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-text flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Voice Minutes
              </h2>
              <span className="text-sm text-text-muted">This Month</span>
            </div>

            {/* Gauge */}
            <div className="relative h-6 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  'absolute left-0 top-0 h-full transition-all duration-500',
                  usage.percentUsed >= 90
                    ? 'bg-gradient-to-r from-danger to-danger/80'
                    : usage.percentUsed >= 70
                      ? 'bg-gradient-to-r from-warning to-warning/80'
                      : 'bg-gradient-to-r from-success to-success/80'
                )}
                style={{ width: `${Math.min(100, usage.percentUsed)}%` }}
              />
              <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white mix-blend-difference">
                {usage.percentUsed.toFixed(0)}%
              </div>
            </div>

            <div className="flex justify-between mt-2 text-sm">
              <span className="text-text-muted">
                {usage.used.toFixed(1)} used
              </span>
              <span className="font-medium text-text">
                {usage.remaining.toFixed(1)} remaining
              </span>
            </div>

            {usage.isAtCap && !usage.overageApproved && (
              <div className="mt-3 p-2 bg-danger/10 rounded-lg text-sm text-danger flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Voice AI paused - enable overage in settings
              </div>
            )}
          </section>
        )}

        {/* Summary Stats */}
        {summary && (
          <div className="grid grid-cols-2 gap-3">
            <div className="card p-3">
              <div className="flex items-center gap-2 text-text-muted">
                <PhoneIncoming className="h-4 w-4" />
                <span className="text-xs">Total Calls</span>
              </div>
              <p className="text-2xl font-bold text-text mt-1">{summary.totalCalls}</p>
            </div>

            <div className="card p-3">
              <div className="flex items-center gap-2 text-text-muted">
                <Bot className="h-4 w-4" />
                <span className="text-xs">AI Handled</span>
              </div>
              <p className="text-2xl font-bold text-success mt-1">{summary.aiHandledCalls}</p>
            </div>

            <div className="card p-3">
              <div className="flex items-center gap-2 text-text-muted">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-xs">Emergencies</span>
              </div>
              <p className="text-2xl font-bold text-danger mt-1">{summary.emergencyCalls}</p>
            </div>

            <div className="card p-3">
              <div className="flex items-center gap-2 text-text-muted">
                <PhoneMissed className="h-4 w-4" />
                <span className="text-xs">Missed</span>
              </div>
              <p className="text-2xl font-bold text-warning mt-1">{summary.missedCalls}</p>
            </div>
          </div>
        )}

        {/* Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-text-muted" />
          <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
            <SelectTrigger className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Calls</SelectItem>
              <SelectItem value="emergency">Emergencies Only</SelectItem>
              <SelectItem value="ai_answered">AI Handled</SelectItem>
              <SelectItem value="missed">Missed Calls</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Call List */}
        <section>
          <h2 className="font-semibold text-text mb-3 flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            Recent Calls
          </h2>

          {calls.length === 0 ? (
            <div className="card p-8 text-center">
              <Phone className="h-12 w-12 text-text-muted mx-auto mb-4" />
              <h3 className="font-semibold text-text mb-2">No Calls Yet</h3>
              <p className="text-sm text-text-muted">
                Voice calls will appear here once customers start calling.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {calls.map((call) => (
                <button
                  key={call.id}
                  onClick={() => router.push(`/voice/calls/${call.id}`)}
                  className="card p-3 w-full text-left hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {/* Icon */}
                    <div
                      className={cn(
                        'p-2 rounded-full',
                        call.is_emergency
                          ? 'bg-danger/10'
                          : call.was_missed
                            ? 'bg-warning/10'
                            : call.was_ai_answered
                              ? 'bg-success/10'
                              : 'bg-muted'
                      )}
                    >
                      {call.is_emergency ? (
                        <AlertTriangle className="h-4 w-4 text-danger" />
                      ) : call.was_missed ? (
                        <PhoneMissed className="h-4 w-4 text-warning" />
                      ) : call.was_ai_answered ? (
                        <Bot className="h-4 w-4 text-success" />
                      ) : (
                        <PhoneIncoming className="h-4 w-4 text-text-muted" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-text truncate">
                          {(call as any).customers?.first_name
                            ? `${(call as any).customers.first_name} ${(call as any).customers.last_name || ''}`
                            : formatPhone(call.phone_from)}
                        </p>
                        {call.is_emergency && (
                          <Badge variant="destructive" className="text-xs">
                            Emergency
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-text-muted mt-0.5">
                        <span>{formatTime(call.created_at)}</span>
                        <span>•</span>
                        <span>{formatDuration(call.call_duration_seconds)}</span>
                        {call.availability_state && (
                          <>
                            <span>•</span>
                            <span className="capitalize">
                              {call.availability_state.toLowerCase().replace('_', ' ')}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <ChevronRight className="h-4 w-4 text-text-muted" />
                  </div>

                  {/* AI Summary */}
                  {call.ai_summary && (
                    <p className="mt-2 text-sm text-text-muted line-clamp-2 pl-11">
                      {call.ai_summary}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
              >
                Previous
              </Button>
              <span className="text-sm text-text-muted">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
              >
                Next
              </Button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function VoiceDashboardSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky-header bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="h-6 w-40 skeleton rounded" />
          <div className="h-10 w-10 skeleton rounded-lg" />
        </div>
      </header>
      <div className="px-4 py-4 space-y-4">
        <div className="card p-4 h-32 skeleton" />
        <div className="grid grid-cols-2 gap-3">
          <div className="card p-3 h-20 skeleton" />
          <div className="card p-3 h-20 skeleton" />
          <div className="card p-3 h-20 skeleton" />
          <div className="card p-3 h-20 skeleton" />
        </div>
        <div className="card p-4 h-48 skeleton" />
      </div>
    </div>
  );
}
