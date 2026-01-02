'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient, getCurrentUserProfile } from '@/lib/supabase/client';
import { hasPermission } from '@/lib/permissions';
import { cn, formatPhoneNumber } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { UserWithBusiness, Customer, LeadStatus, LeadUrgency, LeadSource } from '@/types';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  AlertTriangle,
  DollarSign,
  FileText,
  ChevronDown,
  Search,
  Plus,
  Check,
} from 'lucide-react';

const URGENCY_OPTIONS: { value: LeadUrgency; label: string; description: string }[] = [
  { value: 'low', label: 'Low', description: 'No rush, flexible timing' },
  { value: 'normal', label: 'Normal', description: 'Standard response time' },
  { value: 'high', label: 'High', description: 'Needs attention soon' },
  { value: 'emergency', label: 'Emergency', description: 'Urgent, immediate response' },
];

const SOURCE_OPTIONS: LeadSource[] = [
  'website',
  'google',
  'referral',
  'repeat',
  'facebook',
  'instagram',
  'yelp',
  'thumbtack',
  'homeadvisor',
  'angies_list',
  'nextdoor',
  'other',
];

interface FormData {
  name: string;
  phone: string;
  email: string;
  address_line1: string;
  city: string;
  state: string;
  zip: string;
  service_needed: string;
  urgency: LeadUrgency;
  source: LeadSource;
  estimated_value: string;
  notes: string;
}

export default function NewLeadPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const customerId = searchParams.get('customer_id');

  const [user, setUser] = useState<UserWithBusiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Customer search state
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchingCustomers, setSearchingCustomers] = useState(false);

  // Form state
  const [formData, setFormData] = useState<FormData>({
    name: '',
    phone: '',
    email: '',
    address_line1: '',
    city: '',
    state: '',
    zip: '',
    service_needed: '',
    urgency: 'normal',
    source: 'website',
    estimated_value: '',
    notes: '',
  });

  // Load user
  useEffect(() => {
    async function loadUser() {
      const profile = await getCurrentUserProfile();
      if (!profile || !hasPermission(profile.role, 'create_leads')) {
        router.push('/dashboard');
        return;
      }
      setUser(profile as UserWithBusiness);
      setLoading(false);
    }
    loadUser();
  }, [router]);

  // Load existing customer if customerId provided
  useEffect(() => {
    async function loadCustomer() {
      if (!customerId || !user) return;

      const supabase = createClient();
      const { data } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();

      if (data) {
        setSelectedCustomer(data);
        setFormData((prev) => ({
          ...prev,
          name: data.name || '',
          phone: data.phone || '',
          email: data.email || '',
          address_line1: data.address_line1 || '',
          city: data.city || '',
          state: data.state || '',
          zip: data.zip || '',
        }));
      }
    }
    loadCustomer();
  }, [customerId, user]);

  // Search customers
  useEffect(() => {
    async function searchCustomers() {
      if (!customerSearchQuery.trim() || customerSearchQuery.length < 2) {
        setCustomerResults([]);
        return;
      }

      setSearchingCustomers(true);
      const supabase = createClient();

      const { data } = await supabase
        .from('customers')
        .select('*')
        .or(`name.ilike.%${customerSearchQuery}%,phone.ilike.%${customerSearchQuery}%`)
        .limit(5);

      setCustomerResults(data || []);
      setSearchingCustomers(false);
    }

    const debounce = setTimeout(searchCustomers, 300);
    return () => clearTimeout(debounce);
  }, [customerSearchQuery]);

  // Select customer
  const selectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData((prev) => ({
      ...prev,
      name: customer.name || '',
      phone: customer.phone || '',
      email: customer.email || '',
      address_line1: customer.address_line1 || '',
      city: customer.city || '',
      state: customer.state || '',
      zip: customer.zip || '',
    }));
    setShowCustomerSearch(false);
    setCustomerSearchQuery('');
    setCustomerResults([]);
  };

  // Clear selected customer
  const clearCustomer = () => {
    setSelectedCustomer(null);
    setFormData((prev) => ({
      ...prev,
      name: '',
      phone: '',
      email: '',
      address_line1: '',
      city: '',
      state: '',
      zip: '',
    }));
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
    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }
    if (!formData.phone.trim() && !formData.email.trim()) {
      setError('Phone or email is required');
      return;
    }

    setSubmitting(true);
    setError(null);

    const supabase = createClient();

    try {
      let customerIdToUse = selectedCustomer?.id;

      // Create new customer if none selected
      if (!customerIdToUse) {
        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({
            business_id: user!.business_id,
            name: formData.name.trim(),
            phone: formData.phone.replace(/\D/g, '') || null,
            email: formData.email.trim() || null,
            address_line1: formData.address_line1.trim() || null,
            city: formData.city.trim() || null,
            state: formData.state.trim() || null,
            zip: formData.zip.trim() || null,
          })
          .select()
          .single();

        if (customerError) throw customerError;
        customerIdToUse = newCustomer.id;
      }

      // Create lead
      const { data: newLead, error: leadError } = await supabase
        .from('leads')
        .insert({
          business_id: user!.business_id,
          customer_id: customerIdToUse,
          name: formData.name.trim(),
          phone: formData.phone.replace(/\D/g, '') || null,
          email: formData.email.trim() || null,
          service_needed: formData.service_needed.trim() || null,
          urgency: formData.urgency,
          source: formData.source,
          estimated_value: formData.estimated_value ? parseFloat(formData.estimated_value) : null,
          notes: formData.notes.trim() || null,
          status: 'new' as LeadStatus,
        })
        .select()
        .single();

      if (leadError) throw leadError;

      router.push(`/leads/${newLead.id}`);
    } catch (err) {
      console.error('Error creating lead:', err);
      setError('Failed to create lead. Please try again.');
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
          <h1 className="text-lg font-semibold text-text">New Lead</h1>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="px-4 py-4 space-y-6">
        {/* Customer Selection */}
        <section>
          <Label className="text-base font-semibold mb-3 block">Customer</Label>
          
          {selectedCustomer ? (
            <div className="card p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-text">{selectedCustomer.name}</p>
                  <p className="text-sm text-text-muted">
                    {selectedCustomer.phone ? formatPhoneNumber(selectedCustomer.phone) : selectedCustomer.email}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearCustomer}
              >
                Change
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => setShowCustomerSearch(!showCustomerSearch)}
              >
                <Search className="h-4 w-4" />
                Search existing customer
                <ChevronDown className={cn(
                  "h-4 w-4 ml-auto transition-transform",
                  showCustomerSearch && "rotate-180"
                )} />
              </Button>

              {showCustomerSearch && (
                <div className="space-y-2 animate-in slide-in-from-top-2 fade-in duration-200">
                  <Input
                    type="text"
                    placeholder="Search by name or phone..."
                    value={customerSearchQuery}
                    onChange={(e) => setCustomerSearchQuery(e.target.value)}
                    autoFocus
                  />
                  
                  {searchingCustomers && (
                    <div className="text-center py-4 text-text-muted">
                      Searching...
                    </div>
                  )}

                  {!searchingCustomers && customerResults.length > 0 && (
                    <div className="border border-border rounded-lg divide-y divide-border">
                      {customerResults.map((customer) => (
                        <button
                          key={customer.id}
                          type="button"
                          onClick={() => selectCustomer(customer)}
                          className="w-full p-3 flex items-center gap-3 hover:bg-muted text-left"
                        >
                          <User className="h-5 w-5 text-text-muted" />
                          <div>
                            <p className="font-medium text-text">{customer.name}</p>
                            <p className="text-sm text-text-muted">
                              {customer.phone ? formatPhoneNumber(customer.phone) : customer.email}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {!searchingCustomers && customerSearchQuery.length >= 2 && customerResults.length === 0 && (
                    <p className="text-center py-4 text-text-muted">
                      No customers found
                    </p>
                  )}
                </div>
              )}

              <p className="text-sm text-text-muted text-center">
                Or enter new customer details below
              </p>
            </div>
          )}
        </section>

        {/* Contact Info */}
        <section className="space-y-4">
          <Label className="text-base font-semibold">Contact Information</Label>
          
          <div>
            <Label htmlFor="name" className="flex items-center gap-2">
              <User className="h-4 w-4 text-text-muted" />
              Name *
            </Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="John Smith"
              disabled={!!selectedCustomer}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-text-muted" />
              Phone
            </Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              onBlur={handlePhoneBlur}
              placeholder="(555) 123-4567"
              disabled={!!selectedCustomer}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-text-muted" />
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => updateField('email', e.target.value)}
              placeholder="john@example.com"
              disabled={!!selectedCustomer}
              className="mt-1"
            />
          </div>
        </section>

        {/* Address */}
        {!selectedCustomer && (
          <section className="space-y-4">
            <Label className="text-base font-semibold flex items-center gap-2">
              <MapPin className="h-4 w-4 text-text-muted" />
              Address (Optional)
            </Label>
            
            <Input
              type="text"
              value={formData.address_line1}
              onChange={(e) => updateField('address_line1', e.target.value)}
              placeholder="Street address"
            />

            <div className="grid grid-cols-3 gap-2">
              <Input
                type="text"
                value={formData.city}
                onChange={(e) => updateField('city', e.target.value)}
                placeholder="City"
                className="col-span-1"
              />
              <Input
                type="text"
                value={formData.state}
                onChange={(e) => updateField('state', e.target.value)}
                placeholder="State"
                className="col-span-1"
              />
              <Input
                type="text"
                value={formData.zip}
                onChange={(e) => updateField('zip', e.target.value)}
                placeholder="ZIP"
                className="col-span-1"
              />
            </div>
          </section>
        )}

        {/* Lead Details */}
        <section className="space-y-4">
          <Label className="text-base font-semibold">Lead Details</Label>
          
          <div>
            <Label htmlFor="service" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-text-muted" />
              Service Needed
            </Label>
            <Input
              id="service"
              type="text"
              value={formData.service_needed}
              onChange={(e) => updateField('service_needed', e.target.value)}
              placeholder="e.g., Kitchen remodel, AC repair..."
              className="mt-1"
            />
          </div>

          <div>
            <Label className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-text-muted" />
              Urgency
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {URGENCY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => updateField('urgency', option.value)}
                  className={cn(
                    'p-3 rounded-lg border text-left transition-colors',
                    formData.urgency === option.value
                      ? 'bg-primary/10 border-primary'
                      : 'border-border hover:bg-muted'
                  )}
                >
                  <p className="font-medium text-text">{option.label}</p>
                  <p className="text-xs text-text-muted">{option.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="source" className="flex items-center gap-2">
              Source
            </Label>
            <select
              id="source"
              value={formData.source}
              onChange={(e) => updateField('source', e.target.value as LeadSource)}
              className="mt-1 w-full h-12 px-4 rounded-lg border border-border bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {SOURCE_OPTIONS.map((source) => (
                <option key={source} value={source}>
                  {source.charAt(0).toUpperCase() + source.slice(1).replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="value" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-text-muted" />
              Estimated Value (Optional)
            </Label>
            <Input
              id="value"
              type="number"
              value={formData.estimated_value}
              onChange={(e) => updateField('estimated_value', e.target.value)}
              placeholder="0"
              min="0"
              step="1"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="notes" className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-text-muted" />
              Notes (Optional)
            </Label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              placeholder="Any additional details..."
              rows={3}
              className="mt-1 w-full px-4 py-3 rounded-lg border border-border bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>
        </section>

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
          loading={submitting}
          className="w-full"
        >
          <Plus className="h-5 w-5 mr-2" />
          Create Lead
        </Button>
      </div>
    </div>
  );
}
