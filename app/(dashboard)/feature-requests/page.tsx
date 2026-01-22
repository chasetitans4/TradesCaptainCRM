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
  MessageSquare,
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
  ArrowLeft,
} from 'lucide-react';
import type {
  FeatureRequest,
  FeatureRequestStatus,
  FeatureRequestCategory,
} from '@/lib/admin/types';
import {
  FEATURE_CATEGORY_LABELS,
  FEATURE_STATUS_CONFIG,
} from '@/lib/feature-requests/constants';

const STATUS_ICONS: Record<FeatureRequestStatus, React.ElementType> = {
  submitted: Clock,
  under_review: Search,
  planned: TrendingUp,
  in_progress: RefreshCw,
  completed: CheckCircle2,
  declined: XCircle,
};

export default function FeatureRequestsPage() {
  const [requests, setRequests] = useState<FeatureRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FeatureRequestStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<FeatureRequestCategory | 'all'>('all');
  const [showNewForm, setShowNewForm] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<FeatureRequest | null>(null);

  // Form state
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newUseCase, setNewUseCase] = useState('');
  const [newCategory, setNewCategory] = useState<FeatureRequestCategory>('other');
  const [submitting, setSubmitting] = useState(false);

  // Mock user ID for demo
  const userId = 'demo-user-id';

  useEffect(() => {
    fetchRequests();
  }, [statusFilter, categoryFilter]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      if (searchQuery) params.set('search', searchQuery);

      const response = await fetch(`/api/feature-requests?${params}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch feature requests: ${response.status}`);
      }
      const data = await response.json();
      setRequests(data.feature_requests || []);
    } catch (error) {
      console.error('Error fetching feature requests:', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchRequests();
  };

  const handleSubmit = async () => {
    if (!newTitle.trim() || !newDescription.trim()) return;

    try {
      setSubmitting(true);

      // In production, get this from auth context
      const mockUser = {
        source: 'client' as const,
        submitter_id: userId,
        submitter_name: 'Demo User',
        submitter_email: 'demo@example.com',
        business_name: 'Demo Business',
        crm_account_id: 'demo-account-id',
      };

      const response = await fetch('/api/feature-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          description: newDescription,
          use_case: newUseCase,
          category: newCategory,
          ...mockUser,
        }),
      });

      if (response.ok) {
        // Reset form
        setNewTitle('');
        setNewDescription('');
        setNewUseCase('');
        setNewCategory('other');
        setShowNewForm(false);
        // Refresh list
        fetchRequests();
      }
    } catch (error) {
      console.error('Error submitting feature request:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpvote = async (requestId: string) => {
    try {
      const response = await fetch(`/api/feature-requests/${requestId}/upvote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      });

      if (response.ok) {
        const data = await response.json();
        // Update local state
        setRequests(prev =>
          prev.map(r =>
            r.id === requestId
              ? {
                  ...r,
                  upvotes: data.upvotes,
                  upvoted_by: r.upvoted_by.includes(userId)
                    ? r.upvoted_by.filter(u => u !== userId)
                    : [...r.upvoted_by, userId],
                }
              : r
          )
        );
        if (selectedRequest?.id === requestId) {
          setSelectedRequest(prev =>
            prev
              ? {
                  ...prev,
                  upvotes: data.upvotes,
                  upvoted_by: prev.upvoted_by.includes(userId)
                    ? prev.upvoted_by.filter(u => u !== userId)
                    : [...prev.upvoted_by, userId],
                }
              : null
          );
        }
      }
    } catch (error) {
      console.error('Error upvoting:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  // Filter by search
  const filteredRequests = requests.filter(r => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      r.title.toLowerCase().includes(query) ||
      r.description.toLowerCase().includes(query) ||
      r.request_number.toLowerCase().includes(query)
    );
  });

  // Detail view
  if (selectedRequest) {
    const statusConfig = FEATURE_STATUS_CONFIG[selectedRequest.status];
    const StatusIcon = STATUS_ICONS[selectedRequest.status];
    const hasUpvoted = selectedRequest.upvoted_by.includes(userId);

    return (
      <div className="min-h-screen bg-background pb-20">
        {/* Header */}
        <header className="bg-white border-b border-border px-4 py-4 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSelectedRequest(null)}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm text-text-muted font-mono">
                  #{selectedRequest.request_number}
                </span>
                <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', statusConfig.color)}>
                  {statusConfig.label}
                </span>
              </div>
              <h1 className="font-semibold text-text truncate">{selectedRequest.title}</h1>
            </div>
          </div>
        </header>

        <div className="px-4 py-6 space-y-4 max-w-2xl mx-auto">
          {/* Status info */}
          <div className={cn('p-4 rounded-lg border', statusConfig.color.replace('text-', 'border-').replace('bg-', 'bg-opacity-50 bg-'))}>
            <div className="flex items-center gap-3">
              <StatusIcon className="h-5 w-5" />
              <div>
                <p className="font-medium">{statusConfig.label}</p>
                <p className="text-sm opacity-80">{statusConfig.description}</p>
              </div>
            </div>
            {selectedRequest.estimated_timeline && (
              <p className="mt-2 text-sm">
                <strong>Timeline:</strong> {selectedRequest.estimated_timeline}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="card p-4">
            <h3 className="font-medium text-text mb-2">Description</h3>
            <p className="text-text-muted whitespace-pre-wrap">{selectedRequest.description}</p>
          </div>

          {/* Use case */}
          {selectedRequest.use_case && (
            <div className="card p-4">
              <h3 className="font-medium text-text mb-2">Use Case</h3>
              <p className="text-text-muted whitespace-pre-wrap">{selectedRequest.use_case}</p>
            </div>
          )}

          {/* Admin notes */}
          {selectedRequest.admin_notes && (
            <div className="card p-4 bg-primary/5 border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h3 className="font-medium text-text">Official Response</h3>
              </div>
              <p className="text-text-muted whitespace-pre-wrap">{selectedRequest.admin_notes}</p>
            </div>
          )}

          {/* Meta info */}
          <div className="card p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-text-muted">Category</p>
                <p className="font-medium">{FEATURE_CATEGORY_LABELS[selectedRequest.category]}</p>
              </div>
              <div>
                <p className="text-text-muted">Submitted</p>
                <p className="font-medium">{formatDate(selectedRequest.created_at)}</p>
              </div>
              <div>
                <p className="text-text-muted">Submitted by</p>
                <p className="font-medium">{selectedRequest.submitter_name}</p>
              </div>
              <div>
                <p className="text-text-muted">Votes</p>
                <p className="font-medium">{selectedRequest.upvotes}</p>
              </div>
            </div>
          </div>

          {/* Upvote button */}
          <button
            onClick={() => handleUpvote(selectedRequest.id)}
            className={cn(
              'w-full flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-colors',
              hasUpvoted
                ? 'bg-primary text-white'
                : 'bg-muted text-text hover:bg-muted/80'
            )}
          >
            <ThumbsUp className={cn('h-5 w-5', hasUpvoted && 'fill-current')} />
            {hasUpvoted ? 'Upvoted!' : 'Upvote this feature'}
            <span className="ml-1">({selectedRequest.upvotes})</span>
          </button>
        </div>
      </div>
    );
  }

  // New request form
  if (showNewForm) {
    return (
      <div className="min-h-screen bg-background pb-20">
        {/* Header */}
        <header className="bg-primary text-white px-4 py-6">
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => setShowNewForm(false)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            <h1 className="text-xl font-bold">Submit Feature Request</h1>
          </div>
          <p className="text-white/70 text-sm">
            Tell us what would make TradesCaptain better for you
          </p>
        </header>

        <div className="px-4 py-6 space-y-4 max-w-2xl mx-auto">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Feature Title *
            </label>
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Brief title for your feature idea"
              maxLength={100}
            />
            <p className="text-xs text-text-muted mt-1">{newTitle.length}/100</p>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Category *
            </label>
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as FeatureRequestCategory)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {Object.entries(FEATURE_CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Description *
            </label>
            <textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Describe the feature you'd like to see..."
              rows={4}
              className="w-full px-3 py-2 border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
          </div>

          {/* Use case */}
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Use Case (optional)
            </label>
            <textarea
              value={newUseCase}
              onChange={(e) => setNewUseCase(e.target.value)}
              placeholder="How would you use this feature? What problem does it solve?"
              rows={3}
              className="w-full px-3 py-2 border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
          </div>

          {/* Submit button */}
          <Button
            onClick={handleSubmit}
            disabled={!newTitle.trim() || !newDescription.trim() || submitting}
            className="w-full"
          >
            {submitting ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Submit Feature Request
              </>
            )}
          </Button>

          <p className="text-xs text-text-muted text-center">
            Your request will be reviewed by our team. Popular requests get prioritized!
          </p>
        </div>
      </div>
    );
  }

  // Main list view
  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-primary text-white px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Lightbulb className="h-8 w-8" />
            <div>
              <h1 className="text-xl font-bold">Feature Requests</h1>
              <p className="text-white/70 text-sm">Shape the future of TradesCaptain</p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowNewForm(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            New
          </Button>
        </div>

        {/* Search */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <Input
              type="search"
              placeholder="Search requests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-10 bg-white text-text"
            />
          </div>
          <Button variant="secondary" size="icon" onClick={handleSearch}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="px-4 py-4 space-y-4">
        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
          <button
            onClick={() => setStatusFilter('all')}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
              statusFilter === 'all'
                ? 'bg-primary text-white'
                : 'bg-muted text-text-muted hover:bg-muted/80'
            )}
          >
            All
          </button>
          {(['submitted', 'under_review', 'planned', 'in_progress', 'completed'] as FeatureRequestStatus[]).map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                statusFilter === status
                  ? 'bg-primary text-white'
                  : 'bg-muted text-text-muted hover:bg-muted/80'
              )}
            >
              {FEATURE_STATUS_CONFIG[status].label}
            </button>
          ))}
        </div>

        {/* Category filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as FeatureRequestCategory | 'all')}
          className="w-full px-3 py-2 border border-border rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="all">All Categories</option>
          {Object.entries(FEATURE_CATEGORY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>

        {/* Requests list */}
        {loading ? (
          <div className="card p-8 text-center">
            <RefreshCw className="h-8 w-8 text-primary mx-auto mb-3 animate-spin" />
            <p className="text-text-muted">Loading feature requests...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="card p-8 text-center">
            <Lightbulb className="h-12 w-12 text-text-muted mx-auto mb-3" />
            <h3 className="font-medium text-text mb-1">No feature requests yet</h3>
            <p className="text-sm text-text-muted mb-4">
              Be the first to suggest a new feature!
            </p>
            <Button onClick={() => setShowNewForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Submit Feature Request
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRequests.map((request) => {
              const statusConfig = FEATURE_STATUS_CONFIG[request.status];
              const StatusIcon = STATUS_ICONS[request.status];
              const hasUpvoted = request.upvoted_by.includes(userId);

              return (
                <div
                  key={request.id}
                  className="card p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex gap-3">
                    {/* Upvote button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpvote(request.id);
                      }}
                      className={cn(
                        'flex flex-col items-center justify-center w-12 rounded-lg py-2 transition-colors',
                        hasUpvoted
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted text-text-muted hover:bg-muted/80'
                      )}
                    >
                      <ThumbsUp className={cn('h-4 w-4', hasUpvoted && 'fill-current')} />
                      <span className="text-xs font-medium mt-0.5">{request.upvotes}</span>
                    </button>

                    {/* Content */}
                    <button
                      onClick={() => setSelectedRequest(request)}
                      className="flex-1 text-left"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', statusConfig.color)}>
                          {statusConfig.label}
                        </span>
                        <span className="text-xs text-text-muted">
                          {FEATURE_CATEGORY_LABELS[request.category]}
                        </span>
                      </div>
                      <h3 className="font-medium text-text mb-1">{request.title}</h3>
                      <p className="text-sm text-text-muted line-clamp-2">{request.description}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-text-muted">
                        <span>{formatDate(request.created_at)}</span>
                        <span>by {request.submitter_name}</span>
                      </div>
                    </button>

                    <ChevronRight className="h-5 w-5 text-text-muted flex-shrink-0 self-center" />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Promo card */}
        <div className="card p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200">
          <div className="flex items-start gap-3">
            <Sparkles className="h-6 w-6 text-yellow-600 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-text mb-1">Your voice matters!</h4>
              <p className="text-sm text-text-muted">
                Upvote features you want, and submit your own ideas. Popular requests get prioritized by our team.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
