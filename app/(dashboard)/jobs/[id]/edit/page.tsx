'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient, getCurrentUserProfile } from '@/lib/supabase/client';
import { hasPermission } from '@/lib/permissions';
import { cn, formatPhoneNumber } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { UserWithBusiness, Job, Customer, User, JobStatus } from '@/types';

// Partial user type for team member selection
type TeamMember = Pick<User, 'id' | 'name' | 'role'>;
import {
  ArrowLeft,
  User as UserIcon,
  Calendar,
  Clock,
  FileText,
  MapPin,
  Users,
  Save,
  Loader2,
  Bell,
  BellOff,
} from 'lucide-react';

interface JobWithCustomer extends Job {
  customer: Customer | null;
}

interface FormData {
  service_type: string;
  description: string;
  scheduled_date: string;
  scheduled_time_start: string;
  scheduled_time_end: string;
  status: JobStatus;
  tech_notes: string;
  job_address_line1: string;
  job_address_city: string;
  job_address_state: string;
  job_address_zip: string;
  assigned_user_id: string;
  customer_reminders_enabled: boolean;
}

const STATUS_OPTIONS: { value: JobStatus; label: string }[] = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'no_show', label: 'No Show' },
];

export default function EditJobPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params.id as string;

  const [user, setUser] = useState<UserWithBusiness | null>(null);
  const [job, setJob] = useState<JobWithCustomer | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormData>({
    service_type: '',
    description: '',
    scheduled_date: '',
    scheduled_time_start: '',
    scheduled_time_end: '',
    status: 'scheduled',
    tech_notes: '',
    job_address_line1: '',
    job_address_city: '',
    job_address_state: '',
    job_address_zip: '',
    assigned_user_id: '',
    customer_reminders_enabled: true,
  });

  // Load user and team members
  useEffect(() => {
    async function loadUser() {
      const profile = await getCurrentUserProfile();
      if (!profile || !hasPermission(profile.role, 'manage_jobs')) {
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
        .eq('status', 'active')
        .order('name');

      setTeamMembers(members || []);
    }
    loadUser();
  }, [router]);

  // Load job data
  const loadJob = useCallback(async () => {
    if (!user || !jobId) return;

    const supabase = createClient();

    try {
      const { data, error: jobError } = await supabase
        .from('jobs')
        .select(`
          *,
          customer:customers (*)
        `)
        .eq('id', jobId)
        .single();

      if (jobError) throw jobError;

      setJob(data as JobWithCustomer);
      setFormData({
        service_type: data.service_type || '',
        description: data.description || '',
        scheduled_date: data.scheduled_date || '',
        scheduled_time_start: data.scheduled_time_start || '',
        scheduled_time_end: data.scheduled_time_end || '',
        status: data.status,
        tech_notes: data.tech_notes || '',
        job_address_line1: data.job_address_line1 || '',
        job_address_city: data.job_address_city || '',
        job_address_state: data.job_address_state || '',
        job_address_zip: data.job_address_zip || '',
        assigned_user_id: data.assigned_user_id || '',
        customer_reminders_enabled: data.customer_reminders_enabled ?? true,
      });
    } catch (err) {
      console.error('Error loading job:', err);
      router.push('/jobs');
    } finally {
      setLoading(false);
    }
  }, [user, jobId, router]);

  useEffect(() => {
    if (user && jobId) {
      loadJob();
    }
  }, [user, jobId, loadJob]);

  // Update form field
  const updateField = (field: keyof FormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  // Use customer address
  const useCustomerAddress = () => {
    if (!job?.customer) return;
    setFormData((prev) => ({
      ...prev,
      job_address_line1: job.customer?.address_line1 || '',
      job_address_city: job.customer?.city || '',
      job_address_state: job.customer?.state || '',
      job_address_zip: job.customer?.zip || '',
    }));
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.service_type.trim()) {
      setError('Service type is required');
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
      const updateData: Record<string, unknown> = {
        service_type: formData.service_type.trim(),
        description: formData.description.trim() || null,
        scheduled_date: formData.scheduled_date,
        scheduled_time_start: formData.scheduled_time_start || null,
        scheduled_time_end: formData.scheduled_time_end || null,
        status: formData.status,
        tech_notes: formData.tech_notes.trim() || null,
        job_address_line1: formData.job_address_line1.trim() || null,
        job_address_city: formData.job_address_city.trim() || null,
        job_address_state: formData.job_address_state.trim() || null,
        job_address_zip: formData.job_address_zip.trim() || null,
        assigned_user_id: formData.assigned_user_id || null,
        customer_reminders_enabled: formData.customer_reminders_enabled,
      };

      // Set completion timestamp if status changed to completed
      if (formData.status === 'completed' && job?.status !== 'completed') {
        updateData.completed_at = new Date().toISOString();
      } else if (formData.status !== 'completed') {
        updateData.completed_at = null;
      }

      const { error: updateError } = await supabase
        .from('jobs')
        .update(updateData)
        .eq('id', jobId);

      if (updateError) throw updateError;

      router.push(`/jobs/${jobId}`);
    } catch (err) {
      console.error('Error updating job:', err);
      setError('Failed to update job. Please try again.');
      setSubmitting(false);
    }
  };

  if (loading || !user) {
    return <EditJobSkeleton />;
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky-header bg-background border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => router.back()} className="p-2 -ml-2">
            <ArrowLeft className="h-5 w-5 text-text" />
          </button>
          <h1 className="text-lg font-semibold text-text">Edit Job</h1>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="px-4 py-4 space-y-6">
        {/* Customer Info (read-only) */}
        {job?.customer && (
          <section className="card p-4">
            <Label className="text-sm text-text-muted mb-2 block">Customer</Label>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <UserIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-text">{job.customer.name}</p>
                <p className="text-sm text-text-muted">
                  {job.customer.phone
                    ? formatPhoneNumber(job.customer.phone)
                    : job.customer.email}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Job Details */}
        <section className="space-y-4">
          <Label className="text-base font-semibold">Job Details</Label>

          <div>
            <Label htmlFor="service_type" className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-text-muted" />
              Service Type *
            </Label>
            <Input
              id="service_type"
              type="text"
              value={formData.service_type}
              onChange={(e) => updateField('service_type', e.target.value)}
              placeholder="e.g., AC Repair, Kitchen Remodel..."
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="description" className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-text-muted" />
              Description
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

          <div>
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              value={formData.status}
              onChange={(e) => updateField('status', e.target.value as JobStatus)}
              className="mt-1 w-full h-12 px-4 rounded-lg border border-border bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="tech_notes" className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-text-muted" />
              Tech Notes
            </Label>
            <textarea
              id="tech_notes"
              value={formData.tech_notes}
              onChange={(e) => updateField('tech_notes', e.target.value)}
              placeholder="Internal notes for technicians..."
              rows={2}
              className="mt-1 w-full px-4 py-3 rounded-lg border border-border bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>
        </section>

        {/* Scheduling */}
        <section className="space-y-4">
          <Label className="text-base font-semibold">Scheduling</Label>

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
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="time_start" className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-text-muted" />
                Start Time
              </Label>
              <Input
                id="time_start"
                type="time"
                value={formData.scheduled_time_start}
                onChange={(e) => updateField('scheduled_time_start', e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="time_end" className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-text-muted" />
                End Time
              </Label>
              <Input
                id="time_end"
                type="time"
                value={formData.scheduled_time_end}
                onChange={(e) => updateField('scheduled_time_end', e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        </section>

        {/* Job Address */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold flex items-center gap-2">
              <MapPin className="h-4 w-4 text-text-muted" />
              Job Address
            </Label>
            {job?.customer && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={useCustomerAddress}
              >
                Use Customer Address
              </Button>
            )}
          </div>

          <Input
            type="text"
            value={formData.job_address_line1}
            onChange={(e) => updateField('job_address_line1', e.target.value)}
            placeholder="Street address"
          />

          <div className="grid grid-cols-3 gap-2">
            <Input
              type="text"
              value={formData.job_address_city}
              onChange={(e) => updateField('job_address_city', e.target.value)}
              placeholder="City"
            />
            <Input
              type="text"
              value={formData.job_address_state}
              onChange={(e) => updateField('job_address_state', e.target.value)}
              placeholder="State"
            />
            <Input
              type="text"
              value={formData.job_address_zip}
              onChange={(e) => updateField('job_address_zip', e.target.value)}
              placeholder="ZIP"
            />
          </div>
        </section>

        {/* Assignment */}
        {teamMembers.length > 0 && (
          <section className="space-y-4">
            <Label className="text-base font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-text-muted" />
              Assign To
            </Label>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => updateField('assigned_user_id', '')}
                className={cn(
                  'p-3 rounded-lg border text-left transition-colors',
                  !formData.assigned_user_id
                    ? 'bg-primary/10 border-primary'
                    : 'border-border hover:bg-muted'
                )}
              >
                <p className="font-medium text-text">Unassigned</p>
                <p className="text-xs text-text-muted">No one assigned</p>
              </button>
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

        {/* Customer Reminders */}
        <section className="space-y-4">
          <Label className="text-base font-semibold">Notifications</Label>

          <button
            type="button"
            onClick={() =>
              updateField('customer_reminders_enabled', !formData.customer_reminders_enabled)
            }
            className={cn(
              'w-full p-4 rounded-lg border flex items-center gap-3 transition-colors',
              formData.customer_reminders_enabled
                ? 'bg-success/10 border-success'
                : 'border-border hover:bg-muted'
            )}
          >
            {formData.customer_reminders_enabled ? (
              <Bell className="h-5 w-5 text-success" />
            ) : (
              <BellOff className="h-5 w-5 text-text-muted" />
            )}
            <div className="text-left">
              <p className="font-medium text-text">Customer Reminders</p>
              <p className="text-sm text-text-muted">
                {formData.customer_reminders_enabled
                  ? 'Customer will receive appointment reminders'
                  : 'No reminders will be sent to customer'}
              </p>
            </div>
          </button>
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
          className="w-full"
        >
          {submitting ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-5 w-5 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function EditJobSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky-header bg-background border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="h-10 w-10 skeleton rounded-lg" />
          <div className="h-6 w-24 skeleton rounded" />
        </div>
      </header>
      <div className="px-4 py-4 space-y-6">
        <div className="card h-20 skeleton" />
        <div className="space-y-4">
          <div className="h-5 w-24 skeleton rounded" />
          <div className="h-12 w-full skeleton rounded-lg" />
          <div className="h-24 w-full skeleton rounded-lg" />
          <div className="h-12 w-full skeleton rounded-lg" />
        </div>
        <div className="space-y-4">
          <div className="h-5 w-24 skeleton rounded" />
          <div className="h-12 w-full skeleton rounded-lg" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-12 skeleton rounded-lg" />
            <div className="h-12 skeleton rounded-lg" />
          </div>
        </div>
        <div className="space-y-4">
          <div className="h-5 w-24 skeleton rounded" />
          <div className="h-12 w-full skeleton rounded-lg" />
          <div className="grid grid-cols-3 gap-2">
            <div className="h-12 skeleton rounded-lg" />
            <div className="h-12 skeleton rounded-lg" />
            <div className="h-12 skeleton rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
