import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verify2FA, send2FACode, getTwoFactorStatus } from '@/lib/auth/two-factor';
import { cookies } from 'next/headers';

// GET - Get 2FA status
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const status = await getTwoFactorStatus(user.id);
    return NextResponse.json(status);
  } catch (error: any) {
    console.error('Get 2FA status error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Verify 2FA code during login
export async function POST(request: NextRequest) {
  try {
    const { userId, code, method } = await request.json();

    if (!userId || !code || !method) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate method
    const validMethods = ['totp', 'sms', 'email', 'backup'];
    if (!validMethods.includes(method)) {
      return NextResponse.json({ error: 'Invalid 2FA method' }, { status: 400 });
    }

    const result = await verify2FA(userId, code, method);

    if (result.success) {
      // Note: In production, you'd mark the session as 2FA verified here
      // using a session token from cookies
      return NextResponse.json({
        success: true,
        backupCodesRemaining: result.backupCodesRemaining,
      });
    } else {
      return NextResponse.json(
        { error: result.error || 'Invalid code' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('2FA verify error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Send new 2FA code (for SMS/email)
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Also allow unauthenticated users during login flow (with userId in body)
    const body = await request.json();
    const userId = user?.id || body.userId;
    const method = body.method;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (!['sms', 'email'].includes(method)) {
      return NextResponse.json(
        { error: 'Method must be "sms" or "email"' },
        { status: 400 }
      );
    }

    await send2FACode(userId, method);
    return NextResponse.json({
      success: true,
      message: `Code sent via ${method}`,
    });
  } catch (error: any) {
    console.error('Send 2FA code error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
