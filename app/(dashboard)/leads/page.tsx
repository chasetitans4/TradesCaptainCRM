'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient, getCurrentUserProfile } from '@/lib/supabase/client';
import { hasPermission } from '@/lib/permissions';
import { cn, formatRelativeDate, formatPhoneNumber } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
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
  CheckSquare,
  Square,
  UserPlus,
  Users,
  Check,
  Loader2,
  List,
  LayoutGrid,
} from 'lucide-react';
import { BottomSheet } from '@/components/mobile/bottom-sheet';
import { Avatar } from '@/components/ui/avatar';
import { LeadsKanban } from '@/components/leads';

type ViewMode = 'list' | 'kanban';

interface LeadWithCustomer extends Lead {
  customer?: Pick<Customer, 'id' | 'name' | 'phone' | 'email'> | null;
}

interface TeamMember {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
  avatar_url?: string | null;
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
  const { toast } = useToast();
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
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // Bulk selection state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [showAssignSheet, setShowAssignSheet] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [assigning, setAssigning] = useState(false);

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
          customer:customers!leads_customer_id_fkey (
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
      toast({ title: 'Error', description: 'Failed to load leads. Please try again.', variant: 'destructive' });
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

  // Load team members for assignment
  const loadTeamMembers = useCallback(async () => {
    setLoadingTeam(true);
    try {
      const response = await fetch('/api/team/members');
      if (response.ok) {
        const data = await response.json();
        setTeamMembers(data.members || []);
      }
    } catch (error) {
      console.error('Error loading team members:', error);
    } finally {
      setLoadingTeam(false);
    }
  }, []);

  // Toggle selection mode
  const toggleSelectionMode = () => {
    if (selectionMode) {
      setSelectedLeadIds(new Set());
    }
    setSelectionMode(!selectionMode);
  };

  // Toggle lead selection
  const toggleLeadSelection = (leadId: string) => {
    setSelectedLeadIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(leadId)) {
        newSet.delete(leadId);
      } else {
        newSet.add(leadId);
      }
      return newSet;
    });
  };

  // Select all visible leads
  const selectAllLeads = () => {
    setSelectedLeadIds(new Set(filteredLeads.map((l) => l.id)));
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedLeadIds(new Set());
  };

  // Handle bulk assignment
  const handleBulkAssign = async (assigneeId: string | null) => {
    if (selectedLeadIds.size === 0) return;

    setAssigning(true);
    try {
      const response = await fetch('/api/leads/bulk-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_ids: Array.from(selectedLeadIds),
          assigned_to: assigneeId,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Success',
          description: data.message,
        });
        setShowAssignSheet(false);
        setSelectedLeadIds(new Set());
        setSelectionMode(false);
        loadLeads(); // Refresh leads list
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to assign leads',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error assigning leads:', error);
      toast({
        title: 'Error',
        description: 'Failed to assign leads. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setAssigning(false);
    }
  };

  // Open assign sheet and load team members
  const openAssignSheet = () => {
    setShowAssignSheet(true);
    if (teamMembers.length === 0) {
      loadTeamMembers();
    }
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
              {/* View toggle */}
              <div className="flex bg-muted rounded-lg p-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    'p-1.5 rounded transition-colors',
                    viewMode === 'list' ? 'bg-background shadow-sm' : ''
                  )}
                  title="List view"
                  aria-label="Switch to list view"
                  aria-pressed={viewMode === 'list'}
                >
                  <List className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  onClick={() => setViewMode('kanban')}
                  className={cn(
                    'p-1.5 rounded transition-colors',
                    viewMode === 'kanban' ? 'bg-background shadow-sm' : ''
                  )}
                  title="Kanban view"
                  aria-label="Switch to kanban view"
                  aria-pressed={viewMode === 'kanban'}
                >
                  <LayoutGrid className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              {hasPermission(user.role, 'manage_leads') && viewMode === 'list' && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={toggleSelectionMode}
                  className={selectionMode ? 'text-primary' : ''}
                  aria-label={selectionMode ? 'Exit selection mode' : 'Enter selection mode'}
                  aria-pressed={selectionMode}
                >
                  <CheckSquare className="h-5 w-5" aria-hidden="true" />
                </Button>
              )}
              {viewMode === 'list' && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className={showFilters ? 'text-primary' : ''}
                  aria-label={showFilters ? 'Hide filters' : 'Show filters'}
                  aria-expanded={showFilters}
                >
                  <Filter className="h-5 w-5" aria-hidden="true" />
                </Button>
              )}
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
                aria-label="Clear search"
              >
                <X className="h-4 w-4" aria-hidden="true" />
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

        {/* Status Tabs - only show in list view */}
        {viewMode === 'list' && (
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
        )}

        {/* Bulk Selection Bar */}
        {selectionMode && (
          <div className="px-4 py-2 bg-primary/5 border-t border-primary/20 animate-in slide-in-from-top-2 fade-in duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={selectedLeadIds.size === filteredLeads.length ? clearSelection : selectAllLeads}
                  className="flex items-center gap-2 text-sm text-primary font-medium"
                >
                  {selectedLeadIds.size === filteredLeads.length ? (
                    <CheckSquare className="h-4 w-4" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                  {selectedLeadIds.size === filteredLeads.length ? 'Deselect All' : 'Select All'}
                </button>
                <span className="text-sm text-text-muted">
                  {selectedLeadIds.size} selected
                </span>
              </div>
              <div className="flex items-center gap-2">
                {selectedLeadIds.size > 0 && (
                  <Button
                    size="sm"
                    onClick={openAssignSheet}
                    className="flex items-center gap-1.5"
                  >
                    <UserPlus className="h-4 w-4" />
                    Assign
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleSelectionMode}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Leads Content */}
      {viewMode === 'kanban' ? (
        <LeadsKanban
          leads={leads}
          onRefresh={loadLeads}
        />
      ) : (
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
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  selectionMode={selectionMode}
                  isSelected={selectedLeadIds.has(lead.id)}
                  onToggleSelect={() => toggleLeadSelection(lead.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* FAB */}
      {hasPermission(user.role, 'create_leads') && !selectionMode && (
        <Link href="/leads/new" className="fab">
          <Plus className="h-6 w-6" />
        </Link>
      )}

      {/* Assign Bottom Sheet */}
      <BottomSheet open={showAssignSheet} onOpenChange={setShowAssignSheet}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Assign {selectedLeadIds.size} Lead{selectedLeadIds.size !== 1 ? 's' : ''}</h3>
            <Button variant="ghost" size="icon" onClick={() => setShowAssignSheet(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {loadingTeam ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
              {/* Unassign option */}
              <button
                onClick={() => handleBulkAssign(null)}
                disabled={assigning}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <X className="h-5 w-5 text-text-muted" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">Unassign</p>
                  <p className="text-xs text-text-muted">Remove current assignment</p>
                </div>
                {assigning && <Loader2 className="h-4 w-4 animate-spin" />}
              </button>

              {/* Team members */}
              {teamMembers.map((member) => (
                <button
                  key={member.id}
                  onClick={() => handleBulkAssign(member.id)}
                  disabled={assigning}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted transition-colors text-left"
                >
                  <Avatar
                    src={member.avatar_url || undefined}
                    fallback={member.full_name?.charAt(0) || member.email.charAt(0)}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{member.full_name || member.email}</p>
                    <p className="text-xs text-text-muted truncate">{member.role}</p>
                  </div>
                  {assigning && <Loader2 className="h-4 w-4 animate-spin" />}
                </button>
              ))}

              {teamMembers.length === 0 && !loadingTeam && (
                <div className="py-8 text-center text-sm text-text-muted">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No team members found</p>
                </div>
              )}
            </div>
          )}
        </div>
      </BottomSheet>
    </div>
  );
}

interface LeadCardProps {
  lead: LeadWithCustomer;
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}

function LeadCard({ lead, selectionMode, isSelected, onToggleSelect }: LeadCardProps) {
  const name = lead.customer?.name || lead.name || 'Unknown';
  const phone = lead.customer?.phone || lead.phone;

  const handleClick = (e: React.MouseEvent) => {
    if (selectionMode) {
      e.preventDefault();
      onToggleSelect?.();
    }
  };

  const CardWrapper = selectionMode ? 'div' : Link;
  const cardProps = selectionMode
    ? { onClick: handleClick }
    : { href: `/leads/${lead.id}` };

  return (
    <CardWrapper
      {...(cardProps as any)}
      className={cn(
        'card p-4 flex items-start gap-3 active:scale-[0.99] transition-all cursor-pointer',
        selectionMode && isSelected && 'ring-2 ring-primary bg-primary/5'
      )}
    >
      {/* Checkbox in selection mode */}
      {selectionMode && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect?.();
          }}
          className="shrink-0 mt-1"
        >
          {isSelected ? (
            <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
              <Check className="h-4 w-4 text-white" />
            </div>
          ) : (
            <div className="w-6 h-6 rounded-md border-2 border-border" />
          )}
        </button>
      )}

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

        {/* Quick actions - hide in selection mode */}
        {phone && !selectionMode && (
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

      {!selectionMode && <ChevronRight className="h-5 w-5 text-text-muted shrink-0 mt-2" />}
    </CardWrapper>
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
