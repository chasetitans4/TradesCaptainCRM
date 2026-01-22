// =====================================================
// SLACK NOTIFICATION CHANNEL
// Send notifications to Slack workspaces
// =====================================================

import { apiLogger } from '@/lib/logger';

interface SlackMessage {
  channel: string;
  text: string;
  blocks?: SlackBlock[];
  attachments?: SlackAttachment[];
  thread_ts?: string;
  unfurl_links?: boolean;
  unfurl_media?: boolean;
}

interface SlackBlock {
  type: 'section' | 'divider' | 'header' | 'context' | 'actions' | 'image';
  text?: {
    type: 'plain_text' | 'mrkdwn';
    text: string;
    emoji?: boolean;
  };
  fields?: Array<{
    type: 'plain_text' | 'mrkdwn';
    text: string;
  }>;
  accessory?: {
    type: 'button' | 'image';
    text?: { type: 'plain_text'; text: string };
    url?: string;
    action_id?: string;
    image_url?: string;
    alt_text?: string;
  };
  elements?: Array<{
    type: 'plain_text' | 'mrkdwn' | 'image';
    text?: string;
    image_url?: string;
    alt_text?: string;
  }>;
}

interface SlackAttachment {
  color?: string;
  fallback?: string;
  title?: string;
  title_link?: string;
  text?: string;
  fields?: Array<{
    title: string;
    value: string;
    short?: boolean;
  }>;
  footer?: string;
  ts?: number;
}

interface SlackConfig {
  webhookUrl: string;
  defaultChannel?: string;
  botToken?: string; // For advanced API usage
}

export class SlackNotificationChannel {
  private config: SlackConfig;

  constructor(config: SlackConfig) {
    this.config = config;
  }

  /**
   * Send a simple text message
   */
  async sendMessage(text: string, channel?: string): Promise<boolean> {
    return this.send({
      channel: channel || this.config.defaultChannel || '#general',
      text,
    });
  }

  /**
   * Send a rich formatted message with blocks
   */
  async sendRichMessage(message: SlackMessage): Promise<boolean> {
    return this.send(message);
  }

  /**
   * Send a new lead notification
   */
  async notifyNewLead(lead: {
    name: string;
    phone?: string;
    email?: string;
    serviceNeeded: string;
    source: string;
    url?: string;
  }): Promise<boolean> {
    const blocks: SlackBlock[] = [
      {
        type: 'header',
        text: { type: 'plain_text', text: '🎯 New Lead Received', emoji: true },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Name:*\n${lead.name}` },
          { type: 'mrkdwn', text: `*Service:*\n${lead.serviceNeeded}` },
          { type: 'mrkdwn', text: `*Phone:*\n${lead.phone || 'N/A'}` },
          { type: 'mrkdwn', text: `*Source:*\n${lead.source}` },
        ],
      },
    ];

    if (lead.url) {
      blocks.push({
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'View Lead' },
            url: lead.url,
            action_id: 'view_lead',
          },
        ],
      } as any);
    }

    return this.send({
      channel: this.config.defaultChannel || '#leads',
      text: `New lead from ${lead.name} for ${lead.serviceNeeded}`,
      blocks,
    });
  }

  /**
   * Send a job status update
   */
  async notifyJobUpdate(job: {
    title: string;
    customerName: string;
    status: string;
    technicianName?: string;
    url?: string;
  }): Promise<boolean> {
    const statusEmoji: Record<string, string> = {
      scheduled: '📅',
      in_progress: '🔧',
      completed: '✅',
      cancelled: '❌',
    };

    return this.send({
      channel: this.config.defaultChannel || '#jobs',
      text: `Job "${job.title}" is now ${job.status}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `${statusEmoji[job.status] || '📋'} *Job Update: ${job.title}*\nCustomer: ${job.customerName}\nStatus: ${job.status}${job.technicianName ? `\nTechnician: ${job.technicianName}` : ''}`,
          },
          accessory: job.url
            ? {
                type: 'button',
                text: { type: 'plain_text', text: 'View Job' },
                url: job.url,
              }
            : undefined,
        },
      ],
    });
  }

  /**
   * Send a payment received notification
   */
  async notifyPaymentReceived(payment: {
    amount: number;
    customerName: string;
    invoiceNumber: string;
    url?: string;
  }): Promise<boolean> {
    return this.send({
      channel: this.config.defaultChannel || '#payments',
      text: `Payment of $${payment.amount.toFixed(2)} received from ${payment.customerName}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `💰 *Payment Received*\n• Amount: $${payment.amount.toFixed(2)}\n• Customer: ${payment.customerName}\n• Invoice: ${payment.invoiceNumber}`,
          },
        },
      ],
      attachments: [
        {
          color: '#36a64f',
          fallback: `Payment received: $${payment.amount.toFixed(2)}`,
        },
      ],
    });
  }

  /**
   * Send to webhook
   */
  private async send(message: SlackMessage): Promise<boolean> {
    try {
      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        const error = await response.text();
        apiLogger.error({ msg: 'Slack notification failed', error, status: response.status });
        return false;
      }

      return true;
    } catch (error) {
      apiLogger.error({
        msg: 'Slack notification error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }
}

/**
 * Create Slack channel from business settings
 */
export function createSlackChannel(webhookUrl: string, defaultChannel?: string): SlackNotificationChannel {
  return new SlackNotificationChannel({
    webhookUrl,
    defaultChannel,
  });
}
