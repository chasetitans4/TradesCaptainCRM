import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  subscribeToPlan,
  cancelMembership,
  reactivateMembership,
  getCustomerMembership,
  getBusinessMemberships,
  applyMembershipDiscount,
  consumeFreeBenefit,
  getExpiringMemberships,
} from '@/lib/memberships/subscriptions';
import { apiLogger } from '@/lib/logger';

import { getServerSession } from '@/lib/permissions/check-permission';

// GET /api/memberships/subscriptions - Get memberships
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    let businessId = session.user.businessId;

    if (session.user.role === 'admin' || session.user.role === 'super_admin') {
      const queryBusinessId = searchParams.get('businessId');
      if (queryBusinessId) businessId = queryBusinessId;
    }

    if (!businessId) {
      if (session.user.role === 'admin' || session.user.role === 'super_admin') {
         return NextResponse.json({ memberships: [] });
      }
      return NextResponse.json({ error: 'No business found' }, { status: 404 });
    }

    const customerId = searchParams.get('customerId');
    const status = searchParams.get('status');
    const expiring = searchParams.get('expiring');

    // Get single customer's membership
    if (customerId) {
      const membership = await getCustomerMembership(customerId);
      return NextResponse.json({ membership });
    }

    // Get expiring memberships
    if (expiring) {
      const days = parseInt(expiring) || 30;
      const memberships = await getExpiringMemberships(businessId, days);
      return NextResponse.json({ memberships });
    }

    // Get all business memberships
    const memberships = await getBusinessMemberships(businessId, status || undefined);
    return NextResponse.json({ memberships });
  } catch (error) {
    apiLogger.error({ message: 'Error fetching memberships', error });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to fetch memberships' }, { status: 500 });
  }
}

// POST /api/memberships/subscriptions - Membership actions
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, customerId, planId, membershipId, paymentMethodId, ...data } = body;

    let result;

    switch (action) {
      case 'subscribe':
        if (!customerId || !planId) {
          return NextResponse.json(
            { error: 'Customer ID and Plan ID are required' },
            { status: 400 }
          );
        }
        result = await subscribeToPlan(customerId, planId, paymentMethodId);
        break;

      case 'cancel':
        if (!membershipId) {
          return NextResponse.json({ error: 'Membership ID is required' }, { status: 400 });
        }
        result = await cancelMembership(membershipId, data.immediately === true);
        break;

      case 'reactivate':
        if (!membershipId) {
          return NextResponse.json({ error: 'Membership ID is required' }, { status: 400 });
        }
        result = await reactivateMembership(membershipId);
        break;

      case 'applyDiscount':
        if (!customerId || !data.invoiceTotal) {
          return NextResponse.json(
            { error: 'Customer ID and invoice total are required' },
            { status: 400 }
          );
        }
        const discount = await applyMembershipDiscount(customerId, data.invoiceTotal);
        return NextResponse.json({ discount });

      case 'useBenefit':
        if (!customerId || !data.benefitType) {
          return NextResponse.json(
            { error: 'Customer ID and benefit type are required' },
            { status: 400 }
          );
        }
        const benefitResult = await consumeFreeBenefit(customerId, data.benefitType);
        return NextResponse.json(benefitResult);

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    apiLogger.error({ message: 'Error with membership action', error });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to process membership action' }, { status: 500 });
  }
}
