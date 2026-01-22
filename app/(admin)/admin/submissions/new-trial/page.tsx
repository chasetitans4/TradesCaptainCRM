'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { AdminPageHeader } from '@/components/admin/page-header';
import { useAgentOrHigher } from '@/hooks/useAdminAuth';
import {
  Clock,
  Building2,
  Mail,
  Phone,
  DollarSign,
  Loader2,
  AlertCircle,
  CheckCircle,
  Copy,
  Send,
  Globe,
  Info,
  Calendar,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ALL_PLANS,
  PLAN_TRACKS,
  type PlanTrack,
} from '@/lib/pricing/plans';
import {
  OFFERS,
  canCombineOffers,
  calculatePricing,
  isOfferAvailableForPlan,
} from '@/lib/pricing/offers';

// v6.0 Track Configuration - active tracks only
const TRACK_CONFIG: Record<PlanTrack, { icon: React.ElementType; label: string; description: string; color: string }> = {
  blue: {
    icon: Building2,
    label: 'Blue (CRM)',
    description: 'CRM with AI SMS (Pro/Enterprise)',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  web: {
    icon: Globe,
    label: 'Web (Website)',
    description: 'Website with on-page SEO',
    color: 'bg-purple-100 text-purple-700 border-purple-200',
  },
  seo_aeo: {
    icon: SearchIcon,
    label: 'SEO/AEO',
    description: 'SEO & AI Engine Optimization',
    color: 'bg-green-100 text-green-700 border-green-200',
  },
};

// Re-declare SearchIcon locally since it was used in TRACK_CONFIG but imported as Search in original file
// and Lucide imports might conflict or be missing.
function SearchIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  )
}

export default function NewTrialSubmissionPage() {
  const { isAuthorized, loading: isAuthLoading } = useAgentOrHigher();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ id: string; url: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Plan selection state
  const [selectedTrack, setSelectedTrack] = useState<PlanTrack>('blue');
  const [selectedPlanId, setSelectedPlanId] = useState('blue_starter');
  const [billingFrequency, setBillingFrequency] = useState<'monthly' | 'annual'>('monthly');
  const [selectedOffers, setSelectedOffers] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    client_company_name: '',
    client_email: '',
    client_phone: '',
    client_address: '',
    existing_website_url: '', // Required for Local SEO plans
    notes: '',
  });

  // Get plans for selected track
  const plansForTrack = useMemo(() => {
    return ALL_PLANS.filter(p => p.track === selectedTrack);
  }, [selectedTrack]);

  // Get selected plan
  const selectedPlan = useMemo(() => {
    return ALL_PLANS.find(p => p.id === selectedPlanId);
  }, [selectedPlanId]);

  // Get available offers for this plan
  const availableOffers = useMemo(() => {
    if (!selectedPlan) return [];
    return OFFERS.filter(offer => {
      // Check if offer is active
      if (!offer.is_active) return false;

      // Check if offer applies to this plan (handles wildcards like 'blue_*')
      if (!isOfferAvailableForPlan(offer.code, selectedPlan.id)) return false;

      // ANNUAL15 only available for annual billing
      if (offer.code === 'ANNUAL15' && billingFrequency !== 'annual') return false;

      // Hide non-annual offers when annual billing is selected (ANNUAL15 is standalone)
      if (billingFrequency === 'annual' && offer.code !== 'ANNUAL15') return false;

      return true;
    });
  }, [selectedPlan, billingFrequency]);

  // Auto-apply/remove ANNUAL15 based on billing frequency
  useEffect(() => {
    if (billingFrequency === 'annual') {
      // Auto-add ANNUAL15 for annual billing (ANNUAL15 is standalone, replaces other offers)
      if (!selectedOffers.includes('ANNUAL15')) {
        setSelectedOffers(['ANNUAL15']);
      }
    } else {
      // Remove ANNUAL15 when switching to monthly
      if (selectedOffers.includes('ANNUAL15')) {
        setSelectedOffers(selectedOffers.filter(c => c !== 'ANNUAL15'));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [billingFrequency]);

  // Calculate pricing
  const pricing = useMemo(() => {
    if (!selectedPlan) return null;
    return calculatePricing(
      selectedPlan.monthly_price,
      selectedPlan.annual_price,
      billingFrequency,
      selectedOffers,
      false // GBP addon removed in v5.9
    );
  }, [selectedPlan, selectedOffers, billingFrequency]);

  // Handle track change
  const handleTrackChange = (track: PlanTrack) => {
    setSelectedTrack(track);
    // Select first plan in the new track
    const firstPlan = ALL_PLANS.find(p => p.track === track);
    if (firstPlan) {
      setSelectedPlanId(firstPlan.id);
    }
    // Reset offers
    setSelectedOffers([]);
  };

  // Handle offer toggle
  const toggleOffer = (offerCode: string) => {
    if (selectedOffers.includes(offerCode)) {
      setSelectedOffers(selectedOffers.filter(c => c !== offerCode));
    } else {
      // Check if can stack with existing offers
      const canStack = selectedOffers.every(existing =>
        canCombineOffers(existing, offerCode)
      );
      if (canStack) {
        setSelectedOffers([...selectedOffers, offerCode]);
      } else {
        // Replace with new offer
        setSelectedOffers([offerCode]);
      }
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate SEO/AEO requires website URL
    if (selectedTrack === 'seo_aeo' && !formData.existing_website_url) {
      setError('Existing website URL is required for SEO/AEO plans');
      setLoading(false);
      return;
    }

    try {
      const submissionData = {
        ...formData,
        plan_id: selectedPlanId,
        plan_track: selectedTrack,
        billing_frequency: billingFrequency,
        offers_applied: selectedOffers,
        pricing: pricing,
      };

      const res = await fetch('/api/admin/submissions/trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create submission');
      }

      setSuccess({
        id: data.submission.id,
        url: data.registration_url,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function copyUrl() {
    if (success?.url) {
      navigator.clipboard.writeText(success.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function sendInvite() {
    if (!success?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/submissions/${success.id}/send-invite`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to send invite');
      alert('Invite email sent successfully!');
      router.push('/admin/submissions');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (isAuthLoading) return null;
  if (!isAuthorized) return null;

  if (success) {
    return (
      <div className="flex flex-col space-y-6 p-6 max-w-2xl mx-auto">
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Trial Submission Created!
          </h1>
          <p className="text-gray-500 mb-6">
            The 30-day trial submission has been created for {formData.client_company_name}.
          </p>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <Label className="block text-sm font-medium text-gray-700 mb-2 text-left">
              Registration URL
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="text"
                value={success.url}
                readOnly
                className="flex-1 bg-white"
              />
              <Button
                variant="outline"
                onClick={copyUrl}
                className="flex items-center gap-2"
              >
                <Copy className="h-4 w-4" />
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3">
            <Button
              onClick={sendInvite}
              disabled={loading}
              className="flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Send Invite Email
            </Button>
            <Button variant="outline" asChild>
              <Link href="/admin/submissions">
                View All Submissions
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-6 p-6 max-w-4xl mx-auto">
      <AdminPageHeader
        title="New Trial Submission"
        description="Create a 30-day free trial for a client"
        icon={Clock}
        backHref="/admin/submissions"
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Client Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-5 w-5 text-gray-400" />
              Client Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="companyName">Company Name *</Label>
              <Input
                id="companyName"
                type="text"
                value={formData.client_company_name}
                onChange={(e) => setFormData({ ...formData, client_company_name: e.target.value })}
                required
                placeholder="ABC Plumbing"
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">
                  <Mail className="h-4 w-4 inline mr-1" />
                  Email Address *
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.client_email}
                  onChange={(e) => setFormData({ ...formData, client_email: e.target.value })}
                  required
                  placeholder="client@company.com"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="phone">
                  <Phone className="h-4 w-4 inline mr-1" />
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.client_phone}
                  onChange={(e) => setFormData({ ...formData, client_phone: e.target.value })}
                  placeholder="(555) 123-4567"
                  className="mt-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SEO/AEO - Website URL (required for SEO/AEO plans) */}
        {selectedTrack === 'seo_aeo' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Globe className="h-5 w-5 text-gray-400" />
                Existing Website
              </CardTitle>
              <CardDescription className="flex items-start gap-2 bg-green-50 text-green-800 p-3 rounded-md mt-2">
                <Info className="h-4 w-4 mt-0.5 shrink-0" />
                SEO/AEO plans require an existing website. We will optimize this site for search engines and AI.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Label htmlFor="website">Client's Website URL *</Label>
              <Input
                id="website"
                type="url"
                value={formData.existing_website_url}
                onChange={(e) => setFormData({ ...formData, existing_website_url: e.target.value })}
                required
                placeholder="https://www.clientwebsite.com"
                className="mt-1"
              />
            </CardContent>
          </Card>
        )}

        {/* Plan Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-gray-400" />
              Plan Selection
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Track Selection Tabs */}
            <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
              {PLAN_TRACKS.map(track => {
                const config = TRACK_CONFIG[track];
                const TrackIcon = config.icon;
                return (
                  <button
                    key={track}
                    type="button"
                    onClick={() => handleTrackChange(track)}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-colors',
                      selectedTrack === track
                        ? 'bg-white shadow text-gray-900'
                        : 'text-gray-600 hover:text-gray-900'
                    )}
                  >
                    <TrackIcon className="h-4 w-4" />
                    {config.label}
                  </button>
                );
              })}
            </div>

            {/* Track Description */}
            <p className="text-sm text-gray-500 flex items-center gap-2">
              <Info className="h-4 w-4" />
              {TRACK_CONFIG[selectedTrack].description}
            </p>

            {/* Plan Tier Selection */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {plansForTrack.map((plan) => (
                <label
                  key={plan.id}
                  className={cn(
                    'relative flex flex-col p-4 border-2 rounded-xl cursor-pointer transition-colors',
                    selectedPlanId === plan.id
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <input
                    type="radio"
                    name="plan"
                    value={plan.id}
                    checked={selectedPlanId === plan.id}
                    onChange={() => setSelectedPlanId(plan.id)}
                    className="sr-only"
                  />
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-900">{plan.name}</span>
                    {selectedPlanId === plan.id && (
                      <CheckCircle className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    ${billingFrequency === 'monthly' ? plan.monthly_price : Math.round(plan.annual_price / 12)}
                    <span className="text-sm font-normal text-gray-500">/mo</span>
                  </div>
                  {plan.type === 'teams' && (
                    <div className="text-xs text-blue-600 font-medium mb-1">
                      Teams ({plan.features.users} users)
                    </div>
                  )}
                  <div className="text-xs text-gray-500">
                    {plan.description}
                  </div>
                  {/* Show included features */}
                  <div className="mt-3 pt-3 border-t border-gray-100 space-y-1">
                    {plan.features.includes_website && (
                      <div className="text-xs text-gray-600 flex items-center gap-1">
                        <Check className="h-3 w-3 text-green-500" />
                        Website included
                      </div>
                    )}
                    {plan.features.includes_crm && (
                      <div className="text-xs text-gray-600 flex items-center gap-1">
                        <Check className="h-3 w-3 text-green-500" />
                        CRM included
                      </div>
                    )}
                    {plan.features.includes_local_seo && (
                      <div className="text-xs text-gray-600 flex items-center gap-1">
                        <Check className="h-3 w-3 text-green-500" />
                        Local SEO included
                      </div>
                    )}
                    {plan.features.includes_gbp && (
                      <div className="text-xs text-gray-600 flex items-center gap-1">
                        <Check className="h-3 w-3 text-green-500" />
                        GBP Management
                      </div>
                    )}
                  </div>
                </label>
              ))}
            </div>

            {/* Billing Frequency Toggle */}
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Billing:</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setBillingFrequency('monthly')}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    billingFrequency === 'monthly'
                      ? 'bg-primary text-white'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  )}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setBillingFrequency('annual')}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    billingFrequency === 'annual'
                      ? 'bg-primary text-white'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  )}
                >
                  <Calendar className="h-4 w-4 inline mr-1" />
                  Annual (15% off)
                </button>
              </div>
            </div>

            {/* Pro/Enterprise CRM includes AI SMS (Leads Captain) */}
            {selectedTrack === 'blue' && selectedPlan && ['blue_pro', 'blue_enterprise'].includes(selectedPlan.id) && (
              <div className="p-4 bg-cyan-50 border border-cyan-200 rounded-lg flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-cyan-600" />
                <span className="text-sm text-cyan-800">
                  <strong>Leads Captain:</strong> Included with Pro and Enterprise CRM tiers
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Offers Section */}
        {availableOffers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Available Offers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {availableOffers.map((offer) => {
                  const isSelected = selectedOffers.includes(offer.code);
                  return (
                    <div
                      key={offer.code}
                      onClick={() => toggleOffer(offer.code)}
                      className={cn(
                        'flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors',
                        isSelected
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      <div className={cn(
                        'w-5 h-5 rounded border flex items-center justify-center',
                        isSelected ? 'bg-green-500 border-green-500' : 'border-gray-300'
                      )}>
                        {isSelected && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{offer.name}</div>
                        <div className="text-xs text-gray-500">{offer.description}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Button variant="outline" asChild>
            <Link href="/admin/submissions">Cancel</Link>
          </Button>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Trial Submission
          </Button>
        </div>
      </form>
    </div>
  );
}
