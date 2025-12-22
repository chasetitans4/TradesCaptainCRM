'use client';

import { useState, useEffect } from 'react';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';

interface ServiceRequestFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  primaryColor?: string;
}

export function ServiceRequestForm({
  onSuccess,
  onCancel,
  primaryColor = '#2563eb',
}: ServiceRequestFormProps) {
  const [formData, setFormData] = useState({
    serviceType: '',
    description: '',
    urgency: 'normal',
    preferredDate: '',
    preferredTimeSlot: '',
    flexibleScheduling: true,
    equipmentId: '',
    notes: '',
  });
  const [equipment, setEquipment] = useState<Array<{ id: string; name: string; type: string }>>([]);
  const [serviceTypes, setServiceTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchFormData();
  }, []);

  const fetchFormData = async () => {
    try {
      const response = await fetch('/api/portal/service-request');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      setEquipment(data.equipment || []);
      setServiceTypes(data.serviceTypes || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/portal/service-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      setSuccess(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (success) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-xl">Request Submitted!</h3>
              <p className="text-muted-foreground mt-2">
                We've received your service request and will be in touch shortly to
                confirm your appointment.
              </p>
            </div>
            <Button
              onClick={onSuccess || onCancel}
              style={{ backgroundColor: primaryColor }}
              className="mt-4"
            >
              Back to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Request Service</CardTitle>
        <CardDescription>
          Tell us what you need and we'll get back to you promptly
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Service Type */}
          <div className="space-y-2">
            <Label htmlFor="serviceType">Type of Service *</Label>
            <Select
              value={formData.serviceType}
              onValueChange={(v) => setFormData({ ...formData, serviceType: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a service type" />
              </SelectTrigger>
              <SelectContent>
                {serviceTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Describe Your Issue *</Label>
            <Textarea
              id="description"
              placeholder="Please describe what you need help with..."
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={4}
              required
            />
          </div>

          {/* Urgency */}
          <div className="space-y-3">
            <Label>How urgent is this?</Label>
            <RadioGroup
              value={formData.urgency}
              onValueChange={(v) => setFormData({ ...formData, urgency: v })}
              className="space-y-2"
            >
              <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="normal" id="normal" />
                <Label htmlFor="normal" className="cursor-pointer flex-1">
                  <span className="font-medium">Normal</span>
                  <span className="text-sm text-muted-foreground block">
                    Schedule at your convenience
                  </span>
                </Label>
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="urgent" id="urgent" />
                <Label htmlFor="urgent" className="cursor-pointer flex-1">
                  <span className="font-medium">Urgent</span>
                  <span className="text-sm text-muted-foreground block">
                    Need service within 24-48 hours
                  </span>
                </Label>
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-lg border border-orange-200 hover:bg-orange-50 cursor-pointer">
                <RadioGroupItem value="emergency" id="emergency" />
                <Label htmlFor="emergency" className="cursor-pointer flex-1">
                  <span className="font-medium text-orange-600">Emergency</span>
                  <span className="text-sm text-muted-foreground block">
                    Need immediate assistance
                  </span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Equipment (if any) */}
          {equipment.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="equipment">Related Equipment (optional)</Label>
              <Select
                value={formData.equipmentId}
                onValueChange={(v) => setFormData({ ...formData, equipmentId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select equipment if applicable" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {equipment.map((eq) => (
                    <SelectItem key={eq.id} value={eq.id}>
                      {eq.name} ({eq.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Preferred Date */}
          <div className="space-y-2">
            <Label htmlFor="preferredDate">Preferred Date (optional)</Label>
            <Input
              id="preferredDate"
              type="date"
              value={formData.preferredDate}
              onChange={(e) =>
                setFormData({ ...formData, preferredDate: e.target.value })
              }
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          {/* Preferred Time */}
          <div className="space-y-2">
            <Label htmlFor="preferredTimeSlot">Preferred Time (optional)</Label>
            <Select
              value={formData.preferredTimeSlot}
              onValueChange={(v) =>
                setFormData({ ...formData, preferredTimeSlot: v })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a time preference" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No preference</SelectItem>
                <SelectItem value="morning">Morning (8am - 12pm)</SelectItem>
                <SelectItem value="afternoon">Afternoon (12pm - 5pm)</SelectItem>
                <SelectItem value="evening">Evening (5pm - 8pm)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Flexible Scheduling */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="flexibleScheduling"
              checked={formData.flexibleScheduling}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, flexibleScheduling: !!checked })
              }
            />
            <Label htmlFor="flexibleScheduling" className="text-sm">
              I'm flexible with scheduling
            </Label>
          </div>

          {/* Additional Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any other details we should know..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="flex-1"
                disabled={loading}
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              className="flex-1"
              style={{ backgroundColor: primaryColor }}
              disabled={loading || !formData.serviceType || !formData.description}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Submit Request'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
