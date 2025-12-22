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
  Edit2,
  UserPlus,
  RefreshCcw,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

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

export default function LeadDetailPage({ params }: { params: Promise<{ leadId: string }> }) {
  const { leadId } = use(params);
  const router = useRouter();
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

  useEffect(() => {
    fetchLead();
  }, [leadId]);

  async function fetchLead() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/leads/${leadId}`);
      if (!res.ok) throw new Error('Failed to fetch lead');
      const data = await res.json();
      setLead(data.lead);
      setContactLogs(data.contactLogs || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function logContact() {
    if (!contactForm.notes.trim()) {
      alert('Please enter contact notes');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/leads/${leadId}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactForm),
      });
      if (!res.ok) throw new Error('Failed to log contact');
      setShowContactModal(false);
      setContactForm({ contact_type: 'call', notes: '', outcome: '', next_followup: '' });
      fetchLead();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function updateStatus(newStatus: string) {
    try {
      const res = await fetch(`/api/admin/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      setShowStatusDropdown(false);
      fetchLead();
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function convertToCustomer() {
    if (!confirm('Convert this lead to a customer? This will create a new CRM account.')) return;
    try {
      const res = await fetch(`/api/admin/leads/${leadId}/convert`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to convert lead');
      const data = await res.json();
      router.push(`/admin-portal/accounts/${data.accountId}`);
    } catch (err: any) {
      alert(err.message);
    }
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
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin-portal/leads"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-500" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{lead.company_name}</h1>
            <p className="text-gray-500">{lead.contact_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchLead}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCcw className="h-4 w-4" />
          </button>
          {lead.status !== 'won' && lead.status !== 'lost' && (
            <button
              onClick={convertToCustomer}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <UserPlus className="h-4 w-4" />
              Convert to Customer
            </button>
          )}
          <button
            onClick={() => setShowContactModal(true)}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 flex items-center gap-2"
          >
            <MessageSquare className="h-4 w-4" />
            Log Contact
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lead Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Details Card */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Lead Details</h2>
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
                    <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                      {statusOptions.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => updateStatus(option.value)}
                          className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg ${
                            lead.status === option.value ? 'bg-gray-50 font-medium' : ''
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
                  <label className="text-sm text-gray-500">Company</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Building2 className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-900">{lead.company_name}</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Contact</label>
                  <div className="flex items-center gap-2 mt-1">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-900">{lead.contact_name}</span>
                  </div>
                </div>
                {lead.email && (
                  <div>
                    <label className="text-sm text-gray-500">Email</label>
                    <div className="flex items-center gap-2 mt-1">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <a href={`mailto:${lead.email}`} className="text-primary hover:underline">
                        {lead.email}
                      </a>
                    </div>
                  </div>
                )}
                {lead.phone && (
                  <div>
                    <label className="text-sm text-gray-500">Phone</label>
                    <div className="flex items-center gap-2 mt-1">
                      <Phone className="h-4 w-4 text-gray-400" />
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
                    <label className="text-sm text-gray-500">Trade Type</label>
                    <div className="mt-1 text-gray-900">{lead.trade_type}</div>
                  </div>
                )}
                {lead.source && (
                  <div>
                    <label className="text-sm text-gray-500">Source</label>
                    <div className="mt-1 text-gray-900">{lead.source}</div>
                  </div>
                )}
                {lead.estimated_value && (
                  <div>
                    <label className="text-sm text-gray-500">Estimated Value</label>
                    <div className="flex items-center gap-2 mt-1">
                      <DollarSign className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-900">${lead.estimated_value.toLocaleString()}</span>
                    </div>
                  </div>
                )}
                <div>
                  <label className="text-sm text-gray-500">Created</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-900">{format(new Date(lead.created_at), 'MMM d, yyyy')}</span>
                  </div>
                </div>
              </div>
            </div>

            {lead.interested_in && lead.interested_in.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-100">
                <label className="text-sm text-gray-500">Interested In</label>
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
              <div className="mt-6 pt-6 border-t border-gray-100">
                <label className="text-sm text-gray-500">Notes</label>
                <p className="mt-2 text-gray-700 whitespace-pre-wrap">{lead.notes}</p>
              </div>
            )}
          </div>

          {/* Contact History */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Contact History</h2>
            </div>
            {contactLogs.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p>No contact history yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {contactLogs.map((log) => (
                  <div key={log.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        {log.contact_type === 'call' ? (
                          <Phone className="h-4 w-4 text-gray-600" />
                        ) : log.contact_type === 'email' ? (
                          <Mail className="h-4 w-4 text-gray-600" />
                        ) : (
                          <MessageSquare className="h-4 w-4 text-gray-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900 capitalize">
                            {log.contact_type}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-gray-700">{log.notes}</p>
                        {log.outcome && (
                          <div className="mt-2 flex items-center gap-2">
                            {log.outcome === 'positive' ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : log.outcome === 'negative' ? (
                              <XCircle className="h-4 w-4 text-red-500" />
                            ) : (
                              <Clock className="h-4 w-4 text-yellow-500" />
                            )}
                            <span className="text-xs text-gray-500 capitalize">{log.outcome}</span>
                          </div>
                        )}
                        {log.admin && (
                          <div className="mt-2 text-xs text-gray-500">
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
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-medium text-gray-900 mb-4">Quick Stats</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Total Contacts</span>
                <span className="font-medium text-gray-900">{lead.contact_count}</span>
              </div>
              {lead.last_contact_at && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Last Contact</span>
                  <span className="text-sm text-gray-900">
                    {formatDistanceToNow(new Date(lead.last_contact_at), { addSuffix: true })}
                  </span>
                </div>
              )}
              {lead.next_followup_at && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Next Followup</span>
                  <span className="text-sm text-orange-600 font-medium">
                    {format(new Date(lead.next_followup_at), 'MMM d')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Assigned Agent */}
          {lead.agent && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-medium text-gray-900 mb-4">Assigned Agent</h3>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-medium text-primary">
                    {lead.agent.full_name.charAt(0)}
                  </span>
                </div>
                <div>
                  <div className="font-medium text-gray-900">{lead.agent.full_name}</div>
                  <button className="text-xs text-primary hover:underline">
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
          <div className="bg-white rounded-xl max-w-lg w-full mx-4 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Log Contact</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Type
                </label>
                <select
                  value={contactForm.contact_type}
                  onChange={(e) => setContactForm({ ...contactForm, contact_type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="call">Phone Call</option>
                  <option value="email">Email</option>
                  <option value="meeting">Meeting</option>
                  <option value="text">Text Message</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes *
                </label>
                <textarea
                  value={contactForm.notes}
                  onChange={(e) => setContactForm({ ...contactForm, notes: e.target.value })}
                  placeholder="Describe the contact..."
                  className="w-full h-24 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Outcome
                </label>
                <select
                  value={contactForm.outcome}
                  onChange={(e) => setContactForm({ ...contactForm, outcome: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">Select outcome...</option>
                  <option value="positive">Positive</option>
                  <option value="neutral">Neutral</option>
                  <option value="negative">Negative</option>
                  <option value="no_answer">No Answer</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Next Followup
                </label>
                <input
                  type="date"
                  value={contactForm.next_followup}
                  onChange={(e) => setContactForm({ ...contactForm, next_followup: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowContactModal(false);
                  setContactForm({ contact_type: 'call', notes: '', outcome: '', next_followup: '' });
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={logContact}
                disabled={submitting}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                Save Contact
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
