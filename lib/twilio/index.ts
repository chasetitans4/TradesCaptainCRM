// =====================================================
// TWILIO INTEGRATION - EXPORTS
// =====================================================

// Client
export { twilioClient, messagingServiceSid, getWebhookUrl, validateTwilioSignature } from './client';

// Phone Numbers
export {
  listAvailableNumbers,
  provisionPhoneNumber,
  releasePhoneNumber,
  updatePhoneWebhooks,
} from './phone-numbers';

// SMS
export {
  sendSMS,
  formatPhoneE164,
  formatPhoneDisplay,
  getOrCreateConversation,
  saveIncomingMessage,
  updateMessageStatus,
  flagForHumanAttention,
  clearHumanAttention,
} from './sms';

// AI Responder
export {
  isHumanHandoffRequest,
  shouldAutoRespond,
  generateAIResponse,
  handleIncomingWithAI,
} from './ai-responder';
