'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Lightbulb,
  Search,
  Plus,
  ThumbsUp,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronRight,
  RefreshCw,
  X,
  TrendingUp,
  User,
  Building,
  Calendar,
} from 'lucide-react';
import { showSuccess, showError } from '@/lib/toast';
import type {
  FeatureRequest,
  FeatureRequestStatus,
  FeatureRequestCategory,
  FeatureRequestStats,
} from '@/lib/admin/types';
import {
  FEATURE_CATEGORY_LABELS,
  FEATURE_STATUS_CONFIG,
} from '@/lib/feature-requests/constants';
import { AdminPageHeader } from '@/components/admin/page-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const STATUS_ICONS: Record<FeatureRequestStatus, React.ElementType> = {
  submitted: Clock,
  under_review: Search,
  planned: TrendingUp,
  in_progress: RefreshCw,
  completed: CheckCircle2,
  declined: XCircle,
};

interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

export default function AdminFeatureRequestsPage() {
  const [requests, setRequests] = useState<FeatureRequest[]>([]);
  const [stats, setStats] = useState<FeatureRequestStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FeatureRequestStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<FeatureRequestCategory | 'all'>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'client' | 'admin'>('all');
  const [selectedRequest, setSelectedRequest] = useState<FeatureRequest | null>(null);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);

  // Edit state
  const [editingNotes, setEditingNotes] = useState('');
  const [editingTimeline, setEditingTimeline] = useState('');
  const [saving, setSaving] = useState(false);

  // New request state
  const [showNewForm, setShowNewForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newUseCase, setNewUseCase] = useState('');
  const [newCategory, setNewCategory] = useState<FeatureRequestCategory>('other');
  const [submitting, setSubmitting] = useState(false);

  // Fetch current admin user
  useEffect(() => {
    async function fetchAdminUser() {
      try {
        const res = await fetch('/api/admin/auth/me');
        if (res.ok) {
          const data = await res.json();
          setAdminUser(data.user);
        }
      } catch (error) {
        console.error('Failed to fetch admin user:', error);
      }
    }
    fetchAdminUser();
  }, []);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('include_stats', 'true');
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      if (sourceFilter !== 'all') params.set('source', sourceFilter);
      if (searchQuery) params.set('search', searchQuery);

      const response = await fetch(`/api/feature-requests?${params}`);
      if (response.ok) {
        const data = await response.json();
        setRequests(data.feature_requests || []);
        setStats(data.stats || null);
      }
    } catch (error) {
      console.error('Error fetching feature requests:', error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter, sourceFilter, searchQuery]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleSearch = () => {
    fetchRequests();
  };

  const handleUpdateRequest = async (requestId: string, updates: {
    status?: FeatureRequestStatus;
    admin_notes?: string;
    estimated_timeline?: string;
  }) => {
    if (!adminUser) {
      showError('Please wait for authentication to complete');
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`/api/feature-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...updates,
          reviewed_by: adminUser.id,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedRequest(data.feature_request);
        showSuccess('Request updated successfully');
        fetchRequests();
      } else {
        const errorData = await response.json();
        showError(errorData.error || 'Failed to update request');
      }
    } catch (error) {
      console.error('Error updating request:', error);
      showError('Failed to update request');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitNew = async () => {
    if (!newTitle.trim() || !newDescription.trim()) {
      showError('Title and description are required');
      return;
    }

    if (!adminUser) {
      showError('Please wait for authentication to complete');
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch('/api/feature-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          description: newDescription,
          use_case: newUseCase,
          category: newCategory,
          source: 'admin',
          submitter_id: adminUser.id,
          submitter_name: adminUser.full_name,
          submitter_email: adminUser.email,
        }),
      });

      if (response.ok) {
        setNewTitle('');
        setNewDescription('');
        setNewUseCase('');
        setNewCategory('other');
        setShowNewForm(false);
        showSuccess('Feature request submitted successfully');
        fetchRequests();
      } else {
        const errorData = await response.json();
        showError(errorData.error || 'Failed to submit request');
      }
    } catch (error) {
      console.error('Error submitting feature request:', error);
      showError('Failed to submit feature request');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Stats cards
  const renderStats = () => {
    if (!stats) return null;

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        <Card className="p-3 text-center">
          <p className="text-2xl font-bold">{stats.total}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </Card>
        <Card className="p-3 text-center bg-blue-50 dark:bg-blue-900/10">
          <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{stats.submitted}</p>
          <p className="text-xs text-blue-600 dark:text-blue-300">Submitted</p>
        </Card>
        <Card className="p-3 text-center bg-yellow-50 dark:bg-yellow-900/10">
          <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">{stats.under_review}</p>
          <p className="text-xs text-yellow-600 dark:text-yellow-300">Under Review</p>
        </Card>
        <Card className="p-3 text-center bg-purple-50 dark:bg-purple-900/10">
          <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">{stats.planned}</p>
          <p className="text-xs text-purple-600 dark:text-purple-300">Planned</p>
        </Card>
        <Card className="p-3 text-center bg-orange-50 dark:bg-orange-900/10">
          <p className="text-2xl font-bold text-orange-700 dark:text-orange-400">{stats.in_progress}</p>
          <p className="text-xs text-orange-600 dark:text-orange-300">In Progress</p>
        </Card>
        <Card className="p-3 text-center bg-green-50 dark:bg-green-900/10">
          <p className="text-2xl font-bold text-green-700 dark:text-green-400">{stats.completed}</p>
          <p className="text-xs text-green-600 dark:text-green-300">Completed</p>
        </Card>
        <Card className="p-3 text-center bg-gray-50 dark:bg-gray-800">
          <p className="text-2xl font-bold text-gray-700 dark:text-gray-400">{stats.declined}</p>
          <p className="text-xs text-gray-600 dark:text-gray-300">Declined</p>
        </Card>
      </div>
    );
  };

  // Filter by search
  const filteredRequests = requests.filter(r => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      r.title.toLowerCase().includes(query) ||
      r.description.toLowerCase().includes(query) ||
      r.request_number.toLowerCase().includes(query) ||
      r.submitter_name.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6 p-6">
      <AdminPageHeader
        title="Feature Requests"
        description="Manage feature requests from clients and team"
        icon={Lightbulb}
        breadcrumb={[{ label: 'Feature Requests' }]}
        actions={
            <div className="flex items-center gap-2">
                <Button variant="outline" onClick={fetchRequests}>
                    <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
                    Refresh
                </Button>
                <Dialog open={showNewForm} onOpenChange={setShowNewForm}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Request
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>New Feature Request</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Title</Label>
                                <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Feature title" />
                            </div>
                            <div className="space-y-2">
                                <Label>Category</Label>
                                <Select value={newCategory} onValueChange={(val: FeatureRequestCategory) => setNewCategory(val)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(FEATURE_CATEGORY_LABELS).map(([value, label]) => (
                                            <SelectItem key={value} value={value}>{label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Description</Label>
                                <Textarea value={newDescription} onChange={e => setNewDescription(e.target.value)} placeholder="Describe the feature..." />
                            </div>
                            <div className="space-y-2">
                                <Label>Use Case</Label>
                                <Textarea value={newUseCase} onChange={e => setNewUseCase(e.target.value)} placeholder="Why is this needed?" />
                            </div>
                            <Button onClick={handleSubmitNew} disabled={submitting} className="w-full">
                                {submitting ? 'Submitting...' : 'Submit Request'}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        }
      />

      {/* Stats */}
      {renderStats()}

      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Search */}
          <div className="flex-1 min-w-[200px] max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search requests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as FeatureRequestStatus | 'all')}
            className="px-3 py-2 border rounded-lg bg-background text-sm"
          >
            <option value="all">All Status</option>
            {Object.entries(FEATURE_STATUS_CONFIG).map(([value, config]) => (
              <option key={value} value={value}>{config.label}</option>
            ))}
          </select>

          {/* Category filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as FeatureRequestCategory | 'all')}
            className="px-3 py-2 border rounded-lg bg-background text-sm"
          >
            <option value="all">All Categories</option>
            {Object.entries(FEATURE_CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          {/* Source filter */}
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value as 'all' | 'client' | 'admin')}
            className="px-3 py-2 border rounded-lg bg-background text-sm"
          >
            <option value="all">All Sources</option>
            <option value="client">Client Requests</option>
            <option value="admin">Admin Requests</option>
          </select>
        </div>
      </Card>

      {/* Main content */}
      <div className="flex gap-6 flex-col lg:flex-row">
        {/* Requests list */}
        <div className="flex-1">
          {loading ? (
            <Card className="p-8 text-center">
              <RefreshCw className="h-8 w-8 text-primary mx-auto mb-3 animate-spin" />
              <p className="text-muted-foreground">Loading feature requests...</p>
            </Card>
          ) : filteredRequests.length === 0 ? (
            <Card className="p-8 text-center">
              <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <h3 className="font-medium mb-1">No feature requests found</h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery || statusFilter !== 'all' || categoryFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'No feature requests have been submitted yet'}
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredRequests.map((request) => {
                const statusConfig = FEATURE_STATUS_CONFIG[request.status];
                const StatusIcon = STATUS_ICONS[request.status];
                const isSelected = selectedRequest?.id === request.id;

                return (
                  <button
                    key={request.id}
                    onClick={() => {
                      setSelectedRequest(request);
                      setEditingNotes(request.admin_notes || '');
                      setEditingTimeline(request.estimated_timeline || '');
                    }}
                    className={cn(
                      'w-full text-left transition-all',
                      isSelected ? 'ring-2 ring-primary shadow-md' : 'hover:shadow-md'
                    )}
                  >
                    <Card className="p-4">
                        <div className="flex items-start gap-4">
                          {/* Votes */}
                          <div className="flex flex-col items-center justify-center w-12 py-1 bg-muted rounded-lg">
                            <ThumbsUp className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-bold">{request.upvotes}</span>
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-mono text-muted-foreground">
                                #{request.request_number}
                              </span>
                              <Badge className={cn('text-xs font-medium border-0', statusConfig.color)}>
                                {statusConfig.label}
                              </Badge>
                              <Badge variant="outline" className={cn(
                                'text-xs',
                                request.source === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                              )}>
                                {request.source === 'admin' ? 'Admin' : 'Client'}
                              </Badge>
                            </div>
                            <h3 className="font-medium mb-1 truncate">{request.title}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-2">{request.description}</p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(request.created_at)}
                              </span>
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {request.submitter_name}
                              </span>
                              {request.business_name && (
                                <span className="flex items-center gap-1">
                                  <Building className="h-3 w-3" />
                                  {request.business_name}
                                </span>
                              )}
                            </div>
                          </div>

                          <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        </div>
                    </Card>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selectedRequest && (
          <div className="w-full lg:w-96 flex-shrink-0">
            <Card className="p-4 sticky top-6 space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-mono text-muted-foreground mb-1">
                    #{selectedRequest.request_number}
                  </p>
                  <h3 className="font-semibold">{selectedRequest.title}</h3>
                </div>
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="p-1 hover:bg-muted rounded"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              {/* Status actions */}
              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-2 block">Status</Label>
                <div className="flex flex-wrap gap-2">
                  {(['submitted', 'under_review', 'planned', 'in_progress', 'completed', 'declined'] as FeatureRequestStatus[]).map(status => {
                    const config = FEATURE_STATUS_CONFIG[status];
                    const isActive = selectedRequest.status === status;
                    return (
                      <button
                        key={status}
                        onClick={() => handleUpdateRequest(selectedRequest.id, { status })}
                        disabled={saving}
                        className={cn(
                          'px-2 py-1 rounded text-xs font-medium transition-colors',
                          isActive ? config.color : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        )}
                      >
                        {config.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Description */}
              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1 block">Description</Label>
                <p className="text-sm whitespace-pre-wrap">{selectedRequest.description}</p>
              </div>

              {/* Use case */}
              {selectedRequest.use_case && (
                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-1 block">Use Case</Label>
                  <p className="text-sm whitespace-pre-wrap">{selectedRequest.use_case}</p>
                </div>
              )}

              {/* Admin notes */}
              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1 block">Admin Notes (visible to user)</Label>
                <Textarea
                  value={editingNotes}
                  onChange={(e) => setEditingNotes(e.target.value)}
                  placeholder="Add notes about this request..."
                  rows={3}
                  className="w-full text-sm resize-none"
                />
              </div>

              {/* Timeline */}
              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1 block">Estimated Timeline</Label>
                <Input
                  value={editingTimeline}
                  onChange={(e) => setEditingTimeline(e.target.value)}
                  placeholder="e.g., Q1 2026, Next sprint"
                />
              </div>

              {/* Save button */}
              <Button
                onClick={() => handleUpdateRequest(selectedRequest.id, {
                  admin_notes: editingNotes,
                  estimated_timeline: editingTimeline,
                })}
                disabled={saving}
                className="w-full"
              >
                {saving ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>

              {/* Meta info */}
              <div className="pt-4 border-t space-y-2 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Category</span>
                  <span className="font-medium text-foreground">
                    {FEATURE_CATEGORY_LABELS[selectedRequest.category]}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Source</span>
                  <span className="font-medium text-foreground">
                    {selectedRequest.source === 'admin' ? 'Admin' : 'Client'}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
