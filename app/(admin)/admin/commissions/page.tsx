'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  RefreshCcw,
  TrendingUp,
  Check,
  BarChart3,
  Users,
} from 'lucide-react';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminPageHeader } from '@/components/admin/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import { showSuccess, showError } from '@/lib/toast';
import { useOptimizedFetch } from '@/lib/hooks/use-optimized-fetch';

// Dynamic import for heavy component - only loaded when tab is active
const CommissionTracker = dynamic(
  () => import('@/components/admin/commission-tracker').then(mod => ({ default: mod.CommissionTracker })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }
);

interface Commission {
  id: string;
  agent_id: string;
  sale_type: string;
  plan_type: string;
  billing_interval: string;
  sale_amount: number;
  commission_type: string;
  commission_amount: number;
  payment_number?: number;
  status: string;
  eligible_at?: string;
  approved_at?: string;
  paid_at?: string;
  sale_date: string;
  agent?: { full_name: string };
  crm_account?: { business_name: string };
  web_customer?: { business_name: string };
}

interface CommissionSummary {
  pending: number;
  eligible: number;
  approved: number;
  paid_ytd: number;
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  eligible: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  forfeited: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const typeLabels: Record<string, string> = {
  upfront: 'Upfront',
  recurring: 'Recurring',
  annual_onetime: 'Annual',
  retention: 'Retention',
  performance_bonus: 'Bonus',
};

interface CommissionsResponse {
  commissions: Commission[];
  total: number;
}

export default function CommissionsPage() {
  const { confirm } = useConfirmDialog();
  const [summary, setSummary] = useState<CommissionSummary | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [isAdmin, setIsAdmin] = useState(false);
  const [paymentRef, setPaymentRef] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Memoized fetcher function for commissions
  const commissionsFetcher = useCallback(async (): Promise<CommissionsResponse> => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: '25',
    });
    if (statusFilter) params.append('status', statusFilter);
    if (typeFilter) params.append('type', typeFilter);

    const res = await fetch(`/api/admin/commissions?${params}`);
    if (!res.ok) throw new Error('Failed to fetch commissions');
    const data = await res.json();
    return {
      commissions: data.commissions || [],
      total: data.total || 0,
    };
  }, [page, statusFilter, typeFilter]);

  // Use optimized fetch with caching and revalidation
  const {
    data,
    error: fetchError,
    isLoading,
    isValidating,
    refetch,
  } = useOptimizedFetch<CommissionsResponse>(
    `admin-commissions-${page}-${statusFilter}-${typeFilter}`,
    commissionsFetcher,
    {
      staleTime: 60000, // Cache for 1 minute
      refetchOnFocus: true,
      deps: [page, statusFilter, typeFilter],
    }
  );

  const commissions = data?.commissions || [];
  const total = data?.total || 0;
  const loading = isLoading && !data;
  const error = fetchError?.message || null;

  useEffect(() => {
    fetchSummary();
    checkRole();
  }, []);

  async function checkRole() {
    try {
      const res = await fetch('/api/admin/auth/me');
      if (res.ok) {
        const data = await res.json();
        setIsAdmin(['super_admin', 'admin', 'finance'].includes(data.user?.role));
      }
    } catch {
      // Silently handle auth check failure
    }
  }

  async function fetchSummary() {
    try {
      const res = await fetch('/api/admin/dashboard');
      if (res.ok) {
        const data = await res.json();
        if (data.stats) {
          setSummary({
            pending: data.stats.pendingCommissions || 0,
            eligible: data.stats.commissionsEligible || 0,
            approved: 0,
            paid_ytd: data.stats.commissionsPaidYtd || 0,
          });
        }
      }
    } catch {
      // Silently handle summary fetch failure
    }
  }

  function handleBatchApprove() {
    if (selectedIds.length === 0) return;

    // Calculate total amount being approved
    const totalAmount = commissions
      .filter(c => selectedIds.includes(c.id))
      .reduce((sum, c) => sum + c.commission_amount, 0);

    confirm({
      title: 'Approve Commissions',
      description: `You are about to approve ${selectedIds.length} commission(s) totaling $${totalAmount.toLocaleString()}. This action cannot be undone.`,
      confirmLabel: 'Approve',
      onConfirm: async () => {
        setProcessing(true);
        try {
          const res = await fetch('/api/admin/commissions/batch/approve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ commission_ids: selectedIds }),
          });
          if (!res.ok) throw new Error('Failed to approve commissions');
          showSuccess(`${selectedIds.length} commission(s) approved successfully`);
          setSelectedIds([]);
          refetch();
        } catch (err: unknown) {
          showError(err instanceof Error ? err.message : 'Failed to approve commissions');
        } finally {
          setProcessing(false);
        }
      },
    });
  }

  function handleBatchPayClick() {
    if (selectedIds.length === 0) return;
    setPaymentRef('');
    setShowPaymentModal(true);
  }

  async function handleBatchPayConfirm() {
    // Calculate total amount being paid
    const totalAmount = commissions
      .filter(c => selectedIds.includes(c.id))
      .reduce((sum, c) => sum + c.commission_amount, 0);

    setShowPaymentModal(false);

    confirm({
      title: 'Confirm Payout',
      description: `You are about to mark ${selectedIds.length} commission(s) as paid, totaling $${totalAmount.toLocaleString()}. This action cannot be undone.`,
      confirmLabel: 'Process Payout',
      onConfirm: async () => {
        setProcessing(true);
        try {
          const res = await fetch('/api/admin/commissions/batch/pay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              commission_ids: selectedIds,
              payment_method: 'manual',
              payment_reference: paymentRef || undefined,
            }),
          });
          if (!res.ok) throw new Error('Failed to mark commissions as paid');
          showSuccess(`${selectedIds.length} commission(s) marked as paid`);
          setSelectedIds([]);
          refetch();
        } catch (err: unknown) {
          showError(err instanceof Error ? err.message : 'Failed to process payout');
        } finally {
          setProcessing(false);
        }
      },
    });
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === commissions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(commissions.map(c => c.id));
    }
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="p-4 bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <AdminPageHeader
        title="Commissions"
        description="Track and manage sales commissions"
        icon={DollarSign}
      />

      {/* View Tabs - My Tracker for agents, Admin for admins */}
      <Tabs defaultValue={isAdmin ? 'admin' : 'tracker'} className="w-full">
        <TabsList>
          <TabsTrigger value="tracker" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            My Commission Tracker
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="admin" className="gap-2">
              <Users className="h-4 w-4" />
              Admin View
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="tracker" className="mt-6">
          <CommissionTracker />
        </TabsContent>

        <TabsContent value="admin" className="mt-6 space-y-6">
          {/* Admin-only batch actions */}
          {isAdmin && selectedIds.length > 0 && (
            <div className="flex items-center justify-end gap-2">
              <Button
                onClick={handleBatchApprove}
                disabled={processing}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                <Check className="h-4 w-4 mr-2" />
                Approve ({selectedIds.length})
              </Button>
              <Button
                onClick={handleBatchPayClick}
                disabled={processing}
                className="bg-green-600 text-white hover:bg-green-700"
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Mark Paid ({selectedIds.length})
              </Button>
            </div>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                    <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-foreground">
                      ${summary?.pending?.toLocaleString() || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Pending</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-foreground">
                      ${summary?.eligible?.toLocaleString() || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Eligible</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-foreground">
                      ${summary?.approved?.toLocaleString() || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Approved</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                    <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-foreground">
                      ${summary?.paid_ytd?.toLocaleString() || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Paid YTD</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="p-4 flex flex-col sm:flex-row gap-4">
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="px-4 py-2 border border-input bg-background text-foreground rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="eligible">Eligible</option>
                <option value="approved">Approved</option>
                <option value="paid">Paid</option>
                <option value="forfeited">Forfeited</option>
              </select>
              <select
                value={typeFilter}
                onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
                className="px-4 py-2 border border-input bg-background text-foreground rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              >
                <option value="">All Types</option>
                <option value="upfront">Upfront</option>
                <option value="recurring">Recurring</option>
                <option value="annual_onetime">Annual</option>
                <option value="retention">Retention</option>
              </select>
              <Button
                variant="outline"
                onClick={() => refetch()}
                disabled={isValidating}
                className="flex items-center gap-2"
              >
                <RefreshCcw className={`h-4 w-4 ${isValidating ? 'animate-spin' : ''}`} />
                {isValidating ? 'Refreshing...' : 'Refresh'}
              </Button>
            </CardContent>
          </Card>

          {/* Commissions Table */}
          <Card className="overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : commissions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p>No commissions found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      {isAdmin && (
                        <th className="px-4 py-3 text-left">
                          <Checkbox
                            checked={selectedIds.length === commissions.length}
                            onCheckedChange={toggleSelectAll}
                          />
                        </th>
                      )}
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                        Customer
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                        Type
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                        Amount
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                        Sale Date
                      </th>
                      {isAdmin && (
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                          Agent
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {commissions.map((commission) => (
                      <tr key={commission.id} className="hover:bg-muted/30">
                        {isAdmin && (
                          <td className="px-4 py-3">
                            <Checkbox
                              checked={selectedIds.includes(commission.id)}
                              onCheckedChange={() => toggleSelect(commission.id)}
                            />
                          </td>
                        )}
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">
                            {commission.crm_account?.business_name ||
                             commission.web_customer?.business_name ||
                             'Unknown'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {commission.sale_type.toUpperCase()} • {commission.plan_type}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-foreground">
                            {typeLabels[commission.commission_type] || commission.commission_type}
                          </span>
                          {commission.payment_number && (
                            <span className="text-xs text-muted-foreground ml-1">
                              #{commission.payment_number}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-foreground">
                            ${commission.commission_amount.toLocaleString()}
                          </span>
                          <div className="text-xs text-muted-foreground">
                            from ${commission.sale_amount.toLocaleString()}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="secondary"
                            className={`${statusColors[commission.status]} border-0 font-normal`}
                          >
                            {commission.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {format(new Date(commission.sale_date), 'MMM d, yyyy')}
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {commission.agent?.full_name || 'N/A'}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {total > 25 && (
              <div className="px-4 py-3 border-t border-border flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {(page - 1) * 25 + 1} - {Math.min(page * 25, total)} of {total}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => p + 1)}
                    disabled={page * 25 >= total}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Payment Reference Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-xl max-w-md w-full mx-4 p-6 border border-border">
            <h2 className="text-xl font-bold text-foreground mb-4">Payment Reference</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Enter an optional payment reference (check number, wire reference, etc.)
            </p>
            <Input
              value={paymentRef}
              onChange={(e) => setPaymentRef(e.target.value)}
              placeholder="e.g., Check #12345 or Wire REF-001"
              className="mb-4"
              autoFocus
            />
            <div className="flex items-center justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowPaymentModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleBatchPayConfirm}
                className="bg-green-600 hover:bg-green-700"
              >
                Continue
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
