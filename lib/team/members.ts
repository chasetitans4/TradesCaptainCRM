// =====================================================
// TEAM MEMBERS LIBRARY
// =====================================================

import { createAdminClient } from '@/lib/supabase/server';
import { sendEmail, getOwnershipTransferEmailHtml } from '@/lib/email';

/**
 * Get all team members for a business
 */
export async function getTeamMembers(businessId: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, role, avatar_url, status, created_at, accepted_at')
    .eq('business_id', businessId)
    .order('role') // owner first
    .order('name');

  if (error) {
    console.error('Error fetching team members:', error);
    throw error;
  }

  return data || [];
}

/**
 * Update a member's role
 */
export async function updateMemberRole(
  memberId: string,
  newRole: 'admin' | 'technician',
  updatedBy: string
) {
  const supabase = createAdminClient();

  // Get the member being updated
  const { data: member } = await supabase
    .from('users')
    .select('role, business_id')
    .eq('id', memberId)
    .single();

  if (!member) {
    throw new Error('Member not found');
  }

  if (member.role === 'owner') {
    throw new Error('Cannot change owner role. Use transfer ownership instead.');
  }

  // Get the user making the change
  const { data: updater } = await supabase
    .from('users')
    .select('role, business_id')
    .eq('id', updatedBy)
    .single();

  if (updater?.business_id !== member.business_id) {
    throw new Error('Not authorized');
  }

  if (updater?.role === 'technician') {
    throw new Error('Technicians cannot change roles');
  }

  // Update role
  const { error } = await supabase
    .from('users')
    .update({ role: newRole })
    .eq('id', memberId);

  if (error) {
    console.error('Error updating role:', error);
    throw new Error('Failed to update role');
  }
}

/**
 * Deactivate a team member
 */
export async function deactivateMember(memberId: string, deactivatedBy: string) {
  const supabase = createAdminClient();

  // Get the member being deactivated
  const { data: member } = await supabase
    .from('users')
    .select('role, business_id')
    .eq('id', memberId)
    .single();

  if (!member) {
    throw new Error('Member not found');
  }

  if (member.role === 'owner') {
    throw new Error('Cannot deactivate the owner');
  }

  // Verify the deactivator has permission
  const { data: deactivator } = await supabase
    .from('users')
    .select('role, business_id')
    .eq('id', deactivatedBy)
    .single();

  if (deactivator?.business_id !== member.business_id) {
    throw new Error('Not authorized');
  }

  if (!['owner', 'admin'].includes(deactivator?.role || '')) {
    throw new Error('Not authorized');
  }

  // Admin can't deactivate another admin
  if (deactivator?.role === 'admin' && member.role === 'admin') {
    throw new Error('Admins cannot deactivate other admins');
  }

  const { error } = await supabase
    .from('users')
    .update({ status: 'deactivated' })
    .eq('id', memberId);

  if (error) {
    console.error('Error deactivating member:', error);
    throw new Error('Failed to deactivate member');
  }
}

/**
 * Reactivate a team member
 */
export async function reactivateMember(memberId: string, reactivatedBy: string) {
  const supabase = createAdminClient();

  // Get the member being reactivated
  const { data: member } = await supabase
    .from('users')
    .select('business_id, status')
    .eq('id', memberId)
    .single();

  if (!member) {
    throw new Error('Member not found');
  }

  if (member.status !== 'deactivated') {
    throw new Error('Member is not deactivated');
  }

  // Verify the reactivator has permission
  const { data: reactivator } = await supabase
    .from('users')
    .select('role, business_id')
    .eq('id', reactivatedBy)
    .single();

  if (reactivator?.business_id !== member.business_id) {
    throw new Error('Not authorized');
  }

  if (!['owner', 'admin'].includes(reactivator?.role || '')) {
    throw new Error('Not authorized');
  }

  const { error } = await supabase
    .from('users')
    .update({ status: 'active' })
    .eq('id', memberId);

  if (error) {
    console.error('Error reactivating member:', error);
    throw new Error('Failed to reactivate member');
  }
}

/**
 * Transfer ownership to another team member
 */
export async function transferOwnership(
  currentOwnerId: string,
  newOwnerId: string
) {
  const supabase = createAdminClient();

  // Verify current user is owner
  const { data: currentOwner } = await supabase
    .from('users')
    .select('role, business_id, name')
    .eq('id', currentOwnerId)
    .single();

  if (currentOwner?.role !== 'owner') {
    throw new Error('Only the owner can transfer ownership');
  }

  // Verify new owner is in same business and is active
  const { data: newOwner } = await supabase
    .from('users')
    .select('business_id, status, name, email')
    .eq('id', newOwnerId)
    .single();

  if (newOwner?.business_id !== currentOwner.business_id) {
    throw new Error('User is not in your business');
  }

  if (newOwner?.status !== 'active') {
    throw new Error('Cannot transfer ownership to an inactive member');
  }

  // Get business info for email
  const { data: business } = await supabase
    .from('businesses')
    .select('name')
    .eq('id', currentOwner.business_id)
    .single();

  // Swap roles - current owner becomes admin
  const { error: error1 } = await supabase
    .from('users')
    .update({ role: 'admin' })
    .eq('id', currentOwnerId);

  if (error1) {
    throw new Error('Failed to update current owner');
  }

  const { error: error2 } = await supabase
    .from('users')
    .update({ role: 'owner' })
    .eq('id', newOwnerId);

  if (error2) {
    // Rollback the first change
    await supabase
      .from('users')
      .update({ role: 'owner' })
      .eq('id', currentOwnerId);
    throw new Error('Failed to update new owner');
  }

  // Send email to new owner
  if (newOwner?.email && business?.name) {
    const html = getOwnershipTransferEmailHtml({
      newOwnerName: newOwner.name || 'New Owner',
      oldOwnerName: currentOwner.name || 'Previous Owner',
      businessName: business.name,
      dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    });

    await sendEmail({
      to: newOwner.email,
      subject: `You are now the owner of ${business.name}`,
      html,
    });
  }
}

/**
 * Get team member by ID
 */
export async function getTeamMember(memberId: string, requesterId: string) {
  const supabase = createAdminClient();

  // Verify requester is in same business
  const { data: requester } = await supabase
    .from('users')
    .select('business_id')
    .eq('id', requesterId)
    .single();

  const { data: member, error } = await supabase
    .from('users')
    .select('id, name, email, role, avatar_url, phone, status, created_at, accepted_at')
    .eq('id', memberId)
    .eq('business_id', requester?.business_id)
    .single();

  if (error || !member) {
    throw new Error('Member not found');
  }

  return member;
}
