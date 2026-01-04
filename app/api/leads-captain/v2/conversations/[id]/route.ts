// =====================================================
// Leads Captain v2 Conversation Detail API
// GET /api/leads-captain/v2/conversations/[id] - Get conversation with messages
// PUT /api/leads-captain/v2/conversations/[id] - Update conversation (takeover, close, etc.)
// POST /api/leads-captain/v2/conversations/[id] - Send manual message
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerUserProfile } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';
import { sendSMS } from '@/lib/twilio';
import type { ConversationDetailResponse } from '@/types/leads-captain';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const profile = await getServerUserProfile();
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const supabase = createAdminClient();

    // Get config for authorization and info
    const { data: config } = await supabase
      .from('leads_captain_config')
      .select('id, business_name, owner_name, timezone')
      .eq('business_id', profile.business_id)
      .single();

    if (!config) {
      return NextResponse.json({ error: 'Leads Captain not configured' }, { status: 404 });
    }

    // Get conversation
    const { data: conversation, error } = await supabase
      .from('leads_captain_conversations_v2')
      .select('*')
      .eq('id', id)
      .eq('config_id', config.id)
      .single();

    if (error || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Get messages
    const { data: messages } = await supabase
      .from('leads_captain_messages_v2')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true });

    const response: ConversationDetailResponse = {
      conversation,
      messages: messages || [],
      config: {
        business_name: config.business_name,
        owner_name: config.owner_name,
        timezone: config.timezone,
      },
    };

    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error('Error fetching conversation:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch conversation' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const profile = await getServerUserProfile();
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const supabase = createAdminClient();
    const body = await request.json();

    // Get config for authorization
    const { data: config } = await supabase
      .from('leads_captain_config')
      .select('id')
      .eq('business_id', profile.business_id)
      .single();

    if (!config) {
      return NextResponse.json({ error: 'Leads Captain not configured' }, { status: 404 });
    }

    // Get existing conversation
    const { data: existing } = await supabase
      .from('leads_captain_conversations_v2')
      .select('id, status, muted_until')
      .eq('id', id)
      .eq('config_id', config.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Handle different actions
    const action = body.action;
    const updateData: Record<string, unknown> = {};
    let auditAction = '';

    switch (action) {
      case 'takeover':
        updateData.status = 'human_takeover';
        updateData.requires_human = true;
        auditAction = 'human_takeover';
        break;

      case 'release':
        if (existing.status !== 'human_takeover') {
          return NextResponse.json(
            { error: 'Can only release conversations in human takeover status' },
            { status: 400 }
          );
        }
        updateData.status = 'active';
        updateData.requires_human = false;
        auditAction = 'human_released';
        break;

      case 'close':
        updateData.status = 'closed';
        updateData.closed_at = new Date().toISOString();
        auditAction = 'conversation_closed';
        break;

      case 'block':
        updateData.status = 'blocked';
        auditAction = 'blocked';
        break;

      case 'unblock':
        if (existing.status !== 'blocked') {
          return NextResponse.json(
            { error: 'Conversation is not blocked' },
            { status: 400 }
          );
        }
        updateData.status = 'closed';
        auditAction = 'unblocked';
        break;

      case 'flag_hot_lead':
        updateData.is_hot_lead = true;
        auditAction = 'flagged_hot_lead';
        break;

      case 'unflag_hot_lead':
        updateData.is_hot_lead = false;
        auditAction = 'unflagged_hot_lead';
        break;

      case 'mute': {
        // Time-based mute for per-conversation control (Section 7.3)
        const duration = body.duration || 24; // Default 24 hours
        const mutedUntil = new Date();
        mutedUntil.setHours(mutedUntil.getHours() + duration);
        updateData.muted_until = mutedUntil.toISOString();
        updateData.status = 'human_takeover';
        updateData.requires_human = true;
        auditAction = 'muted';
        break;
      }

      case 'unmute':
        updateData.muted_until = null;
        // Only switch back to active if currently in human_takeover
        if (existing.status === 'human_takeover') {
          updateData.status = 'active';
          updateData.requires_human = false;
        }
        auditAction = 'unmuted';
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Update conversation
    const { data: conversation, error } = await supabase
      .from('leads_captain_conversations_v2')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Log audit
    await supabase.from('leads_captain_audit_log').insert({
      config_id: config.id,
      conversation_id: id,
      action: auditAction,
      actor: profile.email || 'user',
      details: { action, previous_status: existing.status },
    });

    return NextResponse.json({ conversation, action_performed: action });
  } catch (error: unknown) {
    console.error('Error updating conversation:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update conversation' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const profile = await getServerUserProfile();
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const supabase = createAdminClient();
    const body = await request.json();

    if (!body.content || typeof body.content !== 'string') {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
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

    // Get conversation
    const { data: conversation } = await supabase
      .from('leads_captain_conversations_v2')
      .select('id, status, customer_phone')
      .eq('id', id)
      .eq('config_id', config.id)
      .single();

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    if (conversation.status === 'blocked') {
      return NextResponse.json(
        { error: 'Cannot send messages to blocked conversations' },
        { status: 403 }
      );
    }

    // Create outbound message
    const { data: message, error: messageError } = await supabase
      .from('leads_captain_messages_v2')
      .insert({
        conversation_id: id,
        direction: 'outbound',
        content: body.content,
        ai_used: false,
        decision_explanation: 'Manual message sent by user',
        delivery_status: 'pending',
      })
      .select()
      .single();

    if (messageError) throw messageError;

    // Update conversation
    await supabase
      .from('leads_captain_conversations_v2')
      .update({
        last_message_at: new Date().toISOString(),
        message_count: conversation.status === 'closed' ? 1 : undefined, // Reset if reopening
        status: conversation.status === 'closed' ? 'human_takeover' : conversation.status,
      })
      .eq('id', id);

    // Send via Twilio
    try {
      await sendSMS({
        to: conversation.customer_phone,
        body: body.content,
        businessId: profile.business_id,
        isAIResponse: false,
      });

      await supabase
        .from('leads_captain_messages_v2')
        .update({
          delivery_status: 'sent',
          sent_at: new Date().toISOString(),
        })
        .eq('id', message.id);

      // Log audit
      await supabase.from('leads_captain_audit_log').insert({
        config_id: config.id,
        conversation_id: id,
        message_id: message.id,
        action: 'message_sent',
        actor: profile.email || 'user',
        details: { manual: true },
      });

      return NextResponse.json({ message, sent: true });
    } catch (sendError) {
      console.error('Failed to send SMS:', sendError);
      await supabase
        .from('leads_captain_messages_v2')
        .update({
          delivery_status: 'failed',
        })
        .eq('id', message.id);

      return NextResponse.json({
        message,
        sent: false,
        error: 'Message created but failed to send',
      });
    }
  } catch (error: unknown) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send message' },
      { status: 500 }
    );
  }
}
