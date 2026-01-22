'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Building2,
  Search,
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
  DollarSign,
  Eye,
  UserCog,
  RefreshCw,
  Ban,
} from 'lucide-react';
import { format, formatDistanceToNow, differenceInDays } from 'date-fns';
import { AdminPageHeader } from '@/components/admin/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { useOptimizedFetch } from '@/lib/hooks/use-optimized-fetch';

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
  active: { bg: 'bg-green-500/10', text: 'text-green-600 dark:text-green-400', label: 'Active' },
  trial: { bg: 'bg-yellow-500/10', text: 'text-yellow-600 dark:text-yellow-400', label: 'Trial' },
  cancelled: { bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400', label: 'Cancelled' },
  expired: { bg: 'bg-muted', text: 'text-muted-foreground', label: 'Expired' },
  suspended: { bg: 'bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400', label: 'Suspended' },
};

interface AccountsResponse {
  accounts: CRMAccount[];
  total: number;
}

export default function AccountsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('plan_status') || 'all');
  const [planFilter, setPlanFilter] = useState(searchParams.get('plan_type') || 'all');
  const [actionLoading, setActionLoading] = useState(false);

  // Dialog states
  const [extendTrialDialog, setExtendTrialDialog] = useState<{ open: boolean; accountId: string | null }>({ open: false, accountId: null });
  const [cancelDialog, setCancelDialog] = useState<{ open: boolean; accountId: string | null; reason: string }>({ open: false, accountId: null, reason: '' });
  const [errorDialog, setErrorDialog] = useState<{ open: boolean; message: string }>({ open: false, message: '' });

  const perPage = 20;

  // Memoized fetcher function
  const fetcher = useCallback(async (): Promise<AccountsResponse> => {
    const params = new URLSearchParams();
    params.set('page', page.toString());
    params.set('per_page', perPage.toString());
    if (search) params.set('search', search);
    if (statusFilter !== 'all') params.set('plan_status', statusFilter);
    if (planFilter !== 'all') params.set('plan_type', planFilter);

    const res = await fetch(`/api/admin/accounts?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch accounts');
    const data = await res.json();
    return {
      accounts: data.accounts || [],
      total: data.total || 0,
    };
  }, [page, search, statusFilter, planFilter]);

  // Use optimized fetch with caching and revalidation
  const {
    data,
    error: fetchError,
    isLoading,
    isValidating,
    refetch,
  } = useOptimizedFetch<AccountsResponse>(
    `admin-accounts-${page}-${search}-${statusFilter}-${planFilter}`,
    fetcher,
    {
      staleTime: 60000, // Cache for 1 minute
      refetchOnFocus: true,
      deps: [page, search, statusFilter, planFilter],
    }
  );

  const accounts = data?.accounts || [];
  const total = data?.total || 0;
  const loading = isLoading && !data;
  const error = fetchError?.message || null;
  const totalPages = Math.ceil(total / perPage);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    refetch();
  }

  function openExtendTrialDialog(accountId: string) {
    setExtendTrialDialog({ open: true, accountId });
  }

  async function confirmExtendTrial() {
    if (!extendTrialDialog.accountId) return;
    setActionLoading(true);
    try {
      await fetch(`/api/admin/accounts/${extendTrialDialog.accountId}/extend-trial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: 7 }),
      });
      refetch();
    } catch (err) {
      setErrorDialog({ open: true, message: 'Failed to extend trial' });
    } finally {
      setActionLoading(false);
      setExtendTrialDialog({ open: false, accountId: null });
    }
  }

  function openCancelDialog(accountId: string) {
    setCancelDialog({ open: true, accountId, reason: '' });
  }

  async function confirmCancelAccount() {
    if (!cancelDialog.accountId) return;
    setActionLoading(true);
    try {
      await fetch(`/api/admin/accounts/${cancelDialog.accountId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelDialog.reason }),
      });
      refetch();
    } catch (err) {
      setErrorDialog({ open: true, message: 'Failed to cancel account' });
    } finally {
      setActionLoading(false);
      setCancelDialog({ open: false, accountId: null, reason: '' });
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
      setErrorDialog({ open: true, message: 'Failed to impersonate account' });
    } finally {
      setActionLoading(false);
    }
  }

  function getDaysRemaining(endDate: string | undefined) {
    if (!endDate) return null;
    const days = differenceInDays(new Date(endDate), new Date());
    return days;
  }

  return (
    <div className="p-6 space-y-6">
      <AdminPageHeader
        title="CRM Accounts"
        description={`Manage all TradesCaptain CRM client accounts. Total: ${total}`}
        icon={Building2}
      />

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-3" role="search" aria-label="Filter accounts">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <label htmlFor="account-search" className="sr-only">Search accounts</label>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input
                id="account-search"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, email..."
                className="pl-9"
              />
            </div>

            {/* Status Filter */}
            <label htmlFor="status-filter" className="sr-only">Filter by status</label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 border border-input bg-background text-foreground rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="trial">Trial</option>
              <option value="cancelled">Cancelled</option>
              <option value="expired">Expired</option>
            </select>

            {/* Plan Filter */}
            <label htmlFor="plan-filter" className="sr-only">Filter by plan</label>
            <select
              id="plan-filter"
              value={planFilter}
              onChange={(e) => {
                setPlanFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 border border-input bg-background text-foreground rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            >
              <option value="all">All Plans</option>
              <option value="blue_starter">Blue Starter</option>
              <option value="blue_pro">Blue Pro</option>
              <option value="blue_enterprise">Blue Enterprise</option>
            </select>

            <Button type="submit">
              Search
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      {/* Accounts Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
            <p>No accounts found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Business</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Owner</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Plan</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Period</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Created</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {accounts.map((account) => {
                  const status = statusColors[account.plan_status] || statusColors.active;
                  const daysRemaining = account.plan_status === 'trial'
                    ? getDaysRemaining(account.trial_end_date)
                    : account.plan_status === 'founders'
                    ? getDaysRemaining(account.founders_end_date)
                    : null;

                  return (
                    <tr key={account.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{account.business_name}</div>
                        <div className="text-xs text-muted-foreground">ID: {account.id.slice(0, 8)}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-foreground">{account.owner_name}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {account.owner_email}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">
                          {planNames[account.plan_type]}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          ${planPrices[account.plan_type]}/mo
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="secondary"
                          className={`${status.bg} ${status.text} border-0`}
                        >
                          {account.plan_status === 'founders' && <Crown className="h-3 w-3 mr-1" />}
                          {account.plan_status === 'trial' && <Clock className="h-3 w-3 mr-1" />}
                          {account.plan_status === 'active' && <CheckCircle className="h-3 w-3 mr-1" />}
                          {account.plan_status === 'cancelled' && <XCircle className="h-3 w-3 mr-1" />}
                          {status.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {daysRemaining !== null ? (
                          <div>
                            <div className={`text-sm font-medium ${daysRemaining <= 7 ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}>
                              {daysRemaining} days left
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {account.plan_status === 'trial' && account.trial_end_date
                                ? `Ends ${format(new Date(account.trial_end_date), 'MMM d')}`
                                : account.founders_end_date
                                ? `Ends ${format(new Date(account.founders_end_date), 'MMM d')}`
                                : ''}
                            </div>
                          </div>
                        ) : account.plan_status === 'cancelled' ? (
                          <div className="text-xs text-muted-foreground">
                            Cancelled {account.cancelled_at
                              ? formatDistanceToNow(new Date(account.cancelled_at), { addSuffix: true })
                              : ''}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-foreground">
                          {format(new Date(account.created_at), 'MMM d, yyyy')}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(account.created_at), { addSuffix: true })}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/admin/accounts/${account.id}`} className="flex items-center gap-2 cursor-pointer">
                                  <Eye className="h-4 w-4" />
                                  View Details
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleImpersonate(account.id)}
                                disabled={actionLoading}
                                className="flex items-center gap-2 cursor-pointer"
                              >
                                <UserCog className="h-4 w-4" />
                                Impersonate
                              </DropdownMenuItem>
                              {account.plan_status === 'trial' && (
                                <DropdownMenuItem
                                  onClick={() => openExtendTrialDialog(account.id)}
                                  disabled={actionLoading}
                                  className="flex items-center gap-2 cursor-pointer"
                                >
                                  <RefreshCw className="h-4 w-4" />
                                  Extend Trial
                                </DropdownMenuItem>
                              )}
                              {account.plan_status !== 'cancelled' && (
                                <DropdownMenuItem
                                  onClick={() => openCancelDialog(account.id)}
                                  disabled={actionLoading}
                                  className="flex items-center gap-2 text-red-600 cursor-pointer focus:text-red-600"
                                >
                                  <Ban className="h-4 w-4" />
                                  Cancel Account
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
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
          <div className="px-4 py-3 border-t border-border flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {((page - 1) * perPage) + 1} to {Math.min(page * perPage, total)} of {total}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Extend Trial Dialog */}
      <AlertDialog open={extendTrialDialog.open} onOpenChange={(open) => !open && setExtendTrialDialog({ open: false, accountId: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Extend Trial</AlertDialogTitle>
            <AlertDialogDescription>
              This will extend the trial period by 7 days. The customer will receive additional time to evaluate the platform.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmExtendTrial} disabled={actionLoading}>
              {actionLoading ? 'Extending...' : 'Extend Trial'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Account Dialog */}
      <AlertDialog open={cancelDialog.open} onOpenChange={(open) => !open && setCancelDialog({ open: false, accountId: null, reason: '' })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Account</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel the customer&apos;s account. They will lose access to the platform. This action can be undone by reactivating the account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="cancel-reason">Cancellation Reason (Optional)</Label>
            <Input
              id="cancel-reason"
              value={cancelDialog.reason}
              onChange={(e) => setCancelDialog({ ...cancelDialog, reason: e.target.value })}
              placeholder="Enter reason for cancellation..."
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancelAccount} disabled={actionLoading} className="bg-red-600 hover:bg-red-700">
              {actionLoading ? 'Cancelling...' : 'Cancel Account'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Error Dialog */}
      <AlertDialog open={errorDialog.open} onOpenChange={(open) => !open && setErrorDialog({ open: false, message: '' })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Error</AlertDialogTitle>
            <AlertDialogDescription>{errorDialog.message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setErrorDialog({ open: false, message: '' })}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
