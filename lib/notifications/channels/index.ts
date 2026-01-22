// =====================================================
// NOTIFICATION CHANNELS INDEX
// Export all notification channel integrations
// =====================================================

export { SlackNotificationChannel, createSlackChannel } from './slack';
export { WhatsAppNotificationChannel, createWhatsAppChannel, isWhatsAppConfigured } from './whatsapp';

// Channel types for configuration
export type NotificationChannel = 'email' | 'sms' | 'push' | 'slack' | 'whatsapp';

export interface NotificationChannelConfig {
  channel: NotificationChannel;
  enabled: boolean;
  webhookUrl?: string; // For Slack
  phoneNumber?: string; // For WhatsApp
  defaultDestination?: string; // Channel/number to send to
}

// Helper to get enabled channels from business settings
export function getEnabledChannels(settings: {
  email_notifications?: boolean;
  sms_notifications?: boolean;
  push_notifications?: boolean;
  slack_webhook_url?: string;
  whatsapp_enabled?: boolean;
}): NotificationChannel[] {
  const channels: NotificationChannel[] = [];

  if (settings.email_notifications !== false) channels.push('email');
  if (settings.sms_notifications !== false) channels.push('sms');
  if (settings.push_notifications !== false) channels.push('push');
  if (settings.slack_webhook_url) channels.push('slack');
  if (settings.whatsapp_enabled) channels.push('whatsapp');

  return channels;
}
