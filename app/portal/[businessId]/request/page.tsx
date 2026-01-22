'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  AlertCircle,
  CheckCircle,
  ArrowRight,
  Loader2,
  Camera,
  X,
  ImagePlus,
  AlertTriangle,
  Clock,
  Zap,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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
import { AvailabilityPicker } from '@/components/portal';
import { logger } from '@/lib/logger';
const portalRequestLogger = logger.child({ context: 'portal.request' });

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
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);
  const [showScheduler, setShowScheduler] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        portalRequestLogger.error({
          msg: 'Error loading request options',
          businessId,
          error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) },
        });
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [businessId]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + photos.length > 5) {
      setError('Maximum 5 photos allowed');
      return;
    }

    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        setError('Only image files are allowed');
        return false;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setError('Each photo must be under 10MB');
        return false;
      }
      return true;
    });

    setPhotos(prev => [...prev, ...validFiles]);

    // Create preview URLs
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreviewUrls(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('businessId', businessId);
      formDataToSend.append('serviceType', formData.serviceType);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('urgency', formData.urgency);
      if (formData.preferredDate) formDataToSend.append('preferredDate', formData.preferredDate);
      if (formData.preferredTimeSlot) formDataToSend.append('preferredTimeSlot', formData.preferredTimeSlot);
      if (formData.equipmentId) formDataToSend.append('equipmentId', formData.equipmentId);
      
      photos.forEach(photo => {
        formDataToSend.append('photos', photo);
      });

      const response = await fetch('/api/portal/service-request', {
        method: 'POST',
        body: formDataToSend,
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

            {/* Urgency - Visual Card Selection */}
            <div className="space-y-2">
              <Label>How urgent is this?</Label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, urgency: 'normal' }))}
                  className={`p-3 rounded-lg border-2 text-center transition-all ${
                    formData.urgency === 'normal'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Clock className={`h-5 w-5 mx-auto mb-1 ${
                    formData.urgency === 'normal' ? 'text-blue-600' : 'text-gray-400'
                  }`} />
                  <p className={`text-sm font-medium ${
                    formData.urgency === 'normal' ? 'text-blue-700' : 'text-gray-700'
                  }`}>Normal</p>
                  <p className="text-xs text-gray-500">Schedule at convenience</p>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, urgency: 'urgent' }))}
                  className={`p-3 rounded-lg border-2 text-center transition-all ${
                    formData.urgency === 'urgent'
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <AlertTriangle className={`h-5 w-5 mx-auto mb-1 ${
                    formData.urgency === 'urgent' ? 'text-orange-600' : 'text-gray-400'
                  }`} />
                  <p className={`text-sm font-medium ${
                    formData.urgency === 'urgent' ? 'text-orange-700' : 'text-gray-700'
                  }`}>Urgent</p>
                  <p className="text-xs text-gray-500">Within a few days</p>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, urgency: 'emergency' }))}
                  className={`p-3 rounded-lg border-2 text-center transition-all ${
                    formData.urgency === 'emergency'
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Zap className={`h-5 w-5 mx-auto mb-1 ${
                    formData.urgency === 'emergency' ? 'text-red-600' : 'text-gray-400'
                  }`} />
                  <p className={`text-sm font-medium ${
                    formData.urgency === 'emergency' ? 'text-red-700' : 'text-gray-700'
                  }`}>Emergency</p>
                  <p className="text-xs text-gray-500">ASAP</p>
                </button>
              </div>
            </div>

            {/* Photo Upload */}
            <div className="space-y-2">
              <Label>Photos (optional)</Label>
              <p className="text-xs text-gray-500 mb-2">
                Add up to 5 photos to help us understand the issue
              </p>

              {/* Photo Preview Grid */}
              {photoPreviewUrls.length > 0 && (
                <div className="grid grid-cols-5 gap-2 mb-2">
                  {photoPreviewUrls.map((url, index) => (
                    <div key={index} className="relative aspect-square">
                      <img
                        src={url}
                        alt={`Upload ${index + 1}`}
                        className="w-full h-full object-cover rounded-lg border"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute -top-1 -right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Photo Button */}
              {photos.length < 5 && (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-dashed"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    {photos.length === 0 ? 'Add Photos' : 'Add More Photos'}
                  </Button>
                </div>
              )}
            </div>

            {/* Scheduling Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Scheduling Preference</Label>
                <button
                  type="button"
                  onClick={() => setShowScheduler(!showScheduler)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  {showScheduler ? 'Use simple options' : 'Pick from calendar'}
                </button>
              </div>

              {showScheduler ? (
                <div className="border rounded-lg p-4">
                  <AvailabilityPicker
                    businessId={businessId}
                    selectedDate={formData.preferredDate}
                    selectedTime={formData.preferredTimeSlot}
                    onSelect={(date, time) => {
                      setFormData((prev) => ({
                        ...prev,
                        preferredDate: date,
                        preferredTimeSlot: time,
                      }));
                    }}
                  />
                </div>
              ) : (
                <>
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
                </>
              )}
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
