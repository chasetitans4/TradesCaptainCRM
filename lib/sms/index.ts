// SMS Service using Twilio
import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

export interface SendSmsParams {
  to: string;
  body: string;
}

export interface SendSmsResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendSms({ to, body }: SendSmsParams): Promise<SendSmsResult> {
  if (!client || !fromNumber) {
    return {
      success: false,
      error: 'Twilio not configured'
    };
  }

  try {
    const message = await client.messages.create({
      body,
      from: fromNumber,
      to,
    });

    return {
      success: true,
      messageId: message.sid,
    };
  } catch (error) {
    console.error('Failed to send SMS:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function sendBulkSms(
  recipients: string[],
  body: string
): Promise<Map<string, SendSmsResult>> {
  const results = new Map<string, SendSmsResult>();

  await Promise.all(
    recipients.map(async (to) => {
      const result = await sendSms({ to, body });
      results.set(to, result);
    })
  );

  return results;
}
