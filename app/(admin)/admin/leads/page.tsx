'use client';

import { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  Target,
  Plus,
  Search,
  Phone,
  Mail,
  Building2,
  ChevronRight,
  AlertCircle,
  Loader2,
  RefreshCcw,
  Upload,
} from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { AdminPageHeader } from '@/components/admin/page-header';
import { useAgentOrHigher } from '@/hooks/useAdminAuth';
import { useOptimizedFetch } from '@/lib/hooks/use-optimized-fetch';

// Dynamic imports for modals - only loaded when opened
const AddLeadModal = dynamic(
  () => import('@/components/admin/add-lead-modal').then(mod => ({ default: mod.AddLeadModal })),
  { ssr: false }
);
const BatchUploadModal = dynamic(
  () => import('@/components/admin/batch-upload-modal').then(mod => ({ default: mod.BatchUploadModal })),
  { ssr: false }
);

interface Lead {
  id: string;
  company_name: string;
  contact_name: string;
  email?: string;
  phone?: string;
  trade_type?: string;
  status: string;
  interested_in?: string[];
  last_contact_at?: string;
  next_followup_at?: string;
  contact_count: number;
  created_at: string;
  agent?: { full_name: string };
}

const statusColors: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700',
  contacted: 'bg-yellow-100 text-yellow-700',
  qualified: 'bg-green-100 text-green-700',
  proposal_sent: 'bg-purple-100 text-purple-700',
  negotiating: 'bg-orange-100 text-orange-700',
  won: 'bg-emerald-100 text-emerald-700',
  lost: 'bg-red-100 text-red-700',
  unqualified: 'bg-gray-100 text-gray-700',
  dormant: 'bg-gray-100 text-gray-500',
};

interface LeadsResponse {
  leads: Lead[];
  total: number;
}

export default function LeadsPage() {
  const { loading: authLoading, isAuthorized } = useAgentOrHigher();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [batchModalOpen, setBatchModalOpen] = useState(false);

  // Memoized fetcher function
  const fetcher = useCallback(async (): Promise<LeadsResponse> => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: '25',
    });
    if (statusFilter) params.append('status', statusFilter);

    const res = await fetch(`/api/admin/leads?${params}`);
    if (!res.ok) throw new Error('Failed to fetch leads');
    const data = await res.json();
    return {
      leads: data.leads || [],
      total: data.total || 0,
    };
  }, [page, statusFilter]);

  // Use optimized fetch with caching and revalidation
  const {
    data,
    error: fetchError,
    isLoading,
    isValidating,
    refetch,
  } = useOptimizedFetch<LeadsResponse>(
    `admin-leads-${page}-${statusFilter}`,
    fetcher,
    {
      staleTime: 60000, // Cache for 1 minute
      refetchOnFocus: true,
      deps: [page, statusFilter, isAuthorized],
    }
  );

  const leads = data?.leads || [];
  const total = data?.total || 0;
  const loading = isLoading && !data;
  const error = fetchError?.message || null;

  // Memoize filtered leads to avoid recalculating on every render
  const filteredLeads = useMemo(() => {
    const search = searchTerm.toLowerCase();
    return leads.filter(lead =>
      lead.company_name.toLowerCase().includes(search) ||
      lead.contact_name.toLowerCase().includes(search) ||
      lead.email?.toLowerCase().includes(search)
    );
  }, [leads, searchTerm]);

  if (authLoading || !isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="p-6 border-b border-border bg-background">
        <AdminPageHeader
          title="Sales Leads"
          description="Manage and track your sales pipeline."
          icon={Target}
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setBatchModalOpen(true)}
                className="flex items-center gap-2"
                aria-label="Batch upload leads"
              >
                <Upload className="h-4 w-4" />
                Batch Upload
              </Button>
              <Button
                onClick={() => setAddModalOpen(true)}
                className="flex items-center gap-2"
                aria-label="Add new lead"
              >
                <Plus className="h-4 w-4" />
                Add Lead
              </Button>
            </div>
          }
        />
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {error && (
          <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="">All Status</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="qualified">Qualified</option>
            <option value="proposal_sent">Proposal Sent</option>
            <option value="negotiating">Negotiating</option>
            <option value="won">Won</option>
            <option value="lost">Lost</option>
          </select>
          <button
            onClick={() => refetch()}
            disabled={isValidating}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCcw className={`h-4 w-4 ${isValidating ? 'animate-spin' : ''}`} />
            {isValidating ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {/* Leads List */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Target className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No leads found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredLeads.map((lead) => (
                <Link
                  key={lead.id}
                  href={`/admin/leads/${lead.id}`}
                  className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Building2 className="h-5 w-5 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900 truncate">{lead.company_name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[lead.status] || 'bg-gray-100 text-gray-700'}`}>
                        {lead.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                      <span>{lead.contact_name}</span>
                      {lead.trade_type && (
                        <span className="text-gray-400">• {lead.trade_type}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-400 mt-1">
                      {lead.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {lead.email}
                        </span>
                      )}
                      {lead.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {lead.phone}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <div className="text-gray-500">
                      {lead.contact_count} contacts
                    </div>
                    {lead.next_followup_at && (
                      <div className="text-xs text-orange-600 mt-1">
                        Follow-up: {format(new Date(lead.next_followup_at), 'MMM d')}
                      </div>
                    )}
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </Link>
              ))}
            </div>
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

      {/* Add Lead Modal */}
      <AddLeadModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        onSuccess={() => refetch()}
      />

      {/* Batch Upload Modal */}
      <BatchUploadModal
        open={batchModalOpen}
        onOpenChange={setBatchModalOpen}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
