// =====================================================
// FEATURE TOGGLES LIBRARY
// =====================================================

import { createClient } from '@/lib/supabase/server';

export interface FeatureSettings {
  // Communication
  ai_sms_enabled: boolean;
  auto_appointment_reminders: boolean;
  auto_review_requests: boolean;

  // Scheduling
  online_booking_enabled: boolean;
  route_optimization_enabled: boolean;

  // Route Optimization Settings
  send_arrival_sms: boolean; // Send SMS to customer when technician arrives

  // CRM Features
  timesheets_enabled: boolean;
  receipts_enabled: boolean;
  quotes_enabled: boolean;
  invoices_enabled: boolean;

  // Notifications
  email_notifications: boolean;
  sms_notifications: boolean;
  push_notifications: boolean;
}

export const DEFAULT_FEATURES: FeatureSettings = {
  ai_sms_enabled: false,
  auto_appointment_reminders: true,
  auto_review_requests: false,
  online_booking_enabled: false,
  route_optimization_enabled: true,
  send_arrival_sms: false,
  timesheets_enabled: true,
  receipts_enabled: true,
  quotes_enabled: true,
  invoices_enabled: true,
  email_notifications: true,
  sms_notifications: true,
  push_notifications: true,
};

/**
 * Get feature settings for a business
 */
export async function getFeatureSettings(businessId: string): Promise<FeatureSettings> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('feature_settings')
    .select('*')
    .eq('business_id', businessId)
    .single();

  if (error || !data) {
    // Return defaults if no settings exist
    return DEFAULT_FEATURES;
  }

  return {
    ai_sms_enabled: data.ai_sms_enabled ?? DEFAULT_FEATURES.ai_sms_enabled,
    auto_appointment_reminders: data.auto_appointment_reminders ?? DEFAULT_FEATURES.auto_appointment_reminders,
    auto_review_requests: data.auto_review_requests ?? DEFAULT_FEATURES.auto_review_requests,
    online_booking_enabled: data.online_booking_enabled ?? DEFAULT_FEATURES.online_booking_enabled,
    route_optimization_enabled: data.route_optimization_enabled ?? DEFAULT_FEATURES.route_optimization_enabled,
    send_arrival_sms: data.send_arrival_sms ?? DEFAULT_FEATURES.send_arrival_sms,
    timesheets_enabled: data.timesheets_enabled ?? DEFAULT_FEATURES.timesheets_enabled,
    receipts_enabled: data.receipts_enabled ?? DEFAULT_FEATURES.receipts_enabled,
    quotes_enabled: data.quotes_enabled ?? DEFAULT_FEATURES.quotes_enabled,
    invoices_enabled: data.invoices_enabled ?? DEFAULT_FEATURES.invoices_enabled,
    email_notifications: data.email_notifications ?? DEFAULT_FEATURES.email_notifications,
    sms_notifications: data.sms_notifications ?? DEFAULT_FEATURES.sms_notifications,
    push_notifications: data.push_notifications ?? DEFAULT_FEATURES.push_notifications,
  };
}

/**
 * Update feature settings for a business
 */
export async function updateFeatureSettings(
  businessId: string,
  settings: Partial<FeatureSettings>
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('feature_settings')
    .upsert({
      business_id: businessId,
      ...settings,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    throw new Error(`Failed to update feature settings: ${error.message}`);
  }
}

/**
 * Check if a specific feature is enabled
 */
export async function isFeatureEnabled(
  businessId: string,
  feature: keyof FeatureSettings
): Promise<boolean> {
  const settings = await getFeatureSettings(businessId);
  return settings[feature];
}

/**
 * Initialize feature settings for a new business
 */
export async function initializeFeatureSettings(businessId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('feature_settings')
    .insert({
      business_id: businessId,
      ...DEFAULT_FEATURES,
    });

  if (error && !error.message.includes('duplicate')) {
    throw new Error(`Failed to initialize feature settings: ${error.message}`);
  }
}
