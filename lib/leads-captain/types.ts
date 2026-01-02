// Leads Captain AI Conversation Types
// Based on AI Conversation Specification v1.4
// Formerly known as NeverMiss

// Conversation States (State Machine)
export type ConversationState =
  | 'active'
  | 'greeting_sent'
  | 'capturing_need'
  | 'capturing_address'
  | 'capturing_urgency'
  | 'capturing_time'
  | 'confirming'
  | 'offering_slots'
  | 'awaiting_booking_confirm'
  | 'booking_confirmed'
  | 'awaiting_owner'
  | 'lead_captured'
  | 'completed'
  | 'abandoned'
  | 'opted_out'
  | 'blocked_spam';

// Terminal states that end the conversation
export const TERMINAL_STATES: ConversationState[] = [
  'lead_captured',
  'booking_confirmed',
  'completed',
  'abandoned',
  'opted_out',
  'blocked_spam'
];

// Urgency Levels
export type UrgencyLevel = 'emergency' | 'high' | 'medium' | 'low';

// Tone Settings
export type ToneSetting = 'professional' | 'friendly' | 'casual';

// Greeting Style
export type GreetingStyle = 'apologetic' | 'direct';

// Business Settings (from leads_captain_settings)
export interface BusinessSettings {
  businessId: string;
  businessName: string;
  ownerName: string;
  servicesOffered: string[];
  serviceArea: string;
  phoneNumber: string;
  forwardTo: string;

  // Conversation settings
  tone: ToneSetting;
  greetingStyle: GreetingStyle;
  greetingMessage: string;
  useOwnerName: boolean;
  maxMessages: number;
  customPrompt?: string;

  // Business hours
  businessHoursStart: string; // HH:MM format
  businessHoursEnd: string;   // HH:MM format
  businessDays: number[];     // 0=Sun, 6=Sat
  quietHoursStart: string;
  quietHoursEnd: string;
  timezone: string;

  // After hours
  afterHoursEnabled: boolean;
  afterHoursMessage: string;

  // Emergency keywords
  emergencyKeywords: string[];
  emergencyAlwaysNotify: boolean;
  afterHoursNotify: boolean;

  // Notifications
  notifySms: boolean;
  notifyEmail: boolean;
  notifyPush: boolean;

  // Plan features
  calendarBookingEnabled: boolean;
  crmIntegrationEnabled: boolean;
  autoCreateJobs: boolean;
}

// Extracted Information from Conversation
export interface ExtractedInfo {
  serviceNeeded: string | null;
  address: string | null;
  addressParsed?: {
    street: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
  };
  urgency: UrgencyLevel | null;
  urgencyReason: string | null;
  preferredTime: string | null;
  customerName: string | null;
  additionalNotes: string | null;
}

// AI Actions to take
export interface AIActions {
  notifyOwner: boolean;
  notifyUrgency: UrgencyLevel | null;
  offerSlots: boolean;
  endConversation: boolean;
  handoffReason: string | null;
  createJob: boolean;
  flagWrongNumber: boolean;
  flagHostile: boolean;
}

// AI Response structure (JSON output from Claude)
export interface AIResponse {
  reply_text: string;
  state: ConversationState;
  extracted: {
    service_needed: string | null;
    address: string | null;
    urgency: UrgencyLevel | null;
    urgency_reason: string | null;
    preferred_time: string | null;
    customer_name: string | null;
    additional_notes: string | null;
  };
  actions: {
    notify_owner: boolean;
    notify_urgency: UrgencyLevel | null;
    offer_slots: boolean;
    end_conversation: boolean;
    handoff_reason: string | null;
    create_job?: boolean;
    flag_wrong_number?: boolean;
    flag_hostile?: boolean;
  };
  confidence: {
    service_needed?: number;
    address?: number;
    urgency?: number;
    preferred_time?: number;
    customer_name?: number;
  };
}

// Conversation Message
export interface ConversationMessage {
  id: string;
  role: 'assistant' | 'customer' | 'system';
  content: string;
  timestamp: Date;
  twilioSid?: string;
  status?: 'queued' | 'sent' | 'delivered' | 'failed' | 'undelivered';
}

// Full Conversation State
export interface Conversation {
  id: string;
  businessId: string;
  customerId?: string;
  customerPhone: string;
  businessPhone: string;

  // State machine
  state: ConversationState;
  previousStates: ConversationState[];

  // Captured information
  extracted: ExtractedInfo;

  // Message history
  messages: ConversationMessage[];
  messageCount: number;
  aiMessagesSinceResponse: number;

  // Timing
  startedAt: Date;
  lastCustomerMessageAt?: Date;
  lastAiMessageAt?: Date;
  completedAt?: Date;
  abandonedAt?: Date;

  // Flags
  isAfterHours: boolean;
  isEmergency: boolean;
  ownerNotified: boolean;
  ownerNotifiedAt?: Date;

  // AI tracking
  aiModel: string;

  // Metadata
  metadata?: Record<string, unknown>;
}

// Lead Data Structure (for captured leads)
export interface CapturedLead {
  leadId: string;
  businessId: string;
  capturedAt: Date;
  source: 'missed_call' | 'inbound_sms';

  customer: {
    phone: string;
    name: string | null;
    optedOut: boolean;
    existingCustomerId?: string;
  };

  serviceRequest: {
    serviceNeeded: string;
    address: {
      raw: string;
      street: string | null;
      city: string | null;
      state: string | null;
      zip: string | null;
    };
    urgency: UrgencyLevel;
    urgencyReason: string | null;
    preferredTime: string | null;
    additionalNotes: string | null;
  };

  conversation: {
    id: string;
    messageCount: number;
    durationSeconds: number;
    smsCount: number;
    startedAt: Date;
    endedAt: Date;
    messages: ConversationMessage[];
  };

  status: 'new' | 'contacted' | 'scheduled' | 'converted' | 'lost';
  ownerNotifiedAt?: Date;
  ownerNotificationMethod: ('sms' | 'email' | 'push')[];

  // CRM integration
  jobId?: string;
  calendarEventId?: string;
}

// Owner Notification Types
export interface OwnerNotification {
  type: 'sms' | 'email' | 'push';
  businessId: string;
  recipientPhone?: string;
  recipientEmail?: string;

  // Content
  subject?: string;
  body: string;
  urgency: UrgencyLevel;

  // Lead info
  leadId: string;
  customerPhone: string;
  serviceNeeded: string;
  address: string;
  urgencyReason?: string;
  preferredTime?: string;

  // Transcript
  conversationId: string;
  transcript?: string;

  // Status
  sentAt?: Date;
  deliveredAt?: Date;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
}

// Twilio Webhook Payloads
export interface TwilioInboundSmsPayload {
  MessageSid: string;
  SmsSid: string;
  AccountSid: string;
  MessagingServiceSid?: string;
  From: string;
  To: string;
  Body: string;
  NumMedia: string;
  NumSegments: string;
  FromCity?: string;
  FromState?: string;
  FromZip?: string;
  FromCountry?: string;
  ToCity?: string;
  ToState?: string;
  ToZip?: string;
  ToCountry?: string;
}

export interface TwilioStatusWebhookPayload {
  MessageSid: string;
  MessageStatus: 'queued' | 'sent' | 'delivered' | 'failed' | 'undelivered';
  ErrorCode?: string;
  ErrorMessage?: string;
  To: string;
  From: string;
}

export interface TwilioMissedCallPayload {
  CallSid: string;
  AccountSid: string;
  From: string;
  To: string;
  CallStatus: 'no-answer' | 'busy' | 'canceled' | 'failed';
  Direction: string;
  Timestamp: string;
  CallerName?: string;
  FromCity?: string;
  FromState?: string;
  FromZip?: string;
  FromCountry?: string;
}

// Compliance Keywords
export const STOP_KEYWORDS = ['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'];
export const HELP_KEYWORDS = ['HELP', 'INFO'];
export const START_KEYWORDS = ['START', 'YES', 'UNSTOP'];

// Safety Keywords (always emergency unless negated)
export const SAFETY_KEYWORDS = [
  'gas smell',
  'gas leak',
  'flooding',
  'burst pipe',
  'sparking',
  'fire',
  'smoke',
  'electrical fire',
  'sewage backup',
  'carbon monoxide'
];

// Negation words to check before safety keywords
export const NEGATION_WORDS = [
  'no',
  'not',
  "don't",
  "doesn't",
  "didn't",
  "isn't",
  "wasn't",
  "aren't",
  "weren't",
  'without',
  'never',
  "won't",
  "can't",
  'none'
];

// Contextual emergency keywords
export const CONTEXTUAL_EMERGENCY_KEYWORDS = [
  'no heat',
  'no hot water',
  'no ac',
  'no air conditioning',
  'no cooling',
  'no power',
  'no electricity'
];

// General urgency downgrade phrases
export const URGENCY_DOWNGRADE_PHRASES = [
  'not urgent',
  'no rush',
  'no hurry',
  'when you can',
  'whenever',
  'not an emergency',
  'take your time'
];

// Quote/estimate keywords (low urgency)
export const QUOTE_KEYWORDS = [
  'quote',
  'estimate',
  'how much',
  'price',
  'pricing',
  'cost',
  'free estimate',
  'ballpark'
];
