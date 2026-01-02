import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { setupSMS2FA, verifySMS2FASetup, disableSMS2FA } from '@/lib/auth/sms-2fa';
import { authLogger } from '@/lib/logger';

// POST - Start SMS 2FA setup or verify
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, phone, code } = await request.json();

    switch (action) {
      case 'setup': {
        if (!phone) {
          return NextResponse.json(
            { error: 'Phone number is required' },
            { status: 400 }
          );
        }

        await setupSMS2FA(user.id, phone);
        return NextResponse.json({
          success: true,
          message: 'Verification code sent',
        });
      }

      case 'verify': {
        if (!code || !/^\d{6}$/.test(code)) {
          return NextResponse.json(
            { error: 'Invalid code format. Please enter a 6-digit code.' },
            { status: 400 }
          );
        }

        const isValid = await verifySMS2FASetup(user.id, code);

        if (isValid) {
          return NextResponse.json({ success: true });
        } else {
          return NextResponse.json(
            { error: 'Invalid or expired code. Please try again.' },
            { status: 400 }
          );
        }
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    authLogger.error({ msg: 'SMS 2FA setup error', error });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Disable SMS 2FA
export async function DELETE() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await disableSMS2FA(user.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    authLogger.error({ msg: 'SMS 2FA disable error', error });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
