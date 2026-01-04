// =====================================================
// CONSENT STATE MACHINE
// Manages relationship states per Section 4.1 of Product Identity
// States: Unknown → Inbound → Established → Explicit → Opted-Out
// =====================================================

import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
const consentLogger = logger.child({ context: 'consent.state-machine' });

/**
 * Consent/Relationship states per Section 4.1
 */
export type RelationshipState =
  | 'unknown'    // No prior contact, no consent
  | 'inbound'    // Customer reached out first (implied consent for reply)
  | 'established' // Two-way communication established
  | 'explicit'   // Explicit consent marked (e.g., form, verbal confirmation)
  | 'opted_out'; // Customer has opted out (STOP, UNSUBSCRIBE, etc.)

/**
 * State transition rules
 * Determines valid transitions between states
 */
const STATE_TRANSITIONS: Record<RelationshipState, RelationshipState[]> = {
  unknown: ['inbound', 'explicit', 'opted_out'],
  inbound: ['established', 'explicit', 'opted_out'],
  established: ['explicit', 'opted_out'],
  explicit: ['opted_out'],
  opted_out: ['explicit'], // Only explicit consent can revive after opt-out
};

/**
 * Check if a state transition is valid
 */
export function isValidTransition(
  currentState: RelationshipState,
  newState: RelationshipState
): boolean {
  if (currentState === newState) return true; // Same state is always valid
  return STATE_TRANSITIONS[currentState]?.includes(newState) ?? false;
}

/**
 * Get the next state based on an event
 */
export function getNextState(
  currentState: RelationshipState,
  event: 'inbound_message' | 'outbound_message' | 'explicit_consent' | 'opt_out'
): RelationshipState {
  switch (event) {
    case 'inbound_message':
      // Inbound message upgrades unknown to inbound
      if (currentState === 'unknown') return 'inbound';
      return currentState;

    case 'outbound_message':
      // Outbound message after inbound upgrades to established
      if (currentState === 'inbound') return 'established';
      return currentState;

    case 'explicit_consent':
      // Explicit consent always upgrades to explicit
      if (currentState !== 'opted_out') return 'explicit';
      return 'explicit'; // Can revive from opt-out with explicit consent

    case 'opt_out':
      // Opt-out always moves to opted_out
      return 'opted_out';

    default:
      return currentState;
  }
}

/**
 * OPT-OUT detection keywords per TCPA compliance
 */
export const OPT_OUT_KEYWORDS = [
  'STOP',
  'STOPALL',
  'UNSUBSCRIBE',
  'CANCEL',
  'END',
  'QUIT',
];

/**
 * Check if a message contains an opt-out keyword
 */
export function isOptOutMessage(message: string): boolean {
  const normalized = message.trim().toUpperCase();
  return OPT_OUT_KEYWORDS.includes(normalized);
}

/**
 * OPT-IN detection keywords
 */
export const OPT_IN_KEYWORDS = ['START', 'YES', 'UNSTOP'];

/**
 * Check if a message contains an opt-in keyword
 */
export function isOptInMessage(message: string): boolean {
  const normalized = message.trim().toUpperCase();
  return OPT_IN_KEYWORDS.includes(normalized);
}

/**
 * Update relationship state for a contact in the database
 */
export async function updateContactRelationshipState(
  contactId: string,
  newState: RelationshipState,
  tableName: 'outreach_contacts' | 'leads' | 'customers' = 'outreach_contacts'
): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from(tableName)
    .update({
      relationship_state: newState,
      relationship_state_updated_at: new Date().toISOString(),
    })
    .eq('id', contactId);

  if (error) {
    consentLogger.error({
      msg: 'Error updating relationship state',
      tableName,
      error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) },
    });
    throw error;
  }
}

/**
 * Get current relationship state for a contact
 */
export async function getContactRelationshipState(
  contactId: string,
  tableName: 'outreach_contacts' | 'leads' | 'customers' = 'outreach_contacts'
): Promise<RelationshipState> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from(tableName)
    .select('relationship_state')
    .eq('id', contactId)
    .single();

  if (error) {
    consentLogger.error({
      msg: 'Error getting relationship state',
      tableName,
      error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) },
    });
    return 'unknown';
  }

  return (data?.relationship_state as RelationshipState) || 'unknown';
}

/**
 * Process a message and update relationship state accordingly
 */
export async function processMessageForConsent(
  contactId: string,
  direction: 'inbound' | 'outbound',
  messageContent: string,
  tableName: 'outreach_contacts' | 'leads' | 'customers' = 'outreach_contacts'
): Promise<{ newState: RelationshipState; wasOptOut: boolean; wasOptIn: boolean }> {
  const currentState = await getContactRelationshipState(contactId, tableName);

  let newState = currentState;
  let wasOptOut = false;
  let wasOptIn = false;

  if (direction === 'inbound') {
    // Check for opt-out
    if (isOptOutMessage(messageContent)) {
      newState = 'opted_out';
      wasOptOut = true;
    }
    // Check for opt-in (explicit consent after opt-out)
    else if (isOptInMessage(messageContent) && currentState === 'opted_out') {
      newState = 'explicit';
      wasOptIn = true;
    }
    // Regular inbound message
    else {
      newState = getNextState(currentState, 'inbound_message');
    }
  } else {
    // Outbound message
    newState = getNextState(currentState, 'outbound_message');
  }

  // Update state if changed
  if (newState !== currentState) {
    await updateContactRelationshipState(contactId, newState, tableName);
  }

  return { newState, wasOptOut, wasOptIn };
}

// =====================================================
// AUTOMATION PERMISSION MATRIX (Appendix A.2)
// Defines what's allowed based on consent state and send type
// =====================================================

export type SendType = 'manual' | 'auto_user' | 'auto_system';

export interface PermissionResult {
  allowed: boolean;
  requiresConfirmation: boolean;
  reason?: string;
}

/**
 * Automation Permission Matrix per Appendix A.2
 *
 * Consent State    | Manual Send      | Auto (User Set) | Auto (System)
 * -----------------|------------------|-----------------|---------------
 * Unknown          | Confirm required | Blocked         | Blocked
 * Inbound          | Allowed          | Allowed         | Blocked
 * Established      | Allowed          | Allowed         | Allowed
 * Explicit         | Allowed          | Allowed         | Allowed
 * Opted-Out        | Blocked          | Blocked         | Blocked
 */
export function checkSendPermission(
  state: RelationshipState,
  sendType: SendType
): PermissionResult {
  // Opted-out is always blocked
  if (state === 'opted_out') {
    return {
      allowed: false,
      requiresConfirmation: false,
      reason: 'Contact has opted out of messaging. No messages permitted.',
    };
  }

  switch (state) {
    case 'unknown':
      if (sendType === 'manual') {
        return {
          allowed: true,
          requiresConfirmation: true,
          reason: 'This contact has no prior message history. Confirm you have a legitimate business relationship before sending.',
        };
      }
      // Automation blocked for unknown contacts
      return {
        allowed: false,
        requiresConfirmation: false,
        reason: 'Automated messages cannot be sent to contacts with no prior relationship. Wait for inbound contact or add explicit consent.',
      };

    case 'inbound':
      if (sendType === 'auto_system') {
        return {
          allowed: false,
          requiresConfirmation: false,
          reason: 'System automations require established or explicit consent. This contact has only initiated contact.',
        };
      }
      // Manual and user-set automations allowed
      return { allowed: true, requiresConfirmation: false };

    case 'established':
    case 'explicit':
      // All send types allowed
      return { allowed: true, requiresConfirmation: false };

    default:
      return {
        allowed: false,
        requiresConfirmation: false,
        reason: 'Unknown consent state.',
      };
  }
}

/**
 * Check if messaging is allowed based on consent state (legacy simple check)
 * @deprecated Use checkSendPermission for full matrix compliance
 */
export function canSendMessage(state: RelationshipState): boolean {
  // Cannot send to opted-out contacts
  if (state === 'opted_out') return false;

  // Unknown requires either explicit consent or waiting for inbound
  // For now, we allow sending to unknown (first contact)
  // but the message should include opt-out instructions
  return true;
}

/**
 * Check if automation is allowed for a contact
 */
export function canSendAutomation(
  state: RelationshipState,
  isUserConfigured: boolean
): PermissionResult {
  const sendType: SendType = isUserConfigured ? 'auto_user' : 'auto_system';
  return checkSendPermission(state, sendType);
}

/**
 * Check if manual message is allowed (may require confirmation)
 */
export function canSendManual(state: RelationshipState): PermissionResult {
  return checkSendPermission(state, 'manual');
}

/**
 * Get consent state display information
 */
export function getConsentStateInfo(state: RelationshipState): {
  label: string;
  description: string;
  color: string;
  canMessage: boolean;
} {
  switch (state) {
    case 'unknown':
      return {
        label: 'Unknown',
        description: 'No prior contact - first-party data only',
        color: 'gray',
        canMessage: true, // Allowed with opt-out instructions
      };
    case 'inbound':
      return {
        label: 'Inbound',
        description: 'Customer reached out first - implied consent for reply',
        color: 'blue',
        canMessage: true,
      };
    case 'established':
      return {
        label: 'Established',
        description: 'Two-way communication established',
        color: 'green',
        canMessage: true,
      };
    case 'explicit':
      return {
        label: 'Explicit Consent',
        description: 'Customer has explicitly consented to messaging',
        color: 'purple',
        canMessage: true,
      };
    case 'opted_out':
      return {
        label: 'Opted Out',
        description: 'Customer has opted out - do not message',
        color: 'red',
        canMessage: false,
      };
  }
}

/**
 * Inherit consent state when lead converts to customer
 * Per Section 4.3 - preserve consent through conversion
 */
export async function inheritConsentOnConversion(
  leadId: string,
  customerId: string
): Promise<void> {
  const supabase = createAdminClient();

  // Get lead's consent state
  const { data: lead } = await supabase
    .from('leads')
    .select('relationship_state, relationship_state_updated_at')
    .eq('id', leadId)
    .single();

  if (!lead?.relationship_state) return;

  // Copy to customer
  await supabase
    .from('customers')
    .update({
      relationship_state: lead.relationship_state,
      relationship_state_updated_at: lead.relationship_state_updated_at,
    })
    .eq('id', customerId);

  // Log the conversion in audit
  await supabase.from('activity_log').insert({
    entity_type: 'customer',
    entity_id: customerId,
    action: 'consent_inherited',
    details: {
      source_lead_id: leadId,
      inherited_state: lead.relationship_state,
    },
  });
}
