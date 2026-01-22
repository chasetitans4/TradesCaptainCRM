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
  Globe,
  Users,
  ChevronRight,
  Tag,
  RefreshCw,
  Info,
  MapPin,
} from 'lucide-react';
import type { Plan, PlanTrack, AddOn } from '@/lib/pricing/plans';
import type { Offer } from '@/lib/pricing/offers';
import { logger } from '@/lib/logger';
import { AdminPageHeader } from '@/components/admin/page-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

const adminPricingLogger = logger.child({ context: 'admin.pricing' });

// v6.0 Track Configuration - active products only
const TRACK_CONFIG: Record<PlanTrack, { label: string; description: string; icon: React.ElementType; color: string }> = {
  blue: {
    label: 'Blue (CRM)',
    description: 'CRM plans - Pro/Enterprise include AI SMS (Leads Captain)',
    icon: Users,
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
  web: {
    label: 'Web (Website)',
    description: 'Professional website plans',
    icon: Globe,
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  },
  seo_aeo: {
    label: 'SEO/AEO',
    description: 'SEO & AI Engine Optimization for existing websites',
    icon: MapPin,
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  },
};

// Active tracks for filtering (v6.0)
const ACTIVE_TRACKS: PlanTrack[] = ['blue', 'web', 'seo_aeo'];

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

  // Group by track (active tracks only for v6.0)
  const plansByTrack = ACTIVE_TRACKS.reduce((acc, track) => {
    acc[track] = filteredPlans.filter(p => p.track === track);
    return acc;
  }, {} as Record<PlanTrack, Plan[]>);

  const formatPrice = (price: number) => {
    if (price === 0) return 'Quote';
    return `$${price}`;
  };

  return (
    <div className="space-y-6 p-6">
      <AdminPageHeader
        title="Pricing & Plans"
        description="v6.0 Pricing Structure"
        icon={DollarSign}
        breadcrumb={[{ label: 'Pricing' }]}
        actions={
            <Button variant="outline" onClick={fetchData}>
                <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
                Refresh
            </Button>
        }
      />

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold">{plans.filter(p => !p.is_discontinued).length}</p>
          <p className="text-sm text-muted-foreground">Active Plans</p>
        </Card>
        <Card className="p-4 text-center bg-blue-50 dark:bg-blue-900/10">
          <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{plans.filter(p => p.track === 'blue').length}</p>
          <p className="text-sm text-blue-600 dark:text-blue-300">Blue Plans</p>
        </Card>
        <Card className="p-4 text-center bg-purple-50 dark:bg-purple-900/10">
          <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">{plans.filter(p => p.track === 'web').length}</p>
          <p className="text-sm text-purple-600 dark:text-purple-300">Web Plans</p>
        </Card>
        <Card className="p-4 text-center bg-green-50 dark:bg-green-900/10">
          <p className="text-2xl font-bold text-green-700 dark:text-green-400">{plans.filter(p => p.track === 'seo_aeo').length}</p>
          <p className="text-sm text-green-600 dark:text-green-300">SEO/AEO Plans</p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px] max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              All
            </button>
            {ACTIVE_TRACKS.map(track => {
              const config = TRACK_CONFIG[track];
              return (
                <button
                  key={track}
                  onClick={() => setSelectedTrack(track)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                    selectedTrack === track
                      ? config.color
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  )}
                >
                  {config.label.split(' ')[0]}
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Plans by Track */}
      {loading ? (
        <Card className="p-8 text-center">
          <RefreshCw className="h-8 w-8 text-primary mx-auto mb-3 animate-spin" />
          <p className="text-muted-foreground">Loading plans...</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {ACTIVE_TRACKS.map(track => {
            const trackPlans = plansByTrack[track];
            if (selectedTrack !== 'all' && selectedTrack !== track) return null;
            if (!trackPlans || trackPlans.length === 0) return null;

            const config = TRACK_CONFIG[track];
            const TrackIcon = config.icon;

            return (
              <Card key={track} className="overflow-hidden">
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
                    <thead className="bg-muted/50 border-b">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Plan</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Monthly</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Annual</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Users</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">GBP</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Local SEO</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Website</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {trackPlans.map(plan => (
                        <tr key={plan.id} className="hover:bg-muted/50">
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium">{plan.name}</p>
                              <p className="text-xs text-muted-foreground">{plan.id}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-semibold">
                              {formatPrice(plan.monthly_price)}/mo
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-muted-foreground">
                              {formatPrice(plan.annual_price)}/yr
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-muted-foreground">
                              {plan.features.users > 0 ? plan.features.users : '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {plan.features.includes_gbp ? (
                              <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                                <Check className="h-4 w-4" /> Included
                              </span>
                            ) : plan.features.gbp_addon_available ? (
                              <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400">
                                <Tag className="h-4 w-4" /> $99 Add-on
                              </span>
                            ) : (
                              <span className="text-muted-foreground">
                                <X className="h-4 w-4" />
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {plan.features.includes_local_seo ? (
                              <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                                <Check className="h-4 w-4" /> {plan.features.local_seo_tier}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">
                                <X className="h-4 w-4" />
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {plan.features.includes_website ? (
                              <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                                <Check className="h-4 w-4" /> {plan.features.website_pages}
                              </span>
                            ) : plan.features.requires_existing_website ? (
                              <span className="text-orange-600 dark:text-orange-400 text-sm">Required</span>
                            ) : (
                              <span className="text-muted-foreground">
                                <X className="h-4 w-4" />
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add-ons Section */}
      <Card className="overflow-hidden">
        <div className="px-4 py-3 bg-muted/50 border-b">
          <h2 className="font-semibold">Add-ons</h2>
        </div>
        <div className="p-4">
          <div className="grid md:grid-cols-2 gap-4">
            {addons.map(addon => (
              <div key={addon.id} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium">{addon.name}</h3>
                  <span className="font-bold text-green-600 dark:text-green-400">
                    ${addon.price}
                    {addon.billing_type === 'recurring' && '/mo'}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{addon.description}</p>
                <div className="flex flex-wrap gap-1">
                  {addon.available_for.map(planId => (
                    <span
                      key={planId}
                      className="px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded"
                    >
                      {planId}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Active Offers Section */}
      <Card className="overflow-hidden">
        <div className="px-4 py-3 bg-orange-100 dark:bg-orange-900/20 border-b flex items-center justify-between">
          <h2 className="font-semibold text-orange-900 dark:text-orange-300">Active Offers</h2>
          <Link href="/admin/offers" className="text-sm text-orange-700 dark:text-orange-400 hover:text-orange-800 flex items-center gap-1">
            Manage Offers <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="p-4">
          <div className="space-y-3">
            {offers.map(offer => (
              <div
                key={offer.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'px-2 py-1 rounded text-xs font-mono font-bold',
                    offer.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                  )}>
                    {offer.code}
                  </div>
                  <div>
                    <p className="font-medium">{offer.name}</p>
                    <p className="text-sm text-muted-foreground">{offer.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {offer.requires_approval && (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 text-xs rounded">
                      Requires Approval
                    </span>
                  )}
                  <span className={cn(
                    'px-2 py-1 rounded text-xs font-medium',
                    offer.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                  )}>
                    {offer.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Important Notes */}
      <Card className="p-4 bg-blue-50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-800">
        <div className="flex gap-3">
          <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800 dark:text-blue-300">
            <p className="font-medium mb-2">v6.0 Pricing Updates:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Bundles Discontinued:</strong> Silver and Gold bundles are no longer available for new sales</li>
              <li><strong>Leads Captain Consolidated:</strong> AI SMS is now included in Blue Pro ($99) and Enterprise ($199)</li>
              <li><strong>SEO Renamed:</strong> Local SEO is now &quot;SEO/AEO&quot; (AI Engine Optimization)</li>
              <li><strong>SEO/AEO Enterprise:</strong> Price increased from $249 to $299/mo</li>
              <li><strong>Extra User Add-on:</strong> $10/mo per additional user for Blue CRM plans</li>
              <li>Existing Silver/Gold/Leads Captain subscriptions continue - only new sales affected</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
