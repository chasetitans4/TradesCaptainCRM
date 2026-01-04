'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DollarSign,
  Search,
  Check,
  X,
  Sparkles,
  Globe,
  Users,
  Building2,
  ChevronRight,
  Tag,
  RefreshCw,
  Info,
  MapPin,
} from 'lucide-react';
import type { Plan, PlanTrack, AddOn } from '@/lib/pricing/plans';
import type { Offer } from '@/lib/pricing/offers';
import { logger } from '@/lib/logger';
const adminPricingLogger = logger.child({ context: 'admin.pricing' });

const TRACK_CONFIG: Record<PlanTrack, { label: string; description: string; icon: React.ElementType; color: string }> = {
  leads_captain: {
    label: 'Leads Captain',
    description: 'AI Missed Call Text-Back - standalone product',
    icon: DollarSign,
    color: 'bg-cyan-100 text-cyan-700',
  },
  blue: {
    label: 'Blue (CRM)',
    description: 'CRM-only plans for businesses with existing websites',
    icon: Users,
    color: 'bg-blue-100 text-blue-700',
  },
  web: {
    label: 'Web (Website)',
    description: 'Professional website plans',
    icon: Globe,
    color: 'bg-purple-100 text-purple-700',
  },
  seo: {
    label: 'Local SEO',
    description: 'SEO services for existing websites',
    icon: MapPin,
    color: 'bg-green-100 text-green-700',
  },
  silver: {
    label: 'Silver',
    description: 'Website + CRM + Leads Captain bundle',
    icon: Sparkles,
    color: 'bg-gray-100 text-gray-700',
  },
  gold: {
    label: 'Gold (All-in-One)',
    description: 'Website + CRM + Leads Captain + Local SEO',
    icon: Sparkles,
    color: 'bg-yellow-100 text-yellow-700',
  },
};

export default function PricingManagementPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [addons, setAddons] = useState<AddOn[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrack, setSelectedTrack] = useState<PlanTrack | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [plansRes, offersRes] = await Promise.all([
        fetch('/api/pricing/plans?include_addons=true'),
        fetch('/api/pricing/offers'),
      ]);

      if (plansRes.ok) {
        const data = await plansRes.json();
        setPlans(data.plans || []);
        setAddons(data.addons || []);
      }

      if (offersRes.ok) {
        const data = await offersRes.json();
        setOffers(data.offers || []);
      }
    } catch (error) {
      adminPricingLogger.error({
        msg: 'Error fetching pricing data',
        error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) },
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter plans
  const filteredPlans = plans.filter(plan => {
    if (selectedTrack !== 'all' && plan.track !== selectedTrack) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return plan.name.toLowerCase().includes(query) || plan.id.toLowerCase().includes(query);
    }
    return true;
  });

  // Group by track
  const plansByTrack = (['blue', 'web', 'seo', 'gold'] as PlanTrack[]).reduce((acc, track) => {
    acc[track] = filteredPlans.filter(p => p.track === track);
    return acc;
  }, {} as Record<PlanTrack, Plan[]>);

  const formatPrice = (price: number) => {
    if (price === 0) return 'Quote';
    return `$${price}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Pricing & Plans</h1>
              <p className="text-sm text-gray-500">v5 Pricing Structure</p>
            </div>
          </div>
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </header>

      <div className="p-6 space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{plans.length}</p>
            <p className="text-sm text-gray-500">Total Plans</p>
          </div>
          <div className="card p-4 text-center bg-blue-50">
            <p className="text-2xl font-bold text-blue-700">{plans.filter(p => p.track === 'blue').length}</p>
            <p className="text-sm text-blue-600">Blue Plans</p>
          </div>
          <div className="card p-4 text-center bg-purple-50">
            <p className="text-2xl font-bold text-purple-700">{plans.filter(p => p.track === 'web').length}</p>
            <p className="text-sm text-purple-600">Web Plans</p>
          </div>
          <div className="card p-4 text-center bg-green-50">
            <p className="text-2xl font-bold text-green-700">{plans.filter(p => p.track === 'seo').length}</p>
            <p className="text-sm text-green-600">SEO Plans</p>
          </div>
          <div className="card p-4 text-center bg-yellow-50">
            <p className="text-2xl font-bold text-yellow-700">{plans.filter(p => p.track === 'gold').length}</p>
            <p className="text-sm text-yellow-600">Gold Plans</p>
          </div>
        </div>

        {/* Filters */}
        <div className="card p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px] max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="search"
                  placeholder="Search plans..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setSelectedTrack('all')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  selectedTrack === 'all'
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                All
              </button>
              {(['blue', 'web', 'seo', 'gold'] as PlanTrack[]).map(track => {
                const config = TRACK_CONFIG[track];
                return (
                  <button
                    key={track}
                    onClick={() => setSelectedTrack(track)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                      selectedTrack === track
                        ? config.color
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    )}
                  >
                    {config.label.split(' ')[0]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Plans by Track */}
        {loading ? (
          <div className="card p-8 text-center">
            <RefreshCw className="h-8 w-8 text-primary mx-auto mb-3 animate-spin" />
            <p className="text-gray-500">Loading plans...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {(['blue', 'web', 'seo', 'gold'] as PlanTrack[]).map(track => {
              const trackPlans = plansByTrack[track];
              if (selectedTrack !== 'all' && selectedTrack !== track) return null;
              if (trackPlans.length === 0) return null;

              const config = TRACK_CONFIG[track];
              const TrackIcon = config.icon;

              return (
                <div key={track} className="card overflow-hidden">
                  {/* Track Header */}
                  <div className={cn('px-4 py-3 flex items-center gap-3', config.color)}>
                    <TrackIcon className="h-5 w-5" />
                    <div>
                      <h2 className="font-semibold">{config.label}</h2>
                      <p className="text-xs opacity-80">{config.description}</p>
                    </div>
                  </div>

                  {/* Plans Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Plan</th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Monthly</th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Annual</th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Users</th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">GBP</th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Local SEO</th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Website</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {trackPlans.map(plan => (
                          <tr key={plan.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div>
                                <p className="font-medium text-gray-900">{plan.name}</p>
                                <p className="text-xs text-gray-500">{plan.id}</p>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-semibold text-gray-900">
                                {formatPrice(plan.monthly_price)}/mo
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-gray-700">
                                {formatPrice(plan.annual_price)}/yr
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-gray-700">
                                {plan.features.users > 0 ? plan.features.users : '-'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {plan.features.includes_gbp ? (
                                <span className="inline-flex items-center gap-1 text-green-600">
                                  <Check className="h-4 w-4" /> Included
                                </span>
                              ) : plan.features.gbp_addon_available ? (
                                <span className="inline-flex items-center gap-1 text-blue-600">
                                  <Tag className="h-4 w-4" /> $99 Add-on
                                </span>
                              ) : (
                                <span className="text-gray-400">
                                  <X className="h-4 w-4" />
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {plan.features.includes_local_seo ? (
                                <span className="inline-flex items-center gap-1 text-green-600">
                                  <Check className="h-4 w-4" /> {plan.features.local_seo_tier}
                                </span>
                              ) : (
                                <span className="text-gray-400">
                                  <X className="h-4 w-4" />
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {plan.features.includes_website ? (
                                <span className="inline-flex items-center gap-1 text-green-600">
                                  <Check className="h-4 w-4" /> {plan.features.website_pages}
                                </span>
                              ) : plan.features.requires_existing_website ? (
                                <span className="text-orange-600 text-sm">Required</span>
                              ) : (
                                <span className="text-gray-400">
                                  <X className="h-4 w-4" />
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add-ons Section */}
        <div className="card overflow-hidden">
          <div className="px-4 py-3 bg-gray-100 border-b">
            <h2 className="font-semibold text-gray-900">Add-ons</h2>
          </div>
          <div className="p-4">
            <div className="grid md:grid-cols-2 gap-4">
              {addons.map(addon => (
                <div key={addon.id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-gray-900">{addon.name}</h3>
                    <span className="font-bold text-green-600">
                      ${addon.price}
                      {addon.billing_type === 'recurring' && '/mo'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{addon.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {addon.available_for.map(planId => (
                      <span
                        key={planId}
                        className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
                      >
                        {planId}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Active Offers Section */}
        <div className="card overflow-hidden">
          <div className="px-4 py-3 bg-orange-100 border-b flex items-center justify-between">
            <h2 className="font-semibold text-orange-900">Active Offers</h2>
            <a href="/admin-portal/offers" className="text-sm text-orange-700 hover:text-orange-800 flex items-center gap-1">
              Manage Offers <ChevronRight className="h-4 w-4" />
            </a>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              {offers.map(offer => (
                <div
                  key={offer.id}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'px-2 py-1 rounded text-xs font-mono font-bold',
                      offer.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    )}>
                      {offer.code}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{offer.name}</p>
                      <p className="text-sm text-gray-500">{offer.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {offer.requires_approval && (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded">
                        Requires Approval
                      </span>
                    )}
                    <span className={cn(
                      'px-2 py-1 rounded text-xs font-medium',
                      offer.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    )}>
                      {offer.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Important Notes */}
        <div className="card p-4 bg-blue-50 border-blue-200">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-2">v5 Pricing Updates:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Gold plans increased by $50/mo (now include Local SEO)</li>
                <li>New Local SEO track for businesses with existing websites</li>
                <li>GBP add-on ($99) only available for Web plans</li>
                <li>Link building services have been REMOVED</li>
                <li>Agents can only apply pre-defined offers - no custom pricing</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
