'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  ShieldCheck,
  Check,
  Clock,
  Calendar,
  Zap,
  Percent,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { logger } from '@/lib/logger';

const membershipLogger = logger.child({ context: 'portal.membership' });

interface Membership {
  id: string;
  name: string;
  membership_tier: string;
  status: string;
  start_date: string;
  end_date?: string;
  renewal_price?: number;
  benefits: {
    discount_percentage?: number;
    priority_scheduling?: boolean;
    free_diagnostic?: boolean;
    maintenance_visits_per_year?: number;
    custom_benefits?: string[];
  };
  savings_to_date?: number;
}

export default function MembershipPage() {
  const params = useParams();
  const businessId = params.businessId as string;
  const [membership, setMembership] = useState<Membership | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadMembership() {
      try {
        const response = await fetch(`/api/portal/membership?businessId=${businessId}`);
        if (!response.ok) {
          throw new Error('Failed to load membership data');
        }
        const data = await response.json();
        setMembership(data);
      } catch (err) {
        membershipLogger.error({
          msg: 'Error loading membership',
          error: err instanceof Error ? { message: err.message } : { message: String(err) },
        });
        // Don't show error if it's just 404 (no membership)
        // setError('Failed to load membership details');
      } finally {
        setLoading(false);
      }
    }

    loadMembership();
  }, [businessId]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!membership) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Membership</h1>
          <p className="text-gray-500">Manage your service agreement and benefits</p>
        </div>
        
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <ShieldCheck className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Membership</h3>
            <p className="text-gray-500 max-w-md mx-auto mb-6">
              You don't currently have an active service agreement. Memberships include benefits like priority scheduling, discounts, and regular maintenance.
            </p>
            <Button>Contact Us to Join</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isExpiringSoon = () => {
    if (!membership.end_date) return false;
    const endDate = new Date(membership.end_date);
    const today = new Date();
    const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysRemaining <= 30 && daysRemaining > 0;
  };

  const isExpired = () => {
    if (!membership.end_date) return false;
    return new Date(membership.end_date) < new Date();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Membership</h1>
        <p className="text-gray-500">Manage your service agreement and benefits</p>
      </div>

      {isExpiringSoon() && (
        <Alert className="bg-yellow-50 border-yellow-200">
          <Clock className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            Your membership expires on {new Date(membership.end_date!).toLocaleDateString()}. 
            Please contact us to renew.
          </AlertDescription>
        </Alert>
      )}

      {isExpired() && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Your membership expired on {new Date(membership.end_date!).toLocaleDateString()}.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Membership Card */}
        <Card className="md:col-span-2 border-t-4 border-t-blue-600">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-xl mb-1">{membership.name}</CardTitle>
                <CardDescription>{membership.membership_tier} Tier</CardDescription>
              </div>
              <Badge className={
                membership.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }>
                {membership.status.toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Start Date</p>
                <p className="font-medium">
                  {new Date(membership.start_date).toLocaleDateString()}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Renewal Date</p>
                <p className="font-medium">
                  {membership.end_date ? new Date(membership.end_date).toLocaleDateString() : 'Auto-renew'}
                </p>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-3">Your Benefits</h4>
              <div className="grid gap-3">
                {membership.benefits.priority_scheduling && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-full">
                      <Zap className="h-4 w-4 text-blue-600" />
                    </div>
                    <span>Priority Scheduling</span>
                  </div>
                )}
                {membership.benefits.free_diagnostic && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-full">
                      <Check className="h-4 w-4 text-blue-600" />
                    </div>
                    <span>Free Diagnostics</span>
                  </div>
                )}
                {(membership.benefits.discount_percentage || 0) > 0 && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-full">
                      <Percent className="h-4 w-4 text-blue-600" />
                    </div>
                    <span>{membership.benefits.discount_percentage}% Off Services</span>
                  </div>
                )}
                {membership.benefits.custom_benefits?.map((benefit, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-full">
                      <Check className="h-4 w-4 text-blue-600" />
                    </div>
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Savings Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Total Savings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-6">
              <div className="text-4xl font-bold text-green-600 mb-2">
                ${membership.savings_to_date?.toFixed(2) || '0.00'}
              </div>
              <p className="text-gray-500 text-sm">
                Saved since joining
              </p>
            </div>
            <div className="border-t pt-4 mt-4">
              <p className="text-xs text-center text-gray-400">
                Includes discounts on services, waived fees, and special offers.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
