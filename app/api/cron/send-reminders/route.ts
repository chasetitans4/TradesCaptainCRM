// =====================================================
// APPOINTMENT REMINDERS CRON JOB
// GET /api/cron/send-reminders
// Should be called every 15 minutes via Vercel Cron or similar
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// Verify cron secret to prevent unauthorized access
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  try {
    // SECURITY: Verify authorization - require CRON_SECRET to be configured
    const authHeader = request.headers.get('authorization');
    if (!CRON_SECRET) {
      console.error('CRON_SECRET not configured - denying cron access');
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
      console.error('Error fetching scheduled messages:', fetchError);
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
      console.error('Twilio not configured:', e);
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

    // Process each message
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

        // Send via Twilio
        const twilioMessage = await twilioClient.messages.create({
          to: message.phone_number,
          body: content,
          ...(messagingServiceSid
            ? { messagingServiceSid }
            : { from: message.business?.twilio_phone_number }),
        });

        // Update message status
        await supabase
          .from('scheduled_messages')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            twilio_sid: twilioMessage.sid,
          })
          .eq('id', message.id);

        // Also save to sms_messages for conversation history
        // First find or create conversation
        const { data: conversation } = await supabase
          .from('sms_conversations')
          .select('id')
          .eq('business_id', message.business_id)
          .eq('phone_number', message.phone_number)
          .single();

        if (conversation) {
          await supabase.from('sms_messages').insert({
            conversation_id: conversation.id,
            content,
            direction: 'outbound',
            status: 'sent',
            twilio_sid: twilioMessage.sid,
            is_ai_response: false,
          });

          // Update conversation last_message_at
          await supabase
            .from('sms_conversations')
            .update({ last_message_at: new Date().toISOString() })
            .eq('id', conversation.id);
        }

        results.sent++;
      } catch (sendError: any) {
        console.error(`Error sending message ${message.id}:`, sendError);
        results.failed++;
        results.errors.push(`Message ${message.id}: ${sendError.message}`);

        // Mark as failed
        await supabase
          .from('scheduled_messages')
          .update({
            status: 'failed',
          })
          .eq('id', message.id);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${pendingMessages.length} messages`,
      ...results,
    });
  } catch (error) {
    console.error('Error in send-reminders cron:', error);
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
