// =====================================================
// TEAM INVITATIONS LIBRARY
// =====================================================

import { createAdminClient } from '@/lib/supabase/server';
import { randomBytes } from 'crypto';
import { sendEmail, getInvitationEmailHtml } from '@/lib/email';

interface InviteParams {
  businessId: string;
  email: string;
  role: 'admin' | 'technician';
  invitedBy: string;
}

/**
 * Create a new team invitation
 */
export async function createInvitation(params: InviteParams) {
  const { businessId, email, role, invitedBy } = params;
  const supabase = createAdminClient();

  // Check if email is already a member of this business
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('business_id', businessId)
    .eq('email', email.toLowerCase())
    .single();

  if (existingUser) {
    throw new Error('This email is already a team member');
  }

  // Check for existing pending invitation
  const { data: existingInvite } = await supabase
    .from('team_invitations')
    .select('id, status')
    .eq('business_id', businessId)
    .eq('email', email.toLowerCase())
    .eq('status', 'pending')
    .single();

  if (existingInvite) {
    throw new Error('An invitation is already pending for this email');
  }

  // Generate token
  const token = randomBytes(32).toString('hex');

  // Set expiration (7 days)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  // Create invitation
  const { data: invitation, error } = await supabase
    .from('team_invitations')
    .insert({
      business_id: businessId,
      email: email.toLowerCase(),
      role,
      invited_by: invitedBy,
      token,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating invitation:', error);
    throw new Error('Failed to create invitation');
  }

  // Send invitation email
  await sendInvitationEmail(invitation, businessId);

  return invitation;
}

/**
 * Send the invitation email
 */
async function sendInvitationEmail(invitation: any, businessId: string) {
  const supabase = createAdminClient();

  // Get business and inviter info
  const { data: business } = await supabase
    .from('businesses')
    .select('name')
    .eq('id', businessId)
    .single();

  const { data: inviter } = await supabase
    .from('users')
    .select('name')
    .eq('id', invitation.invited_by)
    .single();

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${invitation.token}`;

  const html = getInvitationEmailHtml({
    inviterName: inviter?.name || 'A team member',
    businessName: business?.name || 'your team',
    role: invitation.role === 'admin' ? 'Admin' : 'Technician',
    inviteUrl,
  });

  await sendEmail({
    to: invitation.email,
    subject: `You're invited to join ${business?.name || 'a team'} on Trades Captain`,
    html,
  });
}

/**
 * Resend an invitation
 */
export async function resendInvitation(invitationId: string, userId: string) {
  const supabase = createAdminClient();

  // Get invitation
  const { data: invitation, error } = await supabase
    .from('team_invitations')
    .select('*')
    .eq('id', invitationId)
    .single();

  if (error || !invitation) {
    throw new Error('Invitation not found');
  }

  if (invitation.status !== 'pending') {
    throw new Error('Invitation is no longer pending');
  }

  // Verify user has permission (same business)
  const { data: user } = await supabase
    .from('users')
    .select('business_id, role')
    .eq('id', userId)
    .single();

  if (user?.business_id !== invitation.business_id) {
    throw new Error('Not authorized');
  }

  if (!['owner', 'admin'].includes(user?.role || '')) {
    throw new Error('Not authorized');
  }

  // Generate new token and extend expiration
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await supabase
    .from('team_invitations')
    .update({ token, expires_at: expiresAt.toISOString() })
    .eq('id', invitationId);

  // Resend email
  await sendInvitationEmail({ ...invitation, token }, invitation.business_id);
}

/**
 * Cancel an invitation
 */
export async function cancelInvitation(invitationId: string, userId: string) {
  const supabase = createAdminClient();

  // Get invitation
  const { data: invitation } = await supabase
    .from('team_invitations')
    .select('business_id')
    .eq('id', invitationId)
    .single();

  if (!invitation) {
    throw new Error('Invitation not found');
  }

  // Verify user has permission
  const { data: user } = await supabase
    .from('users')
    .select('business_id, role')
    .eq('id', userId)
    .single();

  if (user?.business_id !== invitation.business_id) {
    throw new Error('Not authorized');
  }

  if (!['owner', 'admin'].includes(user?.role || '')) {
    throw new Error('Not authorized');
  }

  await supabase
    .from('team_invitations')
    .update({ status: 'cancelled' })
    .eq('id', invitationId);
}

/**
 * Get invitation by token (for accepting)
 */
export async function getInvitationByToken(token: string) {
  const supabase = createAdminClient();

  const { data: invitation, error } = await supabase
    .from('team_invitations')
    .select(`
      *,
      business:businesses (id, name, logo_url),
      inviter:users!team_invitations_invited_by_fkey (name)
    `)
    .eq('token', token)
    .single();

  if (error || !invitation) {
    return null;
  }

  // Check if expired
  if (new Date(invitation.expires_at) < new Date()) {
    // Mark as expired
    await supabase
      .from('team_invitations')
      .update({ status: 'expired' })
      .eq('id', invitation.id);
    return { ...invitation, status: 'expired' };
  }

  return invitation;
}

/**
 * Accept an invitation
 */
export async function acceptInvitation(token: string, userId: string) {
  const supabase = createAdminClient();

  // Find invitation
  const { data: invitation, error } = await supabase
    .from('team_invitations')
    .select('*')
    .eq('token', token)
    .eq('status', 'pending')
    .single();

  if (error || !invitation) {
    throw new Error('Invalid or expired invitation');
  }

  // Check if expired
  if (new Date(invitation.expires_at) < new Date()) {
    await supabase
      .from('team_invitations')
      .update({ status: 'expired' })
      .eq('id', invitation.id);
    throw new Error('This invitation has expired');
  }

  // Check if user is already in a business
  const { data: existingUser } = await supabase
    .from('users')
    .select('business_id')
    .eq('id', userId)
    .single();

  if (existingUser?.business_id) {
    throw new Error('You are already a member of a business');
  }

  // Update user with business info
  await supabase
    .from('users')
    .update({
      business_id: invitation.business_id,
      role: invitation.role,
      invited_by: invitation.invited_by,
      status: 'active',
      accepted_at: new Date().toISOString(),
    })
    .eq('id', userId);

  // Mark invitation as accepted
  await supabase
    .from('team_invitations')
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('id', invitation.id);

  return invitation;
}

/**
 * Get pending invitations for a business
 */
export async function getPendingInvitations(businessId: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('team_invitations')
    .select(`
      id,
      email,
      role,
      status,
      created_at,
      expires_at,
      inviter:users!team_invitations_invited_by_fkey (name)
    `)
    .eq('business_id', businessId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching invitations:', error);
    throw error;
  }

  return data || [];
}
