// =====================================================
// SPOKE - IDENTITY RESOLVER
//
// Per Spoke Spec Section 5.2:
// Resolve caller identity from phone number.
//
// Flow:
// 1. Incoming call → lookup phone number
// 2. Known → return contractor identity
// 3. Unknown → handle first-time caller flow
// =====================================================

import { createAdminClient } from '@/lib/supabase/server';
import { smsLogger } from '@/lib/logger';
import { sendSMS } from '@/lib/twilio/sms';
import type { ContractorPhone, ContractorRole } from '../types';
import {
  findContractorByPhone,
  registerContractorPhone,
  recordPhoneUsage,
  normalizePhoneNumber,
} from './phone-registry';

const identityLogger = smsLogger.child({ context: 'spoke.identity-resolver' });

// =====================================================
// TYPES
// =====================================================

export interface IdentityResolution {
  /** Whether identity was resolved */
  resolved: boolean;

  /** The resolved contractor (if found) */
  contractor: ContractorPhone | null;

  /** The business ID for this contractor */
  businessId: string | null;

  /** Whether this is a new/unknown caller */
  isNewCaller: boolean;

  /** Whether caller needs verification */
  needsVerification: boolean;

  /** Error message if resolution failed */
  error?: string;
}

export interface FirstTimeCallerResult {
  /** Whether first-time handling succeeded */
  success: boolean;

  /** Created provisional record (if auto-create enabled) */
  provisionalPhone?: ContractorPhone;

  /** Message sent to caller */
  messageSent?: string;

  /** Error if handling failed */
  error?: string;
}

// =====================================================
// IDENTITY RESOLUTION
// =====================================================

/**
 * Resolve caller identity from phone number
 *
 * @param phoneNumber - Incoming caller's phone number
 * @param businessId - Optional business ID to scope search
 */
export async function resolveCallerIdentity(
  phoneNumber: string,
  businessId?: string
): Promise<IdentityResolution> {
  const startTime = Date.now();

  try {
    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    // Look up contractor by phone
    const contractor = await findContractorByPhone(normalizedPhone, businessId);

    if (contractor) {
      // Known caller - record usage and return
      await recordPhoneUsage(contractor.id);

      identityLogger.info({
        msg: 'Caller identity resolved',
        phoneNumber: normalizedPhone,
        contractorId: contractor.id,
        displayName: contractor.display_name,
        businessId: contractor.business_id,
        latencyMs: Date.now() - startTime,
      });

      return {
        resolved: true,
        contractor,
        businessId: contractor.business_id,
        isNewCaller: false,
        needsVerification: !contractor.is_verified,
      };
    }

    // Unknown caller
    identityLogger.info({
      msg: 'Unknown caller',
      phoneNumber: normalizedPhone,
      businessId,
      latencyMs: Date.now() - startTime,
    });

    return {
      resolved: false,
      contractor: null,
      businessId: null,
      isNewCaller: true,
      needsVerification: true,
    };

  } catch (error) {
    identityLogger.error({
      msg: 'Identity resolution error',
      error: error instanceof Error ? error.message : String(error),
      phoneNumber,
      latencyMs: Date.now() - startTime,
    });

    return {
      resolved: false,
      contractor: null,
      businessId: null,
      isNewCaller: false,
      needsVerification: false,
      error: error instanceof Error ? error.message : 'Resolution failed',
    };
  }
}

/**
 * Resolve identity from spoke_updates record
 * Used when we already have a contractor_phone_id
 */
export async function resolveFromPhoneId(
  contractorPhoneId: string
): Promise<IdentityResolution> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('contractor_phones')
      .select('*')
      .eq('id', contractorPhoneId)
      .single();

    if (error || !data) {
      return {
        resolved: false,
        contractor: null,
        businessId: null,
        isNewCaller: false,
        needsVerification: false,
        error: 'Contractor phone not found',
      };
    }

    const contractor: ContractorPhone = {
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

    return {
      resolved: true,
      contractor,
      businessId: contractor.business_id,
      isNewCaller: false,
      needsVerification: !contractor.is_verified,
    };

  } catch (error) {
    return {
      resolved: false,
      contractor: null,
      businessId: null,
      isNewCaller: false,
      needsVerification: false,
      error: error instanceof Error ? error.message : 'Resolution failed',
    };
  }
}

// =====================================================
// FIRST-TIME CALLER HANDLING
// =====================================================

/**
 * Handle a first-time caller
 *
 * Options:
 * 1. Auto-create provisional record (if business allows)
 * 2. Reject and send instructions
 * 3. Notify business owner
 */
export async function handleFirstTimeCaller(
  phoneNumber: string,
  options: {
    businessId?: string;
    autoCreate?: boolean;
    notifyOwner?: boolean;
  }
): Promise<FirstTimeCallerResult> {
  const normalizedPhone = normalizePhoneNumber(phoneNumber);

  try {
    // If no business context, we can't auto-create
    if (!options.businessId) {
      identityLogger.warn({
        msg: 'First-time caller without business context',
        phoneNumber: normalizedPhone,
      });

      return {
        success: false,
        error: 'Cannot identify business for new caller',
      };
    }

    // Check business settings for auto-create
    const supabase = createAdminClient();
    const { data: business } = await supabase
      .from('businesses')
      .select('spoke_auto_create_crew, owner_phone')
      .eq('id', options.businessId)
      .single();

    const shouldAutoCreate = options.autoCreate ?? business?.spoke_auto_create_crew ?? false;

    if (shouldAutoCreate) {
      // Auto-create provisional record
      const result = await registerContractorPhone({
        businessId: options.businessId,
        phoneNumber: normalizedPhone,
        displayName: `New Caller (${normalizedPhone.slice(-4)})`,
        role: 'TECH',
      });

      if (!result.success || !result.phone) {
        return {
          success: false,
          error: result.error || 'Failed to create provisional record',
        };
      }

      // Send welcome/setup SMS
      const welcomeMessage = `Welcome to Spoke! We've registered your number. ` +
        `Reply with your name to complete setup, or contact your admin.`;

      await sendSMS({
        to: normalizedPhone,
        body: welcomeMessage,
        businessId: options.businessId!,
      });

      identityLogger.info({
        msg: 'Created provisional record for first-time caller',
        phoneNumber: normalizedPhone,
        phoneId: result.phone.id,
        businessId: options.businessId,
      });

      // Notify owner if requested
      if (options.notifyOwner && business?.owner_phone) {
        await notifyOwnerOfNewCrew(
          business.owner_phone,
          normalizedPhone,
          options.businessId
        );
      }

      return {
        success: true,
        provisionalPhone: result.phone,
        messageSent: welcomeMessage,
      };
    }

    // Not auto-creating - send rejection message
    const rejectionMessage = `This number is not registered with Spoke. ` +
      `Please contact your administrator to be added.`;

    await sendSMS({
      to: normalizedPhone,
      body: rejectionMessage,
      businessId: options.businessId!,
    });

    // Notify owner
    if (options.notifyOwner && business?.owner_phone) {
      await notifyOwnerOfNewCrew(
        business.owner_phone,
        normalizedPhone,
        options.businessId
      );
    }

    identityLogger.info({
      msg: 'Rejected first-time caller',
      phoneNumber: normalizedPhone,
      businessId: options.businessId,
    });

    return {
      success: false,
      messageSent: rejectionMessage,
      error: 'Number not registered',
    };

  } catch (error) {
    identityLogger.error({
      msg: 'Error handling first-time caller',
      error: error instanceof Error ? error.message : String(error),
      phoneNumber: normalizedPhone,
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Handling failed',
    };
  }
}

/**
 * Process name setup reply from first-time caller
 */
export async function processNameSetup(
  phoneNumber: string,
  name: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient();
    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    // Find the provisional record
    const { data, error } = await supabase
      .from('contractor_phones')
      .select('id, business_id')
      .eq('phone_number', normalizedPhone)
      .single();

    if (error || !data) {
      return { success: false, error: 'Phone not found' };
    }

    // Update with provided name
    await supabase
      .from('contractor_phones')
      .update({
        display_name: name.trim(),
        is_verified: true,
      })
      .eq('id', data.id);

    // Send confirmation
    await sendSMS({
      to: normalizedPhone,
      body: `Thanks ${name.trim()}! You're all set. Call or text anytime to log job updates.`,
      businessId: data.business_id,
    });

    identityLogger.info({
      msg: 'Name setup completed',
      phoneNumber: normalizedPhone,
      name: name.trim(),
    });

    return { success: true };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Setup failed',
    };
  }
}

// =====================================================
// OWNER NOTIFICATIONS
// =====================================================

/**
 * Notify business owner of new crew member attempt
 */
async function notifyOwnerOfNewCrew(
  ownerPhone: string,
  newCallerPhone: string,
  businessId: string
): Promise<void> {
  try {
    const message = `New caller attempted Spoke: ${newCallerPhone}. ` +
      `Reply ADD to register or BLOCK to reject.`;

    await sendSMS({
      to: ownerPhone,
      body: message,
      businessId,
    });

    identityLogger.info({
      msg: 'Notified owner of new crew attempt',
      ownerPhone,
      newCallerPhone,
      businessId,
    });

  } catch (error) {
    identityLogger.error({
      msg: 'Failed to notify owner',
      error: error instanceof Error ? error.message : String(error),
      ownerPhone,
      newCallerPhone,
    });
  }
}

/**
 * Process owner's response to new crew notification
 */
export async function processOwnerCrewResponse(
  ownerPhone: string,
  response: string,
  newCallerPhone: string
): Promise<{ success: boolean; action: string; error?: string }> {
  const upperResponse = response.trim().toUpperCase();

  try {
    const supabase = createAdminClient();

    // Find the business for this owner
    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_phone', ownerPhone)
      .single();

    if (!business) {
      return { success: false, action: 'none', error: 'Business not found' };
    }

    if (upperResponse === 'ADD' || upperResponse === 'YES') {
      // Register the new caller
      const result = await registerContractorPhone({
        businessId: business.id,
        phoneNumber: newCallerPhone,
        displayName: `New Tech (${newCallerPhone.slice(-4)})`,
        role: 'TECH',
      });

      if (result.success) {
        await sendSMS({
          to: newCallerPhone,
          body: 'You have been added to Spoke! Call in anytime to log job updates.',
          businessId: business.id,
        });

        return { success: true, action: 'added' };
      }

      return { success: false, action: 'none', error: result.error };
    }

    if (upperResponse === 'BLOCK' || upperResponse === 'NO') {
      // Note: In production, you might add to a blocklist
      identityLogger.info({
        msg: 'Owner blocked new caller',
        ownerPhone,
        newCallerPhone,
        businessId: business.id,
      });

      return { success: true, action: 'blocked' };
    }

    return { success: false, action: 'none', error: 'Unknown response' };

  } catch (error) {
    return {
      success: false,
      action: 'none',
      error: error instanceof Error ? error.message : 'Processing failed',
    };
  }
}

// =====================================================
// SECURITY
// =====================================================

/**
 * Check if a phone number is blocked
 */
export async function isPhoneBlocked(
  phoneNumber: string,
  businessId: string
): Promise<boolean> {
  try {
    const supabase = createAdminClient();
    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    const { data } = await supabase
      .from('contractor_phones')
      .select('id, is_active, flagged_for_review')
      .eq('phone_number', normalizedPhone)
      .eq('business_id', businessId)
      .single();

    // Blocked if explicitly deactivated or flagged
    return data ? (!data.is_active || data.flagged_for_review) : false;

  } catch {
    return false;
  }
}

/**
 * Block a phone number
 */
export async function blockPhoneNumber(
  phoneNumber: string,
  businessId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient();
    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    const { data } = await supabase
      .from('contractor_phones')
      .select('id')
      .eq('phone_number', normalizedPhone)
      .eq('business_id', businessId)
      .single();

    if (data) {
      await supabase
        .from('contractor_phones')
        .update({
          is_active: false,
          flagged_for_review: true,
          deactivated_at: new Date().toISOString(),
        })
        .eq('id', data.id);
    }

    identityLogger.warn({
      msg: 'Blocked phone number',
      phoneNumber: normalizedPhone,
      businessId,
      reason,
    });

    return { success: true };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Block failed',
    };
  }
}
