/**
 * Voice Configuration Resolver
 *
 * Delta 2: Implements location override hierarchy
 * Location Override → Global Default
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import type {
  VoiceReceptionistSettings,
  VoiceLocationOverride,
  ResolvedVoiceConfig,
  EmergencyPhrase,
  OverrideableField,
  GlobalOnlyField,
} from '@/types/voice-receptionist';
import { OVERRIDEABLE_FIELDS, GLOBAL_ONLY_FIELDS } from '@/types/voice-receptionist';

const configLogger = logger.child({ module: 'voice-config' });

/**
 * Delta 2: Resolve configuration with location override hierarchy
 * Location Override → Global Default
 */
export async function resolveVoiceConfig(
  businessId: string,
  locationId?: string
): Promise<ResolvedVoiceConfig | null> {
  const supabase = createAdminClient();

  // Get global settings (required)
  const { data: settings, error: settingsError } = await supabase
    .from('voice_receptionist_settings')
    .select('*')
    .eq('business_id', businessId)
    .single();

  if (settingsError || !settings) {
    configLogger.warn({ msg: 'Voice settings not found for business', businessId });
    return null;
  }

  // Get location override if location specified
  let locationOverride: VoiceLocationOverride | undefined;
  if (locationId) {
    const { data: override } = await supabase
      .from('voice_location_overrides')
      .select('*')
      .eq('business_id', businessId)
      .eq('location_id', locationId)
      .single();

    if (override) {
      locationOverride = override as VoiceLocationOverride;
      configLogger.debug({ msg: 'Location override found', businessId, locationId });
    }
  }

  // Get emergency phrases
  const { data: phrases } = await supabase
    .from('voice_emergency_phrases')
    .select('*, voice_emergency_rules!inner(business_id, is_enabled)')
    .eq('voice_emergency_rules.business_id', businessId)
    .eq('voice_emergency_rules.is_enabled', true);

  // Resolve overrideable fields (Delta 2)
  const resolved: ResolvedVoiceConfig = {
    settings: settings as VoiceReceptionistSettings,
    locationOverride,

    // Business hours: location override first, then global default (empty = always available)
    businessHours: locationOverride?.business_hours || {},

    // Contacts: location override first, then global defaults
    primaryContactId:
      locationOverride?.primary_contact_id ||
      settings.default_primary_contact_id,
    backupContactId:
      locationOverride?.backup_contact_id ||
      settings.default_backup_contact_id,

    // Escalation wait: location override first, then global
    escalationWaitMinutes:
      locationOverride?.escalation_wait_minutes ||
      settings.default_escalation_wait_minutes ||
      3,

    // Emergency phrases: location override first (if present), then global
    emergencyPhrases: locationOverride?.emergency_phrases || (phrases as EmergencyPhrase[]) || [],

    // Service categories: location override only (optional field)
    serviceCategories: locationOverride?.service_categories || [],
  };

  return resolved;
}

/**
 * Get voice settings for a business (global only)
 */
export async function getVoiceSettings(
  businessId: string
): Promise<VoiceReceptionistSettings | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('voice_receptionist_settings')
    .select('*')
    .eq('business_id', businessId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as VoiceReceptionistSettings;
}

/**
 * Get location override for a specific location
 */
export async function getLocationOverride(
  businessId: string,
  locationId: string
): Promise<VoiceLocationOverride | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('voice_location_overrides')
    .select('*')
    .eq('business_id', businessId)
    .eq('location_id', locationId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as VoiceLocationOverride;
}

/**
 * Check if a field is overrideable per location
 */
export function isOverrideableField(field: string): field is OverrideableField {
  return OVERRIDEABLE_FIELDS.includes(field as OverrideableField);
}

/**
 * Check if a field is global-only (cannot be overridden)
 */
export function isGlobalOnlyField(field: string): field is GlobalOnlyField {
  return GLOBAL_ONLY_FIELDS.includes(field as GlobalOnlyField);
}

/**
 * Get resolved field value (respecting override hierarchy)
 */
export function getResolvedFieldValue<T>(
  field: OverrideableField,
  locationOverride: VoiceLocationOverride | undefined,
  globalDefault: T
): T {
  if (!locationOverride) {
    return globalDefault;
  }

  const overrideValue = (locationOverride as any)[field];
  if (overrideValue !== undefined && overrideValue !== null) {
    return overrideValue as T;
  }

  return globalDefault;
}

/**
 * Create or update voice settings for a business
 */
export async function upsertVoiceSettings(
  businessId: string,
  settings: Partial<VoiceReceptionistSettings>
): Promise<VoiceReceptionistSettings | null> {
  const supabase = createAdminClient();

  // Ensure training_opt_out is always true (Delta 6)
  const sanitizedSettings = {
    ...settings,
    business_id: businessId,
    training_opt_out: true, // Cannot be overridden
  };

  const { data, error } = await supabase
    .from('voice_receptionist_settings')
    .upsert(sanitizedSettings, { onConflict: 'business_id' })
    .select()
    .single();

  if (error) {
    configLogger.error({ msg: 'Failed to upsert voice settings', businessId, error });
    return null;
  }

  return data as VoiceReceptionistSettings;
}

/**
 * Create or update location override
 */
export async function upsertLocationOverride(
  businessId: string,
  locationId: string,
  override: Partial<VoiceLocationOverride>
): Promise<VoiceLocationOverride | null> {
  const supabase = createAdminClient();

  // Filter to only overrideable fields
  const sanitizedOverride: Partial<VoiceLocationOverride> = {
    business_id: businessId,
    location_id: locationId,
  };

  for (const field of OVERRIDEABLE_FIELDS) {
    if (field in override) {
      (sanitizedOverride as any)[field] = (override as any)[field];
    }
  }

  const { data, error } = await supabase
    .from('voice_location_overrides')
    .upsert(sanitizedOverride, { onConflict: 'business_id,location_id' })
    .select()
    .single();

  if (error) {
    configLogger.error({ msg: 'Failed to upsert location override', businessId, locationId, error });
    return null;
  }

  return data as VoiceLocationOverride;
}

/**
 * Delete location override
 */
export async function deleteLocationOverride(
  businessId: string,
  locationId: string
): Promise<boolean> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('voice_location_overrides')
    .delete()
    .eq('business_id', businessId)
    .eq('location_id', locationId);

  if (error) {
    configLogger.error({ msg: 'Failed to delete location override', businessId, locationId, error });
    return false;
  }

  return true;
}
