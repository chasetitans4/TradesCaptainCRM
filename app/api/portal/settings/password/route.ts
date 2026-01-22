import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession, createPortalSession } from '@/lib/portal/session';
import { setPortalPassword, changePassword, validatePassword } from '@/lib/portal/auth';
import { apiLogger } from '@/lib/logger';
import { logPortalActivity } from '@/lib/portal/audit';

// POST - Set password (for users who don't have one yet)
export async function POST(request: NextRequest) {
  try {
    const session = await getPortalSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { password } = body;

    // Validate password strength
    const validation = validatePassword(password || '');
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Password does not meet requirements', details: validation.errors },
        { status: 400 }
      );
    }

    const result = await setPortalPassword(session.accessId, password);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to set password', details: result.errors },
        { status: 400 }
      );
    }

    // Log the activity
    await logPortalActivity({
      customerId: session.customerId,
      businessId: session.businessId,
      action: 'password_set',
      request,
    });

    apiLogger.info({
      msg: 'Portal password set',
      customerId: session.customerId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    apiLogger.error({
      msg: 'Portal password set error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to set password' }, { status: 500 });
  }
}

// PUT - Change password (for users who already have one)
export async function PUT(request: NextRequest) {
  try {
    const session = await getPortalSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current password and new password are required' },
        { status: 400 }
      );
    }

    const result = await changePassword(session.accessId, currentPassword, newPassword);

    if (!result.success) {
      return NextResponse.json(
        { error: result.errors?.[0] || 'Failed to change password', details: result.errors },
        { status: 400 }
      );
    }

    // Log the activity
    await logPortalActivity({
      customerId: session.customerId,
      businessId: session.businessId,
      action: 'password_changed',
      request,
    });

    // Create a new session since password change invalidates old sessions
    await createPortalSession(session.customerId, session.accessId, session.businessId);

    apiLogger.info({
      msg: 'Portal password changed',
      customerId: session.customerId,
    });

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully. Other sessions have been logged out.',
    });
  } catch (error) {
    apiLogger.error({
      msg: 'Portal password change error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to change password' }, { status: 500 });
  }
}
