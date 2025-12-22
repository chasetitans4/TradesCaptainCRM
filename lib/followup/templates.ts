// =====================================================
// FOLLOW-UP TEMPLATES
// Pre-built follow-up sequences for common scenarios
// =====================================================

import { TriggerType, ActionType, createFollowUpRule } from './engine';

export interface FollowUpTemplate {
  id: string;
  name: string;
  description: string;
  category: 'sales' | 'service' | 'billing' | 'engagement';
  rules: FollowUpTemplateRule[];
}

export interface FollowUpTemplateRule {
  name: string;
  triggerType: TriggerType;
  delayHours: number;
  actionType: ActionType;
  messageTemplate?: string;
  emailSubject?: string;
  emailTemplate?: string;
  taskTitle?: string;
  conditions?: Record<string, any>;
  maxAttempts: number;
  stopOnResponse: boolean;
}

/**
 * Built-in follow-up templates
 */
export const FOLLOW_UP_TEMPLATES: FollowUpTemplate[] = [
  // ========== SALES TEMPLATES ==========
  {
    id: 'quote-follow-up',
    name: 'Quote Follow-Up Sequence',
    description: 'Automated follow-ups for quotes that haven\'t received a response',
    category: 'sales',
    rules: [
      {
        name: 'Quote - 24 Hour Check-In',
        triggerType: 'quote_no_response',
        delayHours: 24,
        actionType: 'email',
        emailSubject: 'Following up on your quote',
        emailTemplate: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <p>Hi {{customer.firstName}},</p>
            <p>I wanted to follow up on the quote I sent yesterday. Have you had a chance to review it?</p>
            <p>If you have any questions or would like to discuss the details, I'm happy to help.</p>
            <p>Best regards</p>
          </div>
        `,
        maxAttempts: 1,
        stopOnResponse: true,
      },
      {
        name: 'Quote - 3 Day Reminder',
        triggerType: 'quote_no_response',
        delayHours: 72,
        actionType: 'sms',
        messageTemplate: 'Hi {{customer.firstName}}, just checking in about the quote for {{entity.total}}. Let me know if you have any questions!',
        maxAttempts: 1,
        stopOnResponse: true,
      },
      {
        name: 'Quote - 7 Day Follow-Up',
        triggerType: 'quote_no_response',
        delayHours: 168,
        actionType: 'email',
        emailSubject: 'Your quote is still available',
        emailTemplate: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <p>Hi {{customer.firstName}},</p>
            <p>I noticed you haven't had a chance to respond to my quote from last week.</p>
            <p>I understand these decisions take time. If you'd like, I can schedule a quick call to go over everything and answer any questions.</p>
            <p>Just reply to this email and we can set something up.</p>
            <p>Best regards</p>
          </div>
        `,
        maxAttempts: 1,
        stopOnResponse: true,
      },
      {
        name: 'Quote - Final Follow-Up Task',
        triggerType: 'quote_no_response',
        delayHours: 336, // 14 days
        actionType: 'task',
        taskTitle: 'Final follow-up call for quote {{entity.id}}',
        maxAttempts: 1,
        stopOnResponse: true,
      },
    ],
  },

  {
    id: 'lead-nurture',
    name: 'Lead Nurturing Sequence',
    description: 'Convert leads into customers with timely follow-ups',
    category: 'sales',
    rules: [
      {
        name: 'Lead - Welcome Email',
        triggerType: 'lead_created',
        delayHours: 1,
        actionType: 'email',
        emailSubject: 'Thanks for reaching out!',
        emailTemplate: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <p>Hi {{customer.firstName}},</p>
            <p>Thank you for contacting us! We received your inquiry and will be in touch shortly.</p>
            <p>In the meantime, feel free to reply to this email if you have any questions.</p>
            <p>We look forward to working with you!</p>
          </div>
        `,
        maxAttempts: 1,
        stopOnResponse: false,
      },
      {
        name: 'Lead - No Response Check',
        triggerType: 'lead_no_response',
        delayHours: 48,
        actionType: 'sms',
        messageTemplate: 'Hi {{customer.firstName}}, we received your inquiry. When would be a good time to chat about your project?',
        maxAttempts: 1,
        stopOnResponse: true,
      },
      {
        name: 'Lead - Follow-Up Task',
        triggerType: 'lead_no_response',
        delayHours: 120, // 5 days
        actionType: 'task',
        taskTitle: 'Follow up with lead: {{customer.name}}',
        maxAttempts: 1,
        stopOnResponse: true,
      },
    ],
  },

  // ========== SERVICE TEMPLATES ==========
  {
    id: 'job-completion',
    name: 'Post-Job Follow-Up',
    description: 'Follow up after job completion for feedback and reviews',
    category: 'service',
    rules: [
      {
        name: 'Job Complete - Thank You',
        triggerType: 'job_completed',
        delayHours: 2,
        actionType: 'sms',
        messageTemplate: 'Hi {{customer.firstName}}, thanks for choosing us! We hope everything went well. Let us know if you have any questions.',
        maxAttempts: 1,
        stopOnResponse: false,
      },
      {
        name: 'Job Complete - Review Request',
        triggerType: 'review_request',
        delayHours: 72, // 3 days after job
        actionType: 'email',
        emailSubject: 'How did we do?',
        emailTemplate: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <p>Hi {{customer.firstName}},</p>
            <p>Thank you for trusting us with your recent project!</p>
            <p>We'd really appreciate it if you could take a moment to leave us a review. Your feedback helps other customers find quality service.</p>
            <p>Thanks again for your business!</p>
          </div>
        `,
        maxAttempts: 1,
        stopOnResponse: true,
      },
    ],
  },

  {
    id: 'appointment-reminders',
    name: 'Appointment Reminders',
    description: 'Reduce no-shows with timely reminders',
    category: 'service',
    rules: [
      {
        name: 'Booking - Confirmation',
        triggerType: 'booking_confirmed',
        delayHours: 0,
        actionType: 'email',
        emailSubject: 'Your appointment is confirmed!',
        emailTemplate: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <p>Hi {{customer.firstName}},</p>
            <p>Great news! Your appointment has been confirmed.</p>
            <p>We'll send you a reminder before your scheduled time. If you need to reschedule, please let us know as soon as possible.</p>
            <p>See you soon!</p>
          </div>
        `,
        maxAttempts: 1,
        stopOnResponse: false,
      },
      {
        name: 'Appointment - Day Before Reminder',
        triggerType: 'appointment_reminder',
        delayHours: -24, // 24 hours before
        actionType: 'sms',
        messageTemplate: 'Reminder: Your appointment is tomorrow. Reply YES to confirm or call us to reschedule.',
        maxAttempts: 1,
        stopOnResponse: false,
      },
      {
        name: 'Appointment - Morning Of Reminder',
        triggerType: 'appointment_reminder',
        delayHours: -2, // 2 hours before
        actionType: 'sms',
        messageTemplate: 'Hi {{customer.firstName}}, just a reminder about your appointment today. See you soon!',
        maxAttempts: 1,
        stopOnResponse: false,
      },
    ],
  },

  {
    id: 'maintenance-due',
    name: 'Maintenance Reminders',
    description: 'Proactive maintenance reminders based on equipment schedules',
    category: 'service',
    rules: [
      {
        name: 'Maintenance - Due Soon',
        triggerType: 'maintenance_due',
        delayHours: -168, // 1 week before
        actionType: 'email',
        emailSubject: 'Your equipment maintenance is coming up',
        emailTemplate: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <p>Hi {{customer.firstName}},</p>
            <p>Just a friendly reminder that your equipment is due for maintenance soon.</p>
            <p>Regular maintenance helps prevent costly repairs and keeps everything running smoothly.</p>
            <p>Would you like to schedule an appointment? Just reply to this email or give us a call.</p>
          </div>
        `,
        maxAttempts: 1,
        stopOnResponse: true,
      },
      {
        name: 'Maintenance - Overdue',
        triggerType: 'maintenance_due',
        delayHours: 168, // 1 week after due date
        actionType: 'sms',
        messageTemplate: 'Hi {{customer.firstName}}, your equipment maintenance is now overdue. Schedule today to avoid potential issues.',
        maxAttempts: 1,
        stopOnResponse: true,
      },
    ],
  },

  // ========== BILLING TEMPLATES ==========
  {
    id: 'invoice-reminders',
    name: 'Invoice Payment Reminders',
    description: 'Gentle reminders for overdue invoices',
    category: 'billing',
    rules: [
      {
        name: 'Invoice - Due Soon',
        triggerType: 'invoice_overdue',
        delayHours: -72, // 3 days before due
        actionType: 'email',
        emailSubject: 'Invoice payment reminder',
        emailTemplate: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <p>Hi {{customer.firstName}},</p>
            <p>This is a friendly reminder that invoice #{{entity.id}} for {{entity.total}} is due soon.</p>
            <p>You can pay online through your customer portal or contact us for other payment options.</p>
            <p>Thank you!</p>
          </div>
        `,
        maxAttempts: 1,
        stopOnResponse: true,
      },
      {
        name: 'Invoice - Overdue 7 Days',
        triggerType: 'invoice_overdue',
        delayHours: 168, // 7 days overdue
        actionType: 'email',
        emailSubject: 'Invoice overdue - Payment needed',
        emailTemplate: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <p>Hi {{customer.firstName}},</p>
            <p>Invoice #{{entity.id}} is now 7 days past due.</p>
            <p>Please arrange payment at your earliest convenience. If you have any questions about the invoice, please don't hesitate to contact us.</p>
            <p>Thank you for your prompt attention to this matter.</p>
          </div>
        `,
        maxAttempts: 1,
        stopOnResponse: true,
      },
      {
        name: 'Invoice - Overdue 14 Days SMS',
        triggerType: 'invoice_overdue',
        delayHours: 336, // 14 days overdue
        actionType: 'sms',
        messageTemplate: 'Hi {{customer.firstName}}, invoice #{{entity.id}} for {{entity.total}} is 14 days overdue. Please contact us to arrange payment.',
        maxAttempts: 1,
        stopOnResponse: true,
      },
      {
        name: 'Invoice - 30 Day Collection Task',
        triggerType: 'invoice_overdue',
        delayHours: 720, // 30 days overdue
        actionType: 'task',
        taskTitle: 'Collection follow-up for invoice #{{entity.id}}',
        maxAttempts: 1,
        stopOnResponse: true,
      },
    ],
  },

  // ========== ENGAGEMENT TEMPLATES ==========
  {
    id: 'customer-reactivation',
    name: 'Customer Reactivation',
    description: 'Re-engage customers who haven\'t booked in a while',
    category: 'engagement',
    rules: [
      {
        name: 'Reactivation - 90 Day Check-In',
        triggerType: 'job_completed',
        delayHours: 2160, // 90 days
        actionType: 'email',
        emailSubject: 'We miss you!',
        emailTemplate: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <p>Hi {{customer.firstName}},</p>
            <p>It's been a while since we last worked together! We hope everything is going well.</p>
            <p>If you need any help with maintenance, repairs, or new projects, we're here for you.</p>
            <p>Feel free to reach out anytime!</p>
          </div>
        `,
        maxAttempts: 1,
        stopOnResponse: true,
      },
    ],
  },
];

/**
 * Get all available templates
 */
export function getAllTemplates(): FollowUpTemplate[] {
  return FOLLOW_UP_TEMPLATES;
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: string): FollowUpTemplate[] {
  return FOLLOW_UP_TEMPLATES.filter((t) => t.category === category);
}

/**
 * Get a specific template by ID
 */
export function getTemplate(templateId: string): FollowUpTemplate | undefined {
  return FOLLOW_UP_TEMPLATES.find((t) => t.id === templateId);
}

/**
 * Apply a template to a business (create all rules)
 */
export async function applyTemplate(
  businessId: string,
  templateId: string,
  options?: {
    taskAssignedTo?: string;
    customizeRules?: (rule: FollowUpTemplateRule) => FollowUpTemplateRule;
  }
): Promise<{ created: number; errors: string[] }> {
  const template = getTemplate(templateId);

  if (!template) {
    return { created: 0, errors: [`Template '${templateId}' not found`] };
  }

  let created = 0;
  const errors: string[] = [];

  for (let i = 0; i < template.rules.length; i++) {
    let rule = template.rules[i];

    // Apply customization if provided
    if (options?.customizeRules) {
      rule = options.customizeRules(rule);
    }

    try {
      await createFollowUpRule(businessId, {
        name: rule.name,
        description: `From template: ${template.name}`,
        triggerType: rule.triggerType,
        delayHours: rule.delayHours,
        actionType: rule.actionType,
        messageTemplate: rule.messageTemplate || null,
        emailSubject: rule.emailSubject || null,
        emailTemplate: rule.emailTemplate || null,
        taskTitle: rule.taskTitle || null,
        taskAssignedTo: options?.taskAssignedTo || null,
        conditions: rule.conditions || null,
        maxAttempts: rule.maxAttempts,
        stopOnResponse: rule.stopOnResponse,
        isActive: true,
        sortOrder: i,
      });
      created++;
    } catch (error: any) {
      errors.push(`Failed to create rule '${rule.name}': ${error.message}`);
    }
  }

  return { created, errors };
}

/**
 * Get template categories
 */
export function getTemplateCategories(): Array<{ id: string; name: string; count: number }> {
  const categories = [
    { id: 'sales', name: 'Sales & Quotes' },
    { id: 'service', name: 'Service & Appointments' },
    { id: 'billing', name: 'Billing & Payments' },
    { id: 'engagement', name: 'Customer Engagement' },
  ];

  return categories.map((cat) => ({
    ...cat,
    count: FOLLOW_UP_TEMPLATES.filter((t) => t.category === cat.id).length,
  }));
}
