'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  Calendar,
  User,
  Clock,
  AlertCircle,
  Loader2,
  MessageSquare,
  DollarSign,
  CheckCircle,
  XCircle,
  UserPlus,
  RefreshCcw,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { showSuccess, showError, showWarning } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { AdminPageHeader } from '@/components/admin/page-header';
import { useAgentOrHigher } from '@/hooks/useAdminAuth';

interface Lead {
  id: string;
  company_name: string;
  contact_name: string;
  email?: string;
  phone?: string;
  trade_type?: string;
  status: string;
  source?: string;
  interested_in?: string[];
  notes?: string;
  estimated_value?: number;
  last_contact_at?: string;
  next_followup_at?: string;
  contact_count: number;
  created_at: string;
  agent_id: string;
  agent?: { id: string; full_name: string };
}

interface ContactLog {
  id: string;
  contact_type: string;
  notes: string;
  outcome?: string;
  next_followup?: string;
  created_at: string;
  admin?: { full_name: string };
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

const statusOptions = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'proposal_sent', label: 'Proposal Sent' },
  { value: 'negotiating', label: 'Negotiating' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
  { value: 'unqualified', label: 'Unqualified' },
  { value: 'dormant', label: 'Dormant' },
];

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: leadId } = use(params);
  const router = useRouter();
  const { loading: authLoading, isAuthorized } = useAgentOrHigher();
  const { confirm } = useConfirmDialog();
  const [lead, setLead] = useState<Lead | null>(null);
  const [contactLogs, setContactLogs] = useState<ContactLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactForm, setContactForm] = useState({
    contact_type: 'call',
    notes: '',
    outcome: '',
    next_followup: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [converting, setConverting] = useState(false);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [agents, setAgents] = useState<{ id: string; full_name: string }[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [reassigning, setReassigning] = useState(false);

  useEffect(() => {
    if (isAuthorized) {
      fetchLead();
    }
  }, [leadId, isAuthorized]);

  async function fetchLead() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/leads/${leadId}`);
      if (!res.ok) throw new Error('Failed to fetch lead');
      const data = await res.json();
      setLead(data.lead);
      setContactLogs(data.contactLogs || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch lead');
    } finally {
      setLoading(false);
    }
  }

  async function logContact() {
    if (!contactForm.notes.trim()) {
      showWarning('Please enter contact notes');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/leads/${leadId}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactForm),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to log contact');
      }
      showSuccess('Contact logged successfully');
      setShowContactModal(false);
      setContactForm({ contact_type: 'call', notes: '', outcome: '', next_followup: '' });
      fetchLead();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to log contact';
      showError(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function updateStatus(newStatus: string) {
    try {
      const res = await fetch(`/api/admin/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update status');
      }
      showSuccess('Status updated');
      setShowStatusDropdown(false);
      fetchLead();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update status';
      showError(message);
    }
  }

  async function fetchAgents() {
    try {
      const res = await fetch('/api/admin/agents?role=agent');
      if (res.ok) {
        const data = await res.json();
        setAgents(data.agents || []);
      }
    } catch {
      // Ignore errors, agents list will be empty
    }
  }

  async function reassignLead() {
    if (!selectedAgentId) {
      showWarning('Please select an agent');
      return;
    }
    setReassigning(true);
    try {
      const res = await fetch(`/api/admin/leads/${leadId}/reassign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to_agent_id: selectedAgentId,
          reason: 'Reassignment from admin interface',
          notify_new_agent: true,
          notify_old_agent: true,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to reassign lead');
      }
      showSuccess('Lead reassigned successfully');
      setShowReassignModal(false);
      setSelectedAgentId('');
      fetchLead();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to reassign lead';
      showError(message);
    } finally {
      setReassigning(false);
    }
  }

  async function convertToCustomer() {
    confirm({
      title: 'Convert Lead to Customer',
      description: 'This will create a new CRM account for this lead. This action cannot be undone.',
      confirmLabel: 'Convert',
      onConfirm: async () => {
        setConverting(true);
        try {
          const res = await fetch(`/api/admin/leads/${leadId}/convert`, {
            method: 'POST',
          });
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Failed to convert lead');
          }
          const data = await res.json();
          showSuccess('Lead converted to customer');
          router.push(`/admin/accounts/${data.accountId}`);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to convert lead';
          showError(message);
        } finally {
          setConverting(false);
        }
      },
    });
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <h1 className="text-2xl font-bold">Unauthorized</h1>
        <p className="text-muted-foreground">You do not have permission to view this page.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
        <AlertCircle className="h-5 w-5" />
        {error || 'Lead not found'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={lead.company_name}
        description={lead.contact_name}
        backHref="/admin/leads"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={fetchLead}
              className="p-2 border border-border rounded-lg hover:bg-muted"
            >
              <RefreshCcw className="h-4 w-4" />
            </button>
            {lead.status !== 'won' && lead.status !== 'lost' && (
              <Button
                onClick={convertToCustomer}
                variant="default"
                disabled={converting}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                aria-label="Convert lead to customer"
              >
                {converting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                Convert to Customer
              </Button>
            )}
            <Button
              onClick={() => setShowContactModal(true)}
              className="flex items-center gap-2"
              aria-label="Log contact with lead"
            >
              <MessageSquare className="h-4 w-4" />
              Log Contact
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lead Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Details Card */}
          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Lead Details</h2>
              <div className="relative">
                <button
                  onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium ${statusColors[lead.status]}`}
                >
                  {lead.status.replace('_', ' ')}
                </button>
                {showStatusDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowStatusDropdown(false)} />
                    <div className="absolute right-0 mt-2 w-40 bg-popover rounded-lg shadow-lg border border-border z-50">
                      {statusOptions.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => updateStatus(option.value)}
                          className={`w-full px-4 py-2 text-left text-sm hover:bg-muted first:rounded-t-lg last:rounded-b-lg ${
                            lead.status === option.value ? 'bg-muted font-medium' : ''
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground">Company</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">{lead.company_name}</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Contact</label>
                  <div className="flex items-center gap-2 mt-1">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">{lead.contact_name}</span>
                  </div>
                </div>
                {lead.email && (
                  <div>
                    <label className="text-sm text-muted-foreground">Email</label>
                    <div className="flex items-center gap-2 mt-1">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a href={`mailto:${lead.email}`} className="text-primary hover:underline">
                        {lead.email}
                      </a>
                    </div>
                  </div>
                )}
                {lead.phone && (
                  <div>
                    <label className="text-sm text-muted-foreground">Phone</label>
                    <div className="flex items-center gap-2 mt-1">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a href={`tel:${lead.phone}`} className="text-primary hover:underline">
                        {lead.phone}
                      </a>
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                {lead.trade_type && (
                  <div>
                    <label className="text-sm text-muted-foreground">Trade Type</label>
                    <div className="mt-1 text-foreground">{lead.trade_type}</div>
                  </div>
                )}
                {lead.source && (
                  <div>
                    <label className="text-sm text-muted-foreground">Source</label>
                    <div className="mt-1 text-foreground">{lead.source}</div>
                  </div>
                )}
                {lead.estimated_value && (
                  <div>
                    <label className="text-sm text-muted-foreground">Estimated Value</label>
                    <div className="flex items-center gap-2 mt-1">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="text-foreground">${lead.estimated_value.toLocaleString()}</span>
                    </div>
                  </div>
                )}
                <div>
                  <label className="text-sm text-muted-foreground">Created</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">{format(new Date(lead.created_at), 'MMM d, yyyy')}</span>
                  </div>
                </div>
              </div>
            </div>

            {lead.interested_in && lead.interested_in.length > 0 && (
              <div className="mt-6 pt-6 border-t border-border">
                <label className="text-sm text-muted-foreground">Interested In</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {lead.interested_in.map((item, i) => (
                    <span key={i} className="px-2 py-1 bg-blue-50 text-blue-700 rounded-lg text-sm">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {lead.notes && (
              <div className="mt-6 pt-6 border-t border-border">
                <label className="text-sm text-muted-foreground">Notes</label>
                <p className="mt-2 text-foreground whitespace-pre-wrap">{lead.notes}</p>
              </div>
            )}
          </div>

          {/* Contact History */}
          <div className="bg-card rounded-xl border border-border">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">Contact History</h2>
            </div>
            {contactLogs.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                <p>No contact history yet</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {contactLogs.map((log) => (
                  <div key={log.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-muted rounded-lg">
                        {log.contact_type === 'call' ? (
                          <Phone className="h-4 w-4 text-muted-foreground" />
                        ) : log.contact_type === 'email' ? (
                          <Mail className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-foreground capitalize">
                            {log.contact_type}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-foreground">{log.notes}</p>
                        {log.outcome && (
                          <div className="mt-2 flex items-center gap-2">
                            {log.outcome === 'positive' ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : log.outcome === 'negative' ? (
                              <XCircle className="h-4 w-4 text-red-500" />
                            ) : (
                              <Clock className="h-4 w-4 text-yellow-500" />
                            )}
                            <span className="text-xs text-muted-foreground capitalize">{log.outcome}</span>
                          </div>
                        )}
                        {log.admin && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            By {log.admin.full_name}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="font-medium text-foreground mb-4">Quick Stats</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Contacts</span>
                <span className="font-medium text-foreground">{lead.contact_count}</span>
              </div>
              {lead.last_contact_at && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Last Contact</span>
                  <span className="text-sm text-foreground">
                    {formatDistanceToNow(new Date(lead.last_contact_at), { addSuffix: true })}
                  </span>
                </div>
              )}
              {lead.next_followup_at && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Next Followup</span>
                  <span className="text-sm text-orange-600 font-medium">
                    {format(new Date(lead.next_followup_at), 'MMM d')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Assigned Agent */}
          {lead.agent && (
            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="font-medium text-foreground mb-4">Assigned Agent</h3>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-medium text-primary">
                    {lead.agent.full_name.charAt(0)}
                  </span>
                </div>
                <div>
                  <div className="font-medium text-foreground">{lead.agent.full_name}</div>
                  <button
                    onClick={() => {
                      fetchAgents();
                      setShowReassignModal(true);
                    }}
                    className="text-xs text-primary hover:underline"
                  >
                    Reassign Lead
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Contact Modal */}
      {showContactModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-xl max-w-lg w-full mx-4 p-6 border border-border">
            <h2 className="text-xl font-bold text-foreground mb-4">Log Contact</h2>

            <div className="space-y-4">
              <div>
                <label htmlFor="contact-type" className="block text-sm font-medium text-foreground mb-1">
                  Contact Type
                </label>
                <select
                  id="contact-type"
                  value={contactForm.contact_type}
                  onChange={(e) => setContactForm({ ...contactForm, contact_type: e.target.value })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="call">Phone Call</option>
                  <option value="email">Email</option>
                  <option value="meeting">Meeting</option>
                  <option value="text">Text Message</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="contact-notes" className="block text-sm font-medium text-foreground mb-1">
                  Notes *
                </label>
                <textarea
                  id="contact-notes"
                  value={contactForm.notes}
                  onChange={(e) => setContactForm({ ...contactForm, notes: e.target.value })}
                  placeholder="Describe the contact..."
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-h-[100px]"
                  aria-required="true"
                />
              </div>

              <div>
                <label htmlFor="contact-outcome" className="block text-sm font-medium text-foreground mb-1">
                  Outcome
                </label>
                <select
                  id="contact-outcome"
                  value={contactForm.outcome}
                  onChange={(e) => setContactForm({ ...contactForm, outcome: e.target.value })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">Select Outcome...</option>
                  <option value="positive">Positive</option>
                  <option value="negative">Negative</option>
                  <option value="neutral">Neutral</option>
                  <option value="no_answer">No Answer</option>
                </select>
              </div>

              <div>
                <label htmlFor="contact-followup" className="block text-sm font-medium text-foreground mb-1">
                  Next Follow-up
                </label>
                <input
                  id="contact-followup"
                  type="datetime-local"
                  value={contactForm.next_followup}
                  onChange={(e) => setContactForm({ ...contactForm, next_followup: e.target.value })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowContactModal(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                onClick={logContact}
                disabled={submitting}
              >
                {submitting ? 'Saving...' : 'Log Contact'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reassign Lead Modal */}
      {showReassignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-xl max-w-md w-full mx-4 p-6 border border-border">
            <h2 className="text-xl font-bold text-foreground mb-4">Reassign Lead</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Select Agent
                </label>
                <select
                  value={selectedAgentId}
                  onChange={(e) => setSelectedAgentId(e.target.value)}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">Select an agent...</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.full_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowReassignModal(false);
                  setSelectedAgentId('');
                }}
                disabled={reassigning}
              >
                Cancel
              </Button>
              <Button
                onClick={reassignLead}
                disabled={reassigning || !selectedAgentId}
              >
                {reassigning ? 'Reassigning...' : 'Reassign'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
