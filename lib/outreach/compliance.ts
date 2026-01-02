// =====================================================
// OUTREACH MODULE - COMPLIANCE
// TCPA consent, DNC checking, opt-out management
// =====================================================

import { createClient } from '@/lib/supabase/server';
import type {
  SMSConsent,
  SMSOptOut,
  SuppressionListEntry,
  DNCCheck,
  DNCSettings,
  ConsentType,
  ConsentSource,
} from '@/types/outreach';

// =====================================================
// CONSENT MANAGEMENT
// =====================================================

export interface CreateConsentInput {
  phone: string;
  consent_type: ConsentType;
  consent_source: ConsentSource;
  consent_ip?: string;
  consent_user_agent?: string;
  consent_form_url?: string;
  consent_language?: string;
}

/**
 * Record SMS consent for a phone number
 */
export async function recordConsent(input: CreateConsentInput): Promise<SMSConsent | null> {
  const supabase = await createClient();

  // Normalize phone number
  const normalizedPhone = normalizePhone(input.phone);

  const { data, error } = await supabase
    .from('sms_consent')
    .insert({
      phone: normalizedPhone,
      consent_type: input.consent_type,
      consent_source: input.consent_source,
      consent_timestamp: new Date().toISOString(),
      consent_ip: input.consent_ip,
      consent_user_agent: input.consent_user_agent,
      consent_form_url: input.consent_form_url,
      consent_language: input.consent_language || getDefaultConsentLanguage(),
      is_valid: true,
    })
    .select()
    .single();

  if (error) {
    console.error('Error recording consent:', error);
    return null;
  }

  return data;
}

/**
 * Check if a phone number has valid consent
 */
export async function hasValidConsent(phone: string): Promise<boolean> {
  const supabase = await createClient();
  const normalizedPhone = normalizePhone(phone);

  const { data } = await supabase
    .from('sms_consent')
    .select('id')
    .eq('phone', normalizedPhone)
    .eq('is_valid', true)
    .is('revoked_at', null)
    .order('consent_timestamp', { ascending: false })
    .limit(1);

  return data !== null && data.length > 0;
}

/**
 * Revoke consent for a phone number
 */
export async function revokeConsent(
  phone: string,
  method: 'STOP_reply' | 'manual' | 'complaint'
): Promise<boolean> {
  const supabase = await createClient();
  const normalizedPhone = normalizePhone(phone);

  const { error } = await supabase
    .from('sms_consent')
    .update({
      is_valid: false,
      revoked_at: new Date().toISOString(),
      revoke_method: method,
    })
    .eq('phone', normalizedPhone)
    .eq('is_valid', true);

  return !error;
}

/**
 * Get default consent language
 */
function getDefaultConsentLanguage(): string {
  return `I agree to receive text messages from Trades Captain about my inquiry and services. Message frequency varies. Reply STOP to opt out. Message & data rates may apply.`;
}

// =====================================================
// OPT-OUT MANAGEMENT
// =====================================================

/**
 * Check if a phone number is opted out
 */
export async function isOptedOut(phone: string): Promise<boolean> {
  const supabase = await createClient();
  const normalizedPhone = normalizePhone(phone);

  const { data } = await supabase
    .from('sms_opt_outs')
    .select('id')
    .eq('phone', normalizedPhone)
    .limit(1);

  return data !== null && data.length > 0;
}

/**
 * Record an opt-out (STOP reply)
 */
export async function recordOptOut(
  phone: string,
  method: 'STOP_reply' | 'manual_request' | 'complaint',
  keyword?: string,
  campaignId?: string
): Promise<SMSOptOut | null> {
  const supabase = await createClient();
  const normalizedPhone = normalizePhone(phone);

  // Check if already opted out
  if (await isOptedOut(phone)) {
    return null;
  }

  const { data, error } = await supabase
    .from('sms_opt_outs')
    .insert({
      phone: normalizedPhone,
      opted_out_at: new Date().toISOString(),
      opt_out_method: method,
      opt_out_keyword: keyword,
      original_campaign_id: campaignId,
    })
    .select()
    .single();

  if (error) {
    console.error('Error recording opt-out:', error);
    return null;
  }

  // Also revoke consent - map method to revokeConsent's expected values
  const revokeMethod = method === 'manual_request' ? 'manual' : method;
  await revokeConsent(phone, revokeMethod);

  return data;
}

/**
 * Check if a message contains opt-out keywords
 */
export function containsOptOutKeyword(message: string): boolean {
  const optOutKeywords = ['STOP', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'];
  const normalizedMessage = message.trim().toUpperCase();

  return optOutKeywords.some(
    (keyword) =>
      normalizedMessage === keyword ||
      normalizedMessage.startsWith(keyword + ' ') ||
      normalizedMessage.endsWith(' ' + keyword)
  );
}

/**
 * Extract opt-out keyword from message
 */
export function extractOptOutKeyword(message: string): string | null {
  const optOutKeywords = ['STOP', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'];
  const normalizedMessage = message.trim().toUpperCase();

  for (const keyword of optOutKeywords) {
    if (
      normalizedMessage === keyword ||
      normalizedMessage.startsWith(keyword + ' ') ||
      normalizedMessage.endsWith(' ' + keyword)
    ) {
      return keyword;
    }
  }

  return null;
}

// =====================================================
// SUPPRESSION LIST
// =====================================================

/**
 * Check if a phone is on the suppression list
 */
export async function isOnSuppressionList(phone: string): Promise<boolean> {
  const supabase = await createClient();
  const normalizedPhone = normalizePhone(phone);

  const { data } = await supabase
    .from('suppression_list')
    .select('id')
    .eq('phone', normalizedPhone)
    .limit(1);

  return data !== null && data.length > 0;
}

/**
 * Add a phone to the suppression list
 */
export async function addToSuppressionList(
  phone: string,
  reason: string,
  source?: string,
  addedBy?: string
): Promise<SuppressionListEntry | null> {
  const supabase = await createClient();
  const normalizedPhone = normalizePhone(phone);

  // Check if already on list
  if (await isOnSuppressionList(phone)) {
    return null;
  }

  const { data, error } = await supabase
    .from('suppression_list')
    .insert({
      phone: normalizedPhone,
      reason,
      source,
      added_by: addedBy,
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding to suppression list:', error);
    return null;
  }

  return data;
}

/**
 * Remove a phone from the suppression list
 */
export async function removeFromSuppressionList(phone: string): Promise<boolean> {
  const supabase = await createClient();
  const normalizedPhone = normalizePhone(phone);

  const { error } = await supabase
    .from('suppression_list')
    .delete()
    .eq('phone', normalizedPhone);

  return !error;
}

// =====================================================
// DNC CHECKING
// =====================================================

/**
 * Get DNC settings
 */
export async function getDNCSettings(): Promise<DNCSettings | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('dnc_settings')
    .select('*')
    .limit(1)
    .single();

  return data;
}

/**
 * Check if a phone is on the DNC list (uses cache)
 */
export async function checkDNC(
  phone: string,
  contactId?: string
): Promise<DNCCheck | null> {
  const supabase = await createClient();
  const normalizedPhone = normalizePhone(phone);

  // Check cache first
  const { data: cached } = await supabase
    .from('dnc_checks')
    .select('*')
    .eq('phone', normalizedPhone)
    .gt('expires_at', new Date().toISOString())
    .order('checked_at', { ascending: false })
    .limit(1)
    .single();

  if (cached) {
    return cached;
  }

  // Get settings
  const settings = await getDNCSettings();

  if (!settings?.api_key) {
    // DNC checking not configured - assume safe
    const { data } = await supabase
      .from('dnc_checks')
      .insert({
        phone: normalizedPhone,
        contact_id: contactId,
        dnc_status: 'clean',
        safe_to_contact: true,
        response_data: { note: 'DNC checking not configured' },
        expires_at: new Date(Date.now() + (settings?.cache_days || 30) * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    return data;
  }

  // TODO: Implement actual Datazapp API call
  // For now, mark as clean
  const { data } = await supabase
    .from('dnc_checks')
    .insert({
      phone: normalizedPhone,
      contact_id: contactId,
      dnc_status: 'clean',
      safe_to_contact: true,
      response_data: { note: 'Datazapp integration pending' },
      expires_at: new Date(Date.now() + (settings?.cache_days || 30) * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select()
    .single();

  return data;
}

/**
 * Check if it's safe to contact a phone number
 */
export async function isSafeToContact(phone: string): Promise<{
  safe: boolean;
  reason?: string;
}> {
  const normalizedPhone = normalizePhone(phone);

  // Check opt-outs first (fastest)
  if (await isOptedOut(normalizedPhone)) {
    return { safe: false, reason: 'opted_out' };
  }

  // Check suppression list
  if (await isOnSuppressionList(normalizedPhone)) {
    return { safe: false, reason: 'suppression_list' };
  }

  // Check valid consent
  if (!(await hasValidConsent(normalizedPhone))) {
    return { safe: false, reason: 'no_consent' };
  }

  // Check DNC
  const dncCheck = await checkDNC(normalizedPhone);
  if (dncCheck && !dncCheck.safe_to_contact) {
    return { safe: false, reason: `dnc_${dncCheck.dnc_status}` };
  }

  return { safe: true };
}

// =====================================================
// TIMEZONE DETECTION
// =====================================================

/**
 * Detect timezone from phone number area code
 */
export async function detectTimezoneFromPhone(phone: string): Promise<{
  timezone: string;
  source: 'area_code' | 'default';
  state?: string;
  region?: string;
}> {
  const supabase = await createClient();
  const normalizedPhone = normalizePhone(phone);

  // Extract area code (first 3 digits after country code)
  const areaCode = extractAreaCode(normalizedPhone);

  if (!areaCode) {
    return { timezone: 'America/New_York', source: 'default' };
  }

  const { data } = await supabase
    .from('area_code_timezones')
    .select('*')
    .eq('area_code', areaCode)
    .single();

  if (data) {
    return {
      timezone: data.timezone,
      source: 'area_code',
      state: data.state,
      region: data.region,
    };
  }

  return { timezone: 'America/New_York', source: 'default' };
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Normalize phone number to E.164 format
 */
export function normalizePhone(phone: string): string {
  // Remove all non-digits
  let digits = phone.replace(/\D/g, '');

  // Add country code if missing
  if (digits.length === 10) {
    digits = '1' + digits;
  }

  // Remove leading 1 if present and add back with +
  if (digits.startsWith('1') && digits.length === 11) {
    return '+' + digits;
  }

  // If it already has + keep it
  if (phone.startsWith('+')) {
    return '+' + digits;
  }

  return '+1' + digits;
}

/**
 * Extract area code from phone number
 */
export function extractAreaCode(phone: string): string | null {
  const normalized = normalizePhone(phone);
  // E.164 format: +1AAANNNNNNN
  if (normalized.length >= 5 && normalized.startsWith('+1')) {
    return normalized.substring(2, 5);
  }
  return null;
}

/**
 * Check if message is within send window
 */
export function isWithinSendWindow(
  date: Date,
  timezone: string,
  startTime: string = '09:00',
  endTime: string = '18:00'
): boolean {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: timezone,
    });

    const localTime = formatter.format(date);
    const [hours, minutes] = localTime.split(':').map(Number);
    const currentMinutes = hours * 60 + minutes;

    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  } catch (error) {
    // If timezone is invalid, default to allowing
    console.error('Error checking send window:', error);
    return true;
  }
}

/**
 * Format phone for display
 */
export function formatPhoneDisplay(phone: string): string {
  const normalized = normalizePhone(phone);
  // +1AAANNNNNNN -> (AAA) NNN-NNNN
  if (normalized.length === 12 && normalized.startsWith('+1')) {
    const areaCode = normalized.substring(2, 5);
    const exchange = normalized.substring(5, 8);
    const number = normalized.substring(8, 12);
    return `(${areaCode}) ${exchange}-${number}`;
  }
  return phone;
}
