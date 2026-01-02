import { NextRequest, NextResponse } from 'next/server';
import {
  getCampaign,
  updateCampaign,
  startCampaign,
  pauseCampaign,
  completeCampaign,
} from '@/lib/outreach/campaigns';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/outreach/campaigns/[id]
 * Get a specific campaign
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const campaign = await getCampaign(id);

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    return NextResponse.json(campaign);
  } catch (error) {
    console.error('Error getting campaign:', error);
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
    console.error('Error updating campaign:', error);
    return NextResponse.json(
      { error: 'Failed to update campaign' },
      { status: 500 }
    );
  }
}
