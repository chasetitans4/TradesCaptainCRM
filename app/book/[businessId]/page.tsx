'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  MapPin,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
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

interface BusinessInfo {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  logo_url?: string;
  primary_color?: string;
}

interface ServiceType {
  id: string;
  name: string;
  description?: string;
  duration?: number;
}

interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
}

type Step = 'service' | 'datetime' | 'contact' | 'confirm' | 'success';

export default function BookingPage() {
  const params = useParams();
  const businessId = params.businessId as string;

  const [business, setBusiness] = useState<BusinessInfo | null>(null);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [step, setStep] = useState<Step>('service');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [formData, setFormData] = useState({
    serviceType: '',
    date: '',
    timeSlot: '',
    name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    notes: '',
  });

  useEffect(() => {
    async function loadData() {
      try {
        const response = await fetch(`/api/booking/info?businessId=${businessId}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || 'Unable to load booking page');
          return;
        }

        setBusiness(data.business);
        setServiceTypes(data.serviceTypes || []);
      } catch (err) {
        setError('Unable to load booking page');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [businessId]);

  useEffect(() => {
    async function loadSlots() {
      if (!selectedDate) return;

      setLoadingSlots(true);
      try {
        const response = await fetch(
          `/api/booking/slots?businessId=${businessId}&date=${selectedDate}&service=${formData.serviceType}`
        );
        const data = await response.json();
        setAvailableSlots(data.slots || []);
      } catch (err) {
        console.error('Error loading slots:', err);
      } finally {
        setLoadingSlots(false);
      }
    }

    loadSlots();
  }, [selectedDate, businessId, formData.serviceType]);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/booking/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          ...formData,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit booking');
      }

      setStep('success');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const nextStep = () => {
    const steps: Step[] = ['service', 'datetime', 'contact', 'confirm'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  };

  const prevStep = () => {
    const steps: Step[] = ['service', 'datetime', 'contact', 'confirm'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  };

  const primaryColor = business?.primary_color || '#2563eb';

  if (loading) {
    return <BookingSkeleton />;
  }

  if (error && !business) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Booking Unavailable
            </h2>
            <p className="text-gray-500">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: `${primaryColor}20` }}
            >
              <CheckCircle className="h-8 w-8" style={{ color: primaryColor }} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Booking Request Submitted!
            </h2>
            <p className="text-gray-500 mb-6">
              Thank you for booking with {business?.name}. We'll confirm your
              appointment shortly via phone or email.
            </p>
            <div className="bg-gray-50 rounded-lg p-4 text-left space-y-2 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Service</span>
                <span className="font-medium">{formData.serviceType}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Date</span>
                <span className="font-medium">{formatDate(formData.date)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Time</span>
                <span className="font-medium">{formData.timeSlot}</span>
              </div>
            </div>
            {business?.phone && (
              <p className="text-sm text-gray-500">
                Questions? Call us at{' '}
                <a
                  href={`tel:${business.phone}`}
                  className="font-medium"
                  style={{ color: primaryColor }}
                >
                  {business.phone}
                </a>
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          {business?.logo_url ? (
            <img
              src={business.logo_url}
              alt={business.name}
              className="h-12 object-contain mx-auto mb-4"
            />
          ) : (
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-xl mx-auto mb-4"
              style={{ backgroundColor: primaryColor }}
            >
              {business?.name?.[0]}
            </div>
          )}
          <h1 className="text-2xl font-bold text-gray-900">{business?.name}</h1>
          <p className="text-gray-500">Book an appointment</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {['service', 'datetime', 'contact', 'confirm'].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step === s
                    ? 'text-white'
                    : ['service', 'datetime', 'contact', 'confirm'].indexOf(step) > i
                    ? 'bg-green-100 text-green-600'
                    : 'bg-gray-200 text-gray-500'
                }`}
                style={step === s ? { backgroundColor: primaryColor } : {}}
              >
                {['service', 'datetime', 'contact', 'confirm'].indexOf(step) > i ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  i + 1
                )}
              </div>
              {i < 3 && <div className="w-8 h-0.5 bg-gray-200" />}
            </div>
          ))}
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardContent className="pt-6">
            {/* Step 1: Service Selection */}
            {step === 'service' && (
              <div className="space-y-4">
                <div className="text-center mb-4">
                  <h2 className="text-lg font-semibold">Select a Service</h2>
                  <p className="text-sm text-gray-500">What do you need help with?</p>
                </div>
                <div className="space-y-2">
                  {serviceTypes.map((service) => (
                    <button
                      key={service.id}
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, serviceType: service.name }));
                      }}
                      className={`w-full p-4 rounded-lg border text-left transition-all ${
                        formData.serviceType === service.name
                          ? 'border-2 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      style={
                        formData.serviceType === service.name
                          ? { borderColor: primaryColor }
                          : {}
                      }
                    >
                      <p className="font-medium">{service.name}</p>
                      {service.description && (
                        <p className="text-sm text-gray-500 mt-1">
                          {service.description}
                        </p>
                      )}
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      setFormData((prev) => ({ ...prev, serviceType: 'Other' }));
                    }}
                    className={`w-full p-4 rounded-lg border text-left transition-all ${
                      formData.serviceType === 'Other'
                        ? 'border-2 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    style={
                      formData.serviceType === 'Other'
                        ? { borderColor: primaryColor }
                        : {}
                    }
                  >
                    <p className="font-medium">Other</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Something not listed above
                    </p>
                  </button>
                </div>
                <Button
                  className="w-full"
                  onClick={nextStep}
                  disabled={!formData.serviceType}
                  style={{ backgroundColor: primaryColor }}
                >
                  Continue
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}

            {/* Step 2: Date & Time */}
            {step === 'datetime' && (
              <div className="space-y-4">
                <div className="text-center mb-4">
                  <h2 className="text-lg font-semibold">Pick a Date & Time</h2>
                  <p className="text-sm text-gray-500">When works best for you?</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Preferred Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, date: e.target.value, timeSlot: '' }));
                      setSelectedDate(e.target.value);
                    }}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                {formData.date && (
                  <div className="space-y-2">
                    <Label>Preferred Time</Label>
                    {loadingSlots ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                      </div>
                    ) : availableSlots.length > 0 ? (
                      <div className="grid grid-cols-3 gap-2">
                        {availableSlots.map((slot) => (
                          <button
                            key={slot.start}
                            onClick={() =>
                              setFormData((prev) => ({ ...prev, timeSlot: slot.start }))
                            }
                            disabled={!slot.available}
                            className={`p-2 rounded-lg border text-sm transition-all ${
                              formData.timeSlot === slot.start
                                ? 'border-2 bg-blue-50'
                                : slot.available
                                ? 'border-gray-200 hover:border-gray-300'
                                : 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'
                            }`}
                            style={
                              formData.timeSlot === slot.start
                                ? { borderColor: primaryColor }
                                : {}
                            }
                          >
                            {slot.start}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <Select
                        value={formData.timeSlot}
                        onValueChange={(value) =>
                          setFormData((prev) => ({ ...prev, timeSlot: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a time" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Morning (8am - 12pm)">
                            Morning (8am - 12pm)
                          </SelectItem>
                          <SelectItem value="Afternoon (12pm - 5pm)">
                            Afternoon (12pm - 5pm)
                          </SelectItem>
                          <SelectItem value="Anytime">Anytime</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button variant="outline" onClick={prevStep}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={nextStep}
                    disabled={!formData.date || !formData.timeSlot}
                    style={{ backgroundColor: primaryColor }}
                  >
                    Continue
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Contact Info */}
            {step === 'contact' && (
              <div className="space-y-4">
                <div className="text-center mb-4">
                  <h2 className="text-lg font-semibold">Your Information</h2>
                  <p className="text-sm text-gray-500">How can we reach you?</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, name: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, phone: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, email: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="address">Service Address *</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, address: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, city: e.target.value }))
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        value={formData.state}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, state: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="zip">ZIP</Label>
                      <Input
                        id="zip"
                        value={formData.zip}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, zip: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="notes">Additional Notes</Label>
                    <Textarea
                      id="notes"
                      rows={3}
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, notes: e.target.value }))
                      }
                      placeholder="Any details that would help us..."
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={prevStep}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={nextStep}
                    disabled={!formData.name || !formData.phone || !formData.address}
                    style={{ backgroundColor: primaryColor }}
                  >
                    Continue
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Confirmation */}
            {step === 'confirm' && (
              <div className="space-y-4">
                <div className="text-center mb-4">
                  <h2 className="text-lg font-semibold">Confirm Your Booking</h2>
                  <p className="text-sm text-gray-500">Please review your details</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                      Service
                    </p>
                    <p className="font-medium">{formData.serviceType}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                      Date & Time
                    </p>
                    <p className="font-medium">
                      {formatDate(formData.date)} at {formData.timeSlot}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                      Contact
                    </p>
                    <p className="font-medium">{formData.name}</p>
                    <p className="text-sm text-gray-600">{formData.phone}</p>
                    {formData.email && (
                      <p className="text-sm text-gray-600">{formData.email}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                      Service Address
                    </p>
                    <p className="text-sm text-gray-600">
                      {formData.address}
                      {formData.city && `, ${formData.city}`}
                      {formData.state && `, ${formData.state}`} {formData.zip}
                    </p>
                  </div>
                  {formData.notes && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                        Notes
                      </p>
                      <p className="text-sm text-gray-600">{formData.notes}</p>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={prevStep}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleSubmit}
                    disabled={submitting}
                    style={{ backgroundColor: primaryColor }}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        Confirm Booking
                        <CheckCircle className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>
            By booking, you agree to be contacted by {business?.name} regarding your
            appointment.
          </p>
          {business?.phone && (
            <p className="mt-2">
              Questions? Call{' '}
              <a
                href={`tel:${business.phone}`}
                className="font-medium"
                style={{ color: primaryColor }}
              >
                {business.phone}
              </a>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function BookingSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-gray-200 rounded-lg mx-auto mb-4 animate-pulse" />
          <div className="h-8 w-48 bg-gray-200 rounded mx-auto animate-pulse" />
          <div className="h-4 w-32 bg-gray-100 rounded mx-auto mt-2 animate-pulse" />
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="h-96 bg-gray-100 rounded animate-pulse" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
