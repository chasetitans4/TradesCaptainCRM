import { NextRequest, NextResponse } from 'next/server';
import { sendMagicLink, verifyMagicLink, verifyPassword } from '@/lib/portal/auth';
import { createPortalSession, destroyPortalSession, getPortalSession } from '@/lib/portal/session';
import { checkLoginRateLimit, checkSimpleRateLimit } from '@/lib/rate-limit';
import { apiLogger } from '@/lib/logger';

// POST /api/portal/auth - Handle portal authentication
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, businessId, email, password, token } = body;

    // Get client IP for rate limiting
    const ip = request.headers.get('cf-connecting-ip') ||
               request.headers.get('x-real-ip') ||
               request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
               'unknown';

    switch (action) {
      case 'magic-link': {
        if (!businessId || !email) {
          return NextResponse.json(
            { error: 'Business ID and email are required' },
            { status: 400 }
          );
        }

        // Rate limit magic link requests (3 per hour per email+business)
        const magicLinkLimit = await checkSimpleRateLimit(
          `portal_magic:${businessId}:${email.toLowerCase()}`,
          3,
          3600
        );
        if (!magicLinkLimit.allowed) {
          return NextResponse.json(
            { error: 'Too many login requests. Please try again later.' },
            {
              status: 429,
              headers: {
                'X-RateLimit-Limit': '3',
                'X-RateLimit-Remaining': magicLinkLimit.remaining.toString(),
                'X-RateLimit-Reset': magicLinkLimit.resetAt.toISOString(),
                'Retry-After': (magicLinkLimit.retryAfter || 3600).toString(),
              },
            }
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

        // Rate limit password login attempts (5 per 15 minutes per IP)
        const loginLimit = await checkLoginRateLimit(ip);
        if (!loginLimit.allowed) {
          return NextResponse.json(
            { error: 'Too many login attempts. Please try again later.' },
            {
              status: 429,
              headers: {
                'X-RateLimit-Limit': '5',
                'X-RateLimit-Remaining': loginLimit.remaining.toString(),
                'X-RateLimit-Reset': loginLimit.resetAt.toISOString(),
                'Retry-After': (loginLimit.retryAfter || 900).toString(),
              },
            }
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
  } catch (error) {
    apiLogger.error({ error, context: 'Portal auth error' });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
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
  } catch (error) {
    apiLogger.error({ error, context: 'Portal auth check error' });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
  }
}
