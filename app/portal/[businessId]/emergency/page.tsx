'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  AlertTriangle,
  AlertCircle,
  Phone,
  Camera,
  Loader2,
  CheckCircle,
  MapPin,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { logger } from '@/lib/logger';

const portalEmergencyLogger = logger.child({ context: 'portal.emergency' });

export default function EmergencyRequestPage() {
  const params = useParams();
  const router = useRouter();
  const businessId = params.businessId as string;

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    description: '',
    location: '',
    phone: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/portal/emergency?businessId=${businessId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit emergency request');
      }

      setSuccess(true);
      
      // Redirect after delay
      setTimeout(() => {
        router.push(`/portal/${businessId}`);
      }, 3000);

    } catch (err) {
      portalEmergencyLogger.error({
        msg: 'Emergency request submission failed',
        error: err instanceof Error ? err.message : String(err)
      });
      setError(err instanceof Error ? err.message : 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Emergency Request Received</h2>
        <p className="text-muted-foreground max-w-md mb-6">
          Our team has been notified of your emergency. We will contact you immediately at the phone number provided.
        </p>
        <Button onClick={() => router.push(`/portal/${businessId}`)}>
          Return to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-4">
      <Alert variant="destructive" className="border-red-600 bg-red-50 dark:bg-red-900/20">
        <AlertTriangle className="h-5 w-5" />
        <AlertTitle className="text-lg font-bold">Emergency Service Request</AlertTitle>
        <AlertDescription>
          Use this form ONLY for emergencies requiring immediate attention (e.g., major leaks, power loss, safety hazards). 
          For routine maintenance, please use the standard Service Request form.
        </AlertDescription>
      </Alert>

      <Card className="border-t-4 border-t-red-600 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="text-red-600" />
            Report an Emergency
          </CardTitle>
          <CardDescription>
            Our emergency response team is available 24/7.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="description">What is the emergency?</Label>
              <Textarea
                id="description"
                placeholder="Please describe the issue in detail..."
                className="min-h-[100px]"
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location">Location in Property</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="location"
                    placeholder="e.g. Basement, Kitchen"
                    className="pl-9"
                    required
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Best Contact Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(555) 123-4567"
                    className="pl-9"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col gap-4 pt-4">
              <Button 
                type="submit" 
                size="lg" 
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold text-lg h-14"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Submitting Alert...
                  </>
                ) : (
                  <>
                    <AlertTriangle className="mr-2 h-5 w-5" />
                    SUBMIT EMERGENCY ALERT
                  </>
                )}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                By submitting this form, you agree to our emergency service rates and terms.
              </p>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="text-center">
        <p className="text-muted-foreground mb-2">Not an emergency?</p>
        <Button variant="outline" onClick={() => router.push(`/portal/${businessId}/request`)}>
          Submit Regular Service Request
        </Button>
      </div>
    </div>
  );
}
