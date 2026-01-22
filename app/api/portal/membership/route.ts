import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession } from '@/lib/portal/session';
import {
  getCustomerMemberships,
  getPrimaryMembership,
  getMembershipBenefitsUsed,
  getRemainingServices,
  getMembershipSavings,
  checkMembershipRenewal,
} from '@/lib/portal/membership';
import { apiLogger } from '@/lib/logger';

// GET /api/portal/membership - Get customer's membership/service agreement status
export async function GET(request: NextRequest) {
  try {
    const session = await getPortalSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeDetails = searchParams.get('include')?.split(',') || [];

    // Get primary membership
    const primaryMembership = await getPrimaryMembership(
      session.customerId,
      session.businessId
    );

    const response: Record<string, any> = {
      membership: primaryMembership,
    };

    // Optionally include all memberships
    if (includeDetails.includes('all')) {
      response.allMemberships = await getCustomerMemberships(
        session.customerId,
        session.businessId
      );
    }

    // If there's an active membership, include additional details
    if (primaryMembership) {
      // Check for renewal
      response.renewalInfo = await checkMembershipRenewal(
        primaryMembership.id,
        session.customerId,
        session.businessId
      );

      // Optionally include benefits used
      if (includeDetails.includes('benefits')) {
        response.benefitsUsed = await getMembershipBenefitsUsed(
          primaryMembership.id,
          session.customerId,
          session.businessId
        );
      }

      // Optionally include remaining services
      if (includeDetails.includes('remaining')) {
        response.remainingServices = await getRemainingServices(
          primaryMembership.id,
          session.customerId,
          session.businessId
        );
      }

      // Optionally include savings
      if (includeDetails.includes('savings')) {
        response.savings = await getMembershipSavings(
          primaryMembership.id,
          session.customerId,
          session.businessId
        );
      }
    }

    return NextResponse.json(response);
  } catch (error) {
    apiLogger.error({
      msg: 'Portal membership GET error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to fetch membership' }, { status: 500 });
  }
}
