'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  Flag,
  CheckCircle,
  Loader2,
  Clock,
  MessageSquare,
  XCircle,
} from 'lucide-react';

interface AIIssue {
  id: string;
  conversation_id: string;
  issue_type: string;
  description: string;
  reported_by: string;
  status: 'open' | 'reviewing' | 'resolved' | 'wont_fix';
  resolution_notes: string | null;
  created_at: string;
  resolved_at: string | null;
  nevermiss_conversations?: {
    caller_phone: string;
    service_needed: string;
  };
}

interface AIIssueSummary {
  open: number;
  reviewing: number;
  resolved: number;
  wont_fix: number;
}

const ISSUE_TYPES = [
  { value: 'wrong_response', label: 'Wrong Response' },
  { value: 'wrong_business_name', label: 'Wrong Business Name' },
  { value: 'wrong_services', label: 'Wrong Services Listed' },
  { value: 'wrong_tone', label: 'Wrong Tone' },
  { value: 'hallucination', label: 'Hallucinated Information' },
  { value: 'gave_price', label: 'Gave Price Quote' },
  { value: 'loop', label: 'Stuck in Loop' },
  { value: 'emergency_missed', label: 'Emergency Not Detected' },
  { value: 'inappropriate', label: 'Inappropriate Response' },
  { value: 'other', label: 'Other' },
];

interface AIIssueReporterProps {
  conversationId?: string;
  onClose?: () => void;
}

export function AIIssueReporter({ conversationId, onClose }: AIIssueReporterProps) {
  const [issues, setIssues] = useState<AIIssue[]>([]);
  const [summary, setSummary] = useState<AIIssueSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('open');

  // New issue form
  const [showForm, setShowForm] = useState(!!conversationId);
  const [formConversationId, setFormConversationId] = useState(conversationId || '');
  const [formIssueType, setFormIssueType] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Resolution
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  useEffect(() => {
    if (!conversationId) {
      fetchIssues();
    }
  }, [statusFilter, conversationId]);

  const fetchIssues = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/support/ai-issues?status=${statusFilter}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch AI issues');
      }

      const data = await response.json();
      setIssues(data.issues);
      setSummary(data.summary);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const submitIssue = async () => {
    if (!formConversationId || !formIssueType || !formDescription) {
      setError('All fields are required');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/support/ai-issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: formConversationId,
          issue_type: formIssueType,
          description: formDescription,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit issue');
      }

      // Reset form
      setFormConversationId('');
      setFormIssueType('');
      setFormDescription('');
      setShowForm(false);

      // Refresh list or close
      if (onClose) {
        onClose();
      } else {
        fetchIssues();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const resolveIssue = async (issueId: string, status: 'resolved' | 'wont_fix') => {
    setError(null);

    try {
      const response = await fetch('/api/admin/support/ai-issues', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issue_id: issueId,
          status,
          resolution_notes: resolutionNotes,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to resolve issue');
      }

      setResolvingId(null);
      setResolutionNotes('');
      fetchIssues();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'warning' | 'default' | 'success' | 'danger'> = {
      open: 'warning',
      reviewing: 'default',
      resolved: 'success',
      wont_fix: 'danger',
    };
    return <Badge variant={variants[status] || 'default'}>{status.replace('_', ' ')}</Badge>;
  };

  const getIssueTypeLabel = (type: string) => {
    return ISSUE_TYPES.find((t) => t.value === type)?.label || type;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  // If opened for a specific conversation, show just the form
  if (conversationId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5" />
            Report AI Issue
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="p-3 mb-4 bg-red-50 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Issue Type
              </label>
              <select
                value={formIssueType}
                onChange={(e) => setFormIssueType(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="">Select issue type...</option>
                {ISSUE_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Description
              </label>
              <textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                rows={4}
                placeholder="Describe the issue in detail..."
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={submitIssue}
                disabled={submitting}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Flag className="h-4 w-4 mr-1" />
                )}
                Submit Issue
              </Button>
              {onClose && (
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          AI Issues
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary */}
        {summary && (
          <div className="grid grid-cols-4 gap-2 mb-4">
            <div
              className={`p-3 rounded-lg text-center cursor-pointer ${
                statusFilter === 'open' ? 'bg-yellow-100' : 'bg-muted'
              }`}
              onClick={() => setStatusFilter('open')}
            >
              <div className="text-2xl font-bold">{summary.open}</div>
              <div className="text-xs text-muted-foreground">Open</div>
            </div>
            <div
              className={`p-3 rounded-lg text-center cursor-pointer ${
                statusFilter === 'reviewing' ? 'bg-blue-100' : 'bg-muted'
              }`}
              onClick={() => setStatusFilter('reviewing')}
            >
              <div className="text-2xl font-bold">{summary.reviewing}</div>
              <div className="text-xs text-muted-foreground">Reviewing</div>
            </div>
            <div
              className={`p-3 rounded-lg text-center cursor-pointer ${
                statusFilter === 'resolved' ? 'bg-green-100' : 'bg-muted'
              }`}
              onClick={() => setStatusFilter('resolved')}
            >
              <div className="text-2xl font-bold">{summary.resolved}</div>
              <div className="text-xs text-muted-foreground">Resolved</div>
            </div>
            <div
              className={`p-3 rounded-lg text-center cursor-pointer ${
                statusFilter === 'wont_fix' ? 'bg-gray-100' : 'bg-muted'
              }`}
              onClick={() => setStatusFilter('wont_fix')}
            >
              <div className="text-2xl font-bold">{summary.wont_fix}</div>
              <div className="text-xs text-muted-foreground">Won&apos;t Fix</div>
            </div>
          </div>
        )}

        {/* New Issue Form Toggle */}
        {!showForm && (
          <Button
            variant="outline"
            size="sm"
            className="mb-4"
            onClick={() => setShowForm(true)}
          >
            <Flag className="h-4 w-4 mr-1" />
            Report New Issue
          </Button>
        )}

        {/* New Issue Form */}
        {showForm && !conversationId && (
          <div className="p-4 border rounded-lg mb-4 bg-muted/30">
            <h4 className="font-medium mb-3">Report New AI Issue</h4>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Conversation ID
                </label>
                <Input
                  value={formConversationId}
                  onChange={(e) => setFormConversationId(e.target.value)}
                  placeholder="Enter conversation ID..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Issue Type
                </label>
                <select
                  value={formIssueType}
                  onChange={(e) => setFormIssueType(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">Select issue type...</option>
                  {ISSUE_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Description
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  rows={3}
                  placeholder="Describe the issue..."
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={submitIssue} disabled={submitting} size="sm">
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Submit'
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 mb-4 bg-red-50 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}

        {/* Issues List */}
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : issues.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
            No issues with status &quot;{statusFilter.replace('_', ' ')}&quot;
          </div>
        ) : (
          <div className="space-y-3">
            {issues.map((issue) => (
              <div key={issue.id} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getStatusBadge(issue.status)}
                    <Badge variant="outline">{getIssueTypeLabel(issue.issue_type)}</Badge>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatDate(issue.created_at)}
                  </div>
                </div>

                <p className="text-sm mb-2">{issue.description}</p>

                {issue.nevermiss_conversations && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <MessageSquare className="h-3 w-3" />
                    {issue.nevermiss_conversations.caller_phone} -{' '}
                    {issue.nevermiss_conversations.service_needed || 'No service captured'}
                  </div>
                )}

                <div className="text-xs text-muted-foreground mb-2">
                  Reported by: {issue.reported_by}
                </div>

                {issue.resolution_notes && (
                  <div className="p-2 bg-muted rounded text-sm mb-2">
                    <strong>Resolution:</strong> {issue.resolution_notes}
                  </div>
                )}

                {/* Resolution Actions */}
                {issue.status === 'open' && (
                  <div className="mt-3 pt-3 border-t">
                    {resolvingId === issue.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={resolutionNotes}
                          onChange={(e) => setResolutionNotes(e.target.value)}
                          className="w-full px-3 py-2 border rounded-md text-sm"
                          rows={2}
                          placeholder="Resolution notes (optional)..."
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => resolveIssue(issue.id, 'resolved')}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Mark Resolved
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => resolveIssue(issue.id, 'wont_fix')}
                          >
                            <XCircle className="h-3 w-3 mr-1" />
                            Won&apos;t Fix
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setResolvingId(null);
                              setResolutionNotes('');
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setResolvingId(issue.id)}
                      >
                        Resolve Issue
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
