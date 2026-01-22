// =====================================================
// WHATSAPP NOTIFICATION CHANNEL
// Send messages via WhatsApp Business API (via Twilio)
// =====================================================

import { apiLogger } from '@/lib/logger';

interface WhatsAppMessage {
  to: string; // E.164 format
  body?: string;
  templateName?: string;
  templateParams?: Record<string, string>;
  mediaUrl?: string;
}

interface WhatsAppConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string; // WhatsApp Business number
  messagingServiceSid?: string;
}

interface WhatsAppTemplateMessage {
  to: string;
  templateName: string;
  language: string;
  components: Array<{
    type: 'body' | 'header' | 'button';
    parameters: Array<{
      type: 'text' | 'image' | 'document' | 'video';
      text?: string;
      image?: { link: string };
    }>;
  }>;
}

export class WhatsAppNotificationChannel {
  private config: WhatsAppConfig;
  private twilioClient: any;

  constructor(config: WhatsAppConfig) {
    this.config = config;
  }

  private async getClient() {
    if (!this.twilioClient) {
      const twilio = await import('twilio');
      this.twilioClient = twilio.default(this.config.accountSid, this.config.authToken);
    }
    return this.twilioClient;
  }

  /**
   * Format phone number for WhatsApp
   */
  private formatWhatsAppNumber(phone: string): string {
    // Remove all non-numeric characters
    const cleaned = phone.replace(/\D/g, '');

    // Ensure E.164 format with whatsapp: prefix
    if (cleaned.startsWith('1') && cleaned.length === 11) {
      return `whatsapp:+${cleaned}`;
    } else if (cleaned.length === 10) {
      return `whatsapp:+1${cleaned}`;
    }

    return `whatsapp:+${cleaned}`;
  }

  /**
   * Send a simple text message
   */
  async sendMessage(to: string, body: string): Promise<{ success: boolean; sid?: string; error?: string }> {
    try {
      const client = await this.getClient();

      const message = await client.messages.create({
        from: `whatsapp:${this.config.fromNumber}`,
        to: this.formatWhatsAppNumber(to),
        body,
      });

      apiLogger.info({ msg: 'WhatsApp message sent', sid: message.sid, to });

      return { success: true, sid: message.sid };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      apiLogger.error({ msg: 'WhatsApp send failed', error: errorMessage, to });
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Send a message with media (image, video, document)
   */
  async sendMediaMessage(
    to: string,
    body: string,
    mediaUrl: string
  ): Promise<{ success: boolean; sid?: string; error?: string }> {
    try {
      const client = await this.getClient();

      const message = await client.messages.create({
        from: `whatsapp:${this.config.fromNumber}`,
        to: this.formatWhatsAppNumber(to),
        body,
        mediaUrl: [mediaUrl],
      });

      return { success: true, sid: message.sid };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      apiLogger.error({ msg: 'WhatsApp media send failed', error: errorMessage });
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Send appointment reminder
   */
  async sendAppointmentReminder(
    to: string,
    data: {
      customerName: string;
      businessName: string;
      date: string;
      time: string;
      serviceType?: string;
      address?: string;
    }
  ): Promise<{ success: boolean; sid?: string; error?: string }> {
    const message = `Hi ${data.customerName}! 📅

This is a reminder from ${data.businessName} about your upcoming appointment:

📆 Date: ${data.date}
⏰ Time: ${data.time}${data.serviceType ? `\n🔧 Service: ${data.serviceType}` : ''}${data.address ? `\n📍 Location: ${data.address}` : ''}

Reply YES to confirm or call us to reschedule.`;

    return this.sendMessage(to, message);
  }

  /**
   * Send job completion notification with photo
   */
  async sendJobCompletionNotification(
    to: string,
    data: {
      customerName: string;
      businessName: string;
      jobTitle: string;
      completedDate: string;
      photoUrl?: string;
      invoiceUrl?: string;
    }
  ): Promise<{ success: boolean; sid?: string; error?: string }> {
    const message = `Hi ${data.customerName}! ✅

Great news! Your service "${data.jobTitle}" has been completed by ${data.businessName}.

📅 Completed: ${data.completedDate}
${data.invoiceUrl ? `\n📄 View your invoice: ${data.invoiceUrl}` : ''}

Thank you for choosing us! Reply with any questions.`;

    if (data.photoUrl) {
      return this.sendMediaMessage(to, message, data.photoUrl);
    }

    return this.sendMessage(to, message);
  }

  /**
   * Send payment reminder
   */
  async sendPaymentReminder(
    to: string,
    data: {
      customerName: string;
      businessName: string;
      invoiceNumber: string;
      amount: number;
      dueDate: string;
      paymentUrl?: string;
    }
  ): Promise<{ success: boolean; sid?: string; error?: string }> {
    const message = `Hi ${data.customerName},

This is a friendly reminder from ${data.businessName} about invoice #${data.invoiceNumber}.

💰 Amount Due: $${data.amount.toFixed(2)}
📅 Due Date: ${data.dueDate}
${data.paymentUrl ? `\n💳 Pay online: ${data.paymentUrl}` : ''}

Please let us know if you have any questions!`;

    return this.sendMessage(to, message);
  }

  /**
   * Send technician en route notification
   */
  async sendTechnicianEnRoute(
    to: string,
    data: {
      customerName: string;
      technicianName: string;
      estimatedArrival?: string;
      businessName: string;
    }
  ): Promise<{ success: boolean; sid?: string; error?: string }> {
    const message = `Hi ${data.customerName}! 🚗

${data.technicianName} from ${data.businessName} is on the way to your location.${data.estimatedArrival ? `\n\n⏰ Estimated arrival: ${data.estimatedArrival}` : ''}

See you soon!`;

    return this.sendMessage(to, message);
  }

  /**
   * Send review request
   */
  async sendReviewRequest(
    to: string,
    data: {
      customerName: string;
      businessName: string;
      reviewUrl: string;
    }
  ): Promise<{ success: boolean; sid?: string; error?: string }> {
    const message = `Hi ${data.customerName}! ⭐

Thank you for choosing ${data.businessName}! We hope you had a great experience.

Would you mind taking a moment to leave us a review? It helps other customers find us!

🔗 ${data.reviewUrl}

Thank you for your support!`;

    return this.sendMessage(to, message);
  }
}

/**
 * Create WhatsApp channel from Twilio credentials
 */
export function createWhatsAppChannel(
  accountSid: string,
  authToken: string,
  fromNumber: string
): WhatsAppNotificationChannel {
  return new WhatsAppNotificationChannel({
    accountSid,
    authToken,
    fromNumber,
  });
}

/**
 * Check if WhatsApp is configured
 */
export function isWhatsAppConfigured(): boolean {
  return !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_WHATSAPP_NUMBER
  );
}
