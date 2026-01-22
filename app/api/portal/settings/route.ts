import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession } from '@/lib/portal/session';
import { createAdminClient } from '@/lib/supabase/server';
import { apiLogger } from '@/lib/logger';
import {
  validateProfileUpdate,
  validateNotificationPreferences,
  validateAIPreferences,
} from '@/lib/portal/validation';
import { sendEmailChangeVerification } from '@/lib/portal/auth';
import { logPortalActivity } from '@/lib/portal/audit';

export async function GET(request: NextRequest) {
  try {
    const session = await getPortalSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Fetch customer profile
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('name, email, phone, address, city, state, zip')
      .eq('id', session.customerId)
      .single();

    if (customerError) throw customerError;

    // Fetch portal settings (notifications, ai_paused, pending email change)
    const { data: portalAccess, error: accessError } = await supabase
      .from('customer_portal_access')
      .select('notification_preferences, ai_paused, pending_email, pending_email_token_expires_at')
      .eq('customer_id', session.customerId)
      .eq('business_id', session.businessId)
      .single();

    if (accessError) throw accessError;

    const notifications = portalAccess.notification_preferences || { email: true, sms: true };
    const aiPreferences = {
      allowAIResponses: !portalAccess.ai_paused,
      preferHuman: false
    };

    // Check if there's a pending email change
    const pendingEmailChange = portalAccess.pending_email &&
      portalAccess.pending_email_token_expires_at &&
      new Date(portalAccess.pending_email_token_expires_at) > new Date()
        ? portalAccess.pending_email
        : null;

    return NextResponse.json({
      profile: {
        id: session.customerId,
        ...customer
      },
      notifications,
      aiPreferences,
      pendingEmailChange,
    });

  } catch (error) {
    apiLogger.error({
      msg: 'Portal settings GET error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getPortalSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { profile, notifications, aiPreferences } = body;
    const supabase = createAdminClient();

    const changes: string[] = [];
    let emailChangeInitiated = false;

    // Update Profile with validation
    if (profile) {
      const validation = validateProfileUpdate(profile);

      if (!validation.valid) {
        return NextResponse.json(
          { error: 'Validation failed', details: validation.errors },
          { status: 400 }
        );
      }

      const sanitizedProfile = validation.sanitized!;

      // Check if email is being changed
      if (sanitizedProfile.email && sanitizedProfile.email !== session.email) {
        // Don't update email directly - initiate verification flow
        const emailResult = await sendEmailChangeVerification(
          session.businessId,
          session.customerId,
          sanitizedProfile.email
        );

        if (!emailResult.success) {
          return NextResponse.json(
            { error: emailResult.error || 'Failed to initiate email change' },
            { status: 400 }
          );
        }

        emailChangeInitiated = true;
        changes.push(`email_change_requested:${sanitizedProfile.email}`);

        // Remove email from the update - it will be updated after verification
        delete sanitizedProfile.email;
      }

      // Only update if there are fields left to update
      if (Object.keys(sanitizedProfile).length > 0) {
        const { error } = await supabase
          .from('customers')
          .update(sanitizedProfile)
          .eq('id', session.customerId);

        if (error) throw error;

        // Track what changed
        Object.keys(sanitizedProfile).forEach(key => {
          changes.push(`profile.${key}`);
        });
      }
    }

    // Update Notification Preferences with validation
    if (notifications) {
      const validation = validateNotificationPreferences(notifications);

      if (!validation.valid) {
        return NextResponse.json(
          { error: 'Invalid notification preferences' },
          { status: 400 }
        );
      }

      const { error } = await supabase
        .from('customer_portal_access')
        .update({ notification_preferences: validation.sanitized })
        .eq('customer_id', session.customerId)
        .eq('business_id', session.businessId);

      if (error) throw error;
      changes.push('notifications');
    }

    // Update AI Preferences with validation
    if (aiPreferences) {
      const validation = validateAIPreferences(aiPreferences);

      if (!validation.valid) {
        return NextResponse.json(
          { error: 'Invalid AI preferences' },
          { status: 400 }
        );
      }

      const { error } = await supabase
        .from('customer_portal_access')
        .update({ ai_paused: !validation.sanitized!.allowAIResponses })
        .eq('customer_id', session.customerId)
        .eq('business_id', session.businessId);

      if (error) throw error;
      changes.push('ai_preferences');
    }

    // Log the activity
    if (changes.length > 0) {
      await logPortalActivity({
        customerId: session.customerId,
        businessId: session.businessId,
        action: 'settings_updated',
        details: { changes },
        request,
      });
    }

    return NextResponse.json({
      success: true,
      emailChangeInitiated,
      message: emailChangeInitiated
        ? 'Settings updated. Please check your new email address to confirm the change.'
        : 'Settings updated successfully.',
    });

  } catch (error) {
    apiLogger.error({
      msg: 'Portal settings PATCH error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
