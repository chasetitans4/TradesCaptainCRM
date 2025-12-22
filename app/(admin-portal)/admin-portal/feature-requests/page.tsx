'use client';

import { useState, useEffect } from 'react';
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
  Filter,
  TrendingUp,
  Sparkles,
  Send,
  User,
  Building,
  Calendar,
  MessageSquare,
  Eye,
  Edit2,
  ArrowUpRight,
} from 'lucide-react';
import type {
  FeatureRequest,
  FeatureRequestStatus,
  FeatureRequestCategory,
  FeatureRequestStats,
} from '@/lib/admin/types';
import {
  FEATURE_CATEGORY_LABELS,
  FEATURE_STATUS_CONFIG,
  FEATURE_PRIORITY_CONFIG,
} from '@/lib/feature-requests';

const STATUS_ICONS: Record<FeatureRequestStatus, React.ElementType> = {
  submitted: Clock,
  under_review: Search,
  planned: TrendingUp,
  in_progress: RefreshCw,
  completed: CheckCircle2,
  declined: XCircle,
};

export default function AdminFeatureRequestsPage() {
  const [requests, setRequests] = useState<FeatureRequest[]>([]);
  const [stats, setStats] = useState<FeatureRequestStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FeatureRequestStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<FeatureRequestCategory | 'all'>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'client' | 'admin'>('all');
  const [selectedRequest, setSelectedRequest] = useState<FeatureRequest | null>(null);

  // Edit state
  const [editingStatus, setEditingStatus] = useState<FeatureRequestStatus | null>(null);
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

  useEffect(() => {
    fetchRequests();
  }, [statusFilter, categoryFilter, sourceFilter]);

  const fetchRequests = async () => {
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
  };

  const handleSearch = () => {
    fetchRequests();
  };

  const handleUpdateRequest = async (requestId: string, updates: {
    status?: FeatureRequestStatus;
    admin_notes?: string;
    estimated_timeline?: string;
  }) => {
    try {
      setSaving(true);
      const response = await fetch(`/api/feature-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...updates,
          reviewed_by: 'admin-user-id', // In production, get from auth
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedRequest(data.feature_request);
        fetchRequests();
      }
    } catch (error) {
      console.error('Error updating request:', error);
    } finally {
      setSaving(false);
      setEditingStatus(null);
    }
  };

  const handleSubmitNew = async () => {
    if (!newTitle.trim() || !newDescription.trim()) return;

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
          submitter_id: 'admin-user-id',
          submitter_name: 'Admin User',
          submitter_email: 'admin@tradescaptain.com',
        }),
      });

      if (response.ok) {
        setNewTitle('');
        setNewDescription('');
        setNewUseCase('');
        setNewCategory('other');
        setShowNewForm(false);
        fetchRequests();
      }
    } catch (error) {
      console.error('Error submitting feature request:', error);
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
        <div className="card p-3 text-center">
          <p className="text-2xl font-bold text-text">{stats.total}</p>
          <p className="text-xs text-text-muted">Total</p>
        </div>
        <div className="card p-3 text-center bg-blue-50">
          <p className="text-2xl font-bold text-blue-700">{stats.submitted}</p>
          <p className="text-xs text-blue-600">Submitted</p>
        </div>
        <div className="card p-3 text-center bg-yellow-50">
          <p className="text-2xl font-bold text-yellow-700">{stats.under_review}</p>
          <p className="text-xs text-yellow-600">Under Review</p>
        </div>
        <div className="card p-3 text-center bg-purple-50">
          <p className="text-2xl font-bold text-purple-700">{stats.planned}</p>
          <p className="text-xs text-purple-600">Planned</p>
        </div>
        <div className="card p-3 text-center bg-orange-50">
          <p className="text-2xl font-bold text-orange-700">{stats.in_progress}</p>
          <p className="text-xs text-orange-600">In Progress</p>
        </div>
        <div className="card p-3 text-center bg-green-50">
          <p className="text-2xl font-bold text-green-700">{stats.completed}</p>
          <p className="text-xs text-green-600">Completed</p>
        </div>
        <div className="card p-3 text-center bg-gray-50">
          <p className="text-2xl font-bold text-gray-700">{stats.declined}</p>
          <p className="text-xs text-gray-600">Declined</p>
        </div>
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Lightbulb className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Feature Requests</h1>
              <p className="text-sm text-gray-500">Manage feature requests from clients and team</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={fetchRequests}>
              <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
              Refresh
            </Button>
            <Button onClick={() => setShowNewForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Request
            </Button>
          </div>
        </div>
      </header>

      <div className="p-6">
        {/* Stats */}
        {renderStats()}

        {/* Filters */}
        <div className="card p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Search */}
            <div className="flex-1 min-w-[200px] max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
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
              className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm"
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
              className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm"
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
              className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm"
            >
              <option value="all">All Sources</option>
              <option value="client">Client Requests</option>
              <option value="admin">Admin Requests</option>
            </select>
          </div>
        </div>

        {/* Main content */}
        <div className="flex gap-6">
          {/* Requests list */}
          <div className="flex-1">
            {loading ? (
              <div className="card p-8 text-center">
                <RefreshCw className="h-8 w-8 text-primary mx-auto mb-3 animate-spin" />
                <p className="text-gray-500">Loading feature requests...</p>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="card p-8 text-center">
                <Lightbulb className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <h3 className="font-medium text-gray-900 mb-1">No feature requests found</h3>
                <p className="text-sm text-gray-500">
                  {searchQuery || statusFilter !== 'all' || categoryFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'No feature requests have been submitted yet'}
                </p>
              </div>
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
                        'w-full card p-4 text-left transition-all',
                        isSelected ? 'ring-2 ring-primary shadow-md' : 'hover:shadow-md'
                      )}
                    >
                      <div className="flex items-start gap-4">
                        {/* Votes */}
                        <div className="flex flex-col items-center justify-center w-12 py-1 bg-gray-50 rounded-lg">
                          <ThumbsUp className="h-4 w-4 text-gray-400" />
                          <span className="text-sm font-bold text-gray-700">{request.upvotes}</span>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-mono text-gray-400">
                              #{request.request_number}
                            </span>
                            <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', statusConfig.color)}>
                              {statusConfig.label}
                            </span>
                            <span className={cn(
                              'px-2 py-0.5 rounded text-xs',
                              request.source === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                            )}>
                              {request.source === 'admin' ? 'Admin' : 'Client'}
                            </span>
                          </div>
                          <h3 className="font-medium text-gray-900 mb-1 truncate">{request.title}</h3>
                          <p className="text-sm text-gray-500 line-clamp-2">{request.description}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
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

                        <ChevronRight className="h-5 w-5 text-gray-300 flex-shrink-0" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Detail panel */}
          {selectedRequest && (
            <div className="w-96 flex-shrink-0">
              <div className="card p-4 sticky top-6 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-mono text-gray-400 mb-1">
                      #{selectedRequest.request_number}
                    </p>
                    <h3 className="font-semibold text-gray-900">{selectedRequest.title}</h3>
                  </div>
                  <button
                    onClick={() => setSelectedRequest(null)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <X className="h-4 w-4 text-gray-400" />
                  </button>
                </div>

                {/* Status actions */}
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-2 block">Status</label>
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
                            isActive ? config.color : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Description</label>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedRequest.description}</p>
                </div>

                {/* Use case */}
                {selectedRequest.use_case && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Use Case</label>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedRequest.use_case}</p>
                  </div>
                )}

                {/* Admin notes */}
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Admin Notes (visible to user)</label>
                  <textarea
                    value={editingNotes}
                    onChange={(e) => setEditingNotes(e.target.value)}
                    placeholder="Add notes about this request..."
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                  />
                </div>

                {/* Timeline */}
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Estimated Timeline</label>
                  <Input
                    value={editingTimeline}
                    onChange={(e) => setEditingTimeline(e.target.value)}
                    placeholder="e.g., Q1 2025, Next sprint"
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
                <div className="pt-4 border-t border-gray-100 space-y-2 text-xs text-gray-500">
                  <div className="flex justify-between">
                    <span>Category</span>
                    <span className="font-medium text-gray-700">
                      {FEATURE_CATEGORY_LABELS[selectedRequest.category]}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Source</span>
                    <span className="font-medium text-gray-700">
                      {selectedRequest.source === 'admin' ? 'Admin' : 'Client'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Submitted by</span>
                    <span className="font-medium text-gray-700">{selectedRequest.submitter_name}</span>
                  </div>
                  {selectedRequest.business_name && (
                    <div className="flex justify-between">
                      <span>Business</span>
                      <span className="font-medium text-gray-700">{selectedRequest.business_name}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Created</span>
                    <span className="font-medium text-gray-700">{formatDate(selectedRequest.created_at)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Upvotes</span>
                    <span className="font-medium text-gray-700">{selectedRequest.upvotes}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New request modal */}
      {showNewForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Add Feature Request</h2>
                <button
                  onClick={() => setShowNewForm(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Feature title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as FeatureRequestCategory)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                >
                  {Object.entries(FEATURE_CATEGORY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Describe the feature..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Use Case (optional)
                </label>
                <textarea
                  value={newUseCase}
                  onChange={(e) => setNewUseCase(e.target.value)}
                  placeholder="How will this be used?"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg resize-none"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowNewForm(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitNew}
                disabled={!newTitle.trim() || !newDescription.trim() || submitting}
                className="flex-1"
              >
                {submitting ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
