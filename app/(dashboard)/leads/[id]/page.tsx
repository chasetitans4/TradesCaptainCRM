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
  formatAddress,
  getNavigationUrl,
} from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import type { UserWithBusiness, Lead, Customer, CallLog, LeadStatus } from '@/types';
import {
  ArrowLeft,
  Phone,
  MessageSquare,
  Mail,
  MapPin,
  Clock,
  Briefcase,
  Calendar,
  ChevronRight,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  FileText,
  DollarSign,
  MoreVertical,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
} from 'lucide-react';

interface LeadWithCustomer extends Lead {
  customer?: Customer | null;
}

const STATUS_COLORS: Record<LeadStatus, string> = {
  new: 'bg-primary/10 text-primary border-primary/20',
  contacted: 'bg-info/10 text-info border-info/20',
  qualified: 'bg-success/10 text-success border-success/20',
  quoted: 'bg-warning/10 text-warning border-warning/20',
  won: 'bg-success/10 text-success border-success/20',
  lost: 'bg-danger/10 text-danger border-danger/20',
};

const STATUS_OPTIONS: { value: LeadStatus; label: string; icon: React.ElementType }[] = [
  { value: 'new', label: 'New', icon: AlertCircle },
  { value: 'contacted', label: 'Contacted', icon: Phone },
  { value: 'qualified', label: 'Qualified', icon: CheckCircle },
  { value: 'quoted', label: 'Quoted', icon: FileText },
  { value: 'won', label: 'Won', icon: CheckCircle },
  { value: 'lost', label: 'Lost', icon: XCircle },
];

const URGENCY_LABELS: Record<string, { label: string; color: string }> = {
  emergency: { label: 'Emergency', color: 'bg-danger text-white' },
  high: { label: 'High Priority', color: 'bg-warning text-white' },
  normal: { label: 'Normal', color: 'bg-info/10 text-info' },
  low: { label: 'Low Priority', color: 'bg-muted text-text-muted' },
};

export default function LeadDetailPage() {
  const router = useRouter();
  const params = useParams();
  const leadId = params.id as string;

  const [user, setUser] = useState<UserWithBusiness | null>(null);
  const [lead, setLead] = useState<LeadWithCustomer | null>(null);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showStatusSheet, setShowStatusSheet] = useState(false);
  const [showActionsSheet, setShowActionsSheet] = useState(false);

  // Load user
  useEffect(() => {
    async function loadUser() {
      const profile = await getCurrentUserProfile();
      if (!profile || !hasPermission(profile.role, 'view_leads')) {
        router.push('/dashboard');
        return;
      }
      setUser(profile as UserWithBusiness);
    }
    loadUser();
  }, [router]);

  // Load lead data
  const loadLead = useCallback(async () => {
    if (!user || !leadId) return;

    const supabase = createClient();

    try {
      // Load lead with customer
      const { data: leadData, error: leadError } = await supabase
        .from('leads')
        .select(`
          *,
          customer:customers (*)
        `)
        .eq('id', leadId)
        .single();

      if (leadError) throw leadError;
      setLead(leadData as LeadWithCustomer);

      // Load call logs for this lead
      const { data: callData } = await supabase
        .from('call_logs')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })
        .limit(10);

      setCallLogs(callData || []);
    } catch (error) {
      console.error('Error loading lead:', error);
      router.push('/leads');
    } finally {
      setLoading(false);
    }
  }, [user, leadId, router]);

  useEffect(() => {
    if (user && leadId) {
      loadLead();
    }
  }, [user, leadId, loadLead]);

  // Update lead status
  const updateStatus = async (newStatus: LeadStatus) => {
    if (!lead) return;

    setUpdating(true);
    const supabase = createClient();

    try {
      const { error } = await supabase
        .from('leads')
        .update({ status: newStatus })
        .eq('id', lead.id);

      if (error) throw error;

      setLead({ ...lead, status: newStatus });
      setShowStatusSheet(false);
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setUpdating(false);
    }
  };

  // Delete lead
  const deleteLead = async () => {
    if (!lead || !confirm('Are you sure you want to delete this lead?')) return;

    setUpdating(true);
    const supabase = createClient();

    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', lead.id);

      if (error) throw error;

      router.push('/leads');
    } catch (error) {
      console.error('Error deleting lead:', error);
      setUpdating(false);
    }
  };

  if (loading || !user || !lead) {
    return <LeadDetailSkeleton />;
  }

  const name = lead.customer?.name || lead.name || 'Unknown';
  const phone = lead.customer?.phone || lead.phone;
  const email = lead.customer?.email || lead.email;
  const address = formatAddress(
    lead.customer?.address_line1,
    lead.customer?.city,
    lead.customer?.state,
    lead.customer?.postal_code
  );
  const urgency = URGENCY_LABELS[lead.urgency || 'normal'];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky-header bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-2 -ml-2">
              <ArrowLeft className="h-5 w-5 text-text" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-text truncate max-w-[200px]">
                {name}
              </h1>
              <div className="flex items-center gap-2">
                <Badge className={cn('border', STATUS_COLORS[lead.status])}>
                  {lead.status}
                </Badge>
                {lead.urgency && lead.urgency !== 'normal' && (
                  <Badge className={urgency.color}>{urgency.label}</Badge>
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
                <Link href={`/leads/${lead.id}/edit`} className="w-full">
                  <Button variant="ghost" className="w-full justify-start gap-3">
                    <Edit2 className="h-5 w-5" />
                    Edit Lead
                  </Button>
                </Link>
                <Link href={`/jobs/new?lead_id=${lead.id}`} className="w-full">
                  <Button variant="ghost" className="w-full justify-start gap-3">
                    <Calendar className="h-5 w-5" />
                    Convert to Job
                  </Button>
                </Link>
                <Link href={`/quotes/new?lead_id=${lead.id}`} className="w-full">
                  <Button variant="ghost" className="w-full justify-start gap-3">
                    <FileText className="h-5 w-5" />
                    Create Quote
                  </Button>
                </Link>
                <hr className="my-2" />
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 text-danger hover:text-danger hover:bg-danger/10"
                  onClick={deleteLead}
                  disabled={updating}
                >
                  <Trash2 className="h-5 w-5" />
                  Delete Lead
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Main Content */}
      <div className="px-4 py-4 space-y-4">
        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-3">
          {phone && (
            <a
              href={`tel:${phone}`}
              className="card p-3 flex flex-col items-center gap-2 active:scale-95 transition-transform"
            >
              <div className="p-2 rounded-full bg-success/10">
                <Phone className="h-5 w-5 text-success" />
              </div>
              <span className="text-xs font-medium text-text">Call</span>
            </a>
          )}
          {phone && (
            <a
              href={`sms:${phone}`}
              className="card p-3 flex flex-col items-center gap-2 active:scale-95 transition-transform"
            >
              <div className="p-2 rounded-full bg-info/10">
                <MessageSquare className="h-5 w-5 text-info" />
              </div>
              <span className="text-xs font-medium text-text">Text</span>
            </a>
          )}
          {email && (
            <a
              href={`mailto:${email}`}
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
            {phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-text-muted shrink-0" />
                <span className="text-text">{formatPhoneNumber(phone)}</span>
              </div>
            )}
            {email && (
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-text-muted shrink-0" />
                <span className="text-text truncate">{email}</span>
              </div>
            )}
            {address && (
              <a
                href={getNavigationUrl(address)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 text-primary"
              >
                <MapPin className="h-5 w-5 shrink-0 mt-0.5" />
                <span>{address}</span>
              </a>
            )}
          </div>
        </section>

        {/* Lead Details */}
        <section className="card p-4">
          <h2 className="font-semibold text-text mb-3">Lead Details</h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Briefcase className="h-5 w-5 text-text-muted shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-text-muted">Service Needed</p>
                <p className="text-text">{lead.service_needed || 'Not specified'}</p>
              </div>
            </div>
            {lead.source && (
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-text-muted shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-text-muted">Source</p>
                  <p className="text-text">{lead.source}</p>
                </div>
              </div>
            )}
            {lead.estimated_value && (
              <div className="flex items-start gap-3">
                <DollarSign className="h-5 w-5 text-text-muted shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-text-muted">Estimated Value</p>
                  <p className="text-text">${lead.estimated_value.toLocaleString()}</p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-text-muted shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-text-muted">Created</p>
                <p className="text-text">{formatDate(lead.created_at, 'MMM d, yyyy h:mm a')}</p>
              </div>
            </div>
          </div>
          {lead.notes && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-sm text-text-muted mb-1">Notes</p>
              <p className="text-text whitespace-pre-wrap">{lead.notes}</p>
            </div>
          )}
        </section>

        {/* Status Update */}
        <section className="card p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-text">Status</h2>
            <Sheet open={showStatusSheet} onOpenChange={setShowStatusSheet}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Badge className={cn('border', STATUS_COLORS[lead.status])}>
                    {lead.status}
                  </Badge>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="pb-safe">
                <SheetHeader>
                  <SheetTitle>Update Status</SheetTitle>
                </SheetHeader>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {STATUS_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    const isActive = lead.status === option.value;
                    return (
                      <button
                        key={option.value}
                        onClick={() => updateStatus(option.value)}
                        disabled={updating || isActive}
                        className={cn(
                          'p-3 rounded-lg border flex items-center gap-2 transition-colors',
                          isActive
                            ? 'bg-primary/10 border-primary text-primary'
                            : 'border-border hover:bg-muted'
                        )}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="font-medium">{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </section>

        {/* Call History */}
        <section className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-text">Call History</h2>
            <Link href={`/calls/new?lead_id=${lead.id}`}>
              <Button variant="ghost" size="sm" className="gap-1 text-primary">
                <Phone className="h-4 w-4" />
                Log Call
              </Button>
            </Link>
          </div>
          {callLogs.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-4">
              No calls logged yet
            </p>
          ) : (
            <div className="space-y-3">
              {callLogs.map((call) => (
                <CallLogItem key={call.id} call={call} />
              ))}
            </div>
          )}
        </section>

        {/* Customer Link (if exists) */}
        {lead.customer_id && (
          <Link
            href={`/customers/${lead.customer_id}`}
            className="card p-4 flex items-center justify-between active:scale-[0.99] transition-transform"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-text">View Customer Profile</p>
                <p className="text-sm text-text-muted">
                  See full history and other leads
                </p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-text-muted" />
          </Link>
        )}
      </div>

      {/* Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border pb-safe">
        <div className="flex gap-3">
          <Link href={`/jobs/new?lead_id=${lead.id}`} className="flex-1">
            <Button className="w-full gap-2">
              <Calendar className="h-5 w-5" />
              Convert to Job
            </Button>
          </Link>
          <Link href={`/quotes/new?lead_id=${lead.id}`}>
            <Button variant="outline" size="icon">
              <FileText className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function CallLogItem({ call }: { call: CallLog }) {
  const directionIcons = {
    inbound: PhoneIncoming,
    outbound: PhoneOutgoing,
    missed: PhoneMissed,
  };

  const directionColors = {
    inbound: 'text-success',
    outbound: 'text-info',
    missed: 'text-danger',
  };

  const Icon = directionIcons[call.direction] || Phone;

  return (
    <div className="flex items-start gap-3 py-2">
      <div className={cn('mt-0.5', directionColors[call.direction])}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text capitalize">
            {call.direction} call
          </span>
          {call.duration && (
            <span className="text-xs text-text-muted">
              {Math.floor(call.duration / 60)}:{(call.duration % 60).toString().padStart(2, '0')}
            </span>
          )}
        </div>
        {call.notes && (
          <p className="text-sm text-text-muted truncate">{call.notes}</p>
        )}
        <p className="text-xs text-text-muted mt-1">
          {formatRelativeDate(call.created_at)}
        </p>
      </div>
    </div>
  );
}

function LeadDetailSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky-header bg-background border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="h-10 w-10 skeleton rounded-lg" />
          <div className="flex-1">
            <div className="h-5 w-32 skeleton rounded mb-1" />
            <div className="h-5 w-20 skeleton rounded" />
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
        <div className="card h-48 skeleton" />
        <div className="card h-32 skeleton" />
      </div>
    </div>
  );
}
