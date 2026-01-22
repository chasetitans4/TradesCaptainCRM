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

interface AddAgentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface AgentFormData {
  full_name: string;
  email: string;
  phone: string;
  role: 'agent' | 'admin' | 'finance';
  commission_rate: number;
  hire_date: string;
}

const initialFormData: AgentFormData = {
  full_name: '',
  email: '',
  phone: '',
  role: 'agent',
  commission_rate: 0.10,
  hire_date: new Date().toISOString().split('T')[0],
};

export function AddAgentModal({ open, onOpenChange, onSuccess }: AddAgentModalProps) {
  const [formData, setFormData] = React.useState<AgentFormData>(initialFormData);
  const [submitting, setSubmitting] = React.useState(false);
  const [errors, setErrors] = React.useState<Partial<Record<keyof AgentFormData, string>>>({});

  // Reset form when modal closes
  React.useEffect(() => {
    if (!open) {
      setFormData(initialFormData);
      setErrors({});
    }
  }, [open]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof AgentFormData, string>> = {};

    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Full name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.role) {
      newErrors.role = 'Role is required';
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
      const res = await fetch('/api/admin/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: formData.full_name.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim() || undefined,
          role: formData.role,
          commission_rate: formData.commission_rate,
          hire_date: formData.hire_date || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create agent');
      }

      showSuccess('Agent created successfully');
      onOpenChange(false);
      onSuccess?.();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create agent';
      showError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (field: keyof AgentFormData, value: string | number) => {
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
          <DialogTitle>Add New Agent</DialogTitle>
          <DialogDescription>
            Create a new agent account. They will receive login credentials via email.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Full Name */}
          <div>
            <label htmlFor="full_name" className="block text-sm font-medium text-text mb-1">
              Full Name <span className="text-danger">*</span>
            </label>
            <input
              id="full_name"
              type="text"
              value={formData.full_name}
              onChange={(e) => handleChange('full_name', e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border ${
                errors.full_name ? 'border-danger' : 'border-border'
              } bg-background focus:outline-none focus:ring-2 focus:ring-primary`}
              placeholder="John Smith"
              aria-invalid={!!errors.full_name}
              aria-describedby={errors.full_name ? 'full_name-error' : undefined}
            />
            {errors.full_name && (
              <p id="full_name-error" className="text-sm text-danger mt-1">
                {errors.full_name}
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-text mb-1">
              Email <span className="text-danger">*</span>
            </label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border ${
                errors.email ? 'border-danger' : 'border-border'
              } bg-background focus:outline-none focus:ring-2 focus:ring-primary`}
              placeholder="agent@example.com"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'email-error' : undefined}
            />
            {errors.email && (
              <p id="email-error" className="text-sm text-danger mt-1">
                {errors.email}
              </p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-text mb-1">
              Phone
            </label>
            <input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="(555) 123-4567"
            />
          </div>

          {/* Role */}
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-text mb-1">
              Role <span className="text-danger">*</span>
            </label>
            <select
              id="role"
              value={formData.role}
              onChange={(e) => handleChange('role', e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border ${
                errors.role ? 'border-danger' : 'border-border'
              } bg-background focus:outline-none focus:ring-2 focus:ring-primary`}
              aria-invalid={!!errors.role}
              aria-describedby={errors.role ? 'role-error' : undefined}
            >
              <option value="agent">Sales Agent</option>
              <option value="admin">Admin</option>
              <option value="finance">Finance</option>
            </select>
            {errors.role && (
              <p id="role-error" className="text-sm text-danger mt-1">
                {errors.role}
              </p>
            )}
          </div>

          {/* Commission Rate - Only show for agents */}
          {formData.role === 'agent' && (
            <div>
              <label htmlFor="commission_rate" className="block text-sm font-medium text-text mb-1">
                Commission Rate
              </label>
              <div className="relative">
                <input
                  id="commission_rate"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={Math.round(formData.commission_rate * 100)}
                  onChange={(e) => handleChange('commission_rate', parseFloat(e.target.value) / 100)}
                  className="w-full px-3 py-2 pr-8 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  %
                </span>
              </div>
            </div>
          )}

          {/* Hire Date */}
          <div>
            <label htmlFor="hire_date" className="block text-sm font-medium text-text mb-1">
              Hire Date
            </label>
            <input
              id="hire_date"
              type="date"
              value={formData.hire_date}
              onChange={(e) => handleChange('hire_date', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
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
              Create Agent
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
