'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Search,
  FileText,
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle,
  Send,
  Eye,
  AlertTriangle,
  Loader2,
  DollarSign,
  AlertCircle,
} from 'lucide-react';
import { createClient, getCurrentUserProfile } from '@/lib/supabase/client';
import { cn, formatRelativeDate } from '@/lib/utils';
import type { UserWithBusiness } from '@/types';

interface Invoice {
  id: string;
  invoice_number: string;
  status: string;
  total: number;
  amount_due: number;
  due_date: string | null;
  created_at: string;
  sent_at: string | null;
  paid_at: string | null;
  customer: {
    id: string;
    name: string;
  } | { id: string; name: string }[] | null;
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  draft: { label: 'Draft', icon: FileText, color: 'text-muted-foreground bg-muted' },
  sent: { label: 'Sent', icon: Send, color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30' },
  viewed: { label: 'Viewed', icon: Eye, color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30' },
  paid: { label: 'Paid', icon: CheckCircle, color: 'text-green-600 bg-green-100 dark:bg-green-900/30' },
  partial: { label: 'Partial', icon: DollarSign, color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30' },
  overdue: { label: 'Overdue', icon: AlertTriangle, color: 'text-red-600 bg-red-100 dark:bg-red-900/30' },
  void: { label: 'Void', icon: XCircle, color: 'text-gray-500 bg-gray-100 dark:bg-gray-800' },
};

const FILTER_TABS = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Drafts' },
  { value: 'sent', label: 'Sent' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
];

// Helper to get customer name from possibly array or object
function getCustomerName(customer: Invoice['customer']): string | undefined {
  if (!customer) return undefined;
  if (Array.isArray(customer)) {
    return customer[0]?.name;
  }
  return customer.name;
}

export default function InvoicesPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserWithBusiness | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const profile = await getCurrentUserProfile();
    if (!profile) {
      router.push('/login');
      return;
    }
    setUser(profile as UserWithBusiness);
    loadInvoices(profile.business_id);
  };

  const loadInvoices = async (businessId: string) => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        id,
        invoice_number,
        status,
        total,
        amount_due,
        due_date,
        created_at,
        sent_at,
        paid_at,
        customer:customers (id, name)
      `)
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (!error) {
      // Check for overdue invoices
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const processedInvoices = (data || []).map((invoice) => {
        // Mark as overdue if past due date and not paid
        if (
          invoice.due_date &&
          new Date(invoice.due_date) < today &&
          invoice.amount_due > 0 &&
          !['paid', 'void', 'overdue'].includes(invoice.status)
        ) {
          return { ...invoice, status: 'overdue' };
        }
        return invoice;
      });

      setInvoices(processedInvoices);
    }
    setLoading(false);
  };

  // Filter invoices
  const filteredInvoices = invoices.filter((invoice) => {
    // Status filter
    if (activeFilter !== 'all' && invoice.status !== activeFilter) {
      return false;
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchesNumber = invoice.invoice_number?.toLowerCase().includes(query);
      const matchesCustomer = getCustomerName(invoice.customer)?.toLowerCase().includes(query);
      if (!matchesNumber && !matchesCustomer) {
        return false;
      }
    }

    return true;
  });

  // Get counts for tabs
  const getCounts = () => {
    const counts: Record<string, number> = { all: invoices.length };
    invoices.forEach((inv) => {
      counts[inv.status] = (counts[inv.status] || 0) + 1;
    });
    return counts;
  };
  const counts = getCounts();

  // Calculate totals
  const totals = {
    outstanding: invoices
      .filter((inv) => !['paid', 'void', 'draft'].includes(inv.status))
      .reduce((sum, inv) => sum + (inv.amount_due || 0), 0),
    overdue: invoices
      .filter((inv) => inv.status === 'overdue')
      .reduce((sum, inv) => sum + (inv.amount_due || 0), 0),
  };

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold">Invoices</h1>
            <Link
              href="/invoices/new"
              className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span className="text-sm font-medium">New Invoice</span>
            </Link>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Outstanding</p>
              <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
                ${totals.outstanding.toFixed(2)}
              </p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
              <p className="text-xs text-red-600 dark:text-red-400 font-medium">Overdue</p>
              <p className="text-lg font-bold text-red-700 dark:text-red-300">
                ${totals.overdue.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search invoices..."
              className="w-full pl-10 pr-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveFilter(tab.value)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                  activeFilter === tab.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                {tab.label}
                {counts[tab.value] > 0 && (
                  <span className="ml-1.5 opacity-70">({counts[tab.value]})</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Invoices List */}
      <div className="divide-y divide-border">
        {filteredInvoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-1">
              {searchQuery || activeFilter !== 'all'
                ? 'No invoices found'
                : 'No invoices yet'}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery || activeFilter !== 'all'
                ? 'Try adjusting your search or filter'
                : 'Create your first invoice to get started'}
            </p>
            {!searchQuery && activeFilter === 'all' && (
              <Link
                href="/invoices/new"
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Create Invoice
              </Link>
            )}
          </div>
        ) : (
          filteredInvoices.map((invoice) => {
            const statusConfig = STATUS_CONFIG[invoice.status] || STATUS_CONFIG.draft;
            const StatusIcon = statusConfig.icon;
            const isOverdue = invoice.status === 'overdue';

            return (
              <Link
                key={invoice.id}
                href={`/invoices/${invoice.id}`}
                className={cn(
                  'flex items-center gap-4 p-4 hover:bg-muted/50 active:bg-muted transition-colors',
                  isOverdue && 'bg-red-50/50 dark:bg-red-900/10'
                )}
              >
                <div className={cn('p-2 rounded-lg', statusConfig.color)}>
                  <StatusIcon className="h-5 w-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{invoice.invoice_number || 'Invoice'}</span>
                    {isOverdue && (
                      <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded font-medium">
                        Overdue
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {getCustomerName(invoice.customer) || 'No customer'}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    {invoice.due_date && (
                      <span className={cn(isOverdue && 'text-red-600 dark:text-red-400')}>
                        Due {new Date(invoice.due_date).toLocaleDateString()}
                      </span>
                    )}
                    {invoice.paid_at && (
                      <span className="text-green-600 dark:text-green-400">
                        Paid {formatRelativeDate(invoice.paid_at)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <p className="font-semibold">${invoice.total?.toFixed(2) || '0.00'}</p>
                  {invoice.status !== 'paid' && invoice.amount_due > 0 && invoice.amount_due < invoice.total && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      ${invoice.amount_due.toFixed(2)} due
                    </p>
                  )}
                  <p
                    className={cn(
                      'text-xs capitalize',
                      statusConfig.color.split(' ')[0]
                    )}
                  >
                    {statusConfig.label}
                  </p>
                </div>

                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
