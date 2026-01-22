// =====================================================
// IMPERSONATE ACCOUNT API
// POST /api/admin/accounts/:id/impersonate
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminOrHigher } from '@/lib/admin/auth';
import { getCRMAccount, createImpersonationToken } from '@/lib/admin';
import { apiLogger } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdminOrHigher();

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Support role can also impersonate
    if (admin.role === 'agent') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const account = await getCRMAccount(id);

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const token = await createImpersonationToken(admin.id, id);

    // SECURITY: Return URL without token in query params
    // Token is set in HTTP-only cookie instead to prevent exposure in logs/history
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    const impersonationUrl = `${baseUrl}/auth/impersonate`;

    // Create response with impersonation token in secure HTTP-only cookie
    const response = NextResponse.json({
      success: true,
      login_url: impersonationUrl,
      account: {
        id: account.id,
        business_name: account.business_name,
        owner_email: account.owner_email,
      },
    });

    // Set token in HTTP-only cookie (secure, not accessible via JavaScript)
    response.cookies.set('impersonation_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 5, // 5 minutes - short-lived for security
      path: '/auth/impersonate',
    });

    return response;
  } catch (error) {
    apiLogger.error({
      msg: 'Error creating impersonation session',
      path: '/api/admin/accounts/[id]/impersonate',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create impersonation session' },
      { status: 400 }
    );
  }
}
