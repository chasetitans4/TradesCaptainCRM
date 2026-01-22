'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { showSuccess, showError } from '@/lib/toast';

interface AddLeadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface LeadFormData {
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  trade_type: string;
  notes: string;
}

const initialFormData: LeadFormData = {
  company_name: '',
  contact_name: '',
  email: '',
  phone: '',
  trade_type: '',
  notes: '',
};

const tradeTypes = [
  'HVAC',
  'Plumbing',
  'Electrical',
  'Roofing',
  'General Contractor',
  'Landscaping',
  'Pest Control',
  'Cleaning Services',
  'Pool Service',
  'Appliance Repair',
  'Other',
];

export function AddLeadModal({ open, onOpenChange, onSuccess }: AddLeadModalProps) {
  const [formData, setFormData] = React.useState<LeadFormData>(initialFormData);
  const [submitting, setSubmitting] = React.useState(false);
  const [errors, setErrors] = React.useState<Partial<Record<keyof LeadFormData, string>>>({});

  // Reset form when modal closes
  React.useEffect(() => {
    if (!open) {
      setFormData(initialFormData);
      setErrors({});
    }
  }, [open]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof LeadFormData, string>> = {};

    if (!formData.company_name.trim()) {
      newErrors.company_name = 'Company name is required';
    }

    if (!formData.contact_name.trim()) {
      newErrors.contact_name = 'Contact name is required';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: formData.company_name.trim(),
          contact_name: formData.contact_name.trim(),
          email: formData.email.trim() || undefined,
          phone: formData.phone.trim() || undefined,
          trade_type: formData.trade_type || undefined,
          notes: formData.notes.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create lead');
      }

      showSuccess('Lead created successfully');
      onOpenChange(false);
      onSuccess?.();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create lead';
      showError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (field: keyof LeadFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Lead</DialogTitle>
          <DialogDescription>
            Create a new sales lead. You can add more details after creation.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Company Name */}
          <div>
            <label htmlFor="company_name" className="block text-sm font-medium text-text mb-1">
              Company Name <span className="text-danger">*</span>
            </label>
            <input
              id="company_name"
              type="text"
              value={formData.company_name}
              onChange={(e) => handleChange('company_name', e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border ${
                errors.company_name ? 'border-danger' : 'border-border'
              } bg-background focus:outline-none focus:ring-2 focus:ring-primary`}
              placeholder="ABC Heating & Cooling"
              aria-invalid={!!errors.company_name}
              aria-describedby={errors.company_name ? 'company_name-error' : undefined}
            />
            {errors.company_name && (
              <p id="company_name-error" className="text-sm text-danger mt-1">
                {errors.company_name}
              </p>
            )}
          </div>

          {/* Contact Name */}
          <div>
            <label htmlFor="contact_name" className="block text-sm font-medium text-text mb-1">
              Contact Name <span className="text-danger">*</span>
            </label>
            <input
              id="contact_name"
              type="text"
              value={formData.contact_name}
              onChange={(e) => handleChange('contact_name', e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border ${
                errors.contact_name ? 'border-danger' : 'border-border'
              } bg-background focus:outline-none focus:ring-2 focus:ring-primary`}
              placeholder="John Smith"
              aria-invalid={!!errors.contact_name}
              aria-describedby={errors.contact_name ? 'contact_name-error' : undefined}
            />
            {errors.contact_name && (
              <p id="contact_name-error" className="text-sm text-danger mt-1">
                {errors.contact_name}
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="lead_email" className="block text-sm font-medium text-text mb-1">
              Email
            </label>
            <input
              id="lead_email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border ${
                errors.email ? 'border-danger' : 'border-border'
              } bg-background focus:outline-none focus:ring-2 focus:ring-primary`}
              placeholder="contact@example.com"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'lead_email-error' : undefined}
            />
            {errors.email && (
              <p id="lead_email-error" className="text-sm text-danger mt-1">
                {errors.email}
              </p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="lead_phone" className="block text-sm font-medium text-text mb-1">
              Phone
            </label>
            <input
              id="lead_phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="(555) 123-4567"
            />
          </div>

          {/* Trade Type */}
          <div>
            <label htmlFor="trade_type" className="block text-sm font-medium text-text mb-1">
              Trade Type
            </label>
            <select
              id="trade_type"
              value={formData.trade_type}
              onChange={(e) => handleChange('trade_type', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select a trade type...</option>
              {tradeTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-text mb-1">
              Notes
            </label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              placeholder="Additional notes about this lead..."
            />
          </div>

          <DialogFooter className="mt-6 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Create Lead
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
