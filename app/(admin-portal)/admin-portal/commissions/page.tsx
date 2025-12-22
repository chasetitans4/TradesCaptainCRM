'use client';

import { useState, useEffect } from 'react';
import {
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Filter,
  RefreshCcw,
  TrendingUp,
  Calendar,
  Download,
  Check,
} from 'lucide-react';
import { format } from 'date-fns';

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
  pending: 'bg-yellow-100 text-yellow-700',
  eligible: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700',
  paid: 'bg-emerald-100 text-emerald-700',
  forfeited: 'bg-red-100 text-red-700',
};

const typeLabels: Record<string, string> = {
  upfront: 'Upfront',
  recurring: 'Recurring',
  annual_onetime: 'Annual',
  retention: 'Retention',
  performance_bonus: 'Bonus',
};

export default function CommissionsPage() {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [summary, setSummary] = useState<CommissionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetchCommissions();
    fetchSummary();
    checkRole();
  }, [page, statusFilter, typeFilter]);

  async function checkRole() {
    try {
      const res = await fetch('/api/admin/me');
      if (res.ok) {
        const data = await res.json();
        setIsAdmin(['super_admin', 'admin', 'finance'].includes(data.admin?.role));
      }
    } catch {}
  }

  async function fetchCommissions() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '25',
      });
      if (statusFilter) params.append('status', statusFilter);
      if (typeFilter) params.append('type', typeFilter);

      const res = await fetch(`/api/admin/commissions?${params}`);
      if (!res.ok) throw new Error('Failed to fetch commissions');
      const data = await res.json();
      setCommissions(data.commissions || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
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
    } catch {}
  }

  async function handleBatchApprove() {
    if (selectedIds.length === 0) return;
    try {
      const res = await fetch('/api/admin/commissions/batch/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commission_ids: selectedIds }),
      });
      if (!res.ok) throw new Error('Failed to approve commissions');
      setSelectedIds([]);
      fetchCommissions();
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handleBatchPay() {
    if (selectedIds.length === 0) return;
    const paymentRef = prompt('Enter payment reference (optional):');
    try {
      const res = await fetch('/api/admin/commissions/batch/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commission_ids: selectedIds,
          payment_method: 'manual',
          payment_reference: paymentRef,
        }),
      });
      if (!res.ok) throw new Error('Failed to mark commissions as paid');
      setSelectedIds([]);
      fetchCommissions();
    } catch (err: any) {
      alert(err.message);
    }
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
      <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
        <AlertCircle className="h-5 w-5" />
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Commissions</h1>
          <p className="text-gray-500">Track and manage sales commissions</p>
        </div>
        {isAdmin && selectedIds.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleBatchApprove}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Check className="h-4 w-4" />
              Approve ({selectedIds.length})
            </button>
            <button
              onClick={handleBatchPay}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <DollarSign className="h-4 w-4" />
              Mark Paid ({selectedIds.length})
            </button>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                ${summary?.pending?.toLocaleString() || 0}
              </div>
              <div className="text-sm text-gray-500">Pending</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                ${summary?.eligible?.toLocaleString() || 0}
              </div>
              <div className="text-sm text-gray-500">Eligible</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                ${summary?.approved?.toLocaleString() || 0}
              </div>
              <div className="text-sm text-gray-500">Approved</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <DollarSign className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                ${summary?.paid_ytd?.toLocaleString() || 0}
              </div>
              <div className="text-sm text-gray-500">Paid YTD</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
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
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
        >
          <option value="">All Types</option>
          <option value="upfront">Upfront</option>
          <option value="recurring">Recurring</option>
          <option value="annual_onetime">Annual</option>
          <option value="retention">Retention</option>
        </select>
        <button
          onClick={fetchCommissions}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
        >
          <RefreshCcw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Commissions Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : commissions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No commissions found</p>
          </div>
        ) : (
          <table className="w-full min-w-[700px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {isAdmin && (
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === commissions.length}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300"
                    />
                  </th>
                )}
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Customer
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Amount
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Sale Date
                </th>
                {isAdmin && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Agent
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {commissions.map((commission) => (
                <tr key={commission.id} className="hover:bg-gray-50">
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(commission.id)}
                        onChange={() => toggleSelect(commission.id)}
                        className="rounded border-gray-300"
                      />
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">
                      {commission.crm_account?.business_name ||
                       commission.web_customer?.business_name ||
                       'Unknown'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {commission.sale_type.toUpperCase()} • {commission.plan_type}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-900">
                      {typeLabels[commission.commission_type] || commission.commission_type}
                    </span>
                    {commission.payment_number && (
                      <span className="text-xs text-gray-500 ml-1">
                        #{commission.payment_number}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-900">
                      ${commission.commission_amount.toLocaleString()}
                    </span>
                    <div className="text-xs text-gray-500">
                      from ${commission.sale_amount.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${statusColors[commission.status]}`}>
                      {commission.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {format(new Date(commission.sale_date), 'MMM d, yyyy')}
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {commission.agent?.full_name || 'N/A'}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {total > 25 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {(page - 1) * 25 + 1} - {Math.min(page * 25, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page * 25 >= total}
              className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
