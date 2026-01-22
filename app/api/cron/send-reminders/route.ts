// =====================================================
// APPOINTMENT REMINDERS CRON JOB
// GET /api/cron/send-reminders
// Should be called every 15 minutes via Vercel Cron or similar
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { apiLogger } from '@/lib/logger';

// Verify cron secret to prevent unauthorized access
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  try {
    // SECURITY: Verify authorization - require CRON_SECRET to be configured
    const authHeader = request.headers.get('authorization');
    if (!CRON_SECRET) {
      apiLogger.error({ msg: 'CRON_SECRET not configured - denying cron access' });
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();
    const now = new Date().toISOString();

    // Get all pending scheduled messages that are due
    const { data: pendingMessages, error: fetchError } = await supabase
      .from('scheduled_messages')
      .select(`
        *,
        business:businesses (
          id,
          name,
          twilio_phone_number
        ),
        customer:customers (
          id,
          name
        ),
        job:jobs (
          id,
          title,
          scheduled_date,
          scheduled_time
        )
      `)
      .eq('status', 'pending')
      .lte('scheduled_for', now)
      .order('scheduled_for', { ascending: true })
      .limit(50); // Process in batches

    if (fetchError) {
      apiLogger.error({ msg: 'Error fetching scheduled messages', error: fetchError.message });
      return NextResponse.json(
        { error: 'Failed to fetch scheduled messages' },
        { status: 500 }
      );
    }

    if (!pendingMessages || pendingMessages.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pending messages to send',
        sent: 0,
      });
    }

    // Dynamic import of Twilio to avoid issues if not configured
    let twilioClient: any = null;
    let messagingServiceSid: string | null = null;

    try {
      const twilio = await import('twilio');
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID || null;

      if (accountSid && authToken) {
        twilioClient = twilio.default(accountSid, authToken);
      }
    } catch (e) {
      apiLogger.error({ msg: 'Twilio not configured', error: e instanceof Error ? e.message : 'Unknown error' });
    }

    if (!twilioClient) {
      return NextResponse.json(
        { error: 'Twilio not configured' },
        { status: 500 }
      );
    }

    const results = {
      sent: 0,
      failed: 0,
      errors: [] as string[],
    };

    // OPTIMIZATION: Pre-fetch all conversations in a single query
    const uniquePhoneBusinessPairs = [...new Set(pendingMessages.map(m => `${m.business_id}:${m.phone_number}`))];
    const businessIds = [...new Set(pendingMessages.map(m => m.business_id))];
    const phoneNumbers = [...new Set(pendingMessages.map(m => m.phone_number))];

    const { data: existingConversations } = await supabase
      .from('sms_conversations')
      .select('id, business_id, phone_number')
      .in('business_id', businessIds)
      .in('phone_number', phoneNumbers);

    // Create a lookup map for conversations
    const conversationMap = new Map<string, string>();
    for (const conv of existingConversations || []) {
      conversationMap.set(`${conv.business_id}:${conv.phone_number}`, conv.id);
    }

    // Prepare batch arrays for database updates
    const sentMessageIds: string[] = [];
    const sentMessageUpdates: Array<{ id: string; twilio_sid: string }> = [];
    const failedMessageIds: string[] = [];
    const smsMessagesToInsert: Array<{
      conversation_id: string;
      content: string;
      direction: string;
      status: string;
      twilio_sid: string;
      is_ai_response: boolean;
    }> = [];
    const conversationIdsToUpdate: string[] = [];

    // Process each message - only Twilio calls are in the loop now
    for (const message of pendingMessages) {
      try {
        // Replace template variables in content
        let content = message.content;

        if (message.customer?.name) {
          content = content.replace(/\{\{customer_name\}\}/g, message.customer.name);
        }
        if (message.business?.name) {
          content = content.replace(/\{\{business_name\}\}/g, message.business.name);
        }
        if (message.business?.twilio_phone_number) {
          content = content.replace(/\{\{business_phone\}\}/g, message.business.twilio_phone_number);
        }
        if (message.job?.title) {
          content = content.replace(/\{\{service\}\}/g, message.job.title);
        }
        if (message.job?.scheduled_date) {
          const date = new Date(message.job.scheduled_date);
          content = content.replace(/\{\{job_date\}\}/g, date.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          }));
        }
        if (message.job?.scheduled_time) {
          content = content.replace(/\{\{job_time\}\}/g, message.job.scheduled_time);
        }

        // Send via Twilio (this is the only external call per message)
        const twilioMessage = await twilioClient.messages.create({
          to: message.phone_number,
          body: content,
          ...(messagingServiceSid
            ? { messagingServiceSid }
            : { from: message.business?.twilio_phone_number }),
        });

        // Queue for batch update
        sentMessageIds.push(message.id);
        sentMessageUpdates.push({ id: message.id, twilio_sid: twilioMessage.sid });

        // Queue SMS message insert if conversation exists
        const conversationId = conversationMap.get(`${message.business_id}:${message.phone_number}`);
        if (conversationId) {
          smsMessagesToInsert.push({
            conversation_id: conversationId,
            content,
            direction: 'outbound',
            status: 'sent',
            twilio_sid: twilioMessage.sid,
            is_ai_response: false,
          });
          conversationIdsToUpdate.push(conversationId);
        }

        results.sent++;
      } catch (sendError) {
        apiLogger.error({ msg: `Error sending message ${message.id}`, error: sendError instanceof Error ? sendError.message : 'Unknown error' });
        results.failed++;
        results.errors.push(`Message ${message.id}: ${sendError instanceof Error ? sendError.message : 'Unknown error'}`);
        failedMessageIds.push(message.id);
      }
    }

    // BATCH UPDATE: Update all sent messages at once
    const sentAt = new Date().toISOString();
    if (sentMessageUpdates.length > 0) {
      // Use individual updates for twilio_sid since each is unique
      // But batch them in parallel for efficiency
      await Promise.all(
        sentMessageUpdates.map(({ id, twilio_sid }) =>
          supabase
            .from('scheduled_messages')
            .update({ status: 'sent', sent_at: sentAt, twilio_sid })
            .eq('id', id)
        )
      );
    }

    // BATCH UPDATE: Mark all failed messages at once
    if (failedMessageIds.length > 0) {
      await supabase
        .from('scheduled_messages')
        .update({ status: 'failed' })
        .in('id', failedMessageIds);
    }

    // BATCH INSERT: Insert all SMS messages at once
    if (smsMessagesToInsert.length > 0) {
      await supabase.from('sms_messages').insert(smsMessagesToInsert);
    }

    // BATCH UPDATE: Update all conversation timestamps at once
    const uniqueConversationIds = [...new Set(conversationIdsToUpdate)];
    if (uniqueConversationIds.length > 0) {
      await supabase
        .from('sms_conversations')
        .update({ last_message_at: sentAt })
        .in('id', uniqueConversationIds);
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${pendingMessages.length} messages`,
      ...results,
    });
  } catch (error) {
    apiLogger.error({ msg: 'Error in send-reminders cron', error: error instanceof Error ? error.message : 'Unknown error' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Also support POST for flexibility
export async function POST(request: NextRequest) {
  return GET(request);
}
