'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient, getCurrentUserProfile } from '@/lib/supabase/client';
import { hasPermission } from '@/lib/permissions';
import { cn, formatPhoneNumber, formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import type { UserWithBusiness, Customer } from '@/types';
import {
  Plus,
  Search,
  X,
  ChevronRight,
  Phone,
  Mail,
  MapPin,
  RefreshCw,
  Users,
  ArrowUpDown,
  Briefcase,
  DollarSign,
  Filter,
  Star,
  AlertTriangle,
  Clock,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  CustomerSegment,
  segmentCustomers,
  filterBySegment,
  getSegmentCounts,
  SEGMENT_INFO,
  CustomerWithSegment,
  getCustomerJobStatus,
  JOB_STATUS_INFO,
} from '@/lib/customers/segmentation';

interface CustomerWithStats extends Omit<Customer, 'total_jobs' | 'total_revenue' | 'last_job_date'> {
  total_jobs?: number;
  total_revenue?: number;
  last_job_date?: string | null;
  segment?: CustomerSegment;
}

type SortOption = 'name' | 'recent' | 'jobs' | 'revenue';

export default function CustomersPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<UserWithBusiness | null>(null);
  const [customers, setCustomers] = useState<CustomerWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [showSort, setShowSort] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState<CustomerSegment | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Load user
  useEffect(() => {
    async function loadUser() {
      const profile = await getCurrentUserProfile();
      if (!profile || !hasPermission(profile.role, 'view_customers')) {
        router.push('/dashboard');
        return;
      }
      setUser(profile as UserWithBusiness);
    }
    loadUser();
  }, [router]);

  // Load customers
  const loadCustomers = useCallback(async () => {
    if (!user) return;

    const supabase = createClient();

    try {
      // Limit to recent customers for performance
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('business_id', user.business_id)
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      setCustomers((data as CustomerWithStats[]) || []);
    } catch (error) {
      console.error('Error loading customers:', error);
      toast({ title: 'Error', description: 'Failed to load customers. Please try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadCustomers();
    }
  }, [user, loadCustomers]);

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCustomers();
  };

  // Apply segmentation to customers
  const customersWithSegments = useMemo(() => {
    return segmentCustomers(customers as CustomerWithSegment[]);
  }, [customers]);

  // Get segment counts for filter badges
  const segmentCounts = useMemo(() => {
    return getSegmentCounts(customersWithSegments);
  }, [customersWithSegments]);

  // Filter and sort customers
  const filteredCustomers = useMemo(() => {
    // Apply segment filter first
    let filtered = filterBySegment(customersWithSegments, selectedSegment);

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((customer) => {
        const name = (customer.name || '').toLowerCase();
        const phone = customer.phone || '';
        const email = (customer.email || '').toLowerCase();
        const city = (customer.city || '').toLowerCase();
        return (
          name.includes(query) ||
          phone.includes(query) ||
          email.includes(query) ||
          city.includes(query)
        );
      });
    }

    // Sort
    switch (sortBy) {
      case 'name':
        filtered.sort((a, b) =>
          (a.name || '').localeCompare(b.name || '')
        );
        break;
      case 'jobs':
        filtered.sort(
          (a, b) => (b.total_jobs || 0) - (a.total_jobs || 0)
        );
        break;
      case 'revenue':
        filtered.sort(
          (a, b) => (b.total_revenue || 0) - (a.total_revenue || 0)
        );
        break;
      default:
        // recent - already sorted by query
        break;
    }

    return filtered;
  }, [customersWithSegments, selectedSegment, searchQuery, sortBy]);

  if (loading || !user) {
    return <CustomersSkeleton />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky-header bg-background border-b border-border">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-text">Customers</h1>
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
                className={cn(showFilters && 'text-primary', selectedSegment !== 'all' && 'text-primary')}
              >
                <Filter className="h-5 w-5" />
                {selectedSegment !== 'all' && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 bg-primary rounded-full" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setShowSort(!showSort)}
                className={showSort ? 'text-primary' : ''}
              >
                <ArrowUpDown className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <Input
              type="search"
              placeholder="Search customers..."
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

          {/* Sort options */}
          {showSort && (
            <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-hide animate-in slide-in-from-top-2 fade-in duration-200">
              {[
                { value: 'recent', label: 'Recent' },
                { value: 'name', label: 'Name' },
                { value: 'jobs', label: 'Most Jobs' },
                { value: 'revenue', label: 'Revenue' },
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
          )}

          {/* Segment filters */}
          {showFilters && (
            <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-hide animate-in slide-in-from-top-2 fade-in duration-200">
              <button
                onClick={() => setSelectedSegment('all')}
                className={cn(
                  'px-3 py-1.5 text-sm rounded-full whitespace-nowrap transition-colors flex items-center gap-1.5',
                  selectedSegment === 'all'
                    ? 'bg-primary text-white'
                    : 'bg-muted text-text hover:bg-muted/80'
                )}
              >
                All
                <span className="text-xs opacity-75">({customers.length})</span>
              </button>
              {([
                { segment: 'vip' as const, icon: <Star className="h-3 w-3" /> },
                { segment: 'active' as const, icon: <Sparkles className="h-3 w-3" /> },
                { segment: 'at_risk' as const, icon: <AlertTriangle className="h-3 w-3" /> },
                { segment: 'inactive' as const, icon: <Clock className="h-3 w-3" /> },
                { segment: 'new' as const, icon: <Users className="h-3 w-3" /> },
              ]).map(({ segment, icon }) => {
                const info = SEGMENT_INFO[segment];
                const count = segmentCounts[segment];
                return (
                  <button
                    key={segment}
                    onClick={() => setSelectedSegment(segment)}
                    className={cn(
                      'px-3 py-1.5 text-sm rounded-full whitespace-nowrap transition-colors flex items-center gap-1.5',
                      selectedSegment === segment
                        ? `${info.bgColor} ${info.color} ring-2 ring-offset-1 ring-current`
                        : 'bg-muted text-text hover:bg-muted/80'
                    )}
                  >
                    {icon}
                    {info.label}
                    <span className="text-xs opacity-75">({count})</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </header>

      {/* Customer count */}
      <div className="px-4 py-2 text-sm text-text-muted flex items-center gap-2">
        <span>{filteredCustomers.length} customer{filteredCustomers.length !== 1 ? 's' : ''}</span>
        {selectedSegment !== 'all' && (
          <Badge variant="secondary" className={cn('text-xs', SEGMENT_INFO[selectedSegment].bgColor, SEGMENT_INFO[selectedSegment].color)}>
            {SEGMENT_INFO[selectedSegment].label}
          </Badge>
        )}
      </div>

      {/* Customers List */}
      <div className="px-4 pb-4">
        {filteredCustomers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="h-12 w-12 text-text-muted mb-4" />
            <h3 className="text-lg font-medium text-text mb-1">
              {searchQuery ? 'No customers found' : selectedSegment !== 'all' ? `No ${SEGMENT_INFO[selectedSegment].label.toLowerCase()} customers` : 'No customers yet'}
            </h3>
            <p className="text-sm text-text-muted mb-4">
              {searchQuery
                ? 'Try adjusting your search'
                : selectedSegment !== 'all'
                  ? SEGMENT_INFO[selectedSegment].description
                  : 'Customers are automatically created when you add leads or jobs'}
            </p>
            {selectedSegment !== 'all' && (
              <Button variant="outline" size="sm" onClick={() => setSelectedSegment('all')}>
                View all customers
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredCustomers.map((customer) => (
              <CustomerCard key={customer.id} customer={customer as CustomerWithStats} />
            ))}
          </div>
        )}
      </div>

      {/* FAB for adding customers */}
      {hasPermission(user.role, 'manage_customers') && (
        <Link href="/customers/new" className="fab">
          <Plus className="h-6 w-6" />
        </Link>
      )}
    </div>
  );
}

function CustomerCard({ customer }: { customer: CustomerWithStats }) {
  const segmentInfo = customer.segment ? SEGMENT_INFO[customer.segment] : null;
  const jobStatus = getCustomerJobStatus(customer as CustomerWithSegment);
  const jobStatusInfo = JOB_STATUS_INFO[jobStatus];

  return (
    <Link
      href={`/customers/${customer.id}`}
      className="card p-4 flex items-center gap-3 active:scale-[0.99] transition-transform"
    >
      {/* Color-coded dot based on job status */}
      <div className="relative">
        <Avatar fallback={customer.name?.charAt(0) || '?'} size="md" />
        <span
          className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-surface"
          style={{ backgroundColor: jobStatusInfo.dotColor }}
          title={jobStatusInfo.description}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-text truncate">{customer.name}</p>
          {segmentInfo && (
            <span className={cn(
              'inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded-full shrink-0',
              segmentInfo.bgColor,
              segmentInfo.color
            )}>
              {customer.segment === 'vip' && <Star className="h-2.5 w-2.5" />}
              {customer.segment === 'at_risk' && <AlertTriangle className="h-2.5 w-2.5" />}
              {segmentInfo.label}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-text-muted">
          {customer.phone && (
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {formatPhoneNumber(customer.phone)}
            </span>
          )}
          {customer.city && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {customer.city}
            </span>
          )}
        </div>

        {/* Stats */}
        {(customer.total_jobs !== undefined || customer.total_revenue !== undefined) && (
          <div className="flex items-center gap-3 mt-2 text-xs">
            {customer.total_jobs !== undefined && customer.total_jobs > 0 && (
              <span className="flex items-center gap-1 text-text-muted">
                <Briefcase className="h-3 w-3" />
                {customer.total_jobs} job{customer.total_jobs !== 1 ? 's' : ''}
              </span>
            )}
            {customer.total_revenue !== undefined && customer.total_revenue > 0 && (
              <span className="flex items-center gap-1 text-success">
                <DollarSign className="h-3 w-3" />
                {formatCurrency(customer.total_revenue)}
              </span>
            )}
          </div>
        )}
      </div>

      <ChevronRight className="h-5 w-5 text-text-muted shrink-0" />
    </Link>
  );
}

function CustomersSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky-header bg-background border-b border-border">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="h-7 w-28 skeleton rounded" />
            <div className="flex gap-2">
              <div className="h-10 w-10 skeleton rounded-lg" />
              <div className="h-10 w-10 skeleton rounded-lg" />
            </div>
          </div>
          <div className="h-12 skeleton rounded-lg" />
        </div>
      </header>
      <div className="px-4 py-4 space-y-2">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="card p-4 flex items-center gap-3">
            <div className="h-12 w-12 skeleton rounded-full" />
            <div className="flex-1">
              <div className="h-4 w-32 skeleton rounded mb-2" />
              <div className="h-3 w-48 skeleton rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
