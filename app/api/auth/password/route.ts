import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  changePassword,
  validatePassword,
  isPasswordExpired,
} from '@/lib/auth/password';

// GET - Check if password is expired
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const expired = await isPasswordExpired(user.id);

    return NextResponse.json({ expired });
  } catch (error: any) {
    console.error('Check password expired error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Change password or validate password strength
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, currentPassword, newPassword, password } = await request.json();

    switch (action) {
      case 'validate': {
        // Just validate password strength (for real-time feedback)
        if (!password) {
          return NextResponse.json(
            { error: 'Password is required' },
            { status: 400 }
          );
        }

        const validation = validatePassword(password);
        return NextResponse.json(validation);
      }

      case 'change': {
        if (!currentPassword || !newPassword) {
          return NextResponse.json(
            { error: 'Current password and new password are required' },
            { status: 400 }
          );
        }

        const result = await changePassword(user.id, currentPassword, newPassword, {
          revokeOtherSessions: true,
        });

        if (result.success) {
          return NextResponse.json({
            success: true,
            message: 'Password changed successfully. Other sessions have been signed out.',
          });
        } else {
          return NextResponse.json(
            { error: result.error || 'Failed to change password' },
            { status: 400 }
          );
        }
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Password operation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
