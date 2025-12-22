'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Globe,
  Search,
  AlertCircle,
  Loader2,
  RefreshCcw,
  Building2,
  Mail,
  Phone,
  Calendar,
  ExternalLink,
  MoreVertical,
  DollarSign,
} from 'lucide-react';
import { format } from 'date-fns';

interface WebCustomer {
  id: string;
  business_name: string;
  contact_name: string;
  email: string;
  phone?: string;
  plan_type: string;
  billing_interval: string;
  status: string;
  mrr: number;
  stripe_customer_id?: string;
  created_at: string;
  agent?: { full_name: string };
}

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  trial: 'bg-yellow-100 text-yellow-700',
  cancelled: 'bg-red-100 text-red-700',
  paused: 'bg-gray-100 text-gray-700',
};

const planColors: Record<string, string> = {
  starter: 'bg-blue-100 text-blue-700',
  professional: 'bg-purple-100 text-purple-700',
  enterprise: 'bg-amber-100 text-amber-700',
};

export default function WebCustomersPage() {
  const [customers, setCustomers] = useState<WebCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchCustomers();
  }, [page, statusFilter]);

  async function fetchCustomers() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '25',
        type: 'web',
      });
      if (statusFilter) params.append('status', statusFilter);

      const res = await fetch(`/api/admin/web-customers?${params}`);
      if (!res.ok) throw new Error('Failed to fetch web customers');
      const data = await res.json();
      setCustomers(data.customers || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const filteredCustomers = customers.filter(customer =>
    customer.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <h1 className="text-2xl font-bold text-gray-900">Web Customers</h1>
          <p className="text-gray-500">Manage website/web app customers</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search customers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="trial">Trial</option>
          <option value="cancelled">Cancelled</option>
          <option value="paused">Paused</option>
        </select>
        <button
          onClick={fetchCustomers}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
        >
          <RefreshCcw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Customers Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-white rounded-xl border border-gray-200">
          <Globe className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>No web customers found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map((customer) => (
            <div
              key={customer.id}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <Globe className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{customer.business_name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${planColors[customer.plan_type] || 'bg-gray-100 text-gray-700'}`}>
                        {customer.plan_type}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[customer.status]}`}>
                        {customer.status}
                      </span>
                    </div>
                  </div>
                </div>
                <button className="p-1 hover:bg-gray-100 rounded">
                  <MoreVertical className="h-4 w-4 text-gray-400" />
                </button>
              </div>

              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-gray-400" />
                  {customer.contact_name}
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  {customer.email}
                </div>
                {customer.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    {customer.phone}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  Joined {format(new Date(customer.created_at), 'MMM d, yyyy')}
                </div>
              </div>

              <div className="border-t border-gray-100 my-4" />

              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1 text-gray-500 text-sm">
                    <DollarSign className="h-4 w-4" />
                    MRR
                  </div>
                  <div className="font-medium text-gray-900">
                    ${customer.mrr?.toLocaleString() || 0}/{customer.billing_interval === 'annual' ? 'yr' : 'mo'}
                  </div>
                </div>
                {customer.agent && (
                  <div className="text-right">
                    <div className="text-xs text-gray-500">Agent</div>
                    <div className="text-sm text-gray-700">{customer.agent.full_name}</div>
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center gap-2">
                <Link
                  href={`/admin-portal/web-customers/${customer.id}`}
                  className="flex-1 px-3 py-2 text-center text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  View Details
                </Link>
                {customer.stripe_customer_id && (
                  <a
                    href={`https://dashboard.stripe.com/customers/${customer.stripe_customer_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Stripe
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

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
