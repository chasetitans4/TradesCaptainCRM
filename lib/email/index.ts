// =====================================================
// EMAIL LIBRARY (Resend)
// =====================================================

import { Resend } from 'resend';

let _resend: Resend | null = null;

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    return null;
  }
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  from?: string;
  text?: string;
}

export async function sendEmail(params: SendEmailParams) {
  const { to, subject, html, from, text } = params;

  const resend = getResend();
  if (!resend) {
    console.warn('RESEND_API_KEY not set, skipping email send');
    return { success: false, error: 'Email not configured' };
  }

  try {
    const result = await resend.emails.send({
      from: from || 'Trades Captain <noreply@tradescaptain.com>',
      to,
      subject,
      html,
      text,
    });

    return { success: true, data: result };
  } catch (error) {
    console.error('Failed to send email:', error);
    return { success: false, error };
  }
}

// Email templates

export function getInvitationEmailHtml(params: {
  inviterName: string;
  businessName: string;
  role: string;
  inviteUrl: string;
}) {
  const { inviterName, businessName, role, inviteUrl } = params;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.5; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #2d5aa0; font-size: 24px; margin: 0;">Trades Captain</h1>
      </div>

      <div style="background: #f9fafb; border-radius: 12px; padding: 32px; margin-bottom: 24px;">
        <h2 style="font-size: 20px; margin: 0 0 16px 0;">You've been invited!</h2>

        <p style="margin: 0 0 16px 0;">
          <strong>${inviterName}</strong> has invited you to join <strong>${businessName}</strong> on Trades Captain as a <strong>${role}</strong>.
        </p>

        <p style="margin: 0 0 24px 0;">
          Click the button below to accept the invitation and create your account:
        </p>

        <div style="text-align: center;">
          <a href="${inviteUrl}" style="display: inline-block; background: #2d5aa0; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
            Accept Invitation
          </a>
        </div>
      </div>

      <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0;">
        This invitation expires in 7 days.
      </p>

      <p style="color: #6b7280; font-size: 14px; margin: 0;">
        If you didn't expect this invitation, you can safely ignore this email.
      </p>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">

      <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
        &copy; ${new Date().getFullYear()} Trades Captain. All rights reserved.
      </p>
    </body>
    </html>
  `;
}

export function getOwnershipTransferEmailHtml(params: {
  newOwnerName: string;
  oldOwnerName: string;
  businessName: string;
  dashboardUrl: string;
}) {
  const { newOwnerName, oldOwnerName, businessName, dashboardUrl } = params;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.5; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #2d5aa0; font-size: 24px; margin: 0;">Trades Captain</h1>
      </div>

      <div style="background: #f9fafb; border-radius: 12px; padding: 32px; margin-bottom: 24px;">
        <h2 style="font-size: 20px; margin: 0 0 16px 0;">You are now the owner of ${businessName}</h2>

        <p style="margin: 0 0 16px 0;">
          Hi ${newOwnerName},
        </p>

        <p style="margin: 0 0 16px 0;">
          <strong>${oldOwnerName}</strong> has transferred ownership of <strong>${businessName}</strong> to you on Trades Captain.
        </p>

        <p style="margin: 0 0 8px 0;">As the owner, you now have full access to:</p>
        <ul style="margin: 0 0 24px 0; padding-left: 24px;">
          <li>Billing and subscription management</li>
          <li>Team management</li>
          <li>All business settings</li>
        </ul>

        <div style="text-align: center;">
          <a href="${dashboardUrl}" style="display: inline-block; background: #2d5aa0; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
            Go to Dashboard
          </a>
        </div>
      </div>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">

      <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
        &copy; ${new Date().getFullYear()} Trades Captain. All rights reserved.
      </p>
    </body>
    </html>
  `;
}

// =====================================================
// CUSTOMER EMAIL TEMPLATES
// =====================================================

export function getQuoteEmailHtml(params: {
  customerName: string;
  businessName: string;
  quoteLink: string;
  validUntil: string;
}) {
  const { customerName, businessName, quoteLink, validUntil } = params;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.5; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #2d5aa0; font-size: 24px; margin: 0;">${businessName}</h1>
      </div>

      <div style="background: #f9fafb; border-radius: 12px; padding: 32px; margin-bottom: 24px;">
        <p style="margin: 0 0 16px 0;">Hi ${customerName},</p>
        <p style="margin: 0 0 16px 0;">Thank you for your interest in our services. Please find your quote below.</p>

        <div style="text-align: center; margin: 24px 0;">
          <a href="${quoteLink}" style="display: inline-block; background: #2d5aa0; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
            View Quote
          </a>
        </div>

        <p style="margin: 16px 0 0 0; color: #6b7280; font-size: 14px;">This quote is valid until ${validUntil}.</p>
      </div>

      <p style="color: #6b7280; font-size: 14px;">If you have any questions, please don't hesitate to reach out.</p>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
      <p style="color: #9ca3af; font-size: 12px; text-align: center;">Best regards,<br>${businessName}</p>
    </body>
    </html>
  `;
}

export function getInvoiceEmailHtml(params: {
  customerName: string;
  businessName: string;
  invoiceNumber: string;
  amountDue: string;
  dueDate: string;
  paymentLink: string;
}) {
  const { customerName, businessName, invoiceNumber, amountDue, dueDate, paymentLink } = params;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.5; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #2d5aa0; font-size: 24px; margin: 0;">${businessName}</h1>
      </div>

      <div style="background: #f9fafb; border-radius: 12px; padding: 32px; margin-bottom: 24px;">
        <p style="margin: 0 0 16px 0;">Hi ${customerName},</p>
        <p style="margin: 0 0 16px 0;">Please find your invoice below.</p>

        <div style="background: white; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0 0 8px 0;"><strong>Invoice #${invoiceNumber}</strong></p>
          <p style="margin: 0 0 8px 0;"><strong>Amount Due:</strong> ${amountDue}</p>
          <p style="margin: 0;"><strong>Due Date:</strong> ${dueDate}</p>
        </div>

        <div style="text-align: center; margin: 24px 0;">
          <a href="${paymentLink}" style="display: inline-block; background: #2d5aa0; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
            Pay Now
          </a>
        </div>
      </div>

      <p style="color: #6b7280; font-size: 14px;">Thank you for your business!</p>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
      <p style="color: #9ca3af; font-size: 12px; text-align: center;">${businessName}</p>
    </body>
    </html>
  `;
}

export function getAppointmentReminderEmailHtml(params: {
  customerName: string;
  businessName: string;
  businessPhone: string;
  serviceType: string;
  appointmentDate: string;
  appointmentTime: string;
}) {
  const { customerName, businessName, businessPhone, serviceType, appointmentDate, appointmentTime } = params;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.5; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #2d5aa0; font-size: 24px; margin: 0;">${businessName}</h1>
      </div>

      <div style="background: #f9fafb; border-radius: 12px; padding: 32px; margin-bottom: 24px;">
        <h2 style="font-size: 20px; margin: 0 0 16px 0;">Appointment Reminder</h2>

        <p style="margin: 0 0 16px 0;">Hi ${customerName},</p>
        <p style="margin: 0 0 16px 0;">This is a reminder about your upcoming appointment:</p>

        <div style="background: white; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0 0 8px 0;"><strong>${serviceType}</strong></p>
          <p style="margin: 0 0 8px 0;"><strong>Date:</strong> ${appointmentDate}</p>
          <p style="margin: 0;"><strong>Time:</strong> ${appointmentTime}</p>
        </div>

        <p style="margin: 16px 0 0 0; color: #6b7280; font-size: 14px;">
          If you need to reschedule, please call us at ${businessPhone}.
        </p>
      </div>

      <p style="color: #6b7280; font-size: 14px;">See you soon!</p>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
      <p style="color: #9ca3af; font-size: 12px; text-align: center;">${businessName}</p>
    </body>
    </html>
  `;
}

export function getReviewRequestEmailHtml(params: {
  customerName: string;
  businessName: string;
  reviewLink: string;
}) {
  const { customerName, businessName, reviewLink } = params;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.5; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #2d5aa0; font-size: 24px; margin: 0;">${businessName}</h1>
      </div>

      <div style="background: #f9fafb; border-radius: 12px; padding: 32px; margin-bottom: 24px;">
        <h2 style="font-size: 20px; margin: 0 0 16px 0;">How did we do?</h2>

        <p style="margin: 0 0 16px 0;">Hi ${customerName},</p>
        <p style="margin: 0 0 16px 0;">Thank you for choosing ${businessName}!</p>
        <p style="margin: 0 0 16px 0;">We'd love to hear about your experience. Your feedback helps us improve and helps other customers find us.</p>

        <div style="text-align: center; margin: 24px 0;">
          <a href="${reviewLink}" style="display: inline-block; background: #2d5aa0; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
            Leave a Review
          </a>
        </div>
      </div>

      <p style="color: #6b7280; font-size: 14px; text-align: center;">Thank you!</p>
    </body>
    </html>
  `;
}

export function getSurveyEmailHtml(params: {
  customerName: string;
  businessName: string;
  surveyLink: string;
}) {
  const { customerName, businessName, surveyLink } = params;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.5; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #2d5aa0; font-size: 24px; margin: 0;">${businessName}</h1>
      </div>

      <div style="background: #f9fafb; border-radius: 12px; padding: 32px; margin-bottom: 24px;">
        <h2 style="font-size: 20px; margin: 0 0 16px 0;">We'd love your feedback!</h2>

        <p style="margin: 0 0 16px 0;">Hi ${customerName},</p>
        <p style="margin: 0 0 16px 0;">Thank you for choosing ${businessName}. We'd love to hear about your experience - it only takes 30 seconds!</p>

        <div style="text-align: center; margin: 24px 0;">
          <a href="${surveyLink}" style="display: inline-block; background: #2d5aa0; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
            Take Quick Survey
          </a>
        </div>
      </div>

      <p style="color: #6b7280; font-size: 14px; text-align: center;">Your feedback helps us improve!</p>
    </body>
    </html>
  `;
}

export function getTrialInviteEmailHtml(params: {
  businessName: string;
  inviteUrl: string;
}) {
  const { businessName, inviteUrl } = params;
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.5; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #2d5aa0; font-size: 24px; margin: 0;">Trades Captain</h1>
      </div>
      <div style="background: #f9fafb; border-radius: 12px; padding: 32px; margin-bottom: 24px;">
        <h2 style="font-size: 20px; margin: 0 0 16px 0;">Your 30-Day Free Trial</h2>
        <p style="margin: 0 0 16px 0;">You have been invited to start a free trial of Trades Captain CRM for <strong>${businessName}</strong>.</p>
        <p style="margin: 0 0 24px 0;">Click the button below to create your account and get started.</p>
        <div style="text-align: center;">
          <a href="${inviteUrl}" style="display: inline-block; background: #2d5aa0; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Start Free Trial</a>
        </div>
      </div>
      <p style="color: #6b7280; font-size: 14px;">This invitation expires in 7 days. No credit card required during the trial.</p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
      <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">&copy; ${new Date().getFullYear()} Trades Captain. All rights reserved.</p>
    </body>
    </html>
  `;
}

export function getFoundersInviteEmailHtml(params: {
  businessName: string;
  inviteUrl: string;
}) {
  const { businessName, inviteUrl } = params;
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.5; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #2d5aa0; font-size: 24px; margin: 0;">Trades Captain</h1>
      </div>
      <div style="background: #f9fafb; border-radius: 12px; padding: 32px; margin-bottom: 24px;">
        <h2 style="font-size: 20px; margin: 0 0 16px 0;">Founders Program Invitation</h2>
        <p style="margin: 0 0 16px 0;">You have been invited to join the Founders Program for <strong>${businessName}</strong>. Enjoy three months free.</p>
        <p style="margin: 0 0 24px 0;">Click below to claim your Founders slot and set up your account.</p>
        <div style="text-align: center;">
          <a href="${inviteUrl}" style="display: inline-block; background: #2d5aa0; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Join Founders</a>
        </div>
      </div>
      <p style="color: #6b7280; font-size: 14px;">Limited availability. Invitation expires in 7 days.</p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
      <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">&copy; ${new Date().getFullYear()} Trades Captain. All rights reserved.</p>
    </body>
    </html>
  `;
}

export function getWelcomeEmailHtml(params: {
  businessName: string;
  dashboardUrl: string;
}) {
  const { businessName, dashboardUrl } = params;
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.5; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #2d5aa0; font-size: 24px; margin: 0;">${businessName}</h1>
      </div>
      <div style="background: #f9fafb; border-radius: 12px; padding: 32px; margin-bottom: 24px;">
        <h2 style="font-size: 20px; margin: 0 0 16px 0;">Welcome to Trades Captain</h2>
        <p style="margin: 0 0 16px 0;">Your account has been created. Use the button below to log in and start setting up your CRM.</p>
        <div style="text-align: center;">
          <a href="${dashboardUrl}" style="display: inline-block; background: #2d5aa0; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Go to Dashboard</a>
        </div>
      </div>
      <p style="color: #6b7280; font-size: 14px;">If you need help, reply to this email.</p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
      <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">&copy; ${new Date().getFullYear()} Trades Captain. All rights reserved.</p>
    </body>
    </html>
  `;
}

export function getTrialReminderEmailHtml(params: {
  businessName: string;
  daysLeft: number;
  dashboardUrl: string;
}) {
  const { businessName, daysLeft, dashboardUrl } = params;
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.5; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #2d5aa0; font-size: 24px; margin: 0;">${businessName}</h1>
      </div>
      <div style="background: #f9fafb; border-radius: 12px; padding: 32px; margin-bottom: 24px;">
        <h2 style="font-size: 20px; margin: 0 0 16px 0;">${daysLeft} Days Left in Your Trial</h2>
        <p style="margin: 0 0 16px 0;">Your free trial is ending soon. Keep full access by adding your payment method.</p>
        <div style="text-align: center;">
          <a href="${dashboardUrl}" style="display: inline-block; background: #2d5aa0; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Manage Billing</a>
        </div>
      </div>
      <p style="color: #6b7280; font-size: 14px;">You can upgrade plans at any time.</p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
      <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">&copy; ${new Date().getFullYear()} Trades Captain. All rights reserved.</p>
    </body>
    </html>
  `;
}

export function getFoundersEndingEmailHtml(params: {
  businessName: string;
  daysLeft: number;
  dashboardUrl: string;
}) {
  const { businessName, daysLeft, dashboardUrl } = params;
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.5; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #2d5aa0; font-size: 24px; margin: 0;">${businessName}</h1>
      </div>
      <div style="background: #f9fafb; border-radius: 12px; padding: 32px; margin-bottom: 24px;">
        <h2 style="font-size: 20px; margin: 0 0 16px 0;">${daysLeft} Days Left in Founders Program</h2>
        <p style="margin: 0 0 16px 0;">Your complimentary period is ending soon. Add a payment method to continue uninterrupted.</p>
        <div style="text-align: center;">
          <a href="${dashboardUrl}" style="display: inline-block; background: #2d5aa0; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Manage Billing</a>
        </div>
      </div>
      <p style="color: #6b7280; font-size: 14px;">Thank you for being an early supporter.</p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
      <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">&copy; ${new Date().getFullYear()} Trades Captain. All rights reserved.</p>
    </body>
    </html>
  `;
}

// =====================================================
// INVOICE EMAIL TEMPLATES
// =====================================================

export function getInvoiceDeliveryEmailHtml(params: {
  customerName: string;
  businessName: string;
  businessPhone?: string;
  invoiceNumber: string;
  amountDue: string;
  dueDate: string;
  lineItems: Array<{ name: string; quantity: number; unitPrice: number; total: number }>;
  subtotal: string;
  taxAmount?: string;
  total: string;
  paymentLink?: string;
  viewLink: string;
  notes?: string;
}) {
  const {
    customerName,
    businessName,
    businessPhone,
    invoiceNumber,
    amountDue,
    dueDate,
    lineItems,
    subtotal,
    taxAmount,
    total,
    paymentLink,
    viewLink,
    notes,
  } = params;

  const lineItemsHtml = lineItems
    .map(
      (item) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.name}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${item.unitPrice.toFixed(2)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${item.total.toFixed(2)}</td>
      </tr>
    `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.5; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px; background: #f3f4f6;">
      <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <!-- Header -->
        <div style="background: #2d5aa0; padding: 24px; text-align: center;">
          <h1 style="color: white; font-size: 24px; margin: 0;">${businessName}</h1>
        </div>

        <!-- Invoice Info -->
        <div style="padding: 32px;">
          <p style="margin: 0 0 8px 0; color: #6b7280;">Hi ${customerName},</p>
          <p style="margin: 0 0 24px 0;">Here is your invoice. Thank you for your business!</p>

          <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <table style="width: 100%;">
              <tr>
                <td style="color: #6b7280;">Invoice Number:</td>
                <td style="text-align: right;"><strong>${invoiceNumber}</strong></td>
              </tr>
              <tr>
                <td style="color: #6b7280;">Due Date:</td>
                <td style="text-align: right;"><strong>${dueDate}</strong></td>
              </tr>
              <tr>
                <td style="color: #6b7280;">Amount Due:</td>
                <td style="text-align: right;"><strong style="color: #2d5aa0; font-size: 18px;">${amountDue}</strong></td>
              </tr>
            </table>
          </div>

          <!-- Line Items Table -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <thead>
              <tr style="background: #f9fafb;">
                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Item</th>
                <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e5e7eb;">Qty</th>
                <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e7eb;">Price</th>
                <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e7eb;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${lineItemsHtml}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3" style="padding: 12px; text-align: right; color: #6b7280;">Subtotal:</td>
                <td style="padding: 12px; text-align: right;">${subtotal}</td>
              </tr>
              ${taxAmount ? `
              <tr>
                <td colspan="3" style="padding: 12px; text-align: right; color: #6b7280;">Tax:</td>
                <td style="padding: 12px; text-align: right;">${taxAmount}</td>
              </tr>
              ` : ''}
              <tr style="background: #f9fafb;">
                <td colspan="3" style="padding: 12px; text-align: right; font-weight: bold;">Total:</td>
                <td style="padding: 12px; text-align: right; font-weight: bold; font-size: 18px; color: #2d5aa0;">${total}</td>
              </tr>
            </tfoot>
          </table>

          ${notes ? `
          <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <p style="margin: 0; color: #92400e; font-size: 14px;"><strong>Note:</strong> ${notes}</p>
          </div>
          ` : ''}

          <!-- CTA Buttons -->
          <div style="text-align: center; margin-bottom: 24px;">
            ${paymentLink ? `
            <a href="${paymentLink}" style="display: inline-block; background: #2d5aa0; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; margin-right: 12px;">
              Pay Now
            </a>
            ` : ''}
            <a href="${viewLink}" style="display: inline-block; background: ${paymentLink ? '#f3f4f6' : '#2d5aa0'}; color: ${paymentLink ? '#374151' : 'white'}; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
              View Invoice
            </a>
          </div>

          ${businessPhone ? `
          <p style="margin: 0; color: #6b7280; font-size: 14px; text-align: center;">
            Questions? Call us at ${businessPhone}
          </p>
          ` : ''}
        </div>

        <!-- Footer -->
        <div style="background: #f9fafb; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; color: #9ca3af; font-size: 12px;">
            &copy; ${new Date().getFullYear()} ${businessName}. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function getPaymentReminderEmailHtml(params: {
  customerName: string;
  businessName: string;
  businessPhone?: string;
  invoiceNumber: string;
  amountDue: string;
  dueDate: string;
  daysOverdue?: number;
  paymentLink?: string;
  viewLink: string;
}) {
  const {
    customerName,
    businessName,
    businessPhone,
    invoiceNumber,
    amountDue,
    dueDate,
    daysOverdue,
    paymentLink,
    viewLink,
  } = params;

  const isOverdue = daysOverdue && daysOverdue > 0;
  const urgencyColor = isOverdue ? '#dc2626' : '#f59e0b';
  const urgencyText = isOverdue
    ? `This invoice is ${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue`
    : 'Payment is due soon';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.5; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px; background: #f3f4f6;">
      <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <!-- Header -->
        <div style="background: ${urgencyColor}; padding: 24px; text-align: center;">
          <h1 style="color: white; font-size: 24px; margin: 0;">Payment Reminder</h1>
        </div>

        <div style="padding: 32px;">
          <p style="margin: 0 0 8px 0;">Hi ${customerName},</p>
          <p style="margin: 0 0 24px 0;">${urgencyText}. Please review and submit payment at your earliest convenience.</p>

          <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px; border-left: 4px solid ${urgencyColor};">
            <div style="margin-bottom: 12px;">
              <span style="color: #6b7280; font-size: 14px;">Invoice</span>
              <div style="font-weight: bold; font-size: 18px;">${invoiceNumber}</div>
            </div>
            <div style="margin-bottom: 12px;">
              <span style="color: #6b7280; font-size: 14px;">Due Date</span>
              <div style="font-weight: bold; ${isOverdue ? 'color: #dc2626;' : ''}">${dueDate}</div>
            </div>
            <div>
              <span style="color: #6b7280; font-size: 14px;">Amount Due</span>
              <div style="font-weight: bold; font-size: 24px; color: #2d5aa0;">${amountDue}</div>
            </div>
          </div>

          <div style="text-align: center; margin-bottom: 24px;">
            ${paymentLink ? `
            <a href="${paymentLink}" style="display: inline-block; background: #2d5aa0; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; margin-right: 12px;">
              Pay Now
            </a>
            ` : ''}
            <a href="${viewLink}" style="display: inline-block; background: #f3f4f6; color: #374151; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
              View Invoice
            </a>
          </div>

          <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px; text-align: center;">
            If you have already paid, please disregard this reminder.
          </p>
          ${businessPhone ? `
          <p style="margin: 0; color: #6b7280; font-size: 14px; text-align: center;">
            Questions? Call us at ${businessPhone}
          </p>
          ` : ''}
        </div>

        <div style="background: #f9fafb; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; color: #9ca3af; font-size: 12px;">
            &copy; ${new Date().getFullYear()} ${businessName}. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// =====================================================
// JOB EMAIL TEMPLATES
// =====================================================

export function getJobConfirmationEmailHtml(params: {
  customerName: string;
  businessName: string;
  businessPhone?: string;
  jobTitle: string;
  scheduledDate: string;
  scheduledTime: string;
  address?: string;
  technicianName?: string;
  notes?: string;
  portalLink?: string;
}) {
  const {
    customerName,
    businessName,
    businessPhone,
    jobTitle,
    scheduledDate,
    scheduledTime,
    address,
    technicianName,
    notes,
    portalLink,
  } = params;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.5; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px; background: #f3f4f6;">
      <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div style="background: #059669; padding: 24px; text-align: center;">
          <h1 style="color: white; font-size: 24px; margin: 0;">Appointment Confirmed</h1>
        </div>

        <div style="padding: 32px;">
          <p style="margin: 0 0 16px 0;">Hi ${customerName},</p>
          <p style="margin: 0 0 24px 0;">Your appointment has been confirmed. Here are the details:</p>

          <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
            <div style="margin-bottom: 16px;">
              <div style="color: #6b7280; font-size: 12px; text-transform: uppercase;">Service</div>
              <div style="font-weight: bold; font-size: 18px;">${jobTitle}</div>
            </div>
            <div style="display: flex; gap: 24px; margin-bottom: 16px;">
              <div>
                <div style="color: #6b7280; font-size: 12px; text-transform: uppercase;">Date</div>
                <div style="font-weight: bold;">${scheduledDate}</div>
              </div>
              <div>
                <div style="color: #6b7280; font-size: 12px; text-transform: uppercase;">Time</div>
                <div style="font-weight: bold;">${scheduledTime}</div>
              </div>
            </div>
            ${address ? `
            <div style="margin-bottom: 16px;">
              <div style="color: #6b7280; font-size: 12px; text-transform: uppercase;">Location</div>
              <div>${address}</div>
            </div>
            ` : ''}
            ${technicianName ? `
            <div>
              <div style="color: #6b7280; font-size: 12px; text-transform: uppercase;">Technician</div>
              <div>${technicianName}</div>
            </div>
            ` : ''}
          </div>

          ${notes ? `
          <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <p style="margin: 0; color: #92400e; font-size: 14px;"><strong>Note:</strong> ${notes}</p>
          </div>
          ` : ''}

          ${portalLink ? `
          <div style="text-align: center; margin-bottom: 24px;">
            <a href="${portalLink}" style="display: inline-block; background: #2d5aa0; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
              View in Portal
            </a>
          </div>
          ` : ''}

          ${businessPhone ? `
          <p style="margin: 0; color: #6b7280; font-size: 14px; text-align: center;">
            Need to reschedule? Call us at ${businessPhone}
          </p>
          ` : ''}
        </div>

        <div style="background: #f9fafb; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; color: #9ca3af; font-size: 12px;">
            &copy; ${new Date().getFullYear()} ${businessName}. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function getJobCompletedEmailHtml(params: {
  customerName: string;
  businessName: string;
  businessPhone?: string;
  jobTitle: string;
  completedDate: string;
  technicianName?: string;
  workSummary?: string;
  invoiceLink?: string;
  reviewLink?: string;
}) {
  const {
    customerName,
    businessName,
    businessPhone,
    jobTitle,
    completedDate,
    technicianName,
    workSummary,
    invoiceLink,
    reviewLink,
  } = params;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.5; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px; background: #f3f4f6;">
      <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div style="background: #2d5aa0; padding: 24px; text-align: center;">
          <div style="width: 48px; height: 48px; background: white; border-radius: 50%; margin: 0 auto 12px; line-height: 48px;">
            <span style="color: #2d5aa0; font-size: 24px;">&#10003;</span>
          </div>
          <h1 style="color: white; font-size: 24px; margin: 0;">Job Completed</h1>
        </div>

        <div style="padding: 32px;">
          <p style="margin: 0 0 16px 0;">Hi ${customerName},</p>
          <p style="margin: 0 0 24px 0;">Great news! Your service has been completed.</p>

          <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
            <div style="margin-bottom: 12px;">
              <div style="color: #6b7280; font-size: 12px; text-transform: uppercase;">Service</div>
              <div style="font-weight: bold; font-size: 18px;">${jobTitle}</div>
            </div>
            <div style="margin-bottom: 12px;">
              <div style="color: #6b7280; font-size: 12px; text-transform: uppercase;">Completed</div>
              <div>${completedDate}</div>
            </div>
            ${technicianName ? `
            <div>
              <div style="color: #6b7280; font-size: 12px; text-transform: uppercase;">Technician</div>
              <div>${technicianName}</div>
            </div>
            ` : ''}
          </div>

          ${workSummary ? `
          <div style="margin-bottom: 24px;">
            <div style="color: #6b7280; font-size: 12px; text-transform: uppercase; margin-bottom: 8px;">Work Summary</div>
            <p style="margin: 0; background: #f9fafb; padding: 16px; border-radius: 8px;">${workSummary}</p>
          </div>
          ` : ''}

          <div style="text-align: center; margin-bottom: 24px;">
            ${invoiceLink ? `
            <a href="${invoiceLink}" style="display: inline-block; background: #2d5aa0; color: white; padding: 14px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; margin-right: 12px;">
              View Invoice
            </a>
            ` : ''}
            ${reviewLink ? `
            <a href="${reviewLink}" style="display: inline-block; background: #f59e0b; color: white; padding: 14px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">
              Leave Review
            </a>
            ` : ''}
          </div>

          <p style="margin: 0; color: #6b7280; font-size: 14px; text-align: center;">
            Thank you for choosing ${businessName}!
          </p>
        </div>

        <div style="background: #f9fafb; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; color: #9ca3af; font-size: 12px;">
            &copy; ${new Date().getFullYear()} ${businessName}. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function getJobRescheduledEmailHtml(params: {
  customerName: string;
  businessName: string;
  businessPhone?: string;
  jobTitle: string;
  oldDate: string;
  newDate: string;
  newTime: string;
  reason?: string;
}) {
  const { customerName, businessName, businessPhone, jobTitle, oldDate, newDate, newTime, reason } = params;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.5; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px; background: #f3f4f6;">
      <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div style="background: #f59e0b; padding: 24px; text-align: center;">
          <h1 style="color: white; font-size: 24px; margin: 0;">Appointment Rescheduled</h1>
        </div>

        <div style="padding: 32px;">
          <p style="margin: 0 0 16px 0;">Hi ${customerName},</p>
          <p style="margin: 0 0 24px 0;">Your appointment has been rescheduled. Please see the new details below:</p>

          <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
            <div style="margin-bottom: 16px;">
              <div style="color: #6b7280; font-size: 12px; text-transform: uppercase;">Service</div>
              <div style="font-weight: bold; font-size: 18px;">${jobTitle}</div>
            </div>
            <div style="margin-bottom: 16px;">
              <div style="color: #6b7280; font-size: 12px; text-transform: uppercase;">Previous Date</div>
              <div style="text-decoration: line-through; color: #9ca3af;">${oldDate}</div>
            </div>
            <div style="background: #ecfdf5; border-radius: 8px; padding: 16px;">
              <div style="color: #059669; font-size: 12px; text-transform: uppercase; font-weight: bold;">New Appointment</div>
              <div style="font-weight: bold; font-size: 18px; color: #059669;">${newDate} at ${newTime}</div>
            </div>
          </div>

          ${reason ? `
          <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <p style="margin: 0; color: #92400e; font-size: 14px;"><strong>Reason:</strong> ${reason}</p>
          </div>
          ` : ''}

          ${businessPhone ? `
          <p style="margin: 0; color: #6b7280; font-size: 14px; text-align: center;">
            Questions? Call us at ${businessPhone}
          </p>
          ` : ''}
        </div>

        <div style="background: #f9fafb; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; color: #9ca3af; font-size: 12px;">
            &copy; ${new Date().getFullYear()} ${businessName}. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function getJobCancelledEmailHtml(params: {
  customerName: string;
  businessName: string;
  businessPhone?: string;
  jobTitle: string;
  originalDate: string;
  reason?: string;
}) {
  const { customerName, businessName, businessPhone, jobTitle, originalDate, reason } = params;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.5; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px; background: #f3f4f6;">
      <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div style="background: #6b7280; padding: 24px; text-align: center;">
          <h1 style="color: white; font-size: 24px; margin: 0;">Appointment Cancelled</h1>
        </div>

        <div style="padding: 32px;">
          <p style="margin: 0 0 16px 0;">Hi ${customerName},</p>
          <p style="margin: 0 0 24px 0;">Your appointment has been cancelled:</p>

          <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px; opacity: 0.7;">
            <div style="margin-bottom: 12px;">
              <div style="color: #6b7280; font-size: 12px; text-transform: uppercase;">Service</div>
              <div style="font-weight: bold; text-decoration: line-through;">${jobTitle}</div>
            </div>
            <div>
              <div style="color: #6b7280; font-size: 12px; text-transform: uppercase;">Date</div>
              <div style="text-decoration: line-through;">${originalDate}</div>
            </div>
          </div>

          ${reason ? `
          <div style="background: #fee2e2; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <p style="margin: 0; color: #991b1b; font-size: 14px;"><strong>Reason:</strong> ${reason}</p>
          </div>
          ` : ''}

          <p style="margin: 0 0 16px 0; color: #6b7280; font-size: 14px; text-align: center;">
            We apologize for any inconvenience.
          </p>

          ${businessPhone ? `
          <p style="margin: 0; color: #6b7280; font-size: 14px; text-align: center;">
            To reschedule, please call us at ${businessPhone}
          </p>
          ` : ''}
        </div>

        <div style="background: #f9fafb; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; color: #9ca3af; font-size: 12px;">
            &copy; ${new Date().getFullYear()} ${businessName}. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function getTechnicianEnRouteEmailHtml(params: {
  customerName: string;
  businessName: string;
  businessPhone?: string;
  technicianName: string;
  estimatedArrival: string;
  jobTitle: string;
}) {
  const { customerName, businessName, businessPhone, technicianName, estimatedArrival, jobTitle } = params;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.5; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px; background: #f3f4f6;">
      <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div style="background: #3b82f6; padding: 24px; text-align: center;">
          <div style="font-size: 36px; margin-bottom: 8px;">🚗</div>
          <h1 style="color: white; font-size: 24px; margin: 0;">Technician On The Way!</h1>
        </div>

        <div style="padding: 32px;">
          <p style="margin: 0 0 16px 0;">Hi ${customerName},</p>
          <p style="margin: 0 0 24px 0;">Good news! Your technician is on the way.</p>

          <div style="background: #eff6ff; border-radius: 8px; padding: 20px; margin-bottom: 24px; border: 2px solid #3b82f6;">
            <div style="margin-bottom: 16px;">
              <div style="color: #1e40af; font-size: 12px; text-transform: uppercase;">Technician</div>
              <div style="font-weight: bold; font-size: 18px;">${technicianName}</div>
            </div>
            <div style="margin-bottom: 16px;">
              <div style="color: #1e40af; font-size: 12px; text-transform: uppercase;">Estimated Arrival</div>
              <div style="font-weight: bold; font-size: 24px; color: #2563eb;">${estimatedArrival}</div>
            </div>
            <div>
              <div style="color: #1e40af; font-size: 12px; text-transform: uppercase;">Service</div>
              <div>${jobTitle}</div>
            </div>
          </div>

          <p style="margin: 0; color: #6b7280; font-size: 14px; text-align: center;">
            Please ensure access to the service area.
          </p>
          ${businessPhone ? `
          <p style="margin: 8px 0 0 0; color: #6b7280; font-size: 14px; text-align: center;">
            Questions? Call ${businessPhone}
          </p>
          ` : ''}
        </div>

        <div style="background: #f9fafb; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; color: #9ca3af; font-size: 12px;">
            &copy; ${new Date().getFullYear()} ${businessName}. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// =====================================================
// QUOTE EMAIL TEMPLATES
// =====================================================

export function getQuoteDeliveryEmailHtml(params: {
  customerName: string;
  businessName: string;
  businessPhone?: string;
  quoteNumber: string;
  totalAmount: string;
  validUntil: string;
  lineItems: Array<{ name: string; quantity: number; unitPrice: number; total: number }>;
  subtotal: string;
  taxAmount?: string;
  viewLink: string;
  notes?: string;
}) {
  const {
    customerName,
    businessName,
    businessPhone,
    quoteNumber,
    totalAmount,
    validUntil,
    lineItems,
    subtotal,
    taxAmount,
    viewLink,
    notes,
  } = params;

  const lineItemsHtml = lineItems
    .map(
      (item) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.name}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${item.unitPrice.toFixed(2)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${item.total.toFixed(2)}</td>
      </tr>
    `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.5; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px; background: #f3f4f6;">
      <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div style="background: #8b5cf6; padding: 24px; text-align: center;">
          <h1 style="color: white; font-size: 24px; margin: 0;">${businessName}</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0;">Quote #${quoteNumber}</p>
        </div>

        <div style="padding: 32px;">
          <p style="margin: 0 0 8px 0;">Hi ${customerName},</p>
          <p style="margin: 0 0 24px 0;">Thank you for your interest! Here's your quote:</p>

          <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <table style="width: 100%;">
              <tr>
                <td style="color: #6b7280;">Quote Total:</td>
                <td style="text-align: right;"><strong style="color: #8b5cf6; font-size: 24px;">${totalAmount}</strong></td>
              </tr>
              <tr>
                <td style="color: #6b7280;">Valid Until:</td>
                <td style="text-align: right;"><strong>${validUntil}</strong></td>
              </tr>
            </table>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <thead>
              <tr style="background: #f9fafb;">
                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Item</th>
                <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e5e7eb;">Qty</th>
                <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e7eb;">Price</th>
                <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e7eb;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${lineItemsHtml}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3" style="padding: 12px; text-align: right; color: #6b7280;">Subtotal:</td>
                <td style="padding: 12px; text-align: right;">${subtotal}</td>
              </tr>
              ${taxAmount ? `
              <tr>
                <td colspan="3" style="padding: 12px; text-align: right; color: #6b7280;">Tax:</td>
                <td style="padding: 12px; text-align: right;">${taxAmount}</td>
              </tr>
              ` : ''}
              <tr style="background: #f9fafb;">
                <td colspan="3" style="padding: 12px; text-align: right; font-weight: bold;">Total:</td>
                <td style="padding: 12px; text-align: right; font-weight: bold; font-size: 18px; color: #8b5cf6;">${totalAmount}</td>
              </tr>
            </tfoot>
          </table>

          ${notes ? `
          <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <p style="margin: 0; color: #92400e; font-size: 14px;"><strong>Note:</strong> ${notes}</p>
          </div>
          ` : ''}

          <div style="text-align: center; margin-bottom: 24px;">
            <a href="${viewLink}" style="display: inline-block; background: #8b5cf6; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
              View & Accept Quote
            </a>
          </div>

          ${businessPhone ? `
          <p style="margin: 0; color: #6b7280; font-size: 14px; text-align: center;">
            Questions? Call us at ${businessPhone}
          </p>
          ` : ''}
        </div>

        <div style="background: #f9fafb; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; color: #9ca3af; font-size: 12px;">
            &copy; ${new Date().getFullYear()} ${businessName}. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function getPaymentConfirmationEmailHtml(params: {
  customerName: string;
  businessName: string;
  invoiceNumber: string;
  amountPaid: string;
  paymentMethod: string;
  paymentDate: string;
  remainingBalance?: string;
}) {
  const {
    customerName,
    businessName,
    invoiceNumber,
    amountPaid,
    paymentMethod,
    paymentDate,
    remainingBalance,
  } = params;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.5; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px; background: #f3f4f6;">
      <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div style="background: #059669; padding: 24px; text-align: center;">
          <div style="width: 48px; height: 48px; background: white; border-radius: 50%; margin: 0 auto 12px; line-height: 48px;">
            <span style="color: #059669; font-size: 24px;">&#10003;</span>
          </div>
          <h1 style="color: white; font-size: 24px; margin: 0;">Payment Received</h1>
        </div>

        <div style="padding: 32px;">
          <p style="margin: 0 0 24px 0;">Hi ${customerName}, thank you for your payment!</p>

          <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
            <table style="width: 100%;">
              <tr>
                <td style="color: #6b7280; padding: 4px 0;">Invoice:</td>
                <td style="text-align: right; padding: 4px 0;"><strong>${invoiceNumber}</strong></td>
              </tr>
              <tr>
                <td style="color: #6b7280; padding: 4px 0;">Amount Paid:</td>
                <td style="text-align: right; padding: 4px 0;"><strong style="color: #059669;">${amountPaid}</strong></td>
              </tr>
              <tr>
                <td style="color: #6b7280; padding: 4px 0;">Payment Method:</td>
                <td style="text-align: right; padding: 4px 0;"><strong>${paymentMethod}</strong></td>
              </tr>
              <tr>
                <td style="color: #6b7280; padding: 4px 0;">Date:</td>
                <td style="text-align: right; padding: 4px 0;"><strong>${paymentDate}</strong></td>
              </tr>
              ${remainingBalance && remainingBalance !== '$0.00' ? `
              <tr style="border-top: 1px solid #e5e7eb;">
                <td style="color: #6b7280; padding: 12px 0 4px 0;">Remaining Balance:</td>
                <td style="text-align: right; padding: 12px 0 4px 0;"><strong style="color: #f59e0b;">${remainingBalance}</strong></td>
              </tr>
              ` : ''}
            </table>
          </div>

          <p style="margin: 0; color: #6b7280; font-size: 14px; text-align: center;">
            Thank you for choosing ${businessName}!
          </p>
        </div>

        <div style="background: #f9fafb; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; color: #9ca3af; font-size: 12px;">
            &copy; ${new Date().getFullYear()} ${businessName}. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}
