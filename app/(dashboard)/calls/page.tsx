'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient, getCurrentUserProfile } from '@/lib/supabase/client';
import { hasPermission } from '@/lib/permissions';
import { cn, formatRelativeDate, formatPhoneNumber } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { UserWithBusiness, CallLog, Customer, Lead, User } from '@/types';
import {
  Plus,
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  RefreshCw,
  Search,
  Filter,
  Clock,
  User as UserIcon,
  ChevronRight,
  X,
} from 'lucide-react';

interface CallLogWithRelations extends CallLog {
  customer?: Pick<Customer, 'id' | 'name'> | null;
  lead?: Pick<Lead, 'id' | 'name' | 'service_needed'> | null;
  user?: Pick<User, 'id' | 'name'> | null;
}

type FilterOption = 'all' | 'inbound' | 'outbound';

const OUTCOME_LABELS: Record<string, { label: string; color: string }> = {
  answered: { label: 'Answered', color: 'bg-success/10 text-success' },
  voicemail: { label: 'Voicemail', color: 'bg-warning/10 text-warning' },
  no_answer: { label: 'No Answer', color: 'bg-danger/10 text-danger' },
  scheduled: { label: 'Scheduled', color: 'bg-info/10 text-info' },
  not_interested: { label: 'Not Interested', color: 'bg-muted text-text-muted' },
  callback_requested: { label: 'Callback Requested', color: 'bg-primary/10 text-primary' },
};

export default function CallsPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserWithBusiness | null>(null);
  const [calls, setCalls] = useState<CallLogWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterOption>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Load user
  useEffect(() => {
    async function loadUser() {
      const profile = await getCurrentUserProfile();
      if (!profile || !hasPermission(profile.role, 'view_calls')) {
        router.push('/dashboard');
        return;
      }
      setUser(profile as UserWithBusiness);
    }
    loadUser();
  }, [router]);

  // Load calls
  const loadCalls = useCallback(async () => {
    if (!user) return;

    const supabase = createClient();

    try {
      const { data, error } = await supabase
        .from('call_logs')
        .select(`
          *,
          customer:customers (id, name),
          lead:leads (id, name, service_needed),
          user:users (id, name)
        `)
        .eq('business_id', user.business_id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setCalls((data as CallLogWithRelations[]) || []);
    } catch (error) {
      console.error('Error loading calls:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadCalls();
    }
  }, [user, loadCalls]);

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCalls();
  };

  // Filter and search calls
  const filteredCalls = useMemo(() => {
    return calls.filter((call) => {
      // Direction filter
      if (filter !== 'all' && call.direction !== filter) {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesPhone = call.phone?.toLowerCase().includes(query);
        const matchesCustomer = call.customer?.name?.toLowerCase().includes(query);
        const matchesLead =
          call.lead?.name?.toLowerCase().includes(query) ||
          call.lead?.service_needed?.toLowerCase().includes(query);
        const matchesNotes = call.notes?.toLowerCase().includes(query);

        if (!matchesPhone && !matchesCustomer && !matchesLead && !matchesNotes) {
          return false;
        }
      }

      return true;
    });
  }, [calls, filter, searchQuery]);

  // Count by direction
  const counts = useMemo(() => {
    return {
      all: calls.length,
      inbound: calls.filter((c) => c.direction === 'inbound').length,
      outbound: calls.filter((c) => c.direction === 'outbound').length,
    };
  }, [calls]);

  // Group calls by date
  const groupedCalls = useMemo(() => {
    const groups: Record<string, CallLogWithRelations[]> = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    filteredCalls.forEach((call) => {
      const callDate = new Date(call.created_at);
      callDate.setHours(0, 0, 0, 0);

      let groupKey: string;

      if (callDate.getTime() === today.getTime()) {
        groupKey = 'Today';
      } else if (callDate.getTime() === yesterday.getTime()) {
        groupKey = 'Yesterday';
      } else {
        groupKey = callDate.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
        });
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(call);
    });

    return groups;
  }, [filteredCalls]);

  if (loading || !user) {
    return <CallsSkeleton />;
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky-header bg-background border-b border-border">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-text">Call Log</h1>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setShowSearch(!showSearch)}
              >
                {showSearch ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Search className="h-5 w-5" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={cn('h-5 w-5', refreshing && 'animate-spin')} />
              </Button>
            </div>
          </div>

          {/* Search input */}
          {showSearch && (
            <div className="mb-3 animate-in slide-in-from-top-2 fade-in duration-200">
              <Input
                type="text"
                placeholder="Search calls..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>
          )}

          {/* Filter tabs */}
          <div className="flex gap-2">
            {[
              { id: 'all', label: 'All', count: counts.all },
              { id: 'inbound', label: 'Inbound', count: counts.inbound },
              { id: 'outbound', label: 'Outbound', count: counts.outbound },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id as FilterOption)}
                className={cn(
                  'px-3 py-1.5 text-sm rounded-full whitespace-nowrap transition-colors flex items-center gap-1.5',
                  filter === tab.id
                    ? 'bg-primary text-white'
                    : 'bg-muted text-text hover:bg-muted/80'
                )}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span
                    className={cn(
                      'text-xs px-1.5 py-0.5 rounded-full',
                      filter === tab.id ? 'bg-white/20' : 'bg-background'
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Calls List */}
      <div className="px-4 py-4">
        {filteredCalls.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Phone className="h-12 w-12 text-text-muted mb-4" />
            <h3 className="text-lg font-medium text-text mb-1">
              {searchQuery ? 'No calls found' : 'No calls logged yet'}
            </h3>
            <p className="text-sm text-text-muted mb-4">
              {searchQuery
                ? 'Try a different search term'
                : 'Log your first call to track customer interactions'}
            </p>
            {!searchQuery && (
              <Link href="/calls/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Log Call
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedCalls).map(([group, items]) => (
              <div key={group}>
                <h2 className="text-sm font-semibold text-text-muted mb-2">{group}</h2>
                <div className="space-y-2">
                  {items.map((call) => (
                    <CallCard key={call.id} call={call} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      {hasPermission(user.role, 'create_calls') && (
        <Link href="/calls/new" className="fab">
          <Plus className="h-6 w-6" />
        </Link>
      )}
    </div>
  );
}

function CallCard({ call }: { call: CallLogWithRelations }) {
  const DirectionIcon =
    call.direction === 'inbound'
      ? PhoneIncoming
      : call.outcome === 'no_answer'
      ? PhoneMissed
      : PhoneOutgoing;

  const directionColor =
    call.direction === 'inbound'
      ? 'text-success'
      : call.outcome === 'no_answer'
      ? 'text-danger'
      : 'text-info';

  const outcome = call.outcome ? OUTCOME_LABELS[call.outcome] : null;

  // Format duration
  const formatDuration = (seconds: number | null) => {
    if (!seconds) return null;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  return (
    <Link
      href={
        call.customer_id
          ? `/customers/${call.customer_id}`
          : call.lead_id
          ? `/leads/${call.lead_id}`
          : '#'
      }
      className="card p-3 flex items-start gap-3 active:scale-[0.99] transition-transform"
    >
      {/* Direction icon */}
      <div
        className={cn(
          'p-2 rounded-full shrink-0',
          call.direction === 'inbound' ? 'bg-success/10' : 'bg-info/10'
        )}
      >
        <DirectionIcon className={cn('h-5 w-5', directionColor)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium text-text truncate">
              {call.customer?.name ||
                call.lead?.name ||
                call.lead?.service_needed ||
                formatPhoneNumber(call.phone)}
            </p>
            <p className="text-sm text-text-muted">
              {formatPhoneNumber(call.phone)}
            </p>
          </div>
          <ChevronRight className="h-5 w-5 text-text-muted shrink-0" />
        </div>

        {/* Meta info */}
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <div className="flex items-center gap-1 text-xs text-text-muted">
            <Clock className="h-3.5 w-3.5" />
            {formatRelativeDate(call.created_at)}
          </div>

          {call.duration_seconds && (
            <div className="text-xs text-text-muted">
              {formatDuration(call.duration_seconds)}
            </div>
          )}

          {outcome && (
            <Badge className={cn('text-xs', outcome.color)}>{outcome.label}</Badge>
          )}

          {call.user && (
            <div className="flex items-center gap-1 text-xs text-text-muted">
              <UserIcon className="h-3.5 w-3.5" />
              {call.user.name}
            </div>
          )}
        </div>

        {/* Notes preview */}
        {call.notes && (
          <p className="text-sm text-text-muted mt-2 line-clamp-2">{call.notes}</p>
        )}
      </div>
    </Link>
  );
}

function CallsSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky-header bg-background border-b border-border">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="h-7 w-24 skeleton rounded" />
            <div className="flex gap-2">
              <div className="h-10 w-10 skeleton rounded-lg" />
              <div className="h-10 w-10 skeleton rounded-lg" />
            </div>
          </div>
          <div className="flex gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 w-24 skeleton rounded-full" />
            ))}
          </div>
        </div>
      </header>
      <div className="px-4 py-4 space-y-6">
        <div>
          <div className="h-4 w-16 skeleton rounded mb-2" />
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="card h-24 skeleton" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
