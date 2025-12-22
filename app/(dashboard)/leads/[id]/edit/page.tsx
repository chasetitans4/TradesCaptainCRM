'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient, getCurrentUserProfile } from '@/lib/supabase/client';
import { hasPermission } from '@/lib/permissions';
import { cn, formatPhoneNumber } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { UserWithBusiness, Lead, LeadStatus, LeadUrgency, LeadSource } from '@/types';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  Briefcase,
  AlertTriangle,
  DollarSign,
  FileText,
  Save,
  Loader2,
} from 'lucide-react';

const URGENCY_OPTIONS: { value: LeadUrgency; label: string; description: string }[] = [
  { value: 'low', label: 'Low', description: 'No rush, flexible timing' },
  { value: 'normal', label: 'Normal', description: 'Standard response time' },
  { value: 'high', label: 'High', description: 'Needs attention soon' },
  { value: 'emergency', label: 'Emergency', description: 'Urgent, immediate response' },
];

const STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'quoted', label: 'Quoted' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
];

const SOURCE_OPTIONS: LeadSource[] = [
  'website_chat',
  'phone',
  'ai_sms',
  'manual',
  'missed_call',
  'referral',
];

interface FormData {
  name: string;
  phone: string;
  email: string;
  service_needed: string;
  urgency: LeadUrgency;
  status: LeadStatus;
  source: LeadSource;
  estimated_value: string;
  notes: string;
  lost_reason: string;
}

export default function EditLeadPage() {
  const router = useRouter();
  const params = useParams();
  const leadId = params.id as string;

  const [user, setUser] = useState<UserWithBusiness | null>(null);
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormData>({
    name: '',
    phone: '',
    email: '',
    service_needed: '',
    urgency: 'normal',
    status: 'new',
    source: 'manual',
    estimated_value: '',
    notes: '',
    lost_reason: '',
  });

  // Load user
  useEffect(() => {
    async function loadUser() {
      const profile = await getCurrentUserProfile();
      if (!profile || !hasPermission(profile.role, 'edit_leads')) {
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
      const { data, error: leadError } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();

      if (leadError) throw leadError;

      setLead(data as Lead);
      setFormData({
        name: data.name || '',
        phone: data.phone ? formatPhoneNumber(data.phone) : '',
        email: data.email || '',
        service_needed: data.service_needed || '',
        urgency: data.urgency || 'normal',
        status: data.status,
        source: data.source as LeadSource || 'manual',
        estimated_value: data.estimated_value?.toString() || '',
        notes: data.description || '',
        lost_reason: data.lost_reason || '',
      });
    } catch (err) {
      console.error('Error loading lead:', err);
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
      const updateData: Record<string, unknown> = {
        name: formData.name.trim(),
        phone: formData.phone.replace(/\D/g, '') || null,
        email: formData.email.trim() || null,
        service_needed: formData.service_needed.trim() || null,
        urgency: formData.urgency,
        status: formData.status,
        source: formData.source,
        estimated_value: formData.estimated_value ? parseFloat(formData.estimated_value) : null,
        description: formData.notes.trim() || null,
      };

      // Add lost_reason only if status is lost
      if (formData.status === 'lost') {
        updateData.lost_reason = formData.lost_reason.trim() || null;
      } else {
        updateData.lost_reason = null;
      }

      const { error: updateError } = await supabase
        .from('leads')
        .update(updateData)
        .eq('id', leadId);

      if (updateError) throw updateError;

      router.push(`/leads/${leadId}`);
    } catch (err) {
      console.error('Error updating lead:', err);
      setError('Failed to update lead. Please try again.');
      setSubmitting(false);
    }
  };

  if (loading || !user) {
    return <EditLeadSkeleton />;
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky-header bg-background border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => router.back()} className="p-2 -ml-2">
            <ArrowLeft className="h-5 w-5 text-text" />
          </button>
          <h1 className="text-lg font-semibold text-text">Edit Lead</h1>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="px-4 py-4 space-y-6">
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
              className="mt-1"
            />
          </div>
        </section>

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
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              value={formData.status}
              onChange={(e) => updateField('status', e.target.value as LeadStatus)}
              className="mt-1 w-full h-12 px-4 rounded-lg border border-border bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          {formData.status === 'lost' && (
            <div className="animate-in slide-in-from-top-2 fade-in duration-200">
              <Label htmlFor="lost_reason">Reason for Lost</Label>
              <Input
                id="lost_reason"
                type="text"
                value={formData.lost_reason}
                onChange={(e) => updateField('lost_reason', e.target.value)}
                placeholder="e.g., Price too high, went with competitor..."
                className="mt-1"
              />
            </div>
          )}

          <div>
            <Label htmlFor="source">Source</Label>
            <select
              id="source"
              value={formData.source}
              onChange={(e) => updateField('source', e.target.value as LeadSource)}
              className="mt-1 w-full h-12 px-4 rounded-lg border border-border bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {SOURCE_OPTIONS.map((source) => (
                <option key={source} value={source}>
                  {source.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="value" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-text-muted" />
              Estimated Value
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
              Notes
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

function EditLeadSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky-header bg-background border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="h-10 w-10 skeleton rounded-lg" />
          <div className="h-6 w-24 skeleton rounded" />
        </div>
      </header>
      <div className="px-4 py-4 space-y-6">
        <div className="space-y-4">
          <div className="h-5 w-32 skeleton rounded" />
          <div className="h-12 w-full skeleton rounded-lg" />
          <div className="h-12 w-full skeleton rounded-lg" />
          <div className="h-12 w-full skeleton rounded-lg" />
        </div>
        <div className="space-y-4">
          <div className="h-5 w-24 skeleton rounded" />
          <div className="h-12 w-full skeleton rounded-lg" />
          <div className="grid grid-cols-2 gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 skeleton rounded-lg" />
            ))}
          </div>
          <div className="h-12 w-full skeleton rounded-lg" />
          <div className="h-12 w-full skeleton rounded-lg" />
          <div className="h-24 w-full skeleton rounded-lg" />
        </div>
      </div>
    </div>
  );
}
