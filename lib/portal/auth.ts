// =====================================================
// CUSTOMER PORTAL AUTHENTICATION
// Magic link and password-based auth for customers
// =====================================================

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { randomBytes, createHash } from 'crypto';
import bcrypt from 'bcryptjs';
import { logger } from '@/lib/logger';
const portalAuthLogger = logger.child({ context: 'portal.auth' });

const MAGIC_LINK_EXPIRY_MINUTES = 15;

// Password policy constants
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_REQUIREMENTS = {
  minLength: PASSWORD_MIN_LENGTH,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: true,
};

/**
 * Validate password strength
 */
export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < PASSWORD_REQUIREMENTS.minLength) {
    errors.push(`Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters`);
  }

  if (PASSWORD_REQUIREMENTS.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (PASSWORD_REQUIREMENTS.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (PASSWORD_REQUIREMENTS.requireNumber && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (PASSWORD_REQUIREMENTS.requireSpecial && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Send magic link to customer email
 */
export async function sendMagicLink(
  businessId: string,
  email: string
): Promise<{ success: boolean; error?: string }> {
  // Use admin client to bypass RLS for user lookup
  const supabase = createAdminClient();

  // Find customer portal access
  const { data: access } = await supabase
    .from('customer_portal_access')
    .select('*, customer:customers(*)')
    .eq('business_id', businessId)
    .eq('email', email.toLowerCase())
    .eq('is_active', true)
    .single();

  if (!access) {
    return { success: false, error: 'No account found with this email' };
  }

  // Generate token
  const token = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + MAGIC_LINK_EXPIRY_MINUTES * 60 * 1000);

  // Store token
  await supabase
    .from('customer_portal_access')
    .update({
      magic_link_token: tokenHash,
      magic_link_expires_at: expiresAt.toISOString(),
    })
    .eq('id', access.id);

  // Get business info for email
  const { data: business } = await supabase
    .from('businesses')
    .select('name')
    .eq('id', businessId)
    .single();

  // Build magic link URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const magicLink = `${baseUrl}/portal/auth/verify?token=${token}&business=${businessId}`;

  // Send email
  // In development/test environments, log a hint (not the full token) for debugging
  if (process.env.NODE_ENV !== 'production') {
    portalAuthLogger.info({
      msg: 'Magic link generated for development',
      email,
      businessId,
      // Only log token prefix for debugging, never the full token
      tokenPrefix: token.substring(0, 8) + '...',
    });
  }

  try {
    const { sendEmail } = await import('@/lib/email');
    await sendEmail({
      to: email,
      subject: `Sign in to ${business?.name || 'Customer Portal'}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .button { display: inline-block; background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: 500; }
            .footer { color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Sign in to your account</h2>
            <p>Hi ${access.customer?.name?.split(' ')[0] || 'there'},</p>
            <p>Click the button below to sign in to your customer portal:</p>
            <a href="${magicLink}" class="button">Sign In to Portal</a>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; font-size: 14px; color: #666;">${magicLink}</p>
            <div class="footer">
              <p>This link expires in ${MAGIC_LINK_EXPIRY_MINUTES} minutes.</p>
              <p>If you didn't request this, you can safely ignore this email.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Sign in to your account\n\nClick this link to sign in: ${magicLink}\n\nThis link expires in ${MAGIC_LINK_EXPIRY_MINUTES} minutes.`,
    });
  } catch (error) {
    // Email sending failed - in production, this should trigger an alert
    // Magic link was still generated but customer won't receive it
    portalAuthLogger.error({
      msg: 'Failed to send magic link email',
      businessId,
      email,
      error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) },
    });
  }

  return { success: true };
}

/**
 * Verify magic link token
 */
export async function verifyMagicLink(
  businessId: string,
  token: string
): Promise<{
  success: boolean;
  customerId?: string;
  accessId?: string;
  error?: string;
}> {
  // Use admin client to bypass RLS for token verification
  const supabase = createAdminClient();
  const tokenHash = createHash('sha256').update(token).digest('hex');

  const { data: access } = await supabase
    .from('customer_portal_access')
    .select('*')
    .eq('business_id', businessId)
    .eq('magic_link_token', tokenHash)
    .eq('is_active', true)
    .single();

  if (!access) {
    return { success: false, error: 'Invalid or expired link' };
  }

  if (new Date(access.magic_link_expires_at) < new Date()) {
    return { success: false, error: 'Link has expired. Please request a new one.' };
  }

  // Clear token and update last login
  await supabase
    .from('customer_portal_access')
    .update({
      magic_link_token: null,
      magic_link_expires_at: null,
      last_login_at: new Date().toISOString(),
      email_verified: true,
    })
    .eq('id', access.id);

  return {
    success: true,
    customerId: access.customer_id,
    accessId: access.id,
  };
}

/**
 * Create portal access for a customer
 */
export async function createPortalAccess(
  businessId: string,
  customerId: string,
  email: string,
  options?: {
    sendInvite?: boolean;
    password?: string;
  }
): Promise<string> {
  const supabase = await createClient();

  const insertData: Record<string, any> = {
    business_id: businessId,
    customer_id: customerId,
    email: email.toLowerCase(),
  };

  // Hash password if provided (with validation)
  if (options?.password) {
    const validation = validatePassword(options.password);
    if (!validation.valid) {
      throw new Error(`Password does not meet requirements: ${validation.errors.join(', ')}`);
    }
    insertData.password_hash = await bcrypt.hash(options.password, 12);
  }

  const { data, error } = await supabase
    .from('customer_portal_access')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('Portal access already exists for this customer');
    }
    throw error;
  }

  if (options?.sendInvite !== false) {
    await sendMagicLink(businessId, email);
  }

  return data.id;
}

/**
 * Verify password login
 */
export async function verifyPassword(
  businessId: string,
  email: string,
  password: string
): Promise<{
  success: boolean;
  customerId?: string;
  accessId?: string;
  error?: string;
}> {
  // Use admin client to bypass RLS for password verification
  const supabase = createAdminClient();

  const { data: access } = await supabase
    .from('customer_portal_access')
    .select('*')
    .eq('business_id', businessId)
    .eq('email', email.toLowerCase())
    .eq('is_active', true)
    .single();

  if (!access) {
    return { success: false, error: 'Invalid email or password' };
  }

  if (!access.password_hash) {
    return { success: false, error: 'Please use the magic link to sign in' };
  }

  const isValid = await bcrypt.compare(password, access.password_hash);

  if (!isValid) {
    return { success: false, error: 'Invalid email or password' };
  }

  // Update last login
  await supabase
    .from('customer_portal_access')
    .update({
      last_login_at: new Date().toISOString(),
    })
    .eq('id', access.id);

  return {
    success: true,
    customerId: access.customer_id,
    accessId: access.id,
  };
}

/**
 * Set password for portal access
 */
export async function setPortalPassword(
  accessId: string,
  password: string
): Promise<{ success: boolean; errors?: string[] }> {
  // Validate password strength
  const validation = validatePassword(password);
  if (!validation.valid) {
    return { success: false, errors: validation.errors };
  }

  const supabase = await createClient();

  const passwordHash = await bcrypt.hash(password, 12);

  const { error } = await supabase
    .from('customer_portal_access')
    .update({ password_hash: passwordHash })
    .eq('id', accessId);

  if (error) {
    portalAuthLogger.error({
      msg: 'Failed to set portal password',
      accessId,
      error: error.message,
    });
    return { success: false, errors: ['Failed to update password'] };
  }

  return { success: true };
}

/**
 * Get portal access by customer ID
 */
export async function getPortalAccess(customerId: string) {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from('customer_portal_access')
    .select('*')
    .eq('customer_id', customerId)
    .single();

  return data;
}

/**
 * Update notification preferences
 */
export async function updateNotificationPreferences(
  accessId: string,
  preferences: { email?: boolean; sms?: boolean }
) {
  const supabase = createAdminClient();

  const { data: current } = await supabase
    .from('customer_portal_access')
    .select('notification_preferences')
    .eq('id', accessId)
    .single();

  const updated = {
    ...current?.notification_preferences,
    ...preferences,
  };

  await supabase
    .from('customer_portal_access')
    .update({ notification_preferences: updated })
    .eq('id', accessId);
}

/**
 * Deactivate portal access
 */
export async function deactivatePortalAccess(accessId: string): Promise<void> {
  const supabase = createAdminClient();

  await supabase
    .from('customer_portal_access')
    .update({ is_active: false })
    .eq('id', accessId);
}

// =====================================================
// ACCOUNT LOCKOUT
// =====================================================

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 30;

/**
 * Record a failed login attempt
 */
export async function recordFailedLogin(
  businessId: string,
  email: string
): Promise<{ locked: boolean; remainingAttempts: number }> {
  const supabase = createAdminClient();

  const { data: access } = await supabase
    .from('customer_portal_access')
    .select('id, failed_login_attempts, locked_until')
    .eq('business_id', businessId)
    .eq('email', email.toLowerCase())
    .single();

  if (!access) {
    return { locked: false, remainingAttempts: MAX_FAILED_ATTEMPTS };
  }

  const newAttempts = (access.failed_login_attempts || 0) + 1;
  const shouldLock = newAttempts >= MAX_FAILED_ATTEMPTS;

  const updateData: Record<string, any> = {
    failed_login_attempts: newAttempts,
    last_failed_login_at: new Date().toISOString(),
  };

  if (shouldLock) {
    updateData.locked_until = new Date(
      Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000
    ).toISOString();
  }

  await supabase
    .from('customer_portal_access')
    .update(updateData)
    .eq('id', access.id);

  return {
    locked: shouldLock,
    remainingAttempts: Math.max(0, MAX_FAILED_ATTEMPTS - newAttempts),
  };
}

/**
 * Check if account is locked
 */
export async function isAccountLocked(
  businessId: string,
  email: string
): Promise<{ locked: boolean; unlockTime?: Date }> {
  const supabase = createAdminClient();

  const { data: access } = await supabase
    .from('customer_portal_access')
    .select('locked_until')
    .eq('business_id', businessId)
    .eq('email', email.toLowerCase())
    .single();

  if (!access?.locked_until) {
    return { locked: false };
  }

  const unlockTime = new Date(access.locked_until);
  if (unlockTime <= new Date()) {
    // Lock expired, clear it
    await supabase
      .from('customer_portal_access')
      .update({
        locked_until: null,
        failed_login_attempts: 0,
      })
      .eq('business_id', businessId)
      .eq('email', email.toLowerCase());

    return { locked: false };
  }

  return { locked: true, unlockTime };
}

/**
 * Clear failed login attempts on successful login
 */
export async function clearFailedLogins(accessId: string): Promise<void> {
  const supabase = createAdminClient();

  await supabase
    .from('customer_portal_access')
    .update({
      failed_login_attempts: 0,
      locked_until: null,
      last_failed_login_at: null,
    })
    .eq('id', accessId);
}

// =====================================================
// EMAIL CHANGE VERIFICATION
// =====================================================

const EMAIL_CHANGE_EXPIRY_MINUTES = 60;

/**
 * Send email change verification
 */
export async function sendEmailChangeVerification(
  businessId: string,
  customerId: string,
  newEmail: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  // Check if new email is already in use
  const { data: existing } = await supabase
    .from('customer_portal_access')
    .select('id')
    .eq('business_id', businessId)
    .eq('email', newEmail.toLowerCase())
    .single();

  if (existing) {
    return { success: false, error: 'This email is already in use' };
  }

  // Generate verification token
  const token = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + EMAIL_CHANGE_EXPIRY_MINUTES * 60 * 1000);

  // Store pending email change
  await supabase
    .from('customer_portal_access')
    .update({
      pending_email: newEmail.toLowerCase(),
      pending_email_token: tokenHash,
      pending_email_token_expires_at: expiresAt.toISOString(),
    })
    .eq('customer_id', customerId)
    .eq('business_id', businessId);

  // Get business info
  const { data: business } = await supabase
    .from('businesses')
    .select('name')
    .eq('id', businessId)
    .single();

  // Build verification URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const verifyUrl = `${baseUrl}/portal/auth/verify-email?token=${token}&business=${businessId}`;

  // Send verification email to new address
  try {
    const { sendEmail } = await import('@/lib/email');
    await sendEmail({
      to: newEmail,
      subject: `Verify your new email for ${business?.name || 'Customer Portal'}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .button { display: inline-block; background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: 500; }
            .footer { color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Verify your new email address</h2>
            <p>You requested to change your email address for your ${business?.name || 'Customer Portal'} account.</p>
            <p>Click the button below to confirm this email address:</p>
            <a href="${verifyUrl}" class="button">Verify Email Address</a>
            <div class="footer">
              <p>This link expires in ${EMAIL_CHANGE_EXPIRY_MINUTES} minutes.</p>
              <p>If you didn't request this change, you can safely ignore this email.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });
  } catch (error) {
    portalAuthLogger.error({
      msg: 'Failed to send email change verification',
      businessId,
      customerId,
      newEmail,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return { success: false, error: 'Failed to send verification email' };
  }

  return { success: true };
}

/**
 * Verify and complete email change
 */
export async function verifyEmailChange(
  businessId: string,
  token: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();
  const tokenHash = createHash('sha256').update(token).digest('hex');

  const { data: access } = await supabase
    .from('customer_portal_access')
    .select('id, customer_id, pending_email, pending_email_token_expires_at')
    .eq('business_id', businessId)
    .eq('pending_email_token', tokenHash)
    .single();

  if (!access) {
    return { success: false, error: 'Invalid or expired verification link' };
  }

  if (new Date(access.pending_email_token_expires_at) < new Date()) {
    return { success: false, error: 'Verification link has expired' };
  }

  if (!access.pending_email) {
    return { success: false, error: 'No pending email change found' };
  }

  // Update both portal access email and customer email
  await Promise.all([
    supabase
      .from('customer_portal_access')
      .update({
        email: access.pending_email,
        pending_email: null,
        pending_email_token: null,
        pending_email_token_expires_at: null,
        email_verified: true,
      })
      .eq('id', access.id),
    supabase
      .from('customers')
      .update({ email: access.pending_email })
      .eq('id', access.customer_id),
  ]);

  return { success: true };
}

// =====================================================
// PASSWORD RESET
// =====================================================

const PASSWORD_RESET_EXPIRY_MINUTES = 30;

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  businessId: string,
  email: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  const { data: access } = await supabase
    .from('customer_portal_access')
    .select('id, customer:customers(name)')
    .eq('business_id', businessId)
    .eq('email', email.toLowerCase())
    .eq('is_active', true)
    .single();

  if (!access) {
    // Don't reveal if account exists
    return { success: true };
  }

  // Generate reset token
  const token = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRY_MINUTES * 60 * 1000);

  await supabase
    .from('customer_portal_access')
    .update({
      password_reset_token: tokenHash,
      password_reset_expires_at: expiresAt.toISOString(),
    })
    .eq('id', access.id);

  // Get business info
  const { data: business } = await supabase
    .from('businesses')
    .select('name')
    .eq('id', businessId)
    .single();

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const resetUrl = `${baseUrl}/portal/auth/reset-password?token=${token}&business=${businessId}`;

  try {
    const { sendEmail } = await import('@/lib/email');
    const customerName = (access.customer as any)?.name?.split(' ')[0] || 'there';

    await sendEmail({
      to: email,
      subject: `Reset your password for ${business?.name || 'Customer Portal'}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .button { display: inline-block; background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: 500; }
            .footer { color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Reset your password</h2>
            <p>Hi ${customerName},</p>
            <p>We received a request to reset your password for your ${business?.name || 'Customer Portal'} account.</p>
            <p>Click the button below to create a new password:</p>
            <a href="${resetUrl}" class="button">Reset Password</a>
            <div class="footer">
              <p>This link expires in ${PASSWORD_RESET_EXPIRY_MINUTES} minutes.</p>
              <p>If you didn't request this, you can safely ignore this email.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });
  } catch (error) {
    portalAuthLogger.error({
      msg: 'Failed to send password reset email',
      businessId,
      email,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  return { success: true };
}

/**
 * Verify password reset token
 */
export async function verifyPasswordResetToken(
  businessId: string,
  token: string
): Promise<{ valid: boolean; accessId?: string; error?: string }> {
  const supabase = createAdminClient();
  const tokenHash = createHash('sha256').update(token).digest('hex');

  const { data: access } = await supabase
    .from('customer_portal_access')
    .select('id, password_reset_expires_at')
    .eq('business_id', businessId)
    .eq('password_reset_token', tokenHash)
    .eq('is_active', true)
    .single();

  if (!access) {
    return { valid: false, error: 'Invalid or expired reset link' };
  }

  if (new Date(access.password_reset_expires_at) < new Date()) {
    return { valid: false, error: 'Reset link has expired' };
  }

  return { valid: true, accessId: access.id };
}

/**
 * Complete password reset
 */
export async function completePasswordReset(
  accessId: string,
  newPassword: string
): Promise<{ success: boolean; errors?: string[] }> {
  // Validate password strength
  const validation = validatePassword(newPassword);
  if (!validation.valid) {
    return { success: false, errors: validation.errors };
  }

  const supabase = createAdminClient();
  const passwordHash = await bcrypt.hash(newPassword, 12);
  const now = new Date().toISOString();

  // Update password and clear reset token
  // Also set password_changed_at to invalidate old sessions
  const { error } = await supabase
    .from('customer_portal_access')
    .update({
      password_hash: passwordHash,
      password_reset_token: null,
      password_reset_expires_at: null,
      password_changed_at: now,
      failed_login_attempts: 0,
      locked_until: null,
    })
    .eq('id', accessId);

  if (error) {
    portalAuthLogger.error({
      msg: 'Failed to complete password reset',
      accessId,
      error: error.message,
    });
    return { success: false, errors: ['Failed to update password'] };
  }

  return { success: true };
}

// =====================================================
// SESSION INVALIDATION
// =====================================================

/**
 * Change password and invalidate existing sessions
 */
export async function changePassword(
  accessId: string,
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; errors?: string[] }> {
  const supabase = createAdminClient();

  // Get current password hash
  const { data: access } = await supabase
    .from('customer_portal_access')
    .select('password_hash')
    .eq('id', accessId)
    .single();

  if (!access?.password_hash) {
    return { success: false, errors: ['No password set for this account'] };
  }

  // Verify current password
  const isValid = await bcrypt.compare(currentPassword, access.password_hash);
  if (!isValid) {
    return { success: false, errors: ['Current password is incorrect'] };
  }

  // Validate new password strength
  const validation = validatePassword(newPassword);
  if (!validation.valid) {
    return { success: false, errors: validation.errors };
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  const now = new Date().toISOString();

  // Update password and set password_changed_at to invalidate old sessions
  const { error } = await supabase
    .from('customer_portal_access')
    .update({
      password_hash: passwordHash,
      password_changed_at: now,
    })
    .eq('id', accessId);

  if (error) {
    portalAuthLogger.error({
      msg: 'Failed to change password',
      accessId,
      error: error.message,
    });
    return { success: false, errors: ['Failed to update password'] };
  }

  return { success: true };
}

/**
 * Get password_changed_at for session validation
 */
export async function getPasswordChangedAt(accessId: string): Promise<Date | null> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from('customer_portal_access')
    .select('password_changed_at')
    .eq('id', accessId)
    .single();

  return data?.password_changed_at ? new Date(data.password_changed_at) : null;
}
