import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateTOTPSecret, verifyTOTPSetup } from '@/lib/auth/totp';
import { apiLogger } from '@/lib/logger';

// GET - Generate TOTP secret and QR code
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user email
    const { data: profile } = await supabase
      .from('users')
      .select('email')
      .eq('id', user.id)
      .single();

    const email = profile?.email || user.email || '';

    const result = await generateTOTPSecret(user.id, email);

    return NextResponse.json({
      qrCode: result.qrCodeUrl,
      manualKey: result.manualEntryKey,
    });
  } catch (error) {
    apiLogger.error({ msg: 'TOTP setup error', error: error instanceof Error ? error.message : 'Unknown error' });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

// POST - Verify TOTP setup with code
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { code } = await request.json();

    if (!code || !/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { error: 'Invalid code format. Please enter a 6-digit code.' },
        { status: 400 }
      );
    }

    const isValid = await verifyTOTPSetup(user.id, code);

    if (isValid) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: 'Invalid code. Please try again.' },
        { status: 400 }
      );
    }
  } catch (error) {
    apiLogger.error({ msg: 'TOTP verify error', error: error instanceof Error ? error.message : 'Unknown error' });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
