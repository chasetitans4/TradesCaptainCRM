'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient, getCurrentUserProfile } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import type { UserWithBusiness, Customer, Job, Lead } from '@/types';
import {
  ArrowLeft,
  Bell,
  Clock,
  User,
  Briefcase,
  FileText,
  Search,
  ChevronDown,
  Plus,
  X,
} from 'lucide-react';

type LinkType = 'none' | 'customer' | 'job' | 'lead';

interface FormData {
  title: string;
  notes: string;
  due_date: string;
  due_time: string;
}

export default function NewReminderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const customerId = searchParams.get('customer_id');
  const jobId = searchParams.get('job_id');
  const leadId = searchParams.get('lead_id');

  const [user, setUser] = useState<UserWithBusiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Linked entity state
  const [linkType, setLinkType] = useState<LinkType>('none');
  const [linkedCustomer, setLinkedCustomer] = useState<Customer | null>(null);
  const [linkedJob, setLinkedJob] = useState<Job | null>(null);
  const [linkedLead, setLinkedLead] = useState<Lead | null>(null);

  // Search state
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{
    customers: Customer[];
    jobs: Job[];
    leads: Lead[];
  }>({ customers: [], jobs: [], leads: [] });
  const [searching, setSearching] = useState(false);

  // Form state
  const [formData, setFormData] = useState<FormData>({
    title: '',
    notes: '',
    due_date: '',
    due_time: '',
  });

  // Quick time presets
  const quickTimes = [
    { label: '1 hour', hours: 1 },
    { label: '3 hours', hours: 3 },
    { label: 'Tomorrow 9am', tomorrow: true },
    { label: 'Next week', days: 7 },
  ];

  // Load user
  useEffect(() => {
    async function loadUser() {
      const profile = await getCurrentUserProfile();
      if (!profile) {
        router.push('/login');
        return;
      }
      setUser(profile as UserWithBusiness);

      // Set default date/time to tomorrow at 9am
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);

      setFormData((prev) => ({
        ...prev,
        due_date: tomorrow.toISOString().split('T')[0],
        due_time: '09:00',
      }));

      setLoading(false);
    }
    loadUser();
  }, [router]);

  // Load linked entity if ID provided
  useEffect(() => {
    async function loadLinkedEntity() {
      if (!user) return;

      const supabase = createClient();

      if (customerId) {
        const { data } = await supabase
          .from('customers')
          .select('*')
          .eq('id', customerId)
          .single();
        if (data) {
          setLinkedCustomer(data);
          setLinkType('customer');
        }
      } else if (jobId) {
        const { data } = await supabase
          .from('jobs')
          .select('*, customer:customers!jobs_customer_id_fkey (id, name)')
          .eq('id', jobId)
          .single();
        if (data) {
          setLinkedJob(data);
          setLinkType('job');
          if (data.customer) {
            setLinkedCustomer(data.customer as Customer);
          }
        }
      } else if (leadId) {
        const { data } = await supabase
          .from('leads')
          .select('*, customer:customers (id, name)')
          .eq('id', leadId)
          .single();
        if (data) {
          setLinkedLead(data);
          setLinkType('lead');
          if (data.customer) {
            setLinkedCustomer(data.customer as Customer);
          }
        }
      }
    }
    loadLinkedEntity();
  }, [user, customerId, jobId, leadId]);

  // Search for entities
  useEffect(() => {
    async function search() {
      if (!searchQuery.trim() || searchQuery.length < 2) {
        setSearchResults({ customers: [], jobs: [], leads: [] });
        return;
      }

      setSearching(true);
      const supabase = createClient();

      const [customersRes, jobsRes, leadsRes] = await Promise.all([
        supabase
          .from('customers')
          .select('*')
          .or(`name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`)
          .limit(3),
        supabase
          .from('jobs')
          .select('*, customer:customers!jobs_customer_id_fkey (id, name)')
          .ilike('title', `%${searchQuery}%`)
          .limit(3),
        supabase
          .from('leads')
          .select('*, customer:customers!leads_customer_id_fkey (id, name)')
          .or(`service_needed.ilike.%${searchQuery}%,name.ilike.%${searchQuery}%`)
          .limit(3),
      ]);

      setSearchResults({
        customers: customersRes.data || [],
        jobs: jobsRes.data || [],
        leads: leadsRes.data || [],
      });
      setSearching(false);
    }

    const debounce = setTimeout(search, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  // Apply quick time preset
  const applyQuickTime = (preset: typeof quickTimes[0]) => {
    const now = new Date();

    if (preset.tomorrow) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      setFormData((prev) => ({
        ...prev,
        due_date: tomorrow.toISOString().split('T')[0],
        due_time: '09:00',
      }));
    } else if (preset.days) {
      const future = new Date(now);
      future.setDate(future.getDate() + preset.days);
      setFormData((prev) => ({
        ...prev,
        due_date: future.toISOString().split('T')[0],
        due_time: '09:00',
      }));
    } else if (preset.hours) {
      const future = new Date(now);
      future.setHours(future.getHours() + preset.hours);
      setFormData((prev) => ({
        ...prev,
        due_date: future.toISOString().split('T')[0],
        due_time: future.toTimeString().slice(0, 5),
      }));
    }
  };

  // Clear linked entity
  const clearLinkedEntity = () => {
    setLinkType('none');
    setLinkedCustomer(null);
    setLinkedJob(null);
    setLinkedLead(null);
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
    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }
    if (!formData.due_date) {
      setError('Due date is required');
      return;
    }

    setSubmitting(true);
    setError(null);

    const supabase = createClient();

    try {
      // Combine date and time
      const dueAt = new Date(
        `${formData.due_date}T${formData.due_time || '09:00'}:00`
      ).toISOString();

      const { error: insertError } = await supabase
        .from('reminders')
        .insert({
          business_id: user!.business_id,
          user_id: user!.id,
          title: formData.title.trim(),
          notes: formData.notes.trim() || null,
          due_at: dueAt,
          customer_id: linkedCustomer?.id || null,
          job_id: linkedJob?.id || null,
          lead_id: linkedLead?.id || null,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      router.push('/reminders');
    } catch (_err) {
      toast({
        title: 'Failed to create reminder',
        description: 'Please try again',
        variant: 'destructive',
      });
      setError('Failed to create reminder. Please try again.');
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
          <h1 className="text-lg font-semibold text-text">New Reminder</h1>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="px-4 py-4 space-y-6">
        {/* Title */}
        <div>
          <Label htmlFor="title" className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-text-muted" />
            What do you need to remember? *
          </Label>
          <Input
            id="title"
            type="text"
            value={formData.title}
            onChange={(e) => updateField('title', e.target.value)}
            placeholder="e.g., Call back John, Follow up on quote..."
            className="mt-1"
            autoFocus
          />
        </div>

        {/* Quick time presets */}
        <div>
          <Label className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-text-muted" />
            When?
          </Label>
          <div className="flex gap-2 flex-wrap mb-3">
            {quickTimes.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => applyQuickTime(preset)}
                className="px-3 py-1.5 text-sm rounded-full bg-muted text-text hover:bg-primary/10 hover:text-primary transition-colors"
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="date" className="sr-only">
                Date
              </Label>
              <Input
                id="date"
                type="date"
                value={formData.due_date}
                onChange={(e) => updateField('due_date', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="time" className="sr-only">
                Time
              </Label>
              <Input
                id="time"
                type="time"
                value={formData.due_time}
                onChange={(e) => updateField('due_time', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Link to entity */}
        <div>
          <Label className="flex items-center gap-2 mb-2">
            <User className="h-4 w-4 text-text-muted" />
            Link to (optional)
          </Label>

          {linkedCustomer || linkedJob || linkedLead ? (
            <div className="card p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'p-2 rounded-full',
                    linkType === 'customer' && 'bg-primary/10',
                    linkType === 'job' && 'bg-success/10',
                    linkType === 'lead' && 'bg-warning/10'
                  )}
                >
                  {linkType === 'customer' && <User className="h-4 w-4 text-primary" />}
                  {linkType === 'job' && <Briefcase className="h-4 w-4 text-success" />}
                  {linkType === 'lead' && <FileText className="h-4 w-4 text-warning" />}
                </div>
                <div>
                  <p className="font-medium text-text text-sm">
                    {linkType === 'customer' && linkedCustomer?.name}
                    {linkType === 'job' && linkedJob?.title}
                    {linkType === 'lead' && (linkedLead?.service_needed || 'Lead')}
                  </p>
                  <p className="text-xs text-text-muted capitalize">{linkType}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={clearLinkedEntity}
                className="p-1 text-text-muted hover:text-text"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => setShowSearch(!showSearch)}
              >
                <Search className="h-4 w-4" />
                Search customer, job, or lead
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
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                  />

                  {searching && (
                    <div className="text-center py-4 text-text-muted">Searching...</div>
                  )}

                  {!searching &&
                    (searchResults.customers.length > 0 ||
                      searchResults.jobs.length > 0 ||
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
                                onClick={() => {
                                  setLinkedCustomer(customer);
                                  setLinkType('customer');
                                  setShowSearch(false);
                                  setSearchQuery('');
                                }}
                                className="w-full p-3 flex items-center gap-3 hover:bg-muted text-left"
                              >
                                <User className="h-4 w-4 text-primary" />
                                <span className="text-sm text-text">{customer.name}</span>
                              </button>
                            ))}
                          </div>
                        )}

                        {searchResults.jobs.length > 0 && (
                          <div>
                            <div className="px-3 py-1.5 bg-muted text-xs font-medium text-text-muted">
                              Jobs
                            </div>
                            {searchResults.jobs.map((job) => (
                              <button
                                key={job.id}
                                type="button"
                                onClick={() => {
                                  setLinkedJob(job);
                                  setLinkType('job');
                                  if ((job as any).customer) {
                                    setLinkedCustomer((job as any).customer);
                                  }
                                  setShowSearch(false);
                                  setSearchQuery('');
                                }}
                                className="w-full p-3 flex items-center gap-3 hover:bg-muted text-left"
                              >
                                <Briefcase className="h-4 w-4 text-success" />
                                <span className="text-sm text-text">{job.title}</span>
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
                                onClick={() => {
                                  setLinkedLead(lead);
                                  setLinkType('lead');
                                  if ((lead as any).customer) {
                                    setLinkedCustomer((lead as any).customer);
                                  }
                                  setShowSearch(false);
                                  setSearchQuery('');
                                }}
                                className="w-full p-3 flex items-center gap-3 hover:bg-muted text-left"
                              >
                                <FileText className="h-4 w-4 text-warning" />
                                <span className="text-sm text-text">
                                  {lead.service_needed || 'Lead'}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                  {!searching &&
                    searchQuery.length >= 2 &&
                    searchResults.customers.length === 0 &&
                    searchResults.jobs.length === 0 &&
                    searchResults.leads.length === 0 && (
                      <p className="text-center py-4 text-text-muted">No results found</p>
                    )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Notes */}
        <div>
          <Label htmlFor="notes" className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-text-muted" />
            Notes (optional)
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
          Create Reminder
        </Button>
      </div>
    </div>
  );
}
