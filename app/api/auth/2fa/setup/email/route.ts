import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { setupEmail2FA, verifyEmail2FASetup, disableEmail2FA } from '@/lib/auth/email-2fa';

// POST - Start Email 2FA setup or verify
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, code } = await request.json();

    // Get user email
    const { data: profile } = await supabase
      .from('users')
      .select('email')
      .eq('id', user.id)
      .single();

    const email = profile?.email || user.email;

    if (!email) {
      return NextResponse.json(
        { error: 'No email address found for this account' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'setup': {
        await setupEmail2FA(user.id, email);
        return NextResponse.json({
          success: true,
          message: 'Verification code sent to your email',
        });
      }

      case 'verify': {
        if (!code || !/^\d{6}$/.test(code)) {
          return NextResponse.json(
            { error: 'Invalid code format. Please enter a 6-digit code.' },
            { status: 400 }
          );
        }

        const isValid = await verifyEmail2FASetup(user.id, code);

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
    console.error('Email 2FA setup error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Disable Email 2FA
export async function DELETE() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await disableEmail2FA(user.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Email 2FA disable error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
