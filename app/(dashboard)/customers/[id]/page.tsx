'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient, getCurrentUserProfile } from '@/lib/supabase/client';
import { hasPermission } from '@/lib/permissions';
import {
  cn,
  formatRelativeDate,
  formatPhoneNumber,
  formatDate,
  formatCurrency,
  formatAddress,
} from '@/lib/utils';
import { getSmartNavigationUrl } from '@/lib/utils/navigation';
import { AddressLink } from '@/components/ui/address-link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { DocumentList } from '@/components/documents/document-list';
import type { UserWithBusiness, Customer, Lead, Job, Quote, Invoice } from '@/types';
import {
  ArrowLeft,
  Phone,
  MessageSquare,
  Mail,
  MapPin,
  ChevronRight,
  Edit2,
  MoreVertical,
  Briefcase,
  Users,
  FileText,
  DollarSign,
  Calendar,
  Clock,
  Plus,
  Trash2,
  Loader2,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { QuietCustomerFlag } from '@/components/customers/quiet-customer-flag';
import { MaintenanceAgreementTracker, useCustomerAgreement } from '@/components/customers';

interface CustomerWithStats extends Omit<Customer, 'total_jobs' | 'total_revenue'> {
  total_jobs?: number;
  total_revenue?: number;
}

export default function CustomerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const customerId = params.id as string;
  const { toast } = useToast();

  const [user, setUser] = useState<UserWithBusiness | null>(null);
  const [customer, setCustomer] = useState<CustomerWithStats | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'jobs' | 'leads' | 'quotes' | 'invoices' | 'documents'>('jobs');
  const [showActionsSheet, setShowActionsSheet] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Delete customer handler
  const handleDeleteCustomer = async () => {
    try {
      const response = await fetch(`/api/customers/${customerId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete customer');
      }

      toast({
        title: 'Customer deleted',
        description: 'The customer has been permanently deleted.',
      });

      router.push('/customers');
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete customer',
        variant: 'destructive',
      });
    }
  };

  // Load user
  useEffect(() => {
    async function loadUser() {
      const profile = await getCurrentUserProfile();
      if (!profile || !hasPermission(profile.role, 'view_customers')) {
        router.push('/dashboard');
        return;
      }
      setUser(profile as UserWithBusiness);
    }
    loadUser();
  }, [router]);

  // Load customer data
  const loadCustomer = useCallback(async () => {
    if (!user || !customerId) return;

    const supabase = createClient();

    try {
      // Load customer
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();

      if (customerError) throw customerError;
      setCustomer(customerData);

      // Load related data in parallel
      const [leadsRes, jobsRes, quotesRes, invoicesRes] = await Promise.all([
        supabase
          .from('leads')
          .select('*')
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('jobs')
          .select('*')
          .eq('customer_id', customerId)
          .order('scheduled_date', { ascending: false })
          .limit(10),
        supabase
          .from('quotes')
          .select('*')
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('invoices')
          .select('*')
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

      setLeads(leadsRes.data || []);
      setJobs(jobsRes.data || []);
      setQuotes(quotesRes.data || []);
      setInvoices(invoicesRes.data || []);
    } catch (error) {
      console.error('Error loading customer:', error);
      router.push('/customers');
    } finally {
      setLoading(false);
    }
  }, [user, customerId, router]);

  useEffect(() => {
    if (user && customerId) {
      loadCustomer();
    }
  }, [user, customerId, loadCustomer]);

  if (loading || !user || !customer) {
    return <CustomerDetailSkeleton />;
  }

  const address = formatAddress(
    customer.address_line1,
    customer.city,
    customer.state,
    customer.zip
  );

  const tabs = [
    { id: 'jobs', label: 'Jobs', count: jobs.length, icon: Briefcase },
    { id: 'leads', label: 'Leads', count: leads.length, icon: Users },
    { id: 'quotes', label: 'Quotes', count: quotes.length, icon: FileText },
    { id: 'invoices', label: 'Invoices', count: invoices.length, icon: DollarSign },
    { id: 'documents', label: 'Documents', count: 0, icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky-header bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-2 -ml-2">
              <ArrowLeft className="h-5 w-5 text-text" />
            </button>
            <div className="flex items-center gap-3">
              <Avatar fallback={customer.name?.charAt(0) || 'C'} size="md" />
              <div>
                <h1 className="text-lg font-semibold text-text truncate max-w-[180px]">
                  {customer.name}
                </h1>
                {customer.total_jobs !== undefined && customer.total_jobs > 0 && (
                  <p className="text-sm text-text-muted">
                    {customer.total_jobs} job{customer.total_jobs !== 1 ? 's' : ''} •{' '}
                    {formatCurrency(customer.total_revenue || 0)}
                  </p>
                )}
              </div>
            </div>
          </div>

          <Sheet open={showActionsSheet} onOpenChange={setShowActionsSheet}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon-sm">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="pb-safe">
              <SheetHeader>
                <SheetTitle>Actions</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-2">
                <Link href={`/customers/${customer.id}/edit`} className="w-full">
                  <Button variant="ghost" className="w-full justify-start gap-3">
                    <Edit2 className="h-5 w-5" />
                    Edit Customer
                  </Button>
                </Link>
                <Link href={`/leads/new?customer_id=${customer.id}`} className="w-full">
                  <Button variant="ghost" className="w-full justify-start gap-3">
                    <Users className="h-5 w-5" />
                    New Lead
                  </Button>
                </Link>
                <Link href={`/jobs/new?customer_id=${customer.id}`} className="w-full">
                  <Button variant="ghost" className="w-full justify-start gap-3">
                    <Briefcase className="h-5 w-5" />
                    New Job
                  </Button>
                </Link>
                <Link href={`/quotes/new?customer_id=${customer.id}`} className="w-full">
                  <Button variant="ghost" className="w-full justify-start gap-3">
                    <FileText className="h-5 w-5" />
                    New Quote
                  </Button>
                </Link>
                {hasPermission(user.role, 'manage_customers') && (
                  <>
                    <div className="border-t border-border my-2" />
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        setShowActionsSheet(false);
                        setShowDeleteConfirm(true);
                      }}
                    >
                      <Trash2 className="h-5 w-5" />
                      Delete Customer
                    </Button>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete Customer?"
        description={`Are you sure you want to delete "${customer.name}"? This action cannot be undone.`}
        confirmLabel="Delete Permanently"
        variant="destructive"
        icon={Trash2}
        onConfirm={handleDeleteCustomer}
      />

      {/* Main Content */}
      <div className="px-4 py-4 space-y-4">
        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-3">
          {customer.phone && (
            <a
              href={`tel:${customer.phone}`}
              className="card p-3 flex flex-col items-center gap-2 active:scale-95 transition-transform"
            >
              <div className="p-2 rounded-full bg-success/10">
                <Phone className="h-5 w-5 text-success" />
              </div>
              <span className="text-xs font-medium text-text">Call</span>
            </a>
          )}
          {customer.phone && (
            <a
              href={`sms:${customer.phone}`}
              className="card p-3 flex flex-col items-center gap-2 active:scale-95 transition-transform"
            >
              <div className="p-2 rounded-full bg-info/10">
                <MessageSquare className="h-5 w-5 text-info" />
              </div>
              <span className="text-xs font-medium text-text">Text</span>
            </a>
          )}
          {customer.email && (
            <a
              href={`mailto:${customer.email}`}
              className="card p-3 flex flex-col items-center gap-2 active:scale-95 transition-transform"
            >
              <div className="p-2 rounded-full bg-primary/10">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <span className="text-xs font-medium text-text">Email</span>
            </a>
          )}
        </div>

        {/* Contact Info */}
        <section className="card p-4">
          <h2 className="font-semibold text-text mb-3">Contact Info</h2>
          <div className="space-y-3">
            {customer.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-text-muted shrink-0" />
                <span className="text-text">{formatPhoneNumber(customer.phone)}</span>
              </div>
            )}
            {customer.email && (
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-text-muted shrink-0" />
                <span className="text-text truncate">{customer.email}</span>
              </div>
            )}
            {address && (
              <AddressLink
                address={customer.address_line1}
                city={customer.city}
                state={customer.state}
                zip={customer.zip}
                className="flex items-start gap-3 text-primary"
                iconClassName="h-5 w-5 shrink-0 mt-0.5"
              />
            )}
          </div>
          {customer.notes && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-sm text-text-muted mb-1">Notes</p>
              <p className="text-text whitespace-pre-wrap">{customer.notes}</p>
            </div>
          )}
        </section>

        {/* Quiet Customer Flag - Per CIL Spec Section 3.1 */}
        <QuietCustomerFlag
          customerId={customer.id}
          customerFirstName={customer.name.split(' ')[0]}
          businessName={user.business?.name || ''}
          lastJobDate={
            jobs.find((j) => j.status === 'completed')?.completed_at ||
            jobs.find((j) => j.status === 'completed')?.scheduled_date
          }
          tags={customer.tags}
          phone={customer.phone}
          userId={user.id}
          className="mt-4"
        />

        {/* Maintenance Agreement Tracker - Per CIL Spec Section 4.1 */}
        <MaintenanceAgreementTrackerWrapper
          customerId={customer.id}
          userId={user.id}
          completedJobsCount={jobs.filter((j) => j.status === 'completed').length}
        />

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                  activeTab === tab.id
                    ? 'bg-primary text-white'
                    : 'bg-muted text-text hover:bg-muted/80'
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                {tab.count > 0 && (
                  <span
                    className={cn(
                      'text-xs px-1.5 py-0.5 rounded-full',
                      activeTab === tab.id ? 'bg-white/20' : 'bg-background'
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="space-y-3">
          {activeTab === 'jobs' && (
            <>
              {jobs.length === 0 ? (
                <EmptyState
                  icon={Briefcase}
                  message="No jobs yet"
                  actionLabel="Schedule Job"
                  actionHref={`/jobs/new?customer_id=${customer.id}`}
                />
              ) : (
                jobs.map((job) => (
                  <Link
                    key={job.id}
                    href={`/jobs/${job.id}`}
                    className="card p-3 flex items-center justify-between active:scale-[0.99]"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-text truncate">{job.title}</p>
                      <div className="flex items-center gap-2 text-xs text-text-muted mt-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {job.scheduled_date
                          ? formatDate(job.scheduled_date, 'MMM d, yyyy')
                          : 'Unscheduled'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getJobStatusColor(job.status)}>
                        {job.status.replace('_', ' ')}
                      </Badge>
                      <ChevronRight className="h-5 w-5 text-text-muted" />
                    </div>
                  </Link>
                ))
              )}
            </>
          )}

          {activeTab === 'leads' && (
            <>
              {leads.length === 0 ? (
                <EmptyState
                  icon={Users}
                  message="No leads yet"
                  actionLabel="Add Lead"
                  actionHref={`/leads/new?customer_id=${customer.id}`}
                />
              ) : (
                leads.map((lead) => (
                  <Link
                    key={lead.id}
                    href={`/leads/${lead.id}`}
                    className="card p-3 flex items-center justify-between active:scale-[0.99]"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-text truncate">
                        {lead.service_needed || 'Lead'}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-text-muted mt-1">
                        <Clock className="h-3.5 w-3.5" />
                        {formatRelativeDate(lead.created_at)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getLeadStatusColor(lead.status)}>{lead.status}</Badge>
                      <ChevronRight className="h-5 w-5 text-text-muted" />
                    </div>
                  </Link>
                ))
              )}
            </>
          )}

          {activeTab === 'quotes' && (
            <>
              {quotes.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  message="No quotes yet"
                  actionLabel="Create Quote"
                  actionHref={`/quotes/new?customer_id=${customer.id}`}
                />
              ) : (
                quotes.map((quote) => (
                  <Link
                    key={quote.id}
                    href={`/quotes/${quote.id}`}
                    className="card p-3 flex items-center justify-between active:scale-[0.99]"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-text">
                        Quote #{quote.quote_number || quote.id.slice(0, 8)}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-text-muted mt-1">
                        <DollarSign className="h-3.5 w-3.5" />
                        {formatCurrency(quote.total || 0)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getQuoteStatusColor(quote.status)}>{quote.status}</Badge>
                      <ChevronRight className="h-5 w-5 text-text-muted" />
                    </div>
                  </Link>
                ))
              )}
            </>
          )}

          {activeTab === 'invoices' && (
            <>
              {invoices.length === 0 ? (
                <EmptyState
                  icon={DollarSign}
                  message="No invoices yet"
                  actionLabel="Create Invoice"
                  actionHref={`/invoices/new?customer_id=${customer.id}`}
                />
              ) : (
                invoices.map((invoice) => (
                  <Link
                    key={invoice.id}
                    href={`/invoices/${invoice.id}`}
                    className="card p-3 flex items-center justify-between active:scale-[0.99]"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-text">
                        Invoice #{invoice.invoice_number || invoice.id.slice(0, 8)}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-text-muted mt-1">
                        <DollarSign className="h-3.5 w-3.5" />
                        {formatCurrency(invoice.total || 0)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getInvoiceStatusColor(invoice.status)}>
                        {invoice.status}
                      </Badge>
                      <ChevronRight className="h-5 w-5 text-text-muted" />
                    </div>
                  </Link>
                ))
              )}
            </>
          )}

          {activeTab === 'documents' && (
            <div className="card p-3">
              <DocumentList
                entityType="customer"
                entityId={customerId}
                readOnly={!hasPermission(user.role, 'manage_customers')}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper components and functions

/**
 * Wrapper for MaintenanceAgreementTracker that fetches agreement data
 */
function MaintenanceAgreementTrackerWrapper({
  customerId,
  userId,
  completedJobsCount,
}: {
  customerId: string;
  userId: string;
  completedJobsCount: number;
}) {
  const { agreement, isLoading } = useCustomerAgreement(customerId);

  if (isLoading) return null;

  return (
    <MaintenanceAgreementTracker
      customerId={customerId}
      userId={userId}
      completedJobsCount={completedJobsCount}
      agreement={agreement}
      className="mt-3"
    />
  );
}

function EmptyState({
  icon: Icon,
  message,
  actionLabel,
  actionHref,
}: {
  icon: React.ElementType;
  message: string;
  actionLabel: string;
  actionHref: string;
}) {
  return (
    <div className="card p-6 flex flex-col items-center text-center">
      <Icon className="h-8 w-8 text-text-muted mb-2" />
      <p className="text-text-muted mb-3">{message}</p>
      <Link href={actionHref}>
        <Button variant="outline" size="sm" className="gap-1">
          <Plus className="h-4 w-4" />
          {actionLabel}
        </Button>
      </Link>
    </div>
  );
}

function getJobStatusColor(status: string): string {
  const colors: Record<string, string> = {
    scheduled: 'bg-info/10 text-info',
    in_progress: 'bg-warning/10 text-warning',
    completed: 'bg-success/10 text-success',
    cancelled: 'bg-danger/10 text-danger',
  };
  return colors[status] || 'bg-muted text-text-muted';
}

function getLeadStatusColor(status: string): string {
  const colors: Record<string, string> = {
    new: 'bg-primary/10 text-primary',
    contacted: 'bg-info/10 text-info',
    qualified: 'bg-success/10 text-success',
    quoted: 'bg-warning/10 text-warning',
    won: 'bg-success/10 text-success',
    lost: 'bg-danger/10 text-danger',
  };
  return colors[status] || 'bg-muted text-text-muted';
}

function getQuoteStatusColor(status: string): string {
  const colors: Record<string, string> = {
    draft: 'bg-muted text-text-muted',
    sent: 'bg-info/10 text-info',
    viewed: 'bg-warning/10 text-warning',
    accepted: 'bg-success/10 text-success',
    declined: 'bg-danger/10 text-danger',
    expired: 'bg-danger/10 text-danger',
  };
  return colors[status] || 'bg-muted text-text-muted';
}

function getInvoiceStatusColor(status: string): string {
  const colors: Record<string, string> = {
    draft: 'bg-muted text-text-muted',
    sent: 'bg-info/10 text-info',
    viewed: 'bg-warning/10 text-warning',
    paid: 'bg-success/10 text-success',
    overdue: 'bg-danger/10 text-danger',
  };
  return colors[status] || 'bg-muted text-text-muted';
}

function CustomerDetailSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky-header bg-background border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="h-10 w-10 skeleton rounded-lg" />
          <div className="h-10 w-10 skeleton rounded-full" />
          <div className="flex-1">
            <div className="h-5 w-32 skeleton rounded mb-1" />
            <div className="h-4 w-24 skeleton rounded" />
          </div>
        </div>
      </header>
      <div className="px-4 py-4 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card h-20 skeleton" />
          ))}
        </div>
        <div className="card h-40 skeleton" />
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 w-24 skeleton rounded-full" />
          ))}
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card h-16 skeleton" />
          ))}
        </div>
      </div>
    </div>
  );
}
