'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import {
  Building2,
  Mail,
  User,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle,
  Crown,
  Clock,
  ArrowRight,
  Gift,
  Sparkles,
} from 'lucide-react';

interface InviteData {
  valid: boolean;
  submission_type: 'trial' | 'founders';
  company_name: string;
  email: string;
  plan: {
    type: string;
    name: string;
    price: number;
    users: number;
    features: string[];
  };
  is_founders: boolean;
  is_trial: boolean;
}

const plans = [
  {
    id: 'blue_starter',
    name: 'Blue Starter',
    price: 49,
    users: 1,
    description: 'Perfect for solo contractors',
    features: ['1 User', 'Unlimited Customers', 'Job Management', 'Basic Reporting'],
  },
  {
    id: 'blue_pro',
    name: 'Blue Pro',
    price: 99,
    users: 5,
    description: 'Great for small teams',
    features: ['5 Users', 'Everything in Starter', 'Team Scheduling', 'Advanced Reporting', 'Integrations'],
  },
  {
    id: 'blue_enterprise',
    name: 'Blue Enterprise',
    price: 149,
    users: 15,
    description: 'For growing businesses',
    features: ['15 Users', 'Everything in Pro', 'Custom Branding', 'API Access', 'Priority Support'],
  },
];

export default function RegistrationPage({ params }: { params: Promise<{ token: string }> }) {
  const resolvedParams = use(params);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>('');

  const [formData, setFormData] = useState({
    full_name: '',
    password: '',
    confirm_password: '',
  });

  useEffect(() => {
    async function validateToken() {
      try {
        const res = await fetch(`/api/register/${resolvedParams.token}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Invalid invitation link');
          return;
        }

        setInviteData(data);
        setSelectedPlan(data.plan.type);
      } catch (_err) {
        setError('Failed to validate invitation');
      } finally {
        setLoading(false);
      }
    }

    validateToken();
  }, [resolvedParams.token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (formData.password !== formData.confirm_password) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(`/api/register/${resolvedParams.token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: formData.full_name,
          password: formData.password,
          plan_type: inviteData?.is_trial ? selectedPlan : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-400">Validating your invitation...</p>
        </div>
      </div>
    );
  }

  if (error && !inviteData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Invitation</h1>
          <p className="text-gray-500 mb-6">{error}</p>
          <p className="text-sm text-gray-400">
            Please contact your sales representative for a new invitation link.
          </p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome Aboard!</h1>
          <p className="text-gray-500 mb-6">
            Your account has been created successfully. You can now sign in to your TradesCaptain CRM dashboard.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-medium rounded-xl hover:bg-primary/90 transition-colors"
          >
            Go to Dashboard
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full mb-6">
            {inviteData?.is_founders ? (
              <>
                <Crown className="h-5 w-5 text-purple-400" />
                <span className="text-purple-300 font-medium">Founders Program</span>
              </>
            ) : (
              <>
                <Clock className="h-5 w-5 text-blue-400" />
                <span className="text-blue-300 font-medium">30-Day Free Trial</span>
              </>
            )}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Complete Your Registration
          </h1>
          <p className="text-gray-400 text-lg">
            Set up your TradesCaptain CRM account for{' '}
            <span className="text-white font-medium">{inviteData?.company_name}</span>
          </p>
        </div>

        {/* Founders Banner */}
        {inviteData?.is_founders && (
          <div className="bg-gradient-to-r from-purple-600/20 to-purple-800/20 border border-purple-500/30 rounded-xl p-4 mb-6 flex items-center gap-4">
            <div className="p-3 bg-purple-500/20 rounded-lg">
              <Gift className="h-6 w-6 text-purple-400" />
            </div>
            <div>
              <div className="font-semibold text-purple-200">You're a Founding Member!</div>
              <div className="text-purple-300/80 text-sm">
                Enjoy 3 months free on the Blue Starter plan - a $147 value!
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Plan Selection (for trials) or Plan Info (for founders) */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {inviteData?.is_trial ? 'Select Your Plan' : 'Your Plan'}
            </h2>

            {inviteData?.is_founders ? (
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-xl font-bold text-white">Blue Starter</div>
                    <div className="text-purple-300">Founders Edition</div>
                  </div>
                  <Crown className="h-8 w-8 text-purple-400" />
                </div>
                <div className="mb-4">
                  <span className="text-3xl font-bold text-white">$0</span>
                  <span className="text-gray-400">/mo for 3 months</span>
                  <div className="text-sm text-gray-400 line-through">$49/mo regular price</div>
                </div>
                <ul className="space-y-2">
                  {plans[0].features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-gray-300">
                      <CheckCircle className="h-4 w-4 text-purple-400" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="space-y-3">
                {plans.map((plan) => (
                  <label
                    key={plan.id}
                    className={`relative flex flex-col p-4 rounded-xl cursor-pointer transition-all border-2 ${
                      selectedPlan === plan.id
                        ? 'border-primary bg-primary/10'
                        : 'border-white/10 hover:border-white/20 bg-white/5'
                    }`}
                  >
                    <input
                      type="radio"
                      name="plan"
                      value={plan.id}
                      checked={selectedPlan === plan.id}
                      onChange={(e) => setSelectedPlan(e.target.value)}
                      className="sr-only"
                    />
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-white">{plan.name}</div>
                        <div className="text-sm text-gray-400">{plan.description}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-white">${plan.price}</div>
                        <div className="text-xs text-gray-400">/month after trial</div>
                      </div>
                    </div>
                    {selectedPlan === plan.id && (
                      <div className="mt-3 pt-3 border-t border-white/10">
                        <ul className="grid grid-cols-2 gap-1 text-sm">
                          {plan.features.map((feature) => (
                            <li key={feature} className="flex items-center gap-1 text-gray-300">
                              <CheckCircle className="h-3 w-3 text-primary shrink-0" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Right Column - Registration Form */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Create Your Account
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              {/* Company (Read-only) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Building2 className="h-4 w-4 inline mr-1" />
                  Company
                </label>
                <input
                  type="text"
                  value={inviteData?.company_name || ''}
                  readOnly
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-600"
                />
              </div>

              {/* Email (Read-only) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Mail className="h-4 w-4 inline mr-1" />
                  Email Address
                </label>
                <input
                  type="email"
                  value={inviteData?.email || ''}
                  readOnly
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-600"
                />
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <User className="h-4 w-4 inline mr-1" />
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  placeholder="John Smith"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Lock className="h-4 w-4 inline mr-1" />
                  Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    minLength={8}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none pr-10"
                    placeholder="At least 8 characters"
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Lock className="h-4 w-4 inline mr-1" />
                  Confirm Password *
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.confirm_password}
                  onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  placeholder="Confirm your password"
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 px-4 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    Complete Registration
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>

              <p className="text-xs text-gray-500 text-center">
                By registering, you agree to our{' '}
                <Link href="/terms" className="text-primary hover:underline">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="text-primary hover:underline">
                  Privacy Policy
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
