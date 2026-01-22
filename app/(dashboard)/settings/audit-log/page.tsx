'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  History,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  User,
  Calendar,
  FileText,
  Users,
  Briefcase,
  Package,
  Settings,
  MessageSquare,
  CreditCard,
  Wrench,
  TrendingUp,
  Clock,
  AlertCircle,
  ChevronDown,
  X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn, formatRelativeDate } from '@/lib/utils';

interface AuditEntry {
  id: string;
  business_id: string;
  user_id: string;
  user_name?: string;
  action: string;
  target_type: string;
  target_id?: string;
  target_name?: string;
  details: Record<string, unknown>;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

interface AuditSummary {
  totalActions: number;
  actionCounts: Record<string, number>;
  topUsers: { userId: string; userName: string; count: number }[];
  recentActivity: AuditEntry[];
}

const TARGET_TYPE_ICONS: Record<string, React.ElementType> = {
  customer: Users,
  lead: TrendingUp,
  job: Briefcase,
  quote: FileText,
  invoice: CreditCard,
  equipment: Wrench,
  inventory: Package,
  user: User,
  team: Users,
  settings: Settings,
  message: MessageSquare,
};

const ACTION_COLORS: Record<string, string> = {
  created: 'bg-green-100 text-green-800',
  updated: 'bg-blue-100 text-blue-800',
  deleted: 'bg-red-100 text-red-800',
  status_changed: 'bg-yellow-100 text-yellow-800',
  sent: 'bg-purple-100 text-purple-800',
  paid: 'bg-emerald-100 text-emerald-800',
  assigned: 'bg-indigo-100 text-indigo-800',
  converted: 'bg-cyan-100 text-cyan-800',
  viewed: 'bg-gray-100 text-gray-800',
};

export default function AuditLogPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [summary, setSummary] = useState<AuditSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [targetTypeFilter, setTargetTypeFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('7d');

  const pageSize = 25;

  const loadSummary = useCallback(async () => {
    try {
      const days = dateRange === '24h' ? 1 : dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
      const response = await fetch(`/api/audit-log?mode=summary&days=${days}`);
      if (response.ok) {
        const data = await response.json();
        setSummary(data);
      }
    } catch (error) {
      console.error('Failed to load summary:', error);
    }
  }, [dateRange]);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', pageSize.toString());
      params.set('offset', ((page - 1) * pageSize).toString());

      if (targetTypeFilter !== 'all') {
        params.set('targetType', targetTypeFilter);
      }
      if (actionFilter !== 'all') {
        params.set('action', actionFilter);
      }
      if (dateRange !== 'all') {
        const days = dateRange === '24h' ? 1 : dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        params.set('startDate', startDate.toISOString());
      }

      const response = await fetch(`/api/audit-log?${params.toString()}`);

      if (response.status === 403) {
        router.push('/settings');
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setEntries(data.entries || []);
        setTotal(data.total || 0);
      }
    } catch (error) {
      console.error('Failed to load audit log:', error);
    } finally {
      setLoading(false);
    }
  }, [page, targetTypeFilter, actionFilter, dateRange, router]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const totalPages = Math.ceil(total / pageSize);

  const formatAction = (action: string) => {
    const [type, verb] = action.split('.');
    return verb ? verb.replace(/_/g, ' ') : action;
  };

  const getActionColor = (action: string) => {
    const verb = action.split('.')[1] || action;
    return ACTION_COLORS[verb] || 'bg-gray-100 text-gray-800';
  };

  const filteredEntries = searchQuery
    ? entries.filter(
        (e) =>
          e.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.target_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.action.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : entries;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
        <p className="text-gray-500">Track user actions and changes across your business</p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <History className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Actions</p>
                  <p className="text-2xl font-bold">{summary.totalActions.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {Object.entries(summary.actionCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([category, count]) => {
              const Icon = TARGET_TYPE_ICONS[category] || FileText;
              return (
                <Card key={category}>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-gray-100 rounded-lg">
                        <Icon className="h-6 w-6 text-gray-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 capitalize">{category}</p>
                        <p className="text-2xl font-bold">{count.toLocaleString()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by user, target, or action..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[150px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">Last 24 hours</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>

            <Select value={targetTypeFilter} onValueChange={setTargetTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Entity type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="customer">Customers</SelectItem>
                <SelectItem value="lead">Leads</SelectItem>
                <SelectItem value="job">Jobs</SelectItem>
                <SelectItem value="quote">Quotes</SelectItem>
                <SelectItem value="invoice">Invoices</SelectItem>
                <SelectItem value="equipment">Equipment</SelectItem>
                <SelectItem value="inventory">Inventory</SelectItem>
                <SelectItem value="user">Users</SelectItem>
                <SelectItem value="settings">Settings</SelectItem>
              </SelectContent>
            </Select>

            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Action type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                <SelectItem value="created">Created</SelectItem>
                <SelectItem value="updated">Updated</SelectItem>
                <SelectItem value="deleted">Deleted</SelectItem>
                <SelectItem value="status_changed">Status Changed</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
              </SelectContent>
            </Select>

            {(searchQuery || targetTypeFilter !== 'all' || actionFilter !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setTargetTypeFilter('all');
                  setActionFilter('all');
                }}
              >
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Activity List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Activity Log</span>
            <span className="text-sm font-normal text-gray-500">
              {total.toLocaleString()} entries
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg animate-pulse">
                  <div className="w-10 h-10 bg-gray-200 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/3" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="py-12 text-center">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No activity found</h3>
              <p className="text-gray-500">
                {searchQuery || targetTypeFilter !== 'all' || actionFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Activity will appear here as users take actions'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredEntries.map((entry) => {
                const Icon = TARGET_TYPE_ICONS[entry.target_type] || FileText;
                const isExpanded = expandedEntry === entry.id;

                return (
                  <div
                    key={entry.id}
                    className={cn(
                      'border rounded-lg transition-colors',
                      isExpanded ? 'border-blue-200 bg-blue-50/30' : 'hover:bg-gray-50'
                    )}
                  >
                    <button
                      onClick={() => setExpandedEntry(isExpanded ? null : entry.id)}
                      className="w-full p-4 flex items-start gap-4 text-left"
                    >
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <Icon className="h-5 w-5 text-gray-600" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-900">
                            {entry.user_name || 'Unknown user'}
                          </span>
                          <Badge className={getActionColor(entry.action)}>
                            {formatAction(entry.action)}
                          </Badge>
                          <span className="text-gray-500 capitalize">
                            {entry.target_type}
                          </span>
                          {entry.target_name && (
                            <span className="text-gray-700 font-medium truncate max-w-[200px]">
                              "{entry.target_name}"
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatRelativeDate(entry.created_at)}
                          </span>
                          {entry.ip_address && (
                            <span className="hidden md:inline">
                              IP: {entry.ip_address}
                            </span>
                          )}
                        </div>
                      </div>

                      <ChevronDown
                        className={cn(
                          'h-5 w-5 text-gray-400 transition-transform',
                          isExpanded && 'rotate-180'
                        )}
                      />
                    </button>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-0 border-t mx-4 mt-2">
                        <div className="grid gap-4 md:grid-cols-2 pt-4">
                          {entry.old_values && Object.keys(entry.old_values).length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 mb-2">
                                Previous Values
                              </h4>
                              <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-48">
                                {JSON.stringify(entry.old_values, null, 2)}
                              </pre>
                            </div>
                          )}
                          {entry.new_values && Object.keys(entry.new_values).length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 mb-2">
                                New Values
                              </h4>
                              <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-48">
                                {JSON.stringify(entry.new_values, null, 2)}
                              </pre>
                            </div>
                          )}
                          {entry.details && Object.keys(entry.details).length > 0 && (
                            <div className="md:col-span-2">
                              <h4 className="text-sm font-medium text-gray-700 mb-2">
                                Additional Details
                              </h4>
                              <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-48">
                                {JSON.stringify(entry.details, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-4 mt-4 text-xs text-gray-500">
                          <span>Entry ID: {entry.id}</span>
                          <span>User ID: {entry.user_id}</span>
                          {entry.target_id && <span>Target ID: {entry.target_id}</span>}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <p className="text-sm text-gray-500">
                Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, total)} of {total}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-gray-600">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Users */}
      {summary && summary.topUsers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Most Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              {summary.topUsers.map((user, idx) => (
                <div
                  key={user.userId}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{user.userName}</p>
                    <p className="text-sm text-gray-500">{user.count} actions</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
