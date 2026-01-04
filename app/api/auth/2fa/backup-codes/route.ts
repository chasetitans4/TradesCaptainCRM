import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { apiLogger } from '@/lib/logger';
import {
  regenerateBackupCodes,
  getRemainingBackupCodesCount,
  formatBackupCodesForDisplay,
} from '@/lib/auth/backup-codes';

// GET - Get remaining backup codes count
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const count = await getRemainingBackupCodesCount(user.id);

    return NextResponse.json({
      remainingCount: count,
      warningThreshold: 3,
      shouldWarn: count > 0 && count <= 3,
    });
  } catch (error) {
    apiLogger.error({ msg: 'Get backup codes count error', error: error instanceof Error ? error.message : 'Unknown error' });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

// POST - Regenerate backup codes (requires re-authentication)
export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generate new codes
    const codes = await regenerateBackupCodes(user.id);

    // Format for display
    const formattedCodes = formatBackupCodesForDisplay(codes);

    return NextResponse.json({
      success: true,
      codes: formattedCodes,
      message:
        'Save these codes in a safe place. Each code can only be used once.',
    });
  } catch (error) {
    apiLogger.error({ msg: 'Regenerate backup codes error', error: error instanceof Error ? error.message : 'Unknown error' });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
