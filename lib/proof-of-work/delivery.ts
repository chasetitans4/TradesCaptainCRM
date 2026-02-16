// =====================================================
// PROOF OF WORK DELIVERY SERVICE
//
// Handles SMS and email delivery of Proof of Work links
// Uses existing Twilio and email infrastructure
// =====================================================

import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { sendSMS } from '@/lib/twilio';
import { sendEmail } from '@/lib/email';
import type { ProofOfWork, DeliveryChannel } from '@/types/proof-of-work';
import { addSentEvent } from './timeline';

interface Customer {
  id: string;
  first_name: string;
  last_name?: string;
  phone?: string;
  email?: string;
}

interface Business {
  id: string;
  name: string;
  twilio_phone_number?: string;
}

/**
 * Get the short URL for SMS (keeps message under 160 chars)
 */
function getShortUrl(shortCode: string): string {
  const shortDomain = process.env.POW_SHORT_DOMAIN || 'pow.tc';
  return `${shortDomain}/${shortCode}`;
}

/**
 * Get the full URL for email
 */
function getFullUrl(publicToken: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tradescaptain.com';
  return `${baseUrl}/proof/${publicToken}`;
}

/**
 * Build SMS message (must fit in 160 characters)
 */
function buildSmsMessage(businessName: string, shortCode: string): string {
  const shortUrl = getShortUrl(shortCode);
  // Example: "ACME HVAC: Your Proof of Work is ready. View: pow.tc/ABC123"
  // Max business name length to keep under 160
  const maxNameLength = 30;
  const truncatedName =
    businessName.length > maxNameLength
      ? businessName.substring(0, maxNameLength - 3) + '...'
      : businessName;

  return `${truncatedName}: Your Proof of Work is ready. View: ${shortUrl}`;
}

/**
 * Build email subject
 */
function buildEmailSubject(businessName: string): string {
  return `Your Proof of Work from ${businessName}`;
}

/**
 * Build email body (HTML)
 */
function buildEmailBody(
  customerFirstName: string,
  businessName: string,
  serviceType: string,
  serviceDate: string,
  fullUrl: string
): string {
  const formattedDate = new Date(serviceDate).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #f8f9fa; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
    <h1 style="color: #1a1a1a; font-size: 24px; margin: 0 0 10px 0;">
      Your Proof of Work is Ready
    </h1>
    <p style="color: #666; margin: 0; font-size: 14px;">
      From ${businessName}
    </p>
  </div>

  <p style="margin: 0 0 20px 0;">
    Hi ${customerFirstName},
  </p>

  <p style="margin: 0 0 20px 0;">
    Thank you for choosing ${businessName}. Your <strong>${serviceType}</strong> service on <strong>${formattedDate}</strong> has been completed.
  </p>

  <p style="margin: 0 0 20px 0;">
    We've created a Proof of Work document that shows exactly what was done, including verified timestamps and photos.
  </p>

  <div style="text-align: center; margin: 30px 0;">
    <a href="${fullUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: 600;">
      View Proof of Work
    </a>
  </div>

  <p style="margin: 0 0 20px 0; color: #666; font-size: 14px;">
    You can also view it directly at:<br>
    <a href="${fullUrl}" style="color: #2563eb;">${fullUrl}</a>
  </p>

  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

  <p style="margin: 0; color: #666; font-size: 12px;">
    This email was sent by ${businessName}. If you have questions about your service, please contact them directly.
  </p>
</body>
</html>
  `.trim();
}

/**
 * Build plain text email body (fallback)
 */
function buildEmailBodyText(
  customerFirstName: string,
  businessName: string,
  serviceType: string,
  serviceDate: string,
  fullUrl: string
): string {
  const formattedDate = new Date(serviceDate).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return `
Hi ${customerFirstName},

Thank you for choosing ${businessName}. Your ${serviceType} service on ${formattedDate} has been completed.

We've created a Proof of Work document that shows exactly what was done, including verified timestamps and photos.

View your Proof of Work: ${fullUrl}

If you have questions about your service, please contact ${businessName} directly.
  `.trim();
}

/**
 * Send Proof of Work via SMS
 */
async function sendPowSms(
  pow: ProofOfWork,
  customer: Customer,
  business: Business
): Promise<boolean> {
  if (!customer.phone) {
    logger.warn({
      msg: 'Cannot send PoW SMS - no customer phone',
      powId: pow.id,
      customerId: customer.id,
    });
    return false;
  }

  if (!business.twilio_phone_number) {
    logger.warn({
      msg: 'Cannot send PoW SMS - no business phone number',
      powId: pow.id,
      businessId: business.id,
    });
    return false;
  }

  const message = buildSmsMessage(business.name, pow.short_code);

  try {
    const result = await sendSMS({
      to: customer.phone,
      businessId: business.id,
      body: message,
      metadata: {
        type: 'proof_of_work',
        pow_id: pow.id,
      },
    });

    if (!result.success) {
      logger.error({
        msg: 'PoW SMS failed',
        powId: pow.id,
        error: result.error,
      });
      return false;
    }

    logger.info({
      msg: 'PoW SMS sent',
      powId: pow.id,
      to: customer.phone,
      twilioSid: result.twilioSid,
    });

    return true;
  } catch (error) {
    logger.error({
      msg: 'Failed to send PoW SMS',
      powId: pow.id,
      error,
    });
    return false;
  }
}

/**
 * Send Proof of Work via email
 */
async function sendPowEmail(
  pow: ProofOfWork,
  customer: Customer,
  business: Business
): Promise<boolean> {
  if (!customer.email) {
    logger.warn({
      msg: 'Cannot send PoW email - no customer email',
      powId: pow.id,
      customerId: customer.id,
    });
    return false;
  }

  const fullUrl = getFullUrl(pow.public_token);
  const subject = buildEmailSubject(business.name);
  const htmlBody = buildEmailBody(
    customer.first_name,
    business.name,
    pow.service_type,
    pow.service_date,
    fullUrl
  );
  const textBody = buildEmailBodyText(
    customer.first_name,
    business.name,
    pow.service_type,
    pow.service_date,
    fullUrl
  );

  try {
    await sendEmail({
      to: customer.email,
      subject,
      html: htmlBody,
      text: textBody,
    });

    logger.info({
      msg: 'PoW email sent',
      powId: pow.id,
      to: customer.email,
    });

    return true;
  } catch (error) {
    logger.error({
      msg: 'Failed to send PoW email',
      powId: pow.id,
      error,
    });
    return false;
  }
}

/**
 * Deliver Proof of Work to customer
 */
export async function deliverProofOfWork(powId: string): Promise<boolean> {
  const supabase = createAdminClient();

  // Get PoW with customer and business
  const { data: pow, error: powError } = await supabase
    .from('proof_of_work')
    .select(`
      *,
      customer:customers(id, first_name, last_name, phone, email),
      business:businesses(id, name, twilio_phone_number)
    `)
    .eq('id', powId)
    .single();

  if (powError || !pow) {
    logger.error({
      msg: 'Failed to get PoW for delivery',
      powId,
      error: powError,
    });
    return false;
  }

  if (!pow.delivery_enabled) {
    logger.info({
      msg: 'PoW delivery disabled',
      powId,
    });
    return false;
  }

  if (pow.delivery_sent_at) {
    logger.warn({
      msg: 'PoW already delivered',
      powId,
      deliveredAt: pow.delivery_sent_at,
    });
    return true;
  }

  const customer = pow.customer as Customer;
  const business = pow.business as Business;

  if (!customer) {
    logger.warn({
      msg: 'Cannot deliver PoW - no customer',
      powId,
    });
    return false;
  }

  let smsSent = false;
  let emailSent = false;

  // Send based on delivery channel
  switch (pow.delivery_channel as DeliveryChannel) {
    case 'SMS':
      smsSent = await sendPowSms(pow, customer, business);
      break;
    case 'EMAIL':
      emailSent = await sendPowEmail(pow, customer, business);
      break;
    case 'BOTH':
      [smsSent, emailSent] = await Promise.all([
        sendPowSms(pow, customer, business),
        sendPowEmail(pow, customer, business),
      ]);
      break;
  }

  const deliverySuccessful = smsSent || emailSent;

  if (deliverySuccessful) {
    // Update delivery timestamp
    await supabase
      .from('proof_of_work')
      .update({ delivery_sent_at: new Date().toISOString() })
      .eq('id', powId);

    // Add SENT event to timeline
    await addSentEvent(powId, pow.delivery_channel as DeliveryChannel);

    // Create audit entry
    await supabase.from('proof_of_work_audit').insert({
      proof_of_work_id: powId,
      event_type: 'DELIVERED',
      actor_type: 'SYSTEM',
      metadata: {
        channel: pow.delivery_channel,
        sms_sent: smsSent,
        email_sent: emailSent,
      },
    });

    logger.info({
      msg: 'PoW delivered',
      powId,
      channel: pow.delivery_channel,
      smsSent,
      emailSent,
    });
  } else {
    // Record delivery failure
    await supabase.from('proof_of_work_audit').insert({
      proof_of_work_id: powId,
      event_type: 'DELIVERY_FAILED',
      actor_type: 'SYSTEM',
      metadata: {
        channel: pow.delivery_channel,
        reason: 'All delivery attempts failed',
      },
    });

    logger.error({
      msg: 'PoW delivery failed',
      powId,
      channel: pow.delivery_channel,
    });
  }

  return deliverySuccessful;
}

/**
 * Get pending deliveries (for scheduled job)
 */
export async function getPendingDeliveries(): Promise<string[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('proof_of_work')
    .select('id')
    .eq('delivery_enabled', true)
    .is('delivery_sent_at', null)
    .lte('delivery_scheduled_at', new Date().toISOString())
    .eq('status', 'COMPLETED');

  if (error) {
    logger.error({
      msg: 'Failed to get pending deliveries',
      error,
    });
    return [];
  }

  return data?.map((p) => p.id) || [];
}

/**
 * Process all pending deliveries (for cron job)
 */
export async function processPendingDeliveries(): Promise<{
  processed: number;
  successful: number;
  failed: number;
}> {
  const pendingIds = await getPendingDeliveries();

  const results = await Promise.allSettled(
    pendingIds.map((id) => deliverProofOfWork(id))
  );

  const successful = results.filter(
    (r) => r.status === 'fulfilled' && r.value === true
  ).length;
  const failed = results.length - successful;

  logger.info({
    msg: 'Processed pending PoW deliveries',
    processed: results.length,
    successful,
    failed,
  });

  return {
    processed: results.length,
    successful,
    failed,
  };
}
