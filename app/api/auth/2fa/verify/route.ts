import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verify2FA, send2FACode, getTwoFactorStatus } from '@/lib/auth/two-factor';
import { cookies } from 'next/headers';
import { check2FAVerifyRateLimit, check2FASendRateLimit } from '@/lib/rate-limit';

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

    // Get client IP for rate limiting
    const ip = request.headers.get('cf-connecting-ip') ||
               request.headers.get('x-real-ip') ||
               request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
               'unknown';

    // Check Redis-backed rate limit (5 attempts per 10 minutes per user+IP)
    const rateLimit = await check2FAVerifyRateLimit(userId, ip);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many verification attempts. Please try again later.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': '5',
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': rateLimit.resetAt.toISOString(),
            'Retry-After': (rateLimit.retryAfter || 600).toString(),
          },
        }
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

    // Get client IP for rate limiting
    const ip = request.headers.get('cf-connecting-ip') ||
               request.headers.get('x-real-ip') ||
               request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
               'unknown';

    // Check Redis-backed rate limit (5 sends per 10 minutes per user+IP)
    const rateLimit = await check2FASendRateLimit(userId, ip);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many code requests. Please wait before requesting another code.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': '5',
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': rateLimit.resetAt.toISOString(),
            'Retry-After': (rateLimit.retryAfter || 600).toString(),
          },
        }
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
