import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  setupPIN,
  verifyPIN,
  changePIN,
  disablePIN,
  getPINSettings,
  updatePINSettings,
} from '@/lib/auth/pin';
import { apiLogger } from '@/lib/logger';

// GET - Get PIN settings
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = await getPINSettings(user.id);
    return NextResponse.json(settings);
  } catch (error) {
    apiLogger.error({ msg: 'Get PIN settings error', error: error instanceof Error ? error.message : 'Unknown error' });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

// POST - PIN operations (setup, verify, change, disable)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, pin, newPin } = await request.json();

    switch (action) {
      case 'setup': {
        if (!pin || !/^\d{4}$/.test(pin)) {
          return NextResponse.json(
            { error: 'PIN must be exactly 4 digits' },
            { status: 400 }
          );
        }

        await setupPIN(user.id, pin);
        return NextResponse.json({ success: true });
      }

      case 'verify': {
        if (!pin || !/^\d{4}$/.test(pin)) {
          return NextResponse.json(
            { error: 'PIN must be exactly 4 digits' },
            { status: 400 }
          );
        }

        const result = await verifyPIN(user.id, pin);
        return NextResponse.json(result);
      }

      case 'change': {
        if (!pin || !newPin) {
          return NextResponse.json(
            { error: 'Current PIN and new PIN are required' },
            { status: 400 }
          );
        }

        if (!/^\d{4}$/.test(newPin)) {
          return NextResponse.json(
            { error: 'New PIN must be exactly 4 digits' },
            { status: 400 }
          );
        }

        const result = await changePIN(user.id, pin, newPin);

        if (result.success) {
          return NextResponse.json({ success: true });
        } else {
          return NextResponse.json(
            { error: result.error || 'Failed to change PIN' },
            { status: 400 }
          );
        }
      }

      case 'disable': {
        await disablePIN(user.id);
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    apiLogger.error({ msg: 'PIN operation error', error: error instanceof Error ? error.message : 'Unknown error' });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

// PATCH - Update PIN settings
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { autoLockMinutes, requirePinFor } = await request.json();

    await updatePINSettings(user.id, {
      autoLockMinutes,
      requirePinFor,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    apiLogger.error({ msg: 'Update PIN settings error', error: error instanceof Error ? error.message : 'Unknown error' });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
