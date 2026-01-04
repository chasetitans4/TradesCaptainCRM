'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Label, Progress, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Alert, AlertDescription } from '@/components/ui';
import { createClient, getCurrentUser } from '@/lib/supabase/client';
import { Building2, Calendar, Wrench, ArrowRight, Check, Plus, Trash2 } from 'lucide-react';
import type { TradeType } from '@/types';
import { logger } from '@/lib/logger';

interface BusinessInfo {
  name: string;
  owner_name: string;
  phone: string;
  owner_phone: string;
  trade_type: TradeType;
}

interface SavedService {
  name: string;
  price: string;
}

type Step = 1 | 2 | 3;

const TRADE_TYPES: { value: TradeType; label: string }[] = [
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'roofing', label: 'Roofing' },
  { value: 'general', label: 'General Contractor' },
  { value: 'other', label: 'Other' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onboardingLogger = logger.child({ context: 'onboarding' });
  
  // Step 1: Business Info
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo>({
    name: '',
    owner_name: '',
    phone: '',
    owner_phone: '',
    trade_type: 'plumbing',
  });


  // Step 3: Saved Services
  const [services, setServices] = useState<SavedService[]>([
    { name: '', price: '' }
  ]);

  // Load user data on mount
  useEffect(() => {
    async function loadUserData() {
      const user = await getCurrentUser();
      if (user?.user_metadata?.full_name) {
        setBusinessInfo(prev => ({
          ...prev,
          owner_name: user.user_metadata.full_name as string,
        }));
      }
    }
    loadUserData();
  }, []);

  const handleBusinessInfoChange = (field: keyof BusinessInfo, value: string) => {
    setBusinessInfo(prev => ({ ...prev, [field]: value }));
  };

  const handleServiceChange = (index: number, field: keyof SavedService, value: string) => {
    const updated = [...services];
    updated[index][field] = value;
    setServices(updated);
  };

  const addService = () => {
    setServices([...services, { name: '', price: '' }]);
  };

  const removeService = (index: number) => {
    if (services.length > 1) {
      setServices(services.filter((_, i) => i !== index));
    }
  };

  const handleNext = async () => {
    if (step < 3) {
      setStep((step + 1) as Step);
    } else {
      // Final step - save everything
      await finishOnboarding();
    }
  };

  const finishOnboarding = async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const user = await getCurrentUser();

      if (!user) {
        router.push('/login');
        return;
      }

      // Create business
      const { data: business, error: bizError } = await supabase
        .from('businesses')
        .insert({
          name: businessInfo.name,
          owner_name: businessInfo.owner_name,
          email: user.email!,
          phone: businessInfo.phone,
          owner_phone: businessInfo.owner_phone || null,
          trade_type: businessInfo.trade_type,
          plan_tier: 'pro', // Default to pro for CRM access
          leads_limit: 300,
          leads_used: 0,
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (bizError) throw bizError;

      // Create user record
      const { error: userError } = await supabase
        .from('users')
        .insert({
          email: user.email!,
          auth_user_id: user.id,
          name: businessInfo.owner_name,
          phone: businessInfo.owner_phone || null,
          business_id: business.id,
          role: 'owner',
          status: 'active',
        });

      if (userError) throw userError;

      // Add saved services
      const validServices = services.filter(s => s.name.trim() && s.price.trim());
      if (validServices.length > 0) {
        const { error: servicesError } = await supabase
          .from('saved_services')
          .insert(
            validServices.map(s => ({
              business_id: business.id,
              name: s.name.trim(),
              default_price: parseFloat(s.price.replace(/[^0-9.]/g, '')),
            }))
          );

        if (servicesError) throw servicesError;
      }

      // Success - redirect to dashboard
      router.push('/dashboard?welcome=true');
    } catch (err: any) {
      onboardingLogger.error({
        msg: 'Onboarding error',
        error: err instanceof Error ? err.message : String(err),
        step,
        businessInfo: {
          name: businessInfo.name,
          owner_phone: businessInfo.owner_phone || undefined,
          trade_type: businessInfo.trade_type,
        },
        servicesCount: services.length,
      });
      setError(err.message || 'Failed to complete setup. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isStep1Valid = businessInfo.name && businessInfo.owner_name && businessInfo.phone;

  const progress = (step / 3) * 100;

  return (
    <div className="flex-1 flex flex-col">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-text-muted mb-2">
          <span>Step {step} of 3</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {error && (
        <Alert variant="danger" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Step 1: Business Info */}
      {step === 1 && (
        <div className="flex-1 flex flex-col">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-text mb-2">Welcome! 🎉</h1>
            <p className="text-text-muted">Let&apos;s get your CRM set up.</p>
          </div>

          <div className="space-y-4 flex-1">
            <div className="space-y-2">
              <Label htmlFor="business-name">Business Name</Label>
              <Input
                id="business-name"
                placeholder="ABC Plumbing"
                value={businessInfo.name}
                onChange={(e) => handleBusinessInfoChange('name', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="owner-name">Your Name</Label>
              <Input
                id="owner-name"
                placeholder="Mike Johnson"
                value={businessInfo.owner_name}
                onChange={(e) => handleBusinessInfoChange('owner_name', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Business Phone</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="(555) 123-4567"
                value={businessInfo.phone}
                onChange={(e) => handleBusinessInfoChange('phone', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="owner-phone">Your Phone (for forwarding)</Label>
              <Input
                id="owner-phone"
                type="tel"
                placeholder="(555) 987-6543"
                value={businessInfo.owner_phone}
                onChange={(e) => handleBusinessInfoChange('owner_phone', e.target.value)}
              />
              <p className="text-xs text-text-muted">
                When AI SMS is off, messages forward here
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="trade">Trade Type</Label>
              <Select
                value={businessInfo.trade_type}
                onValueChange={(value) => handleBusinessInfoChange('trade_type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your trade" />
                </SelectTrigger>
                <SelectContent>
                  {TRADE_TYPES.map(trade => (
                    <SelectItem key={trade.value} value={trade.value}>
                      {trade.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button 
            className="w-full mt-6" 
            disabled={!isStep1Valid}
            onClick={handleNext}
          >
            Next
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Step 2: Calendar (Optional) */}
      {step === 2 && (
        <div className="flex-1 flex flex-col">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-text mb-2">Connect Your Calendar</h1>
            <p className="text-text-muted">
              Sync jobs to your calendar so you never double-book.
            </p>
          </div>

          <div className="space-y-4 flex-1">
            <Button
              variant="outline"
              className="w-full h-14 justify-start"
              onClick={() => {
                // TODO: Implement Google Calendar OAuth
                alert('Google Calendar integration coming soon!');
              }}
            >
              <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Connect Google Calendar
            </Button>

            <Button
              variant="outline"
              className="w-full h-14 justify-start"
              onClick={() => {
                // TODO: Implement Outlook OAuth
                alert('Outlook integration coming soon!');
              }}
            >
              <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="#0078D4"
                  d="M7.88 12.04q0 .45-.11.87-.1.41-.33.74-.22.33-.58.52-.37.2-.87.2t-.85-.2q-.35-.21-.57-.55-.22-.33-.33-.75-.1-.42-.1-.86t.1-.87q.1-.43.34-.76.22-.34.59-.54.36-.2.87-.2t.86.2q.35.21.57.55.22.34.31.77.1.43.1.88zM24 12v9.38q0 .46-.33.8-.33.32-.8.32H7.13q-.46 0-.8-.33-.32-.33-.32-.8V18H1q-.41 0-.7-.3-.3-.29-.3-.7V7q0-.41.3-.7Q.58 6 1 6h6.5V2.55q0-.44.3-.75.3-.3.75-.3h12.9q.44 0 .75.3.3.3.3.75V12zm-6-8.25v3h3v-3h-3zm0 4.5v3h3v-3h-3zm0 4.5v1.83l3.05-1.83H18zm-5.25-9v3h3.75v-3h-3.75zm0 4.5v3h3.75v-3h-3.75zm0 4.5v2.03l2.41 1.5 1.34-.8v-2.73h-3.75zM9 3.75V6h2l.13.01.12.04v-2.3H9zM7.88 6.07q-.47 0-.84.17-.37.17-.62.48-.25.3-.37.71-.12.4-.12.87 0 .48.12.88.12.4.36.7.24.29.61.46.37.16.86.16.46 0 .84-.16.37-.17.61-.47.24-.3.36-.7.12-.4.12-.87 0-.47-.13-.87-.12-.4-.37-.7-.25-.3-.61-.48-.37-.17-.82-.18zM1 18h5v-5.5H1V18zm6-6V7H1v4.62q0 .11.09.19.1.1.21.1H7v-.91z"
                />
              </svg>
              Connect Outlook
            </Button>

            <button
              className="w-full text-center text-sm text-text-muted hover:text-text py-2"
              onClick={handleNext}
            >
              Skip for now
            </button>
          </div>

          <Button className="w-full mt-6" onClick={handleNext}>
            Next
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Step 3: Saved Services */}
      {step === 3 && (
        <div className="flex-1 flex flex-col">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Wrench className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-text mb-2">Add Your First Services</h1>
            <p className="text-text-muted">
              Saved services let you build quotes in seconds.
            </p>
          </div>

          <div className="space-y-4 flex-1">
            {services.map((service, index) => (
              <div key={index} className="flex gap-2">
                <div className="flex-1 space-y-2">
                  <Input
                    placeholder="Service name"
                    value={service.name}
                    onChange={(e) => handleServiceChange(index, 'name', e.target.value)}
                  />
                </div>
                <div className="w-28 space-y-2">
                  <Input
                    placeholder="$89"
                    value={service.price}
                    onChange={(e) => handleServiceChange(index, 'price', e.target.value)}
                  />
                </div>
                {services.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeService(index)}
                    className="text-text-muted hover:text-danger"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}

            <Button
              variant="outline"
              className="w-full"
              onClick={addService}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Another
            </Button>

            <button
              className="w-full text-center text-sm text-text-muted hover:text-text py-2"
              onClick={finishOnboarding}
            >
              Skip — I&apos;ll add later
            </button>
          </div>

          <Button 
            className="w-full mt-6" 
            onClick={finishOnboarding}
            loading={loading}
          >
            <Check className="mr-2 h-4 w-4" />
            Finish Setup
          </Button>
        </div>
      )}
    </div>
  );
}
