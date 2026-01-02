// =====================================================
// CONVERSATION & MESSAGE TYPES
// =====================================================

import type {
  MessageDirection,
  MessageSenderType,
  MessageDeliveryStatus,
  AIIntent,
} from './enums';
import type { OutreachContact } from './contacts';

export interface OutreachConversation {
  id: string;
  contact_id: string;
  campaign_id: string | null;
  status: 'active' | 'qualified' | 'scheduled' | 'closed' | 'opted_out' | 'human_takeover';
  ai_context: Record<string, unknown> | null;
  ai_extracted_data: Record<string, unknown> | null;
  human_takeover: boolean;
  human_takeover_by: string | null;
  human_takeover_at: string | null;
  human_takeover_reason: string | null;
  messages_count: number;
  started_at: string;
  last_message_at: string | null;
  created_at: string;
}

export interface OutreachMessage {
  id: string;
  conversation_id: string;
  contact_id: string;
  direction: MessageDirection;
  message_text: string;
  sender_type: MessageSenderType;
  sender_id: string | null;
  ai_intent: AIIntent | null;
  ai_confidence: number | null;
  ai_extracted: Record<string, unknown> | null;
  twilio_sid: string | null;
  status: MessageDeliveryStatus | null;
  error_message: string | null;
  error_code: string | null;
  consent_verified: boolean;
  opt_out_checked: boolean;
  within_send_window: boolean;
  sent_at: string | null;
  delivered_at: string | null;
  created_at: string;
}

export interface OutreachConversationWithMessages extends OutreachConversation {
  messages: OutreachMessage[];
  contact: OutreachContact | null;
}

export interface SendOutreachMessageInput {
  contact_id: string;
  message_text: string;
  sender_type?: MessageSenderType;
}
