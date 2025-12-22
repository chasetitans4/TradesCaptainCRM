'use client';

import { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  User,
  Mail,
  Phone,
  MapPin,
  Loader2,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
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
import { cn } from '@/lib/utils';

interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
  reason?: string;
}

interface DaySlots {
  date: string;
  dayName: string;
  slots: TimeSlot[];
  hasAvailability: boolean;
}

interface BookingSettings {
  businessName: string;
  welcomeMessage: string | null;
  confirmationMessage: string | null;
  primaryColor: string;
  logoUrl: string | null;
  enabledServices: string[];
  slotDuration: number;
}

interface BookingWidgetProps {
  slug: string;
  embedded?: boolean;
  onComplete?: () => void;
}

type Step = 'service' | 'datetime' | 'details' | 'confirm' | 'success';

export function BookingWidget({ slug, embedded = false, onComplete }: BookingWidgetProps) {
  const [step, setStep] = useState<Step>('service');
  const [settings, setSettings] = useState<BookingSettings | null>(null);
  const [availability, setAvailability] = useState<DaySlots[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form data
  const [formData, setFormData] = useState({
    serviceType: '',
    description: '',
    urgency: 'normal',
    selectedDate: '',
    selectedTime: '',
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    address: '',
    city: '',
    state: '',
    zip: '',
  });

  const [weekOffset, setWeekOffset] = useState(0);

  useEffect(() => {
    fetchSettings();
  }, [slug]);

  useEffect(() => {
    if (step === 'datetime') {
      fetchAvailability();
    }
  }, [step, weekOffset]);

  const fetchSettings = async () => {
    try {
      const response = await fetch(`/api/booking/slots?slug=${slug}&summary=true`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load booking settings');
      }

      // Fetch business settings separately
      const settingsResponse = await fetch(`/api/booking/slots?slug=${slug}`);
      const settingsData = await settingsResponse.json();

      // For demo purposes, set default settings
      setSettings({
        businessName: 'Our Business',
        welcomeMessage: 'Welcome! Book an appointment with us.',
        confirmationMessage: null,
        primaryColor: '#2563eb',
        logoUrl: null,
        enabledServices: ['Repair', 'Maintenance', 'Installation', 'Inspection', 'Other'],
        slotDuration: settingsData.settings?.slotDuration || 60,
      });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailability = async () => {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + weekOffset * 7);

      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 14);

      const response = await fetch(
        `/api/booking/slots?slug=${slug}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      setAvailability(data.days || []);
    } catch (e: any) {
      console.error('Failed to fetch availability:', e);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/booking/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          ...formData,
          preferredDate: formData.selectedDate,
          preferredTimeSlot: formData.selectedTime,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      setStep('success');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && !settings) {
    return (
      <Card className={cn('max-w-2xl mx-auto', !embedded && 'shadow-lg')}>
        <CardContent className="pt-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const primaryColor = settings?.primaryColor || '#2563eb';

  const renderStep = () => {
    switch (step) {
      case 'service':
        return (
          <div className="space-y-6">
            <div className="text-center">
              {settings?.logoUrl && (
                <img
                  src={settings.logoUrl}
                  alt={settings.businessName}
                  className="h-16 object-contain mx-auto mb-4"
                />
              )}
              <h2 className="text-2xl font-bold">{settings?.businessName}</h2>
              {settings?.welcomeMessage && (
                <p className="text-muted-foreground mt-2">{settings.welcomeMessage}</p>
              )}
            </div>

            <div className="space-y-4">
              <Label className="text-base font-medium">What service do you need?</Label>
              <RadioGroup
                value={formData.serviceType}
                onValueChange={(v) => setFormData({ ...formData, serviceType: v })}
                className="grid gap-3"
              >
                {settings?.enabledServices.map((service) => (
                  <Label
                    key={service}
                    className={cn(
                      'flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors',
                      formData.serviceType === service
                        ? 'border-2'
                        : 'hover:bg-muted/50'
                    )}
                    style={
                      formData.serviceType === service
                        ? { borderColor: primaryColor }
                        : undefined
                    }
                  >
                    <RadioGroupItem value={service} />
                    <span className="font-medium">{service}</span>
                  </Label>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Describe your needs</Label>
              <Textarea
                id="description"
                placeholder="Tell us about what you need help with..."
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
              />
            </div>

            <Button
              className="w-full"
              style={{ backgroundColor: primaryColor }}
              onClick={() => setStep('datetime')}
              disabled={!formData.serviceType}
            >
              Continue
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        );

      case 'datetime':
        return (
          <div className="space-y-6">
            <Button
              variant="ghost"
              onClick={() => setStep('service')}
              className="mb-2"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            <div>
              <h2 className="text-xl font-bold">Choose a Date & Time</h2>
              <p className="text-muted-foreground">
                Select your preferred appointment time
              </p>
            </div>

            {/* Date Selection */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setWeekOffset(Math.max(0, weekOffset - 1))}
                  disabled={weekOffset === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="font-medium">
                  {availability.length > 0
                    ? `${new Date(availability[0].date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
                    : 'Loading...'}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setWeekOffset(weekOffset + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-7 gap-2">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                  <div
                    key={i}
                    className="text-center text-xs font-medium text-muted-foreground py-2"
                  >
                    {day}
                  </div>
                ))}

                {availability.map((day) => {
                  const date = new Date(day.date);
                  const isSelected = formData.selectedDate === day.date;

                  return (
                    <Button
                      key={day.date}
                      variant="outline"
                      size="sm"
                      className={cn(
                        'h-12',
                        !day.hasAvailability && 'opacity-50 cursor-not-allowed',
                        isSelected && 'ring-2'
                      )}
                      style={isSelected ? { ringColor: primaryColor } : undefined}
                      onClick={() => {
                        setFormData({
                          ...formData,
                          selectedDate: day.date,
                          selectedTime: '',
                        });
                      }}
                      disabled={!day.hasAvailability}
                    >
                      {date.getDate()}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Time Selection */}
            {formData.selectedDate && (
              <div className="space-y-3">
                <Label className="text-base font-medium">Available Times</Label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {availability
                    .find((d) => d.date === formData.selectedDate)
                    ?.slots.filter((slot) => slot.available)
                    .map((slot) => {
                      const time = new Date(slot.start).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                      });
                      const isSelected = formData.selectedTime === time;

                      return (
                        <Button
                          key={slot.start}
                          variant="outline"
                          size="sm"
                          className={cn(isSelected && 'ring-2')}
                          style={isSelected ? { ringColor: primaryColor } : undefined}
                          onClick={() =>
                            setFormData({ ...formData, selectedTime: time })
                          }
                        >
                          {time}
                        </Button>
                      );
                    })}
                </div>
              </div>
            )}

            <Button
              className="w-full"
              style={{ backgroundColor: primaryColor }}
              onClick={() => setStep('details')}
              disabled={!formData.selectedDate || !formData.selectedTime}
            >
              Continue
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        );

      case 'details':
        return (
          <div className="space-y-6">
            <Button
              variant="ghost"
              onClick={() => setStep('datetime')}
              className="mb-2"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            <div>
              <h2 className="text-xl font-bold">Your Information</h2>
              <p className="text-muted-foreground">
                How can we contact you?
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customerName">Name *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="customerName"
                    placeholder="Your name"
                    value={formData.customerName}
                    onChange={(e) =>
                      setFormData({ ...formData, customerName: e.target.value })
                    }
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerEmail">Email *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="customerEmail"
                    type="email"
                    placeholder="you@example.com"
                    value={formData.customerEmail}
                    onChange={(e) =>
                      setFormData({ ...formData, customerEmail: e.target.value })
                    }
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerPhone">Phone *</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="customerPhone"
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={formData.customerPhone}
                    onChange={(e) =>
                      setFormData({ ...formData, customerPhone: e.target.value })
                    }
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Service Address *</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="address"
                    placeholder="123 Main St"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    placeholder="City"
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    placeholder="State"
                    value={formData.state}
                    onChange={(e) =>
                      setFormData({ ...formData, state: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip">ZIP</Label>
                  <Input
                    id="zip"
                    placeholder="ZIP"
                    value={formData.zip}
                    onChange={(e) =>
                      setFormData({ ...formData, zip: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>

            <Button
              className="w-full"
              style={{ backgroundColor: primaryColor }}
              onClick={() => setStep('confirm')}
              disabled={
                !formData.customerName ||
                !formData.customerEmail ||
                !formData.customerPhone ||
                !formData.address
              }
            >
              Review Booking
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        );

      case 'confirm':
        return (
          <div className="space-y-6">
            <Button
              variant="ghost"
              onClick={() => setStep('details')}
              className="mb-2"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            <div>
              <h2 className="text-xl font-bold">Confirm Your Booking</h2>
              <p className="text-muted-foreground">
                Please review your appointment details
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4 bg-muted/50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">
                    {new Date(formData.selectedDate).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formData.selectedTime}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">{formData.serviceType}</p>
                  {formData.description && (
                    <p className="text-sm text-muted-foreground">
                      {formData.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">{formData.customerName}</p>
                  <p className="text-sm text-muted-foreground">
                    {formData.customerEmail}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formData.customerPhone}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">{formData.address}</p>
                  {(formData.city || formData.state || formData.zip) && (
                    <p className="text-sm text-muted-foreground">
                      {[formData.city, formData.state, formData.zip]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <Button
              className="w-full"
              style={{ backgroundColor: primaryColor }}
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Confirm Booking'
              )}
            </Button>
          </div>
        );

      case 'success':
        return (
          <div className="text-center space-y-6 py-8">
            <div className="mx-auto w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>

            <div>
              <h2 className="text-2xl font-bold">Booking Submitted!</h2>
              <p className="text-muted-foreground mt-2">
                {settings?.confirmationMessage ||
                  "Thank you for your booking request. We'll confirm your appointment shortly."}
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 text-left max-w-sm mx-auto">
              <p className="text-sm text-muted-foreground mb-2">Your appointment:</p>
              <p className="font-medium">{formData.serviceType}</p>
              <p className="text-sm">
                {new Date(formData.selectedDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
              <p className="text-sm">{formData.selectedTime}</p>
            </div>

            <p className="text-sm text-muted-foreground">
              A confirmation email has been sent to{' '}
              <span className="font-medium">{formData.customerEmail}</span>
            </p>

            {onComplete && (
              <Button variant="outline" onClick={onComplete}>
                Done
              </Button>
            )}
          </div>
        );
    }
  };

  return (
    <Card className={cn('max-w-2xl mx-auto', !embedded && 'shadow-lg')}>
      <CardContent className="pt-6">{renderStep()}</CardContent>
    </Card>
  );
}
