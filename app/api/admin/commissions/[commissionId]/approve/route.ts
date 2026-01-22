import { NextRequest, NextResponse } from 'next/server';
import { approveCommission } from '@/lib/admin/commissions';
import { checkPermission, hasServerPermission, getServerSession } from '@/lib/permissions/check-permission';
import { apiLogger } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ commissionId: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const allowed = await hasServerPermission('manage_admin_commissions');
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { commissionId } = await params;
    await approveCommission(commissionId, session.user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    apiLogger.error({
      msg: 'Approve commission error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to approve commission' },
      { status: 500 }
    );
  }
}
