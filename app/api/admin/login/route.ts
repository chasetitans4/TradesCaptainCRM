// =====================================================
// ADMIN LOGIN API
// POST /api/admin/login - Admin authentication
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { updateAdminLastLogin, logAdminActivity } from '@/lib/admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Find admin user
    const { data: admin, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('is_active', true)
      .single();

    if (error || !admin) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Verify password (use bcrypt in production)
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

    if (admin.password_hash !== passwordHash) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Update last login
    await updateAdminLastLogin(admin.id);

    // Log activity
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '';
    await logAdminActivity(admin.id, 'logged_in', undefined, undefined, undefined, ip);

    // Create session token
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const sessionData = {
      adminId: admin.id,
      role: admin.role,
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    };

    // Store session (in production, use Redis or database)
    const cookieStore = await cookies();
    cookieStore.set('admin_session', Buffer.from(JSON.stringify(sessionData)).toString('base64'), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/',
    });

    return NextResponse.json({
      success: true,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
    });
  } catch (error: any) {
    console.error('Error in POST /api/admin/login:', error);
    return NextResponse.json(
      { error: error.message || 'Login failed' },
      { status: 500 }
    );
  }
}
