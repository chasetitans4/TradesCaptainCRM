// =====================================================
// Leads Captain v2 Approval Detail API
// POST /api/leads-captain/v2/approvals/[id] - Approve/reject/edit message
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerUserProfile } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';
import { sendSMS } from '@/lib/twilio';
import { apiLogger } from '@/lib/logger';
import type { ApprovalActionRequest } from '@/types/leads-captain';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const profile = await getServerUserProfile();
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const supabase = createAdminClient();
    const body: ApprovalActionRequest = await request.json();

    if (!body.action || !['approve', 'reject', 'edit'].includes(body.action)) {
      return NextResponse.json(
        { error: 'Valid action (approve, reject, edit) is required' },
        { status: 400 }
      );
    }

    if (body.action === 'edit' && !body.edited_content) {
      return NextResponse.json(
        { error: 'edited_content is required for edit action' },
        { status: 400 }
      );
    }

    // Get config for authorization
    const { data: config } = await supabase
      .from('leads_captain_config')
      .select('id')
      .eq('business_id', profile.business_id)
      .single();

    if (!config) {
      return NextResponse.json({ error: 'Leads Captain not configured' }, { status: 404 });
    }

    // Get message with conversation for verification
    const { data: message } = await supabase
      .from('leads_captain_messages_v2')
      .select(`
        *,
        conversation:leads_captain_conversations_v2!inner (
          id,
          config_id,
          customer_phone
        )
      `)
      .eq('id', id)
      .eq('conversation.config_id', config.id)
      .single();

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    if (!message.approval_required || message.approval_status !== 'pending') {
      return NextResponse.json(
        { error: 'Message is not pending approval' },
        { status: 400 }
      );
    }

    // Process action
    const updateData: Record<string, unknown> = {
      approved_by: profile.email || 'user',
      approved_at: new Date().toISOString(),
    };

    let auditAction: string;
    let shouldSend = false;

    switch (body.action) {
      case 'approve':
        updateData.approval_status = 'approved';
        auditAction = 'approval_approved';
        shouldSend = true;
        break;

      case 'reject':
        updateData.approval_status = 'rejected';
        auditAction = 'approval_rejected';
        break;

      case 'edit':
        updateData.approval_status = 'approved';
        updateData.original_content = message.content;
        updateData.content = body.edited_content;
        auditAction = 'approval_approved';
        shouldSend = true;
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Update message
    const { data: updatedMessage, error } = await supabase
      .from('leads_captain_messages_v2')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Log audit
    await supabase.from('leads_captain_audit_log').insert({
      config_id: config.id,
      conversation_id: message.conversation_id,
      message_id: id,
      action: auditAction,
      actor: profile.email || 'user',
      details: {
        action: body.action,
        edited: body.action === 'edit',
        original_content: body.action === 'edit' ? message.content : undefined,
      },
    });

    // If approved/edited, send the message via Twilio
    if (shouldSend) {
      const contentToSend = body.action === 'edit' ? body.edited_content : message.content;

      try {
        await sendSMS({
          to: message.conversation.customer_phone,
          body: contentToSend,
          businessId: profile.business_id,
          isAIResponse: message.ai_used || false,
        });

        await supabase
          .from('leads_captain_messages_v2')
          .update({
            delivery_status: 'sent',
            sent_at: new Date().toISOString(),
          })
          .eq('id', id);

        await supabase.from('leads_captain_audit_log').insert({
          config_id: config.id,
          conversation_id: message.conversation_id,
          message_id: id,
          action: 'message_sent',
          actor: 'system',
          details: { after_approval: true },
        });
      } catch (sendError) {
        apiLogger.error({
          message: 'Failed to send SMS',
          error: sendError,
        });
        await supabase
          .from('leads_captain_messages_v2')
          .update({
            delivery_status: 'failed',
          })
          .eq('id', id);

        return NextResponse.json({
          message: updatedMessage,
          action_performed: body.action,
          sent: false,
          error: 'Message approved but failed to send',
        });
      }
    }

    return NextResponse.json({
      message: updatedMessage,
      action_performed: body.action,
      sent: shouldSend,
    });
  } catch (error) {
    apiLogger.error({
      message: 'Error processing approval',
      error,
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process approval' },
      { status: 500 }
    );
  }
}
