'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient, getCurrentUserProfile } from '@/lib/supabase/client';
import { hasPermission } from '@/lib/permissions';
import { cn, formatPhoneNumber } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { UserWithBusiness, Customer, Lead, CallDirection, CallOutcome } from '@/types';
import {
  ArrowLeft,
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  User,
  FileText,
  Clock,
  Search,
  ChevronDown,
  Plus,
  Loader2,
  X,
} from 'lucide-react';

const DIRECTION_OPTIONS: { value: CallDirection; label: string; icon: React.ElementType }[] = [
  { value: 'outbound', label: 'Outbound', icon: PhoneOutgoing },
  { value: 'inbound', label: 'Inbound', icon: PhoneIncoming },
];

const OUTCOME_OPTIONS: { value: CallOutcome; label: string; description: string }[] = [
  { value: 'answered', label: 'Answered', description: 'Connected and spoke' },
  { value: 'voicemail', label: 'Voicemail', description: 'Left a message' },
  { value: 'no_answer', label: 'No Answer', description: 'No response' },
  { value: 'scheduled', label: 'Scheduled', description: 'Booked an appointment' },
  { value: 'callback_requested', label: 'Callback Requested', description: 'They will call back' },
  { value: 'not_interested', label: 'Not Interested', description: 'Declined service' },
];

interface FormData {
  phone: string;
  direction: CallDirection;
  outcome: CallOutcome | '';
  duration_minutes: string;
  duration_seconds: string;
  notes: string;
}

export default function NewCallLogPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const customerId = searchParams.get('customer_id');
  const leadId = searchParams.get('lead_id');

  const [user, setUser] = useState<UserWithBusiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Customer/Lead selection
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{
    customers: Customer[];
    leads: Lead[];
  }>({ customers: [], leads: [] });
  const [searching, setSearching] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // Form state
  const [formData, setFormData] = useState<FormData>({
    phone: '',
    direction: 'outbound',
    outcome: '',
    duration_minutes: '',
    duration_seconds: '',
    notes: '',
  });

  // Load user
  useEffect(() => {
    async function loadUser() {
      const profile = await getCurrentUserProfile();
      if (!profile || !hasPermission(profile.role, 'create_calls')) {
        router.push('/dashboard');
        return;
      }
      setUser(profile as UserWithBusiness);
      setLoading(false);
    }
    loadUser();
  }, [router]);

  // Load customer or lead if ID provided
  useEffect(() => {
    async function loadEntity() {
      if (!user) return;

      const supabase = createClient();

      if (customerId) {
        const { data } = await supabase
          .from('customers')
          .select('*')
          .eq('id', customerId)
          .single();
        if (data) {
          setSelectedCustomer(data);
          setFormData((prev) => ({
            ...prev,
            phone: data.phone || '',
          }));
        }
      } else if (leadId) {
        const { data } = await supabase
          .from('leads')
          .select('*, customer:customers!leads_customer_id_fkey (*)')
          .eq('id', leadId)
          .single();
        if (data) {
          setSelectedLead(data);
          if (data.customer) {
            setSelectedCustomer(data.customer as Customer);
          }
          setFormData((prev) => ({
            ...prev,
            phone: data.phone || data.customer?.phone || '',
          }));
        }
      }
    }
    loadEntity();
  }, [user, customerId, leadId]);

  // Search for customers and leads
  useEffect(() => {
    async function search() {
      if (!searchQuery.trim() || searchQuery.length < 2) {
        setSearchResults({ customers: [], leads: [] });
        return;
      }

      setSearching(true);
      const supabase = createClient();

      const [customersRes, leadsRes] = await Promise.all([
        supabase
          .from('customers')
          .select('*')
          .or(`name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`)
          .limit(5),
        supabase
          .from('leads')
          .select('*')
          .or(`name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%,service_needed.ilike.%${searchQuery}%`)
          .limit(5),
      ]);

      setSearchResults({
        customers: customersRes.data || [],
        leads: leadsRes.data || [],
      });
      setSearching(false);
    }

    const debounce = setTimeout(search, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  // Select customer
  const selectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setSelectedLead(null);
    setFormData((prev) => ({
      ...prev,
      phone: customer.phone || prev.phone,
    }));
    setShowSearch(false);
    setSearchQuery('');
  };

  // Select lead
  const selectLead = (lead: Lead) => {
    setSelectedLead(lead);
    setSelectedCustomer(null);
    setFormData((prev) => ({
      ...prev,
      phone: lead.phone || prev.phone,
    }));
    setShowSearch(false);
    setSearchQuery('');
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedCustomer(null);
    setSelectedLead(null);
  };

  // Update form field
  const updateField = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  // Format phone on blur
  const handlePhoneBlur = () => {
    if (formData.phone) {
      const cleaned = formData.phone.replace(/\D/g, '');
      if (cleaned.length === 10) {
        setFormData((prev) => ({ ...prev, phone: formatPhoneNumber(cleaned) }));
      }
    }
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.phone.trim()) {
      setError('Phone number is required');
      return;
    }

    setSubmitting(true);
    setError(null);

    const supabase = createClient();

    try {
      // Calculate duration in seconds
      const mins = parseInt(formData.duration_minutes) || 0;
      const secs = parseInt(formData.duration_seconds) || 0;
      const totalSeconds = mins * 60 + secs;

      const { error: insertError } = await supabase.from('call_logs').insert({
        business_id: user!.business_id,
        user_id: user!.id,
        customer_id: selectedCustomer?.id || null,
        lead_id: selectedLead?.id || null,
        phone: formData.phone.replace(/\D/g, ''),
        direction: formData.direction,
        outcome: formData.outcome || null,
        duration_seconds: totalSeconds > 0 ? totalSeconds : null,
        notes: formData.notes.trim() || null,
      });

      if (insertError) throw insertError;

      // Navigate back to where we came from
      if (customerId) {
        router.push(`/customers/${customerId}`);
      } else if (leadId) {
        router.push(`/leads/${leadId}`);
      } else {
        router.push('/calls');
      }
    } catch (err) {
      console.error('Error creating call log:', err);
      setError('Failed to log call. Please try again.');
      setSubmitting(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 bg-primary/20 rounded-lg mb-4" />
          <div className="h-4 w-24 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky-header bg-background border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => router.back()} className="p-2 -ml-2">
            <ArrowLeft className="h-5 w-5 text-text" />
          </button>
          <h1 className="text-lg font-semibold text-text">Log Call</h1>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="px-4 py-4 space-y-6">
        {/* Customer/Lead selection */}
        <section>
          <Label className="text-base font-semibold mb-3 block">Contact</Label>

          {selectedCustomer || selectedLead ? (
            <div className="card p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-text">
                    {selectedCustomer?.name || selectedLead?.name || 'Contact'}
                  </p>
                  <p className="text-sm text-text-muted">
                    {selectedCustomer ? 'Customer' : 'Lead'}
                    {selectedLead?.service_needed && ` - ${selectedLead.service_needed}`}
                  </p>
                </div>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={clearSelection}>
                Change
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => setShowSearch(!showSearch)}
              >
                <Search className="h-4 w-4" />
                Search customer or lead
                <ChevronDown
                  className={cn(
                    'h-4 w-4 ml-auto transition-transform',
                    showSearch && 'rotate-180'
                  )}
                />
              </Button>

              {showSearch && (
                <div className="space-y-2 animate-in slide-in-from-top-2 fade-in duration-200">
                  <Input
                    type="text"
                    placeholder="Search by name or phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                  />

                  {searching && (
                    <div className="text-center py-4 text-text-muted">Searching...</div>
                  )}

                  {!searching &&
                    (searchResults.customers.length > 0 ||
                      searchResults.leads.length > 0) && (
                      <div className="border border-border rounded-lg divide-y divide-border max-h-64 overflow-y-auto">
                        {searchResults.customers.length > 0 && (
                          <div>
                            <div className="px-3 py-1.5 bg-muted text-xs font-medium text-text-muted">
                              Customers
                            </div>
                            {searchResults.customers.map((customer) => (
                              <button
                                key={customer.id}
                                type="button"
                                onClick={() => selectCustomer(customer)}
                                className="w-full p-3 flex items-center gap-3 hover:bg-muted text-left"
                              >
                                <User className="h-4 w-4 text-primary" />
                                <div>
                                  <p className="font-medium text-text">{customer.name}</p>
                                  <p className="text-sm text-text-muted">
                                    {customer.phone
                                      ? formatPhoneNumber(customer.phone)
                                      : customer.email}
                                  </p>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}

                        {searchResults.leads.length > 0 && (
                          <div>
                            <div className="px-3 py-1.5 bg-muted text-xs font-medium text-text-muted">
                              Leads
                            </div>
                            {searchResults.leads.map((lead) => (
                              <button
                                key={lead.id}
                                type="button"
                                onClick={() => selectLead(lead)}
                                className="w-full p-3 flex items-center gap-3 hover:bg-muted text-left"
                              >
                                <User className="h-4 w-4 text-warning" />
                                <div>
                                  <p className="font-medium text-text">
                                    {lead.name || lead.service_needed || 'Lead'}
                                  </p>
                                  <p className="text-sm text-text-muted">
                                    {lead.phone ? formatPhoneNumber(lead.phone) : 'No phone'}
                                  </p>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                  {!searching &&
                    searchQuery.length >= 2 &&
                    searchResults.customers.length === 0 &&
                    searchResults.leads.length === 0 && (
                      <p className="text-center py-4 text-text-muted">No results found</p>
                    )}
                </div>
              )}

              <p className="text-sm text-text-muted text-center">
                Or enter phone number directly
              </p>
            </div>
          )}
        </section>

        {/* Phone number */}
        <div>
          <Label htmlFor="phone" className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-text-muted" />
            Phone Number *
          </Label>
          <Input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => updateField('phone', e.target.value)}
            onBlur={handlePhoneBlur}
            placeholder="(555) 123-4567"
            className="mt-1"
          />
        </div>

        {/* Direction */}
        <div>
          <Label className="flex items-center gap-2 mb-2">Direction</Label>
          <div className="grid grid-cols-2 gap-2">
            {DIRECTION_OPTIONS.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => updateField('direction', option.value)}
                  className={cn(
                    'p-3 rounded-lg border flex items-center gap-2 transition-colors',
                    formData.direction === option.value
                      ? 'bg-primary/10 border-primary'
                      : 'border-border hover:bg-muted'
                  )}
                >
                  <Icon
                    className={cn(
                      'h-5 w-5',
                      formData.direction === option.value ? 'text-primary' : 'text-text-muted'
                    )}
                  />
                  <span className="font-medium text-text">{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Outcome */}
        <div>
          <Label className="flex items-center gap-2 mb-2">Outcome</Label>
          <div className="grid grid-cols-2 gap-2">
            {OUTCOME_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  updateField('outcome', formData.outcome === option.value ? '' : option.value)
                }
                className={cn(
                  'p-3 rounded-lg border text-left transition-colors',
                  formData.outcome === option.value
                    ? 'bg-primary/10 border-primary'
                    : 'border-border hover:bg-muted'
                )}
              >
                <p className="font-medium text-text text-sm">{option.label}</p>
                <p className="text-xs text-text-muted">{option.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Duration */}
        <div>
          <Label className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-text-muted" />
            Duration (optional)
          </Label>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Input
                type="number"
                value={formData.duration_minutes}
                onChange={(e) => updateField('duration_minutes', e.target.value)}
                placeholder="0"
                min="0"
                max="999"
              />
              <p className="text-xs text-text-muted mt-1 text-center">minutes</p>
            </div>
            <span className="text-text-muted">:</span>
            <div className="flex-1">
              <Input
                type="number"
                value={formData.duration_seconds}
                onChange={(e) => updateField('duration_seconds', e.target.value)}
                placeholder="0"
                min="0"
                max="59"
              />
              <p className="text-xs text-text-muted mt-1 text-center">seconds</p>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <Label htmlFor="notes" className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-text-muted" />
            Notes
          </Label>
          <textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => updateField('notes', e.target.value)}
            placeholder="What was discussed..."
            rows={4}
            className="mt-1 w-full px-4 py-3 rounded-lg border border-border bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        </div>

        {/* Error message */}
        {error && (
          <div className="p-4 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm">
            {error}
          </div>
        )}
      </form>

      {/* Submit Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border pb-safe">
        <Button
          type="submit"
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full"
        >
          {submitting ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Logging...
            </>
          ) : (
            <>
              <Plus className="h-5 w-5 mr-2" />
              Log Call
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
