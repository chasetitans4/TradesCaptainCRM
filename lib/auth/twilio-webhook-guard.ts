// =====================================================
// TWILIO WEBHOOK SIGNATURE GUARD
// Validates that incoming webhook requests are genuinely from Twilio.
// Applied in ALL environments (not just production).
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { validateTwilioSignature } from '@/lib/twilio/client';

/**
 * Validate a Twilio webhook request signature.
 *
 * @param request  The incoming NextRequest
 * @param params   The parsed form data as a Record (used by Twilio's signature algorithm)
 * @returns null if the signature is valid, or a 403 NextResponse to return immediately.
 */
export async function verifyTwilioWebhook(
  request: NextRequest,
  params: Record<string, string>,
): Promise<NextResponse | null> {
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  // If Twilio is not configured at all, reject webhook requests
  if (!authToken) {
    return new NextResponse('Twilio not configured', { status: 500 });
  }

  const headersList = await headers();
  const signature = headersList.get('x-twilio-signature') || '';
  const url = request.url;

  if (!validateTwilioSignature(signature, url, params)) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  // Signature valid
  return null;
}
