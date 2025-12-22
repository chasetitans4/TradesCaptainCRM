'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  FileText,
  Search,
  Filter,
  MoreVertical,
  Clock,
  Crown,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Mail,
  Send,
  Copy,
  ExternalLink,
  UserPlus,
  Building2,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface Submission {
  id: string;
  submission_type: 'trial' | 'founders';
  client_company_name: string;
  client_email: string;
  client_phone?: string;
  crm_plan_selected: string;
  web_invoice_number?: string;
  web_plan_type?: string;
  status: 'pending' | 'invite_sent' | 'registered' | 'expired';
  invite_token: string;
  invite_sent_at?: string;
  registered_at?: string;
  created_at: string;
  agent?: { full_name: string };
}

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pending' },
  invite_sent: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Invite Sent' },
  registered: { bg: 'bg-green-100', text: 'text-green-700', label: 'Registered' },
  expired: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Expired' },
};

const planNames: Record<string, string> = {
  blue_starter: 'Blue Starter',
  blue_pro: 'Blue Pro',
  blue_enterprise: 'Blue Enterprise',
};

export default function SubmissionsPage() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState(searchParams.get('type') || 'all');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [error, setError] = useState<string | null>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const perPage = 20;
  const totalPages = Math.ceil(total / perPage);

  const fetchSubmissions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('per_page', perPage.toString());
      if (search) params.set('search', search);
      if (typeFilter !== 'all') params.set('type', typeFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const res = await fetch(`/api/admin/submissions?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch submissions');
      const data = await res.json();
      setSubmissions(data.submissions || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, search, typeFilter, statusFilter]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    fetchSubmissions();
  }

  async function handleSendInvite(submissionId: string) {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/submissions/${submissionId}/send-invite`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send invite');
      }
      const data = await res.json();
      alert(`Invite sent! Registration URL:\n${data.registration_url}`);
      fetchSubmissions();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
      setActionMenuOpen(null);
    }
  }

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  function getRegistrationUrl(token: string) {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    return `${baseUrl}/register/${token}`;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agent Submissions</h1>
          <p className="text-gray-500">Manage trial and founders program submissions</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin-portal/submissions/new-trial"
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm font-medium"
          >
            <Clock className="h-4 w-4" />
            New Trial
          </Link>
          <Link
            href="/admin-portal/submissions/new-founders"
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 text-sm font-medium"
          >
            <Crown className="h-4 w-4" />
            New Founders
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by company, email..."
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white"
          >
            <option value="all">All Types</option>
            <option value="trial">Trial</option>
            <option value="founders">Founders</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="invite_sent">Invite Sent</option>
            <option value="registered">Registered</option>
            <option value="expired">Expired</option>
          </select>

          <button
            type="submit"
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      {/* Submissions Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : submissions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No submissions found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Type</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Client</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Plan</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Agent</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Created</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {submissions.map((submission) => {
                  const status = statusConfig[submission.status] || statusConfig.pending;
                  const registrationUrl = getRegistrationUrl(submission.invite_token);

                  return (
                    <tr key={submission.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          submission.submission_type === 'founders'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {submission.submission_type === 'founders' ? (
                            <Crown className="h-3 w-3" />
                          ) : (
                            <Clock className="h-3 w-3" />
                          )}
                          {submission.submission_type === 'founders' ? 'Founders' : 'Trial'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-gray-400" />
                          <div>
                            <div className="font-medium text-gray-900">
                              {submission.client_company_name}
                            </div>
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {submission.client_email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-gray-900">
                          {planNames[submission.crm_plan_selected] || submission.crm_plan_selected}
                        </div>
                        {submission.web_invoice_number && (
                          <div className="text-xs text-gray-500">
                            Invoice: {submission.web_invoice_number}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
                          {submission.status === 'registered' && <CheckCircle className="h-3 w-3" />}
                          {submission.status === 'invite_sent' && <Send className="h-3 w-3" />}
                          {status.label}
                        </span>
                        {submission.invite_sent_at && (
                          <div className="text-xs text-gray-500 mt-0.5">
                            Sent {formatDistanceToNow(new Date(submission.invite_sent_at), { addSuffix: true })}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {submission.agent?.full_name || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-gray-900">
                          {format(new Date(submission.created_at), 'MMM d, yyyy')}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(submission.created_at), { addSuffix: true })}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="relative flex justify-end">
                          <button
                            onClick={() => setActionMenuOpen(actionMenuOpen === submission.id ? null : submission.id)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <MoreVertical className="h-4 w-4 text-gray-500" />
                          </button>

                          {actionMenuOpen === submission.id && (
                            <>
                              <div
                                className="fixed inset-0 z-40"
                                onClick={() => setActionMenuOpen(null)}
                              />
                              <div className="absolute right-0 top-8 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-1">
                                {submission.status !== 'registered' && (
                                  <button
                                    onClick={() => handleSendInvite(submission.id)}
                                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                    disabled={actionLoading}
                                  >
                                    <Send className="h-4 w-4" />
                                    {submission.status === 'invite_sent' ? 'Resend Invite' : 'Send Invite'}
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    copyToClipboard(registrationUrl, submission.id);
                                    setActionMenuOpen(null);
                                  }}
                                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                >
                                  <Copy className="h-4 w-4" />
                                  {copied === submission.id ? 'Copied!' : 'Copy Registration URL'}
                                </button>
                                <a
                                  href={registrationUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                  onClick={() => setActionMenuOpen(null)}
                                >
                                  <ExternalLink className="h-4 w-4" />
                                  Open Registration Page
                                </a>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Showing {((page - 1) * perPage) + 1} to {Math.min(page * perPage, total)} of {total}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-gray-600">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
