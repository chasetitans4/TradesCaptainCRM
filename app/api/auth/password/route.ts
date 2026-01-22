import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  changePassword,
  validatePassword,
  isPasswordExpired,
} from '@/lib/auth/password';
import { apiLogger } from '@/lib/logger';
import { getServerSession } from '@/lib/permissions/check-permission';

// GET - Check if password is expired
export async function GET() {
  try {
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only relevant for standard users who have passwords in Supabase Auth
    // Admins might have different logic, but for now we assume this is for standard users
    const expired = await isPasswordExpired(session.user.id);

    return NextResponse.json({ expired });
  } catch (error) {
    apiLogger.error({ msg: 'Check password expired error', error: error instanceof Error ? error.message : 'Unknown error' });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

// POST - Change password or validate password strength
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user) {
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

        // Only allow standard users to change password this way
        if (session.user.role === 'admin' || session.user.role === 'super_admin') {
           return NextResponse.json(
            { error: 'Admins must change password via the Admin Portal.' },
            { status: 403 }
           );
        }

        const result = await changePassword(session.user.id, currentPassword, newPassword, {
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
  } catch (error) {
    apiLogger.error({ msg: 'Password operation error', error: error instanceof Error ? error.message : 'Unknown error' });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
