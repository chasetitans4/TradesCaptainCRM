'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Ticket,
  Search,
  Filter,
  Clock,
  User,
  Building2,
  MessageSquare,
  AlertCircle,
  Loader2,
  RefreshCcw,
  ChevronRight,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Circle,
  Eye,
  Headphones,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import {
  SupportTicket,
  TicketStatus,
  TicketPriority,
  TicketCategory,
  TicketStats,
} from '@/lib/admin/types';
import { AdminPageHeader } from '@/components/admin/page-header';
import { useAgentOrHigher } from '@/hooks/useAdminAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useOptimizedFetch } from '@/lib/hooks/use-optimized-fetch';

const statusConfig: Record<TicketStatus, { label: string; color: string; bgColor: string; icon: any }> = {
  open: { label: 'Open', color: 'text-yellow-700', bgColor: 'bg-yellow-100', icon: Circle },
  in_progress: { label: 'In Progress', color: 'text-blue-700', bgColor: 'bg-blue-100', icon: Clock },
  waiting_on_customer: { label: 'Waiting', color: 'text-purple-700', bgColor: 'bg-purple-100', icon: User },
  resolved: { label: 'Resolved', color: 'text-green-700', bgColor: 'bg-green-100', icon: CheckCircle },
  closed: { label: 'Closed', color: 'text-gray-700', bgColor: 'bg-gray-100', icon: XCircle },
};

const priorityConfig: Record<TicketPriority, { label: string; color: string; bgColor: string }> = {
  low: { label: 'Low', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  medium: { label: 'Medium', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  high: { label: 'High', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  urgent: { label: 'Urgent', color: 'text-red-600', bgColor: 'bg-red-100' },
};

const categoryLabels: Record<TicketCategory, string> = {
  technical_issue: 'Technical Issue',
  billing_question: 'Billing Question',
  feature_request: 'Feature Request',
  how_to_question: 'How-To Question',
  account_issue: 'Account Issue',
  integration_help: 'Integration Help',
  bug_report: 'Bug Report',
  other: 'Other',
};

export default function TicketsPage() {
  const router = useRouter();
  const { loading: authLoading, isAuthorized } = useAgentOrHigher();
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');

  // Memoized fetcher function
  const fetcher = useCallback(async (): Promise<SupportTicket[]> => {
    const params = new URLSearchParams();
    if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
    if (priorityFilter && priorityFilter !== 'all') params.append('priority', priorityFilter);
    if (categoryFilter && categoryFilter !== 'all') params.append('category', categoryFilter);
    if (searchTerm) params.append('search', searchTerm);

    const res = await fetch(`/api/admin/tickets?${params}`);
    if (!res.ok) throw new Error('Failed to fetch tickets');
    const data = await res.json();
    return data.tickets || [];
  }, [statusFilter, priorityFilter, categoryFilter, searchTerm]);

  // Use optimized fetch with caching and revalidation
  const {
    data: tickets = [],
    error: fetchError,
    isLoading,
    isValidating,
    refetch,
  } = useOptimizedFetch<SupportTicket[]>(
    `admin-tickets-${statusFilter}-${priorityFilter}-${categoryFilter}-${searchTerm}`,
    fetcher,
    {
      staleTime: 60000, // Cache for 1 minute
      refetchOnFocus: true,
      deps: [statusFilter, priorityFilter, categoryFilter, searchTerm, isAuthorized],
    }
  );

  const loading = isLoading && !tickets.length;
  const error = fetchError?.message || null;

  useEffect(() => {
    if (isAuthorized) {
      fetchStats();
    }
  }, [isAuthorized]);

  async function fetchStats() {
    try {
      const res = await fetch('/api/admin/tickets?stats=true');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }

  const filteredTickets = tickets.filter(ticket =>
    ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ticket.ticket_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ticket.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ticket.business_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (authLoading || !isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="p-6 border-b border-border bg-background">
        <AdminPageHeader
          title="Support Tickets"
          description="Manage customer support requests and issues."
          icon={Headphones}
          actions={
            <Button
              variant="outline"
              onClick={() => { refetch(); fetchStats(); }}
            >
              <RefreshCcw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          }
        />
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
            </Card>
            <Card className="p-4 bg-yellow-500/10 border-yellow-500/20">
              <p className="text-sm text-yellow-700 dark:text-yellow-400">Open</p>
              <p className="text-2xl font-bold text-yellow-800 dark:text-yellow-300">{stats.open}</p>
            </Card>
            <Card className="p-4 bg-blue-500/10 border-blue-500/20">
              <p className="text-sm text-blue-700 dark:text-blue-400">In Progress</p>
              <p className="text-2xl font-bold text-blue-800 dark:text-blue-300">{stats.in_progress}</p>
            </Card>
            <Card className="p-4 bg-purple-500/10 border-purple-500/20">
              <p className="text-sm text-purple-700 dark:text-purple-400">Waiting</p>
              <p className="text-2xl font-bold text-purple-800 dark:text-purple-300">{stats.waiting_on_customer}</p>
            </Card>
            <Card className="p-4 bg-green-500/10 border-green-500/20">
              <p className="text-sm text-green-700 dark:text-green-400">Resolved</p>
              <p className="text-2xl font-bold text-green-800 dark:text-green-300">{stats.resolved}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Avg Response</p>
              <p className="text-2xl font-bold text-foreground">{stats.avg_response_time_hours.toFixed(1)}h</p>
            </Card>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search tickets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && refetch()}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="waiting_on_customer">Waiting on Customer</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {Object.entries(categoryLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tickets List */}
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="p-4 bg-destructive/10 text-destructive rounded-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              {error}
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="text-center py-12 bg-muted/30 rounded-lg">
              <Ticket className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No tickets found</p>
            </div>
          ) : (
            <div className="bg-card rounded-lg border border-border divide-y divide-border">
              {filteredTickets.map((ticket) => {
                const status = statusConfig[ticket.status as TicketStatus];
                const priority = priorityConfig[ticket.priority as TicketPriority];
                const StatusIcon = status.icon;

                return (
                  <div
                    key={ticket.id}
                    onClick={() => router.push(`/admin/tickets/${ticket.id}`)}
                    className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-muted-foreground">{ticket.ticket_number}</span>
                          <Badge variant="outline" className={`${priority.bgColor} ${priority.color} border-0`}>
                            {priority.label}
                          </Badge>
                        </div>
                        <h3 className="font-medium text-foreground truncate">{ticket.subject}</h3>
                        <p className="text-sm text-muted-foreground truncate">{ticket.business_name} • {ticket.user_name}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className={`${status.bgColor} ${status.color} border-0 flex items-center gap-1`}>
                            <StatusIcon className="h-3 w-3" />
                            {status.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
