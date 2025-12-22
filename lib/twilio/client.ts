// =====================================================
// TWILIO CLIENT SETUP
// =====================================================

import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;

export const twilioClient = twilio(accountSid, authToken);

export const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

// Webhook URL for Twilio to send status callbacks
export const getWebhookUrl = (path: string) => {
  return `${process.env.NEXT_PUBLIC_APP_URL}${path}`;
};

// Validate Twilio webhook signature
export function validateTwilioSignature(
  signature: string,
  url: string,
  params: Record<string, string>
): boolean {
  return twilio.validateRequest(authToken, signature, url, params);
}
