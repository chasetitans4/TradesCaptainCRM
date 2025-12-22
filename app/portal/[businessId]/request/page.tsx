'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Wrench,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ServiceType {
  id: string;
  name: string;
  description?: string;
}

interface Equipment {
  id: string;
  name: string;
  equipment_type: string;
}

export default function ServiceRequestPage() {
  const params = useParams();
  const router = useRouter();
  const businessId = params.businessId as string;

  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    serviceType: '',
    description: '',
    preferredDate: '',
    preferredTimeSlot: '',
    urgency: 'normal',
    equipmentId: '',
  });

  useEffect(() => {
    async function loadData() {
      try {
        const response = await fetch(
          `/api/portal/service-request/options?businessId=${businessId}`
        );
        const data = await response.json();
        setServiceTypes(data.serviceTypes || []);
        setEquipment(data.equipment || []);
      } catch (error) {
        console.error('Error loading options:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [businessId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch('/api/portal/service-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          ...formData,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit request');
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <RequestSkeleton />;
  }

  if (success) {
    return (
      <div className="max-w-lg mx-auto">
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Request Submitted!
            </h2>
            <p className="text-gray-500 mb-6">
              We've received your service request and will be in touch shortly to
              schedule your appointment.
            </p>
            <div className="flex gap-3 justify-center">
              <Button
                variant="outline"
                onClick={() => {
                  setSuccess(false);
                  setFormData({
                    serviceType: '',
                    description: '',
                    preferredDate: '',
                    preferredTimeSlot: '',
                    urgency: 'normal',
                    equipmentId: '',
                  });
                }}
              >
                Submit Another Request
              </Button>
              <Button onClick={() => router.push(`/portal/${businessId}`)}>
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Request Service</h1>
        <p className="text-gray-500">Tell us what you need and we'll get back to you</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Service Type */}
            <div className="space-y-2">
              <Label htmlFor="serviceType">Service Type *</Label>
              <Select
                value={formData.serviceType}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, serviceType: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a service" />
                </SelectTrigger>
                <SelectContent>
                  {serviceTypes.map((type) => (
                    <SelectItem key={type.id} value={type.name}>
                      {type.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Equipment (if available) */}
            {equipment.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="equipment">Related Equipment (optional)</Label>
                <Select
                  value={formData.equipmentId}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, equipmentId: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select equipment" />
                  </SelectTrigger>
                  <SelectContent>
                    {equipment.map((eq) => (
                      <SelectItem key={eq.id} value={eq.id}>
                        {eq.name} ({eq.equipment_type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Describe the Issue *</Label>
              <Textarea
                id="description"
                placeholder="Please describe what's happening and any relevant details..."
                rows={4}
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                required
              />
            </div>

            {/* Urgency */}
            <div className="space-y-2">
              <Label htmlFor="urgency">Urgency</Label>
              <Select
                value={formData.urgency}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, urgency: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal - Schedule at convenience</SelectItem>
                  <SelectItem value="urgent">Urgent - Within a few days</SelectItem>
                  <SelectItem value="emergency">Emergency - As soon as possible</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Preferred Date */}
            <div className="space-y-2">
              <Label htmlFor="preferredDate">Preferred Date (optional)</Label>
              <Input
                id="preferredDate"
                type="date"
                value={formData.preferredDate}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, preferredDate: e.target.value }))
                }
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            {/* Preferred Time */}
            <div className="space-y-2">
              <Label htmlFor="preferredTimeSlot">Preferred Time (optional)</Label>
              <Select
                value={formData.preferredTimeSlot}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, preferredTimeSlot: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a time slot" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning">Morning (8am - 12pm)</SelectItem>
                  <SelectItem value="afternoon">Afternoon (12pm - 5pm)</SelectItem>
                  <SelectItem value="anytime">Anytime</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={submitting || !formData.serviceType || !formData.description}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Submitting...
                </>
              ) : (
                <>
                  Submit Request
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function RequestSkeleton() {
  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-64 bg-gray-100 rounded animate-pulse mt-2" />
      </div>
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
                <div className="h-10 bg-gray-100 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
