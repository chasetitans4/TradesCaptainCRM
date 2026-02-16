/**
 * Emergency Rules Service
 *
 * CRUD operations for voice emergency rules and phrases.
 * Delta 2: Rules are global, but contacts can be overridden per-location.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import type {
  VoiceEmergencyRule,
  EmergencyPhrase,
  PhraseType,
} from '@/types/voice-receptionist';

const rulesLogger = logger.child({ module: 'voice-emergency-rules' });

/**
 * Get all emergency rules for a business
 */
export async function getEmergencyRules(
  businessId: string
): Promise<VoiceEmergencyRule[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('voice_emergency_rules')
    .select(`
      *,
      voice_emergency_phrases (*)
    `)
    .eq('business_id', businessId)
    .order('category');

  if (error) {
    rulesLogger.error({ msg: 'Failed to fetch emergency rules', businessId, error });
    throw new Error('Failed to fetch emergency rules');
  }

  return (data || []).map((rule) => ({
    ...rule,
    phrases: rule.voice_emergency_phrases || [],
  })) as VoiceEmergencyRule[];
}

/**
 * Get a single emergency rule by ID
 */
export async function getEmergencyRule(
  ruleId: string,
  businessId: string
): Promise<VoiceEmergencyRule | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('voice_emergency_rules')
    .select(`
      *,
      voice_emergency_phrases (*)
    `)
    .eq('id', ruleId)
    .eq('business_id', businessId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    rulesLogger.error({ msg: 'Failed to fetch emergency rule', ruleId, error });
    throw new Error('Failed to fetch emergency rule');
  }

  return {
    ...data,
    phrases: data.voice_emergency_phrases || [],
  } as VoiceEmergencyRule;
}

/**
 * Create a new emergency rule
 */
export async function createEmergencyRule(
  businessId: string,
  data: {
    category: string;
    is_enabled?: boolean;
    caller_confirmation_enabled?: boolean;
    keypad_override_enabled?: boolean;
    default_primary_contact_id?: string;
    default_backup_contact_id?: string;
    escalation_wait_minutes?: number;
    phrases?: Array<{ phrase: string; phrase_type: PhraseType }>;
  }
): Promise<VoiceEmergencyRule> {
  const supabase = createAdminClient();

  // Check for duplicate category
  const { data: existing } = await supabase
    .from('voice_emergency_rules')
    .select('id')
    .eq('business_id', businessId)
    .eq('category', data.category)
    .single();

  if (existing) {
    throw new Error(`Emergency rule for category "${data.category}" already exists`);
  }

  // Create the rule
  const { data: rule, error: ruleError } = await supabase
    .from('voice_emergency_rules')
    .insert({
      business_id: businessId,
      category: data.category,
      is_enabled: data.is_enabled ?? true,
      caller_confirmation_enabled: data.caller_confirmation_enabled ?? true,
      keypad_override_enabled: data.keypad_override_enabled ?? false,
      default_primary_contact_id: data.default_primary_contact_id,
      default_backup_contact_id: data.default_backup_contact_id,
      escalation_wait_minutes: data.escalation_wait_minutes ?? 3,
    })
    .select()
    .single();

  if (ruleError) {
    rulesLogger.error({ msg: 'Failed to create emergency rule', businessId, error: ruleError });
    throw new Error('Failed to create emergency rule');
  }

  // Create phrases if provided
  if (data.phrases && data.phrases.length > 0) {
    const { error: phrasesError } = await supabase
      .from('voice_emergency_phrases')
      .insert(
        data.phrases.map((p) => ({
          rule_id: rule.id,
          phrase: p.phrase,
          phrase_type: p.phrase_type,
        }))
      );

    if (phrasesError) {
      rulesLogger.error({ msg: 'Failed to create phrases', ruleId: rule.id, error: phrasesError });
    }
  }

  rulesLogger.info({ msg: 'Emergency rule created', businessId, category: data.category, ruleId: rule.id });

  return getEmergencyRule(rule.id, businessId) as Promise<VoiceEmergencyRule>;
}

/**
 * Update an emergency rule
 */
export async function updateEmergencyRule(
  ruleId: string,
  businessId: string,
  data: {
    category?: string;
    is_enabled?: boolean;
    caller_confirmation_enabled?: boolean;
    keypad_override_enabled?: boolean;
    default_primary_contact_id?: string | null;
    default_backup_contact_id?: string | null;
    escalation_wait_minutes?: number;
    phrases?: Array<{ phrase: string; phrase_type: PhraseType }>;
  }
): Promise<VoiceEmergencyRule> {
  const supabase = createAdminClient();

  // Build update object
  const updateData: Record<string, unknown> = {};
  if (data.category !== undefined) updateData.category = data.category;
  if (data.is_enabled !== undefined) updateData.is_enabled = data.is_enabled;
  if (data.caller_confirmation_enabled !== undefined) updateData.caller_confirmation_enabled = data.caller_confirmation_enabled;
  if (data.keypad_override_enabled !== undefined) updateData.keypad_override_enabled = data.keypad_override_enabled;
  if (data.default_primary_contact_id !== undefined) updateData.default_primary_contact_id = data.default_primary_contact_id;
  if (data.default_backup_contact_id !== undefined) updateData.default_backup_contact_id = data.default_backup_contact_id;
  if (data.escalation_wait_minutes !== undefined) updateData.escalation_wait_minutes = data.escalation_wait_minutes;

  if (Object.keys(updateData).length > 0) {
    const { error } = await supabase
      .from('voice_emergency_rules')
      .update(updateData)
      .eq('id', ruleId)
      .eq('business_id', businessId);

    if (error) {
      rulesLogger.error({ msg: 'Failed to update emergency rule', ruleId, error });
      throw new Error('Failed to update emergency rule');
    }
  }

  // Update phrases if provided (replace all)
  if (data.phrases !== undefined) {
    // Delete existing phrases
    await supabase
      .from('voice_emergency_phrases')
      .delete()
      .eq('rule_id', ruleId);

    // Insert new phrases
    if (data.phrases.length > 0) {
      const { error: phrasesError } = await supabase
        .from('voice_emergency_phrases')
        .insert(
          data.phrases.map((p) => ({
            rule_id: ruleId,
            phrase: p.phrase,
            phrase_type: p.phrase_type,
          }))
        );

      if (phrasesError) {
        rulesLogger.error({ msg: 'Failed to update phrases', ruleId, error: phrasesError });
      }
    }
  }

  rulesLogger.info({ msg: 'Emergency rule updated', ruleId, businessId });

  return getEmergencyRule(ruleId, businessId) as Promise<VoiceEmergencyRule>;
}

/**
 * Delete an emergency rule
 */
export async function deleteEmergencyRule(
  ruleId: string,
  businessId: string
): Promise<boolean> {
  const supabase = createAdminClient();

  // Phrases will cascade delete due to FK constraint
  const { error } = await supabase
    .from('voice_emergency_rules')
    .delete()
    .eq('id', ruleId)
    .eq('business_id', businessId);

  if (error) {
    rulesLogger.error({ msg: 'Failed to delete emergency rule', ruleId, error });
    throw new Error('Failed to delete emergency rule');
  }

  rulesLogger.info({ msg: 'Emergency rule deleted', ruleId, businessId });
  return true;
}

/**
 * Add a phrase to an emergency rule
 */
export async function addEmergencyPhrase(
  ruleId: string,
  businessId: string,
  phrase: string,
  phraseType: PhraseType
): Promise<EmergencyPhrase> {
  const supabase = createAdminClient();

  // Verify rule belongs to business
  const { data: rule } = await supabase
    .from('voice_emergency_rules')
    .select('id')
    .eq('id', ruleId)
    .eq('business_id', businessId)
    .single();

  if (!rule) {
    throw new Error('Emergency rule not found');
  }

  const { data, error } = await supabase
    .from('voice_emergency_phrases')
    .insert({
      rule_id: ruleId,
      phrase,
      phrase_type: phraseType,
    })
    .select()
    .single();

  if (error) {
    rulesLogger.error({ msg: 'Failed to add phrase', ruleId, error });
    throw new Error('Failed to add phrase');
  }

  return data as EmergencyPhrase;
}

/**
 * Remove a phrase from an emergency rule
 */
export async function removeEmergencyPhrase(
  phraseId: string,
  businessId: string
): Promise<boolean> {
  const supabase = createAdminClient();

  // Verify phrase belongs to business via rule
  const { data: phrase } = await supabase
    .from('voice_emergency_phrases')
    .select('rule_id, voice_emergency_rules!inner(business_id)')
    .eq('id', phraseId)
    .single();

  if (!phrase || (phrase.voice_emergency_rules as any).business_id !== businessId) {
    throw new Error('Phrase not found');
  }

  const { error } = await supabase
    .from('voice_emergency_phrases')
    .delete()
    .eq('id', phraseId);

  if (error) {
    rulesLogger.error({ msg: 'Failed to remove phrase', phraseId, error });
    throw new Error('Failed to remove phrase');
  }

  return true;
}

/**
 * Get default emergency categories for initialization
 */
export function getDefaultEmergencyCategories(): string[] {
  return [
    'water_leak',
    'gas_leak',
    'no_heat',
    'no_ac',
    'electrical_hazard',
    'flooding',
    'fire_damage',
    'security_breach',
  ];
}

/**
 * Initialize default emergency rules for a business
 */
export async function initializeDefaultEmergencyRules(
  businessId: string,
  primaryContactId?: string
): Promise<VoiceEmergencyRule[]> {
  const defaultRules = [
    {
      category: 'water_leak',
      phrases: [
        { phrase: 'water everywhere', phrase_type: 'required' as PhraseType },
        { phrase: 'pipe burst', phrase_type: 'required' as PhraseType },
        { phrase: 'flooding', phrase_type: 'optional' as PhraseType },
        { phrase: 'water damage', phrase_type: 'optional' as PhraseType },
      ],
    },
    {
      category: 'gas_leak',
      phrases: [
        { phrase: 'smell gas', phrase_type: 'required' as PhraseType },
        { phrase: 'gas leak', phrase_type: 'required' as PhraseType },
        { phrase: 'rotten egg smell', phrase_type: 'optional' as PhraseType },
      ],
    },
    {
      category: 'no_heat',
      phrases: [
        { phrase: 'no heat', phrase_type: 'required' as PhraseType },
        { phrase: 'furnace not working', phrase_type: 'optional' as PhraseType },
        { phrase: 'freezing', phrase_type: 'optional' as PhraseType },
      ],
    },
    {
      category: 'electrical_hazard',
      phrases: [
        { phrase: 'sparking', phrase_type: 'required' as PhraseType },
        { phrase: 'electrical fire', phrase_type: 'required' as PhraseType },
        { phrase: 'burning smell electrical', phrase_type: 'optional' as PhraseType },
      ],
    },
  ];

  const createdRules: VoiceEmergencyRule[] = [];

  for (const ruleData of defaultRules) {
    try {
      const rule = await createEmergencyRule(businessId, {
        category: ruleData.category,
        is_enabled: true,
        caller_confirmation_enabled: true,
        keypad_override_enabled: false,
        default_primary_contact_id: primaryContactId,
        escalation_wait_minutes: 3,
        phrases: ruleData.phrases,
      });
      createdRules.push(rule);
    } catch (error) {
      // Skip if already exists
      rulesLogger.warn({ msg: 'Skipping default rule', category: ruleData.category, error });
    }
  }

  return createdRules;
}
