// =====================================================
// SEND INVOICE API
// POST /api/invoices/[id]/send - Send invoice via SMS or Email
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, getServerUserProfile } from '@/lib/supabase/server';
import { sendInvoiceViaSms, sendInvoiceViaEmail } from '@/lib/invoices';
import { isEmailConfigured } from '@/lib/email';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getServerUserProfile();
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const supabase = await createServerSupabaseClient();

    // Get method from request body (defaults to 'sms' for backwards compatibility)
    const body = await request.json().catch(() => ({}));
    const method = body.method || 'sms'; // 'sms' | 'email' | 'both'

    // Verify invoice belongs to user's business
    const { data: invoice, error: fetchError } = await supabase
      .from('invoices')
      .select('id, status')
      .eq('id', id)
      .eq('business_id', profile.business_id)
      .single();

    if (fetchError || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Cannot send voided invoices
    if (invoice.status === 'void') {
      return NextResponse.json(
        { error: 'Cannot send voided invoice' },
        { status: 400 }
      );
    }

    const results: { sms?: boolean; email?: boolean; errors: string[] } = { errors: [] };

    try {
      // Send via SMS
      if (method === 'sms' || method === 'both') {
        try {
          await sendInvoiceViaSms(id);
          results.sms = true;
        } catch (error: any) {
          results.errors.push(`SMS: ${error.message}`);
          if (method === 'sms') throw error; // Only throw if SMS-only
        }
      }

      // Send via Email
      if (method === 'email' || method === 'both') {
        if (!isEmailConfigured()) {
          results.errors.push('Email: Email is not configured');
          if (method === 'email') {
            return NextResponse.json(
              { error: 'Email is not configured' },
              { status: 400 }
            );
          }
        } else {
          try {
            await sendInvoiceViaEmail(id);
            results.email = true;
          } catch (error: any) {
            results.errors.push(`Email: ${error.message}`);
            if (method === 'email') throw error; // Only throw if email-only
          }
        }
      }

      // Check if at least one method succeeded for 'both'
      if (method === 'both' && !results.sms && !results.email) {
        return NextResponse.json(
          { error: 'Failed to send via any method', details: results.errors },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        sent: {
          sms: results.sms || false,
          email: results.email || false,
        },
        errors: results.errors.length > 0 ? results.errors : undefined,
      });
    } catch (error: any) {
      console.error('Error sending invoice:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to send invoice' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in send invoice API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
