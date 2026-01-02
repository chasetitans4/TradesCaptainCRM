'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient, getCurrentUserProfile } from '@/lib/supabase/client';
import { hasPermission } from '@/lib/permissions';
import { cn, formatRelativeDate, formatPhoneNumber } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import type { UserWithBusiness, Lead, Customer, LeadStatus } from '@/types';
import {
  Plus,
  Search,
  X,
  ChevronRight,
  Phone,
  MessageSquare,
  Filter,
  User,
  Clock,
  Briefcase,
  ArrowUpDown,
  RefreshCw,
} from 'lucide-react';

interface LeadWithCustomer extends Lead {
  customer?: Pick<Customer, 'id' | 'name' | 'phone' | 'email'> | null;
}

type SortOption = 'newest' | 'oldest' | 'urgency' | 'name';

const LEAD_STATUSES: { value: LeadStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'quoted', label: 'Quoted' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
];

const STATUS_COLORS: Record<LeadStatus, string> = {
  new: 'bg-primary/10 text-primary border-primary/20',
  contacted: 'bg-info/10 text-info border-info/20',
  qualified: 'bg-success/10 text-success border-success/20',
  quoted: 'bg-warning/10 text-warning border-warning/20',
  scheduled: 'bg-info/10 text-info border-info/20',
  won: 'bg-success/10 text-success border-success/20',
  lost: 'bg-danger/10 text-danger border-danger/20',
};

const URGENCY_COLORS: Record<string, string> = {
  emergency: 'bg-danger text-white',
  high: 'bg-warning text-white',
  normal: 'bg-info/10 text-info',
  low: 'bg-muted text-text-muted',
};

export default function LeadsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<UserWithBusiness | null>(null);
  const [leads, setLeads] = useState<LeadWithCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>(
    (searchParams.get('status') as LeadStatus) || 'all'
  );
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showFilters, setShowFilters] = useState(false);

  // Load user
  useEffect(() => {
    async function loadUser() {
      const profile = await getCurrentUserProfile();
      if (!profile || !hasPermission(profile.role, 'view_leads')) {
        router.push('/dashboard');
        return;
      }
      setUser(profile as UserWithBusiness);
    }
    loadUser();
  }, [router]);

  // Load leads
  const loadLeads = useCallback(async () => {
    if (!user) return;

    const supabase = createClient();
    
    try {
      let query = supabase
        .from('leads')
        .select(`
          *,
          customer:customers (
            id,
            name,
            phone,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setLeads((data as LeadWithCustomer[]) || []);
    } catch (error) {
      console.error('Error loading leads:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, statusFilter]);

  useEffect(() => {
    if (user) {
      loadLeads();
    }
  }, [user, loadLeads]);

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadLeads();
  };

  // Filter and sort leads
  const filteredLeads = useMemo(() => {
    let filtered = [...leads];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((lead) => {
        const name = (lead.customer?.name || lead.name || '').toLowerCase();
        const phone = lead.customer?.phone || lead.phone || '';
        const service = (lead.service_needed || '').toLowerCase();
        return (
          name.includes(query) ||
          phone.includes(query) ||
          service.includes(query)
        );
      });
    }

    // Sort
    switch (sortBy) {
      case 'oldest':
        filtered.sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        break;
      case 'urgency':
        const urgencyOrder = { emergency: 0, high: 1, normal: 2, low: 3 };
        filtered.sort((a, b) => 
          (urgencyOrder[a.urgency as keyof typeof urgencyOrder] || 3) -
          (urgencyOrder[b.urgency as keyof typeof urgencyOrder] || 3)
        );
        break;
      case 'name':
        filtered.sort((a, b) => {
          const nameA = (a.customer?.name || a.name || '').toLowerCase();
          const nameB = (b.customer?.name || b.name || '').toLowerCase();
          return nameA.localeCompare(nameB);
        });
        break;
      default:
        // newest - already sorted by query
        break;
    }

    return filtered;
  }, [leads, searchQuery, sortBy]);

  // Status counts
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: leads.length };
    leads.forEach((lead) => {
      counts[lead.status] = (counts[lead.status] || 0) + 1;
    });
    return counts;
  }, [leads]);

  if (loading || !user) {
    return <LeadsListSkeleton />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky-header bg-background border-b border-border">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-text">Leads</h1>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={cn('h-5 w-5', refreshing && 'animate-spin')} />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setShowFilters(!showFilters)}
                className={showFilters ? 'text-primary' : ''}
              >
                <Filter className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <Input
              type="search"
              placeholder="Search leads..."
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

          {/* Filters */}
          {showFilters && (
            <div className="mt-3 pt-3 border-t border-border animate-in slide-in-from-top-2 fade-in duration-200">
              {/* Sort */}
              <div className="flex items-center gap-2 mb-3">
                <ArrowUpDown className="h-4 w-4 text-text-muted" />
                <span className="text-sm text-text-muted">Sort:</span>
                <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                  {[
                    { value: 'newest', label: 'Newest' },
                    { value: 'oldest', label: 'Oldest' },
                    { value: 'urgency', label: 'Urgency' },
                    { value: 'name', label: 'Name' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setSortBy(option.value as SortOption)}
                      className={cn(
                        'px-3 py-1.5 text-sm rounded-full whitespace-nowrap transition-colors',
                        sortBy === option.value
                          ? 'bg-primary text-white'
                          : 'bg-muted text-text hover:bg-muted/80'
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Status Tabs */}
        <div className="px-4 pb-2 overflow-x-auto scrollbar-hide">
          <div className="flex gap-2">
            {LEAD_STATUSES.map((status) => (
              <button
                key={status.value}
                onClick={() => setStatusFilter(status.value)}
                className={cn(
                  'px-3 py-1.5 text-sm rounded-full whitespace-nowrap transition-colors flex items-center gap-1.5',
                  statusFilter === status.value
                    ? 'bg-primary text-white'
                    : 'bg-muted text-text hover:bg-muted/80'
                )}
              >
                {status.label}
                {statusCounts[status.value] !== undefined && (
                  <span
                    className={cn(
                      'text-xs px-1.5 py-0.5 rounded-full',
                      statusFilter === status.value
                        ? 'bg-white/20'
                        : 'bg-background'
                    )}
                  >
                    {statusCounts[status.value]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Leads List */}
      <div className="px-4 py-4">
        {filteredLeads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <User className="h-12 w-12 text-text-muted mb-4" />
            <h3 className="text-lg font-medium text-text mb-1">
              {searchQuery || statusFilter !== 'all'
                ? 'No leads found'
                : 'No leads yet'}
            </h3>
            <p className="text-sm text-text-muted mb-4">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Add your first lead to get started'}
            </p>
            {!searchQuery && statusFilter === 'all' && hasPermission(user.role, 'create_leads') && (
              <Link href="/leads/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Lead
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLeads.map((lead) => (
              <LeadCard key={lead.id} lead={lead} />
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      {hasPermission(user.role, 'create_leads') && (
        <Link href="/leads/new" className="fab">
          <Plus className="h-6 w-6" />
        </Link>
      )}
    </div>
  );
}

function LeadCard({ lead }: { lead: LeadWithCustomer }) {
  const name = lead.customer?.name || lead.name || 'Unknown';
  const phone = lead.customer?.phone || lead.phone;

  return (
    <Link
      href={`/leads/${lead.id}`}
      className="card p-4 flex items-start gap-3 active:scale-[0.99] transition-transform"
    >
      {/* Avatar / Urgency indicator */}
      <div
        className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
          lead.urgency
            ? URGENCY_COLORS[lead.urgency]
            : 'bg-primary/10 text-primary'
        )}
      >
        <User className="h-5 w-5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-medium text-text truncate">{name}</h3>
            <p className="text-sm text-text-muted truncate">
              {lead.service_needed || 'No service specified'}
            </p>
          </div>
          <Badge
            className={cn(
              'shrink-0 border',
              STATUS_COLORS[lead.status]
            )}
          >
            {lead.status}
          </Badge>
        </div>

        {/* Meta info */}
        <div className="flex items-center gap-4 mt-2 text-xs text-text-muted">
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span>{formatRelativeDate(lead.created_at)}</span>
          </div>
          {lead.source && (
            <div className="flex items-center gap-1">
              <Briefcase className="h-3.5 w-3.5" />
              <span className="truncate">{lead.source}</span>
            </div>
          )}
        </div>

        {/* Quick actions */}
        {phone && (
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border">
            <a
              href={`tel:${phone}`}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 text-sm text-primary"
            >
              <Phone className="h-4 w-4" />
              {formatPhoneNumber(phone)}
            </a>
            <a
              href={`sms:${phone}`}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 text-sm text-primary"
            >
              <MessageSquare className="h-4 w-4" />
              Text
            </a>
          </div>
        )}
      </div>

      <ChevronRight className="h-5 w-5 text-text-muted shrink-0 mt-2" />
    </Link>
  );
}

function LeadsListSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky-header bg-background border-b border-border">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="h-7 w-20 skeleton rounded" />
            <div className="h-10 w-10 skeleton rounded-lg" />
          </div>
          <div className="h-12 skeleton rounded-lg" />
        </div>
        <div className="px-4 pb-2">
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-8 w-20 skeleton rounded-full" />
            ))}
          </div>
        </div>
      </header>
      <div className="px-4 py-4 space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="card p-4 h-28 skeleton" />
        ))}
      </div>
    </div>
  );
}
