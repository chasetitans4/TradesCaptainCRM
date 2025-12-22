'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient, getCurrentUserProfile } from '@/lib/supabase/client';
import { hasPermission } from '@/lib/permissions';
import { formatPhoneNumber } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { UserWithBusiness, Customer } from '@/types';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  FileText,
  Tag,
  Save,
  Loader2,
} from 'lucide-react';

interface FormData {
  name: string;
  phone: string;
  email: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  zip: string;
  notes: string;
  tags: string;
}

export default function EditCustomerPage() {
  const router = useRouter();
  const params = useParams();
  const customerId = params.id as string;

  const [user, setUser] = useState<UserWithBusiness | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormData>({
    name: '',
    phone: '',
    email: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    zip: '',
    notes: '',
    tags: '',
  });

  // Load user
  useEffect(() => {
    async function loadUser() {
      const profile = await getCurrentUserProfile();
      if (!profile || !hasPermission(profile.role, 'manage_customers')) {
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
      const { data, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();

      if (customerError) throw customerError;

      setCustomer(data as Customer);
      setFormData({
        name: data.name || '',
        phone: data.phone ? formatPhoneNumber(data.phone) : '',
        email: data.email || '',
        address_line1: data.address_line1 || '',
        address_line2: data.address_line2 || '',
        city: data.city || '',
        state: data.state || '',
        zip: data.zip || '',
        notes: data.notes || '',
        tags: (data.tags || []).join(', '),
      });
    } catch (err) {
      console.error('Error loading customer:', err);
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
      // Parse tags
      const tagsArray = formData.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      const updateData = {
        name: formData.name.trim(),
        phone: formData.phone.replace(/\D/g, '') || null,
        email: formData.email.trim() || null,
        address_line1: formData.address_line1.trim() || null,
        address_line2: formData.address_line2.trim() || null,
        city: formData.city.trim() || null,
        state: formData.state.trim() || null,
        zip: formData.zip.trim() || null,
        notes: formData.notes.trim() || null,
        tags: tagsArray,
      };

      const { error: updateError } = await supabase
        .from('customers')
        .update(updateData)
        .eq('id', customerId);

      if (updateError) throw updateError;

      router.push(`/customers/${customerId}`);
    } catch (err) {
      console.error('Error updating customer:', err);
      setError('Failed to update customer. Please try again.');
      setSubmitting(false);
    }
  };

  if (loading || !user) {
    return <EditCustomerSkeleton />;
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky-header bg-background border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => router.back()} className="p-2 -ml-2">
            <ArrowLeft className="h-5 w-5 text-text" />
          </button>
          <h1 className="text-lg font-semibold text-text">Edit Customer</h1>
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

        {/* Address */}
        <section className="space-y-4">
          <Label className="text-base font-semibold flex items-center gap-2">
            <MapPin className="h-4 w-4 text-text-muted" />
            Address
          </Label>

          <Input
            type="text"
            value={formData.address_line1}
            onChange={(e) => updateField('address_line1', e.target.value)}
            placeholder="Street address"
          />

          <Input
            type="text"
            value={formData.address_line2}
            onChange={(e) => updateField('address_line2', e.target.value)}
            placeholder="Apt, suite, unit, etc. (optional)"
          />

          <div className="grid grid-cols-3 gap-2">
            <Input
              type="text"
              value={formData.city}
              onChange={(e) => updateField('city', e.target.value)}
              placeholder="City"
            />
            <Input
              type="text"
              value={formData.state}
              onChange={(e) => updateField('state', e.target.value)}
              placeholder="State"
            />
            <Input
              type="text"
              value={formData.zip}
              onChange={(e) => updateField('zip', e.target.value)}
              placeholder="ZIP"
            />
          </div>
        </section>

        {/* Additional Info */}
        <section className="space-y-4">
          <Label className="text-base font-semibold">Additional Information</Label>

          <div>
            <Label htmlFor="tags" className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-text-muted" />
              Tags
            </Label>
            <Input
              id="tags"
              type="text"
              value={formData.tags}
              onChange={(e) => updateField('tags', e.target.value)}
              placeholder="VIP, Commercial, Residential (comma-separated)"
              className="mt-1"
            />
            <p className="text-xs text-text-muted mt-1">Separate tags with commas</p>
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
              placeholder="Any additional notes about this customer..."
              rows={4}
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

function EditCustomerSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky-header bg-background border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="h-10 w-10 skeleton rounded-lg" />
          <div className="h-6 w-32 skeleton rounded" />
        </div>
      </header>
      <div className="px-4 py-4 space-y-6">
        <div className="space-y-4">
          <div className="h-5 w-40 skeleton rounded" />
          <div className="h-12 w-full skeleton rounded-lg" />
          <div className="h-12 w-full skeleton rounded-lg" />
          <div className="h-12 w-full skeleton rounded-lg" />
        </div>
        <div className="space-y-4">
          <div className="h-5 w-24 skeleton rounded" />
          <div className="h-12 w-full skeleton rounded-lg" />
          <div className="h-12 w-full skeleton rounded-lg" />
          <div className="grid grid-cols-3 gap-2">
            <div className="h-12 skeleton rounded-lg" />
            <div className="h-12 skeleton rounded-lg" />
            <div className="h-12 skeleton rounded-lg" />
          </div>
        </div>
        <div className="space-y-4">
          <div className="h-5 w-40 skeleton rounded" />
          <div className="h-12 w-full skeleton rounded-lg" />
          <div className="h-32 w-full skeleton rounded-lg" />
        </div>
      </div>
    </div>
  );
}
