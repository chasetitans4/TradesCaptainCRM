'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  Clock,
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  FileText,
  DollarSign,
  Loader2,
  AlertCircle,
  CheckCircle,
  Copy,
  Send,
  Globe,
  Search,
  Layers,
  MapPin,
  Tag,
  Calendar,
  Info,
  Smartphone,
} from 'lucide-react';
import {
  ALL_PLANS,
  PLAN_TRACKS,
  ADDONS,
  type Plan,
  type PlanTrack,
  type PlanTier,
} from '@/lib/pricing/plans';
import {
  OFFERS,
  canCombineOffers,
  calculatePricing,
  type Offer,
} from '@/lib/pricing/offers';

const TRACK_CONFIG: Record<PlanTrack, { icon: React.ElementType; label: string; description: string; color: string }> = {
  leads_captain: {
    icon: Phone,
    label: 'Leads Captain',
    description: 'AI Missed Call Text-Back',
    color: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  },
  blue: {
    icon: Building2,
    label: 'Blue (CRM)',
    description: 'CRM only - no website or SEO',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  web: {
    icon: Globe,
    label: 'Web (Website)',
    description: 'Website with on-page SEO',
    color: 'bg-purple-100 text-purple-700 border-purple-200',
  },
  seo: {
    icon: Search,
    label: 'Local SEO',
    description: 'SEO for existing websites',
    color: 'bg-green-100 text-green-700 border-green-200',
  },
  silver: {
    icon: Layers,
    label: 'Silver',
    description: 'Website + CRM + Leads Captain',
    color: 'bg-gray-100 text-gray-700 border-gray-200',
  },
  gold: {
    icon: Layers,
    label: 'Gold (All-in-One)',
    description: 'Website + CRM + Leads Captain + Local SEO',
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  },
};

export default function NewTrialSubmissionPage() {
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
      if (!offer.is_active) return false;
      if (offer.applies_to.includes('all')) return true;
      if (offer.applies_to.includes(selectedPlan.id)) return true;
      if (offer.applies_to.includes(selectedTrack)) return true;
      // Check billing-specific offers
      if (offer.code === 'ANNUAL15' && billingFrequency !== 'annual') return false;
      return true;
    });
  }, [selectedPlan, selectedTrack, billingFrequency]);

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

    // Validate Local SEO requires website URL
    if (selectedTrack === 'seo' && !formData.existing_website_url) {
      setError('Existing website URL is required for Local SEO plans');
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
      router.push('/admin-portal/submissions');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
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
            <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
              Registration URL
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={success.url}
                readOnly
                className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm"
              />
              <button
                onClick={copyUrl}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-2"
              >
                <Copy className="h-4 w-4" />
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={sendInvite}
              disabled={loading}
              className="px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 font-medium"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Send Invite Email
            </button>
            <Link
              href="/admin-portal/submissions"
              className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              View All Submissions
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin-portal/submissions"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Submissions
        </Link>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Clock className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">New Trial Submission</h1>
            <p className="text-gray-500">Create a 30-day free trial for a web design client</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Client Info */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-gray-400" />
            Client Information
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Company Name *
            </label>
            <input
              type="text"
              value={formData.client_company_name}
              onChange={(e) => setFormData({ ...formData, client_company_name: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              placeholder="ABC Plumbing"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Mail className="h-4 w-4 inline mr-1" />
                Email Address *
              </label>
              <input
                type="email"
                value={formData.client_email}
                onChange={(e) => setFormData({ ...formData, client_email: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                placeholder="client@company.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Phone className="h-4 w-4 inline mr-1" />
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.client_phone}
                onChange={(e) => setFormData({ ...formData, client_phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                placeholder="(555) 123-4567"
              />
            </div>
          </div>
        </div>

        {/* Local SEO - Website URL (required for SEO plans) */}
        {selectedTrack === 'seo' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Globe className="h-5 w-5 text-gray-400" />
              Existing Website
            </h2>
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800 flex items-start gap-2">
              <Info className="h-4 w-4 mt-0.5 shrink-0" />
              <span>Local SEO plans require an existing website. We will optimize this site for local search.</span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client's Website URL *
              </label>
              <input
                type="url"
                value={formData.existing_website_url}
                onChange={(e) => setFormData({ ...formData, existing_website_url: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                placeholder="https://www.clientwebsite.com"
              />
            </div>
          </div>
        )}

        {/* Plan Selection */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-gray-400" />
            Plan Selection
          </h2>

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
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      Website included
                    </div>
                  )}
                  {plan.features.includes_crm && (
                    <div className="text-xs text-gray-600 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      CRM included
                    </div>
                  )}
                  {plan.features.includes_local_seo && (
                    <div className="text-xs text-gray-600 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      Local SEO included
                    </div>
                  )}
                  {plan.features.includes_gbp && (
                    <div className="text-xs text-gray-600 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-500" />
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

          {/* Leads Captain indicator for Silver/Gold */}
          {(selectedTrack === 'silver' || selectedTrack === 'gold') && (
            <div className="p-4 bg-cyan-50 border border-cyan-200 rounded-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-cyan-600" />
              <span className="text-sm text-cyan-800">
                <strong>Leads Captain:</strong> AI Missed Call Text-Back included with this bundle
              </span>
            </div>
          )}

          {/* Pro/Enterprise CRM includes Leads Captain */}
          {selectedTrack === 'blue' && selectedPlan && ['blue_pro', 'blue_enterprise'].includes(selectedPlan.id) && (
            <div className="p-4 bg-cyan-50 border border-cyan-200 rounded-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-cyan-600" />
              <span className="text-sm text-cyan-800">
                <strong>Leads Captain:</strong> Included with Pro and Enterprise CRM tiers
              </span>
            </div>
          )}
        </div>

        {/* Offers Section */}
        {availableOffers.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Tag className="h-5 w-5 text-gray-400" />
              Apply Offers
            </h2>
            <p className="text-sm text-gray-500">
              Select pre-approved offers to apply. Some offers can be stacked.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {availableOffers.map((offer) => {
                const isSelected = selectedOffers.includes(offer.code);
                const requiresApproval = offer.requires_approval;

                return (
                  <label
                    key={offer.code}
                    className={cn(
                      'relative flex items-start gap-3 p-4 border-2 rounded-xl cursor-pointer transition-colors',
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300',
                      requiresApproval && 'border-dashed'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleOffer(offer.code)}
                      className="mt-0.5 h-4 w-4 text-primary border-gray-300 rounded"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{offer.code}</span>
                        {requiresApproval && (
                          <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded">
                            Requires Approval
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{offer.name}</p>
                      <p className="text-xs text-gray-500 mt-1">{offer.description}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* Pricing Summary */}
        {pricing && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-gray-400" />
              Pricing Summary
            </h2>

            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Plan: {selectedPlan?.name}</span>
                <span className="text-gray-900">
                  ${billingFrequency === 'monthly' ? selectedPlan?.monthly_price : selectedPlan?.annual_price}/
                  {billingFrequency === 'monthly' ? 'mo' : 'yr'}
                </span>
              </div>


              {selectedOffers.length > 0 && (
                <>
                  <div className="border-t border-gray-200 pt-3">
                    <p className="text-xs font-medium text-gray-500 mb-2">OFFERS APPLIED:</p>
                    {selectedOffers.map(code => {
                      const offer = OFFERS.find(o => o.code === code);
                      return (
                        <div key={code} className="flex justify-between text-sm text-green-700">
                          <span>{offer?.code}: {offer?.name}</span>
                          <span>-{offer?.discount_value}%</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              <div className="border-t border-gray-200 pt-3 flex justify-between">
                <span className="font-semibold text-gray-900">
                  {pricing.trial_days > 0 ? 'After Trial' : 'Total'} ({billingFrequency}):
                </span>
                <span className="font-bold text-xl text-gray-900">
                  ${billingFrequency === 'annual' ? pricing.annual_rate?.toFixed(2) : pricing.effective_monthly_rate.toFixed(2)}
                  {billingFrequency === 'monthly' && '/mo'}
                </span>
              </div>

              {pricing.trial_days > 0 && (
                <div className="bg-blue-50 -mx-4 -mb-4 mt-3 px-4 py-3 rounded-b-lg text-sm text-blue-800">
                  <strong>{pricing.trial_days}-day free trial</strong> — No charge until trial ends
                </div>
              )}

            </div>
          </div>
        )}

        {/* Notes */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="h-5 w-5 text-gray-400" />
            Notes
          </h2>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            placeholder="Any additional notes about this client or sale..."
          />
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          <Link
            href="/admin-portal/submissions"
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 font-medium disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Clock className="h-4 w-4" />
            )}
            Create Trial Submission
          </button>
        </div>
      </form>
    </div>
  );
}
