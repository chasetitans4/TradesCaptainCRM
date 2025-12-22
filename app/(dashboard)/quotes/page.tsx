'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Search,
  FileText,
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle,
  Send,
  Eye,
  AlertCircle,
  Loader2,
  Filter,
} from 'lucide-react';
import { createClient, getCurrentUserProfile } from '@/lib/supabase/client';
import { cn, formatRelativeDate } from '@/lib/utils';
import type { UserWithBusiness } from '@/types';

interface Quote {
  id: string;
  quote_number: string;
  status: string;
  total: number;
  valid_until: string | null;
  created_at: string;
  sent_at: string | null;
  customer: {
    id: string;
    name: string;
  } | null;
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  draft: { label: 'Draft', icon: FileText, color: 'text-muted-foreground bg-muted' },
  sent: { label: 'Sent', icon: Send, color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30' },
  viewed: { label: 'Viewed', icon: Eye, color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30' },
  accepted: { label: 'Accepted', icon: CheckCircle, color: 'text-green-600 bg-green-100 dark:bg-green-900/30' },
  declined: { label: 'Declined', icon: XCircle, color: 'text-red-600 bg-red-100 dark:bg-red-900/30' },
  expired: { label: 'Expired', icon: AlertCircle, color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30' },
};

const FILTER_TABS = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Drafts' },
  { value: 'sent', label: 'Sent' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'declined', label: 'Declined' },
];

export default function QuotesPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserWithBusiness | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const profile = await getCurrentUserProfile();
    if (!profile) {
      router.push('/login');
      return;
    }
    setUser(profile as UserWithBusiness);
    loadQuotes(profile.business_id);
  };

  const loadQuotes = async (businessId: string) => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('quotes')
      .select(`
        id,
        quote_number,
        status,
        total,
        valid_until,
        created_at,
        sent_at,
        customer:customers (id, name)
      `)
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (!error) {
      setQuotes(data || []);
    }
    setLoading(false);
  };

  // Filter quotes
  const filteredQuotes = quotes.filter((quote) => {
    // Status filter
    if (activeFilter !== 'all' && quote.status !== activeFilter) {
      return false;
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchesNumber = quote.quote_number?.toLowerCase().includes(query);
      const matchesCustomer = quote.customer?.name?.toLowerCase().includes(query);
      if (!matchesNumber && !matchesCustomer) {
        return false;
      }
    }

    return true;
  });

  // Get counts for tabs
  const getCounts = () => {
    const counts: Record<string, number> = { all: quotes.length };
    quotes.forEach((q) => {
      counts[q.status] = (counts[q.status] || 0) + 1;
    });
    return counts;
  };
  const counts = getCounts();

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold">Quotes</h1>
            <Link
              href="/quotes/new"
              className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span className="text-sm font-medium">New Quote</span>
            </Link>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search quotes..."
              className="w-full pl-10 pr-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveFilter(tab.value)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                  activeFilter === tab.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                {tab.label}
                {counts[tab.value] > 0 && (
                  <span className="ml-1.5 opacity-70">({counts[tab.value]})</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Quotes List */}
      <div className="divide-y divide-border">
        {filteredQuotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-1">
              {searchQuery || activeFilter !== 'all'
                ? 'No quotes found'
                : 'No quotes yet'}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery || activeFilter !== 'all'
                ? 'Try adjusting your search or filter'
                : 'Create your first quote to get started'}
            </p>
            {!searchQuery && activeFilter === 'all' && (
              <Link
                href="/quotes/new"
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Create Quote
              </Link>
            )}
          </div>
        ) : (
          filteredQuotes.map((quote) => {
            const statusConfig = STATUS_CONFIG[quote.status] || STATUS_CONFIG.draft;
            const StatusIcon = statusConfig.icon;
            const isExpired =
              quote.valid_until &&
              new Date(quote.valid_until) < new Date() &&
              !['accepted', 'declined', 'expired'].includes(quote.status);

            return (
              <Link
                key={quote.id}
                href={`/quotes/${quote.id}`}
                className="flex items-center gap-4 p-4 hover:bg-muted/50 active:bg-muted transition-colors"
              >
                <div className={cn('p-2 rounded-lg', statusConfig.color)}>
                  <StatusIcon className="h-5 w-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{quote.quote_number || 'Quote'}</span>
                    {isExpired && (
                      <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded">
                        Expired
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {quote.customer?.name || 'No customer'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatRelativeDate(quote.sent_at || quote.created_at)}
                  </p>
                </div>

                <div className="text-right">
                  <p className="font-semibold">${quote.total?.toFixed(2) || '0.00'}</p>
                  <p
                    className={cn(
                      'text-xs capitalize',
                      statusConfig.color.split(' ')[0]
                    )}
                  >
                    {statusConfig.label}
                  </p>
                </div>

                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
