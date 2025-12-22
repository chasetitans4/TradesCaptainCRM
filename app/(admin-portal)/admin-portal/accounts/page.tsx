'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Building2,
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
  ExternalLink,
  Calendar,
  Mail,
  DollarSign,
  Eye,
  UserCog,
  RefreshCw,
  Ban,
} from 'lucide-react';
import { format, formatDistanceToNow, differenceInDays } from 'date-fns';

interface CRMAccount {
  id: string;
  business_name: string;
  owner_email: string;
  owner_name: string;
  phone?: string;
  plan_type: 'blue_starter' | 'blue_pro' | 'blue_enterprise';
  plan_status: 'active' | 'trial' | 'founders' | 'cancelled' | 'expired' | 'suspended';
  trial_start_date?: string;
  trial_end_date?: string;
  founders_start_date?: string;
  founders_end_date?: string;
  cancelled_at?: string;
  created_at: string;
}

const planNames: Record<string, string> = {
  blue_starter: 'Blue Starter',
  blue_pro: 'Blue Pro',
  blue_enterprise: 'Blue Enterprise',
};

const planPrices: Record<string, number> = {
  blue_starter: 49,
  blue_pro: 99,
  blue_enterprise: 149,
};

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: 'bg-green-100', text: 'text-green-700', label: 'Active' },
  trial: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Trial' },
  founders: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Founders' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: 'Cancelled' },
  expired: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Expired' },
  suspended: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Suspended' },
};

export default function AccountsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<CRMAccount[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('plan_status') || 'all');
  const [planFilter, setPlanFilter] = useState(searchParams.get('plan_type') || 'all');
  const [error, setError] = useState<string | null>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const perPage = 20;
  const totalPages = Math.ceil(total / perPage);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('per_page', perPage.toString());
      if (search) params.set('search', search);
      if (statusFilter !== 'all') params.set('plan_status', statusFilter);
      if (planFilter !== 'all') params.set('plan_type', planFilter);

      const res = await fetch(`/api/admin/accounts?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch accounts');
      const data = await res.json();
      setAccounts(data.accounts || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, planFilter]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    fetchAccounts();
  }

  async function handleExtendTrial(accountId: string) {
    if (!confirm('Extend trial by 7 days?')) return;
    setActionLoading(true);
    try {
      await fetch(`/api/admin/accounts/${accountId}/extend-trial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: 7 }),
      });
      fetchAccounts();
    } catch (err) {
      alert('Failed to extend trial');
    } finally {
      setActionLoading(false);
      setActionMenuOpen(null);
    }
  }

  async function handleCancelAccount(accountId: string) {
    const reason = prompt('Enter cancellation reason (optional):');
    if (reason === null) return;
    setActionLoading(true);
    try {
      await fetch(`/api/admin/accounts/${accountId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      fetchAccounts();
    } catch (err) {
      alert('Failed to cancel account');
    } finally {
      setActionLoading(false);
      setActionMenuOpen(null);
    }
  }

  async function handleImpersonate(accountId: string) {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/accounts/${accountId}/impersonate`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to create impersonation session');
      const data = await res.json();
      // Open in new tab
      window.open(data.login_url, '_blank');
    } catch (err) {
      alert('Failed to impersonate');
    } finally {
      setActionLoading(false);
      setActionMenuOpen(null);
    }
  }

  function getDaysRemaining(endDate: string | undefined) {
    if (!endDate) return null;
    const days = differenceInDays(new Date(endDate), new Date());
    return days;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CRM Accounts</h1>
          <p className="text-gray-500">Manage all TradesCaptain CRM client accounts</p>
        </div>
        <div className="text-sm text-gray-500">
          {total} total accounts
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email..."
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="trial">Trial</option>
            <option value="founders">Founders</option>
            <option value="cancelled">Cancelled</option>
            <option value="expired">Expired</option>
          </select>

          {/* Plan Filter */}
          <select
            value={planFilter}
            onChange={(e) => {
              setPlanFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white"
          >
            <option value="all">All Plans</option>
            <option value="blue_starter">Blue Starter</option>
            <option value="blue_pro">Blue Pro</option>
            <option value="blue_enterprise">Blue Enterprise</option>
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

      {/* Accounts Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Building2 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No accounts found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Business</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Owner</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Plan</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Period</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Created</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {accounts.map((account) => {
                  const status = statusColors[account.plan_status] || statusColors.active;
                  const daysRemaining = account.plan_status === 'trial'
                    ? getDaysRemaining(account.trial_end_date)
                    : account.plan_status === 'founders'
                    ? getDaysRemaining(account.founders_end_date)
                    : null;

                  return (
                    <tr key={account.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{account.business_name}</div>
                        <div className="text-xs text-gray-500">ID: {account.id.slice(0, 8)}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-gray-900">{account.owner_name}</div>
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {account.owner_email}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">
                          {planNames[account.plan_type]}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          ${planPrices[account.plan_type]}/mo
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
                          {account.plan_status === 'founders' && <Crown className="h-3 w-3" />}
                          {account.plan_status === 'trial' && <Clock className="h-3 w-3" />}
                          {account.plan_status === 'active' && <CheckCircle className="h-3 w-3" />}
                          {account.plan_status === 'cancelled' && <XCircle className="h-3 w-3" />}
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {daysRemaining !== null ? (
                          <div>
                            <div className={`text-sm font-medium ${daysRemaining <= 7 ? 'text-red-600' : 'text-gray-900'}`}>
                              {daysRemaining} days left
                            </div>
                            <div className="text-xs text-gray-500">
                              {account.plan_status === 'trial'
                                ? `Ends ${format(new Date(account.trial_end_date!), 'MMM d')}`
                                : `Ends ${format(new Date(account.founders_end_date!), 'MMM d')}`}
                            </div>
                          </div>
                        ) : account.plan_status === 'cancelled' ? (
                          <div className="text-xs text-gray-500">
                            Cancelled {account.cancelled_at
                              ? formatDistanceToNow(new Date(account.cancelled_at), { addSuffix: true })
                              : ''}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-gray-900">
                          {format(new Date(account.created_at), 'MMM d, yyyy')}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(account.created_at), { addSuffix: true })}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="relative flex justify-end">
                          <button
                            onClick={() => setActionMenuOpen(actionMenuOpen === account.id ? null : account.id)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <MoreVertical className="h-4 w-4 text-gray-500" />
                          </button>

                          {actionMenuOpen === account.id && (
                            <>
                              <div
                                className="fixed inset-0 z-40"
                                onClick={() => setActionMenuOpen(null)}
                              />
                              <div className="absolute right-0 top-8 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-1">
                                <Link
                                  href={`/admin-portal/accounts/${account.id}`}
                                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                  onClick={() => setActionMenuOpen(null)}
                                >
                                  <Eye className="h-4 w-4" />
                                  View Details
                                </Link>
                                <button
                                  onClick={() => handleImpersonate(account.id)}
                                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                  disabled={actionLoading}
                                >
                                  <UserCog className="h-4 w-4" />
                                  Impersonate
                                </button>
                                {account.plan_status === 'trial' && (
                                  <button
                                    onClick={() => handleExtendTrial(account.id)}
                                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                    disabled={actionLoading}
                                  >
                                    <RefreshCw className="h-4 w-4" />
                                    Extend Trial (+7 days)
                                  </button>
                                )}
                                {account.plan_status !== 'cancelled' && (
                                  <button
                                    onClick={() => handleCancelAccount(account.id)}
                                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                    disabled={actionLoading}
                                  >
                                    <Ban className="h-4 w-4" />
                                    Cancel Account
                                  </button>
                                )}
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
