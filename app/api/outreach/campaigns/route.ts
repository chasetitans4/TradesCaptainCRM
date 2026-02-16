import { NextRequest, NextResponse } from 'next/server';
import { getCampaigns, createCampaign } from '@/lib/outreach/campaigns';
import type { CampaignStatus, CampaignType } from '@/types/outreach';
import { requireAgentOrHigher } from '@/lib/admin/auth';
import { apiLogger } from '@/lib/logger';

/**
 * GET /api/outreach/campaigns
 * Get campaigns with filters
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await requireAgentOrHigher();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const searchParams = request.nextUrl.searchParams;

    const filters: {
      status?: CampaignStatus[];
      type?: CampaignType[];
    } = {};

    const status = searchParams.get('status');
    if (status) {
      filters.status = status.split(',') as CampaignStatus[];
    }

    const type = searchParams.get('type');
    if (type) {
      filters.type = type.split(',') as CampaignType[];
    }

    const campaigns = await getCampaigns(filters);

    return NextResponse.json({
      data: campaigns,
      total: campaigns.length,
    });
  } catch (error) {
    apiLogger.error({ message: 'Error getting campaigns', error });
    return NextResponse.json(
      { error: 'Failed to get campaigns' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/outreach/campaigns
 * Create a new campaign
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAgentOrHigher();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();

    const {
      name,
      description,
      campaign_type,
      initial_message_template,
      ai_system_prompt,
      ai_goal,
      trigger_type,
      trigger_delay_minutes,
      sending_window_start,
      sending_window_end,
      sending_days,
      daily_send_limit,
      created_by,
    } = body;

    if (!name || !campaign_type) {
      return NextResponse.json(
        { error: 'Name and campaign_type are required' },
        { status: 400 }
      );
    }

    const result = await createCampaign(
      {
        name,
        description,
        campaign_type,
        initial_message_template,
        ai_system_prompt,
        ai_goal,
        trigger_type,
        trigger_delay_minutes,
        sending_window_start,
        sending_window_end,
        sending_days,
        daily_send_limit,
      },
      created_by
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      campaign: result.campaign,
    });
  } catch (error) {
    apiLogger.error({ message: 'Error creating campaign', error });
    return NextResponse.json(
      { error: 'Failed to create campaign' },
      { status: 500 }
    );
  }
}
