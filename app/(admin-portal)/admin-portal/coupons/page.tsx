'use client';

import { useState, useEffect } from 'react';
import {
  Ticket,
  Plus,
  Search,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  RefreshCcw,
  XCircle,
  Clock,
  CheckCircle,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface Coupon {
  id: string;
  code: string;
  web_customer_id: string;
  web_plan_type: string;
  crm_plan: string;
  free_months: number;
  status: string;
  redeemed_at?: string;
  expires_at?: string;
  created_at: string;
}

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  redeemed: 'bg-blue-100 text-blue-700',
  expired: 'bg-gray-100 text-gray-700',
  revoked: 'bg-red-100 text-red-700',
};

const statusIcons: Record<string, any> = {
  active: CheckCircle,
  redeemed: Check,
  expired: Clock,
  revoked: XCircle,
};

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchCoupons();
  }, [page, statusFilter]);

  async function fetchCoupons() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '25',
      });
      if (statusFilter) params.append('status', statusFilter);

      const res = await fetch(`/api/admin/coupons?${params}`);
      if (!res.ok) throw new Error('Failed to fetch coupons');
      const data = await res.json();
      setCoupons(data.coupons || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  async function revokeCoupon(id: string) {
    if (!confirm('Are you sure you want to revoke this coupon?')) return;
    try {
      const res = await fetch(`/api/admin/coupons/${id}/revoke`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to revoke coupon');
      fetchCoupons();
    } catch (err: any) {
      alert(err.message);
    }
  }

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
          <h1 className="text-2xl font-bold text-gray-900">CRM Coupons</h1>
          <p className="text-gray-500">Free CRM with Web Plan promotion codes</p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Ticket className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-900">Free CRM with Web Plan</h3>
            <p className="text-sm text-blue-700 mt-1">
              Coupons are automatically generated when a Web plan customer is created.
              Each coupon provides 12 months of free CRM access and expires after 30 days if not redeemed.
            </p>
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
          <option value="active">Active</option>
          <option value="redeemed">Redeemed</option>
          <option value="expired">Expired</option>
          <option value="revoked">Revoked</option>
        </select>
        <button
          onClick={fetchCoupons}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
        >
          <RefreshCcw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Coupons List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : coupons.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Ticket className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No coupons found</p>
          </div>
        ) : (
          <table className="w-full min-w-[700px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Coupon Code
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Web Plan
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  CRM Plan
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Free Months
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Expires
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {coupons.map((coupon) => {
                const StatusIcon = statusIcons[coupon.status] || AlertCircle;
                return (
                  <tr key={coupon.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <code className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                          {coupon.code}
                        </code>
                        <button
                          onClick={() => copyCode(coupon.code)}
                          className="p-1 hover:bg-gray-200 rounded"
                          title="Copy code"
                        >
                          {copiedCode === coupon.code ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {coupon.web_plan_type}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {coupon.crm_plan}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {coupon.free_months} months
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${statusColors[coupon.status]}`}>
                        <StatusIcon className="h-3 w-3" />
                        {coupon.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {coupon.expires_at ? (
                        <span className={new Date(coupon.expires_at) < new Date() ? 'text-red-500' : ''}>
                          {format(new Date(coupon.expires_at), 'MMM d, yyyy')}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {coupon.status === 'active' && (
                        <button
                          onClick={() => revokeCoupon(coupon.id)}
                          className="text-sm text-red-600 hover:text-red-800"
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
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
