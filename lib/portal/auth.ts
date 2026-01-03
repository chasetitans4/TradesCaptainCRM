// =====================================================
// CUSTOMER PORTAL AUTHENTICATION
// Magic link and password-based auth for customers
// =====================================================

import { createClient } from '@/lib/supabase/server';
import { randomBytes, createHash } from 'crypto';
import bcrypt from 'bcryptjs';

const MAGIC_LINK_EXPIRY_MINUTES = 15;

/**
 * Send magic link to customer email
 */
export async function sendMagicLink(
  businessId: string,
  email: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

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
    console.error('Failed to send magic link email:', error instanceof Error ? error.message : 'Unknown error');
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
  const supabase = await createClient();
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

  // Hash password if provided
  if (options?.password) {
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
  const supabase = await createClient();

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
): Promise<void> {
  const supabase = await createClient();

  const passwordHash = await bcrypt.hash(password, 12);

  await supabase
    .from('customer_portal_access')
    .update({ password_hash: passwordHash })
    .eq('id', accessId);
}

/**
 * Get portal access by customer ID
 */
export async function getPortalAccess(customerId: string) {
  const supabase = await createClient();

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
): Promise<void> {
  const supabase = await createClient();

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
  const supabase = await createClient();

  await supabase
    .from('customer_portal_access')
    .update({ is_active: false })
    .eq('id', accessId);
}
