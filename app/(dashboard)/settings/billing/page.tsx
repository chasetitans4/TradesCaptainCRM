'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Alert,
  AlertDescription,
  Badge,
} from '@/components/ui';
import {
  ArrowLeft,
  CreditCard,
  Check,
  AlertTriangle,
  ExternalLink,
  Download,
  Loader2,
  Zap,
  Building2,
  Users,
  X,
  Plus,
  Minus,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface SubscriptionDetails {
  status: string;
  planTier: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  hasMultiLocationAddon: boolean;
  leadsThisMonth: number;
  leadsLimit: number;
  upcomingAmount: number | null;
  paymentMethod: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  } | null;
}

interface Invoice {
  id: string;
  date: string;
  amount: number;
  status: string;
  pdfUrl: string | null;
}

interface UserPricingInfo {
  businessId: string;
  planTier: 'starter' | 'pro' | 'enterprise';
  billableUserCount: number;
  includedUsers: number;
  additionalUsers: number;
  perUserPrice: number;
  monthlyUserCharge: number;
}

// Updated for v5.9.2 - renamed growth→pro, pro→enterprise
const PLAN_DETAILS = {
  starter: {
    name: 'Starter Plan',
    price: 49,
    leads: 0,
    users: 1,
    features: ['1 user included', 'Contact management', 'Calendar & scheduling', 'Mobile app access'],
  },
  pro: {
    name: 'Pro Plan',
    price: 99,
    leads: 200,
    users: 3,
    features: ['3 users included', 'AI SMS (1,000/mo)', 'Full pipeline', 'Invoicing & payments'],
  },
  enterprise: {
    name: 'Enterprise Plan',
    price: 199,
    leads: 300,
    users: 10,
    features: ['10 users included', 'AI SMS (1,500/mo)', 'Team management', 'Priority support'],
  },
};

export default function BillingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionDetails | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [priceIds, setPriceIds] = useState<{ starter: string; pro: string; enterprise: string } | null>(null);
  type ServiceKey = 'crm' | 'blue' | 'web' | 'silver' | 'gold' | 'seoaeo';
  const [priceCatalog, setPriceCatalog] = useState<Record<ServiceKey, { starter: string; pro: string; enterprise: string; multiLocation?: string }> | null>(null);
  const [selectedService, setSelectedService] = useState<ServiceKey>('crm');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [userPricing, setUserPricing] = useState<UserPricingInfo | null>(null);
  const [extraUsersToAdd, setExtraUsersToAdd] = useState(1);

  // Check for success/cancel params
  useEffect(() => {
    const svc = searchParams.get('service');
    if (svc === 'crm' || svc === 'blue' || svc === 'web' || svc === 'silver' || svc === 'gold' || svc === 'seoaeo') {
      setSelectedService(svc as ServiceKey);
    }
    if (searchParams.get('success') === 'true') {
      setSuccessMessage('Your subscription has been updated successfully!');
      router.replace('/settings/billing');
    } else if (searchParams.get('canceled') === 'true') {
      setError('Checkout was canceled.');
      router.replace('/settings/billing');
    }
  }, [searchParams, router]);

  useEffect(() => {
    fetchBillingData();
  }, []);

  async function fetchBillingData() {
    try {
      const [billingRes, pricingRes] = await Promise.all([
        fetch('/api/billing/subscription'),
        fetch('/api/billing/user-pricing'),
      ]);

      if (!billingRes.ok) throw new Error('Failed to fetch billing data');
      const data = await billingRes.json();
      setSubscription(data.subscription);
      setInvoices(data.invoices || []);
      setPriceIds(data.priceIds);
      setPriceCatalog(data.priceCatalog || null);

      if (pricingRes.ok) {
        const pricingData = await pricingRes.json();
        setUserPricing(pricingData);
      }
    } catch (_err) {
      setError('Failed to load billing information');
    } finally {
      setLoading(false);
    }
  }

  async function openCustomerPortal() {
    setActionLoading('portal');
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to create portal session');
      const { url } = await res.json();
      window.location.href = url;
    } catch (_err) {
      setError('Failed to open billing portal');
      setActionLoading(null);
    }
  }

  async function handleChangePlan(newTier: 'starter' | 'pro' | 'enterprise') {
    setActionLoading('changePlan');
    setError(null);

    try {
      const priceId = priceCatalog ? priceCatalog[selectedService]?.[newTier] : priceIds?.[newTier];
      if (!priceId) throw new Error('Price ID is not configured');
      const res = await fetch('/api/billing/subscription', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to change plan');
      }

      setSuccessMessage('Plan changed successfully!');
      setShowPlanModal(false);
      fetchBillingData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleAddExtraUsers() {
    if (extraUsersToAdd < 1) return;
    setActionLoading('addUsers');
    setError(null);

    try {
      // This would call an API to add extra user seats
      // For now, redirect to Stripe portal for subscription modification
      const res = await fetch('/api/billing/portal', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to open billing portal');
      const { url } = await res.json();
      window.location.href = url;
    } catch (err: any) {
      setError(err.message || 'Failed to add users');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCancelSubscription() {
    setActionLoading('cancel');
    setError(null);

    try {
      const res = await fetch('/api/billing/subscription', { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to cancel subscription');
      }

      setSuccessMessage('Your subscription will be canceled at the end of the billing period.');
      setShowCancelConfirm(false);
      fetchBillingData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReactivate() {
    setActionLoading('reactivate');
    setError(null);

    try {
      const res = await fetch('/api/billing/subscription/reactivate', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to reactivate subscription');
      }

      setSuccessMessage('Your subscription has been reactivated!');
      fetchBillingData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentPlan = subscription?.planTier ? PLAN_DETAILS[subscription.planTier as keyof typeof PLAN_DETAILS] : null;
  const leadsPercentage = subscription ? Math.round((subscription.leadsThisMonth / subscription.leadsLimit) * 100) : 0;

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <Link href="/settings">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-lg font-semibold text-text">Billing & Subscription</h1>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Success/Error Messages */}
        {successMessage && (
          <Alert variant="success" className="mb-4">
            <Check className="h-4 w-4" />
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="danger" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Cancellation Warning */}
        {subscription?.cancelAtPeriodEnd && (
          <Alert variant="warning" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Your subscription will be canceled on{' '}
              {subscription.currentPeriodEnd
                ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
                : 'the end of your billing period'}
              .{' '}
              <button
                onClick={handleReactivate}
                className="underline font-medium"
                disabled={actionLoading === 'reactivate'}
              >
                {actionLoading === 'reactivate' ? 'Reactivating...' : 'Reactivate'}
              </button>
            </AlertDescription>
          </Alert>
        )}

        {/* Current Plan */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Current Plan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentPlan ? (
              <>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-text text-lg">{currentPlan.name}</h3>
                    <p className="text-2xl font-bold text-text">
                      {formatCurrency(currentPlan.price)}
                      <span className="text-sm font-normal text-text-muted">/month</span>
                    </p>
                  </div>
                  <Badge variant={subscription?.status === 'active' ? 'success' : 'warning'}>
                    {subscription?.status === 'active' ? 'Active' : subscription?.status}
                  </Badge>
                </div>

                <ul className="space-y-2">
                  {currentPlan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-text-muted">
                      <Check className="h-4 w-4 text-success" />
                      {feature}
                    </li>
                  ))}
                </ul>

                {/* Lead Usage */}
                <div className="pt-4 border-t border-border">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-text-muted">Lead usage this month</span>
                    <span className="font-medium text-text">
                      {subscription?.leadsThisMonth || 0} / {subscription?.leadsLimit || currentPlan.leads}
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        leadsPercentage >= 90 ? 'bg-danger' : leadsPercentage >= 70 ? 'bg-warning' : 'bg-primary'
                      }`}
                      style={{ width: `${Math.min(leadsPercentage, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Next Billing */}
                {subscription?.currentPeriodEnd && !subscription.cancelAtPeriodEnd && (
                  <div className="pt-4 border-t border-border">
                    <div className="flex justify-between text-sm">
                      <span className="text-text-muted">Next billing date</span>
                      <span className="text-text">
                        {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                      </span>
                    </div>
                    {subscription.upcomingAmount !== null && (
                      <div className="flex justify-between text-sm mt-1">
                        <span className="text-text-muted">Amount</span>
                        <span className="font-medium text-text">
                          {formatCurrency(subscription.upcomingAmount)}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowPlanModal(true)}
                  disabled={subscription?.cancelAtPeriodEnd}
                >
                  Change Plan
                </Button>
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-text-muted mb-4">No active subscription</p>
                <Button onClick={() => setShowPlanModal(true)}>Choose a Plan</Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Extra Users Section */}
        {subscription?.status === 'active' && userPricing && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Team Users
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-text">
                    {userPricing.billableUserCount} of {userPricing.includedUsers} users
                  </p>
                  <p className="text-sm text-text-muted">
                    Your {userPricing.planTier.charAt(0).toUpperCase() + userPricing.planTier.slice(1)} plan includes {userPricing.includedUsers} user{userPricing.includedUsers !== 1 ? 's' : ''}
                  </p>
                </div>
                {userPricing.additionalUsers > 0 && (
                  <Badge variant="primary">
                    +{userPricing.additionalUsers} extra
                  </Badge>
                )}
              </div>

              {/* User usage bar */}
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    userPricing.billableUserCount >= userPricing.includedUsers
                      ? 'bg-amber-500'
                      : 'bg-primary'
                  }`}
                  style={{
                    width: `${Math.min(
                      (userPricing.billableUserCount / userPricing.includedUsers) * 100,
                      100
                    )}%`,
                  }}
                />
              </div>

              {/* Add extra users */}
              <div className="pt-4 border-t border-border">
                <p className="text-sm text-text-muted mb-3">
                  Need more seats? Add extra users at $10/month each.
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex items-center border border-border rounded-lg">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 px-2"
                      onClick={() => setExtraUsersToAdd(Math.max(1, extraUsersToAdd - 1))}
                      disabled={extraUsersToAdd <= 1}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-10 text-center font-medium">{extraUsersToAdd}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 px-2"
                      onClick={() => setExtraUsersToAdd(extraUsersToAdd + 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button
                    variant="primary"
                    onClick={handleAddExtraUsers}
                    disabled={actionLoading === 'addUsers'}
                    className="flex-1"
                  >
                    {actionLoading === 'addUsers' ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Add {extraUsersToAdd} User{extraUsersToAdd !== 1 ? 's' : ''} (+${extraUsersToAdd * 10}/mo)
                  </Button>
                </div>
              </div>

              {userPricing.monthlyUserCharge > 0 && (
                <p className="text-xs text-text-muted">
                  Current extra user charges: ${userPricing.monthlyUserCharge}/month
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Multi-Location Add-on */}
        {subscription?.status === 'active' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                Add-ons
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-text">Multi-Location</p>
                  <p className="text-sm text-text-muted">Add another location with +200 leads</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-text">+$249/mo</p>
                  {subscription.hasMultiLocationAddon ? (
                    <Badge variant="success">Active</Badge>
                  ) : (
                    <Button variant="outline" size="sm" className="mt-1">
                      Add
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Method */}
        {subscription?.paymentMethod && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                Payment Method
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-6 bg-muted rounded flex items-center justify-center">
                    <CreditCard className="h-4 w-4 text-text-muted" />
                  </div>
                  <div>
                    <p className="font-medium text-text capitalize">
                      {subscription.paymentMethod.brand} ending in {subscription.paymentMethod.last4}
                    </p>
                    <p className="text-sm text-text-muted">
                      Expires {subscription.paymentMethod.expMonth}/{subscription.paymentMethod.expYear}
                    </p>
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={openCustomerPortal}
                disabled={actionLoading === 'portal'}
              >
                {actionLoading === 'portal' ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <ExternalLink className="h-4 w-4 mr-2" />
                )}
                Update Payment Method
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Invoice History */}
        {invoices.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Billing History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {invoices.slice(0, 5).map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium text-text">
                        {new Date(invoice.date).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-text-muted">{formatCurrency(invoice.amount)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={invoice.status === 'paid' ? 'success' : 'warning'}>
                        {invoice.status}
                      </Badge>
                      {invoice.pdfUrl && (
                        <a href={invoice.pdfUrl} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={openCustomerPortal}
                disabled={actionLoading === 'portal'}
              >
                View All Invoices
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Cancel Subscription */}
        {subscription?.status === 'active' && !subscription.cancelAtPeriodEnd && (
          <div className="pt-4">
            <Button
              variant="ghost"
              className="w-full text-danger hover:bg-danger/10"
              onClick={() => setShowCancelConfirm(true)}
            >
              Cancel Subscription
            </Button>
          </div>
        )}
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-danger">
                <AlertTriangle className="h-5 w-5" />
                Cancel Subscription?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-text-muted">
                Your subscription will remain active until the end of your current billing period. After that:
              </p>
              <ul className="space-y-2 text-sm text-text-muted">
                <li className="flex items-center gap-2">
                  <X className="h-4 w-4 text-danger" />
                  You'll lose access to AI SMS responses
                </li>
                <li className="flex items-center gap-2">
                  <X className="h-4 w-4 text-danger" />
                  New leads will not be captured
                </li>
                <li className="flex items-center gap-2">
                  <X className="h-4 w-4 text-danger" />
                  Your data will be retained for 30 days
                </li>
              </ul>
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowCancelConfirm(false)}
                >
                  Keep Subscription
                </Button>
                <Button
                  variant="danger"
                  className="flex-1"
                  onClick={handleCancelSubscription}
                  disabled={actionLoading === 'cancel'}
                >
                  {actionLoading === 'cancel' ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Change Plan Modal */}
      {showPlanModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Choose Your Plan</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowPlanModal(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {(['starter', 'pro', 'enterprise'] as const).map((tier) => {
                const plan = PLAN_DETAILS[tier];
                const isCurrentPlan = subscription?.planTier === tier;
                return (
                  <div
                    key={tier}
                    className={`p-4 rounded-lg border-2 transition-colors ${
                      isCurrentPlan ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-text">{plan.name}</h3>
                        <p className="text-2xl font-bold text-text">
                          {formatCurrency(plan.price)}
                          <span className="text-sm font-normal text-text-muted">/mo</span>
                        </p>
                      </div>
                      {isCurrentPlan && <Badge variant="primary">Current</Badge>}
                    </div>
                    <ul className="space-y-2 mb-4">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-text-muted">
                          <Check className="h-4 w-4 text-success" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Button
                      variant={isCurrentPlan ? 'outline' : 'primary'}
                      className="w-full"
                      disabled={isCurrentPlan || actionLoading === 'changePlan'}
                      onClick={() => handleChangePlan(tier)}
                    >
                      {actionLoading === 'changePlan' ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      {isCurrentPlan ? 'Current Plan' : `Switch to ${plan.name}`}
                    </Button>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
