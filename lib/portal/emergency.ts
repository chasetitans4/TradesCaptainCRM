// =====================================================
// PORTAL EMERGENCY REQUESTS
// Emergency and after-hours service requests
// =====================================================

import { createAdminClient } from '@/lib/supabase/server';
import { syncLogger } from '@/lib/logger';
import type { EmergencyRequest, EmergencyRequestType } from './types';

interface CreateEmergencyRequestParams {
  businessId: string;
  customerId: string;
  equipmentId?: string;
  requestType: EmergencyRequestType;
  issueDescription: string;
  issueCategory?: string;
  photos?: string[];
  contactPhone: string;
  contactMethod?: 'phone' | 'text' | 'either';
  isGasLeak?: boolean;
  isFlooding?: boolean;
  isNoHeat?: boolean;
  isNoCooling?: boolean;
  acknowledgedAfterHoursRate?: boolean;
}

/**
 * Get business emergency/after-hours settings
 */
export async function getEmergencySettings(businessId: string): Promise<{
  emergencyContactPhone?: string;
  emergencyContactEmail?: string;
  afterHoursRateMultiplier: number;
  afterHoursMinimum?: number;
  isAfterHours: boolean;
}> {
  const supabase = createAdminClient();

  const { data: business } = await supabase
    .from('businesses')
    .select('emergency_contact_phone, emergency_contact_email, after_hours_rate_multiplier, after_hours_minimum, business_hours, timezone')
    .eq('id', businessId)
    .single();

  if (!business) {
    return {
      afterHoursRateMultiplier: 1.5,
      isAfterHours: false,
    };
  }

  // Check if current time is after hours
  const isAfterHours = checkIfAfterHours(business.business_hours, business.timezone);

  return {
    emergencyContactPhone: business.emergency_contact_phone,
    emergencyContactEmail: business.emergency_contact_email,
    afterHoursRateMultiplier: business.after_hours_rate_multiplier || 1.5,
    afterHoursMinimum: business.after_hours_minimum,
    isAfterHours,
  };
}

/**
 * Check if current time is after business hours
 */
function checkIfAfterHours(businessHours: any, timezone?: string): boolean {
  if (!businessHours) return false;

  try {
    const now = new Date();
    const tz = timezone || 'America/New_York';

    // Get current day and time in business timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      weekday: 'long',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    });

    const parts = formatter.formatToParts(now);
    const weekday = parts.find((p) => p.type === 'weekday')?.value?.toLowerCase();
    const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0');
    const minute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0');
    const currentMinutes = hour * 60 + minute;

    // Check business hours for current day
    if (!weekday) {
      return false; // Can't determine weekday, assume business hours
    }
    const todayHours = businessHours[weekday as keyof typeof businessHours];
    if (!todayHours || todayHours.closed) {
      return true;
    }

    const [openHour, openMin] = (todayHours.open || '09:00').split(':').map(Number);
    const [closeHour, closeMin] = (todayHours.close || '17:00').split(':').map(Number);
    const openMinutes = openHour * 60 + openMin;
    const closeMinutes = closeHour * 60 + closeMin;

    return currentMinutes < openMinutes || currentMinutes > closeMinutes;
  } catch {
    return false;
  }
}

/**
 * Create an emergency/after-hours service request
 */
export async function createEmergencyRequest(
  params: CreateEmergencyRequestParams
): Promise<{ success: boolean; requestId?: string; error?: string }> {
  const supabase = createAdminClient();

  // Get after-hours rate if applicable
  const settings = await getEmergencySettings(params.businessId);
  const afterHoursRate = settings.isAfterHours ? settings.afterHoursMinimum : undefined;

  const { data, error } = await supabase
    .from('emergency_requests')
    .insert({
      business_id: params.businessId,
      customer_id: params.customerId,
      equipment_id: params.equipmentId,
      request_type: params.requestType,
      issue_description: params.issueDescription,
      issue_category: params.issueCategory,
      photos: params.photos || [],
      contact_phone: params.contactPhone,
      contact_method: params.contactMethod || 'phone',
      is_gas_leak: params.isGasLeak || false,
      is_flooding: params.isFlooding || false,
      is_no_heat: params.isNoHeat || false,
      is_no_cooling: params.isNoCooling || false,
      acknowledged_after_hours_rate: params.acknowledgedAfterHoursRate || false,
      after_hours_rate_amount: afterHoursRate,
    })
    .select('id')
    .single();

  if (error) {
    syncLogger.error({
      msg: 'Failed to create emergency request',
      customerId: params.customerId,
      error: error.message,
    });
    return { success: false, error: 'Failed to submit emergency request' };
  }

  // TODO: Send notification to business owner/on-call technician
  // This would integrate with their notification preferences

  syncLogger.info({
    msg: 'Emergency request created',
    requestId: data.id,
    customerId: params.customerId,
    requestType: params.requestType,
    isGasLeak: params.isGasLeak,
    isFlooding: params.isFlooding,
  });

  return { success: true, requestId: data.id };
}

/**
 * Get emergency requests for a customer
 */
export async function getCustomerEmergencyRequests(
  customerId: string,
  businessId: string,
  limit: number = 10
): Promise<EmergencyRequest[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('emergency_requests')
    .select('*')
    .eq('customer_id', customerId)
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    syncLogger.error({
      msg: 'Failed to fetch emergency requests',
      customerId,
      error: error.message,
    });
    return [];
  }

  return data || [];
}

/**
 * Get status of an emergency request
 */
export async function getEmergencyRequestStatus(
  requestId: string,
  customerId: string,
  businessId: string
): Promise<EmergencyRequest | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('emergency_requests')
    .select('*')
    .eq('id', requestId)
    .eq('customer_id', customerId)
    .eq('business_id', businessId)
    .single();

  if (error) {
    return null;
  }

  return data;
}

/**
 * Cancel an emergency request (only if still pending)
 */
export async function cancelEmergencyRequest(
  requestId: string,
  customerId: string,
  businessId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  // Check current status
  const { data: request } = await supabase
    .from('emergency_requests')
    .select('status')
    .eq('id', requestId)
    .eq('customer_id', customerId)
    .eq('business_id', businessId)
    .single();

  if (!request) {
    return { success: false, error: 'Request not found' };
  }

  if (request.status !== 'pending') {
    return { success: false, error: 'Cannot cancel request that has already been acknowledged' };
  }

  const { error } = await supabase
    .from('emergency_requests')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', requestId);

  if (error) {
    return { success: false, error: 'Failed to cancel request' };
  }

  return { success: true };
}
