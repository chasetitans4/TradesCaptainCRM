// =====================================================
// TWILIO PHONE NUMBER PROVISIONING
// =====================================================

import { twilioClient, getWebhookUrl } from './client';
import { createAdminClient } from '@/lib/supabase/server';
import type { AvailablePhoneNumber } from '@/types';
import { smsLogger } from '@/lib/logger';

/**
 * Search for available phone numbers in a given area code
 */
export async function listAvailableNumbers(
  areaCode: string,
  limit: number = 10
): Promise<AvailablePhoneNumber[]> {
  try {
    const numbers = await twilioClient.availablePhoneNumbers('US')
      .local.list({
        areaCode: parseInt(areaCode, 10),
        smsEnabled: true,
        voiceEnabled: true,
        limit,
      });

    return numbers.map((n) => ({
      phone_number: n.phoneNumber,
      friendly_name: n.friendlyName,
      locality: n.locality || null,
      region: n.region || null,
      capabilities: {
        sms: n.capabilities?.sms ?? false,
        mms: n.capabilities?.mms ?? false,
        voice: n.capabilities?.voice ?? false,
      },
    }));
  } catch (error) {
    smsLogger.error({
      msg: 'Error listing available numbers',
      error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: 'Unknown error' },
    });
    throw error;
  }
}

/**
 * Provision a new phone number for a business
 */
export async function provisionPhoneNumber(
  phoneNumber: string,
  businessId: string
): Promise<{ phoneNumber: string; phoneSid: string }> {
  try {
    // Purchase the number
    const purchasedNumber = await twilioClient.incomingPhoneNumbers.create({
      phoneNumber,
      smsUrl: getWebhookUrl('/api/webhooks/twilio/sms'),
      smsMethod: 'POST',
      voiceUrl: getWebhookUrl('/api/webhooks/twilio/voice'),
      voiceMethod: 'POST',
      statusCallback: getWebhookUrl('/api/webhooks/twilio/status'),
      statusCallbackMethod: 'POST',
      friendlyName: `Trades Captain - ${businessId}`,
    });

    // Update the business record
    const supabase = createAdminClient();
    const { error } = await supabase
      .from('businesses')
      .update({
        twilio_phone_number: purchasedNumber.phoneNumber,
        twilio_phone_sid: purchasedNumber.sid,
      })
      .eq('id', businessId);

    if (error) {
      // Try to release the number if we can't update the database
      smsLogger.error({
        msg: 'Failed to update business with phone number',
        error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: 'Unknown error' },
        businessId,
      });
      await twilioClient.incomingPhoneNumbers(purchasedNumber.sid).remove();
      const errToThrow =
        error instanceof Error
          ? error
          : new Error(
              typeof error === 'object' && error && 'message' in (error as any)
                ? (error as any).message
                : 'Failed to update business with phone number'
            );
      throw errToThrow;
    }

    return {
      phoneNumber: purchasedNumber.phoneNumber,
      phoneSid: purchasedNumber.sid,
    };
  } catch (error) {
    smsLogger.error({
      msg: 'Error provisioning phone number',
      error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: 'Unknown error' },
      businessId,
    });
    throw error;
  }
}

/**
 * Release a phone number (remove from Twilio and database)
 */
export async function releasePhoneNumber(
  phoneSid: string,
  businessId: string
): Promise<void> {
  try {
    // Remove from Twilio
    await twilioClient.incomingPhoneNumbers(phoneSid).remove();

    // Update the business record
    const supabase = createAdminClient();
    await supabase
      .from('businesses')
      .update({
        twilio_phone_number: null,
        twilio_phone_sid: null,
      })
      .eq('id', businessId);
  } catch (error) {
    smsLogger.error({
      msg: 'Error releasing phone number',
      error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: 'Unknown error' },
      businessId,
    });
    throw error;
  }
}

/**
 * Update webhook URLs for an existing phone number
 */
export async function updatePhoneWebhooks(phoneSid: string): Promise<void> {
  try {
    await twilioClient.incomingPhoneNumbers(phoneSid).update({
      smsUrl: getWebhookUrl('/api/webhooks/twilio/sms'),
      smsMethod: 'POST',
      voiceUrl: getWebhookUrl('/api/webhooks/twilio/voice'),
      voiceMethod: 'POST',
      statusCallback: getWebhookUrl('/api/webhooks/twilio/status'),
      statusCallbackMethod: 'POST',
    });
  } catch (error) {
    smsLogger.error({
      msg: 'Error updating phone webhooks',
      error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: 'Unknown error' },
      phoneSid,
    });
    throw error;
  }
}
