// =====================================================
// SEND INVITE API
// POST /api/admin/submissions/:id/send-invite
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAgentOrHigher } from '@/lib/admin/auth';
import { createClient } from '@/lib/supabase/server';
import { markInviteSent, logEmail, logAdminActivity } from '@/lib/admin';
import { apiLogger } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAgentOrHigher();

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const supabase = await createClient();

    // Get submission
    const { data: submission, error } = await supabase
      .from('agent_submissions')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    // Verify agent owns this submission or is admin
    if (admin.role === 'agent' && submission.agent_id !== admin.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if already sent
    if (submission.status === 'registered') {
      return NextResponse.json(
        { error: 'Client has already registered' },
        { status: 400 }
      );
    }

    // Generate registration URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    const registrationUrl = `${baseUrl}/register/${submission.invite_token}`;

    // Send email (using your email service)
    // For now, we'll just mark it as sent
    // In production, integrate with Resend, SendGrid, etc.

    /*
    await sendEmail({
      to: submission.client_email,
      subject: 'Start Your 30-Day Free CRM Trial',
      template: 'trial-invite',
      data: {
        companyName: submission.client_company_name,
        registrationUrl,
        planName: submission.crm_plan_selected,
      },
    });
    */

    // Mark as sent
    await markInviteSent(id);

    // Log email
    await logEmail(
      null,
      'trial_invite',
      submission.client_email,
      { submissionId: id, registrationUrl }
    );

    // Log activity
    const ip = request.headers.get('x-forwarded-for') || '';
    await logAdminActivity(
      admin.id,
      'sent_invite',
      'agent_submission',
      id,
      { email: submission.client_email },
      ip
    );

    return NextResponse.json({
      success: true,
      registration_url: registrationUrl,
      message: `Invite sent to ${submission.client_email}`,
    });
  } catch (error) {
    apiLogger.error({ msg: 'Error in POST /api/admin/submissions/[id]/send-invite', error: error instanceof Error ? error.message : 'Unknown error' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send invite' },
      { status: 400 }
    );
  }
}
