// =====================================================
// ADMIN SUPPORT - NEVERMISS SETTINGS API
// GET /api/admin/support/settings - Get NeverMiss settings
// PATCH /api/admin/support/settings - Update settings
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAgentOrHigher, requireAdminOrHigher } from '@/lib/admin/auth';
import {
  getNeverMissSettings,
  updateForwardToNumber,
  getOrganizationStatus,
  getDailyMetrics,
} from '@/lib/admin/nevermiss-support';

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAgentOrHigher();

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const organizationId = searchParams.get('organization_id');
    const includeMetrics = searchParams.get('include_metrics') === 'true';

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organization_id is required' },
        { status: 400 }
      );
    }

    const [settings, status] = await Promise.all([
      getNeverMissSettings(organizationId),
      getOrganizationStatus(organizationId),
    ]);

    let metrics = null;
    if (includeMetrics) {
      metrics = await getDailyMetrics(organizationId, 30);
    }

    return NextResponse.json({
      settings,
      organization_status: status,
      metrics,
    });
  } catch (error: any) {
    console.error('Error in GET /api/admin/support/settings:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get settings' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireAdminOrHigher();

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { organization_id, action, value } = body;

    if (!organization_id || !action) {
      return NextResponse.json(
        { error: 'organization_id and action are required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'update_forward_to': {
        if (!value) {
          return NextResponse.json(
            { error: 'value (new phone number) is required' },
            { status: 400 }
          );
        }

        const success = await updateForwardToNumber(organization_id, value);

        return NextResponse.json({
          success,
          action,
          organization_id,
          new_forward_to: value,
        });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('Error in PATCH /api/admin/support/settings:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update settings' },
      { status: 500 }
    );
  }
}
