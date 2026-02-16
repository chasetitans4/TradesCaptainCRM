import { NextRequest, NextResponse } from 'next/server';
import {
  recordConsent,
  hasValidConsent,
  revokeConsent,
  isSafeToContact,
} from '@/lib/outreach/compliance';
import { requireAgentOrHigher } from '@/lib/admin/auth';
import { apiLogger } from '@/lib/logger';

/**
 * GET /api/outreach/consent
 * Check consent status for a phone number
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await requireAgentOrHigher();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const searchParams = request.nextUrl.searchParams;
    const phone = searchParams.get('phone');
    const checkFull = searchParams.get('full') === 'true';

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    if (checkFull) {
      // Full safety check
      const result = await isSafeToContact(phone);
      return NextResponse.json(result);
    } else {
      // Just consent check
      const hasConsent = await hasValidConsent(phone);
      return NextResponse.json({ has_consent: hasConsent });
    }
  } catch (error) {
    apiLogger.error({ message: 'Error checking consent', error });
    return NextResponse.json(
      { error: 'Failed to check consent' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/outreach/consent
 * Record consent for a phone number
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAgentOrHigher();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();

    const {
      phone,
      consent_type,
      consent_source,
      consent_ip,
      consent_user_agent,
      consent_form_url,
      consent_language,
    } = body;

    if (!phone || !consent_type || !consent_source) {
      return NextResponse.json(
        { error: 'Phone, consent_type, and consent_source are required' },
        { status: 400 }
      );
    }

    const consent = await recordConsent({
      phone,
      consent_type,
      consent_source,
      consent_ip,
      consent_user_agent,
      consent_form_url,
      consent_language,
    });

    if (!consent) {
      return NextResponse.json(
        { error: 'Failed to record consent' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      consent,
    });
  } catch (error) {
    apiLogger.error({ message: 'Error recording consent', error });
    return NextResponse.json(
      { error: 'Failed to record consent' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/outreach/consent
 * Revoke consent for a phone number
 */
export async function DELETE(request: NextRequest) {
  try {
    const admin = await requireAgentOrHigher();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const searchParams = request.nextUrl.searchParams;
    const phone = searchParams.get('phone');
    const method = (searchParams.get('method') || 'manual') as 'STOP_reply' | 'manual' | 'complaint';

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    const success = await revokeConsent(phone, method);

    return NextResponse.json({ success });
  } catch (error) {
    apiLogger.error({ message: 'Error revoking consent', error });
    return NextResponse.json(
      { error: 'Failed to revoke consent' },
      { status: 500 }
    );
  }
}
