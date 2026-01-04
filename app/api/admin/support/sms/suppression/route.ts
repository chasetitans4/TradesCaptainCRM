// =====================================================
// ADMIN SUPPORT - SMS SUPPRESSION LIST API
// DELETE /api/admin/support/sms/suppression - Remove from suppression list
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminOrHigher } from '@/lib/admin/auth';
import { removeFromSuppressionList } from '@/lib/admin/leads-captain-support';
import { apiLogger } from '@/lib/logger';

export async function DELETE(request: NextRequest) {
  try {
    const admin = await requireAdminOrHigher();

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { phone, organization_id } = body;

    if (!phone || !organization_id) {
      return NextResponse.json(
        { error: 'phone and organization_id are required' },
        { status: 400 }
      );
    }

    const success = await removeFromSuppressionList(phone, organization_id);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to remove from suppression list' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      phone,
      organization_id,
      message: 'Removed from suppression list. Customer can now receive messages.',
    });
  } catch (error) {
    apiLogger.error({ msg: 'Error in DELETE /api/admin/support/sms/suppression', error: error instanceof Error ? error.message : 'Unknown error' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to remove from suppression list' },
      { status: 500 }
    );
  }
}
