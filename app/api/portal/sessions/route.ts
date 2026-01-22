import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession, destroyPortalSession, createPortalSession } from '@/lib/portal/session';
import { createAdminClient } from '@/lib/supabase/server';
import { apiLogger } from '@/lib/logger';
import { logPortalActivity, getCustomerActivityLog } from '@/lib/portal/audit';

// GET /api/portal/sessions - Get session activity (login history)
export async function GET(request: NextRequest) {
  try {
    const session = await getPortalSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get recent login activity from audit log
    const activityLog = await getCustomerActivityLog(
      session.customerId,
      session.businessId,
      20
    );

    // Filter to login-related activities
    const loginActivities = activityLog.filter((log) =>
      ['login_success', 'login_magic_link', 'login_failed', 'logout'].includes(log.action)
    );

    // Get current session info
    const currentSession = {
      createdAt: new Date(session.iat * 1000).toISOString(),
      expiresAt: new Date(session.exp * 1000).toISOString(),
      isCurrent: true,
    };

    return NextResponse.json({
      currentSession,
      recentActivity: loginActivities.map((log) => ({
        action: log.action,
        ipAddress: log.ip_address,
        timestamp: log.created_at,
        details: log.details,
      })),
    });
  } catch (error) {
    apiLogger.error({
      msg: 'Portal sessions GET error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }
}

// DELETE /api/portal/sessions - Revoke all other sessions (logout everywhere)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getPortalSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Update password_changed_at to invalidate all existing sessions
    // This will cause all JWT tokens created before this time to be rejected
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('customer_portal_access')
      .update({ password_changed_at: now })
      .eq('id', session.accessId);

    if (error) {
      throw error;
    }

    // Log the activity
    await logPortalActivity({
      customerId: session.customerId,
      businessId: session.businessId,
      action: 'session_revoked',
      details: { revokedAll: true },
      request,
    });

    // Create a new session for the current user so they stay logged in
    await createPortalSession(session.customerId, session.accessId, session.businessId);

    apiLogger.info({
      msg: 'Portal sessions revoked',
      customerId: session.customerId,
    });

    return NextResponse.json({
      success: true,
      message: 'All other sessions have been logged out.',
    });
  } catch (error) {
    apiLogger.error({
      msg: 'Portal sessions DELETE error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to revoke sessions' }, { status: 500 });
  }
}
