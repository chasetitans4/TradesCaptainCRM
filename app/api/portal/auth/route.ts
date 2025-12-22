import { NextRequest, NextResponse } from 'next/server';
import { sendMagicLink, verifyMagicLink, verifyPassword } from '@/lib/portal/auth';
import { createPortalSession, destroyPortalSession, getPortalSession } from '@/lib/portal/session';

// POST /api/portal/auth - Handle portal authentication
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, businessId, email, password, token } = body;

    switch (action) {
      case 'magic-link': {
        if (!businessId || !email) {
          return NextResponse.json(
            { error: 'Business ID and email are required' },
            { status: 400 }
          );
        }

        const result = await sendMagicLink(businessId, email);

        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json({
          success: true,
          message: 'Magic link sent to your email',
        });
      }

      case 'verify-magic-link': {
        if (!businessId || !token) {
          return NextResponse.json(
            { error: 'Business ID and token are required' },
            { status: 400 }
          );
        }

        const result = await verifyMagicLink(businessId, token);

        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }

        // Create session
        await createPortalSession(result.customerId!, result.accessId!, businessId);

        return NextResponse.json({
          success: true,
          customerId: result.customerId,
        });
      }

      case 'password': {
        if (!businessId || !email || !password) {
          return NextResponse.json(
            { error: 'Business ID, email, and password are required' },
            { status: 400 }
          );
        }

        const result = await verifyPassword(businessId, email, password);

        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }

        // Create session
        await createPortalSession(result.customerId!, result.accessId!, businessId);

        return NextResponse.json({
          success: true,
          customerId: result.customerId,
        });
      }

      case 'logout': {
        await destroyPortalSession();
        return NextResponse.json({ success: true });
      }

      case 'check': {
        const session = await getPortalSession();
        return NextResponse.json({
          authenticated: !!session,
          session: session
            ? {
                customerId: session.customerId,
                businessName: session.businessName,
                customerName: session.customerName,
                email: session.email,
              }
            : null,
        });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Portal auth error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET /api/portal/auth - Check authentication status
export async function GET() {
  try {
    const session = await getPortalSession();

    return NextResponse.json({
      authenticated: !!session,
      session: session
        ? {
            customerId: session.customerId,
            businessName: session.businessName,
            customerName: session.customerName,
            email: session.email,
          }
        : null,
    });
  } catch (error: any) {
    console.error('Portal auth check error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
