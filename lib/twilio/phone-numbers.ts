// =====================================================
// TWILIO PHONE NUMBER PROVISIONING
// =====================================================

import { twilioClient, getWebhookUrl } from './client';
import { createAdminClient } from '@/lib/supabase/server';
import type { AvailablePhoneNumber } from '@/types';

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
    console.error('Error listing available numbers:', error);
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
      console.error('Failed to update business with phone number:', error);
      await twilioClient.incomingPhoneNumbers(purchasedNumber.sid).remove();
      throw error;
    }

    return {
      phoneNumber: purchasedNumber.phoneNumber,
      phoneSid: purchasedNumber.sid,
    };
  } catch (error) {
    console.error('Error provisioning phone number:', error);
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
    console.error('Error releasing phone number:', error);
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
    console.error('Error updating phone webhooks:', error);
    throw error;
  }
}
