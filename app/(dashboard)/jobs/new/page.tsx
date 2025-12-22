'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient, getCurrentUserProfile } from '@/lib/supabase/client';
import { hasPermission } from '@/lib/permissions';
import { cn, formatPhoneNumber, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { UserWithBusiness, Customer, Lead, User, JobStatus } from '@/types';
import {
  ArrowLeft,
  User as UserIcon,
  Phone,
  Calendar,
  Clock,
  DollarSign,
  FileText,
  Search,
  ChevronDown,
  Plus,
  MapPin,
  Users,
} from 'lucide-react';

interface FormData {
  title: string;
  description: string;
  scheduled_date: string;
  scheduled_time: string;
  estimated_duration: string;
  price: string;
  assigned_user_id: string;
}

export default function NewJobPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const leadId = searchParams.get('lead_id');
  const customerId = searchParams.get('customer_id');

  const [user, setUser] = useState<UserWithBusiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Customer selection
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchingCustomers, setSearchingCustomers] = useState(false);

  // Team members for assignment
  const [teamMembers, setTeamMembers] = useState<User[]>([]);

  // Lead data (if converting from lead)
  const [lead, setLead] = useState<Lead | null>(null);

  // Form state
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    scheduled_date: '',
    scheduled_time: '',
    estimated_duration: '',
    price: '',
    assigned_user_id: '',
  });

  // Load user and team members
  useEffect(() => {
    async function loadData() {
      const profile = await getCurrentUserProfile();
      if (!profile || !hasPermission(profile.role, 'create_jobs')) {
        router.push('/dashboard');
        return;
      }
      setUser(profile as UserWithBusiness);

      // Load team members for assignment dropdown
      const supabase = createClient();
      const { data: members } = await supabase
        .from('users')
        .select('id, name, role')
        .eq('business_id', profile.business_id)
        .eq('is_active', true)
        .order('name');

      setTeamMembers(members || []);

      // Default assign to self
      setFormData((prev) => ({
        ...prev,
        assigned_user_id: profile.id,
      }));

      setLoading(false);
    }
    loadData();
  }, [router]);

  // Load lead if converting
  useEffect(() => {
    async function loadLead() {
      if (!leadId || !user) return;

      const supabase = createClient();
      const { data: leadData } = await supabase
        .from('leads')
        .select(`
          *,
          customer:customers (*)
        `)
        .eq('id', leadId)
        .single();

      if (leadData) {
        setLead(leadData);
        if (leadData.customer) {
          setSelectedCustomer(leadData.customer);
        }
        setFormData((prev) => ({
          ...prev,
          title: leadData.service_needed || '',
          description: leadData.notes || '',
        }));
      }
    }
    loadLead();
  }, [leadId, user]);

  // Load existing customer if customerId provided
  useEffect(() => {
    async function loadCustomer() {
      if (!customerId || !user || selectedCustomer) return;

      const supabase = createClient();
      const { data } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();

      if (data) {
        setSelectedCustomer(data);
      }
    }
    loadCustomer();
  }, [customerId, user, selectedCustomer]);

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
    setShowCustomerSearch(false);
    setCustomerSearchQuery('');
    setCustomerResults([]);
  };

  // Update form field
  const updateField = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!selectedCustomer) {
      setError('Please select a customer');
      return;
    }
    if (!formData.title.trim()) {
      setError('Job title is required');
      return;
    }
    if (!formData.scheduled_date) {
      setError('Scheduled date is required');
      return;
    }

    setSubmitting(true);
    setError(null);

    const supabase = createClient();

    try {
      // Create job
      const { data: newJob, error: jobError } = await supabase
        .from('jobs')
        .insert({
          business_id: user!.business_id,
          customer_id: selectedCustomer.id,
          lead_id: lead?.id || null,
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          scheduled_date: formData.scheduled_date,
          scheduled_time: formData.scheduled_time || null,
          estimated_duration: formData.estimated_duration
            ? parseFloat(formData.estimated_duration)
            : null,
          price: formData.price ? parseFloat(formData.price) : null,
          assigned_user_id: formData.assigned_user_id || user!.id,
          status: 'scheduled' as JobStatus,
        })
        .select()
        .single();

      if (jobError) throw jobError;

      // Update lead status if converting
      if (lead) {
        await supabase
          .from('leads')
          .update({ status: 'won' })
          .eq('id', lead.id);
      }

      router.push(`/jobs/${newJob.id}`);
    } catch (err) {
      console.error('Error creating job:', err);
      setError('Failed to create job. Please try again.');
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

  // Get today's date in YYYY-MM-DD format for min date
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky-header bg-background border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => router.back()} className="p-2 -ml-2">
            <ArrowLeft className="h-5 w-5 text-text" />
          </button>
          <h1 className="text-lg font-semibold text-text">
            {lead ? 'Convert Lead to Job' : 'New Job'}
          </h1>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="px-4 py-4 space-y-6">
        {/* Customer Selection */}
        <section>
          <Label className="text-base font-semibold mb-3 block">Customer *</Label>

          {selectedCustomer ? (
            <div className="card p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <UserIcon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-text">{selectedCustomer.name}</p>
                  <p className="text-sm text-text-muted">
                    {selectedCustomer.phone
                      ? formatPhoneNumber(selectedCustomer.phone)
                      : selectedCustomer.email}
                  </p>
                  {selectedCustomer.city && (
                    <p className="text-xs text-text-muted flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3" />
                      {selectedCustomer.city}
                    </p>
                  )}
                </div>
              </div>
              {!lead && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedCustomer(null)}
                >
                  Change
                </Button>
              )}
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
                Search customer
                <ChevronDown
                  className={cn(
                    'h-4 w-4 ml-auto transition-transform',
                    showCustomerSearch && 'rotate-180'
                  )}
                />
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
                    <div className="text-center py-4 text-text-muted">Searching...</div>
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
                          <UserIcon className="h-5 w-5 text-text-muted" />
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

                  {!searchingCustomers &&
                    customerSearchQuery.length >= 2 &&
                    customerResults.length === 0 && (
                      <p className="text-center py-4 text-text-muted">No customers found</p>
                    )}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Job Details */}
        <section className="space-y-4">
          <Label className="text-base font-semibold">Job Details</Label>

          <div>
            <Label htmlFor="title" className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-text-muted" />
              Job Title *
            </Label>
            <Input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="e.g., AC Repair, Kitchen Remodel..."
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="description" className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-text-muted" />
              Description (Optional)
            </Label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Job details, scope of work..."
              rows={3}
              className="mt-1 w-full px-4 py-3 rounded-lg border border-border bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>
        </section>

        {/* Scheduling */}
        <section className="space-y-4">
          <Label className="text-base font-semibold">Scheduling</Label>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="date" className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-text-muted" />
                Date *
              </Label>
              <Input
                id="date"
                type="date"
                value={formData.scheduled_date}
                onChange={(e) => updateField('scheduled_date', e.target.value)}
                min={today}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="time" className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-text-muted" />
                Time
              </Label>
              <Input
                id="time"
                type="time"
                value={formData.scheduled_time}
                onChange={(e) => updateField('scheduled_time', e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="duration" className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-text-muted" />
              Estimated Duration (hours)
            </Label>
            <Input
              id="duration"
              type="number"
              value={formData.estimated_duration}
              onChange={(e) => updateField('estimated_duration', e.target.value)}
              placeholder="e.g., 2"
              min="0.5"
              step="0.5"
              className="mt-1"
            />
          </div>
        </section>

        {/* Assignment */}
        {teamMembers.length > 1 && (
          <section className="space-y-4">
            <Label className="text-base font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-text-muted" />
              Assign To
            </Label>

            <div className="grid grid-cols-2 gap-2">
              {teamMembers.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => updateField('assigned_user_id', member.id)}
                  className={cn(
                    'p-3 rounded-lg border text-left transition-colors',
                    formData.assigned_user_id === member.id
                      ? 'bg-primary/10 border-primary'
                      : 'border-border hover:bg-muted'
                  )}
                >
                  <p className="font-medium text-text">{member.name}</p>
                  <p className="text-xs text-text-muted capitalize">{member.role}</p>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Pricing */}
        <section className="space-y-4">
          <Label className="text-base font-semibold">Pricing</Label>

          <div>
            <Label htmlFor="price" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-text-muted" />
              Price (Optional)
            </Label>
            <Input
              id="price"
              type="number"
              value={formData.price}
              onChange={(e) => updateField('price', e.target.value)}
              placeholder="0"
              min="0"
              step="0.01"
              className="mt-1"
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
          {lead ? 'Convert to Job' : 'Schedule Job'}
        </Button>
      </div>
    </div>
  );
}
