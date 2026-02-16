;!function(){try { var e="undefined"!=typeof globalThis?globalThis:"undefined"!=typeof global?global:"undefined"!=typeof window?window:"undefined"!=typeof self?self:{},n=(new e.Error).stack;n&&((e._debugIds|| (e._debugIds={}))[n]="0ca15598-c756-ec09-ed53-c3c2da61919f")}catch(e){}}();
module.exports = [
"[project]/lib/email/index.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// =====================================================
// EMAIL LIBRARY (Resend)
// =====================================================
__turbopack_context__.s([
    "getAppointmentReminderEmailHtml",
    ()=>getAppointmentReminderEmailHtml,
    "getInvitationEmailHtml",
    ()=>getInvitationEmailHtml,
    "getInvoiceDeliveryEmailHtml",
    ()=>getInvoiceDeliveryEmailHtml,
    "getInvoiceEmailHtml",
    ()=>getInvoiceEmailHtml,
    "getJobCancelledEmailHtml",
    ()=>getJobCancelledEmailHtml,
    "getJobCompletedEmailHtml",
    ()=>getJobCompletedEmailHtml,
    "getJobConfirmationEmailHtml",
    ()=>getJobConfirmationEmailHtml,
    "getJobRescheduledEmailHtml",
    ()=>getJobRescheduledEmailHtml,
    "getOwnershipTransferEmailHtml",
    ()=>getOwnershipTransferEmailHtml,
    "getPaymentConfirmationEmailHtml",
    ()=>getPaymentConfirmationEmailHtml,
    "getPaymentReminderEmailHtml",
    ()=>getPaymentReminderEmailHtml,
    "getQuoteDeliveryEmailHtml",
    ()=>getQuoteDeliveryEmailHtml,
    "getQuoteEmailHtml",
    ()=>getQuoteEmailHtml,
    "getReviewRequestEmailHtml",
    ()=>getReviewRequestEmailHtml,
    "getSurveyEmailHtml",
    ()=>getSurveyEmailHtml,
    "getTechnicianEnRouteEmailHtml",
    ()=>getTechnicianEnRouteEmailHtml,
    "getTrialInviteEmailHtml",
    ()=>getTrialInviteEmailHtml,
    "getTrialReminderEmailHtml",
    ()=>getTrialReminderEmailHtml,
    "getWelcomeEmailHtml",
    ()=>getWelcomeEmailHtml,
    "isEmailConfigured",
    ()=>isEmailConfigured,
    "sendEmail",
    ()=>sendEmail
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$resend$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/resend/dist/index.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/logger/index.ts [app-route] (ecmascript)");
;
;
let _resend = null;
function getResend() {
    if (!process.env.RESEND_API_KEY) {
        return null;
    }
    if (!_resend) {
        _resend = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$resend$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Resend"](process.env.RESEND_API_KEY);
    }
    return _resend;
}
function isEmailConfigured() {
    return !!process.env.RESEND_API_KEY;
}
async function sendEmail(params) {
    const { to, subject, html, from, text } = params;
    const resend = getResend();
    if (!resend) {
        return {
            success: false,
            error: 'Email not configured'
        };
    }
    try {
        const result = await resend.emails.send({
            from: from || 'Trades Captain <noreply@tradescaptain.com>',
            to,
            subject,
            html,
            text
        });
        return {
            success: true,
            data: result
        };
    } catch (error) {
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["emailLogger"].error({
            msg: 'Failed to send email',
            error: error instanceof Error ? {
                name: error.name,
                message: error.message,
                stack: error.stack
            } : {
                message: String(error)
            },
            to,
            subject
        });
        return {
            success: false,
            error
        };
    }
}
function getInvitationEmailHtml(params) {
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
function getOwnershipTransferEmailHtml(params) {
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
function getQuoteEmailHtml(params) {
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
function getInvoiceEmailHtml(params) {
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
function getAppointmentReminderEmailHtml(params) {
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
function getReviewRequestEmailHtml(params) {
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
function getSurveyEmailHtml(params) {
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
function getTrialInviteEmailHtml(params) {
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
function getWelcomeEmailHtml(params) {
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
function getTrialReminderEmailHtml(params) {
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
function getInvoiceDeliveryEmailHtml(params) {
    const { customerName, businessName, businessPhone, invoiceNumber, amountDue, dueDate, lineItems, subtotal, taxAmount, total, paymentLink, viewLink, notes } = params;
    const lineItemsHtml = lineItems.map((item)=>`
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.name}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${item.unitPrice.toFixed(2)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${item.total.toFixed(2)}</td>
      </tr>
    `).join('');
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
function getPaymentReminderEmailHtml(params) {
    const { customerName, businessName, businessPhone, invoiceNumber, amountDue, dueDate, daysOverdue, paymentLink, viewLink } = params;
    const isOverdue = daysOverdue && daysOverdue > 0;
    const urgencyColor = isOverdue ? '#dc2626' : '#f59e0b';
    const urgencyText = isOverdue ? `This invoice is ${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue` : 'Payment is due soon';
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
function getJobConfirmationEmailHtml(params) {
    const { customerName, businessName, businessPhone, jobTitle, scheduledDate, scheduledTime, address, technicianName, notes, portalLink } = params;
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
function getJobCompletedEmailHtml(params) {
    const { customerName, businessName, businessPhone, jobTitle, completedDate, technicianName, workSummary, invoiceLink, reviewLink } = params;
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
function getJobRescheduledEmailHtml(params) {
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
function getJobCancelledEmailHtml(params) {
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
function getTechnicianEnRouteEmailHtml(params) {
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
function getQuoteDeliveryEmailHtml(params) {
    const { customerName, businessName, businessPhone, quoteNumber, totalAmount, validUntil, lineItems, subtotal, taxAmount, viewLink, notes } = params;
    const lineItemsHtml = lineItems.map((item)=>`
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.name}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${item.unitPrice.toFixed(2)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${item.total.toFixed(2)}</td>
      </tr>
    `).join('');
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
function getPaymentConfirmationEmailHtml(params) {
    const { customerName, businessName, invoiceNumber, amountPaid, paymentMethod, paymentDate, remainingBalance } = params;
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
}),
"[project]/node_modules/resend/dist/index.mjs [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Resend",
    ()=>Resend
]);
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value)=>key in obj ? __defProp(obj, key, {
        enumerable: true,
        configurable: true,
        writable: true,
        value
    }) : obj[key] = value;
var __spreadValues = (a, b)=>{
    for(var prop in b || (b = {}))if (__hasOwnProp.call(b, prop)) __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols) for (var prop of __getOwnPropSymbols(b)){
        if (__propIsEnum.call(b, prop)) __defNormalProp(a, prop, b[prop]);
    }
    return a;
};
var __spreadProps = (a, b)=>__defProps(a, __getOwnPropDescs(b));
var __async = (__this, __arguments, generator)=>{
    return new Promise((resolve, reject)=>{
        var fulfilled = (value)=>{
            try {
                step(generator.next(value));
            } catch (e) {
                reject(e);
            }
        };
        var rejected = (value)=>{
            try {
                step(generator.throw(value));
            } catch (e) {
                reject(e);
            }
        };
        var step = (x)=>x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
        step((generator = generator.apply(__this, __arguments)).next());
    });
};
// package.json
var version = "4.8.0";
// src/api-keys/api-keys.ts
var ApiKeys = class {
    constructor(resend){
        this.resend = resend;
    }
    create(_0) {
        return __async(this, arguments, function*(payload, options = {}) {
            const data = yield this.resend.post("/api-keys", payload, options);
            return data;
        });
    }
    list() {
        return __async(this, null, function*() {
            const data = yield this.resend.get("/api-keys");
            return data;
        });
    }
    remove(id) {
        return __async(this, null, function*() {
            const data = yield this.resend.delete(`/api-keys/${id}`);
            return data;
        });
    }
};
// src/audiences/audiences.ts
var Audiences = class {
    constructor(resend){
        this.resend = resend;
    }
    create(_0) {
        return __async(this, arguments, function*(payload, options = {}) {
            const data = yield this.resend.post("/audiences", payload, options);
            return data;
        });
    }
    list() {
        return __async(this, null, function*() {
            const data = yield this.resend.get("/audiences");
            return data;
        });
    }
    get(id) {
        return __async(this, null, function*() {
            const data = yield this.resend.get(`/audiences/${id}`);
            return data;
        });
    }
    remove(id) {
        return __async(this, null, function*() {
            const data = yield this.resend.delete(`/audiences/${id}`);
            return data;
        });
    }
};
// src/common/utils/parse-email-to-api-options.ts
function parseAttachments(attachments) {
    return attachments == null ? void 0 : attachments.map((attachment)=>({
            content: attachment.content,
            filename: attachment.filename,
            path: attachment.path,
            content_type: attachment.contentType,
            inline_content_id: attachment.inlineContentId
        }));
}
function parseEmailToApiOptions(email) {
    return {
        attachments: parseAttachments(email.attachments),
        bcc: email.bcc,
        cc: email.cc,
        from: email.from,
        headers: email.headers,
        html: email.html,
        reply_to: email.replyTo,
        scheduled_at: email.scheduledAt,
        subject: email.subject,
        tags: email.tags,
        text: email.text,
        to: email.to
    };
}
// src/batch/batch.ts
var Batch = class {
    constructor(resend){
        this.resend = resend;
    }
    send(_0) {
        return __async(this, arguments, function*(payload, options = {}) {
            return this.create(payload, options);
        });
    }
    create(_0) {
        return __async(this, arguments, function*(payload, options = {}) {
            const emails = [];
            for (const email of payload){
                if (email.react) {
                    if (!this.renderAsync) {
                        try {
                            const { renderAsync } = yield __turbopack_context__.A("[project]/node_modules/@react-email/render/dist/node/index.mjs [app-route] (ecmascript, async loader)");
                            this.renderAsync = renderAsync;
                        } catch (error) {
                            throw new Error("Failed to render React component. Make sure to install `@react-email/render`");
                        }
                    }
                    email.html = yield this.renderAsync(email.react);
                    email.react = void 0;
                }
                emails.push(parseEmailToApiOptions(email));
            }
            const data = yield this.resend.post("/emails/batch", emails, options);
            return data;
        });
    }
};
// src/broadcasts/broadcasts.ts
var Broadcasts = class {
    constructor(resend){
        this.resend = resend;
    }
    create(_0) {
        return __async(this, arguments, function*(payload, options = {}) {
            if (payload.react) {
                if (!this.renderAsync) {
                    try {
                        const { renderAsync } = yield __turbopack_context__.A("[project]/node_modules/@react-email/render/dist/node/index.mjs [app-route] (ecmascript, async loader)");
                        this.renderAsync = renderAsync;
                    } catch (error) {
                        throw new Error("Failed to render React component. Make sure to install `@react-email/render`");
                    }
                }
                payload.html = yield this.renderAsync(payload.react);
            }
            const data = yield this.resend.post("/broadcasts", {
                name: payload.name,
                audience_id: payload.audienceId,
                preview_text: payload.previewText,
                from: payload.from,
                html: payload.html,
                reply_to: payload.replyTo,
                subject: payload.subject,
                text: payload.text
            }, options);
            return data;
        });
    }
    send(id, payload) {
        return __async(this, null, function*() {
            const data = yield this.resend.post(`/broadcasts/${id}/send`, {
                scheduled_at: payload == null ? void 0 : payload.scheduledAt
            });
            return data;
        });
    }
    list() {
        return __async(this, null, function*() {
            const data = yield this.resend.get("/broadcasts");
            return data;
        });
    }
    get(id) {
        return __async(this, null, function*() {
            const data = yield this.resend.get(`/broadcasts/${id}`);
            return data;
        });
    }
    remove(id) {
        return __async(this, null, function*() {
            const data = yield this.resend.delete(`/broadcasts/${id}`);
            return data;
        });
    }
    update(id, payload) {
        return __async(this, null, function*() {
            const data = yield this.resend.patch(`/broadcasts/${id}`, {
                name: payload.name,
                audience_id: payload.audienceId,
                from: payload.from,
                html: payload.html,
                text: payload.text,
                subject: payload.subject,
                reply_to: payload.replyTo,
                preview_text: payload.previewText
            });
            return data;
        });
    }
};
// src/contacts/contacts.ts
var Contacts = class {
    constructor(resend){
        this.resend = resend;
    }
    create(_0) {
        return __async(this, arguments, function*(payload, options = {}) {
            const data = yield this.resend.post(`/audiences/${payload.audienceId}/contacts`, {
                unsubscribed: payload.unsubscribed,
                email: payload.email,
                first_name: payload.firstName,
                last_name: payload.lastName
            }, options);
            return data;
        });
    }
    list(options) {
        return __async(this, null, function*() {
            const data = yield this.resend.get(`/audiences/${options.audienceId}/contacts`);
            return data;
        });
    }
    get(options) {
        return __async(this, null, function*() {
            if (!options.id && !options.email) {
                return {
                    data: null,
                    error: {
                        message: "Missing `id` or `email` field.",
                        name: "missing_required_field"
                    }
                };
            }
            const data = yield this.resend.get(`/audiences/${options.audienceId}/contacts/${(options == null ? void 0 : options.email) ? options == null ? void 0 : options.email : options == null ? void 0 : options.id}`);
            return data;
        });
    }
    update(payload) {
        return __async(this, null, function*() {
            if (!payload.id && !payload.email) {
                return {
                    data: null,
                    error: {
                        message: "Missing `id` or `email` field.",
                        name: "missing_required_field"
                    }
                };
            }
            const data = yield this.resend.patch(`/audiences/${payload.audienceId}/contacts/${(payload == null ? void 0 : payload.email) ? payload == null ? void 0 : payload.email : payload == null ? void 0 : payload.id}`, {
                unsubscribed: payload.unsubscribed,
                first_name: payload.firstName,
                last_name: payload.lastName
            });
            return data;
        });
    }
    remove(payload) {
        return __async(this, null, function*() {
            if (!payload.id && !payload.email) {
                return {
                    data: null,
                    error: {
                        message: "Missing `id` or `email` field.",
                        name: "missing_required_field"
                    }
                };
            }
            const data = yield this.resend.delete(`/audiences/${payload.audienceId}/contacts/${(payload == null ? void 0 : payload.email) ? payload == null ? void 0 : payload.email : payload == null ? void 0 : payload.id}`);
            return data;
        });
    }
};
// src/common/utils/parse-domain-to-api-options.ts
function parseDomainToApiOptions(domain) {
    return {
        name: domain.name,
        region: domain.region,
        custom_return_path: domain.customReturnPath
    };
}
// src/domains/domains.ts
var Domains = class {
    constructor(resend){
        this.resend = resend;
    }
    create(_0) {
        return __async(this, arguments, function*(payload, options = {}) {
            const data = yield this.resend.post("/domains", parseDomainToApiOptions(payload), options);
            return data;
        });
    }
    list() {
        return __async(this, null, function*() {
            const data = yield this.resend.get("/domains");
            return data;
        });
    }
    get(id) {
        return __async(this, null, function*() {
            const data = yield this.resend.get(`/domains/${id}`);
            return data;
        });
    }
    update(payload) {
        return __async(this, null, function*() {
            const data = yield this.resend.patch(`/domains/${payload.id}`, {
                click_tracking: payload.clickTracking,
                open_tracking: payload.openTracking,
                tls: payload.tls
            });
            return data;
        });
    }
    remove(id) {
        return __async(this, null, function*() {
            const data = yield this.resend.delete(`/domains/${id}`);
            return data;
        });
    }
    verify(id) {
        return __async(this, null, function*() {
            const data = yield this.resend.post(`/domains/${id}/verify`);
            return data;
        });
    }
};
// src/emails/emails.ts
var Emails = class {
    constructor(resend){
        this.resend = resend;
    }
    send(_0) {
        return __async(this, arguments, function*(payload, options = {}) {
            return this.create(payload, options);
        });
    }
    create(_0) {
        return __async(this, arguments, function*(payload, options = {}) {
            if (payload.react) {
                if (!this.renderAsync) {
                    try {
                        const { renderAsync } = yield __turbopack_context__.A("[project]/node_modules/@react-email/render/dist/node/index.mjs [app-route] (ecmascript, async loader)");
                        this.renderAsync = renderAsync;
                    } catch (error) {
                        throw new Error("Failed to render React component. Make sure to install `@react-email/render`");
                    }
                }
                payload.html = yield this.renderAsync(payload.react);
            }
            const data = yield this.resend.post("/emails", parseEmailToApiOptions(payload), options);
            return data;
        });
    }
    get(id) {
        return __async(this, null, function*() {
            const data = yield this.resend.get(`/emails/${id}`);
            return data;
        });
    }
    update(payload) {
        return __async(this, null, function*() {
            const data = yield this.resend.patch(`/emails/${payload.id}`, {
                scheduled_at: payload.scheduledAt
            });
            return data;
        });
    }
    cancel(id) {
        return __async(this, null, function*() {
            const data = yield this.resend.post(`/emails/${id}/cancel`);
            return data;
        });
    }
};
// src/resend.ts
var defaultBaseUrl = "https://api.resend.com";
var defaultUserAgent = `resend-node:${version}`;
var baseUrl = typeof process !== "undefined" && process.env ? process.env.RESEND_BASE_URL || defaultBaseUrl : defaultBaseUrl;
var userAgent = typeof process !== "undefined" && process.env ? process.env.RESEND_USER_AGENT || defaultUserAgent : defaultUserAgent;
var Resend = class {
    constructor(key){
        this.key = key;
        this.apiKeys = new ApiKeys(this);
        this.audiences = new Audiences(this);
        this.batch = new Batch(this);
        this.broadcasts = new Broadcasts(this);
        this.contacts = new Contacts(this);
        this.domains = new Domains(this);
        this.emails = new Emails(this);
        if (!key) {
            if (typeof process !== "undefined" && process.env) {
                this.key = process.env.RESEND_API_KEY;
            }
            if (!this.key) {
                throw new Error('Missing API key. Pass it to the constructor `new Resend("re_123")`');
            }
        }
        this.headers = new Headers({
            Authorization: `Bearer ${this.key}`,
            "User-Agent": userAgent,
            "Content-Type": "application/json"
        });
    }
    fetchRequest(_0) {
        return __async(this, arguments, function*(path, options = {}) {
            try {
                const response = yield fetch(`${baseUrl}${path}`, options);
                if (!response.ok) {
                    try {
                        const rawError = yield response.text();
                        return {
                            data: null,
                            error: JSON.parse(rawError)
                        };
                    } catch (err) {
                        if (err instanceof SyntaxError) {
                            return {
                                data: null,
                                error: {
                                    name: "application_error",
                                    message: "Internal server error. We are unable to process your request right now, please try again later."
                                }
                            };
                        }
                        const error = {
                            message: response.statusText,
                            name: "application_error"
                        };
                        if (err instanceof Error) {
                            return {
                                data: null,
                                error: __spreadProps(__spreadValues({}, error), {
                                    message: err.message
                                })
                            };
                        }
                        return {
                            data: null,
                            error
                        };
                    }
                }
                const data = yield response.json();
                return {
                    data,
                    error: null
                };
            } catch (error) {
                return {
                    data: null,
                    error: {
                        name: "application_error",
                        message: "Unable to fetch data. The request could not be resolved."
                    }
                };
            }
        });
    }
    post(_0, _1) {
        return __async(this, arguments, function*(path, entity, options = {}) {
            const headers = new Headers(this.headers);
            if (options.idempotencyKey) {
                headers.set("Idempotency-Key", options.idempotencyKey);
            }
            const requestOptions = __spreadValues({
                method: "POST",
                headers,
                body: JSON.stringify(entity)
            }, options);
            return this.fetchRequest(path, requestOptions);
        });
    }
    get(_0) {
        return __async(this, arguments, function*(path, options = {}) {
            const requestOptions = __spreadValues({
                method: "GET",
                headers: this.headers
            }, options);
            return this.fetchRequest(path, requestOptions);
        });
    }
    put(_0, _1) {
        return __async(this, arguments, function*(path, entity, options = {}) {
            const requestOptions = __spreadValues({
                method: "PUT",
                headers: this.headers,
                body: JSON.stringify(entity)
            }, options);
            return this.fetchRequest(path, requestOptions);
        });
    }
    patch(_0, _1) {
        return __async(this, arguments, function*(path, entity, options = {}) {
            const requestOptions = __spreadValues({
                method: "PATCH",
                headers: this.headers,
                body: JSON.stringify(entity)
            }, options);
            return this.fetchRequest(path, requestOptions);
        });
    }
    delete(path, query) {
        return __async(this, null, function*() {
            const requestOptions = {
                method: "DELETE",
                headers: this.headers,
                body: JSON.stringify(query)
            };
            return this.fetchRequest(path, requestOptions);
        });
    }
};
;
}),
];

//# debugId=0ca15598-c756-ec09-ed53-c3c2da61919f
//# sourceMappingURL=_baa71219._.js.map