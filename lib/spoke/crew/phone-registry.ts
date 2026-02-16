// =====================================================
// SPOKE - CREW PHONE REGISTRY
//
// Per Spoke Spec Section 5:
// Manage contractor phone numbers for identity resolution.
//
// Features:
// - CRUD operations for contractor_phones
// - Verification flow
// - Inactive number detection
// - Owner notification for new crew
// =====================================================

import { createAdminClient } from '@/lib/supabase/server';
import { smsLogger } from '@/lib/logger';
import type { ContractorPhone, ContractorRole } from '../types';

const registryLogger = smsLogger.child({ context: 'spoke.phone-registry' });

// =====================================================
// TYPES
// =====================================================

export interface RegisterPhoneInput {
  businessId: string;
  phoneNumber: string;
  displayName: string;
  role?: ContractorRole;
}

export interface PhoneRegistryResult {
  success: boolean;
  phone?: ContractorPhone;
  error?: string;
  isNew?: boolean;
}

// =====================================================
// PHONE REGISTRATION
// =====================================================

/**
 * Register a new contractor phone number
 */
export async function registerContractorPhone(
  input: RegisterPhoneInput
): Promise<PhoneRegistryResult> {
  const { businessId, phoneNumber, displayName, role = 'TECH' } = input;

  try {
    const supabase = createAdminClient();
    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    // Check if phone already exists for this business
    const { data: existing } = await supabase
      .from('contractor_phones')
      .select('*')
      .eq('business_id', businessId)
      .eq('phone_number', normalizedPhone)
      .single();

    if (existing) {
      // Reactivate if deactivated
      if (!existing.is_active) {
        const { data: reactivated, error: reactivateError } = await supabase
          .from('contractor_phones')
          .update({
            is_active: true,
            deactivated_at: null,
            display_name: displayName,
            role,
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (reactivateError) throw reactivateError;

        registryLogger.info({
          msg: 'Reactivated contractor phone',
          phoneId: existing.id,
          phoneNumber: normalizedPhone,
          businessId,
        });

        return {
          success: true,
          phone: mapToContractorPhone(reactivated),
          isNew: false,
        };
      }

      // Already active
      return {
        success: true,
        phone: mapToContractorPhone(existing),
        isNew: false,
      };
    }

    // Create new phone record
    const { data: newPhone, error: createError } = await supabase
      .from('contractor_phones')
      .insert({
        business_id: businessId,
        phone_number: normalizedPhone,
        display_name: displayName,
        role,
        is_verified: false,
        is_active: true,
      })
      .select()
      .single();

    if (createError) throw createError;

    registryLogger.info({
      msg: 'Registered new contractor phone',
      phoneId: newPhone.id,
      phoneNumber: normalizedPhone,
      displayName,
      businessId,
    });

    return {
      success: true,
      phone: mapToContractorPhone(newPhone),
      isNew: true,
    };

  } catch (error) {
    registryLogger.error({
      msg: 'Failed to register contractor phone',
      error: error instanceof Error ? error.message : String(error),
      phoneNumber,
      businessId,
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Registration failed',
    };
  }
}

/**
 * Update contractor phone details
 */
export async function updateContractorPhone(
  phoneId: string,
  updates: Partial<{
    displayName: string;
    role: ContractorRole;
    isVerified: boolean;
  }>
): Promise<PhoneRegistryResult> {
  try {
    const supabase = createAdminClient();

    const updateData: Record<string, any> = {};
    if (updates.displayName !== undefined) updateData.display_name = updates.displayName;
    if (updates.role !== undefined) updateData.role = updates.role;
    if (updates.isVerified !== undefined) updateData.is_verified = updates.isVerified;

    const { data, error } = await supabase
      .from('contractor_phones')
      .update(updateData)
      .eq('id', phoneId)
      .select()
      .single();

    if (error) throw error;

    registryLogger.info({
      msg: 'Updated contractor phone',
      phoneId,
      updates,
    });

    return {
      success: true,
      phone: mapToContractorPhone(data),
    };

  } catch (error) {
    registryLogger.error({
      msg: 'Failed to update contractor phone',
      error: error instanceof Error ? error.message : String(error),
      phoneId,
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Update failed',
    };
  }
}

/**
 * Deactivate a contractor phone
 */
export async function deactivateContractorPhone(
  phoneId: string,
  reason?: string
): Promise<PhoneRegistryResult> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('contractor_phones')
      .update({
        is_active: false,
        deactivated_at: new Date().toISOString(),
      })
      .eq('id', phoneId)
      .select()
      .single();

    if (error) throw error;

    registryLogger.info({
      msg: 'Deactivated contractor phone',
      phoneId,
      reason,
    });

    return {
      success: true,
      phone: mapToContractorPhone(data),
    };

  } catch (error) {
    registryLogger.error({
      msg: 'Failed to deactivate contractor phone',
      error: error instanceof Error ? error.message : String(error),
      phoneId,
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Deactivation failed',
    };
  }
}

// =====================================================
// PHONE LOOKUP
// =====================================================

/**
 * Get all contractor phones for a business
 */
export async function getContractorPhones(
  businessId: string,
  options?: { includeInactive?: boolean }
): Promise<ContractorPhone[]> {
  try {
    const supabase = createAdminClient();

    let query = supabase
      .from('contractor_phones')
      .select('*')
      .eq('business_id', businessId)
      .order('display_name', { ascending: true });

    if (!options?.includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map(mapToContractorPhone);

  } catch (error) {
    registryLogger.error({
      msg: 'Failed to fetch contractor phones',
      error: error instanceof Error ? error.message : String(error),
      businessId,
    });
    return [];
  }
}

/**
 * Get a specific contractor phone by ID
 */
export async function getContractorPhoneById(
  phoneId: string
): Promise<ContractorPhone | null> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('contractor_phones')
      .select('*')
      .eq('id', phoneId)
      .single();

    if (error) throw error;

    return mapToContractorPhone(data);

  } catch (error) {
    registryLogger.error({
      msg: 'Failed to fetch contractor phone',
      error: error instanceof Error ? error.message : String(error),
      phoneId,
    });
    return null;
  }
}

/**
 * Find contractor phone by phone number
 */
export async function findContractorByPhone(
  phoneNumber: string,
  businessId?: string
): Promise<ContractorPhone | null> {
  try {
    const supabase = createAdminClient();
    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    let query = supabase
      .from('contractor_phones')
      .select('*')
      .eq('phone_number', normalizedPhone)
      .eq('is_active', true);

    if (businessId) {
      query = query.eq('business_id', businessId);
    }

    const { data, error } = await query.single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
      throw error;
    }

    return data ? mapToContractorPhone(data) : null;

  } catch (error) {
    registryLogger.error({
      msg: 'Failed to find contractor by phone',
      error: error instanceof Error ? error.message : String(error),
      phoneNumber,
    });
    return null;
  }
}

// =====================================================
// VERIFICATION
// =====================================================

/**
 * Mark a phone as verified
 */
export async function verifyContractorPhone(
  phoneId: string
): Promise<PhoneRegistryResult> {
  return updateContractorPhone(phoneId, { isVerified: true });
}

/**
 * Flag a phone for review (suspicious activity)
 */
export async function flagPhoneForReview(
  phoneId: string,
  reason: string
): Promise<PhoneRegistryResult> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('contractor_phones')
      .update({
        flagged_for_review: true,
      })
      .eq('id', phoneId)
      .select()
      .single();

    if (error) throw error;

    registryLogger.warn({
      msg: 'Flagged contractor phone for review',
      phoneId,
      reason,
    });

    return {
      success: true,
      phone: mapToContractorPhone(data),
    };

  } catch (error) {
    registryLogger.error({
      msg: 'Failed to flag contractor phone',
      error: error instanceof Error ? error.message : String(error),
      phoneId,
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Flag failed',
    };
  }
}

// =====================================================
// ACTIVITY TRACKING
// =====================================================

/**
 * Update last used timestamp
 */
export async function recordPhoneUsage(phoneId: string): Promise<void> {
  try {
    const supabase = createAdminClient();

    await supabase
      .from('contractor_phones')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', phoneId);

  } catch (error) {
    registryLogger.warn({
      msg: 'Failed to record phone usage',
      error: error instanceof Error ? error.message : String(error),
      phoneId,
    });
  }
}

/**
 * Find inactive phones (not used in X days)
 */
export async function findInactivePhones(
  businessId: string,
  daysSinceLastUse: number = 30
): Promise<ContractorPhone[]> {
  try {
    const supabase = createAdminClient();
    const cutoffDate = new Date(Date.now() - daysSinceLastUse * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('contractor_phones')
      .select('*')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .or(`last_used_at.is.null,last_used_at.lt.${cutoffDate}`);

    if (error) throw error;

    return (data || []).map(mapToContractorPhone);

  } catch (error) {
    registryLogger.error({
      msg: 'Failed to find inactive phones',
      error: error instanceof Error ? error.message : String(error),
      businessId,
    });
    return [];
  }
}

// =====================================================
// HELPERS
// =====================================================

/**
 * Normalize phone number to E.164 format
 */
export function normalizePhoneNumber(phone: string): string {
  // Remove all non-numeric characters
  const digits = phone.replace(/\D/g, '');

  // Handle US numbers
  if (digits.length === 10) {
    return `+1${digits}`;
  }

  // Handle numbers with country code
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  // Return with + prefix if not present
  return digits.startsWith('+') ? phone : `+${digits}`;
}

/**
 * Map database record to ContractorPhone type
 */
function mapToContractorPhone(data: any): ContractorPhone {
  return {
    id: data.id,
    business_id: data.business_id,
    phone_number: data.phone_number,
    display_name: data.display_name,
    role: data.role,
    is_verified: data.is_verified,
    verified_at: data.verified_at,
    is_active: data.is_active,
    deactivated_at: data.deactivated_at,
    flagged_for_review: data.flagged_for_review,
    last_used_at: data.last_used_at ? new Date(data.last_used_at).toISOString() : null,
    total_updates: data.total_updates,
    created_at: new Date(data.created_at).toISOString(),
    updated_at: new Date(data.updated_at).toISOString(),
  };
}
