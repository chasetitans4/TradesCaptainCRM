import { NextRequest, NextResponse } from 'next/server';
import {
  getCampaign,
  updateCampaign,
  startCampaign,
  pauseCampaign,
  completeCampaign,
} from '@/lib/outreach/campaigns';
import { requireAgentOrHigher } from '@/lib/admin/auth';
import { apiLogger } from '@/lib/logger';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/outreach/campaigns/[id]
 * Get a specific campaign
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const admin = await requireAgentOrHigher();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const campaign = await getCampaign(id);

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    return NextResponse.json(campaign);
  } catch (error) {
    apiLogger.error({ message: 'Error getting campaign', error });
    return NextResponse.json(
      { error: 'Failed to get campaign' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/outreach/campaigns/[id]
 * Update a campaign
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const admin = await requireAgentOrHigher();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { action, ...data } = body;

    switch (action) {
      case 'start': {
        const result = await startCampaign(id);

        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json({ success: true });
      }

      case 'pause': {
        const result = await pauseCampaign(id);

        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json({ success: true });
      }

      case 'complete': {
        const result = await completeCampaign(id);

        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json({ success: true });
      }

      default: {
        // General update
        const result = await updateCampaign(id, data);

        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json({
          success: true,
          campaign: result.campaign,
        });
      }
    }
  } catch (error) {
    apiLogger.error({ message: 'Error updating campaign', error });
    return NextResponse.json(
      { error: 'Failed to update campaign' },
      { status: 500 }
    );
  }
}
