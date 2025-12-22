'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient, getCurrentUserProfile } from '@/lib/supabase/client';
import { hasPermission } from '@/lib/permissions';
import { cn, formatRelativeDate, formatPhoneNumber, formatDate, formatTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import type { UserWithBusiness, Job, Customer, JobStatus, User } from '@/types';
import {
  Plus,
  Search,
  X,
  ChevronRight,
  Phone,
  MapPin,
  Filter,
  Clock,
  Calendar,
  CalendarDays,
  List,
  RefreshCw,
  User as UserIcon,
  ChevronLeft,
} from 'lucide-react';

interface JobWithDetails extends Job {
  customer: Pick<Customer, 'id' | 'name' | 'phone' | 'address_line1' | 'city'>;
  assigned_user?: Pick<User, 'id' | 'name'> | null;
}

type ViewMode = 'list' | 'calendar';
type FilterOption = 'all' | 'today' | 'tomorrow' | 'week' | 'upcoming';

const JOB_STATUSES: { value: JobStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const STATUS_COLORS: Record<JobStatus, string> = {
  scheduled: 'bg-info/10 text-info border-info/20',
  in_progress: 'bg-warning/10 text-warning border-warning/20',
  completed: 'bg-success/10 text-success border-success/20',
  cancelled: 'bg-danger/10 text-danger border-danger/20',
};

export default function JobsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<UserWithBusiness | null>(null);
  const [jobs, setJobs] = useState<JobWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [dateFilter, setDateFilter] = useState<FilterOption>(
    (searchParams.get('filter') as FilterOption) || 'upcoming'
  );
  const [statusFilter, setStatusFilter] = useState<JobStatus | 'all'>('all');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showFilters, setShowFilters] = useState(false);

  // Load user
  useEffect(() => {
    async function loadUser() {
      const profile = await getCurrentUserProfile();
      if (!profile) {
        router.push('/login');
        return;
      }
      setUser(profile as UserWithBusiness);
    }
    loadUser();
  }, [router]);

  // Load jobs
  const loadJobs = useCallback(async () => {
    if (!user) return;

    const supabase = createClient();
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    try {
      let query = supabase
        .from('jobs')
        .select(`
          *,
          customer:customers!jobs_customer_id_fkey (
            id,
            name,
            phone,
            address_line1,
            city
          ),
          assigned_user:users!jobs_assigned_user_id_fkey (
            id,
            name
          )
        `)
        .order('scheduled_date', { ascending: true })
        .order('scheduled_time', { ascending: true });

      // Apply date filter
      if (dateFilter !== 'all') {
        const todayEnd = new Date(todayStart);
        todayEnd.setDate(todayEnd.getDate() + 1);
        const tomorrowEnd = new Date(todayEnd);
        tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);
        const weekEnd = new Date(todayStart);
        weekEnd.setDate(weekEnd.getDate() + 7);

        switch (dateFilter) {
          case 'today':
            query = query
              .gte('scheduled_date', todayStart.toISOString())
              .lt('scheduled_date', todayEnd.toISOString());
            break;
          case 'tomorrow':
            query = query
              .gte('scheduled_date', todayEnd.toISOString())
              .lt('scheduled_date', tomorrowEnd.toISOString());
            break;
          case 'week':
            query = query
              .gte('scheduled_date', todayStart.toISOString())
              .lt('scheduled_date', weekEnd.toISOString());
            break;
          case 'upcoming':
            query = query.gte('scheduled_date', todayStart.toISOString());
            break;
        }
      }

      // Apply status filter
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      // Technicians only see assigned jobs
      if (user.role === 'technician') {
        query = query.eq('assigned_user_id', user.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setJobs((data as JobWithDetails[]) || []);
    } catch (error) {
      console.error('Error loading jobs:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, dateFilter, statusFilter]);

  useEffect(() => {
    if (user) {
      loadJobs();
    }
  }, [user, loadJobs]);

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadJobs();
  };

  // Filter jobs by search
  const filteredJobs = useMemo(() => {
    if (!searchQuery.trim()) return jobs;

    const query = searchQuery.toLowerCase();
    return jobs.filter((job) => {
      const title = (job.title || '').toLowerCase();
      const customerName = (job.customer?.name || '').toLowerCase();
      const city = (job.customer?.city || '').toLowerCase();
      return (
        title.includes(query) ||
        customerName.includes(query) ||
        city.includes(query)
      );
    });
  }, [jobs, searchQuery]);

  // Group jobs by date for calendar view
  const jobsByDate = useMemo(() => {
    const grouped: Record<string, JobWithDetails[]> = {};
    filteredJobs.forEach((job) => {
      const dateKey = job.scheduled_date?.split('T')[0] || 'unscheduled';
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(job);
    });
    return grouped;
  }, [filteredJobs]);

  // Get dates for calendar view
  const calendarDates = useMemo(() => {
    const dates: Date[] = [];
    const startOfWeek = new Date(selectedDate);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(date.getDate() + i);
      dates.push(date);
    }
    return dates;
  }, [selectedDate]);

  // Status counts
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: jobs.length };
    jobs.forEach((job) => {
      counts[job.status] = (counts[job.status] || 0) + 1;
    });
    return counts;
  }, [jobs]);

  if (loading || !user) {
    return <JobsListSkeleton />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky-header bg-background border-b border-border">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-text">Jobs</h1>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={cn('h-5 w-5', refreshing && 'animate-spin')} />
              </Button>
              <div className="flex bg-muted rounded-lg p-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    'p-1.5 rounded transition-colors',
                    viewMode === 'list' ? 'bg-background shadow-sm' : ''
                  )}
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('calendar')}
                  className={cn(
                    'p-1.5 rounded transition-colors',
                    viewMode === 'calendar' ? 'bg-background shadow-sm' : ''
                  )}
                >
                  <CalendarDays className="h-4 w-4" />
                </button>
              </div>
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
              placeholder="Search jobs..."
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
              {/* Date filter */}
              <div className="flex items-center gap-2 mb-3 overflow-x-auto scrollbar-hide">
                <Calendar className="h-4 w-4 text-text-muted shrink-0" />
                {[
                  { value: 'today', label: 'Today' },
                  { value: 'tomorrow', label: 'Tomorrow' },
                  { value: 'week', label: 'This Week' },
                  { value: 'upcoming', label: 'Upcoming' },
                  { value: 'all', label: 'All' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setDateFilter(option.value as FilterOption)}
                    className={cn(
                      'px-3 py-1.5 text-sm rounded-full whitespace-nowrap transition-colors',
                      dateFilter === option.value
                        ? 'bg-primary text-white'
                        : 'bg-muted text-text hover:bg-muted/80'
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {/* Status filter */}
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                {JOB_STATUSES.map((status) => (
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
        </div>
      </header>

      {/* Calendar Week View */}
      {viewMode === 'calendar' && (
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => {
                const prev = new Date(selectedDate);
                prev.setDate(prev.getDate() - 7);
                setSelectedDate(prev);
              }}
              className="p-2"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="font-medium text-text">
              {formatDate(calendarDates[0], 'MMM d')} - {formatDate(calendarDates[6], 'MMM d, yyyy')}
            </span>
            <button
              onClick={() => {
                const next = new Date(selectedDate);
                next.setDate(next.getDate() + 7);
                setSelectedDate(next);
              }}
              className="p-2"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calendarDates.map((date) => {
              const dateKey = date.toISOString().split('T')[0];
              const dayJobs = jobsByDate[dateKey] || [];
              const isToday = dateKey === new Date().toISOString().split('T')[0];
              const isSelected = dateKey === selectedDate.toISOString().split('T')[0];

              return (
                <button
                  key={dateKey}
                  onClick={() => setSelectedDate(date)}
                  className={cn(
                    'flex flex-col items-center p-2 rounded-lg transition-colors',
                    isSelected && 'bg-primary text-white',
                    isToday && !isSelected && 'bg-primary/10',
                    !isSelected && 'hover:bg-muted'
                  )}
                >
                  <span className="text-xs uppercase">
                    {formatDate(date, 'EEE')}
                  </span>
                  <span className="text-lg font-semibold">
                    {date.getDate()}
                  </span>
                  {dayJobs.length > 0 && (
                    <span
                      className={cn(
                        'text-xs px-1.5 rounded-full',
                        isSelected ? 'bg-white/20' : 'bg-primary/10 text-primary'
                      )}
                    >
                      {dayJobs.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Jobs List */}
      <div className="px-4 py-4">
        {viewMode === 'calendar' ? (
          // Show jobs for selected date
          <div>
            <h2 className="font-semibold text-text mb-3">
              {formatDate(selectedDate, 'EEEE, MMMM d')}
            </h2>
            {(jobsByDate[selectedDate.toISOString().split('T')[0]] || []).length === 0 ? (
              <div className="card p-6 text-center">
                <Calendar className="h-8 w-8 text-text-muted mx-auto mb-2" />
                <p className="text-text-muted">No jobs scheduled</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(jobsByDate[selectedDate.toISOString().split('T')[0]] || []).map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
            )}
          </div>
        ) : (
          // Regular list view
          <>
            {filteredJobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Calendar className="h-12 w-12 text-text-muted mb-4" />
                <h3 className="text-lg font-medium text-text mb-1">
                  {searchQuery || statusFilter !== 'all'
                    ? 'No jobs found'
                    : 'No jobs scheduled'}
                </h3>
                <p className="text-sm text-text-muted mb-4">
                  {searchQuery || statusFilter !== 'all'
                    ? 'Try adjusting your search or filters'
                    : 'Schedule your first job to get started'}
                </p>
                {hasPermission(user.role, 'create_jobs') && (
                  <Link href="/jobs/new">
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Schedule Job
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredJobs.map((job) => (
                  <JobCard key={job.id} job={job} showDate />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* FAB */}
      {hasPermission(user.role, 'create_jobs') && (
        <Link href="/jobs/new" className="fab">
          <Plus className="h-6 w-6" />
        </Link>
      )}
    </div>
  );
}

function JobCard({ job, showDate = false }: { job: JobWithDetails; showDate?: boolean }) {
  return (
    <Link
      href={`/jobs/${job.id}`}
      className="card p-4 block active:scale-[0.99] transition-transform"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-medium text-text truncate">{job.title}</h3>
          <p className="text-sm text-text-muted truncate">{job.customer?.name}</p>
        </div>
        <Badge className={cn('shrink-0 border', STATUS_COLORS[job.status])}>
          {job.status.replace('_', ' ')}
        </Badge>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted">
        {showDate && job.scheduled_date && (
          <div className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            <span>{formatDate(job.scheduled_date, 'EEE, MMM d')}</span>
          </div>
        )}
        {job.scheduled_time && (
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span>{formatTime(job.scheduled_time)}</span>
          </div>
        )}
        {job.customer?.city && (
          <div className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            <span>{job.customer.city}</span>
          </div>
        )}
        {job.assigned_user && (
          <div className="flex items-center gap-1">
            <UserIcon className="h-3.5 w-3.5" />
            <span>{job.assigned_user.name}</span>
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border">
        {job.customer?.phone && (
          <a
            href={`tel:${job.customer.phone}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 text-sm text-primary"
          >
            <Phone className="h-4 w-4" />
            Call
          </a>
        )}
        {job.customer?.address_line1 && (
          <a
            href={`https://maps.google.com/?q=${encodeURIComponent(
              `${job.customer.address_line1}, ${job.customer.city || ''}`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 text-sm text-primary"
          >
            <MapPin className="h-4 w-4" />
            Directions
          </a>
        )}
      </div>
    </Link>
  );
}

function JobsListSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky-header bg-background border-b border-border">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="h-7 w-16 skeleton rounded" />
            <div className="flex gap-2">
              <div className="h-10 w-10 skeleton rounded-lg" />
              <div className="h-10 w-20 skeleton rounded-lg" />
            </div>
          </div>
          <div className="h-12 skeleton rounded-lg" />
        </div>
      </header>
      <div className="px-4 py-4 space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="card p-4 h-32 skeleton" />
        ))}
      </div>
    </div>
  );
}
