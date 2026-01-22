import { NextRequest, NextResponse } from 'next/server';
import {
  sendMagicLink,
  verifyMagicLink,
  verifyPassword,
  isAccountLocked,
  recordFailedLogin,
  clearFailedLogins,
  sendPasswordResetEmail,
  verifyPasswordResetToken,
  completePasswordReset,
  verifyEmailChange,
} from '@/lib/portal/auth';
import { createPortalSession, destroyPortalSession, getPortalSession } from '@/lib/portal/session';
import { checkLoginRateLimit, checkSimpleRateLimit } from '@/lib/rate-limit';
import { apiLogger } from '@/lib/logger';
import { logPortalActivity } from '@/lib/portal/audit';

// POST /api/portal/auth - Handle portal authentication
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, businessId, email, password, token, newPassword } = body;

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

        // Log successful login
        await logPortalActivity({
          customerId: result.customerId!,
          businessId,
          action: 'login_magic_link',
          request,
        });

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

        // Check if account is locked
        const lockStatus = await isAccountLocked(businessId, email);
        if (lockStatus.locked) {
          const minutesLeft = Math.ceil(
            (lockStatus.unlockTime!.getTime() - Date.now()) / (1000 * 60)
          );
          return NextResponse.json(
            {
              error: `Account temporarily locked due to too many failed attempts. Try again in ${minutesLeft} minutes.`,
              locked: true,
              unlockTime: lockStatus.unlockTime,
            },
            { status: 423 }
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
          // Record failed login attempt
          const lockResult = await recordFailedLogin(businessId, email);

          // Log failed login (we don't have customerId but we can log with email hash)
          apiLogger.warn({
            msg: 'Portal login failed',
            businessId,
            emailHash: email.substring(0, 3) + '***',
            locked: lockResult.locked,
            remainingAttempts: lockResult.remainingAttempts,
          });

          if (lockResult.locked) {
            return NextResponse.json(
              {
                error: 'Account temporarily locked due to too many failed attempts. Try again in 30 minutes.',
                locked: true,
              },
              { status: 423 }
            );
          }

          return NextResponse.json(
            {
              error: result.error,
              remainingAttempts: lockResult.remainingAttempts,
            },
            { status: 400 }
          );
        }

        // Clear failed login attempts on successful login
        await clearFailedLogins(result.accessId!);

        // Create session
        await createPortalSession(result.customerId!, result.accessId!, businessId);

        // Log successful login
        await logPortalActivity({
          customerId: result.customerId!,
          businessId,
          action: 'login_success',
          request,
        });

        return NextResponse.json({
          success: true,
          customerId: result.customerId,
        });
      }

      case 'logout': {
        const session = await getPortalSession();

        if (session) {
          await logPortalActivity({
            customerId: session.customerId,
            businessId: session.businessId,
            action: 'logout',
            request,
          });
        }

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

      // Password reset flow
      case 'forgot-password': {
        if (!businessId || !email) {
          return NextResponse.json(
            { error: 'Business ID and email are required' },
            { status: 400 }
          );
        }

        // Rate limit password reset requests
        const resetLimit = await checkSimpleRateLimit(
          `portal_reset:${businessId}:${email.toLowerCase()}`,
          3,
          3600
        );
        if (!resetLimit.allowed) {
          return NextResponse.json(
            { error: 'Too many password reset requests. Please try again later.' },
            { status: 429 }
          );
        }

        await sendPasswordResetEmail(businessId, email);

        // Always return success to prevent email enumeration
        return NextResponse.json({
          success: true,
          message: 'If an account exists with this email, you will receive a password reset link.',
        });
      }

      case 'verify-reset-token': {
        if (!businessId || !token) {
          return NextResponse.json(
            { error: 'Business ID and token are required' },
            { status: 400 }
          );
        }

        const result = await verifyPasswordResetToken(businessId, token);

        if (!result.valid) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json({
          valid: true,
          accessId: result.accessId,
        });
      }

      case 'reset-password': {
        if (!businessId || !token || !newPassword) {
          return NextResponse.json(
            { error: 'Business ID, token, and new password are required' },
            { status: 400 }
          );
        }

        // Verify token first
        const tokenResult = await verifyPasswordResetToken(businessId, token);
        if (!tokenResult.valid) {
          return NextResponse.json({ error: tokenResult.error }, { status: 400 });
        }

        // Complete the password reset
        const resetResult = await completePasswordReset(tokenResult.accessId!, newPassword);

        if (!resetResult.success) {
          return NextResponse.json(
            { error: 'Password reset failed', details: resetResult.errors },
            { status: 400 }
          );
        }

        return NextResponse.json({
          success: true,
          message: 'Password has been reset successfully. You can now log in with your new password.',
        });
      }

      // Email change verification
      case 'verify-email-change': {
        if (!businessId || !token) {
          return NextResponse.json(
            { error: 'Business ID and token are required' },
            { status: 400 }
          );
        }

        const result = await verifyEmailChange(businessId, token);

        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json({
          success: true,
          message: 'Email address has been updated successfully.',
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
